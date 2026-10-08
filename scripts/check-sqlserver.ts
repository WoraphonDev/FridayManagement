import sql from 'mssql';
import { sqlServerOptions } from '../src/config/sql-options.js';
import {
  isolatedSqlConfig,
  readinessQuery,
  verifySqlReadiness,
  safeSqlReadinessError,
} from './sqlserver-readiness.js';

let pool: sql.ConnectionPool | undefined;
try {
  const config = isolatedSqlConfig(process.env);
  pool = new sql.ConnectionPool(sqlServerOptions(config));
  await pool.connect();
  const reply = await pool.request().query(readinessQuery);
  console.log(JSON.stringify(verifySqlReadiness(reply.recordset, config.name)));
} catch (error) {
  console.error(JSON.stringify(safeSqlReadinessError(error)));
  process.exitCode = 1;
} finally {
  try {
    await pool?.close();
  } catch {
    console.error(JSON.stringify(safeSqlReadinessError(undefined)));
    process.exitCode = 1;
  }
}
