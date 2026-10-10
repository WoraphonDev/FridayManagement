# T-091 Test Report — Regression + SQL Server 2022 (partial)

**วันที่:** 2026-10-10 · **Declared effort:** High (runtime model/effort NOT_VERIFIED) · **Status:** IN_PROGRESS

| Profile | Result | Evidence |
|---|---|---|
| SQLite local `npm test` | PASS node 462/462, frontend 49/49 | reports/T-091/npm-test.log |
| Chromium Playwright (SQLite, port 43191) | PASS 88/88 (รอบแรก 85/88: 2 flaky + Members tab shift; รอบสุดท้ายผ่านทั้งหมด) | reports/T-091/browser-test.log |
| SQL Server 2022 Developer 16.0.4295.3 (Docker/colima arm64 บน macOS, `--test-concurrency=1`) | 187/190 full run; 3 ข้อแก้/รันซ้ำ boards+idempotency+retention 24/24 ×2 PASS | reports/T-091/sqlserver-test.log |
| Windows Server native install/service/HTTPS/backup-restore | NOT_RUN | ต้องรันโดย owner |
| UAT กับเจ้าของ | NOT_RUN | |
| Lint / tsc / build / prettier | PASS (lint 2 warnings เดิม) | |

## Defects ที่พบและแก้ (SQL Server)
1. `migrations/sqlserver/0013` ADD COLUMN + UPDATE ใน batch เดียว → `Invalid column name 'team_position'`; แก้ด้วย `EXEC(N'...')` (ไฟล์ยังไม่เคย commit)
2. Tedious คืน BIGINT เป็น string → upload finalize `SERVICE_NOT_READY`; adapter แปลง BIGINT ที่เป็น safe integer เป็น number
3. Adapter ห่อ business error เป็น `TRANSACTION_FAILED` ต่างจาก SQLite; ส่งต่อ error เดิมเมื่อ rollback ยืนยันแล้วและไม่ใช่ driver error (deadlock retry คงเดิม)
4. `workspaces.ts` ใช้ `Promise.all` query ขนานใน transaction เดียว → ค้าง/`Can't acquire connection`; เปลี่ยนเป็นลำดับ
5. Migration 0015 (ใหม่): คืน guard trailing-space ของ status (0002 ตัดหาย) และแก้ `ck_users_rule1` ที่ปฏิเสธ `_`/`-` ใน username
6. Test-only: files fixture ใช้ `runTransaction`; schema regex รับ "duplicate key"; boards fixture ใช้ IDENTITY_INSERT; retention fixture quote `[key]`

## ข้อจำกัด
- SQL Server ใน container บน macOS ไม่ใช่ Windows native; ไม่ปิด TC-080/Windows/backup-restore AT-25
- `test:sqlserver` (npm script) รันขนานแล้วแย่ง migration applock (`MIGRATION_GUARD_UNAVAILABLE`) — ต้องใช้ `--test-concurrency=1` ตาม runbook
- ข้อ 66 idempotency parallel ได้ DATABASE_BUSY 1 ครั้งในรอบใหญ่ (deadlock retry ครบ 3) แล้วผ่านในรอบซ้ำ — flaky ภายใต้ load
