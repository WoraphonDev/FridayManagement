import type { Task } from './task-api.js';
const DAY = 86400000;
export function dateNumber(date: string) {
  return Date.parse(date + 'T00:00:00.000Z') / DAY;
}
const MIN = dateNumber('0001-01-01'),
  MAX = dateNumber('9999-12-31');
export function dateAdd(date: string, days: number) {
  return new Date(Math.min(MAX, Math.max(MIN, dateNumber(date) + days)) * DAY)
    .toISOString()
    .slice(0, 10);
}
export function monthAdd(date: string, months: number) {
  const index = Math.min(
    9999 * 12 + 11,
    Math.max(12, Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + months),
  );
  return (
    String(Math.floor(index / 12)).padStart(4, '0') +
    '-' +
    String((index % 12) + 1).padStart(2, '0') +
    '-01'
  );
}
export function calendarDays(month: string) {
  const first = month.slice(0, 7) + '-01';
  const weekday = new Date(first + 'T00:00:00Z').getUTCDay();
  const start = dateAdd(first, -((weekday + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => dateAdd(start, i));
}
export function ganttPlacement(
  task: Pick<Task, 'start_date' | 'due_date'>,
  first: string,
  days: number,
) {
  if (!task.due_date) return null;
  const begin = dateNumber(first),
    end = begin + days - 1,
    due = dateNumber(task.due_date);
  if (!task.start_date)
    return due >= begin && due <= end ? { offset: due - begin, span: 1, marker: true } : null;
  const start = dateNumber(task.start_date);
  if (start > end || due < begin) return null;
  return {
    offset: Math.max(start, begin) - begin,
    span: Math.min(due, end) - Math.max(start, begin) + 1,
    marker: false,
  };
}
export function dueGroup(task: Pick<Task, 'status' | 'due_date'>, today: string) {
  if (task.status === 'done') return 'done';
  if (!task.due_date) return 'none';
  return task.due_date < today ? 'overdue' : task.due_date === today ? 'today' : 'future';
}
export const myWorkGroups = [
  'overdue',
  'today',
  'this_week',
  'next_week',
  'later',
  'none',
  'done',
] as const;
export type MyWorkGroup = (typeof myWorkGroups)[number];
/** FR-45 grouping on Bangkok dates; weeks start Monday (SRS §9.9). */
export function myWorkGroup(task: Pick<Task, 'status' | 'due_date'>, today: string): MyWorkGroup {
  if (task.status === 'done') return 'done';
  if (!task.due_date) return 'none';
  if (task.due_date < today) return 'overdue';
  if (task.due_date === today) return 'today';
  const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86400000;
  const sinceMonday = (((day(today) - day('2026-10-05')) % 7) + 7) % 7;
  const weekEnd = day(today) + 6 - sinceMonday;
  const due = day(task.due_date);
  return due <= weekEnd ? 'this_week' : due <= weekEnd + 7 ? 'next_week' : 'later';
}
