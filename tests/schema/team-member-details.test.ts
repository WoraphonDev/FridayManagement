import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sqliteFixture, seed, insert, statement } from './fixtures.js';
import { migrate } from '../../src/repository/migrate.js';

test('0013 upgrades existing users/teams without changing credentials, roles or memberships; repeat is safe', async () => {
  const f = await sqliteFixture(false),
    root = mkdtempSync(join(tmpdir(), 'friday-team-upgrade-'));
  try {
    mkdirSync(join(root, 'sqlite'));
    for (const name of readdirSync('migrations/sqlite').filter(
      (name) => name.endsWith('.sql') && name < '0013',
    ))
      cpSync(join('migrations/sqlite', name), join(root, 'sqlite', name));
    await migrate(f.db, root);
    await f.db.transaction(seed);
    await f.db.transaction(async (tx) => {
      await tx.execute(insert('team_members', { team_id: 1, user_id: 1, team_role: 'lead' }));
      await tx.execute(insert('team_members', { team_id: 1, user_id: 2, team_role: 'member' }));
    });
    const before = await f.db.transaction((tx) =>
      tx.query(
        statement(
          'SELECT id,username,display_name,password_hash,org_role,auth_version,version FROM dbo.users ORDER BY id',
        ),
      ),
    );
    cpSync(
      'migrations/sqlite/0013_team_member_details.sql',
      join(root, 'sqlite', '0013_team_member_details.sql'),
    );
    assert.deepEqual(await migrate(f.db, root), ['0013_team_member_details.sql']);
    assert.deepEqual(
      await f.db.transaction((tx) =>
        tx.query(
          statement(
            'SELECT id,username,display_name,password_hash,org_role,auth_version,version FROM dbo.users ORDER BY id',
          ),
        ),
      ),
      before,
    );
    assert.deepEqual(
      await f.db.transaction((tx) =>
        tx.query(statement('SELECT email,telephone FROM dbo.users ORDER BY id')),
      ),
      [
        { email: '', telephone: '' },
        { email: '', telephone: '' },
      ],
    );
    assert.deepEqual(
      await f.db.transaction((tx) =>
        tx.query(
          statement('SELECT team_role,team_position FROM dbo.team_members ORDER BY user_id'),
        ),
      ),
      [
        { team_role: 'lead', team_position: 'lead' },
        { team_role: 'member', team_position: 'dev' },
      ],
    );
    await assert.rejects(
      f.db.transaction((tx) =>
        tx.execute(statement("UPDATE dbo.team_members SET team_position='admin' WHERE user_id=2")),
      ),
    );
    assert.deepEqual(await migrate(f.db, root), []);
  } finally {
    await f.close();
    rmSync(root, { recursive: true, force: true });
  }
});
