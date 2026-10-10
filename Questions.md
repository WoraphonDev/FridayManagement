# Questions

รูปแบบตาม PROJECT_TEMPLATE 1.0 หมวด 10.1 — ทุกคำถามผูกเลข Ticket, มีทางเลือก A/B และ Recommended

| Q-ID | Ticket | Status | Blocks |
|---|---|---|---|
| Q-T-092-1 | T-092 | ANSWERED 2026-10-10: B (internet) | — |
| Q-T-092-2 | T-092 | ANSWERED 2026-10-10: A (ไม่ทำ MFA ใน v1) | — |
| Q-T-093-1 | T-093 | ANSWERED 2026-10-10: A (มีอยู่แล้ว) | — |
| Q-T-094-1 | T-094 | ANSWERED 2026-10-10: ระบบทดสอบอัตโนมัติ | — |
| Q-T-007-1 | T-007 | ANSWERED 2026-10-10: A | — |
| Q-T-081-1 | T-081 | OPEN | ปิดข้อ negative matrix ของ T-081 (P-02/P-10) |

## Q-T-092-1 — Production exposure และ encryption at rest
**คำตอบ (owner 2026-10-10):** B — เปิดให้เข้าจาก internet ผ่าน reverse proxy + HTTPS/HSTS; encryption at rest ใช้ BitLocker (ค่าเริ่มต้นตาม A ยังใช้กับ disk) จนกว่าจะมีคำสั่งอื่น
ระบบ production จะเปิดเฉพาะ internal network หรือเข้าจาก internet ได้ และ data/backup เข้ารหัสที่ระดับใด?
- **A (Recommended):** Internal network/VPN เท่านั้น; ใช้ BitLocker ของ Windows ที่องค์กรมีกับ data + backup disk — ลด attack surface, ไม่มีค่าใช้จ่ายเพิ่ม
- **B:** เปิด internet ผ่าน reverse proxy + HSTS; ต้องเพิ่ม pentest scope ภายนอกและ WAF/rate limit ระดับ proxy

## Q-T-092-2 — MFA ใน v1
**คำตอบ (owner 2026-10-10):** A — ไม่ทำ MFA ใน v1; risk ยอมรับโดย owner แม้ระบบเปิด internet (ดู docs/07-security.md §3)
- **A (Recommended):** ไม่ทำใน v1 (N/A พร้อมเหตุผล: internal, 30 คน, Baseline 1.1 ไม่มี) แต่บังคับ password policy + rate limit; ทบทวนถ้าเลือก Q-T-092-1 B
- **B:** เพิ่ม TOTP สำหรับ Admin — เป็น change request เปลี่ยน requirement/contract/migration

## Q-T-093-1 — CSV export formula injection
**คำตอบ (owner 2026-10-10):** A — ตรวจพบว่า implement แล้วที่ `src/services/reports.ts` `csvCell` และมี test ใน `tests/notifications/center-reports-suite.ts`; `npm run test:notifications` 23/23 PASS (SQLite local, 2026-10-10); ไม่ต้องเปิด ticket ใหม่
- **A (Recommended):** prefix `'` ให้ cell ที่ขึ้นต้นด้วย `= + - @ \t \r` ใน CSV export และเพิ่ม test — แก้เล็ก, ปลอดภัยเมื่อเปิดใน Excel
- **B:** ไม่ escape (คงข้อมูลดิบ) และระบุ risk acceptance ในคู่มือผู้ใช้

## Q-T-094-1 — ผู้ทำ Pen-Test
**คำตอบ (owner 2026-10-10):** ให้ระบบทดสอบ — automated pentest ด้วยเครื่องมือ (ZAP/Trivy/Gitleaks) + scripted negative tests ที่ Agent รันบน staging; independent human review บันทึกเป็น outstanding
- **A (Recommended):** Self-test ตามแผนโดยผู้ที่ไม่ได้ implement + บันทึกว่า independent review ยังเป็น outstanding
- **B:** จ้าง/ขอทีม security ภายนอกองค์กรทดสอบ (มีค่าใช้จ่าย/เวลา)

## Q-T-007-1 — เกณฑ์ตรวจ SQL Server query plans
**คำตอบ (owner 2026-10-10):** A — implement `tests/sqlserver/query-plans.test.ts`; ผล `reports/T-007/query-plans.json`: scan ที่เหลือ 4 จุด review แล้วเป็นรายการยกเว้น (row-goal page / aggregate / scope join), ทุก path p95 ≤ 2 s; Kanban N+1 แก้แล้ว (batched DTOs: 3,011→16 statements, p95 1.96 s→43 ms)
T-007 ระบุ "query plans NOT_RUN" แต่ไม่มี test case/เกณฑ์ว่าต้องตรวจ query ใด
- **A (Recommended):** ตรวจ execution plan จริงบน SQL2022 ของ 6 query หลัก (task list ต่อโปรเจกต์+filter, My work, board columns, notifications unread, report summary, directory search) บน dataset ตาม SRS §13.3 (10,000 tasks); ผ่านเมื่อใช้ index seek ไม่มี table scan บนตารางใหญ่ และ p95 อยู่ในเกณฑ์ §13.3 — เพิ่มเป็น test SQL2022 เฉพาะ
- **B:** ตัดข้อ query plan ออก ใช้ผล performance test (§13.3) อย่างเดียวเป็นเกณฑ์

## Q-T-081-1 — P-02 / P-07 / P-10 ไม่ตรงกับตาราง SRS §4.4
ตรวจโค้ด 2026-10-10 (T-081 matrix): P-01/P-03/P-04/P-05/P-06/P-08/P-09 บังคับตาม SRS และมี test แล้ว แต่ 3 key ไม่มีผลในโค้ด
- **P-02 จัดการ Group:** โค้ดให้ทุกคนที่มีสิทธิ์เขียนโปรเจกต์ (editor และ manager ทุกคน) จัดการ Group ได้; SRS บอก "Manager ไม่มี key → ไม่ได้" แต่ "Editor → ตามเดิม" ซึ่งขัดกันเอง (manager ไม่มี key จะมีสิทธิ์น้อยกว่า editor)
- **P-07 Overview/Reports/CSV:** SRS ให้คนไม่มี key ได้ "ตาม Editor/ตามโปรเจกต์ที่เข้าถึง" อยู่แล้ว → key ไม่เพิ่มสิทธิ์ใด ๆ; โค้ดตรงกับ SRS แต่ key นี้ไม่มีความหมาย
- **P-10 Team reports:** `/api/reports/summary?team=` ไม่ตรวจ P-10; ผลยังจำกัดตามโปรเจกต์ที่เข้าถึง (ไม่มีข้อมูลรั่ว) แต่ "ไม่ได้" ของ SRS ไม่ถูกบังคับ

- **A (Recommended):** แก้ SRS ให้ตรงกับพฤติกรรมจริง — P-02: manager ทุกคนจัดการ Group ได้เหมือน editor (ตัดคอลัมน์ "ไม่ได้"); P-07/P-10: ระบุว่าเป็นป้ายแสดงสิทธิ์ (no-op) หรือนำออกจาก catalog ใน release ถัดไป; ไม่เปลี่ยนโค้ด/สิทธิ์ผู้ใช้ปัจจุบัน
- **B:** แก้โค้ดให้ตรง SRS — P-02 ปฏิเสธ manager ที่ไม่มี key (editor ยังทำได้), P-10 ปฏิเสธ `?team=` เมื่อไม่ใช่ Admin/Lead/ผู้ถือ P-10; เป็นการลดสิทธิ์ผู้ใช้ปัจจุบัน ต้องแจ้งผู้ใช้และเพิ่ม test
