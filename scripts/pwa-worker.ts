import { createHash } from 'node:crypto';
export function pwaWorker(bundle: Record<string, unknown>, publicVersion = '') {
  const assets = Object.keys(bundle).filter((name) =>
    /^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(name),
  );
  const version = createHash('sha256')
    .update(JSON.stringify(assets) + publicVersion)
    .digest('hex')
    .slice(0, 20);
  const allowed = [
    '/offline.html',
    '/manifest.webmanifest',
    '/favicon.svg',
    '/icon-192.png',
    '/icon-512.png',
    ...assets.map((name) => '/' + name),
  ];
  return `const CACHE = 'friday-static-${version}';
const ALLOWED = new Set(${JSON.stringify(allowed)});
function publicAsset(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin && !url.search && ALLOWED.has(url.pathname);
}
async function publicResponse(path) {
  const response = await fetch(path, { credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
  const type = response.headers.get('Content-Type') || '';
  const expected = path.endsWith('.js') ? /javascript/ : path.endsWith('.css') ? /text\\/css/ : path.endsWith('.png') ? /image\\/png/ : path.endsWith('.svg') ? /image\\/svg/ : path.endsWith('.webmanifest') ? /json/ : /text\\/html/;
  if (!response.ok || !expected.test(type)) throw new Error('STATIC_ASSET_FAILED');
  return response;
}
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Drain each no-store response immediately: unread bodies can occupy all
    // worker connections while the remaining precache requests wait for a slot.
    const responses = await Promise.all([...ALLOWED].map(async (path) => {
      const response = await publicResponse(path);
      return new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers });
    }));
    const cache = await caches.open(CACHE);
    await Promise.all([...ALLOWED].map((path, index) => cache.put(path, responses[index])));
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('friday-static-') && key !== CACHE) await caches.delete(key);
  })());
});
// No skipWaiting, clients.claim, private HTML, API cache or queued writes.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (publicAsset(request)) {
    event.respondWith((async () => {
      const cached = await (await caches.open(CACHE)).match(url.pathname);
      return cached || publicResponse(url.pathname);
    })());
  } else if (request.method === 'GET' && request.mode === 'navigate' && url.origin === self.location.origin && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/health/')) {
    event.respondWith(fetch(request, { signal: AbortSignal.timeout(10000) }).catch(async () => (await (await caches.open(CACHE)).match('/offline.html')) || Response.error()));
  }
});`;
}
