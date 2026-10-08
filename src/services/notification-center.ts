import type { Database, Transaction } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { utcNow } from '../domain/dates.js';
import { sql, projectVisibility, readNotifications } from '../repository/access-scope.js';
import { currentActor, type SessionProof, type AccessOptions } from './authorization.js';
import { ApiFault } from '../api/errors.js';
import { operations, parseSchema } from '../api/contract.js';
export function notificationCenter(options: AccessOptions = {}) {
  const from = `FROM dbo.notifications n JOIN dbo.tasks t ON t.id=n.task_id JOIN dbo.projects p ON p.id=t.project_id WHERE n.recipient_id=@viewer AND t.deleted_at IS NULL AND ${projectVisibility('read')}`;
  const select = 'SELECT n.id,n.task_id,n.type,n.message,n.read_at,n.created_at ';
  return {
    async page(tx: Transaction, proof: SessionProof, input: Record<string, unknown>) {
      const actor = await currentActor(tx, proof, false, options);
      parseSchema(
        operations.find((o) => o.path === '/api/notifications' && o.method === 'GET')!.operation[
          'x-query-schema'
        ],
        input,
      );
      const page = Number(input.page ?? 1),
        pageSize = Number(input.pageSize ?? 50);
      const parameters = { viewer: actor.id };
      const counts = (
        await tx.query<{ total: number; unread_count: number }>(
          sql(
            `SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN n.read_at IS NULL THEN 1 ELSE 0 END),0) AS unread_count ${from}`,
            parameters,
          ),
        )
      )[0]!;
      const filtered =
        from +
        (input.unread === undefined ? '' : ` AND n.read_at IS ${input.unread ? '' : 'NOT '}NULL`);
      const total =
        input.unread === undefined
          ? counts.total
          : (
              await tx.query<{ total: number }>(
                sql('SELECT COUNT(*) AS total ' + filtered, parameters),
              )
            )[0]!.total;
      const query = sql(select + filtered + ' ORDER BY n.created_at DESC,n.id DESC', {
        ...parameters,
        size: pageSize,
        offset: (page - 1) * pageSize,
      });
      const items = await tx.query({
        ...query,
        sqlite: query.sqlite + ' LIMIT $size OFFSET $offset',
        sqlserver: query.sqlserver + ' OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY',
      });
      return { items, page, pageSize, total, unread_count: counts.unread_count };
    },
    async read(tx: Transaction, proof: SessionProof, id: number | null) {
      const actor = await currentActor(tx, proof, false, options),
        parameters = { viewer: actor.id };
      const items =
        id === null
          ? []
          : await tx.query(sql(select + from + ' AND n.id=@id', { ...parameters, id }));
      if (id !== null && !items.length) throw new ApiFault('NOT_FOUND');
      const marked_count = (
        await tx.query<{ total: number }>(
          sql(
            'SELECT COUNT(*) AS total ' +
              from +
              ' AND n.read_at IS NULL' +
              (id === null ? '' : ' AND n.id=@id'),
            { ...parameters, ...(id === null ? {} : { id }) },
          ),
        )
      )[0]!.total;
      await tx.execute(readNotifications(actor.id, utcNow(options.clock), id));
      if (id !== null)
        return {
          item: (await tx.query(sql(select + from + ' AND n.id=@id', { ...parameters, id })))[0]!,
        };
      return { marked_count, unread_count: 0 };
    },
  };
}
/** Ninety exact UTC days, including the cutoff. Reads never trigger cleanup. */
export async function retainNotifications(
  database: Database,
  clock: () => Date = () => new Date(),
) {
  const cutoff = new Date(Date.parse(utcNow(clock)) - 90 * 86400000).toISOString();
  return runTransaction(
    database,
    async (tx) => {
      if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length) return;
      await tx.execute(sql('DELETE FROM dbo.notifications WHERE created_at<=@cutoff', { cutoff }));
    },
    { idempotent: true },
  );
}
