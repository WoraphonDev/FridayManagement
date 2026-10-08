import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError, type Self } from './api';
import { notificationsPage, notificationText } from './report-api';
const client = apiClient();
type Page = z.infer<typeof notificationsPage>;
const taskProject = z
  .object({ item: z.object({ project_id: z.number() }).passthrough() })
  .passthrough();
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} minutes ago`;
  if (m < 1440) return `${Math.round(m / 60)} hours ago`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Bangkok',
  });
};
/** Vibe Preview Notify: latest five in a popover; the full list stays at /notifications. */
export function NotifyPopover({
  self,
  online,
  onClose,
  onFailure,
}: {
  self: Self;
  online: boolean;
  onClose: () => void;
  onFailure: (e: ApiError) => void;
}) {
  const [data, setData] = useState<Page>();
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);
  const load = async () => {
    try {
      setData(
        await client.request('/api/notifications?pageSize=5', {
          parse: (v) => notificationsPage.parse(v),
        }),
      );
    } catch (e) {
      if (e instanceof ApiError) onFailure(e);
    }
  };
  useEffect(() => {
    void Promise.resolve().then(load);
    panel.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const click = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !(target as Element).closest?.('.notify-link'))
        onClose();
    };
    document.addEventListener('keydown', key);
    document.addEventListener('mousedown', click);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('mousedown', click);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = async (id: number | null) => {
    if (pending || !online) return;
    setPending(true);
    try {
      await client.request(
        id === null ? '/api/notifications/read-all' : `/api/notifications/${id}/read`,
        { method: 'POST', csrf: self.csrf, parse: (v) => v },
      );
      await load();
    } catch (e) {
      if (e instanceof ApiError) onFailure(e);
    } finally {
      setPending(false);
    }
  };
  const open = async (n: Page['items'][number]) => {
    if (!online) return;
    try {
      const t = await client.request(`/api/tasks/${n.task_id}`, {
        parse: (v) => taskProject.parse(v),
      });
      if (!n.read_at) void mark(n.id);
      onClose();
      navigate(`/projects?project=${t.item.project_id}&task=${n.task_id}`);
    } catch (e) {
      if (e instanceof ApiError) onFailure(e);
    }
  };
  return (
    <div
      className="notify-popover"
      role="dialog"
      aria-label="Notifications"
      tabIndex={-1}
      ref={panel}
    >
      <header>
        <strong>Notify</strong>
        {data && <span className="notify-unread">{data.unread_count} unread</span>}
        <button
          className="link-button"
          disabled={!online || pending || self.maintenance || !data?.unread_count}
          onClick={() => void mark(null)}
        >
          Mark all read
        </button>
        <button className="icon-button" aria-label="Close notifications" onClick={onClose}>
          ×
        </button>
      </header>
      {!data ? (
        <p className="notify-empty">Loading…</p>
      ) : data.items.length === 0 ? (
        <p className="notify-empty">No notifications</p>
      ) : (
        <ul>
          {data.items.map((n) => (
            <li key={n.id} className={n.read_at ? '' : 'unread'}>
              <button className="notify-item" disabled={!online} onClick={() => void open(n)}>
                <span>{notificationText(n)}</span>
                <small>{ago(n.created_at)}</small>
              </button>
              {n.read_at ? (
                <small className="notify-read">Read</small>
              ) : (
                <button
                  className="icon-button"
                  aria-label={`Read notification #${n.id}`}
                  disabled={!online || pending || self.maintenance}
                  onClick={() => void mark(n.id)}
                >
                  ✓
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <footer>
        <button
          className="link-button"
          onClick={() => {
            onClose();
            navigate('/notifications');
          }}
        >
          View all notifications →
        </button>
      </footer>
    </div>
  );
}
