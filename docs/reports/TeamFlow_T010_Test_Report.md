# T-010 - Idempotency foundation evidence

2026-10-06 Asia/Bangkok - **IN_PROGRESS**: local engine verified; real SQL/auth/features/scheduler pending.

Declared GPT-6.1 Sol / High / Standard; actual runtime settings NOT_VERIFIED. T-007/T-009/T-008 remain IN_PROGRESS. Owner-approved SRS5.2/16 permits SQLite local work without closing dependencies or SQL acceptance.

## Result

- Claims scoped by authenticated user + uppercase method + canonical concrete path (including resource ID) + lowercase UUID. Validated normalized JSON uses recursive sorted object keys, preserved array order and explicit create defaults before SHA256; null/omitted remain different outside defined defaults.
- Cache contains only schema-checked successful status/business JSON. Credential commands are rejected before hashing/storage; no cookies, CSRF, requestId headers, extra response fields or raw upload bytes. Upload helper accepts strict validated metadata/fingerprint only; stream validation/reservations remain T-041/T-042 work.
- SQLite BEGIN IMMEDIATE and SQL SERIALIZABLE UPDLOCK/HOLDLOCK key-range query claim within the same transaction as feature mutation, audit, notification and result. No process-memory claim authority. Confirmed rollback retries follow T-008 policy; unknown outcome returns503/Retry-After5 and same-key retry reads committed result.
- Mandatory transaction-bound access callback runs before cached replay/hash conflict or new mutation. Readable archive replay allowed by the feature guard; deleted/lost access/denied rights prevent replay. Callback gets a copy of the cached DTO. HTTP adapter passes the existing transaction to handlers; required-key handlers cannot execute without the engine.
- TTL stamped after successful business work at transaction finalization, immediately before result insert/commit; expiry24h, exact cutoff expires. Failed expired-key replacement restores old result. Physical SQL commit timing/lock behavior still NOT_RUN. Bounded cleanup (default100/max1000) deletes only expired entries; factory starts no timers, T-050 will wire the scheduler.

## Executed checks

Environment macOS arm64, Node22.23.3/npm10.9.9, actual temporary SQLite files, ephemeral HTTP loopback and three synchronized Node processes. Fixtures use synthetic identity/permission policy and test data. No real authentication or protected business controller is shipped by this task.

| Check | Result | Evidence scope |
| --- | --- | --- |
| Idempotency suite | PASS13/13 | 10 provider cases + canonical JSON + actual HTTP/SQLite hook + synchronized three-process concurrency |
| Combined regression | PASS199/199 | config37 + foundation5 + schema13 + helpers25 + API12 + idempotency13 + frontend16 + contract61 + planning17 |
| Typecheck/lint/build | PASS | Final engine, middleware, worker and provider harness |
| Contract / test-plan checks | PASS | Wire/schema unchanged; dependency graph and full acceptance unchanged |
| SQL harness | SKIP28 / NOT_RUN | 10 new idempotency provider cases +18 existing; isolated SQL2022 not configured |
| Diff whitespace | PASS | Current tracked changes |

Actual SQLite evidence: reopen replay, UUID case, user/concrete-path isolation, different-body409; archive/deleted state; TTL boundary/long mutation; effect failure, sensitive output and cache-write failure roll back all four tables; concurrent same/different payloads; bounded expiry cleanup. Three workers start through an IPC barrier, hold the first mutation100ms, and return identical201 results with exactly one comment/event/notification/key.

HTTP evidence: missing engine503; replay same business payload with fresh server requestId/no Set-Cookie;409 mismatch; synthetic permission404; actual inactive-user row denied401 by the injected transaction guard. This is foundation integration, not T-011/T-014 session/ACL acceptance. Simulated loss of commit acknowledgement occurs after an actual SQLite commit: first response503, retry201, no duplicate effects. It does not simulate a real SQL network failure. Upload metadata fixture proves normalization/rejection/persistence privacy only; it creates no attachment or real file.

Initial checks exposed a double-close in the process fixture and overly narrow inferred UUID type in its helper. Both fixtures corrected; final13/13 and typecheck PASS. No change to shared Node runtime or SQLite adapter was required.

## Traceability and remaining work

UT-09 exercised; partial transaction/idempotency groundwork for TC-031/033/041/050 and AT-12/17/21. Recurrence, board move, real comments/UI, uploads and complete cases still NOT_RUN. All full84TC/30AT/20RV/5UAT/4REL and SQL2022/Windows/UAT remain NOT_RUN; tests/execution-records.json unchanged.

Real current session/auth-version/forced-password/ACL and cached child-resource visibility checks must be wired by T-011/T-014 and each feature service inside the transaction. Existing protected API defaults503 until those handlers are ready. Scheduler wiring/retention monitoring remains T-050/T-060. No browser retest or fresh dependency install: UI/security headers/dependency versions unchanged; T-009 packaging/browser evidence is historical, not a new T-010 result.

**DONE6/77 - IN_PROGRESS5 - TODO66 - remaining71.** Next local T-011 High; full T-007/T-009 sign-off remains pending. No commit/deploy/DNS/server changes, real credentials/data, uploads or automatic seed.
