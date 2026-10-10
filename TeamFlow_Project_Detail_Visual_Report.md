# Project details and subforms visual follow-up — 9 October 2026

Owner requested Project details and subforms to match the previously styled menus. Declared T-024/T-084/T-088/T-089 Medium; shared Calendar/Gantt parent T-046 High. Actual model/effort NOT_VERIFIED. Partial FR-09–11/19/25/48–51, UX-01–06 and NFR-09; local subsets of TC-016/017/018/049/093/094/095/098 and AT-07/08/19/29/35/36/37/39. No formal TC/AT sign-off or parent status change.

## Result

- Dedicated project-detail-visual.css styles the project board only: plain breadcrumb/title/description/divider header; readable wrapping metadata; a stable horizontal tab strip; filters and table surfaces; Kanban cards; Calendar/Gantt toolbars; Overview progress/overdue/status/activity cards; Members, Files and Workload panels; and a Docs sidebar/editor. Mobile panels stack, wide tables/tabs scroll within their own surfaces, and tab selection does not translate the page.
- Shared Task editor receives a soft tinted heading, horizontal editor tabs that retain complete labels at 360px, rounded inputs, readable Details textarea, and distinct blue Save, gray Cancel and red Delete controls. Existing Details/Checklist/Updates/Files/Activity behavior remains.
- Project create/edit and archive dialogs have explicit Cancel buttons (type=button, pending guard) beside Save/Confirm; Cancel closes without submitting. The existing metadata dialog is shared with Teams and receives the same button layout. Existing defaults Internal/Development, fixed owner team during edit, Unicode, read-only/offline/maintenance/version/idempotency checks remain.
- Project membership dialog receives a responsive surface, directory/search/role controls and confirmation styling. Set membership is blue; explicit access confirmation/cancellation remains. Docs New/Edit/Save controls are blue; Cancel gray; Delete red. No meaning is conveyed by color alone.
- Preserve existing motion and reduced-motion policy. New tab transitions only change colors; no additional packages, data, API, migrations, runtime, deploy or commits.
- Edits: main.tsx import; new CSS; targeted Workspaces.tsx dialog classes/Cancel/primary button; ProjectDocs.tsx action classes. Concurrent Claude TaskWorkspace.tsx/ProjectTasks.tsx/main-table test changes were not edited or reset.

## Validation

Node 22.23.3, npm 10.9.9, temporary synthetic SQLite and Chromium; isolated test webServer port43239, concurrent Claude port43171 untouched.

- Build/typecheck/focused ESLint PASS; frontend49/49 PASS.
- Test-plan inventory and17/17 policy tests PASS (plan validation only); git diff --check PASS.
- Final browser batch8/8 PASS: new visual flow; Docs editing/tools/image/sanitized XSS/conflict retention; Files upload/search/preview/delete/restore; Gantt inclusive/one-day/due-only/no-date and Calendar keyboard/date filters/detail; Workload/Overview numbers/threshold/cell drilldown; project create/edit/archive/membership; Unicode/defaults/persisted metadata/mobile; cross-team Viewer reads and revoked project hidden.
- Final drawer screenshot follow-up1/1 PASS after strengthening the Details textarea CSS selector; Overview counts now finish before capture. Inspected final360px drawer tabs (complete labels, horizontal scroll), form and Save/Cancel footer, and the create-project mobile dialog with two distinct action buttons.
- New visual flow verifies all9 Project views keep the tab strip position, task creation persists after reload/reopen, untouched task Cancel makes no write, Docs title Save persists and Cancel discards edits, project metadata Cancel preserves the name, 360px page/dialog bounds, and reduced motion. Screenshots wait for animated counts and drawer bounds before capture.
- Test development corrections: fixture initially used a non-existent nested task endpoint, then incorrectly sent status during create; changed to existing /api/tasks create + versioned PATCH. Reload needs to reopen the board when entered via the card action; task title text includes FR identifier, so assertion uses the task button. Drawer bounds checked after entrance animation. These were test harness errors/timing, not production save failures.
- First sandboxed browser start returned INSTANCE_GUARD_UNAVAILABLE; reran the same isolated test with localhost execution permission. No existing process stopped and no guard bypassed.
- Inspected synthetic desktop/mobile Overview, task editor and Docs screenshots. Actual local127.0.0.1:5000 inspected Website Relaunch Overview and blank Create task → Cancel read-only; original projects/tasks visible, no Save, membership, uploads or preference writes. Actual screenshot evidence stays private in /private/tmp/friday-project-style-ui. Inspection tab closed after verification.

Screenshots: reports/UI-project-board-colorful-desktop.png/mobile.png, UI-project-task-editor-desktop.png/mobile.png, UI-project-docs-colorful-desktop.png. Machine-readable evidence and raw validation logs: reports/project-detail-visual/results.json.

NOT_RUN: native SQL Server2022, Windows, owner UAT, full browser/device matrix, full backend/provider acceptance. SQLite results cannot close SQL Server criteria. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; next formal T-091 High.
