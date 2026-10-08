import { randomUUID } from 'node:crypto';
import type { Database, Row, Transaction } from '../domain/database.js';
import { utcNow } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { runTransaction } from '../domain/transaction.js';
import { sql } from '../repository/access-scope.js';
import { hashPassword } from '../security/passwords.js';
import { revokeUserSessions } from './sessions.js';
import { ApiFault } from '../api/errors.js';
export type InstallerCommand = {
  action: 'recover-admin' | 'force-logout';
  userId: number;
  confirmUser: string;
};
type Target = Row & {
  id: number;
  username: string;
  org_role: string;
  active: number;
  version: number;
  auth_version: number;
};
async function inspect(tx: Transaction, command: InstallerCommand) {
  if (
    !Number.isInteger(command.userId) ||
    command.userId < 1 ||
    command.userId > 2147483647 ||
    !['recover-admin', 'force-logout'].includes(command.action) ||
    !/^[A-Za-z0-9._-]{1,60}$/.test(command.confirmUser)
  )
    throw new ApiFault('VALIDATION_FAILED');
  if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
    throw new ApiFault('MAINTENANCE');
  const target = (
    await tx.query<Target>({
      sqlite: 'SELECT id,username,org_role,active,version,auth_version FROM users WHERE id=$id',
      sqlserver:
        'SELECT id,username,org_role,active,version,auth_version FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE id=@id',
      parameters: { id: command.userId },
    })
  )[0];
  if (!target) throw new ApiFault('NOT_FOUND');
  if (target.username !== command.confirmUser) throw new ApiFault('VALIDATION_FAILED');
  return target;
}
/** Local installer boundary only. Never register this service as an HTTP recovery handler. */
export async function installerAction(
  database: Database,
  command: InstallerCommand,
  options: { password?: string; clock?: () => Date; assertAuthority?: () => void } = {},
) {
  const assertAuthority = options.assertAuthority ?? (() => {});
  assertAuthority();
  const snapshot = await runTransaction(database, (tx) => inspect(tx, command));
  if (command.action === 'force-logout' && options.password !== undefined)
    throw new ApiFault('VALIDATION_FAILED');
  const encoded =
    command.action === 'recover-admin' ? await hashPassword(options.password ?? '') : undefined;
  assertAuthority();
  const requestId = randomUUID();
  return runTransaction(database, async (tx) => {
    assertAuthority();
    const target = await inspect(tx, command);
    if (target.auth_version !== snapshot.auth_version)
      throw new ApiFault('VERSION_CONFLICT', target.version);
    if (target.version !== snapshot.version) throw new ApiFault('VERSION_CONFLICT', target.version);
    const now = utcNow(options.clock);
    if (encoded)
      await tx.execute(
        sql(
          "UPDATE dbo.users SET active=1,org_role='admin',must_change_password=1,password_hash=@hash,version=@version,updated_at=@now WHERE id=@id",
          {
            id: target.id,
            hash: encoded,
            version: requireVersion(target.version, target.version),
            now,
          },
        ),
      );
    await revokeUserSessions(tx, target.id);
    // actor_id is the target FK, NOT an authenticated web actor; origin/operator_kind disambiguate the installer audit.
    await tx.execute(
      sql(
        "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@id,@action,'user',@id,@changes,@request,@now)",
        {
          id: target.id,
          action: encoded ? 'admin_recovered' : 'sessions_forced_logout',
          changes: JSON.stringify({
            origin: 'local_cli',
            operator_kind: 'installation_operator',
            authority: 'machine_file_permissions',
            audit_actor_reference: 'target_account',
            sessions_revoked: true,
            ...(encoded
              ? {
                  password_reset: true,
                  must_change_password: true,
                  before: { active: !!target.active, org_role: target.org_role },
                  after: { active: true, org_role: 'admin' },
                }
              : {}),
          }),
          request: requestId,
          now,
        },
      ),
    );
    const viewers = await tx.query<{ id: number }>(
      sql(
        "SELECT u.id FROM dbo.users u WHERE u.id=@id OR (u.active=1 AND (u.org_role='admin' OR (@reactivated=1 AND (EXISTS(SELECT 1 FROM dbo.team_members m WHERE m.user_id=u.id AND m.team_role='lead') OR EXISTS(SELECT 1 FROM dbo.tasks t JOIN dbo.projects p ON p.id=t.project_id WHERE (t.assignee_id=@id OR t.creator_id=@id) AND EXISTS(SELECT 1 FROM dbo.project_members pm WHERE pm.project_id=p.id AND pm.user_id=u.id))))))",
        { id: target.id, reactivated: Number(!!encoded && !target.active) },
      ),
    );
    for (const viewer of viewers)
      await tx.execute(
        sql(
          'UPDATE dbo.user_view_revisions SET revision=@revision,updated_at=@now WHERE user_id=@id',
          { id: viewer.id, revision: randomUUID(), now },
        ),
      );
    assertAuthority();
    return {
      status: 'completed' as const,
      action: command.action,
      user_id: target.id,
      request_id: requestId,
    };
  });
}

export async function validateInstallerTarget(database: Database, command: InstallerCommand) {
  await runTransaction(database, async (tx) => {
    await inspect(tx, command);
  });
}
