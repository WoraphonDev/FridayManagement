import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import type { ApiHooks } from '../../src/api/middleware.js';
const origin = 'https://accounts.invalid';
const config = parseConfiguration({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: '/private/tmp/accounts-http',
  LOG_DIR: '/private/tmp/accounts-log',
  SQLITE_DB_PATH: '/private/tmp/accounts-http/fixture.sqlite',
  APP_ORIGIN: origin,
  COOKIE_SECURE: 'true',
});
const basic = { Origin: origin, 'Content-Type': 'application/json' };
async function fixture(
  work: (base: string, f: Awaited<ReturnType<typeof sessionFixture>>) => Promise<void>,
  additional: NonNullable<ApiHooks['handlers']> = {},
) {
  const f = await sessionFixture(sqliteFixture);
  const server = createApp(
    undefined,
    config,
    await sessionHooks(f.db, { clock: f.clock, cookieSecure: true }, additional),
  ).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const address = server.address();
  assert(address && typeof address === 'object');
  try {
    await work(`http://127.0.0.1:${address.port}`, f);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await f.close();
  }
}
async function login(base: string, username = 'Admin') {
  const response = await fetch(base + '/api/login', {
    method: 'POST',
    headers: basic,
    body: JSON.stringify({ username, password }),
  });
  assert.equal(response.status, 200);
  const self = await response.json();
  return {
    cookie: response.headers.get('set-cookie')!.split(';')[0]!,
    self,
    headers: {
      ...basic,
      Cookie: response.headers.get('set-cookie')!.split(';')[0]!,
      'X-CSRF-Token': self.csrf,
    },
  };
}
test('T015 HTTP forced gate rotates cookie+CSRF only after commit, revokes other sessions and grants current scoped reads', () =>
  fixture(
    async (base) => {
      const admin = await login(base);
      const made = await fetch(base + '/api/users', {
        method: 'POST',
        headers: admin.headers,
        body: JSON.stringify({ username: 'Temp', display_name: 'Temp', temp_password: password }),
      });
      assert.equal(made.status, 201);
      const temp = await login(base, 'Temp'),
        other = await login(base, 'Temp');
      assert.equal(
        (await fetch(base + '/api/tasks', { headers: { Cookie: temp.cookie } })).status,
        403,
      );
      const wrong = await fetch(base + '/api/password', {
        method: 'POST',
        headers: temp.headers,
        body: JSON.stringify({ current_password: 'wrong', new_password: 'Six!ok' }),
      });
      assert.equal(wrong.status, 401);
      assert.equal(wrong.headers.get('set-cookie'), null);
      assert((await wrong.json()).error.fieldErrors.current_password);
      const result = await fetch(base + '/api/password', {
        method: 'POST',
        headers: temp.headers,
        body: JSON.stringify({ current_password: password, new_password: 'Six!ok' }),
      });
      assert.equal(result.status, 200);
      const body = await result.json(),
        cookie = result.headers.get('set-cookie')!.split(';')[0]!;
      assert.notEqual(cookie, temp.cookie);
      assert.notEqual(body.csrf, temp.self.csrf);
      assert.equal(body.must_change_password, false);
      assert.equal(
        (await fetch(base + '/api/me', { headers: { Cookie: other.cookie } })).status,
        401,
      );
      assert.equal((await fetch(base + '/api/tasks', { headers: { Cookie: cookie } })).status, 200);
      assert.equal(
        (
          await fetch(base + '/api/session/activity', {
            method: 'POST',
            headers: { ...temp.headers, Cookie: cookie },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await fetch(base + '/api/session/activity', {
            method: 'POST',
            headers: { ...temp.headers, Cookie: cookie, 'X-CSRF-Token': body.csrf },
          })
        ).status,
        204,
      );
    },
    {
      get_api_tasks: async () => ({
        status: 200,
        body: { items: [], page: 1, pageSize: 50, total: 0 },
      }),
    },
  ));
test('T016 HTTP origin/CSRF/access/strict input/version/last-admin and secret-free create/list/reset', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    const post = (path: string, body: unknown, headers = admin.headers, method = 'POST') =>
      fetch(base + path, { method, headers, body: JSON.stringify(body) });
    assert.equal(
      (await fetch(base + '/api/users', { headers: { Cookie: member.cookie } })).status,
      403,
    );
    assert.equal(
      (
        await post(
          '/api/users',
          { username: 'Nope', display_name: 'Nope', temp_password: password },
          { ...admin.headers, Origin: 'https://evil.invalid' },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await post(
          '/api/users',
          { username: 'Nope', display_name: 'Nope', temp_password: password },
          { ...admin.headers, 'X-CSRF-Token': 'x'.repeat(64) },
        )
      ).status,
      403,
    );
    const made = await post('/api/users', {
      username: 'New',
      display_name: 'New',
      temp_password: password,
    });
    assert.equal(made.status, 201);
    const newUser = await made.json();
    assert.deepEqual(Object.keys(newUser), ['item']);
    assert(!JSON.stringify(newUser).includes(password));
    const duplicate = await post('/api/users', {
      username: 'nEW',
      display_name: 'dup',
      temp_password: password,
    });
    assert.equal(duplicate.status, 422);
    assert((await duplicate.json()).error.fieldErrors.username);
    const stale = await post(
      '/api/users/2',
      { version: 2, display_name: 'stale' },
      admin.headers,
      'PATCH',
    );
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).error.currentVersion, 1);
    const guard = await post('/api/users/1', { version: 1, active: false }, admin.headers, 'PATCH');
    assert.equal((await guard.json()).error.code, 'LAST_ACTIVE_ADMIN');
    const reset = await post('/api/users/2/reset-password', {
      version: 1,
      admin_password: password,
      temp_password: 'Reset-fixture-password',
    });
    assert.equal(reset.status, 200);
    assert.equal((await reset.json()).item.must_change_password, true);
    assert.equal(
      (await fetch(base + '/api/me', { headers: { Cookie: member.cookie } })).status,
      401,
    );
    const events = JSON.stringify(
      await f.db.transaction((tx) =>
        tx.query(sql('SELECT redacted_changes FROM dbo.admin_events')),
      ),
    );
    assert(!events.includes(password));
    assert(!events.includes('scrypt$'));
    assert.equal(
      (await fetch(base + '/api/users', { headers: { Cookie: admin.cookie } })).status,
      200,
    );
  }));
test('T016 same-role self edit is no-op and does not clear valid cookie', () =>
  fixture(async (base) => {
    const a = await login(base);
    const response = await fetch(base + '/api/users/1', {
      method: 'PATCH',
      headers: a.headers,
      body: JSON.stringify({ version: 1, org_role: 'admin' }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal((await fetch(base + '/api/me', { headers: { Cookie: a.cookie } })).status, 200);
  }));

test('T015 unknown password commit never sends rotated cookie or retries credentials; authoritative fresh login resolves outcome', async () => {
  const f = await sessionFixture(sqliteFixture);
  let lost = false,
    writes = 0;
  const db: import('../../src/domain/database.js').Database = {
    provider: f.db.provider,
    close: () => f.db.close(),
    transaction: async (work) => {
      const result = await f.db.transaction(async (tx) =>
        work({
          ...tx,
          execute: async (statement) => {
            if (statement.sqlserver.startsWith('UPDATE dbo.users SET password_hash')) writes++;
            await tx.execute(statement);
          },
        }),
      );
      if (lost && result && typeof result === 'object' && 'status' in result) {
        const { TransactionFailure } = await import('../../src/domain/failure.js');
        throw new TransactionFailure('unknown', new Error('private-fixture-secret'));
      }
      return result;
    },
  };
  const logs: unknown[] = [];
  const server = createApp(
    undefined,
    config,
    await sessionHooks(db, { clock: f.clock, cookieSecure: true }),
    (e) => logs.push(e),
  ).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const address = server.address();
  assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const a = await login(base);
    lost = true;
    const changed = await fetch(base + '/api/password', {
      method: 'POST',
      headers: a.headers,
      body: JSON.stringify({
        current_password: password,
        new_password: 'Uncertain-fixture-password',
      }),
    });
    assert.equal(changed.status, 503);
    assert.equal(changed.headers.get('set-cookie'), null);
    assert.equal(writes, 1);
    const message = JSON.stringify(await changed.json());
    assert(!message.includes('private-fixture-secret'));
    lost = false;
    assert.equal((await fetch(base + '/api/me', { headers: { Cookie: a.cookie } })).status, 401);
    const fresh = await fetch(base + '/api/login', {
      method: 'POST',
      headers: basic,
      body: JSON.stringify({ username: 'Admin', password: 'Uncertain-fixture-password' }),
    });
    assert.equal(fresh.status, 200);
    assert.equal((await fresh.json()).must_change_password, false);
    assert(!JSON.stringify(logs).includes('private-fixture-secret'));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await f.close();
  }
});
