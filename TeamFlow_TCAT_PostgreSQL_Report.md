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
