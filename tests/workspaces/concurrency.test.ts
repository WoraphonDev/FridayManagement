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
for (const modes of [
  ['viewer', 'delete'],
  ['archive', 'create'],
])
  test(`T020/21/22 SQLite two-process ${modes.join('/')} race serializes effects`, async () => {
    const root = mkdtempSync(join(tmpdir(), 'friday-workspaces-race-')),
      path = join(root, 'fixture.sqlite'),
      db = new SqliteDatabase(path),
      children: ChildProcess[] = [];
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
        await tx.execute(insert('teams', { name: 'Race team' }));
        await tx.execute(
          insert('project_members', { project_id: 1, user_id: 2, access: 'editor', added_by: 1 }),
        );
        await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2'));
        for (const id of [1, 2])
          await tx.execute(insert('user_view_revisions', { user_id: id, revision: randomUUID() }));
      });
      let ready = 0;
      const jobs = modes.map(
        (mode) =>
          new Promise<string>((resolveJob, reject) => {
            const child = spawn(
              process.execPath,
              ['--import', 'tsx', resolve('tests/workspaces/worker.ts'), path, mode],
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
      assert.equal(outcomes.filter((x) => x === 'PASS').length, 1);
      if (modes[0] === 'viewer') {
        assert(outcomes.includes('VERSION_CONFLICT'));
        const project = await db.transaction((tx) =>
          tx.query(sql('SELECT version FROM dbo.projects WHERE id=1')),
        );
        assert.equal(project[0]!.version, 2);
        const assignments = await db.transaction((tx) =>
          tx.query(sql('SELECT assignee_id,version FROM dbo.tasks ORDER BY id')),
        );
        assert(assignments.every((t) => t.assignee_id === null && t.version === 2));
        assert.equal(
          (await db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.task_events')))).length,
          2,
        );
        assert.equal(
          (await db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
          1,
        );
      } else {
        assert(outcomes.includes('TEAM_ARCHIVED') || outcomes.includes('TEAM_HAS_ACTIVE_PROJECTS'));
        const team = await db.transaction((tx) =>
            tx.query(sql('SELECT archived_at FROM dbo.teams WHERE id=3')),
          ),
          projects = await db.transaction((tx) =>
            tx.query(
              sql('SELECT id FROM dbo.projects WHERE owner_team_id=3 AND archived_at IS NULL'),
            ),
          );
        assert(!(team[0]!.archived_at && projects.length));
      }
    } finally {
      for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
      await db.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
