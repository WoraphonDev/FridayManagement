import { addDays, daysBetween } from './dates.js';
/** 2026-10-05 is a Monday; Bangkok weeks start Monday (SRS §9.9). */
const anchorMonday = '2026-10-05';
export function mondayOf(date: string): string {
  const offset = ((daysBetween(anchorMonday, date) % 7) + 7) % 7;
  return addDays(date, -offset);
}
/**
 * Indexes of the weeks (each given by its Monday) that a task's start–due range overlaps.
 * A single date counts in its own week; no dates returns null (the "No date" bucket).
 */
export function weekIndexes(
  task: { start_date: string | null; due_date: string | null },
  mondays: string[],
): number[] | null {
  const first = task.start_date ?? task.due_date,
    last = task.due_date ?? task.start_date;
  if (!first || !last) return null;
  const [from, to] = first <= last ? [first, last] : [last, first];
  const hits: number[] = [];
  mondays.forEach((monday, i) => {
    if (from <= addDays(monday, 6) && to >= monday) hits.push(i);
  });
  return hits;
}
