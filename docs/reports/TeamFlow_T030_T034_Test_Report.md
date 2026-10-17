# T-030–T-034 — Task lifecycle, query, detail, checklist/trash and board read

วันที่: 6 ตุลาคม 2026 · macOS · Node22.23.3/npm10.9.9 · temporary local SQLite

เจ้าของให้เลือก5งานแล้วทดสอบรวมท้ายชุด. Declared effort: T-030/T-031/T-034 **High**, T-032/T-033 **Medium**; actual model/effort **NOT_VERIFIED**. Local implementation/verification **5/5**; all five tasks remain **IN_PROGRESS** under SRS5.2. Task Register: **DONE6/77, IN_PROGRESS28, TODO43, remaining71**.

## Result by task

- **T-030:** versioned soft delete for Admin/owning Lead/eligible creator Editor; RD-01 permits managing archived project trash. Delete removes active board position and renumbers; restore appends original status before the strict UTC deleted_at+30×24h cutoff. Children, attachment metadata, series links and recurrence tombstones persist. Restoring unfinished tasks rechecks current assignee eligibility; done history remains. Mutation, board versions, audit and cleanup notification share one transaction. Trash visibility uses current manage scope before count/pagination. Restore key replay works across actual HTTP/database restart, rechecks current rights, and returns404 if the restored task is deleted again.
- **T-031:** shared SQL filter builder applies current project visibility before count and pagination; active defaults exclude archived projects/teams and explicit archived selection remains readable. AND across fields/OR within multi-value status/priority; explicit unassigned distinct from omitted filter. Literal case-insensitive title/description/category search, inclusive due dates, null-last dates, stable ID tie, seven allowlisted sorts, Bangkok created/completed intervals, completed-only-done and real/min/max dates. Future Calendar/Report/Export endpoints must consume this builder; those consumers are not implemented by this batch.
- **T-032:** project task list opens actual create/detail form with all fields and eligible assignee picker. Uses server versions, retained idempotency key for same save intent, busy/offline/read-only guards, archived restrictions, dirty close/route warning.409 preserves draft and requires loading/comparing latest plus explicit review before saving; current revocation closes private detail. Shared Form now separates invalid-submit state from permission-blocked fieldset, keeping empty form editable.
- **T-033:** actual Checklist add/rename/tick/delete, server counts, parent/child versions, no auto-complete and closed parent guard. Monthly recurrence date requirement/explanation/source-successor links; completing creates Feb28 successor from Jan31 with reset checklist. Delete confirmation and manage-only Trash restore show recovery cutoff. Browser journey performs create/checklist/completion/reopen/delete/restore through UI; API calls only set up organization/team/project fixtures.
- **T-034:** consistent ordered four-column snapshots with task/column versions, canonical lock order and contiguous-rank invariant. Create/delete/restore/detail status affect versions.500 tasks returns complete board;501 returns list_required with empty incomplete columns and paginated list available. Persisted order survives actual reopen/restart; corrupt rank fails503. Kanban layout/move/fallback menu consumer belongs to T-035–T-038 and is not signed off here.

## Validation

| Check | Result | Scope |
|---|---|---|
| typecheck / lint / build | PASS | Server/frontend/tools; lint0 warnings |
| check:contract / test:contract | PASS | Unchanged52routes/75schemas;61 checks in combined |
| build:test-plan / check:test-plan / test:test-plan | PASS | Inventory/policy only;17 checks in combined |
| test:task-views | PASS18/18 | Provider13 + actual HTTP2 + two-process SQLite races3 |
| npm test | PASS349/349 | Node328 + frontend21; all npm suites |
| test:ui | PASS22/22 | Task3 + regression19; local backend/Chromium153/macOS;360px subset |
| verify:checkout | PASS | Offline fresh ci/type/build/349 tests/migrate/seed/omit-dev runtime fixture; source/fixtures removed |
| Native SQL Server2022 | NOT_RUN |120 native harness cases SKIP, including13 new cases |
| Windows / full browser-device matrix / UAT / full TC-AT | NOT_RUN | No formal execution records fabricated |

## Evidence and trace

Machine results: reports/T-030-034-batch-results.json. Fresh source: reports/T-034-fresh-checkout.json. UI screenshot: reports/T032-task-detail.png, visually inspected at360px, keyboard focus visible and dialog scrollable. Logs: reports/T-030-034-tests.log, reports/T-030-034-ui.log, reports/T-030-034-sqlserver.log, reports/T-030-034-checks.log, reports/T-030-034-build.log, reports/T-030-034-fresh.log. Source SHA256 recorded in machine results.

Trace: FR-12–20/21/22, NFR-02/03/05/06; partial UT-01/02/03/06/08/09/10/18, TC-024/026/027/028/030/031/034/035/045/047/048/065/075, AT-09/10/11/13/14/15/16/19/20. These are partial local assertions, not entire TC/AT sign-off. Query backend does not close AT-19 Calendar/Gantt UI. TC-045 backend500/501 boundary does not close complete Kanban fallback UI. `tests/execution-records.json` unchanged.

Two-process races cover delete/edit, restore/restore and delete/done with consistent final board/ranks/completion/recurrence state. Fault-injected audit persistence verifies delete/restore rollback. HTTP uses actual cookies/CSRF/versioned services/locked DTOs/current visibility and restored key replay across restart. Fixtures use synthetic data; attachment metadata is verified, uploaded bytes are not. SQLite Unicode folding is a local approximation; native SQL collation/locking/deadlock/transaction behavior still requires execution on SQL2022. Retention/reminder/export/file/notification-center integration and full T-016/T-022/T-027 acceptance remain partial. Shared polling T-047 is pending; manual latest review preserves drafts. Ready503/production startup guard remain.

## Repairs and handoff

Repaired issues found by local checks: restore cached replay preflight wrongly required still-deleted task; after-delete cached restore must be hidden; UTC date bounds at0001/9999; form validation disabled all empty fields; explicit accessible labels needed for selects/textarea. Controlled checkbox UI waits for authoritative server values, so browser interaction uses click plus eventual server-count assertions. Final affected suites and full regression rerun PASS. No contract/runtime/deployment/commit/push changes.

Next candidate batch: **T-035 High, T-036 Medium, T-037 Medium, T-038 High, T-039 Medium**, preserving dependencies. Full model/effort settings remain NOT_VERIFIED.
