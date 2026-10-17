# T-008 — Transaction/date/lifecycle helpers

วันที่ 6 ตุลาคม 2026 · **IN_PROGRESS**: local implementation/tests PASS; real SQL2022 and feature wiring pending

Declared effort High (GPT-6.1 Sol/Standard); actual runtime settings NOT_VERIFIED. T-003 DONE; T-007 IN_PROGRESS, local schema verified. Local work proceeds under owner-approved SRS §5.2/§16; dependency graph and SQL2022 completion criteria remain unchanged

## Implementation and correction

- Server UTC clock/Bangkok today, inclusive local date → UTC half-open interval, calendar-day arithmetic, leap centuries, preserved monthly anchor/start-date offset and shared 30×24-hour restore/purge comparator
- Version validation/overflow guard, active/forced-password/access/deleted/archive checks with RD-01 trash exceptions; helpers do not grant permissions or replace session/ACL checks
- Canonical board-column lock order, SQL UPDLOCK/HOLDLOCK task locks, conditional expected-version updates and two-phase unique negative ranks → positive 1..N; task/column changes, audit and notifications share one transaction
- SQL adapter distinguishes confirmed rollback from unknown outcome. Only idempotent deadlock1205 with confirmed rollback retries the whole transaction, at most two retries; lock/request timeout and uncertain commit never blindly retry. Helper errors use locked codes/status and Retry-After5; HTTP middleware wiring belongs to T-009
- Found legacy schema/fixture `blocked` status contradicting locked `review`. Added provider-specific `0002_review_status.sql`, preserving applied 0000/0001 hashes/data/children/identity high-water. SQL restores trusted CHECK/FK declarations; actual SQL trust verification still NOT_RUN

SQLite table rebuild defers FK checks within the migration transaction, asserts zero rows in foreign_key_check, then resets obsolete deferred counters before commit. Negative fixture proves invalid references abort and restore the original schema/data/ledger. See [SQLite PRAGMA documentation](https://www.sqlite.org/pragma.html#pragma_defer_foreign_keys). Foreign-key enforcement remains enabled

## Executed evidence

Environment: macOS arm64 · Node22.23.3/npm10.9.9 · SQLite file fixtures outside source, no real users/credentials. SQL environment keys absent; no .env/.env.local/.env.test in checkout. Docker CLI detected but no usable daemon verified; no SQL service/configuration installed or changed

| Check | Result | Scope |
| --- | --- | --- |
| Helpers | PASS25/25 | 10 date/lifecycle; 10 synthetic retry/driver lifecycle; 5 actual SQLite provider cases |
| Combined npm test | PASS174/174 | config37 + foundation5 + schema13 + helpers25 + frontend16 + contract61 + planning17; these are not the 84 full TC cases |
| Typecheck / lint / build | PASS | source/server/frontend/tools/tests |
| SQL2022 harness | NOT_RUN:18 SKIP | foundation1 + guard1 + schema11 + helpers5; synthetic driver evidence is separately identified |
| Contract / test-plan validation | PASS | unchanged 52 API routes/75 schemas; 77-task graph and full test inventories |

Provider cases exercise: canonical locks/two-phase swap/reopen; rollback after audit+notification persistence; two stale-version contenders; duplicate/incomplete/missing/stale orders; cross-column status/task/column versions+effects commit; fresh and populated legacy review upgrade/repeat/reopen/invalid-FK rollback/identity preservation

First checks exposed a populated SQLite rebuild deferred-counter failure; explicit FK assertion resolves it. A notification fixture had an invalid project_id/missing dedupe_key; corrected to actual schema and now requires the injected missing-table error to prove effects were reached before rollback. Retested all affected cases and combined regression PASS

## Traceability / remaining work

UT-02 and helper portions of TC-030/033/034/035/036/037/059/079 have local evidence. Full TC/AT-11/12/13/14/16/17, SQL2022 locks/deadlocks/concurrency/constraints, HTTP integration, auth/permission binding, completion/recurrence feature transactions, supported browser matrix/Windows/UAT remain NOT_RUN. No full PASS added to tests/execution-records.json; browser suite not repeated because UI unchanged

T-008 remains IN_PROGRESS until required provider/feature integration is verified; date checklist verified, remaining checklists partial. T-006/T-007 remain IN_PROGRESS. **DONE6/77 · IN_PROGRESS3 · TODO68 · remaining71**. Next local task T-009 High, while its full dependency T-006 remains pending SQL evidence under the same approved local profile. No commit/deploy/server/DNS/shared runtime changes
