import { randomBytes } from 'node:crypto';
import type { Database, Row, Transaction } from '../domain/database.js';
import { utcNow, bangkokToday } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { runTransaction } from '../domain/transaction.js';
import { sql, projectList } from '../repository/access-scope.js';
import { userTeams } from '../repository/user-teams.js';
import { hashPassword, verifyPassword, isPasswordHash } from '../security/passwords.js';
import { consumeLoginAttempt } from '../security/rate-limit.js';
import { tokenDigest } from '../security/session-cookie.js';
import { ApiFault } from '../api/errors.js';
import { operations, parseSchema, requestBody } from '../api/contract.js';
import {
  currentActor,
  permissionKeysOf,
  type SessionProof,
  type AccessOptions,
} from './authorization.js';
const loginOperation = operations.find((o) => o.path === '/api/login')!.operation;
const selfSchema = loginOperation.responses['200']!.content!['application/json']!.schema;
export interface SessionOptions extends AccessOptions {
  absoluteMinutes?: number;
}
type Account = Row & {
  id: number;
  username: string;
  password_hash: string;
  active: number;
  auth_version: number;
};
function secret() {
  const bytes = randomBytes(32);
  try {
    return bytes.toString('hex');
  } finally {
    bytes.fill(0);
  }
}
/** Compose with role/reset/deactivation/forced logout mutation in the caller's transaction. */
export async function revokeUserSessions(tx: Transaction, userId: number) {
  if (!Number.isInteger(userId) || userId < 1 || userId > 2147483647)
    throw new ApiFault('VALIDATION_FAILED');
  const rows = await tx.query<{ auth_version: number }>({
    sqlite: 'SELECT auth_version FROM users WHERE id=$id',
    sqlserver: 'SELECT auth_version FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE id=@id',
    parameters: { id: userId },
  });
  if (!rows[0]) throw new ApiFault('NOT_FOUND');
  const version = requireVersion(rows[0].auth_version, rows[0].auth_version);
  await tx.execute(
    sql('UPDATE dbo.users SET auth_version=@version WHERE id=@id', { version, id: userId }),
  );
  await tx.execute(sql('DELETE FROM dbo.sessions WHERE user_id=@id', { id: userId }));
}
export async function sessionService(database: Database, options: SessionOptions = {}) {
  const absolute = options.absoluteMinutes ?? 720,
    idle = options.idleMinutes ?? 60;
  if (
    !Number.isInteger(absolute) ||
    absolute < 1 ||
    absolute > 720 ||
    !Number.isInteger(idle) ||
    idle < 1 ||
    idle > 60 ||
    idle > absolute
  )
    throw new ApiFault('SERVICE_NOT_READY');
  const access = { ...options, idleMinutes: idle };
  // One random dummy hash per process; absent/inactive/corrupt accounts still do normal-cost verification.
  const dummy = await hashPassword(secret());
  const self = async (tx: Transaction, proof: SessionProof) => {
    const actor = await currentActor(tx, proof, true, access);
    const rows = await tx.query<
      Row & {
        id: number;
        username: string;
        display_name: string;
        org_role: string;
        active: number;
        must_change_password: number;
        version: number;
        created_at: string;
        updated_at: string;
        csrf_token: string;
        revision: string;
        job_title_id: number | null;
        job_title: string | null;
        permissions_version: number;
        email: string;
        telephone: string;
      }
    >(
      sql(
        'SELECT u.id,u.username,u.display_name,u.email,u.telephone,u.org_role,u.active,u.must_change_password,u.version,u.created_at,u.updated_at,u.job_title_id,(SELECT jt.name FROM dbo.job_titles jt WHERE jt.id=u.job_title_id) AS job_title,u.permissions_version,s.csrf_token,r.revision FROM dbo.users u JOIN dbo.sessions s ON s.user_id=u.id JOIN dbo.user_view_revisions r ON r.user_id=u.id WHERE u.id=@id AND s.token_hash=@hash',
        { id: proof.userId, hash: proof.tokenHash },
      ),
    );
    const row = rows[0];
    if (!row) throw new ApiFault('SERVICE_NOT_READY');
    const leads = actor.forcedPassword
      ? []
      : await tx.query<{ team_id: number }>(
          sql(
            "SELECT team_id FROM dbo.team_members WHERE user_id=@id AND team_role='lead' ORDER BY team_id",
            { id: actor.id },
          ),
        );
    const projects = actor.forcedPassword
      ? []
      : await tx.query<{ id: number }>(projectList(actor.id, true));
    const maintenance = await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'));
    const body = {
      user: {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        org_role: row.org_role,
        active: !!row.active,
        must_change_password: !!row.must_change_password,
        version: row.version,
        created_at: row.created_at,
        updated_at: row.updated_at,
        job_title_id: row.job_title_id,
        email: row.email,
        telephone: row.telephone,
        teams: await userTeams(tx, row.id),
        job_title: row.job_title,
        // FR-43: users read their own current grants (read-only Settings view).
        permission_keys: (await permissionKeysOf(tx, row.id)).split(',').filter(Boolean),
        permissions_version: row.permissions_version,
      },
      csrf: row.csrf_token,
      effective_summary: {
        lead_team_ids: leads.map((r) => r.team_id),
        project_ids: projects.map((r) => r.id),
      },
      must_change_password: !!row.must_change_password,
      maintenance: maintenance.length > 0,
      view_revision: row.revision,
      bangkok_today: bangkokToday(utcNow(options.clock)),
    };
    try {
      parseSchema(selfSchema, body);
    } catch {
      throw new ApiFault('INTERNAL_ERROR');
    }
    return body;
  };
  return {
    async principal(hash: string | null) {
      if (!hash) return null;
      try {
        return await runTransaction(database, async (tx) => {
          const rows = await tx.query<{ user_id: number; csrf_token: string }>(
            sql('SELECT user_id,csrf_token FROM dbo.sessions WHERE token_hash=@hash', { hash }),
          );
          if (!rows[0]) return null;
          const actor = await currentActor(
            tx,
            { userId: rows[0].user_id, tokenHash: hash },
            true,
            access,
          );
          return {
            id: actor.id,
            active: true,
            mustChangePassword: actor.forcedPassword,
            csrf: rows[0].csrf_token,
          };
        });
      } catch (e) {
        if (e instanceof ApiFault && e.code === 'UNAUTHENTICATED') return null;
        throw e;
      }
    },
    async login(input: unknown, address: string, oldHash?: string | null) {
      const body = requestBody(loginOperation, input) as { username: string; password: string };
      await consumeLoginAttempt(database, body.username, address, options.clock);
      const account = await runTransaction(
        database,
        async (tx) =>
          (
            await tx.query<Account>({
              sqlite:
                'SELECT id,username,password_hash,active,auth_version FROM users WHERE username_ci_key=friday_ci_key($username)',
              sqlserver:
                'SELECT id,username,password_hash,active,auth_version FROM dbo.users WHERE username=@username',
              parameters: { username: body.username },
            })
          )[0],
      );
      const eligible = !!account?.active && isPasswordHash(account.password_hash);
      const matched = await verifyPassword(
        body.password,
        eligible ? account!.password_hash : dummy,
      );
      if (!eligible || !matched) throw new ApiFault('INVALID_CREDENTIALS');
      const token = secret(),
        csrf = secret(),
        hash = tokenDigest(token);
      const result = await runTransaction(database, async (tx) => {
        const current = (
          await tx.query<Account>({
            sqlite: 'SELECT id,username,password_hash,active,auth_version FROM users WHERE id=$id',
            sqlserver:
              'SELECT id,username,password_hash,active,auth_version FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE id=@id',
            parameters: { id: account!.id },
          })
        )[0];
        if (
          !current?.active ||
          current.auth_version !== account!.auth_version ||
          current.password_hash !== account!.password_hash ||
          current.username.toLowerCase() !== body.username.toLowerCase()
        )
          throw new ApiFault('INVALID_CREDENTIALS');
        if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
          throw new ApiFault('MAINTENANCE');
        const now = utcNow(options.clock),
          expires = new Date(Date.parse(now) + absolute * 60000).toISOString();
        await tx.execute(
          sql(
            'INSERT INTO dbo.sessions(token_hash,user_id,csrf_token,auth_version,created_at,last_seen_at,absolute_expires_at) VALUES(@hash,@id,@csrf,@version,@now,@now,@expires)',
            { hash, id: current.id, csrf, version: current.auth_version, now, expires },
          ),
        );
        if (oldHash)
          await tx.execute(
            sql('DELETE FROM dbo.sessions WHERE token_hash=@old AND token_hash<>@hash', {
              old: oldHash,
              hash,
            }),
          );
        return { body: await self(tx, { userId: current.id, tokenHash: hash }), expires };
      });
      return { ...result, token };
    },
    self,
    async rotate(tx: Transaction, proof: SessionProof) {
      await currentActor(tx, proof, true, access);
      const lifetime = (
        await tx.query<{ created_at: string; absolute_expires_at: string }>(
          sql('SELECT created_at,absolute_expires_at FROM dbo.sessions WHERE token_hash=@hash', {
            hash: proof.tokenHash,
          }),
        )
      )[0]!;
      await revokeUserSessions(tx, proof.userId);
      const version = (
        await tx.query<{ auth_version: number }>(
          sql('SELECT auth_version FROM dbo.users WHERE id=@id', { id: proof.userId }),
        )
      )[0]!.auth_version;
      const token = secret(),
        csrf = secret(),
        hash = tokenDigest(token),
        now = utcNow(options.clock);
      await tx.execute(
        sql(
          'INSERT INTO dbo.sessions(token_hash,user_id,csrf_token,auth_version,created_at,last_seen_at,absolute_expires_at) VALUES(@hash,@id,@csrf,@version,@created,@now,@expires)',
          {
            hash,
            id: proof.userId,
            csrf,
            version,
            created: lifetime.created_at,
            now,
            expires: lifetime.absolute_expires_at,
          },
        ),
      );
      return {
        token,
        expires: lifetime.absolute_expires_at,
        body: await self(tx, { userId: proof.userId, tokenHash: hash }),
      };
    },
    async activity(tx: Transaction, proof: SessionProof, csrf: string) {
      await currentActor(tx, proof, true, { ...access, csrf });
      await tx.execute(
        sql('UPDATE dbo.sessions SET last_seen_at=@now WHERE token_hash=@hash AND user_id=@id', {
          now: utcNow(options.clock),
          hash: proof.tokenHash,
          id: proof.userId,
        }),
      );
    },
    async logout(tx: Transaction, proof: SessionProof, csrf: string) {
      await currentActor(tx, proof, true, { ...access, csrf });
      await tx.execute(
        sql('DELETE FROM dbo.sessions WHERE token_hash=@hash AND user_id=@id', {
          hash: proof.tokenHash,
          id: proof.userId,
        }),
      );
    },
  };
}
