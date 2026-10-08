# T-045–T-049 — Table, Calendar/Gantt, shared refresh and notifications

6 ตุลาคม 2026 · macOS · Node22.23.3/npm10.9.9 · temporary local SQLite · Chromium.

เจ้าของให้ทำ5งานก่อนทดสอบรวม. Declared: T-045 **Medium**, T-046–T-049 **High**; actual model/effort **NOT_VERIFIED**. Local implementation5/5; all five remain **IN_PROGRESS** under SRS5.2. Task Register **DONE6/77, IN_PROGRESS43, TODO28, remaining71**.

## ผลและขอบเขต

- T-045: My Tasks defaults to assignee=self; created-by-me is a separate view. Bangkok today/overdue/future/no-due/done groups. Shared AND filters, multi status/priority OR, inclusive due ranges, all seven API sorts, null-last backend ordering, search300ms debounce and20-row pagination. Monday-inspired project header, four project view tabs, grouped Table, owner initials, text/color statuses and priorities, date pills and versioned task detail/status menu.
- T-046: Calendar42-day Monday-first grid, previous/next month/today, due-date items without duration dragging, no-due list. Gantt inclusive bars, viewport overlap, start=due one-day, due-only marked without an assumed start; incomplete dates in a separate list. Day/week/month scales, previous/next/today, date-only leap/month/year boundaries. Both exhaust all100-row API pages before showing complete results; detect changed totals/duplicates/missing rows, abort obsolete loads; render50-row paginated timelines/lists. Dense Calendar cells show5 items and all visible-grid events remain in the complete paginated list. All click/Enter detail actions use the existing versioned PATCH form; Viewer and archive stay read-only.
- T-047: One shared5s reader clock, visible/online only; focus/visibility/reconnect immediate; abort pending polling on hidden/offline/logout. Lists, Kanban, detail/collaboration panels and organization/project/team forms retain dirty drafts. Incoming changes show badges; dirty task versions remain unchanged for409 comparison/explicit review. Clean detail receives the new version. Current permissions are rechecked; removed scopes close dialogs and clear private state. GET polling never extends idle; trusted interaction alone posts activity.
- T-048: One current-access notification dispatcher; assignment to new assignee, comment/status to creator/assignee, no self/inactive/no-access recipients. Safe generic Thai messages. Atomic business/event/notification transaction, per-command dedupe; cleanup/reopen/restore alert active owner Admin/Leads except actor. Fault injection checks both execute and returning-query writes after consolidation.
- T-049: Server scheduler default60s/config1–60s, startup current-day catch-up, independent of browser/GET. Bangkok D-1/D0/overdue, keyset batches100, skip done/deleted/archived team/project/unassigned/inactive/Viewer/no current write access. Unique DB key includes task/recipient/type/Bangkok-date. Parallel jobs/restart do not duplicate. Maintenance pauses dispatch; clean shutdown waits for job; failed ticks log only a safe code and retry. Full backup/job coordination remains T-060/T-061.

## Validation

| Check | Result |
| --- | --- |
| Backend notification/reminder subset | PASS14/14: provider11 + actual HTTP1 + two-process/restart1 + scheduler failure/nonoverlap/shutdown1 |
| All npm test suites | PASS407/407: Node375 + frontend32 |
| Chromium regression | 37 distinct cases verified; raw regression36PASS/1FAIL from ambiguous badge selector; corrected focused2/2 PASS plus strengthened My Tasks1/1 PASS. No application change for that selector failure. |
| Typecheck / lint / build | PASS;0 lint warnings; main JS467KB + lazy workspace51KB + Kanban55KB, no chunk-size warning in workspace build |
| Contract / test plan | PASS; API1.1.0 unchanged,53routes/77schemas; test inventory77tasks/84cases/30AT; execution records0 |
| Native SQL Server2022 | 152 SKIP,0 executed; NOT_RUN; no SQL acceptance inferred from SQLite |
| Fresh offline source copy | PASS: cached offline ci/type/build/all407/migrations+repeat no-op/synthetic seed/omit-dev runtime/CLI; reports/T-049-fresh-checkout.json. Fresh build emits >500KB chunk-size warning; performance remains NOT_RUN. |
| Windows / full TC-AT / UAT / performance / full browser-device matrix | NOT_RUN |

Partial traceability: TC-010/046/047/048/049/050/060/061, AT-15/19/20/23. Existing regression covers current-access scoping, recurrence, atomic idempotency, file lifecycle and dirty/conflict forms. No full TC/AT execution record or sign-off added.

New evidence: tests/notifications/provider-suite.ts (also registered for native SQL), http.test.ts, concurrency.test.ts and worker.ts, scheduler.test.ts; frontend task-dates.test.ts/shared refresh.test.ts; actual browser task-workspace.spec.ts and task-workspace-permissions.spec.ts. Actual205-row/3-page timeline and dense Calendar, 390px screenshot, Viewer/demotion/revocation/archived projects, two-tab clean/dirty/comment updates, hidden/offline/focus/reconnect and passive idle preservation. Browser hidden state is simulated via the visibility event; offline uses browser networking plus online/offline events. This is local Chromium evidence, not a full physical-device/browser acceptance matrix.

Production startup remains guarded and ready503. Notification center/read endpoints remain T-050/T-051. No dependencies, scheduling automation, critical path, AI/email/custom fields added. No commit/push/deploy/DNS/server/shared runtime change. Next T-050 High (candidate batch050High/051Medium/052High/053High/054Medium).

Actual Gantt form PATCH captures version1 and both date-only values after keyboard-open; comment-only incoming changes are shown while the comment draft remains. The final focused checks cover these added assertions. Reviewed screenshots: reports/T049-gantt-desktop.png and reports/T049-calendar-mobile.png.
