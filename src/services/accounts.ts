import { redactAudit } from '../security/audit.js';
import { randomUUID } from 'node:crypto';
import { cleanupAssignments } from './access-effects.js';
import type { Database, Row, Transaction } from '../domain/database.js';
import { utcNow } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { runTransaction } from '../domain/transaction.js';
import { sql } from '../repository/access-scope.js';
import { userTeams } from '../repository/user-teams.js';
import { workspaceService } from './workspaces.js';
import { hashPassword, verifyPassword } from '../security/passwords.js';
import { consumeSetupAttempt } from '../security/rate-limit.js';
import { ApiFault } from '../api/errors.js';
import { operations, requestBody } from '../api/contract.js';
import {
  currentActor,
  permissionKeysOf,
  type SessionProof,
  type AccessRequest,
} from './authorization.js';
import { revokeUserSessions, type sessionService, type SessionOptions } from './sessions.js';
const columns =
  'id,username,display_name,email,telephone,org_role,active,must_change_password,version,created_at,updated_at,job_title_id,(SELECT jt.name FROM dbo.job_titles jt WHERE jt.id=users.job_title_id) AS job_title,permissions_version';
const liteColumns = columns.replaceAll('dbo.', '');
type User = Row & {
  id: number;
  username: string;
  display_name: string;
  email: string;
  telephone: string;
  org_role: string;
  active: number;
  must_change_password: number;
  version: number;
  created_at: string;
  updated_at: string;
  job_title_id: number | null;
  job_title: string | null;
  permissions_version: number;
};
type Credential = Row & { password_hash: string; auth_version: number };
export type PreparedAccount = {
  kind: 'password' | 'create' | 'reset';
  hash: string;
  credential?: Credential;
  body: Record<string, unknown>;
};
async function dto(tx: Transaction, u: User) {
  const keys = await permissionKeysOf(tx, u.id);
  return {
    ...u,
    active: !!u.active,
    must_change_password: !!u.must_change_password,
    permission_keys: keys ? keys.split(',') : [],
    teams: await userTeams(tx, u.id),
  };
}
async function user(tx: Transaction, id: number) {
  const u = (
    await tx.query<User>({
      sqlite: `SELECT ${liteColumns} FROM users WHERE id=$id`,
      sqlserver: `SELECT ${columns} FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE id=@id`,
      parameters: { id },
    })
  )[0];
  if (!u) throw new ApiFault('NOT_FOUND');
  return u;
}
async function credential(tx: Transaction, id: number) {
  return (
    await tx.query<Credential>(
      sql('SELECT password_hash,auth_version FROM dbo.users WHERE id=@id', { id }),
    )
  )[0]!;
}
export function accountService(
  database: Database,
  sessions: Awaited<ReturnType<typeof sessionService>>,
  options: SessionOptions = {},
) {
  const addTeams = async (
    tx: Transaction,
    proof: SessionProof,
    id: number,
    input: unknown,
    request: string,
  ) => {
    if (input === undefined) return false;
    const current = new Set((await userTeams(tx, id)).map((t) => t.id));
    let changed = false;
    for (const teamId of [...(input as number[])].sort((a, b) => a - b)) {
      if (current.has(teamId)) continue;
      const team = (
        await tx.query<{ version: number; archived_at: string | null }>({
          sqlite: 'SELECT version,archived_at FROM teams WHERE id=$id',
          sqlserver:
            'SELECT version,archived_at FROM dbo.teams WITH (UPDLOCK,HOLDLOCK) WHERE id=@id',
          parameters: { id: teamId },
        })
      )[0];
      if (!team) throw new ApiFault('VALIDATION_FAILED');
      if (team.archived_at) throw new ApiFault('TEAM_ARCHIVED');
      await workspaceService(options.clock ? { clock: options.clock } : {}).teamMember(
        tx,
        proof,
        teamId,
        id,
        { version: team.version, team_role: 'member', team_position: 'dev' },
        false,
        request,
      );
      changed = true;
    }
    return changed;
  };
  const actor = async (tx: Transaction, proof: SessionProof, own = false, write = true) => {
    const a = await currentActor(tx, proof, own, options);
    if (!own && a.orgRole !== 'admin') throw new ApiFault('FORBIDDEN');
    if (
      write &&
      !own &&
      (await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length
    )
      throw new ApiFault('MAINTENANCE');
    return a;
  };
  const audit = async (
    tx: Transaction,
    proof: SessionProof,
    id: number,
    action: string,
    changes: unknown,
    requestId: string,
  ) => {
    await tx.execute(
      sql(
        "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,@action,'user',@id,@changes,@request,@now)",
        {
          actor: proof.userId,
          action,
          id,
          changes: JSON.stringify(redactAudit(changes)),
          request: requestId,
          now: utcNow(options.clock),
        },
      ),
    );
  };
  const bump = async (tx: Transaction, ids: Set<number>) => {
    const now = utcNow(options.clock);
    for (const id of ids)
      await tx.execute(
        sql(
          'UPDATE dbo.user_view_revisions SET revision=@revision,updated_at=@now WHERE user_id=@id',
          { id, revision: randomUUID(), now },
        ),
      );
  };
  const accountViews = async (tx: Transaction, id: number, directory = false) => {
    const rows = await tx.query<{ id: number }>(
      sql(
        `SELECT u.id FROM dbo.users u WHERE u.id=@id OR (u.active=1 AND (u.org_role='admin' ${directory ? "OR EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.user_id=u.id AND m.team_role='lead') OR EXISTS(SELECT 1 FROM dbo.tasks t JOIN dbo.projects p ON p.id=t.project_id WHERE (t.assignee_id=@id OR t.creator_id=@id) AND (EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.team_id=p.owner_team_id AND m.user_id=u.id AND m.team_role='lead') OR EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=u.id)))" : ''}))`,
        { id },
      ),
    );
    return new Set(rows.map((r) => r.id));
  };
  const version = async (tx: Transaction, id: number, expected: unknown) => {
    const u = await user(tx, id);
    requireVersion(u.version, expected as number);
    return u;
  };
  const recheck = async (tx: Transaction, proof: SessionProof, p: PreparedAccount) => {
    await actor(tx, proof, p.kind === 'password');
    if (p.credential) {
      const current = await credential(tx, proof.userId);
      if (
        current.auth_version !== p.credential.auth_version ||
        current.password_hash !== p.credential.password_hash
      )
        throw new ApiFault('UNAUTHENTICATED');
    }
  };
  return {
    async prepare(
      kind: PreparedAccount['kind'],
      proof: SessionProof,
      input: unknown,
      target?: number,
    ): Promise<PreparedAccount> {
      const path =
        kind === 'password'
          ? '/api/password'
          : kind === 'create'
            ? '/api/users'
            : '/api/users/{id}/reset-password';
      const operation = operations.find((o) => o.method === 'POST' && o.path === path)!.operation;
      const body = requestBody(operation, input) as Record<string, unknown>;
      const snapshot = await runTransaction(database, async (tx) => {
        await actor(tx, proof, kind === 'password');
        if (kind === 'reset') await version(tx, target!, body.version);
        return kind === 'create' ? undefined : credential(tx, proof.userId);
      });
      if (snapshot) {
        await consumeSetupAttempt(database, '127.0.0.1', options.clock, {
          kind: kind === 'password' ? 'password_user' : 'reset_user',
          identity: String(proof.userId),
        });
        if (
          !(await verifyPassword(
            String(body[kind === 'password' ? 'current_password' : 'admin_password']),
            snapshot.password_hash,
          ))
        )
          throw new ApiFault('INVALID_CREDENTIALS', undefined, undefined, {
            [kind === 'password' ? 'current_password' : 'admin_password']: [
              'Current password is incorrect',
            ],
          });
      }
      const hash = await hashPassword(
        String(body[kind === 'password' ? 'new_password' : 'temp_password']),
      );
      const safe =
        kind === 'create'
          ? {
              username: body.username,
              display_name: body.display_name,
              org_role: body.org_role ?? 'member',
              email: body.email ?? '',
              telephone: body.telephone ?? '',
              ...(body.team_ids === undefined ? {} : { team_ids: body.team_ids }),
            }
          : kind === 'reset'
            ? { version: body.version }
            : {};
      return { kind, hash, body: safe, ...(snapshot ? { credential: snapshot } : {}) };
    },
    async checkVersions(tx: Transaction, request: AccessRequest) {
      if (request.path === '/api/users/{id}' || request.path === '/api/users/{id}/reset-password')
        await version(tx, request.params!.id!, (request.body as { version: number }).version);
      else if (options.checkVersions) await options.checkVersions(tx, request);
      else throw new ApiFault('SERVICE_NOT_READY');
    },
    async list(tx: Transaction, proof: SessionProof, query: Record<string, unknown>) {
      await actor(tx, proof, false, false);
      const page = Number(query.page ?? 1),
        pageSize = Number(query.pageSize ?? 50),
        search =
          query.q == null ? null : `%${String(query.q).replace(/[\\%_\[]/g, (c) => `\\${c}`)}%`,
        active = query.active == null ? null : Number(query.active),
        jobTitle = query.job_title == null ? null : Number(query.job_title);
      const where =
        "WHERE (@active IS NULL OR active=@active) AND (@jobTitle IS NULL OR job_title_id=@jobTitle) AND (@search IS NULL OR username LIKE @search ESCAPE '\\' OR display_name LIKE @search ESCAPE '\\')";
      const parameters = { active, search, jobTitle };
      const total = (
        await tx.query<{ total: number }>(
          sql(`SELECT COUNT(*) AS total FROM dbo.users ${where}`, parameters),
        )
      )[0]!.total;
      const items = await tx.query<User>({
        sqlite: `SELECT ${liteColumns} FROM users ${where.replaceAll('@', '$')} ORDER BY id LIMIT $limit OFFSET $offset`,
        sqlserver: `SELECT ${columns} FROM dbo.users ${where} ORDER BY id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        parameters: { ...parameters, limit: pageSize, offset: (page - 1) * pageSize },
      });
      const dtos = [];
      for (const u of items) dtos.push(await dto(tx, u));
      return { items: dtos, page, pageSize, total };
    },
    async create(tx: Transaction, proof: SessionProof, p: PreparedAccount, requestId: string) {
      if (p.kind !== 'create') throw new ApiFault('INTERNAL_ERROR');
      await recheck(tx, proof, p);
      const { username, display_name, org_role } = p.body;
      const existing = await tx.query({
        sqlite: 'SELECT id FROM users WHERE username_ci_key=friday_ci_key($username)',
        sqlserver: 'SELECT id FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE username=@username',
        parameters: { username: String(username) },
      });
      if (existing.length)
        throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
          username: ['This username is already taken'],
        });
      const now = utcNow(options.clock);
      const inserted = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO users(username,display_name,email,telephone,org_role,password_hash,active,must_change_password,created_at,updated_at) VALUES($username,$name,$email,$telephone,$role,$hash,1,1,$now,$now) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.users(username,display_name,email,telephone,org_role,password_hash,active,must_change_password,created_at,updated_at) OUTPUT inserted.id VALUES(@username,@name,@email,@telephone,@role,@hash,1,1,@now,@now)',
        parameters: {
          username: String(username),
          name: String(display_name),
          email: String(p.body.email ?? ''),
          telephone: String(p.body.telephone ?? ''),
          role: String(org_role),
          hash: p.hash,
          now,
        },
      });
      const id = inserted[0]!.id;
      await addTeams(tx, proof, id, p.body.team_ids, requestId);
      await tx.execute(
        sql(
          'INSERT INTO dbo.user_view_revisions(user_id,revision,updated_at) VALUES(@id,@revision,@now)',
          { id, revision: randomUUID(), now },
        ),
      );
      await audit(
        tx,
        proof,
        id,
        'user_created',
        {
          username,
          display_name,
          org_role,
          email: p.body.email,
          telephone: p.body.telephone,
          team_ids: p.body.team_ids,
          active: true,
          must_change_password: true,
        },
        requestId,
      );
      await bump(tx, await accountViews(tx, id, true));
      return { item: await dto(tx, await user(tx, id)) };
    },
    async password(tx: Transaction, proof: SessionProof, p: PreparedAccount, requestId: string) {
      if (p.kind !== 'password') throw new ApiFault('INTERNAL_ERROR');
      await recheck(tx, proof, p);
      const u = await user(tx, proof.userId);
      const next = requireVersion(u.version, u.version);
      await tx.execute(
        sql(
          'UPDATE dbo.users SET password_hash=@hash,must_change_password=0,version=@version,updated_at=@now WHERE id=@id',
          { id: u.id, hash: p.hash, version: next, now: utcNow(options.clock) },
        ),
      );
      await audit(
        tx,
        proof,
        u.id,
        'password_changed',
        { password_changed: true, must_change_password: false },
        requestId,
      );
      await bump(tx, await accountViews(tx, u.id));
      return sessions.rotate(tx, proof);
    },
    async reset(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      p: PreparedAccount,
      requestId: string,
    ) {
      if (p.kind !== 'reset') throw new ApiFault('INTERNAL_ERROR');
      await recheck(tx, proof, p);
      const u = await version(tx, id, p.body.version),
        next = requireVersion(u.version, u.version);
      await tx.execute(
        sql(
          'UPDATE dbo.users SET password_hash=@hash,must_change_password=1,version=@version,updated_at=@now WHERE id=@id',
          { id, hash: p.hash, version: next, now: utcNow(options.clock) },
        ),
      );
      await revokeUserSessions(tx, id);
      await audit(
        tx,
        proof,
        id,
        'password_reset',
        { password_reset: true, must_change_password: true },
        requestId,
      );
      await bump(tx, await accountViews(tx, id));
      return { item: await dto(tx, await user(tx, id)) };
    },
    async patch(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      requestId: string,
    ) {
      await actor(tx, proof);
      const operation = operations.find(
        (o) => o.method === 'PATCH' && o.path === '/api/users/{id}',
      )!.operation;
      const body = requestBody(operation, input) as {
        version: number;
        active?: boolean;
        org_role?: string;
        display_name?: string;
        job_title_id?: number | null;
        email?: string;
        telephone?: string;
        team_ids?: number[];
      };
      const u = await version(tx, id, body.version),
        active = body.active === undefined ? u.active : Number(body.active),
        role = body.org_role ?? u.org_role,
        name = body.display_name ?? u.display_name,
        email = body.email ?? u.email,
        telephone = body.telephone ?? u.telephone,
        jobTitle = body.job_title_id === undefined ? u.job_title_id : body.job_title_id;
      // BR-20: only an active title can be newly assigned; an existing assignment may stay.
      if (jobTitle !== null && jobTitle !== u.job_title_id) {
        const title = (
          await tx.query<{ is_active: number }>(
            sql('SELECT is_active FROM dbo.job_titles WHERE id=@id', { id: jobTitle }),
          )
        )[0];
        if (!title?.is_active)
          throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
            job_title_id: ['Job title is unknown or inactive'],
          });
      }
      const titleOnly = active === u.active && role === u.org_role && name === u.display_name;
      const teamsAdded = await addTeams(tx, proof, id, body.team_ids, requestId);
      const contactChanged = email !== u.email || telephone !== u.telephone;
      if (titleOnly && jobTitle === u.job_title_id && !contactChanged && !teamsAdded)
        return { item: await dto(tx, u) };
      if (titleOnly) {
        // BR-19/BR-21: a title change never touches sessions, memberships or permissions.
        const next = requireVersion(u.version, u.version);
        await tx.execute(
          sql(
            'UPDATE dbo.users SET job_title_id=@jobTitle,email=@email,telephone=@telephone,version=@version,updated_at=@now WHERE id=@id',
            { id, jobTitle, email, telephone, version: next, now: utcNow(options.clock) },
          ),
        );
        await audit(
          tx,
          proof,
          id,
          contactChanged || teamsAdded ? 'user_details_changed' : 'user_job_title_changed',
          {
            job_title_id: jobTitle,
            email,
            telephone,
            team_ids: body.team_ids,
            previous: { job_title_id: u.job_title_id, email: u.email, telephone: u.telephone },
          },
          requestId,
        );
        await bump(tx, await accountViews(tx, id, true));
        return { item: await dto(tx, await user(tx, id)) };
      }
      if (u.active && u.org_role === 'admin' && (!active || role !== 'admin')) {
        const admins = await tx.query<{ id: number }>({
          sqlite: "SELECT id FROM users WHERE active=1 AND org_role='admin' ORDER BY id",
          sqlserver:
            "SELECT id FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE active=1 AND org_role='admin' ORDER BY id",
        });
        if (admins.length <= 1) throw new ApiFault('LAST_ACTIVE_ADMIN');
      }
      const ids = await accountViews(tx, id, true),
        now = utcNow(options.clock),
        next = requireVersion(u.version, u.version);
      await tx.execute(
        sql(
          'UPDATE dbo.users SET display_name=@name,email=@email,telephone=@telephone,active=@active,org_role=@role,job_title_id=@jobTitle,version=@version,updated_at=@now WHERE id=@id',
          { id, name, email, telephone, active, role, jobTitle, version: next, now },
        ),
      );
      if (active !== u.active || role !== u.org_role) await revokeUserSessions(tx, id);
      if ((u.active && !active) || (u.org_role === 'admin' && role === 'member')) {
        for (const affected of await cleanupAssignments(tx, id, proof.userId, requestId, now))
          ids.add(affected);
      }
      await audit(
        tx,
        proof,
        id,
        'user_updated',
        {
          display_name: name,
          email,
          telephone,
          team_ids: body.team_ids,
          active: !!active,
          org_role: role,
          job_title_id: jobTitle,
          previous: {
            display_name: u.display_name,
            email: u.email,
            telephone: u.telephone,
            active: !!u.active,
            org_role: u.org_role,
            job_title_id: u.job_title_id,
          },
        },
        requestId,
      );
      await bump(tx, ids);
      return { item: await dto(tx, await user(tx, id)) };
    },
  };
}
