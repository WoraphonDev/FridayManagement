# Batch T-015–T-018 — local verification

2026-10-06 Asia/Bangkok — **IN_PROGRESS** (four local scopes implemented and verified; required native provider/dependency/full acceptance not closed).
Declared T-015/T-016 GPT-6.1 Sol / High, T-017/T-018 Medium / Standard. Actual runtime settings **NOT_VERIFIED**; no model/effort/runtime change claimed. Owner authorized building four tasks before final batch tests, then repairing failures and retesting affected work. Node22.23.3/npm10.9.9, temporary SQLite; Chromium153/local HTTP. Source remains uncommitted/unpushed/unmerged.

## Implemented behavior

- T-015: own current password verification, new12–128 Unicode scalars/no trim; password version/audit update and token/CSRF rotation, all other sessions revoked, original absolute lifetime retained. Forced accounts only me/password/logout/activity. Admin reset confirms actor password and expected target version, revokes sessions, sets forced flag, never returns a password. Hash/verify outside business transaction; current auth/hash snapshot rechecked before commit. User-scoped credential attempts persist10/15min; cookie effects only after confirmed commit. Unknown commit returns503 without credential replay/cookie; authoritative fresh login tested.
- T-016: safe Admin list with literal bound search/active/page and no secret/auth-version columns; case-insensitive immutable username, create defaults member/active/forced, expected-version edits, soft deactivation/reactivation. Current role checks and last-active-Admin guard in provider transaction; separate SQLite processes concurrent demote/demote and deactivate/demote leave one active Admin. No-op leaves timestamp/version/audit/session unchanged. Deactivate unassigns every unfinished task including archived/deleted; Admin demote retains ownerLead/explicitEditor, removes viewer-only/private assignment. Done/history/creator retained, reactivation does not reassume tasks. task version/event, notifications to active Admin/ownerLead excluding actor, scoped revisions and redacted user audit atomic; rollback tested. Native SQL and future cleanup/recurrence integration remain pending.
- T-017: actual login/show-password/429 and session-expiry screens, forced password/errors, read-only locked-contract profile, own-password/logout. No password/session/draft browser storage. Visible polling GET me does not renew idle; trusted intentional keyboard/pointer activity throttled15s and POSTs Origin/CSRF. Revocation clears auth/navigation/drafts; cross-tab logout uses only event strings. Request generation prevents stale in-flight Self from restoring logged-out state.
- T-018: actual Admin create/edit/name/role/active/reset dialogs identify target and confirm; temp password Admin-entered/masked/no default, reset requires Admin password. List/search/page, safe stale409 review/load-latest/no automatic credential replay, last-Admin reason, offline/pending guard, native modal keyboard/return focus and mobile360px/200% reflow verified. No member privileged menu/API exposure.

## Final executed checks

| Check | Result |
|---|---|
| accounts SQLite provider + HTTP + two-process concurrency | PASS19/19 (provider13 + HTTP4 + concurrency2) |
| npm test, all suites including previous regression | PASS273/273 (Node252 + frontend21) |
| Chromium actual auth/Admin cases + previous browser regression | PASS14/14 (new5 + previous9) |
| typecheck / lint / build | PASS |
| check:contract / test:contract | PASS52 routes75 schemas /61 contract tests (included above); wire contract unchanged |
| check:test-plan / test:test-plan | PASS plan validation /17 planning tests (included above), not full business acceptance |
| SQL Server2022 | NOT_RUN:69SKIP, including13 new provider cases; no native integration configured |
| fresh source/runtime install | PASS: offline ci/typecheck/build273 tests, migrations repeat-no-op, explicit sample fixture, omit-dev runtime/live200/ready503/meta setupRequired true/me401/generic login401; reports/T-018-fresh-checkout.json |

First batch had one fixture failure from changing done status with an existing board-position composite FK. Fixture now removes/reinserts matching position within its transaction; no applied migration edited. Initial browser11/14 found dialog focus and rate-limit pending-label issues plus an obsolete foundation notice assertion; fixed and final14/14 rerun. New stylesheet integrated into existing imported file. Initial lint purity error/dependency warnings repaired; final lint clean. Prior report hashes/results are historical and retained. Counts/source fingerprints are in [reports/T-015-018-batch-results.json](reports/T-015-018-batch-results.json); raw credential-bearing test output/screenshots are not attached.

## Traceability and acceptance boundary

Partial UT-04, TC-003/004/005/006/007/008/009/010/011/012/021 and AT-02/03/04 evidence. Actual HTTP forced gate used a minimal fixture task handler; future real task/business APIs were not claimed complete. Profile is read-only because the locked contract has GET me and no PATCH me. SQL statements/fixtures remain provider-specific; native69SKIP is NOT_RUN, not PASS. T-016 remains IN_PROGRESS until T-022/T-027 cleanup/recurrence dependencies and required SQL integration are verified; T-017/T-018 remain IN_PROGRESS for full task/UI integration, native acceptance and T-068 matrix. Full TC/AT records in tests/execution-records.json unchanged. ActualHTTPS/Windows/full browser matrix/UAT/backup-restore NOT_RUN. Existing readiness503/production startup refusal retained; no deploy/DNS/server/shared runtime changes.

Task Register: **DONE6/77, IN_PROGRESS12, TODO59, remaining71**. This batch local implemented/verified **4/4**; full acceptance still pending. Next local batch T-019/T-020/T-021/T-022, all declared **High**, runtime settings NOT_VERIFIED.
