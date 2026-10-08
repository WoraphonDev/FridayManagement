# T-050–T-054 — Notifications, reports and streamed CSV

7 ตุลาคม 2026 · macOS · Node22.23.3/npm10.9.9 · temporary local SQLite · Chromium.

เจ้าของสั่งทำ5งานก่อนทดสอบรวม. Declared effort: T-050/T-052/T-053 **High**, T-051/T-054 **Medium**; actual model/effort **NOT_VERIFIED**. Local implementation/verification5/5; all five remain **IN_PROGRESS** under SRS5.2. Task Register **DONE6/77, IN_PROGRESS48, TODO23, remaining71**.

## Result and scope

- T-050: Own recipient plus current parent access on list, unread count and read mutations. Default page50, deterministic newest-first order, strict contract DTOs; read-one is a natural no-op if already read. Read-all only changes own visible unread records. Deleted tasks and revoked parents are hidden; historical membership/creator/assignee alone grants no access. GET does not mutate notifications or renew session idle. Existing server scheduler now also deletes notifications at the exact90UTCday cutoff, pauses under maintenance and remains independent of browser requests. Broader retention/backup coordination remains T-060/T-061.
- T-051: Web-only notification center and sidebar badge, visible/online shared5s polling with focus/reconnect refresh. Paginated list/read-one/read-all/unread filter, pending/offline/error states. Task opening first validates current detail and accessible project;404 clears gracefully. Existing TaskEditor preserves drafts and closes on revoked access. Actual assignment → member login/password change → notification detail → dirty polling → membership revoke is exercised in Chromium. No email or push when the web app is closed.
- T-052: Aggregates reuse the task query scope and filters; exclude deleted tasks and archived projects/owner teams even with an explicit project. Status sum equals total, Bangkok overdue, current open-unassigned, done in period intersecting the selected filtered dataset, zero-safe percentage and scoped workload. Team means owner team; person means assignee. Created/completed timestamps use inclusive Bangkok dates converted to UTC; due basis uses inclusive date-only values. Omitted dates default to the current Bangkok month; explicit one-sided intervals stay one-sided. Workload includes visible assignees with zero open tasks so completed-only people remain selectable; inactive history is labeled separately.
- T-053: Same normalized report filters and current access; twelve columns only: ID/title/project/owner team/status/priority/assignee/start/due/category/created/completed. UTF8 BOM, quoted RFC4180 cells, doubled quotes and preserved embedded newlines; apostrophe neutralization for whitespace-prefixed formula characters and leading tab/CR. Cap50001 rejects before stream headers; exactly50000 exports completely. A second authorization/count runs before headers, then a serializable streaming transaction fetches100 rows at a time with backpressure. No full server CSV buffer. Disconnect destroys the stream and releases the transaction. Authenticated attachment/no-store/nosniff, no pagination truncation. Filename retains selected date basis/range; frontend exports the normalized dates actually displayed.
- T-054: Dashboard and report UI with accessible team/project/person/date controls, metric labels/status totals/zero state and workload table. Scope choices come from accessible projects and scoped report people, without exposing a global directory. Changing filters aborts stale reads/downloads; route changes load current report and badge immediately. Lazy report/notification/detail modules keep workspace main JS below500KB. No unsupported quality/productivity ranking.

## Validation

| Check | Result |
| --- | --- |
| Notification/report/export backend | PASS23/23; existing14 plus new provider8/actual HTTP1 |
| All npm test suites | PASS420/420: Node384 + frontend36 |
| Chromium grouped regression | PASS14/14: new notification/report/CSV8 plus Table/Calendar/Gantt/current-access/shared-refresh6 |
| Focused visual recheck | PASS1/1; strengthened desktop1440/mobile360, keyboard and200% text-size subset; both captured images inspected |
| Typecheck/lint/build | PASS;0 lint warnings; main470KB, lazy reports7KB/notifications4KB/detail29KB/workspace22KB/Kanban55KB |
| API contract/test plan | PASS; unchanged API1.1.0,53routes/77schemas, contract61 and planning17 tests in the full suite;77tasks/84cases/30AT, execution records0 |
| Native SQL2022 |160 SKIP,0 executed; NOT_RUN |
| Fresh source copy | PASS: offline ci/type/build/all420/migrations3+repeat no-op/synthetic seed/omit-dev runtime/CLI; reports/T-054-fresh-checkout.json. Fresh build chunk-size warning; performance NOT_RUN |
| Windows/full TC-AT/UAT/Excel execution/performance/full browser-device matrix | NOT_RUN |

Initial failures were fixed and retained separately: provider run18PASS/4FAIL from SQLite SELECT fragments retaining the SQLServer dbo prefix; corrected23/23. Initial browser8 had2PASS/6FAIL; detail used the list schema, exact labels included option text, and screenshot CSS injection was rejected by CSP. Intermediate14 had10PASS/4FAIL:5s badge test timeout vs5s polling, stale Dashboard/report route reuse, and the CSP test. Final grouped14/14 passed after current detail parsing, explicit control labels, immediate route reads, a10s polling expectation and CSSOM text-size testing without relaxing CSP. The strengthened screenshot recheck waits for current heading/data before capture. Raw runs are separate evidence, not relabeled PASS.

Partial traceability: TC-062–067, TC-010/050/068/075 and AT-05/08/20/23/24/30. Provider tests cover90UTCday boundary/maintenance pause, six-task2+1+1+2 summary/33.33%, owner-team vs assignee-team, Bangkok boundaries/reopen/zero/inactive history,123+ CSV rows/shared filters/formula-safe text, cap50001/exact50000/batches≤100/disconnect and pre-header authorization. HTTP tests cover real cookie/CSRF/own recipient/read mutations, safe headers, full CSV bytes, GET nonmutation/no idle renewal and startup retention. These are local subsets; Excel text/formula behavior, native provider semantics and full TC/AT executions remain unverified. tests/execution-records.json is unchanged.

Exports hold a serializable read transaction until streaming completes; large/slow-client contention and native SQL locking require performance/native-provider evidence. HTTP stream failure closes the connection and logs a safe code rather than mixing JSON into CSV. Full backup freeze/job coordination remains separate work.

No commit/push/deploy/DNS/server/shared runtime changes or real user data. Production readiness remains guarded. Next T-055 **Medium**; candidate next batch T-055 Medium/T-056 Medium/T-057 High/T-058 Medium/T-059 Medium.

Reviewed screenshots: reports/T054-reports-desktop.png and reports/T054-reports-mobile.png. Only synthetic fixture data is shown. Initial automatic approval review could not complete because of a usage limit; after the owner instructed continuation, the same review workflow allowed full/fresh runs. No approval mechanism was bypassed.
