declare module 'squid-logger'{

export function Configure(projectId: any, googleCloudCredentials: any, environment: any, applicationName: any, version: any, stdOutLogLevel: any, cloudLoggingLogLevel: any, sensitiveFieldsObj: any, applicationRepository: any, applicationRevisionId: any): any;
export function Trace(dataToLog: any, req: any, res: any, user: any, skipLog: any): void;
export function Debug(dataToLog: any, req: any, res: any, user: any, skipLog: any): void;
export function Info(dataToLog: any, req: any, res: any, user: any, skipLog: any): void;
export function Warn(dataToLog: any, req: any, res: any, user: any, skipLog: any): void;
export function Error(err: any, req: any, res: any, user: any, skipLog: any): void;
export function Fatal(err: any, req: any, res: any, user: any, skipLog: any): void;
/**
 * @deprecated This funcction should not be used. Use the "Error" function instead.
 */
export function ReportError(err: any, req: any, res: any, user: any): void;

}