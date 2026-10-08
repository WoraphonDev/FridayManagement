import test from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from './fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import type { ApiHooks } from '../../src/api/middleware.js';
import type { Database } from '../../src/domain/database.js';
import { TransactionFailure } from '../../src/domain/failure.js';
const origin = 'https://friday.invalid';
const configuration = parseConfiguration({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: '/private/tmp/friday-http-fixture',
  LOG_DIR: '/private/tmp/friday-http-logs',
  SQLITE_DB_PATH: '/private/tmp/friday-http-fixture/fixture.sqlite',
  APP_ORIGIN: origin,
  COOKIE_SECURE: 'true',
});
const headers = { Origin: origin, 'Content-Type': 'application/json' };
const body = JSON.stringify({ username: 'ADMIN', password });
async function http(hooks: ApiHooks, work: (base: string) => Promise<void>, logs: unknown[] = []) {
  const server = createApp(undefined, configuration, hooks, (event) => logs.push(event)).listen(
    0,
    '127.0.0.1',
  );
  await new Promise<void>((r) => server.once('listening', r));
  const address = server.address();
  assert(address && typeof address === 'object');
  try {
    await work(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
  }
}
const cookie = (response: Response) => response.headers.get('set-cookie')!.split(';')[0]!;
test('real login cookie/Self/no-store, readonly me, Origin+CSRF activity, logout commit and old-cookie401', async () => {
  const f = await sessionFixture(sqliteFixture);
  try {
    await http(await sessionHooks(f.db, { clock: f.clock, cookieSecure: true }), async (base) => {
      const login = await fetch(base + '/api/login', { method: 'POST', headers, body });
      assert.equal(login.status, 200);
      const self = await login.json(),
        sessionCookie = cookie(login),
        setCookie = login.headers.get('set-cookie')!;
      for (const attribute of ['HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/', 'Expires='])
        assert(setCookie.includes(attribute));
      assert(!setCookie.includes('Domain='));
      assert.equal(login.headers.get('cache-control'), 'no-store');
      assert(!JSON.stringify(self).includes(sessionCookie.split('=')[1]!));
      const me = await fetch(base + '/api/me', { headers: { Cookie: sessionCookie } });
      assert.equal(me.status, 200);
      assert.deepEqual(await me.json(), self);
      const before = await f.db.transaction((tx) =>
        tx.query(sql('SELECT last_seen_at FROM dbo.sessions')),
      );
      f.setTime('2026-10-06T00:30:00.000Z');
      assert.equal(
        (await fetch(base + '/api/me', { headers: { Cookie: sessionCookie } })).status,
        200,
      );
      assert.deepEqual(
        await f.db.transaction((tx) => tx.query(sql('SELECT last_seen_at FROM dbo.sessions'))),
        before,
      );
      const auth = { ...headers, Cookie: sessionCookie, 'X-CSRF-Token': self.csrf };
      assert.equal(
        (
          await fetch(base + '/api/session/activity', {
            method: 'POST',
            headers: { ...auth, 'X-CSRF-Token': 'x'.repeat(64) },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await fetch(base + '/api/session/activity', {
            method: 'POST',
            headers: { ...auth, Origin: 'https://evil.invalid' },
          })
        ).status,
        403,
      );
      assert.equal(
        (await fetch(base + '/api/session/activity', { method: 'POST', headers: auth })).status,
        204,
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT last_seen_at FROM dbo.sessions'))))[0]!
          .last_seen_at,
        '2026-10-06T00:30:00.000Z',
      );
      const logout = await fetch(base + '/api/logout', { method: 'POST', headers: auth });
      assert.equal(logout.status, 204);
      assert.equal(await logout.text(), '');
      assert(logout.headers.get('set-cookie')!.includes('Expires=Thu, 01 Jan 1970'));
      assert(logout.headers.get('set-cookie')!.includes('Secure'));
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT token_hash FROM dbo.sessions'))))
          .length,
        0,
      );
      const reused = await fetch(base + '/api/me', { headers: { Cookie: sessionCookie } });
      assert.equal(reused.status, 401);
      assert(reused.headers.get('set-cookie')!.includes('Expires=Thu, 01 Jan 1970'));
    });
  } finally {
    await f.close();
  }
});
test('generic login errors, strict ingress, duplicate/malformed cookies and caller fields cannot authenticate', async () => {
  const f = await sessionFixture(sqliteFixture),
    logs: unknown[] = [];
  try {
    await http(
      await sessionHooks(f.db, { clock: f.clock, cookieSecure: true }),
      async (base) => {
        const send = (value: unknown, h = headers) =>
          fetch(base + '/api/login', { method: 'POST', headers: h, body: JSON.stringify(value) });
        for (const value of [
          { username: 'Missing', password },
          { username: 'ADMIN', password: 'x' },
          { username: 'ADMIN', password: password.trim() },
        ]) {
          const response = await send(value);
          assert.equal(response.status, 401);
          const error = (await response.json()).error;
          assert.equal(error.code, 'INVALID_CREDENTIALS');
          assert.equal(error.message, 'Please sign in again.');
          assert(!response.headers.has('set-cookie'));
        }
        await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=1')));
        assert.equal((await send({ username: 'ADMIN', password })).status, 401);
        await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=1 WHERE id=1')));
        const count = await f.db.transaction((tx) =>
          tx.query(sql('SELECT SUM(attempts) AS n FROM dbo.rate_limit_buckets')),
        );
        assert.equal((await send({ username: 'ADMIN', password, user_id: 1 })).status, 422);
        assert.equal(
          (
            await send(
              { username: 'ADMIN', password },
              { ...headers, Origin: 'https://evil.invalid' },
            )
          ).status,
          403,
        );
        assert.equal((await send({ username: 'ADMIN', password: '' })).status, 422);
        assert.deepEqual(
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT SUM(attempts) AS n FROM dbo.rate_limit_buckets')),
          ),
          count,
        );
        const good = await send({ username: 'ADMIN', password }),
          validCookie = cookie(good);
        for (const c of [`${validCookie}; ${validCookie}`, 'friday_session=invalid'])
          assert.equal((await fetch(base + '/api/me', { headers: { Cookie: c } })).status, 401);
        assert.equal(
          (await fetch(base + '/api/me?user_id=1', { headers: { Cookie: validCookie } })).status,
          400,
        );
        assert.equal(
          (await fetch(base + '/api/me', { headers: { 'X-User-Id': '1' } })).status,
          401,
        );
        assert.deepEqual(logs, []);
      },
      logs,
    );
  } finally {
    await f.close();
  }
});
test('real session resolver/current authorization: forced gate, polling idle cutoff, maintenance state and scoped Self', async () => {
  const f = await sessionFixture(sqliteFixture);
  try {
    await http(
      await sessionHooks(
        f.db,
        { clock: f.clock, cookieSecure: true },
        {
          get_api_notifications: async () => ({
            status: 200,
            body: { items: [], page: 1, pageSize: 50, total: 0, unread_count: 0 },
          }),
        },
      ),
      async (base) => {
        const response = await fetch(base + '/api/login', { method: 'POST', headers, body }),
          self = await response.json(),
          c = cookie(response);
        const auth = { ...headers, Cookie: c, 'X-CSRF-Token': self.csrf };
        await f.db.transaction((tx) =>
          tx.execute(sql('UPDATE dbo.users SET must_change_password=1 WHERE id=1')),
        );
        const gate = await fetch(base + '/api/notifications', { headers: { Cookie: c } });
        assert.equal(gate.status, 403);
        assert.equal((await gate.json()).error.code, 'PASSWORD_CHANGE_REQUIRED');
        assert.equal((await fetch(base + '/api/me', { headers: { Cookie: c } })).status, 200);
        assert.equal(
          (await fetch(base + '/api/session/activity', { method: 'POST', headers: auth })).status,
          204,
        );
        await f.db.transaction((tx) =>
          tx.execute(sql('UPDATE dbo.users SET must_change_password=0 WHERE id=1')),
        );
        await f.db.transaction((tx) =>
          tx.execute(
            sql(
              "INSERT INTO dbo.maintenance_state(id,owner_id,state,lease_expires_at,created_at,updated_at) VALUES(1,@owner,'frozen',@expires,@now,@now)",
              {
                owner: randomUUID(),
                expires: '2026-10-06T02:00:00.000Z',
                now: '2026-10-06T00:00:00.000Z',
              },
            ),
          ),
        );
        assert.equal(
          (await (await fetch(base + '/api/me', { headers: { Cookie: c } })).json()).maintenance,
          true,
        );
        assert.equal(
          (await fetch(base + '/api/login', { method: 'POST', headers, body })).status,
          503,
        );
        await f.db.transaction((tx) =>
          tx.execute(sql('DELETE FROM dbo.maintenance_state WHERE id=1')),
        );
        f.setTime('2026-10-06T00:59:59.000Z');
        assert.equal(
          (await fetch(base + '/api/notifications', { headers: { Cookie: c } })).status,
          200,
        );
        f.setTime('2026-10-06T01:00:00.000Z');
        assert.equal(
          (await fetch(base + '/api/notifications', { headers: { Cookie: c } })).status,
          401,
        );
      },
    );
  } finally {
    await f.close();
  }
});
test('rollback and unknown login/logout commit outcomes never emit credential/success cookies; errors redact details', async () => {
  const f = await sessionFixture(sqliteFixture),
    logs: unknown[] = [];
  let mode: 'rollback' | 'loginLost' | 'logoutLost' | 'normal' = 'rollback';
  const db: Database = {
    provider: f.db.provider,
    close: () => f.db.close(),
    transaction: async (work) => {
      const result = await f.db.transaction((tx) =>
        work({
          ...tx,
          execute: async (statement) => {
            await tx.execute(statement);
            if (mode === 'rollback' && statement.sqlserver.startsWith('INSERT INTO dbo.sessions'))
              throw new Error('private-fixture-detail');
          },
        }),
      );
      if (
        result &&
        typeof result === 'object' &&
        ((mode === 'loginLost' && 'expires' in result) ||
          (mode === 'logoutLost' && 'afterCommit' in result))
      )
        throw new TransactionFailure('unknown', new Error('private-fixture-detail'));
      return result;
    },
  };
  try {
    await http(
      await sessionHooks(db, { clock: f.clock, cookieSecure: true }),
      async (base) => {
        const send = () => fetch(base + '/api/login', { method: 'POST', headers, body });
        const rollback = await send();
        assert.equal(rollback.status, 500);
        assert(!rollback.headers.has('set-cookie'));
        assert(!(await rollback.text()).includes('private-fixture-detail'));
        assert.equal(
          (await f.db.transaction((tx) => tx.query(sql('SELECT token_hash FROM dbo.sessions'))))
            .length,
          0,
        );
        mode = 'loginLost';
        const uncertain = await send();
        assert.equal(uncertain.status, 503);
        assert(!uncertain.headers.has('set-cookie'));
        assert.equal(
          (await f.db.transaction((tx) => tx.query(sql('SELECT token_hash FROM dbo.sessions'))))
            .length,
          1,
        );
        mode = 'normal';
        const login = await send(),
          self = await login.json(),
          c = cookie(login);
        mode = 'logoutLost';
        const logout = await fetch(base + '/api/logout', {
          method: 'POST',
          headers: { ...headers, Cookie: c, 'X-CSRF-Token': self.csrf },
        });
        assert.equal(logout.status, 503);
        assert(!logout.headers.has('set-cookie'));
        mode = 'normal';
        assert.equal((await fetch(base + '/api/me', { headers: { Cookie: c } })).status, 401);
        assert.equal(logs.length, 1);
        assert.deepEqual(Object.keys(logs[0] as object).sort(), ['code', 'requestId']);
      },
      logs,
    );
  } finally {
    await f.close();
  }
});
