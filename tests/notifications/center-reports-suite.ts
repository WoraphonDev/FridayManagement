import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { insert, type Fixture } from '../schema/fixtures.js';
import { accessFixture, proof, now } from '../authorization/fixtures.js';
import { notificationCenter, retainNotifications } from '../../src/services/notification-center.js';
import { reportService, csvCell } from '../../src/services/reports.js';
import { taskService } from '../../src/services/tasks.js';
import { sql } from '../../src/repository/access-scope.js';
import { ApiFault } from '../../src/api/errors.js';
import { parseSchema, operations } from '../../src/api/contract.js';
import type { Transaction, Row, Statement } from '../../src/domain/database.js';
const clock = () => new Date(now),
  range = { date_from: '2026-01-01', date_to: '2026-12-31' };
export function centerReportsAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  type F = Awaited<ReturnType<typeof accessFixture>>;
  const check = (name: string, work: (f: F) => Promise<void>) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await accessFixture(factory);
      try {
        await f.db.transaction((tx) =>
          tx.execute(sql('UPDATE dbo.tasks SET created_at=@now,updated_at=@now', { now })),
        );
        await work(f);
      } finally {
        await f.close();
      }
    });
  const rows = (f: F, q: string) => f.db.transaction((tx) => tx.query(sql(q)));
  const rejected = (p: Promise<unknown>, code: string) =>
    assert.rejects(p, (e: unknown) => e instanceof ApiFault && e.code === code);
  const notification = (tx: Transaction, recipient_id: number, task_id = 1, created_at = now) =>
    tx.execute(
      insert('notifications', {
        recipient_id,
        task_id,
        type: 'comment',
        message: 'synthetic safe',
        dedupe_key: randomUUID(),
        created_at,
      }),
    );
  const summary = (f: F, q: Record<string, unknown> = {}, user = 4) =>
    f.db.transaction((tx) =>
      reportService(f.db, { clock }).summary(tx, proof(user), { ...range, ...q }),
    );
  const csv = async (f: F, q: Record<string, unknown> = {}) => {
    const exportable = await f.db.transaction((tx) =>
      reportService(f.db, { clock }).export(tx, proof(4), { ...range, ...q }),
    );
    const stream = await exportable.open();
    let content = '';
    for await (const chunk of stream) content += String(chunk);
    return content;
  };
  check(
    'T050 own/current-parent scope, page50, unread independent of filter, no GET changes or idle renewal',
    async (f) => {
      await f.db.transaction(async (tx) => {
        for (let i = 0; i < 55; i++) await notification(tx, 4);
      });
      const before = await rows(f, 'SELECT * FROM dbo.notifications ORDER BY id'),
        sessions = await rows(f, 'SELECT last_seen_at FROM dbo.sessions');
      const center = notificationCenter({ clock }),
        p = await f.db.transaction((tx) => center.page(tx, proof(4), {}));
      assert.equal(p.total, 56);
      assert.equal(p.items.length, 50);
      assert.equal(p.unread_count, 56);
      assert(!JSON.stringify(p).includes('PRIVATE_ONLY'));
      const schema = operations.find((o) => o.path === '/api/notifications' && o.method === 'GET')!
        .operation.responses['200']!.content!['application/json']!.schema;
      parseSchema(schema, p);
      const p2 = await f.db.transaction((tx) => center.page(tx, proof(4), { page: 2 }));
      assert.equal(p2.items.length, 6);
      assert(!p2.items.some((r) => p.items.some((i) => i.id === r.id)));
      assert.deepEqual(await rows(f, 'SELECT * FROM dbo.notifications ORDER BY id'), before);
      assert.deepEqual(await rows(f, 'SELECT last_seen_at FROM dbo.sessions'), sessions);
      await rejected(
        f.db.transaction((tx) => center.read(tx, proof(4), 3)),
        'NOT_FOUND',
      );
      await rejected(
        f.db.transaction((tx) => center.read(tx, proof(4), 2)),
        'NOT_FOUND',
      );
      await assert.rejects(f.db.transaction((tx) => center.page(tx, proof(4), { extra: 1 })));
    },
  );
  check(
    'T050 read one/noop/read all persisted, only own visible rows, revoked parents hidden',
    async (f) => {
      const center = notificationCenter({ clock });
      await f.db.transaction((tx) => center.read(tx, proof(4), 1));
      const first = await rows(f, 'SELECT read_at FROM dbo.notifications WHERE id=1');
      await f.db.transaction((tx) =>
        notificationCenter({ clock: () => new Date('2026-10-06T00:31:00.000Z') }).read(
          tx,
          proof(4),
          1,
        ),
      );
      assert.deepEqual(await rows(f, 'SELECT read_at FROM dbo.notifications WHERE id=1'), first);
      await f.db.transaction((tx) => notification(tx, 4));
      const read = await f.db.transaction((tx) => center.read(tx, proof(4), null));
      assert.deepEqual(read, { marked_count: 1, unread_count: 0 });
      assert.equal(
        (await rows(f, 'SELECT id FROM dbo.notifications WHERE id IN (2,3) AND read_at IS NULL'))
          .length,
        2,
      );
      const old = await rows(f, 'SELECT read_at FROM dbo.notifications WHERE recipient_id=4');
      await f.db.transaction((tx) =>
        tx.execute(sql('DELETE FROM dbo.project_members WHERE user_id=4 AND project_id=1')),
      );
      const page = await f.db.transaction((tx) => center.page(tx, proof(4), {}));
      assert.equal(page.unread_count, 0);
      assert.equal(page.total, 0);
      await rejected(
        f.db.transaction((tx) => center.read(tx, proof(4), 1)),
        'NOT_FOUND',
      );
      await f.db.transaction((tx) => center.read(tx, proof(4), null));
      assert.deepEqual(
        await rows(f, 'SELECT read_at FROM dbo.notifications WHERE recipient_id=4'),
        old,
      );
    },
  );
  check(
    'T050 90 UTC day cutoff, just-before retained, maintenance pauses actual cleanup function',
    async (f) => {
      const cutoff = new Date(Date.parse(now) - 90 * 86400000).toISOString();
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('DELETE FROM dbo.notifications'));
        await notification(tx, 4, 1, cutoff);
        await notification(tx, 4, 1, new Date(Date.parse(cutoff) + 1).toISOString());
        await tx.execute(
          insert('maintenance_state', {
            id: 1,
            state: 'frozen',
            owner_id: randomUUID(),
            lease_expires_at: '2026-10-06T01:00:00.000Z',
            created_at: now,
            updated_at: now,
          }),
        );
      });
      await retainNotifications(f.db, clock);
      assert.equal((await rows(f, 'SELECT id FROM dbo.notifications')).length, 2);
      await f.db.transaction((tx) => tx.execute(sql('DELETE FROM dbo.maintenance_state')));
      await retainNotifications(f.db, clock);
      assert.equal((await rows(f, 'SELECT id FROM dbo.notifications')).length, 1);
      assert.equal(
        (await rows(f, 'SELECT created_at FROM dbo.notifications'))[0]!.created_at,
        new Date(Date.parse(cutoff) + 1).toISOString(),
      );
    },
  );
  check(
    'T052 totals/status6/overdue/unassigned/33.33%, owner team vs assignee team, zero and hidden/deleted/archived',
    async (f) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(
          sql('UPDATE dbo.tasks SET assignee_id=4,due_date=@due', { due: '2026-10-10' }),
        );
        await tx.execute(
          sql('UPDATE dbo.tasks SET assignee_id=NULL,due_date=@due WHERE id=2', {
            due: '2026-10-05',
          }),
        );
        for (const status of ['doing', 'review', 'done', 'done'])
          await tx.execute(
            insert('tasks', {
              project_id: 1,
              title: 'fixture metric',
              creator_id: 4,
              assignee_id: 4,
              status,
              completed_at: status === 'done' ? now : null,
              created_at: now,
              updated_at: now,
            }),
          );
        await tx.execute(
          insert('tasks', {
            project_id: 1,
            title: 'DELETED_ONLY',
            creator_id: 4,
            deleted_at: now,
            deleted_by: 1,
            created_at: now,
            updated_at: now,
          }),
        );
      });
      const r = await summary(f);
      assert.equal(r.total, 6);
      assert.deepEqual(r.by_status, { todo: 2, doing: 1, review: 1, done: 2 });
      assert.equal(r.overdue, 1);
      assert.equal(r.unassigned, 1);
      assert.equal(r.done_in_period, 2);
      assert.equal(r.completion_percentage.toFixed(2), '33.33');
      assert.equal(
        r.workload.reduce((n, w) => n + w.open_count, 0),
        4,
      );
      parseSchema(
        operations.find((o) => o.path === '/api/reports/summary')!.operation.responses['200']!
          .content!['application/json']!.schema,
        r,
      );
      assert.equal((await summary(f, { team: 1, assignee: 4 })).total, 5);
      assert.equal((await summary(f, { team: 2 })).total, 0);
      const empty = await summary(f, { project: 999 });
      assert.equal(empty.total, 0);
      assert.equal(empty.completion_percentage, 0);
      assert.deepEqual(empty.workload, []);
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', { now })),
      );
      assert.equal((await summary(f, { project: 1 })).total, 0);
      assert(!(await csv(f, { project: 1 })).includes('fixture metric'));
    },
  );
  check(
    'T052 Bangkok created/completed boundaries, due inclusive, default month, reopen clears done-period, inactive history',
    async (f) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=1'));
        await tx.execute(
          sql(
            "UPDATE dbo.tasks SET status='done',completed_at=@at,created_at=@at,due_date='2026-10-06' WHERE id=1",
            { at: '2026-10-05T17:00:00.000Z' },
          ),
        );
        await tx.execute(
          insert('board_positions', { task_id: 1, project_id: 1, status: 'done', rank: 1 }),
        );
        await tx.execute(
          sql("UPDATE dbo.tasks SET created_at=@at,due_date='2026-10-07' WHERE id=2", {
            at: '2026-10-06T17:00:00.000Z',
          }),
        );
      });
      for (const date_basis of ['created', 'due', 'completed'])
        assert.equal(
          (await summary(f, { date_basis, date_from: '2026-10-06', date_to: '2026-10-06' })).total,
          1,
        );
      const def = await f.db.transaction((tx) =>
        reportService(f.db, { clock }).summary(tx, proof(4), {}),
      );
      assert.equal(def.metadata.date_from, '2026-10-01');
      assert.equal(def.metadata.date_to, '2026-10-31');
      await f.db.transaction((tx) =>
        taskService({ clock }).patch(tx, proof(4), 1, { version: 1, status: 'todo' }, randomUUID()),
      );
      assert.equal((await summary(f, { date_basis: 'completed' })).total, 0);
      assert.equal((await summary(f)).done_in_period, 0);
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=7')));
      assert.equal(
        (await summary(f)).workload.find((w) => w.assignee?.id === 7)?.assignee?.active,
        false,
      );
    },
  );
  check(
    'T053 CSV120+ rows UTF8 BOM RFC4180, formula neutralization, all shared filters and no secret columns',
    async (f) => {
      const titles = [
        'ไทย, "quote"\nsecond line',
        '=SUM(1,2)',
        '  +2',
        '@sum',
        '\ttab',
        '\rCR',
        '-2',
      ];
      await f.db.transaction(async (tx) => {
        for (let i = 0; i < 123; i++)
          await tx.execute(
            insert('tasks', {
              project_id: 1,
              title: titles[i % titles.length]!,
              creator_id: 4,
              assignee_id: i % 2 ? 4 : null,
              category: 'synthetic',
              created_at: now,
              updated_at: now,
            }),
          );
      });
      const content = await csv(f),
        r = await summary(f);
      assert(content.startsWith('\uFEFF'));
      assert.equal((content.match(/\r\n"\d+",/g) ?? []).length, r.total);
      assert(content.includes('"ไทย, ""quote""\nsecond line"'));
      assert(content.includes('"\'=SUM(1,2)"'));
      assert(content.includes('"\'  +2"'));
      assert(!content.includes('PRIVATE_ONLY'));
      assert(!content.includes('password'));
      assert(!content.includes('fixture.pdf'));
      for (const filter of [
        { assignee: null },
        { category: 'synthetic', status: ['todo'], priority: ['medium'] },
        { team: 1, project: 1, q: 'quote' },
        { has_due: false },
        { date_basis: 'completed' },
      ])
        assert.equal(
          ((await csv(f, filter)).match(/\r\n"\d+",/g) ?? []).length,
          (await summary(f, filter)).total,
        );
      for (const value of ['=1', '  +1', ' -1', '\tX', '\rX', '@X', '\n =1'])
        assert(csvCell(value).startsWith('"\''));
      assert.equal(csvCell('normal'), '"normal"');
    },
  );
  check(
    'T053 cap50001 rejects before streaming; exactly50000 streams bounded batches, disconnect releases transaction',
    async (f) => {
      await f.db.transaction(async (tx) => {
        for (let i = 0; i < 49999; i++)
          await tx.execute(
            insert('tasks', {
              project_id: 1,
              title: 'cap fixture',
              creator_id: 4,
              created_at: now,
              updated_at: now,
            }),
          );
      });
      const s = reportService(f.db, { clock });
      await rejected(
        f.db.transaction((tx) => s.export(tx, proof(4), range)),
        'EXPORT_LIMIT_EXCEEDED',
      );
      await f.db.transaction((tx) =>
        tx.execute(sql('DELETE FROM dbo.tasks WHERE id=(SELECT MAX(id) FROM dbo.tasks)')),
      );
      let maxBatch = 0,
        queryCount = 0;
      const tracked = {
        ...f.db,
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: <T>(work: (tx: Transaction) => Promise<T>) =>
          f.db.transaction((tx) =>
            work({
              ...tx,
              query: async <R extends Row>(q: Statement) => {
                const result = await tx.query<R>(q);
                if (q.sqlserver.includes('ORDER BY t.id')) {
                  maxBatch = Math.max(maxBatch, result.length);
                  queryCount++;
                }
                return result;
              },
            }),
          ),
      };
      const e = await f.db.transaction((tx) =>
        reportService(tracked, { clock }).export(tx, proof(4), range),
      );
      const stream = await e.open();
      let count = -1; // Exclude header; cap fixture fields contain no embedded newlines.
      for await (const chunk of stream) count += (String(chunk).match(/\r\n/g) ?? []).length;
      assert.equal(count, 50000);
      assert(maxBatch <= 100);
      assert(queryCount >= 500);
      const cancel = await f.db.transaction((tx) => s.export(tx, proof(4), range));
      const canceled = await cancel.open();
      canceled.destroy();
      await rows(f, 'SELECT id FROM dbo.tasks WHERE id=1');
    },
  );
  check(
    'T053 authorization rechecked before headers and export startup; changed access produces no CSV',
    async (f) => {
      const s = reportService(f.db, { clock }),
        e = await f.db.transaction((tx) => s.export(tx, proof(4), range));
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=4')));
      await rejected(e.open(), 'UNAUTHENTICATED');
    },
  );
}
