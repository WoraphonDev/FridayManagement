import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sqliteFixture, seed, statement } from './fixtures.js';
import { migrate } from '../../src/repository/migrate.js';
import { nextProjectCode, nextTaskNo } from '../../src/repository/number-sequences.js';

test('0015 backfills project codes and task numbers by Bangkok month; new numbers continue the sequences', async () => {
  const f = await sqliteFixture(false),
    root = mkdtempSync(join(tmpdir(), 'friday-task-numbers-'));
  try {
    mkdirSync(join(root, 'sqlite'));
    for (const name of readdirSync('migrations/sqlite').filter(
      (n) => n.endsWith('.sql') && n < '0015',
    ))
      cpSync(join('migrations/sqlite', name), join(root, 'sqlite', name));
    await migrate(f.db, root);
    await f.db.transaction(seed);
    await f.db.transaction(async (tx) => {
      // Project 2 is 31 Dec 2026 UTC but already 1 Jan 2027 in Bangkok.
      for (const [id, at] of [
        [1, '2026-01-01T00:00:00.000Z'],
        [2, '2026-12-31T18:00:00.000Z'],
      ] as const)
        await tx.execute(
          statement('UPDATE dbo.projects SET created_at=@at WHERE id=@id', { id, at }),
        );
      // Both tasks fall on 10 Oct 2026 in Bangkok (00:30 and 23:00).
      for (const [id, at] of [
        [1, '2026-10-09T17:30:00.000Z'],
        [2, '2026-10-10T16:00:00.000Z'],
      ] as const)
        await tx.execute(statement('UPDATE dbo.tasks SET created_at=@at WHERE id=@id', { id, at }));
    });
    cpSync(
      'migrations/sqlite/0015_task_numbers.sql',
      join(root, 'sqlite', '0015_task_numbers.sql'),
    );
    assert.deepEqual(await migrate(f.db, root), ['0015_task_numbers.sql']);
    const read = () =>
      f.db.transaction(async (tx) => ({
        projects: await tx.query(statement('SELECT id,code FROM dbo.projects ORDER BY id')),
        tasks: await tx.query(statement('SELECT id,task_no FROM dbo.tasks ORDER BY id')),
      }));
    assert.deepEqual(await read(), {
      projects: [
        { id: 1, code: 'P2601' },
        { id: 2, code: 'P2701' },
      ],
      tasks: [
        { id: 1, task_no: 'TK26100001' },
        { id: 2, task_no: 'TK26100002' },
      ],
    });
    await f.db.transaction(async (tx) => {
      assert.equal(await nextProjectCode(tx, '2026-06-01T00:00:00.000Z'), 'P2602');
      assert.equal(await nextTaskNo(tx, '2026-10-10T05:00:00.000Z'), 'TK26100003');
      // A new Bangkok month restarts at 0001 (31 Oct 17:00 UTC is 1 Nov in Bangkok).
      assert.equal(await nextTaskNo(tx, '2026-10-31T17:00:00.000Z'), 'TK26110001');
    });
    await assert.rejects(
      f.db.transaction((tx) =>
        tx.execute(statement("UPDATE dbo.projects SET code='P2601' WHERE id=2")),
      ),
    );
    assert.deepEqual(await migrate(f.db, root), []);
  } finally {
    await f.close();
    rmSync(root, { recursive: true, force: true });
  }
});
