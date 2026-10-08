import { useEffect, useRef } from 'react';
type Reader = (signal: AbortSignal) => void | Promise<void>;
type Entry = { read: Reader; active?: AbortController; pending?: Promise<void> };
const entries = new Set<Entry>();
let timer: ReturnType<typeof setInterval> | undefined;
const visible = () => !document.hidden && navigator.onLine !== false;
function dispatch(): Promise<void> {
  if (!visible()) return Promise.resolve();
  for (const entry of entries) {
    if (entry.active) continue;
    const controller = new AbortController();
    entry.active = controller;
    entry.pending = Promise.resolve()
      .then(() => (controller.signal.aborted ? undefined : entry.read(controller.signal)))
      .catch(() => {})
      .finally(() => {
        if (entry.active === controller) entry.active = undefined;
      });
  }
  return Promise.all([...entries].map((entry) => entry.pending)).then(() => {});
}
export const refreshCurrentReaders = dispatch;
function pause() {
  if (timer) clearInterval(timer);
  timer = undefined;
  for (const entry of entries) {
    entry.active?.abort();
    entry.active = undefined;
  }
}
function resume() {
  if (!visible()) {
    pause();
    return;
  }
  if (!timer && entries.size) timer = setInterval(dispatch, 5000);
  dispatch();
}
/** One shared clock; read-only requests never count as intentional session activity. */
export function subscribeRefresh(read: Reader, immediate = false) {
  const entry: Entry = { read };
  entries.add(entry);
  if (entries.size === 1) {
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    window.addEventListener('offline', pause);
    document.addEventListener('visibilitychange', resume);
    if (visible()) timer = setInterval(dispatch, 5000);
  }
  if (immediate) dispatch();
  return () => {
    entry.active?.abort();
    entries.delete(entry);
    if (!entries.size) {
      pause();
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', pause);
      document.removeEventListener('visibilitychange', resume);
    }
  };
}
export function useSharedRefresh(read: Reader, enabled: boolean, scope: string | number = '') {
  const reader = useRef(read);
  const subscribed = useRef(false);
  useEffect(() => {
    reader.current = read;
  });
  useEffect(() => {
    if (!enabled) return;
    const stop = subscribeRefresh((signal) => reader.current(signal), subscribed.current);
    subscribed.current = true;
    return stop;
  }, [enabled, scope]);
}
