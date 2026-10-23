// Explicit, disposable Docker-only PostgreSQL 17 evidence; never a native Windows claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import pg from 'pg';

test('isolated PG17 bootstrap, least privilege, backup and empty-target restore CLI', {
  skip: process.env.RUN_WINDOWS_STAGING_PG_TESTS !== '1' ? 'NOT_RUN: opt-in disposable Docker fixture required' : process.platform === 'win32' ? 'NOT_RUN: POSIX Docker tool bridge; native Windows must use actual PG17 tools' : false,
  timeout: 180000,
}, async () => {
  const image = 'postgres:17';
  execFileSync('docker', ['image', 'inspect', image], { stdio: 'ignore' }); // Never pull/install automatically.
  const root = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'friday-stage-'));
  const container = 'friday-staging-test-' + randomBytes(8).toString('hex');
  const password = randomBytes(32).toString('hex');
  const dockerEnv = { ...process.env, POSTGRES_PASSWORD: password };
  const docker = (args, input) => execFileSync('docker', args, { env: dockerEnv, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  let admin;
  const command = (args, env) => {
    const r = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, `CLI failed (${args.find(a => !a.startsWith('--'))}); ${r.stderr}`);
    return r.stdout;
  };
  try {
    docker(['run', '--pull=never', '-d', '--name', container, '--label', 'friday.fixture=windows-staging', '-e', 'POSTGRES_PASSWORD', '-p', '127.0.0.1::5432', '--mount', `type=bind,src=${root},dst=${root}`, image]);
    const mapping = docker(['port', container, '5432/tcp']).trim();
    const port = Number(mapping.split(':').at(-1));
    assert(Number.isInteger(port) && port > 0);
    for (let i = 0; ; i++) {
      try { docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); break; }
      catch { if (i === 60) throw new Error('Disposable PostgreSQL startup timed out'); await new Promise(r => setTimeout(r, 500)); }
    }
    const psql = (db, text) => docker(['exec', '-i', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', db], text);
    psql('postgres', readFileSync('deploy/windows/bootstrap.sql', 'utf8'));
    admin = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres' });
    await admin.connect();
    for (const role of ['friday_stage_owner', 'friday_stage_app', 'friday_stage_backup']) {
      // Generated hex secret and fixed role identifiers only, on a disposable database.
      await admin.query(`ALTER ROLE ${role} PASSWORD '${password}'`);
    }
    const roles = await admin.query("SELECT rolname FROM pg_roles WHERE rolname LIKE 'friday_stage_%' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)");
    assert.equal(roles.rowCount, 0);
    const data = join(root, 'source data');
    const logs = join(root, 'source logs');
    for (const path of [data, logs, join(data, 'attachments')]) mkdirSync(path, { mode: 0o700 });
    const base = { ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '3000', APP_ORIGIN: 'https://friday.example.test', COOKIE_SECURE: 'true', TRUSTED_PROXY: '127.0.0.1', DB_PROVIDER: 'postgres', DB_SERVER: '127.0.0.1', DB_PORT: String(port), DB_NAME: 'friday_staging', DB_PASSWORD: password, DB_ENCRYPT: 'false', DATA_DIR: data, LOG_DIR: logs };
    const owner = { ...base, DB_USER: 'friday_stage_owner' };
    command(['scripts/migrate-dist.mjs'], owner);
    psql('friday_staging', readFileSync('deploy/windows/apply-grants.sql', 'utf8'));
    const connect = user => new pg.Client({ host: '127.0.0.1', port, user, password, database: 'friday_staging' });
    for (const [user, denied] of [['friday_stage_app', ['CREATE TABLE forbidden(id int)', 'DELETE FROM schema_migrations']], ['friday_stage_backup', ['CREATE TABLE forbidden(id int)', 'DELETE FROM users']]]) {
      const c = connect(user); await c.connect();
      try {
        assert(Number((await c.query('SELECT count(*) AS n FROM schema_migrations')).rows[0].n) > 0);
        for (const sql of denied) await assert.rejects(c.query(sql), { code: '42501' });
      } finally { await c.end(); }
    }
    const app = connect('friday_stage_app'); await app.connect();
    try { await app.query("INSERT INTO organizations(id,name) VALUES (1,$1)", ['Windows staging synthetic ไทย']); }
    finally { await app.end(); }
    // POSIX bridge uses the container's real PG17 tools, preserving spaced path arguments.
    // It only rewrites the randomly mapped host port to the fixture's internal port.
    const bin = join(root, 'PG tools'); mkdirSync(bin, { mode: 0o700 });
    for (const tool of ['pg_dump', 'pg_restore', 'psql']) {
      writeFileSync(join(bin, tool), `#!/bin/bash\nargs=()\nfor arg in "$@"; do\n if [[ "$arg" == "--port=${port}" ]]; then args+=("--port=5432"); else args+=("$arg"); fi\ndone\nexec docker exec -e PGPASSWORD -e PGSSLMODE ${container} ${tool} "\${args[@]}"\n`, { mode: 0o700 });
    }
    const backupEnv = { ...base, DB_USER: 'friday_stage_backup', PATH: bin + ':' + process.env.PATH };
    const profileKeys = ['NODE_ENV', 'HOST', 'PORT', 'APP_ORIGIN', 'COOKIE_SECURE', 'TRUSTED_PROXY', 'DB_PROVIDER', 'DB_SERVER', 'DB_PORT', 'DB_NAME', 'DB_PASSWORD', 'DB_ENCRYPT', 'DATA_DIR', 'LOG_DIR'];
    const profile = Object.fromEntries(profileKeys.map(k => [k, base[k]]));
    profile.DB_PORT = '5432'; // Offline preflight checks tools/profile only, never connects to DB.
    profile.DB_USER = 'friday_stage_app';
    const envFile = join(root, 'private profile.env');
    writeFileSync(envFile, Object.entries(profile).map(([k, v]) => `${k}=${v}`).join('\n'), { mode: 0o600 });
    const preflight = command([`--env-file=${envFile}`, 'scripts/windows/preflight.mjs', envFile, bin], { ...process.env, ...profile, PATH: backupEnv.PATH });
    assert.match(preflight, /STAGING_PREFLIGHT_PASS/);
    assert(!preflight.includes(password));
    const snapshot = join(root, 'snapshot with spaces');
    const result = JSON.parse(command(['dist/server/operations/main.js', 'backup', snapshot, '--confirm-local-maintenance'], backupEnv));
    assert.equal(result.status, 'complete');
    command(['dist/server/operations/main.js', 'verify', snapshot, '--confirm-local-maintenance'], backupEnv);
    await admin.query('CREATE DATABASE friday_restore_staging OWNER friday_stage_owner');
    psql('friday_restore_staging', 'REVOKE ALL ON DATABASE friday_restore_staging FROM PUBLIC; REVOKE ALL ON SCHEMA public FROM PUBLIC; ALTER SCHEMA public OWNER TO friday_stage_owner;');
    const target = join(root, 'restored data'); const targetLogs = join(root, 'restored logs');
    for (const path of [target, targetLogs]) mkdirSync(path, { mode: 0o700 });
    const restoreEnv = { ...owner, DB_NAME: 'friday_restore_staging', DATA_DIR: target, LOG_DIR: targetLogs, FRIDAY_RESTORE_SOURCE: snapshot, PATH: backupEnv.PATH };
    const restored = JSON.parse(command(['dist/server/operations/main.js', 'restore-postgres', target, '--confirm-local-maintenance'], restoreEnv));
    assert.equal(restored.status, 'complete');
    psql('friday_restore_staging', readFileSync('deploy/windows/apply-grants.sql', 'utf8'));
    const restoredApp = new pg.Client({ host: '127.0.0.1', port, user: 'friday_stage_app', password, database: 'friday_restore_staging' });
    await restoredApp.connect();
    try {
      assert.equal((await restoredApp.query('SELECT name FROM organizations WHERE id=1')).rows[0].name, 'Windows staging synthetic ไทย');
      assert.equal(Number((await restoredApp.query('SELECT count(*) AS n FROM maintenance_state')).rows[0].n), 0);
    } finally { await restoredApp.end(); }
    // Re-running into a populated target must fail instead of overwriting.
    const repeat = spawnSync(process.execPath, ['dist/server/operations/main.js', 'restore-postgres', target, '--confirm-local-maintenance'], { env: restoreEnv, encoding: 'utf8' });
    assert.equal(repeat.status, 1);
    assert.match(repeat.stderr, /OPERATIONS_FAILED/);
  } finally {
    await admin?.end();
    try { docker(['rm', '-f', container]); }
    finally { rmSync(root, { recursive: true, force: true }); }
  }
});
