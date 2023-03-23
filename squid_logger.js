const bunyan            = require('bunyan');
const dot               = require('dot-object');
const { LoggingBunyan } = require('@google-cloud/logging-bunyan');
const { SquidError }    = require('squid-error');

const squidLoggerUniqueSymbol = Symbol.for('squidLoggerSingleton');
const globalSymbols = Object.getOwnPropertySymbols(global);

const SquidObservabilityConfigs = require('./libraries/squid-observability-cofigs/squid_observability_configs');

let loggerSingleton;

let sensitiveFields = {};

const MASK = '****';

function DefautMasking (data)
{
  return MASK;
}

function MaskSensitiveData (data)
{
  if (!data)
    return data;

  try
  {
    const dotSensitiveFields = dot.dot(sensitiveFields);
    for (const property in dotSensitiveFields)
    {
      const transformer = (typeof (dotSensitiveFields[property]) === 'function') ? dotSensitiveFields[property] : DefautMasking;
      dot.str(property, dot.pick(property, data), data, transformer);
    }

    return data;
  }
  catch (err)
  {
    return data;
  }
}

function ReqSerializer (data)
{
  return MaskSensitiveData({
    method        : data.method,
    url           : data.originalUrl || data.url,
    headers       : data.headers,
    body          : data.body || data.payload,
    remoteAddress : data?.connection?.remoteAddress,
    remotePort    : data?.connection?.remotePort
  });
}

function ResSerializer (data)
{
  return MaskSensitiveData({
    statusCode    : data.statusCode,
    statusMessage : data.statusMessage,
    headers       : data._headers || data.headers,
    body          : data?.locals?.body || data.source
  });
}

function LogPayloadSerializer (data)
{
  return MaskSensitiveData(data);
}

function Configure (stdOutLogLevel, cloudLoggingLogLevel, sensitiveFieldsObj)
{
  const hasSymbol = (globalSymbols.indexOf(squidLoggerUniqueSymbol) > -1);

  if (!hasSymbol)
  {
    sensitiveFields = sensitiveFieldsObj || {};

    // Creates a Bunyan Cloud Logging client
    const loggingBunyan = new LoggingBunyan({
      ...SquidObservabilityConfigs.credentials,
      projectId : SquidObservabilityConfigs.projectId,
      logName   : 'squid-logger',
      resource  : {
        labels : { project_id : SquidObservabilityConfigs.projectId },
        type   : 'api'
      },
      defaultCallback : err =>
      {
        if (err)
          // eslint-disable-next-line no-console
          console.log('Error occured: ' + err);
      },
      serviceContext : SquidObservabilityConfigs.serviceContext
    });

    // Create a Bunyan logger that streams to Cloud Logging
    // Logs will be written to: "projects/YOUR_PROJECT_ID/logs/bunyan_log"
    loggerSingleton = bunyan.createLogger({
      // The JSON payload of the log as it appears in Cloud Logging
      // will contain "name": "my-service"
      name        : SquidObservabilityConfigs.serviceContext.applicationName,
      serializers : {
        req        : ReqSerializer,
        res        : ResSerializer,
        err        : SquidError.Serialize,
        logPayload : LogPayloadSerializer
      },
      src     : true,
      streams : [
        // Log to the console at 'info' and above
        { stream : process.stdout, level : stdOutLogLevel || 'error' },
        // And log to Cloud Logging, logging at 'info' and above
        ...(cloudLoggingLogLevel ? [loggingBunyan.stream(cloudLoggingLogLevel)] : [])
      ]
    });

    global[squidLoggerUniqueSymbol] = loggerSingleton;
  }

  return loggerSingleton;
};

function ExtractRemoteAddressFromRequest (req)
{
  const xForwardedForHeader = req.headers['x-forwarded-for'];

  if (typeof xForwardedForHeader !== 'undefined')
    return xForwardedForHeader;
  else
    return req.connection?.remoteAddress || req.info?.remoteAddress;
}

function FormatLogEntry (req, res, user)
{
  const referrerHeader  = req?.headers.referrer;
  const userAgentHeader = req?.headers['user-agent'];
  const url             = (typeof req?.url === 'string' || req?.url instanceof String) ? req?.url : req?.path;

  const context = {
    ...(req && res && {
      httpRequest : {
        method             : req.method,
        referrer           : referrerHeader,
        remoteIp           : ExtractRemoteAddressFromRequest(req),
        responseStatusCode : res.statusCode,
        url                : url,
        userAgent          : userAgentHeader
      }
    }),
    ...(user && (typeof user === 'string' || user instanceof String) && { user : user })
  };

  const logEntry = {
    serviceContext   : SquidObservabilityConfigs.serviceContext,
    sourceReferences : [
      {
        ...(SquidObservabilityConfigs.sourceReference.repository && { repository : SquidObservabilityConfigs.sourceReference.repository }),
        ...(SquidObservabilityConfigs.sourceReference.revisionId && { revisionId : SquidObservabilityConfigs.sourceReference.revisionId })
      }
    ],
    ...((context.httpRequest || context.user) && { context : context }),
    ...(req && res && {
      httpRequest : {
        requestMethod : req.method,
        requestUrl    : url,
        userAgent     : userAgentHeader,
        remoteIp      : ExtractRemoteAddressFromRequest(req),
        status        : res.statusCode,
        referer       : referrerHeader

        // add these properties in the future for better structured logging support
        // requestSize: string,
        // responseSize: string,
        // serverIp: string,
        // latency: string,
        // cacheLookup: boolean,
        // cacheHit: boolean,
        // cacheValidatedWithOriginServer: boolean,
        // cacheFillBytes: string,
        // protocol: string
      }
    }),
    ...(req && { req : req }),
    ...(res && { res : res })
  };

  return logEntry;
}

function FormatNonErrorLogEntry (dataToLog, req, res, user)
{
  const nonErrorLogEntry = {
    ...FormatLogEntry(req, res, user),
    logPayload : dataToLog
  };

  return nonErrorLogEntry;
}

function FormatErrorLogEntry (err, req, res, user)
{
  const errorLogEntry = {
    ...FormatLogEntry(req, res, user),
    '@type' : 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
    message : err.stack || err,
    err     : err
  };

  return errorLogEntry;
}

function Log (logMethod, logEntry, skipLog)
{
  if (!logEntry || skipLog === true)
    return;

  logMethod(logEntry);
}

function Trace (dataToLog, req, res, user, skipLog)
{
  return Log(loggerSingleton.trace.bind(loggerSingleton), FormatNonErrorLogEntry(dataToLog, req, res, user), skipLog || dataToLog?.skipLog);
}

function Debug (dataToLog, req, res, user, skipLog)
{
  return Log(loggerSingleton.debug.bind(loggerSingleton), FormatNonErrorLogEntry(dataToLog, req, res, user), skipLog || dataToLog?.skipLog);
}

function Info (dataToLog, req, res, user, skipLog)
{
  return Log(loggerSingleton.info.bind(loggerSingleton), FormatNonErrorLogEntry(dataToLog, req, res, user), skipLog || dataToLog?.skipLog);
}

function Warn (dataToLog, req, res, user, skipLog)
{
  return Log(loggerSingleton.warn.bind(loggerSingleton), FormatNonErrorLogEntry(dataToLog, req, res, user), skipLog || dataToLog?.skipLog);
}

function Error (err, req, res, user, skipLog)
{
  return Log(loggerSingleton.error.bind(loggerSingleton), FormatErrorLogEntry(err, req, res, user), skipLog || err?.skipLog);
}

function Fatal (err, req, res, user, skipLog)
{
  return Log(loggerSingleton.fatal.bind(loggerSingleton), FormatErrorLogEntry(err, req, res, user), skipLog || err?.skipLog);
}

/**
 * @deprecated This funcction should not be used. Use the "Error" function instead.
 */
function ReportError (err, req, res, user)
{
  return Error(err, req, res, user);
}

// maybe expose the logger singleton object?
// exports.squidLogger = loggerSingleton;

exports.Configure   = Configure;
exports.Trace       = Trace;
exports.Debug       = Debug;
exports.Info        = Info;
exports.Warn        = Warn;
exports.Error       = Error;
exports.Fatal       = Fatal;
exports.ReportError = ReportError;
