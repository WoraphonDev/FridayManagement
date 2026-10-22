import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStaging } from '../../scripts/windows/staging-policy.mjs';
const env = { NODE_ENV: 'test', HOST: '127.0.0.1', DB_PROVIDER: 'postgres', DB_SERVER: '127.0.0.1', DB_PORT: '5432', DB_NAME: 'friday_staging', COOKIE_SECURE: 'true', APP_ORIGIN: 'https://friday.example.test', TRUSTED_PROXY: '127.0.0.1' };
test('isolated HTTPS PostgreSQL staging is accepted', () => assert.doesNotThrow(() => validateStaging(env, env)));
test('production, remote binding and insecure staging fail closed', () => {
  for (const [key, value] of Object.entries({ NODE_ENV: 'production', HOST: '0.0.0.0', DB_PROVIDER: 'sqlite', DB_SERVER: 'remote', COOKIE_SECURE: 'false', APP_ORIGIN: 'http://localhost', TRUSTED_PROXY: '*' })) {
    assert.throws(() => validateStaging({ ...env, [key]: value }, { ...env, [key]: value }), /STAGING/);
  }
});
test('inherited environment cannot silently override private file', () => {
  assert.throws(() => validateStaging(env, { ...env, DB_PASSWORD: 'inherited' }), /ENVIRONMENT/);
});
