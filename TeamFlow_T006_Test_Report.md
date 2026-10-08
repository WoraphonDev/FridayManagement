# T-006 — Configuration/startup validation

## Follow-up — 8 October 2026

Owner confirmed no SQL test environment and requested preparation. Read-only preflight and sequential13-case focused native command now available; see TeamFlow_SQLServer_Foundation_Runbook.md and reports/sql-foundation-preparation-results.json. New readiness5/5, combined config43/43 and schema13/13 PASS; type/lint PASS. Native13SKIP/0executed; command exits1 NOT_READY before native fixtures. T-006/T-007 remain IN_PROGRESS, native SQL/Windows/UAT NOT_RUN. Current counts DONE6/77, remaining71 supersede older counts below. Declared High; actual runtime model/effort NOT_VERIFIED; next native T006/T007 High.


วันที่: 6 ตุลาคม 2026 (Asia/Bangkok) · Owner: Codex · **IN_PROGRESS: local/config ผ่าน; SQL2022 integration NOT_RUN**

Effort ตาม Task Register: **High** (GPT-6.1 Sol / Standard); actual model/effort/speed **NOT_VERIFIED** ตามข้อจำกัดเครื่องมือเดิม ไม่มีการอ้างว่าเปลี่ยนค่าในแอป ไม่มีการเปลี่ยน shared Node runtime

## ผลที่ทำแล้ว

Configuration contract ครบ28 SRS keys + NODE_ENV; explicit provider, origin/cookie/proxy validation, TLS/SQL options/timeouts, quota/session/poll/reminder/retention bounds และ absolute writable paths นอก source/build/webroot ตรวจ canonical symlink/junction/dangling/hardlink ก่อนเปิด HTTP ไม่มี SQL-to-SQLite fallback และ errors แสดงเฉพาะ key/รหัสคงที่

Local single-instance ใช้ exclusive kernel loopback guard ตาม canonical DB identity กันเปิด SQLite DB เดิมคนละ PORT; shutdown/listen failure/crash คืน guard ไม่สร้าง PID lockfile และไม่หยุด process ของโปรเจกต์อื่น Dedicated SQL Session applock แยกจาก pool รองรับ exclusion/release/session-loss shutdown ไม่มี reconnect; lifecycle จำลองผ่าน แต่ยังไม่อ้างผลจาก SQL2022 จริง

README/.env.example/TeamFlow_Configuration.md ระบุ environment ที่ต้องตั้ง รวม LOG_DIR สำหรับ start/dev/migrate/seed; .env ไม่ถูกโหลดอัตโนมัติ ไม่มี seed/job/DB creation จาก shell startup และ production ยังถูกปฏิเสธ readiness คง503จน business tasks พร้อม

## ผลตรวจที่รันจริง

Environment: macOS/arm64, Node22.23.3/npm10.9.9, SQLite bundled node:sqlite สำหรับ temporary local; Chromium153.0.8010.12 รุ่นที่ติดตั้งจาก T-005 ไม่ใช่ full browser matrix

| Check | Actual |
|---|---|
| Configuration suite | PASS37/37: pure parsing/options19 + real filesystem8 + real HTTP/process6 + synthetic SQL session lifecycle4 |
| Config/path negatives | PASS: wrong/missing provider/origin/cookie/proxy/numeric/timing/quotas/TLS, source descendants/ancestors/aliases, dangling symlink/hardlink/file-as-directory, no secret values in errors |
| Startup/instance | PASS: actual loopback startup/duplicate/release, occupied API port cleanup, invalid config before FS/listen, Host-independent origin/exact-IP proxy, failed SQL connect does not create SQLite, SIGKILL own child then reacquire |
| SQL synthetic lifecycle | PASS4/4: Session/Exclusive/nonblocking request, close once, negative/connect/request failures, end/error during acquisition (รวม error หลัง callback ก่อน promise continuation), held-session loss once |
| Fresh source copy | PASS: offline lockfile npmci, strict typecheck, build, 121/121 combined tests, migrate apply/repeat, explicit seed, built HTML/live200/ready503; temporary copy/fixture deleted |
| Regression within fresh copy | PASS84/84: foundation5 + frontend1 + contract61 + planning17; configuration37 เพิ่มเป็น121 ไม่ใช่84fullTCผ่าน |
| Chromium smoke | PASS1/1: real rendered shell, no page errors, 360px no horizontal overflow; isolated port43171 |
| Lint/contract/test-plan/license | PASS: strict lint, 52routes/75schemas unchanged, manifest inventories unchanged, license390 entries/missing0 |
| Real SQL2022 harness | NOT_RUN: 2 tests SKIP (foundation transaction + guard exclusion/release/session-loss); ไม่มี isolated SQL2022 environment |

Config suite37 ผ่านใน working source และ fresh-copy ล่าสุดหลังแก้ acquisition-loss race; browser smoke ครอบคลุม local SQLite startup ส่วน SQL branch ยังไม่รันจริง ค่าทดสอบใช้ synthetic inputs ไม่มีจริงcredentials/DB/uploads/backup ถูกเพิ่มในsource

## Traceability และเกณฑ์ที่ยังไม่ปิด

UT-17 / T-006: config/defaults/production negatives/path/proxy/guard checks แยก provider; FR-37/40, NFR-02/07, SRS3.2–3.3 เป็นขอบเขตงานนี้ TC-070 ที่เกี่ยวข้องตรวจได้เพียง config/trust function/origin ส่วน security headers/auth จริงยัง pending; TC-080/AT-28/RV-18 Windows/service/HTTPS/ACL/install/backup/recovery ยัง NOT_RUN

T-006 คง **IN_PROGRESS** เพราะ checklist SQL2022 single-instance ยังไม่มี real connection/exclusion/session-loss evidence ผล mock/local ไม่ปิดเกณฑ์นี้ ไม่มีการขอเปลี่ยน scope หรือใช้ production instance ทดลอง `tests/execution-records.json` คงว่าง; full84TC/30AT/20RV/5UAT/4REL ยัง NOT_RUN

ข้อจำกัด: TCP guard hash collision fail closed; SQLite temporary/local เท่านั้น; retention defaults ล็อกตาม baseline; production bootstrap refused; quota/session/jobs/auth/CSRF ยังเป็น tasks ถัดไป การตรวจ bounds ไม่ใช่หลักฐานฟีเจอร์จริง SQL host backup path ไม่ถูก probe บนเครื่องแอป

## หลักฐานและความคืบหน้า

- [Configuration](TeamFlow_Configuration.md), [README](README.md), [machine results](reports/T-006-config-results.json), [fresh-copy results](reports/T-006-fresh-checkout.json)
- **DONE5/77 · IN_PROGRESS1 · TODO71 · remaining72**; T-007 High และ T-012 Medium dependencies พร้อม; งานถัดไปตามลำดับ T-007 High
- ไม่มี commit/deploy/DNS/server changes หรือเปลี่ยน process/runtime โปรเจกต์อื่น; รอ isolated SQL2022 integration เพื่อปิด T-006
