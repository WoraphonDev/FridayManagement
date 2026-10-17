# T-075–T-077 — Local performance, unsigned UAT and source candidate

7 ตุลาคม 2026 · Baseline 1.1 · Task1.35 / Requirements1.6 / SRS1.7 / Test1.32
Declared efforts T075 **High**, T076 **Medium**, T077 **High**; actual model/effort **NOT_VERIFIED**.

## Scope and readiness

T075 dependencies and T076/T077 final acceptance are not closed. Source/local work is allowed by the owner-approved temporary SQLite profile. All three tasks stay IN_PROGRESS; **DONE6/77, IN_PROGRESS71, TODO0, remaining71**. No deploy/DNS/server/service installation/shared Node change/commit/push. Formal records remain empty; full84TC/30AT/20RV/5UAT/4REL sign-offs are NOT_RUN, not inferred from local tests or mappings.

## T-075 — isolated load

`scripts/performance.ts` requires `--confirm-isolated-load`, creates its own temporary DB/data paths, synthetic users/random in-memory password/actual attachments, and deletes the fixture after execution. Caller database paths/credentials are not used. Actual counts are asserted:30users/6teams/20projects/10000tasks/20000comments/3attachments. Fifteen real sessions consist of Admin1/Lead6/Editor7/Viewer1; a ten-round cycle sends exactly105reads/45writes. Viewer only reads. Full mode warms30seconds then runs600paced rounds (9000primaryrequests/10minutes); smoke warms2seconds then measures10seconds/150requests.

Read paths cover paginated tasks/detail/notifications/500-task board/reports/me/search. Writes are real comment POSTs and task priority PATCHs with current versions and unique idempotency keys. Primary sample durations include drained JSON responses. No deliberate conflict or file-transfer requests are in the primary70/30 sample; ancillary login/CSV/board/browser polling/observer PATCH are separate. Percentiles use nearest rank; error limit is strictly less than1percent. Two unit cases check thresholds and the exact mix/read-only Viewer policy.

Initial smoke **FAIL**:3 unexpected422s/150requests, caused by harness priority `normal` outside the locked API enum. Corrected to `medium`; final smoke **PASS_SMOKE** (p95read197.053ms/write199.575ms/error0; visible4918.160ms). Original failure retained at reports/T-075-performance-smoke-initial.json, correction at reports/T-075-performance-smoke.json. No product/API change was needed.

**Full load result: PASS_LOCAL_SUBSET** — warmup30s;600rounds/599999.550ms;9000requests (6300read/2700write=70/30), p95read209.771ms / write153.441ms, unexpected0/error0%. Status200×7320/201×1680; no deliberate error excluded from primary samples. Viewer visible update4935.178ms (one sample), Chromium153.0.8010.12. AppleM2/8logicalCPU/8GiB/macOSDarwin24.6.0/arm64; Node22.23.3/npm10.9.9/SQLite3.53.4.

Startup710.507ms; separate CSV79.617ms/1587512bytes, sampled CSV RSS157546432bytes; board200/409 with500tasks/no duplicate IDs. Whole-process peak RSS691289600bytes (659.265MiB), heapUsed453188072bytes (432.194MiB). RSS is substantially above the initial CSV-phase sample; combined harness/client/API/runtime measurement cannot establish whether retained memory is a product leak or allocation/GC behaviour. **Isolated memory trend/stability investigation remains pending High**, not waived by latency PASS. Full concurrent file/lock/restart stress and native SQL remain NOT_RUN.

Separate CSV phase drains actual bytes for the10000-task fixture; JSON `rows` is the seeded expected task count, not a CSV-parser assertion (parsed CSV correctness already has separate prior regression evidence). RSS sampling is100ms and may miss transient peaks. Memory scope includes harness/API/SQLite/clients, excludes seed transient and Chromium process; does not establish a production-process limit or absence of leaks. Startup timing measures `startApplication` and first ready response in the already-running harness after seeding; not a clean process/OS cold-cache benchmark.

Two same-column reorder requests use the same initial column version; expected200/409, total500/no duplicate task IDs. This is not native SQL lock/busy/deadlock stress or every commit ordering. Concurrent upload/export/board/poll+restart stress in full TC084 remains NOT_RUN. Browser uses the existing Viewer session, one visible detail change during main load, waits≤10seconds and asserts document visible. Exact OS/CPU/RAM/Node/npm/SQLite/browser versions are in the JSON; SSD **NOT_VERIFIED**. Native SQL2022/Windows/fullTC083/084/AT27 remain NOT_RUN.

## T-076 — unsigned review register

TeamFlow_UAT_Register.md and reports/UAT-signoff-template.json contain all30ATs/five human journeys, expected criteria/case/profile mappings and blank tester/role/date/build/hash/actual/evidence/signoff. Every result is NOT_RUN. Generator refuses existing files; refusal was verified to preserve potential human input. Tests/execution-records.json remains unchanged. An empty defect registry does not prove no Critical/Major issues; record severity/reproduction/owner/fix build and actual retest before acceptance.

## T-077 — candidate source

CANDIDATE_RELEASE_NOTES.md explicitly labels IN_PROGRESS and native SQL/Windows/UAT pending, retains production guard and points to owner installation/local quickstart. Source includes runtime/frontend/migrations/contracts/scripts/tests/manuals/config placeholders/lockfile/license metadata. No runtime DB/backup/uploads/logs/session credential state/node_modules/dist/.git/.DS_Store/private-key files/live.env. Synthetic test fixture literals are source, not pre-created runtime accounts. Reports credential-field review found no persisted long password/cookie/CSRF/token fields; bounded private-key/credential-URL/bearer-pattern scan is not a universal secret detector.

Archive tool has a200MiB source bound, rejects symlinks, duplicate/case-colliding/absolute/traversal/backslash/drive entries and verifies every declared SHA256/size before writing. Nonempty extraction targets are preserved. Six security cases passed. SOURCE_INVENTORY.json hashes all source entries except itself; external delivery JSON contains ZIP SHA256. Readiness mapping covers FR40/NFR8/BR18/53API operations/actual screen sources/AT30; mapping is not implementation acceptance. Third-party notices remain in installed packages and their inventory; owner source licensing is not changed.

**Grouped verification (pre-archive):** contract53routes/77schemas PASS; test-plan inventory and empty evidence consistency PASS (candidate/final/production gates NOT_RUN;143formal items pending);390pinned dependency license metadata entries/0missing PASS; six Python3.9.6 archive security cases PASS; generator refusal confirmed. Typecheck/lint0warnings PASS; UAT template SHA256 unchanged after refused regeneration PASS. **Fresh r2 ZIP local verification PASS**: offline ci, typecheck, build, **458/458 npm tests** (Node420/frontend38), migrations0000/0001/0002 once then no-op, explicit synthetic fixture, omit-dev install/compiled installerCLI help, built HTML/live200/ready503/meta setupRequired true/me401/generic login401 without set-cookie. ZIP430source entries, SHA256 `f443a8f566cc265a58138ba45b28909893fd7542829f46b53516ac90b7cc203b`,2813629bytes. Third-party metadata390/0missing. Build's pre-existing>500kB chunk warning remains. No product code change;128src/frontend/migrations/contracts files match previous batch snapshot, so previous UI evidence is referenced rather than rerun. Fresh Windows/SQL2022 remains NOT_RUN. UI source unchanged; earlier55 distinct local UI cases are referenced, not rerun or claimed as a new full UI pass. Native SQL/Windows/full browser/device/Excel/HTTPS/RPO-RTO/UAT remain NOT_RUN.

## Evidence

- reports/T-075-performance-smoke-initial.json / smoke.json / full.json: sanitized measurements.
- reports/UAT-signoff-template.json / release-readiness.json: unsigned review and coverage mapping.
- reports/T-077-source-archive.json / T-077-fresh-archive.json: r2 candidate hash/inventory and actual extraction checks PASS_LOCAL_SUBSET.
- reports/T-075-077-batch-results.json: grouped local evidence/snapshot.
- Raw logs retained outside ZIP in /private/tmp/friday-T075-*.log and final check logs; no passwords/tokens/cookies printed.

### Fresh ZIP failures before corrected candidate

First candidate SHA67ec1a7bed8b84de38bd0239ca7127759bff86a42171ea744c5e4676bf47c52f: initial offline ci FAIL_ENVIRONMENT because default cache lacked wsl-utils0.1.0; existing isolated cache contains it. Retest with existing cache reached typecheck and **FAIL_PACKAGING**: archive policy excluded code in tests/sessions, causing missing fixture imports. Fixed exclusion to preserve code modules under source roots while excluding persisted runtime session state; added regression assertions for source session paths and stored cookie/SQLite state. No app/API/dependency change. Failed ZIP is withdrawn, immutable hash/evidence retained; corrected r2 candidate must pass fresh extraction before delivery.

### Immutable delivery and next work

Deliver only **deliverables/FridayManagement-candidate-20261007-r2.zip** plus this external final report/JSONs. ZIP is unchanged after fresh verification; its embedded report/register are the before-fresh-check snapshot. External report and Task Register include post-check results, and the batch snapshot records those reporting-only differences explicitly. The withdrawn first ZIP is not for installation. Formal candidate review gates still NOT_RUN (REL01/02 require complete manual review); source artifact is a labeled review candidate, not an approved final release.

Next: **T-075 High** isolated memory trend/stability + native SQL2022/Windows stress; T006/T007 **High** provider acceptance; T076 **Medium** named human UAT after dependencies. DONE6/77; IN_PROGRESS71; TODO0; remaining71.
