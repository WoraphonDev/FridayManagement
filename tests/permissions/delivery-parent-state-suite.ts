import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture, login, call, type F } from './http-fixture.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { insert, type Fixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { taskService } from '../../src/services/tasks.js';
import { workspaceService } from '../../src/services/workspaces.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { projectSchema } from '../../frontend/src/workspace-api.js';
import { trashPage } from '../../frontend/src/task-api.js';
import type { Transaction } from '../../src/domain/database.js';

// Partial TC-034/035/087/088/089, AT-13/14/32. Real provider, legacy-shaped seed rows.
export async function seedParent(f: F) {
  await f.db.transaction(async (tx) => {
    for (const name of ['OwnerLead', 'Editor', 'Viewer', 'Unrelated']) {
      await tx.execute(
        sql(
          "INSERT INTO dbo.users(username,display_name,password_hash,org_role,must_change_password) SELECT @name,@name,password_hash,'member',0 FROM dbo.users WHERE id=2",
          { name },
        ),
      );
    }
    for (let id = 3; id <= 6; id++)
      await tx.execute(insert('user_view_revisions', { user_id: id, revision: randomUUID() }));
    await tx.execute(insert('team_members', { team_id: 1, user_id: 3, team_role: 'lead' }));
    for (const [id, access] of [
      [2, 'manager'],
      [4, 'editor'],
      [5, 'viewer'],
    ] as const)
      await tx.execute(
        insert('project_members', { project_id: 1, user_id: id, access, added_by: 1 }),
      );
    for (const id of [2, 4, 5, 6])
      for (const key of ['P-01', 'P-04'])
        await tx.execute(
          insert('user_permissions', {
            user_id: id,
            permission_key: key,
            granted_by: 1,
            granted_at: f.clock().toISOString(),
          }),
        );
    await tx.execute(
      insert('tasks', {
        project_id: 1,
        title: 'Deleted ไทย😀',
        creator_id: 1,
        deleted_at: f.clock().toISOString(),
        deleted_by: 1,
      }),
    );
    await tx.execute(
      insert('tasks', {
        project_id: 2,
        title: 'Hidden deleted',
        creator_id: 1,
        deleted_at: f.clock().toISOString(),
        deleted_by: 1,
      }),
    );
  });
}
export async function parentProof(f: F, username = 'Member', userId = 2) {
  const s = await f.service.login({ username, password }, '127.0.0.1');
  return { userId, tokenHash: tokenDigest(s.token) };
}
async function snapshot(f: F) {
  return f.db.transaction(async (tx) => {
    const result: Record<string, unknown> = {};
    for (const table of [
      'tasks',
      'projects',
      'task_assignees',
      'subtasks',
      'board_positions',
      'task_events',
      'admin_events',
      'notifications',
      'user_view_revisions',
    ])
      result[table] = await tx.query(sql(`SELECT * FROM dbo.${table}`));
    return result;
  });
}
export function deliveryParentStateSuite(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: string | false = false,
) {
  const it = (name: string, fn: () => Promise<void>) => test(`${provider}: ${name}`, { skip }, fn);
  it('HTTP scoped capabilities: all parent states, roles, hidden teams, strict DTOs and no read effects', async () =>
    fixture(async (base, f) => {
      await seedParent(f);
      const admin = await login(base),
        manager = await login(base, 'Member'),
        lead = await login(base, 'OwnerLead');
      assert.equal((await call(base, manager, '/api/teams?includeArchived=true')).body.total, 0);
      for (const [teamArchived, projectArchived] of [
        [false, false],
        [true, false],
        [false, true],
        [true, true],
      ]) {
        await f.db.transaction(async (tx) => {
          await tx.execute(
            sql('UPDATE dbo.teams SET archived_at=@at WHERE id=1', {
              at: teamArchived ? f.clock().toISOString() : null,
            }),
          );
          await tx.execute(
            sql('UPDATE dbo.projects SET archived_at=@at WHERE id=1', {
              at: projectArchived ? f.clock().toISOString() : null,
            }),
          );
        });
        const before = await snapshot(f);
        for (const [s, elevated] of [
          [admin, true],
          [lead, true],
          [manager, false],
        ] as const) {
          const projects = await call(base, s, '/api/projects?includeArchived=true');
          assert.equal(projects.status, 200);
          const p = projects.body.items.find((p: { id: number }) => p.id === 1);
          assert.equal(p.can_unarchive, elevated && projectArchived && !teamArchived);
          assert(projectSchema.safeParse(p).success);
          const trash = await call(base, s, '/api/trash');
          assert.equal(trash.status, 200);
          assert(trashPage.safeParse(trash.body).success);
          assert.equal(
            trash.body.items.find((t: { id: number }) => t.id === 3).can_restore,
            elevated || (!teamArchived && !projectArchived),
          );
          assert.equal(trash.body.total, s === admin ? 2 : 1);
          assert(!JSON.stringify({ p, trash: trash.body }).includes('team_archived_at'));
          const task = await call(base, s, '/api/tasks/1');
          assert.equal(task.status, 200);
          assert.equal(task.body.item.can_restore, undefined);
        }
        assert.deepEqual(await snapshot(f), before);
      }
      for (const name of ['Editor', 'Viewer', 'Unrelated']) {
        const s = await login(base, name);
        assert.equal((await call(base, s, '/api/trash')).status, 403);
        const list = await call(base, s, '/api/projects?includeArchived=true');
        assert.equal(list.body.total, name === 'Unrelated' ? 0 : 1);
        for (const p of list.body.items) assert.equal(p.can_unarchive, false);
      }
    }, factory));
  it('HTTP create/patch/list Project paths and archived unarchive authority preserve error order', async () =>
    fixture(async (base, f) => {
      await seedParent(f);
      const admin = await login(base),
        lead = await login(base, 'OwnerLead'),
        manager = await login(base, 'Member');
      const created = await call(base, admin, '/api/projects', 'POST', {
        name: 'New ไทย',
        owner_team_id: 1,
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.item.can_unarchive, false);
      assert(projectSchema.safeParse(created.body.item).success);
      let patched = await call(base, admin, '/api/projects/1', 'PATCH', {
        archived: true,
        version: 1,
      });
      assert.equal(patched.status, 200);
      assert.equal(patched.body.item.can_unarchive, true);
      assert(projectSchema.safeParse(patched.body.item).success);
      assert.equal(
        (await call(base, manager, '/api/projects/1', 'PATCH', { archived: false, version: 2 }))
          .status,
        403,
      );
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.teams SET archived_at=@at WHERE id=1', { at: f.clock().toISOString() }),
        ),
      );
      for (const s of [admin, lead]) {
        const before = await snapshot(f);
        const denied = await call(base, s, '/api/projects/1', 'PATCH', {
          archived: false,
          version: 2,
        });
        assert.equal(denied.body.error.code, 'TEAM_ARCHIVED');
        assert.deepEqual(await snapshot(f), before);
      }
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.teams SET archived_at=NULL WHERE id=1')),
      );
      patched = await call(base, lead, '/api/projects/1', 'PATCH', { archived: false, version: 2 });
      assert.equal(patched.status, 200);
      assert.equal(patched.body.item.can_unarchive, false);
      assert(projectSchema.safeParse(patched.body.item).success);
    }, factory));
  it('retention -1ms/exact/+1ms and stale archive/revoke/demote/version deny atomically', async () => {
    const f = await sessionFixture(factory);
    try {
      await seedParent(f);
      const manager = await parentProof(f),
        admin = await parentProof(f, 'Admin', 1);
      const tasks = taskService({ clock: f.clock });
      const cutoff = Date.parse(f.clock().toISOString()) + 30 * 86400000;
      // Keep valid sessions while moving the task's deletion time across the cutoff.
      for (const delta of [-1, 0, 1]) {
        await f.db.transaction((tx) =>
          tx.execute(
            sql('UPDATE dbo.tasks SET deleted_at=@at WHERE id=3', {
              at: new Date(f.clock().getTime() - 30 * 86400000 - delta).toISOString(),
            }),
          ),
        );
        const page = await f.db.transaction((tx) => tasks.list(tx, manager, {}, true));
        const row = page.items.find((t) => t.id === 3) as unknown as { can_restore: boolean };
        assert.equal(row.can_restore, delta < 0);
        if (delta >= 0)
          await assert.rejects(
            f.db.transaction((tx) =>
              tasks.trashMutation(tx, manager, 3, { version: 1 }, true, randomUUID()),
            ),
            { code: 'RETENTION_EXPIRED' },
          );
      }
      assert(Number.isFinite(cutoff));
      for (const [change, code] of [
        ["UPDATE dbo.teams SET archived_at='2026-10-06T00:00:00.000Z' WHERE id=1", 'TEAM_ARCHIVED'],
        [
          "UPDATE dbo.projects SET archived_at='2026-10-06T00:00:00.000Z' WHERE id=1",
          'PROJECT_ARCHIVED',
        ],
        ["DELETE FROM dbo.user_permissions WHERE user_id=2 AND permission_key='P-04'", 'NOT_FOUND'],
        ["UPDATE dbo.project_members SET access='editor' WHERE user_id=2", 'NOT_FOUND'],
        ['UPDATE dbo.tasks SET version=version+1 WHERE id=3', 'VERSION_CONFLICT'],
      ]) {
        // Isolate each raced mutation via rollback; snapshot must stay unchanged.
        const before = await snapshot(f);
        await assert.rejects(
          f.db.transaction(async (tx) => {
            await tx.execute(
              sql('UPDATE dbo.tasks SET deleted_at=@at WHERE id=3', {
                at: f.clock().toISOString(),
              }),
            );
            assert.equal((await tasks.list(tx, manager, {}, true)).items[0]!.can_restore, true);
            await tx.execute(sql(change!));
            await tasks.trashMutation(tx, manager, 3, { version: 1 }, true, randomUUID());
          }),
          { code },
        );
        assert.deepEqual(await snapshot(f), before);
      }
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.tasks SET deleted_at=@at WHERE id=3', { at: f.clock().toISOString() }),
        ),
      );
      const before = await snapshot(f);
      // Fault after real persistence: transaction must roll back restore, positions, audit and notifications.
      await assert.rejects(
        f.db.transaction(async (tx) => {
          await tasks.trashMutation(tx, admin, 3, { version: 1 }, true, randomUUID());
          throw new Error('injected rollback');
        }),
        /injected rollback/,
      );
      assert.deepEqual(await snapshot(f), before);
      await f.db.transaction((tx) =>
        tasks.trashMutation(tx, admin, 3, { version: 1 }, true, randomUUID()),
      );
      const after = await snapshot(f);
      assert.notDeepEqual(after.tasks, before.tasks);
      assert.notDeepEqual(after.task_events, before.task_events);
    } finally {
      await f.close();
    }
  });
  it('strict client parsers reject missing/null capability and raw hidden state', async () =>
    fixture(async (base, f) => {
      await seedParent(f);
      const s = await login(base);
      const p = (await call(base, s, '/api/projects')).body.items[0];
      const trash = (await call(base, s, '/api/trash')).body;
      for (const bad of [undefined, null, 'true', 1]) {
        assert.equal(projectSchema.safeParse({ ...p, can_unarchive: bad }).success, false);
        assert.equal(
          trashPage.safeParse({ ...trash, items: [{ ...trash.items[0], can_restore: bad }] })
            .success,
          false,
        );
      }
      assert.equal(projectSchema.safeParse({ ...p, owner_team_archived_at: null }).success, false);
    }, factory));
}

// Two concurrent real provider transactions, deterministic first-commit barrier; PG uses distinct
// checked-out connections and the existing application lock, without replacing authorization.
export async function orderedRace(
  f: F,
  first: (tx: Transaction) => Promise<unknown>,
  second: (tx: Transaction) => Promise<unknown>,
) {
  let reached!: () => void, release!: () => void;
  const ready = new Promise<void>((r) => (reached = r)),
    gate = new Promise<void>((r) => (release = r));
  const one = f.db.transaction(async (tx) => {
    await first(tx);
    reached();
    await gate;
  });
  try {
    await Promise.race([
      ready,
      one.then(() => {
        throw new Error('barrier not reached');
      }),
    ]);
    const two = f.db.transaction(second);
    release();
    return await Promise.allSettled([one, two]);
  } finally {
    release();
    await one.catch(() => {});
  }
}
export { snapshot, workspaceService, taskService };
