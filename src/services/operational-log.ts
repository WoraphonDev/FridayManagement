import { lstatSync, renameSync, rmSync, constants, openSync, closeSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import type { SafeLog } from '../api/errors.js';
type Event = {
  event: 'request' | 'error' | 'readiness' | 'job';
  requestId?: string;
  status?: number;
  code?: string;
};
export function operationalLog(directory: string, maxBytes = 1024 * 1024, retained = 5) {
  const path = join(directory, 'application.jsonl');
  let healthy = true;
  const write = (event: Event) => {
    // Construct every field explicitly: no paths, URLs, bodies, headers, messages or stacks.
    const record = {
      timestamp: new Date().toISOString(),
      event: event.event,
      ...(event.requestId && /^[0-9a-f-]{36}$/i.test(event.requestId)
        ? { requestId: event.requestId }
        : {}),
      ...(Number.isInteger(event.status) && event.status! >= 100 && event.status! <= 599
        ? { status: event.status }
        : {}),
      ...(event.code &&
      [
        'INTERNAL_ERROR',
        'DATABASE_BUSY',
        'SERVICE_NOT_READY',
        'REMINDER_JOB_FAILED',
        'RETENTION_JOB_FAILED',
      ].includes(event.code)
        ? { code: event.code }
        : {}),
    };
    try {
      const line = JSON.stringify(record) + '\n';
      let size = 0;
      try {
        const info = lstatSync(path);
        if (!info.isFile() || info.isSymbolicLink()) throw new Error('LOG_UNSAFE');
        size = info.size;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
      if (size + Buffer.byteLength(line) > maxBytes) {
        rmSync(`${path}.${retained}`, { force: true });
        for (let index = retained - 1; index >= 1; index--) {
          try {
            renameSync(`${path}.${index}`, `${path}.${index + 1}`);
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
          }
        }
        if (size) renameSync(path, `${path}.1`);
      }
      const fd = openSync(
        path,
        constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0),
        0o600,
      );
      try {
        writeSync(fd, line);
      } finally {
        closeSync(fd);
      }
      healthy = true;
    } catch {
      healthy = false;
      // Never print the underlying filesystem error (which can contain private paths).
      console.error(JSON.stringify({ event: 'operational_log_failed' }));
    }
  };
  const error: SafeLog = (event) => write({ event: 'error', ...event });
  return { write, error, healthy: () => healthy };
}
