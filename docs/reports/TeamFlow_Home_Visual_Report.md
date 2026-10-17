# Home color and motion follow-up - 9 October 2026

Owner extended the Reports visual update to Home. Declared T-083 Medium, reusing T-089 motion/count-up helpers. Actual model/effort NOT_VERIFIED. Trace FR-44/45, AT-34 and partial TC-091/098. Parent T-083 remains IN_PROGRESS: local SQLite UI evidence cannot close SQL Server2022/Windows/UAT acceptance.

Home now matches Reports: a tinted welcome card, open-task count/link and Bangkok date; rose/amber/blue/violet/green summary cards with icons/hints; bordered status and project bar panels; full-width Up next rows with task links, status badges and due dates. Status/project values and links are unchanged. Project bars are a presentation of existing open_count relative to the largest project count, not performance scores. Existing API orders Up next by due date (undated last, ID tie-break). Status counts cover all assigned tasks, including done; open project counts exclude done. No new metric/permission/API/schema/service/migration changes.

Card reveal uses opacity360ms with45ms stagger; bars use scaleX650ms, final numbers use existing Count. Accessible Count labels expose final values immediately. Motion honors persisted user Reduce animations and OS prefers-reduced-motion. CSS scoped to Home; shared Project overview defaults retained. No whole-page movement added and query-only tab stability fix remains intact. CSS specificity was adjusted after the test caught existing motion-bar overriding Home bar motion; all status colors and zero-width bars remain correct. Project color specificity was also corrected before final evidence.

Validation Node22 / temporary SQLite / Chromium isolated port43239 (Claude port43171 untouched):

- Typecheck and production build PASS.
- Focused ESLint PASS with one pre-existing react-refresh/only-export-components warning for exported overviewSchema; zero errors.
- Frontend unit/SSR49/49 PASS, including all Home links/query mapping/Bangkok week tests.
- Browser2/2 PASS: original overdue/today/no-date/project/done widgets, matching My work rows and inline status updates, 375px no overflow; new empty states, five distinct card colors, final counts/accessibility,650ms bar animation, desktop status-filter/task-detail deep link, mobile360 no overflow, keyboard widget activation with correct due filter/row,200% root text-size check, OS/user reduced-motion and saved preference reload.
- Test-plan inventory check and17/17 planning-policy tests PASS (plan only).
- Synthetic screenshots reports/UI-home-colorful-desktop.png and reports/UI-home-colorful-mobile.png inspected. Count-up allowed to finish before screenshots.
- Actual local5000 read-only inspected in a separate temporary tab. Existing Home values matched the previous view; colors/status/project/task rows display. Live screenshot private under /private/tmp/friday-home-ui/live-final.png, no real data committed. Temporary tab closed. No live writes, service restart or database change.

Test iterations: corrected optional icon indexing caught by TypeScript; corrected existing bar CSS override caught by browser; replaced blocked inline test style injection with an existing same-origin stylesheet rule (CSP unchanged). At360px the destination My work is a horizontally scrollable grid: its task cell can be outside the visible viewport, so the mobile Home navigation check asserts URL/filter/matching region text, while desktop verifies the task title is visible. Existing My work/ProjectTasks/TaskWorkspace code belongs to concurrent work and was not edited. This is not a full mobile My work acceptance run.

NOT_RUN: full application/browser regression, real SQL Server2022, Windows and UAT. Existing provider evidence separate. No deployment/commit. Task Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; next formal T-091 High.
