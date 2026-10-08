import { test, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Reports } from './Reports';
import { Notifications } from './Notifications';
import { selfFixture } from './test-fixtures';
import { apiClient } from './api';
import { monthFilters, reportParameters, notificationsPage, reportSchema } from './report-api';
test('T054 Bangkok month at UTC boundary and immutable exact shared report/export parameters', () => {
  const filters = monthFilters(new Date('2026-09-30T17:00:00.000Z'));
  expect(filters.date_from).toBe('2026-10-01');
  expect(filters.date_to).toBe('2026-10-31');
  const f = { ...filters, team: '2', project: '3', assignee: 'null', date_basis: 'due' as const };
  const q = reportParameters(f);
  expect(new URLSearchParams(q).get('assignee')).toBe('null');
  expect(q).toContain('date_basis=due');
  expect(f.project).toBe('3');
});
test('T051/T054 safe offline initial surfaces, labeled controls and web-only notification promise', () => {
  const html = renderToStaticMarkup(
    <Reports self={selfFixture()} online={false} onFailure={() => {}} />,
  );
  for (const label of [
    "Owner team",
    "Projects",
    "Assignee",
    "Date basis",
    "From date",
    "To date",
    "Export CSV",
  ])
    expect(html).toContain(label);
  expect(html).not.toContain('NaN');
  expect(html).toContain('disabled');
  const n = renderToStaticMarkup(
    <Notifications self={selfFixture()} online={false} onFailure={() => {}} />,
  );
  expect(n).toContain('Notifications refresh');
  expect(n).toContain("Mark all read");
});
test('T053 CSV client permits only exact export path/MIME, same-origin no-store, explicit 422 limit error', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response('\uFEFF"id"\r\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8' } }),
    );
  const client = apiClient(fetcher, () => true);
  const blob = await client.request('/api/export/tasks.csv?project=1', {
    csv: true,
    parse: (v) => v as Blob,
  });
  expect(blob).toBeInstanceOf(Blob);
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'text/csv' },
  });
  await expect(
    client.request('/api/evil.csv', { csv: true, parse: (v) => v }),
  ).rejects.toMatchObject({ kind: 'request' });
  fetcher.mockResolvedValueOnce(new Response('bad', { headers: { 'Content-Type': 'text/html' } }));
  await expect(
    client.request('/api/export/tasks.csv', { csv: true, parse: (v) => v }),
  ).rejects.toMatchObject({ kind: 'invalid' });
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: { code: 'EXPORT_LIMIT_EXCEEDED', message: 'safe' } }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  await expect(
    client.request('/api/export/tasks.csv', { csv: true, parse: (v) => v }),
  ).rejects.toMatchObject({ code: 'EXPORT_LIMIT_EXCEEDED', status: 422 });
});
test('T050/T052 strict response schemas reject untrusted fields and invalid counts', () => {
  expect(() =>
    notificationsPage.parse({ items: [], page: 1, pageSize: 50, total: 0, unread_count: -1 }),
  ).toThrow();
  expect(() => reportSchema.parse({ total: 0, completion_percentage: NaN })).toThrow();
});
