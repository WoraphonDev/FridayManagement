import { expect, test, vi } from 'vitest';
import { apiClient, ApiError, selfSchema } from './api';
import { selfFixture } from './test-fixtures';
import { allowedPages } from './navigation';
test.each([
  [401, 'session'],
  [403, 'forbidden'],
  [404, 'not-found'],
  [409, 'conflict'],
  [503, 'unavailable'],
])('HTTP %s is safe and leaves the caller draft intact', async (status, kind) => {
  const draft = { title: 'ร่างงานไทย', version: 2 };
  const original = structuredClone(draft);
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          message: 'SQL PASSWORD SECRET',
          requestId: '00000000-0000-4000-8000-000000000001',
          fieldErrors: { title: ['ตรวจชื่อเรื่อง'] },
        },
      }),
      { status: Number(status) },
    ),
  );
  await expect(
    apiClient(fetcher, () => true).request('/api/tasks/1', {
      method: 'PATCH',
      csrf: 'fixture',
      key: 'fixture',
      body: draft,
      parse: (v) => v,
    }),
  ).rejects.toMatchObject({ kind, status });
  expect(draft).toEqual(original);
  expect(fetcher).toHaveBeenCalledTimes(1);
  try {
    await apiClient(fetcher, () => true).request('/api/me', { parse: (v) => v });
  } catch (e) {
    expect((e as ApiError).message).not.toContain('SECRET');
  }
});
test('Offline writes are never sent or queued; network failure does not retry', async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network'));
  await expect(
    apiClient(fetcher, () => false).request('/api/tasks', {
      method: 'POST',
      csrf: 'fixture',
      body: { title: 'draft' },
      parse: (v) => v,
    }),
  ).rejects.toMatchObject({ kind: 'offline' });
  expect(fetcher).not.toHaveBeenCalled();
  await expect(
    apiClient(fetcher, () => true).request('/api/me', { parse: (v) => v }),
  ).rejects.toMatchObject({ kind: 'offline' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('Client binds same-origin credentials, cache policy, CSRF/key and query; external paths and missing CSRF fail', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}'));
  const client = apiClient(fetcher, () => true);
  await client.request('/api/tasks?status=todo&search=ไทย', { parse: (v) => v });
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    credentials: 'same-origin',
    cache: 'no-store',
  });
  await client.request('/api/tasks/1', {
    method: 'PATCH',
    csrf: 'csrf-fixture',
    key: 'idempotency-fixture',
    body: { title: 'draft' },
    parse: (v) => v,
  });
  expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({
    'X-CSRF-Token': 'csrf-fixture',
    'Idempotency-Key': 'idempotency-fixture',
  });
  for (const path of ['https://other.test/api/me', '/api/../secret', '//other.test/api/me'])
    await expect(client.request(path, { parse: (v) => v })).rejects.toBeInstanceOf(ApiError);
  await expect(
    client.request('/api/tasks', { method: 'POST', parse: (v) => v }),
  ).rejects.toMatchObject({ kind: 'forbidden' });
});
test('Malformed JSON or Self fails closed; valid Self accepts the locked fixture', async () => {
  expect(selfSchema.parse(selfFixture())).toEqual(selfFixture());
  for (const value of [
    { ...selfFixture(), secret: 'forbidden' },
    { ...selfFixture(), user: { ...selfFixture().user, org_role: 'owner' } },
  ])
    expect(() => selfSchema.parse(value)).toThrow();
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('not json'));
  await expect(
    apiClient(fetcher, () => true).request('/api/me', { parse: (v) => selfSchema.parse(v) }),
  ).rejects.toMatchObject({ kind: 'invalid' });
});
test.each([
  ['member', false, false, false, false],
  ['member', true, false, true, false],
  ['admin', false, false, true, true],
  ['admin', false, true, false, false],
] as const)(
  'Navigation %s lead=%s forced=%s gates privileged entries',
  (role, lead, forced, trash, users) => {
    const nav = allowedPages(selfFixture(role, lead, forced));
    expect(nav.some((p) => p.path === '/trash')).toBe(trash);
    expect(nav.some((p) => p.path === '/users')).toBe(users);
    if (forced) expect(nav.map((p) => p.path)).toEqual(['/', '/settings']);
  },
);
test('Unknown or inactive identity exposes only public navigation', () => {
  expect(allowedPages().map((p) => p.path)).toEqual(['/']);
  const self = selfFixture('admin');
  self.user.active = false;
  expect(allowedPages(self).map((p) => p.path)).toEqual(['/']);
});
