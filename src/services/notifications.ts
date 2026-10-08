import type { Transaction } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
export type NotificationType =
  'assignment' | 'comment' | 'status' | 'access_cleanup' | 'due_tomorrow' | 'due_today' | 'overdue';
const messages: Record<NotificationType, string> = {
  assignment: 'You were assigned a task',
  comment: 'New comment',
  status: 'Task status changed',
  access_cleanup: 'Assignee removed after an account or access change',
  due_tomorrow: 'Task due tomorrow',
  due_today: 'Task due today',
  overdue: 'Task overdue',
};
/** Current logical project read access; password gates are enforced when reading notifications. */
export async function notificationRecipient(tx: Transaction, task: number, user: number) {
  return !!(
    await tx.query(
      sql(
        "SELECT u.id FROM dbo.users u JOIN dbo.tasks t ON t.id=@task JOIN dbo.projects p ON p.id=t.project_id WHERE u.id=@user AND u.active=1 AND (u.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=u.id AND m.team_role='lead') OR EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=u.id))",
        { task, user },
      ),
    )
  )[0];
}
/** Caller owns the business transaction. Unique range lock makes duplicate dispatch a no-op. */
export async function persistNotification(
  tx: Transaction,
  input: {
    task: number;
    user: number;
    actor?: number;
    type: NotificationType;
    key: string;
    now: string;
  },
) {
  if (input.user === input.actor || !(await notificationRecipient(tx, input.task, input.user)))
    return false;
  // The task title is snapshotted into the message so the list reads without another lookup.
  const [task] = await tx.query<{ title: string }>(
    sql('SELECT title FROM dbo.tasks WHERE id=@task', { task: input.task }),
  );
  const parameters = {
    task: input.task,
    user: input.user,
    type: input.type,
    message: task ? `${messages[input.type]}: ${task.title}` : messages[input.type],
    key: input.key,
    now: input.now,
  };
  const ids = await tx.query<{ id: number }>({
    sqlite:
      'INSERT INTO notifications(recipient_id,task_id,type,message,dedupe_key,created_at) SELECT $user,$task,$type,$message,$key,$now WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE dedupe_key=$key) RETURNING id',
    sqlserver:
      'INSERT INTO dbo.notifications(recipient_id,task_id,type,message,dedupe_key,created_at) OUTPUT INSERTED.id SELECT @user,@task,@type,@message,@key,@now WHERE NOT EXISTS(SELECT 1 FROM dbo.notifications WITH (UPDLOCK,HOLDLOCK) WHERE dedupe_key=@key)',
    parameters,
  });
  return ids.length === 1;
}
export async function dispatchTaskNotification(
  tx: Transaction,
  input: {
    task: number;
    version: number;
    actor: number;
    type: 'assignment' | 'comment' | 'status';
    recipients: (number | null)[];
    request: string;
    now: string;
  },
) {
  for (const user of new Set(input.recipients))
    if (user !== null)
      await persistNotification(tx, {
        task: input.task,
        user,
        actor: input.actor,
        type: input.type,
        key: `${input.type}:${input.task}:${input.version}:${user}:${input.request}`,
        now: input.now,
      });
}
export async function dispatchAccessCleanup(
  tx: Transaction,
  task: number,
  actor: number,
  request: string,
  now: string,
) {
  const recipients = await tx.query<{ id: number }>(
    sql(
      "SELECT u.id FROM dbo.users u JOIN dbo.tasks t ON t.id=@task JOIN dbo.projects p ON p.id=t.project_id WHERE u.active=1 AND (u.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=u.id AND m.team_role='lead')) ORDER BY u.id",
      { task },
    ),
  );
  for (const u of recipients)
    await persistNotification(tx, {
      task,
      user: u.id,
      actor,
      type: 'access_cleanup',
      key: `access_cleanup:${request}:${task}:${u.id}`,
      now,
    });
  return recipients.map((u) => u.id);
}
