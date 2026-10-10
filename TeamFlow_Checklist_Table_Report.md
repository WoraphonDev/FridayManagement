# Checklist table and autosave - 9 October 2026

Final owner scope is Checklist | Assign | Remark. Start/End were withdrawn before migration; neither database nor child API includes them. + Add opens the draft row; clicking a name or remark opens inline editing. Leaving the whole row by click or keyboard saves automatically without a Save button. Moving between fields does not save prematurely. Cancel/Escape discards drafts, empty additions never create records, and failed saves retain input. Assign retains immediate persistence. Delete uses a trash icon, accessible full name and confirmation. Desktop fits the drawer; mobile scrolls internally.

Declared T-033 Medium and T-003/T-008/T-028 High; actual model/effort NOT_VERIFIED. Node22.23.3, Playwright1.63, macOS Chromium; synthetic temporary SQLite/browser port43239. Preserve current rights, eligible independent assignee, completion guard, parent/child versions, POST idempotency and atomic audit/notifications. Remark preserves plain text/whitespace, max2000 UTF16 units; omitted PATCH retains text, empty clears it. Recurrence copies remark as checklist instructions and resets completion. Activity shows remark from existing structured before/after events.

## Validation

- npm test PASS511: Node462 + frontend49. Includes66 contract and17 test-plan policy assertions; those are subsets. The first sandbox run could not bind loopback for config tests (EPERM); approved isolated rerun passed all suites.
- Focused SQLite/schema/contract run90/90 PASS. New migration test preserves legacy checklist IDs/titles/assignee/completion/versions, parent versions and history; validates Unicode capacity, null rejection and repeat upgrade. API tests cover omission/clear, Unicode/whitespace, rejection with unchanged state, audit contents, recurrence and failed-audit rollback.
- Browser11 distinct scenarios PASS across runs: initial10/11, corrected2/2, final desktop/mobile2/2. Initial failure occurred after reload because the test did not reopen the drawer; stored title/remark were already confirmed by API. Corrected scenario reopens the task and checks saved values, cancel/version, completion, mobile icon deletion and persistence. Second scenario verifies empty additions, one failed POST with preserved inputs, successful retry without duplicates, keyboard autosave and Escape cancel. Other cases cover task lifecycle/permissions, all sub-tabs, Vibe assignment/integration and side-panel stability. This is not a single final11/11 batch or full UAT.
- Build/typecheck/check:contract PASS; API1.11.0 retains85 routes/115 schemas. Full lint PASS with two existing react-refresh warnings in MyOverview and shared/confirm.

## Existing local data

Before changing local5000, confirmed process identity/path/port, stopped it gracefully and made a SQLite backup outside the repository. Applied only0014_checklist_remark.sql. Compared hashes of every legacy column in all33 business/runtime tables (256 rows) before restart: unchanged. New remark defaults empty. Local readiness PASS. Authenticated existing Task4 was inspected read-only; + Add/empty Escape inspected without a mutation. Private backup, hashes and real-data screenshot remain in private tmp; repository evidence contains synthetic fixtures only. Concurrent Claude board files and other server processes were not modified or stopped.

Provider-specific SQLServer2022 migration and shared provider tests are supplied; native SQL execution, Windows and owner UAT remain NOT_RUN. This SQLite result does not close those criteria. Parent task statuses/dependencies stay unchanged: DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84. Next formal task T-091 High.

Evidence: [results](reports/checklist-table/results.json), [latest browser cases](reports/checklist-table/browser-cases.json), raw run logs in reports/checklist-table, synthetic [desktop](reports/UI-checklist-table-desktop.png) / [mobile](reports/UI-checklist-table-mobile.png).
