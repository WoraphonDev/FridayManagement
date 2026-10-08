# T-019 - Local installer CLI verification

2026-10-06 Asia/Bangkok - **IN_PROGRESS**. Declared GPT-6.1 Sol / High / Standard; actual runtime settings NOT_VERIFIED. Node22.23.3/npm10.9.9/macOS/temporary SQLite. T-016 native/full cleanup acceptance remains pending; local continuation uses the approved profile. Owner requested finishing this task, stopping dev services, then stopping work for a MacBook restart.

## Implemented and executed

- Built CLI recover-admin and force-logout; explicit existing target ID/exact username/local-maintenance confirmation. No default account or new HTTP recovery route. Existing DB/schema required; no migration/data creation by CLI. Stop the app first; same local kernel guard and SQL application lock prevent parallel app/installer, and maintenance state is never stolen. CLI does not change OS permissions or service/startup/DNS settings.
- POSIX private owner/modes for directories/config/DB/WAL/SHM, parent replacement protection, no final symlink/hardlink, real file read/write permissions checked before opening and again before mutation. Windows owner/operator/Admins/System DACL allowlist branch supplied but actual Windows DACL/console evidence NOT_RUN; POSIX modes do not prove Windows acceptance.
- Recovery requires a real TTY, two hidden prompts,12-128 scalar/no-trim password. No password args/env/stdin redirect; duplicate/unknown flags rejected without echo. Backspace/Unicode/raw-mode restoration/cancellation guard handled. Real POSIX PTY success/mismatch/Ctrl-C tested without password/hash output. Node executable needs runtime deps only; Python3 is a dev fixture dependency.
- Recover existing target as active Admin/forced-password, new hash/user version, auth-version revocation of all sessions; new login forced and old session rejected. Force logout preserves password/role/active/resource version. No assignments restored, no history deleted. Hash outside transaction, locked current target/version/auth rechecked; authority/maintenance checks before writes.
- Sessions, account changes, scoped revisions and redacted audit atomic; injected audit failure rolls everything back. Audit actor_id is the existing target FK and is explicitly marked origin=local_cli/operator_kind=installation_operator/authority=machine_file_permissions/audit_actor_reference=target_account; it is not a web-authenticated actor. Future T-040 rendering must keep that distinction.
- Safe success JSON emitted after commit; errors include safe code only, no original exception or password/hash. Shared transaction helper handles uncertain commit as DATABASE_BUSY without automatic credential retry. Installer must verify authoritative login/account/audit before retrying an uncertain action.

## Results

| Check | Result |
|---|---|
| SQLite installer provider scenarios | PASS8/8 |
| actual CLI/filesystem/hidden PTY/public-route checks | PASS7/7 |
| combined npm test with compiled CLI exercised | PASS288/288 (Node267 + frontend21) |
| typecheck/lint/build/contract | PASS;52routes/75schemas unchanged,61 contract tests in combined |
| planning | PASS17 tests in combined; plan validation only |
| native SQL2022 | NOT_RUN:77SKIP, including8 installer cases |
| fresh source / omit-dev CLI runtime | PASS:288 tests, clean build/migrate/runtime, compiled CLI help with runtime dependencies only; reports/T-019-fresh-checkout.json |
| Windows DACL/console/SQL application lock on actual deployment | NOT_RUN |
| browser | NOT_RUN this task: no UI changes; prior batch14 PASS retained |

Initial test harness failures were Python filename shadowing stdlib pty, stderr SQLite warning mixed with JSON stdout, and TypeScript test inference; repaired and15/15 then compiled/regression288/288 rerun. No applied migration or locked API schema changed. See [machine evidence](reports/T-019-installer-results.json); no credential transcript/screenshots attached. README includes Thai operator instructions and Windows command examples without passwords.

Partial TC-081/AT-28/AT-30 and FR-04/39/40/NFR-02/07 evidence only; tests/execution-records.json unchanged. Required native SQL/Windows/actualHTTPS/full release checks remain NOT_RUN. /health/ready503/production refusal retained. No commit/push/merge/deploy/shared Node runtime changes.

Task Register: **DONE6/77, IN_PROGRESS13, TODO58, remaining71**. T-019 local implemented/verified; full sign-off pending. Next T-020 declared High is not started, per owner stop request. Dev service shutdown PASS: Python8777 stopped with SIGTERM; Node3000 was already stopped at verification; Colima default stopped gracefully (exit0/profile Stopped). TCP3000/8777/1433/53/59134 absent after shutdown. Remaining listeners belong to LINE/DBeaver/OpenCode applications and were retained. Startup settings unchanged. Work stopped for owner restart.
