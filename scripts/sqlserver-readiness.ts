import { parseConfiguration, type SqlServerConfig } from '../src/config/config.js';
import type { Row } from '../src/domain/database.js';

export class SqlReadinessError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export function isolatedSqlConfig(env: NodeJS.ProcessEnv): SqlServerConfig {
  if (
    env.RUN_SQLSERVER_TESTS !== '1' ||
    env.NODE_ENV !== 'test' ||
    env.DB_PROVIDER !== 'sqlserver' ||
    !/^[A-Za-z][A-Za-z0-9_]*_test$/.test(env.DB_NAME ?? '')
  )
    throw new SqlReadinessError('ISOLATED_SQL_TEST_REQUIRED');
  const config = parseConfiguration(env).database;
  if (config.provider !== 'sqlserver') throw new SqlReadinessError('ISOLATED_SQL_TEST_REQUIRED');
  return config;
}

// SELECT only: no migrations, path creation, data writes or server configuration changes.
export const readinessQuery = `SELECT
  CONVERT(NVARCHAR(128),SERVERPROPERTY('ProductVersion')) AS product_version,
  CONVERT(NVARCHAR(128),SERVERPROPERTY('Edition')) AS edition,
  DB_NAME() AS database_name,
  HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE TABLE') AS create_table,
  HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE SCHEMA') AS create_schema,
  HAS_PERMS_BY_NAME('dbo','SCHEMA','ALTER') AS alter_dbo,
  HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','SHOWPLAN') AS showplan`;

export function verifySqlReadiness(rows: Row[], expectedDatabase: string) {
  const row = rows[0];
  if (rows.length !== 1 || !row || row.database_name !== expectedDatabase)
    throw new SqlReadinessError('SQL_TEST_DATABASE_MISMATCH');
  if (typeof row.product_version !== 'string' || !/^16\.\d+\.\d+\.\d+$/.test(row.product_version))
    throw new SqlReadinessError('SQL_SERVER_2022_REQUIRED');
  for (const key of ['create_table', 'create_schema', 'alter_dbo'])
    if (row[key] !== 1) throw new SqlReadinessError('SQL_TEST_PERMISSIONS_REQUIRED');
  return {
    result: 'PASS' as const,
    productVersion: row.product_version,
    edition: typeof row.edition === 'string' ? row.edition : 'unknown',
    fixturePermissions: 'PASS' as const,
    queryPlanPermission: row.showplan === 1 ? 'PASS' : 'NOT_READY',
    scope: 'Read-only readiness; native test execution and acceptance remain NOT_RUN',
  };
}

export function safeSqlReadinessError(error: unknown) {
  return {
    result: 'NOT_READY',
    code: error instanceof SqlReadinessError ? error.code : 'SQL_PREFLIGHT_FAILED',
    scope: 'No native acceptance result',
  };
}
