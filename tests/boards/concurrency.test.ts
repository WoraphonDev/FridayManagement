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
import { taskService } from '../../src/services/tasks.js';
import { sql } from '../../src/repository/access-scope.js';
for (const modes of [
  ['move', 'move'],
  ['move', 'edit'],
  ['move', 'done'],
])
  test(`T035 SQLite two-process ${modes.join('/')} race serializes effects`, async () => {
    const root = mkdtempSync(join(tmpdir(), 'friday-boards-race-')),
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
        await tx.execute(
          sql(
            "UPDATE dbo.tasks SET assignee_id=2,due_date='2027-01-31',recurrence='monthly',recurrence_anchor_day=31 WHERE id=1",
          ),
        );
        if (modes.includes('untick'))
          await tx.execute(insert('subtasks', { task_id: 1, title: 'Race checklist', done: 1 }));
        for (const id of [1, 2])
          await tx.execute(insert('user_view_revisions', { user_id: id, revision: randomUUID() }));
      });
      if (modes[0] === 'restore')
        await db.transaction((tx) =>
          taskService({ clock: () => new Date(now) }).trashMutation(
            tx,
            proof(1),
            1,
            { version: 1 },
            false,
            randomUUID(),
          ),
        );
      let ready = 0;
      const jobs = modes.map(
        (mode) =>
          new Promise<string>((resolveJob, reject) => {
            const child = spawn(
              process.execPath,
              ['--import', 'tsx', resolve('tests/boards/worker.ts'), path, mode],
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
      assert(outcomes.every((x) => ['PASS', 'VERSION_CONFLICT', 'NOT_FOUND'].includes(x)));
      const tasks = await db.transaction((tx) =>
          tx.query(
            sql('SELECT id,status,version,deleted_at,completed_at FROM dbo.tasks ORDER BY id'),
          ),
        ),
        source = tasks[0]!;
      assert.equal(source.version, 2);
      const board = await db.transaction((tx) =>
        tx.query(
          sql(
            'SELECT b.task_id,b.status,b.rank,t.status AS actual,t.deleted_at FROM dbo.board_positions b JOIN dbo.tasks t ON t.id=b.task_id ORDER BY b.status,b.rank',
          ),
        ),
      );
      assert.equal(board.length, tasks.filter((t) => t.deleted_at === null).length);
      assert(board.every((b) => b.status === b.actual && b.deleted_at === null));
      for (const status of ['todo', 'doing', 'review', 'done'])
        assert.deepEqual(
          board.filter((b) => b.status === status).map((b) => b.rank),
          board.filter((b) => b.status === status).map((_, i) => i + 1),
        );
      const recurrence = await db.transaction((tx) =>
        tx.query(sql('SELECT source_task_id FROM dbo.recurrence_events')),
      );
      assert.equal(recurrence.length, Number(source.status === 'done'));
    } finally {
      for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
      await db.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
