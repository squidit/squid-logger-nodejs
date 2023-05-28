declare module 'squid-logger'{
  export function Configure(
    stdOutLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | null | undefined,
    cloudLoggingLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | null | undefined,
    sensitiveFieldsObj: Record<string, unknown>,
    ): void;
  export function Trace(dataToLog: any, req?: any, res?: any, user?: string, skipLog?: boolean, labels?: { sink: 'LGPD' } | Record<string, string>): void;
  export function Debug(dataToLog: any, req?: any, res?: any, user?: string, skipLog?: boolean, labels?: { sink: 'LGPD' } | Record<string, string>): void;
  export function Info (dataToLog: any, req?: any, res?: any, user?: string, skipLog?: boolean, labels?: { sink: 'LGPD' } | Record<string, string>): void;
  export function Warn (dataToLog: any, req?: any, res?: any, user?: string, skipLog?: boolean, labels?: { sink: 'LGPD' } | Record<string, string>): void;
  export function Error(dataToLog: any, req?: any, res?: any, user?: string, skipLog?: boolean, labels?: { sink: 'LGPD' } | Record<string, string>): void;
  export function Fatal(dataToLog: any, req?: any, res?: any, user?: string, skipLog?: boolean, labels?: { sink: 'LGPD' } | Record<string, string>): void;
  /**
   * @deprecated This function should not be used. Use the "Error" function instead.
   */
  export function ReportError(err: any, req: any, res: any, user: any): void;
}