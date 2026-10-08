import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { seed, insert } from '../schema/fixtures.js';
import { proof, now, csrf } from '../authorization/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
for (const modes of [
  ['demote', 'demote'],
  ['deactivate', 'demote'],
] as const)
  test(`T016 separate-process concurrent last-admin ${modes.join('/')}`, async () => {
    const root = mkdtempSync(join(tmpdir(), 'friday-accounts-')),
      path = join(root, 'fixture.sqlite'),
      db = new SqliteDatabase(path),
      children: ChildProcess[] = [];
    try {
      await migrate(db);
      await db.transaction(async (tx) => {
        await seed(tx);
        await tx.execute(sql("UPDATE dbo.users SET org_role='admin',must_change_password=0"));
        for (const id of [1, 2]) {
          await tx.execute(
            insert('sessions', {
              token_hash: proof(id).tokenHash,
              user_id: id,
              csrf_token: csrf,
              auth_version: 1,
              created_at: now,
              last_seen_at: now,
              absolute_expires_at: '2026-10-06T12:00:00.000Z',
            }),
          );
          await tx.execute(insert('user_view_revisions', { user_id: id, revision: randomUUID() }));
        }
      });
      let ready = 0;
      const jobs = modes.map(
        (mode, i) =>
          new Promise<string>((res, rej) => {
            const child = spawn(
              process.execPath,
              ['--import', 'tsx', resolve('tests/accounts/worker.ts'), path, String(i + 1), mode],
              { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
            );
            children.push(child);
            let out = '',
              err = '';
            const timer = setTimeout(() => {
              child.kill();
              rej(new Error('account worker timeout'));
            }, 20000);
            child.stdout!.on('data', (d) => (out += String(d)));
            child.stderr!.on('data', (d) => (err += String(d)));
            child.on('message', () => {
              if (++ready === 2) for (const c of children) c.send('start');
            });
            child.on('error', (e) => {
              clearTimeout(timer);
              rej(e);
            });
            child.on('exit', (code) => {
              clearTimeout(timer);
              if (code === 0) res(JSON.parse(out).code);
              else rej(new Error(err));
            });
          }),
      );
      const outcomes = await Promise.all(jobs);
      assert.deepEqual(outcomes.sort(), ['LAST_ACTIVE_ADMIN', 'PASS']);
      assert.equal(
        (
          await db.transaction((tx) =>
            tx.query(
              sql("SELECT COUNT(*) AS n FROM dbo.users WHERE active=1 AND org_role='admin'"),
            ),
          )
        )[0]!.n,
        1,
      );
    } finally {
      for (const child of children) if (child.exitCode === null) child.kill();
      await db.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
