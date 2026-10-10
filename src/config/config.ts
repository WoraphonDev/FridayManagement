import { isIP } from 'node:net';
import { isAbsolute } from 'node:path';

export const configurationKeys = [
  'HOST',
  'PORT',
  'APP_ORIGIN',
  'COOKIE_SECURE',
  'DATA_DIR',
  'LOG_DIR',
  'DB_PROVIDER',
  'SQLITE_DB_PATH',
  'DB_SERVER',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_ENCRYPT',
  'DB_TRUST_SERVER_CERTIFICATE',
  'DB_POOL_MAX',
  'DB_REQUEST_TIMEOUT_MS',
  'DB_LOCK_TIMEOUT_MS',
  'DB_BACKUP_DIR',
  'MAX_FILE_BYTES',
  'TOTAL_UPLOAD_BYTES',
  'SESSION_ABSOLUTE_MIN',
  'SESSION_IDLE_MIN',
  'POLL_SECONDS',
  'REMINDER_SECONDS',
  'TRASH_RETENTION_DAYS',
  'NOTIFICATION_RETENTION_DAYS',
  'TRUSTED_PROXY',
] as const;
export class ConfigurationError extends Error {
  constructor(readonly keys: readonly string[]) {
    super(`CONFIGURATION_INVALID: ${keys.join(', ')}`);
    this.name = 'ConfigurationError';
  }
}
export interface SqlServerConfig {
  provider: 'sqlserver';
  server: string;
  port: number;
  name: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  poolMax: number;
  requestTimeoutMs: number;
  lockTimeoutMs: number;
  backupDirectory: string;
}
/** PostgreSQL (owner decision 2026-10-11) reuses the DB_* keys; TLS is optional on a private network. */
export interface PostgresConfig {
  provider: 'postgres';
  server: string;
  port: number;
  name: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  poolMax: number;
  requestTimeoutMs: number;
  lockTimeoutMs: number;
}
export interface AppConfig {
  mode: 'development' | 'test' | 'production';
  host: string;
  port: number;
  origin: string;
  cookieSecure: boolean;
  dataDirectory: string;
  logDirectory: string;
  trustedProxies: string[];
  database: { provider: 'sqlite'; path: string } | SqlServerConfig | PostgresConfig;
  maxFileBytes: number;
  totalUploadBytes: number;
  sessionAbsoluteMinutes: number;
  sessionIdleMinutes: number;
  pollSeconds: number;
  reminderSeconds: number;
  trashRetentionDays: 30;
  notificationRetentionDays: 90;
}

export function parseConfiguration(env: NodeJS.ProcessEnv): AppConfig {
  const errors = new Set<string>();
  const invalid = (key: string) => {
    errors.add(key);
  };
  const text = (key: string, required = false) => {
    const value = env[key] ?? '';
    if ((required && !value.trim()) || /[\u0000\r\n]/.test(value)) invalid(key);
    return value;
  };
  const integer = (key: string, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER) => {
    const value = env[key] ?? String(fallback);
    if (
      !/^(0|[1-9][0-9]*)$/.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) < min ||
      Number(value) > max
    )
      invalid(key);
    return Number(value);
  };
  const bool = (key: string, fallback: boolean) => {
    const value = env[key] ?? String(fallback);
    if (!['true', 'false'].includes(value)) invalid(key);
    return value === 'true';
  };
  const absolute = (key: string, required = true) => {
    const value = text(key, required);
    if (value && !isAbsolute(value)) invalid(key);
    return value;
  };
  const mode = text('NODE_ENV') || 'development';
  if (!['development', 'test', 'production'].includes(mode)) invalid('NODE_ENV');
  const host = text('HOST') || '127.0.0.1';
  if (!isIP(host)) invalid('HOST');
  const port = integer('PORT', 3000, 1, 65535);
  const origin = text('APP_ORIGIN', mode === 'production') || `http://127.0.0.1:${port}`;
  try {
    const url = new URL(origin);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== origin ||
      url.username ||
      url.password ||
      !url.hostname
    )
      invalid('APP_ORIGIN');
    if (mode === 'production' && url.protocol !== 'https:') invalid('APP_ORIGIN');
  } catch {
    invalid('APP_ORIGIN');
  }
  const cookieSecure = bool('COOKIE_SECURE', origin.startsWith('https://'));
  if (cookieSecure !== origin.startsWith('https://') || (mode === 'production' && !cookieSecure))
    invalid('COOKIE_SECURE');
  const dataDirectory = absolute('DATA_DIR'),
    logDirectory = absolute('LOG_DIR');
  const proxyText = text('TRUSTED_PROXY');
  const trustedProxies = proxyText ? proxyText.split(',').map((v) => v.trim()) : [];
  if (
    trustedProxies.some((v) => !isIP(v)) ||
    new Set(trustedProxies).size !== trustedProxies.length
  )
    invalid('TRUSTED_PROXY');
  const provider = text('DB_PROVIDER', true);
  let database: AppConfig['database'];
  if (provider === 'sqlite') {
    if (mode === 'production') invalid('DB_PROVIDER');
    database = { provider: 'sqlite', path: absolute('SQLITE_DB_PATH') };
  } else if (provider === 'postgres') {
    const server = text('DB_SERVER', true);
    if (!isIP(server) && !/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(server))
      invalid('DB_SERVER');
    const requestTimeoutMs = integer('DB_REQUEST_TIMEOUT_MS', 15000, 1, 2147483647);
    const lockTimeoutMs = integer('DB_LOCK_TIMEOUT_MS', 5000, 1, 2147483647);
    if (lockTimeoutMs >= requestTimeoutMs) invalid('DB_LOCK_TIMEOUT_MS');
    database = {
      provider: 'postgres',
      server,
      port: integer('DB_PORT', 5432, 1, 65535),
      name: text('DB_NAME', true),
      user: text('DB_USER', true),
      password: text('DB_PASSWORD', true),
      encrypt: bool('DB_ENCRYPT', false),
      trustServerCertificate: bool('DB_TRUST_SERVER_CERTIFICATE', false),
      poolMax: integer('DB_POOL_MAX', 10, 1, 100),
      requestTimeoutMs,
      lockTimeoutMs,
    };
  } else {
    if (provider !== 'sqlserver') invalid('DB_PROVIDER');
    const server = text('DB_SERVER', true),
      name = text('DB_NAME', true),
      user = text('DB_USER', true),
      password = text('DB_PASSWORD', true);
    if (!isIP(server) && !/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(server))
      invalid('DB_SERVER');
    const encrypt = bool('DB_ENCRYPT', true),
      trustServerCertificate = bool('DB_TRUST_SERVER_CERTIFICATE', false);
    if (mode === 'production' && (!encrypt || trustServerCertificate)) {
      invalid('DB_ENCRYPT');
      invalid('DB_TRUST_SERVER_CERTIFICATE');
    }
    const requestTimeoutMs = integer('DB_REQUEST_TIMEOUT_MS', 15000, 1, 2147483647);
    const lockTimeoutMs = integer('DB_LOCK_TIMEOUT_MS', 5000, 1, 2147483647);
    if (lockTimeoutMs >= requestTimeoutMs) invalid('DB_LOCK_TIMEOUT_MS');
    database = {
      provider: 'sqlserver',
      server,
      port: integer('DB_PORT', 1433, 1, 65535),
      name,
      user,
      password,
      encrypt,
      trustServerCertificate,
      poolMax: integer('DB_POOL_MAX', 10, 1, 100),
      requestTimeoutMs,
      lockTimeoutMs,
      backupDirectory: text('DB_BACKUP_DIR', mode === 'production'),
    };
    // SQL backup path is on the SQL host: accept POSIX, Windows drive or UNC syntax without local filesystem checks.
    if (database.backupDirectory && !/^(?:\/|[A-Za-z]:[\\/]|\\\\)/.test(database.backupDirectory))
      invalid('DB_BACKUP_DIR');
  }
  const maxFileBytes = integer('MAX_FILE_BYTES', 10485760, 1, 10485760),
    totalUploadBytes = integer('TOTAL_UPLOAD_BYTES', 5368709120);
  if (totalUploadBytes < maxFileBytes) invalid('TOTAL_UPLOAD_BYTES');
  const sessionAbsoluteMinutes = integer('SESSION_ABSOLUTE_MIN', 720, 1, 720),
    sessionIdleMinutes = integer('SESSION_IDLE_MIN', 60, 1, 60);
  if (sessionIdleMinutes > sessionAbsoluteMinutes) invalid('SESSION_IDLE_MIN');
  const pollSeconds = integer('POLL_SECONDS', 5, 1, 5),
    reminderSeconds = integer('REMINDER_SECONDS', 60, 1, 60);
  if (integer('TRASH_RETENTION_DAYS', 30) !== 30) invalid('TRASH_RETENTION_DAYS');
  if (integer('NOTIFICATION_RETENTION_DAYS', 90) !== 90) invalid('NOTIFICATION_RETENTION_DAYS');
  if (errors.size) throw new ConfigurationError([...errors].sort());
  return {
    mode: mode as AppConfig['mode'],
    host,
    port,
    origin,
    cookieSecure,
    dataDirectory,
    logDirectory,
    trustedProxies,
    database,
    maxFileBytes,
    totalUploadBytes,
    sessionAbsoluteMinutes,
    sessionIdleMinutes,
    pollSeconds,
    reminderSeconds,
    trashRetentionDays: 30,
    notificationRetentionDays: 90,
  };
}
