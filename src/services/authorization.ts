import { timingSafeEqual } from 'node:crypto';
import type { Row, Transaction } from '../domain/database.js';
import { utcNow, retentionWindow } from '../domain/dates.js';
import {
  effectiveRole,
  grants,
  rights,
  type EffectiveRole,
  type Membership,
  type PermissionKey,
} from '../domain/permissions.js';
import { ApiFault } from '../api/errors.js';
import { operations } from '../api/contract.js';
import { sql, notificationScope } from '../repository/access-scope.js';
import type { Reply } from '../repository/idempotency.js';
export interface SessionProof {
  userId: number;
  tokenHash: string;
}
export interface AccessOptions {
  clock?: () => Date;
  idleMinutes?: number;
  csrf?: string;
  checkVersions?: (tx: Transaction, request: AccessRequest) => Promise<void>;
}
export interface Actor {
  id: number;
  orgRole: 'admin' | 'member';
  forcedPassword: boolean;
}
export interface AccessRequest {
  method: string;
  path: string;
  params?: Record<string, number>;
  query?: Record<string, unknown>;
  body?: unknown;
  phase?: 'preflight' | 'execute';
  cached?: Reply;
}
const passwordExceptions = new Set([
  '/api/me',
  '/api/password',
  '/api/logout',
  '/api/session/activity',
]);
function id(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 2147483647)
    throw new ApiFault('VALIDATION_FAILED');
  return value as number;
}
export async function currentActor(
  tx: Transaction,
  proof: SessionProof,
  allowPasswordGate = false,
  options: AccessOptions = {},
): Promise<Actor> {
  if (
    !proof ||
    !Number.isInteger(proof.userId) ||
    proof.userId < 1 ||
    proof.userId > 2147483647 ||
    typeof proof.tokenHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(proof.tokenHash)
  )
    throw new ApiFault('UNAUTHENTICATED');
  const idle = options.idleMinutes ?? 60;
  if (!Number.isInteger(idle) || idle < 1 || idle > 60) throw new ApiFault('INTERNAL_ERROR');
  const rows = await tx.query<{
    id: number;
    org_role: string;
    active: number;
    must_change_password: number;
    auth_version: number;
    session_version: number;
    absolute_expires_at: string;
    last_seen_at: string;
    csrf_token: string;
  }>(
    sql(
      'SELECT u.id,u.org_role,u.active,u.must_change_password,u.auth_version,s.auth_version AS session_version,s.absolute_expires_at,s.last_seen_at,s.csrf_token FROM dbo.users u JOIN dbo.sessions s ON s.user_id=u.id WHERE u.id=@viewer AND s.token_hash=@hash',
      { viewer: proof.userId, hash: proof.tokenHash },
    ),
  );
  const row = rows[0],
    now = utcNow(options.clock);
  if (
    !row ||
    !row.active ||
    row.auth_version !== row.session_version ||
    row.absolute_expires_at <= now ||
    row.last_seen_at > now ||
    Date.parse(now) - Date.parse(row.last_seen_at) >= idle * 60000
  )
    throw new ApiFault('UNAUTHENTICATED');
  if (options.csrf !== undefined) {
    const a = Buffer.from(options.csrf),
      b = Buffer.from(row.csrf_token);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ApiFault('INVALID_CSRF');
  }
  if (row.must_change_password && !allowPasswordGate)
    throw new ApiFault('PASSWORD_CHANGE_REQUIRED');
  if (row.org_role !== 'admin' && row.org_role !== 'member') throw new ApiFault('INTERNAL_ERROR');
  return { id: row.id, orgRole: row.org_role, forcedPassword: !!row.must_change_password };
}
export type ProjectAccess = Row & {
  id: number;
  owner_team_id: number;
  archived_at: string | null;
  team_archived_at: string | null;
  role: EffectiveRole;
  /** Current request's comma-joined P-keys; read fresh per request, never cached (SRS §4.4). */
  permission_keys: string;
};
/** Comma-joined current permission keys of one user, in key order. */
export async function permissionKeysOf(tx: Transaction, user: number): Promise<string> {
  const rows = await tx.query<{ permission_key: string }>(
    sql(
      'SELECT permission_key FROM dbo.user_permissions WHERE user_id=@user ORDER BY permission_key',
      { user },
    ),
  );
  return rows.map((r) => r.permission_key).join(',');
}
export function can(project: ProjectAccess, key: PermissionKey) {
  return grants(project.role, project.permission_keys, key);
}
export async function projectAccess(
  tx: Transaction,
  actor: Actor,
  project: number,
): Promise<ProjectAccess> {
  const rows = await tx.query<
    Row & {
      id: number;
      owner_team_id: number;
      archived_at: string | null;
      team_archived_at: string | null;
      owner_lead: number;
      membership: string | null;
    }
  >(
    sql(
      "SELECT p.id,p.owner_team_id,p.archived_at,team.archived_at AS team_archived_at,CASE WHEN EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=@viewer AND m.team_role='lead') THEN 1 ELSE 0 END AS owner_lead,(SELECT pm.access FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=@viewer) AS membership FROM dbo.projects p JOIN dbo.teams team ON team.id=p.owner_team_id WHERE p.id=@project",
      { viewer: actor.id, project: id(project) },
    ),
  );
  const row = rows[0];
  if (!row) throw new ApiFault('NOT_FOUND');
  const role = effectiveRole(
    actor.orgRole === 'admin',
    !!row.owner_lead,
    row.membership as Membership | null,
  );
  if (!rights(role).read) throw new ApiFault('NOT_FOUND');
  return {
    ...row,
    role,
    permission_keys: role === 'manager' ? await permissionKeysOf(tx, actor.id) : '',
  };
}
async function taskRow(tx: Transaction, task: number) {
  const rows = await tx.query<
    Row & {
      id: number;
      project_id: number;
      creator_id: number;
      deleted_at: string | null;
      status: string;
    }
  >(
    sql('SELECT id,project_id,creator_id,deleted_at,status FROM dbo.tasks WHERE id=@id', {
      id: id(task),
    }),
  );
  if (!rows[0]) throw new ApiFault('NOT_FOUND');
  return rows[0];
}
function writable(project: ProjectAccess) {
  if (!rights(project.role).write) throw new ApiFault('FORBIDDEN');
  if (project.team_archived_at) throw new ApiFault('TEAM_ARCHIVED');
  if (project.archived_at) throw new ApiFault('PROJECT_ARCHIVED');
}
/** True when the user is a member of the team and holds the team-scoped key (P-08–P-10). */
export async function teamGrant(tx: Transaction, user: number, team: number, key: PermissionKey) {
  return (
    (
      await tx.query(
        sql(
          'SELECT m.team_id FROM dbo.team_members m JOIN dbo.user_permissions up ON up.user_id=m.user_id AND up.permission_key=@key WHERE m.user_id=@user AND m.team_id=@team',
          { user, team, key },
        ),
      )
    ).length > 0
  );
}
/**
 * Manager-only paths on Admin/Lead routes (SRS §4.4): P-01 edits name/description but never
 * archives; P-03 adds/removes Editor/Viewer only. Appointing/removing a manager stays Admin/Lead;
 * the current target role is rechecked by the workspace service inside the same transaction.
 */
function managerMay(project: ProjectAccess, request: AccessRequest, body: Record<string, unknown>) {
  if (project.role !== 'manager') return false;
  if (request.path === '/api/projects/{id}' && request.method === 'PATCH')
    return can(project, 'P-01') && !('archived' in body);
  if (request.path === '/api/projects/{id}/members/{userId}')
    return can(project, 'P-03') && (request.method === 'DELETE' || body.access !== 'manager');
  return false;
}
export async function authorizeOperation(
  tx: Transaction,
  proof: SessionProof,
  request: AccessRequest,
  options: AccessOptions = {},
) {
  const entry = operations.find((o) => o.method === request.method && o.path === request.path);
  const op = entry?.operation;
  if (!op || !op.security.length) throw new ApiFault('SERVICE_NOT_READY');
  const actor = await currentActor(tx, proof, passwordExceptions.has(request.path), options);
  const params = request.params ?? {},
    query = request.query ?? {},
    body = (request.body ?? {}) as Record<string, unknown>;
  for (const name of entry!.parameterNames) id(params[name]);
  const replay = !!request.cached,
    preflight = request.phase === 'preflight',
    stateChecks = !replay && !preflight;
  const permission = op['x-permission'];
  const knownPermissions = new Set([
    'admin',
    'authenticated',
    'authenticated_password_gate_exception',
    'own_password_gate_exception',
    'admin_or_any_active_lead',
    'own_teams_or_admin',
    'project_read',
    'admin_or_owner_lead',
    'project_write_active',
    'project_read_task_active',
    'creator_or_admin_owner_lead_RD01',
    'admin_or_owner_lead_RD01',
    'project_write_active_parent_not_done',
    'project_read_task_active_deleted_metadata_scoped',
    'parent_project_read_task_attachment_active',
    'uploader_or_admin_owner_lead_write_active',
    'own_recipient_current_parent_access',
    'admin_or_self',
    'admin_not_self',
    'team_workload',
  ]);
  if (!knownPermissions.has(permission)) throw new ApiFault('SERVICE_NOT_READY');
  const stateRules: Array<() => void> = [];
  let project: ProjectAccess | undefined, task: Awaited<ReturnType<typeof taskRow>> | undefined;
  let attachment:
    | (Row & { id: number; task_id: number; uploader_id: number; deleted_at: string | null })
    | undefined;
  if (permission === 'team_workload') {
    // FR-50: Admin, the team's Lead, or a team member holding P-09 (rows stay BR-16 scoped).
    const team = (
      await tx.query<{ lead: number }>(
        sql(
          "SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=t.id AND m.user_id=@viewer AND m.team_role='lead') THEN 1 ELSE 0 END AS lead FROM dbo.teams t WHERE t.id=@team",
          { viewer: actor.id, team: params.id! },
        ),
      )
    )[0];
    if (!team) throw new ApiFault('NOT_FOUND');
    if (
      actor.orgRole !== 'admin' &&
      !team.lead &&
      !(await teamGrant(tx, actor.id, params.id!, 'P-09'))
    )
      throw new ApiFault('FORBIDDEN');
  } else if (permission === 'admin_or_self' || permission === 'admin_not_self') {
    if (actor.orgRole !== 'admin' && !(permission === 'admin_or_self' && params.id === actor.id))
      throw new ApiFault('FORBIDDEN');
    // BR-23: nobody edits their own permissions, including a sole Admin (use the admin CLI).
    if (permission === 'admin_not_self' && params.id === actor.id) throw new ApiFault('FORBIDDEN');
    if (!(await tx.query(sql('SELECT id FROM dbo.users WHERE id=@id', { id: params.id! }))).length)
      throw new ApiFault('NOT_FOUND');
  } else if (permission === 'admin') {
    if (actor.orgRole !== 'admin') throw new ApiFault('FORBIDDEN');
    if (params.id && request.path.startsWith('/api/job-titles/')) {
      const title = await tx.query(
        sql('SELECT id FROM dbo.job_titles WHERE id=@id', { id: params.id }),
      );
      if (!title[0]) throw new ApiFault('NOT_FOUND');
    }
    if (params.id && request.path.startsWith('/api/teams/')) {
      const team = await tx.query(sql('SELECT id FROM dbo.teams WHERE id=@id', { id: params.id }));
      if (!team[0]) throw new ApiFault('NOT_FOUND');
    }
  } else if (permission === 'admin_or_any_active_lead' || request.path === '/api/trash') {
    if (actor.orgRole !== 'admin') {
      const leads = await tx.query(
        sql(
          `SELECT m.team_id FROM dbo.team_members m JOIN dbo.teams t ON t.id=m.team_id WHERE m.user_id=@viewer AND m.team_role='lead'`,
          { viewer: actor.id },
        ),
      );
      // P-04 managers may list trash of the projects they manage (trash scope enforces the rest).
      const p04 =
        request.path === '/api/trash' &&
        (
          await tx.query(
            sql(
              "SELECT pm.project_id FROM dbo.project_members pm JOIN dbo.user_permissions up ON up.user_id=pm.user_id AND up.permission_key='P-04' WHERE pm.user_id=@viewer AND pm.access='manager'",
              { viewer: actor.id },
            ),
          )
        ).length > 0;
      if (!leads.length && !p04) throw new ApiFault('FORBIDDEN');
    }
  } else if (request.path === '/api/projects' && request.method === 'POST') {
    const team = id(body.owner_team_id);
    const rows = await tx.query<{ archived_at: string | null; lead: number }>(
      sql(
        "SELECT t.archived_at,CASE WHEN EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=t.id AND m.user_id=@viewer AND m.team_role='lead') THEN 1 ELSE 0 END AS lead FROM dbo.teams t WHERE t.id=@team",
        { viewer: actor.id, team },
      ),
    );
    if (
      actor.orgRole !== 'admin' &&
      !rows[0]?.lead &&
      !(await teamGrant(tx, actor.id, team, 'P-08'))
    )
      throw new ApiFault('FORBIDDEN');
    if (!rows[0]) throw new ApiFault('NOT_FOUND');
    if (stateChecks && rows[0].archived_at)
      stateRules.push(() => {
        throw new ApiFault('TEAM_ARCHIVED');
      });
  } else if (request.path.startsWith('/api/notifications')) {
    if (params.id && !(await tx.query(notificationScope(actor.id, params.id))).length)
      throw new ApiFault('NOT_FOUND');
  } else if (params.id && request.path.startsWith('/api/attachments/')) {
    const rows = await tx.query<NonNullable<typeof attachment>>(
      sql('SELECT id,task_id,uploader_id,deleted_at FROM dbo.attachments WHERE id=@id', {
        id: params.id,
      }),
    );
    attachment = rows[0];
    if (!attachment) throw new ApiFault('NOT_FOUND');
    task = await taskRow(tx, attachment.task_id);
  } else if (params.id && request.path.startsWith('/api/groups/')) {
    const g = (
      await tx.query<{ project_id: number }>(
        sql('SELECT project_id FROM dbo.project_groups WHERE id=@id', { id: params.id }),
      )
    )[0];
    if (!g) throw new ApiFault('NOT_FOUND');
    project = await projectAccess(tx, actor, g.project_id);
  } else if (
    params.id &&
    (request.path.startsWith('/api/docs/') || request.path.startsWith('/api/project-files/'))
  ) {
    // T-084/T-085: resolve the owning project; services add own/P-05/P-06 and deleted-state rules.
    const table = request.path.startsWith('/api/docs/') ? 'project_docs' : 'project_files';
    const owner = (
      await tx.query<{ project_id: number }>(
        sql(`SELECT project_id FROM dbo.${table} WHERE id=@id`, { id: params.id }),
      )
    )[0];
    if (!owner) throw new ApiFault('NOT_FOUND');
    project = await projectAccess(tx, actor, owner.project_id);
  } else if (params.id && request.path.startsWith('/api/subtasks/')) {
    const rows = await tx.query<{ task_id: number }>(
      sql('SELECT task_id FROM dbo.subtasks WHERE id=@id', { id: params.id }),
    );
    if (!rows[0]) throw new ApiFault('NOT_FOUND');
    task = await taskRow(tx, rows[0].task_id);
  } else if (params.id && request.path.startsWith('/api/tasks/'))
    task = await taskRow(tx, params.id);
  else if (params.id && request.path.startsWith('/api/projects/')) {
    project = await projectAccess(tx, actor, params.id);
    if (request.path.endsWith('/board/move')) {
      task = await taskRow(tx, id(body.task_id));
      if (task.project_id !== project.id) throw new ApiFault('NOT_FOUND');
    }
  } else if (request.path === '/api/tasks' && request.method === 'POST')
    project = await projectAccess(tx, actor, id(body.project_id));
  if (task) project = await projectAccess(tx, actor, task.project_id);
  if (project) {
    const access = rights(project.role),
      restore = request.path === '/api/tasks/{id}/restore',
      deleteTask = request.path === '/api/tasks/{id}' && request.method === 'DELETE';
    if (task?.deleted_at && !restore) throw new ApiFault('NOT_FOUND');
    if (restore) {
      if (!can(project, 'P-04') || (stateChecks && !task?.deleted_at))
        throw new ApiFault('NOT_FOUND');
      if (stateChecks)
        stateRules.push(() => {
          if (!retentionWindow(task!.deleted_at!, utcNow(options.clock)).restorable)
            throw new ApiFault('RETENTION_EXPIRED');
        });
    } else if (deleteTask) {
      const own = access.write && task?.creator_id === actor.id;
      if (!can(project, 'P-04') && !own) throw new ApiFault('FORBIDDEN');
      if (stateChecks && !access.manage) stateRules.push(() => writable(project!));
    } else if (permission === 'admin_or_owner_lead') {
      if (!access.manage && !managerMay(project, request, body)) throw new ApiFault('FORBIDDEN');
      if (stateChecks && body.archived === false && project.team_archived_at)
        stateRules.push(() => {
          throw new ApiFault('TEAM_ARCHIVED');
        });
    } else if (request.method !== 'GET') {
      if (!access.write) throw new ApiFault('FORBIDDEN');
      if (stateChecks) stateRules.push(() => writable(project!));
      if (attachment && !can(project, 'P-06') && attachment.uploader_id !== actor.id)
        throw new ApiFault('FORBIDDEN');
      if (
        stateChecks &&
        permission === 'project_write_active_parent_not_done' &&
        task?.status === 'done'
      )
        stateRules.push(() => {
          throw new ApiFault('PARENT_DONE');
        });
    }
    if (attachment) {
      if (request.method === 'GET' && attachment.deleted_at) throw new ApiFault('NOT_FOUND');
      if (request.path.endsWith('/restore') && stateChecks && attachment.deleted_at)
        stateRules.push(() => {
          if (!retentionWindow(attachment!.deleted_at!, utcNow(options.clock)).restorable)
            throw new ApiFault('RETENTION_EXPIRED');
        });
    }
    if (query.includeDeleted === true) {
      if (!access.write) throw new ApiFault('FORBIDDEN');
      if (stateChecks) stateRules.push(() => writable(project!));
    }
  }
  // Version comparisons belong to feature services, after current rights and before lifecycle validation.
  if (
    stateChecks &&
    request.method !== 'GET' &&
    ['version', 'task_version', 'source_column_version', 'target_column_version'].some(
      (key) => key in body,
    )
  ) {
    if (!options.checkVersions) throw new ApiFault('SERVICE_NOT_READY');
    await options.checkVersions(tx, request);
  }
  for (const rule of stateRules) rule();
  if (request.cached) {
    const successor = (request.cached.body as { successor?: { id?: number } | null }).successor;
    if (successor?.id) {
      const current = await taskRow(tx, successor.id);
      await projectAccess(tx, actor, current.project_id);
      if (current.deleted_at || (project && current.project_id !== project.id))
        throw new ApiFault('NOT_FOUND');
    }
    const item = (request.cached.body as { item?: { id?: number; task_id?: number } }).item;
    if (item?.id) {
      if (
        request.path === '/api/tasks' ||
        (task && ['/api/tasks/{id}', '/api/tasks/{id}/restore'].includes(request.path)) ||
        request.path.endsWith('/board/move')
      ) {
        const cachedTask = await taskRow(tx, item.id);
        await projectAccess(tx, actor, cachedTask.project_id);
        if (cachedTask.deleted_at || (project && cachedTask.project_id !== project.id))
          throw new ApiFault('NOT_FOUND');
      } else if (
        request.path.endsWith('/comments') ||
        request.path.endsWith('/subtasks') ||
        request.path.endsWith('/attachments')
      ) {
        const table = request.path.endsWith('/comments')
          ? 'comments'
          : request.path.endsWith('/subtasks')
            ? 'subtasks'
            : 'attachments';
        const rows = await tx.query<{ task_id: number }>(
          sql(
            `SELECT task_id FROM dbo.${table} WHERE id=@id${table === 'attachments' ? ' AND deleted_at IS NULL' : ''}`,
            { id: item.id },
          ),
        );
        if (!rows[0] || rows[0].task_id !== task?.id) throw new ApiFault('NOT_FOUND');
      } else if (request.path === '/api/projects') await projectAccess(tx, actor, item.id);
      else if (
        request.path === '/api/teams' &&
        !(await tx.query(sql('SELECT id FROM dbo.teams WHERE id=@id', { id: item.id }))).length
      )
        throw new ApiFault('NOT_FOUND');
    }
  }
  return { actor, project, task, attachment };
}
