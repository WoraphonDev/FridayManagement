# T-013 — First-run setup API/UI: local evidence

2026-10-06 Asia/Bangkok — **IN_PROGRESS**. SQLite implementation and local checks PASS; required SQL2022/Windows/browser matrix/auth integration remain pending.
Declared GPT-6.1 Sol / High / Standard; actual runtime settings NOT_VERIFIED. T-007/T-009 remain IN_PROGRESS, T-012 DONE; approved SRS5.2/16 permits local continuation without closing dependencies.

## Implementation

- GET /api/meta returns only setupRequired/version. Startup opens existing explicitly migrated DB and verifies ledger/source/checksums without DDL. Missing local DB preserves shell-only startup; existing incomplete schema fails before listen. Empty-user DB creates a random256-bit token, announced only after successful listen to the operator console, separate from HTTP/DB/application JSON logs. Restart replaces the token; any existing user, including inactive, disables setup and token announcement.
- POST /api/setup uses locked ingress/schema/same-origin rules, constant-time token-digest comparison, configured DB409, incorrect token403 and success201. It creates organization, active Admin with chosen password, admin_event and user_view_revision in one provider transaction after a no-users claim. Existing organization without accounts updates atomically. No default credentials, session, cookie or idempotency credential/result persistence.
- Shared async scrypt N32768/r8/p1/key64/salt16/maxmem64MiB, random salt and constant-time64-byte verification. Password length12–128 Unicode scalars, no trim. Hash+verify capacity4, waiting capacity0; excess503/DATABASE_BUSY/Retry-After5 without an unbounded queue. T-014 will implement login/dummy verification/session behavior; this shared helper does not close its acceptance.
- Setup attempt buckets persist10/IP/15min independently from business rollback; exact expiry resets, restart preserves attempts, equivalent IPv4-mapped addresses canonicalize, raw IP/credentials are not stored. Uses Express server-resolved IP with configured proxy trust; an untrusted X-Forwarded-For cannot choose the bucket.
- Accessible Thai form validates five fields, masks token/password, clears secret fields before submission and clears/unmounts on completion. Offline/pending prevents writes and a synchronous pending guard blocks duplicate submission. On409/network loss/503, rechecks meta only; never automatically resends credentials or stores them in URL/localStorage/sessionStorage. API client now reads the locked error code and fieldErrors string arrays for field messages.

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| SQLite provider setup | PASS8/8 | Token/restart/meta privacy; actual scrypt/safe Admin DTO/reopen; bad/schema/configured/inactive states; injected audit-failure rollback; concurrent single set; persisted rate/expiry/mapped IP; existing organization update; simulated lost commit acknowledgement |
| Security helpers | PASS4/4 | Random salts and verify/malformed cost, scalar boundaries/no-trim, bounded shared capacity/release, IP canonicalization |
| HTTP integration | PASS2/2 | Locked schemas/origin/error redaction/statuses/no cookie; 10bad attempts and spoofed forwarded IP →429/Retry-After900 |
| Actual startup | PASS2/2 | Token after listen, empty restart rotates, old403/new201, configured restart no token/meta false/live200/ready503/log directory empty; unmigrated DB refused/no DDL |
| Separate processes | PASS1/1 | Two independent SQLite connections/services with valid private startup tokens, IPC barrier;201/409; exactly one organization/Admin/audit/revision, zero sessions/idempotency |
| Frontend | PASS19/19 | Includes3 new setup validation/SSR/public DTO tests |
| Combined npm test | PASS233/233 | config37 + foundation5 + schema13 + helpers25 + API12 + idempotency13 + authorization14 + setup17 + frontend19 + contract61 + planning17 |
| Chromium | PASS7/7 | Two actual setup/API/SQLite cases; real password validation/wrong token/success/secrets cleared/no cookies; offline, keyboard,360px/200% reflow; pending second submit ignored; successful server commit with aborted browser response →meta false/completion/one POST. Historical shell cases rerun,4 use synthetic Self and meta fixtures |
| Typecheck/lint/build | PASS | No lint errors/warnings; no contract authoring changes |
| Locked contract / test plan | PASS |52routes/75schemas unchanged; execution records0; plan checks do not imply full acceptance |
| Fresh source copy | PASS | Offline npmci/typecheck/build/233tests/3migration apply + repeat no-op/explicit synthetic seed/omit-dev runtime install/built HTML/live200/ready503; reports/T-013-fresh-checkout.json |
| Native SQL2022 | NOT_RUN |46SKIP (38prior +8setup); harness is registered, no SQL credentials/test server configured |

Environment: macOS arm64, Node22.23.3/npm10.9.9, Playwright1.63.0/Chromium153.0.8010.12. HTTP uses ephemeral loopback plus isolated browser shell port43173. All DB/users/passwords are isolated synthetic fixtures removed after checks. Startup tests/browser capture operator-token callbacks in memory; no token/password copied into reports/logs. Fault injection is identified separately from actual persisted SQLite effects; the cross-process test bypasses the process startup guard intentionally to stress the DB no-users claim.

Commands: npm run test:setup; npm test; npm run typecheck; npm run lint; npm run build; npm run check:contract; npm run check:test-plan; npm run test:sqlserver; PLAYWRIGHT_BROWSERS_PATH=/private/tmp/friday-playwright-browsers FRIDAY_TEST_PORT=43173 npm run test:ui; FRIDAY_NPM_CACHE=/private/tmp/friday-npm-cache FRIDAY_CHECKOUT_REPORT=reports/T-013-fresh-checkout.json npm run verify:checkout. Post-document contract/plan checks and planning17 tests recorded separately in machine evidence.

## Traceability and remaining work

FR-01/SRS6.1/BR-01 → partial local TC-001/TC-002/AT-01 evidence (wrong403/correct201/reuse409, token rotation, atomic concurrent claim). Form reflow/focus adds partial TC-073 evidence. Shared crypto supplies partial UT-04 groundwork for T-014. No full TC/AT or browser matrix result is inserted into tests/execution-records.json. Full84TC/30AT/20RV/5UAT/4REL, native SQL serializable/key-range/cross-connection race/rollback/rate persistence/identity/constraints/guard/TLS and Windows console/service behavior remain NOT_RUN. SQL harness8 new cases does not constitute nativeSQL PASS. Console redirection/service log handling must be checked on the target environment; tokens are operator console output and must not be archived in service/application logs.

No login/logout/session/auth cookie or complete browser/server permission flow yet; T-014/T-015/T-017 still required. /health/ready remains503 and production startup remains refused. Applied migration files, locked API schemas/version and dependency graph are unchanged. Prior evidence reports retain their historical results.

**DONE6/77 · IN_PROGRESS7 · TODO64 · remaining71.** Next local T-014 password hashing/login/session, **High**; full T-011/T-006/T-008 dependencies remain pending under the approved local profile. No commit/deploy/DNS/server/shared runtime changes.
