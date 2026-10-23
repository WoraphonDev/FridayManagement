import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomUUID, createHash } from 'node:crypto';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
/**
 * PostgreSQL mode (ADR-0001 TC/AT evidence): with FRIDAY_FIXTURE_PROVIDER=postgres plus the
 * isolated-test guards used by pgFixture, every startup fixture gets its own fresh database
 * named friday_fx_<random>_test on the configured test server (copied from a migrated
 * friday_tpl_<hash>_test template). scripts/tcat-postgres.mjs drops them after the run;
 * nothing touches a non-*_test database.
 */
function postgresFixtureMode() {
  if (process.env.FRIDAY_FIXTURE_PROVIDER !== 'postgres') return false;
  assert(
    process.env.RUN_POSTGRES_TESTS === '1' &&
      process.env.NODE_ENV === 'test' &&
      /_test$/.test(process.env.DB_NAME ?? ''),
    'ISOLATED_POSTGRES_TEST_REQUIRED',
  );
  return true;
}
async function postgresDatabase(migrated: boolean) {
  const pg = (await import('pg')).default;
  const { PostgresDatabase } = await import('../../src/repository/postgres/database.js');
  const name = `friday_fx_${randomUUID().replaceAll('-', '')}_test`;
  const connection = {
    host: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
  // Migrated fixtures copy a template migrated once per migration-set hash (fast CREATE ... TEMPLATE).
  const migrations = readdirSync('migrations/postgres').sort();
  const digest = createHash('sha256');
  for (const file of migrations)
    digest.update(file).update(readFileSync(join('migrations/postgres', file)));
  const template = `friday_tpl_${digest.digest('hex').slice(0, 16)}_test`;
  const admin = new pg.Pool({ ...connection, database: process.env.DB_NAME, max: 1 });
  try {
    const client = await admin.connect();
    try {
      await client.query('SELECT pg_advisory_lock(84210017)');
      try {
        if (migrated) {
          const exists = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [
            template,
          ]);
          if (!exists.rowCount) {
            await client.query(`CREATE DATABASE "${template}"`);
            const db = new PostgresDatabase(
              new pg.Pool({ ...connection, database: template, max: 2 }),
            );
            try {
              await migrate(db);
            } finally {
              await db.close();
            }
          }
          await client.query(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
        } else await client.query(`CREATE DATABASE "${name}"`);
      } finally {
        await client.query('SELECT pg_advisory_unlock(84210017)');
      }
    } finally {
      client.release();
    }
  } finally {
    await admin.end();
  }
  return {
    DB_PROVIDER: 'postgres',
    DB_SERVER: String(process.env.DB_SERVER),
    DB_PORT: String(process.env.DB_PORT ?? 5432),
    DB_NAME: name,
    DB_USER: String(process.env.DB_USER),
    DB_PASSWORD: String(process.env.DB_PASSWORD),
    DB_ENCRYPT: 'false',
  };
}
export async function startupFixture(migrated = true) {
  const root = mkdtempSync(join(tmpdir(), 'friday-setup-'));
  mkdirSync(join(root, 'data'));
  const path = join(root, 'data', 'fixture.sqlite');
  let database: Record<string, string>;
  if (postgresFixtureMode()) database = await postgresDatabase(migrated);
  else {
    const db = new SqliteDatabase(path);
    if (migrated) await migrate(db);
    await db.close();
    database = { DB_PROVIDER: 'sqlite', SQLITE_DB_PATH: path };
  }
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
      ...database,
      DATA_DIR: join(root, 'data'),
      LOG_DIR: join(root, 'logs'),
      HOST: '127.0.0.1',
      PORT: String(a.port),
      APP_ORIGIN: `http://127.0.0.1:${a.port}`,
    } satisfies Record<string, string>,
  };
}
/** Opens the fixture's own database for direct seeding/assertions, whichever provider it uses. */
export async function fixtureDatabase(f: { path: string; env: Record<string, string> }) {
  if (f.env.DB_PROVIDER !== 'postgres') return new SqliteDatabase(f.path);
  const pg = (await import('pg')).default;
  const { PostgresDatabase } = await import('../../src/repository/postgres/database.js');
  return new PostgresDatabase(
    new pg.Pool({
      host: f.env.DB_SERVER,
      port: Number(f.env.DB_PORT),
      database: f.env.DB_NAME,
      user: f.env.DB_USER,
      password: f.env.DB_PASSWORD,
      max: 3,
    }),
  );
}
