import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/api/app.js';

test('Loopback scaffold health/live works; readiness and business API fail closed without data creation', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const address = server.address();
    assert(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;
    const live = await fetch(base + '/health/live');
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok' });
    assert.equal(live.headers.get('cache-control'), 'no-store');
    assert.match(live.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/);
    const ready = await fetch(base + '/health/ready');
    assert.equal(ready.status, 503);
    assert.deepEqual(await ready.json(), { status: 'not_ready' });
    const write = await fetch(base + '/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"title":"should not write"}',
    });
    assert.equal(write.status, 503);
    const error = await write.json();
    assert.equal(error.error.code, 'SERVICE_NOT_READY');
    assert.equal(error.error.requestId, write.headers.get('x-request-id'));
    assert.equal((await fetch(base + '/.env')).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
