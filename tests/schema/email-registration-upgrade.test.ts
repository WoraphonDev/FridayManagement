import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { seed } from './fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
test('populated email-registration upgrade preserves legacy accounts and repeats safely', async () => {
  const root = mkdtempSync(join(tmpdir(), 'friday-registration-upgrade-'));
  const beforeRoot = join(root, 'prior');
  mkdirSync(join(beforeRoot, 'sqlite'), { recursive: true });
  for (const name of readdirSync('migrations/sqlite').filter(
    (n) => n.endsWith('.sql') && n < '0017_',
  ))
    copyFileSync(join('migrations/sqlite', name), join(beforeRoot, 'sqlite', name));
  const db = new SqliteDatabase(join(root, 'fixture.sqlite'));
  try {
    await migrate(db, beforeRoot);
    await db.transaction((tx) => seed(tx));
    const snapshot = () =>
      db.transaction((tx) => tx.query(sql('SELECT * FROM dbo.users ORDER BY id')));
    const before = await snapshot();
    assert.deepEqual(await migrate(db), ['0017_email_registration.sql']);
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(await migrate(db), []);
    assert.deepEqual(
      await db.transaction((tx) => tx.query(sql('SELECT * FROM dbo.registrations'))),
      [],
    );
    assert.deepEqual(await db.transaction((tx) => tx.query(sql('PRAGMA foreign_key_check'))), []);
  } finally {
    await db.close();
    rmSync(root, { recursive: true, force: true });
  }
});
