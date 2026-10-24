# DEL-UX3 evidence — 2026-10-24

Branch `fix/del-ux3-docs-recovery`, base/HEAD `03cc589246cb7d32d2df98fe2f87e1cc7fee5c2b`; DEL-UX2 merged. Node 22.23.3, disposable SQLite/browser fixtures. Declared effort High; actual runtime model/effort NOT_VERIFIED. Card remains **in_progress**; no commits or deployment.

Changes: title-first modal (200 UTF-16 limit unchanged), blank/cancel makes no record; immutable keyed create replay after uncertain ack. Reuses DEL-UX2 DraftProtection and Stay/explicit Discard. Dirty title/body/checklist retained; pending save locks editing, success uses parsed server ack/sanitized body. Persistent recovery errors retain allowed context; 401/403/404 clear private content, selection, picker/history and create intent. Epoch checks reject late list/open/save/create/delete/restore/history/image responses after revocation. Focus/caret restoration added. Existing sanitizer/tool/conflict assertions retained; new browser cases cover IME, title limit, cancel, mobile keyboard/caret, route/tab/unload, delayed ack and delayed history after revocation. No new coedit/history-restore/approval behavior.

Original implementation RED → GREEN (real executions, before reviewer correction below):

| Command | Result / exit |
| --- | --- |
| `npm run build` (before initial browser attempt) | PASS, exit 0 |
| `FRIDAY_TEST_PORT=43283 npx playwright test tests/browser/delivery-doc-recovery.spec.ts --grep 'title first'` (test authored before component fix) | BLOCKED: 1 launch failure, 0 application scenarios executed; exit 1; **not behavioral RED** |
| `npm run test:frontend` (helper tests before helper implementation) | RED: 3 failed / 50 passed, missing intent/dirty/privacy helpers; exit 1 |
| `npm run test:frontend` (after implementation; final code rerun) | GREEN: 53/53 tests, 14/14 files; exit 0 |
| `npm run typecheck` (final code) | PASS, exit 0 |
| `npm run lint` (final code) | PASS, 0 errors/warnings; exit 0 |
| `npm run build` (final code, before focused browser) | PASS, exit 0 |
| `npm run test:addendum` | PASS, 13/13, 0 skipped; exit 0 |
| `FRIDAY_TEST_PORT=43283 npx playwright test tests/browser/project-docs.spec.ts tests/browser/delivery-doc-recovery.spec.ts` | BLOCKED: 9 launch failures / 0 passed, 0 application scenarios executed; exit 1 |

Browser blocker: macOS sandbox rejects Chromium `bootstrap_check_in … MachPortRendezvousServer … Permission denied (1100)` before page creation. The final focused rerun has the same blocker. Browser behavior, including late-response privacy, keyboard/mobile caret and sanitizer UI regression, is **not verified**; helper RED/GREEN does not replace this acceptance. Re-run the exact focused browser command in an environment permitting Chromium launch. No out-of-scope source change is required to address this environment restriction.

NOT_RUN: full browser suite (including known Calendar failure), contract/test-plan gates (owner excluded), PostgreSQL/Linux/Docker/production/UAT, independent review, remaining viewport/zoom matrix. Tracked `reports/*.png`: none changed. Only the seven allowed paths changed; AGENTS.md/API/server/dependencies/lockfile unchanged. Official Task Register unchanged: completed **9 / 96**, remaining **87**. Next: DEL-UX3 browser verification/review, declared High.

Reviewer correction (declared Medium; runtime NOT_VERIFIED): authored the 422 browser regression **before** the fix: rejected title remains editable with a persistent error, correction sends a new key, and only one corrected doc exists. Browser **NOT_RUN** this round as instructed; expected pre-fix failure is `toBeEditable()` against `unknownCreate=true`, established by inspection only, **not an executed RED**. Parent must run it. Definitive 4xx now clear create intent; non-ApiError/5xx retain uncertain intent. Wrapped transport failures (`ApiError` status 0) and invalid success responses remain uncertain to avoid duplicate creation. Non-ApiError failures now show a persistent generic notice without exposing raw details.

Reviewer gates: `npm run test:frontend` PASS **53/53**, exit 0; `npm run typecheck` initially exit 2 (four possibly-undefined test array accesses), corrected without weakening key assertions; final rerun PASS exit 0. `npm run lint` PASS exit 0 (including final test edit). Build/addendum/browser NOT_RUN this correction round per requested scope. Card remains in_progress; no commits/out-of-scope edits. Official counts remain **9/96 completed, 87 remaining**; next parent browser verification, declared High.
