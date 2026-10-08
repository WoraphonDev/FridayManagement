import { randomUUID } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Request } from 'express';
import type { Database } from '../domain/database.js';
export function localHealthRequest(request: Request) {
  const loopback = (address?: string) =>
    address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
  // Forwarded requests must preserve the effective client address. Never trust Host.
  if (!loopback(request.ip)) return false;
  if (request.headers['x-forwarded-for'] || request.headers.forwarded) return false;
  return loopback(request.socket.remoteAddress);
}
export function readinessProbe(
  database: Database | undefined,
  directories: string[],
  configured: () => Promise<boolean>,
) {
  return async () => {
    if (!database) return false;
    try {
      await database.transaction(async (tx) => {
        const rows = await tx.query({
          sqlite: 'SELECT 1 AS healthy',
          sqlserver: 'SELECT 1 AS healthy',
        });
        if (rows[0]?.healthy !== 1) throw new Error('NOT_READY');
      });
      for (const directory of directories) {
        const path = join(directory, `.health-${randomUUID()}`);
        const handle = await open(path, 'wx', 0o600);
        try {
          await handle.writeFile('health');
          await handle.sync();
        } finally {
          await handle.close();
          await unlink(path);
        }
      }
      return await configured();
    } catch {
      return false;
    }
  };
}
