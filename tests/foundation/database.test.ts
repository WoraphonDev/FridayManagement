import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { mutateWithEffects } from '../../src/domain/atomic-effects.js';
import { migrate } from '../../src/repository/migrate.js';
import { seedFoundationFixture } from '../../src/repository/sample-data.js';
import type { Statement } from '../../src/domain/database.js';

const statement = (sql: string): Statement => ({ sqlite: sql, sqlserver: sql });
test('SQLite transaction commits state/audit/notification together and rolls back effect failures', async () => {
  const db = new SqliteDatabase(':memory:');
  try {
    await db.transaction(async (tx) => {
      for (const table of ['fixture_state', 'fixture_audit', 'fixture_notifications'])
        await tx.execute(
          statement(`CREATE TABLE ${table}(id INTEGER PRIMARY KEY, value TEXT NOT NULL)`),
        );
    });
    const insert = (table: string, id: number): Statement => ({
      sqlite: `INSERT INTO ${table}(id,value) VALUES($id,$value)`,
      sqlserver: '',
      parameters: { id, value: 'synthetic' },
    });
    await mutateWithEffects(
      db,
      async (tx) => {
        await tx.execute(insert('fixture_state', 1));
        return 1;
      },
      (id) => [insert('fixture_audit', id), insert('fixture_notifications', id)],
    );
    await assert.rejects(
      mutateWithEffects(
        db,
        async (tx) => {
          await tx.execute(insert('fixture_state', 2));
          return 2;
        },
        (id) => [insert('fixture_audit', id), statement('INSERT INTO missing_table VALUES(2)')],
      ),
    );
    await db.transaction(async (tx) => {
      for (const table of ['fixture_state', 'fixture_audit', 'fixture_notifications'])
        assert.deepEqual(await tx.query(statement(`SELECT id FROM ${table}`)), [{ id: 1 }]);
    });
  } finally {
    await db.close();
  }
});
test('Concurrent SQLite units serialize without nested-transaction failure', async () => {
  const db = new SqliteDatabase(':memory:');
  try {
    await db.transaction((tx) =>
      tx.execute(statement('CREATE TABLE fixture_counter(id INTEGER PRIMARY KEY)')),
    );
    await Promise.all(
      [1, 2, 3].map((id) =>
        db.transaction((tx) =>
          tx.execute({
            sqlite: 'INSERT INTO fixture_counter(id) VALUES($id)',
            sqlserver: '',
            parameters: { id },
          }),
        ),
      ),
    );
    await db.transaction(async (tx) =>
      assert.equal((await tx.query(statement('SELECT id FROM fixture_counter'))).length, 3),
    );
  } finally {
    await db.close();
  }
});
test('Migration ledger is idempotent and persistent; no sample data is created automatically', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'friday-foundation-')),
    path = join(dir, 'local.sqlite');
  let db = new SqliteDatabase(path);
  try {
    assert.deepEqual(await migrate(db), [
      '0000_foundation.sql',
      '0001_business_schema.sql',
      '0002_review_status.sql',
      '0003_multi_assignments.sql',
      '0004_task_groups.sql',
      '0005_job_titles.sql',
      '0006_permissions.sql',
      '0007_docs_files.sql',
      '0008_workload_threshold.sql',
      '0009_user_favorites.sql',
      '0010_user_preferences.sql',
      '0011_task_group_order.sql',
      '0012_project_metadata.sql',
      '0013_team_member_details.sql',
      '0014_checklist_remark.sql',
      '0015_sqlserver_check_fixes.sql',
    ]);
    assert.deepEqual(await migrate(db), []);
    await db.transaction(async (tx) =>
      assert.deepEqual(
        await tx.query(
          statement(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='foundation_sample'",
          ),
        ),
        [],
      ),
    );
    await db.close();
    db = new SqliteDatabase(path);
    assert.deepEqual(await migrate(db), []);
    await seedFoundationFixture(db);
    await seedFoundationFixture(db);
    await db.transaction(async (tx) =>
      assert.equal((await tx.query(statement('SELECT id FROM foundation_sample'))).length, 1),
    );
  } finally {
    await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('Changed migration checksum fails and transactional DDL is rolled back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'friday-migrations-'));
  mkdirSync(join(dir, 'sqlite'));
  const baseline = readFileSync('migrations/sqlite/0000_foundation.sql', 'utf8');
  writeFileSync(join(dir, 'sqlite', '0000_foundation.sql'), baseline);
  const db = new SqliteDatabase(':memory:');
  try {
    await migrate(db, dir);
    writeFileSync(join(dir, 'sqlite', '0000_foundation.sql'), baseline + '\n-- altered');
    await assert.rejects(migrate(db, dir), /CHECKSUM/);
    writeFileSync(join(dir, 'sqlite', '0000_foundation.sql'), baseline);
    writeFileSync(
      join(dir, 'sqlite', '0001_fixture.sql'),
      'CREATE TABLE persisted(id INTEGER); INSERT INTO persisted(id) VALUES(1);',
    );
    await migrate(db, dir);
    await db.transaction(async (tx) =>
      assert.deepEqual(await tx.query(statement('SELECT id FROM persisted')), [{ id: 1 }]),
    );
    writeFileSync(
      join(dir, 'sqlite', '0002_rollback.sql'),
      'CREATE TABLE rolled_back(id INTEGER); INSERT INTO rolled_back(id) VALUES(1);',
    );
    writeFileSync(join(dir, 'sqlite', '0003_failure.sql'), 'INSERT INTO missing_table VALUES(1);');
    await assert.rejects(migrate(db, dir));
    await db.transaction(async (tx) =>
      assert.deepEqual(
        await tx.query(statement("SELECT name FROM sqlite_master WHERE name='rolled_back'")),
        [],
      ),
    );
  } finally {
    await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
