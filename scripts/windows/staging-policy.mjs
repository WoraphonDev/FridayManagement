import { relative, isAbsolute, sep } from 'node:path';
// Call with realpath-resolved paths so symlink aliases cannot hide source containment.
export function isOutsideCheckout(root, path) {
  const rel = relative(root, path);
  return rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel);
}
// Additional restrictions for owner-authorized Windows rehearsal, not a production bypass.
export function validateStaging(file, effective) {
  const relevant = /^(NODE_ENV$|HOST$|PORT$|APP_ORIGIN$|COOKIE_SECURE$|TRUSTED_PROXY$|DB_|DATA_DIR$|LOG_DIR$|SQLITE_|MAX_FILE_|TOTAL_UPLOAD_|SESSION_|POLL_|REMINDER_|TRASH_|NOTIFICATION_|FRIDAY_)/;
  const keys = new Set([...Object.keys(file), ...Object.keys(effective).filter(k => relevant.test(k))]);
  for (const key of keys) if (file[key] !== effective[key]) throw new Error('ENVIRONMENT_OVERRIDE_REJECTED');
  // libpq options/services must not redirect or modify a maintenance connection.
  if ([...Object.keys(file), ...Object.keys(effective)].some(k => /^PG/.test(k) || k === 'NODE_OPTIONS')) throw new Error('ENVIRONMENT_OPTIONS_REJECTED');
  if (file.NODE_ENV !== 'test' || file.HOST !== '127.0.0.1' || file.DB_PROVIDER !== 'postgres' || file.DB_SERVER !== '127.0.0.1' || file.DB_PORT !== '5432' || !/^[a-z][a-z0-9_]*_staging$/.test(file.DB_NAME ?? '') || file.COOKIE_SECURE !== 'true' || !/^https:\/\//.test(file.APP_ORIGIN ?? '') || file.TRUSTED_PROXY !== '127.0.0.1') throw new Error('STAGING_PROFILE_REQUIRED');
}
