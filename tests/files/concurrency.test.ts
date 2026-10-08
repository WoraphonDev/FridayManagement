import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { seed, insert } from '../schema/fixtures.js';
import { proof, now, csrf } from '../authorization/fixtures.js';
import { fileService } from '../../src/services/files.js';
import { receive } from './helpers.js';
import { sql } from '../../src/repository/access-scope.js';
async function fixture(
  work: (
    path: string,
    root: string,
    db: SqliteDatabase,
    s: Awaited<ReturnType<typeof fileService>>,
  ) => Promise<void>,
  scale = 1,
) {
  const root = mkdtempSync(join(tmpdir(), 'friday-files-process-')),
    path = join(root, 'fixture.sqlite'),
    db = new SqliteDatabase(path);
  try {
    await migrate(db);
    await db.transaction(async (tx) => {
      await seed(tx);
      await tx.execute(sql('UPDATE dbo.users SET must_change_password=0'));
      await tx.execute(
        insert('sessions', {
          token_hash: proof(1).tokenHash,
          user_id: 1,
          csrf_token: csrf,
          auth_version: 1,
          created_at: now,
          last_seen_at: now,
          absolute_expires_at: '2026-10-06T12:00:00.000Z',
        }),
      );
    });
    const s = await fileService(
      db,
      { directory: root, maxFileBytes: 10485760, totalUploadBytes: 20 * scale },
      { clock: () => new Date(now) },
    );
    for (const size of scale === 1 ? [15] : [10 * scale, 5 * scale]) {
      const p = await receive(s, proof(1), Buffer.alloc(size, 97));
      await db.transaction((tx) => s.finalize(tx, proof(1), p, randomUUID()));
    }
    await work(path, root, db, s);
  } finally {
    await db.close();
    rmSync(root, { recursive: true, force: true });
  }
}
function worker(path: string, root: string, mode: string, scale = 1) {
  return spawn(
    process.execPath,
    ['--import', 'tsx', resolve('tests/files/worker.ts'), path, root, mode, String(scale)],
    { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
  );
}
function exit(child: ChildProcess) {
  return new Promise<void>((r, reject) => {
    child.once('exit', () => r());
    child.once('error', reject);
  });
}
test('T042 actual two-process SQLite 15/20-MiB quota race yields one 4-MiB attachment and releases losing reservation', () =>
  fixture(async (path, root, db, s) => {
    const children = [worker(path, root, 'upload', 1048576), worker(path, root, 'upload', 1048576)];
    let ready = 0;
    try {
      const outcomes = await Promise.all(
        children.map(
          (child) =>
            new Promise<string>((resolveJob, reject) => {
              let text = '';
              const timer = setTimeout(() => {
                child.kill('SIGKILL');
                reject(new Error('race timeout'));
              }, 15000);
              child.stdout!.on('data', (b) => (text += String(b)));
              child.once('error', reject);
              child.on('message', (m) => {
                if (m === 'ready' && ++ready === 2) children.forEach((c) => c.send('start'));
              });
              child.once('exit', (code) => {
                clearTimeout(timer);
                if (code !== 0) reject(new Error('worker failed'));
                else resolveJob(JSON.parse(text).code);
              });
            }),
        ),
      );
      assert.deepEqual(outcomes.sort(), ['PASS', 'QUOTA_EXCEEDED']);
      assert.deepEqual(await s.usage(), { stored_bytes: 19 * 1048576, reserved_bytes: 0 });
      assert.equal(
        (await db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.attachments')))).length,
        3,
      );
      assert.equal((await readdir(join(root, 'attachments'))).length, 3);
    } finally {
      children.forEach((c) => c.kill('SIGKILL'));
    }
  }, 1048576));
for (const phase of ['receiving', 'finalizing'])
  test(`T042 real SIGKILL ${phase} recovery preserves committed file and releases persistent staging bytes`, () =>
    fixture(async (path, root, _db, s) => {
      const child = worker(path, root, phase);
      const exited = exit(child);
      try {
        await new Promise<void>((r, reject) => {
          const timer = setTimeout(() => reject(new Error('stage timeout')), 15000);
          child.on('message', (m) => {
            if (m === 'ready') child.send('start');
            if (m === 'staged') {
              clearTimeout(timer);
              r();
            }
          });
          child.on('error', reject);
        });
        child.kill('SIGKILL');
        await exited;
        assert.equal((await s.usage()).reserved_bytes, 4);
        await s.recover();
        assert.deepEqual(await s.usage(), { stored_bytes: 15, reserved_bytes: 0 });
        assert.equal((await readdir(join(root, 'attachments'))).length, 1);
        assert.deepEqual(await readdir(join(root, 'upload-temp')), []);
      } finally {
        child.kill('SIGKILL');
        await exited;
      }
    }));
