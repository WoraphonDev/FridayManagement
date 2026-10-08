import { utcNow } from '../domain/dates.js';
import type { Statement, Value } from '../domain/database.js';
/** Static trusted SQL only; caller inputs are bound. All visibility is evaluated by the DB. */
export function sql(query: string, parameters: Record<string, Value> = {}): Statement {
  return {
    sqlite: query.replaceAll('dbo.', '').replace(/@([A-Za-z][A-Za-z0-9_]*)/g, '$$$1'),
    sqlserver: query,
    parameters,
  };
}
export function projectVisibility(mode: 'read' | 'write' | 'manage', managerKey?: 'P-04' | 'P-06') {
  // Manager is a write member; manage-mode includes a manager only with the matching ticked key.
  const membership =
    mode === 'manage'
      ? managerKey
        ? ` OR EXISTS(SELECT 1 FROM dbo.project_members pm JOIN dbo.user_permissions up ON up.user_id=pm.user_id AND up.permission_key='${managerKey}' WHERE pm.project_id=p.id AND pm.user_id=au.id AND pm.access='manager')`
        : ''
      : ` OR EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=au.id AND pm.access ${mode === 'write' ? "IN ('manager','editor')" : "IN ('manager','editor','viewer')"})`;
  return `EXISTS(SELECT 1 FROM dbo.users au WHERE au.id=@viewer AND au.active=1 AND au.must_change_password=0 AND (au.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members lead WHERE lead.team_id=p.owner_team_id AND lead.user_id=au.id AND lead.team_role='lead')${membership}))`;
}
export function projectList(
  viewer: number,
  includeArchived = false,
  team: number | null = null,
): Statement {
  return sql(
    `SELECT p.id,p.owner_team_id,p.name,p.archived_at FROM dbo.projects p WHERE ${projectVisibility('read')} AND (@archived=1 OR p.archived_at IS NULL) AND (@team IS NULL OR p.owner_team_id=@team) ORDER BY p.id`,
    { viewer, archived: Number(includeArchived), team },
  );
}
export function taskScope(
  viewer: number,
  options: {
    projection?: 'rows' | 'summary' | 'export';
    project?: number;
    team?: number;
    search?: string;
    trash?: boolean;
    includeArchived?: boolean;
  } = {},
): Statement {
  const projection = options.projection ?? 'rows';
  const select =
    projection === 'summary'
      ? 't.status,COUNT(*) AS total'
      : projection === 'export'
        ? 't.id,t.title,p.id AS project_id,p.owner_team_id,t.status,t.priority,t.assignee_id,t.start_date,t.due_date,t.category,t.created_at,t.completed_at'
        : 't.id,t.project_id,t.title,t.status,t.creator_id,t.assignee_id,t.deleted_at';
  const ending = projection === 'summary' ? ' GROUP BY t.status' : ' ORDER BY t.id';
  // SQL LIKE metacharacters become literals; never interpolate search text or IDs.
  const search =
    options.search == null ? null : `%${options.search.replace(/[\\%_\[]/g, (c) => `\\${c}`)}%`;
  return sql(
    `SELECT ${select} FROM dbo.tasks t JOIN dbo.projects p ON p.id=t.project_id WHERE ${options.trash ? projectVisibility('manage', 'P-04') : projectVisibility('read')} AND t.deleted_at IS ${options.trash ? 'NOT ' : ''}NULL AND (@archived=1 OR p.archived_at IS NULL) AND (@project IS NULL OR p.id=@project) AND (@team IS NULL OR p.owner_team_id=@team) AND (@search IS NULL OR t.title LIKE @search ESCAPE '\\' OR t.description LIKE @search ESCAPE '\\' OR t.category LIKE @search ESCAPE '\\')${ending}`,
    {
      viewer,
      archived: Number(options.includeArchived ?? options.trash ?? false),
      project: options.project ?? null,
      team: options.team ?? null,
      search,
    },
  );
}
export function notificationScope(viewer: number, id: number | null = null): Statement {
  return sql(
    `SELECT n.id,n.task_id,n.message,n.read_at FROM dbo.notifications n JOIN dbo.tasks t ON t.id=n.task_id JOIN dbo.projects p ON p.id=t.project_id WHERE n.recipient_id=@viewer AND ${projectVisibility('read')} AND t.deleted_at IS NULL AND (@id IS NULL OR n.id=@id) ORDER BY n.id`,
    { viewer, id },
  );
}
/** Scope is part of the UPDATE, including read-all; revoked/private rows are never marked read. */
export function readNotifications(
  viewer: number,
  now: string,
  id: number | null = null,
): Statement {
  return sql(
    `UPDATE dbo.notifications SET read_at=@now WHERE read_at IS NULL AND recipient_id=@viewer AND (@id IS NULL OR id=@id) AND id IN (SELECT n.id FROM dbo.notifications n JOIN dbo.tasks t ON t.id=n.task_id JOIN dbo.projects p ON p.id=t.project_id WHERE n.recipient_id=@viewer AND ${projectVisibility('read')} AND t.deleted_at IS NULL)`,
    { viewer, now, id },
  );
}
export function attachmentScope(
  viewer: number,
  task: number,
  includeDeleted = false,
  nowUtc = utcNow(),
): Statement {
  const cutoff = new Date(Date.parse(nowUtc) - 30 * 86400000).toISOString();
  return sql(
    `SELECT a.id,a.task_id,a.original_name,a.bytes,a.deleted_at FROM dbo.attachments a JOIN dbo.tasks t ON t.id=a.task_id JOIN dbo.projects p ON p.id=t.project_id WHERE t.id=@task AND t.deleted_at IS NULL AND ${projectVisibility('read')} AND (a.deleted_at IS NULL OR (@deleted=1 AND a.deleted_at>@cutoff AND NOT EXISTS(SELECT 1 FROM dbo.teams owner_team WHERE owner_team.id=p.owner_team_id AND owner_team.archived_at IS NOT NULL) AND p.archived_at IS NULL AND ${projectVisibility('write')} AND (a.uploader_id=@viewer OR ${projectVisibility('manage', 'P-06')}))) ORDER BY a.id`,
    { viewer, task, deleted: Number(includeDeleted), cutoff },
  );
}
export function teamList(viewer: number, includeArchived = false): Statement {
  return sql(
    "SELECT team.id,team.name,team.archived_at FROM dbo.teams team WHERE (@archived=1 OR team.archived_at IS NULL) AND EXISTS(SELECT 1 FROM dbo.users u WHERE u.id=@viewer AND u.active=1 AND u.must_change_password=0 AND (u.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=team.id AND m.user_id=u.id))) ORDER BY team.id",
    { viewer, archived: Number(includeArchived) },
  );
}
export function directoryList(viewer: number): Statement {
  return sql(
    "SELECT u.id,u.display_name FROM dbo.users u WHERE u.active=1 AND EXISTS(SELECT 1 FROM dbo.users caller WHERE caller.id=@viewer AND caller.active=1 AND caller.must_change_password=0 AND (caller.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members m JOIN dbo.teams team ON team.id=m.team_id WHERE m.user_id=caller.id AND m.team_role='lead'))) ORDER BY u.id",
    { viewer },
  );
}
