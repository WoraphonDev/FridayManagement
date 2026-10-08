import { mkdir, realpath, stat, lstat, open, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, isAbsolute, join, parse } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from './config.js';
import { ConfigurationError } from './config.js';

export function containsPath(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return (
    !rel ||
    (!rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
      rel !== '..' &&
      !isAbsolute(rel))
  );
}
export async function canonicalPath(path: string): Promise<string> {
  const absolute = resolve(path);
  try {
    return await realpath(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    try {
      if ((await lstat(absolute)).isSymbolicLink())
        throw new ConfigurationError(['DATA_DIR', 'LOG_DIR', 'SQLITE_DB_PATH']);
    } catch (checkError) {
      if ((checkError as NodeJS.ErrnoException).code !== 'ENOENT') throw checkError;
    }
    const parent = dirname(absolute);
    if (parent === absolute) throw error;
    return join(await canonicalPath(parent), absolute.slice(parent.length).replace(/^[\\/]/, ''));
  }
}
async function writableDirectory(path: string, key: string) {
  try {
    await mkdir(path, { recursive: true });
    if (!(await stat(path)).isDirectory()) throw Error();
    const probe = join(path, `.friday-probe-${randomUUID()}`);
    const handle = await open(probe, 'wx', 0o600);
    try {
      await handle.writeFile('probe');
    } finally {
      await handle.close();
      await unlink(probe);
    }
  } catch {
    throw new ConfigurationError([key]);
  }
}
export function projectRoot(): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(directory, 'package.json'))) {
    const parent = dirname(directory);
    if (parent === directory) throw new ConfigurationError(['DATA_DIR', 'LOG_DIR']);
    directory = parent;
  }
  return directory;
}
export async function preparePaths(config: AppConfig, source = projectRoot()): Promise<AppConfig> {
  try {
    const root = await canonicalPath(source),
      data = await canonicalPath(config.dataDirectory),
      logs = await canonicalPath(config.logDirectory);
    if (
      containsPath(root, data) ||
      containsPath(data, root) ||
      containsPath(root, logs) ||
      containsPath(logs, root) ||
      data === parse(data).root ||
      logs === parse(logs).root
    )
      throw new ConfigurationError(['DATA_DIR', 'LOG_DIR']);
    if (config.database.provider === 'sqlite') {
      const db = await canonicalPath(config.database.path);
      if (
        containsPath(root, db) ||
        !containsPath(data, db) ||
        db === data ||
        containsPath(join(data, 'uploads'), db) ||
        containsPath(join(data, 'temp'), db) ||
        containsPath(logs, db)
      )
        throw new ConfigurationError(['SQLITE_DB_PATH']);
      try {
        const info = await stat(db);
        if (!info.isFile() || info.nlink > 1) throw new ConfigurationError(['SQLITE_DB_PATH']);
        const handle = await open(db, 'r+');
        await handle.close();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      await writableDirectory(data, 'DATA_DIR');
      await writableDirectory(logs, 'LOG_DIR');
      await writableDirectory(dirname(db), 'SQLITE_DB_PATH');
      // Re-resolve after creation, including symlinks/junctions before exposing canonical paths to adapters.
      if (
        (await realpath(data)) !== data ||
        (await realpath(logs)) !== logs ||
        (await realpath(dirname(db))) !== dirname(db)
      )
        throw new ConfigurationError(['DATA_DIR', 'LOG_DIR', 'SQLITE_DB_PATH']);
      return {
        ...config,
        dataDirectory: data,
        logDirectory: logs,
        database: { provider: 'sqlite', path: db },
      };
    }
    await writableDirectory(data, 'DATA_DIR');
    await writableDirectory(logs, 'LOG_DIR');
    if ((await realpath(data)) !== data || (await realpath(logs)) !== logs)
      throw new ConfigurationError(['DATA_DIR', 'LOG_DIR']);
    return { ...config, dataDirectory: data, logDirectory: logs };
  } catch (error) {
    if (error instanceof ConfigurationError) throw error;
    throw new ConfigurationError(['DATA_DIR', 'LOG_DIR', 'SQLITE_DB_PATH']);
  }
}
