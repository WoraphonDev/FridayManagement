# Team / Member details — owner request, 9 October 2026

Declared effort: T-016/T-020 High; T-018/T-023 Medium; T-003 contract/schema High. Actual model/effort NOT_VERIFIED. Trace: FR-03/06–08; partial TC-007/012/013/014/015 and AT-03/04/05/06. This report supplements existing account/team evidence; it does not close full task/provider acceptance.

Team forms now contain Team Name, Team Description and initial Add Member rows with PM/Lead/Dev positions. Initial memberships use permission member regardless of position; team/member/audit writes are atomic. Existing team Members action supports position editing independently from permission role. Member create/edit supports Member Name, optional Email/Tel., existing Admin/Member role and an active Team selector. Selecting a team adds it as member/Dev without deleting or changing existing memberships. Removal and position changes stay under Teams → Members. Contact-only edits retain sessions. Directory and project Person DTOs omit contact fields; no email delivery was added.

API 1.10.0 has 85 routes / 115 schemas. Migration 0013 has separate SQLite and SQL Server files. Existing account credentials/roles/versions and membership permission roles remain intact; contacts default empty, legacy permission Lead gets position Lead and other members get Dev. SQL Server migration execution is NOT_RUN.

| Check | Result | Evidence |
|---|---|---|
| Accounts / additive membership / contacts / session preservation / rollback | PASS 20/20 | reports/team-member-details/accounts.log |
| Workspaces / atomic initial members / positions never grant Lead access | PASS 20/20 | reports/team-member-details/workspaces.log |
| Schema / populated 0013 upgrade and repeat | PASS 15/15 | reports/team-member-details/schema.log |
| Full npm regression | PASS 507/507 (Node 458 + frontend 49; includes contract 64 and planning 17) | reports/team-member-details/regression.log |
| Browser accounts/workspaces | PASS final 10/10: initial run 9/10, corrected new-test selectors then focused scenario PASS | reports/team-member-details/browser-initial.log; browser-final.log |
| Typecheck / production build / focused lint / contract generation/check / test-plan check | PASS | reports/team-member-details/build.log; lint-focused.log; plan.log; results.json |
| Whole-repository lint | FAIL: pre-existing unused `b` in tests/browser/main-table.spec.ts:12; two existing fast-refresh warnings | reports/team-member-details/lint-global.log |
| Desktop and 360px visual inspection | PASS | reports/UI-team-details-{desktop,mobile}.png; reports/UI-member-details-{desktop,mobile}.png |
| SQL Server 2022 / Windows / full browser-device matrix / UAT | NOT_RUN | Provider-specific acceptance remains open |

The new browser scenario creates a synthetic team and member, saves/reloads contact/team data, edits Email, changes only the team position to Lead while permission stays member, and checks both forms at 360px including an Add Member row. Earlier failures were test selectors (Admin tab role and nested-label dropdown selection); corrected to accessible tab/combobox roles. The nine existing account/workspace flows passed unchanged apart from the requested field labels. No real user contacts/passwords/database backups are in repository evidence.

## Live localhost verification

Preserved the actual port5000 configuration/database, made a private backup outside the repository, applied only 0013 and restarted port5000 with the current build. The other agent's port43171 stayed untouched. Compared every legacy business-table column and row count immediately after migration: unchanged. Live data had 3 projects, 14 tasks, 2 teams, 4 users and 6 team memberships at this run; the prior project repair had 13 tasks, so preservation uses this run's fresh snapshot.

Actual Member Confirm showed `User saved`; actual existing Team Save succeeded (version +1), and reload retained existing data. Post-UI checks confirmed users, memberships, permission grants, projects, tasks and team content unchanged (team version/timestamp excluded for the legitimate Save). Position/permission columns were checked in the existing team dialog. Live creation/contact-value changes are NOT_RUN to avoid adding invented data; isolated browser fixtures cover those writes. Evidence: reports/team-member-details/live-repair.json; screenshots and database backup stay private under /private/tmp/friday-team-member-live-repair.

Task Register: DONE 7/91, remaining 84 (IN_PROGRESS 82, IN_REVIEW 1, TODO 1), unchanged. T-016/T-018/T-020/T-023 remain IN_PROGRESS. Next formal acceptance: T-091 High (native SQL Server 2022 / Windows / UAT).
