import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiClient, ApiError, type Self } from './api';
import {
  notificationsPage,
  notificationSchema,
  notificationText,
  visibleProjects,
} from './report-api';
import { detailReply } from './task-api';
import { TaskEditor } from './TaskEditor';
import type { Project } from './workspace-api';
import { useSharedRefresh } from './shared/refresh';
import { Loading, ErrorNotice, EmptyState } from './shared/components';
const client = apiClient();
export function Notifications({
  self,
  online,
  onFailure,
}: {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const [data, setData] = useState<z.infer<typeof notificationsPage>>(),
    [page, setPage] = useState(1),
    [onlyUnread, setOnlyUnread] = useState(false),
    [error, setError] = useState<ApiError>(),
    [pending, setPending] = useState(false),
    [reload, setReload] = useState(0),
    [opened, setOpened] = useState<{ id: number; project: Project }>(),
    [notice, setNotice] = useState('');
  const busy = useRef(false),
    active = useRef<AbortController | null>(null);
  const read = useCallback(
    async (signal: AbortSignal) => {
      try {
        const r = await client.request(
          `/api/notifications?pageSize=50&page=${page}${onlyUnread ? '&unread=true' : ''}`,
          { signal, parse: (v) => notificationsPage.parse(v) },
        );
        if (!signal.aborted) {
          if (page > 1 && (page - 1) * 50 >= r.total) {
            setPage(1);
            return;
          }
          setData(r);
          setError(undefined);
        }
      } catch (e) {
        if (!signal.aborted && e instanceof ApiError) {
          setData(undefined);
          setError(e);
          onFailure(e);
        }
      }
    },
    [page, onlyUnread, onFailure],
  );
  useEffect(() => {
    const c = new AbortController();
    if (online)
      void Promise.resolve().then(() => {
        if (!c.signal.aborted) return read(c.signal);
      });
    return () => c.abort();
  }, [read, reload, online]);
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  useSharedRefresh(read, online, self.csrf + page + onlyUnread);
  const mark = async (id: number | null) => {
    if (busy.current || !online) return;
    busy.current = true;
    setPending(true);
    const c = new AbortController();
    active.current?.abort();
    active.current = c;
    try {
      await client.request(
        id === null ? '/api/notifications/read-all' : `/api/notifications/${id}/read`,
        {
          method: 'POST',
          csrf: self.csrf,
          signal: c.signal,
          parse: (v) =>
            id === null
              ? z
                  .object({
                    marked_count: z.number().int().min(0),
                    unread_count: z.number().int().min(0),
                  })
                  .strict()
                  .parse(v)
              : z.object({ item: notificationSchema }).strict().parse(v),
        },
      );
      if (!c.signal.aborted) {
        setPage(1);
        setReload((n) => n + 1);
      }
    } catch (e) {
      if (!c.signal.aborted && e instanceof ApiError) {
        setError(e);
        onFailure(e);
        if (e.status === 404) setReload((n) => n + 1);
      }
    } finally {
      if (!c.signal.aborted) setPending(false);
      busy.current = false;
    }
  };
  const open = async (id: number) => {
    if (busy.current || !online) return;
    busy.current = true;
    setPending(true);
    setNotice('');
    const c = new AbortController();
    active.current?.abort();
    active.current = c;
    try {
      const t = await client.request(`/api/tasks/${id}`, {
        signal: c.signal,
        parse: (v) => detailReply.parse(v),
      });
      const projects = await visibleProjects(c.signal, true);
      const project = projects.find((p) => p.id === t.item.project_id);
      if (!project) throw new ApiError('not-found', 404);
      if (!c.signal.aborted) setOpened({ id, project });
    } catch (e) {
      if (!c.signal.aborted && e instanceof ApiError) {
        if (e.status === 404) {
          setNotice('This task is unavailable or your access has changed');
          setReload((n) => n + 1);
        } else setError(e);
        onFailure(e);
      }
    } finally {
      if (!c.signal.aborted) setPending(false);
      busy.current = false;
    }
  };
  return (
    <div className="notification-center">
      <p className="muted">Notifications refresh while this page is open and online.</p>
      <div className="report-toolbar">
        <label>
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(e) => {
              setOnlyUnread(e.target.checked);
              setPage(1);
              setData(undefined);
            }}
          />
          Unread only
        </label>
        <button
          disabled={!online || pending || self.maintenance || !data?.unread_count}
          onClick={() => void mark(null)}
        >
          Mark all read
        </button>
        <span role="status">unread {data?.unread_count ?? '…'} items</span>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <ErrorNotice error={error} retry={() => setReload((n) => n + 1)} />}
      {!data && !error && online ? (
        <Loading />
      ) : data?.items.length === 0 ? (
        <EmptyState title="No notifications" />
      ) : (
        data && (
          <ul className="notification-list">
            {data.items.map((n) => (
              <li key={n.id} className={n.read_at ? '' : 'unread'}>
                <div>
                  <p>{notificationText(n)}</p>
                  <time dateTime={n.created_at}>
                    {new Date(n.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}
                  </time>
                  <span>{n.read_at ? ' · Read' : ' · Unread'}</span>
                </div>
                <button disabled={!online || pending} onClick={() => void open(n.task_id)}>
                  Open task #{n.task_id}
                </button>
                <button
                  disabled={!online || pending || self.maintenance || !!n.read_at}
                  onClick={() => void mark(n.id)}
                >
                  Read notification #{n.id}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      {data && (
        <div className="report-toolbar">
          <button
            disabled={page === 1 || pending}
            onClick={() => {
              setPage((n) => n - 1);
              setData(undefined);
            }}
          >
            Previous
          </button>
          <span>
            Page {page} · {data.total} items
          </span>
          <button
            disabled={page * 50 >= data.total || pending}
            onClick={() => {
              setPage((n) => n + 1);
              setData(undefined);
            }}
          >
            Next
          </button>
        </div>
      )}
      {opened && (
        <TaskEditor
          {...{ self, online, onFailure }}
          id={opened.id}
          project={opened.project}
          onClose={() => setOpened(undefined)}
          onDone={() => {
            setOpened(undefined);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
