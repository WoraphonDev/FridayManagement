# Task editor sub-tabs follow-up — 9 October 2026

Owner supplied Task #11 Files screenshot and requested inspection of the sub-tabs. Checked Details, Checklist, Updates, Files and Activity individually in the actual app, and implemented remaining scoped layout/action styles. Declared T-044/T-089 Medium; related parent T-032/T-033 acceptance remains unchanged. Actual model/effort NOT_VERIFIED. Partial FR-16/19/27/28/29, UX-01–06, NFR-09, TC-027/035/053/054/055/056/057/058/059/098 and AT-15/21/22/39; no full TC/AT sign-off.

## Changes

- New task-editor-tabs.css loads after the Project detail styles and scopes all rules to the Task editor. Correct native checkbox dimensions to16×16 and checkbox labels to a horizontal layout. The Files deleted-file checkbox remains associated with its existing label and permission guard.
- Checklist rows use readable title/checkbox, assignee and short Edit/Delete controls with the original full accessible names. Add/edit fields use tinted cards; Add/Save blue, Cancel gray, Delete red. Empty checklist has an explicit message. Completion, independent assignment, closed-task gate, optimistic/version behavior and confirmation rules unchanged.
- Updates use author/time/comment cards, an empty message, pagination and a separate composer. Preserve plain text rendering, mentions, draft mounting and posting semantics.
- Files use a labeled filter strip, empty state, attachment cards with metadata/actions, pagination and a separate upload area. Native chooser styling, upload/discard/cancel controls and progress remain backed by existing validation, quota, idempotency and permission checks. No actual user files uploaded during live inspection.
- Activity uses a timeline and readable nested before/after changes. Existing actors, Asia/Bangkok timestamps and read-only behavior unchanged. Details keeps the previously styled fields; conflict-review checkboxes also receive the native checkbox correction.
- Multiple independent notices previously overlapped the header on mobile after checklist/comment/upload actions. Scoped drawer notices now flow vertically inside the content instead of covering tabs; the existing messages/live regions remain. This adjustment does not affect global page notifications.
- No new APIs, schemas, dependencies, migrations, persisted user data, runtime changes, deploy or commits. Targeted TaskEditor.tsx/TaskCollaboration.tsx presentation changes only; concurrent Claude TaskWorkspace.tsx/ProjectTasks.tsx/main-table files and port43171 untouched.

## Validation

Node22.23.3 / temporary synthetic SQLite / Chromium; isolated webServer43239.

- Build/typecheck/focused ESLint PASS; frontend49/49 PASS.
- Six existing scenarios PASS: comments plaintext/pagination/dirty refresh and upload/download/delete/restore/history/mobile; upload progress/pending/uncertain response same-key durability; type/size/quota errors retain drafts and permission revocation closes private panels; all task fields/checklist/completion gate/monthly successor/trash; Vibe groups/multiple assignees/independent checklist/CSP/Kanban; mobile menu/reduced-motion drawer.
- New combined visual scenario1/1 PASS: all five tabs desktop/360px; empty and populated states; checkbox16×16 with horizontal label; deleted filter; checklist Add/Cancel/check persisted; comment posting, draft survives Files/Updates switch; file selection Discard disables Upload, real synthetic upload visible; tab strip remains stationary across switches; dialog fits; Cancel footer reachable; reduced-motion media checked.
- Initial combined6PASS/1FAIL because Playwright check() expects immediate native state while checklist confirmation is asynchronous/server authoritative. Test now clicks and waits for Checklist1/1, matching existing app tests; no mutation logic change.
- Final notice-layout regression2/2 PASS (new visual scenario plus comments/files/history/mobile regression). Seven distinct browser scenarios passed across runs; this is not a single7/7 batch.
- Screenshots include all five sub-tabs desktop/mobile and empty Files desktop. Inspected each pane in the actual127.0.0.1:5000 Task#11, no edits/Save/comment/upload/access writes. Actual screenshots remain private in /private/tmp/friday-task-tabs-ui; browser inspection was temporary.
- Test-plan inventory and17/17 policy tests PASS; git diff --check PASS. Test-plan checks validate planning only.

Evidence: reports/task-editor-tabs-visual/results.json and validation logs; reports/UI-task-tab-{details,checklist,updates,files,activity}-{desktop,mobile}.png; reports/UI-task-tab-files-empty-desktop.png.

NOT_RUN: native SQL Server2022, Windows, owner UAT, full browser/device matrix, full provider/backend acceptance. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84. Notifications visual styling remains outside this request; next formal T-091 High.
