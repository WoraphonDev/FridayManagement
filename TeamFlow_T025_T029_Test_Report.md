# T-025–T-029 — Organization, tasks, checklist and recurrence batch

วันที่: 6 ตุลาคม 2026 · macOS · Node22.23.3/npm10.9.9 · temporary SQLite

เจ้าของสั่งทำ5งานแล้วทดสอบรวมท้ายชุด. Declared effort: T-025 **Medium**, T-026/T-027/T-028/T-029 **High**; actual model/effort **NOT_VERIFIED**. Local implementation/verification **5/5**; ทุกงาน **IN_PROGRESS** ตาม SRS5.2 เพราะ SQL2022/full feature acceptance ยังไม่ครบ. Task Register: **DONE6/77, IN_PROGRESS23, TODO48, remaining71**.

## ผลลัพธ์

- Authenticated organization GET/Admin-only PATCH, trimmed UTF16≤100/version/audit; timezoneAsia/Bangkok fixed. Settings/Member read-only/sidebar, explicit conflict review retaining draft, offline guard and actual startup restart persistence. Public meta remains only setupRequired/version.
- Task POST/GET/PATCH uses locked DTOs, merged-state validation, nullable dates/assignee, current active effective write access, immutable project, expected version409, initial todo/medium, atomic board position/event. No writes to archived project/team or deleted task.
- All12 transitions, completed_at/reopen/assignee cleanup, incomplete checklist422, done→done no mutation. Status changes append target and renumber affected columns; recurrence appends todo and increments each affected column once. Checklist CRUD increments child/parent versions; done parent blocks adding/unticking; ticking all never auto-completes. DELETE child returns200 `{item:Task}` per unchanged contract.
- Daily/weekly/monthly next dates preserve offset/anchor; Jan31→Feb28/29→Mar31, editing current due resets anchor. Successor todo/version1 has checklist titles done=false and only eligible assignee. Comments/attachment metadata/source activity are not cloned. One recurrence event/source survives simulated successor purge; reopen/recomplete and key replay across actual HTTP/database restart cannot duplicate. No overdue catch-up.
- Assignment/status notifications and task activity share the mutation transaction and current recipient access; no self notification. Account/membership cleanup exercised with actual task/status/recurrence services, preserving done history and removing invalid unfinished assignees.

## Checks

| Check | Result | Scope |
|---|---|---|
| typecheck / lint / build | PASS | Server/frontend/tools; lint0 warnings |
| check:contract / test:contract | PASS | 52routes/75schemas unchanged;61 tests included in combined |
| build:test-plan / check:test-plan / test:test-plan | PASS | Inventories/policy only;17 tests included in combined |
| test:tasks | PASS26/26 | Provider18 + real HTTP4 + two-process SQLite races4 |
| npm test | PASS331/331 | Node310 + frontend21; all npm suites |
| test:ui | PASS19/19 | Organization2 + regression17; actual local backend, Chromium153/macOS;360px subset |
| verify:checkout | PASS | Offline fresh ci/typecheck/build/331 tests/migrate/seed/omit-dev runtime+compiled CLI; fresh fixtures removed |
| SQL Server2022 | NOT_RUN | Native harness107 SKIP including18 new provider checks |
| Windows / full browser-device matrix / UAT / full TC-AT | NOT_RUN | No full execution records fabricated |

## Evidence and trace

[Machine results](reports/T-025-029-batch-results.json), [fresh source](reports/T-029-fresh-checkout.json), [settings360px](reports/T025-settings.png). Final logs in `reports/T-025-029-tests.log`, `reports/T-025-029-ui.log`, `reports/T-025-029-sqlserver.log`, `reports/T-025-029-checks.log`, `reports/T-025-029-fresh.log`; source SHA256 in machine results.

Trace: FR-12–16/18/37, NFR-02–03, partial UT-01/02/03/06/07/08/09/18, TC-024–033/064/065/075 and AT-09–12/14/28. Provider fixtures use synthetic accounts/tasks/metadata; HTTP checks use actual login/cookie/CSRF/services; browser organization journeys use actual installer setup/Admin/Member/forced-password flow. Separate-process races cover completion/completion, edit/edit, completion/untick and completion/member demotion. Atomic fault injection covers task/board/audit/notification/recurrence persistence and organization/checklist audit failures; verified no partial mutation.

Full Task form/detail/checklist/recurrence UI awaits T-032/T-033; query/search T-031 and delete/restore/purge service T-030/T-060 remain pending. Purged-successor test is a controlled fixture, not retention acceptance. Attachments tests use metadata, not uploaded bytes. Notification-center/scheduler, real SQL locking/deadlock/revocation/rollback, Windows/HTTPS and UAT remain required; local cleanup integration does not close all T-016/T-022/T-027 criteria. `tests/execution-records.json` unchanged. Readiness remains503 and production startup guarded.

## Repairs and handoff

Initial failing checks were repaired: attachment fixture column names, probing public meta on an HTTP controller fixture without installer hooks, missing-key status expectation422, and DELETE checklist handler response corrected to contract200. No API contract or shared runtime change. Screenshot inspected at360px. No commit/push/deploy/DNS/server/startup-settings changes.

Next candidate batch: **T-030 High, T-031 High, T-032 Medium, T-033 Medium, T-034 High**, preserving dependencies.
