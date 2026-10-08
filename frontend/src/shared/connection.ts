import { useSyncExternalStore } from 'react';
let writable = true;
const listeners = new Set<() => void>();
export const canWrite = () => writable;
export function setWritable(value: boolean) {
  writable = value;
  for (const notify of listeners) notify();
}
export function useWritable() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    canWrite,
    () => true,
  );
}
