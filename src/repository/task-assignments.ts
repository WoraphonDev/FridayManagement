import type { Transaction } from '../domain/database.js';
import { sql } from './access-scope.js';
export async function assignmentIds(tx: Transaction, task: number, legacy?: number | null) {
  const rows = await tx.query<{ user_id: number }>(
    sql('SELECT user_id FROM dbo.task_assignees WHERE task_id=@task ORDER BY user_id', { task }),
  );
  return rows.length ? rows.map((r) => r.user_id) : legacy ? [legacy] : [];
}
export async function replaceAssignments(tx: Transaction, task: number, ids: number[]) {
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  await tx.execute(sql('DELETE FROM dbo.task_assignees WHERE task_id=@task', { task }));
  for (const user of unique)
    await tx.execute(
      sql('INSERT INTO dbo.task_assignees(task_id,user_id) VALUES(@task,@user)', { task, user }),
    );
  await tx.execute(
    sql('UPDATE dbo.tasks SET assignee_id=@user WHERE id=@task', { task, user: unique[0] ?? null }),
  );
}
