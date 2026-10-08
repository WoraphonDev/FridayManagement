import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { apiClient, ApiError, type Self } from './api';
import { statusLabel, statuses, taskSchema } from './task-api';
import { useSharedRefresh } from './shared/refresh';
import { EmptyState, ErrorNotice, Loading } from './shared/components';
const client = apiClient();
const count = z.number().int().min(0);
export const overviewSchema = z
  .object({
    bangkok_today: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
    by_status: z.object({ todo: count, doing: count, review: count, done: count }).strict(),
    open_total: count,
    overdue: count,
    due_today: count,
    due_this_week: count,
    no_date: count,
    done_last_7_days: count,
    by_project: z
      .array(
        z
          .object({
            project_id: z.number().int().min(1),
            project_name: z.string().min(1).max(100),
            open_count: count,
          })
          .strict(),
      )
      .max(1000),
    next_up: z.array(taskSchema).max(5),
  })
  .strict();
type Overview = z.infer<typeof overviewSchema>;

/** FR-44 Home: every number comes from GET /api/me/overview (same scope as My work/reports). */
export function MyOverview({
  self,
  online,
  onFailure,
}: {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const [data, setData] = useState<Overview>(),
    [error, setError] = useState<ApiError>(),
    [reload, setReload] = useState(0);
  const read = useCallback(
    async (signal: AbortSignal) => {
      try {
        const v = await client.request('/api/me/overview', {
          signal,
          parse: (x) => overviewSchema.parse(x),
        });
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
    [onFailure],
  );
  useEffect(() => {
    const c = new AbortController();
    if (online)
      void Promise.resolve().then(() => {
        if (!c.signal.aborted) return read(c.signal);
      });
    return () => c.abort();
  }, [read, reload, online]);
  useSharedRefresh(read, online, self.csrf);
  if (error && !data) return <ErrorNotice error={error} retry={() => setReload((n) => n + 1)} />;
  if (!data) return <Loading />;
  const tiles: [string, number, string][] = [
    ['Overdue', data.overdue, 'overdue'],
    ['Due today', data.due_today, 'today'],
    ['This week', data.due_this_week, 'this_week'],
    ['No date', data.no_date, 'none'],
    ['Done in 7 days', data.done_last_7_days, 'done'],
  ];
  const max = Math.max(1, ...statuses.map((s) => data.by_status[s]));
  return (
    <section className="my-overview" aria-labelledby="my-overview-title">
      <h2 id="my-overview-title">Good to see you, {self.user.display_name}</h2>
      <p className="hint">
        My overview · {data.open_total} open tasks assigned to you · {data.bangkok_today}
      </p>
      <div className="overview-tiles">
        {tiles.map(([label, value, group]) => (
          <Link
            key={group}
            className={`overview-tile tile-${group}`}
            to={`/my-tasks#my-group-${group}`}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </Link>
        ))}
      </div>
      <div className="overview-panels">
        <section aria-labelledby="ov-status">
          <h3 id="ov-status">My tasks by status</h3>
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
        <section aria-labelledby="ov-projects">
          <h3 id="ov-projects">Open work by project</h3>
          {data.by_project.length ? (
            <ul className="overview-list">
              {data.by_project.map((p) => (
                <li key={p.project_id}>
                  <Link to={`/projects?project=${p.project_id}`}>{p.project_name}</Link>
                  <strong>{p.open_count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No assigned work yet" />
          )}
        </section>
        <section aria-labelledby="ov-next">
          <h3 id="ov-next">Up next</h3>
          {data.next_up.length ? (
            <ol className="overview-list">
              {data.next_up.map((t) => (
                <li key={t.id}>
                  <Link to={`/projects/${t.project_id}/tasks/${t.id}`}>{t.title}</Link>
                  <span className={t.overdue ? 'overdue' : ''}>{t.due_date ?? 'No date'}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Nothing assigned — enjoy the calm" />
          )}
        </section>
      </div>
    </section>
  );
}
