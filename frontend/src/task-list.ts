import { ApiError } from './api';
import { dateAdd } from './task-dates';
import type { Task } from './task-api';
export const emptyFilters = {
  q: '',
  project: '',
  team: '',
  assignee: '',
  status: [] as string[],
  priority: [] as string[],
  category: '',
  due_from: '',
  due_to: '',
  has_due: '',
  sort: 'due_asc',
  group: '',
};
export type Filters = typeof emptyFilters;
export function taskParameters(
  filters: Filters,
  today: string,
  scope: { project?: number; self?: number; created?: boolean },
) {
  const query = new URLSearchParams();
  for (const key of [
    'q',
    'project',
    'team',
    'assignee',
    'category',
    'due_from',
    'due_to',
    'has_due',
    'sort',
  ] as const)
    if (filters[key]) query.set(key, filters[key]);
  if (scope.project) query.set('project', String(scope.project));
  if (scope.self) {
    query.delete('assignee');
    query.set(scope.created ? 'creator' : 'assignee', String(scope.self));
  }
  let status = filters.status;
  if (filters.group === 'done')
    status = status.length ? status.filter((s) => s === 'done') : ['done'];
  else if (filters.group)
    status = (status.length ? status : ['todo', 'doing', 'review']).filter((s) => s !== 'done');
  // No matching status is represented locally; never silently expand to every status.
  for (const value of status) query.append('status', value);
  if (filters.group === 'today') {
    query.set('due_from', [today, filters.due_from].filter(Boolean).sort().at(-1)!);
    query.set('due_to', [today, filters.due_to].filter(Boolean).sort()[0]!);
  }
  if (filters.group === 'overdue')
    query.set('due_to', [dateAdd(today, -1), filters.due_to].filter(Boolean).sort()[0]!);
  if (filters.group === 'future')
    query.set('due_from', [dateAdd(today, 1), filters.due_from].filter(Boolean).sort().at(-1)!);
  if (filters.group === 'none') query.set('has_due', 'false');
  for (const value of filters.priority) query.append('priority', value);
  const empty =
    (filters.group === 'none' && filters.has_due === 'true') ||
    (!!filters.group && !status.length) ||
    (filters.group === 'overdue' && today === '0001-01-01') ||
    (filters.group === 'future' && today === '9999-12-31') ||
    (!!query.get('due_from') &&
      !!query.get('due_to') &&
      query.get('due_from')! > query.get('due_to')!) ||
    (query.get('has_due') === 'false' && (!!query.get('due_from') || !!query.get('due_to')));
  return { query, empty };
}
type Page = { items: Task[]; total: number; page: number; pageSize: number };
/** Exhaust pagination before presenting the timeline as complete. Reject a moving page set. */
export async function allTaskPages(read: (page: number) => Promise<Page>, signal: AbortSignal) {
  const first = await read(1),
    items = [...first.items],
    seen = new Set(items.map((t) => t.id));
  if (seen.size !== items.length) throw new ApiError('conflict', 409);
  for (let page = 2; page <= Math.ceil(first.total / first.pageSize); page++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const next = await read(page);
    if (next.total !== first.total || next.pageSize !== first.pageSize)
      throw new ApiError('conflict', 409);
    for (const item of next.items) {
      if (seen.has(item.id)) throw new ApiError('conflict', 409);
      seen.add(item.id);
      items.push(item);
    }
  }
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (items.length !== first.total) throw new ApiError('conflict', 409);
  return { ...first, items };
}
