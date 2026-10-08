import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
import { input } from '../setup/provider-suite.js';
import { password } from './fixtures.js';
test('actual migrated startup serves setup→login/me/activity/logout and respects configured cookie lifetime after restart', async () => {
  const f = await startupFixture(),
    env = { ...f.env, SESSION_IDLE_MIN: '1', SESSION_ABSOLUTE_MIN: '2' };
  let token = '',
    app: Awaited<ReturnType<typeof startApplication>> | undefined;
  const headers = { Origin: env.APP_ORIGIN, 'Content-Type': 'application/json' };
  try {
    app = await startApplication(env, {
      announceSetupToken: (t) => {
        token = t;
      },
    });
    const setup = await fetch(env.APP_ORIGIN + '/api/setup', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...input(token, 'Admin'), password }),
    });
    assert.equal(setup.status, 201);
    await Promise.all([app.stop(), app.stop()]);
    let announced = false;
    app = await startApplication(env, {
      announceSetupToken: () => {
        announced = true;
      },
    });
    assert.equal(announced, false);
    const before = Date.now(),
      response = await fetch(env.APP_ORIGIN + '/api/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ username: 'admin', password }),
      });
    assert.equal(response.status, 200);
    const self = await response.json(),
      cookie = response.headers.get('set-cookie')!,
      c = cookie.split(';')[0]!;
    assert(!cookie.includes('Secure'));
    const expiry = Date.parse(/Expires=([^;]+)/.exec(cookie)![1]!);
    assert(expiry >= before + 118000 && expiry <= Date.now() + 120000);
    assert.equal((await fetch(env.APP_ORIGIN + '/api/me', { headers: { Cookie: c } })).status, 200);
    const auth = { ...headers, Cookie: c, 'X-CSRF-Token': self.csrf };
    assert.equal(
      (await fetch(env.APP_ORIGIN + '/api/session/activity', { method: 'POST', headers: auth }))
        .status,
      204,
    );
    assert.equal(
      (await fetch(env.APP_ORIGIN + '/api/logout', { method: 'POST', headers: auth })).status,
      204,
    );
    assert.equal((await fetch(env.APP_ORIGIN + '/api/me', { headers: { Cookie: c } })).status, 401);
    assert.equal((await fetch(env.APP_ORIGIN + '/health/ready')).status, 200);
  } finally {
    await app?.stop();
    rmSync(f.root, { recursive: true, force: true });
  }
});
