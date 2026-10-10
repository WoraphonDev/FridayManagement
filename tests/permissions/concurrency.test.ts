import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { seed, insert } from '../schema/fixtures.js';
import { proof, now, csrf } from '../authorization/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
// T-081 SQLite two-process races (separate OS processes, one database file).
for (const modes of [
  ['save-a', 'save-b'],
  ['revoke', 'act'],
])
  test(`T-081 SQLite two-process ${modes.join('/')} permission race serializes effects`, async () => {
    const root = mkdtempSync(join(tmpdir(), 'friday-permissions-race-')),
      path = join(root, 'fixture.sqlite'),
      db = new SqliteDatabase(path),
      children: ChildProcess[] = [];
    try {
      await migrate(db);
      await db.transaction(async (tx) => {
        await seed(tx);
        await tx.execute(sql('UPDATE dbo.users SET must_change_password=0'));
        for (const user of [1, 2]) {
          await tx.execute(
            insert('sessions', {
              token_hash: proof(user).tokenHash,
              user_id: user,
              csrf_token: csrf,
              auth_version: 1,
              created_at: now,
              last_seen_at: now,
              absolute_expires_at: '2026-10-06T12:00:00.000Z',
            }),
          );
          await tx.execute(
            insert('user_view_revisions', { user_id: user, revision: randomUUID() }),
          );
        }
        // User 2 manages project 1 and holds P-04 (delete others' tasks); task 1 belongs to Admin.
        await tx.execute(
          insert('project_members', { project_id: 1, user_id: 2, access: 'manager', added_by: 1 }),
        );
        await tx.execute(
          insert('user_permissions', {
            user_id: 2,
            permission_key: 'P-04',
            granted_by: 1,
            granted_at: now,
          }),
        );
      });
      let ready = 0;
      const jobs = modes.map(
        (mode) =>
          new Promise<string>((resolveJob, reject) => {
            const child = spawn(
              process.execPath,
              ['--import', 'tsx', resolve('tests/permissions/worker.ts'), path, mode],
              { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
            );
            children.push(child);
            let output = '',
              errors = '';
            const timer = setTimeout(() => {
              child.kill('SIGKILL');
              reject(new Error('RACE_TIMEOUT'));
            }, 15000);
            child.stdout!.on('data', (b) => {
              output += String(b);
            });
            child.stderr!.on('data', (b) => {
              errors += String(b);
            });
            child.on('message', (m) => {
              if (m === 'ready' && ++ready === modes.length)
                children.forEach((c) => c.send('start'));
            });
            child.on('error', (e) => {
              clearTimeout(timer);
              reject(e);
            });
            child.on('exit', (code) => {
              clearTimeout(timer);
              if (code !== 0) reject(new Error(errors));
              else resolveJob((JSON.parse(output) as { code: string }).code);
            });
          }),
      );
      const outcomes = await Promise.all(jobs);
      const state = await db.transaction(async (tx) => ({
        version: Number(
          (await tx.query(sql('SELECT permissions_version AS v FROM dbo.users WHERE id=2')))[0]!.v,
        ),
        keys: (
          await tx.query<{ k: string }>(
            sql('SELECT permission_key AS k FROM dbo.user_permissions WHERE user_id=2 ORDER BY 1'),
          )
        ).map((r) => r.k),
        deleted: (await tx.query(sql('SELECT deleted_at FROM dbo.tasks WHERE id=1')))[0]!
          .deleted_at,
      }));
      if (modes[0] === 'save-a') {
        // Same permissions_version: exactly one save commits; the other sees a version conflict.
        assert.deepEqual([...outcomes].sort(), ['PASS', 'VERSION_CONFLICT']);
        assert.equal(state.version, 2);
        assert.deepEqual(state.keys, outcomes[0] === 'PASS' ? ['P-01'] : ['P-03']);
      } else {
        // Revocation always commits; the delete is either before it (PASS, task deleted) or
        // after it (FORBIDDEN, task intact) — never a delete authorized by a revoked key.
        assert.equal(outcomes[0], 'PASS');
        assert.deepEqual(state.keys, ['P-01']);
        assert(['PASS', 'FORBIDDEN'].includes(outcomes[1]!), outcomes[1]);
        assert.equal(state.deleted !== null, outcomes[1] === 'PASS');
      }
    } finally {
      for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
      await db.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
