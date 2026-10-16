import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
const origin = 'https://registrations.invalid';
const headers = { Origin: origin, 'Content-Type': 'application/json' };
const input = { email: 'new@example.invalid', display_name: 'สมาชิกใหม่', password };
async function fixture(
  work: (base: string, f: Awaited<ReturnType<typeof sessionFixture>>) => Promise<void>,
) {
  const f = await sessionFixture(sqliteFixture);
  const server = createApp(undefined, undefined, {
    origin,
    ...(await sessionHooks(f.db, { clock: f.clock, cookieSecure: true })),
  }).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const a = server.address();
  assert(a && typeof a === 'object');
  try {
    await work(`http://127.0.0.1:${a.port}`, f);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await f.close();
  }
}
async function login(base: string, username: string) {
  const response = await fetch(base + '/api/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, password }),
  });
  assert.equal(response.status, 200);
  const self = await response.json();
  return {
    self,
    headers: {
      ...headers,
      Cookie: response.headers.get('set-cookie')!.split(';')[0]!,
      'X-CSRF-Token': self.csrf,
    },
  };
}
test('email signup HTTP guards, Admin-only review and idempotent approval; no grants or credential leak', () =>
  fixture(async (base, f) => {
    let response = await fetch(base + '/api/register', {
      method: 'POST',
      headers: { ...headers, Origin: 'https://wrong.invalid' },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 403);
    response = await fetch(base + '/api/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...input, org_role: 'admin' }),
    });
    assert.equal(response.status, 422);
    response = await fetch(base + '/api/register', {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 202);
    assert.equal(response.headers.get('set-cookie'), null);
    const accepted = await response.json();
    assert.deepEqual(Object.keys(accepted), ['message']);
    response = await fetch(base + '/api/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...input,
        email: 'NEW@EXAMPLE.INVALID',
        password: 'Replacement-password',
      }),
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), accepted);
    response = await fetch(base + '/api/login', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: input.email, password }),
    });
    assert.equal(response.status, 401);
    assert.equal((await fetch(base + '/api/registrations')).status, 401);
    const member = await login(base, 'Member');
    assert.equal(
      (await fetch(base + '/api/registrations', { headers: member.headers })).status,
      403,
    );
    const admin = await login(base, 'Admin');
    response = await fetch(base + '/api/registrations', { headers: admin.headers });
    assert.equal(response.status, 200);
    const item = (await response.json()).items[0];
    const path = base + `/api/registrations/${item.id}/approve`,
      body = JSON.stringify({ version: item.version }),
      key = randomUUID();
    response = await fetch(path, {
      method: 'POST',
      headers: { ...member.headers, 'Idempotency-Key': key },
      body,
    });
    assert.equal(response.status, 403);
    response = await fetch(path, {
      method: 'POST',
      headers: { ...admin.headers, 'X-CSRF-Token': '', 'Idempotency-Key': key },
      body,
    });
    assert.equal(response.status, 403);
    response = await fetch(path, { method: 'POST', headers: admin.headers, body });
    assert.equal(response.status, 422);
    response = await fetch(path, {
      method: 'POST',
      headers: { ...admin.headers, 'Idempotency-Key': key },
      body,
    });
    assert.equal(response.status, 200);
    const approved = await response.json();
    assert.equal(approved.item.status, 'approved');
    response = await fetch(path, {
      method: 'POST',
      headers: { ...admin.headers, 'Idempotency-Key': key },
      body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), approved);
    response = await fetch(path, {
      method: 'POST',
      headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
      body,
    });
    assert.equal(response.status, 409);
    const user = await login(base, 'NEW@EXAMPLE.INVALID');
    assert.equal(user.self.user.org_role, 'member');
    assert.deepEqual(user.self.user.teams, []);
    assert.deepEqual(user.self.effective_summary.project_ids, []);
    assert.equal((await fetch(base + '/api/registrations', { headers: user.headers })).status, 403);
    const audits = await f.db.transaction((tx) =>
      tx.query(sql("SELECT id FROM dbo.admin_events WHERE action='registration_approved'")),
    );
    assert.equal(audits.length, 1);
    const stored = await f.db.transaction((tx) =>
      tx.query<{ request_hash: string; response_body: string }>(
        sql('SELECT request_hash,response_body FROM dbo.idempotency_keys'),
      ),
    );
    assert(!JSON.stringify(stored).includes(password));
  }));
test('rejection stays inactive, review races have one winner and stale version reports current version', () =>
  fixture(async (base) => {
    assert.equal(
      (
        await fetch(base + '/api/register', {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
        })
      ).status,
      202,
    );
    const admin = await login(base, 'Admin');
    const item = (
      await (await fetch(base + '/api/registrations', { headers: admin.headers })).json()
    ).items[0];
    const replies = await Promise.all(
      ['reject', 'approve'].map((decision) =>
        fetch(base + `/api/registrations/${item.id}/${decision}`, {
          method: 'POST',
          headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
          body: JSON.stringify({ version: item.version }),
        }),
      ),
    );
    assert.deepEqual(replies.map((r) => r.status).sort(), [200, 409]);
    const winner = await replies.find((r) => r.status === 200)!.json();
    const conflict = await replies.find((r) => r.status === 409)!.json();
    assert.equal(conflict.error.currentVersion, 2);
    const response = await fetch(base + '/api/login', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: input.email, password }),
    });
    assert.equal(response.status, winner.item.status === 'approved' ? 200 : 401);
  }));
