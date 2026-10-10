import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sessionFixture, password } from '../sessions/fixtures.js';
import type { Fixture } from '../schema/fixtures.js';
import { insert } from '../schema/fixtures.js';
import { workspaceService } from '../../src/services/workspaces.js';
import { accountService } from '../../src/services/accounts.js';
import {
  projectAccess,
  currentActor,
  authorizeOperation,
  type SessionProof,
} from '../../src/services/authorization.js';
import { sql, notificationScope } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { ApiFault } from '../../src/api/errors.js';
import { OperationError } from '../../src/domain/failure.js';
import type { Transaction } from '../../src/domain/database.js';
const rejected = (p: Promise<unknown>, code: string) =>
  assert.rejects(
    p,
    (e: unknown) => (e instanceof ApiFault || e instanceof OperationError) && e.code === code,
  );
export function workspaceAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  const check = (
    name: string,
    work: (
      f: Awaited<ReturnType<typeof sessionFixture>>,
      s: ReturnType<typeof workspaceService>,
      admin: SessionProof,
      member: SessionProof,
    ) => Promise<void>,
  ) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await sessionFixture(factory);
      try {
        const admin = await f.service.login({ username: 'Admin', password }, '127.0.0.1'),
          member = await f.service.login({ username: 'Member', password }, '127.0.0.2');
        await work(
          f,
          workspaceService({ clock: f.clock }),
          { userId: 1, tokenHash: tokenDigest(admin.token) },
          { userId: 2, tokenHash: tokenDigest(member.token) },
        );
      } finally {
        await f.close();
      }
    });
  check(
    'T021 project metadata defaults, enum constraints, reopen persistence and atomic audit rollback',
    async (f, s, a) => {
      const existing = (await f.db.transaction((tx) => s.projects(tx, a, {}))).items;
      assert(
        existing.every(
          (p) => p.project_type === 'internal' && p.project_category === 'development',
        ),
      );
      const made = await f.db.transaction((tx) =>
        s.createProject(
          tx,
          a,
          {
            owner_team_id: 1,
            name: 'ระบบพัฒนา 🚀',
            project_type: 'client',
            project_category: 'it',
            description: 'รายละเอียด\nภาษาไทย',
          },
          randomUUID(),
        ),
      );
      const id = made.item.id;
      const reopened = await f.reopen();
      const stored = (await reopened.transaction((tx) => s.projects(tx, a, {}))).items.find(
        (p) => p.id === id,
      )!;
      assert.equal(stored.project_type, 'client');
      assert.equal(stored.project_category, 'it');
      assert.equal(stored.description, 'รายละเอียด\nภาษาไทย');
      const beforeAudit = await reopened.transaction((tx) =>
        tx.query(sql('SELECT id FROM dbo.admin_events')),
      );
      await assert.rejects(
        reopened.transaction(async (tx) => {
          await s.patchProject(
            tx,
            a,
            id,
            { version: 1, project_category: 'development' },
            randomUUID(),
          );
          throw new Error('ROLLBACK_METADATA_AND_AUDIT');
        }),
        /ROLLBACK_METADATA_AND_AUDIT/,
      );
      const after = (await reopened.transaction((tx) => s.projects(tx, a, {}))).items.find(
        (p) => p.id === id,
      )!;
      assert.equal(after.project_category, 'it');
      assert.equal(after.version, 1);
      assert.deepEqual(
        await reopened.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events'))),
        beforeAudit,
      );
      await assert.rejects(
        reopened.transaction((tx) =>
          tx.execute(
            sql('UPDATE dbo.projects SET project_type=@value WHERE id=@id', {
              id,
              value: 'unknown',
            }),
          ),
        ),
      );
      await assert.rejects(
        reopened.transaction((tx) =>
          tx.execute(
            sql('UPDATE dbo.projects SET project_category=@value WHERE id=@id', {
              id,
              value: 'unknown',
            }),
          ),
        ),
      );
    },
  );
  check(
    'T020 team create includes positions atomically and position labels never confer Lead rights',
    async (f, s, a, m) => {
      const made = await f.db.transaction((tx) =>
        s.createTeam(
          tx,
          a,
          {
            name: 'Development team 🚀',
            description: 'ทีมพัฒนา\nPM / Lead / Dev',
            members: [
              { user_id: 1, team_position: 'pm' },
              { user_id: 2, team_position: 'lead' },
            ],
          },
          randomUUID(),
        ),
      );
      assert.deepEqual(
        made.item.members!.map((member) => [
          member.user.id,
          member.team_role,
          member.team_position,
        ]),
        [
          [1, 'member', 'pm'],
          [2, 'member', 'lead'],
        ],
      );
      await rejected(
        f.db.transaction((tx) =>
          s.createProject(
            tx,
            m,
            { owner_team_id: made.item.id, name: 'Not authorized' },
            randomUUID(),
          ),
        ),
        'FORBIDDEN',
      );
      const updated = await f.db.transaction((tx) =>
        s.teamMember(
          tx,
          a,
          made.item.id,
          2,
          { version: 1, team_role: 'member', team_position: 'dev' },
          false,
          randomUUID(),
        ),
      );
      assert.equal(
        updated.item.members!.find((member) => member.user.id === 2)!.team_position,
        'dev',
      );
      assert.equal(
        updated.item.members!.find((member) => member.user.id === 2)!.team_role,
        'member',
      );
      for (const members of [
        [
          { user_id: 2, team_position: 'pm' },
          { user_id: 2, team_position: 'dev' },
        ],
        [{ user_id: 9999, team_position: 'dev' }],
        [{ user_id: 2, team_position: 'admin' }],
      ]) {
        await assert.rejects(
          f.db.transaction((tx) =>
            s.createTeam(tx, a, { name: 'Must rollback', members }, randomUUID()),
          ),
        );
        assert.equal(
          (
            await f.db.transaction((tx) =>
              tx.query(sql("SELECT id FROM dbo.teams WHERE name='Must rollback'")),
            )
          ).length,
          0,
        );
      }
      const directory = await f.db.transaction((tx) => s.directory(tx, a, {}));
      assert(directory.items.every((person) => !('email' in person) && !('telephone' in person)));
    },
  );
  check(
    'T020 team create, UTF16/trim/CI uniqueness, no unauthorized or duplicate composite writes',
    async (f, s, a, m) => {
      const made = await f.db.transaction((tx) =>
        s.createTeam(tx, a, { name: '  Mixed Team  ' }, randomUUID()),
      );
      assert.equal(made.item.name, 'Mixed Team');
      assert.equal(made.item.version, 1);
      await rejected(
        f.db.transaction((tx) => s.createTeam(tx, m, { name: 'Unauthorized' }, randomUUID())),
        'FORBIDDEN',
      );
      await assert.rejects(
        f.db.transaction((tx) => s.createTeam(tx, a, { name: 'mixed team' }, randomUUID())),
      );
      await rejected(
        f.db.transaction((tx) => s.createTeam(tx, a, { name: '😀'.repeat(51) }, randomUUID())),
        'VALIDATION_FAILED',
      );
      let next = await f.db.transaction((tx) =>
        s.teamMember(
          tx,
          a,
          made.item.id,
          2,
          { team_role: 'member', version: 1 },
          false,
          randomUUID(),
        ),
      );
      next = await f.db.transaction((tx) =>
        s.teamMember(
          tx,
          a,
          made.item.id,
          2,
          { team_role: 'lead', version: next.item.version },
          false,
          randomUUID(),
        ),
      );
      assert.equal(next.item.members![0]!.team_role, 'lead');
      assert.equal(next.item.members!.length, 1);
      await rejected(
        f.db.transaction((tx) =>
          s.teamMember(
            tx,
            m,
            made.item.id,
            2,
            { team_role: 'lead', version: next.item.version },
            false,
            randomUUID(),
          ),
        ),
        'FORBIDDEN',
      );
      assert.equal((await f.db.transaction((tx) => s.teams(tx, m, {}))).items.length, 1);
    },
  );
  check(
    'T020/21 active-project archive guard, archived team create/unarchive guard, no cascade',
    async (f, s, a) => {
      await rejected(
        f.db.transaction((tx) =>
          s.patchTeam(tx, a, 1, { archived: true, version: 1 }, randomUUID()),
        ),
        'TEAM_HAS_ACTIVE_PROJECTS',
      );
      const p = await f.db.transaction((tx) =>
        s.patchProject(tx, a, 1, { archived: true, version: 1 }, randomUUID()),
      );
      assert(p.item.archived_at);
      await f.db.transaction((tx) =>
        s.patchTeam(tx, a, 1, { archived: true, version: 1 }, randomUUID()),
      );
      await rejected(
        f.db.transaction((tx) =>
          s.createProject(tx, a, { owner_team_id: 1, name: 'Blocked' }, randomUUID()),
        ),
        'TEAM_ARCHIVED',
      );
      await rejected(
        f.db.transaction((tx) =>
          s.patchProject(tx, a, 1, { archived: false, version: p.item.version }, randomUUID()),
        ),
        'TEAM_ARCHIVED',
      );
      await f.db.transaction((tx) =>
        s.patchTeam(tx, a, 1, { archived: false, version: 2 }, randomUUID()),
      );
      await f.db.transaction((tx) =>
        s.patchProject(tx, a, 1, { archived: false, version: 2 }, randomUUID()),
      );
    },
  );
  check(
    'T020/21 version conflict rejects all effects and owner team remains immutable',
    async (f, s, a) => {
      await f.db.transaction((tx) =>
        s.patchTeam(tx, a, 1, { name: 'Renamed', version: 1 }, randomUUID()),
      );
      await rejected(
        f.db.transaction((tx) =>
          s.patchTeam(tx, a, 1, { name: 'Stale', version: 1 }, randomUUID()),
        ),
        'VERSION_CONFLICT',
      );
      await rejected(
        f.db.transaction((tx) =>
          s.patchProject(tx, a, 1, { owner_team_id: 2, version: 1 }, randomUUID()),
        ),
        'VALIDATION_FAILED',
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        1,
      );
    },
  );
  check(
    'T021 team-only membership excludes projects/total; explicit sharing and owner Lead are scoped',
    async (f, s, a, m) => {
      await f.db.transaction((tx) =>
        s.teamMember(tx, a, 1, 2, { team_role: 'member', version: 1 }, false, randomUUID()),
      );
      assert.equal((await f.db.transaction((tx) => s.projects(tx, m, {}))).total, 0);
      await rejected(
        f.db.transaction((tx) =>
          s.createProject(tx, m, { owner_team_id: 1, name: 'No' }, randomUUID()),
        ),
        'FORBIDDEN',
      );
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 2, 2, { access: 'viewer', version: 1 }, false, randomUUID()),
      );
      assert.deepEqual(
        (await f.db.transaction((tx) => s.projects(tx, m, {}))).items.map((p) => p.id),
        [2],
      );
      await rejected(
        f.db.transaction((tx) =>
          s.patchProject(tx, m, 2, { name: 'No', version: 2 }, randomUUID()),
        ),
        'FORBIDDEN',
      );
      await f.db.transaction((tx) =>
        s.teamMember(tx, a, 1, 2, { team_role: 'lead', version: 2 }, false, randomUUID()),
      );
      const own = await f.db.transaction((tx) =>
        s.createProject(tx, m, { owner_team_id: 1, name: 'Own project' }, randomUUID()),
      );
      assert.equal(own.item.effective_access, 'lead');
      await rejected(
        f.db.transaction((tx) =>
          s.createProject(tx, m, { owner_team_id: 2, name: 'Foreign' }, randomUUID()),
        ),
        'FORBIDDEN',
      );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(
              sql('SELECT status FROM dbo.board_columns WHERE project_id=@id', { id: own.item.id }),
            ),
          )
        ).length,
        4,
      );
    },
  );
  check(
    'T021 directory privacy/no usernames/secrets and active-only search/pagination',
    async (f, s, a, m) => {
      await rejected(
        f.db.transaction((tx) => s.directory(tx, m, {})),
        'FORBIDDEN',
      );
      const directory = await f.db.transaction((tx) =>
        s.directory(tx, a, { page: 2, pageSize: 1 }),
      );
      assert.equal(directory.total, 2);
      assert.equal(directory.items.length, 1);
      assert.deepEqual(Object.keys(directory.items[0]!).sort(), [
        'display_name',
        'id',
        'job_title',
        'teams',
      ]);
      await f.db.transaction((tx) =>
        s.teamMember(tx, a, 1, 2, { team_role: 'lead', version: 1 }, false, randomUUID()),
      );
      assert.equal((await f.db.transaction((tx) => s.directory(tx, m, { q: '%' }))).total, 0);
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=1')));
      assert.equal((await f.db.transaction((tx) => s.directory(tx, m, {}))).total, 1);
    },
  );
  check(
    'T022 Editor->Viewer atomically unassigns open/deleted but preserves done, versions, audit and scoped notification',
    async (f, s, a, m) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(
          insert('users', {
            username: 'LeadFixture',
            display_name: 'Lead',
            password_hash: 'fixture',
            org_role: 'member',
          }),
        );
        await tx.execute(insert('team_members', { team_id: 1, user_id: 3, team_role: 'lead' }));
        await tx.execute(
          sql(
            'UPDATE dbo.tasks SET assignee_id=2,deleted_at=CASE WHEN id=2 THEN @now ELSE NULL END,deleted_by=CASE WHEN id=2 THEN 1 ELSE NULL END',
            { now: f.clock().toISOString() },
          ),
        );
        await tx.execute(
          insert('tasks', {
            project_id: 1,
            title: 'Completed history',
            creator_id: 1,
            assignee_id: 2,
            status: 'done',
            completed_at: f.clock().toISOString(),
          }),
        );
      });
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 1, 2, { access: 'editor', version: 1 }, false, randomUUID()),
      );
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 1, 2, { access: 'viewer', version: 2 }, false, randomUUID()),
      );
      const rows = await f.db.transaction((tx) =>
        tx.query(sql('SELECT id,assignee_id,version FROM dbo.tasks ORDER BY id')),
      );
      assert.equal(rows[0]!.assignee_id, null);
      assert.equal(rows[1]!.assignee_id, null);
      assert.equal(rows[2]!.assignee_id, 2);
      assert.equal(rows[0]!.version, 2);
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql("SELECT id FROM dbo.task_events WHERE action='access_cleanup'")),
          )
        ).length,
        2,
      );
      const notifications = await f.db.transaction((tx) =>
        tx.query(sql('SELECT recipient_id FROM dbo.notifications')),
      );
      assert.equal(notifications.length, 2);
      assert(notifications.every((n) => n.recipient_id === 3));
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 1, 2, { version: 3 }, true, randomUUID()),
      );
      await rejected(
        f.db.transaction(async (tx) =>
          projectAccess(tx, await currentActor(tx, m, false, { clock: f.clock }), 1),
        ),
        'NOT_FOUND',
      );
      assert.equal((await f.db.transaction((tx) => tx.query(notificationScope(2)))).length, 0);
    },
  );
  check(
    'T022 removing/reducing Lead preserves explicit Editor and cleanup only losing effective write',
    async (f, s, a) => {
      await f.db.transaction((tx) =>
        s.teamMember(tx, a, 1, 2, { team_role: 'lead', version: 1 }, false, randomUUID()),
      );
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 1, 2, { access: 'editor', version: 1 }, false, randomUUID()),
      );
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2')));
      await f.db.transaction((tx) => s.teamMember(tx, a, 1, 2, { version: 2 }, true, randomUUID()));
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT assignee_id FROM dbo.tasks WHERE id=1')),
          )
        )[0]!.assignee_id,
        2,
      );
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 1, 2, { access: 'viewer', version: 2 }, false, randomUUID()),
      );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT assignee_id FROM dbo.tasks WHERE id=1')),
          )
        )[0]!.assignee_id,
        null,
      );
    },
  );
  check('T022 reducing explicit Editor does not cleanup an owner Lead', async (f, s, a) => {
    await f.db.transaction((tx) =>
      s.teamMember(tx, a, 1, 2, { team_role: 'lead', version: 1 }, false, randomUUID()),
    );
    await f.db.transaction((tx) =>
      s.projectMember(tx, a, 1, 2, { access: 'editor', version: 1 }, false, randomUUID()),
    );
    await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2')));
    const result = await f.db.transaction((tx) =>
      s.projectMember(tx, a, 1, 2, { access: 'viewer', version: 2 }, false, randomUUID()),
    );
    assert.equal(result.items.find((m) => m.user.id === 2)!.effective_access, 'lead');
    assert.equal(
      (
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT assignee_id FROM dbo.tasks WHERE id=1')),
        )
      )[0]!.assignee_id,
      2,
    );
  });
  check(
    'T022 deactivate uses shared cleanup, revokes live sessions and preserves done history',
    async (f, s, a, m) => {
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 1, 2, { access: 'editor', version: 1 }, false, randomUUID()),
      );
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2'));
        await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=2'));
        await tx.execute(
          sql("UPDATE dbo.tasks SET status='done',completed_at=@now WHERE id=2", {
            now: f.clock().toISOString(),
          }),
        );
      });
      const accounts = accountService(f.db, f.service, { clock: f.clock });
      await f.db.transaction((tx) =>
        accounts.patch(tx, a, 2, { active: false, version: 1 }, randomUUID()),
      );
      assert.equal(await f.service.principal(m.tokenHash), null);
      const rows = await f.db.transaction((tx) =>
        tx.query(sql('SELECT assignee_id FROM dbo.tasks ORDER BY id')),
      );
      assert.equal(rows[0]!.assignee_id, null);
      assert.equal(rows[1]!.assignee_id, 2);
    },
  );
  check(
    'T022 cleanup notification/audit failure rolls back membership/task/version/revisions together',
    async (f, s, a) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(
          insert('users', {
            username: 'AnotherAdmin',
            display_name: 'Admin fixture',
            password_hash: 'fixture',
            org_role: 'admin',
          }),
        );
        await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2'));
      });
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 1, 2, { access: 'editor', version: 1 }, false, randomUUID()),
      );
      const before = await f.db.transaction((tx) =>
        tx.query(sql('SELECT revision FROM dbo.user_view_revisions ORDER BY user_id')),
      );
      for (const point of ['notifications', 'admin_events'])
        await assert.rejects(
          f.db.transaction((tx) => {
            const wrapped: Transaction = {
              query: async (statement) => {
                if (statement.sqlserver.includes('INSERT INTO dbo.' + point))
                  throw new Error('INJECTED_ATOMIC_FAILURE');
                return tx.query(statement);
              },
              execute: async (statement) => {
                if (statement.sqlserver.includes('INSERT INTO dbo.' + point))
                  throw new Error('INJECTED_ATOMIC_FAILURE');
                await tx.execute(statement);
              },
            };
            return s.projectMember(
              wrapped,
              a,
              1,
              2,
              { access: 'viewer', version: 2 },
              false,
              randomUUID(),
            );
          }),
        );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(
              sql('SELECT access FROM dbo.project_members WHERE project_id=1 AND user_id=2'),
            ),
          )
        )[0]!.access,
        'editor',
      );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT assignee_id,version FROM dbo.tasks WHERE id=1')),
          )
        )[0]!.version,
        1,
      );
      assert.deepEqual(
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT revision FROM dbo.user_view_revisions ORDER BY user_id')),
        ),
        before,
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.notifications')))).length,
        0,
      );
    },
  );
  check('T020/21 stale/revoked sessions and maintenance reject mutation', async (f, s, a, m) => {
    await f.db.transaction((tx) =>
      tx.execute(
        sql(
          "INSERT INTO dbo.maintenance_state(id,owner_id,state,lease_expires_at,updated_at) VALUES(1,@reason,'frozen',@lease,@now)",
          {
            reason: randomUUID(),
            now: f.clock().toISOString(),
            lease: new Date(f.clock().getTime() + 60000).toISOString(),
          },
        ),
      ),
    );
    await rejected(
      f.db.transaction((tx) => s.createTeam(tx, a, { name: 'Blocked' }, randomUUID())),
      'MAINTENANCE',
    );
    await f.db.transaction((tx) => tx.execute(sql('DELETE FROM dbo.sessions WHERE user_id=2')));
    await rejected(
      f.db.transaction((tx) => s.teams(tx, m, {})),
      'UNAUTHENTICATED',
    );
  });
  check(
    'T021 archived projects remain readable and real authorization forbids normal writes',
    async (f, s, a, m) => {
      await f.db.transaction((tx) =>
        s.projectMember(tx, a, 1, 2, { access: 'editor', version: 1 }, false, randomUUID()),
      );
      await f.db.transaction((tx) =>
        s.patchProject(tx, a, 1, { archived: true, version: 2 }, randomUUID()),
      );
      assert.equal((await f.db.transaction((tx) => s.projects(tx, m, {}))).total, 0);
      assert.equal(
        (await f.db.transaction((tx) => s.projects(tx, m, { includeArchived: true }))).total,
        1,
      );
      await rejected(
        f.db.transaction((tx) =>
          authorizeOperation(
            tx,
            m,
            {
              method: 'POST',
              path: '/api/tasks/{id}/comments',
              params: { id: 1 },
              body: { body: 'fixture' },
              phase: 'execute',
            },
            { clock: f.clock },
          ),
        ),
        'PROJECT_ARCHIVED',
      );
      await rejected(
        f.db.transaction((tx) => s.projectMember(tx, a, 1, 2, { version: 1 }, true, randomUUID())),
        'VERSION_CONFLICT',
      );
    },
  );
}
