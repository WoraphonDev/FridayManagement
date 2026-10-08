import { parseConfiguration } from '../config/config.js';
import { loadConfiguration } from '../config/load.js';
import { acquireLocalInstance } from '../config/instance.js';
import { acquireSqlInstance } from '../config/sql-instance.js';
import { openDatabase } from '../repository/open.js';
import { verifyAppliedSchema } from '../repository/migrate.js';
import {
  installerAction,
  validateInstallerTarget,
  type InstallerCommand,
} from '../services/installer.js';
import { checkLocalAuthority, InstallerFault } from './authority.js';
import { hiddenPassword } from './terminal.js';
const help =
  'Usage: admin <recover-admin|force-logout> --user-id <id> --confirm-user <exact-username> --confirm-local-maintenance\nStop the application first. Recovery password is entered twice using a hidden terminal prompt.';
export function parseInstallerArguments(args: readonly string[]): InstallerCommand {
  if (args.length !== 6 || !['recover-admin', 'force-logout'].includes(args[0]!))
    throw new InstallerFault('INVALID_ARGUMENTS');
  const flags = new Map<string, string>();
  let confirmed = false;
  for (let i = 1; i < args.length; i++) {
    const key = args[i]!;
    if (key === '--confirm-local-maintenance') {
      if (confirmed) throw new InstallerFault('INVALID_ARGUMENTS');
      confirmed = true;
    } else if (key === '--user-id' || key === '--confirm-user') {
      if (flags.has(key) || !args[i + 1]) throw new InstallerFault('INVALID_ARGUMENTS');
      flags.set(key, args[++i]!);
    } else throw new InstallerFault('INVALID_ARGUMENTS');
  }
  const raw = flags.get('--user-id') ?? '',
    confirmUser = flags.get('--confirm-user') ?? '';
  if (
    !confirmed ||
    !/^[1-9][0-9]{0,9}$/.test(raw) ||
    Number(raw) > 2147483647 ||
    !/^[A-Za-z0-9._-]{1,60}$/.test(confirmUser)
  )
    throw new InstallerFault('INVALID_ARGUMENTS');
  return { action: args[0] as InstallerCommand['action'], userId: Number(raw), confirmUser };
}
export async function runInstaller(args: readonly string[], env: NodeJS.ProcessEnv = process.env) {
  if (args.length === 1 && args[0] === '--help') {
    console.log(help);
    return;
  }
  if (process.versions.node !== '22.23.3') throw new InstallerFault('NODE_22_REQUIRED');
  const command = parseInstallerArguments(args),
    config = parseConfiguration(env);
  const environmentFiles = process.execArgv.flatMap((arg, i, list) =>
    arg.startsWith('--env-file=') ? [arg.slice(11)] : arg === '--env-file' ? [list[i + 1]!] : [],
  );
  await checkLocalAuthority(config, environmentFiles);
  const ready = await loadConfiguration(env);
  await checkLocalAuthority(ready, environmentFiles);
  const release = await acquireLocalInstance(ready);
  let releaseSql: (() => Promise<void>) | undefined,
    database: Awaited<ReturnType<typeof openDatabase>> | undefined;
  const controller = new AbortController();
  try {
    if (ready.database.provider === 'sqlserver')
      releaseSql = await acquireSqlInstance(ready.database, () => controller.abort());
    database = await openDatabase(ready.database.provider, { env });
    await verifyAppliedSchema(database);
    await validateInstallerTarget(database, command);
    let password: string | undefined;
    try {
      if (command.action === 'recover-admin') {
        password = await hiddenPassword(
          'New temporary password (6–128 characters): ',
          process.stdin,
          process.stdout,
          controller.signal,
        );
        const confirm = await hiddenPassword(
          'Confirm temporary password: ',
          process.stdin,
          process.stdout,
          controller.signal,
        );
        if (password !== confirm) throw new InstallerFault('PASSWORD_CONFIRMATION_MISMATCH');
      }
      await checkLocalAuthority(ready, environmentFiles);
      const result = await installerAction(database, command, {
        ...(password !== undefined ? { password } : {}),
        assertAuthority: () => {
          if (controller.signal.aborted) throw new InstallerFault('INSTANCE_GUARD_LOST');
        },
      });
      console.log(JSON.stringify(result));
    } finally {
      password = undefined;
    }
  } finally {
    try {
      await database?.close();
    } finally {
      try {
        await releaseSql?.();
      } finally {
        await release();
      }
    }
  }
}
