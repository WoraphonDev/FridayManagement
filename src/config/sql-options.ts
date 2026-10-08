import type { config as MssqlOptions } from 'mssql';
import type { SqlServerConfig } from './config.js';

export function sqlServerOptions(config: SqlServerConfig): MssqlOptions {
  return {
    server: config.server,
    port: config.port,
    database: config.name,
    user: config.user,
    password: config.password,
    connectionTimeout: config.requestTimeoutMs,
    requestTimeout: config.requestTimeoutMs,
    pool: { max: config.poolMax },
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      abortTransactionOnError: true,
      useUTC: true,
    },
  };
}
