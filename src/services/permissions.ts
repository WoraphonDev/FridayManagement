import type { Transaction } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import { utcNow } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { managerKeys, permissionKeys, type PermissionKey } from '../domain/permissions.js';
import { ApiFault } from '../api/errors.js';
import { operations, requestBody } from '../api/contract.js';
import { currentActor, type AccessOptions, type SessionProof } from './authorization.js';
import { invalidateMembershipViews } from './access-effects.js';

/** Requirements §7A.1 catalog; labels are display text only, the server checks keys. */
export const permissionCatalog: {
  key: PermissionKey;
  label: string;
  description: string;
  scope: 'managed_project' | 'member_team';
  preset_pm_sm: boolean;
}[] = [
  ['P-01', 'Edit project name/description', 'Projects where the user is manager; never archive.'],
  ['P-02', 'Manage groups', 'Create, rename, recolor and remove groups in managed projects.'],
  [
    'P-03',
    'Add/remove project members',
    'Editor/Viewer only; manager appointment stays Admin/Lead.',
  ],
  [
    'P-04',
    'Delete/restore tasks of others',
    'Managed projects, within the trash retention window.',
  ],
  ['P-05', 'Manage docs of others', 'Edit, delete and restore project docs in managed projects.'],
  ['P-06', 'Delete/restore files of others', 'Project and task files in managed projects.'],
  ['P-07', 'Project overview/reports/CSV', 'Overview, reports and CSV export of managed projects.'],
  ['P-08', 'Create projects', 'In teams the user belongs to; the creator becomes manager.'],
  ['P-09', 'Team workload', 'Teams the user belongs to; only tasks in accessible projects.'],
  ['P-10', 'Team reports', 'Teams the user belongs to, scoped by BR-16.'],
].map(([key, label, description], index) => ({
  key: key as PermissionKey,
  label: label!,
  description: description!,
  scope: index < 7 ? 'managed_project' : 'member_team',
  preset_pm_sm: true,
}));

type Change = { user_id: number; keys: PermissionKey[]; permissions_version: number };

export function permissionService(options: AccessOptions = {}) {
  const now = () => utcNow(options.clock);
  const lockUser = async (tx: Transaction, id: number) => {
    const row = (
      await tx.query<{ id: number; permissions_version: number }>({
        sqlite: 'SELECT id,permissions_version FROM users WHERE id=$id',
        sqlserver:
          'SELECT id,permissions_version FROM dbo.users WITH (UPDLOCK,HOLDLOCK) WHERE id=@id',
        parameters: { id },
      })
    )[0];
    if (!row) throw new ApiFault('NOT_FOUND');
    return row;
  };
  const read = async (tx: Transaction, id: number) => {
    const user = await lockUser(tx, id);
    const keys = await tx.query<{ permission_key: PermissionKey }>(
      sql(
        'SELECT permission_key FROM dbo.user_permissions WHERE user_id=@id ORDER BY permission_key',
        { id },
      ),
    );
    const managed = await tx.query<{ project_id: number }>(
      sql(
        "SELECT project_id FROM dbo.project_members WHERE user_id=@id AND access='manager' ORDER BY project_id",
        { id },
      ),
    );
    return {
      user_id: id,
      keys: keys.map((k) => k.permission_key),
      permissions_version: user.permissions_version,
      manager_project_ids: managed.map((m) => m.project_id),
    };
  };
  const admin = async (tx: Transaction, proof: SessionProof) => {
    const a = await currentActor(tx, proof, false, options);
    if (a.orgRole !== 'admin') throw new ApiFault('FORBIDDEN');
    if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
      throw new ApiFault('MAINTENANCE');
    return a;
  };
  const audit = async (
    tx: Transaction,
    actor: number,
    action: string,
    type: string,
    id: number,
    changes: unknown,
    request: string,
  ) =>
    tx.execute(
      sql(
        'INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,@action,@type,@id,@changes,@request,@now)',
        { actor, action, type, id, changes: JSON.stringify(changes), request, now: now() },
      ),
    );
  /** One user's grant change; callers already verified Admin, not-self and every version. */
  const apply = async (tx: Transaction, actor: number, change: Change, request: string) => {
    const before = await read(tx, change.user_id);
    const next = new Set(change.keys);
    const added = permissionKeys.filter((k) => next.has(k) && !before.keys.includes(k));
    const removed = before.keys.filter((k) => !next.has(k));
    if (!added.length && !removed.length) return false;
    const at = now();
    for (const key of removed)
      await tx.execute(
        sql('DELETE FROM dbo.user_permissions WHERE user_id=@id AND permission_key=@key', {
          id: change.user_id,
          key,
        }),
      );
    for (const key of added)
      await tx.execute(
        sql(
          'INSERT INTO dbo.user_permissions(user_id,permission_key,granted_by,granted_at) VALUES(@id,@key,@actor,@at)',
          { id: change.user_id, key, actor, at },
        ),
      );
    await tx.execute(
      sql('UPDATE dbo.users SET permissions_version=@version WHERE id=@id', {
        id: change.user_id,
        version: requireVersion(before.permissions_version, before.permissions_version),
      }),
    );
    // BR-22: no project key left → every manager membership becomes editor in this transaction.
    const demoted: number[] = [];
    if (!managerKeys.some((k) => next.has(k)))
      for (const project of before.manager_project_ids) {
        const version = (
          await tx.query<{ version: number }>(
            sql('SELECT version FROM dbo.projects WHERE id=@id', { id: project }),
          )
        )[0]!.version;
        await tx.execute(
          sql(
            "UPDATE dbo.project_members SET access='editor' WHERE project_id=@project AND user_id=@id AND access='manager'",
            { project, id: change.user_id },
          ),
        );
        await tx.execute(
          sql('UPDATE dbo.projects SET version=@version,updated_at=@at WHERE id=@project', {
            project,
            version: requireVersion(version, version),
            at,
          }),
        );
        await audit(
          tx,
          actor,
          'project_membership_changed',
          'project',
          project,
          { user_id: change.user_id, before: 'manager', after: 'editor', reason: 'BR-22' },
          request,
        );
        demoted.push(project);
      }
    await audit(
      tx,
      actor,
      'user_permissions_changed',
      'user',
      change.user_id,
      { added, removed, demoted_project_ids: demoted },
      request,
    );
    return true;
  };
  const body = (method: string, path: string, input: unknown) =>
    requestBody(operations.find((o) => o.method === method && o.path === path)!.operation, input);
  return {
    catalog: () => ({ items: permissionCatalog }),
    async get(tx: Transaction, proof: SessionProof, id: number) {
      const a = await currentActor(tx, proof, false, options);
      if (a.orgRole !== 'admin' && a.id !== id) throw new ApiFault('FORBIDDEN');
      return read(tx, id);
    },
    async put(tx: Transaction, proof: SessionProof, id: number, input: unknown, request: string) {
      const a = await admin(tx, proof);
      if (a.id === id) throw new ApiFault('FORBIDDEN');
      const b = body('PUT', '/api/users/{id}/permissions', input) as Omit<Change, 'user_id'>;
      const current = await lockUser(tx, id);
      requireVersion(current.permissions_version, b.permissions_version);
      if (await apply(tx, a.id, { ...b, user_id: id }, request))
        await invalidateMembershipViews(tx, now());
      return read(tx, id);
    },
    /** FR-43 bulk save: all-or-nothing; stale rows are named in fieldErrors before any write. */
    async matrix(tx: Transaction, proof: SessionProof, input: unknown, request: string) {
      const a = await admin(tx, proof);
      const { changes } = body('PUT', '/api/permissions/matrix', input) as { changes: Change[] };
      const ids = changes.map((c) => c.user_id);
      if (new Set(ids).size !== ids.length)
        throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
          changes: ['Each user may appear once'],
        });
      if (ids.includes(a.id)) throw new ApiFault('FORBIDDEN');
      const stale: Record<string, string[]> = {};
      let firstCurrent: number | undefined;
      for (const change of [...changes].sort((x, y) => x.user_id - y.user_id)) {
        const current = await lockUser(tx, change.user_id);
        if (current.permissions_version !== change.permissions_version) {
          stale[`changes.${change.user_id}`] = ['Permissions changed; reload this user'];
          firstCurrent ??= current.permissions_version;
        }
      }
      if (firstCurrent !== undefined)
        throw new ApiFault('VERSION_CONFLICT', firstCurrent, undefined, stale);
      let changed = false;
      for (const change of changes) changed = (await apply(tx, a.id, change, request)) || changed;
      if (changed) await invalidateMembershipViews(tx, now());
      const items = [];
      for (const id of ids) items.push(await read(tx, id));
      return { items };
    },
  };
}
