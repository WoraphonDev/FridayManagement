import type { Database, Transaction } from '../domain/database.js';
import { executeIdempotent, type Reply } from '../repository/idempotency.js';
import { ApiFault } from './errors.js';
import type { ApiContext, ApiHooks } from './middleware.js';
/** Feature handlers receive the existing transaction; never open a nested transaction or send external effects. */
export function idempotencyHook(
  database: Database,
  authorize: (tx: Transaction, context: ApiContext, cached: Reply | undefined) => Promise<void>,
  clock?: () => Date,
): NonNullable<ApiHooks['idempotency']> {
  return async (context, invoke) => {
    if (!context.principal) throw new ApiFault('UNAUTHENTICATED');
    return executeIdempotent(database, {
      userId: context.principal.id,
      method: context.method,
      path: context.request.originalUrl.split('?')[0]!,
      key: context.request.get('Idempotency-Key') ?? '',
      body: context.body,
      authorize: (tx, state) => authorize(tx, context, state.cached),
      mutate: async (tx, normalizedBody) => {
        const reply = await invoke({ ...context, body: normalizedBody, transaction: tx });
        return { status: reply.status, body: reply.body };
      },
      ...(clock ? { clock } : {}),
    });
  };
}
