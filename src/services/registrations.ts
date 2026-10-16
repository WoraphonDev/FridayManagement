import { randomUUID } from 'node:crypto';
import type { Database, Row, Transaction } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { utcNow } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { sql } from '../repository/access-scope.js';
import { operations, requestBody } from '../api/contract.js';
import { ApiFault } from '../api/errors.js';
import { hashPassword } from '../security/passwords.js';
import { consumeSetupAttempt, canonicalIp } from '../security/rate-limit.js';
import { currentActor, type SessionProof, type AccessOptions } from './authorization.js';
import { invalidateMembershipViews } from './access-effects.js';
import { revokeUserSessions } from './sessions.js';

export const registrationReply = {
  message: 'Registration received. Contact your Admin for approval before signing in.',
};
type Registration = Row & {
  id: number;
  user_id: number;
  email: string;
  display_name: string;
  status: string;
  version: number;
  created_at: string;
  reviewed_at: string | null;
};
const columns =
  'r.id,r.user_id,r.email,u.display_name,r.status,r.version,r.created_at,r.reviewed_at';
export function registrationService(database: Database, options: AccessOptions = {}) {
  const audit = (tx: Transaction, actor: number, id: number, action: string, request: string) =>
    tx.execute(
      sql(
        "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,@action,'registration',@id,@changes,@request,@now)",
        {
          actor,
          action,
          id,
          changes: JSON.stringify({ status: action.replace('registration_', '') }),
          request,
          now: utcNow(options.clock),
        },
      ),
    );
  const admin = async (tx: Transaction, proof: SessionProof) => {
    const actor = await currentActor(tx, proof, false, options);
    if (actor.orgRole !== 'admin') throw new ApiFault('FORBIDDEN');
    return actor;
  };
  return {
    async checkVersions(tx: Transaction, id: number, version: number) {
      const row = (
        await tx.query<{ version: number }>(
          sql('SELECT version FROM dbo.registrations WHERE id=@id', { id }),
        )
      )[0];
      if (!row) throw new ApiFault('NOT_FOUND');
      requireVersion(row.version, version);
    },
    async register(input: unknown, address: string, request: string) {
      const op = operations.find((o) => o.path === '/api/register')!.operation;
      const body = requestBody(op, input) as {
        email: string;
        display_name: string;
        password: string;
      };
      const email = body.email.trim().toLowerCase();
      // Independent rate-limit commit precedes password work and any duplicate lookup.
      await consumeSetupAttempt(database, address, options.clock, {
        kind: 'registration_ip',
        identity: canonicalIp(address),
      });
      const encoded = await hashPassword(body.password);
      return runTransaction(database, async (tx) => {
        // Serialize competing submissions on all providers; setup must already be complete.
        const org = await tx.query({
          sqlite: 'SELECT id FROM organizations WHERE id=1',
          sqlserver: 'SELECT id FROM dbo.organizations WITH (UPDLOCK,HOLDLOCK) WHERE id=1',
        });
        if (!org.length) throw new ApiFault('SERVICE_NOT_READY');
        if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
          throw new ApiFault('MAINTENANCE');
        const existing = await tx.query(
          sql('SELECT id FROM dbo.registrations WHERE email=@email', { email }),
        );
        if (existing.length) return registrationReply;
        const now = utcNow(options.clock);
        const user = (
          await tx.query<{ id: number }>({
            sqlite:
              "INSERT INTO users(username,display_name,email,password_hash,org_role,active,must_change_password,created_at,updated_at) VALUES($username,$name,$email,$hash,'member',0,0,$now,$now) RETURNING id",
            sqlserver:
              "INSERT INTO dbo.users(username,display_name,email,password_hash,org_role,active,must_change_password,created_at,updated_at) OUTPUT INSERTED.id VALUES(@username,@name,@email,@hash,'member',0,0,@now,@now)",
            parameters: {
              username: 'member.' + randomUUID().replaceAll('-', ''),
              name: body.display_name,
              email,
              hash: encoded,
              now,
            },
          })
        )[0]!;
        const registration = (
          await tx.query<{ id: number }>({
            sqlite:
              'INSERT INTO registrations(user_id,email,created_at) VALUES($user,$email,$now) RETURNING id',
            sqlserver:
              'INSERT INTO dbo.registrations(user_id,email,created_at) OUTPUT INSERTED.id VALUES(@user,@email,@now)',
            parameters: { user: user.id, email, now },
          })
        )[0]!;
        await tx.execute(
          sql(
            'INSERT INTO dbo.user_view_revisions(user_id,revision,updated_at) VALUES(@user,@revision,@now)',
            { user: user.id, revision: randomUUID(), now },
          ),
        );
        await audit(tx, user.id, registration.id, 'registration_submitted', request);
        return registrationReply;
      });
    },
    async list(tx: Transaction, proof: SessionProof, query: Record<string, unknown>) {
      await admin(tx, proof);
      const page = Number(query.page ?? 1),
        pageSize = Number(query.pageSize ?? 20),
        status = String(query.status ?? 'pending');
      const parameters = { status, offset: (page - 1) * pageSize, size: pageSize };
      const total = (
        await tx.query<{ total: number }>(
          sql(
            "SELECT COUNT(*) AS total FROM dbo.registrations r WHERE (@status='all' OR r.status=@status)",
            { status },
          ),
        )
      )[0]!.total;
      const items = await tx.query<Registration>({
        sqlite: `SELECT ${columns} FROM registrations r JOIN users u ON u.id=r.user_id WHERE ($status='all' OR r.status=$status) ORDER BY r.id DESC LIMIT $size OFFSET $offset`,
        sqlserver: `SELECT ${columns} FROM dbo.registrations r JOIN dbo.users u ON u.id=r.user_id WHERE (@status='all' OR r.status=@status) ORDER BY r.id DESC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
        parameters,
      });
      return { items, total, page, pageSize };
    },
    async review(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      input: unknown,
      decision: 'approved' | 'rejected',
      request: string,
    ) {
      const actor = await admin(tx, proof);
      if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
        throw new ApiFault('MAINTENANCE');
      const body = input as { version: number };
      const row = (
        await tx.query<Registration>({
          sqlite: `SELECT ${columns} FROM registrations r JOIN users u ON u.id=r.user_id WHERE r.id=$id`,
          sqlserver: `SELECT ${columns} FROM dbo.registrations r WITH (UPDLOCK,HOLDLOCK) JOIN dbo.users u WITH (UPDLOCK,HOLDLOCK) ON u.id=r.user_id WHERE r.id=@id`,
          parameters: { id },
        })
      )[0];
      if (!row) throw new ApiFault('NOT_FOUND');
      requireVersion(row.version, body.version);
      if (row.status !== 'pending') throw new ApiFault('VERSION_CONFLICT', row.version);
      const now = utcNow(options.clock),
        next = requireVersion(row.version, row.version);
      const userVersion = (
        await tx.query<{ version: number }>(
          sql('SELECT version FROM dbo.users WHERE id=@user', { user: row.user_id }),
        )
      )[0]!.version;
      const nextUserVersion = requireVersion(userVersion, userVersion);
      await tx.execute(
        sql(
          'UPDATE dbo.registrations SET status=@status,version=@version,reviewed_by=@actor,reviewed_at=@now WHERE id=@id',
          { status: decision, version: next, actor: actor.id, now, id },
        ),
      );
      // No memberships or permission grants are created by approval.
      await tx.execute(
        sql(
          "UPDATE dbo.users SET active=@active,org_role='member',version=@version,updated_at=@now WHERE id=@user",
          {
            active: Number(decision === 'approved'),
            version: nextUserVersion,
            now,
            user: row.user_id,
          },
        ),
      );
      await revokeUserSessions(tx, row.user_id);
      await audit(tx, actor.id, id, 'registration_' + decision, request);
      await invalidateMembershipViews(tx, now);
      return { item: { ...row, status: decision, version: next, reviewed_at: now } };
    },
  };
}
