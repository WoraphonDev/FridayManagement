import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { insert, type Fixture } from '../schema/fixtures.js';
import { taskService } from '../../src/services/tasks.js';
import { organizationService } from '../../src/services/organization.js';
import { workspaceService } from '../../src/services/workspaces.js';
import { accountService } from '../../src/services/accounts.js';
import { sql } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import type { Transaction } from '../../src/domain/database.js';
import type { SessionProof } from '../../src/services/authorization.js';
import { ApiFault } from '../../src/api/errors.js';
import { OperationError } from '../../src/domain/failure.js';
import { operations, parseSchema } from '../../src/api/contract.js';
const rejected = (p: Promise<unknown>, code: string) =>
  assert.rejects(
    p,
    (e: unknown) => (e instanceof ApiFault || e instanceof OperationError) && e.code === code,
  );
export function taskAcceptance(
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
        const admin = await f.service.login({ username: 'Admin', password }, '127.0.0.1'),
          member = await f.service.login({ username: 'Member', password }, '127.0.0.2');
        await work(
          f,
          taskService({ clock: f.clock }),
          { userId: 1, tokenHash: tokenDigest(admin.token) },
          { userId: 2, tokenHash: tokenDigest(member.token) },
        );
      } finally {
        await f.close();
      }
    });
  const create = (f: F, s: S, a: SessionProof, b: Record<string, unknown> = {}) =>
    f.db.transaction((tx) =>
      s.create(tx, a, { project_id: 1, title: '  งานใหม่  ', ...b }, randomUUID()),
    );
  const patch = (
    f: F,
    s: S,
    a: SessionProof,
    id: number,
    version: number,
    b: Record<string, unknown>,
  ) => f.db.transaction((tx) => s.patch(tx, a, id, { version, ...b }, randomUUID()));
  const rows = (f: F, q: string) => f.db.transaction((tx) => tx.query(sql(q)));
  const addEditor = (f: F) =>
    f.db.transaction((tx) =>
      tx.execute(
        insert('project_members', { project_id: 1, user_id: 2, access: 'editor', added_by: 1 }),
      ),
    );
  const invariant = async (f: F) => {
    const positions = await rows(
      f,
      'SELECT b.task_id,b.status,b.rank,t.status AS actual FROM dbo.board_positions b JOIN dbo.tasks t ON t.id=b.task_id ORDER BY b.project_id,b.status,b.rank',
    );
    assert(positions.every((p) => p.status === p.actual && Number(p.rank) > 0));
    for (const status of ['todo', 'doing', 'review', 'done'])
      assert.deepEqual(
        positions.filter((p) => p.status === status).map((p) => p.rank),
        positions.filter((p) => p.status === status).map((_, i) => i + 1),
      );
    assert.equal(
      positions.length,
      (await rows(f, 'SELECT id FROM dbo.tasks WHERE deleted_at IS NULL')).length,
    );
  };
  check(
    'T025 organization admin-only, UTF16/trim/version, persisted reopen and atomic audit',
    async (f, _, a, m) => {
      const o = organizationService({ clock: f.clock });
      const item = await f.db.transaction((tx) =>
        o.patch(tx, a, { name: '  องค์กรใหม่  ', version: 1 }, randomUUID()),
      );
      assert.equal(item.item.name, 'องค์กรใหม่');
      assert.equal(item.item.timezone, 'Asia/Bangkok');
      assert.equal(item.item.version, 2);
      await rejected(
        f.db.transaction((tx) => o.patch(tx, m, { name: 'No', version: 2 }, randomUUID())),
        'FORBIDDEN',
      );
      await rejected(
        f.db.transaction((tx) => o.patch(tx, a, { name: 'Stale', version: 1 }, randomUUID())),
        'VERSION_CONFLICT',
      );
      for (const name of [' ', '😀'.repeat(51)])
        await rejected(
          f.db.transaction((tx) => o.patch(tx, a, { name, version: 2 }, randomUUID())),
          'VALIDATION_FAILED',
        );
      await rejected(
        f.db.transaction((tx) =>
          o.patch(tx, a, { name: 'No', timezone: 'UTC', version: 2 }, randomUUID()),
        ),
        'VALIDATION_FAILED',
      );
      f.db = await f.reopen();
      assert.deepEqual(await f.db.transaction((tx) => o.get(tx, m)), item);
      assert.equal((await rows(f, 'SELECT id FROM dbo.admin_events')).length, 1);
    },
  );
  check(
    'T026 create defaults/nullable fields/plain text DTO and atomic board/event',
    async (f, s, a) => {
      const r = await create(f, s, a, {
        description: '<script>alert(1)</script>',
        category: '  งานทั่วไป  ',
      });
      assert.equal(r.item.title, 'งานใหม่');
      assert.equal(r.item.category, 'งานทั่วไป');
      assert.equal(r.item.status, 'todo');
      assert.equal(r.item.priority, 'medium');
      assert.equal(r.item.assignee, null);
      assert.equal(r.item.version, 1);
      assert.equal(r.item.description, '<script>alert(1)</script>');
      assert.deepEqual(r.affected_columns, [{ status: 'todo', version: 2 }]);
      const op = operations.find((o) => o.operation.operationId === 'post_api_tasks')!.operation;
      assert.doesNotThrow(() =>
        parseSchema(op.responses['201']!.content!['application/json']!.schema, r),
      );
      assert.deepEqual(await f.db.transaction((tx) => s.get(tx, a, r.item.id)), { item: r.item });
      assert.equal((await rows(f, 'SELECT id FROM dbo.task_events')).length, 1);
      await invariant(f);
    },
  );
  check(
    'T026 every field rejects invalid lengths/enums/real dates/ranges/unknown/immutable fields',
    async (f, s, a) => {
      for (const b of [
        { title: ' ' },
        { title: '😀'.repeat(101) },
        { description: 'a'.repeat(10001) },
        { category: 'a'.repeat(81) },
        { priority: 'critical' },
        { status: 'done' },
        { recurrence: 'hourly' },
        { recurrence: 'daily' },
        { start_date: '2027-02-29' },
        { due_date: '2026-02-30' },
        { start_date: '2026-10-07', due_date: '2026-10-06' },
        { creator_id: 2 },
        { recurrence_anchor_day: 31 },
        { assignee_id: [1, 2] },
        { due_date: '2026-10-06T00:00:00Z' },
      ])
        await rejected(create(f, s, a, b), 'VALIDATION_FAILED');
      const r = await create(f, s, a, {
        start_date: '2026-10-05',
        due_date: '2026-10-06',
        recurrence: 'daily',
      });
      for (const b of [
        { project_id: 2 },
        { due_date: null },
        { start_date: '2026-10-07' },
        { status: 'finished' },
        { title: 3 },
        { version: '1', title: 'bad' },
      ])
        await rejected(patch(f, s, a, r.item.id, 1, b), 'VALIDATION_FAILED');
      assert.equal((await rows(f, 'SELECT id FROM dbo.tasks')).length, 3);
      assert.equal((await rows(f, 'SELECT id FROM dbo.task_events')).length, 1);
    },
  );
  check(
    'T026 merged patch preserves omitted fields/conflict no overwrite/updated timestamp',
    async (f, s, a) => {
      const r = await create(f, s, a, {
        description: 'รายละเอียด',
        priority: 'urgent',
        due_date: '2026-10-07',
        recurrence: 'daily',
      });
      f.setTime('2026-10-06T00:01:00.000Z');
      const p = await patch(f, s, a, r.item.id, 1, { title: 'แก้ชื่อ' });
      assert.equal(p.item.priority, 'urgent');
      assert.equal(p.item.recurrence, 'daily');
      assert.equal(p.item.description, 'รายละเอียด');
      assert.equal(p.item.version, 2);
      assert.equal(p.item.updated_at, '2026-10-06T00:01:00.000Z');
      assert.deepEqual(p.affected_columns, []);
      await rejected(patch(f, s, a, r.item.id, 1, { title: 'ทับข้อมูล' }), 'VERSION_CONFLICT');
      assert.equal((await f.db.transaction((tx) => s.get(tx, a, r.item.id))).item.title, 'แก้ชื่อ');
    },
  );
  check(
    'T026 current roles/active assignee, cross-project invisibility, archived/deleted writes',
    async (f, s, a, m) => {
      await rejected(create(f, s, m), 'NOT_FOUND');
      await rejected(
        f.db.transaction((tx) => s.get(tx, m, 1)),
        'NOT_FOUND',
      );
      await rejected(create(f, s, a, { assignee_id: 2 }), 'ASSIGNEE_INELIGIBLE');
      await addEditor(f);
      const r = await create(f, s, m, { assignee_id: 2 });
      assert.equal(r.item.creator_id, 2);
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.project_members SET access='viewer' WHERE user_id=2")),
      );
      await rejected(patch(f, s, m, r.item.id, 1, { title: 'No' }), 'FORBIDDEN');
      await rejected(patch(f, s, a, r.item.id, 1, { assignee_id: 2 }), 'ASSIGNEE_INELIGIBLE');
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=2')));
      await rejected(create(f, s, a, { assignee_id: 2 }), 'ASSIGNEE_INELIGIBLE');
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', {
            now: f.clock().toISOString(),
          }),
        ),
      );
      await rejected(patch(f, s, a, r.item.id, 1, { title: 'No' }), 'PROJECT_ARCHIVED');
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('UPDATE dbo.projects SET archived_at=NULL WHERE id=1'));
        await tx.execute(
          sql('UPDATE dbo.teams SET archived_at=@now WHERE id=1', { now: f.clock().toISOString() }),
        );
      });
      await rejected(create(f, s, a), 'TEAM_ARCHIVED');
      await f.db.transaction((tx) =>
        tx.execute(
          sql('UPDATE dbo.tasks SET deleted_at=@now,deleted_by=1 WHERE id=@id', {
            now: f.clock().toISOString(),
            id: r.item.id,
          }),
        ),
      );
      await rejected(patch(f, s, a, r.item.id, 1, { title: 'No' }), 'NOT_FOUND');
    },
  );
  check(
    'T027 all twelve transitions maintain completion/append board/version and noop',
    async (f, s, a) => {
      const r = await create(f, s, a);
      let t = r.item;
      // Euler trail covers each directed edge of the four-state graph.
      const sequence = [
        'doing',
        'todo',
        'review',
        'todo',
        'done',
        'doing',
        'review',
        'doing',
        'done',
        'review',
        'done',
        'todo',
      ] as const;
      const edges = new Set<string>();
      for (const status of sequence) {
        edges.add(`${t.status}:${status}`);
        const p = await patch(f, s, a, t.id, t.version, { status });
        assert.equal(p.item.completed_at, status === 'done' ? f.clock().toISOString() : null);
        assert.equal(p.item.version, t.version + 1);
        assert.equal(p.affected_columns.length, 2);
        t = p.item;
        await invariant(f);
      }
      assert.equal(edges.size, 12);
      t = (await patch(f, s, a, t.id, t.version, { status: 'done' })).item;
      const count = (await rows(f, 'SELECT id FROM dbo.task_events')).length;
      const same = await patch(f, s, a, t.id, t.version, { status: 'done' });
      assert.equal(same.item.version, t.version);
      assert.equal(same.item.completed_at, t.completed_at);
      assert.deepEqual(same.affected_columns, []);
      assert.equal((await rows(f, 'SELECT id FROM dbo.task_events')).length, count);
    },
  );
  check(
    'T028 checklist create/edit/toggle/delete versions, no auto-done and parent guard',
    async (f, s, a) => {
      const r = await create(f, s, a);
      const id = r.item.id;
      let sub = await f.db.transaction((tx) =>
        s.createSubtask(tx, a, id, { title: '  ตรวจสอบ  ', task_version: 1 }, randomUUID()),
      );
      assert.equal(sub.item.title, 'ตรวจสอบ');
      assert.equal(sub.task.version, 2);
      await rejected(patch(f, s, a, id, 2, { status: 'done' }), 'SUBTASKS_INCOMPLETE');
      await rejected(
        f.db.transaction((tx) =>
          s.patchSubtask(
            tx,
            a,
            sub.item.id,
            { version: 1, task_version: 1, done: true },
            false,
            randomUUID(),
          ),
        ),
        'VERSION_CONFLICT',
      );
      sub = await f.db.transaction((tx) =>
        s.patchSubtask(
          tx,
          a,
          sub.item.id,
          { version: 1, task_version: 2, title: 'ชื่อใหม่', done: true },
          false,
          randomUUID(),
        ),
      );
      assert.equal(sub.task.status, 'todo');
      assert.equal(sub.task.subtask_done_count, 1);
      assert.equal(sub.item.version, 2);
      const done = await patch(f, s, a, id, 3, { status: 'done' });
      await rejected(
        f.db.transaction((tx) =>
          s.createSubtask(
            tx,
            a,
            id,
            { title: 'No', task_version: done.item.version },
            randomUUID(),
          ),
        ),
        'PARENT_DONE',
      );
      await rejected(
        f.db.transaction((tx) =>
          s.patchSubtask(
            tx,
            a,
            sub.item.id,
            { version: 2, task_version: 4, done: false },
            false,
            randomUUID(),
          ),
        ),
        'PARENT_DONE',
      );
      await patch(f, s, a, id, 4, { status: 'doing' });
      sub = await f.db.transaction((tx) =>
        s.patchSubtask(
          tx,
          a,
          sub.item.id,
          { version: 2, task_version: 5, done: false },
          false,
          randomUUID(),
        ),
      );
      await rejected(
        f.db.transaction((tx) =>
          s.patchSubtask(
            tx,
            a,
            sub.item.id,
            { version: 2, task_version: 6, title: 'Stale' },
            false,
            randomUUID(),
          ),
        ),
        'VERSION_CONFLICT',
      );
      await f.db.transaction((tx) =>
        s.patchSubtask(tx, a, sub.item.id, { version: 3, task_version: 6 }, true, randomUUID()),
      );
      assert.equal((await f.db.transaction((tx) => s.get(tx, a, id))).item.version, 7);
      assert.equal((await rows(f, 'SELECT id FROM dbo.subtasks')).length, 0);
    },
  );
  check('T028 unknown child dates/invalid titles and viewer cannot mutate', async (f, s, a, m) => {
    for (const b of [
      { title: ' ' },
      { title: '😀'.repeat(101) },
      { title: 'x', due_date: '2026-10-06' },
      { title: 'x', assignee_id: [1, 2] },
    ])
      await rejected(
        f.db.transaction((tx) =>
          s.createSubtask(tx, a, 1, { task_version: 1, ...b }, randomUUID()),
        ),
        'VALIDATION_FAILED',
      );
    const sub = await f.db.transaction((tx) =>
      s.createSubtask(tx, a, 1, { title: 'x', task_version: 1 }, randomUUID()),
    );
    await f.db.transaction((tx) =>
      tx.execute(
        insert('project_members', { project_id: 1, user_id: 2, access: 'viewer', added_by: 1 }),
      ),
    );
    await rejected(
      f.db.transaction((tx) =>
        s.patchSubtask(
          tx,
          m,
          sub.item.id,
          { version: 1, task_version: 2, done: true },
          false,
          randomUUID(),
        ),
      ),
      'FORBIDDEN',
    );
    await rejected(
      f.db.transaction((tx) =>
        s.patchSubtask(
          tx,
          a,
          sub.item.id,
          { version: 1, task_version: 2, done: 1 },
          false,
          randomUUID(),
        ),
      ),
      'VALIDATION_FAILED',
    );
  });
  check(
    'T029 daily/weekly uses old due + offset; no overdue catchup, defaults and copied eligible fields',
    async (f, s, a) => {
      await addEditor(f);
      for (const [recurrence, due] of [
        ['daily', '2025-01-11'],
        ['weekly', '2025-01-17'],
      ]) {
        const r = await create(f, s, a, {
          title: 'รอบเก่า',
          description: 'รายละเอียด',
          category: 'cat',
          priority: 'high',
          assignee_id: 2,
          start_date: '2025-01-08',
          due_date: '2025-01-10',
          recurrence,
        });
        const d = await patch(f, s, a, r.item.id, 1, { status: 'done' });
        const n = d.successor!;
        assert.equal(n.due_date, due);
        assert.equal(n.start_date, recurrence === 'daily' ? '2025-01-09' : '2025-01-15');
        assert.equal(n.overdue, true);
        assert.equal(n.assignee_id, 2);
        assert.equal(n.priority, 'high');
        assert.equal(n.category, 'cat');
        assert.equal(n.description, 'รายละเอียด');
        assert.equal(n.version, 1);
        assert.equal(n.status, 'todo');
        assert.equal(n.completed_at, null);
        assert.equal(n.predecessor_task_id, r.item.id);
        assert.equal(d.item.successor_task_id, n.id);
        assert.equal(d.affected_columns.length, 2);
      }
      assert.equal((await rows(f, 'SELECT source_task_id FROM dbo.recurrence_events')).length, 2);
      await invariant(f);
    },
  );
  for (const year of ['2027', '2028'])
    check(
      `T029 monthly Jan31-Feb${year === '2028' ? '29' : '28'}-Mar31 retains anchor and checklist resets`,
      async (f, s, a) => {
        let t = (
          await create(f, s, a, {
            start_date: `${year}-01-29`,
            due_date: `${year}-01-31`,
            recurrence: 'monthly',
          })
        ).item;
        let sub = await f.db.transaction((tx) =>
          s.createSubtask(tx, a, t.id, { title: 'ต้องตรวจ', task_version: 1 }, randomUUID()),
        );
        sub = await f.db.transaction((tx) =>
          s.patchSubtask(
            tx,
            a,
            sub.item.id,
            { version: 1, task_version: 2, done: true },
            false,
            randomUUID(),
          ),
        );
        const feb = (await patch(f, s, a, t.id, sub.task.version, { status: 'done' })).successor!;
        assert.equal(feb.due_date, `${year}-02-${year === '2028' ? '29' : '28'}`);
        assert.equal(feb.recurrence_anchor_day, 31);
        assert.equal(feb.subtask_count, 1);
        assert.equal(feb.subtask_done_count, 0);
        t = (await f.db.transaction((tx) => s.get(tx, a, feb.id))).item;
        await f.db.transaction((tx) =>
          s.patchSubtask(
            tx,
            a,
            t.subtasks[0]!.id,
            { version: 1, task_version: 1, done: true },
            false,
            randomUUID(),
          ),
        );
        const march = (await patch(f, s, a, feb.id, 2, { status: 'done' })).successor!;
        assert.equal(march.due_date, `${year}-03-31`);
        assert.equal(march.start_date, `${year}-03-29`);
        await invariant(f);
      },
    );
  check(
    'T029 due edit resets monthly anchor, leaving monthly clears; later source edits preserve successor',
    async (f, s, a) => {
      let t = (await create(f, s, a, { due_date: '2027-01-31', recurrence: 'monthly' })).item;
      t = (await patch(f, s, a, t.id, 1, { due_date: '2027-01-30' })).item;
      assert.equal(t.recurrence_anchor_day, 30);
      const done = await patch(f, s, a, t.id, 2, { status: 'done' });
      assert.equal(done.successor!.recurrence_anchor_day, 30);
      t = (await patch(f, s, a, t.id, 3, { recurrence: 'weekly' })).item;
      assert.equal(t.recurrence_anchor_day, null);
      t = (await patch(f, s, a, t.id, 4, { recurrence: 'monthly', due_date: '2027-02-20' })).item;
      assert.equal(t.recurrence_anchor_day, 20);
      t = (await patch(f, s, a, t.id, 5, { recurrence: 'none', due_date: null })).item;
      assert.equal(t.recurrence_anchor_day, null);
      assert.equal(
        (await f.db.transaction((tx) => s.get(tx, a, done.successor!.id))).item
          .recurrence_anchor_day,
        30,
      );
    },
  );
  check(
    'T029 reopen/recomplete and purged successor tombstone do not regenerate; none cancels',
    async (f, s, a) => {
      let t = (await create(f, s, a, { due_date: '2027-01-31', recurrence: 'monthly' })).item;
      const done = await patch(f, s, a, t.id, 1, { status: 'done' });
      const next = done.successor!.id;
      t = (await patch(f, s, a, t.id, 2, { status: 'doing' })).item;
      assert.equal((await patch(f, s, a, t.id, t.version, { status: 'done' })).successor, null);
      await f.db.transaction(async (tx) => {
        await tx.execute(
          sql('UPDATE dbo.tasks SET successor_task_id=NULL WHERE id=@id', { id: t.id }),
        );
        await tx.execute(sql('DELETE FROM dbo.notifications WHERE task_id=@id', { id: next }));
        await tx.execute(sql('DELETE FROM dbo.task_events WHERE task_id=@id', { id: next }));
        await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=@id', { id: next }));
        await tx.execute(sql('DELETE FROM dbo.tasks WHERE id=@id', { id: next }));
      });
      await patch(f, s, a, t.id, 4, { status: 'review' });
      assert.equal((await patch(f, s, a, t.id, 5, { status: 'done' })).successor, null);
      assert.equal((await rows(f, 'SELECT source_task_id FROM dbo.recurrence_events')).length, 1);
      const canceled = await create(f, s, a, { due_date: '2027-01-31', recurrence: 'monthly' });
      assert.equal(
        (await patch(f, s, a, canceled.item.id, 1, { recurrence: 'none', status: 'done' }))
          .successor,
        null,
      );
    },
  );
  check(
    'T029 does not clone comments/files/audit; recurrence successor has own creation event',
    async (f, s, a) => {
      const r = await create(f, s, a, { due_date: '2027-01-31', recurrence: 'monthly' });
      await f.db.transaction(async (tx) => {
        await tx.execute(
          insert('comments', { task_id: r.item.id, author_id: 1, body: 'ไม่คัดลอก' }),
        );
        await tx.execute(
          insert('attachments', {
            task_id: r.item.id,
            uploader_id: 1,
            original_name: 'fixture.txt',
            storage_key: randomUUID(),
            validated_type: 'text/plain',
            bytes: 1,
            sha256: 'a'.repeat(64),
          }),
        );
      });
      const d = await patch(f, s, a, r.item.id, 1, { status: 'done' });
      for (const table of ['comments', 'attachments'])
        assert.equal(
          (await rows(f, `SELECT id FROM dbo.${table} WHERE task_id=${d.successor!.id}`)).length,
          0,
        );
      const events = await rows(
        f,
        `SELECT action FROM dbo.task_events WHERE task_id=${d.successor!.id}`,
      );
      assert.deepEqual(
        events.map((e) => e.action),
        ['created'],
      );
    },
  );
  check(
    'T016/022/027/029 member demotion and account deactivation preserve done history and unassign reopen/successor',
    async (f, s, a) => {
      await addEditor(f);
      const w = workspaceService({ clock: f.clock });
      const r = await create(f, s, a, {
        assignee_id: 2,
        due_date: '2027-01-31',
        recurrence: 'monthly',
      });
      const d = await patch(f, s, a, r.item.id, 1, { status: 'done' });
      await f.db.transaction((tx) =>
        w.projectMember(tx, a, 1, 2, { version: 1, access: 'viewer' }, false, randomUUID()),
      );
      assert.equal((await f.db.transaction((tx) => s.get(tx, a, r.item.id))).item.assignee_id, 2);
      assert.equal(
        (await f.db.transaction((tx) => s.get(tx, a, d.successor!.id))).item.assignee_id,
        null,
      );
      const opened = await patch(f, s, a, r.item.id, 2, { status: 'doing' });
      assert.equal(opened.item.assignee_id, null);
      await f.db.transaction((tx) =>
        w.projectMember(tx, a, 1, 2, { version: 2, access: 'editor' }, false, randomUUID()),
      );
      const r2 = await create(f, s, a, {
        assignee_id: 2,
        due_date: '2027-01-31',
        recurrence: 'monthly',
      });
      await patch(f, s, a, r2.item.id, 1, { status: 'done', recurrence: 'none' });
      const accounts = accountService(f.db, f.service, { clock: f.clock });
      await f.db.transaction((tx) =>
        accounts.patch(tx, a, 2, { version: 1, active: false }, randomUUID()),
      );
      // Done history is retained, generating later with current eligibility copies null.
      await patch(f, s, a, r2.item.id, 2, { status: 'doing', recurrence: 'monthly' });
      const d2 = await patch(f, s, a, r2.item.id, 3, { status: 'done' });
      assert.equal(d2.successor!.assignee_id, null);
      assert(
        (await rows(f, 'SELECT action FROM dbo.task_events')).some(
          (e) => e.action === 'access_cleanup',
        ),
      );
    },
  );
  check(
    'T027 notifications current recipients/dedupe/no-self, and rollback at every atomic effect',
    async (f, s, a, m) => {
      await addEditor(f);
      const r = await create(f, s, a, {
        assignee_id: 2,
        due_date: '2027-01-31',
        recurrence: 'monthly',
      });
      assert.deepEqual(
        (await rows(f, 'SELECT recipient_id,type FROM dbo.notifications')).map((n) => [
          n.recipient_id,
          n.type,
        ]),
        [[2, 'assignment']],
      );
      for (const table of [
        'tasks',
        'board_positions',
        'task_events',
        'notifications',
        'recurrence_events',
      ]) {
        const before = await Promise.all(
          [
            'tasks',
            'board_positions',
            'board_columns',
            'task_events',
            'notifications',
            'recurrence_events',
            'subtasks',
          ].map((t) => rows(f, `SELECT * FROM dbo.${t}`)),
        );
        await assert.rejects(
          f.db.transaction((tx) => {
            let hit = false;
            const wrapped: Transaction = {
              query: (statement) => {
                if (!hit && statement.sqlserver.startsWith('INSERT INTO dbo.' + table)) {
                  hit = true;
                  throw new Error('INJECTED');
                }
                return tx.query(statement);
              },
              execute: (statement) => {
                if (
                  !hit &&
                  (statement.sqlserver.startsWith('INSERT INTO dbo.' + table) ||
                    (table === 'tasks' && statement.sqlserver.startsWith('UPDATE dbo.tasks')))
                ) {
                  hit = true;
                  throw new Error('INJECTED');
                }
                return tx.execute(statement);
              },
            };
            return s.patch(wrapped, a, r.item.id, { version: 1, status: 'done' }, randomUUID());
          }),
          /INJECTED/,
        );
        assert.deepEqual(
          await Promise.all(
            [
              'tasks',
              'board_positions',
              'board_columns',
              'task_events',
              'notifications',
              'recurrence_events',
              'subtasks',
            ].map((t) => rows(f, `SELECT * FROM dbo.${t}`)),
          ),
          before,
        );
      }
      const done = await patch(f, s, m, r.item.id, 1, { status: 'done' });
      const notifications = await rows(
        f,
        'SELECT recipient_id,type,task_id FROM dbo.notifications',
      );
      assert.equal(notifications.filter((n) => n.type === 'status').length, 1);
      assert.equal(notifications.find((n) => n.type === 'status')!.recipient_id, 1);
      assert.equal(done.successor!.assignee_id, 2);
      await invariant(f);
    },
  );
  check(
    'T025/T028 rollback failed audit leaves organization/checklist/parent unchanged',
    async (f, s, a) => {
      const o = organizationService({ clock: f.clock });
      const fault = (tx: Transaction): Transaction => ({
        query: (statement) => tx.query(statement),
        execute: (statement) => {
          if (
            statement.sqlserver.includes('INSERT INTO dbo.admin_events') ||
            statement.sqlserver.includes('INSERT INTO dbo.task_events')
          )
            throw new Error('AUDIT_FAULT');
          return tx.execute(statement);
        },
      });
      await assert.rejects(
        f.db.transaction((tx) =>
          o.patch(fault(tx), a, { name: 'Rollback', version: 1 }, randomUUID()),
        ),
        /AUDIT_FAULT/,
      );
      assert.equal((await f.db.transaction((tx) => o.get(tx, a))).item.version, 1);
      await assert.rejects(
        f.db.transaction((tx) =>
          s.createSubtask(fault(tx), a, 1, { title: 'Rollback', task_version: 1 }, randomUUID()),
        ),
        /AUDIT_FAULT/,
      );
      assert.equal((await rows(f, 'SELECT id FROM dbo.subtasks')).length, 0);
      assert.equal((await f.db.transaction((tx) => s.get(tx, a, 1))).item.version, 1);
      const sub = await f.db.transaction((tx) =>
        s.createSubtask(tx, a, 1, { title: 'Original', task_version: 1 }, randomUUID()),
      );
      await assert.rejects(
        f.db.transaction((tx) =>
          s.patchSubtask(
            fault(tx),
            a,
            sub.item.id,
            { version: 1, task_version: 2, done: true },
            false,
            randomUUID(),
          ),
        ),
        /AUDIT_FAULT/,
      );
      await assert.rejects(
        f.db.transaction((tx) =>
          s.patchSubtask(
            fault(tx),
            a,
            sub.item.id,
            { version: 1, task_version: 2 },
            true,
            randomUUID(),
          ),
        ),
        /AUDIT_FAULT/,
      );
      const read = await f.db.transaction((tx) => s.get(tx, a, 1));
      assert.equal(read.item.version, 2);
      assert.equal(read.item.subtasks[0]!.done, false);
      assert.equal(read.item.subtasks[0]!.version, 1);
    },
  );
  check(
    'T026 owner Lead overrides explicit Viewer and eligible admin is assignable without membership',
    async (f, s, a, m) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(insert('team_members', { team_id: 1, user_id: 2, team_role: 'lead' }));
        await tx.execute(
          insert('project_members', { project_id: 1, user_id: 2, access: 'viewer', added_by: 1 }),
        );
      });
      const r = await create(f, s, m, { assignee_id: 1 });
      assert.equal(r.item.assignee_id, 1);
      const p = await patch(f, s, a, r.item.id, 1, { assignee_id: 2 });
      assert.equal(p.item.assignee_id, 2);
      await rejected(
        f.db.transaction((tx) => s.get(tx, m, 99999)),
        'NOT_FOUND',
      );
    },
  );
  check(
    'Owner Vibe: multi-assignees, secondary filtering, independent Checklist, notifications and recurrence',
    async (f, s, a) => {
      await addEditor(f);
      const created = await create(f, s, a, {
        assignee_ids: [2, 1],
        recurrence: 'weekly',
        due_date: '2026-10-07',
      });
      assert.deepEqual(created.item.assignee_ids, [1, 2]);
      assert.equal(created.item.assignee_id, 1);
      assert.equal(created.item.assignees.length, 2);
      const filtered = await f.db.transaction((tx) => s.list(tx, a, { assignee: 2 }));
      assert(filtered.items.some((t) => t.id === created.item.id));
      assert(
        (
          await rows(
            f,
            `SELECT id FROM dbo.notifications WHERE task_id=${created.item.id} AND recipient_id=2 AND type='assignment'`,
          )
        ).length > 0,
      );
      const sub = await f.db.transaction((tx) =>
        s.createSubtask(
          tx,
          a,
          created.item.id,
          { title: 'Independent owner', assignee_id: 2, task_version: 1 },
          randomUUID(),
        ),
      );
      assert.equal(sub.item.assignee_id, 2);
      await rejected(patch(f, s, a, created.item.id, 2, { status: 'done' }), 'SUBTASKS_INCOMPLETE');
      const checked = await f.db.transaction((tx) =>
        s.patchSubtask(
          tx,
          a,
          sub.item.id,
          { version: 1, task_version: 2, done: true },
          false,
          randomUUID(),
        ),
      );
      const completed = await patch(f, s, a, created.item.id, checked.task.version, {
        status: 'done',
      });
      assert.deepEqual(completed.successor!.assignee_ids, [1, 2]);
      const next = await f.db.transaction((tx) => s.get(tx, a, completed.successor!.id));
      assert.equal(next.item.subtasks[0]!.assignee_id, 2);
      assert.equal(next.item.subtasks[0]!.done, false);
      await rejected(create(f, s, a, { assignee_ids: [99999] }), 'ASSIGNEE_INELIGIBLE');
      await rejected(create(f, s, a, { assignee_ids: [1, 1] }), 'VALIDATION_FAILED');
    },
  );
  check(
    'Owner Vibe: persisted groups, cross-project rejection, versions and audit rollback',
    async (f, s, a, m) => {
      await rejected(
        f.db.transaction((tx) => s.createGroup(tx, m, 1, { name: 'No rights' }, randomUUID())),
        'NOT_FOUND',
      );
      const group = await f.db.transaction((tx) =>
        s.createGroup(tx, a, 1, { name: 'Phase 1', color: '#a25ddc' }, randomUUID()),
      );
      assert.equal((await f.db.transaction((tx) => s.groups(tx, a, 1))).items.length, 1);
      const task = await create(f, s, a, { group_id: group.item.id });
      assert.equal(task.item.group_id, group.item.id);
      const other = await f.db.transaction((tx) =>
        s.createGroup(tx, a, 2, { name: 'Other' }, randomUUID()),
      );
      await rejected(patch(f, s, a, task.item.id, 1, { group_id: other.item.id }), 'NOT_FOUND');
      const moved = await patch(f, s, a, task.item.id, 1, { group_id: null });
      assert.equal(moved.item.status, 'todo');
      assert.equal(moved.item.group_id, null);
      await f.db.transaction((tx) =>
        s.patchGroup(tx, a, Number(group.item.id), { version: 1, name: 'Planning' }, randomUUID()),
      );
      await rejected(
        f.db.transaction((tx) =>
          s.patchGroup(tx, a, Number(group.item.id), { version: 1, name: 'Stale' }, randomUUID()),
        ),
        'VERSION_CONFLICT',
      );
      const count = (await rows(f, 'SELECT COUNT(*) AS total FROM dbo.project_groups'))[0]!.total;
      await assert.rejects(
        f.db.transaction((tx) =>
          s.createGroup(
            {
              ...tx,
              query: tx.query.bind(tx),
              execute: async (statement) => {
                if (statement.sqlite.includes('admin_events')) throw new Error('AUDIT_FAULT');
                return tx.execute(statement);
              },
            },
            a,
            1,
            { name: 'Rollback' },
            randomUUID(),
          ),
        ),
        /AUDIT_FAULT/,
      );
      assert.equal(
        (await rows(f, 'SELECT COUNT(*) AS total FROM dbo.project_groups'))[0]!.total,
        count,
      );
    },
  );
  check(
    'Owner Vibe: removal cleans secondary and Checklist assignments without removing the primary',
    async (f, s, a) => {
      await addEditor(f);
      const task = await create(f, s, a, { assignee_ids: [1, 2] });
      const child = await f.db.transaction((tx) =>
        s.createSubtask(
          tx,
          a,
          task.item.id,
          { title: 'Member work', assignee_id: 2, task_version: 1 },
          randomUUID(),
        ),
      );
      await f.db.transaction(async (tx) => {
        for (let i = 0; i < 101; i++)
          await tx.execute(
            insert('subtasks', {
              task_id: task.item.id,
              title: `Bulk work ${i}`,
              assignee_id: 2,
              created_at: f.clock().toISOString(),
            }),
          );
        await tx.execute(
          sql("UPDATE dbo.project_members SET access='viewer' WHERE project_id=1 AND user_id=2"),
        );
        const { cleanupAssignments } = await import('../../src/services/access-effects.js');
        await cleanupAssignments(tx, 2, 1, randomUUID(), f.clock().toISOString(), { project: 1 });
      });
      const fresh = await f.db.transaction((tx) => s.get(tx, a, task.item.id));
      assert.deepEqual(fresh.item.assignee_ids, [1]);
      assert.equal(fresh.item.assignee_id, 1);
      assert.equal(fresh.item.subtasks[0]!.assignee_id, null);
      assert.equal(fresh.item.subtasks[0]!.version, child.item.version + 1);
      assert.equal(fresh.item.version, 3);
      assert(fresh.item.subtasks.every((child) => child.assignee_id === null));
      const audit = (
        await rows(
          f,
          `SELECT field_changes FROM dbo.task_events WHERE task_id=${task.item.id} AND action='access_cleanup'`,
        )
      )[0]!;
      assert(String(audit.field_changes).includes('assignee_ids'));
      assert(String(audit.field_changes).includes('Member work'));
      assert(JSON.parse(String(audit.field_changes)).length <= 100);
    },
  );

  check(
    'Owner Vibe: secondary-assignee workload, CSV, reminders and pagination dedupe',
    async (f, s, a) => {
      await addEditor(f);
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.users SET display_name=CASE WHEN id=1 THEN 'Mina' ELSE 'Ton' END"),
        ),
      );
      const task = await create(f, s, a, {
        title: 'Multi-owner report',
        assignee_ids: [1, 2],
        due_date: '2026-10-06',
      });
      const { reportService } = await import('../../src/services/reports.js');
      const report = reportService(f.db, { clock: f.clock });
      const result = await f.db.transaction((tx) =>
        report.summary(tx, a, {
          assignee: 2,
          date_basis: 'due',
          date_from: '2026-10-01',
          date_to: '2026-10-31',
        }),
      );
      assert.equal(result.total, 1);
      assert.equal(result.workload.length, 2);
      assert(result.workload.every((w) => w.open_count === 1));
      const exported = await f.db.transaction((tx) =>
        report.export(tx, a, {
          assignee: 2,
          date_basis: 'due',
          date_from: '2026-10-01',
          date_to: '2026-10-31',
        }),
      );
      let csv = '';
      for await (const chunk of await exported.open()) csv += String(chunk);
      assert(csv.includes('Mina, Ton'));
      assert(csv.includes('Multi-owner report'));
      const { reminderService } = await import('../../src/services/reminders.js');
      const reminders = reminderService(f.db, f.clock);
      await reminders.run();
      await reminders.run();
      const notices = await rows(
        f,
        `SELECT recipient_id FROM dbo.notifications WHERE task_id=${task.item.id} AND type='due_today' ORDER BY recipient_id`,
      );
      assert.deepEqual(
        notices.map((n) => n.recipient_id),
        [1, 2],
      );
    },
  );

  check(
    'Owner Vibe: idempotent multi-assignee create replays reordered sets and preserves explicit alias conflicts',
    async (f, s, a) => {
      await addEditor(f);
      const { executeIdempotent } = await import('../../src/repository/idempotency.js');
      const command = {
        userId: 1,
        method: 'POST',
        path: '/api/tasks',
        key: randomUUID(),
        body: { project_id: 1, title: 'Replay owners', assignee_ids: [2, 1] },
        authorize: async () => {},
        clock: f.clock,
        mutate: async (tx: Transaction, input: unknown) => ({
          status: 201,
          body: await s.create(tx, a, input, randomUUID()),
        }),
      };
      const first = await executeIdempotent(f.db, command);
      assert.deepEqual(
        await executeIdempotent(f.db, {
          ...command,
          body: { ...command.body, assignee_ids: [1, 2] },
        }),
        first,
      );
      await rejected(
        executeIdempotent(f.db, {
          ...command,
          key: randomUUID(),
          body: { ...command.body, assignee_id: null },
        }),
        'VALIDATION_FAILED',
      );
      assert.equal(
        (await rows(f, "SELECT COUNT(*) AS n FROM dbo.tasks WHERE title='Replay owners'"))[0]!.n,
        1,
      );
    },
  );
}
