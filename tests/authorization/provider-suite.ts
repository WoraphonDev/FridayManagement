import test from 'node:test';
import assert from 'node:assert/strict';
import type { Fixture } from '../schema/fixtures.js';
import { ApiFault } from '../../src/api/errors.js';
import {
  authorizeOperation,
  currentActor,
  type AccessRequest,
} from '../../src/services/authorization.js';
import {
  sql,
  projectList,
  taskScope,
  notificationScope,
  readNotifications,
  attachmentScope,
  teamList,
  directoryList,
} from '../../src/repository/access-scope.js';
import { executeIdempotent, type Reply } from '../../src/repository/idempotency.js';
import { command, comment } from '../idempotency/provider-suite.js';
import { accessFixture, proof, now, csrf } from './fixtures.js';
import { operations } from '../../src/api/contract.js';
const rejects = (p: Promise<unknown>, code: string) =>
  assert.rejects(p, (e: unknown) => e instanceof ApiFault && e.code === code);
export function authorizationAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  const check = (name: string, work: (f: Fixture) => Promise<void>) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await accessFixture(factory);
      try {
        await work(f);
      } finally {
        await f.close();
      }
    });
  const request = (method: string, path: string): AccessRequest => ({
    method,
    path,
    params: { id: 1 },
    body: { task_id: 1, owner_team_id: 1, project_id: 1 },
  });
  const access = (f: Fixture, user: number, r: AccessRequest) =>
    f.db.transaction((tx) =>
      authorizeOperation(tx, proof(user), r, { clock: () => new Date(now) }),
    );
  check(
    'role matrix: admin/owner lead/editor/viewer; team/foreign lead/creator/assignee do not grant project access',
    async (f) => {
      for (const user of [1, 3, 4, 5, 8, 9])
        await access(f, user, request('GET', '/api/tasks/{id}'));
      for (const user of [2, 6, 7])
        await rejects(access(f, user, request('GET', '/api/tasks/{id}')), 'NOT_FOUND');
      for (const user of [1, 3, 4, 8, 9])
        await access(f, user, request('POST', '/api/tasks/{id}/comments'));
      await rejects(access(f, 5, request('POST', '/api/tasks/{id}/comments')), 'FORBIDDEN');
      await access(f, 4, request('DELETE', '/api/tasks/{id}'));
      await rejects(access(f, 9, request('DELETE', '/api/tasks/{id}')), 'FORBIDDEN');
      for (const user of [1, 3, 8]) await access(f, user, request('PATCH', '/api/projects/{id}'));
      await rejects(access(f, 4, request('PATCH', '/api/projects/{id}')), 'FORBIDDEN');
    },
  );
  check(
    'DB scopes hide private rows/counts/search/export; owner-team and literal search filters are bound',
    async (f) => {
      await f.db.transaction(async (tx) => {
        assert.equal((await tx.query(projectList(2))).length, 0);
        assert.equal((await tx.query(taskScope(7))).length, 0);
        assert.deepEqual(
          (await tx.query(taskScope(4))).map((r) => r.id),
          [1, 2],
        );
        assert.equal((await tx.query(taskScope(4, { search: 'PRIVATE_ONLY' }))).length, 0);
        assert.deepEqual(await tx.query(taskScope(4, { projection: 'summary' })), [
          { status: 'todo', total: 2 },
        ]);
        assert.deepEqual(
          (await tx.query(taskScope(4, { projection: 'export' }))).map((r) => r.id),
          [1, 2],
        );
        assert.equal((await tx.query(taskScope(4, { team: 2 }))).length, 0);
        assert.equal((await tx.query(taskScope(4, { project: 2 }))).length, 0);
        assert.equal((await tx.query(taskScope(4, { search: "' OR 1=1 --" }))).length, 0);
        await tx.execute(
          sql('UPDATE dbo.tasks SET title=@title WHERE id=1', { title: '100%_[quoted' }),
        );
        assert.deepEqual(
          (await tx.query(taskScope(4, { search: '%_[' }))).map((r) => r.id),
          [1],
        );
      });
    },
  );
  check(
    'current membership revocation and role downgrade affect every descendant; independent lead/editor grants preserved',
    async (f) => {
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.project_members SET access='viewer' WHERE project_id=1 AND user_id=4"),
        ),
      );
      await access(f, 4, request('GET', '/api/tasks/{id}'));
      await rejects(access(f, 4, request('POST', '/api/tasks/{id}/comments')), 'FORBIDDEN');
      await access(f, 8, request('POST', '/api/tasks/{id}/comments'));
      await f.db.transaction(async (tx) => {
        await tx.execute(
          sql("UPDATE dbo.project_members SET access='editor' WHERE project_id=1 AND user_id=8"),
        );
        await tx.execute(sql('DELETE FROM dbo.team_members WHERE user_id=8'));
      });
      await access(f, 8, request('POST', '/api/tasks/{id}/comments'));
      await f.db.transaction((tx) =>
        tx.execute(sql('DELETE FROM dbo.project_members WHERE project_id=1 AND user_id=4')),
      );
      for (const path of [
        '/api/tasks/{id}',
        '/api/tasks/{id}/comments',
        '/api/tasks/{id}/events',
        '/api/tasks/{id}/attachments',
        '/api/projects/{id}/board',
        '/api/attachments/{id}/download',
      ])
        await rejects(access(f, 4, request('GET', path)), 'NOT_FOUND');
      await rejects(access(f, 4, request('PATCH', '/api/subtasks/{id}')), 'NOT_FOUND');
      await f.db.transaction(async (tx) => {
        assert.equal((await tx.query(taskScope(4))).length, 0);
        assert.equal((await tx.query(notificationScope(4))).length, 0);
        assert.equal((await tx.query(attachmentScope(4, 1))).length, 0);
      });
    },
  );
  check(
    'session hash/user/version/revocation/active/absolute and idle cutoffs revalidated without extending activity',
    async (f) => {
      const load = (clock = now) =>
        f.db.transaction((tx) =>
          currentActor(tx, proof(4), false, { clock: () => new Date(clock) }),
        );
      await load('2026-10-06T00:59:59.999Z');
      await rejects(load('2026-10-06T01:00:00.000Z'), 'UNAUTHENTICATED');
      await rejects(
        f.db.transaction((tx) =>
          currentActor(tx, { ...proof(4), userId: 5 }, false, { clock: () => new Date(now) }),
        ),
        'UNAUTHENTICATED',
      );
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.sessions SET absolute_expires_at=@now WHERE user_id=4', { now }),
        ),
      );
      await rejects(load(), 'UNAUTHENTICATED');
      await f.db.transaction(async (tx) => {
        await tx.execute(
          sql(
            "UPDATE dbo.sessions SET absolute_expires_at='2026-10-06T12:00:00.000Z' WHERE user_id=4",
          ),
        );
        await tx.execute(sql('UPDATE dbo.users SET auth_version=2 WHERE id=4'));
      });
      await rejects(load(), 'UNAUTHENTICATED');
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('UPDATE dbo.users SET auth_version=1,active=0 WHERE id=4'));
      });
      await rejects(load(), 'UNAUTHENTICATED');
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('UPDATE dbo.users SET active=1 WHERE id=4'));
        await tx.execute(sql('DELETE FROM dbo.sessions WHERE user_id=4'));
      });
      await rejects(load(), 'UNAUTHENTICATED');
    },
  );
  check(
    'forced password allows exactly me/password/logout/activity; current DB CSRF checked; GET never touches session',
    async (f) => {
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.users SET must_change_password=1 WHERE id=4')),
      );
      for (const [method, path] of [
        ['GET', '/api/me'],
        ['POST', '/api/password'],
        ['POST', '/api/logout'],
        ['POST', '/api/session/activity'],
      ])
        await access(f, 4, request(method!, path!));
      await rejects(access(f, 4, request('GET', '/api/tasks')), 'PASSWORD_CHANGE_REQUIRED');
      await f.db.transaction(async (tx) => {
        const rows = await tx.query<{ last_seen_at: string }>(
          sql('SELECT last_seen_at FROM dbo.sessions WHERE user_id=4'),
        );
        assert.equal(rows[0]!.last_seen_at, '2026-10-06T00:00:00.000Z');
      });
      await rejects(
        f.db.transaction((tx) =>
          currentActor(tx, proof(4), true, { clock: () => new Date(now), csrf: 'wrong' }),
        ),
        'INVALID_CSRF',
      );
      await f.db.transaction((tx) =>
        currentActor(tx, proof(4), true, { clock: () => new Date(now), csrf }),
      );
    },
  );
  check(
    'archived/deleted lifecycle and RD01 exceptions; version hook precedes state errors; expired restore denied',
    async (f) => {
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', { now })),
      );
      for (const user of [1, 3, 4, 5]) await access(f, user, request('GET', '/api/tasks/{id}'));
      for (const user of [1, 3, 4])
        await rejects(
          access(f, user, request('POST', '/api/tasks/{id}/comments')),
          'PROJECT_ARCHIVED',
        );
      for (const user of [1, 3]) await access(f, user, request('DELETE', '/api/tasks/{id}'));
      await rejects(access(f, 4, request('DELETE', '/api/tasks/{id}')), 'PROJECT_ARCHIVED');
      const r = { ...request('PATCH', '/api/tasks/{id}'), body: { version: 1, title: 'fixture' } };
      await rejects(
        f.db.transaction((tx) =>
          authorizeOperation(tx, proof(4), r, { clock: () => new Date(now) }),
        ),
        'SERVICE_NOT_READY',
      );
      await rejects(
        f.db.transaction((tx) =>
          authorizeOperation(tx, proof(4), r, {
            clock: () => new Date(now),
            checkVersions: async () => {
              throw new ApiFault('VERSION_CONFLICT', 2);
            },
          }),
        ),
        'VERSION_CONFLICT',
      );
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.tasks SET deleted_at=@now,deleted_by=1 WHERE id=1', { now })),
      );
      await rejects(access(f, 1, request('GET', '/api/tasks/{id}')), 'NOT_FOUND');
      await access(f, 1, request('POST', '/api/tasks/{id}/restore'));
      await access(f, 3, request('POST', '/api/tasks/{id}/restore'));
      await rejects(access(f, 4, request('POST', '/api/tasks/{id}/restore')), 'NOT_FOUND');
      // Session is kept current for this retention fixture; exact 30-day cutoff denies restore.
      await f.db.transaction((tx) =>
        tx.execute(
          sql(
            "UPDATE dbo.sessions SET created_at='2026-11-05T00:00:00.000Z',last_seen_at='2026-11-05T00:00:00.000Z',absolute_expires_at='2026-11-05T12:00:00.000Z' WHERE user_id=1",
          ),
        ),
      );
      await rejects(
        f.db.transaction((tx) =>
          authorizeOperation(tx, proof(1), request('POST', '/api/tasks/{id}/restore'), {
            clock: () => new Date('2026-11-05T00:30:00.000Z'),
          }),
        ),
        'RETENTION_EXPIRED',
      );
    },
  );
  check(
    'attachment ownership/read visibility/deleted listing/restore cutoff; Viewer never writes',
    async (f) => {
      await access(f, 5, request('GET', '/api/attachments/{id}/download'));
      await access(f, 4, request('DELETE', '/api/attachments/{id}'));
      await rejects(access(f, 9, request('DELETE', '/api/attachments/{id}')), 'FORBIDDEN');
      await rejects(access(f, 5, request('DELETE', '/api/attachments/{id}')), 'FORBIDDEN');
      await rejects(
        access(f, 4, { ...request('GET', '/api/attachments/{id}/download'), params: { id: 3 } }),
        'NOT_FOUND',
      );
      await rejects(
        access(f, 4, { ...request('GET', '/api/attachments/{id}/download'), params: { id: 4 } }),
        'NOT_FOUND',
      );
      await rejects(
        access(f, 5, {
          ...request('GET', '/api/tasks/{id}/attachments'),
          query: { includeDeleted: true },
        }),
        'FORBIDDEN',
      );
      await f.db.transaction(async (tx) => {
        assert.deepEqual(
          (await tx.query(attachmentScope(4, 1, true, now))).map((r) => r.id),
          [1, 2, 4],
        );
        assert.deepEqual(
          (await tx.query(attachmentScope(9, 1, true, now))).map((r) => r.id),
          [1, 2],
        );
        assert.deepEqual(
          (await tx.query(attachmentScope(5, 1))).map((r) => r.id),
          [1, 2],
        );
        await tx.execute(
          sql("UPDATE dbo.attachments SET deleted_at='2026-09-06T00:30:00.000Z' WHERE id=4"),
        );
        assert.deepEqual(
          (await tx.query(attachmentScope(4, 1, true, now))).map((r) => r.id),
          [1, 2],
        );
      });
      await rejects(
        access(f, 4, { ...request('POST', '/api/attachments/{id}/restore'), params: { id: 4 } }),
        'RETENTION_EXPIRED',
      );
    },
  );
  check(
    'notification read-one/read-all SQL enforces recipient and current parent access',
    async (f) => {
      await f.db.transaction(async (tx) => {
        assert.deepEqual(
          (await tx.query(notificationScope(4))).map((r) => r.id),
          [1],
        );
        await tx.execute(readNotifications(4, now, 3));
        await tx.execute(readNotifications(4, now));
        const rows = await tx.query<{ id: number; read_at: string | null }>(
          sql('SELECT id,read_at FROM dbo.notifications ORDER BY id'),
        );
        assert.deepEqual(rows, [
          { id: 1, read_at: now },
          { id: 2, read_at: null },
          { id: 3, read_at: null },
        ]);
      });
      await rejects(
        access(f, 4, { ...request('POST', '/api/notifications/{id}/read'), params: { id: 3 } }),
        'NOT_FOUND',
      );
    },
  );
  check(
    'team/directory privacy and create/unarchive parent invariant; all protected contract operations covered',
    async (f) => {
      await f.db.transaction(async (tx) => {
        assert.deepEqual(
          (await tx.query(teamList(4))).map((r) => r.id),
          [2],
        );
        assert.equal((await tx.query(directoryList(4))).length, 0);
        const directory = await tx.query(directoryList(3));
        assert.equal(directory.length, 9);
        assert.deepEqual(Object.keys(directory[0]!).sort(), ['display_name', 'id']);
      });
      await rejects(access(f, 4, request('GET', '/api/directory')), 'FORBIDDEN');
      await access(f, 3, request('POST', '/api/projects'));
      await rejects(access(f, 6, request('POST', '/api/projects')), 'FORBIDDEN');
      for (const operation of operations.filter((o) => o.operation.security.length)) {
        try {
          await access(f, 1, {
            ...request(operation.method, operation.path),
            params: { id: 1, userId: 4 },
          });
        } catch (e) {
          assert(e instanceof ApiFault);
          assert.notEqual(e.code, 'SERVICE_NOT_READY', `${operation.method} ${operation.path}`);
        }
      }
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.teams SET archived_at=@now WHERE id=1', { now })),
      );
      await access(f, 3, request('GET', '/api/directory'));
      await f.db.transaction(async (tx) =>
        assert.equal((await tx.query(directoryList(3))).length, 9),
      );
      await rejects(access(f, 3, request('POST', '/api/projects')), 'TEAM_ARCHIVED');
      await rejects(
        access(f, 3, { ...request('PATCH', '/api/projects/{id}'), body: { archived: false } }),
        'TEAM_ARCHIVED',
      );
    },
  );
  check(
    'idempotent replay rechecks real session/rights and cached child existence; archived readable replay allowed',
    async (f) => {
      const c = {
        ...command(),
        userId: 4,
        clock: () => new Date(now),
        mutate: (tx: Parameters<typeof comment>[0], input: unknown) => comment(tx, input, 4),
      };
      const r = request('POST', '/api/tasks/{id}/comments');
      const authorize = (tx: Parameters<typeof comment>[0], state: { cached?: Reply }) =>
        authorizeOperation(
          tx,
          proof(4),
          { ...r, ...(state.cached ? { cached: state.cached } : {}) },
          { clock: () => new Date(now) },
        ).then(() => {});
      const first = await executeIdempotent(f.db, { ...c, authorize });
      await rejects(
        f.db.transaction((tx) =>
          authorizeOperation(
            tx,
            proof(4),
            {
              ...request('PATCH', '/api/tasks/{id}'),
              cached: { status: 200, body: { item: { id: 1 }, successor: { id: 3 } } },
            },
            { clock: () => new Date(now) },
          ),
        ),
        'NOT_FOUND',
      );
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', { now })),
      );
      assert.deepEqual(await executeIdempotent(f.db, { ...c, authorize }), first);
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.project_members SET access='viewer' WHERE user_id=4 AND project_id=1"),
        ),
      );
      await rejects(executeIdempotent(f.db, { ...c, authorize }), 'FORBIDDEN');
      await f.db.transaction(async (tx) => {
        await tx.execute(
          sql("UPDATE dbo.project_members SET access='editor' WHERE user_id=4 AND project_id=1"),
        );
        await tx.execute(sql('DELETE FROM dbo.comments WHERE task_id=1'));
      });
      await rejects(executeIdempotent(f.db, { ...c, authorize }), 'NOT_FOUND');
      await f.db.transaction((tx) => tx.execute(sql('DELETE FROM dbo.sessions WHERE user_id=4')));
      await rejects(executeIdempotent(f.db, { ...c, authorize }), 'UNAUTHENTICATED');
    },
  );
}
