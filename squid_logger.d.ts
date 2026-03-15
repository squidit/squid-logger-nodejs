import bunyan = require('bunyan');

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LoggerLabels = Record<string, string>;
export type SensitiveFieldMasker = (value: unknown) => unknown;
export type SensitiveFields = Record<string, SensitiveFieldMasker | unknown>;

export interface LoggerRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  path?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
  payload?: unknown;
  connection?: {
    remoteAddress?: string;
    remotePort?: number | string;
  };
  info?: {
    remoteAddress?: string;
  };
}

export interface LoggerResponse {
  statusCode?: number;
  statusMessage?: string;
  headers?: Record<string, unknown>;
  _headers?: Record<string, unknown>;
  locals?: {
    body?: unknown;
  };
  source?: unknown;
}

export type UserIdentity = string;

export interface LogData {
  skipLog?: boolean;
  [key: string]: unknown;
}

export interface ErrorData extends Error {
  skipLog?: boolean;
}

export function Configure(
  stdOutLogLevel?: LogLevel | null,
  cloudLoggingLogLevel?: LogLevel | null,
  sensitiveFieldsObj?: SensitiveFields
): bunyan;

export function Trace(
  dataToLog: unknown,
  req?: LoggerRequest,
  res?: LoggerResponse,
  user?: UserIdentity,
  skipLog?: boolean,
  labels?: LoggerLabels
): void;

export function Debug(
  dataToLog: unknown,
  req?: LoggerRequest,
  res?: LoggerResponse,
  user?: UserIdentity,
  skipLog?: boolean,
  labels?: LoggerLabels
): void;

export function Info(
  dataToLog: unknown,
  req?: LoggerRequest,
  res?: LoggerResponse,
  user?: UserIdentity,
  skipLog?: boolean,
  labels?: LoggerLabels
): void;

export function Warn(
  dataToLog: unknown,
  req?: LoggerRequest,
  res?: LoggerResponse,
  user?: UserIdentity,
  skipLog?: boolean,
  labels?: LoggerLabels
): void;

export function Error(
  err: unknown,
  req?: LoggerRequest,
  res?: LoggerResponse,
  user?: UserIdentity,
  skipLog?: boolean,
  labels?: LoggerLabels
): void;

export function Fatal(
  err: unknown,
  req?: LoggerRequest,
  res?: LoggerResponse,
  user?: UserIdentity,
  skipLog?: boolean,
  labels?: LoggerLabels
): void;

/**
 * @deprecated This function should not be used. Use the "Error" function instead.
 */
export function ReportError(
  err: unknown,
  req?: LoggerRequest,
  res?: LoggerResponse,
  user?: UserIdentity
): void;