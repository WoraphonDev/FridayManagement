# Windows-native PostgreSQL 17 staging — operator runbook

**Scope:** owner-authorized isolated rehearsal only, `NODE_ENV=test`, PostgreSQL 17,
HTTPS with Secure cookies. Production startup remains blocked. Linux/Docker remains
the production target in ADR-0001. Nothing here authorizes deployment, DNS/firewall
changes, public exposure or production data. All commands below are **explicit
operator actions**, not actions performed by the coding agent.

## 1. Prerequisites and layout

On a dedicated Windows test machine, the operator supplies and verifies free OSS
binaries offline: dedicated Node **22.23.3** + npm **10.9.9**, PostgreSQL **17.x**
(server and `psql.exe`, `pg_dump.exe`, `pg_restore.exe`), Caddy **2.10.2**, and
[WinSW **2.12.0** x64](https://github.com/winsw/winsw/releases/tag/v2.12.0).
WinSW is the SCM wrapper: **do not register node.exe directly with sc.exe**.
Verify publisher/digests against upstream releases on a workstation before copying.
Scripts never download/install software or configure services/tasks/network.
Windows PowerShell 5.1 is used by scheduled backup and the application's DACL checks;
PowerShell 7 is optional for QA. WinSW2's .NET461 binary requires an operator-provisioned
compatible .NET Framework (4.8 recommended); verify this on the target before service
installation. Do not change the machine-wide Node default.

Example paths (adjust **all** templates together, including quoted arguments):

| Path | Purpose / access |
|---|---|
| `C:\FridaySource` | built checkout, migrations, contracts, runtime node_modules; operator/admin writes only, service read/execute |
| `C:\FridayRuntime\node.exe` | dedicated pinned runtime; service read/execute only |
| `C:\Program Files\PostgreSQL\17\bin` | pinned PG17 client tools, no writable PATH entries before it |
| `C:\FridayStage\private\app.env` | runtime credentials only, owned by app service account |
| `C:\FridayStage\private\owner.env`, `backup.env`, `restore.env` | operator-owned; **not readable by app account** |
| `C:\FridayStage\data`, `logs` | app service account owns; private DACL |
| `C:\FridayStage\backups` | operator-owned; private DACL; separate verified off-disk copy |
| `C:\FridayStage\proxy`, `caddy-data`, `caddy-config` | separate proxy account; app cannot read private CA key |
| `C:\FridayStage\services`, `wrapper-logs`, `proxy-wrapper-logs` | wrapper executable/XML and private diagnostic paths |

Create a dedicated **non-admin** app account and a different non-admin proxy
account using Windows account management. Grant Log on as a service through local
security policy, not a password in XML/commands. For app data/log directories and
app.env, set the owner to the app account, remove inherited/public Allow entries,
and allow only that owner, `SYSTEM` and `Administrators`. Restrict their **parents**
against rename/replacement; no junctions, symlinks, hardlinks or shared writable
parents. For owner/backup/restore envs and backups, owner is the elevated installation
operator; allow only that owner, SYSTEM and Administrators. Inspect with
`Get-Acl -LiteralPath <path>` / `icacls <path>`; do not paste ACL repair commands blindly.
The preflight rejects unexpected Allow principals, but does not prove secure ancestor
DACLs on Windows: inspect those explicitly. The elevated operator/SYSTEM can access
the service-owned data; the runtime must not gain access to migration/backup secrets.

The sample uses **loopback-only** app, PostgreSQL and HTTPS, with synthetic data.
For same-machine testing, the operator may explicitly add a local hosts mapping for
`friday.example.test` (and `restore.example.test` for restore checks) to `127.0.0.1`.
No script modifies it. Remote staging requires a separate approved bind/certificate/
network plan; do not simply expose port 3000 or PostgreSQL.

## 2. Prepare source and private profiles

Build on a trusted workstation or the isolated test machine using the dedicated Node
on that shell's PATH, never as a service startup action:

```powershell
Set-Location C:\FridaySource
& 'C:\FridayRuntime\npm.cmd' ci --ignore-scripts
& 'C:\FridayRuntime\npm.cmd' run typecheck
& 'C:\FridayRuntime\npm.cmd' run build
```

Check `$LASTEXITCODE` after **every** external command and stop on nonzero. Retain
`dist`, runtime dependencies, `migrations`, `contracts`, `scripts` and package metadata;
only `dist/frontend` is the static webroot. No source/private/data directory is served.
Never `npm audit fix --force` on the server.

Copy `deploy/windows/staging.env.example` outside the checkout to the private paths.
Set real passwords using a private editor, not command arguments, clipboard transcripts,
chat or checked-in files. `app.env` uses `friday_stage_app`; `owner.env` uses
`friday_stage_owner`; `backup.env` uses `friday_stage_backup`. Otherwise keep their
instance fields identical. `DB_NAME` must match `^[a-z][a-z0-9_]*_staging$`.
Use plain absolute paths in Node env files (no PowerShell interpolation).
Do not set `NODE_OPTIONS`, libpq `PG*` variables, or inherited application settings.
Launch from a fresh controlled shell: environment overrides are rejected rather than
silently winning over `--env-file`. `DB_ENCRYPT=false` is only for loopback PostgreSQL;
HTTPS is still mandatory. Never use these credentials or paths for production.

## 3. PostgreSQL bootstrap, migrations and grants

The operator installs/initializes PostgreSQL 17 explicitly and configures
`listen_addresses='127.0.0.1'`, port 5432 and SCRAM authentication. Restrict pg_hba.conf
host rules to the named roles, staging databases and `127.0.0.1/32`; do not use `trust`
or broad network rules. PostgreSQL runs as its own dedicated service account.
Passwords are entered interactively (not `-v password=...`, not a SQL transcript).

```powershell
$pg = 'C:\Program Files\PostgreSQL\17\bin'
$node = 'C:\FridayRuntime\node.exe'
Set-Location C:\FridaySource
& "$pg\psql.exe" -X -W --host=127.0.0.1 --port=5432 --username=postgres --dbname=postgres -v ON_ERROR_STOP=1 -f deploy/windows/bootstrap.sql
# STOP on nonzero. Bootstrap is intentionally one-time and rejects existing names.
& "$pg\psql.exe" -X -W --host=127.0.0.1 --port=5432 --username=postgres --dbname=postgres
```

In that interactive psql session, use `\password friday_stage_owner`,
`\password friday_stage_app`, `\password friday_stage_backup`, then `\q`. Use a
distinct generated secret for each role. Enter matching secrets in the private env
files. PostgreSQL administrator credentials never go in an app/ops env file.

```powershell
& .\scripts\windows\Test-FridayStaging.ps1 -EnvironmentFile C:\FridayStage\private\owner.env -NodePath $node -PostgresBin $pg
& $node --env-file=C:\FridayStage\private\owner.env scripts/migrate-dist.mjs
# STOP on nonzero; migrations are never run by app/service startup.
& "$pg\psql.exe" -X -W --host=127.0.0.1 --port=5432 --username=postgres --dbname=friday_staging -v ON_ERROR_STOP=1 -f deploy/windows/apply-grants.sql
```

Owner owns the database/schema/objects; owner has **no superuser/CREATEDB/CREATEROLE**.
Runtime gets row CRUD and sequences, **not DDL or migration-ledger writes**. Backup
gets table/sequence SELECT plus maintenance-row INSERT/UPDATE/DELETE only. PUBLIC
gets no DB/schema/function access. No broad future-object DML grants: rerun the
explicit grants file after **every migration and restore**. Verify denied DDL and
backup writes with synthetic data before accepting native staging. Never run runtime
as schema owner/postgres. These Windows SQL scripts do not modify the Linux setup.

## 4. HTTPS, first setup and SCM services

Copy `Caddyfile` to `C:\FridayStage\proxy\Caddyfile`. It binds loopback443, disables
public HTTP redirects/admin API/access logs and **automatic trust installation**,
uses Caddy's internal CA, and overwrites forwarded headers. App trusts only127.0.0.1;
no client-supplied Forwarded header is trusted through this proxy.

```powershell
& C:\FridayTools\caddy.exe adapt --config C:\FridayStage\proxy\Caddyfile --adapter caddyfile --validate
# Run foreground under the dedicated proxy identity for initial CA creation:
& C:\FridayTools\caddy.exe run --config C:\FridayStage\proxy\Caddyfile --adapter caddyfile
```

Set `XDG_DATA_HOME=C:\FridayStage\caddy-data` and
`XDG_CONFIG_HOME=C:\FridayStage\caddy-config` in that dedicated proxy shell first,
matching the wrapper XML. As an explicit operator action, distribute **only**
`C:\FridayStage\caddy-data\caddy\pki\authorities\local\root.crt` to trusted test
clients; inspect its fingerprint out of band before trusting. Never copy the CA private
key. The client operator can use `certutil -user -addstore Root <verified-root.crt>`
for their own Windows test profile; remove that trust after rehearsal. Do not use
`curl -k`/browser certificate bypass as acceptance evidence.

With the proxy running, run preflight/start in an interactive console as the app
account (private directories must already exist):

```powershell
& .\scripts\windows\Test-FridayStaging.ps1 -EnvironmentFile C:\FridayStage\private\app.env -NodePath $node -PostgresBin $pg
& .\scripts\windows\Start-Friday.ps1 -EnvironmentFile C:\FridayStage\private\app.env -NodePath $node -PostgresBin $pg
```

`STAGING_PREFLIGHT_PASS` means **offline only**: Node/build/profile/DACL/PG client
version, not database reachability, HTTPS, service or acceptance. First setup token is
printed **only to the installer console**. Complete setup at
`https://friday.example.test`, log in, and verify `/health/live`200 and `/health/ready`200
after schema/setup readiness (503 before setup is expected). Do not record console
transcripts containing the token. Stop with Ctrl+C before switching to SCM. Service
stdout/stderr capture is disabled specifically to avoid logging a setup token.

Copy two verified WinSW binaries, rename to `FridayStaging.exe` and `FridayCaddy.exe`,
and place matching XML files beside them in the protected services directory. Adjust
all example paths first. In an elevated operator shell, install explicitly:

```powershell
& C:\FridayStage\services\FridayStaging.exe install
& C:\FridayStage\services\FridayCaddy.exe install
```

They are **Manual**, no automatic recovery/reboot. Before first SCM start, use
`services.msc` → Log On to select the dedicated app/proxy accounts, entering passwords
in that secure Windows UI only. WinSW's installation default is LocalSystem; **do not
start under that default**. Ensure owner/DACL checks pass as each real identity. Stop
the foreground proxy, then explicitly `Start-Service FridayCaddy` and
`Start-Service FridayStaging`. WinSW directly owns the Node child; its Ctrl+C stop
requests reach the app's SIGINT handler, with60s timeout. Verify stop/restart and
absence of orphan Node processes on the actual machine; a forced kill is not graceful
shutdown evidence. Do not enable automatic restart to mask failed backups.

Read back SCM identity/status/config with `Get-CimInstance Win32_Service` filtered to
these exact names. Verify HTTPS login, Secure/HttpOnly/SameSite cookie, polling, upload/
download, restart persistence and untrusted certificate rejection. Check application
JSON logs contain no password/token/cookie/connection string. All are native gates,
not implied by source tests. Keep wrapper directories private even with console capture
disabled; WinSW can write its own diagnostics/event-log entries.

## 5. Daily scheduled backup

First run manually from an **elevated installation operator** shell. The backup env
uses the limited DB backup role, never runtime/owner/postgres:

```powershell
& .\scripts\windows\Backup-Friday.ps1 -EnvironmentFile C:\FridayStage\private\backup.env -NodePath $node -PostgresBin $pg -BackupRoot C:\FridayStage\backups -ServiceName FridayStaging -ConfirmStopApplication
```

The exact selected service must initially be Running; wildcard names/false stop
confirmation are rejected. Script runs preflight, stops it, waits, then invokes:

```text
node --env-file=<backup.env> dist/server/operations/main.js backup <new-snapshot-directory> --confirm-local-maintenance
node dist/server/operations/main.js verify <same-directory> --confirm-local-maintenance
```

PG17 tools are prepended to PATH only within the command and paths are separate
arguments (spaces are supported). `pg_dump` uses custom format/no owner/no ACL;
password is passed only in the child environment, not process arguments. Snapshot
contains dump, attachment bytes and manifest SHA256/schema checksums, **not env/logs**.
Service starts again only after verified success. Failure/timeout leaves it stopped;
never auto-clear a freeze or restart a partial backup. A successful command is not an
off-disk copy or restore test. Keep7 daily and4 weekly verified snapshots plus an
encrypted/access-controlled off-disk copy; operator promotes a verified weekly copy
and prunes only after a successful restore rehearsal. No destructive automatic pruning.

`deploy/windows/FridayBackupTask.xml` is an importable daily02:00 **machine-local-time**
task, initially disabled, single instance, no missed-start catch-up, one-hour timeout.
It explicitly opts into SYSTEM for SCM and private-file access; database remains
backup-only. Protect the entire source/tool/config chain from non-admin writes before
allowing SYSTEM to execute it. If SYSTEM is unacceptable, operator must configure a
separate approved account and minimum SCM rights through Windows UI, then validate
its DACL compatibility. Never put a password in XML/CLI. To use the provided template:

```powershell
# Review every path and the SYSTEM principal first; explicit elevated operator action.
Register-ScheduledTask -TaskName FridayStagingBackup -Xml (Get-Content C:\FridaySource\deploy\windows\FridayBackupTask.xml -Raw)
Get-ScheduledTask -TaskName FridayStagingBackup | Select-Object TaskName, State, Principal
# Only AFTER successful manual backup + isolated restore and an approved maintenance window:
Enable-ScheduledTask -TaskName FridayStagingBackup
Start-ScheduledTask -TaskName FridayStagingBackup
Get-ScheduledTaskInfo -TaskName FridayStagingBackup
```

Read back the exact task XML/action/principal/trigger, LastTaskResult0, new snapshot
manifest and service status. Inspect nonzero/missed executions daily; no email/paid
monitoring is added. A one-hour scheduler termination can leave maintenance frozen:
keep service stopped and investigate. Disable task before manual restore/upgrade.

## 6. Exact isolated restore and rollback rehearsal

**Never restore over the live database, use `--clean`, or migrate an empty restore
DB first.** Stop the staging service and disable backup task explicitly. Retain source
snapshot and original DB/data/config untouched. Record snapshot age and elapsed
restore/recovery time; no RPO/RTO claim without measurements.

1. Verify the off-disk copy after copying back to a new private local folder:
   `& $node dist/server/operations/main.js verify 'C:\FridayStage\backups\<snapshot>' --confirm-local-maintenance`.
   Stop on nonzero. Manifest hashes detect corruption, **not malicious dump authenticity**;
   accept only trusted operator-controlled backups.
2. In interactive psql as postgres, connected to postgres, execute
   `CREATE DATABASE friday_restore_staging OWNER friday_stage_owner;`.
   Connect to that exact new DB, execute `REVOKE ALL ON DATABASE friday_restore_staging FROM PUBLIC;`,
   `REVOKE ALL ON SCHEMA public FROM PUBLIC;` and
   `ALTER SCHEMA public OWNER TO friday_stage_owner;`. Confirm **no application tables**
   exist. Do not drop/reset any existing DB if the name is already taken.
3. Create separate empty private `C:\FridayStage\restore-data` and
   `C:\FridayStage\restore-logs`. Prepare operator-owned `restore.env`, using owner
   credentials and the standard HTTPS/test/loopback profile, but set:

   ```dotenv
   DB_NAME=friday_restore_staging
   DATA_DIR=C:\FridayStage\restore-data
   LOG_DIR=C:\FridayStage\restore-logs
   PORT=3001
   APP_ORIGIN=https://restore.example.test
   FRIDAY_RESTORE_SOURCE=C:\FridayStage\backups\<snapshot>
   ```

4. With FridayStaging **Stopped**, run:

   ```powershell
   & .\scripts\windows\Restore-Friday.ps1 -EnvironmentFile C:\FridayStage\private\restore.env -NodePath $node -PostgresBin $pg -ServiceName FridayStaging -TargetDirectory C:\FridayStage\restore-data -ConfirmIsolatedRestore
   ```

   It calls **`restore-postgres <target> --confirm-local-maintenance`**, not
   `restore-local`/`restore-sql`. The env DATA_DIR must exactly match target. Underneath,
   `pg_restore --no-owner --no-privileges --exit-on-error --single-transaction` restores
   into the new empty DB, then ledger/attachment count/bytes/hashes are verified. Live
   sessions and replay cache are cleared and auth versions bumped. Directory/DB must
   be empty; failure after SQL commit can leave a partial target. **Do not retry into
   it**: retain diagnostics, create a new isolated DB/directory and start again.
5. Reapply grants with the exact restored DB:

   ```powershell
   & "$pg\psql.exe" -X -W --host=127.0.0.1 --port=5432 --username=postgres --dbname=friday_restore_staging -v ON_ERROR_STOP=1 -f deploy/windows/apply-grants.sql
   ```

6. Create a **separate** restored runtime env: same restored DB/data, DB_USER/app
   secret, remove `FRIDAY_RESTORE_SOURCE`. For foreground rehearsal, make data/logs/env recursively
   owned by app identity with restricted DACL. Add an explicit operator-reviewed
   `https://restore.example.test` Caddy site forwarding to127.0.0.1:3001, same header/TLS
   settings as primary, validate and restart the proxy intentionally. Run
   `Start-Friday.ps1` with that restored runtime env. No wrapper/config is switched
   automatically. Verify readiness, real Admin/Member login, permissions, known task,
   known attachment bytes, old-session rejection and persistence after restart.
7. Stop the restored foreground process. Record snapshot age/elapsed time and results
   without secrets. Primary wrapper still references the **unchanged original** env.
   To abandon rehearsal, start primary staging explicitly; no DB/data copy-back needed.
   A deliberate cut-over is a separate owner decision: service stopped, fresh verified
   backup, switch reviewed runtime config/ownership together, restart and repeat checks.
   Rollback selects the old config/DB/data together, never mixes upload directories.

For a failed backup freeze, keep the app/task stopped. In an operator-controlled psql
session, inspect `SELECT owner_id,state FROM maintenance_state;` in the exact source
DB. After proving no backup/upgrade process still owns it, recover only that UUID:
`& $node --env-file=C:\FridayStage\private\backup.env dist/server/operations/main.js clear-maintenance <verified-owner-UUID> --confirm-local-maintenance`.
This is **not** backup success; retain partial snapshots for review and create a new
backup. Never manually edit the ledger, skip hashes or delete instance guards.

## 7. Local validation versus native acceptance

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm run lint
npm test
npm run test:windows-staging
# Developer host only, requires a pre-existing postgres:17 Docker image; no image pull:
RUN_WINDOWS_STAGING_PG_TESTS=1 TMPDIR=<private-scratch> npm run test:windows-staging
```

`tests/windows-staging/parse.ps1` parses scripts and XML; `tooling.tests.ps1
-TemporaryRoot <private-scratch>` exercises mocked SCM with spaced paths and failure
branches without installing/changing services. GitHub Windows CI runs syntax/tooling
checks only; actual CI status must be read from a real run, not assumed. Docker PG17
rehearsal is real PostgreSQL evidence, **not Windows SCM/DACL/Task Scheduler/HTTPS
acceptance**. Native operator checklist/results and remaining security findings are in
[readiness report](../reports/Windows_Staging_Readiness.md). No production sign-off,
Linux release gate closure or human UAT is implied.

References: [WinSW XML 2.12.0](https://github.com/winsw/winsw/blob/v2.12.0/doc/xmlConfigFile.md),
[WinSW logging](https://github.com/winsw/winsw/blob/v2.12.0/doc/loggingAndErrorReporting.md),
[Caddy options](https://caddyserver.com/docs/caddyfile/options),
[PG17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html),
[PG17 pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).
