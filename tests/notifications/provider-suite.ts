import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Fixture } from '../schema/fixtures.js';
import { insert } from '../schema/fixtures.js';
import { accessFixture, proof, now } from '../authorization/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { taskService } from '../../src/services/tasks.js';
import { workspaceService } from '../../src/services/workspaces.js';
import { dispatchTaskNotification, persistNotification } from '../../src/services/notifications.js';
import { reminderService } from '../../src/services/reminders.js';
export function notificationAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  type F = Awaited<ReturnType<typeof accessFixture>>;
  const check = (name: string, work: (f: F) => Promise<void>) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await accessFixture(factory);
      try {
        await f.db.transaction((tx) => tx.execute(sql('DELETE FROM dbo.notifications')));
        await work(f);
      } finally {
        await f.close();
      }
    });
  const rows = (f: F, q: string) => f.db.transaction((tx) => tx.query(sql(q)));
  const service = () => taskService({ clock: () => new Date(now) });
  check(
    'T048 dispatch unique recipients, self/inactive/no access suppressed, safe message',
    async (f) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=9'));
        await dispatchTaskNotification(tx, {
          task: 1,
          version: 1,
          actor: 4,
          type: 'comment',
          recipients: [4, 5, 5, 7, 9, null],
          request: 'same',
          now,
        });
        await dispatchTaskNotification(tx, {
          task: 1,
          version: 1,
          actor: 4,
          type: 'comment',
          recipients: [4, 5, 5, 7, 9, null],
          request: 'same',
          now,
        });
      });
      const n = await rows(f, 'SELECT recipient_id,message FROM dbo.notifications');
      assert.deepEqual(
        n.map((r) => r.recipient_id),
        [5],
      );
      assert.equal(n[0]!.message, 'มีความคิดเห็นใหม่ในงาน');
    },
  );
  check(
    'T048 actual assignment/comment/status share task events; creator and assignee deduped',
    async (f) => {
      const s = service();
      await f.db.transaction((tx) =>
        s.patch(tx, proof(1), 1, { version: 1, assignee_id: 9 }, randomUUID()),
      );
      await f.db.transaction((tx) =>
        s.createComment(tx, proof(1), 1, { body: 'synthetic private text' }, randomUUID()),
      );
      await f.db.transaction((tx) =>
        s.patch(tx, proof(1), 1, { version: 2, status: 'doing' }, randomUUID()),
      );
      const n = await rows(
        f,
        'SELECT recipient_id,type,message FROM dbo.notifications ORDER BY id',
      );
      assert.deepEqual(
        n.map((r) => [r.type, r.recipient_id]),
        [
          ['assignment', 9],
          ['comment', 4],
          ['comment', 9],
          ['status', 4],
          ['status', 9],
        ],
      );
      assert(n.every((r) => !String(r.message).includes('synthetic')));
      assert.equal((await rows(f, 'SELECT id FROM dbo.task_events WHERE task_id=1')).length, 3);
    },
  );
  check(
    'T048 notification write failure rolls back task, audit and event atomically',
    async (f) => {
      const before = await rows(f, 'SELECT version,status FROM dbo.tasks WHERE id=1');
      await assert.rejects(
        f.db.transaction((tx) =>
          service().patch(
            {
              ...tx,
              query: async (statement) => {
                if (statement.sqlite.startsWith('INSERT INTO notifications'))
                  throw new Error('Injected notification persistence failure');
                return tx.query(statement);
              },
            },
            proof(1),
            1,
            { version: 1, status: 'doing' },
            randomUUID(),
          ),
        ),
        /Injected notification persistence failure/,
      );
      assert.deepEqual(await rows(f, 'SELECT version,status FROM dbo.tasks WHERE id=1'), before);
      assert.equal((await rows(f, 'SELECT id FROM dbo.task_events')).length, 0);
      assert.equal((await rows(f, 'SELECT id FROM dbo.notifications')).length, 0);
    },
  );
  check('T048 actual permission cleanup notifies owner Admin/Leads except actor', async (f) => {
    await f.db.transaction((tx) =>
      workspaceService({ clock: () => new Date(now) }).projectMember(
        tx,
        proof(1),
        1,
        4,
        { version: 1, access: 'viewer' },
        false,
        randomUUID(),
      ),
    );
    assert.equal(
      (await rows(f, 'SELECT assignee_id FROM dbo.tasks WHERE id=1'))[0]!.assignee_id,
      null,
    );
    const n = await rows(
      f,
      "SELECT recipient_id FROM dbo.notifications WHERE type='access_cleanup' ORDER BY recipient_id",
    );
    assert.deepEqual(
      n.map((r) => r.recipient_id),
      [3, 8],
    );
    assert.equal(
      (await rows(f, "SELECT id FROM dbo.task_events WHERE action='access_cleanup'")).length,
      1,
    );
  });
  check(
    'T048 actual reopen and restore clear historical ineligible assignee and alert owner leads',
    async (f) => {
      const s = service();
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=1'));
        await tx.execute(sql('UPDATE dbo.board_positions SET rank=1 WHERE task_id=2'));
        await tx.execute(
          sql("UPDATE dbo.tasks SET status='done',completed_at=@now,assignee_id=7 WHERE id=1", {
            now,
          }),
        );
        await tx.execute(
          insert('board_positions', { project_id: 1, task_id: 1, status: 'done', rank: 1 }),
        );
      });
      await f.db.transaction((tx) =>
        s.patch(tx, proof(1), 1, { version: 1, status: 'doing' }, randomUUID()),
      );
      assert.equal(
        (await rows(f, 'SELECT assignee_id FROM dbo.tasks WHERE id=1'))[0]!.assignee_id,
        null,
      );
      await f.db.transaction((tx) =>
        s.trashMutation(tx, proof(1), 1, { version: 2 }, false, randomUUID()),
      );
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.tasks SET assignee_id=7 WHERE id=1')),
      );
      await f.db.transaction((tx) =>
        s.trashMutation(tx, proof(1), 1, { version: 3 }, true, randomUUID()),
      );
      assert.equal(
        (await rows(f, 'SELECT assignee_id FROM dbo.tasks WHERE id=1'))[0]!.assignee_id,
        null,
      );
      assert.deepEqual(
        (
          await rows(
            f,
            "SELECT recipient_id FROM dbo.notifications WHERE type='access_cleanup' ORDER BY id",
          )
        ).map((r) => r.recipient_id),
        [3, 8, 3, 8],
      );
      assert.equal(
        (await rows(f, "SELECT id FROM dbo.task_events WHERE action='access_cleanup'")).length,
        2,
      );
    },
  );
  check('T049 tomorrow/today/overdue Bangkok, repeated run and restart deduped', async (f) => {
    await f.db.transaction(async (tx) => {
      await tx.execute(sql("UPDATE dbo.tasks SET due_date='2026-10-06' WHERE id=1"));
      for (const due of ['2026-10-05', '2026-10-07', '2026-10-08'])
        await tx.execute(
          insert('tasks', {
            project_id: 1,
            title: 'Reminder ' + due,
            creator_id: 1,
            assignee_id: 4,
            due_date: due,
          }),
        );
    });
    const r = reminderService(f.db, () => new Date('2026-10-05T17:00:00.000Z'));
    assert.deepEqual(await r.run(), { inserted: 3, today: '2026-10-06' });
    assert.equal((await r.run()).inserted, 0);
    const reopened = await f.reopen();
    assert.equal(
      (await reminderService(reopened, () => new Date('2026-10-06T00:00:00Z')).run()).inserted,
      0,
    );
    const n = await reopened.transaction((tx) =>
      tx.query(sql('SELECT type,dedupe_key FROM dbo.notifications ORDER BY task_id')),
    );
    assert.deepEqual(
      n.map((r) => r.type),
      ['due_today', 'overdue', 'due_tomorrow'],
    );
    assert(n.every((r) => String(r.dedupe_key).endsWith(':2026-10-06')));
  });
  check(
    'T049 exclusions done/deleted/archived team/project/unassigned/inactive/no access/viewer',
    async (f) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=9'));
        await tx.execute(sql('UPDATE dbo.teams SET archived_at=@now WHERE id=2', { now }));
        await tx.execute(
          insert('projects', {
            name: 'Archived reminder',
            owner_team_id: 1,
            created_by: 1,
            archived_at: now,
          }),
        );
        for (const fields of [
          { status: 'done', completed_at: now },
          { deleted_at: now, deleted_by: 1 },
          { assignee_id: null },
          { assignee_id: 9 },
          { assignee_id: 7 },
          { assignee_id: 5 },
          { project_id: 2, assignee_id: 1 },
          { project_id: 3, assignee_id: 4 },
        ])
          await tx.execute(
            insert('tasks', {
              project_id: 1,
              title: 'Skip',
              creator_id: 1,
              assignee_id: 4,
              due_date: '2026-10-06',
              ...fields,
            }),
          );
      });
      assert.equal((await reminderService(f.db, () => new Date(now)).run()).inserted, 0);
    },
  );
  check('T049 midnight/leap/year boundaries and current-day-only catch-up', async (f) => {
    await f.db.transaction((tx) =>
      tx.execute(sql("UPDATE dbo.tasks SET due_date='2028-02-29' WHERE id=1")),
    );
    const clock = { value: '2028-02-27T16:59:59.999Z' },
      r = reminderService(f.db, () => new Date(clock.value));
    assert.equal((await r.run()).inserted, 0);
    clock.value = '2028-02-27T17:00:00.000Z';
    assert.equal((await r.run()).inserted, 1);
    clock.value = '2028-02-28T17:00:00.000Z';
    assert.equal((await r.run()).inserted, 1);
    clock.value = '2028-03-02T17:00:00.000Z';
    assert.equal((await r.run()).inserted, 1);
    let n = await rows(f, 'SELECT type,dedupe_key FROM dbo.notifications ORDER BY id');
    assert.deepEqual(
      n.map((x) => x.type),
      ['due_tomorrow', 'due_today', 'overdue'],
    );
    assert(String(n[2]!.dedupe_key).endsWith(':2028-03-03'));
    assert(!n.some((x) => String(x.dedupe_key).endsWith(':2028-03-01')));
    await f.db.transaction((tx) =>
      tx.execute(sql("UPDATE dbo.tasks SET due_date='2028-01-01' WHERE id=1")),
    );
    clock.value = '2027-12-31T16:59:59.999Z';
    assert.equal((await r.run()).inserted, 1);
    clock.value = '2027-12-31T17:00:00Z';
    assert.equal((await r.run()).inserted, 1);
    n = await rows(f, 'SELECT dedupe_key FROM dbo.notifications ORDER BY id');
    assert(String(n.at(-1)!.dedupe_key).endsWith(':2028-01-01'));
  });
  check(
    'T049 DB tuple dedupe per recipient/type/day, reassignment and changed due date',
    async (f) => {
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.tasks SET due_date='2026-10-06' WHERE id=1")),
      );
      const r = reminderService(f.db, () => new Date(now));
      await r.run();
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.tasks SET assignee_id=9 WHERE id=1')),
      );
      assert.equal((await r.run()).inserted, 1);
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.tasks SET due_date='2026-10-07' WHERE id=1")),
      );
      assert.equal((await r.run()).inserted, 1);
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.tasks SET assignee_id=4 WHERE id=1')),
      );
      assert.equal((await r.run()).inserted, 1);
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.tasks SET due_date='2026-10-06' WHERE id=1")),
      );
      assert.equal((await r.run()).inserted, 0);
      await f.db.transaction(async (tx) => {
        assert.equal(
          await persistNotification(tx, {
            task: 1,
            user: 4,
            type: 'due_today',
            key: 'due:1:4:due_today:2026-10-06',
            now,
          }),
          false,
        );
      });
      assert.equal((await rows(f, 'SELECT id FROM dbo.notifications')).length, 4);
    },
  );
  check('T049 keyset batches process every eligible row beyond 100', async (f) => {
    await f.db.transaction(async (tx) => {
      for (let i = 0; i < 205; i++)
        await tx.execute(
          insert('tasks', {
            project_id: 1,
            title: `Batch ${i}`,
            creator_id: 1,
            assignee_id: 4,
            due_date: '2026-10-06',
          }),
        );
    });
    const r = reminderService(f.db, () => new Date(now));
    assert.equal((await r.run()).inserted, 205);
    assert.equal((await r.run()).inserted, 0);
    assert.equal((await rows(f, 'SELECT id FROM dbo.notifications')).length, 205);
  });
  check(
    'T049 maintenance pauses business reminders; resume catches up current day only',
    async (f) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(sql("UPDATE dbo.tasks SET due_date='2026-10-06' WHERE id=1"));
        await tx.execute(
          insert('maintenance_state', {
            id: 1,
            owner_id: randomUUID(),
            state: 'frozen',
            lease_expires_at: '2026-10-06T01:00:00.000Z',
            created_at: now,
            updated_at: now,
          }),
        );
      });
      const r = reminderService(f.db, () => new Date(now));
      assert.equal((await r.run()).inserted, 0);
      await f.db.transaction((tx) => tx.execute(sql('DELETE FROM dbo.maintenance_state')));
      assert.equal((await r.run()).inserted, 1);
    },
  );
}
