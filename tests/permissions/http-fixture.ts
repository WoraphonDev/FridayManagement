import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
// Shared SQLite HTTP harness for the permission suites (AT-31/AT-32/AT-33 and the T-081 matrix).
export const origin = 'https://permissions.invalid',
  basic = { Origin: origin, 'Content-Type': 'application/json' };
const config = parseConfiguration({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: '/private/tmp/permissions-http',
  LOG_DIR: '/private/tmp/permissions-log',
  SQLITE_DB_PATH: '/private/tmp/permissions-http/fixture.sqlite',
  APP_ORIGIN: origin,
  COOKIE_SECURE: 'true',
});
export type F = Awaited<ReturnType<typeof sessionFixture>>;
export async function fixture(work: (base: string, f: F) => Promise<void>) {
  const f = await sessionFixture(sqliteFixture),
    storage = await mkdtemp(join(tmpdir(), 'friday-permissions-files-'));
  const server = createApp(
    undefined,
    config,
    await sessionHooks(f.db, {
      clock: f.clock,
      cookieSecure: true,
      // File routes (P-06) exist only when storage is configured.
      storage: { directory: storage, maxFileBytes: 10485760, totalUploadBytes: 1024 * 1024 * 20 },
    }),
  ).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const address = server.address();
  assert(address && typeof address === 'object');
  try {
    await work(`http://127.0.0.1:${address.port}`, f);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await f.close();
    await rm(storage, { recursive: true, force: true });
  }
}
export async function login(base: string, username = 'Admin') {
  const response = await fetch(base + '/api/login', {
    method: 'POST',
    headers: basic,
    body: JSON.stringify({ username, password }),
  });
  assert.equal(response.status, 200);
  const self = await response.json();
  const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
  return { cookie, headers: { ...basic, Cookie: cookie, 'X-CSRF-Token': self.csrf } };
}
export type Session = Awaited<ReturnType<typeof login>>;
export async function call(base: string, s: Session, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, {
    method,
    headers:
      method === 'GET'
        ? { Cookie: s.cookie }
        : {
            ...s.headers,
            ...(['POST'].includes(method) ? { 'Idempotency-Key': randomUUID() } : {}),
          },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text && text[0] !== '﻿' ? JSON.parse(text) : text };
}
export const projectVersion = async (f: F, id = 1) =>
  Number(
    (
      await f.db.transaction((tx) =>
        tx.query(sql('SELECT version FROM dbo.projects WHERE id=@id', { id })),
      )
    )[0]!.version,
  );
export const audits = async (f: F, action: string) =>
  f.db.transaction((tx) =>
    tx.query<{ redacted_changes: string }>(
      sql('SELECT redacted_changes FROM dbo.admin_events WHERE action=@action ORDER BY id', {
        action,
      }),
    ),
  );
