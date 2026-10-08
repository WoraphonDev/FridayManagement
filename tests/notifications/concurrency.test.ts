import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { seed, insert } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
test('T049 actual two-process reminder race and new-process restart have one DB tuple per day', async () => {
  const root = mkdtempSync(join(tmpdir(), 'friday-reminder-race-')),
    path = join(root, 'fixture.sqlite'),
    db = new SqliteDatabase(path),
    children: ChildProcess[] = [];
  const run = (count: number) => {
    let ready = 0;
    return Promise.all(
      Array.from(
        { length: count },
        () =>
          new Promise<{ inserted: number; today: string }>((resolveJob, reject) => {
            const c = spawn(
              process.execPath,
              ['--import', 'tsx', resolve('tests/notifications/worker.ts'), path],
              { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
            );
            children.push(c);
            let output = '',
              errors = '';
            const timer = setTimeout(() => {
              c.kill('SIGKILL');
              reject(new Error('RACE_TIMEOUT'));
            }, 15000);
            c.stdout!.on('data', (b) => {
              output += String(b);
            });
            c.stderr!.on('data', (b) => {
              errors += String(b);
            });
            c.on('message', (m) => {
              if (m === 'ready' && ++ready === count)
                children.slice(-count).forEach((child) => child.send('start'));
            });
            c.on('error', (e) => {
              clearTimeout(timer);
              reject(e);
            });
            c.on('exit', (code) => {
              clearTimeout(timer);
              if (code !== 0) reject(new Error(errors));
              else resolveJob(JSON.parse(output) as { inserted: number; today: string });
            });
          }),
      ),
    );
  };
  try {
    await migrate(db);
    await db.transaction(async (tx) => {
      await seed(tx);
      for (let i = 0; i < 205; i++)
        await tx.execute(
          insert('tasks', {
            project_id: 1,
            title: 'Race ' + i,
            creator_id: 1,
            assignee_id: 1,
            due_date: '2026-10-06',
          }),
        );
    });
    const results = await run(2);
    assert.equal(
      results.reduce((n, r) => n + r.inserted, 0),
      205,
    );
    assert(results.every((r) => r.today === '2026-10-06'));
    assert.equal((await run(1))[0]!.inserted, 0);
    const n = await db.transaction((tx) =>
      tx.query(sql('SELECT dedupe_key FROM dbo.notifications')),
    );
    assert.equal(n.length, 205);
    assert.equal(new Set(n.map((r) => r.dedupe_key)).size, 205);
  } finally {
    children.filter((c) => c.exitCode === null).forEach((c) => c.kill('SIGKILL'));
    await db.close();
    rmSync(root, { recursive: true, force: true });
  }
});
