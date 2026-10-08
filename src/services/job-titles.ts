import type { Row, Transaction } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import { utcNow } from '../domain/dates.js';
import { requireVersion } from '../domain/lifecycle.js';
import { ApiFault } from '../api/errors.js';
import { operations, requestBody } from '../api/contract.js';
import {
  currentActor,
  type AccessOptions,
  type AccessRequest,
  type SessionProof,
} from './authorization.js';
import { invalidateMembershipViews } from './access-effects.js';

type JobTitle = Row & {
  id: number;
  name: string;
  color: string;
  is_active: number;
  sort_order: number;
  user_count: number;
  version: number;
  created_at: string;
  updated_at: string;
};
const select =
  'SELECT jt.id,jt.name,jt.color,jt.is_active,jt.sort_order,(SELECT COUNT(*) FROM dbo.users u WHERE u.job_title_id=jt.id) AS user_count,jt.version,jt.created_at,jt.updated_at FROM dbo.job_titles jt';
const dto = (t: JobTitle) => ({ ...t, is_active: !!t.is_active });

/** FR-41/BR-19/BR-20: labels only. Nothing here is read by authorization. */
export function jobTitleService(options: AccessOptions = {}) {
  const now = () => utcNow(options.clock);
  const one = async (tx: Transaction, id: number) => {
    const row = (await tx.query<JobTitle>(sql(`${select} WHERE jt.id=@id`, { id })))[0];
    if (!row) throw new ApiFault('NOT_FOUND');
    return row;
  };
  const admin = async (tx: Transaction, proof: SessionProof) => {
    const a = await currentActor(tx, proof, false, options);
    if (a.orgRole !== 'admin') throw new ApiFault('FORBIDDEN');
    if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
      throw new ApiFault('MAINTENANCE');
    return a;
  };
  // Case-insensitive uniqueness, matching the SQLite ci-key and SQL Server CI collation index.
  const unique = async (tx: Transaction, name: string, except: number | null) => {
    const rows = await tx.query<{ id: number }>({
      sqlite: 'SELECT id FROM job_titles WHERE name_ci_key=friday_ci_key($name)',
      sqlserver: 'SELECT id FROM dbo.job_titles WITH (UPDLOCK,HOLDLOCK) WHERE name=@name',
      parameters: { name },
    });
    if (rows.some((r) => r.id !== except))
      throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
        name: ['Job title already exists'],
      });
  };
  const audit = (
    tx: Transaction,
    actor: number,
    action: string,
    id: number,
    changes: unknown,
    request: string,
  ) =>
    tx.execute(
      sql(
        "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,@action,'job_title',@id,@changes,@request,@now)",
        { actor, action, id, changes: JSON.stringify(changes), request, now: now() },
      ),
    );
  const body = (method: string, path: string, input: unknown) =>
    requestBody(
      operations.find((o) => o.method === method && o.path === path)!.operation,
      input,
    ) as Record<string, unknown>;
  return {
    async checkVersions(tx: Transaction, r: AccessRequest) {
      requireVersion(
        (await one(tx, r.params!.id!)).version,
        (r.body as { version: number }).version,
      );
    },
    async list(tx: Transaction, proof: SessionProof, q: Record<string, unknown>) {
      await currentActor(tx, proof, false, options);
      const rows = await tx.query<JobTitle>(
        sql(`${select} WHERE (@all=1 OR jt.is_active=1) ORDER BY jt.sort_order,jt.id`, {
          all: Number(q.includeInactive ?? false),
        }),
      );
      return { items: rows.map(dto) };
    },
    async create(tx: Transaction, proof: SessionProof, input: unknown, request: string) {
      const a = await admin(tx, proof),
        b = body('POST', '/api/job-titles', input),
        name = String(b.name);
      await unique(tx, name, null);
      if (
        (await tx.query<{ total: number }>(sql('SELECT COUNT(*) AS total FROM dbo.job_titles')))[0]!
          .total >= 1000
      )
        throw new ApiFault('VALIDATION_FAILED');
      const at = now();
      const rows = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO job_titles(name,color,sort_order,created_at,updated_at) VALUES($name,$color,$sort,$at,$at) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.job_titles(name,color,sort_order,created_at,updated_at) OUTPUT INSERTED.id VALUES(@name,@color,@sort,@at,@at)',
        parameters: {
          name,
          color: String(b.color ?? '#579bfc'),
          sort: Number(b.sort_order ?? 0),
          at,
        },
      });
      const id = rows[0]!.id;
      await audit(tx, a.id, 'job_title_created', id, b, request);
      await invalidateMembershipViews(tx, at);
      return { item: dto(await one(tx, id)) };
    },
    async patch(tx: Transaction, proof: SessionProof, id: number, input: unknown, request: string) {
      const a = await admin(tx, proof),
        b = body('PATCH', '/api/job-titles/{id}', input),
        before = await one(tx, id),
        version = requireVersion(before.version, Number(b.version));
      const after = {
        name: String(b.name ?? before.name),
        color: String(b.color ?? before.color),
        // BR-20: deactivate instead of delete; existing user assignments are kept.
        is_active: b.is_active === undefined ? before.is_active : Number(b.is_active),
        sort_order: Number(b.sort_order ?? before.sort_order),
      };
      if (after.name !== before.name) await unique(tx, after.name, id);
      await tx.execute(
        sql(
          'UPDATE dbo.job_titles SET name=@name,color=@color,is_active=@active,sort_order=@sort,version=@version,updated_at=@at WHERE id=@id',
          {
            id,
            name: after.name,
            color: after.color,
            active: after.is_active,
            sort: after.sort_order,
            version,
            at: now(),
          },
        ),
      );
      await audit(
        tx,
        a.id,
        'job_title_updated',
        id,
        {
          before: {
            name: before.name,
            color: before.color,
            is_active: !!before.is_active,
            sort_order: before.sort_order,
          },
          after: { ...after, is_active: !!after.is_active },
        },
        request,
      );
      await invalidateMembershipViews(tx, now());
      return { item: dto(await one(tx, id)) };
    },
  };
}
