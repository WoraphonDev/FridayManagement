import type { Database } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import {
  authorizeOperation,
  type SessionProof,
  type AccessOptions,
} from '../services/authorization.js';
import { idempotencyHook } from './idempotency.js';
import type { ApiContext, ApiHooks } from './middleware.js';
import { ApiFault } from './errors.js';
import { parseSchema } from './contract.js';
/** Token parsing/hash lookup is supplied by T-014; no cookie/session fallback identity. */
export function authorizationHooks(
  database: Database,
  resolveSession: (context: ApiContext) => Promise<SessionProof | null>,
  handlers: NonNullable<ApiHooks['handlers']>,
  options: AccessOptions = {},
): Pick<ApiHooks, 'authorize' | 'idempotency' | 'handlers'> {
  const authorize = async (
    tx: Parameters<typeof authorizeOperation>[0],
    context: ApiContext,
    phase: 'preflight' | 'execute',
    cached?: Parameters<typeof authorizeOperation>[2]['cached'],
  ) => {
    const proof = await resolveSession(context);
    if (!proof || proof.userId !== context.principal?.id) throw new ApiFault('UNAUTHENTICATED');
    const request = {
      method: context.method,
      path: context.path,
      params: context.params,
      query: context.query,
      body: context.body,
      phase,
      ...(cached ? { cached } : {}),
    };
    return authorizeOperation(tx, proof, request, {
      ...options,
      ...(context.method !== 'GET' ? { csrf: context.request.get('X-CSRF-Token') ?? '' } : {}),
    });
  };
  const wrapped: NonNullable<ApiHooks['handlers']> = {};
  for (const [operationId, handler] of Object.entries(handlers)) {
    wrapped[operationId] = async (context) => {
      if (!context.operation.security.length || context.transaction) return handler(context);
      return runTransaction(database, async (tx) => {
        await authorize(tx, context, 'execute');
        const reply = await handler({ ...context, transaction: tx });
        const expected = context.operation.responses[String(reply.status)];
        if (reply.status === 204 && expected && reply.body === undefined) return reply;
        if (reply.binary && expected?.content?.['application/octet-stream'] && reply.status === 200)
          return reply;
        if (reply.csv && expected?.content?.['text/csv'] && reply.status === 200) return reply;
        const schema = expected?.content?.['application/json']?.schema;
        if (!schema || reply.status < 200 || reply.status > 299)
          throw new ApiFault('INTERNAL_ERROR');
        try {
          parseSchema(schema, reply.body);
        } catch {
          throw new ApiFault('INTERNAL_ERROR');
        }
        return {
          status: reply.status,
          body: JSON.parse(JSON.stringify(reply.body)),
          ...(reply.afterCommit ? { afterCommit: reply.afterCommit } : {}),
        };
      });
    };
  }
  return {
    handlers: wrapped,
    authorize: async (context) => {
      await runTransaction(database, (tx) => authorize(tx, context, 'preflight'));
      return 'allowed';
    },
    idempotency: idempotencyHook(
      database,
      async (tx, context, cached) => {
        await authorize(tx, context, 'execute', cached);
      },
      options.clock,
    ),
  };
}
