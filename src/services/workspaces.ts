import { redactAudit } from '../security/audit.js';
import type { Transaction, Row } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import { utcNow } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { rights, effectiveRole, managerKeys, type Membership } from '../domain/permissions.js';
import { ApiFault } from '../api/errors.js';
import { operations, requestBody } from '../api/contract.js';
import {
  can,
  currentActor,
  permissionKeysOf,
  projectAccess,
  teamGrant,
  type SessionProof,
  type AccessOptions,
  type AccessRequest,
} from './authorization.js';
import { cleanupAssignments, invalidateMembershipViews } from './access-effects.js';

type Team = Row & {
  id: number;
  name: string;
  description: string;
  archived_at: string | null;
  version: number;
  own_role: 'lead' | 'member' | null;
};
type User = Row & {
  id: number;
  display_name: string;
  active: number;
  org_role: 'admin' | 'member';
};
type Project = Row & {
  id: number;
  owner_team_id: number;
  owner_team_name: string;
  name: string;
  description: string;
  archived_at: string | null;
  version: number;
  created_by: number;
  created_at: string;
  updated_at: string;
};
const teamColumns =
  't.id,t.name,t.description,t.archived_at,t.version,(SELECT m.team_role FROM dbo.team_members m WHERE m.team_id=t.id AND m.user_id=@viewer) AS own_role';
const projectColumns =
  'p.id,p.owner_team_id,t.name AS owner_team_name,p.name,p.description,p.archived_at,p.version,p.created_by,p.created_at,p.updated_at';
const visibleProject =
  "EXISTS(SELECT 1 FROM dbo.users au WHERE au.id=@viewer AND au.active=1 AND (au.org_role='admin' OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=au.id AND m.team_role='lead') OR EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=au.id)))";

export function workspaceService(options: AccessOptions = {}) {
  const now = () => utcNow(options.clock);
  const body = (method: string, path: string, value: unknown) =>
    requestBody(
      operations.find((o) => o.method === method && o.path === path)!.operation,
      value,
    ) as Record<string, unknown>;
  const actor = async (tx: Transaction, proof: SessionProof, admin = false, write = false) => {
    const a = await currentActor(tx, proof, false, options);
    if (admin && a.orgRole !== 'admin') throw new ApiFault('FORBIDDEN');
    if (write && (await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
      throw new ApiFault('MAINTENANCE');
    return a;
  };
  const person = (u: User) => ({ id: u.id, display_name: u.display_name, active: !!u.active });
  const team = async (tx: Transaction, id: number, viewer: number) => {
    const rows = await tx.query<Team>(
      sql(`SELECT ${teamColumns} FROM dbo.teams t WHERE t.id=@id`, { id, viewer }),
    );
    if (!rows[0]) throw new ApiFault('NOT_FOUND');
    return rows[0];
  };
  const teamDTO = async (
    tx: Transaction,
    t: Team,
    admin: boolean,
  ): Promise<{
    id: number;
    name: string;
    description: string;
    archived_at: string | null;
    version: number;
    own_role: 'lead' | 'member' | null;
    members?: {
      user: { id: number; display_name: string; active: boolean };
      team_role: string;
      joined_at: string;
    }[];
  }> => {
    const summary = {
      id: t.id,
      name: t.name,
      description: t.description,
      archived_at: t.archived_at,
      version: t.version,
      own_role: t.own_role,
    };
    if (!admin) return summary;
    const members = await tx.query<User & { team_role: string; joined_at: string }>(
      sql(
        'SELECT u.id,u.display_name,u.active,u.org_role,m.team_role,m.joined_at FROM dbo.team_members m JOIN dbo.users u ON u.id=m.user_id WHERE m.team_id=@id ORDER BY u.id',
        { id: t.id },
      ),
    );
    return {
      ...summary,
      members: members.map((m) => ({
        user: person(m),
        team_role: m.team_role,
        joined_at: m.joined_at,
      })),
    };
  };
  const project = async (tx: Transaction, id: number, proof: SessionProof) => {
    const a = await actor(tx, proof),
      access = await projectAccess(tx, a, id);
    const rows = await tx.query<Project>(
      sql(
        `SELECT ${projectColumns} FROM dbo.projects p JOIN dbo.teams t ON t.id=p.owner_team_id WHERE p.id=@id`,
        { id },
      ),
    );
    return {
      ...rows[0]!,
      effective_access: access.role as 'admin' | 'lead' | 'manager' | 'editor' | 'viewer',
    };
  };
  /** Admin/Lead, or a manager holding the given key (SRS §4.4); callers narrow the operation. */
  const manageProject = async (
    tx: Transaction,
    id: number,
    proof: SessionProof,
    managerKey?: 'P-01' | 'P-03',
  ) => {
    const a = await actor(tx, proof, false, true),
      access = await projectAccess(tx, a, id);
    if (!rights(access.role).manage && !(managerKey && can(access, managerKey)))
      throw new ApiFault('FORBIDDEN');
    return access;
  };
  const targetUser = async (tx: Transaction, id: number, active = true) => {
    const u = (
      await tx.query<User>(
        sql('SELECT id,display_name,active,org_role FROM dbo.users WHERE id=@id', { id }),
      )
    )[0];
    if (!u) throw new ApiFault('NOT_FOUND');
    if (active && !u.active) throw new ApiFault('ASSIGNEE_INELIGIBLE');
    return u;
  };
  const audit = async (
    tx: Transaction,
    proof: SessionProof,
    type: string,
    id: number,
    action: string,
    changes: unknown,
    request: string,
  ) => {
    await tx.execute(
      sql(
        'INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,@action,@type,@id,@changes,@request,@now)',
        {
          actor: proof.userId,
          action,
          type,
          id,
          changes: JSON.stringify(redactAudit(changes)),
          request,
          now: now(),
        },
      ),
    );
    await invalidateMembershipViews(tx, now());
  };
  const paginate = async <R extends Row>(
    tx: Transaction,
    select: string,
    from: string,
    where: string,
    parameters: Record<string, string | number | null>,
    query: Record<string, unknown>,
  ) => {
    const page = Number(query.page ?? 1),
      pageSize = Number(query.pageSize ?? 50);
    const total = (
      await tx.query<{ total: number }>(
        sql(`SELECT COUNT(*) AS total ${from} ${where}`, parameters),
      )
    )[0]!.total;
    const items = await tx.query<R>({
      sqlite: sql(
        `SELECT ${select} ${from} ${where} ORDER BY ${from.includes('projects') ? 'p' : 't'}.id LIMIT @size OFFSET @offset`,
      ).sqlite,
      sqlserver: `SELECT ${select} ${from} ${where} ORDER BY ${from.includes('projects') ? 'p' : 't'}.id OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      parameters: { ...parameters, size: pageSize, offset: (page - 1) * pageSize },
    });
    return { items, page, pageSize, total };
  };
  const version = async (
    tx: Transaction,
    kind: 'teams' | 'projects',
    id: number,
    expected: number,
  ) => {
    const row = (
      await tx.query<{ version: number }>(
        sql(`SELECT version FROM dbo.${kind} WHERE id=@id`, { id }),
      )
    )[0];
    if (!row) throw new ApiFault('NOT_FOUND');
    requireVersion(row.version, expected);
  };
  const members = async (tx: Transaction, id: number, proof: SessionProof) => {
    const a = await actor(tx, proof),
      p = await projectAccess(tx, a, id);
    const rows = await tx.query<
      User & { explicit_access: Membership | null; lead: number; job_title: string | null }
    >(
      sql(
        "SELECT u.id,u.display_name,u.active,u.org_role,(SELECT jt.name FROM dbo.job_titles jt WHERE jt.id=u.job_title_id) AS job_title,pm.access AS explicit_access,CASE WHEN EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=@team AND m.user_id=u.id AND m.team_role='lead') THEN 1 ELSE 0 END AS lead FROM dbo.users u LEFT JOIN dbo.project_members pm ON pm.project_id=@id AND pm.user_id=u.id WHERE u.org_role='admin' OR pm.user_id IS NOT NULL OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=@team AND m.user_id=u.id AND m.team_role='lead') ORDER BY u.id",
        { team: p.owner_team_id, id },
      ),
    );
    const versionRow = (
      await tx.query<{ version: number }>(
        sql('SELECT version FROM dbo.projects WHERE id=@id', { id }),
      )
    )[0]!;
    return {
      items: rows.map((u) => {
        const effective = effectiveRole(u.org_role === 'admin', !!u.lead, u.explicit_access);
        return {
          user: person(u),
          job_title: u.job_title,
          explicit_access: u.explicit_access,
          effective_access: effective,
          assignee_eligible: !!u.active && rights(effective).write,
        };
      }),
      membership_version: versionRow.version,
    };
  };
  return {
    checkVersions: async (tx: Transaction, r: AccessRequest) => {
      if (r.path.startsWith('/api/teams/'))
        await version(tx, 'teams', r.params!.id!, (r.body as { version: number }).version);
      else if (r.path.startsWith('/api/projects/'))
        await version(tx, 'projects', r.params!.id!, (r.body as { version: number }).version);
      else throw new ApiFault('SERVICE_NOT_READY');
    },
    async teams(tx: Transaction, proof: SessionProof, q: Record<string, unknown>) {
      const a = await actor(tx, proof),
        page = await paginate<Team>(
          tx,
          teamColumns,
          'FROM dbo.teams t',
          'WHERE (@archived=1 OR t.archived_at IS NULL) AND (@admin=1 OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=t.id AND m.user_id=@viewer))',
          {
            archived: Number(q.includeArchived ?? false),
            admin: Number(a.orgRole === 'admin'),
            viewer: a.id,
          },
          q,
        );
      return {
        ...page,
        items: await Promise.all(page.items.map((t) => teamDTO(tx, t, a.orgRole === 'admin'))),
      };
    },
    async createTeam(tx: Transaction, proof: SessionProof, input: unknown, request: string) {
      await actor(tx, proof, true, true);
      const b = body('POST', '/api/teams', input),
        parameters = { name: String(b.name), description: String(b.description ?? ''), now: now() };
      const rows = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO teams(name,description,created_at,updated_at) VALUES($name,$description,$now,$now) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.teams(name,description,created_at,updated_at) OUTPUT INSERTED.id VALUES(@name,@description,@now,@now)',
        parameters,
      });
      const id = rows[0]!.id;
      await audit(tx, proof, 'team', id, 'team_created', b, request);
      return { item: await teamDTO(tx, await team(tx, id, proof.userId), true) };
    },
    async patchTeam(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      request: string,
    ) {
      await actor(tx, proof, true, true);
      const b = body('PATCH', '/api/teams/{id}', input),
        t = await team(tx, id, proof.userId),
        next = requireVersion(t.version, Number(b.version));
      if (
        b.archived === true &&
        (
          await tx.query(
            sql('SELECT id FROM dbo.projects WHERE owner_team_id=@id AND archived_at IS NULL', {
              id,
            }),
          )
        ).length
      )
        throw new ApiFault('TEAM_HAS_ACTIVE_PROJECTS');
      const updated = {
        name: String(b.name ?? t.name),
        description: String(b.description ?? t.description),
        archived_at:
          b.archived === undefined ? t.archived_at : b.archived ? (t.archived_at ?? now()) : null,
      };
      await tx.execute(
        sql(
          'UPDATE dbo.teams SET name=@name,description=@description,archived_at=@archived_at,version=@version,updated_at=@now WHERE id=@id',
          { ...updated, id, version: next, now: now() },
        ),
      );
      await audit(tx, proof, 'team', id, 'team_updated', { before: t, after: updated }, request);
      return { item: await teamDTO(tx, await team(tx, id, proof.userId), true) };
    },
    async teamMember(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      userId: number,
      input: unknown,
      remove: boolean,
      request: string,
    ) {
      await actor(tx, proof, true, true);
      const b = body(remove ? 'DELETE' : 'PUT', '/api/teams/{id}/members/{userId}', input),
        t = await team(tx, id, proof.userId),
        next = requireVersion(t.version, Number(b.version));
      await targetUser(tx, userId, !remove);
      const old = (
        await tx.query<{ team_role: string }>(
          sql('SELECT team_role FROM dbo.team_members WHERE team_id=@id AND user_id=@userId', {
            id,
            userId,
          }),
        )
      )[0];
      if (remove) {
        if (!old) throw new ApiFault('NOT_FOUND');
        await tx.execute(
          sql('DELETE FROM dbo.team_members WHERE team_id=@id AND user_id=@userId', { id, userId }),
        );
      } else if (old)
        await tx.execute(
          sql('UPDATE dbo.team_members SET team_role=@role WHERE team_id=@id AND user_id=@userId', {
            id,
            userId,
            role: String(b.team_role),
          }),
        );
      else
        await tx.execute(
          sql(
            'INSERT INTO dbo.team_members(team_id,user_id,team_role,joined_at) VALUES(@id,@userId,@role,@now)',
            { id, userId, role: String(b.team_role), now: now() },
          ),
        );
      await tx.execute(
        sql('UPDATE dbo.teams SET version=@version,updated_at=@now WHERE id=@id', {
          id,
          version: next,
          now: now(),
        }),
      );
      await cleanupAssignments(tx, userId, proof.userId, request, now(), { team: id });
      await audit(
        tx,
        proof,
        'team',
        id,
        'team_membership_changed',
        { user_id: userId, before: old?.team_role ?? null, after: remove ? null : b.team_role },
        request,
      );
      return { item: await teamDTO(tx, await team(tx, id, proof.userId), true) };
    },
    async projects(tx: Transaction, proof: SessionProof, q: Record<string, unknown>) {
      const a = await actor(tx, proof);
      const page = await paginate<Project>(
        tx,
        projectColumns,
        'FROM dbo.projects p JOIN dbo.teams t ON t.id=p.owner_team_id',
        `WHERE ${visibleProject} AND (@archived=1 OR p.archived_at IS NULL) AND (@team IS NULL OR p.owner_team_id=@team)`,
        {
          viewer: a.id,
          archived: Number(q.includeArchived ?? false),
          team: (q.team as number) ?? null,
        },
        q,
      );
      return {
        ...page,
        items: await Promise.all(
          page.items.map(async (p) => ({
            ...p,
            effective_access: (await projectAccess(tx, a, p.id)).role,
          })),
        ),
      };
    },
    async createProject(tx: Transaction, proof: SessionProof, input: unknown, request: string) {
      const a = await actor(tx, proof, false, true),
        b = body('POST', '/api/projects', input),
        t = await team(tx, Number(b.owner_team_id), a.id);
      const p08 =
        a.orgRole !== 'admin' && t.own_role !== 'lead' && (await teamGrant(tx, a.id, t.id, 'P-08'));
      if (a.orgRole !== 'admin' && t.own_role !== 'lead' && !p08) throw new ApiFault('FORBIDDEN');
      if (t.archived_at) throw new ApiFault('TEAM_ARCHIVED');
      const parameters = {
        team: t.id,
        name: String(b.name),
        description: String(b.description ?? ''),
        actor: a.id,
        now: now(),
      };
      const rows = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO projects(owner_team_id,name,description,created_by,created_at,updated_at) VALUES($team,$name,$description,$actor,$now,$now) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.projects(owner_team_id,name,description,created_by,created_at,updated_at) OUTPUT INSERTED.id VALUES(@team,@name,@description,@actor,@now,@now)',
        parameters,
      });
      const id = rows[0]!.id;
      for (const status of ['todo', 'doing', 'review', 'done'])
        await tx.execute(
          sql('INSERT INTO dbo.board_columns(project_id,status) VALUES(@id,@status)', {
            id,
            status,
          }),
        );
      let creatorAccess: Membership | null = null;
      if (p08) {
        // P-08 creator becomes manager; BR-22 keeps manager only while a P-01–P-07 key remains.
        const keys = (await permissionKeysOf(tx, a.id)).split(',');
        creatorAccess = managerKeys.some((k) => keys.includes(k)) ? 'manager' : 'editor';
        await tx.execute(
          sql(
            'INSERT INTO dbo.project_members(project_id,user_id,access,added_by,added_at) VALUES(@id,@user,@access,@user,@now)',
            { id, user: a.id, access: creatorAccess, now: now() },
          ),
        );
      }
      await audit(
        tx,
        proof,
        'project',
        id,
        'project_created',
        creatorAccess ? { ...b, creator_access: creatorAccess } : b,
        request,
      );
      return { item: await project(tx, id, proof) };
    },
    async patchProject(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      request: string,
    ) {
      const access = await manageProject(tx, id, proof, 'P-01'),
        b = body('PATCH', '/api/projects/{id}', input);
      if (!rights(access.role).manage && 'archived' in b) throw new ApiFault('FORBIDDEN');
      const p = await project(tx, id, proof),
        next = requireVersion(p.version, Number(b.version));
      if (b.archived === false && access.team_archived_at) throw new ApiFault('TEAM_ARCHIVED');
      const updated = {
        name: String(b.name ?? p.name),
        description: String(b.description ?? p.description),
        archived_at:
          b.archived === undefined ? p.archived_at : b.archived ? (p.archived_at ?? now()) : null,
      };
      await tx.execute(
        sql(
          'UPDATE dbo.projects SET name=@name,description=@description,archived_at=@archived_at,version=@version,updated_at=@now WHERE id=@id',
          { ...updated, id, version: next, now: now() },
        ),
      );
      await audit(
        tx,
        proof,
        'project',
        id,
        'project_updated',
        { before: p, after: updated },
        request,
      );
      return { item: await project(tx, id, proof) };
    },
    members,
    async projectMember(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      userId: number,
      input: unknown,
      remove: boolean,
      request: string,
    ) {
      const access = await manageProject(tx, id, proof, 'P-03');
      const b = body(remove ? 'DELETE' : 'PUT', '/api/projects/{id}/members/{userId}', input),
        p = await project(tx, id, proof),
        next = requireVersion(p.version, Number(b.version));
      await targetUser(tx, userId, !remove);
      const old = (
        await tx.query<{ access: string }>(
          sql('SELECT access FROM dbo.project_members WHERE project_id=@id AND user_id=@userId', {
            id,
            userId,
          }),
        )
      )[0];
      // FR-42: only Admin/owner Lead appoint or remove a manager; P-03 handles Editor/Viewer only.
      if (
        !rights(access.role).manage &&
        (old?.access === 'manager' || (!remove && b.access === 'manager'))
      )
        throw new ApiFault('FORBIDDEN');
      if (!remove && b.access === 'manager' && old?.access !== 'manager') {
        const keys = (await permissionKeysOf(tx, userId)).split(',');
        if (!managerKeys.some((k) => keys.includes(k)))
          throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
            access: ['Manager requires at least one of P-01–P-07'],
          });
      }
      if (remove) {
        if (!old) throw new ApiFault('NOT_FOUND');
        await tx.execute(
          sql('DELETE FROM dbo.project_members WHERE project_id=@id AND user_id=@userId', {
            id,
            userId,
          }),
        );
      } else if (old)
        await tx.execute(
          sql(
            'UPDATE dbo.project_members SET access=@access WHERE project_id=@id AND user_id=@userId',
            { id, userId, access: String(b.access) },
          ),
        );
      else
        await tx.execute(
          sql(
            'INSERT INTO dbo.project_members(project_id,user_id,access,added_by,added_at) VALUES(@id,@userId,@access,@actor,@now)',
            { id, userId, access: String(b.access), actor: proof.userId, now: now() },
          ),
        );
      await tx.execute(
        sql('UPDATE dbo.projects SET version=@version,updated_at=@now WHERE id=@id', {
          id,
          version: next,
          now: now(),
        }),
      );
      await cleanupAssignments(tx, userId, proof.userId, request, now(), { project: id });
      await audit(
        tx,
        proof,
        'project',
        id,
        'project_membership_changed',
        { user_id: userId, before: old?.access ?? null, after: remove ? null : b.access },
        request,
      );
      return members(tx, id, proof);
    },
    async directory(tx: Transaction, proof: SessionProof, q: Record<string, unknown>) {
      const a = await actor(tx, proof);
      if (
        a.orgRole !== 'admin' &&
        !(
          await tx.query(
            sql("SELECT team_id FROM dbo.team_members WHERE user_id=@id AND team_role='lead'", {
              id: a.id,
            }),
          )
        ).length
      )
        throw new ApiFault('FORBIDDEN');
      const search = q.q ? `%${String(q.q).replace(/[\\%_\[]/g, (c) => `\\${c}`)}%` : null,
        page = Number(q.page ?? 1),
        pageSize = Number(q.pageSize ?? 50),
        parameters = { search };
      const where =
        "WHERE u.active=1 AND (@search IS NULL OR u.display_name LIKE @search ESCAPE '\\')";
      const total = (
        await tx.query<{ total: number }>(
          sql(`SELECT COUNT(*) AS total FROM dbo.users u ${where}`, parameters),
        )
      )[0]!.total;
      const rows = await tx.query<User>({
        sqlite: sql(
          `SELECT u.id,u.display_name,(SELECT jt.name FROM dbo.job_titles jt WHERE jt.id=u.job_title_id) AS job_title FROM dbo.users u ${where} ORDER BY u.id LIMIT @size OFFSET @offset`,
        ).sqlite,
        sqlserver: `SELECT u.id,u.display_name,(SELECT jt.name FROM dbo.job_titles jt WHERE jt.id=u.job_title_id) AS job_title FROM dbo.users u ${where} ORDER BY u.id OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
        parameters: { ...parameters, size: pageSize, offset: (page - 1) * pageSize },
      });
      return {
        items: await Promise.all(
          rows.map(async (u) => ({
            id: u.id,
            display_name: u.display_name,
            job_title: (u.job_title as string | null) ?? null,
            teams: await tx.query<{ id: number; name: string }>(
              sql(
                'SELECT t.id,t.name FROM dbo.teams t JOIN dbo.team_members m ON m.team_id=t.id WHERE m.user_id=@id ORDER BY t.id',
                { id: u.id },
              ),
            ),
          })),
        ),
        page,
        pageSize,
        total,
      };
    },
  };
}
