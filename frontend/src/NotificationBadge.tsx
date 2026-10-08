import { useEffect, useRef, useState } from 'react';
import { replay } from './motion';
import { apiClient, ApiError, type Self } from './api';
import { notificationsPage } from './report-api';
import { useSharedRefresh } from './shared/refresh';
const client = apiClient();
export function NotificationBadge({
  self,
  online,
  onFailure,
}: {
  self: Self;
  online: boolean;
  onFailure: (e: ApiError) => void;
}) {
  const [unread, setUnread] = useState<number>();
  const badge = useRef<HTMLSpanElement>(null),
    seen = useRef<number>(undefined);
  // AN-09: pop only when the unread count grows, never on first load.
  useEffect(() => {
    if (unread !== undefined && seen.current !== undefined && unread > seen.current)
      replay(badge.current, 'badge-pop');
    if (unread !== undefined) seen.current = unread;
  }, [unread]);
  const read = async (signal: AbortSignal) => {
    try {
      const r = await client.request('/api/notifications?pageSize=1', {
        signal,
        parse: (v) => notificationsPage.parse(v),
      });
      if (!signal.aborted) setUnread(r.unread_count);
    } catch (e) {
      if (!signal.aborted) {
        setUnread(undefined);
        if (e instanceof ApiError) onFailure(e);
      }
    }
  };
  useEffect(() => {
    const c = new AbortController();
    if (online)
      void Promise.resolve().then(() => {
        if (!c.signal.aborted) return read(c.signal);
      });
    return () => c.abort();
  }, [self.csrf, online]); // eslint-disable-line react-hooks/exhaustive-deps
  useSharedRefresh(read, online, self.csrf);
  return unread === undefined ? null : (
    <span className="notification-badge" ref={badge} aria-label={`unread ${unread} items`}>
      {unread}
    </span>
  );
}
