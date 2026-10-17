# T-035–T-039 — Atomic board move, Kanban, alternatives, recovery and Comments API

วันที่: 6 ตุลาคม 2026 · macOS · Node22.23.3/npm10.9.9 · temporary local SQLite

เจ้าของสั่งเริ่ม5งานแล้วทดสอบรวมท้ายชุด. Declared effort: T-035/T-038 **High**, T-036/T-037/T-039 **Medium**; actual model/effort **NOT_VERIFIED**. Local implementation/verification **5/5**; all five remain **IN_PROGRESS** under SRS5.2. Task Register: **DONE6/77, IN_PROGRESS33, TODO38, remaining71**.

## Result by task

- **T-035:** guarded single move endpoint checks current project/task rights, source status, task/column versions, same-column equality and anchor in the target project/column. Canonical column locks precede task locks. Move shares the detail completion/reopen/recurrence mutation, then inserts before anchor or appends and renumbers each affected column once using the existing two-phase unique negative-rank helper. Same-column order increments task/one-column version while preserving completion and recurrence. Stale/invalid/permission failures leave task/ranks/effects unchanged; persisted order survives reopen/restart. Idempotency replays exact response across actual HTTP/database restart and current rights/resource checks still apply.
- **T-036:** project dialog has List/Kanban views. Four colored columns/card title/ID/assignee/priority/due/overdue/checklist; mouse handle drag in/across columns uses the move endpoint. Optimistic pending state never displays saved before server ack. >500 controlled boundary fixture displays20-item pagination and task-detail status controls, with no drag/full unlimited board. Kanban loads as a separate chunk; a fresh build still emits a >500KB chunk-size warning, so no load/performance acceptance is claimed. Full Monday-inspired Table/Gantt/design work remains T-045/T-046/T-055.
- **T-037:** server-backed search/assignee/priority/category/due/status filters hide nonmatching tasks and disable drag/reorder/status menu, including zero-result sets; clear restores complete ordering. Filtered users can open task detail to change status. Menu status/up/down uses the same move transaction and native keyboard controls. Current Viewer has no board write controls. Mouse distance and touch300ms long-press handle activation leave card content/page scrolling usable. Actual Chromium touch emulation verifies scroll, handle long-press move and390px screenshot; physical-device/full matrix acceptance remains pending. Saved card receives focus when no detail dialog is open.
- **T-038:** validation/permission/stale versions restore prior snapshot and fetch current board;409 requires a fresh user move. Actual Editor→Viewer demotion rejects stale move and removes controls; access revocation clears board cards. Lost write response first fetches authoritative board, then explicit same-key/same-body retry; task version proves one mutation. Acknowledged write plus failed GET preserves the acknowledged position and offers read recovery, with no second write. Dirty task-detail draft survives a competing status update/409. Shared automatic polling is still T-047.
- **T-039:** scoped paginated comments, plain text1–5000 UTF16 units, author/id/time only. Viewer reads, current active writers create; archived/deleted/maintenance guards apply. No edit/delete endpoint. Comment/event/current eligible creator-assignee notifications share one transaction, with no self/duplicate recipient. Same key concurrent HTTP requests and restart produce one comment; different body conflicts and revoked access hides replay. Comments panel/text rendering is T-044; this batch verifies API literal HTML/script data, not a comments UI.

## Contract correction

API contract **1.0.1** increases BoardMoveResult.affected_columns maxItems2→3 because moving a recurring doing/review task to done also creates the next todo task. Paths/request fields/versions/permissions unchanged; same-column1, ordinary cross-column2, recurring cross-column up to3. `scripts/build-contract.mjs` regenerated OpenAPI/test inventory. Provider and actual HTTP checks validate all3 columns; no new scheduling feature.

## Validation

| Check | Result | Scope |
|---|---|---|
| typecheck / lint / build | PASS | Server/frontend/tools; lint0 warnings |
| check:contract / test:contract | PASS |52routes/75schemas;61 checks included in combined |
| build:test-plan / check:test-plan / test:test-plan | PASS | Inventory/policy only;17 checks included in combined |
| test:boards | PASS15/15 | Provider10 + actual HTTP2 + two-process SQLite races3 |
| npm test | PASS364/364 | Node343 + frontend21; all npm suites |
| test:ui | PASS28/28 + affected6/6 recheck | Kanban6 + regression22; final people picker/revocation clear verified again |
| verify:checkout | PASS | Fresh offline ci/type/build/364 tests/migrate/seed/omit-dev runtime; fixtures/source removed |
| Native SQL Server2022 | NOT_RUN |130 native harness cases SKIP, including10 new cases |
| Windows / full browser-device / physical touch / UAT / full TC-AT | NOT_RUN | No formal execution records fabricated |

## Evidence and trace

Machine results: reports/T-035-039-batch-results.json. Fresh source: reports/T-039-fresh-checkout.json. Touch screenshot: reports/T037-touch-kanban.png. Logs: reports/T-035-039-tests.log, reports/T-035-039-ui.log, reports/T-035-039-sqlserver.log, reports/T-035-039-checks.log, reports/T-035-039-build.log, reports/T-035-039-fresh.log. Source SHA256 in machine results. Final affected UI log: reports/T-035-039-ui-affected.log. Screenshot visually inspected at390px.

Partial trace: FR-18/20/21/22/23/26/27/35; NFR-02/03/05/06; UT-01/02/03/06/07/08/09/10/11/18; TC-035–045/051/075; AT-10/11/14/16/17/18/20/21/28. Full TC/AT remain NOT_RUN; comments rendering and audit-view immutability await feature panels, native SQL locking/deadlock/connection-loss and Windows/provider acceptance remain required. `tests/execution-records.json` unchanged.

Two-process races: move/move, move/detail-edit and move/detail-complete use a real shared SQLite database and IPC start barrier; exactly one succeeds, the other conflicts, and final tasks/status/completion/positions/ranks/recurrence are consistent. Fault-injected task-event failure rolls move back; notification failure rolls comment/event back. Provider checks cover strict anchors/versions/closed completion, recurrence three-column result, bounded501-card ordering DTO, archived/deleted/maintenance permissions, comment length/plain-text/pagination/current recipients. HTTP exercises cookie/CSRF/locked DTO/idempotency/restart/access denial. Browser uses actual installer/login/task services; only organization/team/project/large boundary setup uses fixture APIs/direct synthetic inserts.130 SQL SKIP is not SQL acceptance.30-user load/performance and full T-016/T-022/T-027 feature integration still pending.

## Repairs and handoff

Local failures repaired: initial unavailable project-detail GET replaced with supported scoped project-list lookup; JSX/unused-helper compilation/lint fixes; gesture source outside viewport and touch endpoint still near original column; filtered empty set assertions; maintenance fixture schema; acknowledged write followed by failed read now preserves committed position. Final affected checks recorded above. No commit/push/deploy/DNS/server/shared runtime changes. Readiness503 and production startup guard remain.

Next candidate batch: **T-040 High, T-041 High, T-042 High, T-043 High, T-044 Medium**, preserving dependencies and provider separation.
