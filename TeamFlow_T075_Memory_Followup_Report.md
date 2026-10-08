# T-075 — Isolated memory investigation (High)

7 ตุลาคม 2026 · Baseline1.1 · **IN_PROGRESS** · actual model/effort **NOT_VERIFIED**

## Cause and change

Previous combined-process10-minute load passed latency/errors, but sampled RSS659MiB/heap432MiB could not attribute retained memory. New diagnostic runs the **compiled API/SQLite in a separate Node22 child**; parent is tsx/fixture/client harness. Fifteen actual sessions,30users/6teams/20projects/10000tasks/20000comments and70/30 reads/writes remain; diagnostic warms30s, measures300s/4500requests and rests30s. No browser/visible update sample in this mode; it is not a replacement for the required10-minute/full SQL/Windows acceptance.

Samples every30s contain rss/heapTotal/heapUsed/external/arrayBuffers for each process. Explicit GC only occurs after warmup, after measured load and after idle; no forced GC during measured requests. Sampling/IPC adds diagnostic overhead. Before/after fixtures use different random passwords/IDs; same synthetic counts/workload/pace. No heap dump/log bodies/credentials exported. All own temp files removed and child stopped at finish.

`contracts/validate.mjs` used `ajv.compile(rewrite(schema))` on each call. The rewrite produced a new schema identity each time; installed Ajv caches compile roots by object identity. Query validation/business checks and transient UUID schemas therefore retained repeated compilations. Fixed with a128-entry content-key LRU cache and release of transient compile roots via Ajv `removeSchema(schemaObject)`; the registered shared contract bundle stays registered. JSON schema/OpenAPI53routes/77schemas and business rules unchanged. This changes validation execution/memory, not API wire version.

Three regression tests cover repeated transient-equivalent UUID schemas sharing compilation while rejecting invalid values, eviction after256distinct schemas with distinct constraints/shared bundle/date/query validation still enforced, and failure diagnostics/input isolation across cached calls. Red/green: before1PASS/1FAIL (duplicate compile identity), after2PASS; initial two cache cases + all contract63/63 PASS; additional error-isolation case included in final grouped suite. Build:contract/check:contract PASS; OpenAPI bytes identical to preceding r2 archive.

## Results

- Initial separated smoke150requests (before fix): MEASURED_DIAGNOSTIC, errors0, p95read150.482ms/write171.223ms. Forced-GC API heap30.58→40.26→40.24MiB; harness72.24→72.52→72.50MiB. This smoke is source of a retained-memory concern, not acceptance PASS.
- Before-fix300s baseline: **MEASURED_DIAGNOSTIC**,4500requests70/30/errors0; p95read155.304ms/write133.126ms. Forced-GC API heap49.91→183.01→178.30MiB; harness73.03→69.12→69.01MiB. Retained API heap after idle is128.39MiB above baseline. Child loaded original validator before source fix; original SHA is retained in immutable r2 archive.
- After-fix identical diagnostic: **MEASURED_DIAGNOSTIC**,4500requests70/30/errors0; p95read119.434ms/write93.422ms. Forced-GC API heap29.75→28.50→28.47MiB; harness72.80→69.14→69.00MiB. API retained post-idle heap is1.28MiB below its baseline; old128.39MiB growth is not observed in this matched diagnostic. Same instrumentation SHA before/after, different validator SHA. Post-idle API heap is about84percent lower than before fix. This supports the specific compile-root retention fix, not proof against every leak or long-running/native-provider issue.
- Grouped checks so far: typecheck/lint0warnings/check:contract/check:test-plan/node syntax/archive-security6/6 PASS; **fresh r3 ZIP PASS_LOCAL_SUBSET**: offline ci/typecheck/build/**461/461 npm tests** (Node423/frontend38), migration0000/0001/0002 then repeat no-op, explicit synthetic fixture, omit-dev install/compiled installerCLI help, built HTML/live200/ready503/meta setupRequired true/me401/generic login401 without cookie. Contract64/64 including all three cache regressions PASS. Build retains>500kB chunk warning in test-profile fresh checkout; local normal build passes. Browser smoke after fix **PASS_SMOKE**,150requests/errors0, p95read154.845ms/write157.253ms, actual visible Viewer update4889.761ms. Report uses --followup suffix to preserve historical full/smoke evidence. This is10s smoke, not10-minute acceptance.

RSS includes native allocation/allocator high-water behaviour and is not expected to return exactly to baseline after GC. Heap/external/arrayBuffer trends and retained post-GC deltas must be compared; do not equate any RSS peak with a leak or infer long-term/native SQL stability from one local run. No universal memory threshold is added to SRS.

Native SQL profile inspection (booleans only): RUN_SQLSERVER_TESTS not enabled, DB_SERVER absent, no `_test` DB_NAME. No native DB connection/write attempted; SQL2022/Windows/fullTC083/084/AT27 remain NOT_RUN. Formal execution records and all30AT/five human UAT signoffs remain unsigned.

## Evidence and status

reports/T-075-memory-smoke-before-fix.json; reports/T-075-memory-before-fix.json / before-fix-raw.json; reports/T-075-performance-memory.json; reports/T-075-memory-comparison.json / memory-followup-results.json; memory-source-archive.json / memory-fresh-archive.json. Raw before/after logs outside ZIP in /private/tmp/friday-T075-memory-*.log; regression red/green logs cache-before/cache-after.

DONE6/77; IN_PROGRESS71; TODO0; remaining71. T075 stays High/IN_PROGRESS. Next native SQL2022/Windows stress **High**; T076 human UAT **Medium** after dependencies. No deployment/runtime change.

## Candidate freeze

New r3 candidate contains the cache fix/instrumentation/tests/docs. Its embedded report records status at freeze time; paired external report adds actual fresh-r3 checks and exact ZIP SHA256 after verification. r2 remains an immutable historical candidate with the pre-fix validator, not the current source recommendation. Required native SQL2022/Windows, full10-minute on updated build, file/lock/poll/restart TC084 stress and human UAT remain pending. No full acceptance is marked PASS.

### External final verification

Delivery: **deliverables/FridayManagement-candidate-20261007-r3.zip**,443source entries,2879966bytes, SHA256 `cc2966480505a00a2ac6a5e25c783eaf05fe0aae3bbb476cfdf7b76472ebcf41`. ZIP unchanged after fresh verification; embedded report is pre-fresh snapshot, this external report adds actual results. Old r2 archive/reports preserved. Only reporting documents change after freeze; runtime/validator/scripts/tests match the tested ZIP inventory.

Specific retained-compilation defect fixed and locally verified; baseline API post-idle178.301MiB vs after28.468MiB (84.03percent lower), retained-delta+128.395MiB vs−1.278MiB. No assertion of universal leak freedom/long-running stability/native SQL performance. Whole-application TC/AT/RV/UAT/formal release reviews remain NOT_RUN.

DONE6/77; IN_PROGRESS71; TODO0; remaining71. Next T075 **High** full10-minute updated-build/concurrent file/export/poll/lock/restart stress and native SQL2022/Windows when isolated profile is available; T076 **Medium** human UAT after dependencies.
