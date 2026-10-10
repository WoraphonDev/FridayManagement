import test from 'node:test';
import type { Fixture } from '../schema/fixtures.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sql } from '../../src/repository/access-scope.js';
import { fixture, login, call, projectVersion, type F, type Session } from './http-fixture.js';
// T-081 SQLite HTTP matrix: every enforced P-key × (manager with key, manager without key,
// editor, viewer) on its endpoint, plus same-version and revoke-then-act races (SRS §4.4).
// P-02/P-07/P-10 add no rights beyond project access (SRS §4.4 v1.31, Q-T-081-1 = A).

const actors = ['managerWithKey', 'managerWithoutKey', 'editor', 'viewer'] as const;
type Actor = (typeof actors)[number];
const ids: Record<Actor, number> = {
  managerWithKey: 2,
  managerWithoutKey: 3,
  editor: 4,
  viewer: 5,
};
const outsider = 6;

/** Users 3–6 share Member's password; 2–5 join team 1 and project 1 in their role. */
async function roles(f: F) {
  await f.db.transaction(async (tx) => {
    for (const [id, name] of [
      [3, 'ManagerNoKey'],
      [4, 'Editor'],
      [5, 'Viewer'],
      [6, 'Outsider'],
    ] as const) {
      await tx.execute(
        sql(
          'INSERT INTO dbo.users(username,display_name,password_hash,org_role,must_change_password,created_at,updated_at) SELECT @name,@name,password_hash,@role,0,created_at,updated_at FROM dbo.users WHERE id=2',
          { name, role: 'member' },
        ),
      );
      // Every account needs a view revision row, as account creation inserts one.
      await tx.execute(
        sql(
          'INSERT INTO dbo.user_view_revisions(user_id,revision,updated_at) SELECT @id,@revision,updated_at FROM dbo.users WHERE id=@id',
          { id, revision: randomUUID() },
        ),
      );
    }
    const rows = await tx.query<{ id: number }>(sql('SELECT id FROM dbo.users ORDER BY id'));
    assert.deepEqual(
      rows.map((r) => r.id),
      [1, 2, 3, 4, 5, 6],
    );
    for (const user of [2, 3, 4, 5])
      await tx.execute(
        sql(
          "INSERT INTO dbo.team_members(team_id,user_id,team_role) SELECT 1,@user,'member' WHERE NOT EXISTS (SELECT 1 FROM dbo.team_members WHERE team_id=1 AND user_id=@user)",
          { user },
        ),
      );
    for (const [user, access] of [
      [2, 'manager'],
      [3, 'manager'],
      [4, 'editor'],
      [5, 'viewer'],
    ] as const)
      await tx.execute(
        sql(
          'INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(1,@user,@access,1)',
          { user, access },
        ),
      );
  });
}
async function grant(base: string, admin: Session, user: number, keys: string[]) {
  const current = await call(base, admin, `/api/users/${user}/permissions`);
  assert.equal(current.status, 200);
  const put = await call(base, admin, `/api/users/${user}/permissions`, 'PUT', {
    keys,
    permissions_version: current.body.permissions_version,
  });
  assert.equal(put.status, 200, JSON.stringify(put.body));
}
async function sessions(base: string) {
  const out = {} as Record<Actor, Session>;
  for (const [actor, name] of [
    ['managerWithKey', 'Member'],
    ['managerWithoutKey', 'ManagerNoKey'],
    ['editor', 'Editor'],
    ['viewer', 'Viewer'],
  ] as const)
    out[actor] = await login(base, name);
  return out;
}
const otherKey = (key: string) => (key === 'P-01' ? 'P-02' : 'P-01');

/** Runs on SQLite here and on SQL Server via tests/sqlserver/permissions-matrix.test.ts. */
export function matrixSuite(label: string, factory: () => Promise<Fixture>, skip: string | false) {
  test(
    `${label} T-081 matrix: P-01/P-03/P-04/P-05/P-06 allow only the manager holding that key`,
    { skip },
    () =>
      fixture(async (base, f) => {
        await roles(f);
        const admin = await login(base);
        const s = await sessions(base);
        const ops: Record<string, (actor: Session) => Promise<number>> = {
          'P-01': async (a) =>
            (
              await call(base, a, '/api/projects/1', 'PATCH', {
                name: `Renamed ${randomUUID().slice(0, 8)}`,
                version: await projectVersion(f),
              })
            ).status,
          'P-03': async (a) => {
            const r = await call(base, a, `/api/projects/1/members/${outsider}`, 'PUT', {
              access: 'viewer',
              version: await projectVersion(f),
            });
            if (r.status === 200)
              await f.db.transaction((tx) =>
                tx.execute(
                  sql('DELETE FROM dbo.project_members WHERE user_id=@u', { u: outsider }),
                ),
              );
            return r.status;
          },
          'P-04': async (a) => {
            const task = await call(base, admin, '/api/tasks', 'POST', {
              project_id: 1,
              title: 'Admin task',
            });
            assert.equal(task.status, 201);
            return (
              await call(base, a, `/api/tasks/${task.body.item.id}`, 'DELETE', {
                version: task.body.item.version,
              })
            ).status;
          },
          'P-05': async (a) => {
            const doc = await call(base, admin, '/api/projects/1/docs', 'POST', {
              title: 'Admin doc',
            });
            assert.equal(doc.status, 201, JSON.stringify(doc.body));
            return (
              await call(base, a, `/api/docs/${doc.body.item.id}`, 'DELETE', {
                version: doc.body.item.version,
              })
            ).status;
          },
          'P-06': async (a) => {
            const id = await f.db.transaction(async (tx) => {
              await tx.execute(
                sql(
                  "INSERT INTO dbo.project_files(project_id,uploader_id,original_name,storage_key,bytes,validated_type,sha256,created_at) VALUES(1,1,'admin.pdf',@key,100,'application/pdf',@sha,'2026-10-06T00:00:00.000Z')",
                  { key: randomUUID(), sha: 'a'.repeat(64) },
                ),
              );
              return Number(
                (
                  await tx.query<{ id: number }>(sql('SELECT MAX(id) AS id FROM dbo.project_files'))
                )[0]!.id,
              );
            });
            return (await call(base, a, `/api/project-files/${id}`, 'DELETE')).status;
          },
        };
        const results: Record<string, Record<Actor, number>> = {};
        for (const [key, op] of Object.entries(ops)) {
          await grant(base, admin, ids.managerWithKey, [key]);
          await grant(base, admin, ids.managerWithoutKey, [otherKey(key)]);
          results[key] = {} as Record<Actor, number>;
          for (const actor of actors) results[key][actor] = await op(s[actor]);
        }
        const success = { 'P-01': 200, 'P-03': 200, 'P-04': 200, 'P-05': 200, 'P-06': 200 };
        for (const [key, row] of Object.entries(results))
          assert.deepEqual(
            row,
            {
              managerWithKey: success[key as keyof typeof success],
              managerWithoutKey: 403,
              editor: 403,
              viewer: 403,
            },
            key,
          );
      }, factory),
  );

  test(
    `${label} T-081 matrix: P-08 creates only in own team; P-09 team workload only with the key`,
    { skip },
    () =>
      fixture(async (base, f) => {
        await roles(f);
        const admin = await login(base);
        const s = await sessions(base);
        await grant(base, admin, ids.managerWithKey, ['P-08', 'P-09']);
        await grant(base, admin, ids.managerWithoutKey, ['P-01']);
        const create = async (a: Session, team: number) =>
          (
            await call(base, a, '/api/projects', 'POST', {
              owner_team_id: team,
              name: randomUUID(),
            })
          ).status;
        const workload = async (a: Session) =>
          (await call(base, a, '/api/teams/1/workload')).status;
        const results = Object.fromEntries(
          await Promise.all(
            actors.map(async (actor) => [
              actor,
              {
                ownTeam: await create(s[actor], 1),
                otherTeam: await create(s[actor], 2),
                workload: await workload(s[actor]),
              },
            ]),
          ),
        );
        assert.deepEqual(results, {
          managerWithKey: { ownTeam: 201, otherTeam: 403, workload: 200 },
          managerWithoutKey: { ownTeam: 403, otherTeam: 403, workload: 403 },
          editor: { ownTeam: 403, otherTeam: 403, workload: 403 },
          viewer: { ownTeam: 403, otherTeam: 403, workload: 403 },
        });
      }, factory),
  );

  test(
    `${label} T-081 races: one of two same-version permission saves wins; revocation applies to the next request`,
    { skip },
    () =>
      fixture(async (base, f) => {
        await roles(f);
        const admin = await login(base);
        const s = await sessions(base);
        const current = await call(base, admin, `/api/users/${ids.managerWithKey}/permissions`);
        const save = (keys: string[]) =>
          call(base, admin, `/api/users/${ids.managerWithKey}/permissions`, 'PUT', {
            keys,
            permissions_version: current.body.permissions_version,
          });
        const attempts = [['P-04'], ['P-01']];
        const saves = await Promise.all(attempts.map(save));
        // The loser sees the stale version (409) or, on SQL Server, may be the deadlock victim
        // (contract: 503 DATABASE_BUSY + Retry-After, fully rolled back); its retry must be 409.
        assert.equal(saves.filter((r) => r.status === 200).length, 1);
        for (const [n, r] of saves.entries())
          if (r.status !== 200) {
            assert([409, 503].includes(r.status), String(r.status));
            if (r.status === 503) assert.equal((await save(attempts[n]!)).status, 409);
          }
        const kept = (await call(base, admin, `/api/users/${ids.managerWithKey}/permissions`)).body;
        assert.equal(kept.permissions_version, current.body.permissions_version + 1);
        // Revoke P-04 while the manager keeps the same session: the very next delete is denied.
        await grant(base, admin, ids.managerWithKey, ['P-04']);
        await grant(base, admin, ids.managerWithKey, ['P-01']);
        const task = (await call(base, admin, '/api/tasks/1')).body.item;
        assert.equal(
          (
            await call(base, s.managerWithKey, '/api/tasks/1', 'DELETE', {
              version: task.version,
            })
          ).status,
          403,
        );
        void f;
      }, factory),
  );

  test(
    `${label} T-081 SRS §4.4 (Q-T-081-1 = A): P-02/P-10 add no rights beyond project access`,
    { skip },
    () =>
      fixture(async (base, f) => {
        await roles(f);
        const admin = await login(base);
        const s = await sessions(base);
        await grant(base, admin, ids.managerWithKey, ['P-02', 'P-10']);
        await grant(base, admin, ids.managerWithoutKey, ['P-01']);
        const group = async (a: Session) =>
          (
            await call(base, a, '/api/projects/1/groups', 'POST', {
              name: randomUUID().slice(0, 8),
            })
          ).status;
        const teamReport = async (a: Session) =>
          (await call(base, a, '/api/reports/summary?team=1')).status;
        const results = {} as Record<Actor, { group: number; teamReport: number }>;
        for (const actor of actors)
          results[actor] = { group: await group(s[actor]), teamReport: await teamReport(s[actor]) };
        assert.deepEqual(results, {
          managerWithKey: { group: 201, teamReport: 200 },
          managerWithoutKey: { group: 201, teamReport: 200 },
          editor: { group: 201, teamReport: 200 },
          viewer: { group: 403, teamReport: 200 },
        });
        void f;
      }, factory),
  );
}
