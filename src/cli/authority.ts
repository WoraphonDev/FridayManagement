import { access, lstat, open, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import type { AppConfig } from '../config/config.js';
export class InstallerFault extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
const denied = () => new InstallerFault('LOCAL_PERMISSIONS_REQUIRED');
/** Reject foreign/public POSIX ownership/modes or Windows DACL allow entries outside installer/service owner/Admins/System. */
export async function checkLocalAuthority(
  config: AppConfig,
  environmentFiles: readonly string[] = [],
) {
  const paths = [
    { path: config.dataDirectory, directory: true },
    { path: config.logDirectory, directory: true },
    ...environmentFiles.map((path) => ({ path: resolve(path), directory: false })),
    ...(config.database.provider === 'sqlite'
      ? [{ path: config.database.path, directory: false }]
      : []),
  ];
  for (const item of paths) {
    const info = await lstat(item.path);
    if (
      info.isSymbolicLink() ||
      (info.nlink > 1 && !item.directory) ||
      (item.directory ? !info.isDirectory() : !info.isFile())
    )
      throw denied();
    if (process.platform !== 'win32') {
      const uid = process.geteuid?.();
      if (uid === undefined || (uid !== 0 && info.uid !== uid) || (info.mode & 0o077) !== 0)
        throw denied();
    }
    await access(
      item.path,
      constants.R_OK | constants.W_OK | (item.directory ? constants.X_OK : 0),
    );
  }
  if (process.platform !== 'win32') {
    const uid = process.geteuid?.();
    if (uid === undefined) throw denied();
    const trusted = new Set([0, uid]);
    for (const path of [config.dataDirectory, config.logDirectory])
      trusted.add((await lstat(path)).uid);
    // A private child is unsafe when another principal can replace its parent; root-owned sticky /tmp is safe.
    for (const item of paths) {
      let parent = dirname(resolve(item.path));
      for (;;) {
        const info = await stat(parent);
        if (
          !info.isDirectory() ||
          !trusted.has(info.uid) ||
          ((info.mode & 0o022) !== 0 && !(info.uid === 0 && (info.mode & 0o1000) !== 0))
        )
          throw denied();
        const next = dirname(parent);
        if (next === parent) break;
        parent = next;
      }
    }
  }
  if (config.database.provider === 'sqlite') {
    // Protect nested database directories and sidecars; no database/file creation during authorization.
    let parent = dirname(config.database.path);
    const root = resolve(config.dataDirectory);
    while (parent !== root) {
      if (!parent.startsWith(root + '/') && !parent.startsWith(root + '\\')) throw denied();
      const info = await lstat(parent);
      if (
        !info.isDirectory() ||
        info.isSymbolicLink() ||
        (process.platform !== 'win32' &&
          ((info.mode & 0o077) !== 0 ||
            (process.geteuid?.() !== 0 && info.uid !== process.geteuid?.())))
      )
        throw denied();
      paths.push({ path: parent, directory: true });
      parent = dirname(parent);
    }
    for (const suffix of ['-wal', '-shm']) {
      const path = config.database.path + suffix;
      try {
        const info = await lstat(path);
        if (
          !info.isFile() ||
          info.isSymbolicLink() ||
          info.nlink !== 1 ||
          (process.platform !== 'win32' &&
            ((info.mode & 0o077) !== 0 ||
              (process.geteuid?.() !== 0 && info.uid !== process.geteuid?.())))
        )
          throw denied();
        paths.push({ path, directory: false });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
    }
  }
  if (process.platform === 'win32') {
    const script = `$ErrorActionPreference='Stop'; try { $identity=[Security.Principal.WindowsIdentity]::GetCurrent(); $sid=$identity.User.Value; $principal=[Security.Principal.WindowsPrincipal]::new($identity); foreach($path in (ConvertFrom-Json $env:FRIDAY_ACL_PATHS)) { $acl=Get-Acl -LiteralPath $path; $owner=([Security.Principal.NTAccount]::new($acl.Owner)).Translate([Security.Principal.SecurityIdentifier]).Value; if($sid -ne $owner -and $sid -ne 'S-1-5-18' -and -not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { exit 1 }; foreach($rule in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])) { if($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin @($sid,$owner,'S-1-5-18','S-1-5-32-544')) { exit 1 } } }; [Console]::Write('OK'); exit 0 } catch { exit 1 }`;
    await new Promise<void>((res, rej) =>
      execFile(
        'powershell.exe',
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
        {
          timeout: 5000,
          windowsHide: true,
          env: { ...process.env, FRIDAY_ACL_PATHS: JSON.stringify(paths.map((x) => x.path)) },
        },
        (error, stdout) => {
          if (error || stdout !== 'OK') rej(denied());
          else res();
        },
      ),
    );
  }
  if (config.database.provider === 'sqlite') {
    const handle = await open(config.database.path, 'r+');
    await handle.close();
  }
}
