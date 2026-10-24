import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sqliteFixture, insert } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { workspaceService } from '../../src/services/workspaces.js';
import { taskService } from '../../src/services/tasks.js';
import { permissionService } from '../../src/services/permissions.js';
import { insightService } from '../../src/services/insights.js';
import { docService } from '../../src/services/docs.js';
import { fileService } from '../../src/services/files.js';
import { operations } from '../../src/api/contract.js';
import {
  authorizeOperation,
  type SessionProof,
} from '../../src/services/authorization.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { permissionKeys } from '../../src/domain/permissions.js';
import { selfFixture } from '../../frontend/src/test-fixtures.js';
import type { Transaction } from '../../src/domain/database.js';

// DEL-ACCESS / D09; partial TC-087–090. Real services and migrations, isolated SQLite;
// no listener, HTTP mocks, production DB, or catalogue-derived endpoint authority.
async function fixture() {
  const f = await sessionFixture(sqliteFixture);
  try {
    await f.db.transaction(async (tx) => {
      for (const name of [
        'OwnerLead',
        'Editor',
        'Viewer',
        'Unrelated',
        'OtherManager',
        'CrossLead',
      ]) {
        await tx.execute(
          sql(
            "INSERT INTO dbo.users(username,display_name,password_hash,org_role,must_change_password) SELECT @name,@name,password_hash,'member',0 FROM dbo.users WHERE id=2",
            { name },
          ),
        );
      }
      for (let id = 3; id <= 8; id++)
        await tx.execute(
          insert('user_view_revisions', {
            user_id: id,
            revision: randomUUID(),
          }),
        );
      for (const [user, team, role] of [
        [2, 1, 'member'],
        [3, 1, 'lead'],
        [4, 1, 'member'],
        [5, 1, 'member'],
        [7, 1, 'member'],
        [8, 2, 'lead'],
      ] as const)
        await tx.execute(
          insert('team_members', {
            team_id: team,
            user_id: user,
            team_role: role,
          }),
        );
      for (const [user, access] of [
        [2, 'manager'],
        [4, 'editor'],
        [5, 'viewer'],
        [7, 'manager'],
      ] as const)
        await tx.execute(
          insert('project_members', {
            project_id: 1,
            user_id: user,
            access,
            added_by: 1,
          }),
        );
      for (const user of [2, 7])
        await tx.execute(
          insert('user_permissions', {
            user_id: user,
            permission_key: 'P-02',
            granted_by: 1,
            granted_at: f.clock().toISOString(),
          }),
        );
      await tx.execute(
        insert('tasks', { project_id: 1, title: 'Editor own', creator_id: 4 }),
      );
      await tx.execute(
        insert('board_positions', {
          task_id: 3,
          project_id: 1,
          status: 'todo',
          rank: 3,
        }),
      );
      for (const project of [1, 2])
        await tx.execute(
          insert('tasks', {
            project_id: project,
            title: `Private trash ${project}`,
            creator_id: 1,
            deleted_at: f.clock().toISOString(),
            deleted_by: 1,
          }),
        );
    });
    const proofs: Record<string, SessionProof> = {};
    for (const [index, name] of [
      'Admin',
      'Member',
      'OwnerLead',
      'Editor',
      'Viewer',
      'Unrelated',
      'OtherManager',
      'CrossLead',
    ].entries()) {
      const login = await f.service.login(
        { username: name, password },
        `127.0.0.${index + 1}`,
      );
      proofs[name] = { userId: index + 1, tokenHash: tokenDigest(login.token) };
    }
    return {
      ...f,
      proofs,
      workspace: workspaceService({ clock: f.clock }),
      tasks: taskService({ clock: f.clock }),
    };
  } catch (e) {
    await f.close();
    throw e;
  }
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const check = (name: string, work: (f: Fixture) => Promise<void>) =>
  test(name, async () => {
    const f = await fixture();
    try {
      await work(f);
    } finally {
      await f.close();
    }
  });
// Roll back even allowed writes so every actor is tested against identical versions/parents.
async function outcome(
  f: Fixture,
  work: (tx: Transaction) => Promise<unknown>,
) {
  const rollback = new Error('DEL_ACCESS_TRIAL_ROLLBACK');
  try {
    await f.db.transaction(async (tx) => {
      await work(tx);
      throw rollback;
    });
  } catch (e) {
    if (e === rollback) return 'ALLOW';
    if (e && typeof e === 'object' && 'code' in e) return String(e.code);
    throw e;
  }
  throw new Error('TRIAL_DID_NOT_ROLL_BACK');
}
const keys = (f: Fixture, user: number, values: readonly string[]) =>
  f.db.transaction(async (tx) => {
    await tx.execute(
      sql('DELETE FROM dbo.user_permissions WHERE user_id=@user', { user }),
    );
    for (const key of values)
      await tx.execute(
        insert('user_permissions', {
          user_id: user,
          permission_key: key,
          granted_by: 1,
          granted_at: f.clock().toISOString(),
        }),
      );
  });

check(
  'endpoint role matrix: metadata, archive, membership, directory and scoped reads',
  async (f) => {
    for (const name of Object.keys(f.proofs)) {
      const proof = f.proofs[name]!;
      const elevated = ['Admin', 'OwnerLead'].includes(name);
      const related = !['Unrelated', 'CrossLead'].includes(name);
      await keys(f, 2, ['P-01', 'P-03']);
      if (['Editor', 'Viewer', 'Unrelated'].includes(name))
        await keys(f, proof.userId, permissionKeys);
      const expected = related
        ? elevated || name === 'Member'
          ? 'ALLOW'
          : 'FORBIDDEN'
        : 'NOT_FOUND';
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.patchProject(
            tx,
            proof,
            1,
            { name: 'แก้ 📝', version: 1 },
            randomUUID(),
          ),
        ),
        expected,
        `${name}: metadata`,
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.patchProject(
            tx,
            proof,
            1,
            { archived: true, version: 1 },
            randomUUID(),
          ),
        ),
        related ? (elevated ? 'ALLOW' : 'FORBIDDEN') : 'NOT_FOUND',
        `${name}: archive`,
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.projectMember(
            tx,
            proof,
            1,
            5,
            { access: 'editor', version: 1 },
            false,
            randomUUID(),
          ),
        ),
        expected,
        `${name}: viewer target`,
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.projectMember(
            tx,
            proof,
            1,
            7,
            { version: 1 },
            true,
            randomUUID(),
          ),
        ),
        related ? (elevated ? 'ALLOW' : 'FORBIDDEN') : 'NOT_FOUND',
        `${name}: manager target`,
      );
      assert.equal(
        await outcome(f, (tx) => f.workspace.directory(tx, proof, {})),
        ['Admin', 'OwnerLead', 'CrossLead'].includes(name)
          ? 'ALLOW'
          : 'FORBIDDEN',
        `${name}: directory`,
      );
      const page = await f.db.transaction((tx) =>
        f.workspace.projects(tx, proof, {}),
      );
      assert.equal(
        page.total,
        name === 'Admin' ? 2 : name === 'Unrelated' ? 0 : 1,
      );
      assert.deepEqual(
        page.items.map((p) => p.id),
        name === 'Admin'
          ? [1, 2]
          : name === 'Unrelated'
            ? []
            : name === 'CrossLead'
              ? [2]
              : [1],
      );
      const teams = await f.db.transaction((tx) =>
        f.workspace.teams(tx, proof, {}),
      );
      assert(
        teams.items.every((t) =>
          name === 'Admin' ? Array.isArray(t.members) : !('members' in t),
        ),
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.patchTeam(
            tx,
            proof,
            1,
            { name: 'Team edit', version: 1 },
            randomUUID(),
          ),
        ),
        name === 'Admin' ? 'ALLOW' : 'FORBIDDEN',
      );
    }
  },
);

check(
  'each manager P-key is evaluated by endpoint; P-02/P-07 are not write gates',
  async (f) => {
    const manager = f.proofs.Member!;
    for (const key of permissionKeys) {
      await keys(f, 2, [key]);
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.patchProject(
            tx,
            manager,
            1,
            { name: key, version: 1 },
            randomUUID(),
          ),
        ),
        key === 'P-01' ? 'ALLOW' : 'FORBIDDEN',
        key,
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.projectMember(
            tx,
            manager,
            1,
            5,
            { access: 'editor', version: 1 },
            false,
            randomUUID(),
          ),
        ),
        key === 'P-03' ? 'ALLOW' : 'FORBIDDEN',
        key,
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.tasks.trashMutation(
            tx,
            manager,
            1,
            { version: 1 },
            false,
            randomUUID(),
          ),
        ),
        key === 'P-04' ? 'ALLOW' : 'FORBIDDEN',
        key,
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.tasks.createGroup(tx, manager, 1, { name: 'Group' }, randomUUID()),
        ),
        'ALLOW',
        key,
      );
      assert.equal(
        await outcome(f, (tx) =>
          insightService({ clock: f.clock }).overview(tx, manager, 1),
        ),
        'ALLOW',
        key,
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.createProject(
            tx,
            manager,
            { name: 'Own team', owner_team_id: 1 },
            randomUUID(),
          ),
        ),
        key === 'P-08' ? 'ALLOW' : 'FORBIDDEN',
        key,
      );
    }
  },
);

check(
  'P-08 requires own active team; cross-team explicit access and creation role stay server-defined',
  async (f) => {
    for (const name of ['Member', 'Editor', 'Viewer', 'Unrelated']) {
      const p = f.proofs[name]!;
      await keys(f, p.userId, ['P-08']);
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.createProject(
            tx,
            p,
            { name: 'Own', owner_team_id: 1 },
            randomUUID(),
          ),
        ),
        name === 'Unrelated' ? 'FORBIDDEN' : 'ALLOW',
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.createProject(
            tx,
            p,
            { name: 'Cross', owner_team_id: 2 },
            randomUUID(),
          ),
        ),
        'FORBIDDEN',
      );
    }
    await f.db.transaction(async (tx) => {
      const created = await f.workspace.createProject(
        tx,
        f.proofs.Editor!,
        { name: 'P08 only', owner_team_id: 1 },
        randomUUID(),
      );
      assert.equal(created.item.effective_access, 'editor');
      await tx.execute(
        insert('project_members', {
          project_id: 2,
          user_id: 4,
          access: 'viewer',
          added_by: 1,
        }),
      );
    });
    const page = await f.db.transaction((tx) =>
      f.workspace.projects(tx, f.proofs.Editor!, {}),
    );
    assert.equal(
      page.items.find((p) => p.id === 2)?.effective_access,
      'viewer',
    );
    await keys(f, 2, ['P-01', 'P-08']);
    const managed = await f.db.transaction((tx) =>
      f.workspace.createProject(
        tx,
        f.proofs.Member!,
        { name: 'P08 plus project key', owner_team_id: 1 },
        randomUUID(),
      ),
    );
    assert.equal(managed.item.effective_access, 'manager');
    assert.deepEqual(
      (
        await f.db.transaction((tx) =>
          permissionService({ clock: f.clock }).get(tx, f.proofs.Member!, 2),
        )
      ).keys,
      ['P-01', 'P-08'],
    );
    assert.equal(
      await outcome(f, async (tx) => {
        await tx.execute(
          insert('team_members', {
            team_id: 1,
            user_id: 6,
            team_role: 'member',
            team_position: 'lead',
          }),
        );
        await f.workspace.patchProject(
          tx,
          f.proofs.Unrelated!,
          1,
          { name: 'Position is not authority', version: 1 },
          randomUUID(),
        );
      }),
      'NOT_FOUND',
    );
    await f.db.transaction((tx) =>
      tx.execute(
        sql('UPDATE dbo.teams SET archived_at=@at WHERE id=1', {
          at: f.clock().toISOString(),
        }),
      ),
    );
    assert.equal(
      await outcome(f, (tx) =>
        f.workspace.createProject(
          tx,
          f.proofs.Editor!,
          { name: 'Archived', owner_team_id: 1 },
          randomUUID(),
        ),
      ),
      'TEAM_ARCHIVED',
    );
  },
);

check(
  'own versus other task/Doc and archived trash boundaries use actual service authority',
  async (f) => {
    const docs = docService({ clock: f.clock });
    const doc = await f.db.transaction((tx) =>
      docs.create(tx, f.proofs.Admin!, 1, { title: 'Other doc' }),
    );
    for (const name of [
      'Admin',
      'OwnerLead',
      'Member',
      'Editor',
      'Viewer',
      'Unrelated',
      'CrossLead',
    ]) {
      const p = f.proofs[name]!;
      const elevated = ['Admin', 'OwnerLead'].includes(name);
      const related = !['Unrelated', 'CrossLead'].includes(name);
      for (const granted of [false, true]) {
        await keys(f, p.userId, granted ? ['P-04', 'P-05'] : []);
        const manage = elevated || (name === 'Member' && granted);
        assert.equal(
          await outcome(f, (tx) =>
            f.tasks.trashMutation(
              tx,
              p,
              3,
              { version: 1 },
              false,
              randomUUID(),
            ),
          ),
          !related
            ? 'NOT_FOUND'
            : manage || name === 'Editor'
              ? 'ALLOW'
              : 'FORBIDDEN',
          `${name}: own/other task`,
        );
        assert.equal(
          await outcome(f, async (tx) => {
            await tx.execute(
              sql('UPDATE dbo.tasks SET creator_id=@user WHERE id=1', {
                user: p.userId,
              }),
            );
            await f.tasks.trashMutation(
              tx,
              p,
              1,
              { version: 1 },
              false,
              randomUUID(),
            );
          }),
          !related ? 'NOT_FOUND' : name === 'Viewer' ? 'FORBIDDEN' : 'ALLOW',
          `${name}: creator own task`,
        );
        assert.equal(
          await outcome(f, (tx) =>
            docs.trash(
              tx,
              p,
              doc.item.id,
              { version: doc.item.version },
              false,
              randomUUID(),
            ),
          ),
          !related ? 'NOT_FOUND' : manage ? 'ALLOW' : 'FORBIDDEN',
          `${name}: other doc`,
        );
        assert.equal(
          await outcome(f, async (tx) => {
            await tx.execute(
              sql('UPDATE dbo.project_docs SET created_by=@user WHERE id=@id', {
                user: p.userId,
                id: doc.item.id,
              }),
            );
            await docs.trash(
              tx,
              p,
              doc.item.id,
              { version: doc.item.version },
              false,
              randomUUID(),
            );
          }),
          !related ? 'NOT_FOUND' : name === 'Viewer' ? 'FORBIDDEN' : 'ALLOW',
          `${name}: own doc`,
        );
        assert.equal(
          await outcome(f, (tx) =>
            docs.patch(tx, p, doc.item.id, {
              title: 'Any writer can edit',
              version: doc.item.version,
            }),
          ),
          !related ? 'NOT_FOUND' : name === 'Viewer' ? 'FORBIDDEN' : 'ALLOW',
          `${name}: edit other doc without P-05`,
        );
      }
    }
    await keys(f, 2, ['P-04']);
    for (const name of [
      'Admin',
      'OwnerLead',
      'Member',
      'Editor',
      'Viewer',
      'Unrelated',
      'CrossLead',
    ]) {
      const result = await outcome(f, (tx) =>
        f.tasks.list(tx, f.proofs[name]!, {}, true),
      );
      assert.equal(
        result,
        ['Admin', 'OwnerLead', 'Member', 'CrossLead'].includes(name)
          ? 'ALLOW'
          : 'FORBIDDEN',
      );
      if (result === 'ALLOW') {
        const list = await f.db.transaction((tx) =>
          f.tasks.list(tx, f.proofs[name]!, {}, true),
        );
        assert.equal(list.total, name === 'Admin' ? 2 : 1);
        assert.deepEqual(
          list.items.map((t) => t.project_id),
          name === 'Admin' ? [1, 2] : name === 'CrossLead' ? [2] : [1],
        );
      }
    }
    await f.db.transaction((tx) =>
      tx.execute(
        sql('UPDATE dbo.projects SET archived_at=@at WHERE id=1', {
          at: f.clock().toISOString(),
        }),
      ),
    );
    for (const name of ['Admin', 'OwnerLead', 'Member']) {
      const p = f.proofs[name]!;
      assert.equal(
        await outcome(f, (tx) =>
          f.tasks.trashMutation(tx, p, 4, { version: 1 }, true, randomUUID()),
        ),
        name === 'Member' ? 'PROJECT_ARCHIVED' : 'ALLOW',
      );
      assert.equal(
        await outcome(f, (tx) =>
          f.workspace.projectMember(
            tx,
            p,
            1,
            5,
            { access: 'editor', version: 1 },
            false,
            randomUUID(),
          ),
        ),
        name === 'Member' ? 'FORBIDDEN' : 'ALLOW',
      );
    }
    assert.equal(
      await outcome(f, (tx) =>
        f.tasks.trashMutation(
          tx,
          f.proofs.Member!,
          4,
          { version: 99 },
          true,
          randomUUID(),
        ),
      ),
      'VERSION_CONFLICT',
    );
    await keys(f, 2, ['P-01', 'P-03']);
    assert.equal(
      await outcome(f, (tx) =>
        f.workspace.patchProject(
          tx,
          f.proofs.Member!,
          1,
          { name: 'Archived metadata', version: 1 },
          randomUUID(),
        ),
      ),
      'ALLOW',
    );
    assert.equal(
      await outcome(f, (tx) =>
        f.workspace.projectMember(
          tx,
          f.proofs.Member!,
          1,
          5,
          { access: 'editor', version: 1 },
          false,
          randomUUID(),
        ),
      ),
      'ALLOW',
    );
    await f.db.transaction((tx) =>
      tx.execute(
        sql('UPDATE dbo.teams SET archived_at=@at WHERE id=1', {
          at: f.clock().toISOString(),
        }),
      ),
    );
    assert.equal(
      await outcome(f, (tx) =>
        f.workspace.patchProject(
          tx,
          f.proofs.Admin!,
          1,
          { archived: false, version: 1 },
          randomUUID(),
        ),
      ),
      'TEAM_ARCHIVED',
    );
    assert.equal(
      await outcome(f, (tx) =>
        f.tasks.trashMutation(
          tx,
          f.proofs.OwnerLead!,
          4,
          { version: 1 },
          true,
          randomUUID(),
        ),
      ),
      'ALLOW',
    );
  },
);

check(
  'P-06 other-file authority, team P-09 and Admin/not-self boundaries are independent of titles and project keys',
  async (f) => {
    const directory = await mkdtemp(join(tmpdir(), 'del-access-files-'));
    try {
      const files = await fileService(
        f.db,
        { directory, maxFileBytes: 10485760, totalUploadBytes: 20971520 },
        { clock: f.clock },
      );
      await f.db.transaction((tx) =>
        tx.execute(
          insert('project_files', {
            project_id: 1,
            uploader_id: 1,
            original_name: 'Private.pdf',
            storage_key: randomUUID(),
            bytes: 1,
            validated_type: 'application/pdf',
            sha256: 'a'.repeat(64),
            created_at: f.clock().toISOString(),
          }),
        ),
      );
      for (const name of Object.keys(f.proofs)) {
        const p = f.proofs[name]!;
        const elevated = ['Admin', 'OwnerLead'].includes(name);
        const related = !['Unrelated', 'CrossLead'].includes(name);
        for (const granted of [false, true]) {
          await keys(f, p.userId, granted ? ['P-06', 'P-09'] : []);
          assert.equal(
            await outcome(f, (tx) =>
              files.projectChange(tx, p, 1, false, randomUUID()),
            ),
            !related
              ? 'NOT_FOUND'
              : elevated ||
                  ((name === 'Member' || name === 'OtherManager') && granted)
                ? 'ALLOW'
                : 'FORBIDDEN',
            `${name}: P-06 ${granted}`,
          );
          assert.equal(
            await outcome(f, async (tx) => {
              await tx.execute(
                sql(
                  'UPDATE dbo.project_files SET uploader_id=@user WHERE id=1',
                  {
                    user: p.userId,
                  },
                ),
              );
              await files.projectChange(tx, p, 1, false, randomUUID());
            }),
            !related ? 'NOT_FOUND' : name === 'Viewer' ? 'FORBIDDEN' : 'ALLOW',
            `${name}: own file`,
          );
          assert.equal(
            await outcome(f, (tx) =>
              authorizeOperation(
                tx,
                p,
                {
                  method: 'GET',
                  path: '/api/teams/{id}/workload',
                  params: { id: 1 },
                },
                { clock: f.clock },
              ),
            ),
            elevated || (granted && !['Unrelated', 'CrossLead'].includes(name))
              ? 'ALLOW'
              : 'FORBIDDEN',
            `${name}: P-09 ${granted}`,
          );
        }
        assert.equal(
          await outcome(f, (tx) =>
            permissionService({ clock: f.clock }).put(
              tx,
              p,
              p.userId,
              { keys: [], permissions_version: 1 },
              randomUUID(),
            ),
          ),
          'FORBIDDEN',
          `${name}: no own grants`,
        );
        assert.equal(
          await outcome(f, (tx) =>
            permissionService({ clock: f.clock }).matrix(
              tx,
              p,
              {
                changes: [
                  { user_id: 5, keys: ['P-01'], permissions_version: 1 },
                ],
              },
              randomUUID(),
            ),
          ),
          name === 'Admin' ? 'ALLOW' : 'FORBIDDEN',
          `${name}: matrix`,
        );
      }
      assert.equal(
        operations.some(
          (o) => o.method === 'DELETE' && o.path === '/api/groups/{id}',
        ),
        false,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

check(
  'two authorized same-version metadata saves persist one winner and one atomic audit',
  async (f) => {
    await keys(f, 2, ['P-01']);
    const writes = await Promise.allSettled(
      ['First', 'Second'].map((name) =>
        f.db.transaction((tx) =>
          f.workspace.patchProject(
            tx,
            f.proofs.Member!,
            1,
            { name, version: 1 },
            randomUUID(),
          ),
        ),
      ),
    );
    assert.equal(writes.filter((r) => r.status === 'fulfilled').length, 1);
    const lost = writes.find((r) => r.status === 'rejected');
    assert(lost?.status === 'rejected');
    assert.equal(lost.reason.code, 'VERSION_CONFLICT');
    const audits = await f.db.transaction((tx) =>
      tx.query(
        sql("SELECT id FROM dbo.admin_events WHERE action='project_updated'"),
      ),
    );
    assert.equal(audits.length, 1);
  },
);

check(
  'revocation beats stale version; authorized races conflict, denied mutations leave no audit or membership writes',
  async (f) => {
    const p = f.proofs.Member!;
    await keys(f, 2, ['P-01', 'P-03', 'P-04']);
    const request = {
      method: 'PATCH',
      path: '/api/projects/{id}',
      params: { id: 1 },
      body: { name: 'Stale', version: 99 },
    };
    assert.equal(
      await outcome(f, async (tx) => {
        await authorizeOperation(tx, p, request, {
          clock: f.clock,
          checkVersions: f.workspace.checkVersions,
        });
      }),
      'VERSION_CONFLICT',
    );
    const permissions = permissionService({ clock: f.clock });
    await f.db.transaction(async (tx) => {
      const current = await permissions.get(tx, f.proofs.Admin!, 2);
      await permissions.put(
        tx,
        f.proofs.Admin!,
        2,
        { keys: [], permissions_version: current.permissions_version },
        randomUUID(),
      );
    });
    assert.equal(
      (await f.db.transaction((tx) => f.workspace.projects(tx, p, {}))).items[0]
        ?.effective_access,
      'editor',
    );
    assert.equal(
      await outcome(f, (tx) =>
        authorizeOperation(tx, p, request, {
          clock: f.clock,
          checkVersions: f.workspace.checkVersions,
        }),
      ),
      'FORBIDDEN',
    );
    assert.equal(
      await outcome(f, (tx) =>
        f.tasks.trashMutation(tx, p, 4, { version: 99 }, true, randomUUID()),
      ),
      'NOT_FOUND',
    );
    const before = await f.db.transaction((tx) =>
      tx.query(sql('SELECT * FROM dbo.admin_events ORDER BY id')),
    );
    assert.equal(
      await outcome(f, (tx) =>
        f.workspace.projectMember(
          tx,
          p,
          1,
          5,
          { access: 'editor', version: 99 },
          false,
          randomUUID(),
        ),
      ),
      'FORBIDDEN',
    );
    assert.deepEqual(
      await f.db.transaction((tx) =>
        tx.query(sql('SELECT * FROM dbo.admin_events ORDER BY id')),
      ),
      before,
    );
    await f.db.transaction((tx) =>
      tx.execute(
        sql('DELETE FROM dbo.project_members WHERE project_id=1 AND user_id=2'),
      ),
    );
    assert.equal(
      await outcome(f, (tx) =>
        authorizeOperation(tx, p, request, {
          clock: f.clock,
          checkVersions: f.workspace.checkVersions,
        }),
      ),
      'NOT_FOUND',
    );
    assert.equal(
      (await f.db.transaction((tx) => f.workspace.projects(tx, p, {}))).total,
      0,
    );
  },
);

test('UI RED/GREEN: P-08 team member gets project creation; non-Admin cannot render Admin controls', async () => {
  // Vite transforms actual components/CSS for SSR, without listening or launching a browser.
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
    esbuild: { jsx: 'automatic' },
  });
  try {
    const { Workspaces } = await vite.ssrLoadModule(
      '/frontend/src/Workspaces.tsx',
    );
    const { AdminCenter } = await vite.ssrLoadModule(
      '/frontend/src/AdminCenter.tsx',
    );
    const self = selfFixture();
    self.user.permission_keys = ['P-08'];
    self.user.teams = [
      { id: 1, name: 'Own', team_role: 'member', team_position: 'dev' },
    ];
    const props = {
      self,
      online: true,
      onFailure: () => {},
      onSelfChange: () => {},
    };
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(Workspaces, { ...props, kind: 'projects' }),
      ),
    );
    assert.match(markup, />Create project<\/button>/);
    const admin = renderToStaticMarkup(createElement(AdminCenter, props));
    assert.match(admin, /class="admin-center"/);
    assert.match(admin, /aria-label="Admin access notice"/);
    assert.doesNotMatch(
      admin,
      /role="tablist"|Permission matrix|Add member|Registrations/,
    );
    assert.match(admin, /administrator/i);
    self.user.teams = [];
    assert.doesNotMatch(
      renderToStaticMarkup(
        createElement(
          MemoryRouter,
          null,
          createElement(Workspaces, { ...props, kind: 'projects' }),
        ),
      ),
      />Create project<\/button>/,
    );
  } finally {
    await vite.close();
  }
});
