# Delivery form UI preview — 2026-11-04

Owner explicitly requested Project and Task fields in the UI first, with API work later.
This overrides the full-stack sequencing for this UI-only preview; it does not resolve
pending business rules, adopt official task IDs or sign off DEL-PROJECT/DEL-TASK.
Declared parent effort: High. Actual runtime model/effort: NOT_VERIFIED.
Node 22.23.3 selected only for task commands; shared runtime unchanged.

## Implemented scope

- Create/Edit Project: grouped delivery setup with explicit finite/ongoing mode,
  objective, preview lead/acceptor names, finite start/target dates or ongoing next
  review, and collapsible acceptance criteria/in-scope/out-of-scope fields.
- Create/Edit Task: explicit single primary-owner draft from the existing scoped
  eligible member response, independent of collaborators; no default assignment.
- Project header/actions remain visible while expanded form content scrolls.
- New fields are in-memory UI drafts only. Clear preview notices and explicit
  discard-and-save confirmation distinguish them from existing server-backed fields.
  Cancelling confirmation preserves drafts and makes no mutation request. Existing
  close/navigation/unload guards include these drafts. Preview controls inherit
  existing disabled/read-only/offline/maintenance behavior.
- Preview names on Project are text for layout review, not validated person IDs or
  authorization. Task ownership does not change assignees. Date order warns only;
  readiness, lifecycle and legacy adoption remain unimplemented.
- No API, migration, persistence, permission grant, dependency, deployment or live
  data changes. No browser storage for private drafts. Failed saves retain drafts.

## Traceability and verification

Direction: D01/D02/D04/D10/D11/D12, C02, proposed DEL-PROJECT/DEL-TASK.
Existing-flow regression: T-032/T-033 and workspace create/edit/access; this does
not close full TC/AT or full-stack delivery acceptance.

- PASS: Node 22.23.3; typecheck; build; lint (zero errors/warnings after helper split).
- PASS: frontend regression 100/100; check:contract 89 routes / 122 schemas unchanged.
- PASS: check:test-plan (plan/evidence inventory only, not production acceptance).
- PASS: final Chromium 13/13 (`delivery-preview.spec.ts`, `tasks.spec.ts`,
  `workspaces.spec.ts`) using runner-created isolated SQLite fixtures and port 43982.
  New tests verify Unicode, mode-specific dates, preview preservation on cancellation,
  exact existing-only Project payload, Task owner independence and exclusion from
  payload, and 360px overflow. Existing regressions cover task fields/checklists/
  recurrence, conflicts/offline/draft recovery, viewer/archive, project CRUD/membership,
  revoke/privacy, mobile Save visibility and team navigation.
- PASS: final `git diff --check`. Test-generated tracked screenshots were restored;
  synthetic preview screenshots remain outside checkout under /private/tmp.
- Visual inspection: Chromium screenshots at 1440px and 360px; Project two-column
  desktop/single-column mobile fields and Task mobile primary-owner draft readable,
  Unicode preserved, no modal horizontal overflow in the targeted assertions.
  Screenshots use synthetic data and are under /private/tmp/friday-delivery-*.png.

Initial browser run: NOT_RUN in sandbox (INSTANCE_GUARD_UNAVAILABLE); permitted
local test run initially FAIL (new labels lacked explicit accessible names; existing
Assignees control is a button, not a combobox; custom fixture path failed runner
teardown naming guard). Added explicit names, corrected the assertion to the actual
control and used runner-generated disposable fixture. Grouped regression then found
Project Save below the mobile viewport (12/13 passed); moved actions to a fixed footer
without weakening the existing viewport assertion. Intermediate build/typecheck caught
an unterminated JSX attribute and possibly-undefined test array access; corrected both.
An inadvertently started browser run against the prior build was interrupted and is
not final evidence. No production data involved.

API persistence/provider integration, full TC/AT, UAT, Linux/Docker acceptance:
NOT_RUN for this change. Pending Q-DEL-* business decisions still apply before
server-side delivery behavior. Official register unchanged: DONE 9 / total 96 /
remaining 87 (IN_PROGRESS 84, IN_REVIEW 1, TODO 2); no task closed.

## Local UI review startup — 2026-11-04

Owner requested running the UI. Started current built application at
http://127.0.0.1:5010 using explicit Node22.23.3 / SQLite local development.
Fresh isolated database outside checkout: /private/tmp/friday-ui-review-20261104;
migrations 0000–0017 PASS. Existing local demo API script completed: 3 projects,
12 tasks, 4 synthetic people. Credentials are not recorded in source/evidence.
Initial sandbox startup/connect failed (INSTANCE_GUARD_UNAVAILABLE / EPERM);
approved local execution succeeded. Browser automatic navigation NOT_COMPLETED:
Chrome connector returned timeoutMs error, native fallback timed out. Supplied
clickable URL for owner review; no claim of visible browser opening or human UAT.
No deploy/DNS/shared-runtime changes; register counts unchanged.

## Task drawer width — 2026-11-04

Owner requested more workspace extending toward the left. Increased Task Create/Edit
right-anchored drawer from min(590px,100vw) to min(960px,100vw). Existing right edge,
full-height internal scrolling/footer and viewport clamp remain in place. Declared
cosmetic effort Low; actual runtime effort NOT_VERIFIED. Build and diff check PASS.
Browser regression: grouped run4/5PASS; task restore toast assertion FAIL although
Trash was empty after restore. Targeted rerun of the same failing test with unchanged
code/assertions PASS1/1. Other four cases include preview isolation, mobile overflow,
conflicts/offline/keyboard and viewer/archive read-only. This is a transient test
failure, not an all-green first run. No API or stored data change; no official task
closed. Local5010 serves rebuilt assets on reload. Official DONE9/96, remaining87.

## Expanded task form layout — 2026-11-04

Owner requested a wider drawer again and controls arranged for the larger workspace.
Declared UI parent T-032/T-033 Medium; actual runtime effort NOT_VERIFIED.
Width now min(1200px,100vw), still anchored right. Task detail form uses two columns
above820px and one below, with Task brief / People & responsibility / Organization &
progress / Schedule sections. Labels,40px controls, alignment, spacing, select/input
borders and focus treatment are scoped to task details; two-up priority/status and
start/end dates on wider screens, stacked on mobile. Details textarea140px desktop /
110px mobile; existing cell popup behavior/checklist styles and API payloads retained.
New ownership still explicitly UI-only, no provider/persistence acceptance.

PASS: typecheck, lint0warnings, build; grouped Chromium6/6 including cell picker,
preview, task edit/save/restore, conflict/offline/keyboard, viewer/archive. Visual review
of1440/960/360px screenshots prompted correcting common-control selector specificity
so textarea uses the intended height. Final focused Chromium2/2 PASS; final1440px/360px screenshots inspected with the intended textarea height and no modal horizontal overflow.
Official DONE9/96 remaining87 unchanged; next delivery API/contracts High.
