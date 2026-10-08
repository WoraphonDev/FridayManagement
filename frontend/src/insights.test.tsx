import { test, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { OverviewBody, WorkloadTable } from './ProjectInsights';
import { cellTasks, overThreshold, overviewSchema, workloadSchema } from './insights-api';
const person = (id: number, name: string) => ({ id, display_name: name, active: true });
const task = (id: number, start: string | null, due: string | null) => ({
  id,
  project_id: 1,
  title: `งาน ${id}`,
  start_date: start,
  due_date: due,
});
const workload = workloadSchema.parse({
  scope: 'project',
  scope_id: 1,
  threshold: 10,
  weeks: ['2026-10-05', '2026-10-12'],
  rows: [
    {
      user: person(2, 'สมชาย'),
      job_title: 'PM',
      counts: [11, 10],
      no_date: 1,
      tasks: [
        task(1, '2026-10-11', '2026-10-12'),
        task(2, null, '2026-10-13'),
        task(3, null, null),
      ],
    },
    {
      user: null,
      job_title: null,
      counts: [0, 1],
      no_date: 0,
      tasks: [task(4, '2026-10-19', null)],
    },
  ],
  truncated: false,
});
test('T088 threshold highlights only counts above it (10 no, 11 yes)', () => {
  expect([overThreshold(10, 10), overThreshold(11, 10)]).toEqual([false, true]);
  const html = renderToStaticMarkup(<WorkloadTable data={workload} onOpen={() => {}} />);
  expect(html.match(/workload-over/g)).toHaveLength(1);
  expect(html).toContain('aria-label="สมชาย: 11 tasks in week of 2026-10-05, over threshold"');
  expect(html).toContain('aria-label="สมชาย: 10 tasks in week of 2026-10-12"');
  expect(html).toContain('Unassigned');
  expect(html).toContain('job-title-badge">PM');
});
test('T088 cell task lists match week overlap and the No date column', () => {
  const row = workload.rows[0]!;
  expect(cellTasks(row, '2026-10-05').map((t) => t.id)).toEqual([1]);
  expect(cellTasks(row, '2026-10-12').map((t) => t.id)).toEqual([1, 2]);
  expect(cellTasks(row, null).map((t) => t.id)).toEqual([3]);
});
test('T088 overview renders percent, status counts, overdue and job titles', () => {
  const data = overviewSchema.parse({
    project_id: 1,
    bangkok_today: '2026-10-07',
    total: 7,
    done: 1,
    progress_percent: 14,
    by_status: { todo: 4, doing: 1, review: 1, done: 1 },
    overdue: 1,
    overdue_tasks: [{ id: 1, title: 'เลยกำหนด', due_date: '2026-10-06', status: 'todo' }],
    by_assignee: [{ user: person(2, 'สมชาย'), job_title: 'PM', open: 5, done: 1 }],
    by_job_title: [{ job_title: null, open: 1, done: 0 }],
    recent_activity: [],
  });
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <OverviewBody data={data} />
    </MemoryRouter>,
  );
  for (const text of ['14%', '1 of 7 tasks done', 'เลยกำหนด', 'No job title', 'No activity yet'])
    expect(html).toContain(text);
  expect(html).toContain('href="/projects/1/tasks/1"');
});
