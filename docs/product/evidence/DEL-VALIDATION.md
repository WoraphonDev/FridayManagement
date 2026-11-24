# DEL-VALIDATION evidence — 2026-11-24

Base `8b55cd9` (main), branch `feat/del-validation`, Node 22, SQLite local fixture, Chromium. Declared effort Medium; runtime NOT_VERIFIED. Uncommitted at time of recording.

## Server authority read (unchanged)
- `contracts/validate.mjs`: `maxLength` counts scalars and `x-utf16MaxLength` counts UTF-16 units; every covered field has both equal, so UTF-16 units are binding.
- `src/api/contract.ts` `requestBody`: trims only top-level `title`/`name`/`display_name`/`category` before validating. Descriptions/remarks are not trimmed.
- `Password`: scalar `minLength 6 / maxLength 128`, no UTF-16 bound, no trim.
- DB CHECKs and response schemas mirror the same limits, so stored over-limit text cannot be served. The realistic legacy case is stored content at the limit (or with padding the server trims).

## Implementation
- `frontend/src/text-length.ts`: `textLength` (UTF-16, optional trim), `passwordLength` (scalars), `limitText` (replaces HTML `maxLength`; limits only inserted text at grapheme boundaries; passes through mid-composition; never shortens existing text; trim-aware), `lengthHint`/`lengthError`, `FieldErrorSummary` (links focus the field; draft untouched).
- Workspaces entity dialog, TaskEditor (title/details/category + checklist inputs), ProjectDocs titles, Users (name/email/tel, password hint with its own scalar count), AdminCenter job title: `maxLength` replaced by `limitText`, count helper text, over-limit summary. No server, contract or limit changes.

## Commands and results
| Command | Result |
|---|---|
| `npx vitest run frontend/src/delivery-validation.test.ts` before helper existed | RED (module missing); later trim-padding case RED before trim option, then GREEN **16/16** |
| `node --test tests/contracts/delivery-validation.test.mjs` | **3/3** (characterization guard of locked limits; passes by design) |
| `npm run typecheck` / `npm run lint` / `npm run build` | exit 0 / 0 / 0 |
| `npm run check:contract` | PASS, 89 routes / 122 schemas |
| `npm run test:contract` | **71/71** |
| `npm run test:frontend` | **116/116**, 17 files |
| `npm run check:test-plan` / `npm run test:test-plan` | PASS / **18/18** |
| `npx playwright test tests/browser/delivery-validation.spec.ts` (`FRIDAY_TEST_PORT=43994`) | **3/3**, two consecutive runs. Its first run exposed a trim-padding parity gap, which was fixed in the implementation |
| Affected suites: delivery-validation, workspaces, tasks, delivery-drafts, delivery-doc-recovery, project-docs, accounts, checklist-table, management-visual, delivery-access-nav | **73 passed / 3 failed**. One failure was the new spec's flaky Home-key step, since replaced and passing 3/3. Two `accounts.spec.ts` failures (:83 confirm-dialog intercept, :286 reset alert) **reproduce on unchanged base `8b55cd9`** in a temporary worktree, so they are pre-existing |
| `npx playwright test tests/browser/delivery-focus-mobile.spec.ts` | **14/14** |

Existing assertion `delivery-doc-recovery` (`'x'.repeat(201)` → 200) is kept and passes. No existing assertion was weakened. Generated `reports/` PNGs restored; `test-results/` deleted.

## NOT_RUN / remaining
Real PostgreSQL (`RUN_POSTGRES_TESTS=1`), full `npm test`, other browsers, Linux/Docker, production and UAT are **NOT_RUN** and are carried by Task Register T-091. Real OS IME is simulated with composition events, not a human IME. Browser RED against the base was not executed. Independent review is pending. Official register: 9/96 completed, 87 remaining.
