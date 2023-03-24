declare module 'squid-logger' {

  export function Configure(
    projectId: string, 
    googleCloudCredentials: string, 
    environment: string, 
    applicationName: string,
    version: string, 
    stdOutLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | null, 
    cloudLoggingLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | null, 
    sensitiveFieldsObj: Record<string, unknown>, 
    applicationRepository?: string, 
    applicationRevisionId?: string
  ): void;
  export function Trace(dataToLog: any, req?: any, res?: any, user?: any, skipLog: boolean = false): void;
  export function Debug(dataToLog: any, req?: any, res?: any, user?: any, skipLog: boolean = false): void;
  export function Info(dataToLog: any,  req?: any, res?: any, user?: any, skipLog: boolean = false): void;
  export function Warn(dataToLog: any,  req?: any, res?: any, user?: any, skipLog: boolean = false): void;
  export function Error(err: any,       req?: any, res?: any, user?: any, skipLog: boolean = false): void;
  export function Fatal(err: any,       req?: any, res?: any, user?: any, skipLog: boolean = false): void;
  /**
   * @deprecated This function should not be used. Use the "Error" function instead.
   */
  export function ReportError(err: any, req: any, res: any, user: any): void;
}