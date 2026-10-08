import { OperationError } from './failure.js';
export function requireVersion(actual: number, expected: number): number {
  if (!Number.isInteger(expected) || expected < 1 || expected > 2147483647)
    throw new OperationError(422, 'VALIDATION_FAILED');
  if (!Number.isInteger(actual) || actual < 1 || actual > 2147483647)
    throw new OperationError(503, 'DATABASE_BUSY', 5);
  if (actual !== expected) throw new OperationError(409, 'VERSION_CONFLICT', undefined, actual);
  if (actual === 2147483647) throw new OperationError(503, 'DATABASE_BUSY', 5);
  return actual + 1;
}
export type WriteOperation = 'normal' | 'delete' | 'restore';
/** Call after auth/resource scoping. This helper never grants permission. */
export function requireWritableResource(
  state: {
    userActive: boolean;
    forcedPassword: boolean;
    canRead: boolean;
    canWrite: boolean;
    canManageTrash: boolean;
    exists: boolean;
    deleted: boolean;
    projectArchived: boolean;
    teamArchived: boolean;
  },
  operation: WriteOperation = 'normal',
): void {
  if (!state.userActive) throw new OperationError(401, 'UNAUTHENTICATED');
  if (state.forcedPassword) throw new OperationError(403, 'PASSWORD_CHANGE_REQUIRED');
  if (!state.exists || !state.canRead) throw new OperationError(404, 'NOT_FOUND');
  if (!state.canWrite) throw new OperationError(403, 'FORBIDDEN');
  if (operation === 'restore' ? !state.deleted : state.deleted)
    throw new OperationError(404, 'NOT_FOUND');
  if (operation === 'restore' && !state.canManageTrash) throw new OperationError(404, 'NOT_FOUND');
  if (
    (state.projectArchived || state.teamArchived) &&
    !(operation !== 'normal' && state.canManageTrash)
  )
    throw new OperationError(422, state.teamArchived ? 'TEAM_ARCHIVED' : 'PROJECT_ARCHIVED');
}
