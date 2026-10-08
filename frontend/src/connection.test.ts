import { expect, test } from 'vitest';
import { apiClient, readFailureCount } from './api';
import { setWritable } from './shared/connection';
test('Reconnect barrier blocks every mutation without queuing while reads remain available', async () => {
  const calls: string[] = [];
  const client = apiClient(async (_path, options) => {
    calls.push(options?.method ?? 'GET');
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  });
  setWritable(false);
  try {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE'] as const) {
      await expect(
        client.request('/api/tasks', { method, csrf: 'x', parse: (value) => value }),
      ).rejects.toMatchObject({ kind: 'unavailable' });
    }
    await client.request('/api/me', { parse: (value) => value });
    expect(calls).toEqual(['GET']);
    setWritable(true);
    expect(calls).toEqual(['GET']);
    await client.request('/api/tasks', { method: 'POST', csrf: 'x', parse: (value) => value });
    expect(calls).toEqual(['GET', 'POST']);
  } finally {
    setWritable(true);
  }
});
test('Failed authoritative reads are recorded even when screen callers handle errors', async () => {
  const start = readFailureCount();
  const client = apiClient(async () => new Response('{}', { status: 503 }));
  await client.request('/api/me', { parse: (value) => value }).catch(() => {});
  expect(readFailureCount()).toBe(start + 1);
});
