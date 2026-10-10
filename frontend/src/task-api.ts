import { z } from 'zod';
const id = z.number().int().min(1).max(2147483647),
  time = z.string().datetime(),
  date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable();
export const statuses = ['todo', 'doing', 'review', 'done'] as const;
export const statusLabel = {
  todo: 'Not started',
  doing: 'Working on it',
  review: 'In review',
  done: 'Done',
};
export const priorities = ['low', 'medium', 'high', 'urgent'] as const;
export const taskSchema = z
  .object({
    id,
    group_id: id.nullable().optional(),
    project_id: id,
    project_name: z.string().min(1).max(100),
    owner_team_id: id,
    owner_team_name: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    description: z.string().max(10000),
    category: z.string().max(80),
    status: z.enum(statuses),
    priority: z.enum(priorities),
    assignee_ids: z.array(id).max(100).optional(),
    assignees: z
      .array(z.object({ id, display_name: z.string(), active: z.boolean() }).strict())
      .max(100)
      .optional(),
    assignee_id: id.nullable(),
    assignee: z
      .object({ id, display_name: z.string().min(1).max(100), active: z.boolean() })
      .strict()
      .nullable(),
    creator_id: id,
    start_date: date,
    due_date: date,
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']),
    recurrence_anchor_day: z.number().int().min(1).max(31).nullable(),
    predecessor_task_id: id.nullable(),
    successor_task_id: id.nullable(),
    task_no: z.string().min(1).max(32).nullable(),
    version: id,
    created_at: time,
    updated_at: time,
    completed_at: time.nullable(),
    deleted_at: time.nullable(),
    deleted_by: id.nullable(),
    subtask_count: z.number().int().min(0),
    subtask_done_count: z.number().int().min(0),
    overdue: z.boolean(),
  })
  .strict();
export const subtaskSchema = z
  .object({
    remark: z.string().max(2000),
    assignee_id: id.nullable().optional(),
    id,
    task_id: id,
    title: z.string().min(1).max(200),
    done: z.boolean(),
    version: id,
    created_at: time,
  })
  .strict();
export const detailSchema = taskSchema
  .extend({ subtasks: z.array(subtaskSchema).max(10000) })
  .strict();
export const detailReply = z.object({ item: detailSchema }).strict();
export const mutationReply = z
  .object({
    item: detailSchema,
    successor: taskSchema.nullable(),
    affected_columns: z.array(z.object({ status: z.enum(statuses), version: id }).strict()).max(4),
  })
  .strict();
export const subtaskReply = z.object({ item: subtaskSchema, task: taskSchema }).strict();
export const taskReply = z.object({ item: taskSchema }).strict();
const page = {
  page: id,
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0).max(2147483647),
};
export const taskPage = z.object({ ...page, items: z.array(taskSchema).max(100) }).strict();
export const trashPage = z
  .object({
    ...page,
    items: z.array(taskSchema.extend({ restore_before: time }).strict()).max(100),
  })
  .strict();
export type Task = z.infer<typeof taskSchema>;
export type Detail = z.infer<typeof detailSchema>;
export type Subtask = z.infer<typeof subtaskSchema>;
export const columnSchema = z
  .object({
    status: z.enum(statuses),
    version: id,
    task_ids: z.array(id).max(500),
    complete: z.boolean(),
  })
  .strict();
export const boardSchema = z
  .object({
    project_id: id,
    mode: z.enum(['board', 'list_required']),
    total: z.number().int().min(0),
    columns: z.array(columnSchema).length(4),
    tasks: z.array(taskSchema).max(500),
  })
  .strict();
export const moveReply = z
  .object({
    task: taskSchema,
    successor: taskSchema.nullable(),
    affected_columns: z.array(columnSchema).min(1).max(3),
  })
  .strict();
export type Board = z.infer<typeof boardSchema>;
export type Status = (typeof statuses)[number];

export const priorityLabel = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export const projectGroup = z
  .object({
    id,
    project_id: id,
    name: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    position: z.number().int().nonnegative(),
    version: id,
    created_at: z.string(),
  })
  .strict();
export const projectGroups = z.object({ items: z.array(projectGroup).max(1000) }).strict();
export type ProjectGroup = z.infer<typeof projectGroup>;
