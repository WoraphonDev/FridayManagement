import test from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { seed, insert } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { hashPassword } from '../../src/security/passwords.js';
import { bangkokToday } from '../../src/domain/dates.js';
test('T049 actual server reminder runs without browser/GET; GET list/detail/board/me do not dispatch or extend idle', async () => {
  const f = await startupFixture(),
    db = new SqliteDatabase(f.path);
  let app: Awaited<ReturnType<typeof startApplication>> | undefined;
  const rows = (q: string) => db.transaction((tx) => tx.query(sql(q)));
  try {
    await db.transaction(async (tx) => {
      await seed(tx);
      for (const user_id of [1, 2])
        await tx.execute(insert('user_view_revisions', { user_id, revision: randomUUID() }));
    });
    const hash = await hashPassword('Notification-http-fixture-password');
    await db.transaction((tx) =>
      tx.execute(sql('UPDATE dbo.users SET must_change_password=0,password_hash=@hash', { hash })),
    );
    const today = bangkokToday(new Date().toISOString());
    await db.transaction((tx) =>
      tx.execute(sql('UPDATE dbo.tasks SET due_date=@today,assignee_id=1 WHERE id=1', { today })),
    );
    app = await startApplication({ ...f.env, REMINDER_SECONDS: '1' });
    assert.equal((await rows('SELECT id FROM dbo.notifications')).length, 1);
    await db.transaction((tx) =>
      tx.execute(sql('UPDATE dbo.tasks SET due_date=@today,assignee_id=1 WHERE id=2', { today })),
    );
    const until = Date.now() + 4000;
    while (Date.now() < until && (await rows('SELECT id FROM dbo.notifications')).length < 2)
      await delay(100);
    assert.equal((await rows('SELECT id FROM dbo.notifications')).length, 2);
    const login = await fetch(f.env.APP_ORIGIN + '/api/login', {
      method: 'POST',
      headers: { Origin: f.env.APP_ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Admin', password: 'Notification-http-fixture-password' }),
    });
    assert.equal(login.status, 200, login.status === 200 ? undefined : await login.text());
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const before = await rows('SELECT last_seen_at FROM dbo.sessions'),
      notifications = await rows('SELECT id FROM dbo.notifications');
    for (const path of ['/api/me', '/api/tasks', '/api/tasks/1', '/api/projects/1/board']) {
      const response = await fetch(f.env.APP_ORIGIN + path, { headers: { Cookie: cookie } });
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }
    assert.deepEqual(await rows('SELECT last_seen_at FROM dbo.sessions'), before);
    assert.deepEqual(await rows('SELECT id FROM dbo.notifications'), notifications);
    await app.stop();
    app = undefined;
    await db.transaction((tx) => tx.execute(sql('DELETE FROM dbo.notifications')));
    await delay(1100);
    assert.equal((await rows('SELECT id FROM dbo.notifications')).length, 0);
    app = await startApplication({ ...f.env, REMINDER_SECONDS: '1' });
    assert.equal((await rows('SELECT id FROM dbo.notifications')).length, 2);
  } finally {
    await app?.stop();
    await db.close();
    rmSync(f.root, { recursive: true, force: true });
  }
});
