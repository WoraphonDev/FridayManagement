import { it, expect, vi, afterEach } from 'vitest';
import { subscribeRefresh } from './refresh';
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((stop) => stop());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function environment() {
  vi.useFakeTimers();
  const doc = Object.assign(new EventTarget(), { hidden: false }),
    win = new EventTarget(),
    nav = { onLine: true };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', nav);
  return { doc, win, nav };
}
it('T047 one shared five-second timer; focus refresh immediately and cleanup stops all', async () => {
  const { win } = environment();
  const a = vi.fn(),
    b = vi.fn();
  const off = subscribeRefresh(a);
  cleanups.push(off, subscribeRefresh(b));
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(5000);
  expect(a).toHaveBeenCalledTimes(1);
  expect(b).toHaveBeenCalledTimes(1);
  win.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(0);
  expect(a).toHaveBeenCalledTimes(2);
  off();
  await vi.advanceTimersByTimeAsync(5000);
  expect(a).toHaveBeenCalledTimes(2);
  expect(b).toHaveBeenCalledTimes(3);
});
it('T047 hidden/offline abort reads and pause; visible/online resumes immediately', async () => {
  const { doc, win, nav } = environment();
  const signals: AbortSignal[] = [];
  cleanups.push(
    subscribeRefresh((s) => {
      signals.push(s);
      return new Promise<void>((resolve) =>
        s.addEventListener('abort', () => resolve(), { once: true }),
      );
    }),
  );
  await vi.advanceTimersByTimeAsync(5000);
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  expect(signals[0]!.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(15000);
  expect(signals).toHaveLength(1);
  doc.hidden = false;
  doc.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(0);
  expect(signals).toHaveLength(2);
  nav.onLine = false;
  win.dispatchEvent(new Event('offline'));
  await vi.advanceTimersByTimeAsync(10000);
  expect(signals).toHaveLength(2);
  nav.onLine = true;
  win.dispatchEvent(new Event('online'));
  await vi.advanceTimersByTimeAsync(0);
  expect(signals).toHaveLength(3);
});
it('T047 overlap suppressed, rejected read isolated, unsubscribe aborts pending', async () => {
  const { win } = environment();
  let complete: () => void = () => {};
  const blocked = vi.fn(
      () =>
        new Promise<void>((r) => {
          complete = r;
        }),
    ),
    reject = vi.fn(async () => {
      throw new Error('read unavailable');
    });
  let signal: AbortSignal | undefined;
  const stop = subscribeRefresh((s) => {
    signal = s;
    return blocked();
  });
  cleanups.push(stop, subscribeRefresh(reject));
  await vi.advanceTimersByTimeAsync(15000);
  expect(blocked).toHaveBeenCalledTimes(1);
  expect(reject).toHaveBeenCalledTimes(3);
  complete();
  await vi.advanceTimersByTimeAsync(0);
  win.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(0);
  expect(blocked).toHaveBeenCalledTimes(2);
  stop();
  expect(signal?.aborted).toBe(true);
  complete();
});
