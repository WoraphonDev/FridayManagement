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
