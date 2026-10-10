import { z } from 'zod';
import { apiClient } from './api';
const id = z.number().int().positive().max(2147483647),
  time = z.string().datetime();
const person = z
  .object({ id, display_name: z.string().min(1).max(100), active: z.boolean() })
  .strict();
const page = <T extends z.ZodType>(item: T) =>
  z
    .object({
      items: z.array(item).max(100),
      page: id,
      pageSize: z.number().int().min(1).max(100),
      total: z.number().int().nonnegative(),
    })
    .strict();
export const comment = z
  .object({ id, task_id: id, author: person, body: z.string().min(1).max(5000), created_at: time })
  .strict();
export const attachment = z
  .object({
    id,
    task_id: id,
    uploader: person,
    original_name: z.string().min(1).max(200),
    bytes: z.number().int().min(1).max(10485760),
    validated_type: z.string().min(1).max(100),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    created_at: time,
    deleted_at: time.nullable(),
    can_delete: z.boolean(),
    can_restore: z.boolean(),
  })
  .strict();
export const taskEvent = z
  .object({
    id,
    task_id: id,
    actor: person.nullable(),
    action: z.enum([
      'created',
      'updated',
      'assigned',
      'status_changed',
      'reopened',
      'deleted',
      'restored',
      'subtask_changed',
      'comment_added',
      'attachment_changed',
      'reordered',
      'recurrence_generated',
      'access_cleanup',
    ]),
    field_changes: z
      .array(
        z
          .object({
            field: z.enum([
              'title',
              'description',
              'category',
              'status',
              'priority',
              'assignee_id',
              'assignee_ids',
              'group_id',
              'group_before_task_id',
              'start_date',
              'due_date',
              'recurrence',
              'recurrence_anchor_day',
              'deleted_at',
              'subtask',
              'comment',
              'attachment',
              'position',
              'task',
              'completed_at',
              'comment_id',
              'before_task_id',
              'successor_task_id',
              'predecessor_task_id',
            ]),
            before: z.union([z.string(), z.number(), z.boolean(), z.null()]),
            after: z.union([z.string(), z.number(), z.boolean(), z.null()]),
          })
          .strict(),
      )
      .max(100),
    request_id: z.string().uuid(),
    created_at: time,
  })
  .strict();
export const comments = page(comment),
  attachments = page(attachment),
  events = page(taskEvent);
export type Attachment = z.infer<typeof attachment>;
/** Reuse the JSON client's same-origin, session and safe-error handling with actual upload progress. */
export function uploadFile(
  task: number,
  file: File,
  csrf: string,
  key: string,
  signal: AbortSignal,
  progress: (p: number) => void,
) {
  const fetcher: typeof fetch = async (input, init) =>
    new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(init?.method ?? 'POST', String(input));
      xhr.withCredentials = true;
      for (const [k, v] of Object.entries((init?.headers as Record<string, string>) ?? {}))
        xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) progress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      };
      const abort = () => xhr.abort();
      signal.addEventListener('abort', abort, { once: true });
      xhr.onload = () => {
        signal.removeEventListener('abort', abort);
        resolve(
          new Response(xhr.responseText, {
            status: xhr.status,
            headers: xhr
              .getAllResponseHeaders()
              .trim()
              .split(/[\r\n]+/)
              .filter(Boolean)
              .map((line) => {
                const at = line.indexOf(':');
                return [line.slice(0, at), line.slice(at + 1).trim()] as [string, string];
              }),
          }),
        );
      };
      xhr.onerror = () => {
        signal.removeEventListener('abort', abort);
        reject(new Error('network'));
      };
      xhr.onabort = () => {
        signal.removeEventListener('abort', abort);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      xhr.send(init?.body as FormData);
    });
  const body = new FormData();
  body.append('file', file);
  return apiClient(fetcher).request(`/api/tasks/${task}/attachments`, {
    method: 'POST',
    body,
    csrf,
    key,
    signal,
    parse: (v) => z.object({ item: attachment }).strict().parse(v),
  });
}
