# T-007 — Schema/migrations validation

## Follow-up — 8 October 2026

Owner confirmed no SQL test environment and requested preparation. Read-only preflight and sequential13-case focused native command now available; see TeamFlow_SQLServer_Foundation_Runbook.md and reports/sql-foundation-preparation-results.json. New readiness5/5, combined config43/43 and schema13/13 PASS; type/lint PASS. Native13SKIP/0executed; command exits1 NOT_READY before native fixtures. T-006/T-007 remain IN_PROGRESS, native SQL/Windows/UAT NOT_RUN. Current counts DONE6/77, remaining71 supersede older counts below. Declared High; actual runtime model/effort NOT_VERIFIED; next native T006/T007 High.


วันที่: 6 ตุลาคม 2026 (Asia/Bangkok) · Owner: Codex · **IN_PROGRESS: SQLite/pure checks PASS; SQL2022 NOT_RUN**

Effort ที่กำหนด **High** (GPT-6.1 Sol / Standard); actual model/effort/speed **NOT_VERIFIED** ตามข้อจำกัดเครื่องมือเดิม ไม่มีการเปลี่ยน shared Node runtime

## ผลที่ทำแล้ว

`0001_business_schema.sql` แยก SQLite/T-SQL มี24 business/support tables + ledgerเดิม รวม25 application tables และ31 NO ACTION FK ตาม SRS§5/API Contract§7–8 มี versions/auth_version, Unicode/UTF16 limits, DATE/UTCms, CI username/team names, optional filtered UNIQUE, board rank/status/project constraints, JSON audit และ durable quota/reservation/cleanup/idempotency/view revisions/maintenance/rate-limit state

`0000_foundation.sql` ทั้งสอง provider รักษา hash เดิมตาม T-005; migration runner ตรวจ checksum, missing applied source, numeric version ซ้ำ/gap และ rollback DDL/ledger ทั้ง run SQL เพิ่ม transaction-owned migration applock แต่ยังไม่มี real SQL evidence ไม่มี organization/user/password จาก migration สร้างเฉพาะ quota counter เริ่มต้น

SQL driver boundary แปลง DATE/DATETIME2/BIT เป็น date-only/ISO UTCms/0|1 และเปิด useUTC; pure codecs ไม่แทน real SQL serialization ผล SQLite ใช้ไฟล์จริงและ reopen ไม่ใช่ in-memory mock ส่วน schema harness SQL แยก randomized schema ต่อ caseและ cleanup ใน finally เมื่อเจ้าของจัด isolated SQL2022 พร้อม

## ผลตรวจที่รันจริง

Environment: macOS/arm64 · Node22.23.3/npm10.9.9 · bundled node:sqlite (temporary local/experimental). ไม่มี SQL2022 test environment ที่กำหนดไว้

| Check | Actual |
|---|---|
| Schema suite | PASS13/13: actual SQLite11 + pure date/row codecs2 |
| Table/FK/index coverage | PASS local: ทุก SRS dictionary entity + rate_limit_buckets; 24 STRICT business/support tables + ledger; 31 NO ACTION FK enabled และ foreign_key_check ว่าง; required indexesครบ |
| Types/constraints | PASS local: positive IDs/versions/auth_version, username pattern/CI names/Thai/NFC, UTF16 emoji/trailing-space boundaries, valid leap dates/year1–9999, enum/anchor/completion/trash pairs, JSON/UUID/hash/bytes/FK boundaries |
| Board/recurrence/purge | PASS local: immediate rank UNIQUE, two-phase negative ranks, status/project FK; explicit purgeไม่ลบ tombstone/cleanup queue และไม่ reuse committed purged IDs; stored bytesคงหลัง metadata purge |
| Durable state/reopen | PASS local: quota, reservation phases/final key, cleanup retry, idempotency, user revision, session, maintenance lease และ rate bucketsยังอยู่หลังclose/reopen |
| Actual atomic effects | PASS local: task version/state + task_events + notifications commitร่วม; invalid effect recipientทำให้state/version/event/notification rollbackทั้งหมด |
| Fresh/repeat/legacy migration | PASS local: sourceใหม่ apply0000+0001, repeat no-op, อัปเกรดจาก ledger-onlyพร้อมsyntheticข้อมูลไทยเดิม, changed/missing/duplicate-version/partial-failure negatives และ ledger/DDL rollback |
| Fresh source copy | PASS: offline lockfile npmci/typecheck/build, 134/134 combined tests, full business migrate/repeat, explicit synthetic foundation seed, built HTML/live200/ready503; สำเนาและfixtureลบหลังตรวจ |
| Combined regression | PASS134/134: config37 + foundation5 + schema13 + frontend1 + contract61 + planning17 ไม่ใช่84fullTCผ่าน |
| Typecheck/build/lint/contract/plan | PASS: server/frontend/tools/tests; 52routes/75schemasไม่เปลี่ยน; manifest/coverage unchanged; full application execution records0 |
| Real SQL2022 harness | NOT_RUN: 13 SKIP = foundation1 + instance guard1 + schema11; ไม่มีการอ้าง SQL migration/trusted FK/CHECK/native collation/serialization/indexesผ่านจากไฟล์ T-SQL |

License/runtime/dependency pinsไม่เปลี่ยนจาก T-006; inventory390 entries/missing0ยังเป็นชุดเดิม ไม่มีการเรียก registry audit ใหม่เพื่ออ้างผลปัจจุบัน Browser smokeไม่รันซ้ำใน T-007 เพราะไม่ได้แก้ frontend/API routing; full browser matrixยัง NOT_RUN

## ปัญหาที่แก้และข้อจำกัด

Legacy fixture เดิมรวม DDL+bound INSERT ใน statementเดียว ทำให้ SQLite harness FAIL; แยกเป็นสอง statementsในtransactionเดียวและรันทดสอบผ่านแล้ว Initial loopback testถูก sandboxปฏิเสธ EPERM; fresh-copy regressionที่ได้รับอนุญาตให้ใช้loopbackรันผ่านครบ ไม่หยุด process ของโปรเจกต์อื่น

ตรวจ locked TaskEvent DTO พบ field_changesต้องarray จึงเพิ่ม ARRAY constraintและfixtureที่ตรง contract; ไม่เปลี่ยน OpenAPI/wire format ใช้ NVARCHAR(MAX)+DATALENGTH checksสำหรับ non-indexed bounded text เพื่อกัน silent trailing-space truncation; indexed/native typesยังต้องมี API validationก่อนbind

SQLite CI keyเป็น approximation ของ SQL collation; ไม่อ้าง parity สำหรับ Unicodeทุกตัว Quota threshold/locks, maintenance drain, cleanup disk jobs, auth/permission/idempotency, board/recurrence business transactions และ immutable audit APIเป็น tasksถัดไป ชุดนี้พิสูจน์ physical constraints/persistence/atomic fixtures ไม่ปิดฟีเจอร์เหล่านั้น

## Traceability / สิ่งที่ยังไม่ปิด

T-007: dependencies T-005/T-002 DONE; trace FR-40/NFR-03/NFR-07, SRS§5, API Contract§7–8; local subsetของ TC-078 ไม่ปิด full TC-078/AT-25/28/RV-18 ส่วน SQL2022 apply, enabled/trusted FK/CHECK, native collation/serialization/indexes/query plans/concurrency, Windows/backup-restore/UAT ยัง **NOT_RUN**

T-007 คง **IN_PROGRESS**; checklist SQL Serverตัวแรกยังค้าง เครื่องหมายที่ทำแล้วหมายถึง implementation/local evidenceเท่านั้น `tests/execution-records.json` คงว่าง; 84TC/30AT/20RV/5UAT/4RELเต็มกรณียัง NOT_RUN ไม่เปลี่ยน scope หรือใช้ NOT_APPLICABLE ข้ามปลายทาง

## หลักฐานและความคืบหน้า

- [Schema](TeamFlow_Database_Schema.md), [README](README.md), [machine results](reports/T-007-schema-results.json), [fresh-copy results](reports/T-007-fresh-checkout.json), migrations/sqlite และ migrations/sqlserver แยกไฟล์
- **DONE5/77 · IN_PROGRESS2 · TODO70 · remaining72**; งานใหม่ที่ READY คือ **T-012 Medium**; T-008 Highยัง WAIT_DEPENDENCY
- ไม่มี commit/deploy/DNS/server changes หรือ credentials/dataจริงเพิ่มในsource; T-006/T-007รอ isolated SQL2022 evidence
