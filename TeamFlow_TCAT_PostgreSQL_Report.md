# TC/AT on PostgreSQL 17 — step 1 (profiles, fixtures, mapping) · 17 October 2026

Owner reaffirmed ADR-0001 and asked for full TC/AT on PostgreSQL, done in steps. This step switches
the test plan to PostgreSQL profiles, makes the HTTP and browser suites run on PostgreSQL, runs
every automated layer there, and maps the results to the 99 test cases. **No execution record was
written:** `tests/execution-records.json` stays empty, so every TC/AT/RV/UAT item is still NOT_RUN.

## What changed

- **Profiles** (`tests/test-policy.mjs`, `scripts/build-test-manifest.mjs`, `scripts/check-test-plan.mjs`):
  `postgres17` (Integration/Performance cases, RV-12–RV-15) and `linux-docker-postgres17`
  (TC-080, RV-18, UAT, REL-03/04) are required. `postgres17` records must name product PostgreSQL
  version 17.x; Linux/Docker records must run on Linux. SQL Server profiles stay listed for history
  and cannot close any item (planning test added).
- **Fixtures**: with `FRIDAY_FIXTURE_PROVIDER=postgres`, `startupFixture` gives each test its own
  `friday_fx_*_test` database copied from a migrated template; `providerFixture` selects PostgreSQL
  for the HTTP suites; `fixtureDatabase` replaces direct SQLite access in tests. SQLite remains the
  default (`npm test` 480 + frontend 50 PASS after the change).
- **Runner**: `scripts/tcat-postgres.mjs` runs provider suites, HTTP suites and the full Chromium
  suite on PostgreSQL, keeps per-file results and drops the disposable databases;
  `scripts/tcat-map.mjs` maps results to TC candidates (task IDs in titles, TC/AT IDs, provider
  domains, spec owners).
- **Deterministic browser waits** (timing races exposed by PostgreSQL latency, also stable on
  SQLite): board refresh vs. stale move (boards T037/038), saved preference load (motion), status
  move acknowledgement and drawer animation (vibe-integration).

## Run `pg17-d823123aea` (clean tree, commit d823123)

PostgreSQL 17.11 (Docker, disposable) · Node 22.23.3 · macOS 24.6.0 · pg 8.23.1 · Playwright 1.63.0
Chromium · source digest `224d86e6…` · results in `reports/tcat-postgres/pg17-d823123aea/`.

| Layer | Passed | Failed |
|---|---|---|
| Provider suites (`tests/postgres`) | 191 | 0 |
| HTTP integration | 57 | 0 |
| Chromium (full suite) | 89 | 1 |

The one failure was `INSTANCE_GUARD_UNAVAILABLE` at startup in reports-notifications T051: the local
instance guard listens on a port derived from the database identity, and that port was momentarily
in use. Rerunning the spec file twice on PostgreSQL passed 18/18. Recorded as an environment flake;
the hash-to-port guard can collide with another local listener and is worth a follow-up.

## Mapping (coverage.md)

explicit 2 · candidate 88 · partial-layer 0 · gap 0 · infrastructure 9 (TC-075–TC-081 operations,
TC-083/084 performance). A *candidate* has passing automated tests on every required layer that
belong to the case's tasks; it is **not** a PASS. The T-004 policy requires each case's steps and
expected results to be checked against what those tests assert, and AT items need an owner sign-off.

## Next steps

1. Review each candidate case against its mapped tests; write PASS records (tester, build, source
   digest, evidence hash) only where every step/expected result is asserted; add tests for missing
   steps.
2. Variants RV-12–RV-15 need PostgreSQL fault harnesses (lock timeout, serialization victim,
   connection loss, unknown commit).
3. Infrastructure cases, RV-18, UAT and REL-03/04 need the real Linux + Docker server (T-096) and
   people; TC-083/084 need the 30-user performance fixture.

## Step 2 — per-case review and execution records (17 October 2026)

Every one of the 99 cases was compared, step by step, with the assertions of its mapped tests
(`tests/tcat-review.json`). Four cases had steps that no test exercised; tests were added and pass on
PostgreSQL and SQLite:

| Case | Added test |
|---|---|
| TC-006 | `tests/browser/tcat-gaps.spec.ts`: UI logout, Back cannot reopen the task, replayed pre-logout cookie 401 |
| TC-012 | `tests/accounts/provider-suite.ts`: concurrent mutual demotion of the last two Admins keeps ≥1 active Admin |
| TC-047 | `tests/browser/tcat-gaps.spec.ts`: date-only End Plan stays on its day in UTC−7 and UTC+14 browsers |
| TC-082 | `tests/postgres/lock-timeout.test.ts`: real row lock past lock_timeout → 503 Retry-After, full rollback, single retry |

**Run `pg17-1baa061b4c`** (clean commit 1baa061, PostgreSQL 17.11, Node 22.23.3, Playwright Chromium):
provider 193, HTTP 57, Chromium 93 — **343/343 passed**.

**Execution records:** `scripts/tcat-record.mjs` wrote **87 TC PASS records** for that build into
`tests/execution-records.json` (profile `postgres17`, or `pure-node22` for UI-only cases); the
T-004 checker validates them (`check:test-plan` evidence PASS).

**Not covered (12 TC, still NOT_RUN):** TC-075–TC-081 operations and TC-083/084 performance (need the
real Linux + Docker server / 30-user fixture), TC-071 (OS-level PWA install), TC-074 (Chrome/Edge/
Firefox/Safari current+previous matrix), TC-098 (owner comparison with the T-079 mock and a
performance trace review).

**Release gate for this build:** 81 of 168 items pending — TC 12, AT 40 (each needs the owner's
explicit sign-off after reviewing its mapped cases), RV 20 (variants not executed as such), UAT 5,
REL 4. No task changes status: acceptance still needs AT sign-off, UAT and the Linux server.

## Step 3 — database fault variants RV-12–RV-15 (17 October 2026)

Real PostgreSQL 17 faults, each on the idempotent comment command (comment + task event +
notification + idempotency key) so partial state and duplicates are visible:

| Variant | Exercised | Result |
|---|---|---|
| RV-12 lock timeout | row lock held past `lock_timeout` (service + HTTP) | 503 `DATABASE_BUSY`, `Retry-After: 5`, bounded wait, no rows; readiness answers; same key commits once |
| RV-13 deadlock victim | real deadlock (row lock vs advisory lock) | victim rolled back, retry commits one outcome; deadlock on every attempt exhausts 3 attempts → 503, no rows |
| RV-14 connection loss | `pg_terminate_backend` after writes, before COMMIT | 503, nothing committed (fresh connection), same-key retry once |
| RV-15 timeout / lost ack | `statement_timeout`; COMMIT succeeds but reply lost (service + HTTP) | timeout → 503 and uncommitted; lost ack → authoritative state shows one commit, replay returns it, different body 409, revoked access 403 |

**Defects found and fixed** (commit 24e1f31):

1. A database connection lost mid-transaction crashed the whole Node process (unhandled `pg`
   client `error` event) — e.g. on PostgreSQL restart or failover. The adapter now handles errors
   on checked-out and idle clients and destroys broken clients.
2. PostgreSQL statement timeout (57014) surfaced as an internal error; it now maps to
   `DATABASE_BUSY` 503 like lock timeout.
3. The local instance-guard port (40000–59999) overlapped OS ephemeral port ranges, so an outbound
   socket could randomly block startup with `INSTANCE_GUARD_UNAVAILABLE` (the earlier "flake"). It
   now lies in 20000–31999 with a unit test.

**Run `pg17-24e1f31cb8`** (clean commit 24e1f31): provider 199, HTTP 57, Chromium 93 — **349/349
passed**; SQLite `npm test` 482 + frontend 50 passed. **Records:** 87 TC + 4 RV PASS for this build;
earlier build records now reference immutable review snapshots in their run folders;
`check:test-plan` evidence PASS (178 records).

**Release gate for this build:** 77 of 168 pending — TC 12, AT 40, RV 16, UAT 5, REL 4.
