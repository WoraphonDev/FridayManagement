import { z } from 'zod';
import { taskSchema } from './task-api';

const count = z.number().int().min(0);
export const overviewSchema = z
  .object({
    bangkok_today: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
    by_status: z.object({ todo: count, doing: count, review: count, done: count }).strict(),
    open_total: count,
    overdue: count,
    due_today: count,
    due_this_week: count,
    no_date: count,
    done_last_7_days: count,
    by_project: z
      .array(
        z
          .object({
            project_id: z.number().int().min(1),
            project_name: z.string().min(1).max(100),
            open_count: count,
          })
          .strict(),
      )
      .max(1000),
    next_up: z.array(taskSchema).max(5),
  })
  .strict();
export type Overview = z.infer<typeof overviewSchema>;
