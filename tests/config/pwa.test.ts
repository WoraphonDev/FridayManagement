import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { pwaWorker } from '../../scripts/pwa-worker.js';
test('Service worker caches exact public build assets only; private/query/foreign/mutation requests bypass cache', async () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const fetched: string[] = [],
    cached = new Map<string, Response>();
  const worker = pwaWorker({
    'assets/main-HASH.js': {},
    'assets/main-HASH.css': {},
    'private.html': {},
  });
  runInNewContext(worker, {
    self: {
      location: { origin: 'https://friday.test' },
      addEventListener: (name: string, handler: (event: unknown) => void) =>
        handlers.set(name, handler),
    },
    URL,
    Response,
    AbortSignal,
    fetch: async (path: string, options: RequestInit) => {
      fetched.push(path);
      assert.equal(options.credentials, 'omit');
      return new Response('public', {
        headers: {
          'Content-Type': path.endsWith('.js')
            ? 'text/javascript'
            : path.endsWith('.css')
              ? 'text/css'
              : path.endsWith('.png')
                ? 'image/png'
                : path.endsWith('.svg')
                  ? 'image/svg+xml'
                  : path.endsWith('.webmanifest')
                    ? 'application/manifest+json'
                    : 'text/html',
        },
      });
    },
    caches: {
      open: async () => ({
        put: async (path: string, response: Response) => {
          cached.set(path, response);
        },
        match: async (path: string) => cached.get(path),
      }),
      keys: async () => [],
      delete: async () => true,
    },
  });
  let pending: Promise<void> = Promise.resolve();
  handlers.get('install')!({
    waitUntil: (work: Promise<void>) => {
      pending = work;
    },
  });
  await pending;
  assert.equal(cached.size, 7);
  assert.equal(fetched.length, 7);
  for (const [path, method] of [
    ['/api/me', 'GET'],
    ['/api/login', 'POST'],
    ['/api/files/1', 'GET'],
    ['/projects', 'GET'],
    ['/assets/main-HASH.js?private=1', 'GET'],
    ['https://other.test/assets/main-HASH.js', 'GET'],
    ['/assets/main-HASH.js', 'POST'],
  ]) {
    let intercepted = false;
    handlers.get('fetch')!({
      request: { url: new URL(path!, 'https://friday.test').href, method, mode: 'cors' },
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false, path);
  }
  assert.doesNotMatch(worker, /skipWaiting\(|clients\.claim\(/);
  assert.notEqual(pwaWorker({ 'assets/other-HASH.js': {} }), worker);
  assert.notEqual(
    pwaWorker({ 'assets/main-HASH.js': {}, 'assets/main-HASH.css': {} }, 'public-assets-changed'),
    worker,
  );
});
