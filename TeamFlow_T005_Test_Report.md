# T-005 — Foundation bootstrap validation

วันที่: 5 ตุลาคม 2026 (Asia/Bangkok) · Owner: Codex · Result: **PASS / T-005 DONE เฉพาะ foundation**

Effort ตาม Task Register: **Medium** (GPT-6.1 Sol / Standard); actual model/effort/speed **NOT_VERIFIED** ตามข้อจำกัดเครื่องมือเดิม ไม่มีการเปลี่ยน runtime ส่วนกลาง

## ผลส่งมอบ

React/TypeScript/Vite frontend shell + Express5/TypeScript bootstrap บน Node22.23.3/npm10.9.9 แยก API/domain/repository/jobs/migrations/scripts/tests; SQLite local และ mssql/Tedious SQL2022 adapter มี transaction port เดียวกัน พร้อม atomic-effects primitive และ provider-specific test harness migration เริ่มต้นมีเฉพาะ ledger/checksum; sample-data ต้องเรียกเองและสร้าง synthetic fixture เท่านั้น ไม่มีบัญชี/password/task ของแอปจริง

Dependency versions pin ใน package-lock.json; inventory **390 package entries** รวม optional platforms พร้อม license metadataครบ Native SQLite ใช้ node:sqlite ที่ bundled กับ Node22 (experimental/synchronous สำหรับ local ชั่วคราว); TypeScript5.9.3 เลือกให้ตรง typescript-eslint peer range; ไม่ใช้ TypeScript7 ที่ยังอยู่นอก peer range

## ผลตรวจที่รันจริง

| Check | Result | ขอบเขต |
|---|---|---|
| Fresh source copy npm ci | PASS | สำเนาจาก tracked/non-ignored source ลง temporary directory; ไม่มี node_modules/dist/DB เดิม; offline cache + lockfile; ลบสำเนา/data หลังตรวจ |
| Typecheck/build/lint | PASS | Server/frontend/tools/tests strict; Vite production bundle; ESLint ผ่าน |
| SQLite/HTTP foundation | PASS 5/5 | Atomic state/audit/notification commit/rollback, serialized units, migration idempotency/checksum/restart/multi-statement rollback, no auto-seed, loopback live200/ready503/API fail-closed |
| Frontend logic | PASS 1/1 | Shell ไม่มี credential forms/write controls ก่อน auth |
| T-003/T-004 regression | PASS 78/78 | contract61 + planning17 จาก fresh copy; ไม่ใช่84 TC ผ่าน |
| Chromium browser smoke | PASS 1/1 | Chrome for Testing153.0.8010.12/macOS; shellแสดงจริง ไม่มีpageerror และไม่มี horizontaloverflow ที่360px |
| Fresh migrate/seed/start CLI | PASS | Ledger applyครั้งเดียว/repeatno-op; explicitsyntheticfixture; builtHTML/live200/ready503; ไม่มีjobsหรือseedอัตโนมัติ |
| SQL2022 real harness | NOT_RUN | 1caseSKIPเพราะไม่มีexplicit isolatedSQL2022 test setup; SQL Server adapterมีเพียงtypecheck/harness ไม่อ้างreal integrationผ่าน |
| License/lock/audit | PASS | 390entries metadataครบ; registry auditตอนinstall0vulnerabilities (snapshot); lockfile/runtimepinsครบ |

รวม automated checks ที่รันผ่าน **84/84 (5+1+61+17)** และ browser smoke **1/1** แยกจาก 84fullTC ซึ่งยังNOT_RUN

## ปัญหาที่แก้และข้อจำกัด

แก้ SQLite rows ให้มี representation สอดคล้องกับ adapter port และให้ migration รองรับทั้ง SQL script/rollback ตรวจ initial browser smoke พบพอร์ต3000มีโปรเจกต์อื่นใช้งานจึงแยกพอร์ตทดสอบ43171/ephemeral และหยุดเฉพาะ test server ของเรา ไม่หยุดหรือแก้โปรเจกต์อื่น README ระบุการเลือก PORT ว่างและ Vite proxyตามPORT

Scaffold bindloopbackและปฏิเสธ NODE_ENV=production; health readyคง503และbusiness APIคงSERVICE_NOT_READY จนงานconfig/schema/auth/ACLพร้อม T-006ต้องทำfullconfiguration/paths/single-instance/startup validation; T-007fullschema; T-008transaction/date/lifecycle rules ไม่มีการใช้ generic foundationeffects แทน business audit/notification acceptance

**NOT_RUN:** actualSQL2022 constraints/concurrency/faults/backup-restore, Windowsservice/HTTPS/ACL/TaskScheduler, fullbrowsermatrix, performance/UAT และ84TC/30AT/20RV/5UAT/4release reviews ไม่มีsourcecandidateZIP/finalsign-off/deploymentจากงานนี้

## หลักฐานและความคืบหน้า

- [README](README.md), [fresh-copy results](reports/T-005-fresh-checkout.json), [machine results](reports/T-005-foundation-results.json), [license inventory](dependencies/license-inventory.json)
- DONE **5/77** tasks; เหลือ **72** TODO; READY: **T-006 High / T-007 High / T-012 Medium**; งานถัดไปตามลำดับ T-006
- Task Registerอัปเดตตามผลจริง; tests/execution-records.jsonยังว่าง ไม่มี fullacceptancePASS ที่อนุมานจาก bootstrap ไม่มีcommit/deploy/DNS/serverchanges
