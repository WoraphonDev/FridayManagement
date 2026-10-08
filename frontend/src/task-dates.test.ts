import { describe, it, expect } from 'vitest';
import { dateAdd, monthAdd, calendarDays, ganttPlacement, dueGroup } from './task-dates';
import { emptyFilters, taskParameters, allTaskPages } from './task-list';
import type { Task } from './task-api';
describe('T045/046 dates and exhaustive API list', () => {
  it('date-only leap/month/year boundaries and terminal years', () => {
    expect(dateAdd('2028-02-28', 1)).toBe('2028-02-29');
    expect(dateAdd('2028-02-29', 1)).toBe('2028-03-01');
    expect(dateAdd('2027-12-31', 1)).toBe('2028-01-01');
    expect(dateAdd('0001-01-01', -1)).toBe('0001-01-01');
    expect(dateAdd('9999-12-31', 1)).toBe('9999-12-31');
    expect(monthAdd('2027-12-15', 1)).toBe('2028-01-01');
    expect(monthAdd('9999-11-01', 1)).toBe('9999-12-01');
    expect(monthAdd('9999-12-01', 1)).toBe('9999-12-01');
    expect(monthAdd('0001-01-01', -1)).toBe('0001-01-01');
  });
  it('42 calendar days Monday-first, leap day and crossing year', () => {
    const days = calendarDays('2028-02-01');
    expect(days).toHaveLength(42);
    expect(days[0]).toBe('2028-01-31');
    expect(days).toContain('2028-02-29');
    expect(calendarDays('2028-01-01')[0]).toBe('2027-12-27');
  });
  it('inclusive clipped bars, one-day bar, viewport overlap and due-only marker', () => {
    expect(
      ganttPlacement({ start_date: '2027-12-25', due_date: '2028-01-02' }, '2028-01-01', 14),
    ).toEqual({ offset: 0, span: 2, marker: false });
    expect(
      ganttPlacement({ start_date: '2028-01-14', due_date: '2028-01-14' }, '2028-01-01', 14),
    ).toEqual({ offset: 13, span: 1, marker: false });
    expect(ganttPlacement({ start_date: null, due_date: '2028-01-01' }, '2028-01-01', 14)).toEqual({
      offset: 0,
      span: 1,
      marker: true,
    });
    expect(
      ganttPlacement({ start_date: '2028-01-01', due_date: null }, '2028-01-01', 14),
    ).toBeNull();
    expect(
      ganttPlacement({ start_date: '2027-01-01', due_date: '2027-12-31' }, '2028-01-01', 14),
    ).toBeNull();
  });
  it('done separated even overdue; null is no-due and Bangkok today from self', () => {
    expect(dueGroup({ status: 'done', due_date: '2020-01-01' }, '2026-10-06')).toBe('done');
    expect(dueGroup({ status: 'todo', due_date: null }, '2026-10-06')).toBe('none');
    expect(dueGroup({ status: 'doing', due_date: '2026-10-06' }, '2026-10-06')).toBe('today');
    expect(dueGroup({ status: 'todo', due_date: '2026-10-05' }, '2026-10-06')).toBe('overdue');
  });
  it('shared AND filters, status/priority OR; my tasks assignee and creator views distinct', () => {
    const filters = {
      ...emptyFilters,
      q: 'budget',
      project: '12',
      status: ['todo', 'doing'],
      priority: ['urgent', 'high'],
      due_from: '2026-10-06',
      due_to: '2026-10-08',
    };
    const q = taskParameters(filters, '2026-10-06', { self: 7 }).query;
    expect(q.get('assignee')).toBe('7');
    expect(q.has('creator')).toBe(false);
    expect(q.getAll('status')).toEqual(['todo', 'doing']);
    expect(q.getAll('priority')).toEqual(['urgent', 'high']);
    expect(q.get('due_to')).toBe('2026-10-08');
    const created = taskParameters(filters, '2026-10-06', { self: 7, created: true }).query;
    expect(created.get('creator')).toBe('7');
    expect(created.has('assignee')).toBe(false);
  });
  it('empty intersections never silently broaden filters', () => {
    expect(
      taskParameters({ ...emptyFilters, status: ['done'], group: 'today' }, '2026-10-06', {}).empty,
    ).toBe(true);
    expect(
      taskParameters({ ...emptyFilters, due_from: '2026-10-07', group: 'today' }, '2026-10-06', {})
        .empty,
    ).toBe(true);
    expect(taskParameters({ ...emptyFilters, group: 'overdue' }, '0001-01-01', {}).empty).toBe(
      true,
    );
  });
  it('loads 205 rows over 3 pages rather than presenting first page as complete', async () => {
    const read = async (p: number) => ({
      items: Array.from(
        { length: p === 3 ? 5 : 100 },
        (_, i) => ({ id: (p - 1) * 100 + i + 1 }) as Task,
      ),
      page: p,
      pageSize: 100,
      total: 205,
    });
    const all = await allTaskPages(read, new AbortController().signal);
    expect(all.items).toHaveLength(205);
    expect(all.items.at(-1)?.id).toBe(205);
  });
  it('moving/duplicate/missing page set rejected and cancellation stops pagination', async () => {
    const c = new AbortController();
    const first = { items: [{ id: 1 } as Task], page: 1, pageSize: 1, total: 2 };
    await expect(
      allTaskPages(async (p) => (p === 1 ? first : { ...first, page: 2 }), c.signal),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      allTaskPages(
        async (p) =>
          p === 1 ? first : { ...first, total: 3, page: 2, items: [{ id: 2 } as Task] },
        c.signal,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      allTaskPages(async (p) => (p === 1 ? first : { ...first, page: 2, items: [] }), c.signal),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      allTaskPages(async () => {
        c.abort();
        return first;
      }, c.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
describe('FR-45 My work groups (Bangkok, Monday weeks)', () => {
  it('splits overdue/today/this week/next week/later/no date/done', async () => {
    const { myWorkGroup } = await import('./task-dates');
    const today = '2026-10-07'; // Wednesday; week Mon 5 – Sun 11
    const g = (due: string | null, status = 'todo') =>
      myWorkGroup({ status, due_date: due } as never, today);
    expect(g('2026-10-06')).toBe('overdue');
    expect(g('2026-10-07')).toBe('today');
    expect(g('2026-10-11')).toBe('this_week');
    expect(g('2026-10-12')).toBe('next_week');
    expect(g('2026-10-18')).toBe('next_week');
    expect(g('2026-10-19')).toBe('later');
    expect(g(null)).toBe('none');
    expect(g('2026-10-01', 'done')).toBe('done');
    expect(myWorkGroup({ status: 'todo', due_date: '2026-10-11' } as never, '2026-10-11')).toBe(
      'today',
    );
    expect(myWorkGroup({ status: 'todo', due_date: '2026-10-12' } as never, '2026-10-11')).toBe(
      'next_week',
    );
  });
});
