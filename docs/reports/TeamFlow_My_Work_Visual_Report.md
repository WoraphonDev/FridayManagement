# My Work visual follow-up - 9 October 2026

Owner requested the Home/Reports style on My Work. Declared parent efforts: T-083 Medium and T-086 High; presentation follow-up reuses T-089 motion. Actual model/effort NOT_VERIFIED. Trace FR-45/52, partial TC-091/096/098 and AT-34/38/39. Parent tasks remain IN_PROGRESS. No deployment or commit.

A separate my-work-visual.css scopes every selector to task-workspace[aria-label='My work']; main.tsx imports it before motion.css so existing user/OS reduced-motion rules apply. No edits to concurrently modified TaskWorkspace.tsx, ProjectTasks.tsx or Claude's Main table tests. Header uses the Home/Reports tinted gradient, tabs use pill selection, scope/search/due/sort use a grouped filter card, date groups use rose/amber/blue/slate/violet/green cards and count badges. Table headers/row spacing and hover states improve readability; existing status/priority colors and all actual data/queries are preserved. Only group mount uses opacity360ms reveal; group expand/collapse does not slide the contents or move view tabs.

Personal grid fixes: table minimum930px (830px mobile), pinned Task with readable mobile190px width, Assignee body cell position static because personal grid has no Select column, all headers remain sticky in the table. Previous mobile auto-width could collapse Task to zero. Columns scroll inside the focusable table region; page does not overflow. Scoped border/margin/background important overrides are needed for existing approved-design.css global board rules; Project board remains governed by its original rules.

Validation Node22 / temporary SQLite / Chromium fixture port43239:

- Typecheck/build and focused ESLint (main.tsx/new browser test) PASS, zero lint warnings/errors.
- Chromium5/5 PASS: existing T045 My Work assigned/created scope, due filters, AND/OR status/priority, debounce and empty results; Home2 original widget queries/matching rows/inline status and visuals/accessibility/reduced-motion; existing T086 Main table add drawer/F2/batch per-item409/drag reorder+move/sticky/resize preferences; new My Work visual/mobile/motion test.
- New visual test creates synthetic all due groups (six groups on Sunday, otherwise seven), validates colors/exact task count, Calendar/Gantt view switches keep tab Y position, mobile360 no body overflow, readable visible task title, pinned Task during220px horizontal scroll, non-pinned Assignee, usable mobile filters, keyboard collapse/expand, task-detail opening and OS/persisted user reduced-motion.
- Final visual1/1 PASS after scoped card border/margin adjustment. Desktop1440 and mobile360 synthetic screenshots inspected: reports/UI-my-work-colorful-desktop.png and reports/UI-my-work-colorful-mobile.png.
- Test-plan inventory/policy checks PASS (17/17; plan only).
- Actual5000 read-only before/after group counts/task titles match; screenshot private under /private/tmp/friday-my-work-ui. No live writes/API changes/service restarts/database changes; Claude port43171 untouched. Temporary inspection tab closed after verification.

NOT_RUN: full application/browser regression, provider/backend test suites for this CSS-only follow-up, native SQL2022, Windows and UAT. Prior frontend49/49 from Home remains previous evidence, not rerun/claimed as this run. No API/contract/schema/migration/permission change. Task counts DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84. Next formal T-091 High requires native SQL2022/Windows/UAT.
