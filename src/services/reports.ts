import { PassThrough } from 'node:stream';
import type { Database, Transaction, Statement } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { currentActor, type SessionProof, type AccessOptions } from './authorization.js';
import { taskQuery } from '../repository/task-query.js';
import { sql } from '../repository/access-scope.js';
import { utcNow, bangkokToday, addDays } from '../domain/dates.js';
import { operations, parseSchema } from '../api/contract.js';
import { ApiFault } from '../api/errors.js';
export const csvCell = (value: unknown) => {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@]|^[\t\r]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export const csvColumns = [
  'id',
  'title',
  'project',
  'owner_team',
  'status',
  'priority',
  'assignee',
  'assignee_job_title',
  'start_date',
  'due_date',
  'category',
  'created_at',
  'completed_at',
] as const;
export function reportService(database: Database, options: AccessOptions = {}) {
  const filterFor = async (
    tx: Transaction,
    proof: SessionProof,
    input: Record<string, unknown>,
  ) => {
    parseSchema(
      operations.find((o) => o.path === '/api/reports/summary')!.operation['x-query-schema'],
      input,
    );
    const actor = await currentActor(tx, proof, false, options),
      now = utcNow(options.clock),
      today = bangkokToday(now);
    const query: Record<string, unknown> = { ...input, date_basis: input.date_basis ?? 'created' };
    // Omitting both ends means the current Bangkok month. Explicit one-sided ranges stay one-sided.
    if (!input.date_from && !input.date_to) {
      const first = today.slice(0, 7) + '-01',
        year = Number(today.slice(0, 4)),
        month = Number(today.slice(5, 7));
      Object.assign(query, {
        date_from: first,
        date_to:
          month === 12 && year === 9999
            ? '9999-12-31'
            : addDays(
                `${String(year + Number(month === 12)).padStart(4, '0')}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`,
                -1,
              ),
      });
    }
    const base = taskQuery(actor.id, query).filter;
    const filter = {
      ...base,
      sqlite: base.sqlite + ' AND p.archived_at IS NULL AND owner_team.archived_at IS NULL',
      sqlserver: base.sqlserver + ' AND p.archived_at IS NULL AND owner_team.archived_at IS NULL',
    };
    const statement = (
      select: string,
      tail = '',
      extra: Statement['parameters'] = {},
    ): Statement => ({
      sqlite: sql(select).sqlite + filter.sqlite + sql(tail).sqlite,
      sqlserver: select + filter.sqlserver + tail,
      parameters: { ...filter.parameters, ...extra },
    });
    const count = async () =>
      (await tx.query<{ total: number }>(statement('SELECT COUNT(*) AS total ')))[0]!.total;
    return { query, now, today, statement, count };
  };
  return {
    async summary(tx: Transaction, proof: SessionProof, input: Record<string, unknown>) {
      const f = await filterFor(tx, proof, input),
        total = await f.count();
      const statuses = await tx.query<{ status: string; count: number }>(
        f.statement('SELECT t.status,COUNT(*) AS count ', ' GROUP BY t.status'),
      );
      const by_status = { todo: 0, doing: 0, review: 0, done: 0 };
      for (const r of statuses) by_status[r.status as keyof typeof by_status] = r.count;
      const metrics = (
        await tx.query<{ overdue: number; unassigned: number }>(
          f.statement(
            "SELECT COALESCE(SUM(CASE WHEN t.status<>'done' AND t.due_date<@today THEN 1 ELSE 0 END),0) AS overdue,COALESCE(SUM(CASE WHEN t.status<>'done' AND t.assignee_id IS NULL THEN 1 ELSE 0 END),0) AS unassigned ",
            '',
            { today: f.today },
          ),
        )
      )[0]!;
      // Done-in-period always uses completed timestamps, independently of the selected basis.
      const dates = taskQuery(Number(f.statement('').parameters!.viewer), {
        date_basis: 'completed',
        ...(f.query.date_from ? { date_from: f.query.date_from } : {}),
        ...(f.query.date_to ? { date_to: f.query.date_to } : {}),
      }).filter.parameters!;
      const done_in_period = (
        await tx.query<{ total: number }>(
          f.statement(
            'SELECT COUNT(*) AS total ',
            " AND t.status='done'" +
              (dates.date_from ? ' AND t.completed_at>=@doneFrom' : '') +
              (dates.date_to ? ' AND t.completed_at<@doneTo' : ''),
            {
              ...(dates.date_from ? { doneFrom: dates.date_from } : {}),
              ...(dates.date_to ? { doneTo: dates.date_to } : {}),
            },
          ),
        )
      )[0]!.total;
      const workloadQuery = f.statement(
          "SELECT COALESCE(ta.user_id,t.assignee_id) AS assignee_id,(SELECT u.display_name FROM dbo.users u WHERE u.id=COALESCE(ta.user_id,t.assignee_id)) AS display_name,(SELECT u.active FROM dbo.users u WHERE u.id=COALESCE(ta.user_id,t.assignee_id)) AS active,(SELECT jt.name FROM dbo.users u JOIN dbo.job_titles jt ON jt.id=u.job_title_id WHERE u.id=COALESCE(ta.user_id,t.assignee_id)) AS job_title,SUM(CASE WHEN t.status<>'done' THEN 1 ELSE 0 END) AS open_count ",
          ' GROUP BY COALESCE(ta.user_id,t.assignee_id) ORDER BY COALESCE(ta.user_id,t.assignee_id)',
        );
      workloadQuery.sqlite = workloadQuery.sqlite.replace('FROM tasks t','FROM tasks t LEFT JOIN task_assignees ta ON ta.task_id=t.id');
      workloadQuery.sqlserver = workloadQuery.sqlserver.replace('FROM dbo.tasks t','FROM dbo.tasks t LEFT JOIN dbo.task_assignees ta ON ta.task_id=t.id');
      const workloadRows = await tx.query<{
        assignee_id: number | null;
        display_name: string | null;
        active: number | null;
        job_title: string | null;
        open_count: number;
      }>(
        workloadQuery,
      );
      return {
        metadata: {
          date_basis: f.query.date_basis,
          date_from: f.query.date_from ?? null,
          date_to: f.query.date_to ?? null,
          timezone: 'Asia/Bangkok',
          generated_at: f.now,
        },
        total,
        by_status,
        ...metrics,
        done_in_period,
        completion_percentage: total ? (by_status.done / total) * 100 : 0,
        workload: workloadRows.map((r) => ({
          assignee:
            r.assignee_id === null
              ? null
              : { id: r.assignee_id, display_name: r.display_name, active: !!r.active },
          job_title: r.assignee_id === null ? null : r.job_title,
          open_count: r.open_count,
        })),
      };
    },
    async export(tx: Transaction, proof: SessionProof, input: Record<string, unknown>) {
      const f = await filterFor(tx, proof, input);
      if ((await f.count()) > 50000) throw new ApiFault('EXPORT_LIMIT_EXCEEDED');
      return {
        name: `friday-tasks-${f.query.date_basis}-${f.query.date_from ?? 'start'}-${f.query.date_to ?? 'end'}.csv`,
        open: async () => {
          const stream = new PassThrough({ highWaterMark: 32768 });
          // A second authorization/count before any HTTP headers, inside the streaming snapshot.
          let ready!: () => void, fail!: (e: unknown) => void;
          const prepared = new Promise<void>((resolve, reject) => {
            ready = resolve;
            fail = reject;
          });
          const work = runTransaction(database, async (current) => {
            const scope = await filterFor(current, proof, input);
            if ((await scope.count()) > 50000) throw new ApiFault('EXPORT_LIMIT_EXCEEDED');
            ready();
            const write = (chunk: string) =>
              new Promise<void>((resolve, reject) =>
                stream.write(chunk, 'utf8', (e) => (e ? reject(e) : resolve())),
              );
            await write('\uFEFF' + csvColumns.map(csvCell).join(',') + '\r\n');
            let after = 0;
            for (;;) {
              const q = scope.statement(
                'SELECT t.id,t.title,p.name AS project,owner_team.name AS owner_team,t.status,t.priority,(SELECT u.display_name FROM dbo.users u WHERE u.id=t.assignee_id) AS assignee,(SELECT jt.name FROM dbo.users u JOIN dbo.job_titles jt ON jt.id=u.job_title_id WHERE u.id=t.assignee_id) AS assignee_job_title,t.start_date,t.due_date,t.category,t.created_at,t.completed_at ',
                ' AND t.id>@after ORDER BY t.id',
                { after },
              );
              const rows = await current.query({
                ...q,
                sqlite: q.sqlite + ' LIMIT 100',
                sqlserver: q.sqlserver + ' OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY',
              });
              if (!rows.length) break;
              const parameters = Object.fromEntries(rows.map((r,i)=>['csvId'+i,Number(r.id)]));
              const recipients = await current.query<{task_id:number;display_name:string;job_title:string|null}>(sql('SELECT ta.task_id,u.display_name,(SELECT jt.name FROM dbo.job_titles jt WHERE jt.id=u.job_title_id) AS job_title FROM dbo.task_assignees ta JOIN dbo.users u ON u.id=ta.user_id WHERE ta.task_id IN ('+rows.map((_,i)=>'@csvId'+i).join(',')+') ORDER BY ta.task_id,ta.user_id',parameters));
              for (const row of rows) {
                const own = recipients.filter(r=>r.task_id===row.id);
                if (own.length) {
                  row.assignee=own.map(r=>r.display_name).join(', ');
                  // FR-41: title column aligned with the assignee list; blank when none set.
                  row.assignee_job_title=own.map(r=>r.job_title ?? '').join(', ');
                }
              }

              await write(
                rows
                  .map((row) => csvColumns.map((c) => csvCell(row[c])).join(',') + '\r\n')
                  .join(''),
              );
              after = Number(rows.at(-1)!.id);
            }
          });
          void work.then(
            () => stream.end(),
            (e) => {
              fail(e);
              stream.destroy(e instanceof Error ? e : new Error('EXPORT_FAILED'));
            },
          );
          // Avoid an unhandled stream error while open() has not returned yet.
          stream.on('error', () => {});
          await prepared;
          return stream;
        },
      };
    },
  };
}
