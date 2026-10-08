import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request as httpRequest } from 'node:http';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
const origin = 'https://files.invalid';
async function fixture(
  work: (
    base: string,
    f: Awaited<ReturnType<typeof sessionFixture>>,
    root: string,
    restart: () => Promise<string>,
  ) => Promise<void>,
) {
  const f = await sessionFixture(sqliteFixture),
    root = await mkdtemp(join(tmpdir(), 'friday-files-http-'));
  const config = parseConfiguration({
    NODE_ENV: 'test',
    DB_PROVIDER: 'sqlite',
    DATA_DIR: root,
    LOG_DIR: join(root, 'log'),
    SQLITE_DB_PATH: join(root, 'fixture.sqlite'),
    APP_ORIGIN: origin,
    COOKIE_SECURE: 'true',
  });
  const start = async () => {
    const server = createApp(
      undefined,
      config,
      await sessionHooks(f.db, {
        clock: f.clock,
        cookieSecure: true,
        storage: { directory: root, maxFileBytes: 10485760, totalUploadBytes: 1024 * 1024 * 20 },
      }),
    ).listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    const a = server.address();
    assert(a && typeof a === 'object');
    return { server, base: `http://127.0.0.1:${a.port}` };
  };
  let running = await start();
  const stop = async () => {
    running.server.closeAllConnections();
    await new Promise<void>((r) => running.server.close(() => r()));
  };
  try {
    await work(running.base, f, root, async () => {
      await stop();
      f.db = await f.reopen();
      running = await start();
      return running.base;
    });
  } finally {
    await stop();
    await f.close();
    await rm(root, { recursive: true, force: true });
  }
}
async function login(base: string, user = 'Admin') {
  const r = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password }),
  });
  assert.equal(r.status, 200);
  const b = await r.json();
  return {
    Origin: origin,
    Cookie: r.headers.get('set-cookie')!.split(';')[0]!,
    'X-CSRF-Token': String(b.csrf),
  };
}
async function upload(
  base: string,
  headers: Record<string, string>,
  bytes = Buffer.from('ไทย file'),
  key = randomUUID(),
  name = 'งาน.txt',
) {
  const body = new FormData();
  body.append('file', new Blob([new Uint8Array(bytes)]), name);
  const r = await fetch(base + '/api/tasks/1/attachments', {
    method: 'POST',
    headers: { ...headers, 'Idempotency-Key': key },
    body,
  });
  return { status: r.status, body: await r.json(), request: r.headers.get('x-request-id') };
}
test('T040–043 HTTP real multipart idempotent concurrent/restart/hash, authorized binary/safe headers, lifecycle and immutable scoped audit', () =>
  fixture(async (base, f, root, restart) => {
    await f.db.transaction((tx) =>
      tx.execute(
        sql(
          "INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(1,2,'editor',1)",
        ),
      ),
    );
    const a = await login(base),
      m = await login(base, 'Member'),
      key = randomUUID();
    const results = await Promise.all([
      upload(base, m, undefined, key),
      upload(base, m, undefined, key),
    ]);
    assert.equal(results[0]!.status, 201);
    assert.deepEqual(results[0]!.body, results[1]!.body);
    assert.notEqual(results[0]!.request, results[1]!.request);
    const id = results[0]!.body.item.id;
    const restarted = await restart();
    assert.deepEqual((await upload(restarted, m, undefined, key)).body, results[0]!.body);
    assert.equal((await upload(restarted, m, Buffer.from('different'), key)).status, 409);
    assert.equal((await readdir(join(root, 'attachments'))).length, 1);
    assert.deepEqual(await readdir(join(root, 'upload-temp')), []);
    const download = await fetch(restarted + `/api/attachments/${id}/download`, { headers: m });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('cache-control'), 'no-store');
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert(download.headers.get('content-disposition')!.startsWith('attachment;'));
    assert(download.headers.get('content-disposition')!.includes(encodeURIComponent('งาน.txt')));
    assert(download.headers.get('x-request-id'));
    assert.equal(await download.text(), 'ไทย file');
    const events = await (await fetch(restarted + '/api/tasks/1/events', { headers: m })).json();
    assert.equal(events.total, 1);
    assert.equal(events.items[0].action, 'attachment_changed');
    assert(!JSON.stringify(events).includes('storage_key'));
    assert.equal((await fetch(restarted + '/api/audit', { headers: m })).status, 403);
    assert.equal((await fetch(restarted + '/api/audit', { headers: a })).status, 200);
    for (const [method, path] of [
      ['PATCH', '/api/tasks/1/events'],
      ['DELETE', '/api/audit'],
      ['GET', '/uploads/file.txt'],
      ['GET', '/attachments/file.txt'],
    ])
      assert.equal((await fetch(restarted + path, { method: method!, headers: a })).status, 404);
    const remove = await fetch(restarted + `/api/attachments/${id}`, {
      method: 'DELETE',
      headers: m,
    });
    assert.equal(remove.status, 200);
    assert((await remove.json()).item.deleted_at);
    assert.equal(
      (await fetch(restarted + `/api/attachments/${id}/download`, { headers: m })).status,
      404,
    );
    assert.equal(
      (await fetch(restarted + `/api/attachments/${id}/restore`, { method: 'POST', headers: m }))
        .status,
      200,
    );
    await f.db.transaction((tx) =>
      tx.execute(sql('DELETE FROM dbo.project_members WHERE user_id=2')),
    );
    assert.equal(
      (await fetch(restarted + `/api/attachments/${id}/download`, { headers: m })).status,
      404,
    );
    assert.equal((await upload(restarted, m, undefined, key)).status, 404);
    await rm(join(root, 'attachments', (await readdir(join(root, 'attachments')))[0]!));
    const missing = await fetch(restarted + `/api/attachments/${id}/download`, { headers: a });
    assert.equal(missing.status, 404);
    assert(!(await missing.text()).includes(root));
  }));
test('T041 HTTP no Origin/CSRF/session/key before temp creation; invalid multipart/UTF8/type boundaries', () =>
  fixture(async (base, f, root) => {
    const a = await login(base);
    for (const h of [
      { ...a, Origin: 'https://evil.invalid' },
      { ...a, 'X-CSRF-Token': 'bad' },
      { Origin: origin, 'X-CSRF-Token': a['X-CSRF-Token'] },
    ])
      assert.equal((await upload(base, h)).status, 'Cookie' in h ? 403 : 401);
    const body = new FormData();
    body.append('file', new Blob(['ok']), 'file.txt');
    assert.equal(
      (await fetch(base + '/api/tasks/1/attachments', { method: 'POST', headers: a, body })).status,
      422,
    );
    for (const [name, b, code] of [
      ['x.svg', Buffer.from('<svg/>'), 'INVALID_FILE_TYPE'],
      ['x.csv', Buffer.from([0xff]), 'INVALID_FILE_TYPE'],
      ['x.txt', Buffer.alloc(0), 'VALIDATION_FAILED'],
    ] as const) {
      const r = await upload(base, a, b, randomUUID(), name);
      assert.equal(r.body.error.code, code);
      assert.equal(r.body.error.requestId, r.request);
    }
    const broken = await fetch(base + '/api/tasks/1/attachments', {
      method: 'POST',
      headers: {
        ...a,
        'Idempotency-Key': randomUUID(),
        'Content-Type': 'multipart/form-data; boundary=bad',
      },
      body: 'truncated',
    });
    assert.equal(broken.status, 422);
    assert.deepEqual(await readdir(join(root, 'attachments')), []);
    assert.deepEqual(await readdir(join(root, 'upload-temp')), []);
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT * FROM dbo.upload_reservations'))))
        .length,
      0,
    );
  }));
test('T041 HTTP revoke current membership during actual streaming fails finalize and releases disk/reservation', () =>
  fixture(async (base, f, root) => {
    await f.db.transaction((tx) =>
      tx.execute(
        sql(
          "INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(1,2,'editor',1)",
        ),
      ),
    );
    const m = await login(base, 'Member');
    let send: (v: string) => void = () => {};
    const response = new Promise<{ status: number; body: string }>((resolve, reject) => {
      const request = httpRequest(
        base + '/api/tasks/1/attachments',
        {
          method: 'POST',
          headers: {
            ...m,
            'Idempotency-Key': randomUUID(),
            'Content-Type': 'multipart/form-data; boundary=slow',
          },
        },
        (r) => {
          let b = '';
          r.on('data', (c) => (b += String(c)));
          r.on('end', () => resolve({ status: r.statusCode!, body: b }));
        },
      );
      request.on('error', reject);
      request.write(
        '--slow\r\nContent-Disposition: form-data; name="file"; filename="stream.txt"\r\n\r\nfirst chunk',
      );
      send = (v) => request.end(v);
    });
    for (let i = 0; i < 100; i++) {
      const r = await f.db.transaction((tx) =>
        tx.query(sql('SELECT reserved_bytes FROM dbo.upload_reservations')),
      );
      if (r.length && Number(r[0]!.reserved_bytes) > 1) break;
      await new Promise((r) => setTimeout(r, 10));
      if (i === 99) throw new Error('stream never reserved bytes');
    }
    await f.db.transaction((tx) =>
      tx.execute(sql('DELETE FROM dbo.project_members WHERE user_id=2')),
    );
    send('\r\n--slow--\r\n');
    const r = await response;
    assert.equal(r.status, 404);
    assert.equal(JSON.parse(r.body).error.code, 'NOT_FOUND');
    assert.deepEqual(await readdir(join(root, 'attachments')), []);
    assert.deepEqual(await readdir(join(root, 'upload-temp')), []);
    assert.deepEqual(
      await f.db.transaction((tx) =>
        tx.query(sql('SELECT stored_bytes,reserved_bytes FROM dbo.storage_quota')),
      ),
      [{ stored_bytes: 0, reserved_bytes: 0 }],
    );
  }));

test('T041 real HTTP 10MiB streamed file accepted and max+1 refused without residual reservation', () =>
  fixture(async (base, f, root) => {
    const a = await login(base);
    const max = await upload(base, a, Buffer.alloc(10485760, 97), randomUUID(), 'maximum.txt');
    assert.equal(max.status, 201);
    assert.equal(max.body.item.bytes, 10485760);
    const over = await upload(base, a, Buffer.alloc(10485761, 97), randomUUID(), 'oversize.txt');
    assert.equal(over.status, 413);
    assert.equal(over.body.error.code, 'FILE_TOO_LARGE');
    assert.equal((await readdir(join(root, 'attachments'))).length, 1);
    assert.deepEqual(await readdir(join(root, 'upload-temp')), []);
    assert.equal(
      (
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT reserved_bytes FROM dbo.storage_quota')),
        )
      )[0]!.reserved_bytes,
      0,
    );
  }));
