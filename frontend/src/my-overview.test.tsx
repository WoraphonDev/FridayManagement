import { test, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { OverviewBody } from './MyOverview';
import { overviewSchema } from './overview-schema';
import { selfFixture } from './test-fixtures';
import { emptyFilters, myWorkFilters, taskParameters } from './task-list';
import { bangkokWeekEnd, myWorkGroup } from './task-dates';
const data = overviewSchema.parse({
  bangkok_today: '2026-10-07',
  by_status: { todo: 3, doing: 1, review: 1, done: 2 },
  open_total: 5,
  overdue: 1,
  due_today: 1,
  due_this_week: 1,
  no_date: 1,
  done_last_7_days: 1,
  by_project: [{ project_id: 4, project_name: 'โครงการ ก', open_count: 5 }],
  next_up: [],
});
test('T083 every Home widget links to My work with the matching filter', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <OverviewBody self={selfFixture()} data={data} />
    </MemoryRouter>,
  );
  for (const href of [
    '/my-tasks?range=overdue#my-group-overdue',
    '/my-tasks?range=today#my-group-today',
    '/my-tasks?range=this_week#my-group-this_week',
    '/my-tasks?range=none#my-group-none',
    '/my-tasks?completed_from=2026-10-01#my-group-done',
    '/my-tasks?status=review',
    '/my-tasks?project=4',
  ])
    expect(html).toContain(`href="${href}"`);
  expect(html).toContain('โครงการ ก');
});
test('T083 link filters map to the same task query; forged values are dropped', () => {
  const q = (search: string) =>
    Object.fromEntries(
      taskParameters(myWorkFilters(search), '2026-10-07', { self: 2 }).query.entries(),
    );
  expect(q('?range=this_week')).toMatchObject({
    assignee: '2',
    due_from: '2026-10-08',
    due_to: '2026-10-11',
  });
  expect(q('?completed_from=2026-10-01')).toMatchObject({
    status: 'done',
    date_basis: 'completed',
    date_from: '2026-10-01',
  });
  expect(q('?project=4&status=doing')).toMatchObject({ project: '4', status: 'doing' });
  expect(myWorkFilters('?range=x&status=blocked&project=-1&completed_from=1/10')).toEqual(
    emptyFilters,
  );
});
test('T083 Monday-start Bangkok week buckets at week edges', () => {
  expect(bangkokWeekEnd('2026-10-05')).toBe('2026-10-11');
  expect(bangkokWeekEnd('2026-10-11')).toBe('2026-10-11');
  expect(bangkokWeekEnd('2026-12-29')).toBe('2027-01-03');
  const g = (due: string, today: string) =>
    myWorkGroup({ status: 'todo', due_date: due } as never, today);
  expect(g('2026-10-11', '2026-10-10')).toBe('this_week');
  expect(g('2026-10-12', '2026-10-11')).toBe('next_week');
  expect(g('2026-10-19', '2026-10-11')).toBe('later');
});
