import type { Transaction } from '../domain/database.js';
import { OperationError } from '../domain/failure.js';
import { ApiFault } from '../api/errors.js';
import { operations, requestBody } from '../api/contract.js';
import { authorizeOperation, type AccessOptions, type SessionProof } from './authorization.js';
import type { taskService } from './tasks.js';

type Outcome = 'updated' | 'deleted' | 'conflict' | 'forbidden' | 'not_found' | 'invalid';
type Item = { id: number; version: number };

/**
 * FR-52 / SRS §9.10 batch: every item runs inside its own savepoint, after re-running the exact
 * single-item authorization (PATCH or DELETE /api/tasks/{id}). A failed item rolls back to its
 * savepoint and reports its own outcome, so no item is ever partially applied. Database-level
 * failures (busy, constraint, unknown) abort the whole batch instead of being hidden.
 */
export function taskBatchService(tasks: ReturnType<typeof taskService>, options: AccessOptions) {
  const savepoint = (tx: Transaction, name: string) =>
    tx.execute({ sqlite: `SAVEPOINT ${name}`, sqlserver: `SAVE TRANSACTION ${name}` });
  const rollback = async (tx: Transaction, name: string) => {
    await tx.execute({ sqlite: `ROLLBACK TO ${name}`, sqlserver: `ROLLBACK TRANSACTION ${name}` });
    await release(tx, name);
  };
  const release = (tx: Transaction, name: string) =>
    tx.execute({ sqlite: `RELEASE ${name}`, sqlserver: 'SELECT 1 AS released' });
  const classify = (
    error: unknown,
  ): { outcome: Outcome; code: string; current?: number } | null => {
    const code =
      error instanceof ApiFault
        ? error.code
        : error instanceof OperationError && error.status !== 503
          ? error.code
          : null;
    if (!code) return null;
    const current =
      error instanceof ApiFault ? error.currentVersion : (error as OperationError).currentVersion;
    if (code === 'VERSION_CONFLICT')
      return { outcome: 'conflict', code, ...(current ? { current } : {}) };
    if (code === 'FORBIDDEN') return { outcome: 'forbidden', code };
    if (code === 'NOT_FOUND') return { outcome: 'not_found', code };
    if (
      [
        'MAINTENANCE',
        'DATABASE_BUSY',
        'SERVICE_NOT_READY',
        'INTERNAL_ERROR',
        'UNAUTHENTICATED',
        'INVALID_CSRF',
        'PASSWORD_CHANGE_REQUIRED',
      ].includes(code)
    )
      return null;
    return { outcome: 'invalid', code };
  };
  return {
    async run(tx: Transaction, proof: SessionProof, input: unknown, request: string) {
      const b = requestBody(
        operations.find((o) => o.method === 'POST' && o.path === '/api/tasks/batch')!.operation,
        input,
      ) as { operation: 'patch' | 'delete'; patch?: Record<string, unknown>; items: Item[] };
      if (b.operation === 'patch' ? !b.patch : b.patch !== undefined)
        throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
          patch: ['patch is required for operation=patch and not allowed for delete'],
        });
      const ids = b.items.map((i) => i.id);
      if (new Set(ids).size !== ids.length)
        throw new ApiFault('VALIDATION_FAILED', undefined, undefined, {
          items: ['Each task may appear once'],
        });
      const results = [];
      for (const [index, item] of b.items.entries()) {
        const name = `friday_batch_${index}`;
        const method = b.operation === 'patch' ? 'PATCH' : 'DELETE';
        const body =
          b.operation === 'patch'
            ? { ...b.patch, version: item.version }
            : { version: item.version };
        await savepoint(tx, name);
        try {
          await authorizeOperation(
            tx,
            proof,
            { method, path: '/api/tasks/{id}', params: { id: item.id }, body, phase: 'execute' },
            options,
          );
          const result =
            b.operation === 'patch'
              ? await tasks.patch(tx, proof, item.id, body, request)
              : await tasks.trashMutation(tx, proof, item.id, body, false, request);
          await release(tx, name);
          const { subtasks: _subtasks, ...task } = result.item as { subtasks?: unknown };
          void _subtasks;
          results.push({
            id: item.id,
            outcome: b.operation === 'patch' ? ('updated' as const) : ('deleted' as const),
            code: null,
            current_version: null,
            item: task,
          });
        } catch (error) {
          const failure = classify(error);
          // Unknown/database failures abort the whole batch (the outer transaction rolls back).
          if (!failure) throw error;
          await rollback(tx, name);
          results.push({
            id: item.id,
            outcome: failure.outcome,
            code: failure.code,
            current_version: failure.current ?? null,
            item: null,
          });
        }
      }
      return { results };
    },
  };
}
