# T-004 — ชุดรายการทดสอบและเกณฑ์ส่งมอบ

วันที่: 5 ตุลาคม 2026 · Business baseline 1.1 + RD-01–RD-08 · Effort ที่กำหนด: **Medium**

สัญญา T-003 ผ่านแล้ว งานนี้จัดแผนและเครื่องมือตรวจหลักฐาน ยังไม่ได้ทดสอบแอปจริง ฐานข้อมูล Windows หรือ UAT ผล TC/AT/RV/UAT/REL ทั้งหมดยัง **NOT_RUN** ค่า model/effort/speed ที่เลือกจริงตรวจจากเครื่องมือไม่ได้ ไม่มีการเปลี่ยนค่า runtime

## รายการและวิธีตรวจ

- [tests/test-manifest.json](tests/test-manifest.json): 77 tasks, 20 unit suites, 84 TC, 30 AT, 20 required variants, 5 UAT journeys, 4 release reviews และ smoke 30 กรณี; FR40/NFR8/BR18 มีเจ้าของงานครบ
- [tests/test-policy.mjs](tests/test-policy.mjs): ต้นทางขั้นตอน/expected/หลักฐานของ variants และกติกา fixtures/environments/sequencing
- [tests/execution-records.json](tests/execution-records.json): ผลรันจริง แยกจากรายการที่ออกแบบไว้; ขณะนี้ records ว่าง ไม่สร้าง PASS จำลองในไฟล์นี้
- [contracts/test-manifest.json](contracts/test-manifest.json): หลักฐาน contract เฉพาะ T-003 แยกไว้ ไม่ปิด TC/AT หรือ unit suite ของ feature ที่ยังไม่ทำ

```sh
npm run build:test-plan
npm run check:test-plan
npm run test:test-plan
```

คำสั่งแรกสร้าง manifest จากตารางใน Task/Test Plan/Test Cases/SRS และ policy คำสั่งตรวจจะล้มเหลวถ้าไฟล์ generated ไม่ตรงต้นทาง, รายการตกหล่น, dependency ไม่ตรงรายละเอียด/วน, ไม่มีเจ้าของหรือหลักฐาน, record ใช้สถานะผิด หรือ artifact ไม่มี/เปลี่ยน hash ส่วน tests ทดสอบกติกาตรวจแผนด้วยข้อมูลจำลองที่ไม่ถูกบันทึกเป็นผลแอปจริง

ตรวจเกณฑ์ส่งมอบสำหรับ build จริงด้วย `npm run check:test-plan -- --build BUILD_ID --source-sha256 SOURCE_SHA256 --results tests/execution-records.json` โดยแทนค่าด้วย build ID และ SHA-256 ของ source candidate ที่ตรึงไว้ คำสั่งคืน exit code 1 เมื่อ final gate ยังไม่ผ่าน การตรวจทั่วไปที่ไม่ระบุ build ตรวจแผนได้ผ่าน แต่ไม่รับรอง release

## แยกระดับและ environment

| ระดับ | ผู้รับผิดชอบและหลักฐาน |
|---|---|
| Unit/contract | ผู้พัฒนา; pure logic/permission/date/version/serialization; mock ไม่แทน transaction หรือ HTTP |
| Integration/security | ผู้พัฒนา; HTTP จริง + isolated DB/files/session; ตรวจผล rows/versions/events/bytes และ negative permissions |
| UI/E2E | ผู้พัฒนา/ผู้ทดสอบ; browser จริง ระบุรุ่น/OS/device; drag/keyboard/touch/poll/conflict/draft/cache |
| Operations/Windows | ผู้ติดตั้ง/เจ้าของ; fresh ZIP, service/HTTPS/ACL/restart/scheduler/actual backup-restore/migration |
| Performance | ผู้พัฒนา; fixture 30 users/15 active, load/spec/version/latency/error/memory ตาม TC-083/084 |
| UAT | เจ้าของ/ตัวแทน Admin/Lead/Member; 5 journeys พร้อมชื่อผู้ทดสอบ actual และ sign-off |

`pure-node22` ใช้เฉพาะ pure/review; `sqlite-local` คือ local ชั่วคราว; `sqlserver2022` ต้อง SQL Server2022 จริง; `windows-sqlserver2022` ต้อง Windows+SQL2022 จริง ใช้ Node22 ทุก profile ผล SQLite ไม่ปิด SQL acceptance และ macOS ไม่ปิด Windows acceptance ผล browser ต้องบันทึก Chrome/Edge/Firefox/Safari รุ่นปัจจุบันและก่อนหน้าหนึ่งรุ่น ณวันรัน; ระบุ real device/emulation และ device ที่ยังขาด

## Fixtures และการรันซ้ำ

ใช้ A/L1/L2/M1/M2/V/Inactive และ P1/P2/Pshared/Pprivate ตาม Test Cases สร้าง passwords เฉพาะตอนรัน ใช้ synthetic data และ snapshot/reset ของ DB/uploads/cookie jars ก่อนทุก case/variant/ลำดับการแข่งขัน; ไม่พึ่งผลกรณีก่อน การ reset เป็นงาน test instance เท่านั้น

เวลา UTC/Bangkok และ fault injection ใช้ internal harness ไม่เพิ่ม public endpoint เหตุการณ์พร้อมกันใช้คนละ DB connection กับ explicit barriers/timeout/finally rollback และตรวจทั้งสองลำดับ commit; ไม่ใช้การหน่วงเวลาสุ่มเป็นหลักฐาน concurrency จับ DB state ด้วย connection ใหม่หลัง fault แล้วตรวจ key/state ก่อน retry

## Required variants

แต่ละ RV มี setup, steps, expected, task/case owners, provider และชนิดหลักฐานครบใน manifest รวมอยู่ภายใน 84 case IDs เดิม กรณีใดมี RV ที่เกี่ยวข้องยังไม่ผ่าน จะยังปิด acceptance ส่วนนั้นไม่ได้

| Variant | ประเด็นและหลักฐานสำคัญ |
|---|---|
| RV-01 | Archived project: normal write ถูกปฏิเสธ; Admin/owner Lead ลบ/คืนงานได้ตาม cutoff/version; งานที่คืนยัง read-only |
| RV-02 | Demote Admin: revoke session; cleanup เฉพาะ open assignment ที่เสีย effective write; รักษา Lead/Editor และ done history; last Admin race |
| RV-03 | Reopen/restore: assignee inactive/Viewer/revoked กลายเป็น null พร้อม audit; eligible assignee และ done history คงอยู่ |
| RV-04 | เปิด team ก่อน project; create/unarchive แข่ง archive team ต้องไม่ละเมิด parent invariant |
| RV-05 | cutoff UTC 30×24h ที่ -1ms/ตรง/+1ms; restore-vs-purge ทั้งสองลำดับ; ไม่มี half state |
| RV-06 | unlink failure/restart/retry: cleanup durable, quota ไม่หายก่อนลบ bytes สำเร็จ, scheduler/CLI กลไกเดียวกัน |
| RV-07 | Monthly anchor preserve/reset/clear, Jan31/Feb/Mar/leapyear และ successor เดิมไม่เปลี่ยน |
| RV-08 | Revoke-vs-write ทั้งสองลำดับ; ตรวจ detail/files/search/notifications/CSV และ old-key replay ไม่รั่ว |
| RV-09 | Checklist-vs-done และ fault กลาง status/successor/event/notification ต้อง rollback ทั้งชุด |
| RV-10 | Concurrent board moves/versions/key retry และ failure ระหว่าง rank สองระยะ; ไม่มี rank ซ้ำหรือ task หาย |
| RV-11 | Quota reserve/finalize-vs-freeze, active uploads/crash recovery และ snapshot DB/files ตรงกัน |
| RV-12 | SQL2022 lock timeout: retry bounded, exhausted503/Retry-After, ไม่มี partial commit |
| RV-13 | SQL2022 deadlock victim: reversed lock order + barriers, victim rollback/retry, ไม่มีผลซ้ำ |
| RV-14 | SQL2022 connection loss ก่อน commit: authoritative state จาก connection ใหม่, cleanup/retry once |
| RV-15 | SQL2022 query timeout ก่อน commit และ lost acknowledgement หลัง commit: resolve key/state ก่อน retry |
| RV-16 | Logout/expiry/reset/CSRF ข้ามแท็บ, history/browser/proxy/SW cache; polling ไม่ต่อ idle; sensitive data ถูกล้าง |
| RV-17 | Visible refresh ≤10s รวม response latency; Bangkok midnight; scoped opaque revision ไม่เผย private activity |
| RV-18 | Windows/SQL2022 accounts/ACL/service/HTTPS/scheduler; actual clean RESTORE/migration/recovery; VERIFYONLY ไม่พอ |
| RV-19 | Canonical JSON/multipart content hash, key scope/expiry/conflicting intent/replay หลัง revoke |
| RV-20 | Audit/notification primitives ใน feature transaction; insert failure/recipient revoke/key retry ต้องไม่ partial |

## รูปแบบผลและหลักฐาน

ใช้ PASS/FAIL/BLOCKED/NOT_RUN ตาม Test Plan; ไม่มี NOT_APPLICABLE เพื่อข้าม scope ปัจจุบัน หากเจ้าของเปลี่ยน scope ต้องแก้ manifest/criteria พร้อม decision reference ก่อนประเมินใหม่

record ต้องระบุ `id`, `profile`, `status`; ถ้ารันหรือ BLOCKED ต้องมี `build`, immutable `sourceSha256`, `schemaVersion`, `tester`, `role`, UTC `date`, `environment` (Node22, OS/รุ่น, provider/product/version/driver และ browser ถ้าเป็น UI) PASS/FAIL ต้องมี actual และ evidence `{path, sha256}` ที่มีจริงใน workspace; ห้าม .env/live DB/backup/uploads ใน evidence AT/UAT/REL ต้องมี signoff; TC-074 ต้องมี browserCoverage ครบ 4 browsers×2 version bands

FAIL ผูก defectId ใน defect register: severity Critical/Major/Minor/Cosmetic, owner, summary, cases, status OPEN/CLOSED; CLOSED ต้องอ้าง retest evidence BLOCKED ระบุ reason และ tester รับผิดชอบตาม record ถ้าไม่มี record ให้ NOT_RUN เสมอ

การตรวจ hash/รูปแบบไม่ยืนยันว่า actual เป็นจริง ผู้ทดสอบต้องตรวจ expected ทุกข้อด้วยหลักฐานจริง; AT ต้อง review subscenarios ตาม SRS ไม่อนุมาน PASS จาก case mapping เครื่องมือตรวจเกณฑ์ไม่ให้ผลจาก build/hash เก่ามาปิด build ใหม่ และไม่ให้ PASS อีก profile กลบ FAIL/BLOCKED ที่ยังอยู่บน build เดียวกัน ต้องแก้/รันทดสอบซ้ำและอัปเดตหลักฐาน

## ลำดับพัฒนาและการปิด Task

- T-005/T-007/T-008/T-010/T-011 ต้องวาง minimal provider-specific test harness และ atomic audit/notification persistence ให้ feature ใช้ได้ก่อนปิดงาน; T-067 ขยาย fixtures/regression ไม่ใช่จุดเริ่มเขียน tests
- T-016 ทำบางส่วนได้ก่อน T-022 แต่ deactivate/demote acceptance ยังไม่ครบจน cleanup ผ่าน; T-027 ยังไม่ปิด recurring completion acceptance ก่อน T-029 transaction/successor tests ผ่าน งานบางส่วนคง IN_PROGRESS
- T-040/T-048 ต่อยอด history/dispatch จาก persistence ที่ feature ใช้อยู่แล้ว ไม่ใช้ hook ว่างแทน required behavior
- TODO คือ backlog; READY/WAIT_DEPENDENCY คำนวณจาก dependencies; ไม่ใช้ BLOCKED เพียงเพราะยังไม่ถึงคิว Effort แสดงก่อนเริ่มและเมื่อรายงานงานถัดไปตาม Task Register

## เกณฑ์ส่งมอบ

| Gate | เงื่อนไข |
|---|---|
| G0 | T-001–T-004 DONE ตามหลักฐาน; เปิด T-005 ได้ แต่ยังไม่เปิดใช้งานแอป |
| Source candidate | REL-01/02: ZIP hash/inventory/exclusion/secret review และ runtime/lock/licenses/README/config/source ครบ; แนบ known defects และ pending results ทุกกรณี; ใช้ทดสอบ Windows/UAT |
| Final source / G4 | TC ทั้ง84 + AT30 explicit review + RV20 บน required profiles + UAT5 + REL4 PASS ของ build/hash เดียวกัน; T-001–T-076 DONE; Critical/Major ไม่มีค้าง; P0/P1 และ required SQL/Windows/performance/UAT ไม่ใช้ผล local แทน |
| ใช้ข้อมูลจริง / G5 | หลักฐาน final รวม Windows fresh install/HTTPS/service/ACL/scheduler/backup/actual restore/UAT จริง; เจ้าของ deploy เอง ไม่มีคำสั่ง DNS/server/deploy ในงานนี้ |

REL-03 คือ fresh unzip Windows quick start; REL-04 คือ FR/NFR/BR/API/screens coverage + defect/retest + final sign-off Source candidate ต้องสร้างใน pre-release/T-065 เพื่อรัน TC-080/UAT ได้ก่อน T-077; T-074/T-076/T-077 ยังไม่ DONE ถ้า required acceptance ไม่ผ่าน การส่ง candidate ไม่ใช่ final sign-off

Gate ราย feature G1/G2/G3 ยังใช้ Task §3 และ acceptance/variants ของ feature ที่เกี่ยวข้อง; full regression ไม่แทนการตรวจสิทธิ์/ธุรกรรมขณะพัฒนา

## Scope update — 2026-10-06

FR-25/T-046/AT-19/TC-049 ครอบคลุม Calendar/Gantt ตาม Requirements/SRS1.6. จำนวน IDs เดิมคงเดิม แต่ต้องรันขั้นตอน Gantt ที่เพิ่มครบก่อนปิด case/AT. Regenerate manifest และ check:test-plan/test:test-plan; plan PASS ไม่เป็น UI/SQL/Windows/UAT PASS. Design review ครอบคลุม4 views ตาม SRS11.
