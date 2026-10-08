import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Fixture } from '../schema/fixtures.js';
import { insert } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { installerAction } from '../../src/services/installer.js';
import { sql } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { ApiFault } from '../../src/api/errors.js';
import type { Database } from '../../src/domain/database.js';
const temp = '  Installer-fixture-password  ',
  recover = { action: 'recover-admin' as const, userId: 2, confirmUser: 'Member' },
  force = { ...recover, action: 'force-logout' as const };
export function installerAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  const check = (
    name: string,
    work: (f: Awaited<ReturnType<typeof sessionFixture>>) => Promise<void>,
  ) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await sessionFixture(factory);
      try {
        await work(f);
      } finally {
        await f.close();
      }
    });
  check(
    'T019 recovers existing inactive member as active forced Admin, revokes sessions, preserves history and redacts installer audit',
    async (f) => {
      const old = await f.service.login({ username: 'Member', password }, '127.0.0.1');
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=2')));
      const result = await installerAction(f.db, recover, { password: temp, clock: f.clock });
      assert.equal(result.status, 'completed');
      const row = (
        await f.db.transaction((tx) =>
          tx.query(
            sql(
              'SELECT active,org_role,must_change_password,version,auth_version FROM dbo.users WHERE id=2',
            ),
          ),
        )
      )[0]!;
      assert.deepEqual(row, {
        active: 1,
        org_role: 'admin',
        must_change_password: 1,
        version: 2,
        auth_version: 2,
      });
      assert.equal(await f.service.principal(tokenDigest(old.token)), null);
      await assert.rejects(f.service.login({ username: 'Member', password }, '127.0.0.2'));
      const fresh = await f.service.login({ username: 'Member', password: temp }, '127.0.0.2');
      assert(fresh.body.must_change_password);
      assert.deepEqual(fresh.body.effective_summary, { lead_team_ids: [], project_ids: [] });
      const event = (
        await f.db.transaction((tx) =>
          tx.query(
            sql('SELECT actor_id,action,resource_id,redacted_changes FROM dbo.admin_events'),
          ),
        )
      )[0]!;
      const changes = JSON.parse(String(event.redacted_changes));
      assert.equal(event.action, 'admin_recovered');
      assert.equal(event.actor_id, 2);
      assert.equal(changes.operator_kind, 'installation_operator');
      assert.equal(changes.audit_actor_reference, 'target_account');
      assert(!JSON.stringify(event).includes(temp));
      assert(!JSON.stringify(event).includes('scrypt$'));
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.tasks')))).length,
        2,
      );
    },
  );
  check(
    'T019 force logout advances auth version only, revokes all target sessions and leaves other users/password/resource version intact',
    async (f) => {
      const a = await f.service.login({ username: 'Admin', password }, '127.0.0.1'),
        b = await f.service.login({ username: 'Member', password }, '127.0.0.2'),
        c = await f.service.login({ username: 'Member', password }, '127.0.0.3');
      const before = (
        await f.db.transaction((tx) =>
          tx.query(
            sql(
              'SELECT password_hash,active,org_role,version,must_change_password FROM dbo.users WHERE id=2',
            ),
          ),
        )
      )[0]!;
      await installerAction(f.db, force, { clock: f.clock });
      assert.deepEqual(
        (
          await f.db.transaction((tx) =>
            tx.query(
              sql(
                'SELECT password_hash,active,org_role,version,must_change_password FROM dbo.users WHERE id=2',
              ),
            ),
          )
        )[0],
        before,
      );
      assert.equal(await f.service.principal(tokenDigest(b.token)), null);
      assert.equal(await f.service.principal(tokenDigest(c.token)), null);
      assert.equal((await f.service.principal(tokenDigest(a.token)))!.id, 1);
      await f.service.login({ username: 'Member', password }, '127.0.0.4');
    },
  );
  check('T019 target confirmation/shape/policy guards refuse before writes or audit', async (f) => {
    for (const command of [
      { ...recover, userId: 99 },
      { ...recover, confirmUser: 'Other' },
      { ...recover, userId: 0 },
    ])
      await assert.rejects(installerAction(f.db, command, { password: temp, clock: f.clock }));
    for (const secret of ['x'.repeat(5), '😀'.repeat(129)])
      await assert.rejects(installerAction(f.db, recover, { password: secret, clock: f.clock }));
    await assert.rejects(installerAction(f.db, force, { password: temp, clock: f.clock }));
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
      0,
    );
    assert.equal(
      (
        await f.db.transaction((tx) => tx.query(sql('SELECT version FROM dbo.users WHERE id=2')))
      )[0]!.version,
      1,
    );
  });
  check(
    'T019 audit failure rolls back recovered role/password/version, sessions and revisions',
    async (f) => {
      const old = await f.service.login({ username: 'Member', password }, '127.0.0.1');
      const before = await f.db.transaction((tx) =>
        tx.query(sql('SELECT * FROM dbo.user_view_revisions ORDER BY user_id')),
      );
      const db: Database = {
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: (work) =>
          f.db.transaction((tx) =>
            work({
              ...tx,
              execute: async (statement) => {
                if (statement.sqlserver.startsWith('INSERT INTO dbo.admin_events'))
                  throw new Error('fixture audit failure');
                await tx.execute(statement);
              },
            }),
          ),
      };
      await assert.rejects(installerAction(db, recover, { password: temp, clock: f.clock }));
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT org_role,version FROM dbo.users WHERE id=2')),
          )
        )[0]!.org_role,
        'member',
      );
      assert.equal((await f.service.principal(tokenDigest(old.token)))!.id, 2);
      assert.deepEqual(
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT * FROM dbo.user_view_revisions ORDER BY user_id')),
        ),
        before,
      );
    },
  );
  check(
    'T019 aborting installer authority after password hashing cannot apply mutation',
    async (f) => {
      let calls = 0;
      await assert.rejects(
        installerAction(f.db, recover, {
          password: temp,
          clock: f.clock,
          assertAuthority: () => {
            if (++calls === 2) throw new Error('fixture guard lost');
          },
        }),
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        0,
      );
    },
  );
  check(
    'T019 stale auth snapshot cannot overwrite a concurrent administrative action',
    async (f) => {
      let reads = 0;
      const db: Database = {
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: async (work) => {
          const result = await f.db.transaction(work);
          if (++reads === 1)
            await f.db.transaction((tx) =>
              tx.execute(sql('UPDATE dbo.users SET auth_version=auth_version+1 WHERE id=2')),
            );
          return result;
        },
      };
      await assert.rejects(
        installerAction(db, recover, { password: temp, clock: f.clock }),
        (e: unknown) => e instanceof ApiFault && e.code === 'VERSION_CONFLICT',
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        0,
      );
    },
  );
  check(
    'T019 force logout keeps unrelated view revisions private and recovery does not resurrect assignments',
    async (f) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(
          insert('users', {
            username: 'Unrelated',
            display_name: 'Unrelated',
            password_hash: 'fixture',
          }),
        );
        await tx.execute(insert('user_view_revisions', { user_id: 3, revision: randomUUID() }));
        await tx.execute(sql('UPDATE dbo.tasks SET creator_id=2,assignee_id=NULL'));
      });
      const revision = (
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT revision FROM dbo.user_view_revisions WHERE user_id=3')),
        )
      )[0]!.revision;
      await installerAction(f.db, force, { clock: f.clock });
      await installerAction(f.db, recover, { password: temp, clock: f.clock });
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT revision FROM dbo.user_view_revisions WHERE user_id=3')),
          )
        )[0]!.revision,
        revision,
      );
      assert.deepEqual(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT assignee_id,creator_id FROM dbo.tasks')),
          )
        ).map((r) => [r.assignee_id, r.creator_id]),
        [
          [null, 2],
          [null, 2],
        ],
      );
    },
  );
  check(
    'T019 maintenance freeze prevents recovery/logout and never steals its lease',
    async (f) => {
      const now = f.clock().toISOString();
      await f.db.transaction((tx) =>
        tx.execute(
          insert('maintenance_state', {
            id: 1,
            owner_id: randomUUID(),
            state: 'frozen',
            lease_expires_at: '2026-10-06T01:00:00.000Z',
            created_at: now,
            updated_at: now,
          }),
        ),
      );
      for (const command of [recover, force])
        await assert.rejects(
          installerAction(f.db, command, {
            ...(command.action === 'recover-admin' ? { password: temp } : {}),
            clock: f.clock,
          }),
          (e: unknown) => e instanceof ApiFault && e.code === 'MAINTENANCE',
        );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        0,
      );
      assert.equal(
        (
          await f.db.transaction((tx) => tx.query(sql('SELECT state FROM dbo.maintenance_state')))
        )[0]!.state,
        'frozen',
      );
    },
  );
}
