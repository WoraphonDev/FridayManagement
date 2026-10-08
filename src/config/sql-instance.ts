import { Connection, Request, TYPES, type ConnectionConfiguration } from 'tedious';
import type { SqlServerConfig } from './config.js';

const resource = 'FridayManagement:application-instance';
export interface GuardConnection {
  closed: boolean;
  on(event: string, listener: () => void): unknown;
  once(event: string, listener: () => void): unknown;
  connect(callback: (error?: Error) => void): void;
  execSql(request: Request): void;
  close(): void;
}
export function assertSqlLockResult(code: unknown): void {
  if (typeof code !== 'number' || !Number.isInteger(code) || code < 0 || code > 1)
    throw new Error('SQL_INSTANCE_GUARD_UNAVAILABLE');
}
/** A dedicated session never enters the query pool or reconnects automatically. Session loss stops the app. */
export async function acquireSqlInstance(
  config: SqlServerConfig,
  onLost: () => void,
  factory: (options: ConnectionConfiguration) => GuardConnection = (options) =>
    new Connection(options),
): Promise<() => Promise<void>> {
  const connection = factory({
    server: config.server,
    authentication: {
      type: 'default',
      options: { userName: config.user, password: config.password },
    },
    options: {
      database: config.name,
      port: config.port,
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      connectTimeout: config.requestTimeoutMs,
      requestTimeout: config.requestTimeoutMs,
    },
  });
  let closing = false,
    acquired = false,
    lost = false,
    acquisitionFailed = false,
    rejectPending: ((error: Error) => void) | undefined;
  const notifyLost = () => {
    if (acquired && !closing && !lost) {
      lost = true;
      onLost();
    }
  };
  const handleLoss = () => {
    if (!acquired) acquisitionFailed = true;
    rejectPending?.(new Error('SQL_INSTANCE_GUARD_UNAVAILABLE'));
    notifyLost();
  };
  connection.on('error', handleLoss);
  connection.on('end', handleLoss);
  try {
    await new Promise<void>((resolve, reject) => {
      rejectPending = reject;
      connection.connect((error) =>
        error ? reject(new Error('SQL_INSTANCE_GUARD_UNAVAILABLE')) : resolve(),
      );
    });
    if (connection.closed || acquisitionFailed) throw new Error('SQL_INSTANCE_GUARD_UNAVAILABLE');
    const code = await new Promise<unknown>((resolve, reject) => {
      rejectPending = reject;
      let result: unknown;
      const request = new Request(
        "DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=@resource, @LockMode='Exclusive', @LockOwner='Session', @LockTimeout=0; SELECT @result AS lock_result;",
        (error) => (error ? reject(new Error('SQL_INSTANCE_GUARD_UNAVAILABLE')) : resolve(result)),
      );
      request.addParameter('resource', TYPES.NVarChar, resource);
      request.on('row', (columns) => {
        result = columns.find(
          (column: { metadata: { colName: string } }) => column.metadata.colName === 'lock_result',
        )?.value;
      });
      connection.execSql(request);
    });
    assertSqlLockResult(code);
    rejectPending = undefined;
    acquired = true;
    if (connection.closed || acquisitionFailed) throw new Error('SQL_INSTANCE_GUARD_UNAVAILABLE');
    return async () => {
      if (closing) return;
      closing = true;
      if (connection.closed) return;
      await new Promise<void>((resolve) => {
        connection.once('end', resolve);
        connection.close();
      });
    };
  } catch {
    closing = true;
    connection.close();
    throw new Error('SQL_INSTANCE_GUARD_UNAVAILABLE');
  }
}
