import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sqliteFixture, seed, statement } from './fixtures.js';
import { migrate } from '../../src/repository/migrate.js';

test('project metadata migration upgrades populated SQLite without losing project data; repeat is safe', async () => {
  const f = await sqliteFixture(false);
  const root = mkdtempSync(join(tmpdir(), 'friday-metadata-migrations-'));
  try {
    mkdirSync(join(root, 'sqlite'));
    for (const file of readdirSync('migrations/sqlite').filter(
      (name) => name.endsWith('.sql') && name < '0012',
    ))
      cpSync(join('migrations/sqlite', file), join(root, 'sqlite', file));
    await migrate(f.db, root);
    await f.db.transaction(seed);
    await f.db.transaction((tx) =>
      tx.execute(
        statement('UPDATE dbo.projects SET description=@description,version=7 WHERE id=1', {
          description: 'ข้อมูลเดิม 🚀',
        }),
      ),
    );
    const before = await f.db.transaction((tx) =>
      tx.query(
        statement('SELECT id,name,description,version,owner_team_id FROM dbo.projects ORDER BY id'),
      ),
    );
    cpSync(
      'migrations/sqlite/0012_project_metadata.sql',
      join(root, 'sqlite', '0012_project_metadata.sql'),
    );
    assert.deepEqual(await migrate(f.db, root), ['0012_project_metadata.sql']);
    assert.deepEqual(
      await f.db.transaction((tx) =>
        tx.query(
          statement(
            'SELECT id,name,description,version,owner_team_id FROM dbo.projects ORDER BY id',
          ),
        ),
      ),
      before,
    );
    assert.deepEqual(
      await f.db.transaction((tx) =>
        tx.query(statement('SELECT project_type,project_category FROM dbo.projects ORDER BY id')),
      ),
      [
        { project_type: 'internal', project_category: 'development' },
        { project_type: 'internal', project_category: 'development' },
      ],
    );
    assert.deepEqual(await migrate(f.db, root), []);
  } finally {
    await f.close();
    rmSync(root, { recursive: true, force: true });
  }
});
