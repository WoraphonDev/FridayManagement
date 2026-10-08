import { z } from 'zod';
// T-088 FR-50/FR-51 wire schemas (contract 1.5.0 Workload / ProjectOverview).
const id = z.number().int().min(1),
  count = z.number().int().min(0),
  date = z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
  person = z.object({ id, display_name: z.string().min(1).max(100), active: z.boolean() }).strict(),
  status = z.enum(['todo', 'doing', 'review', 'done']);
export const workloadSchema = z
  .object({
    scope: z.enum(['project', 'team']),
    scope_id: id,
    threshold: z.number().int().min(1).max(1000),
    weeks: z.array(date).min(1).max(12),
    rows: z
      .array(
        z
          .object({
            user: person.nullable(),
            job_title: z.string().min(1).max(50).nullable(),
            counts: z.array(count).max(12),
            no_date: count,
            tasks: z
              .array(
                z
                  .object({
                    id,
                    project_id: id,
                    title: z.string().min(1).max(200),
                    start_date: date.nullable(),
                    due_date: date.nullable(),
                  })
                  .strict(),
              )
              .max(1000),
          })
          .strict(),
      )
      .max(1000),
    truncated: z.boolean(),
  })
  .strict();
export type Workload = z.infer<typeof workloadSchema>;
export const overviewSchema = z
  .object({
    project_id: id,
    bangkok_today: date,
    total: count,
    done: count,
    progress_percent: z.number().int().min(0).max(100),
    by_status: z.object({ todo: count, doing: count, review: count, done: count }).strict(),
    overdue: count,
    overdue_tasks: z
      .array(
        z
          .object({ id, title: z.string().min(1).max(200), due_date: date.nullable(), status })
          .strict(),
      )
      .max(10),
    by_assignee: z
      .array(
        z
          .object({
            user: person.nullable(),
            job_title: z.string().min(1).max(50).nullable(),
            open: count,
            done: count,
          })
          .strict(),
      )
      .max(1000),
    by_job_title: z
      .array(
        z
          .object({ job_title: z.string().min(1).max(50).nullable(), open: count, done: count })
          .strict(),
      )
      .max(1000),
    recent_activity: z
      .array(
        z
          .object({
            task_id: id,
            task_title: z.string().min(1).max(200),
            actor: person,
            action: z.string().min(1).max(100),
            created_at: z.string().datetime(),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export type ProjectOverviewData = z.infer<typeof overviewSchema>;
/** FR-50: a cell is highlighted only when open tasks exceed the threshold (10 → no, 11 → yes). */
export const overThreshold = (count: number, threshold: number) => count > threshold;
/** Tasks behind one workload cell: overlapping that week, or undated for the "No date" column. */
export function cellTasks(row: Workload['rows'][number], week: string | null) {
  if (week === null) return row.tasks.filter((t) => !t.start_date && !t.due_date);
  const end = new Date(Date.parse(`${week}T00:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
  return row.tasks.filter((t) => {
    const a = t.start_date ?? t.due_date,
      b = t.due_date ?? t.start_date;
    if (!a || !b) return false;
    const [first, last] = a <= b ? [a, b] : [b, a];
    return first <= end && last >= week;
  });
}
