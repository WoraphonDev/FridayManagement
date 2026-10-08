import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { insert, type Fixture } from '../schema/fixtures.js';
import { taskService } from '../../src/services/tasks.js';
import { sql } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { ApiFault } from '../../src/api/errors.js';
import { OperationError } from '../../src/domain/failure.js';
import type { SessionProof } from '../../src/services/authorization.js';
import type { Transaction } from '../../src/domain/database.js';
import type { Status } from '../../src/repository/board-helpers.js';
import { operations, parseSchema } from '../../src/api/contract.js';
export function boardAcceptance(
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
  const reject = (p: Promise<unknown>, code: string) =>
    assert.rejects(
      p,
      (e) => (e instanceof ApiFault || e instanceof OperationError) && e.code === code,
    );
  const board = (f: F, s: S, a: SessionProof) => f.db.transaction((tx) => s.board(tx, a, 1));
  const move = async (
    f: F,
    s: S,
    a: SessionProof,
    id: number,
    to: Status,
    before: number | null = null,
    override: Record<string, unknown> = {},
  ) => {
    const b = await board(f, s, a),
      t = b.tasks.find((t) => t.id === id)!;
    return f.db.transaction((tx) =>
      s.move(
        tx,
        a,
        1,
        {
          task_id: id,
          task_version: t.version,
          from_status: t.status,
          to_status: to,
          source_column_version: b.columns.find((c) => c.status === t.status)!.version,
          target_column_version: b.columns.find((c) => c.status === to)!.version,
          before_task_id: before,
          ...override,
        },
        randomUUID(),
      ),
    );
  };
  const grant = (f: F, access = 'editor') =>
    f.db.transaction((tx) =>
      tx.execute(insert('project_members', { project_id: 1, user_id: 2, access, added_by: 1 })),
    );
  const rows = (f: F, q: string) => f.db.transaction((tx) => tx.query(sql(q)));
  const create = (f: F, s: S, a: SessionProof, b: Record<string, unknown> = {}) =>
    f.db.transaction((tx) =>
      s.create(tx, a, { project_id: 1, title: 'Board', ...b }, randomUUID()),
    );
  check(
    'T035 same-column before/append stable contiguous ranks and one version bump persists restart',
    async (f, s, a) => {
      const v = await board(f, s, a),
        r = await move(f, s, a, 2, 'todo', 1);
      assert.deepEqual(r.affected_columns, [
        { status: 'todo', version: v.columns[0]!.version + 1, task_ids: [2, 1], complete: true },
      ]);
      assert.equal(r.task.version, 2);
      assert.equal(r.task.completed_at, null);
      await move(f, s, a, 2, 'todo');
      f.db = await f.reopen();
      const b = await board(f, s, a);
      assert.deepEqual(b.columns[0]!.task_ids, [1, 2]);
      assert.equal(b.columns[0]!.version, v.columns[0]!.version + 2);
      assert.deepEqual(
        (await rows(f, 'SELECT rank FROM dbo.board_positions ORDER BY rank')).map((r) => r.rank),
        [1, 2],
      );
    },
  );
  check(
    'T035 cross-column insertion/reopen/completion uses shared rules; done reorder never regenerates',
    async (f, s, a) => {
      await move(f, s, a, 2, 'doing');
      const r = await move(f, s, a, 1, 'doing', 2);
      assert.deepEqual(r.affected_columns.find((c) => c.status === 'doing')!.task_ids, [1, 2]);
      const done = await move(f, s, a, 1, 'done');
      assert.ok(done.task.completed_at);
      await move(f, s, a, 1, 'done');
      assert.equal(
        (await rows(f, 'SELECT completed_at FROM dbo.tasks WHERE id=1'))[0]!.completed_at,
        done.task.completed_at,
      );
      const reopen = await move(f, s, a, 1, 'review');
      assert.equal(reopen.task.completed_at, null);
    },
  );
  check(
    'T035 checklist gate/recurrence three columns and reset copy are atomic locked DTOs',
    async (f, s, a) => {
      const made = await create(f, s, a, {
        recurrence: 'monthly',
        due_date: '2027-01-31',
        assignee_id: 1,
      });
      const child = await f.db.transaction((tx) =>
        s.createSubtask(tx, a, made.item.id, { task_version: 1, title: 'Review' }, randomUUID()),
      );
      await reject(move(f, s, a, made.item.id, 'done'), 'SUBTASKS_INCOMPLETE');
      await f.db.transaction((tx) =>
        s.patchSubtask(
          tx,
          a,
          child.item.id,
          { version: 1, task_version: 2, done: true },
          false,
          randomUUID(),
        ),
      );
      await move(f, s, a, made.item.id, 'doing');
      const r = await move(f, s, a, made.item.id, 'done');
      assert.equal(r.affected_columns.length, 3);
      assert.equal(r.successor!.due_date, '2027-02-28');
      assert.equal(r.successor!.subtask_done_count, 0);
      const op = operations.find((o) => o.path.endsWith('/board/move'))!.operation;
      parseSchema(op.responses['200']!.content!['application/json']!.schema!, r);
      await move(f, s, a, made.item.id, 'todo');
      await move(f, s, a, made.item.id, 'done');
      assert.equal((await rows(f, 'SELECT COUNT(*) AS n FROM dbo.recurrence_events'))[0]!.n, 1);
    },
  );
  check(
    'T035 wrong/self/missing/other-column anchors, mismatched source and stale versions leave snapshot intact',
    async (f, s, a) => {
      const before = await board(f, s, a);
      for (const overrides of [
        { before_task_id: 1 },
        { before_task_id: 999 },
        { task_version: 999 },
        { source_column_version: 999 },
        { target_column_version: 999 },
        { from_status: 'doing' },
      ]) {
        await assert.rejects(move(f, s, a, 1, 'todo', null, overrides));
        assert.deepEqual(await board(f, s, a), before);
      }
      await f.db.transaction((tx) =>
        tx.execute(insert('tasks', { project_id: 2, title: 'Other', creator_id: 1 })),
      );
      await reject(move(f, s, a, 1, 'todo', 3), 'INVALID_ANCHOR');
      await move(f, s, a, 2, 'doing');
      await reject(move(f, s, a, 1, 'todo', 2), 'INVALID_ANCHOR');
    },
  );
  check(
    'T035 Viewer/hidden/archived/deleted/maintenance enforce current rights',
    async (f, s, a, m) => {
      await reject(
        f.db.transaction((tx) => s.move(tx, m, 1, {}, randomUUID())),
        'VALIDATION_FAILED',
      );
      await grant(f, 'viewer');
      await reject(move(f, s, m, 1, 'doing'), 'FORBIDDEN');
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.project_members SET access='editor' WHERE user_id=2")),
      );
      await move(f, s, m, 1, 'doing');
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.projects SET archived_at='2026-10-06T00:00:00.000Z' WHERE id=1"),
        ),
      );
      await reject(move(f, s, a, 1, 'todo'), 'PROJECT_ARCHIVED');
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.projects SET archived_at=NULL WHERE id=1')),
      );
      await f.db.transaction((tx) =>
        s.trashMutation(tx, a, 1, { version: 2 }, false, randomUUID()),
      );
      await reject(
        f.db.transaction((tx) =>
          s.move(
            tx,
            a,
            1,
            {
              task_id: 1,
              task_version: 3,
              from_status: 'doing',
              to_status: 'todo',
              source_column_version: 1,
              target_column_version: 1,
              before_task_id: null,
            },
            randomUUID(),
          ),
        ),
        'NOT_FOUND',
      );
    },
  );
  check(
    'T035 move effect failure rolls task/status/board/recurrence back together',
    async (f, s, a) => {
      const before = await board(f, s, a);
      await assert.rejects(
        f.db.transaction(async (tx) => {
          const failed: Transaction = {
            ...tx,
            query: tx.query.bind(tx),
            execute: async (q: Parameters<typeof tx.execute>[0]) => {
              if (q.sqlserver.includes('INSERT INTO dbo.task_events'))
                throw new Error('audit fixture');
              return tx.execute(q);
            },
          };
          await s.move(
            failed,
            a,
            1,
            {
              task_id: 1,
              task_version: 1,
              from_status: 'todo',
              to_status: 'done',
              source_column_version: before.columns[0]!.version,
              target_column_version: before.columns[3]!.version,
              before_task_id: null,
            },
            randomUUID(),
          );
        }),
        /audit fixture/,
      );
      assert.deepEqual(await board(f, s, a), before);
    },
  );
  check(
    'T039 comments plaintext/validation/page scope/author/version immutable',
    async (f, s, a, m) => {
      await grant(f);
      const r = await f.db.transaction((tx) =>
        s.createComment(tx, m, 1, { body: '<script>literal</script> 👋' }, randomUUID()),
      );
      assert.equal(r.item.author.id, 2);
      for (const body of ['', '   ', 'a'.repeat(5001)])
        await reject(
          f.db.transaction((tx) => s.createComment(tx, a, 1, { body }, randomUUID())),
          'VALIDATION_FAILED',
        );
      for (let i = 0; i < 4; i++)
        await f.db.transaction((tx) =>
          s.createComment(tx, a, 1, { body: 'Text ' + i }, randomUUID()),
        );
      const p = await f.db.transaction((tx) => s.comments(tx, m, 1, { page: 2, pageSize: 2 }));
      assert.equal(p.total, 5);
      assert.deepEqual(
        p.items.map((i) => i.body),
        ['Text 1', 'Text 2'],
      );
      assert.equal((await rows(f, 'SELECT version FROM dbo.tasks WHERE id=1'))[0]!.version, 1);
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.project_members SET access='viewer' WHERE user_id=2")),
      );
      await reject(
        f.db.transaction((tx) => s.createComment(tx, m, 1, { body: 'deny' }, randomUUID())),
        'FORBIDDEN',
      );
      await f.db.transaction((tx) =>
        tx.execute(sql('DELETE FROM dbo.project_members WHERE user_id=2')),
      );
      await reject(
        f.db.transaction((tx) => s.comments(tx, m, 1, {})),
        'NOT_FOUND',
      );
    },
  );
  check(
    'T039 recipient dedup/no-self/current access and atomic comment/event/notification rollback',
    async (f, s, a, m) => {
      await grant(f);
      await f.db.transaction((tx) =>
        s.patch(tx, a, 1, { version: 1, assignee_id: 1 }, randomUUID()),
      );
      await f.db.transaction((tx) => s.createComment(tx, m, 1, { body: 'notify' }, randomUUID()));
      assert.equal(
        (await rows(f, "SELECT COUNT(*) AS n FROM dbo.notifications WHERE type='comment'"))[0]!.n,
        1,
      );
      const count = (await rows(f, 'SELECT COUNT(*) AS n FROM dbo.comments'))[0]!.n;
      await assert.rejects(
        f.db.transaction(async (tx) => {
          const failed: Transaction = {
            ...tx,
            query: async (q) => {
              if (q.sqlserver.includes('INSERT INTO dbo.notifications'))
                throw new Error('notification fixture');
              return tx.query(q);
            },
            execute: async (q: Parameters<typeof tx.execute>[0]) => {
              if (q.sqlserver.includes('INSERT INTO dbo.notifications'))
                throw new Error('notification fixture');
              return tx.execute(q);
            },
          };
          await s.createComment(failed, m, 1, { body: 'rollback' }, randomUUID());
        }),
        /notification fixture/,
      );
      assert.equal((await rows(f, 'SELECT COUNT(*) AS n FROM dbo.comments'))[0]!.n, count);
    },
  );
  check(
    'T035 maintenance blocks move/comments; archived comments readable but no new write',
    async (f, s, a) => {
      await f.db.transaction((tx) =>
        tx.execute(
          insert('maintenance_state', {
            id: 1,
            owner_id: randomUUID(),
            state: 'frozen',
            lease_expires_at: '2026-10-06T02:00:00.000Z',
            created_at: '2026-10-06T00:00:00.000Z',
            updated_at: '2026-10-06T00:00:00.000Z',
          }),
        ),
      );
      await reject(move(f, s, a, 1, 'doing'), 'MAINTENANCE');
      await reject(
        f.db.transaction((tx) => s.createComment(tx, a, 1, { body: 'blocked' }, randomUUID())),
        'MAINTENANCE',
      );
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('DELETE FROM dbo.maintenance_state'));
        await tx.execute(
          sql("UPDATE dbo.projects SET archived_at='2026-10-06T00:00:00.000Z' WHERE id=1"),
        );
      });
      await f.db.transaction((tx) => s.comments(tx, a, 1, {}));
      await reject(
        f.db.transaction((tx) => s.createComment(tx, a, 1, { body: 'blocked' }, randomUUID())),
        'PROJECT_ARCHIVED',
      );
    },
  );
  check(
    'T035 large-column response stays bounded/incomplete and paginated fallback remains available',
    async (f, s, a) => {
      await f.db.transaction(async (tx) => {
        for (let id = 3; id <= 501; id++) {
          await tx.execute(
            insert('tasks', { id, project_id: 1, title: 'Boundary ' + id, creator_id: 1 }),
          );
          await tx.execute(
            insert('board_positions', { task_id: id, project_id: 1, status: 'todo', rank: id }),
          );
        }
      });
      let b = await board(f, s, a);
      assert.equal(b.mode, 'list_required');
      const first = await f.db.transaction((tx) =>
        s.move(
          tx,
          a,
          1,
          {
            task_id: 1,
            task_version: 1,
            from_status: 'todo',
            to_status: 'doing',
            source_column_version: b.columns[0]!.version,
            target_column_version: b.columns[1]!.version,
            before_task_id: null,
          },
          randomUUID(),
        ),
      );
      b = await board(f, s, a);
      const back = await f.db.transaction((tx) =>
        s.move(
          tx,
          a,
          1,
          {
            task_id: 1,
            task_version: first.task.version,
            from_status: 'doing',
            to_status: 'todo',
            source_column_version: b.columns[1]!.version,
            target_column_version: b.columns[0]!.version,
            before_task_id: null,
          },
          randomUUID(),
        ),
      );
      assert.deepEqual(back.affected_columns.find((c) => c.status === 'todo')!.task_ids, []);
      assert.equal(back.affected_columns.find((c) => c.status === 'todo')!.complete, false);
      const page = await f.db.transaction((tx) =>
        s.list(tx, a, { project: 1, page: 2, pageSize: 20 }),
      );
      assert.equal(page.items.length, 20);
      assert.equal(page.total, 501);
    },
  );
}
