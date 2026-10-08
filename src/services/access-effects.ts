import { checklistAudit } from './checklist-audit.js';
import { assignmentIds, replaceAssignments } from '../repository/task-assignments.js';
import { dispatchAccessCleanup } from './notifications.js';
import { randomUUID } from 'node:crypto';
import type { Transaction, Row } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import { requireVersion } from '../domain/lifecycle.js';

/** Recheck effective write AFTER a membership/account change in the same transaction. */
export async function cleanupAssignments(
  tx: Transaction,
  target: number,
  actor: number,
  request: string,
  now: string,
  scope: { project?: number; team?: number } = {},
) {
  const tasks = await tx.query<
    Row & { id: number; version: number; project_id: number; owner_team_id: number }
  >(
    sql(
      `SELECT t.id,t.version,t.project_id,p.owner_team_id FROM dbo.tasks t JOIN dbo.projects p ON p.id=t.project_id JOIN dbo.users u ON u.id=@target
     WHERE (t.assignee_id=@target OR EXISTS(SELECT 1 FROM dbo.task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=@target) OR EXISTS(SELECT 1 FROM dbo.subtasks st WHERE st.task_id=t.id AND st.assignee_id=@target)) AND t.status<>'done' AND (@project IS NULL OR p.id=@project) AND (@team IS NULL OR p.owner_team_id=@team)
     AND (u.active=0 OR (u.org_role<>'admin' AND NOT EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=u.id AND m.team_role='lead') AND NOT EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=u.id AND pm.access IN ('manager','editor')))) ORDER BY t.id`,
      { target, project: scope.project ?? null, team: scope.team ?? null },
    ),
  );
  const viewers = new Set<number>([target]);
  for (const task of tasks) {
    const beforeIds = await assignmentIds(tx, task.id);
    const legacy = (
      await tx.query<{ assignee_id: number | null }>(
        sql('SELECT assignee_id FROM dbo.tasks WHERE id=@id', { id: task.id }),
      )
    )[0]!.assignee_id;
    if (!beforeIds.length && legacy) beforeIds.push(legacy);
    const remaining = beforeIds.filter((id) => id !== target);
    const children = await tx.query(
      sql(
        'SELECT id,title,done,assignee_id,version FROM dbo.subtasks WHERE task_id=@task AND assignee_id=@target',
        { task: task.id, target },
      ),
    );
    const changes: { field: string; before: unknown; after: unknown }[] = [];
    if (legacy !== (remaining[0] ?? null))
      changes.push({ field: 'assignee_id', before: legacy, after: remaining[0] ?? null });
    if (beforeIds.includes(target))
      changes.push({
        field: 'assignee_ids',
        before: JSON.stringify(beforeIds),
        after: JSON.stringify(remaining),
      });
    changes.push(
      ...checklistAudit(
        children.map((child) => ({
          field: 'subtask',
          before: JSON.stringify(child),
          after: JSON.stringify({
            ...child,
            assignee_id: null,
            version: Number(child.version) + 1,
          }),
        })),
      ),
    );
    await replaceAssignments(tx, task.id, remaining);
    await tx.execute(
      sql(
        'UPDATE dbo.subtasks SET assignee_id=NULL,version=version+1 WHERE task_id=@task AND assignee_id=@target',
        { task: task.id, target },
      ),
    );
    await tx.execute(
      sql(
        'UPDATE dbo.tasks SET assignee_id=@assignee,version=@version,updated_at=@now WHERE id=@task',
        {
          task: task.id,
          assignee: remaining[0] ?? null,
          version: requireVersion(task.version, task.version),
          now,
        },
      ),
    );
    await tx.execute(
      sql(
        "INSERT INTO dbo.task_events(task_id,actor_id,action,field_changes,request_id,created_at) VALUES(@task,@actor,'access_cleanup',@changes,@request,@now)",
        {
          task: task.id,
          actor,
          changes: JSON.stringify(changes),
          request,
          now,
        },
      ),
    );
    for (const recipient of await dispatchAccessCleanup(tx, task.id, actor, request, now))
      viewers.add(recipient);
  }
  return viewers;
}

/** Small internal organization: invalidate opaque view revisions, never disclose resource IDs. */
export async function invalidateMembershipViews(tx: Transaction, now: string) {
  const users = await tx.query<{ user_id: number }>(
    sql('SELECT user_id FROM dbo.user_view_revisions ORDER BY user_id'),
  );
  for (const u of users)
    await tx.execute(
      sql(
        'UPDATE dbo.user_view_revisions SET revision=@revision,updated_at=@now WHERE user_id=@id',
        { id: u.user_id, revision: randomUUID(), now },
      ),
    );
}
