import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseConfiguration,
  ConfigurationError,
  configurationKeys,
} from '../../src/config/config.js';
import { sqlServerOptions } from '../../src/config/sql-options.js';
import { assertSqlLockResult } from '../../src/config/sql-instance.js';
import { safeStartupError } from '../../src/api/start.js';

const local = () => ({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: '/private/tmp/friday-config-data',
  LOG_DIR: '/private/tmp/friday-config-logs',
  SQLITE_DB_PATH: '/private/tmp/friday-config-data/local.sqlite',
});
const sql = () => ({
  ...local(),
  DB_PROVIDER: 'sqlserver',
  DB_SERVER: 'db.example.test',
  DB_NAME: 'Friday_test',
  DB_USER: 'test_user',
  DB_PASSWORD: '  synthetic-secret  ',
  DB_BACKUP_DIR: 'C:\\SqlBackup',
});
test('All SRS configuration keys are present in reference template and checked policy', () => {
  const template = readFileSync('.env.example', 'utf8');
  for (const key of configurationKeys) assert.match(template, new RegExp(`^${key}=`, 'm'));
  const srs = readFileSync('TeamFlow_SRS_v1.0.md', 'utf8')
    .split('### 3.3 Configuration contract')[1]!
    .split('### 3.4')[0]!;
  const keys = [...srs.matchAll(/^\| ([A-Z_]+(?: \/ [A-Z_]+)*) \|/gm)].flatMap((m) =>
    m[1]!.split(' / '),
  );
  assert.deepEqual(new Set(keys), new Set(configurationKeys));
});
test('Local defaults retain baseline and derive no origin from request headers', () => {
  const c = parseConfiguration({
    ...local(),
    PORT: '43172',
    HTTP_HOST: 'evil.invalid',
    HTTP_X_FORWARDED_HOST: 'evil.invalid',
  });
  assert.equal(c.origin, 'http://127.0.0.1:43172');
  assert.equal(c.cookieSecure, false);
  assert.equal(c.host, '127.0.0.1');
  assert.deepEqual(c.trustedProxies, []);
  assert.equal(c.maxFileBytes, 10485760);
  assert.equal(c.totalUploadBytes, 5368709120);
  assert.equal(c.sessionAbsoluteMinutes, 720);
  assert.equal(c.sessionIdleMinutes, 60);
  assert.equal(c.pollSeconds, 5);
  assert.equal(c.reminderSeconds, 60);
  assert.equal(c.trashRetentionDays, 30);
  assert.equal(c.notificationRetentionDays, 90);
});
test('Production requires explicit HTTPS origin, SQL provider and secure cookie', () => {
  const c = parseConfiguration({
    ...sql(),
    NODE_ENV: 'production',
    APP_ORIGIN: 'https://tasks.example.test',
    COOKIE_SECURE: 'true',
  });
  assert.equal(c.mode, 'production');
  for (const changes of [
    { APP_ORIGIN: undefined },
    { APP_ORIGIN: 'http://tasks.example.test' },
    { COOKIE_SECURE: 'false' },
    { DB_PROVIDER: 'sqlite' },
    { DB_ENCRYPT: 'false' },
    { DB_TRUST_SERVER_CERTIFICATE: 'true' },
    { DB_BACKUP_DIR: undefined },
  ])
    assert.throws(
      () =>
        parseConfiguration({
          ...sql(),
          NODE_ENV: 'production',
          APP_ORIGIN: 'https://tasks.example.test',
          ...changes,
        }),
      ConfigurationError,
    );
});
for (const origin of [
  '*',
  'null',
  'https://tasks.test/path',
  'https://tasks.test/',
  'https://user:synthetic-secret@tasks.test',
  'https://tasks.test?secret=x',
  'https://tasks.test#x',
  'file:///tmp',
  'https://one.test,https://two.test',
])
  test(`Invalid origin shape is rejected (${origin.startsWith('https://user') ? 'credentials' : origin})`, () =>
    assert.throws(
      () => parseConfiguration({ ...local(), APP_ORIGIN: origin }),
      ConfigurationError,
    ));
test('Malformed provider/mode/host and boolean values fail without coercion', () => {
  for (const changes of [
    { DB_PROVIDER: undefined },
    { DB_PROVIDER: 'postgres' },
    { DB_PROVIDER: 'SQLite' },
    { NODE_ENV: 'prod' },
    { HOST: '127.0.0.1:3000' },
    { COOKIE_SECURE: '1' },
    { COOKIE_SECURE: '' },
    { APP_ORIGIN: 'http://127.0.0.1:3000', COOKIE_SECURE: 'true' },
  ])
    assert.throws(() => parseConfiguration({ ...local(), ...changes }), ConfigurationError);
});
test('Trusted proxy allowlist accepts exact IPs and rejects ranges, names, hop counts and malformed lists', () => {
  assert.deepEqual(
    parseConfiguration({ ...local(), TRUSTED_PROXY: '127.0.0.1, ::1' }).trustedProxies,
    ['127.0.0.1', '::1'],
  );
  for (const value of [
    '*',
    'true',
    '1',
    'loopback',
    '127.0.0.0/8',
    'example.test',
    '127.0.0.1,',
    '127.0.0.1,127.0.0.1',
  ])
    assert.throws(
      () => parseConfiguration({ ...local(), TRUSTED_PROXY: value }),
      ConfigurationError,
    );
});
test('Every integer setting rejects malformed/unsafe/range values', () => {
  const keys = [
    'PORT',
    'DB_PORT',
    'DB_POOL_MAX',
    'DB_REQUEST_TIMEOUT_MS',
    'DB_LOCK_TIMEOUT_MS',
    'MAX_FILE_BYTES',
    'TOTAL_UPLOAD_BYTES',
    'SESSION_ABSOLUTE_MIN',
    'SESSION_IDLE_MIN',
    'POLL_SECONDS',
    'REMINDER_SECONDS',
    'TRASH_RETENTION_DAYS',
    'NOTIFICATION_RETENTION_DAYS',
  ];
  for (const key of keys)
    for (const value of ['', '-1', '0', '1.5', '1e3', ' 1', '01', 'Infinity', '9007199254740992'])
      assert.throws(
        () => parseConfiguration({ ...sql(), [key]: value }),
        ConfigurationError,
        `${key}: ${value}`,
      );
});
test('Bounds/cross-field timing/quota invariants and fixed retention are enforced', () => {
  for (const changes of [
    { PORT: '65536' },
    { DB_PORT: '65536' },
    { DB_POOL_MAX: '101' },
    { DB_REQUEST_TIMEOUT_MS: '2147483648' },
    { DB_LOCK_TIMEOUT_MS: '15000' },
    { TOTAL_UPLOAD_BYTES: '1' },
    { MAX_FILE_BYTES: '10485761' },
    { SESSION_ABSOLUTE_MIN: '721' },
    { SESSION_IDLE_MIN: '61' },
    { SESSION_ABSOLUTE_MIN: '30', SESSION_IDLE_MIN: '60' },
    { POLL_SECONDS: '6' },
    { REMINDER_SECONDS: '61' },
    { TRASH_RETENTION_DAYS: '29' },
    { NOTIFICATION_RETENTION_DAYS: '91' },
  ])
    assert.throws(() => parseConfiguration({ ...sql(), ...changes }), ConfigurationError);
});
test('SQL options preserve untrimmed secret, explicit TLS overrides for local tests and all pool/timeouts', () => {
  const c = parseConfiguration({
    ...sql(),
    DB_PORT: '1444',
    DB_POOL_MAX: '7',
    DB_REQUEST_TIMEOUT_MS: '9000',
    DB_LOCK_TIMEOUT_MS: '3000',
    DB_ENCRYPT: 'false',
    DB_TRUST_SERVER_CERTIFICATE: 'true',
  });
  assert(c.database.provider === 'sqlserver');
  const options = sqlServerOptions(c.database);
  assert.equal(options.port, 1444);
  assert.equal(options.pool?.max, 7);
  assert.equal(options.requestTimeout, 9000);
  assert.equal(options.connectionTimeout, 9000);
  assert.equal(options.options?.encrypt, false);
  assert.equal(options.options?.trustServerCertificate, true);
  assert.equal(options.password, '  synthetic-secret  ');
  assert.equal(c.database.lockTimeoutMs, 3000);
  assert.equal(parseConfiguration({ ...sql(), DB_SERVER: '::1' }).database.provider, 'sqlserver');
});
test('Configuration and driver errors never include supplied values/secrets', () => {
  try {
    parseConfiguration({
      ...sql(),
      DB_SERVER: 'https://synthetic-secret@example.test',
      APP_ORIGIN: 'https://synthetic-secret@example.test',
      DB_PASSWORD: 'synthetic-secret\n',
    });
    assert.fail();
  } catch (error) {
    assert(error instanceof ConfigurationError);
    assert(!error.message.includes('synthetic-secret'));
    assert.match(error.message, /DB_SERVER/);
    assert.match(error.message, /APP_ORIGIN/);
  }
  assert.equal(
    safeStartupError(new Error('driver failed: password=synthetic-secret')),
    'STARTUP_FAILED',
  );
});
test('SQL application-lock outcomes fail closed on missing/negative/unknown result', () => {
  for (const value of [-1, -2, -3, -999, 2, undefined, null, '0', NaN])
    assert.throws(() => assertSqlLockResult(value));
  assertSqlLockResult(0);
  assertSqlLockResult(1);
});
