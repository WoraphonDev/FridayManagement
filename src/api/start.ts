import { startReminderScheduler } from '../services/reminders.js';
import { fileService } from '../services/files.js';
import { createServer, type Server } from 'node:http';
import { createApp } from './app.js';
import { loadConfiguration } from '../config/load.js';
import { acquireLocalInstance } from '../config/instance.js';
import { acquireSqlInstance } from '../config/sql-instance.js';
import { ConfigurationError } from '../config/config.js';
import { existsSync } from 'node:fs';
import type { Database } from '../domain/database.js';
import { openDatabase } from '../repository/open.js';
import { verifyAppliedSchema } from '../repository/migrate.js';
import { setupService } from '../services/setup.js';
import { setupHandlers } from './setup.js';
import { sessionHooks } from './sessions.js';
import { readinessProbe } from './health.js';
import { operationalLog } from '../services/operational-log.js';
import { Maintenance } from '../operations/maintenance.js';
import { startRetentionScheduler } from '../services/retention.js';
import { runTransaction } from '../domain/transaction.js';
import { sql } from '../repository/access-scope.js';
import { ApiFault } from './errors.js';

export async function startApplication(
  env: NodeJS.ProcessEnv = process.env,
  options: { announceSetupToken?: (token: string) => void } = {},
): Promise<{ server: Server; stop: () => Promise<void>; maintenance?: Maintenance }> {
  if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('NODE_22_REQUIRED');
  const config = await loadConfiguration(env);
  // Valid production configuration is supported; the unfinished business application still must not run in production.
  if (config.mode === 'production') throw new Error('FOUNDATION_NOT_PRODUCTION_READY');
  const releaseLocal = await acquireLocalInstance(config);
  const logs = operationalLog(config.logDirectory);
  let releaseSql: (() => Promise<void>) | undefined;
  const server = createServer();
  let database: Database | undefined;
  let setup: Awaited<ReturnType<typeof setupService>> | undefined;
  let reminders: Awaited<ReturnType<typeof startReminderScheduler>> | undefined;
  let retention: Awaited<ReturnType<typeof startRetentionScheduler>> | undefined;
  let maintenance: Maintenance | undefined;
  let pendingToken: string | undefined;
  let stopping = false;
  let shutdown: Promise<void> | undefined;
  const stop = () => {
    if (shutdown) return shutdown;
    stopping = true;
    maintenance?.closeAdmission();
    shutdown = (async () => {
      if (server.listening)
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections();
        });
      await reminders?.stop();
      await retention?.stop();
      await maintenance?.drain();
      reminders = undefined;
      pendingToken = undefined;
      setup?.dispose();
      setup = undefined;
      const ownedDatabase = database;
      database = undefined;
      try {
        await ownedDatabase?.close();
      } finally {
        const ownedSqlGuard = releaseSql;
        releaseSql = undefined;
        try {
          await ownedSqlGuard?.();
        } finally {
          await releaseLocal();
        }
      }
    })();
    return shutdown;
  };
  try {
    if (config.database.provider === 'sqlserver')
      releaseSql = await acquireSqlInstance(config.database, () => {
        console.error('SQL_INSTANCE_GUARD_LOST');
        process.exitCode = 1;
        void stop();
      });
    if (stopping) {
      await releaseSql?.();
      releaseSql = undefined;
      throw new Error('SQL_INSTANCE_GUARD_LOST');
    }
    // Explicit migration remains required; preserve shell-only startup when no local DB exists.
    if (config.database.provider === 'sqlserver' || existsSync(config.database.path)) {
      const opened = await openDatabase(config.database.provider, { env });
      if (stopping) {
        await opened.close();
        throw new Error('SQL_INSTANCE_GUARD_LOST');
      }
      database = opened;
      await verifyAppliedSchema(opened);
      if (
        (
          await runTransaction(opened, (tx) =>
            tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1')),
          )
        ).length
      )
        throw new Error('MAINTENANCE_RECOVERY_REQUIRED');
      maintenance = new Maintenance(opened);
      await (
        await fileService(opened, {
          directory: config.dataDirectory,
          maxFileBytes: config.maxFileBytes,
          totalUploadBytes: config.totalUploadBytes,
        })
      ).recover();
      if (stopping) throw new Error('SQL_INSTANCE_GUARD_LOST');
      const preparedSetup = await setupService(opened, {
        announceToken: (token) => {
          pendingToken = token;
        },
      });
      if (stopping) {
        preparedSetup.dispose();
        throw new Error('SQL_INSTANCE_GUARD_LOST');
      }
      setup = preparedSetup;
    }
    const hooks =
      database && setup
        ? await sessionHooks(
            database,
            {
              storage: {
                directory: config.dataDirectory,
                maxFileBytes: config.maxFileBytes,
                totalUploadBytes: config.totalUploadBytes,
                log: logs.error,
              },
              cookieSecure: config.cookieSecure,
              idleMinutes: config.sessionIdleMinutes,
              absoluteMinutes: config.sessionAbsoluteMinutes,
            },
            setupHandlers(setup),
          )
        : {};
    if (database)
      reminders = await startReminderScheduler(database, {
        seconds: config.reminderSeconds,
        log: (event) => logs.write({ event: 'job', code: event.code }),
        admit: () => maintenance!.enter(),
      });
    if (database && maintenance)
      retention = await startRetentionScheduler(
        database,
        {
          directory: config.dataDirectory,
          maxFileBytes: config.maxFileBytes,
          totalUploadBytes: config.totalUploadBytes,
          log: logs.error,
        },
        maintenance,
        {
          idleMinutes: config.sessionIdleMinutes,
          log: () => logs.write({ event: 'job', code: 'RETENTION_JOB_FAILED' }),
        },
      );
    if (stopping) throw new Error('SQL_INSTANCE_GUARD_LOST');
    const probe = readinessProbe(database, [config.dataDirectory, config.logDirectory], async () =>
      Boolean(setup && !(await setup.meta()).setupRequired && !stopping && logs.healthy()),
    );
    server.on(
      'request',
      createApp(
        undefined,
        config,
        {
          ...hooks,
          ...(maintenance
            ? {
                admit: (context) => {
                  if (context.method === 'GET' && ['/api/me', '/api/meta'].includes(context.path))
                    return undefined;
                  const release = maintenance!.enter();
                  if (!release) throw new ApiFault('MAINTENANCE', undefined, 60);
                  return release;
                },
              }
            : {}),
        },
        logs.error,
        {
          ready: probe,
          request: (event) => logs.write({ event: 'request', ...event }),
        },
      ),
    );
    await new Promise<void>((resolve, reject) => {
      const onError = () => reject(new Error('SERVER_LISTEN_FAILED'));
      server.once('error', onError);
      server.listen(config.port, config.host, () => {
        server.off('error', onError);
        if (stopping) {
          server.closeAllConnections();
          server.close(() => reject(new Error('SQL_INSTANCE_GUARD_LOST')));
        } else resolve();
      });
    });
    server.on('error', () => {
      process.exitCode = 1;
      void stop();
    });
    if (pendingToken) {
      // Operator console only, separate from JSON application/error logs and HTTP.
      (
        options.announceSetupToken ??
        ((token) => process.stderr.write(`Friday Management setup token: ${token}\n`))
      )(pendingToken);
      pendingToken = undefined;
    }
    return { server, stop, ...(maintenance ? { maintenance } : {}) };
  } catch (error) {
    await stop();
    throw error;
  }
}
export function safeStartupError(error: unknown): string {
  if (error instanceof ConfigurationError) return error.message;
  if (
    error instanceof Error &&
    [
      'NODE_22_REQUIRED',
      'FOUNDATION_NOT_PRODUCTION_READY',
      'INSTANCE_GUARD_UNAVAILABLE',
      'SQL_INSTANCE_GUARD_UNAVAILABLE',
      'SQL_INSTANCE_GUARD_LOST',
      'SERVER_LISTEN_FAILED',
      'MAINTENANCE_RECOVERY_REQUIRED',
    ].includes(error.message)
  )
    return error.message;
  return 'STARTUP_FAILED';
}
