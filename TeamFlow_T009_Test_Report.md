# T-009 — API middleware / validation evidence

2026-10-06 Asia/Bangkok · **IN_PROGRESS**: local middleware verified; real session/ACL/SQL/TLS integration pending

Declared effort High (GPT-6.1 Sol/Standard); actual runtime settings NOT_VERIFIED. T-003 DONE; T-006 IN_PROGRESS. Owner-approved SRS5.2/16 permits local work while SQL unavailable; dependencies and final acceptance criteria unchanged

## Implemented

- All50 API operations use contract-derived route/path/query/body validation; both health routes keep their locked payloads and reject unknown query fields. JSON UTF8/media/syntax/1MiB bounds, no-body commands, canonical positive path IDs, exact query wire, pagination1/50/max100, explicit body allowlists and selective trim preserve password/description input
- Runtime Zod parse boundary delegates exact field rules to the locked JSON Schema validator, preserving Unicode scalar password limits, mandatory UTF16 limits, strict date/timestamp/null/unknown-field rules without coercion/defaulting/stripping. No API schema/version/wire changes
- Exact configured Origin independent of Host/forwarded Host; session/active/forced-password hooks, constant-time CSRF comparison, scoped authorization allowed/hidden404/forbidden403. Hooks/handlers unavailable ->503; no default identity or permissive CORS. Multipart streams remain closed until T-041/T-042; no buffered/fake upload
- Unified Thai safe error envelope/server UUID/no-store; currentVersion for version conflict, Retry-After for busy/rate errors; raw exceptions/paths/passwords never copied to response/log. Logger gets only requestId/code. Unknown error codes fail safely; errors after headers destroy response
- Response schemas validated before JSON serialization, rejecting sensitive/unknown fields at any depth. Existing provider parameter binding tested with SQL-shaped literal text on actual SQLite. CSP excludes inline script/eval; nosniff/frame/referrer headers; HSTS only configured production with trusted secure transport
- Promoted pinned Ajv/ajv-formats from development to runtime dependencies, regenerated lock/license inventory. Fresh-copy checker now counts all suites/frontend cases and verifies omit-dev runtime install/start

## Executed checks

Environment macOS arm64, Node22.23.3/npm10.9.9, temporary SQLite file fixtures and ephemeral HTTP loopback. Synthetic session/authorization callbacks are confined to tests. Browser Playwright1.63.0 / Chromium153.0.8010.12 headless

| Check | Result | Scope |
| --- | --- | --- |
| API suite | PASS12/12 | 10HTTP/pure service-boundary cases + 2validator/SQLite cases; all50 API routes + 2health routes inventoried |
| Combined regression | PASS186/186 | config37 + foundation5 + schema13 + helpers25 + API12 + frontend16 + contract61 + planning17 |
| Browser regression | PASS5/5 | Actual built shell, navigation fixtures, dialog keyboard/focus, mobile200% text, CSP compatibility |
| Typecheck/lint/build | PASS | Current source/tests; final defensive error-code guard API suite/build retested |
| Fresh source | PASS | npmci offline/typecheck/build/all186tests/migration repeat/explicit synthetic seed/built server live200+ready503; omit-dev runtime install/start PASS |
| Contract/test-plan | PASS | 52routes/75schemas; full test inventory/dependency graph unchanged |
| Licenses | PASS | 390packages, missing0; versions unchanged, production scope flags updated |

Fresh-copy evidence [reports/T-009-fresh-checkout.json](reports/T-009-fresh-checkout.json) verifies packaging/runtime before the final defensive uncataloged-error guard; that guard was separately retested on current source. Default npm cache missed wsl-utils; the existing project cache /private/tmp/friday-npm-cache completed offline validation. No new dependency download or shared runtime change

Early checks found a query schema $ref default-resolution bug and a test that treated health/live200 as503. Fixed schema dereferencing and separated health assertions; all affected tests PASS. Final error-code whitelist guard prevents internal programming mistakes from falling into Express HTML/stack errors

## Traceability and limits

UT-01 runtime/HTTP and partial TC-068/069/070/AT-30 evidence only; forged Host/proxy Origin, security headers and HSTS were tested on loopback with synthetic proxy configuration, **not real production HTTPS**. Full TC/AT/SQL2022/Windows/UAT/browser matrix still NOT_RUN; execution-records.json unchanged

No real auth/session expiry/revocation/permissions or protected business handler exists yet; default API remains503 for valid known requests. Session and scoped404 proofs here use synthetic callbacks and cannot close T-011/T-014. Task PATCH merged-state validation must be called on authoritative state inside feature transactions; services/controllers are still pending. Rate/hash limits and upload streaming/reservations belong to their feature tasks; SQL parameterization/native integration NOT_RUN

**DONE6/77 · IN_PROGRESS4 · TODO67 · remaining71**. T-006/T-007/T-008/T-009 remain open. Next local T-010 High under the approved local profile; full dependencies remain pending. No commit/deploy/DNS/server changes, real credentials/data or automatic seed
