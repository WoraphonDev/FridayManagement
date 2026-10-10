import { formatPlanDate } from './shared/formatPlanDate';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, ApiError, type Self } from './api';
import { statusLabel, statuses } from './task-api';
import { dateAdd } from './task-dates';
import { Count } from './shared/Count';
import { UiIcon } from './shared/UiIcon';
import { taskPage } from './task-api';
import { useSharedRefresh } from './shared/refresh';
import { Dialog, EmptyState, ErrorNotice, Loading } from './shared/components';
import {
  cellTasks,
  overThreshold,
  overviewSchema,
  workloadSchema,
  type ProjectOverviewData,
  type Workload,
} from './insights-api';
const client = apiClient();
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** FR-50 table body; pure so thresholds and cell links can be verified without the network. */
export function WorkloadTable({
  data,
  onOpen,
}: {
  data: Workload;
  onOpen: (title: string, tasks: Workload['rows'][number]['tasks']) => void;
}) {
  if (!data.rows.length) return <EmptyState title="No open work in these weeks" />;
  return (
    <div className="table-scroll" role="region" aria-label="Workload table" tabIndex={0}>
      <table className="workload-table">
        <caption>Open tasks per person per week · highlighted above {data.threshold}</caption>
        <thead>
          <tr>
            <th scope="col">Person</th>
            {data.weeks.map((w) => (
              <th scope="col" key={w}>
                {shortDate(w)}–{shortDate(dateAdd(w, 6))}
              </th>
            ))}
            <th scope="col">No date</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => {
            const who = r.user?.display_name ?? 'Unassigned';
            return (
              <tr key={r.user?.id ?? 'none'}>
                <th scope="row">
                  {who}
                  {r.job_title && <span className="job-title-badge">{r.job_title}</span>}
                </th>
                {r.counts.map((n, i) => {
                  const over = overThreshold(n, data.threshold);
                  return (
                    <td key={data.weeks[i]} className={over ? 'workload-over' : undefined}>
                      {n ? (
                        <button
                          aria-label={`${who}: ${n} tasks in week of ${data.weeks[i]}${over ? ', over threshold' : ''}`}
                          onClick={() =>
                            onOpen(
                              `${who} · week of ${shortDate(data.weeks[i]!)}`,
                              cellTasks(r, data.weeks[i]!),
                            )
                          }
                        >
                          {n}
                        </button>
                      ) : (
                        <span aria-hidden="true">·</span>
                      )}
                    </td>
                  );
                })}
                <td>
                  {r.no_date ? (
                    <button
                      aria-label={`${who}: ${r.no_date} tasks with no date`}
                      onClick={() => onOpen(`${who} · no date`, cellTasks(r, null))}
                    >
                      {r.no_date}
                    </button>
                  ) : (
                    <span aria-hidden="true">·</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** FR-50 Workload for one project or (Admin/Lead/P-09) one team; read-only, not time tracking. */
export function WorkloadView({
  scope,
  id,
  self,
  online,
  onFailure,
}: {
  scope: 'project' | 'team';
  id: number;
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const [from, setFrom] = useState(self.bangkok_today),
    [data, setData] = useState<Workload>(),
    [error, setError] = useState<ApiError>(),
    [cell, setCell] = useState<{ title: string; tasks: Workload['rows'][number]['tasks'] }>();
  const read = useCallback(
    async (signal: AbortSignal) => {
      try {
        const v = await client.request(
          `/api/${scope === 'project' ? 'projects' : 'teams'}/${id}/workload?from=${from}&weeks=6`,
          { signal, parse: (x) => workloadSchema.parse(x) },
        );
        if (!signal.aborted) {
          setData(v);
          setError(undefined);
        }
      } catch (e) {
        if (!signal.aborted && e instanceof ApiError) {
          setError(e);
          onFailure(e);
        }
      }
    },
    [scope, id, from, onFailure],
  );
  useEffect(() => {
    const c = new AbortController();
    if (online)
      void Promise.resolve().then(() => {
        if (!c.signal.aborted) return read(c.signal);
      });
    return () => c.abort();
  }, [read, online]);
  useSharedRefresh(read, online, self.csrf);
  return (
    <section
      className="workload-view"
      aria-label={scope === 'project' ? 'Project workload' : 'Team workload'}
    >
      <div className="calendar-toolbar">
        <button
          className="icon-button"
          aria-label="Previous week"
          onClick={() => setFrom(dateAdd(data?.weeks[0] ?? from, -7))}
        >
          ‹
        </button>
        <strong className="calendar-month">Open tasks per week</strong>
        <button
          className="icon-button"
          aria-label="Next week"
          onClick={() => setFrom(dateAdd(data?.weeks[0] ?? from, 7))}
        >
          ›
        </button>
        {data && (
          <span className="calendar-hint">Highlighted above {data.threshold} open tasks</span>
        )}
        <button onClick={() => setFrom(self.bangkok_today)}>This week</button>
      </div>
      {error && !data ? (
        <ErrorNotice error={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          {data.truncated && <p role="status">Showing the first 5,000 open tasks.</p>}
          <WorkloadTable data={data} onOpen={(title, tasks) => setCell({ title, tasks })} />
        </>
      )}
      {cell && (
        <Dialog title={cell.title} onClose={() => setCell(undefined)}>
          <ul className="overview-list">
            {cell.tasks.map((t) => (
              <li key={t.id}>
                <Link to={`/projects/${t.project_id}/tasks/${t.id}`}>{t.title}</Link>
                <span>
                  {t.start_date ?? '—'} → {t.due_date ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </section>
  );
}

/** FR-51 body; pure for verification. */
export type DueCounts = {
  due_today: number;
  due_this_week: number;
  no_date: number;
  done_last_7_days: number;
};
const dueTiles: [string, keyof DueCounts | 'overdue', string, string, string][] = [
  ['Overdue', 'overdue', 'overdue', 'history', 'Past due and unfinished'],
  ['Due today', 'due_today', 'today', 'calendar', 'Ready for today'],
  ['Later this week', 'due_this_week', 'this_week', 'workload', 'After today, this week'],
  ['No date', 'no_date', 'none', 'file', 'Without a due date'],
  ['Done in 7 days', 'done_last_7_days', 'done', 'check', 'Completed in the last 7 days'],
];
export function OverviewBody({ data, due }: { data: ProjectOverviewData; due?: DueCounts }) {
  const max = Math.max(1, ...statuses.map((s) => data.by_status[s]));
  return (
    <div className="project-overview-body">
      {due && (
        <div className="overview-tiles project-due-tiles" aria-label="Due summary">
          {dueTiles.map(([label, key, group, icon, hint], index) => (
            <div
              key={group}
              className={`overview-tile tile-${group}`}
              style={{ '--report-delay': `${index * 45}ms` } as CSSProperties}
            >
              <span className="overview-tile-heading">
                {label}
                <span className="overview-tile-icon">
                  <UiIcon name={icon} />
                </span>
              </span>
              <strong>
                <Count value={key === 'overdue' ? data.overdue : due[key]} />
              </strong>
              <small>{hint}</small>
            </div>
          ))}
        </div>
      )}
      <div className="overview-tiles">
        <div className="overview-tile">
          <span>Progress</span>
          <strong>
            <Count value={data.progress_percent} suffix="%" />
          </strong>
          <progress max={100} value={data.progress_percent} aria-label="Progress" />
          <small>
            {data.done} of {data.total} tasks done
          </small>
        </div>
        {!due && (
          <div className={`overview-tile ${data.overdue ? 'tile-overdue' : ''}`}>
            <span>Overdue</span>
            <strong>
              <Count value={data.overdue} />
            </strong>
          </div>
        )}
      </div>
      <div className="overview-panels">
        <section aria-labelledby="po-status">
          <h3 id="po-status">Tasks by status</h3>
          {statuses.map((s) => (
            <div className="overview-bar" key={s}>
              <span>{statusLabel[s]}</span>
              <span
                className={`bar status-${s}`}
                style={{ width: `${(data.by_status[s] / max) * 100}%` }}
              />
              <strong>{data.by_status[s]}</strong>
            </div>
          ))}
        </section>
        <section aria-labelledby="po-overdue">
          <h3 id="po-overdue">Overdue tasks</h3>
          {data.overdue_tasks.length ? (
            <ol className="overview-list">
              {data.overdue_tasks.map((t) => (
                <li key={t.id}>
                  <Link to={`/projects/${data.project_id}/tasks/${t.id}`}>{t.title}</Link>
                  <span className="overdue">
                    {t.due_date ? formatPlanDate(t.due_date) : 'No date'}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Nothing overdue" />
          )}
        </section>
        <section aria-labelledby="po-people">
          <h3 id="po-people">By assignee</h3>
          <table className="compact-table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Open</th>
                <th scope="col">Done</th>
              </tr>
            </thead>
            <tbody>
              {data.by_assignee.map((a) => (
                <tr key={a.user?.id ?? 'none'}>
                  <th scope="row">
                    {a.user?.display_name ?? 'Unassigned'}
                    {a.job_title && <span className="job-title-badge">{a.job_title}</span>}
                  </th>
                  <td>{a.open}</td>
                  <td>{a.done}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section aria-labelledby="po-titles">
          <h3 id="po-titles">By job title</h3>
          <table className="compact-table">
            <thead>
              <tr>
                <th scope="col">Job title</th>
                <th scope="col">Open</th>
                <th scope="col">Done</th>
              </tr>
            </thead>
            <tbody>
              {data.by_job_title.map((j) => (
                <tr key={j.job_title ?? 'none'}>
                  <th scope="row">{j.job_title ?? 'No job title'}</th>
                  <td>{j.open}</td>
                  <td>{j.done}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section aria-labelledby="po-activity" className="overview-activity">
          <h3 id="po-activity">Recent activity</h3>
          {data.recent_activity.length ? (
            <ol className="overview-list">
              {data.recent_activity.map((e, i) => (
                <li key={`${e.task_id}-${e.created_at}-${i}`}>
                  <span>
                    {e.actor.display_name} · {e.action.replace(/_/g, ' ')} ·{' '}
                    <Link to={`/projects/${data.project_id}/tasks/${e.task_id}`}>
                      {e.task_title}
                    </Link>
                  </span>
                  <small>
                    {new Date(e.created_at).toLocaleString('en-GB', {
                      timeZone: 'Asia/Bangkok',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No activity yet" />
          )}
        </section>
      </div>
    </div>
  );
}

/** FR-51 Project overview tab; same visibility as the project's task list. */
export function ProjectOverview({
  projectId,
  self,
  online,
  onFailure,
}: {
  projectId: number;
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const [data, setData] = useState<ProjectOverviewData>(),
    [due, setDue] = useState<DueCounts>(),
    [error, setError] = useState<ApiError>();
  const read = useCallback(
    async (signal: AbortSignal) => {
      try {
        const v = await client.request(`/api/projects/${projectId}/overview`, {
          signal,
          parse: (x) => overviewSchema.parse(x),
        });
        // Same buckets as Home (Monday-start Bangkok week), counted with /api/tasks totals.
        const today = v.bangkok_today;
        const sinceMonday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
        const open = 'status=todo&status=doing&status=review';
        const count = (query: string) =>
          client
            .request(`/api/tasks?project=${projectId}&pageSize=1&${query}`, {
              signal,
              parse: (x) => taskPage.parse(x),
            })
            .then((r) => r.total);
        const [due_today, due_this_week, no_date, done_last_7_days] = await Promise.all([
          count(`${open}&due_from=${today}&due_to=${today}`),
          sinceMonday === 6
            ? Promise.resolve(0)
            : count(
                `${open}&due_from=${dateAdd(today, 1)}&due_to=${dateAdd(today, 6 - sinceMonday)}`,
              ),
          count(`${open}&has_due=false`),
          count(`status=done&date_basis=completed&date_from=${dateAdd(today, -6)}&date_to=${today}`),
        ]);
        if (!signal.aborted) {
          setData(v);
          setDue({ due_today, due_this_week, no_date, done_last_7_days });
          setError(undefined);
        }
      } catch (e) {
        if (!signal.aborted && e instanceof ApiError) {
          setError(e);
          onFailure(e);
        }
      }
    },
    [projectId, onFailure],
  );
  useEffect(() => {
    const c = new AbortController();
    if (online)
      void Promise.resolve().then(() => {
        if (!c.signal.aborted) return read(c.signal);
      });
    return () => c.abort();
  }, [read, online]);
  useSharedRefresh(read, online, self.csrf);
  return (
    <section className="project-overview" aria-label="Project overview">
      {error && !data ? (
        <ErrorNotice error={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <OverviewBody data={data} due={due} />
      )}
    </section>
  );
}
