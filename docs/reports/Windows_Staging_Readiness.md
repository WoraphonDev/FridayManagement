# Windows-native staging readiness

## Verdict

**SOURCE IMPLEMENTED / LOCAL VALIDATION PASS; NATIVE WINDOWS ACCEPTANCE NOT_RUN.**
Owner-authorized isolated PostgreSQL17 staging only: `NODE_ENV=test`, loopback app/DB,
HTTPS/Secure cookies. Production startup guard is unchanged. Linux/Docker remains the
production target; SQL Server stays retired. No deployment, server access, DNS/firewall
change, service/task installation, push or merge was performed.

Branch: `feat/windows-native-staging`; base:
`4a0b76bfbc0870be9d19a4fba09d6916eb26ed00`. Work is in the isolated
`FridayManagement-windows-staging` worktree. The owner's dirty Task Register in the
original `FridayManagement` checkout was not edited. Task status is unchanged:
**DONE9 / total96 / remaining87** (IN_PROGRESS84, IN_REVIEW1, TODO2).
Declared work effort: High; actual runtime effort setting not independently verified.

The [operator runbook](../operations/Windows_Staging_Runbook.md) is the operational
entry point. This report is **not production readiness or a native acceptance claim**.
Remaining dependency findings also prevent a clean security sign-off.

## Delivered source

- `scripts/windows/Test-FridayStaging.ps1`, `preflight.mjs`, `staging-policy.mjs`:
  explicit dedicated runtime and PG17 tools, external private config/data/log paths,
  built artifact presence, existing DACL/ownership authority check, no inherited app
  configuration override, test/HTTPS/loopback/PostgreSQL-only policy, explicit
  `*_staging` DB name and pinned PG tools PATH. Errors are generic and do not print
  config values/secrets. Preflight is offline, not a connection/HTTPS/service test.
- `Start-Friday.ps1` remains a foreground launcher. `staging-entry.mjs` is the direct
  WinSW Node child so SCM Ctrl+C can reach the existing SIGINT shutdown handler.
  Neither disables the production guard or runs migrations on startup.
- `Backup-Friday.ps1`: exact non-wildcard service name, affirmative stop confirmation,
  initially Running service, wait-for-stop, new unique snapshot, verify, then restart.
  Backup/verify failure leaves the service stopped; PATH is restored in finally.
- `Restore-Friday.ps1`: affirmative isolated-restore confirmation and already stopped
  service; exact `restore-postgres <target> --confirm-local-maintenance` CLI. Never
  starts a service or switches the runtime config. Existing operations code enforces
  empty DB/data target, ledger/manifest/attachment checks and session/cache invalidation.
- `deploy/windows/`: isolated secret-free env example, loopback internal-CA Caddyfile,
  two WinSW2.12.0 XML profiles, disabled daily Task Scheduler XML, PG17 one-time
  bootstrap and repeatable post-migration/restore grants SQL.
- Runtime DB role has row CRUD/sequence access, not DDL or ledger writes. Backup role
  has SELECT plus maintenance-row DML only. Schema owner has no superuser/CREATEDB/
  CREATEROLE privileges. PUBLIC access is revoked. No broad future DML grants;
  operator must explicitly reapply grants after migration/restore.
- Runbook includes explicit account/SCM setup (Node alone is not a Windows service),
  parent/child DACL review, private CA trust, first setup without console transcript,
  scheduled backup import/enable/readback, manual retention/off-disk copy, exact
  empty-target restore, failure recovery, separate restored runtime and rollback.
- ADR-0001 amendment authorizes Windows **staging**, not production. README gives
  current scope and labels older SQL/Windows acceptance snapshots as history. Task
  Register receives source evidence only, no task closure. `AGENTS.md` was not edited:
  the protected-file tool denied that optional alignment; authorization is recorded
  in the owner-requested ADR amendment instead.
- `.github/workflows/windows-staging.yml` adds isolated Windows Node/build/policy,
  PowerShell parser, XML-safety and mocked SCM tests. It never installs a service,
  deploys or accesses real credentials. **Actual remote CI run NOT_RUN** (no push).

## Typecheck fixes and test discipline

Preserved the interrupted agent's four NodeNext `.js` browser imports and replaced the
fixture's widening `as Record<string,string>` cast with `satisfies Record<string,string>`.
This preserves required APP_ORIGIN typing instead of weakening strict checks, adding
non-null assertions or excluding tests. `typecheck` is green for server/frontend/tools.

New regression behavior was observed RED before implementation:

1. Non-staging DB names, inherited session/file/poll/SQLite config overrides and ambient
   libpq options were accepted; tests failed, then policy was tightened and passed.
2. Backup restarted an intentionally stopped service and accepted bracket wildcards;
   mocked SCM tests failed, then exact-name/Running guards passed.
3. Isolated restore wrapper was absent; the CLI-behavior test failed, then passed with
   the new wrapper and no automatic restart/cut-over.
4. Dot-prefixed source children could masquerade as outside paths; a failing assertion
   preceded the separator-aware containment helper and its use in realpath preflight.

Full Chromium QA found a pre-existing date-dependent Work Calendar fixture: next-month
calendar grids legitimately show late previous-month dates, making an expected count1
become2. The failing case was reproduced, then synthetic due dates were anchored to
current-month days10–13. Exact UI count/date assertions remain; product calendar logic
was not changed. Final full Chromium shards both passed.

The disposable PG fixture also exposed the official image's temporary initialization
server readiness race. Waiting for TCP127.0.0.1 rather than the temporary Unix socket
fixed it; the real PG17 rehearsal then passed. No fabricated native results were used.

## Executed verification

Environment: macOS host, dedicated Node22.23.3/npm10.9.9. Official portable
PowerShell7.6.8 macOS ARM64 was downloaded **to private agent scratch only**, verified
against the release SHA256 manifest and executed. No machine-global runtime or server
software was installed. Existing local Docker images were used with `--pull=never`.

| Check | Actual result |
|---|---|
| `npm ci --ignore-scripts` | PASS, lockfile install; `npm ls postcss tedious` PASS |
| `npm run typecheck` | PASS; repeated after final browser fixture change |
| `npm run build` | PASS, Vite8.3.5 |
| `npm run lint` | PASS; repeated after final browser fixture change; expanded to include `scripts/windows/*.mjs` and `tests/windows-staging/*.mjs` |
| `npm test` | **541 PASS, 1 SKIP, 0 FAIL**: Node TAP491PASS/1SKIP out of492; frontend50PASS across13files. The skip is opt-in Docker staging rehearsal, exercised separately below |
| `RUN_WINDOWS_STAGING_PG_TESTS=1 ... npm run test:windows-staging` | **10/10 PASS**, including real disposable PG17 bootstrap, roles/grants, runtime denied DDL/ledger writes, backup denied business writes, runtime Unicode data insert, real offline preflight/tool versions, custom-format backup/verify and owner restore into a separate empty DB, restored runtime Unicode read/maintenance clear, and repeated-restore rejection |
| `npm run test:postgres` with isolated ephemeral PG17, `RUN_POSTGRES_TESTS=1`, `FRIDAY_FIXTURE_PROVIDER=postgres` | **199/199 PASS**, 0SKIP; includes actual HTTP fault cases. Disposable container removed afterward |
| Chromium full suite, `--shard=1/2` and `--shard=2/2`, independent ports/output | **93/93 PASS** (54+39). Earlier single long invocation hit the tool's420s limit and exposed the calendar fixture issue; final complete shards supersede that partial attempt |
| PowerShell parser `tests/windows-staging/parse.ps1` | **6/6 PS files** parse; **3/3 XML** safety checks PASS (2wrapper profiles + disabled task) |
| `tooling.tests.ps1 -TemporaryRoot <private-scratch>` | **6/6 PASS**: stopped service, wildcard rejection, backup/verify order and spaced arguments, backup failure, verify failure, exact isolated restore/no restart. SCM is mocked, not native |
| Caddy2.10.2 `adapt --validate`, Docker `--network none` | PASS; configured listen127.0.0.1:443, admin disabled, redirects disabled, internal CA install_trust=false. Only redundant explicit forwarding-header and formatting warnings; not TLS/browser evidence |
| `npm run check:contract` | PASS,89routes/120schemas; no contract changes |
| `npm run check:test-plan` | PASS inventory/evidence validation; production/final gates still NOT_RUN |
| `npm run licenses` | PASS; regenerated `dependencies/LICENSES.md` and `license-inventory.json` for the final dependency tree |
| `git diff --check` | PASS |

The PG staging integration uses **real PG17 binaries inside a disposable Docker
container**, bridged through POSIX argument-preserving tool wrappers with space-bearing
paths. It does not claim Windows executable/process/quoting evidence. Its snapshot has
synthetic organization data and zero attachments: actual Windows restore of a known
uploaded file remains a native gate. Existing PG provider suite covers business/file
behavior independently. No production/staging user database was used.

Local raw verification logs remain in the Friday profile's private
`cache/scratch/friday-*.log` (full suite, PG suite, staging, browser shards, build,
typecheck/lint, Caddy and licenses). They are not committed. UI regression screenshot/
trace rewrites generated during testing were restored to avoid unrelated binary churn.

## Dependency security triage

Applied compatible changes and verified a clean install plus typecheck/build/lint/full
unit/provider/browser checks:

- Vite8.3.2 → **8.3.5**, preserving the interrupted agent's patch update and associated
  compatible Rolldown patch updates.
- Tedious20.3.3 → **20.3.8** (also deduped for mssql/types), addressing the vulnerable
  sprintf-js dependency chain without changing the retired SQL Server API surface.
- Scoped `@vibe/style` PostCSS override → **8.5.31**, same PostCSS major; removes its
  vulnerable exact8.4.31 copy. Clean `npm ci` and `npm ls` confirm override resolution;
  merely editing overrides/installing on an old node_modules tree had left a stale
  nested copy, so the obsolete lock entry was removed and a clean install was verified.
- Other resolved compatible patches are recorded in package-lock and regenerated
  license inventory; no forced @vibe major downgrade or broad untested major override.

Actual `npm audit` and `npm audit --omit=dev`: **58 findings:53moderate,5high,0critical**.
The resumed-work baseline was61 (55moderate/6high), after the prior Vite change; prior
agent context recorded main baseline62 (55moderate/7high). Findings are dependency
chain counts, not58 independent root vulnerabilities.

Remaining advisory roots:

| Root | Finding / decision |
|---|---|
| `braces`3.0.3 | GHSA-vfj7-8cjw-p6xm, deep-pattern stack-exhaustion DoS. Registry latest queried3.0.3, advisory has no patched published release. Retained; do not pretend `npm audit fix` resolves it |
| `postcss-selector-parser`6.1.5 | GHSA-rj75-hqrm-r3gf, selector parsing CPU exhaustion; patched7.1.6+. Existing stylelint14/selector-specificity dependencies request6.x. A7.x override is major, so deferred pending explicit compatibility work |

The chains come through `@vibe/style`/stylelint and are present even in omit-dev install.
The app does not expose a stylelint/glob/CSS-upload execution endpoint, but this does
**not** establish non-exploitability or justify production approval. Keep staging
isolated with synthetic data, trusted source/config/backups and no public exposure;
revisit upstream fixes or remove the tooling dependency chain in a separately tested
change. Do not run `npm audit fix --force` (it proposes a breaking @vibe downgrade).

## Native Windows gates — all NOT_RUN

Record operator/date/machine/build and redacted evidence for each before calling the
machine ready. Current checks validate source, not these platform effects:

- [ ] PG17 Windows installer/service, SCRAM/loopback pg_hba and native psql bootstrap/
      migrate/grants as separate owner/app/backup identities, including denied DDL.
- [ ] Native NTFS owner/DACLs **and ancestors**, no reparse/hardlinks, app unable to read
      owner/backup secrets; actual Windows PowerShell5.1 DACL implementation.
- [ ] Native node/PG17 executable paths with spaces, child environment/password handling,
      and Start/Backup/Restore scripts under the actual operator/service identities.
- [ ] WinSW SCM install/readback of non-admin Log On accounts; no LocalSystem app;
      graceful stop/restart, no orphan/duplicate Node, persistence and crash behavior.
- [ ] Native Caddy internal-CA creation and explicit client trust; successful HTTPS,
      Secure/HttpOnly/SameSite cookies, forwarded-header spoof rejection, unknown CA
      rejection; no access log or setup-token/secret leakage.
- [ ] Import/readback/enable of the reviewed daily task, deliberate SYSTEM approval or
      reviewed alternate account; actual scheduled execution, snapshot verification,
      stop/start ordering and failure monitoring. No task was installed by this work.
- [ ] Off-disk snapshot copy and empty-target native PG restore with real synthetic
      users/tasks/uploaded bytes; session rejection, login/permissions, attachment hash,
      restart, separate-config rollback and measured RPO/RTO. No real data required.
- [ ] Human UAT, full browser/device matrix, Windows CI execution and Linux production
      server/release gates. No task status or release gate is closed by this report.

Independent read-only source review found no actionable source blocker. The parent
also reran typecheck, lint, build, staging policy tests (9 PASS/1 opt-in SKIP) and
`git diff --check` successfully. These checks do not replace native Windows gates.
The reviewed source is being recorded in a local commit; no push/merge or deployment
was performed. The remaining dependency findings are not security-approved.
