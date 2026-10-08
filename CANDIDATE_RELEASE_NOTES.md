# FridayManagement — Source candidate / IN_PROGRESS

7 ตุลาคม 2026 · Baseline 1.1 · Node 22.23.3 / npm 10.9.9 · version 0.1.0

**เป็น candidate สำหรับตรวจและทดสอบต่อ ยังไม่พร้อม production** T-075–T-077 และ dependencies ยัง IN_PROGRESS; Windows/SQL Server2022, full TC/AT/RV และ human UAT ยัง NOT_RUN ไม่มีการ deploy หรือเปลี่ยน DNS/server settings

มี source React/TypeScript/Express, Table/Gantt/Calendar/Kanban, SQL2022/SQLite migrations แยก provider, lockfile, config example, tests, scripts, manuals และ dependency license inventory ดู README.md สำหรับ local quickstart และ TeamFlow_Windows_Installation.md สำหรับขั้นตอนปลายทางที่ยังต้องทดสอบจริง Production startup guard ยังคงทำงาน; ไม่เปลี่ยน guard เพื่อใช้งานจริง

ZIP ไม่รวม .env จริง, live DB/backup/uploads/log/session state, node_modules, dist หรือ credentials ที่ persist จากการทดสอบ มีเพียง `.env.example` แบบ placeholder และค่า synthetic ที่สร้าง fixture ใน source tests ไม่มีบัญชีสำเร็จรูปจาก sample-data ผู้ติดตั้งต้องสร้าง Admin ผ่าน setup ไม่ใช้รหัสตัวอย่างใน production

`SOURCE_INVENTORY.json` มี SHA256/ขนาดของทุก source entry ยกเว้น inventory เอง ZIP SHA256 อยู่ในรายงานส่งมอบนอก ZIP; manifest ตรวจความสมบูรณ์ ไม่ใช่ลายเซ็นรับรองผู้เผยแพร่ ตัว pack/extract ใช้ Python3 stdlib เฉพาะเครื่องมือ QA เพิ่มเติม; runtime แอปยัง Node22

ตรวจ candidate ที่แตกใหม่บน local ด้วย:

```sh
FRIDAY_SOURCE_ARCHIVE=/absolute/path/candidate.zip FRIDAY_CHECKOUT_REPORT=reports/T-077-fresh-archive.json npm run verify:checkout
```

คำสั่งใช้ temporary directory, offline npm cache, build/test/migrate/seed และ omit-dev startup แล้วลบทิ้ง ผล fresh Windows/SQL2022 ต้องทำต่างหาก หาก cache ไม่ครบให้เติมแพ็กเกจตาม lockfileโดยไม่เปลี่ยน shared runtime

AT30/UAT5 พร้อมให้คนกรอกอยู่ TeamFlow_UAT_Register.md และ reports/UAT-signoff-template.json ทั้งหมด NOT_RUN; formal execution records ยังว่าง ไม่มีหลักฐานรับรองว่าปราศจาก Critical/Major defects Coverage mapping อยู่ reports/release-readiness.json และผล local batch อยู่ TeamFlow_T075_T077_Test_Report.md รายงาน raw logs เก็บที่ workspace/tmp ของผู้พัฒนา ไม่บรรจุ ZIP

Third-party license/notice inventory อยู่ dependencies/LICENSES.md และ license-inventory.json ไม่กำหนดสัญญาอนุญาตให้เผยแพร่ source ขององค์กรแทนเจ้าของ

รายงานภายใน ZIP เป็น snapshot ก่อนตรวจ fresh extraction ดังนั้นช่องผล fresh ZIP อาจยัง NOT_RUN ใน snapshot รายงานที่ส่งมอบคู่กันนอก ZIP ระบุผลหลังตรวจพร้อม **SHA256 ของ ZIP เดิมที่ตรวจจริง**; ไม่มีการแก้ ZIP หลังทดสอบเพื่อเลี่ยง checksum อ้างกลับหาตัวเอง ไม่ใช้รายงานนอก ZIP ลงนาม UAT แทนผู้ใช้

Baseline r2 ก่อนแก้ cache: local load9000requests/10min p95read209.771ms/write153.441ms/error0%, visible update4935.178ms; sampled combined-process RSS659MiB/heap432MiB ชุดปัจจุบันแก้การค้างของ schema compilation ใน contracts/validate.mjs และเพิ่ม memory diagnostics แบบแยก compiled API/client ดู TeamFlow_T075_Memory_Followup_Report.md สำหรับ before/after จริง ผล5-minute diagnostic ไม่ใช่การรับรอง10-minute/full SQL2022/Windows/stress บน build ใหม่

Current candidate includes bounded validator-cache fix: LRU128entries + removal of Ajv transient compile roots, preserving registered bundle and all wire/business rules. Full memory/regression/fresh ZIP results are in the paired external follow-up report; source ZIP remains IN_PROGRESS and unsigned for native SQL/Windows/UAT. Older T075–077/r2 reports remain historical evidence.

Memory follow-up matched4500requests/300s: post-GC+idle compiled API heap178.30→28.47MiB before→after fix; retained delta+128.39→−1.28MiB, error0both. After p95read119.434ms/write93.422ms. Browser smoke150requests error0/visible4889.761ms PASS_SMOKE; these diagnostics do not certify required10-minute/nativeSQL/full TC084 acceptance. Current delivery recommendation is r3, paired with TeamFlow_T075_Memory_Followup_Report.md; older r2 reports/archive remain historical.
