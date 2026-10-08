import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/api/app.js';
import { setupService } from '../../src/services/setup.js';
import { setupHandlers } from '../../src/api/setup.js';
import { sql } from '../../src/repository/access-scope.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { emptyFixture, input, time, snapshot, password } from './provider-suite.js';
const origin = 'https://friday.invalid';
async function http(
  work: (
    base: string,
    token: string,
    f: Awaited<ReturnType<typeof emptyFixture>>,
    logs: unknown[],
  ) => Promise<void>,
) {
  const f = await emptyFixture(sqliteFixture);
  let token = '';
  const logs: unknown[] = [];
  const service = await setupService(f.db, {
    announceToken: (value) => {
      token = value;
    },
    clock: () => new Date(time),
  });
  const server = createApp(
    undefined,
    undefined,
    { origin, handlers: setupHandlers(service) },
    (event) => logs.push(event),
  ).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  try {
    const a = server.address();
    assert(a && typeof a === 'object');
    await work(`http://127.0.0.1:${a.port}`, token, f, logs);
  } finally {
    service.dispose();
    server.closeAllConnections();
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
    await f.close();
  }
}
const headers = { Origin: origin, 'Content-Type': 'application/json' };
test('HTTP public meta/setup enforce Origin/schema, create safe201 without session and close409', async () => {
  await http(async (base, token, f, logs) => {
    const meta = await fetch(base + '/api/meta');
    assert.equal(meta.status, 200);
    assert.equal(meta.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Object.keys(await meta.json()).sort(), ['setupRequired', 'version']);
    for (const originValue of [undefined, 'https://evil.invalid']) {
      const response = await fetch(base + '/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(originValue ? { Origin: originValue } : {}),
        },
        body: JSON.stringify(input(token)),
      });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).error.code, 'INVALID_ORIGIN');
    }
    const invalid = await fetch(base + '/api/setup', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...input(token), org_role: 'admin' }),
    });
    assert.equal(invalid.status, 422);
    const wrong = await fetch(base + '/api/setup', {
      method: 'POST',
      headers,
      body: JSON.stringify(input('x'.repeat(64))),
    });
    assert.equal(wrong.status, 403);
    const detail = await wrong.json();
    assert.equal(detail.error.code, 'INVALID_SETUP_TOKEN');
    assert.equal(detail.error.requestId, wrong.headers.get('x-request-id'));
    const created = await fetch(base + '/api/setup', {
      method: 'POST',
      headers,
      body: JSON.stringify(input(token)),
    });
    assert.equal(created.status, 201);
    assert.equal(created.headers.get('set-cookie'), null);
    const text = await created.text();
    assert(!text.includes(token));
    assert(!text.includes(password));
    assert(!text.includes('password_hash'));
    const duplicate = await fetch(base + '/api/setup', {
      method: 'POST',
      headers,
      body: JSON.stringify(input('x'.repeat(64))),
    });
    assert.equal(duplicate.status, 409);
    assert.equal((await (await fetch(base + '/api/meta')).json()).setupRequired, false);
    assert.deepEqual(await snapshot(f.db), [1, 1, 1, 1, 0, 0]);
    assert(!JSON.stringify(logs).includes(token));
    assert(!JSON.stringify(logs).includes(password));
  });
});
test('HTTP setup attempt limit uses socket IP despite spoofed forwarded headers and returns429/Retry-After', async () => {
  await http(async (base, token, f) => {
    for (let i = 0; i < 10; i++) {
      const response = await fetch(base + '/api/setup', {
        method: 'POST',
        headers: { ...headers, 'X-Forwarded-For': `192.0.2.${i + 1}` },
        body: JSON.stringify(input('x'.repeat(64))),
      });
      assert.equal(response.status, 403);
    }
    const response = await fetch(base + '/api/setup', {
      method: 'POST',
      headers,
      body: JSON.stringify(input(token)),
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '900');
    assert.equal((await response.json()).error.code, 'RATE_LIMITED');
    await f.db.transaction(async (tx) => {
      const rows = await tx.query<{ attempts: number }>(
        sql('SELECT attempts FROM dbo.rate_limit_buckets'),
      );
      assert.deepEqual(rows, [{ attempts: 10 }]);
    });
    assert.deepEqual(await snapshot(f.db), [0, 0, 0, 0, 0, 0]);
  });
});
