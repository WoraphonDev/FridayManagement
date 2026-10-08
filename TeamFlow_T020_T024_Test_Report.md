# T-020–T-024 — Teams, projects and access-cleanup batch

วันที่: 6 ตุลาคม 2026 · Node22.23.3/npm10.9.9 · macOS · temporary SQLite

เจ้าของเลือก5งานแล้วทดสอบรวมท้ายชุด: T-020/T-021/T-022 **High**, T-023/T-024 **Medium**. Actual model/effort NOT_VERIFIED. Local implementation/verification **5/5**; ทั้ง5งานยัง **IN_PROGRESS** เพราะ full provider/feature acceptance ยังไม่ครบ. DONE **6/77**, IN_PROGRESS **18**, TODO **53**, remaining **71**.

## ผลลัพธ์

- Team CRUD/CI unique names/archive guards, multi-team membership และ Admin-only Lead assignment; สมาชิกทั่วไปเห็นเฉพาะทีมของตน. Team archive ไม่ cascade และชนกับ project create อย่างปลอดภัยใน SQLite two-process test.
- Project CRUD/immutable owner team/archive/unarchive, owner Lead management, explicit Editor/Viewer ข้ามทีม, permission-scoped list/count/pagination และ active-user directory ที่ไม่มี username/credentials. สร้าง4 board columns เดิมพร้อม project ใน transaction. ไม่เปลี่ยน52 API routes/DTO/wire contract.
- Membership mutation ใช้ parent team/project version. หลังเปลี่ยนสิทธิ์คำนวณ effective write ใหม่: ถอนเฉพาะผู้รับงานไม่ done ที่เสียสิทธิ์จริง; คง done history และ explicit access เมื่อถอนทีม. Audit/notifications/view revisions อยู่ใน transaction เดียวกัน. Account deactivate/demote ใช้ shared cleanup และ session revocation เดิม.
- `/teams` และ `/projects` ใช้ API จริง: list/page/archived selector/create/edit/archive/unarchive, membership picker/Lead/Editor/Viewer, impact confirmation, read-only controls ตามสิทธิ์, explicit conflict review ที่คงร่างเดิม. Directory search/page ไม่ถือหน้าแรกว่าครบทั้งองค์กร. เมื่อ project หายจากรายการหลัง refresh จะปิด dialog ที่เกี่ยวข้อง.

## Checks

| Check | Result | Scope |
|---|---|---|
| typecheck / lint / build | PASS | Server/frontend/tools และ source build |
| check:contract / test:contract | PASS | Contract unchanged; 61 contract tests included in combined |
| build:test-plan / check:test-plan / test:test-plan | PASS | Manifest consistent; 17 policy tests included in combined; not application acceptance |
| test:workspaces | PASS 17/17 | 12 provider fixtures, 3 actual HTTP/cookie/CSRF/DTO/idempotency checks, 2 real separate-process SQLite races |
| npm test | PASS 305/305 | 284 Node + 21 frontend; all14 Node suites + frontend |
| test:ui | PASS 17/17 | 3 new workspaces E2E + 14 existing browser tests; actual local backend, Chromium153; 360px emulation subset |
| verify:checkout | PASS | Fresh source offline ci/typecheck/build/305 tests/migrate/seed/omit-dev install+compiled server/CLI help; [report](reports/T-024-fresh-checkout.json) |
| Real SQL Server2022 | NOT_RUN | SQL harness89 SKIP; includes12 new workspace fixtures ready for isolated native provider |
| Windows / full browser-device matrix / UAT | NOT_RUN | Chromium macOS/emulation cannot close these |
| Full TC/AT acceptance | NOT_RUN | No execution-records fabricated; future real feature workflows still pending |

## หลักฐานและ trace

Machine results/source hashes: [reports/T-020-024-batch-results.json](reports/T-020-024-batch-results.json). Final logs: `reports/T-020-024-tests.log`, `reports/T-020-024-ui.log`, `reports/T-020-024-sqlserver.log`.

Trace: FR-05–11/FR-13, NFR-02–03, UT-03, partial TC-013–023 และ AT-05–08/29. Unit/provider fixtures seed synthetic tasks/assignments/deleted/done state; they do **not** execute future T-026/T-027/T-029 task/status/recurrence services or real file bytes/notification center. New browser journeys use real first-run setup, accounts, forced-password change and team/project APIs. Cleanup rollback injects notification/admin-audit persistence faults; actual two-process races cover same-version membership changes and team archive versus project creation. `tests/execution-records.json` remains unchanged; full case/AT not promoted to PASS.

## Repairs and limits

Initial failures were repaired: lifecycle/board FK/maintenance constraints in fixtures, select accessible labels, and review checkbox disappearing after confirmation. A combined startup test observed INSTANCE_GUARD_UNAVAILABLE while UI ran independently; cause not conclusively established, sequential combined rerun PASS. Fresh offline default npm cache lacked a locked `wsl-utils` tarball; an isolated `/private/tmp` cache was populated and fresh verification rerun PASS. No package/runtime upgrade or shared runtime installation.

Real SQL2022 locking/deadlock/rollback/revocation evidence, Windows, full browser/device/UAT and task/recurrence/download/notification feature flows remain required. T-016/T-022 cleanup sign-off stays partial until those dependencies are exercised. `/health/ready` remains503; production startup stays guarded. No commit/push/deploy/DNS/server/startup-setting changes.

Next local task: **T-025 Medium**. Next candidate5-task batch: **T-025 Medium / T-026–T-029 High**, with existing dependencies retained.
