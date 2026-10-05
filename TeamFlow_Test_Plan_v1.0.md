# TeamFlow — Test Plan v1.1

**วันที่:** 5 ตุลาคม 2026 · **สถานะ:** แผนทดสอบ ยังไม่มีผลการรัน  
**ชุดกรณีทดสอบ:** `TeamFlow_Test_Cases_v1.0.md` — 84 Cases / 12 หมวด  
**ต้นทาง:** current attachment `TeamFlow_Task_v1.0.md` และ SRS v1.0 ที่ตรวจอ่านแล้ว


## บันทึกการยืนยัน — Baseline 1.1

เจ้าของระบบยืนยันในบทสนทนานี้: “ผม ok ตามที่เสนอ และ sql server 2022” กติกา D-01–D-11 และคำตอบ R-01–R-04 ที่เสนอถือเป็น baseline แล้ว; ฐานข้อมูลใช้ **Microsoft SQL Server 2022** แทนข้อเสนอเดิม

- R-01: ผู้ใช้กดเสร็จเองหลัง Checklist ครบ ไม่ auto-done
- R-02: Archive ระดับโปรเจกต์; งานใช้ soft delete/restore 30 วัน ไม่มี task archive แยก
- R-03: ไฟล์แนบที่ลบเก็บในถังขยะ 30 วัน ยังนับ quota จน purge; uploader/owner Lead/Admin คืนไฟล์ได้ในช่วงนี้หากยังมี write access และโปรเจกต์ active
- R-04: คง recurrence tombstone หลัง purge เพื่อกันสร้างรอบซ้ำ; technical design ใช้ source/generated ID snapshots ที่ไม่ผูก FK ถึง task ที่อาจถูกลบ
- Stack: React + TypeScript + Vite, Node.js 24 LTS + Express 5 + `mssql`/Tedious, SQL Server 2022; เครื่องมือหน้าจอ/ตรวจข้อมูล/ทดสอบตาม SRS §3.4
- Edition ของ SQL Server, patch/runtime/package versions และสิทธิ์ติดตั้งยังต้องตรวจตอนติดตั้ง ไม่มีข้อสรุปว่าเป็น Express/Developer หรือพร้อม production แล้ว

การยืนยันนี้เป็น baseline สำหรับพัฒนา ไม่ใช่ผลว่าพัฒนาหรือทดสอบแล้ว งาน coding/test ยัง TODO/NOT_RUN ยกเว้น T-001/T-002 ซึ่งปิดได้ด้วยการยืนยันและแก้เอกสารนี้ **ชื่อไฟล์คงเดิมเพื่อรักษา references; ให้ดู version 1.1 ในส่วนหัวเป็นรุ่นเนื้อหาปัจจุบัน**


## 1. คำตอบเรื่อง Unit Tests ในแต่ละ Task

Task.md ปัจจุบันระบุให้ตรวจตามความเสี่ยงใน Definition of Done และมี testtasks T-067–T-076 แต่ **ยังไม่ได้กำหนด Unit Test ทุก Task และยังไม่มีหลักฐานว่ามี Unit Testcode ที่เขียน/รันแล้ว** การอ้าง AT ใน Task เป็น acceptancecriteria ไม่เท่ากับ unit test

แผนนี้กำหนดการทดสอบที่เหมาะสมราย Task: businesslogic ใช้ Unit; API/DB/files/session/transactions ใช้ Integration; interaction ใช้ UI/E2E; backup/Windows ใช้ Operations; scope/docs ใช้ Review ไม่บังคับ Unit กับทุกหน้า/เอกสารเพื่อให้ตัวเลขดูครบ

Unit และ Integration ของส่วนที่กำลังทำต้องเขียน/รันระหว่าง Dev ตามความเสี่ยงก่อนปิด Task ไม่รอ T-068–T-075 ค่อยเริ่มทั้งหมด งานรวมท้ายเป็นการตรวจ regression/evidence ข้ามระบบ

## 2. วัตถุประสงค์และขอบเขต

พิสูจน์ว่าผู้ใช้ประมาณ30 คนหลายทีมใช้งานตามสิทธิ์ได้ ข้อมูลไม่สูญจากการลาก/แก้พร้อมกัน งานซ้ำไม่ duplicate ไฟล์ไม่เปิดสาธารณะ รายงานตรงข้อมูล สำรองกู้คืนได้ และส่ง source สำหรับ Windows ได้ตามข้อจำกัด ไม่มีการเพิ่ม AI/อีเมล/offlinewrite/nativeapp หรือ integration นอกขอบเขต

R-01–R-04 ยืนยันแล้วตาม Baseline 1.1 ใช้ expected จาก SRS ที่ปรับแล้ว หาก environment/dependency ยังไม่พร้อมให้ BLOCKED พร้อมเหตุผล; ห้ามตั้ง expected ตาม code ที่เขียนแล้ว

## 3. Test Levels และผู้รับผิดชอบ

| Level | ตรวจอะไร | ผู้รัน/เครื่องมือที่เสนอ | รันเมื่อไร |
|---|---|---|---|
| Unit | purelogic/policies/helpers หน่วยเล็ก | Codex/ผู้พัฒนา; runner ของ stack ที่เลือก | ระหว่าง Dev/เมื่อ logic เปลี่ยน |
| Integration | HTTP/auth/realtestDB/files/transactions/jobs | ผู้พัฒนา; isolatedfixtures+APIharness | แต่ละ feature และ regression |
| UI/E2E | browserjourney/forms/drag/poll/error/draft | ผู้พัฒนาและผู้ใช้; browserautomation ได้เมื่อพร้อม | feature พร้อมและ pre-UAT |
| Security negative | role/IDOR/CSRF/injection/cache/leaks | ผู้พัฒนา; testenvironment ที่ได้รับอนุญาต | ก่อนเปิดข้อมูลจริง |
| Operations | restart/migrate/backup/restore/service | ผู้ติดตั้ง/ผู้พัฒนา; isolatedmachine | ก่อน release/หลัง deploy เอง |
| Performance | p95/error/update/memory/concurrency | ผู้พัฒนา; controlledloadharness | ก่อน fullrelease/เมื่อมี perfchange |
| UAT | ใช้จริงตรงกระบวนการองค์กร | เจ้าของระบบ/ตัวแทน Admin/Lead/Member | releasecandidate บน staging |

ชื่อเครื่องมือเป็นข้อเสนอไม่ใช่ dependency ที่อนุมัติ ใช้ node:test/node:assert สำหรับ backend, Vitest สำหรับ frontend และ Playwright สำหรับ browser/API ตาม stack ที่ล็อก Unitmock ไม่แทน DBtransaction tests และ Linux ไม่แทน Windows ผลจริง

## 4. Unit Test Suites ที่เสนอ

Suite คือแผนให้สร้าง tests ไม่ใช่รายการที่รันแล้ว UT-18 เป็น conditional: เพิ่มเฉพาะ logicstate ที่แยกได้ ไม่เขียน test เลียนแบบ markup หรือ implementation เพื่อเพิ่ม coverage

| Suite | Module | Related Tasks | Boundary/negative cases |
|---|---|---|---|
| UT-01 | Field validation/allowlist | T-003, T-009, T-026 | empty/boundary/dateinvalid/enuminvalid/protectedfield ไม่เปลี่ยน |
| UT-02 | Bangkok dates / periods / monthly calendar | T-008, T-031, T-045, T-046, T-049, T-052 | UTC±midnight/null/datebasis/endExclusive/leapyear |
| UT-03 | Effective permission policy | T-011, T-021, T-022, T-043, T-050, T-052, T-053 | Admin/ownerLead/Editor/Viewer/team-only/revoked/archived/deleted |
| UT-04 | Password policy/hash verification | T-014, T-015 | 12/128boundaries/no-trim/randomsalt/verifyfail/constantsizes |
| UT-05 | Session expiry / rate-limit policy | T-014 | idle/absolute/intentionalactivity/pollnotactivity/IP-userwindows |
| UT-06 | Status/checklist completion rules | T-027, T-028 | incompletegate/done-noop/reopen/parentdoneguard |
| UT-07 | Recurrence generator | T-029 | daily/weekly/monthlyanchor31/leapyear/offset/eligiblecopy/one-successor |
| UT-08 | Board order transformation | T-034, T-035 | samecolumn/crosscolumn/anchorinvalid/append/no duplicates |
| UT-09 | Idempotency matching | T-010, T-039 | samekey-body/differentbody/user-routeisolation/expiry |
| UT-10 | Filter/date/sort normalization | T-031, T-052 | AND/OR/null-last/IDtie/datebasis/invalidrange |
| UT-11 | Notification recipients/dedupe | T-048, T-049, T-050 | selfexcluded/active/access/day/type/assigneecreator |
| UT-12 | Filename/type validation | T-041, T-043 | traversal/controlchar/allowlist/magic/UTF8/type mismatch |
| UT-13 | Quota arithmetic/reservation policy | T-042 | bytesboundary/stored+reserved/release/retentiondecision |
| UT-14 | Report calculations | T-052 | totals/statussum/overdue/zero/reopen/datebasis/ownerteam |
| UT-15 | CSV text escaping/formula neutralization | T-053 | quotes/newlines/Thai/leadingwhitespace/=+-@/tab/CR |
| UT-16 | Retention/recovery eligibility | T-060 | 29/30/31dayboundary/90daynotif/tombstone/referencedfileguard |
| UT-17 | Configuration validation | T-006 | origin/securecookie/paths/quota/timevalues/trustedproxy |
| UT-18 | UI state reducers ถ้าแยกเป็น logicmodule | T-032, T-038, T-047, T-057 | dirtydraft/pending/rollback/conflict/reconnect;ถ้าไม่แยกใช้ E2E แทน |
| UT-19 | Log redaction | T-059 | password/rawtoken/setupsecret/body/filecontent ต้องไม่ออก log |
| UT-20 | Manifest/checksum/version compatibility | T-062, T-063, T-064 | corruptfile/schemaunsupported/hashmismatch/metadatarequired |

## 5. Test Responsibility Matrix — 77 Tasks

“ไม่มี UT เฉพาะ”ไม่ได้หมายความว่าไม่ต้องตรวจ; ใช้ระดับที่เหมาะสมในช่องถัดไป ทุกรายการยัง NOT_RUN จนมี evidence สำหรับ task ทดสอบรวมให้รัน suite ที่ระบุ ไม่สร้าง Unit ใหม่เพื่อทดสอบเอกสารผลทดสอบ

| Task | งาน | Unit Suites | ระดับอื่น / วิธีตรวจ |
|---|---|---|---|
| T-001 | ล็อกขอบเขตและค่าที่ใช้พัฒนา | ไม่มี UT เฉพาะ | Review/contract/evidence |
| T-002 | ปิดจุดกำกวมระหว่าง Requirements กับ SRS | ไม่มี UT เฉพาะ | Review/contract/evidence |
| T-003 | จัด API/DTO และ error contract ให้เป็นสัญญาเดียว | UT-01 | Review/contract/evidence |
| T-004 | จัด test plan และเกณฑ์ release | ไม่มี UT เฉพาะ | Review/contract/evidence |
| T-005 | โครงสร้างโปรเจกต์และชุดคำสั่งพื้นฐาน | ไม่มี UT เฉพาะ | Operations/real filesystem; Integration ตาม feature |
| T-006 | Configuration และ startup validation | UT-17 | Operations/real filesystem; Integration ตาม feature |
| T-007 | Schema และ migrations ครบทุก entity | ไม่มี UT เฉพาะ | Operations/real filesystem; Integration ตาม feature |
| T-008 | Transaction, date และ lifecycle helpers | UT-02 | Integration ตาม feature |
| T-009 | API middleware และ validation | UT-01 | Integration ตาม feature |
| T-010 | Idempotency สำหรับคำสั่งสร้างและย้ายบอร์ด | UT-09 | Integration ตาม feature |
| T-011 | Authorization service และ query scoping | UT-03 | Integration ตาม feature |
| T-012 | Frontend shell, navigation และสถานะร่วม | ไม่มี UT เฉพาะ | UI/E2E + API binding |
| T-013 | First-run setup API และหน้าจอ | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-014 | Password hashing, login และ session | UT-04, UT-05 | Integration ตาม feature |
| T-015 | เปลี่ยนรหัสและ forced password gate | UT-04 | Integration ตาม feature |
| T-016 | Admin users API และ last-admin guard | ไม่มี UT เฉพาะ | Integration ตาม feature |
| T-017 | Login, logout, profile และเปลี่ยนรหัส UI | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-018 | Admin user management UI | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-019 | CLI กู้ Admin และบังคับออกจากระบบ | ไม่มี UT เฉพาะ | Operations/real filesystem; Integration ตาม feature |
| T-020 | Team CRUD/archive และสมาชิกหลายทีม | ไม่มี UT เฉพาะ | Integration ตาม feature |
| T-021 | Project CRUD/archive และ membership ข้ามทีม | UT-03 | Integration ตาม feature |
| T-022 | ถอนสิทธิ์ ปิดบัญชี และ cleanup assignee | UT-03 | Integration ตาม feature |
| T-023 | หน้าทีมและแต่งตั้ง Lead | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-024 | หน้าโปรเจกต์และ Editor/Viewer picker | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-025 | ชื่อองค์กรและ settings | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-026 | Task create/read/update และ validation | UT-01 | Integration ตาม feature |
| T-027 | Status transitions และ completion | UT-06 | Integration ตาม feature |
| T-028 | Checklist API และ parent guard | UT-06 | Integration ตาม feature |
| T-029 | Recurring series และ monthly anchor | UT-07 | Integration ตาม feature |
| T-030 | Soft delete/restore และการคง series | ไม่มี UT เฉพาะ | Integration ตาม feature |
| T-031 | Task query/search/filter/sort และ pagination | UT-02, UT-10 | Integration ตาม feature |
| T-032 | Task form/detail และ save conflict UX | UT-18 | UI/E2E + API binding; Integration ตาม feature |
| T-033 | Checklist/recurrence/trash UI | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-034 | Board read และ column versions | UT-08 | Integration ตาม feature |
| T-035 | Atomic board move/reorder endpoint | UT-08 | Integration ตาม feature |
| T-036 | Kanban layout และ Drag & Drop | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-037 | Keyboard/touch actions และ filtered-board guard | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-038 | Kanban rollback และ conflict recovery | UT-18 | UI/E2E + API binding; Integration ตาม feature |
| T-039 | Comments API และ append-only rules | UT-09 | Integration ตาม feature |
| T-040 | Task events และ Admin audit | ไม่มี UT เฉพาะ | Integration ตาม feature |
| T-041 | Multipart upload และ file validation | UT-12 | Integration ตาม feature |
| T-042 | Upload quota reservation และ cleanup | UT-13 | Integration ตาม feature |
| T-043 | Authorized download และ file delete | UT-03, UT-12 | Integration ตาม feature |
| T-044 | Comments/files/history panels | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-045 | งานของฉันและ task list UI | UT-02 | UI/E2E + API binding; Integration ตาม feature |
| T-046 | Month calendar และ no-due list | UT-02 | UI/E2E + API binding; Integration ตาม feature |
| T-047 | Shared refresh และ dirty draft preservation | UT-18 | UI/E2E + API binding; Integration ตาม feature |
| T-048 | Notification event dispatch | UT-11 | Integration ตาม feature |
| T-049 | Due reminder scheduler | UT-02, UT-11 | Integration ตาม feature |
| T-050 | Notification list/read-one/read-all | UT-03, UT-11 | Integration ตาม feature |
| T-051 | Notification center และ badge | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-052 | Report aggregates และนิยามตัวเลข | UT-02, UT-03, UT-10, UT-14 | Integration ตาม feature |
| T-053 | CSV export ตาม filter/access | UT-03, UT-15 | Integration ตาม feature |
| T-054 | Dashboard/report และ export UI | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-055 | Responsive และ accessible interaction review | ไม่มี UT เฉพาะ | UI/E2E + API binding |
| T-056 | PWA manifest/icons/service worker | ไม่มี UT เฉพาะ | UI/E2E + API binding; Integration ตาม feature |
| T-057 | Offline/reconnect/logout cache behavior | UT-18 | UI/E2E + API binding; Integration ตาม feature |
| T-058 | Browser matrix และ PWA/touch QA | ไม่มี UT เฉพาะ | UI/E2E + API binding |
| T-059 | Health endpoints และ operational logs | UT-19 | Operations/real filesystem; Integration ตาม feature |
| T-060 | Retention jobs และ orphan recovery | UT-16 | Operations/real filesystem; Integration ตาม feature |
| T-061 | Write freeze และ job coordination | ไม่มี UT เฉพาะ | Operations/real filesystem; Integration ตาม feature |
| T-062 | Consistent backup script และ manifest | UT-20 | Operations/real filesystem; Integration ตาม feature |
| T-063 | Restore/verification script และ rollback | UT-20 | Operations/real filesystem; Integration ตาม feature |
| T-064 | Migration upgrade และ recovery procedure | UT-20 | Operations/real filesystem; Integration ตาม feature |
| T-065 | Windows scripts และ installation guide | ไม่มี UT เฉพาะ | Operations/real filesystem; Integration ตาม feature |
| T-066 | คู่มือ Admin/Lead/Member และ developer handoff | ไม่มี UT เฉพาะ | Review/contract/evidence; Operations/real filesystem |
| T-067 | Complete test fixtures และ automated harness | ไม่มี UT เฉพาะ | ตรวจ fixture isolation/clock/reset และ test harness |
| T-068 | ทดสอบ setup/auth/users และ session edges | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-069 | ทดสอบสิทธิ์ข้ามทีมและ revocation ทุกช่องทาง | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-070 | ทดสอบงาน งานซ้ำ การลบ และแก้พร้อมกัน | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-071 | ทดสอบ Kanban/list/calendar และ refresh | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-072 | ทดสอบ comments/files/audit/notifications | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-073 | ทดสอบรายงาน CSV และ PWA | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-074 | ทดสอบ restart/backup/restore/migration และ Windows | ไม่มี UT เฉพาะ | Operations/Windows/restore regression |
| T-075 | Load/performance test 30 users | ไม่มี UT เฉพาะ | Performance/load test |
| T-076 | UAT และ acceptance sign-off record | ไม่มี UT เฉพาะ | Review/contract/evidence |
| T-077 | Source ZIP และ release completeness audit | ไม่มี UT เฉพาะ | Review/contract/evidence; Operations/real filesystem |

## 6. Test Data / Environments

ใช้ fixtureA/L1/L2/M1/M2/V/P1/P2/Pshared/Pprivate, inactiveaccount, D0Bangkok และ validfiles ตาม TestCases. แยก DB/uploads/ports/cookies/testclock จากระบบจริง. Snapshot/reset ก่อนแต่ละ case เพื่อไม่ให้ failure หนึ่งทำ case อื่นผิดทั้งหมด

- Local: Unit + Integration + browser พื้นฐาน; ไม่ถือว่า Windowsservice ผ่าน
- Staging: build/config เดียวกับ releasecandidate ไม่มีข้อมูลจริง; ผู้ใช้ UAT ได้
- Windows test: freshZIP/runtime/service/proxy/HTTPS/dataACL/TaskScheduler ที่ผู้ติดตั้งมีสิทธิ์
- Performance: record≥2logicalCPU/4GB/SSD หรือ spec จริง และ versions ทั้งหมด
- ไม่มี environment/device ให้ NOT_RUN/BLOCKED พร้อมเหตุผลและผู้รับผิดชอบ ห้าม markPASS จากการอ่าน code

## 7. หลัง Dev ให้ทดสอบอย่างไร

1. ระบุ build/commit และ approvedbaseline; ตรวจผล Unit/Integration ที่ควรมีจาก Dev ไม่เริ่ม UAT จาก mockauth
2. ตั้ง testinstance และ seedfixture; ตรวจ health และข้อมูลตั้งต้น
3. รัน Smoke subset 30 กรณีที่ระบุใน TestCases; ไม่ผ่าน critical ให้หยุดขยาย UAT และแก้ก่อน
4. รัน Functional/UI ทุกหมวดตาม Taskdependency;กรณี API/concurrency ให้ผู้พัฒนาช่วยตรวจ
5. รัน security/files/restore/fault tests ใน isolatedinstance; เก็บ response/DBcounts/checksums ที่ redact แล้ว
6. รัน browser/accessibility/performance/Windows;เครื่องที่ไม่มีระบุผลค้าง
7. ผู้ใช้เดิน5UATjourneys และบันทึกปัญหา;แก้แล้ว retestcase เดิมกับ regression บริเวณที่เกี่ยวข้อง
8. สรุป releasecandidate ผลและ remainingblockers ไม่ถือ smoke ผ่านเท่ากับครบทุก AT

**Smoke subset ไม่ใช่แผนตัด scope:** เลือกตรวจทางสำคัญเร็ว; remainingcases ต้องผ่านตาม releasegate ก่อนรับรอง fullrelease

## 8. Entry / Exit Criteria

### Entry สำหรับ post-development testing

- source/build/config/migrationversion ชัดและ fixture พร้อม
- criticalbaselineR-01–R-04 ที่ใช้ test มีคำตอบ
- Unit/Integration ของ auth/ACL/task/recurrence/board มีผลจริง
- ใช้ testenvironment ไม่มี publicdefaultpassword หรือข้อมูลจริง

### Exit สำหรับใช้ข้อมูลจริง

- P0 ทุกกรณีใน approvedscopePASS ไม่มี critical/majoropen defect ที่กระทบสิทธิ์หรือข้อมูล
- auth/scope/revocation/taskversion/atomicmove/recurrence/fileaccess/backuprestore มี evidence จริง
- ผล Windows/HTTPS/service และ UAT ต้องมีหรือประกาศว่ายังไม่ผ่านพร้อมข้อจำกัด;ไม่ใช้ localresult แทน
- P1 ทุกกรณีผ่านก่อน fullrelease; ถ้าต้อง defer ให้ owner เปลี่ยน scope และบันทึกไม่ซ่อนงานตกหล่น
- ไม่มี password/token/liveDB/logs ใน sourceZIP; license/README ครบ

## 9. สถานะผลและ Bug Report

| Result | นิยาม |
|---|---|
| NOT_RUN | ยังไม่รัน |
| PASS | steps ทั้งหมดและ expected ทั้งหมดผ่านพร้อม build/evidence |
| FAIL | actual ต่าง expected มี bugID |
| BLOCKED | prerequisites/decision/environment ยังไม่พร้อม ระบุสาเหตุ |
| NOT_APPLICABLE | approvedscope เปลี่ยนและมี decisionreference ไม่ใช้เพื่อเลี่ยง failure |

Bugrecord: ID, summary, severity, caseID, build/OS/browser/role, preconditions, steps, expected, actual, reproducibility, evidence, owner, fixversion, retestresult. แนบภาพ/HTTP/log หลังลบ credentials/cookie/token/ข้อมูลจริง

Severity: Critical=data leak/authbypass/data loss; Major=coreworkflowblocked/incorrectrecurrence/backupunusable; Minor=มี workaround; Cosmetic=visualonly. Priority ของ case(P0/P1)และ severity ของ bug เป็นคนละสิ่ง

## 10. Regression / Coverage Policy

- เปลี่ยน roles/membership ให้ rerunauth+ACL+download+notification+CSVscope
- เปลี่ยน status/ordering ให้ reruntaskchecklist+recurrence+boardconflict+reports
- เปลี่ยน files ให้ rerunallowlist/quota/crash/download/retention/backup
- เปลี่ยน cache/authUI ให้ rerunsession/offline/logout/dirtydraft
- เปลี่ย nschema/runtime/deploy ให้ rerunmigration/restart/backuprestore/Windows
- ไม่บังคับ100% linecoverage;ดู branchbehavior และ businessrisk ไม่เขียน Unit ที่ mirrorimplementation
- ติด coverage FR40/AT30 กับ case IDs และ taskregister; mapping ครบไม่ใช่ผล PASS

## 11. ข้อจำกัดของแผนนี้

TestCases รวมกรณีหลักและ boundary ที่ระบุ ไม่ใช่การรับรองว่าทุก possibleinput ปลอดภัยหรือไม่มี bug;ต้องเพิ่ม cases ตามข้อผิดพลาดที่เจอและ baseline ที่เปลี่ยน. ตัวเลขจำนวน cases ไม่ใช่ตัววัดคุณภาพ. เอกสารนี้ไม่สร้างหรือรัน testcode ; การอัปเดตครั้งนี้ปรับ Task.md ร่วมกับ SRS ตามคำยืนยันของเจ้าของระบบ

## 12. Source / Change Log

- `TeamFlow_Task_v1.0.md` baseline 1.1 SHA-256: `bcff8eab1f550fe31e05d614eb22788e79345e610b186df6a81fac12b10ff972`
- `TeamFlow_SRS_v1.0.md` รุ่นที่ตรวจอ่าน: baseline 1.1; 74690 bytes
- ตาราง FR/AT↔Case อยู่ใน`TeamFlow_Test_Cases_v1.0.md`

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | แยก Unit/Integration/UI/Operations ราย77Tasks;เสนอ20Unit suites;สร้าง84post-Devcases;ทั้งหมด NOT_RUN |
| 1.1 | 2026-10-05 | เจ้าของระบบยืนยันกติกา; R-01–R-04 resolved; SQL Server2022/mssql; filetrash/restore30วัน; coding/testsยังไม่ผ่าน |

## SQL Server 2022 Test Addendum

- Integration/Test fixtures ใช้ SQL Server2022database แยกจริง;ไม่ใช้ SQLite/mockDB เป็นหลักฐาน transaction ผ่าน
- ทดสอบ NULLfilteredunique/UnicodeNVARCHAR/FKpurge/optimisticversions/boardrank สองระยะ
- จำลอง locktimeout/deadlock/connectionloss โดยให้ DBA/ผู้พัฒนาทำบน isolatedinstance;querytimeout ที่ไม่รู้ commit ผลให้ตรวจ key/state ก่อน retry
- .bakbackup/RESTORE กับ uploads คู่กัน;VERIFYONLY ไม่แทน actualrestore;SQLServerserviceaccountpath/permissions และ Edition ตรวจบนเครื่องเป้าหมาย
- filetrash30 วัน/restorepermission/quota/cleanupqueue เป็น expected ยืนยันแล้ว;Unit/Integration/UI ต้องครอบคลุม
