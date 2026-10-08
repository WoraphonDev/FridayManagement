# TeamFlow — Test Plan v1.35

**วันที่:** 8 ตุลาคม 2026 · **สถานะ:** แผนทดสอบ ยังไม่มีผลการรัน
**ชุดกรณีทดสอบ:** `TeamFlow_Test_Cases_v1.0.md` — 99 Cases / 13 หมวด  
**ต้นทาง:** current attachment `TeamFlow_Task_v1.0.md` และ SRS v1.0 ที่ตรวจอ่านแล้ว


## Monday-style addendum — 8 ตุลาคม 2026 (T-078)

เจ้าของอนุมัติ `TeamFlow_Requirements_Addendum_Monday_Draft.md` (8 ต.ค. 2026) ด้วยคำสั่งให้ทำ T-078 ต่อ: เพิ่ม Personal/Workspace/Admin แบบ monday, แยก job title ออกจากสิทธิ์, project role `manager` + permission checkbox รายคน P-01–P-10, Docs/Files/Workload/Overview/Favorites, Main table/side panel ใหม่ และ motion AN-01–AN-13. FR-46 Updates feed เลื่อนไปรอบถัดไป; exclusion เดิม (custom fields/status, dependencies, time tracking, automations, integrations, chat, real-time co-editing, email/AI) คงอยู่. เป็นการเปลี่ยนเอกสารเท่านั้น ยังไม่มี code/schema/API ของ addendum และ FR/AT ใหม่ทั้งหมด NOT_RUN. เพิ่ม UT-21–UT-23, responsibility T-078–T-091 และ TC-085–TC-099/AT-31–AT-40 ทั้งหมด NOT_RUN

## เพิ่ม Gantt และดีไซน์ตามคำสั่งเจ้าของ — 6 ตุลาคม 2026

เจ้าของเลือกปรับแผนและตัวอย่างดีไซน์ก่อน เพิ่ม Gantt เข้าเวอร์ชันแรก และใช้แนว Monday Project Management: sidebar, project header, view tabs Table/Gantt/Calendar/Kanban, grouped table, status สีพร้อมข้อความ, owner avatars และ task detail. ใช้ข้อมูล/สิทธิ์เดียวกันทุกมุมมอง; ไม่เพิ่ม AI/email/custom fields/dependencies/critical path/automatic scheduling. Mock ใช้ข้อมูลสมมติ ไม่ใช่ระบบบันทึกงานจริง. เพิ่มเกณฑ์ FR-25/T-046 High/AT-19/TC-049; ดีไซน์ Table อยู่ T-045 และ review T-055. API/schema เดิมใช้ start_date/due_date; หากภายหลังเปลี่ยน contract ต้องรัน checks ของ T-003.

## การปรับ runtime ตามคำสั่งเจ้าของระบบ — 5 ตุลาคม 2026

ใช้ **Node.js 22** แทน Node.js 24 เพื่อให้ตรงกับโปรเจกต์อื่นในเครื่อง; ไม่อัปเกรดหรือเปลี่ยน runtime ส่วนกลาง แพ็กเกจต้องเลือกรุ่นที่รองรับ Node22 และ pin patch/lockfile ใน T-005 ก่อนปิดงาน การเปลี่ยนนี้ไม่เปลี่ยน business rules ของ Baseline1.1 และไม่ใช่ผลว่ารันทดสอบแล้ว

เจ้าของระบบยืนยันใช้ **SQLite สำหรับพัฒนา local ชั่วคราว** ร่วมกับ Node.js22; ฐานข้อมูลปลายทางสำหรับ Windows ยังคง SQL Server2022 ต้องแยก adapter/migrations/configuration และรายงานผลทดสอบตาม database provider ผล SQLite ไม่ใช้แทน SQL Server integration/concurrency/backup-restore sign-off

## ข้อยืนยันจาก readiness review — 5 ตุลาคม 2026

เจ้าของระบบยืนยัน “ok ตามที่แนะนำ” สำหรับรายการ22ประเด็นในบทสนทนา: กติกา8ข้อถือว่ายืนยันแล้วตาม SRS §18; รายละเอียดสัญญา10ข้อและแผนงาน4ข้อเป็นงานที่ต้องทำใน T-003/T-004/T-005 และ task ที่เกี่ยวข้อง ไม่ใช่ผลว่า implementation หรือ tests ผ่านแล้ว ใช้ Baseline1.1 พร้อมข้อยืนยันเพิ่มเติมนี้เมื่อข้อความเดิมกำกวม; ไม่ต้องขออนุมัติกติกาเดิมซ้ำ

## บันทึกการยืนยัน — Baseline 1.1

เจ้าของระบบยืนยันในบทสนทนานี้: “ผม ok ตามที่เสนอ และ sql server 2022” กติกา D-01–D-11 และคำตอบ R-01–R-04 ที่เสนอถือเป็น baseline แล้ว; ฐานข้อมูลใช้ **Microsoft SQL Server 2022** แทนข้อเสนอเดิม

- R-01: ผู้ใช้กดเสร็จเองหลัง Checklist ครบ ไม่ auto-done
- R-02: Archive ระดับโปรเจกต์; งานใช้ soft delete/restore 30 วัน ไม่มี task archive แยก
- R-03: ไฟล์แนบที่ลบเก็บในถังขยะ 30 วัน ยังนับ quota จน purge; uploader/owner Lead/Admin คืนไฟล์ได้ในช่วงนี้หากยังมี write access และโปรเจกต์ active
- R-04: คง recurrence tombstone หลัง purge เพื่อกันสร้างรอบซ้ำ; technical design ใช้ source/generated ID snapshots ที่ไม่ผูก FK ถึง task ที่อาจถูกลบ
- Stack: React + TypeScript + Vite, Node.js 22 + Express 5 + `mssql`/Tedious, SQL Server 2022; เครื่องมือหน้าจอ/ตรวจข้อมูล/ทดสอบตาม SRS §3.4
- Edition ของ SQL Server, patch/runtime/package versions และสิทธิ์ติดตั้งยังต้องตรวจตอนติดตั้ง ไม่มีข้อสรุปว่าเป็น Express/Developer หรือพร้อม production แล้ว

การยืนยัน baseline ไม่ใช่ผลทดสอบระบบ สถานะปัจจุบัน: T-001/T-002 DONE ด้านเอกสาร และ T-003 DONE เฉพาะ API contract/schema tests และ T-004 DONE เฉพาะ test/release plan validation ตามหลักฐานใน Task Register; application/ฐานข้อมูล/Windows/UAT และ TC/AT เต็มกรณียัง NOT_RUN **ชื่อไฟล์คงเดิมเพื่อรักษา references; ให้ดู version 1.33 ในส่วนหัวเป็นรุ่นเนื้อหาปัจจุบัน**


## 1. คำตอบเรื่อง Unit Tests ในแต่ละ Task

Task.md กำหนดการตรวจตามความเสี่ยงใน Definition of Done และมี regression tasks T-067–T-076; ไม่บังคับ Unit Test ทุก Task ขณะนี้ T-003 มี contract tests และ T-004 มี planning-policy tests ตามรายงาน แต่ยังไม่ใช่ผล application TC/AT การอ้าง AT ใน Task เป็น acceptancecriteria ไม่เท่ากับ unit test

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

ชนิดเครื่องมือตาม SRS เป็นฐานที่อนุมัติแล้ว แต่ package versions/driver ต้อง pin และตรวจใน T-005 ใช้ node:test/node:assert สำหรับ backend, Vitest สำหรับ frontend และ Playwright สำหรับ browser/API ตาม stack ที่ล็อก Unitmock ไม่แทน DBtransaction tests และ Linux ไม่แทน Windows ผลจริง

## 4. Unit Test Suites ที่เสนอ

Suite คือแผนให้สร้าง tests ไม่ใช่รายการที่รันแล้ว UT-18 เป็น conditional: เพิ่มเฉพาะ logicstate ที่แยกได้ ไม่เขียน test เลียนแบบ markup หรือ implementation เพื่อเพิ่ม coverage

| Suite | Module | Related Tasks | Boundary/negative cases |
|---|---|---|---|
| UT-01 | Field validation/allowlist | T-003, T-009, T-026 | empty/boundary/dateinvalid/enuminvalid/protectedfield ไม่เปลี่ยน |
| UT-02 | Bangkok dates / periods / monthly calendar / Gantt inclusive date ranges | T-008, T-031, T-045, T-046, T-049, T-052 | UTC±midnight/null/datebasis/endExclusive/leapyear |
| UT-03 | Effective permission policy | T-011, T-021, T-022, T-043, T-050, T-052, T-053 | Admin/ownerLead/Editor/Viewer/team-only/revoked/archived/deleted |
| UT-04 | Password policy/hash verification | T-014, T-015 | 6/128boundaries/no-trim/randomsalt/verifyfail/constantsizes |
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
| UT-21 | Permission catalog / manager policy | T-081, T-082 | แต่ละ P-key เดี่ยว/ไม่มี key/unknown key deny/เอาข้อสุดท้ายของ P-01–P-07 ออก→demote/self-edit/non-Admin/preset/stale version |
| UT-22 | Rich-text HTML sanitizer | T-084 | script/style/iframe/on*/javascript:/data URI/svg/nested/encoded/allowlist tags/200000 ตัวอักษร boundary |
| UT-23 | Workload/overview/my-overview calculations | T-083, T-088 | สัปดาห์จันทร์ Bangkok/start-only/due-only/no date/done excluded/threshold 10 vs 11/scope |

## 5. Test Responsibility Matrix — 91 Tasks

“ไม่มี UT เฉพาะ”ไม่ได้หมายความว่าไม่ต้องตรวจ; ใช้ระดับที่เหมาะสมในช่องถัดไป ผล execution ยัง NOT_RUN จนมี evidence; T-001/T-002 มีผล document review DONE แยกจาก test execution สำหรับ task ทดสอบรวมให้รัน suite ที่ระบุ ไม่สร้าง Unit ใหม่เพื่อทดสอบเอกสารผลทดสอบ

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
| T-046 | Calendar/Gantt และรายการวันที่ไม่ครบ | UT-02 | UI/E2E + API binding; Integration ตาม feature |
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
| T-071 | ทดสอบ Kanban/list/calendar/Gantt และ refresh | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-072 | ทดสอบ comments/files/audit/notifications | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-073 | ทดสอบรายงาน CSV และ PWA | ไม่มี UT เฉพาะ | รวม Unit/Integration/UI regression ตาม AT ของ Task |
| T-074 | ทดสอบ restart/backup/restore/migration และ Windows | ไม่มี UT เฉพาะ | Operations/Windows/restore regression |
| T-075 | Load/performance test 30 users | ไม่มี UT เฉพาะ | Performance/load test |
| T-076 | UAT และ acceptance sign-off record | ไม่มี UT เฉพาะ | Review/contract/evidence |
| T-077 | Source ZIP และ release completeness audit | ไม่มี UT เฉพาะ | Review/contract/evidence; Operations/real filesystem |
| T-078 | อนุมัติ addendum และรวมเข้า Requirements/SRS/Test Plan/Test Cases | ไม่มี UT เฉพาะ | Review/contract/evidence; planning manifest/check/test และ contract checks |
| T-079 | Mock UI monday-style ใหม่ (ทุกหน้า + animation) ให้เจ้าของรีวิว | ไม่มี UT เฉพาะ | Owner visual review; mock-only browser 360/768/1440 + reduced motion |
| T-080 | Job titles: schema/API/Admin UI/filter/report/CSV | UT-01 | Integration/UI/CSV; ยืนยันตำแหน่งไม่เปลี่ยนสิทธิ์ |
| T-081 | Permission catalog + checkbox รายคน + project role manager + authorization matrix | UT-03, UT-21 | Integration negative ทุก P-key × role × endpoint; HTTP/race/transaction |
| T-082 | Admin center + Permission matrix (checkbox/bulk/preset) | UT-21 | UI/Integration bulk/preset/stale version |
| T-083 | My overview + My work grouped table | UT-02, UT-23 | UI/Integration scope/Bangkok date |
| T-084 | Project Docs (schema/API/editor/sanitize/version/trash) | UT-01, UT-22 | Integration/UI/security XSS corpus/conflict/retention |
| T-085 | Project Files tab + project-level upload | UT-12, UT-13 | Integration/UI/real filesystem quota/preview |
| T-086 | Main table monday upgrade (inline/batch/drag/sticky/resize) | UT-18 | UI/E2E/Integration batch/409/drag/keyboard |
| T-087 | Task side panel (Updates/@mention/Files/Activity) | UT-18 | UI/E2E/Integration mention scope/deep link |
| T-088 | Workload + Project overview | UT-23 | UI/Integration week/threshold/scope |
| T-089 | Motion system AN-01–AN-12 + reduced-motion + Settings toggle | UT-18 | UI/E2E/accessibility/performance trace |
| T-090 | Favorites (Updates feed เลื่อนไปรอบถัดไป) | ไม่มี UT เฉพาะ | Integration/UI favorites/revoke |
| T-091 | Regression รวม addendum, SQL Server 2022 native, Windows, UAT | ไม่มี UT เฉพาะ | Regression/SQL2022/Windows/UAT |

## 6. Test Data / Environments

ใช้ fixtureA/L1/L2/M1/M2/V/P1/P2/Pshared/Pprivate, inactiveaccount, D0Bangkok และ validfiles ตาม TestCases. แยก DB/uploads/ports/cookies/testclock จากระบบจริง. Snapshot/reset ก่อนแต่ละ case เพื่อไม่ให้ failure หนึ่งทำ case อื่นผิดทั้งหมด

- Local: Node22 + SQLite สำหรับ Unit/local Integration/browser; ระบุ provider/build/schema/driver ใน evidence; ไม่ถือว่า SQL2022 integration หรือ Windowsservice ผ่าน
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
- ผล required Windows/HTTPS/service/SQL2022 และ UAT ต้อง PASS จริงก่อนใช้ข้อมูลจริง; ถ้ายังไม่มีส่งได้เฉพาะ source candidate พร้อม NOT_RUN/BLOCKED ไม่ใช้ localresult แทน
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

TestCases รวมกรณีหลักและ boundary ที่ระบุ ไม่ใช่การรับรองว่าทุก possibleinput ปลอดภัยหรือไม่มี bug;ต้องเพิ่ม cases ตามข้อผิดพลาดที่เจอและ baseline ที่เปลี่ยน. ตัวเลขจำนวน cases ไม่ใช่ตัววัดคุณภาพ. T-004 เพิ่ม executable manifest/evidence validator และ planning-policy tests ตาม TeamFlow_Test_Release_Manifest.md; ไม่ใช่การรัน application tests หรือแก้ expected ให้ตรง implementation

## 12. Source / Change Log

- Historical snapshot ของ `TeamFlow_Task_v1.0.md` baseline 1.1 SHA-256: `bcff8eab1f550fe31e05d614eb22788e79345e610b186df6a81fac12b10ff972`
- `TeamFlow_SRS_v1.0.md` รุ่นที่ตรวจอ่าน: baseline 1.1; 74690 bytes
- ตาราง FR/AT↔Case อยู่ใน`TeamFlow_Test_Cases_v1.0.md`

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | แยก Unit/Integration/UI/Operations ราย77Tasks;เสนอ20Unit suites;สร้าง84post-Devcases;ทั้งหมด NOT_RUN |
| 1.1 | 2026-10-05 | เจ้าของระบบยืนยันกติกา; R-01–R-04 resolved; SQL Server2022/mssql; filetrash/restore30วัน; coding/testsยังไม่ผ่าน |
| 1.2 | 2026-10-05 | เจ้าของระบบกำหนด Node.js22 แทน24; ขอ SQL อื่นชั่วคราวและรอเลือกชนิด/ขอบเขต; คง business baseline1.1 และผลทดสอบเดิม |
| 1.3 | 2026-10-05 | ยืนยัน SQLite สำหรับพัฒนา local ชั่วคราว; SQL2022 ยังคงปลายทาง; ผลทดสอบแยก provider และไม่เปลี่ยน NOT_RUN เป็น PASS |
| 1.4 | 2026-10-05 | เจ้าของระบบยืนยันข้อเสนอ readiness22ประเด็น; ล็อก8กติกา/แผนปิด10contracts+4planning gaps; ไม่มีผล application tests ใหม่ |
| 1.5 | 2026-10-05 | T-003 เพิ่มmachine API/DTO contractและUT-01/T-003 schema checks; relatedAT/TCยังNOT_RUN; ไม่เปลี่ยนbusinessscope |
| 1.6 | 2026-10-05 | T-004 manifest/20requiredvariants/evidence/release gates; planning tests17/17PASS; actual84TC/30AT/Windows/SQL/UATยังNOT_RUN |
| 1.7 | 2026-10-05 | T-005 foundation SQLite/HTTP/frontend/Chromium/fresh-copy evidence; 84fullTC/30AT/SQL2022/Windows/UATยังNOT_RUN |
| 1.8 | 2026-10-06 | T-006 config/local startup/synthetic SQL guard evidence; real SQL2022/Windows/TC/AT NOT_RUN; Task IN_PROGRESS |
| 1.9 | 2026-10-06 | T-007 SQLite schema/legacy migration/atomic persistence evidence; real SQL2022/full TC/AT/Windows/UAT NOT_RUN |
| 1.13 | 2026-10-06 | T-010 local idempotency13 + combined199 PASS; SQL28SKIP/NOT_RUN; real auth/features/cleanup scheduler/full TC/AT/Windows/UAT still pending |
| 1.14 | 2026-10-06 | T-011 authorization14 + combined213 PASS; SQL38SKIP/NOT_RUN; current DB permission/scopes/HTTP/race foundation only; full login/features/TC/AT/Windows/UAT pending |
| 1.35 | 2026-10-08 | T-078 Monday-style addendum: UT-21–23, T-078–T-091, 99 cases/40 AT; ทั้งหมด NOT_RUN |

## SQL Server 2022 Test Addendum

- SQL2022 integration/Test fixtures ใช้ SQL Server2022database แยกจริง; SQLite local integration ที่ยืนยันเพิ่มรายงานเป็นผล local provider เท่านั้น ไม่ใช้เป็นหลักฐาน SQL2022 transaction ผ่าน
- ทดสอบ NULLfilteredunique/UnicodeNVARCHAR/FKpurge/optimisticversions/boardrank สองระยะ
- จำลอง locktimeout/deadlock/connectionloss โดยให้ DBA/ผู้พัฒนาทำบน isolatedinstance;querytimeout ที่ไม่รู้ commit ผลให้ตรวจ key/state ก่อน retry
- .bakbackup/RESTORE กับ uploads คู่กัน;VERIFYONLY ไม่แทน actualrestore;SQLServerserviceaccountpath/permissions และ Edition ตรวจบนเครื่องเป้าหมาย
- filetrash30 วัน/restorepermission/quota/cleanupqueue เป็น expected ยืนยันแล้ว;Unit/Integration/UI ต้องครอบคลุม

## Required readiness variants ที่อนุมัติแล้ว

T-004 สร้าง executable manifest ใน tests/test-manifest.json และ TeamFlow_Test_Release_Manifest.md สำหรับ RD-01–RD-08 และ C-01–C-10/M-01–M-04 แล้ว โดยใช้ cases/variants ด้านล่างใน Test Cases; T-005/foundation สร้าง minimal test harness ก่อน feature sign-off ไม่รอ T-067 ทั้งหมด; candidate ZIP ใช้ทดสอบ Windows/UAT ก่อน final release; ผล provider-specific ต้องระบุครบก่อนปิด required acceptance

## UT-01 / T-003 execution reference

contracts/test-manifest.json จับคู่contract testsในtests/contracts/contract.test.mjsกับFR-05/18/40; check:contractตรวจ52routes/owners/strictschemas และtest:contractตรวจboundary/unknownfields/query/mergedvalidation/DTOprivacy; ผลจริงบันทึกreports/T-003-contract-results.jsonและTeamFlow_T003_Test_Report.md ส่วนHTTP/auth/database/AT/TCvariantsยังNOT_RUN ไม่ปิดUT-01ของT-009/T-026จากผลT-003

## T-004 plan validation evidence

[TeamFlow_Test_Release_Manifest.md](TeamFlow_Test_Release_Manifest.md) ล็อก levels/fixtures/20requiredvariants/AT-task-case evidence/provider profiles และcandidate/final/production gates; [tests/test-manifest.json](tests/test-manifest.json) เป็นmachine inventoryที่สร้างจากapprovedtables; check:test-plan และ17planning-policy tests PASSตาม [TeamFlow_T004_Test_Report.md](TeamFlow_T004_Test_Report.md). Actual record store tests/execution-records.jsonยังว่าง: 84TC/30AT/20RV/5UAT/4reviews NOT_RUN ไม่เปลี่ยนregisterเป็นPASSจากการตรวจแผน

## T-005 foundation-only evidence

[TeamFlow_T005_Test_Report.md](TeamFlow_T005_Test_Report.md) บันทึก5foundationSQLite/HTTP + 1frontend + 1Chromium shell testsPASS และfresh-copycli validation; T-003/T-004 regressionรวมแล้ว84testsPASS ไม่ใช่84TCผ่าน. SQL2022 harness1กรณีSKIP/NOT_RUN; fullschema/auth/ACL/Windows/UAT/TC/AT/RVยังไม่ผ่าน. ไม่มีการเพิ่มfullapplicationPASSในtests/execution-records.json

## UT-17 / T-006 configuration evidence — 6 ตุลาคม 2026

[TeamFlow_T006_Test_Report.md](TeamFlow_T006_Test_Report.md) และ [reports/T-006-config-results.json](reports/T-006-config-results.json) แยก pure config, real local filesystem/HTTP/process และ synthetic SQL guard lifecycle checks; ไม่ใช่ full TC-070/080/AT-28 หรือ real SQL2022 PASS. [TeamFlow_Configuration.md](TeamFlow_Configuration.md) ระบุ defaults/bounds/TLS/path/single-instance/failure behavior. T-006 IN_PROGRESS รอ SQL2022 guard integration; tests/execution-records.json คงไม่มี full application PASS; SQL/Windows/UAT/84TC/30AT/20RV/5UAT/4REL NOT_RUN

## T-007 schema/operations evidence - 2026-10-06

[TeamFlow_T007_Test_Report.md](TeamFlow_T007_Test_Report.md) / [reports/T-007-schema-results.json](reports/T-007-schema-results.json): actual SQLite file/constraints/migration/transactions separated from pure codecs and SQL2022 NOT_RUN. Partial TC-078 local evidence does not close full TC/AT-25/28/RV-18. Actual task_events/notifications persist in the feature transaction with rollback on effect failure; both providers have minimal fixtures before T-067. T-007 IN_PROGRESS; no full application PASS added to tests/execution-records.json.

## T-012 frontend shell evidence — 2026-10-06

[TeamFlow_T012_Test_Report.md](TeamFlow_T012_Test_Report.md) / [reports/T-012-shell-results.json](reports/T-012-shell-results.json): 16 frontend unit/SSR + 5 Chromium browser + 1 HTTP regression PASS; synthetic Self navigation fixtures separated from real backend ACL. Dialog keyboard/focus and 360px/200% text provide partial TC-073 evidence. Full TC-073/074, AT-18/26, supported browser/device matrix, SQL2022/Windows/UAT remain NOT_RUN; execution-records.json unchanged. DONE6/77, remaining71.

## T-008 local helper evidence - 2026-10-06

[TeamFlow_T008_Test_Report.md](TeamFlow_T008_Test_Report.md) / [reports/T-008-helper-results.json](reports/T-008-helper-results.json): 25helpers (10pure dates/lifecycle, 10synthetic retry/driver, 5actual SQLite) + combined174 PASS; SQL18SKIP/NOT_RUN. UT-02/partial TC-030/033/034/035/036/037/059/079 do not close full TC/AT/SQL2022/Windows/UAT. New 0002_review_status corrects legacy blocked to locked review, with upgrade/children/identity/FK-assert/rollback evidence. T-008 IN_PROGRESS under approved SRS5.2; dependency graph unchanged. DONE6/77, IN_PROGRESS3, TODO68, remaining71.

## T-009 local middleware evidence - 2026-10-06

[TeamFlow_T009_Test_Report.md](TeamFlow_T009_Test_Report.md) / [reports/T-009-api-results.json](reports/T-009-api-results.json): API12 + combined186 + browser5 + fresh source/omit-dev runtime install PASS. UT-01 and partial TC-068/069/070/AT-30 evidence; real session/ACL/SQL/HTTPS/Windows/UAT/full acceptance NOT_RUN. Synthetic session/authorization/proxy callbacks are identified separately. execution-records.json unchanged. T-009 IN_PROGRESS under SRS5.2; DONE6/77, IN_PROGRESS4, TODO67, remaining71.

## T-010 local idempotency evidence - 6 October 2026

[TeamFlow_T010_Test_Report.md](TeamFlow_T010_Test_Report.md) / [reports/T-010-idempotency-results.json](reports/T-010-idempotency-results.json): local13 + combined199 PASS; SQL28SKIP/NOT_RUN. UT-09 matching and partial atomic retry groundwork for TC-031/033/041/050/AT-12/17/21 only; full feature cases remain NOT_RUN. Actual SQLite persistence/rollback/three-process concurrency separated from synthetic identity/permission/commit-loss and upload metadata fixtures. No real uploaded file or full auth service acceptance. TTL at transaction finalization; callable bounded cleanup verified, T-050 scheduler pending. T-010 IN_PROGRESS under SRS5.2/16; dependencies and execution-records.json unchanged. DONE6/77, IN_PROGRESS5, TODO66, remaining71. Next local T-011 High.

## T-011 local authorization evidence - 6 October 2026

[TeamFlow_T011_Test_Report.md](TeamFlow_T011_Test_Report.md) / [reports/T-011-authorization-results.json](reports/T-011-authorization-results.json): authorization14 + combined213 PASS; SQL38SKIP/NOT_RUN. UT-03 and partial TC-007/010/014-023/056/059/062/063/066, AT-05/07/08/30 groundwork only. Actual DB session/membership/state, scope/count/notification UPDATE and SQLite/HTTP/revoke-vs-write transaction checks are separate from synthetic cookie/token resolver, middleware principal, version callback and minimal controller fixtures. No actual login/password hashing/cookie creation or full feature/CSV/file-stream acceptance. Archived Lead retains directory read; version hook checks precede lifecycle state; unavailable hook fails closed. T-011 IN_PROGRESS; dependency graph and execution-records.json unchanged. DONE6/77, IN_PROGRESS6, TODO65, remaining71. Next local T-013 High.


## T-013 local setup evidence — 6 October 2026

[TeamFlow_T013_Test_Report.md](TeamFlow_T013_Test_Report.md) / [reports/T-013-setup-results.json](reports/T-013-setup-results.json) / [fresh source](reports/T-013-fresh-checkout.json): setup17 + combined233 + Chromium7 PASS. Partial TC-001/002/AT-01 (wrong403/correct201/reuse409 and concurrent one-complete-set) and TC-073 local form keyboard/360px/200% reflow. Actual isolated SQLite/scrypt/HTTP/startup and two-process transactions plus real browser setup2cases separated from injected audit failure/commit-ack loss and synthetic operator-console capture. Browser shell4cases still use synthetic Self; full browser matrix/SQL2022/Windows/auth/UAT NOT_RUN. Shared scrypt groundwork supplies partial UT-04 evidence for T-014; login/session/rate lifecycle still pending. SQL46SKIP/NOT_RUN including setup8; execution-records.json unchanged; T-013 IN_PROGRESS. DONE6/77, IN_PROGRESS7, TODO64, remaining71; next local T-014 High.


## T-014 local session evidence — 6 October 2026

[TeamFlow_T014_Test_Report.md](TeamFlow_T014_Test_Report.md) / [reports/T-014-session-results.json](reports/T-014-session-results.json): sessions19 + combined252 PASS; SQL56SKIP/NOT_RUN including session10. UT-04/05 and partial TC-003/004/005/006/007/010/011/021/AT-02/03 groundwork: actual scrypt/SQLite/HTTP/startup/cookie resolver, current authorization, persistent windows, idle/absolute boundaries, atomic revocation and two-process counter/login races. Admin role/reset/deactivation mutations are minimal fixtures; no complete password-change/reset/unassign/login-screen/cross-tab/TLS acceptance. Cookie attributes for configured HTTPS origin were inspected over HTTP fixture transport; browser evidence identifies actual local HTTP separately. Native SQL2022/Windows/actualHTTPS/browser matrix/UAT remain NOT_RUN; execution-records.json unchanged. DONE6/77, IN_PROGRESS8, TODO63, remaining71; next local T-015 High. Browser/fresh results in dedicated report; no full TC/AT PASS inferred.


## Local evidence — batch T-015–T-018 (2026-10-06)

[TeamFlow_T015_T018_Test_Report.md](TeamFlow_T015_T018_Test_Report.md) / [reports/T-015-018-batch-results.json](reports/T-015-018-batch-results.json): accounts19 + combined273 + Chromium14 PASS on Node22/temporary SQLite; SQL69 SKIP/NOT_RUN. Partial UT-04/TC-003/004/005/006/007/008/009/010/011/012/021 and AT-02/03/04 evidence: actual password/current verification, token+CSRF rotation/all-other-session revocation, strict/CI/version/last-admin two-process guards, atomic archived/deleted unfinished assignee cleanup with done/history/grant preservation; actual auth/Admin screens, forced change, stale edit, literal search/paging, keyboard/mobile200%, polling-vs-activity and cross-tab logout draft clearing. Fixture task handler only exercises forced gate; real task lifecycle/cleanup/recurrence integration in T-022/T-027 and full T-068 matrix remain pending. Full TC/AT records remain NOT_RUN; tests/execution-records.json unchanged. Native SQL2022/Windows/actualHTTPS/full browser matrix/UAT NOT_RUN. Four tasks IN_PROGRESS; DONE6/77, IN_PROGRESS12, TODO59, remaining71. Next local T-019–T-022 all High; actual runtime model/effort NOT_VERIFIED.

## T-019 local evidence - 2026-10-06

TeamFlow_T019_Test_Report.md / reports/T-019-installer-results.json: SQLite provider8 + actual CLI/filesystem/POSIX PTY/HTTP7 =15 PASS; combined288 PASS. Partial TC-081/AT-28/AT-30, FR-04/39/40 and NFR-02/07. Recovery/new-password/forced gate/old-session revocation, force logout, private modes/parent permissions/symlink/hardlink/config file checks, stopped-instance guard, strict args/redacted errors, hidden confirmation/cancellation, atomic audit rollback and absence of public recovery route executed. NativeSQL2022/Windows DACL/Windows console/actualHTTPS/full release NOT_RUN; SQL77SKIP. tests/execution-records.json unchanged; no full TC/AT PASS. DONE6/77, IN_PROGRESS13, TODO58, remaining71. Owner requested stop after finishing T-019 and shutting down dev services; T-020 High not started.

## Local batch T-020–T-024 — 2026-10-06

TeamFlow_T020_T024_Test_Report.md / reports/T-020-024-batch-results.json: local workspaces17 + combined305 + Chromium17 + fresh source/omit-dev runtime305 PASS. UT-03 + partial TC-013–023/AT-05–08/29 evidence only; no full case/AT/provider sign-off. SQL89 SKIP/NOT_RUN; real SQL2022/Windows/full browser/device matrix/UAT/task-recurrence/file-byte/notification feature flows pending. execution-records.json unchanged. DONE6/77, IN_PROGRESS18, TODO53, remaining71; local batch5/5 implemented/verified. Next T-025 Medium.

## Local batch T-025–T-029 — 2026-10-06

TeamFlow_T025_T029_Test_Report.md / reports/T-025-029-batch-results.json: backend26 (provider18 + HTTP4 + two-process SQLite races4) and combined331 PASS. Actual organization settings/Admin/Member/conflict/offline/restart UI, task/checklist/status/recurrence service transactions, source/successor tombstones, durable completion replay, access-cleanup integration and effect rollback. Partial UT-01/02/03/06/07/08/09/18, TC-024–033/064/065/075 and AT-09–12/14/28 evidence only; task form/detail/checklist/recurrence UI (T-032/T-033), restore/purge service and real file bytes not executed. Full TC/AT results and execution-records.json unchanged. Native SQL2022/Windows/full browser/device/UAT remain NOT_RUN. DONE6/77, IN_PROGRESS23, TODO48, remaining71; local batch5/5. Final Chromium19/19 and fresh-source331/omit-dev runtime PASS; SQL107 SKIP/NOT_RUN. Next T-030 High.

## Local batch T-030–T-034 — 2026-10-06

TeamFlow_T030_T034_Test_Report.md / reports/T-030-034-batch-results.json: local18/18 (provider13 + HTTP2 + two-process SQLite races3), combined349/349 (Node328+frontend21), Chromium22/22 PASS. Actual task form/checklist/recurrence/delete/restore, current permissions,409 draft comparison/explicit review, dirty close/route/offline/360px; shared scoped SQL filters/dates/counts/sorts and board500/501 snapshots. Partial TC-024/026/027/028/030/031/034/035/045/047/048/065/075 and AT-09/10/11/13/14/15/16/19/20 evidence; future Calendar/Gantt/Report/Export consumers, Kanban move/fallback UI and retention remain pending. Full TC/AT and execution-records.json unchanged. Native SQL120 SKIP/Windows/full browser-device/UAT NOT_RUN. DONE6/77, IN_PROGRESS28, TODO43, remaining71; local5/5. Fresh-copy349 tests/ci/build/migrate/seed/omit-dev runtime PASS. Next T-035 High; candidate batch035High/036Medium/037Medium/038High/039Medium.

## Local batch T-035–T-039 — 2026-10-06

TeamFlow_T035_T039_Test_Report.md / reports/T-035-039-batch-results.json: local15/15 (provider10+HTTP2+two-process SQLite races3), combined364/364(Node343+frontend21), Chromium28/28 PASS. Atomic ordering/completion/recurrence; actual mouse/keyboard/touch emulated scroll+long-press; filters disable reorder; pending ack,409/validation/permission rollback, current demotion/revocation, lost response GET-before-same-key retry, acknowledged-write/read-failure recovery and501-task paginated fallback. Comments API plaintext/current rights/atomic effects/concurrent durable idempotency. Contract1.0.1 corrects recurring3-column response;52routes/75schemas unchanged. Partial TC-035–045/051/075 and AT-10/11/14/16/17/18/20/21/28 evidence only. Full TC/AT and execution-records.json unchanged; native SQL130SKIP/Windows/full device-browser/physical touch/UAT NOT_RUN; Comments panels/history/polling/Calendar/Gantt/full design pending. DONE6/77, IN_PROGRESS33, TODO38, remaining71; local5/5. Fresh-source364 tests/ci/type/build/migrate/seed/omit-dev runtime PASS; final people-picker/permission-clear UI6/6 recheck PASS. Next T-040 High; candidate040–043High/044Medium.

## T-040–T-044 local implementation evidence — 2026-10-06

TeamFlow_T040_T044_Test_Report.md / reports/T-040-044-batch-results.json: local provider/filesystem/actual HTTP/two-process quota/SIGKILL recovery and Chromium panels checks. Partial TC-051–059/075 and AT-05/08/21/22/30 trace only; do not mark full TC/AT PASS. Full SQL2022/Windows/full browser-device/UAT remain NOT_RUN; native SQL wrapper includes minimal provider-specific fixtures. tests/execution-records.json remains unchanged. Task Register DONE6/77, IN_PROGRESS38, TODO33, remaining71. Full orphan/retention scheduler T-060 and shared polling T-047 still pending; byte release is tested only after confirmed unlink/ENOENT.

## T-045–T-049 local subset — 2026-10-06

Local evidence for TC-010/046/047/048/049/050/060/061 and AT-15/19/20/23 is recorded in TeamFlow_T045_T049_Test_Report.md. These scoped unit/provider/actual Chromium checks do not change full TC/AT statuses or tests/execution-records.json. Native SQL2022/Windows/UAT/full browser-device matrix remain NOT_RUN. Full notification list/read UI remains T-050/T-051, and retention/backup job coordination T-060/T-061.

Local subset outcomes: backend14/14 and all407/407 PASS; Chromium37 distinct cases verified after focused3-case recheck (raw36PASS/1 selector FAIL; corrected2PASS plus strengthened My Tasks1PASS). SQL152SKIP/NOT_RUN. Full acceptance/statuses/execution-records.json remain unchanged. Fresh-source result is in TeamFlow_T045_T049_Test_Report.md.

## T-050–T-054 local subset — 2026-10-07

Partial TC-062–067, TC-010/050/068/075 and AT-05/08/20/23/24/30 evidence is recorded in TeamFlow_T050_T054_Test_Report.md and reports/T-050-054-batch-results.json. Local own/current-access list/read/retention, date/team/person aggregation, UTF8 BOM/RFC4180/formula-safe CSV120+/50000/cap50001, HTTP/CSRF/no-store and Chromium notifications/report/filter/download/mobile checks do not close full TC/AT execution. Excel formula execution, native SQL2022, Windows, UAT, performance/full browser-device matrix and full retention/backup coordination remain NOT_RUN. tests/execution-records.json remains unchanged.

Local outcomes: backend23/23, all420/420, Chromium14/14 plus strengthened visual1/1, fresh-source420 PASS. NativeSQL160SKIP/NOT_RUN. Raw failed attempts and fixes remain separate in the batch report; full TC/AT/UAT and formal execution records remain unchanged.

## T-055–T-059 local batch evidence — 2026-10-07

TeamFlow_T055_T059_Test_Report.md / reports/T-055-059-batch-results.json record partial TC-069/070/071/072/073/074/075 and AT-18/26/28/30 evidence. Main views at360/tablet/desktop and scoped keyboard/200% text review, reconnect draft retention/no queued mutation, actual SQLite/filesystem/readiness and redacted rotating logs. Native PWA registration/cache has an open FAIL; unit routing evidence cannot close TC-071/072 or AT-26. Browser vendor current+previous/physical touch/OS installation/native SQL2022/Windows/full TC-AT/UAT remain NOT_RUN. See the report for exact executed counts and raw versus corrected runs. execution-records.json remains empty; all five tasks IN_PROGRESS. DONE6/77, IN_PROGRESS53, TODO18, remaining71.


## T-056 native PWA follow-up — 2026-10-07

TeamFlow_T056_PWA_Followup_Report.md / reports/T-056-pwa-followup-results.json supersede the open native precache FAIL in the prior T-055–T-059 report for the repaired source. Real Chromium/installed Chrome worker cache/logout/offline and waiting-update lifecycle PASS locally; synthetic public draft survives without forced reload and old cache is removed only after client closure. Partial TC-071/072 and AT-26 evidence only. OS installation/real task-edit update notice/vendor current+previous/physical touch/native SQL2022/Windows/full TC-AT/UAT remain NOT_RUN; formal execution-records.json remains empty. DONE6/77, IN_PROGRESS53, TODO18, remaining71.


## T-060–T-064 local operations subset — 2026-10-07

TeamFlow_T060_T064_Test_Report.md / reports/T-060-064-batch-results.json cover partial TC-034/059/075/076/077/078/079 and AT-13/22/25/28 evidence: actual local purge cutoff/rollback and bytes retry/quota, ownership/drain/maintenance UI, stopped-instance SQLite snapshot/verify/isolated restore/session revoke, legacy migration/repeat/rollback and startup orphan recovery. SQL restore command construction/source is separate from native execution; real SQL2022 .bak/RESTORE/service paths/roles and Windows/PowerShell/Task Scheduler/full TC-AT/UAT remain NOT_RUN. Local timings do not certify deployment RPO/RTO. Formal execution-records.json remains empty; DONE6/77, IN_PROGRESS58, TODO13, remaining71.

## T-065–T-069 local regression subset — 2026-10-07

TeamFlow_T065_T069_Test_Report.md / reports/T-065-069-batch-results.json record new exact-role/provider-isolated HTTP fixtures10/10 PASS and grouped449/449 PASS (Node411/frontend38), final environment-isolation follow-up10/10. Partial authentication/session/account revocation and cross-team/detail/file-byte/Viewer/search/count/report/CSV/notification/replay/archive/CSRF/SQLi/plaintext-XSS evidence; Windows and user/developer instructions are source artifacts only. Native SQL174SKIP/0executed; full AT01–08/28/29/30 and required SQL/Windows/HTTPS/browser/RV/UAT remain NOT_RUN. Initial fixture/request/expected failures and corrections retained in report. Formal execution-records.json remains empty; DONE6/77, IN_PROGRESS63, TODO8, remaining71.

## T-070–T-074 grouped local QA — 2026-10-07

TeamFlow_T070_T074_Test_Report.md / reports/T-070-074-batch-results.json capture new HTTP lifecycle/checklist/monthly leap/retry/trash/purge-byte,501-task board/pagination/Bangkok midnight,10MiB multipart/comment/notification90day, parsed121-row CSV/reopen and clean restored role/session/download/restart journeys. New grouped regression/snapshot26/26 PASS; native SQL180SKIP/0executed. Final full regression456/456 PASS (Node418/frontend38); UI raw54PASS/1FAIL of55 and final corrected focused1/1PASS yields55 distinct local cases verified (first focused locator mismatch FAIL also retained). Type/lint/contract/test-plan PASS;125 product source files match preceding verified build so compiled assets reused; no full TC-AT PASS inferred. Required SQL2022/Windows/fresh ZIP/RPO-RTO/full browser-device/Excel/UAT acceptance remains NOT_RUN; formal execution-records.json empty. DONE6/77, IN_PROGRESS68, TODO3, remaining71; next T075 High.


## T-075–T-077 local evidence — 2026-10-07

TeamFlow_T075_T077_Test_Report.md records isolated SQLite load/performance, unsigned AT30/UAT5 templates, source inventory and fresh candidate ZIP local verification. Full TC-083/084/AT-27/28 and SQL2022/Windows/human UAT remain NOT_RUN. reports/release-readiness.json is mapping only; tests/execution-records.json unchanged. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Declared High/Medium/High; actual model/effort NOT_VERIFIED.


T075 follow-up: TeamFlow_T075_Memory_Followup_Report.md isolates compiled API memory from load clients and records a bounded validator-cache fix without changing schema/wire rules. Diagnostic5-minute comparisons are separate from required10-minute/native SQL/fullTC083/084/AT27 acceptance. Formal results remain NOT_RUN; counts DONE6/77, IN_PROGRESS71, remaining71.

## T-078 addendum planning evidence — 2026-10-08

Inventory ใหม่ tasks91/suites23/cases99/AT40/FR52/NFR9/BR23; ผล planning/contract checks รอรันรวมชุด T-078–T-082. ไม่มี execution PASS ใหม่ใน tests/execution-records.json
