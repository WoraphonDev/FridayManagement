/** Owner 2026-10-10: show the server task number (TK26100001); fall back to the id for rows without one. */
export function taskNumber(task: { id: number; task_no?: string | null }) {
  return task.task_no ?? `#${task.id}`;
}
