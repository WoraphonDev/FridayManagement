# Team details UX - 9 October 2026

Owner requested click-to-open team cards with Team info, Members grid and Workload tabs. Declared T-023/T-088 Medium; actual model/effort NOT_VERIFIED. Trace: FR-06/07/08/50, partial TC-013/015/023/073/095 and AT-06/07/18/26/37. Requirements, SRS and test documents updated; parent acceptance remains IN_PROGRESS.

Implemented one team details route from both Teams and Admin Teams. Cards support clicking their body or keyboard-activating their title. URL preserves the selected team/tab through reload. Tabs support Arrow/Home/End navigation. Team info contains name, multiline description, status, position summary and scoped Edit/Archive controls. Members is a compact semantic table grid; Add/Edit opens a small form instead of displaying the form below the table. Position and Team access are separate. Review & Save opens confirmation; Save is blue, Cancel gray, Remove red. Remove stays in a small row menu and requires confirmation. The existing project member flow is retained. Member grid has its own refresh; offline/maintenance/pending/version/archived guards remain.

Preserved the existing API privacy rule: only Admin receives the team member list. Non-Admin sees an explicit restriction, without misleading zero member/position counts. Team info remains scoped to visible teams. Workload retains Admin/team Lead/member P-09 authorization; a Lead position with member access does not enable it. Refresh after membership removal hides the revoked team and its data. No API contract, database schema, migration or permission expansion was needed.

Validation on Node22 with isolated SQLite and real HTTP/Chromium fixtures:

- Production build, typecheck and focused ESLint: PASS.
- Frontend unit/SSR: 49/49 PASS.
- Final affected browser subset: 5/5 PASS (account/team positions, project/team archive guard, Lead/member confirmation, info edit conflict/review and persisted reload, navigation/keyboard/mobile, privacy/workload 403/revocation).
- Final privacy guard rerun: 1/1 PASS; current non-Admin role hides cached member data immediately while the scoped team refresh completes.
- Final visual rerun after tightening row spacing and waiting for tab state before screenshots: 1/1 PASS.
- All 13 distinct scenarios in accounts/workspaces/workload-overview have passing evidence across focused runs. Initial combined run: 9 PASS / 4 FAIL; failures were stale list selectors during navigation, changed read-only text, expecting a table for an empty workload, and navigating before password-change completion. Recheck: 3 PASS / 1 FAIL exposed non-Admin membership omission; UI was corrected to describe the existing restriction and the final subset passed. No full testcase sign-off is inferred.
- Test plan check and 17/17 plan-policy tests: PASS. These verify the plan only.
- Desktop and 360px: no page overflow; the member grid scrolls internally. Team info and member editor fit mobile. Cancellation leaves the persisted position unchanged. Position changes save/reload without changing Team access. Version conflict preserves the info draft until explicit review.

Synthetic screenshots: `reports/UI-team-tabs-info-desktop.png`, `reports/UI-team-tabs-members-desktop.png`, `reports/UI-team-tabs-workload-desktop.png`, `reports/UI-team-tabs-info-mobile.png`, `reports/UI-team-tabs-members-mobile.png`. Visual inspection performed; final tab screenshots wait for the selected-tab state.

Actual local 5000 read-only verification: existing Digital Experience team info, four original members/positions/access and populated workload are visible in the three tabs. User data screenshots remain private under `/private/tmp/friday-team-tabs`; no live membership/permission/data write was made for this UX check. Existing backend runtime/database and Claude's port43171 were preserved. No deployment, commit or unrelated ProjectTasks/TaskWorkspace edit was performed.

SQL Server2022, Windows, supported browser matrix and owner UAT: NOT_RUN. Local results do not satisfy those criteria. API/schema/service regression suite was not rerun because this follow-up changes presentation/navigation only. Global lint's known unrelated main-table unused variable remains outside this change; focused lint passes.

Task Register: DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84. Next formal task T-091 High requires real SQL2022/Windows/UAT.

## Stable tabs follow-up - 9 October 2026

Owner reported the page bouncing when selecting tabs. Root cause: App's whole-page opacity/6px slide effect depended on both pathname and query string; team tab URL changes replayed it on the entire Page content. Changed that effect to pathname only, preserving main navigation animation and all motion preferences. Keyboard team tab focus uses preventScroll. Requirements AN-01 amended to the owner's correction; no permission/API/data change. Declared T-023/T-089 Medium; actual model/effort NOT_VERIFIED.

Browser3/3 PASS: actual animation calls observed at 1280px and 360px; repeated Team info/Members/Workload clicks and keyboard Home produce zero whole-page animations, constant tab-bar x/y (<0.5px tolerance) and scrollY0 with focus retained. Main-page navigation still produces one entrance animation. Original status pulse/confetti, non-blocking controls, per-user reduced motion and OS reduced motion regression passes. Typecheck/build/focused lint PASS; no broad unrelated tests rerun. Plan check/17 policy checks PASS (plan only). Live5000 read-only verification in a separate tab: tab-bar x240/y308.9453125 identical before/after selection; original user Add member form left untouched. Screenshot private /private/tmp/friday-team-tabs/stable-live.png. No live writes, deployment, commit or Claude runtime change.

Evidence: reports/team-details-ux/stable-results.json and stable-browser.log. DONE7/91, remaining84; parent tasks unchanged; SQL2022/Windows/UAT NOT_RUN. Next formal T-091 High.
