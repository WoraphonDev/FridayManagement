# Actual Subitem cells and Assign/Status popovers — 10 October 2026

Owner requested application changes after reviewing Subitem and assignment references, with no further mocks. Declared UI T-033/T-044 Medium; actual model/effort NOT_VERIFIED. Node22.23.3, macOS, Playwright1.63 Chromium, temporary synthetic SQLite/browser port43259.

Shared PeoplePicker now opens a searchable member popover from an avatar/text cell, supports selected indicators and Unassigned, and preserves one independent child owner or multiple Task owners. Search uses existing permitted names/job titles/effective roles. Shared StatusPicker and TaskEditor Status open colored options directly from the status cell. No dropdown arrow, Vibe Dropdown or native Status select remains in these controls. Status motion/reduced-motion behavior is retained.

Checklist now presents Subitem / Owner / Status / Remark and + Add subitem. Child status maps only to existing done boolean; new items start incomplete. Existing checkbox, eligible-owner rules, parent completion guard, whole-row autosave, failed-draft preservation, versions/idempotency, deletion confirmation and atomic effects remain. Title and Remark initially align at32px; icon cancellation does not increase row height. Single Owner displays an avatar, eliminating name overflow into Status; the picker shows the full name. Native top-layer popovers retain DOM ancestry inside the dialog/table row, preventing clipping and premature saves. Escape closes the picker before the task dialog, and keyboard selection/focus/viewport positioning are supported.

Final validation:

- Browser20/20 PASS on the final compact-avatar build: boards6, cell picker1, checklist table2, main table1, motion1, My overview2, tasks3 and Vibe integration4. Covers real persistence/reload, role search/no matches/keyboard, owner clear, draft cancel, two-state child completion, desktop/mobile geometry, task completion/recurrence/closed/read-only/offline/version guards, drag/recovery/permissions and motion.
- Frontend49/49 PASS. Build/typecheck/focused lint/full lint/check:contract/check:test-plan PASS. Full lint retains two existing react-refresh warnings in MyOverview and shared/confirm; no errors. Contract remains85 routes/115 schemas, API1.11.0. Test-plan checks confirm inventory only.
- Initial browser run7/9PASS,2FAIL: one assertion used the wrong Task todo label (To do instead of existing Not started), and another measured old Vibe typography markup. Updated assertions retain label and geometry checks; intermediate12/12PASS. Visual inspection then found owner-name overflow; compact avatar correction verified by final20/20PASS. Raw runs remain separate in reports/cell-pickers.
- Read-only localhost5000 GET returns200 and exactly matches the current built frontend. Existing Express static files reflect the new build without a server restart. No real user/task mutation, database migration, deploy/DNS/server-setting/shared-runtime change or commit.

Evidence: [results](reports/cell-pickers/results.json), [final browser log](reports/cell-pickers/browser-release.log), [desktop](reports/UI-subitem-cells-desktop.png), [mobile owner popup](reports/UI-subitem-owner-mobile.png), raw check logs in reports/cell-pickers. Partial trace FR-14/15, SRS §11, TC-025/027/028 and AT-09/10, with existing board/motion regression coverage. No formal full TC/AT sign-off is inferred.

Native SQL2022/Windows/full browser-device matrix/UAT NOT_RUN. Task Register unchanged: DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84. Next formal T-091 High.
