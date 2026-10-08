import type { Database } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { utcNow, bangkokToday, addDays } from '../domain/dates.js';
import { sql } from '../repository/access-scope.js';
import { persistNotification } from './notifications.js';
import { retainNotifications } from './notification-center.js';
export function reminderService(database: Database, clock: () => Date = () => new Date()) {
  return {
    async run() {
      const now = utcNow(clock),
        today = bangkokToday(now),
        tomorrow = today === '9999-12-31' ? today : addDays(today, 1);
      let after = 0, afterUser = 0,
        inserted = 0;
      for (;;) {
        const page = await runTransaction(
          database,
          async (tx) => {
            if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
              return { rows: [], count: 0 };
            const query = sql(
              "SELECT t.id,u.id AS assignee_id,t.due_date FROM dbo.tasks t JOIN dbo.projects p ON p.id=t.project_id JOIN dbo.teams team ON team.id=p.owner_team_id JOIN dbo.users u ON (u.id=t.assignee_id OR EXISTS(SELECT 1 FROM dbo.task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=u.id)) WHERE (t.id>@after OR (t.id=@after AND u.id>@afterUser)) AND t.deleted_at IS NULL AND t.status<>'done' AND t.due_date<=@tomorrow AND p.archived_at IS NULL AND team.archived_at IS NULL AND u.active=1 AND (u.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=u.id AND m.team_role='lead') OR EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=u.id AND pm.access IN ('manager','editor'))) ORDER BY t.id,u.id",
              { after, afterUser, tomorrow },
            );
            const rows = await tx.query<{ id: number; assignee_id: number; due_date: string }>({
              ...query,
              sqlite: query.sqlite + ' LIMIT 100',
              sqlserver: query.sqlserver + ' OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY',
            });
            let count = 0;
            for (const row of rows) {
              const type =
                row.due_date < today
                  ? 'overdue'
                  : row.due_date === today
                    ? 'due_today'
                    : 'due_tomorrow';
              if (
                await persistNotification(tx, {
                  task: row.id,
                  user: row.assignee_id,
                  type,
                  key: `due:${row.id}:${row.assignee_id}:${type}:${today}`,
                  now,
                })
              )
                count++;
            }
            return { rows, count };
          },
          { idempotent: true },
        );
        inserted += page.count;
        if (!page.rows.length) break;
        after = page.rows.at(-1)!.id;
        afterUser = page.rows.at(-1)!.assignee_id;
        if (page.rows.length < 100) break;
      }
      return { inserted, today };
    },
  };
}
/** Independent of HTTP/GET/browser activity; caller already holds the instance guard. */
export async function startReminderScheduler(
  database: Database,
  options: {
    seconds: number;
    clock?: () => Date;
    log?: (event: { code: 'REMINDER_JOB_FAILED' }) => void;
    admit?: () => (() => void) | undefined;
  },
) {
  const service = reminderService(database, options.clock),
    log = () => {
      try {
        options.log?.({ code: 'REMINDER_JOB_FAILED' });
      } catch {
        /* never emit DB errors/secrets */
      }
    };
  let stopped = false,
    running: Promise<void> | undefined;
  const tick = () => {
    if (stopped || running) return running ?? Promise.resolve();
    const release = options.admit?.();
    if (options.admit && !release) return Promise.resolve();
    const work = service
      .run()
      .then(() => retainNotifications(database, options.clock))
      .then(() => {}, log);
    running = work;
    return work.finally(() => {
      release?.();
      if (running === work) running = undefined;
    });
  };
  await tick();
  const timer = setInterval(() => void tick(), options.seconds * 1000);
  timer.unref();
  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await running;
    },
  };
}
