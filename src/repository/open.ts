import type { Database } from '../domain/database.js';
import { loadConfiguration } from '../config/load.js';
import { sqlServerOptions } from '../config/sql-options.js';
import type { config as SqlOptions, ConnectionPool } from 'mssql';

export async function openDatabase(
  provider: string,
  options: {
    env?: NodeJS.ProcessEnv;
    connectSql?: (options: SqlOptions) => Promise<ConnectionPool>;
  } = {},
): Promise<Database> {
  // Every CLI provider must agree with explicit DB_PROVIDER. No fallback or provider override.
  const env = options.env ?? process.env;
  if (provider !== env.DB_PROVIDER) throw new Error('PROVIDER_MISMATCH');
  const config = await loadConfiguration(env);
  if (config.database.provider === 'sqlite') {
    const { SqliteDatabase } = await import('./sqlite/database.js');
    return new SqliteDatabase(config.database.path);
  }
  if (config.database.provider === 'postgres') {
    const pg = (await import('pg')).default;
    const { PostgresDatabase } = await import('./postgres/database.js');
    const d = config.database;
    const pool = new pg.Pool({
      host: d.server,
      port: d.port,
      database: d.name,
      user: d.user,
      password: d.password,
      max: d.poolMax,
      statement_timeout: d.requestTimeoutMs,
      ssl: d.encrypt ? { rejectUnauthorized: !d.trustServerCertificate } : false,
    });
    return new PostgresDatabase(pool, d.lockTimeoutMs);
  }
  const sql = (await import('mssql')).default;
  const { SqlServerDatabase } = await import('./sqlserver/database.js');
  const pool = await (options.connectSql
    ? options.connectSql(sqlServerOptions(config.database))
    : new sql.ConnectionPool(sqlServerOptions(config.database)).connect());
  return new SqlServerDatabase(pool, config.database.lockTimeoutMs);
}
