# T-004 — Test/release plan validation report

วันที่: 5 ตุลาคม 2026 (Asia/Bangkok) · Owner: Codex · Result: **PASS / T-004 DONE**

Effort ที่ Task Register กำหนด: **Medium**; model GPT-6.1 Sol / speed Standard ค่า runtime ที่เลือกจริงยัง **NOT_VERIFIED** เพราะเครื่องมือไม่แสดง settings และการตรวจ UI ของ Codex ถูกปฏิเสธ ไม่มีการเปลี่ยนหรืออ้างว่าเลือกค่าดังกล่าวแล้ว

## ผลที่ส่งมอบ

[TeamFlow_Test_Release_Manifest.md](TeamFlow_Test_Release_Manifest.md) และ [tests/test-manifest.json](tests/test-manifest.json) แยกระดับทดสอบ/ผู้รับผิดชอบ/fixtures/reset/clock/barriers/provider/หลักฐาน พร้อม AT↔Task↔Case, FR/NFR/BR owners, sequencing และ source candidate/final/production gates การแก้ครั้งนี้ไม่เปลี่ยน business baseline หรือ AT expected ให้ตรงกับโค้ด

## ผลตรวจที่รันจริง

| Check | Result | Evidence |
|---|---|---|
| Generated manifest/source inventory | PASS | 77tasks, 20unit suites, 84TC, 30AT, 20RV, 5UAT, 4reviews, 30smoke; FR40/NFR8/BR18 ครบ |
| Dependencies/owners | PASS | Register/detail ตรงกัน; ไม่มีวงจร; case/AT/variant/profile/owner/evidence ไม่มีรายการตกหล่น |
| Planning-policy tests | PASS | Node22.23.3/macOS; **17tests/17pass/0fail/0skip/0cancel/0todo** ใน tests/planning/test-plan.test.mjs |
| Actual record store | PASS เฉพาะรูปแบบ | records ว่าง; ผล application ทั้งหมด NOT_RUN ไม่ได้ผ่าน tests จริง |
| Release CLI negative check | PASS | ระบุ synthetic build/hash แล้ว final gate NOT_RUN และ exit1 ตามที่ควรเป็น; ไม่มีการเขียนผล PASS จำลองลง record store |
| Lockfile pins / whitespace | PASS | ไม่เพิ่ม dependencies; package/lock pins ตรง; git diff --check ผ่าน |

17 tests พิสูจน์ว่า missing AT/stale mapping/empty records ไม่ทำให้ release ผ่าน; SQLite ไม่แทน SQL2022; macOS ไม่แทน Windows; missing variant/buildเก่า/source hashเปลี่ยน/หลักฐานไม่มีหรือhashผิด/ข้อมูลsecret/metadataขาด/statusผิด/FAILไม่มีdefect/BLOCKEDไม่มีreason/browsermatrixไม่ครบ/openCriticalMajor/incompleteTask ต้องไม่ผ่านเกณฑ์ที่เกี่ยวข้อง Candidate ผ่าน packaging review ไม่ทำให้ final ผ่านโดยอัตโนมัติ

## Acceptance และข้อจำกัด

T-004 checklist ทั้ง4ข้อครบ: แยก levels/Windows/UAT, roles/fixtures/ผล, AT30พร้อมtasks/cases/evidence, critical gates เรื่องสิทธิ์/transactions/recurrence/files/backup/secrets และ required fault variants G0 ผ่านด้านbaseline/contracts/testplan; **T-005 READY — Effort Medium**

**NOT_RUN:** 84TC/30AT/20RV/5UAT/4release reviews เต็มกรณี, HTTP/security/SQLite/SQL2022 transactions/faults, browser, Windows, actual backup/RESTORE, performance และ UAT ไม่มีแอปที่เปิดใช้ได้หรือ source candidate ZIP ในงานนี้; candidate/final/production gate ยัง NOT_RUN ผล T-003 61/61 contract tests เดิมไม่ได้รันซ้ำหรือใช้แทน acceptance นี้

Machine evidence: [reports/T-004-plan-results.json](reports/T-004-plan-results.json); full records: [tests/execution-records.json](tests/execution-records.json) ไม่มี commit/deploy/DNS/server changes
