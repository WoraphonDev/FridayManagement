# T-011 - Authorization / query scoping foundation evidence

2026-10-06 Asia/Bangkok - **IN_PROGRESS**: local permission service and scopes verified; SQL/login/full feature integration pending.

Declared GPT-6.1 Sol / High / Standard; actual runtime settings NOT_VERIFIED. T-007/T-009 remain IN_PROGRESS. SRS5.2/16 authorizes temporary local SQLite implementation, preserving dependencies and required SQL2022 acceptance.

## Implemented

- Effective role precedence Admin, owner-team Lead, explicit project Editor/Viewer. Ordinary team membership, creator, assignee and comment/upload authorship do not independently grant access. Creator/uploader exceptions require effective write permission; owner Lead and independent explicit Editor grants survive the appropriate membership changes.
- Current DB session/user checks on every guarded operation: token hash/user, active, auth_version, absolute/idle cutoffs, current CSRF and forced password. Exceptions exactly me/password/logout/activity; fixed middleware's missing activity exception. Authorization reads never extend idle or create sessions. Trusted T-014 token resolver still required; no body/query identity or fallback account.
- Static parameterized scope builders apply current DB access to project/task rows, grouped counts, literal search, owner-team filters, export projections, own visible notifications and scoped read-one/read-all UPDATE, task/file metadata, manage-only trash and team/directory rows. No fetch-all/private-data post-filtering. Directory minimal IDs/display names excludes private account fields; full team labels/DTO/pagination belong to feature work. A Lead's role remains available to directory after team archive.
- Resource checks hide absent/private/deleted normal tasks and attachment parents. Archived projects remain readable; normal writes denied, Admin/owner Lead task delete/restore exceptions preserved. Task/file restore respects the exact UTC30-day cutoff; uploader/manager deleted-file listing requires current write/active parent/restorable window. Team archive blocks create/unarchive project.
- Guarded HTTP handlers run current authorization and effects in one existing provider transaction; success schema checked before commit, so invalid/sensitive DTOs roll back. Version-bearing feature writes must supply a comparison/lock callback, ordered after current rights and before lifecycle validation; unavailable callback503. This task does not implement all feature versions/business mutations.
- T-010 replay repeats real DB session/permission/resource checks, including cached child/successor visibility; readable archived replay succeeds, new writes fail. No cached content after lost access/session or deleted/purged child. Factories enable no production handlers or timers by import.

## Executed checks

Environment macOS arm64, Node22.23.3/npm10.9.9, actual isolated SQLite files/session/membership rows, ephemeral loopback HTTP and two Node worker processes. No real credentials/users/uploaded files.

| Check | Result | Scope |
| --- | --- | --- |
| Authorization suite | PASS14/14 | 10 provider cases + pure role precedence +2 HTTP +1 deterministic cross-process race |
| Combined regression | PASS213/213 | config37 + foundation5 + schema13 + helpers25 + API12 + idempotency13 + authorization14 + frontend16 + contract61 + planning17 |
| Typecheck/lint/build | PASS | Final source and all new fixtures/workers |
| Contract/test-plan | PASS | Locked52routes/75schemas unchanged; dependency graph/full acceptance preserved |
| SQL harness | SKIP38 / NOT_RUN | 10 new authorization provider cases +28 existing; isolated SQL2022 not configured |
| Diff whitespace | PASS | Current tracked changes |

Role fixtures cover nine accounts (Admin, owner Lead, cross-team Editor, Viewer, team-only, foreign Lead, creator/assignee without access, Lead+Viewer, other Editor). All protected contract operation policies are exercised with internal minimal authorization inputs; this inventory check is not a complete wire-valid business request for every endpoint.

DB scopes prove private rows/counts/search/export/notification messages are absent, team filter uses project ownership, SQL-shaped text and LIKE metacharacters remain literal. Actual inactive/auth-version/expired/revoked session and changed membership rows deny immediately. Archive/deleted/ownership/restore/directory cases run against real rows. Read-all changes only the caller's currently visible notification, preserving hidden/other recipients.

HTTP tests use a synthetic middleware principal and trusted token resolver backed by actual DB sessions. Actual comment/audit/notification/key persistence proves archived replay201/fresh write422, membership404 and revoked session401. Notification list/count and invalid response rollback are actual HTTP/DB integration; forced-password activity204 passes through both middleware and current DB gate. The activity fixture performs no session renewal; T-014 owns that behavior.

Race test has an IPC barrier after write authorization while its SQLite transaction holds the claim/current membership. A separate process attempts revocation, then the writer is released: writer commits one effect set before revocation, and both new-key/replay requests after revocation return404. This proves local transaction ordering, not native SQL lock/deadlock semantics. SQL harness registers equivalent provider cases but the native race/locks/network/plan acceptance is NOT_RUN.

Initial local integration failed because membership SQL/fixture fields did not match the published schema. Corrected to project_members.access/added_by and the actual subtask columns; final suites pass. Final policy review preserved Lead directory access after team archive and added a regression for it. No applied migration or API wire change.

## Traceability / limits

UT-03 and partial TC-007/010/014-023/056/059/062/063/066 plus AT-05/07/08/30 foundations only. Actual password hashing/login/cookie creation, session rotation/renewal, revoke/unassign/audit feature transactions, client polling/clear, production file streaming/CSV/full reports and business controllers are pending their tasks. Minimal version callback test proves ordering/fail-closed behavior, not complete version acceptance.

SQL2022 serializable/key-range/revoke races/deadlock/timeout/native parameterization/plans, Windows/UAT and all full84TC/30AT/20RV/5UAT/4REL remain NOT_RUN; tests/execution-records.json unchanged. SQLite does not close SQL criteria. Default valid protected API remains503 until actual handlers and T-014 resolver are wired. Browser/packaging were not rerun: UI/headers/runtime dependencies unchanged, historical T-009 evidence is not a new result. Scope builders are foundational; all feature filters/pagination/CSV streaming/file bytes still need implementation and end-to-end tests.

**DONE6/77 - IN_PROGRESS6 - TODO65 - remaining71.** Next local T-013 first-run setup, High; full T-007/T-009 dependencies pending, T-012 DONE. No commit/deploy/DNS/server/shared-runtime changes or real data/secrets.
