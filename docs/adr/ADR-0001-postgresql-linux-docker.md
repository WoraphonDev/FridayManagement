# ADR-0001 — PostgreSQL on Linux + Docker replaces SQL Server 2022 on Windows

**Status:** Accepted · **Date:** 2026-10-11 · **Decided by:** owner (chat 2026-10-11)

## Context
The baseline (SRS D-12, RD-01–RD-08) targeted SQL Server 2022 on a Windows Server host. The owner
has no Windows server, so Windows-native acceptance (service, IIS/HTTPS, ACL, Task Scheduler,
SQL backup/restore) can never be produced. Most open tasks were blocked only on that evidence.

## Decision
1. **Database:** PostgreSQL 17 is the production provider (`DB_PROVIDER=postgres`), reusing the
   `DB_*` configuration keys (default port 5432; TLS optional on a private network).
2. **Deployment:** Linux server with Docker Compose — app, PostgreSQL and a reverse proxy for HTTPS.
3. **SQL Server:** retired from acceptance and release scope. Its adapter, migrations and tests stay
   in the repository (not deleted) for reference; they are no longer required evidence.
4. **SQLite** remains the local development provider (unchanged).

## Amendment — owner-authorized Windows-native staging

The owner explicitly requested a Windows-native implementation and authorized editing
this decision for **isolated staging only**. The earlier lack-of-Windows-host context
is historical, not a ban on preparing a staging profile.

- PostgreSQL **17** remains the only staging database for this profile; SQL Server is
  still retired. Linux + Docker remains the production target and existing deploy/
  Linux source is preserved.
- Windows staging must run **`NODE_ENV=test`**, HTTPS/Secure cookies, loopback-only
  application and database, private external config/data/logs and explicit operator
  bootstrap/migration/grants. No change to the production startup guard.
- Free OSS Caddy and **WinSW** provide HTTPS and a real Windows SCM wrapper, with
  explicit operator service-account setup. Node itself is not an SCM service.
  A disabled-by-default Task Scheduler template is supplied for verified daily backup.
- Source delivery does not authorize deployment, public exposure, DNS/firewall changes,
  automatic server downloads/installation, paid services, or use of production data.
- Native Windows SCM/DACL/console/HTTPS/scheduler/restore results must be collected on
  the actual staging machine. Cross-platform tests, Docker PostgreSQL evidence and
  generated CI source cannot close those gates, Linux release acceptance or human UAT.
- Operational details and exact CLI commands are in
  [Windows staging runbook](../operations/Windows_Staging_Runbook.md); evidence and
  unresolved security/native checks in [readiness](../reports/Windows_Staging_Readiness.md).

## Consequences
- New PostgreSQL adapter (`src/repository/postgres/`) derives SQL from each statement's SQLite form
  (single source for 300+ statements); SERIALIZABLE isolation stands in for SQLite's single writer,
  and serialization failures/deadlocks map to `DATABASE_BUSY` exactly like SQL Server deadlocks.
- `migrations/postgres/` mirrors the SQLite schema (ISO text timestamps, same CHECKs via `friday_*`
  functions); byte counters that exceed 32 bits use BIGINT as on SQL Server.
- Backup uses `pg_dump` (custom format) inside the existing snapshot/manifest/checksum flow.
- Windows/SQL Server items in the Task Register are superseded by Linux/Docker/PostgreSQL items;
  history and earlier evidence are kept. UAT still requires real users.
- Requirements/SRS sections naming SQL Server/Windows/IIS are amended by this ADR until rewritten.
