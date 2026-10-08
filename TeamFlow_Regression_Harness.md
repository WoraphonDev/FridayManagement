# T-067–T-069 regression harness

Internal test code only: `tests/regression/fixture.ts` + `provider-suite.ts`. Each case creates a fresh migrated DB or randomized SQL schema, private synthetic attachments, ephemeral loopback HTTP port and per-role cookie jars. Credentials are generated/hash-only persisted during the run, held in memory, never recorded in logs/evidence. No test credentials/clock/reset are public API features. Finally closes server/database and deletes only its own fixture paths/schema. Failure during creation also cleans its own resources. Reset means create a new isolated fixture; no wipe command accepts a live database.

Exact fixtures: A/admin_a active Admin; L1/L2 lead teams1/2; M1/M2 members teams1/2; V active Viewer; Inactive cannot login. P1 owner team1/M1 Editor, P2 owner team2/M2 Editor, Pshared owner team1/M1+M2 Editor/V Viewer, Pprivate owner team1/M1 no membership. Owner Lead and Admin access are implicit. Each project has a task, checklist and real SHA-256 checked TXT attachment; M2 has one deliberately stale private notification to verify consumer reauthorization. Deterministic UTC epoch2026-10-06T00:00Z; Bangkok D0 is2026-10-06. setTime controls all session/business service clocks and rejects invalid dates; random passwords/keys/IDs are intentionally not repeatable. No job/startup clock or OS time changes. Existing dedicated file-type/boundary/concurrency suites remain required; this harness is not a performance/UAT dataset.

```sh
npm run test:regression
# Native SQL2022: owner prepares an isolated DB_NAME ending _test, private config,
# NODE_ENV=test, DB_PROVIDER=sqlserver, RUN_SQLSERVER_TESTS=1 and SQL credentials.
# Explicit env-file loads config; SQL fixture validates product version16.x and _test guard.
node --env-file=/absolute/private/sql-test.env --import tsx --test tests/sqlserver/regression.test.ts
```

SQL factory uses its own randomized schema and rewrites dbo references; cleanup drops only that schema. HTTP configuration records the actual injected provider. SQL tests require an actual SQL2022 instance; without RUN_SQLSERVER_TESTS=1 cases SKIP/NOT_RUN, never PASS from SQLite. Local transport is HTTP loopback with HTTPS Origin and Secure cookie header inspection through explicit cookie jars; this does not prove real TLS/browser-cookie behavior.

Each authenticated write uses real login cookie, Origin, CSRF and generated Idempotency-Key; version fields follow locked contract. Negative cases intentionally omit/spoof these headers. Tokens/passwords are not part of asserted failure messages. Request status alone is insufficient: tests compare task/event/key/attachment rows/bytes, scoped totals, hash-only session storage, cleanup and immutable history. Security scenario returns XSS as JSON plaintext; actual browser escaping needs existing UI and full AT-30 review.

Trace: T067 topology/isolation/clock; T068 partial TC003/006/008/009/010/011/012/021 (AT02–04); T069 partial TC014–019/021/022/056/062/063/066/068–070 (AT05/07/08/29/30). Grouped `npm test` also executes setup/token/two-process last-Admin/login-window/recovery/CSRF tests from earlier features. These tests do not close full AT01–08/29/30, native SQL, all endpoint/archived/concurrency variants, browser revocation≤10s/physical-device/TLS or UAT. Formal execution-records.json stays unchanged until complete required evidence/sign-off. Batch report records actual executed totals and failures.

## T-070–T-074 journeys — 2026-10-07

`tests/regression/journeys-suite.ts` extends both provider wrappers with real HTTP sequences: checklist/completion/leap monthly/reopen/same-key concurrent retry; task trash/restore/cutoff/purge with actual attachment removal/quota;501-task board fallback with full6-page retrieval and Bangkok midnight/null dates; comment retry/audit/recipient/read-all/90day boundary; actual10MiB/+1/empty/fake-PDF multipart and reservations/temp cleanup; owner-team/completed-basis/reopen and RFC4180-parsed121-row CSV including Thai/quotes/newline/formula neutrality. This is a synthetic feature dataset, not the30-user performance seed.

`tests/operations/snapshot.test.ts` adds a clean restored app rehearsal: old real cookie401, fresh Member login, private task404/Admin audit403, authorized real file bytes, task edit and restart persistence/readiness. This covers local SQLite application behavior; native SQL RESTORE/service/roles/RPO-RTO and Windows actual install remain NOT_RUN. Direct snapshot calls occur after the fixture HTTP server stops; live upload/freezerace and CLI guard paths retain separate existing tests/pending variants.

`tests/browser/task-workspace.spec.ts` adds all4views/date/null-date consistency after editing from Kanban and an actual app restart. Full UI batch includes existing drag/keyboard/touch-emulation/filter/conflict/dirty polling/Calendar/Gantt/report/PWA native-cache cases. Browser results must be recorded with exact version/OS; Chromium emulation does not close current+previous vendor matrix/physical touch/OS PWA installation/UAT. Runtime/frontend source is unchanged by this QA extension; compiled assets from the preceding verified build are reused when their source hashes match.
