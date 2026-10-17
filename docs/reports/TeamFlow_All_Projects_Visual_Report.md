# All Projects visual follow-up — 9 October 2026

Owner requested the same style as Home/Reports/My Work. Declared T-024 Medium; actual model/effort NOT_VERIFIED. Partial trace FR-09/10, TC-015/016/022/098 and AT-07/39. Parent T-024 remains IN_PROGRESS.

Dedicated all-projects-visual.css and main.tsx import only. Directory header/filter toolbar use soft tinted card surfaces, Create project is blue; project cards use purple/blue/green accents and team chips, rounded actual-status progress bars and readable names/descriptions. Archived cards stay gray with explicit Archived text. Responsive grid stacks at360px and does not widen the document. Reveal is opacity380ms with45/90ms stagger; hover changes border/shadow without translation. User/OS reduced motion remains governed by motion.css loaded last. Color variants are decoration, not permission/status/ranking indicators. No additional statistics or synthetic organization totals introduced.

Preserve card-body click and keyboard title navigation, isolated action menus, archive filter/paging, actual API progress visibility including P-07 boundary, project creation/edit defaults Internal/Development, Unicode and manual Save/version handling. No edits to Workspaces.tsx, concurrent Claude ProjectTasks.tsx/TaskWorkspace.tsx, backend, API contract or migrations. No live data write/service restart/deploy.

Validation Node22.23.3 / temporary SQLite / Chromium:

- Typecheck/build/focused ESLint PASS.
- Existing3/3 Chromium PASS: create/edit/archive/membership/active-project guard; owner project defaults/Unicode/save/reload/edit/mobile; cross-team Viewer sees only shared project and revoke removes next refresh access.
- New visual1/1 PASS: synthetic3 active+1 archived, archive filter toggles accurately; menu Edit opens without card navigation, dialog retains project name; description click and keyboard Enter open the project, directory stylesheet scope disappears on board;360px no document overflow; OS reduced-motion duration under1ms.
- Initial combined run3PASS/1FAIL: new test fixture incorrectly called nonexistent POST archive route (404). Corrected fixture to existing PATCH projects/{id} archived:true contract, no production change. Final focused visual PASS; final screenshot rerun waits for card opacity to settle before capture. Existing3 passing regressions not repeated without production changes.
- Synthetic screenshots reports/UI-all-projects-colorful-desktop.png (1440px) and mobile.png (360px) visually inspected. Actual local5000 directory read-only inspected: existing Website Relaunch10 tasks/3 done and Team Operations3 tasks/0 done remain. Screenshot stored privately /private/tmp/friday-all-projects-ui/live-final.png, no real contacts or data added to repo; temporary inspection tab closed.

NOT_RUN: full browser/application matrix, provider/backend suites, SQL Server2022, Windows and UAT. No contract/schema/migration change. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84. Next formal T-091 High.
