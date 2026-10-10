# T-091 — Owner checklist (Windows native + UAT)

**สร้าง:** 2026-10-10 · **Build:** commit ล่าสุดบน main · ส่วนที่ Agent รันได้บน macOS ผ่านแล้ว ([TeamFlow_T091_Test_Report.md](../TeamFlow_T091_Test_Report.md))
เหลือเฉพาะงานที่ต้องรันบนเครื่องจริงโดย owner; บันทึกผล PASS/FAIL/NOT_RUN ตามจริง ห้ามเก็บ setup token/cookie/password ใน evidence

## 1. เตรียมเครื่อง (ตาม [Windows Installation](../TeamFlow_Windows_Installation.md) §Prepare)
- [ ] บันทึก Windows build, SQL Server 2022 version/edition/CU, Node 22.23.3/npm, service identity, commit hash
- [ ] Extract source สะอาด → `npm ci`, `npm run typecheck`, `npm run build`, `npm run check:contract`
- [ ] สร้าง DB ทดสอบ `*_test` + login แยก; ใส่ `.env.sqlserver-test` (ไม่ commit)

## 2. SQL Server native บน Windows
- [ ] `node --env-file=.env.sqlserver-test --run check:sqlserver` → PASS
- [ ] `npm run test:sqlserver` (ตั้ง env ตาม runbook; สคริปต์รันทีละไฟล์แล้ว) → คาด 190/190
- [ ] `npm run migrate:sqlserver` บน DB rehearsal → ต้องเห็น `0016_sqlserver_check_fixes.sql` ถูก apply

## 3. Windows service / IIS / HTTPS (ตาม Installation §IIS, §Backup)
- [ ] Start ผ่าน `scripts\windows\Start-Friday.ps1`, setup ครั้งแรก, `/health/ready`
- [ ] HTTPS ผ่าน IIS: ตรวจ response headers มีครบ — CSP, nosniff, X-Frame-Options, Referrer-Policy, **Permissions-Policy, COOP, CORP (ใหม่)**, **HSTS (ตั้งที่ IIS เพราะเปิด internet)**; IIS ต้องไม่ลบ/ซ้ำ header
- [ ] Firewall เปิดเฉพาะ 443; port API/SQL ไม่ออก internet; BitLocker บน data/backup disk
- [ ] Reboot/recovery, second instance ถูกปฏิเสธ, log rotation
- [ ] Backup ตามกำหนด + **restore จริง** ลง DB ใหม่ และเทียบ checksum (AT-25, RPO24h/RTO4h วัดจริง)

## 4. UAT (ตาม [UAT Register](../TeamFlow_UAT_Register.md))
- [ ] `node scripts/prepare-uat.mjs` (ถ้ายังไม่มี template) แล้วกรอก UAT-01–UAT-05 กับผู้ใช้จริงแต่ละ role
- [ ] Regression browser บน Windows: `npx playwright test` (คาด 88/88)
- [ ] บันทึก defect Critical/Major/Minor; ไม่มี Critical/Major ค้าง

## 5. ส่งผลกลับ
แนบ/บอกผลแต่ละข้อ (หรือ path ของ evidence ที่ redact แล้ว) → Agent อัปเดต Task Register, ปิด T-091 แล้วเริ่ม T-093 (OWASP อย่างเป็นทางการ + ZAP retest บน staging ที่เปิด internet)
