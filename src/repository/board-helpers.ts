import type { Transaction } from '../domain/database.js';
import { OperationError } from '../domain/failure.js';
import { requireVersion } from '../domain/lifecycle.js';
import { validUtcTimestamp } from './value-codecs.js';
export const statuses = ['todo', 'doing', 'review', 'done'] as const;
export type Status = (typeof statuses)[number];
export type Column = { project_id: number; status: Status; version: number };
function id(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 2147483647)
    throw new OperationError(422, 'VALIDATION_FAILED');
}
/** All callers acquire column locks in this fixed order before task locks. */
export async function lockColumns(
  tx: Transaction,
  projectId: number,
  requested: readonly Status[],
) {
  id(projectId);
  if (!requested.length || requested.some((s) => !statuses.includes(s)))
    throw new OperationError(422, 'VALIDATION_FAILED');
  const columns: Column[] = [];
  for (const status of statuses.filter((s) => requested.includes(s))) {
    const rows = await tx.query<Column>({
      sqlite:
        'SELECT project_id,status,version FROM board_columns WHERE project_id=$project AND status=$status',
      sqlserver:
        'SELECT project_id,status,version FROM dbo.board_columns WITH (UPDLOCK,HOLDLOCK) WHERE project_id=@project AND status=@status',
      parameters: { project: projectId, status },
    });
    if (!rows[0]) throw new OperationError(404, 'NOT_FOUND');
    columns.push(rows[0]);
  }
  return columns;
}
export async function lockTask(
  tx: Transaction,
  projectId: number,
  taskId: number,
  expectedVersion: number,
) {
  id(projectId);
  id(taskId);
  const rows = await tx.query<{ id: number; version: number }>({
    sqlite:
      'SELECT id,version FROM tasks WHERE id=$task AND project_id=$project AND deleted_at IS NULL',
    sqlserver:
      'SELECT id,version FROM dbo.tasks WITH (UPDLOCK,HOLDLOCK) WHERE id=@task AND project_id=@project AND deleted_at IS NULL',
    parameters: { task: taskId, project: projectId },
  });
  if (!rows[0]) throw new OperationError(404, 'NOT_FOUND');
  requireVersion(rows[0].version, expectedVersion);
  return rows[0];
}
export async function bumpTaskVersion(
  tx: Transaction,
  projectId: number,
  taskId: number,
  expectedVersion: number,
  nowUtc: string,
) {
  id(projectId);
  id(taskId);
  const next = requireVersion(expectedVersion, expectedVersion);
  if (!validUtcTimestamp(nowUtc)) throw new OperationError(422, 'VALIDATION_FAILED');
  const rows = await tx.query<{ version: number }>({
    sqlite:
      'UPDATE tasks SET version=version+1,updated_at=$now WHERE id=$task AND project_id=$project AND version=$expected AND deleted_at IS NULL RETURNING version',
    sqlserver:
      'UPDATE dbo.tasks SET version=version+1,updated_at=@now OUTPUT INSERTED.version WHERE id=@task AND project_id=@project AND version=@expected AND deleted_at IS NULL',
    parameters: { task: taskId, project: projectId, expected: expectedVersion, now: nowUtc },
  });
  if (rows[0]?.version !== next) {
    await lockTask(tx, projectId, taskId, expectedVersion);
    throw new OperationError(503, 'DATABASE_BUSY', 5);
  }
  return next;
}
/** Complete lists only: caller holds these columns and handles status/completion/effects in the same transaction. */
export async function renumberColumn(
  tx: Transaction,
  column: Column,
  expectedVersion: number,
  orderedIds: readonly number[],
) {
  const nextVersion = requireVersion(column.version, expectedVersion);
  orderedIds.forEach(id);
  const current = await tx.query<{ task_id: number; rank: number }>({
    sqlite:
      'SELECT task_id,rank FROM board_positions WHERE project_id=$project AND status=$status ORDER BY rank',
    sqlserver:
      'SELECT task_id,rank FROM dbo.board_positions WITH (UPDLOCK,HOLDLOCK) WHERE project_id=@project AND status=@status ORDER BY rank',
    parameters: { project: column.project_id, status: column.status },
  });
  if (current.some((r) => r.rank <= 0)) throw new OperationError(503, 'DATABASE_BUSY', 5);
  if (
    new Set(orderedIds).size !== orderedIds.length ||
    current.length !== orderedIds.length ||
    current.some((r) => !orderedIds.includes(r.task_id))
  )
    throw new OperationError(422, 'INVALID_ANCHOR');
  // Unique negative task IDs avoid statement-by-statement positive-rank collisions.
  await tx.execute({
    sqlite: 'UPDATE board_positions SET rank=-task_id WHERE project_id=$project AND status=$status',
    sqlserver:
      'UPDATE dbo.board_positions SET rank=-task_id WHERE project_id=@project AND status=@status',
    parameters: { project: column.project_id, status: column.status },
  });
  for (let i = 0; i < orderedIds.length; i++)
    await tx.execute({
      sqlite:
        'UPDATE board_positions SET rank=$rank WHERE task_id=$task AND project_id=$project AND status=$status',
      sqlserver:
        'UPDATE dbo.board_positions SET rank=@rank WHERE task_id=@task AND project_id=@project AND status=@status',
      parameters: {
        rank: i + 1,
        task: orderedIds[i]!,
        project: column.project_id,
        status: column.status,
      },
    });
  const updated = await tx.query<{ version: number }>({
    sqlite:
      'UPDATE board_columns SET version=version+1 WHERE project_id=$project AND status=$status AND version=$expected RETURNING version',
    sqlserver:
      'UPDATE dbo.board_columns SET version=version+1 OUTPUT INSERTED.version WHERE project_id=@project AND status=@status AND version=@expected',
    parameters: { project: column.project_id, status: column.status, expected: expectedVersion },
  });
  if (updated[0]?.version !== nextVersion) {
    const [current] = await lockColumns(tx, column.project_id, [column.status]);
    throw new OperationError(409, 'VERSION_CONFLICT', undefined, current!.version);
  }
  return nextVersion;
}
