import { readFile, realpath, access } from 'node:fs/promises';
import { parseEnv, promisify } from 'node:util';
import { isAbsolute, resolve, delimiter } from 'node:path';
import { execFile } from 'node:child_process';
import { validateStaging, isOutsideCheckout } from './staging-policy.mjs';
try {
  const [file, bin] = process.argv.slice(2);
  if (!file || !bin || !isAbsolute(file) || !isAbsolute(bin)) throw new Error();
  const root = await realpath('.');
  const outside = async path => {
    if (!isOutsideCheckout(root, await realpath(path))) throw new Error();
  };
  await outside(file);
  const values = parseEnv(await readFile(file, 'utf8'));
  validateStaging(values, process.env);
  const { parseConfiguration } = await import('../../dist/server/config/config.js');
  const { checkLocalAuthority } = await import('../../dist/server/cli/authority.js');
  const config = parseConfiguration(values);
  await outside(config.dataDirectory);
  await outside(config.logDirectory);
  await checkLocalAuthority(config, [file]);
  await access('dist/server/api/main.js');
  await access('dist/frontend/index.html');
  const run = promisify(execFile);
  for (const tool of ['pg_dump', 'pg_restore', 'psql']) {
    const path = resolve(bin, tool + (process.platform === 'win32' ? '.exe' : ''));
    const { stdout } = await run(path, ['--version'], { windowsHide: true, timeout: 10000 });
    if (!/\(PostgreSQL\) 17\./.test(stdout)) throw new Error();
  }
  // Operations uses execFile('pg_dump'/'pg_restore'): resolve to the same pinned directory.
  const path = process.env.PATH ?? process.env.Path ?? '';
  if (resolve(path.split(delimiter)[0] ?? '') !== resolve(bin)) throw new Error();
  console.log('STAGING_PREFLIGHT_PASS (offline checks only; database/HTTPS/service NOT_RUN)');
} catch {
  console.error('STAGING_PREFLIGHT_FAILED: check private config/ACL, build, dedicated runtime and PostgreSQL 17 bin; no secrets logged');
  process.exitCode = 1;
}
