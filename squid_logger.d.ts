declare module 'squid-logger'{
  export function Configure(
    stdOutLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | null,
    cloudLoggingLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | null,
    sensitiveFieldsObj: Record<string, unknown>,
    ): void;

  export function Trace(dataToLog: any, req: any, res: any, user: any, skipLog: boolean, labels: any): void;
  export function Debug(dataToLog: any, req: any, res: any, user: any, skipLog: boolean, labels: any): void;
  export function Info(dataToLog: any,  req: any, res: any, user: any, skipLog: boolean, labels: any): void;
  export function Warn(dataToLog: any,  req: any, res: any, user: any, skipLog: boolean, labels: any): void;
  export function Error(err: any,       req: any, res: any, user: any, skipLog: boolean, labels: any): void;
  export function Fatal(err: any,       req: any, res: any, user: any, skipLog: boolean, labels: any): void;
  /**
   * @deprecated This function should not be used. Use the "Error" function instead.
   */
  export function ReportError(err: any, req: any, res: any, user: any): void;
}