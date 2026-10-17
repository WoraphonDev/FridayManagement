#!/bin/bash
# First-start bootstrap (docker-entrypoint-initdb.d): least-privilege roles for FridayManagement (RV-18).
#   DB_OWNER_USER   owns the schema; used only by `migrate` and `restore`
#   DB_USER         runtime application; row read/write only, cannot change schema
#   DB_BACKUP_USER  `ops backup/verify`; read-only plus the maintenance freeze row
# The superuser (POSTGRES_USER) is used only here and by the operator through `docker compose exec db`.
# Re-running is safe: missing roles are created and passwords re-synced from the environment.
set -euo pipefail
: "${DB_OWNER_USER:?}" "${DB_OWNER_PASSWORD:?}" "${DB_USER:?}" "${DB_PASSWORD:?}" "${DB_BACKUP_USER:?}" "${DB_BACKUP_PASSWORD:?}"
for role in "$DB_OWNER_USER" "$DB_USER" "$DB_BACKUP_USER"; do
  [ "$role" != "${POSTGRES_USER:-postgres}" ] || { echo "Application roles must differ from the superuser" >&2; exit 1; }
done
psql -v ON_ERROR_STOP=1 -X --username "${POSTGRES_USER:-postgres}" --dbname postgres \
  -v owner="$DB_OWNER_USER" -v owner_pw="$DB_OWNER_PASSWORD" \
  -v app="$DB_USER" -v app_pw="$DB_PASSWORD" \
  -v backup="$DB_BACKUP_USER" -v backup_pw="$DB_BACKUP_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION', r)
  FROM unnest(ARRAY[:'owner', :'app', :'backup']) AS r
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) \gexec
SELECT format('ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION PASSWORD %L', r, p)
  FROM (VALUES (:'owner', :'owner_pw'), (:'app', :'app_pw'), (:'backup', :'backup_pw')) AS v(r, p) \gexec
SQL
# Absolute path: the entrypoint may source this file, so $0 is not reliable.
/docker-entrypoint-initdb.d/apply-grants "${POSTGRES_DB:?}"
