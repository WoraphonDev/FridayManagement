import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  isolatedSqlConfig,
  verifySqlReadiness,
  safeSqlReadinessError,
} from '../../scripts/sqlserver-readiness.js';

const env = {
  RUN_SQLSERVER_TESTS: '1',
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlserver',
  DB_NAME: 'Friday_test',
  DB_SERVER: 'db.example.test',
  DB_USER: 'fixture_operator',
  DB_PASSWORD: 'synthetic-secret',
  DATA_DIR: '/private/tmp/friday-sql-data',
  LOG_DIR: '/private/tmp/friday-sql-logs',
};
const row = {
  product_version: '16.0.1000.6',
  edition: 'Developer Edition',
  database_name: 'Friday_test',
  create_table: 1,
  create_schema: 1,
  alter_dbo: 1,
  showplan: 1,
};
test('SQL readiness requires explicit isolated test config before connecting', () => {
  assert.equal(isolatedSqlConfig(env).name, 'Friday_test');
  for (const changes of [
    { RUN_SQLSERVER_TESTS: undefined },
    { NODE_ENV: 'production' },
    { DB_PROVIDER: 'sqlite' },
    { DB_NAME: 'Friday' },
    { DB_NAME: 'master' },
    { DB_NAME: '../Friday_test' },
  ])
    assert.throws(() => isolatedSqlConfig({ ...env, ...changes }), /ISOLATED_SQL_TEST_REQUIRED/);
});
test('SQL readiness checks actual database identity and SQL2022 build', () => {
  assert.equal(verifySqlReadiness([row], env.DB_NAME).result, 'PASS');
  for (const changed of [
    { ...row, database_name: 'Other_test' },
    { ...row, database_name: null },
  ])
    assert.throws(() => verifySqlReadiness([changed], env.DB_NAME), /SQL_TEST_DATABASE_MISMATCH/);
  for (const version of ['15.0.1000.6', '17.0.1000.6', '', '16.fake'])
    assert.throws(
      () => verifySqlReadiness([{ ...row, product_version: version }], env.DB_NAME),
      /SQL_SERVER_2022_REQUIRED/,
    );
  assert.throws(() => verifySqlReadiness([], env.DB_NAME), /SQL_TEST_DATABASE_MISMATCH/);
});
test('SQL readiness fails missing fixture permissions and reports SHOWPLAN separately', () => {
  for (const key of ['create_table', 'create_schema', 'alter_dbo'])
    for (const value of [0, null])
      assert.throws(
        () => verifySqlReadiness([{ ...row, [key]: value }], env.DB_NAME),
        /SQL_TEST_PERMISSIONS_REQUIRED/,
      );
  assert.equal(
    verifySqlReadiness([{ ...row, showplan: 0 }], env.DB_NAME).queryPlanPermission,
    'NOT_READY',
  );
});
test('Driver failures never reveal connection strings or secrets', () => {
  const report = safeSqlReadinessError(new Error('password=synthetic-secret; server=private'));
  assert.equal(report.code, 'SQL_PREFLIGHT_FAILED');
  assert(!JSON.stringify(report).includes('synthetic-secret'));
  assert(!JSON.stringify(report).includes('private'));
});
test('CLI without opt-in exits NOT_READY rather than false PASS or connecting', () => {
  const reply = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/check-sqlserver.ts'], {
    env: { ...process.env, RUN_SQLSERVER_TESTS: '0', DB_PASSWORD: 'synthetic-secret' },
    encoding: 'utf8',
  });
  assert.equal(reply.status, 1);
  assert.equal(JSON.parse(reply.stderr.trim()).code, 'ISOLATED_SQL_TEST_REQUIRED');
  assert.equal(reply.stdout, '');
  assert(!reply.stderr.includes('synthetic-secret'));
});
