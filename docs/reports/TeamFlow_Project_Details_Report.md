# Project details — owner follow-up, 9 October 2026

Scope: FR-09; T-003 High / T-021 High / T-024 Medium. Actual selected model/effort NOT_VERIFIED. Node 22.23.3; macOS; isolated SQLite and temporary HTTP/Chromium fixtures. Source delivery only.

## Result

### Live localhost repair — 9 October 2026

The initial PASS evidence above/below covered isolated fixtures and the new build, not the still-running user instance. The user subsequently reported missing projects and failing Save. The live browser at `http://127.0.0.1:5000/projects` showed “Invalid server response”; the running process still used the previous API, and its existing local database had migrations only through 0011 with no project metadata columns. The rebuilt frontend therefore rejected old Project responses, and the old request contract could not accept the new fields.

Repaired that exact localhost instance using its original configuration/database: gracefully stopped only the process listening on port 5000, created a private temporary SQLite backup outside the repository, applied only migration 0012 through the application's SQLite adapter, and restarted the current compiled API. Port 43171 / the other agent's process was not stopped. Existing row counts before/after remained projects 3, tasks 13, teams 2, users 4. Legacy project contents were compared before/after migration; tasks/teams/users were also compared after the UI Save, all unchanged.

Actual browser verification PASS: original projects reappeared, existing project Edit showed Internal/Development and its original name/detail/owner, clicking Save with unchanged values closed the dialog and displayed “Saved”, then reload displayed the original projects. The saved project's version incremented exactly once as expected. This verifies live editing; live project creation was not executed to avoid adding a test project to the user's database (isolated create tests remain PASS). Evidence: `reports/project-details/live-repair.json`. Private backup and live screenshot remain outside the repository. A preliminary raw SQLite quick-check could not resolve the app's custom validation function; it made no data change, and migration through the supported adapter succeeded. SQL Server/Windows/UAT remain NOT_RUN.

- Create/edit project now has Project Name (free text ≤100), Project Type dropdown (default Internal), Project Category dropdown (default Development), Project Detail textarea (existing `description` ≤2000), and Owner team dropdown on creation. Team selection uses the existing active-team/permission rules; owner remains immutable when editing.
- Type options: Internal, Client, Operations, Other. Category options: Development, General, IT, Marketing, Finance, HR, Other. Both can be cleared. Values are stored as lowercase enums, independent of task categories.
- API 1.9.0: 85 routes / 112 schemas. Optional create/PATCH fields `project_type` and `project_category`; required Project response fields. Omitted create fields use defaults; omitted PATCH fields retain values. Existing version, permissions, CSRF, replay and atomic audit behavior remains in force.
- Migration 0012 is supplied separately for SQLite and SQL Server. Existing projects receive Internal/Development; other project fields and version are preserved. SQLite populated upgrade/repeat and reconnect persistence executed; native SQL Server NOT_RUN.
- Requirements/SRS/Test Plan/Test Cases and Task Register updated. Full TC/AT execution records remain unchanged. Local subset maps to TC-015/017/023 and AT-07/29; no full acceptance closure.

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| Workspace provider/HTTP/concurrency | PASS 19/19 | `reports/project-details/workspaces-final.log` |
| Schema including populated 0011→0012 upgrade/repeat | PASS 14/14 | `reports/project-details/schema.log` |
| Contract build/check/tests | PASS 85 routes / 112 schemas; 64/64 | `reports/project-details/contract.log` |
| Frontend | PASS 49/49 | `reports/project-details/frontend.log` |
| Chromium workspace flows | PASS 4/4; new screenshot rerun 1/1 | `reports/project-details/browser-final.log`, `browser-screens.log` |
| Test-plan consistency/tests | PASS; 17/17 | `reports/project-details/plan.log` |
| Typecheck / production build | PASS | Typecheck completed before lint; `reports/project-details/build.log` |
| ESLint on changed TS/TSX files | PASS | `npx eslint` focused checks executed, zero errors |
| Whole-repository lint | FAIL, existing unused `b` in `tests/browser/main-table.spec.ts:12` | Unchanged file; two existing fast-refresh warnings also reported |
| Full npm regression | PASS 504/504 (Node 455 + frontend 49); zero failures | `reports/project-details/regression-final.log`; initial migration ledger expectation updated for 0012 |
| Native SQL Server 2022 / Windows / full browser matrix / human UAT | NOT_RUN | SQLite does not satisfy these gates |

Focused coverage includes defaults, enums and DB constraints, Thai/Unicode and multiline text, create/reload/edit, clear versus omit, stale version, immutable owner, denied member operations, idempotent replay/body mismatch, metadata+audit rollback, persisted data after DB reconnect, desktop/360px layout, keyboard focus and Escape restoration. Browser fixtures contain synthetic data only.

Visual QA PASS: `reports/UI-project-details-desktop.png` (1440×900) and `reports/UI-project-details-mobile.png` (360×800), captured with animations disabled and inspected.

Initial workspace tests failed to bind localhost within the sandbox; authorized rerun PASS 19/19. Initial Chromium runner found port 43171 in use; switched to 43239 without stopping another process, final PASS. Raw attempts remain in `reports/project-details/*-initial.log`. Initial typecheck enum-state mismatch was corrected before PASS; whole-repo lint is reported separately, not presented as PASS.

## Collaboration and handoff

An independent `frontend/src/login-design.css` edit was observed and preserved; another commit advanced HEAD from 2d0de9c to 16238be during this work. No changes were made to that file, no reset/commit/push/deploy/DNS/shared-runtime changes or other-agent server shutdown occurred.

Task Register: DONE 7 / total 91 / remaining 84 (IN_PROGRESS 82, IN_REVIEW 1, TODO 1), unchanged. T-021/T-024 remain IN_PROGRESS. Next formal acceptance: T-091 High, native SQL Server 2022/Windows/UAT.
