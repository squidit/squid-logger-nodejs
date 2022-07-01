const bunyan            = require('bunyan');
const dot               = require('dot-object');
const { LoggingBunyan } = require('@google-cloud/logging-bunyan');
const { SquidError }    = require('squid-error');

const squidLoggerUniqueSymbol = Symbol.for('squidLoggerSingleton');
const globalSymbols = Object.getOwnPropertySymbols(global);

let loggerSingleton;

const serviceContext = {
  environment : undefined,
  service     : undefined,
  version     : undefined
};

const sourceReference = {
  repository : undefined,
  revisionId : undefined
};

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
    ...bunyan.stdSerializers.req(data),
    body : data.body || data.payload
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

function ErrorSerializer (err)
{
  if (err instanceof SquidError)
    return err.Serialize();
  else if (err instanceof Error)
    return SquidError.SerializeNativeError(err);
  else
    return err;
}

function Configure (projectId, googleCloudCredentials, environment, serviceName, version, stdOutLogLevel, cloudLoggingLogLevel, sensitiveFieldsObj, applicationRepository, applicationRevisionId)
{
  const hasSymbol = (globalSymbols.indexOf(squidLoggerUniqueSymbol) > -1);

  if (!hasSymbol)
  {
    sensitiveFields = sensitiveFieldsObj || {};

    serviceContext.environment = environment;
    serviceContext.service     = `${serviceName} - ${environment}`;
    serviceContext.version     = version;

    sourceReference.repository = applicationRepository;
    sourceReference.revisionId = applicationRevisionId;

    let credentials = {};

    if (typeof googleCloudCredentials === 'string' || googleCloudCredentials instanceof String)
    {
      try
      {
        credentials = {
          credentials : JSON.parse(googleCloudCredentials)
        };
      }
      catch (error)
      {
        credentials = {
          keyFilename : googleCloudCredentials
        };
      }
    }
    else if (typeof googleCloudCredentials === 'object' && googleCloudCredentials !== null)
    {
      credentials = {
        credentials : googleCloudCredentials
      };
    }
    else
    {
      throw SquidError.Create({
        message : 'Invalid credentials provided for the Squid Logger library',
        code    : 'SQUID_LOGGER_INVALID_CREDENTIALS',
        detail  : googleCloudCredentials,
        id      : 0
      });
    }

    // Creates a Bunyan Cloud Logging client
    const loggingBunyan = new LoggingBunyan({
      ...credentials,
      projectId : projectId,
      logName   : 'squid-logger',
      resource  : {
        labels : { project_id : projectId },
        type   : 'api'
      },
      defaultCallback : err =>
      {
        if (err)
          console.log('Error occured: ' + err);
      },
      serviceContext : serviceContext
    });

    // Create a Bunyan logger that streams to Cloud Logging
    // Logs will be written to: "projects/YOUR_PROJECT_ID/logs/bunyan_log"
    loggerSingleton = bunyan.createLogger({
      // The JSON payload of the log as it appears in Cloud Logging
      // will contain "name": "my-service"
      name        : serviceName,
      serializers : {
        req : ReqSerializer,
        res : ResSerializer,
        // err : bunyan.stdSerializers.err
        err : ErrorSerializer
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

function ReportError (err, req, res, user)
{
  if (!err)
    return;

  const referrerHeader  = req?.headers['referrer'];
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

  const obj = {
    '@type'          : 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
    serviceContext   : serviceContext,
    sourceReferences : [
      {
        ...(sourceReference.repository && { repository : sourceReference.repository }),
        ...(sourceReference.revisionId && { revisionId : sourceReference.revisionId })
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
    message : err.stack || err,
    err     : err,
    ...(req && { req : req }),
    ...(res && { res : res })
  };

  loggerSingleton.error(obj);
}

// maybe expose the logger singleton object?
// exports.squidLogger = loggerSingleton;

exports.Configure   = Configure;
exports.ReportError = ReportError;
