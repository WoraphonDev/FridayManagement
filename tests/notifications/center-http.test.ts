import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { seed, insert } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { hashPassword } from '../../src/security/passwords.js';
test('T050-054 actual HTTP notification/read CSRF/own scope, GET nonmutation, streamed CSV headers/error/filter and scheduler retention', async () => {
  const f = await startupFixture(),
    db = new SqliteDatabase(f.path);
  let app: Awaited<ReturnType<typeof startApplication>> | undefined;
  const password = 'Center-http-fixture-password',
    at = new Date().toISOString(),
    old = new Date(Date.now() - 91 * 86400000).toISOString();
  const rows = (q: string) => db.transaction((tx) => tx.query(sql(q)));
  try {
    const hash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await seed(tx);
      await tx.execute(
        sql('UPDATE dbo.users SET must_change_password=0,password_hash=@hash', { hash }),
      );
      for (const user_id of [1, 2])
        await tx.execute(insert('user_view_revisions', { user_id, revision: randomUUID() }));
      for (const [recipient_id, created_at] of [
        [1, at],
        [2, at],
        [1, old],
      ] as const)
        await tx.execute(
          insert('notifications', {
            recipient_id,
            task_id: 1,
            type: 'comment',
            message: 'synthetic notification',
            dedupe_key: randomUUID(),
            created_at,
          }),
        );
      await tx.execute(sql('UPDATE dbo.tasks SET created_at=@at,updated_at=@at', { at }));
    });
    app = await startApplication(f.env);
    assert.equal((await rows('SELECT id FROM dbo.notifications')).length, 2);
    const login = await fetch(f.env.APP_ORIGIN + '/api/login', {
      method: 'POST',
      headers: { Origin: f.env.APP_ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Admin', password }),
    });
    assert.equal(login.status, 200);
    const self = await login.json(),
      cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const get = (path: string) => fetch(f.env.APP_ORIGIN + path, { headers: { Cookie: cookie } }),
      post = (path: string, csrf = self.csrf) =>
        fetch(f.env.APP_ORIGIN + path, {
          method: 'POST',
          headers: { Cookie: cookie, Origin: f.env.APP_ORIGIN, 'X-CSRF-Token': csrf },
        });
    const before = await rows('SELECT * FROM dbo.notifications ORDER BY id'),
      sessions = await rows('SELECT last_seen_at FROM dbo.sessions');
    const n = await get('/api/notifications');
    assert.equal(n.status, 200);
    const page = await n.json();
    assert.equal(page.unread_count, 1);
    assert.equal(page.items.length, 1);
    assert.equal(n.headers.get('cache-control'), 'no-store');
    const summary = await get('/api/reports/summary?project=1');
    assert.equal(summary.status, 200);
    assert.equal((await summary.json()).total, 2);
    const csv = await get('/api/export/tasks.csv?project=1');
    assert.equal(csv.status, 200);
    assert(csv.headers.get('content-type')?.startsWith('text/csv'));
    assert.equal(csv.headers.get('content-length'), null);
    assert.equal(csv.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(csv.headers.get('cache-control'), 'no-store');
    assert(csv.headers.get('content-disposition')?.includes('attachment'));
    const bytes = Buffer.from(await csv.arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 3)], [239, 187, 191]);
    assert.equal((bytes.toString().match(/\r\n"\d+",/g) ?? []).length, 2);
    assert.deepEqual(await rows('SELECT * FROM dbo.notifications ORDER BY id'), before);
    assert.deepEqual(await rows('SELECT last_seen_at FROM dbo.sessions'), sessions);
    assert.equal((await get('/api/reports/summary?page=1')).status, 400);
    assert.equal((await get('/api/export/tasks.csv?pageSize=1')).status, 400);
    assert.equal((await post('/api/notifications/1/read', 'bad')).status, 403);
    assert.equal((await post('/api/notifications/2/read')).status, 404);
    const one = await post('/api/notifications/1/read');
    assert.equal(one.status, 200);
    assert((await one.json()).item.read_at);
    assert.equal((await post('/api/notifications/read-all')).status, 200);
    assert.equal(
      (await rows('SELECT read_at FROM dbo.notifications WHERE recipient_id=2'))[0]!.read_at,
      null,
    );
    const anonymous = await fetch(f.env.APP_ORIGIN + '/api/export/tasks.csv');
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers.get('content-disposition'), null);
  } finally {
    await app?.stop();
    await db.close();
    rmSync(f.root, { recursive: true, force: true });
  }
});
