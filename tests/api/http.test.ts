import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { operations, parseSchema, validateBusiness } from '../../src/api/contract.js';
import { ApiFault, type SafeLog, type ErrorCode } from '../../src/api/errors.js';
import { requireVersion } from '../../src/domain/lifecycle.js';
import type { ApiHooks, Principal } from '../../src/api/middleware.js';
import { selfFixture } from '../../frontend/src/test-fixtures.js';
import { parseConfiguration, type AppConfig } from '../../src/config/config.js';
const origin = 'https://friday.invalid';
const principal: Principal = {
  id: 1,
  active: true,
  mustChangePassword: false,
  csrf: 'a'.repeat(64),
};
const operation = (method: string, path: string) =>
  operations.find((o) => o.method === method && o.path === path)!.operation;
const headers = {
  Origin: origin,
  'X-CSRF-Token': principal.csrf,
  'Idempotency-Key': randomUUID(),
  'Content-Type': 'application/json',
};
const list = { items: [], page: 1, pageSize: 50, total: 0 };
async function fixture(
  work: (base: string) => Promise<void>,
  hooks: ApiHooks = {},
  log?: SafeLog,
  config?: AppConfig,
) {
  const server = createApp(undefined, config, { origin, ...hooks }, log).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address();
    assert(address && typeof address === 'object');
    await work(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
}
function secured(handlers: NonNullable<ApiHooks['handlers']>): ApiHooks {
  return {
    session: async () => principal,
    authorize: async () => 'allowed',
    handlers,
    idempotency: async (context, invoke) => invoke(context), // Synthetic handler-only validation fixture; no production bypass.
  };
}
async function error(response: Response, status: number, code: string) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.equal(body.error.code, code);
  assert.equal(body.error.requestId, response.headers.get('x-request-id'));
  const schema = operation('GET', '/api/me').responses.default!.content!['application/json']!
    .schema;
  parseSchema(schema, body);
  return body;
}
test('All 63 declared operations share fail-closed ingress; unknown route/method/path/query is rejected', async () => {
  assert.equal(operations.length, 63);
  await fixture(async (base) => {
    for (const op of operations.filter((o) => o.path.startsWith('/api/'))) {
      const path = op.path.replace(/\{[^}]+\}/g, '1');
      const media = op.operation.requestBody?.content;
      const multipart = !!media?.['multipart/form-data'];
      const json = !!media?.['application/json'];
      await error(
        await fetch(base + path, {
          method: op.method,
          headers: {
            Origin: origin,
            ...(json ? { 'Content-Type': 'application/json' } : {}),
            ...(multipart ? { 'Content-Type': 'multipart/form-data; boundary=fixture' } : {}),
          },
          ...(json ? { body: '{}' } : {}),
        }),
        503,
        'SERVICE_NOT_READY',
      );
      if (op.method === 'GET')
        await error(await fetch(base + path + '?unexpected=1'), 400, 'INVALID_QUERY');
    }
    await error(await fetch(base + '/api/unknown'), 404, 'NOT_FOUND');
    await error(await fetch(base + '/api/tasks', { method: 'OPTIONS' }), 404, 'NOT_FOUND');
    for (const id of ['0', '01', '2147483648', '%31', '1%20OR%201=1'])
      await error(await fetch(base + '/api/tasks/' + id), 400, 'INVALID_PATH');
  });
});
test('JSON media/UTF8/syntax/1MiB limit and compressed ingress reject before any handler', async () => {
  let calls = 0;
  await fixture(
    async (base) => {
      const cases: [RequestInit, number, string][] = [
        [
          { method: 'POST', headers: { Origin: origin, 'Content-Type': 'text/plain' }, body: '{}' },
          415,
          'UNSUPPORTED_MEDIA_TYPE',
        ],
        [{ method: 'POST', headers: { ...headers }, body: '{' }, 400, 'INVALID_JSON'],
        [
          { method: 'POST', headers: { ...headers }, body: Buffer.from([0xff]) },
          400,
          'INVALID_JSON',
        ],
        [
          { method: 'POST', headers: { ...headers }, body: 'a'.repeat(1048577) },
          413,
          'PAYLOAD_TOO_LARGE',
        ],
        [
          { method: 'POST', headers: { ...headers, 'Content-Encoding': 'gzip' }, body: '{}' },
          415,
          'UNSUPPORTED_MEDIA_TYPE',
        ],
      ];
      for (const [init, status, code] of cases)
        await error(await fetch(base + '/api/login', init), status, code);
      assert.equal(calls, 0);
    },
    {
      handlers: {
        [operation('POST', '/api/login').operationId]: async () => {
          calls++;
          return { status: 200, body: selfFixture() };
        },
      },
    },
  );
});
test('Origin is exact configured value, independent of spoofed Host/forwarded headers; no CORS', async () => {
  await fixture(
    async (base) => {
      for (const spoof of ['https://evil.invalid', origin + '/', 'null'])
        await error(
          await fetch(base + '/api/login', {
            method: 'POST',
            headers: {
              ...headers,
              Origin: spoof,
              Host: 'evil.invalid',
              'X-Forwarded-Host': 'friday.invalid',
              'X-Forwarded-Proto': 'https',
            },
            body: '{"username":"fixture","password":"fixture"}',
          }),
          403,
          'INVALID_ORIGIN',
        );
      const response = await fetch(base + '/api/login', {
        method: 'POST',
        headers,
        body: '{"username":"fixture","password":"fixture"}',
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      assert.equal(response.headers.get('referrer-policy'), 'same-origin');
      const csp = response.headers.get('content-security-policy')!;
      assert(csp.includes("frame-ancestors 'none'"));
      assert(!csp.includes('unsafe-inline'));
      assert(!csp.includes('unsafe-eval'));
      assert.equal(response.headers.get('strict-transport-security'), null);
    },
    {
      handlers: {
        [operation('POST', '/api/login').operationId]: async () => ({
          status: 200,
          body: selfFixture(),
        }),
      },
    },
  );
});
test('Session/CSRF hooks fail closed; forced-password exceptions and hidden project404 preserve boundaries', async () => {
  let value: Principal | null = principal;
  let decision: 'allowed' | 'hidden' | 'forbidden' = 'allowed';
  const handlers = {
    [operation('GET', '/api/tasks').operationId]: async () => ({ status: 200, body: list }),
    [operation('POST', '/api/tasks').operationId]: async () => {
      throw new ApiFault('DATABASE_BUSY');
    },
    [operation('GET', '/api/me').operationId]: async () => ({ status: 200, body: selfFixture() }),
  };
  await fixture(
    async (base) => {
      value = null;
      await error(await fetch(base + '/api/tasks'), 401, 'UNAUTHENTICATED');
      value = { ...principal, active: false };
      await error(await fetch(base + '/api/tasks'), 401, 'UNAUTHENTICATED');
      value = principal;
      await error(
        await fetch(base + '/api/tasks', {
          method: 'POST',
          headers: { ...headers, 'X-CSRF-Token': 'wrong' },
          body: '{"project_id":1,"title":"fixture"}',
        }),
        403,
        'INVALID_CSRF',
      );
      value = { ...principal, mustChangePassword: true };
      await error(await fetch(base + '/api/tasks'), 403, 'PASSWORD_CHANGE_REQUIRED');
      assert.equal((await fetch(base + '/api/me')).status, 200);
      value = principal;
      decision = 'hidden';
      await error(await fetch(base + '/api/tasks'), 404, 'NOT_FOUND');
      decision = 'forbidden';
      await error(await fetch(base + '/api/tasks'), 403, 'FORBIDDEN');
    },
    { session: async () => value, authorize: async () => decision, handlers },
  );
  await fixture(
    async (base) => {
      await error(await fetch(base + '/api/tasks'), 503, 'SERVICE_NOT_READY');
    },
    { handlers },
  );
});
test('Body allowlist/trim/null/coercion and idempotency UUID validation leave secrets untouched', async () => {
  let captured: unknown;
  const handlers = {
    [operation('POST', '/api/tasks').operationId]: async (
      ctx: Parameters<NonNullable<ApiHooks['authorize']>>[0],
    ) => {
      captured = ctx.body;
      throw new ApiFault('DATABASE_BUSY');
    },
  };
  await fixture(async (base) => {
    for (const body of [
      { project_id: '1', title: 'x' },
      { project_id: 1, title: '   ' },
      { project_id: 1, title: 'x', creator_id: 2 },
      { project_id: 1, title: 'x', due_date: '2027-02-29' },
      { project_id: 1, title: '😀'.repeat(101) },
      { project_id: 1, title: 'x', recurrence: 'daily' },
    ])
      await error(
        await fetch(base + '/api/tasks', { method: 'POST', headers, body: JSON.stringify(body) }),
        422,
        'VALIDATION_FAILED',
      );
    await error(
      await fetch(base + '/api/tasks', {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': 'invalid' },
        body: '{"project_id":1,"title":"x"}',
      }),
      422,
      'VALIDATION_FAILED',
    );
    const body = {
      project_id: 1,
      title: '  title  ',
      description: '  text  ',
      category: '  category  ',
      assignee_id: null,
    };
    await error(
      await fetch(base + '/api/tasks', { method: 'POST', headers, body: JSON.stringify(body) }),
      503,
      'DATABASE_BUSY',
    );
    assert.deepEqual(captured, { ...body, title: 'title', category: 'category' });
  }, secured(handlers));
  await fixture(
    async (base) => {
      const password = ' a ';
      assert.equal(
        (
          await fetch(base + '/api/login', {
            method: 'POST',
            headers,
            body: JSON.stringify({ username: 'fixture', password }),
          })
        ).status,
        200,
      );
      assert.deepEqual(captured, { username: 'fixture', password });
    },
    {
      handlers: {
        [operation('POST', '/api/login').operationId]: async (ctx) => {
          captured = ctx.body;
          return { status: 200, body: selfFixture() };
        },
      },
    },
  );
});
test('Pagination/query wire is strict with page1/size50 defaults and max100; export cannot paginate', async () => {
  let query: unknown;
  await fixture(
    async (base) => {
      assert.equal((await fetch(base + '/api/tasks')).status, 200);
      assert.deepEqual(query, { page: 1, pageSize: 50 });
      assert.equal(
        (
          await fetch(
            base +
              '/api/tasks?page=2&pageSize=100&status=todo&status=doing&assignee=null&has_due=false',
          )
        ).status,
        200,
      );
      assert.deepEqual(query, {
        page: 2,
        pageSize: 100,
        status: ['todo', 'doing'],
        assignee: null,
        has_due: false,
      });
      for (const raw of [
        'pageSize=101',
        'page=01',
        'page=1&page=2',
        'sort=password_hash',
        'status[]=todo',
        'status=todo&status=todo',
        'has_due=false&due_from=2026-01-01',
        '__proto__=x',
      ])
        await error(await fetch(base + '/api/tasks?' + raw), 400, 'INVALID_QUERY');
      await error(await fetch(base + '/api/export/tasks.csv?page=1'), 400, 'INVALID_QUERY');
    },
    secured({
      [operation('GET', '/api/tasks').operationId]: async (ctx) => {
        query = ctx.query;
        return { status: 200, body: list };
      },
    }),
  );
});
test('Public response schema rejects sensitive fields; safe error/logger/requestId/currentVersion/retry headers match wire', async () => {
  const logged: unknown[] = [];
  let mode = 'secret';
  await fixture(
    async (base) => {
      const request = () =>
        fetch(base + '/api/tasks', { headers: { 'X-Request-Id': 'client-spoof' } });
      const response = await request();
      const body = await error(response, 500, 'INTERNAL_ERROR');
      assert(!JSON.stringify(body).includes('SECRET'));
      assert.notEqual(body.error.requestId, 'client-spoof');
      mode = 'throw';
      await error(await request(), 500, 'INTERNAL_ERROR');
      assert(!JSON.stringify(logged).includes('SECRET'));
      assert.equal(logged.length, 2);
      mode = 'unknown';
      await error(await request(), 500, 'INTERNAL_ERROR');
      mode = 'version';
      const conflict = await error(await request(), 409, 'VERSION_CONFLICT');
      assert.equal(conflict.error.currentVersion, 2);
      mode = 'busy';
      const busy = await request();
      await error(busy, 503, 'DATABASE_BUSY');
      assert.equal(busy.headers.get('retry-after'), '5');
    },
    secured({
      [operation('GET', '/api/tasks').operationId]: async () => {
        if (mode === 'secret') return { status: 200, body: { ...list, password_hash: 'SECRET' } };
        if (mode === 'throw') throw new Error('SQL /private/path PASSWORD SECRET');
        if (mode === 'unknown') throw new ApiFault('uncataloged' as ErrorCode);
        if (mode === 'version') requireVersion(2, 1);
        throw new ApiFault('DATABASE_BUSY');
      },
    }),
    (event) => logged.push(event),
  );
});
test('No-body command rejects injected JSON and 204 emits no response body', async () => {
  await fixture(
    async (base) => {
      await error(
        await fetch(base + '/api/logout', { method: 'POST', headers, body: '{}' }),
        422,
        'VALIDATION_FAILED',
      );
      const response = await fetch(base + '/api/logout', { method: 'POST', headers });
      assert.equal(response.status, 204);
      assert.equal(await response.text(), '');
    },
    secured({ [operation('POST', '/api/logout').operationId]: async () => ({ status: 204 }) }),
  );
});
test('Merged task validation is deferred to authoritative transaction state, not request omissions', () => {
  const state = { start_date: '2026-10-01', due_date: '2026-10-06', recurrence: 'weekly' };
  assert.throws(() =>
    validateBusiness('PATCH', '/api/tasks/{id}', { version: 1, due_date: null }, state),
  );
  validateBusiness(
    'PATCH',
    '/api/tasks/{id}',
    { version: 1, due_date: null, recurrence: 'none' },
    state,
  );
});
test('Health routes preserve wire/query allowlist; HSTS respects configured trusted proxy', async () => {
  const config = parseConfiguration({
    NODE_ENV: 'production',
    DB_PROVIDER: 'sqlserver',
    DB_SERVER: 'fixture.invalid',
    DB_NAME: 'fixture_test',
    DB_USER: 'fixture',
    DB_PASSWORD: 'fixture-placeholder',
    DB_BACKUP_DIR: '/private/tmp/friday-api-backup',
    DATA_DIR: '/private/tmp/friday-api-data',
    LOG_DIR: '/private/tmp/friday-api-logs',
    APP_ORIGIN: origin,
    COOKIE_SECURE: 'true',
  });
  for (const trusted of [false, true]) {
    config.trustedProxies = trusted ? ['127.0.0.1'] : [];
    await fixture(
      async (base) => {
        const live = await fetch(base + '/health/live', {
          headers: { 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'evil.invalid' },
        });
        assert.deepEqual(await live.json(), { status: 'ok' });
        assert.equal(
          live.headers.get('strict-transport-security'),
          trusted ? 'max-age=31536000' : null,
        );
        const ready = await fetch(base + '/health/ready');
        assert.equal(ready.status, 503);
        assert.deepEqual(await ready.json(), { status: 'not_ready' });
        await error(await fetch(base + '/health/live?secret=1'), 400, 'INVALID_QUERY');
        await error(await fetch(base + '/health/ready?secret=1'), 400, 'INVALID_QUERY');
      },
      {},
      undefined,
      config,
    );
  }
});
