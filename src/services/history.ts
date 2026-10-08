import type { Transaction } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import {
  currentActor,
  projectAccess,
  type SessionProof,
  type AccessOptions,
} from './authorization.js';
import { ApiFault } from '../api/errors.js';
import { operations, parseSchema } from '../api/contract.js';
import { redactAudit } from '../security/audit.js';
export function historyService(options: AccessOptions = {}) {
  return {
    async page(
      tx: Transaction,
      proof: SessionProof,
      task: number | null,
      input: Record<string, unknown>,
    ) {
      const actor = await currentActor(tx, proof, false, options);
      if (task === null) {
        if (actor.orgRole !== 'admin') throw new ApiFault('FORBIDDEN');
      } else {
        const t = (
          await tx.query<{ project_id: number; deleted_at: string | null }>(
            sql('SELECT project_id,deleted_at FROM dbo.tasks WHERE id=@task', { task }),
          )
        )[0];
        if (!t) throw new ApiFault('NOT_FOUND');
        await projectAccess(tx, actor, t.project_id);
        if (t.deleted_at) throw new ApiFault('NOT_FOUND');
      }
      const path = task === null ? '/api/audit' : '/api/tasks/{id}/events';
      parseSchema(
        operations.find((o) => o.path === path && o.method === 'GET')!.operation['x-query-schema'],
        input,
      );
      const page = Number(input.page ?? 1),
        pageSize = Number(input.pageSize ?? 50);
      const table = task === null ? 'admin_events' : 'task_events';
      const from = `FROM dbo.${table} e LEFT JOIN dbo.users u ON u.id=e.actor_id${task === null ? '' : ' WHERE e.task_id=@task'}`;
      const parameters = {
        ...(task === null ? {} : { task }),
        size: pageSize,
        offset: (page - 1) * pageSize,
      };
      const total = (
        await tx.query<{ total: number }>(
          sql('SELECT COUNT(*) AS total ' + from, task === null ? {} : { task }),
        )
      )[0]!.total;
      const query = sql(
        'SELECT e.*,u.display_name,u.active ' + from + ' ORDER BY e.id ASC',
        parameters,
      );
      const rows = await tx.query({
        ...query,
        sqlite: query.sqlite + ' LIMIT $size OFFSET $offset',
        sqlserver: query.sqlserver + ' OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY',
      });
      return {
        page,
        pageSize,
        total,
        items: rows.map((r) => ({
          id: r.id,
          actor:
            r.actor_id === null
              ? null
              : { id: r.actor_id, display_name: r.display_name, active: !!r.active },
          action: r.action,
          request_id: r.request_id,
          created_at: r.created_at,
          ...(task === null
            ? {
                resource_type: r.resource_type,
                resource_id: r.resource_id,
                redacted_changes: JSON.stringify(
                  redactAudit(JSON.parse(String(r.redacted_changes))),
                ),
              }
            : {
                task_id: r.task_id,
                field_changes: (
                  JSON.parse(String(r.field_changes)) as {
                    field: string;
                    before: unknown;
                    after: unknown;
                  }[]
                ).map((c) => ({ ...c, before: scalar(c.before), after: scalar(c.after) })),
              }),
        })),
      };
    },
  };
}
function scalar(value: unknown) {
  return value !== null && typeof value === 'object' ? JSON.stringify(redactAudit(value)) : value;
}
