import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStaging } from '../../scripts/windows/staging-policy.mjs';
const env = { NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '3000', DB_PROVIDER: 'postgres', DB_SERVER: '127.0.0.1', DB_PORT: '5432', DB_NAME: 'friday_staging', COOKIE_SECURE: 'true', APP_ORIGIN: 'https://friday.example.test', TRUSTED_PROXY: '127.0.0.1' };
test('staging rejects a database not explicitly named as staging', () => {
  const unsafe = { ...env, DB_NAME: 'friday' };
  assert.throws(() => validateStaging(unsafe, unsafe), /STAGING/);
});
test('all configuration overrides are rejected, not just network and DB keys', () => {
  for (const key of ['SESSION_IDLE_MIN', 'MAX_FILE_BYTES', 'POLL_SECONDS', 'SQLITE_DB_PATH']) {
    assert.throws(() => validateStaging(env, { ...env, [key]: '1' }), /ENVIRONMENT/);
  }
});
test('libpq ambient options are rejected to keep maintenance scope explicit', () => {
  assert.throws(() => validateStaging(env, { ...env, PGOPTIONS: '-c search_path=other' }), /ENVIRONMENT/);
});
