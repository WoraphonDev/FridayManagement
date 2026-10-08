import type { Transaction } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import { taskQuery } from '../repository/task-query.js';
import { addDays, bangkokToday, utcNow } from '../domain/dates.js';
import { mondayOf, weekIndexes } from '../domain/workload.js';
import {
  currentActor,
  projectAccess,
  type AccessOptions,
  type SessionProof,
} from './authorization.js';

type ScopedTask = {
  id: number;
  project_id: number;
  title: string;
  status: string;
  start_date: string | null;
  due_date: string | null;
  assignee_id: number | null;
};
type Person = { id: number; display_name: string; active: boolean };
const open = ['todo', 'doing', 'review'];
const taskLimit = 5000;

/**
 * FR-50 workload and FR-51 project overview (SRS §9.9). Every number is computed from the
 * same visibility filter as My work/reports (taskQuery), so no view widens access (BR-16).
 */
export function insightService(options: AccessOptions = {}) {
  const scoped = async (tx: Transaction, viewer: number, input: Record<string, unknown>) => {
    const filter = taskQuery(viewer, input).filter;
    const select =
      'SELECT t.id,t.project_id,t.title,t.status,t.start_date,t.due_date,t.assignee_id ';
    const rows = await tx.query<ScopedTask>({
      ...filter,
      sqlite: sql(select).sqlite + filter.sqlite + ' ORDER BY t.id',
      sqlserver: select + filter.sqlserver + ' ORDER BY t.id',
    });
    const assignees = new Map<number, number[]>();
    if (rows.length) {
      const pick =
        'SELECT ta.task_id,ta.user_id FROM dbo.task_assignees ta WHERE ta.task_id IN (SELECT t.id ';
      const links = await tx.query<{ task_id: number; user_id: number }>({
        ...filter,
        sqlite: sql(pick).sqlite + filter.sqlite + ') ORDER BY ta.user_id',
        sqlserver: pick + filter.sqlserver + ') ORDER BY ta.user_id',
      });
      for (const l of links)
        assignees.set(l.task_id, [...(assignees.get(l.task_id) ?? []), l.user_id]);
    }
    // Legacy single-assignee rows fall back to assignee_id, like assignmentIds().
    const who = (t: ScopedTask) => assignees.get(t.id) ?? (t.assignee_id ? [t.assignee_id] : []);
    return { rows, who };
  };
  const people = async (tx: Transaction, ids: number[]) => {
    const unique = [...new Set(ids)];
    const map = new Map<number, { person: Person; job_title: string | null }>();
    for (let i = 0; i < unique.length; i += 100) {
      const chunk = unique.slice(i, i + 100);
      const params = Object.fromEntries(chunk.map((id, n) => [`u${n}`, id]));
      const rows = await tx.query<{
        id: number;
        display_name: string;
        active: number;
        job_title: string | null;
      }>(
        sql(
          `SELECT u.id,u.display_name,u.active,jt.name AS job_title FROM dbo.users u LEFT JOIN dbo.job_titles jt ON jt.id=u.job_title_id WHERE u.id IN (${chunk.map((_, n) => `@u${n}`).join(',')})`,
          params,
        ),
      );
      for (const r of rows)
        map.set(r.id, {
          person: { id: r.id, display_name: r.display_name, active: !!r.active },
          job_title: r.job_title ?? null,
        });
    }
    return map;
  };
  const threshold = async (tx: Transaction) =>
    Number(
      (
        await tx.query<{ workload_threshold: number }>(
          sql('SELECT workload_threshold FROM dbo.organizations WHERE id=1'),
        )
      )[0]?.workload_threshold ?? 10,
    );
  const byName = (a: { user: Person | null }, b: { user: Person | null }) =>
    !a.user
      ? 1
      : !b.user
        ? -1
        : a.user.display_name.localeCompare(b.user.display_name, 'th') || a.user.id - b.user.id;
  return {
    async workload(
      tx: Transaction,
      proof: SessionProof,
      scope: 'project' | 'team',
      id: number,
      q: Record<string, unknown>,
    ) {
      const actor = await currentActor(tx, proof, false, options);
      if (scope === 'project') await projectAccess(tx, actor, id);
      const today = bangkokToday(utcNow(options.clock));
      const first = mondayOf(typeof q.from === 'string' ? q.from : today);
      const count = Number(q.weeks ?? 6);
      const weeks = Array.from({ length: count }, (_, i) => addDays(first, i * 7));
      const { rows, who } = await scoped(tx, actor.id, { [scope]: id, status: open });
      const truncated = rows.length > taskLimit;
      const tasks = rows.slice(0, taskLimit);
      const directory = await people(tx, tasks.flatMap(who));
      const table = new Map<number | null, ReturnType<typeof row>>();
      function row(user: number | null) {
        const known = user === null ? undefined : directory.get(user);
        return {
          user: known?.person ?? null,
          job_title: known?.job_title ?? null,
          counts: weeks.map(() => 0),
          no_date: 0,
          tasks: [] as Pick<
            ScopedTask,
            'id' | 'project_id' | 'title' | 'start_date' | 'due_date'
          >[],
        };
      }
      let rowTruncated = false;
      for (const t of tasks) {
        const hits = weekIndexes(t, weeks);
        const users = who(t);
        for (const user of users.length ? users : [null]) {
          if (user !== null && !directory.has(user)) continue;
          const r = table.get(user) ?? row(user);
          table.set(user, r);
          if (hits === null) r.no_date++;
          else for (const i of hits) r.counts[i]!++;
          if (hits === null || hits.length) {
            if (r.tasks.length < 1000)
              r.tasks.push({
                id: t.id,
                project_id: t.project_id,
                title: t.title,
                start_date: t.start_date,
                due_date: t.due_date,
              });
            else rowTruncated = true;
          }
        }
      }
      return {
        scope,
        scope_id: id,
        threshold: await threshold(tx),
        weeks,
        rows: [...table.values()].sort(byName).slice(0, 1000),
        truncated: truncated || rowTruncated || table.size > 1000,
      };
    },
    async overview(tx: Transaction, proof: SessionProof, id: number) {
      const actor = await currentActor(tx, proof, false, options);
      await projectAccess(tx, actor, id);
      const today = bangkokToday(utcNow(options.clock));
      const { rows, who } = await scoped(tx, actor.id, { project: id });
      const directory = await people(tx, rows.flatMap(who));
      const by_status = { todo: 0, doing: 0, review: 0, done: 0 };
      const assignees = new Map<
        number | null,
        { user: Person | null; job_title: string | null; open: number; done: number }
      >();
      const titles = new Map<
        string | null,
        { job_title: string | null; open: number; done: number }
      >();
      const overdue: ScopedTask[] = [];
      for (const t of rows) {
        by_status[t.status as keyof typeof by_status]++;
        const done = t.status === 'done';
        if (!done && t.due_date && t.due_date < today) overdue.push(t);
        const users = who(t);
        for (const user of users.length ? users : [null]) {
          const known = user === null ? undefined : directory.get(user);
          const a = assignees.get(user) ?? {
            user: known?.person ?? null,
            job_title: known?.job_title ?? null,
            open: 0,
            done: 0,
          };
          a[done ? 'done' : 'open']++;
          assignees.set(user, a);
          const title = known?.job_title ?? null;
          const j = titles.get(title) ?? { job_title: title, open: 0, done: 0 };
          j[done ? 'done' : 'open']++;
          titles.set(title, j);
        }
      }
      overdue.sort((a, b) => a.due_date!.localeCompare(b.due_date!) || a.id - b.id);
      const events = await tx.query<{
        task_id: number;
        task_title: string;
        actor_id: number;
        action: string;
        created_at: string;
      }>({
        sqlite:
          'SELECT e.task_id,t.title AS task_title,e.actor_id,e.action,e.created_at FROM task_events e JOIN tasks t ON t.id=e.task_id WHERE t.project_id=$project AND t.deleted_at IS NULL AND e.actor_id IS NOT NULL ORDER BY e.id DESC LIMIT 10',
        sqlserver:
          'SELECT TOP 10 e.task_id,t.title AS task_title,e.actor_id,e.action,e.created_at FROM dbo.task_events e JOIN dbo.tasks t ON t.id=e.task_id WHERE t.project_id=@project AND t.deleted_at IS NULL AND e.actor_id IS NOT NULL ORDER BY e.id DESC',
        parameters: { project: id },
      });
      const actors = await people(
        tx,
        events.map((e) => e.actor_id),
      );
      const total = rows.length;
      return {
        project_id: id,
        bangkok_today: today,
        total,
        done: by_status.done,
        progress_percent: total ? Math.round((by_status.done / total) * 100) : 0,
        by_status,
        overdue: overdue.length,
        overdue_tasks: overdue.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title,
          due_date: t.due_date,
          status: t.status,
        })),
        by_assignee: [...assignees.values()].sort(byName).slice(0, 1000),
        by_job_title: [...titles.values()]
          .sort((a, b) =>
            a.job_title === null
              ? 1
              : b.job_title === null
                ? -1
                : a.job_title.localeCompare(b.job_title),
          )
          .slice(0, 1000),
        recent_activity: events
          .filter((e) => actors.has(e.actor_id))
          .map((e) => ({
            task_id: e.task_id,
            task_title: e.task_title,
            actor: actors.get(e.actor_id)!.person,
            action: e.action,
            created_at: e.created_at,
          })),
      };
    },
  };
}
