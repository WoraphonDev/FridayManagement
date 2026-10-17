# TeamFlow UI Audit — 17–18 October 2026 (PostgreSQL)

Follow-up to `TeamFlow_UI_Audit_2026-10-09.md`, covering items that round left unchecked: mobile 375px, dark mode, Trash and the project tabs. Declared Medium; actual model/effort NOT_VERIFIED (run by Claude Opus 5.5). This is local automated evidence only. It is not AT/UAT or owner visual sign-off.

## Environment

- Build `npm run build` at commit 2fd7f13. The API served `dist/frontend` on 127.0.0.1:3100.
- PostgreSQL 17.11 (Docker `friday-pg`), isolated database `friday_audit`; demo data from `scripts/demo-data.mjs` (3 projects, one archived; 12 tasks; 4 people).
- Playwright Chromium, locale th-TH, Asia/Bangkok, viewports 1440×900 and 375×812.
- Pages: 10 main routes plus 8 project tabs per viewport (36 captures). Screenshots and metrics: `reports/ui-audit-2026-10-17/` (`results.json`).
- Automated checks: page-level horizontal overflow, elements extending past the viewport, controls smaller than 24×24 px, console errors.

## Result summary

- Page-level horizontal scroll: none at either viewport. Blocks that scroll inside their own container are listed below.
- Console errors: one expected 401 from `/api/me` before sign-in. No page errors.
- The 10-09 round-2 finding (project tabs flush left) no longer reproduces: on desktop, project tab content is padded like the other pages.

## Findings

| # | Area | Severity | Finding | Suggestion |
|---|---|---|---|---|
| 1 | Work calendar, mobile | M | The month grid keeps 7 fixed columns, so 375px shows only Mon–Wed. Users must scroll sideways inside the grid to see the rest of the week. | Default to week/agenda (list by day) below ~600px. Keep month view for wider screens. |
| 2 | Project tab bar, mobile | M | 11 tabs in one row; the 4th is clipped ("Ca…") and nothing indicates more tabs. | Add an edge fade/scroll hint, or collapse to a "View: Kanban ▾" select on mobile. |
| 3 | Tables, mobile (project Main table, My work, Admin users, Workload) | M | Columns past Status/Role sit off-screen inside a scroll container. Owner, dates and role are not visible without sideways scrolling. | Use stacked card rows on mobile, or pin a compact column set with a "more" disclosure. |
| 4 | Touch targets | M | Controls under 24×24 px: Kanban mobile 50, project Calendar 27, Work calendar 21, Main table 19, Home/Settings 10–11. Mostly card "⋯" menus, drag handles and calendar chips. | Raise hit areas to ≥24px (WCAG 2.2 SC 2.5.8) and ~44px for primary mobile actions. Visual size can stay. |
| 5 | Project page, desktop | L | The tab bar and toolbar card start 12px left of the page title (228 vs 240 px), so the header and the tab row don't line up. | Use the same horizontal padding token for the header block and the tab/toolbar row. |
| 6 | Gantt | L | Short bars (1–2 days) show no label. The task name appears only in the left column. | Show the label outside a bar that is too narrow, or as a tooltip on hover/focus. |
| 7 | Sign-in | L | The app requests `/api/me` before login and gets a 401, which logs a console error. | Treat 401 as the expected signed-out state without a failed-resource log, e.g. a probe that returns 200 with `authenticated:false`, only if the contract allows. Otherwise accept the 401 as noise. |
| 8 | Dark mode | Info | Not implemented: no `prefers-color-scheme` or theme switch in the frontend. Requirements/SRS do not require it. | Owner decision; out of scope unless added to Requirements. |

Checked without findings: Trash (empty state, 30-day notice, restore-only), Home mobile cards, Projects/Teams/Reports/Notifications/Settings at both viewports. Kanban columns scroll sideways on mobile by design.

## Fix status (2026-10-18)

Changes: `frontend/src/responsive-fixes.css` (loaded last), `frontend/src/TaskViews.tsx` (calendar day list ≤600px, Gantt outside labels), and `tests/browser/work-calendar-visual.spec.ts` (360px now expects the day list instead of the scrolling grid). Screenshots in `reports/ui-audit-2026-10-17/` show the state after the fixes.

| # | Status | Verification |
|---|---|---|
| 1 | Fixed | 375px calendar renders "Calendar month by day" list; no sideways grid. |
| 2 | Fixed | Tab row snaps per tab; right-edge shadow while more tabs remain. |
| 3 | Mitigated | Tables fade at the right edge; the fade clears at scroll end where scroll-driven animations are supported. Card layout was not adopted because it would change the owner-approved Main table design. |
| 4 | Fixed on mobile | Controls under 24px: 0 on all mobile pages except Home (10) and project Overview (7), which are text links (`<a>`) outside this rule. Desktop unchanged (pointer input). |
| 5 | Fixed | Project title, tab row and toolbar share x=228 at 1440px. |
| 6 | Fixed | Bars too short for text show the title beside them. |
| 7 | Not changed | Would need an API contract change; left as expected 401. |
| 8 | Not changed | Owner decision. |

Checks: frontend typecheck/lint/prettier PASS; vitest 50/50 PASS; Playwright Chromium 93/93 PASS on local SQLite (one test first failed with `INSTANCE_GUARD_UNAVAILABLE` because the audit server was still running; it passed when rerun alone after stopping that server); audit rerun on PostgreSQL `friday_audit`: no page-level overflow, no new console errors.

## Not covered

Interaction flows (create/edit/drag) were not exercised, only rendering. Screen reader, keyboard order, colour contrast and 200% zoom were not tested. No real devices (Chromium emulation only). No owner visual sign-off.
