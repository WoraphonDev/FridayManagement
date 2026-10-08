import { validDate, validUtcTimestamp } from '../repository/value-codecs.js';
import { OperationError } from './failure.js';
const dayMs = 86_400_000;
const bangkokOffsetMs = 7 * 3_600_000;
const invalid = () => new OperationError(422, 'VALIDATION_FAILED');
function epoch(date: string): number {
  if (!validDate(date)) throw invalid();
  return Date.parse(`${date}T00:00:00.000Z`);
}
function dateAt(ms: number): string {
  const value = new Date(ms).toISOString().slice(0, 10);
  if (!validDate(value)) throw invalid();
  return value;
}
export function utcNow(clock: () => Date = () => new Date()): string {
  const value = clock().toISOString();
  if (!validUtcTimestamp(value)) throw invalid();
  return value;
}
export function bangkokToday(nowUtc: string): string {
  if (!validUtcTimestamp(nowUtc)) throw invalid();
  return dateAt(Date.parse(nowUtc) + bangkokOffsetMs);
}
export function addDays(date: string, days: number): string {
  if (!Number.isSafeInteger(days) || Math.abs(days) > 3_652_058) throw invalid();
  return dateAt(epoch(date) + days * dayMs);
}
export function daysBetween(start: string, end: string): number {
  return (epoch(end) - epoch(start)) / dayMs;
}
/** Local date range includes both days; timestamp queries use [start,endExclusive). */
export function bangkokInterval(start: string, end: string) {
  if (epoch(start) > epoch(end)) throw invalid();
  const from = new Date(epoch(start) - bangkokOffsetMs).toISOString();
  const to = new Date(epoch(end) + dayMs - bangkokOffsetMs).toISOString();
  if (!validUtcTimestamp(from) || !validUtcTimestamp(to)) throw invalid();
  return { start: from, endExclusive: to };
}
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export function monthlyAnchor(
  previous: Recurrence,
  next: Recurrence,
  due: string | null,
  previousDue: string | null,
  previousAnchor: number | null,
): number | null {
  if (next === 'none') return null;
  if (due === null) throw invalid();
  epoch(due);
  if (next !== 'monthly') return null;
  if (previous !== 'monthly' || previousDue !== due) return Number(due.slice(8));
  if (!Number.isInteger(previousAnchor) || previousAnchor! < 1 || previousAnchor! > 31)
    throw invalid();
  return previousAnchor;
}
export function nextOccurrence(
  due: string,
  start: string | null,
  recurrence: Exclude<Recurrence, 'none'>,
  anchor: number | null,
) {
  epoch(due);
  if (start !== null && epoch(start) > epoch(due)) throw invalid();
  let nextDue: string;
  if (recurrence === 'monthly') {
    if (!Number.isInteger(anchor) || anchor! < 1 || anchor! > 31) throw invalid();
    const currentYear = Number(due.slice(0, 4));
    const currentMonth = Number(due.slice(5, 7));
    const year = currentYear + Number(currentMonth === 12);
    const month = currentMonth === 12 ? 1 : currentMonth + 1;
    if (year > 9999) throw invalid();
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const last = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
    nextDue = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(anchor!, last)).padStart(2, '0')}`;
  } else {
    if (anchor !== null || !['daily', 'weekly'].includes(recurrence)) throw invalid();
    nextDue = addDays(due, recurrence === 'daily' ? 1 : 7);
  }
  return {
    due_date: nextDue,
    start_date: start === null ? null : addDays(nextDue, -daysBetween(start, due)),
    recurrence_anchor_day: anchor,
  };
}
export function retentionWindow(deletedAt: string, nowUtc: string) {
  if (!validUtcTimestamp(deletedAt) || !validUtcTimestamp(nowUtc)) throw invalid();
  const cutoff = new Date(Date.parse(deletedAt) + 30 * dayMs).toISOString();
  if (!validUtcTimestamp(cutoff)) throw invalid();
  return { cutoff, restorable: nowUtc < cutoff, purgeable: nowUtc >= cutoff };
}
