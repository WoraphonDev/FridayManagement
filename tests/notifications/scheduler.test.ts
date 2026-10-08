import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { sqliteFixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { startReminderScheduler } from '../../src/services/reminders.js';
import type { Database } from '../../src/domain/database.js';
test('T049 scheduler starts immediately, retries safe failure without overlap, stop waits and clears timer', async () => {
  const f = await sqliteFixture();
  let calls = 0,
    active = 0,
    max = 0;
  const logs: unknown[] = [];
  let job: Awaited<ReturnType<typeof startReminderScheduler>> | undefined;
  try {
    await f.db.transaction((tx) =>
      tx.execute(sql("UPDATE dbo.tasks SET assignee_id=1,due_date='2026-10-06' WHERE id=1")),
    );
    const db: Database = {
      provider: f.db.provider,
      close: () => f.db.close(),
      transaction: async (work) => {
        calls++;
        if (calls === 1) throw new Error('SENSITIVE database failure text');
        active++;
        max = Math.max(max, active);
        try {
          await delay(1200);
          return await f.db.transaction(work);
        } finally {
          active--;
        }
      },
    };
    job = await startReminderScheduler(db, {
      seconds: 1,
      clock: () => new Date('2026-10-06T00:00:00Z'),
      log: (e) => logs.push(e),
    });
    assert.equal(calls, 1);
    assert.deepEqual(logs, [{ code: 'REMINDER_JOB_FAILED' }]);
    const until = Date.now() + 5000;
    while (Date.now() < until) {
      const n = await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.notifications')));
      if (n.length) break;
      await delay(100);
    }
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.notifications')))).length,
      1,
    );
    assert.equal(max, 1);
    await job.stop();
    job = undefined;
    const stopped = calls;
    await delay(1100);
    assert.equal(calls, stopped);
    assert.equal(active, 0);
  } finally {
    await job?.stop();
    await f.close();
  }
});
