import { z } from 'zod';
import { apiClient } from './api';
import { projectPage, type Project } from './workspace-api';
const count = z.number().int().min(0).max(2147483647),
  id = count.min(1),
  time = z.string().datetime();
export const notificationSchema = z
  .object({
    id,
    task_id: id,
    type: z.enum([
      'assignment',
      'comment',
      'status',
      'access_cleanup',
      'due_tomorrow',
      'due_today',
      'overdue',
    ]),
    message: z.string().min(1).max(500),
    read_at: time.nullable(),
    created_at: time,
  })
  .strict();
export const notificationsPage = z
  .object({
    items: z.array(notificationSchema).max(100),
    page: id,
    pageSize: id.max(100),
    total: count,
    unread_count: count,
  })
  .strict();
export const reportSchema = z
  .object({
    metadata: z
      .object({
        date_basis: z.enum(['created', 'due', 'completed']),
        date_from: z.string().nullable(),
        date_to: z.string().nullable(),
        timezone: z.literal('Asia/Bangkok'),
        generated_at: time,
      })
      .strict(),
    total: count,
    by_status: z.object({ todo: count, doing: count, review: count, done: count }).strict(),
    overdue: count,
    unassigned: count,
    done_in_period: count,
    completion_percentage: z.number().min(0).max(100),
    workload: z
      .array(
        z
          .object({
            assignee: z
              .object({ id, display_name: z.string().min(1).max(100), active: z.boolean() })
              .strict()
              .nullable(),
            job_title: z.string().min(1).max(50).nullable(),
            open_count: count,
          })
          .strict(),
      )
      .max(10000),
  })
  .strict();
export type Report = z.infer<typeof reportSchema>;
export type ReportFilters = {
  team: string;
  project: string;
  assignee: string;
  job_title: string;
  date_basis: 'created' | 'due' | 'completed';
  date_from: string;
  date_to: string;
};
export function monthFilters(now = new Date()): ReportFilters {
  const local = new Date(now.getTime() + 7 * 3600000),
    year = local.getUTCFullYear(),
    month = local.getUTCMonth();
  return {
    team: '',
    project: '',
    assignee: '',
    job_title: '',
    date_basis: 'created',
    date_from: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    date_to: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
  };
}
export function reportParameters(filters: ReportFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== '') params.set(key, value);
  return params.toString();
}
export async function visibleProjects(signal?: AbortSignal, includeArchived = false) {
  const client = apiClient(),
    items: Project[] = [];
  for (let page = 1; ; page++) {
    const r = await client.request(
      `/api/projects?pageSize=100&page=${page}&includeArchived=${includeArchived}`,
      { signal, parse: (v) => projectPage.parse(v) },
    );
    items.push(...r.items);
    if (page * r.pageSize >= r.total) return items;
  }
}
const notificationLabels: Record<z.infer<typeof notificationSchema>['type'], string> = {
  assignment: 'You were assigned a task',
  comment: 'New comment',
  status: 'Task status changed',
  access_cleanup: 'Assignee removed after an account or access change',
  due_tomorrow: 'Task due tomorrow',
  due_today: 'Task due today',
  overdue: 'Task overdue',
};
/** Rows stored before English server copy keep their old text; show the English label instead. */
export function notificationText(n: z.infer<typeof notificationSchema>) {
  const label = notificationLabels[n.type];
  return n.message.startsWith(label) ? n.message : label;
}
