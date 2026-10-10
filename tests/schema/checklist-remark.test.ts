import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sqliteFixture, seed, insert, statement } from './fixtures.js';
import { migrate } from '../../src/repository/migrate.js';

test('0014 preserves existing checklist/parent versions and audit; empty remarks and repeat upgrade are safe', async () => {
  const f = await sqliteFixture(false),
    root = mkdtempSync(join(tmpdir(), 'friday-checklist-upgrade-'));
  try {
    mkdirSync(join(root, 'sqlite'));
    for (const name of readdirSync('migrations/sqlite').filter(
      (n) => n.endsWith('.sql') && n < '0014',
    ))
      cpSync(join('migrations/sqlite', name), join(root, 'sqlite', name));
    await migrate(f.db, root);
    await f.db.transaction(seed);
    await f.db.transaction((tx) =>
      tx.execute(
        insert('subtasks', {
          task_id: 1,
          title: '\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 \u{1f680}',
          done: 1,
          version: 7,
          assignee_id: 1,
          created_at: '2026-10-09T00:00:00.000Z',
        }),
      ),
    );
    const legacy = () =>
      f.db.transaction(async (tx) => ({
        children: await tx.query(
          statement(
            'SELECT id,task_id,title,done,assignee_id,version,created_at FROM dbo.subtasks ORDER BY id',
          ),
        ),
        parents: await tx.query(statement('SELECT id,version FROM dbo.tasks ORDER BY id')),
        events: await tx.query(statement('SELECT * FROM dbo.task_events ORDER BY id')),
      }));
    const before = await legacy();
    cpSync(
      'migrations/sqlite/0014_checklist_remark.sql',
      join(root, 'sqlite', '0014_checklist_remark.sql'),
    );
    assert.deepEqual(await migrate(f.db, root), ['0014_checklist_remark.sql']);
    assert.deepEqual(await legacy(), before);
    assert.deepEqual(
      await f.db.transaction((tx) => tx.query(statement('SELECT remark FROM dbo.subtasks'))),
      [{ remark: '' }],
    );
    await f.db.transaction((tx) =>
      tx.execute(
        statement('UPDATE dbo.subtasks SET remark=@remark', { remark: '\u{1f600}'.repeat(1000) }),
      ),
    );
    for (const remark of [null, '\u{1f600}'.repeat(1001)])
      await assert.rejects(
        f.db.transaction((tx) =>
          tx.execute(statement('UPDATE dbo.subtasks SET remark=@remark', { remark })),
        ),
      );
    assert.deepEqual(await migrate(f.db, root), []);
    assert.deepEqual(await legacy(), before);
  } finally {
    await f.close();
    rmSync(root, { recursive: true, force: true });
  }
});
