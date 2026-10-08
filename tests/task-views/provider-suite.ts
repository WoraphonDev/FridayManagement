import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { insert, type Fixture } from '../schema/fixtures.js';
import { taskService } from '../../src/services/tasks.js';
import { sql, notificationScope, attachmentScope } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { operations, parseSchema } from '../../src/api/contract.js';
import { ApiFault } from '../../src/api/errors.js';
import { OperationError } from '../../src/domain/failure.js';
import type { SessionProof } from '../../src/services/authorization.js';
import type { Transaction } from '../../src/domain/database.js';
const reject = (p: Promise<unknown>, code: string) =>
  assert.rejects(
    p,
    (e: unknown) => (e instanceof ApiFault || e instanceof OperationError) && e.code === code,
  );
export function taskViewAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  type F = Awaited<ReturnType<typeof sessionFixture>>;
  type S = ReturnType<typeof taskService>;
  const check = (
    name: string,
    work: (f: F, s: S, a: SessionProof, m: SessionProof) => Promise<void>,
  ) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await sessionFixture(factory);
      try {
        const a = await f.service.login({ username: 'Admin', password }, '127.0.0.1'),
          m = await f.service.login({ username: 'Member', password }, '127.0.0.2');
        await work(
          f,
          taskService({ clock: f.clock }),
          { userId: 1, tokenHash: tokenDigest(a.token) },
          { userId: 2, tokenHash: tokenDigest(m.token) },
        );
      } finally {
        await f.close();
      }
    });
  const create = (f: F, s: S, a: SessionProof, b: Record<string, unknown> = {}) =>
    f.db.transaction((tx) => s.create(tx, a, { project_id: 1, title: 'Task', ...b }, randomUUID()));
  const mutate = (f: F, s: S, a: SessionProof, id: number, version: number, restore = false) =>
    f.db.transaction((tx) => s.trashMutation(tx, a, id, { version }, restore, randomUUID()));
  const list = (f: F, s: S, a: SessionProof, q: Record<string, unknown> = {}, trash = false) =>
    f.db.transaction((tx) => s.list(tx, a, q, trash));
  const board = (f: F, s: S, a: SessionProof) => f.db.transaction((tx) => s.board(tx, a, 1));
  const patch = (
    f: F,
    s: S,
    a: SessionProof,
    id: number,
    version: number,
    b: Record<string, unknown>,
  ) => f.db.transaction((tx) => s.patch(tx, a, id, { version, ...b }, randomUUID()));
  const grant = (f: F, access = 'editor', lead = false) =>
    f.db.transaction((tx) =>
      tx.execute(
        lead
          ? insert('team_members', { team_id: 1, user_id: 2, team_role: 'lead' })
          : insert('project_members', { project_id: 1, user_id: 2, access, added_by: 1 }),
      ),
    );
  const rows = (f: F, q: string) => f.db.transaction((tx) => tx.query(sql(q)));
  check(
    'T030 delete excludes active queries/board/notifications/attachment scope; restore appends/version, children intact',
    async (f, s, a) => {
      const r = await create(f, s, a, {
          assignee_id: 1,
          description: 'Keep',
          due_date: '2026-10-07',
        }),
        id = r.item.id;
      await f.db.transaction(async (tx) => {
        await tx.execute(insert('subtasks', { task_id: id, title: 'Keep child' }));
        await tx.execute(insert('comments', { task_id: id, author_id: 1, body: 'Keep comment' }));
        await tx.execute(
          insert('notifications', {
            recipient_id: 1,
            task_id: id,
            type: 'status',
            message: 'Keep',
            dedupe_key: randomUUID(),
          }),
        );
        await tx.execute(
          insert('attachments', {
            task_id: id,
            uploader_id: 1,
            original_name: 'keep.txt',
            storage_key: randomUUID(),
            bytes: 1,
            validated_type: 'text/plain',
            sha256: 'a'.repeat(64),
          }),
        );
      });
      const deleted = await mutate(f, s, a, id, 1);
      assert.equal(deleted.item.version, 2);
      assert.equal(deleted.item.deleted_by, 1);
      assert.equal(deleted.item.overdue, false);
      assert.deepEqual(deleted.affected_columns, [{ status: 'todo', version: 3 }]);
      assert(!(await list(f, s, a)).items.some((t) => t.id === id));
      assert(!(await board(f, s, a)).tasks.some((t) => t.id === id));
      await reject(
        f.db.transaction((tx) => s.get(tx, a, id)),
        'NOT_FOUND',
      );
      await reject(patch(f, s, a, id, 2, { title: 'No' }), 'NOT_FOUND');
      assert.equal((await f.db.transaction((tx) => tx.query(notificationScope(1)))).length, 0);
      assert.equal((await f.db.transaction((tx) => tx.query(attachmentScope(1, id)))).length, 0);
      const trash = await list(f, s, a, {}, true);
      assert.equal(trash.items[0]!.id, id);
      assert.equal(
        (trash.items[0] as { restore_before: string }).restore_before,
        '2026-11-05T00:00:00.000Z',
      );
      const restored = await mutate(f, s, a, id, 2, true);
      assert.equal(restored.item.version, 3);
      assert.equal(restored.item.description, 'Keep');
      assert.equal(restored.item.subtasks.length, 1);
      assert.equal(restored.item.deleted_at, null);
      assert.deepEqual((await board(f, s, a)).columns[0]!.task_ids, [1, 2, id]);
      for (const table of ['comments', 'attachments', 'notifications'])
        assert.equal((await rows(f, `SELECT id FROM dbo.${table} WHERE task_id=${id}`)).length, 1);
      for (const [operationId, body, status] of [
        ['delete_api_tasks_id', deleted, '200'],
        ['get_api_trash', trash, '200'],
        ['get_api_projects_id_board', await board(f, s, a), '200'],
      ] as const) {
        const op = operations.find((o) => o.operation.operationId === operationId)!.operation;
        parseSchema(op.responses[status]!.content!['application/json']!.schema, body);
      }
    },
  );
  check(
    'T030 creator Editor vs noncreator/Viewer; Admin/Lead archived deletion and read-only restore RD01',
    async (f, s, a, m) => {
      await grant(f);
      await reject(mutate(f, s, m, 1, 1), 'FORBIDDEN');
      const r = await create(f, s, m);
      await mutate(f, s, m, r.item.id, 1);
      await reject(mutate(f, s, m, r.item.id, 2, true), 'NOT_FOUND');
      await reject(list(f, s, m, {}, true), 'FORBIDDEN');
      const owned = await create(f, s, m);
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', {
            now: f.clock().toISOString(),
          }),
        ),
      );
      await reject(mutate(f, s, m, owned.item.id, 1), 'PROJECT_ARCHIVED');
      await mutate(f, s, a, owned.item.id, 1);
      await mutate(f, s, a, owned.item.id, 2, true);
      await reject(patch(f, s, a, owned.item.id, 3, { title: 'No' }), 'PROJECT_ARCHIVED');
      await grant(f, 'editor', true);
      await mutate(f, s, m, owned.item.id, 3);
      await mutate(f, s, m, owned.item.id, 4, true);
      assert.equal((await list(f, s, a)).total, 0);
      assert((await list(f, s, m, { project: 1 })).items.some((t) => t.id === owned.item.id));
    },
  );
  check(
    'T030 exact UTC 30-day cutoff; stale version first, no partial expired restore',
    async (f, s, a) => {
      const r = await create(f, s, a);
      await mutate(f, s, a, r.item.id, 1);
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.tasks SET deleted_at=@date WHERE id=@id', {
            id: r.item.id,
            date: '2026-09-06T00:00:00.000Z',
          }),
        ),
      );
      await reject(mutate(f, s, a, r.item.id, 1, true), 'VERSION_CONFLICT');
      await reject(mutate(f, s, a, r.item.id, 2, true), 'RETENTION_EXPIRED');
      assert.equal(
        (await rows(f, `SELECT version FROM dbo.tasks WHERE id=${r.item.id}`))[0]!.version,
        2,
      );
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.tasks SET deleted_at=@date WHERE id=@id', {
            id: r.item.id,
            date: '2026-09-06T00:00:00.001Z',
          }),
        ),
      );
      assert.equal((await mutate(f, s, a, r.item.id, 2, true)).item.version, 3);
    },
  );
  check(
    'T030 restore current eligible assignee, done history retained, soft-delete series does not regenerate',
    async (f, s, a, m) => {
      await grant(f);
      const r = await create(f, s, m, {
        assignee_id: 2,
        due_date: '2027-01-31',
        recurrence: 'monthly',
      });
      const d = await patch(f, s, a, r.item.id, 1, { status: 'done' });
      await mutate(f, s, a, r.item.id, 2);
      await mutate(f, s, a, d.successor!.id, 1);
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.project_members SET access='viewer' WHERE user_id=2")),
      );
      assert.equal((await mutate(f, s, a, r.item.id, 3, true)).item.assignee_id, 2);
      assert.equal((await mutate(f, s, a, d.successor!.id, 2, true)).item.assignee_id, null);
      await patch(f, s, a, r.item.id, 4, { status: 'review' });
      assert.equal((await patch(f, s, a, r.item.id, 5, { status: 'done' })).successor, null);
      assert.equal((await rows(f, 'SELECT source_task_id FROM dbo.recurrence_events')).length, 1);
      assert(
        (await rows(f, 'SELECT action FROM dbo.task_events')).some(
          (r) => r.action === 'access_cleanup',
        ),
      );
    },
  );
  check(
    'T030 managed trash only owning scopes, revoked read hidden and children blocked',
    async (f, s, a, m) => {
      await grant(f, 'editor', true);
      const r = await create(f, s, a, { project_id: 2, title: 'PRIVATE' });
      await mutate(f, s, a, r.item.id, 1);
      await mutate(f, s, a, 1, 1);
      const trash = await list(f, s, m, {}, true);
      assert.equal(trash.total, 1);
      assert.equal(trash.items[0]!.id, 1);
      assert.equal((await list(f, s, m, { project: 2 }, true)).total, 0);
      await reject(
        f.db.transaction((tx) =>
          s.createSubtask(tx, a, 1, { task_version: 2, title: 'No' }, randomUUID()),
        ),
        'NOT_FOUND',
      );
      await f.db.transaction((tx) =>
        tx.execute(sql('DELETE FROM dbo.team_members WHERE user_id=2')),
      );
      await reject(mutate(f, s, m, 1, 2, true), 'NOT_FOUND');
    },
  );
  check(
    'T030 deletion/restore effect failure rolls back task/ordering/column/events atomically',
    async (f, s, a) => {
      const r = await create(f, s, a);
      const fault = (tx: Transaction): Transaction => ({
        query: (statement) => tx.query(statement),
        execute: (statement) => {
          if (statement.sqlserver.includes('INSERT INTO dbo.task_events')) throw new Error('FAULT');
          return tx.execute(statement);
        },
      });
      for (const restore of [false, true]) {
        if (restore) await mutate(f, s, a, r.item.id, 1);
        const before = await Promise.all(
          ['tasks', 'board_positions', 'board_columns', 'task_events'].map((t) =>
            rows(f, `SELECT * FROM dbo.${t}`),
          ),
        );
        await assert.rejects(
          f.db.transaction((tx) =>
            s.trashMutation(
              fault(tx),
              a,
              r.item.id,
              { version: restore ? 2 : 1 },
              restore,
              randomUUID(),
            ),
          ),
          /FAULT/,
        );
        assert.deepEqual(
          await Promise.all(
            ['tasks', 'board_positions', 'board_columns', 'task_events'].map((t) =>
              rows(f, `SELECT * FROM dbo.${t}`),
            ),
          ),
          before,
        );
      }
    },
  );
  check(
    'T031 scoped count before pagination, hidden search and explicit archived project only',
    async (f, s, a, m) => {
      await grant(f, 'viewer');
      for (let i = 0; i < 12; i++)
        await create(f, s, a, { title: `Visible ${i}`, category: 'page' });
      await create(f, s, a, { project_id: 2, title: 'PRIVATE SECRET', category: 'page' });
      const p = await list(f, s, m, { category: 'page', pageSize: 5, page: 2 });
      assert.equal(p.total, 12);
      assert.equal(p.items.length, 5);
      assert(p.items.every((t) => t.project_id === 1));
      assert.equal((await list(f, s, m, { q: 'PRIVATE' })).total, 0);
      assert.equal(
        (await list(f, s, m, { category: 'page', page: 99, pageSize: 5 })).items.length,
        0,
      );
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', {
            now: f.clock().toISOString(),
          }),
        ),
      );
      assert.equal((await list(f, s, m)).total, 0);
      assert.equal((await list(f, s, m, { project: 1 })).total, 14);
    },
  );
  check(
    'T031 AND fields/OR values, assignee null vs omitted, creator/has_due and exact category',
    async (f, s, a) => {
      const x = await create(f, s, a, {
        title: 'Find',
        category: 'filter',
        priority: 'urgent',
        assignee_id: 1,
        due_date: '2026-10-07',
      });
      await create(f, s, a, { title: 'Find', category: 'filter', priority: 'high' });
      await create(f, s, a, {
        title: 'Find',
        category: 'other',
        priority: 'urgent',
        due_date: '2026-10-07',
      });
      const p = await list(f, s, a, {
        q: 'find',
        category: 'filter',
        priority: ['urgent', 'high'],
        status: ['todo', 'review'],
      });
      assert.equal(p.total, 2);
      assert.equal((await list(f, s, a, { category: 'filter', assignee: null })).total, 1);
      assert.equal(
        (await list(f, s, a, { category: 'filter', assignee: 1, creator: 1, has_due: true }))
          .items[0]!.id,
        x.item.id,
      );
      assert.equal((await list(f, s, a, { category: 'filter', has_due: false })).total, 1);
    },
  );
  check(
    'T031 literal wildcard/Unicode case search in title/description/category and bound SQL injection',
    async (f, s, a) => {
      const x = await create(f, s, a, {
        title: 'École 100%_[x]',
        description: "O'Reilly",
        category: 'ค้นหา',
      });
      await create(f, s, a, { title: 'Other' });
      for (const q of ['éCOLE', '%_', '[x]', "O'Reilly", 'ค้นหา'])
        assert.equal((await list(f, s, a, { q })).items[0]!.id, x.item.id);
      assert.equal((await list(f, s, a, { q: "' OR 1=1 --" })).total, 0);
      for (const q of [
        { q: '😀'.repeat(51) },
        { status: ['todo', 'todo'] },
        { has_due: false, due_from: '2026-10-01' },
        { due_from: '2026-10-09', due_to: '2026-10-01' },
        { sort: 'id; DROP TABLE tasks' },
        { page: 0 },
        { pageSize: 101 },
        { q: 123 },
      ])
        await reject(list(f, s, a, q), 'INVALID_QUERY');
    },
  );
  check('T031 all seven sorts, due null-last both directions and ID ties', async (f, s, a) => {
    const a1 = await create(f, s, a, {
        title: 'A',
        category: 'sort',
        priority: 'urgent',
        due_date: '2026-10-08',
      }),
      a2 = await create(f, s, a, {
        title: 'B',
        category: 'sort',
        priority: 'low',
        due_date: '2026-10-07',
      }),
      a3 = await create(f, s, a, { title: 'B', category: 'sort', priority: 'high' });
    assert.deepEqual(
      (await list(f, s, a, { category: 'sort', sort: 'due_asc' })).items.map((t) => t.id),
      [a2.item.id, a1.item.id, a3.item.id],
    );
    assert.deepEqual(
      (await list(f, s, a, { category: 'sort', sort: 'due_desc' })).items.map((t) => t.id),
      [a1.item.id, a2.item.id, a3.item.id],
    );
    assert.deepEqual(
      (await list(f, s, a, { category: 'sort', sort: 'priority_desc' })).items.map((t) => t.id),
      [a1.item.id, a3.item.id, a2.item.id],
    );
    for (const sort of ['title_asc', 'created_asc', 'created_desc', 'updated_desc'])
      assert.deepEqual(
        (await list(f, s, a, { category: 'sort', sort })).items.map((t) => t.id),
        [a1.item.id, a2.item.id, a3.item.id],
      );
  });
  check(
    'T031 inclusive due and Bangkok timestamp [start,end), completed excludes reopened tasks',
    async (f, s, a) => {
      const x = await create(f, s, a, { category: 'dates', due_date: '2026-10-06' }),
        y = await create(f, s, a, { category: 'dates', due_date: '2026-10-07' });
      await f.db.transaction(async (tx) => {
        await tx.execute(
          sql('UPDATE dbo.tasks SET created_at=@date WHERE id=@id', {
            id: x.item.id,
            date: '2026-10-05T17:00:00.000Z',
          }),
        );
        await tx.execute(
          sql('UPDATE dbo.tasks SET created_at=@date WHERE id=@id', {
            id: y.item.id,
            date: '2026-10-06T17:00:00.000Z',
          }),
        );
      });
      assert.equal(
        (
          await list(f, s, a, {
            category: 'dates',
            date_basis: 'created',
            date_from: '2026-10-06',
            date_to: '2026-10-06',
          })
        ).items[0]!.id,
        x.item.id,
      );
      assert.equal(
        (await list(f, s, a, { category: 'dates', due_from: '2026-10-06', due_to: '2026-10-06' }))
          .total,
        1,
      );
      assert.equal(
        (
          await list(f, s, a, {
            category: 'dates',
            date_basis: 'due',
            date_from: '2026-10-06',
            date_to: '2026-10-07',
          })
        ).total,
        2,
      );
      await patch(f, s, a, x.item.id, 1, { status: 'done' });
      assert.equal(
        (
          await list(f, s, a, {
            date_basis: 'completed',
            date_from: '2026-10-06',
            date_to: '2026-10-06',
          })
        ).total,
        1,
      );
      await patch(f, s, a, x.item.id, 2, { status: 'todo' });
      assert.equal((await list(f, s, a, { date_basis: 'completed' })).total, 0);
      assert.equal(
        (
          await list(f, s, a, {
            date_basis: 'created',
            date_from: '0001-01-01',
            date_to: '9999-12-31',
          })
        ).total,
        4,
      );
      assert.equal(
        (await list(f, s, a, { date_basis: 'created', date_to: '9999-12-30' })).total,
        4,
      );
      assert.equal(
        (await list(f, s, a, { date_basis: 'created', date_from: '9999-12-31' })).total,
        0,
      );
    },
  );
  check(
    'T034 consistent four-column snapshot/versions persist after restart; corrupt rank fails closed',
    async (f, s, a, m) => {
      await reject(
        f.db.transaction((tx) => s.board(tx, m, 1)),
        'NOT_FOUND',
      );
      await grant(f, 'viewer');
      const r = await create(f, s, a);
      await patch(f, s, a, r.item.id, 1, { status: 'review' });
      const b = await board(f, s, m);
      assert.equal(b.mode, 'board');
      assert.equal(b.columns.length, 4);
      assert(b.columns.every((c) => c.complete));
      assert.equal(b.columns[2]!.task_ids[0], r.item.id);
      assert.equal(b.tasks.find((t) => t.id === r.item.id)!.version, 2);
      f.db = await f.reopen();
      assert.deepEqual(await board(f, s, m), b);
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.board_positions SET rank=8 WHERE task_id=@id', { id: r.item.id }),
        ),
      );
      await reject(board(f, s, a), 'DATABASE_BUSY');
    },
  );
  check(
    'T034 500 boundary vs501 list_required returns no partial array; pagination still complete',
    async (f, s, a) => {
      await f.db.transaction(async (tx) => {
        for (let i = 3; i <= 501; i++) {
          await tx.execute(insert('tasks', { project_id: 1, title: `Bulk ${i}`, creator_id: 1 }));
          await tx.execute(
            insert('board_positions', { task_id: i, project_id: 1, status: 'todo', rank: i }),
          );
        }
      });
      const big = await board(f, s, a);
      assert.equal(big.mode, 'list_required');
      assert.equal(big.total, 501);
      assert.equal(big.tasks.length, 0);
      assert(big.columns.every((c) => !c.complete && c.task_ids.length === 0));
      assert.equal((await list(f, s, a, { page: 6, pageSize: 100, project: 1 })).items.length, 1);
      await mutate(f, s, a, 501, 1);
      const small = await board(f, s, a);
      assert.equal(small.total, 500);
      assert.equal(small.tasks.length, 500);
      assert(small.columns.every((c) => c.complete));
    },
  );
}
