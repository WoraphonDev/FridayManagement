import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
export async function startupFixture(migrated = true) {
  const root = mkdtempSync(join(tmpdir(), 'friday-setup-'));
  mkdirSync(join(root, 'data'));
  const path = join(root, 'data', 'fixture.sqlite');
  const db = new SqliteDatabase(path);
  if (migrated) await migrate(db);
  await db.close();
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
  const a = probe.address();
  assert(a && typeof a === 'object');
  await new Promise<void>((r, j) => probe.close((e) => (e ? j(e) : r())));
  return {
    root,
    path,
    env: {
      NODE_ENV: 'test',
      DB_PROVIDER: 'sqlite',
      DATA_DIR: join(root, 'data'),
      LOG_DIR: join(root, 'logs'),
      SQLITE_DB_PATH: path,
      HOST: '127.0.0.1',
      PORT: String(a.port),
      APP_ORIGIN: `http://127.0.0.1:${a.port}`,
    },
  };
}
