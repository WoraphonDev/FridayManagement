# TeamFlow — Test Cases หลังพัฒนา v1.34

**วันที่:** 7 ตุลาคม 2026 · **สถานะ:** ชุดทดสอบที่ออกแบบไว้ ยังไม่รัน
**จำนวน:** 99 Test Cases · 13 หมวด · ครอบคลุม FR-01–FR-53 (FR-46 deferred) และ AT-01–AT-40  
**ใช้คู่กับ:** `TeamFlow_Test_Plan_v1.0.md` และต้นทาง Requirements/SRS/Task v1.0

เอกสารนี้มีทั้งกรณีให้ผู้ใช้ทดสอบผ่านหน้าเว็บและกรณีที่ต้องให้ผู้พัฒนาหรือผู้ติดตั้งช่วยตรวจ API/DB/เครื่อง ไม่อ้างว่าผู้ใช้ต้องเขียนหรือรัน Unit Tests เอง การมี testcase ไม่เท่ากับมี testcode และไม่ได้ยืนยันว่าระบบผ่านแล้ว

P0=critical ก่อนใช้ข้อมูลจริง; P1=ต้องผ่านก่อน fullrelease. Kind ระบุวิธีตรวจ: UI, Unit, Integration, Operations หรือ Performance. คำว่า Unit+Integration เป็นแผนสองระดับ ไม่ใช่ unit test ที่เขียนแล้ว


## Monday-style addendum — 8 ตุลาคม 2026 (T-078)

เจ้าของอนุมัติ `TeamFlow_Requirements_Addendum_Monday_Draft.md` (8 ต.ค. 2026) ด้วยคำสั่งให้ทำ T-078 ต่อ: เพิ่ม Personal/Workspace/Admin แบบ monday, แยก job title ออกจากสิทธิ์, project role `manager` + permission checkbox รายคน P-01–P-10, Docs/Files/Workload/Overview/Favorites, Main table/side panel ใหม่ และ motion AN-01–AN-13. FR-46 Updates feed เลื่อนไปรอบถัดไป; exclusion เดิม (custom fields/status, dependencies, time tracking, automations, integrations, chat, real-time co-editing, email/AI) คงอยู่. เป็นการเปลี่ยนเอกสารเท่านั้น ยังไม่มี code/schema/API ของ addendum และ FR/AT ใหม่ทั้งหมด NOT_RUN. เพิ่มหมวด M (TC-085–TC-099) และ AT-31–AT-40 ทั้งหมด NOT_RUN

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


## ข้อมูลตั้งต้นและวิธี reset

ใช้ test/staging instance แยกจากข้อมูลจริง; destructive/fault/load tests ไม่รันบน production โดยอัตโนมัติ ทุกกรณีเริ่มจาก snapshot/seed ที่กำหนด ไม่พึ่งผลจากกรณีก่อน ยกเว้นระบุเป็น journey เดียวกัน

| Fixture | ข้อมูล |
|---|---|
| A | Admin active username admin_a; password สร้างตอน seed และเก็บเฉพาะ test harness ไม่ commit |
| L1/L2 | Lead ทีม1/ทีม2 ตามลำดับ |
| M1/M2 | Member ทีม1/ทีม2 ตามลำดับ; ไม่มี Adminrights |
| V | Viewer; active; ไม่ eligible เป็น assignee |
| P1 | owner ทีม1; M1 Editor; L1 ดูแลจาก Lead |
| P2 | owner ทีม2; M2 Editor; L2 ดูแลจาก Lead |
| Pshared | owner ทีม1; M1/M2 Editor และ V Viewer |
| Pprivate | owner ทีม1; M1 ไม่มี membership; มี task/file ชื่อ PRIVATE_ONLY |
| Inactive | member inactive ไม่ eligible/login ไม่ได้ |
| D0 | วันนี้ตาม Asia/Bangkok ของ app; APIdate-onlyYYYY-MM-DD; D0±n คำนวณจาก Bangkok |
| Controlled clock | internalharness หรือ isolatedfixture เท่านั้น ไม่เพิ่ม publicclockendpoint/เปลี่ยนเวลา production |
| Files | validPDF/JPEG/Office/TXT จริง;10MiB=10,485,760bytes;quota5GiB=5,368,709,120bytes;ไม่ใช้ไฟล์ malware จริง |
| Sessions | browserprofiles แยกหรือ APIharnesscookiejar แยกต่อ role; cookies/tokens ไม่แนบใน evidence |

**API convention:** protected writes ใช้ same-origin+validCSRF และ version/Idempotency-Key เมื่อ contract กำหนด; ตั้งค่าที่ขาดให้ทดสอบ negativecase โดยเจตนา. 401=ไม่ login,403=operation ไม่มีสิทธิ์,404=resource ไม่มี/no-project-access,409=version/keyconflict,413=oversize,422=businessvalidation,429=ratelimit,503=busy/notready ตาม SRS; อย่าใช้ statuscode อย่างเดียวเป็นผลผ่าน ต้องตรวจ DB/bytes/sideeffects ด้วย

**Confirmed baseline:** R-01–R-04 resolved และ T-001/T-002 DONE ด้านเอกสาร;expected ตาม Baseline1.1;cases ทั้งหมด NOT_RUN ไม่ PASS จาก scopeapproval

## ลำดับที่แนะนำ

1. Setup/auth และ scope ก่อนเปิดข้อมูล
2. Smoke subset ด้านล่างสำหรับตรวจรุ่นใหม่เร็ว
3. Functional/UI ทุกหมวดและ negativecases
4. Concurrency/files/backup/security ใน isolatedharness
5. Browser/Windows/performance และ UAT จริง

**Smoke subset:** TC-001, TC-003, TC-006, TC-007, TC-013, TC-014, TC-016, TC-017, TC-018, TC-022, TC-024, TC-026, TC-027, TC-031, TC-034, TC-035, TC-036, TC-037, TC-039, TC-046, TC-051, TC-053, TC-060, TC-062, TC-064, TC-066, TC-071, TC-075, TC-076, TC-077

Smoke มีทั้ง UI และการตรวจเทคนิค; ผ่าน smoke ไม่ได้แทน fullrelease/UAT/backup/permissionmatrix

## Test Run Register

| Case | Priority | กรณี | วิธีตรวจ | Result | Actual / Evidence / Bug ID | Tester / Build / Date |
|---|---|---|---|---|---|---|
| TC-001 | P0 | ตั้ง Admin ครั้งแรกและป้องกัน token ผิด | UI + Integration | NOT_RUN | — | — |
| TC-002 | P0 | Setup พร้อมกันสร้าง Admin/องค์กรเพียงชุดเดียว | Integration | NOT_RUN | — | — |
| TC-003 | P0 | Login ถูกต้องและ username ไม่แยกตัวใหญ่เล็ก | UI + Integration | NOT_RUN | — | — |
| TC-004 | P1 | Login ไม่เผยว่ามีบัญชีและไม่ trim password | Integration | NOT_RUN | — | — |
| TC-005 | P0 | จำกัดการลอง login ต่อ username และ IP | Integration | NOT_RUN | — | — |
| TC-006 | P0 | Logout และ reuse cookie เก่า | UI + Integration | NOT_RUN | — | — |
| TC-007 | P0 | สร้างบัญชีและบังคับเปลี่ยนรหัสชั่วคราว | UI + Integration | NOT_RUN | — | — |
| TC-008 | P0 | เปลี่ยนรหัส own account และยกเลิก session อื่น | UI + Integration | NOT_RUN | — | — |
| TC-009 | P0 | Admin reset ต้องยืนยันตัวเองและ revoke sessions | UI + Integration | NOT_RUN | — | — |
| TC-010 | P0 | Idle expiry และ polling ไม่ยืด session | Integration | NOT_RUN | — | — |
| TC-011 | P0 | Absolute expiry และ cookie policy | Integration | NOT_RUN | — | — |
| TC-012 | P0 | แก้/ปิด/เปิดบัญชีและห้ามปิด Admin คนสุดท้าย | UI + Integration | NOT_RUN | — | — |
| TC-013 | P0 | สร้างทีม ชื่อไม่ซ้ำ และสมาชิกหลายทีม | UI + Integration | NOT_RUN | — | — |
| TC-014 | P0 | Team-only membership ไม่เปิด private project | UI + Integration | NOT_RUN | — | — |
| TC-015 | P0 | Lead ดูแลได้เฉพาะทีมที่เป็นเจ้าของ | UI + Integration | NOT_RUN | — | — |
| TC-016 | P0 | โปรเจกต์ข้ามทีม Editor เขียนได้เฉพาะที่แชร์ | UI + Integration | NOT_RUN | — | — |
| TC-017 | P0 | Viewer อ่านได้แต่ทุก write ถูกบล็อก | UI + Integration | NOT_RUN | — | — |
| TC-018 | P0 | ถอน project access ขณะเปิดงาน | UI + Integration | NOT_RUN | — | — |
| TC-019 | P0 | ลด Editor เป็น Viewer และยกเว้นคนที่ยังมีสิทธิ์จาก Lead | Integration | NOT_RUN | — | — |
| TC-020 | P0 | ถอนสมาชิกทีมคง explicit project access | Integration | NOT_RUN | — | — |
| TC-021 | P0 | Deactivate user ตัด session และ unassign งานค้าง | UI + Integration | NOT_RUN | — | — |
| TC-022 | P0 | Archive project read-only พร้อม Admin/Lead lifecycle exceptions | UI + Integration | NOT_RUN | — | — |
| TC-023 | P1 | Archive team และ directory privacy | UI + Integration | NOT_RUN | — | — |
| TC-024 | P0 | สร้าง แก้ และมอบหมายงานพร้อมทุก field | UI + Integration | NOT_RUN | — | — |
| TC-025 | P0 | Validation task และ unknown fields | Integration | NOT_RUN | — | — |
| TC-026 | P1 | งานไม่มอบหมายและไม่มีวันส่ง | UI + Integration | NOT_RUN | — | — |
| TC-027 | P0 | Checklist CRUD และ completion gate | UI + Integration | NOT_RUN | — | — |
| TC-028 | P0 | Reopen และ subtask guard ตอน done | UI + Integration | NOT_RUN | — | — |
| TC-029 | P0 | Recurring daily/weekly และ field copy | Integration | NOT_RUN | — | — |
| TC-030 | P0 | Monthly anchor และ leap year | Unit + Integration | NOT_RUN | — | — |
| TC-031 | P0 | Recurring completion retry/concurrent/reopen | Integration | NOT_RUN | — | — |
| TC-032 | P1 | Recurring validation และ overdue ไม่ catch-up | Integration | NOT_RUN | — | — |
| TC-033 | P0 | Atomic rollback เมื่อ completion/recurrence ล้มเหลว | Integration | NOT_RUN | — | — |
| TC-034 | P0 | Soft delete และ restore พร้อมสิทธิ์ | UI + Integration | NOT_RUN | — | — |
| TC-035 | P0 | Task version conflict สองผู้ใช้ | UI + Integration | NOT_RUN | — | — |
| TC-036 | P0 | ลากข้ามคอลัมน์ persist หลัง reload | UI + Integration | NOT_RUN | — | — |
| TC-037 | P0 | ลากจัดลำดับในคอลัมน์และ append | UI + Integration | NOT_RUN | — | — |
| TC-038 | P0 | Done ด้วยการลากใช้ completion gate | UI + Integration | NOT_RUN | — | — |
| TC-039 | P0 | ลากตอน offline/403 คืนตำแหน่ง | UI + Integration | NOT_RUN | — | — |
| TC-040 | P0 | ลากพร้อมกันในคอลัมน์เดียว | Integration | NOT_RUN | — | — |
| TC-041 | P0 | Move timeout และ idempotent retry | Integration | NOT_RUN | — | — |
| TC-042 | P1 | Filtered board ปิด reorder | UI + Integration | NOT_RUN | — | — |
| TC-043 | P1 | Keyboard และ touch alternative | UI | NOT_RUN | — | — |
| TC-044 | P0 | Invalid anchor/project และ stale task version | Integration | NOT_RUN | — | — |
| TC-045 | P1 | Board เกิน500 งาน fallback | UI + Integration | NOT_RUN | — | — |
| TC-046 | P0 | My Tasks วันนี้/เกินกำหนด/ถัดไป/ไม่มีวันส่ง | UI + Integration | NOT_RUN | — | — |
| TC-047 | P0 | Bangkok midnight และวันที่จริง | Unit + Integration | NOT_RUN | — | — |
| TC-048 | P1 | Search/filter/sort/pagination ครบและ scope | UI + Integration | NOT_RUN | — | — |
| TC-049 | P1 | Calendar/Gantt และวันที่ไม่ครบ | UI + Integration | NOT_RUN | — | — |
| TC-050 | P0 | Polling และ dirty draft ไม่หาย | UI + Integration | NOT_RUN | — | — |
| TC-051 | P0 | Comment ไทย plain text และ idempotency | UI + Integration | NOT_RUN | — | — |
| TC-052 | P0 | Audit fields/actor/time และ immutability | UI + Integration | NOT_RUN | — | — |
| TC-053 | P0 | อัปโหลดไฟล์ valid/download bytes ตรง | UI + Integration | NOT_RUN | — | — |
| TC-054 | P0 | Boundary ไฟล์1byte/10MiB/+1byte/ว่าง | Integration | NOT_RUN | — | — |
| TC-055 | P0 | Extension/magic/UTF8 allowlist | Integration | NOT_RUN | — | — |
| TC-056 | P0 | Filename traversal และ file IDOR | Integration | NOT_RUN | — | — |
| TC-057 | P0 | Quota race และ reservation release | Integration | NOT_RUN | — | — |
| TC-058 | P0 | Upload DB/file partial failure และ startup recovery | Integration | NOT_RUN | — | — |
| TC-059 | P0 | สิทธิ์ลบไฟล์และ retention ตาม baseline | UI + Integration | NOT_RUN | — | — |
| TC-060 | P0 | Assignment/comment/status recipients และไม่แจ้งตัวเอง | UI + Integration | NOT_RUN | — | — |
| TC-061 | P0 | Reminder D-1/D0/overdue ไม่ซ้ำหลัง restart | Integration | NOT_RUN | — | — |
| TC-062 | P1 | Read-one/read-all เฉพาะตนและ unread badge | UI + Integration | NOT_RUN | — | — |
| TC-063 | P0 | ถอน access แล้ว notification ไม่รั่วและ retention90 วัน | Integration | NOT_RUN | — | — |
| TC-064 | P0 | Report totals/status/overdue/unassigned/zero | UI + Integration | NOT_RUN | — | — |
| TC-065 | P0 | Date basis/owner team/done period และ reopen | Unit + Integration | NOT_RUN | — | — |
| TC-066 | P0 | CSV ไทย escaping/formula/filter/scope/full rows | Integration | NOT_RUN | — | — |
| TC-067 | P1 | Export cap ไม่ตัดเงียบ | Integration | NOT_RUN | — | — |
| TC-068 | P0 | CSRF, Origin และ no mutation on rejected request | Integration | NOT_RUN | — | — |
| TC-069 | P0 | SQL injection/XSS และ error redaction | Integration | NOT_RUN | — | — |
| TC-070 | P0 | Spoofed proxy/Host และ security headers | Integration | NOT_RUN | — | — |
| TC-071 | P0 | PWA install และ static-only cache | UI | NOT_RUN | — | — |
| TC-072 | P0 | Reconnect ไม่ queue writes และไม่ล้าง draft | UI | NOT_RUN | — | — |
| TC-073 | P1 | Responsive/keyboard/modal/color/text zoom | UI | NOT_RUN | — | — |
| TC-074 | P1 | Browser matrix ปัจจุบันและก่อนหน้าหนึ่งรุ่น | UI | NOT_RUN | — | — |
| TC-075 | P0 | Restart persistence และ name/settings/health | Operations | NOT_RUN | — | — |
| TC-076 | P0 | Backup ระหว่าง writes และ checksum snapshot | Operations | NOT_RUN | — | — |
| TC-077 | P0 | Restore ลง clean instance และ revoke sessions | Operations | NOT_RUN | — | — |
| TC-078 | P0 | Migration/rollback checksum และ existing data | Operations | NOT_RUN | — | — |
| TC-079 | P0 | Trash purge/recurrence tombstone/file cleanup | Operations | NOT_RUN | — | — |
| TC-080 | P0 | Fresh Windows ZIP install/service/HTTPS/backup | Operations | NOT_RUN | — | — |
| TC-081 | P0 | Admin local recovery ไม่มี public recovery route | Operations | NOT_RUN | — | — |
| TC-082 | P0 | DB busy/maintenance readiness/cleanup jobs | Integration | NOT_RUN | — | — |
| TC-083 | P1 | Load test และ update latency | Performance | NOT_RUN | — | — |
| TC-084 | P1 | Cold startup/CSV memory/board concurrency stress | Performance | NOT_RUN | — | — |
| TC-085 | P0 | Job title CRUD/assign/disable ไม่เปลี่ยนสิทธิ์ | UI + Integration | NOT_RUN | — | — |
| TC-086 | P1 | Job title ป้าย/filter/report/CSV | UI + Integration | NOT_RUN | — | — |
| TC-087 | P0 | P-key ทีละข้อให้ทำได้เฉพาะข้อนั้น | Integration | NOT_RUN | — | — |
| TC-088 | P0 | เอา permission ออกมีผลทันทีและ demote manager | Integration | NOT_RUN | — | — |
| TC-089 | P0 | กันยกระดับสิทธิ์และกติกาแต่งตั้ง manager | Integration | NOT_RUN | — | — |
| TC-090 | P1 | Admin center + Permission matrix bulk/preset/conflict | UI + Integration | NOT_RUN | — | — |
| TC-091 | P1 | My overview ตัวเลขตรง My work และ grouped table | UI + Integration | NOT_RUN | — | — |
| TC-092 | P0 | Docs CRUD/version conflict/Viewer/trash | UI + Integration | NOT_RUN | — | — |
| TC-093 | P0 | Docs sanitize XSS ฝั่ง server | Unit + Integration | NOT_RUN | — | — |
| TC-094 | P1 | Project Files รวม/อัปโหลด/preview/สิทธิ์/quota | UI + Integration | NOT_RUN | — | — |
| TC-095 | P1 | Workload และ Project overview ตัวเลข/เกณฑ์/สิทธิ์ | UI + Integration | NOT_RUN | — | — |
| TC-096 | P1 | Main table inline/batch/drag/sticky/resize | UI + Integration | NOT_RUN | — | — |
| TC-097 | P1 | Task side panel แท็บ/@mention/Esc/deep link | UI + Integration | NOT_RUN | — | — |
| TC-098 | P1 | UX/motion reduced motion/toggle/360px/keyboard | UI | NOT_RUN | — | — |
| TC-099 | P1 | Favorites ส่วนตัวและถอนสิทธิ์ | UI + Integration | NOT_RUN | — | — |

## A. Setup / login / account / session

### TC-001 — ตั้ง Admin ครั้งแรกและป้องกัน token ผิด

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** UI + Integration  
**Trace:** FR-01 · **Acceptance:** AT-01  
**Preconditions / Test Data:** ระบบใหม่ไม่มี user; มี token จาก console; แยก instance จาก fixture หลัก

**ขั้นตอน:**

1. เปิดหน้า Setup และใส่ token ผิด
2. ส่ง setup ด้วย token จริง ชื่อองค์กร TestOrg และ admin_a/r หัสผ่านใหม่ที่สร้างสำหรับ test
3. เรียก setup อีกครั้งด้วย token เดิม

**Expected Results:**

- token ผิดถูกปฏิเสธ 403 โดยไม่สร้างบัญชี
- token ถูกสร้าง Admin active และองค์กรหนึ่งรายการ
- ตั้งซ้ำได้ 409; ไม่มี default password ใน source/log

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-002 — Setup พร้อมกันสร้าง Admin/องค์กรเพียงชุดเดียว

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** Integration  
**Trace:** FR-01 · **Acceptance:** AT-01  
**Preconditions / Test Data:** DB ว่าง; ทดสอบ 2 requests พร้อม token เดียว

**ขั้นตอน:**

1. ส่ง setup สอง requests พร้อมกัน
2. ตรวจ user/organization counts และ responses

**Expected Results:**

- สำเร็จเพียงหนึ่งการตั้งค่า อีกคำสั่งถูกปฏิเสธ
- ไม่มีสององค์กรหรือบันทึกครึ่งชุด

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-003 — Login ถูกต้องและ username ไม่แยกตัวใหญ่เล็ก

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-02 · **Acceptance:** AT-02  
**Preconditions / Test Data:** fixture M1 active เปลี่ยนรหัสชั่วคราวแล้ว

**ขั้นตอน:**

1. เข้าสู่ระบบด้วย M1 username รูปแบบตัวใหญ่แล้วตัวเล็ก
2. เปิดงานและโหลดหน้าใหม่

**Expected Results:**

- เข้าได้ทั้งสองแบบด้วยรหัสที่ถูกต้อง
- ข้อมูล scope ถูกและ session อยู่ตามอายุที่กำหนด

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-004 — Login ไม่เผยว่ามีบัญชีและไม่ trim password

**Priority:** P1 · **Role:** ผู้ไม่ login · **Method:** Integration  
**Trace:** FR-02, FR-04 · **Acceptance:** AT-02  
**Preconditions / Test Data:** มีบัญชี test กับรหัสที่ขึ้นต้น/ท้ายด้วยช่องว่างยาว≥12; ใช้ fixture แยก

**ขั้นตอน:**

1. ลอง username ไม่มีจริง/r หัสผิด/inactive account
2. ใช้รหัสเต็มและรหัสที่ตัดช่องว่างหน้า/ท้าย

**Expected Results:**

- failure ข้อความกลางเดียวกันไม่เผยสถานะบัญชี
- รหัสเต็มถูกต้อง แต่รหัสที่ถูก trim เข้าไม่ได้

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-005 — จำกัดการลอง login ต่อ username และ IP

**Priority:** P0 · **Role:** ผู้ไม่ login · **Method:** Integration  
**Trace:** FR-02 · **Acceptance:** AT-02  
**Preconditions / Test Data:** reset rate-limit store; config 10/user และ30/IP ใน15 นาที

**ขั้นตอน:**

1. ทำ10attempts กับ user เดียวแล้วส่งครั้งถัดไป
2. reset fixture แล้วส่ง30attempts จาก IP เดียวกระจายหลาย user และส่งครั้ง31
3. เลื่อน test clock พ้น15 นาทีและลองใหม่

**Expected Results:**

- คำสั่งเกิน limit429 ไม่เกิด session
- IPlimit ไม่หายเพราะมี login สำเร็จหนึ่งรายการ
- พ้นหน้าต่างแล้วใช้งานตาม policy ได้

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-006 — Logout และ reuse cookie เก่า

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-02 · **Acceptance:** AT-02  
**Preconditions / Test Data:** M1login; ผู้ทดสอบเก็บ cookie ใน isolated harness

**ขั้นตอน:**

1. logout ผ่าน UI
2. ใช้ cookie เก่าเรียก GET /api/me
3. กดย้อน browser เปิด task เดิม

**Expected Results:**

- logoutclearcookie/revokeDBsession
- request เก่า401 และ task ไม่เปิดได้

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-007 — สร้างบัญชีและบังคับเปลี่ยนรหัสชั่วคราว

**Priority:** P0 · **Role:** A และบัญชีใหม่ · **Method:** UI + Integration  
**Trace:** FR-03, FR-04 · **Acceptance:** AT-03  
**Preconditions / Test Data:** A active; มี temp password เฉพาะ test ที่ไม่เผยในเอกสาร

**ขั้นตอน:**

1. A สร้าง account ใหม่พร้อม temp password
2. บัญชีใหม่ login แล้วลองเข้าหน้างานและ taskAPI
3. เปลี่ยนเป็นรหัสใหม่แล้วเข้าอีกครั้ง

**Expected Results:**

- เห็น forced-passwordscreen
- taskAPI403 PASSWORD_CHANGE_REQUIRED ก่อนเปลี่ยน
- เปลี่ยนสำเร็จแล้วใช้ app ได้ตามสิทธิ์ ไม่มี password ใน response/log

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-008 — เปลี่ยนรหัส own account และยกเลิก session อื่น

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-04 · **Acceptance:** AT-03  
**Preconditions / Test Data:** loginM1 สอง browser/session

**ขั้นตอน:**

1. ลอง current password ผิดและ new password ยาว11
2. เปลี่ยนด้วย current ที่ถูกและ new≥12
3. ใช้ session อีก browser และรหัสเก่า login

**Expected Results:**

- input ผิดไม่เปลี่ยน hash
- current session/CSRFrotate;session อื่น401
- รหัสเก่าเข้าไม่ได้ รหัสใหม่เข้าได้

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-009 — Admin reset ต้องยืนยันตัวเองและ revoke sessions

**Priority:** P0 · **Role:** A และ M1 · **Method:** UI + Integration  
**Trace:** FR-04 · **Acceptance:** AT-03  
**Preconditions / Test Data:** M1active พร้อมสอง session

**ขั้นตอน:**

1. AresetM1 โดยใส่ Admin password ผิด
2. reset ด้วย Admin password ถูก
3. M1 ใช้ session เก่า/รหัสใหม่ชั่วคราว

**Expected Results:**

- ครั้งแรกไม่เปลี่ยนรหัส
- session เก่าใช้ไม่ได้
- login ด้วย temp ได้แต่บังคับเปลี่ยน ไม่มี temp password ใน audit

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-010 — Idle expiry และ polling ไม่ยืด session

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-02 · **Acceptance:** AT-02  
**Preconditions / Test Data:** controlledclock หรือ config test; idle60min; มี notificationpoll

**ขั้นตอน:**

1. เปิดเว็บแล้วไม่ interaction แต่ปล่อย poll ทำงาน
2. เลื่อนเวลา61 นาทีและเรียก API
3. login ใหม่ ส่ง intentional activity และตรวจ idle timer

**Expected Results:**

- poll ไม่ต่อ last_seen สำหรับ idle
- หมดอายุ401 และ UI ให้ login
- intentional activity ที่มี CSRF ต่อ idle ได้

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-011 — Absolute expiry และ cookie policy

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-02 · **Acceptance:** AT-02  
**Preconditions / Test Data:** HTTPS test origin; absolute12h; controlledclock

**ขั้นตอน:**

1. login และตรวจ Set-Cookie
2. ทำ interaction ต่อเนื่องก่อน12h แล้วเลื่อนพ้น12h
3. เรียก API และตรวจ DBsessionstorage

**Expected Results:**

- HttpOnly/SameSite=Strict/Secure/Path=/ถูกต้อง
- พ้น absolute401 แม้ activity ต่อเนื่อง
- DB เก็บ token hash ไม่มี raw token

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-012 — แก้/ปิด/เปิดบัญชีและห้ามปิด Admin คนสุดท้าย

**Priority:** P0 · **Role:** A · **Method:** UI + Integration  
**Trace:** FR-03 · **Acceptance:** AT-04  
**Preconditions / Test Data:** มี A เป็น Adminactive คนเดียว; ใช้ snapshot แยก concurrency

**ขั้นตอน:**

1. ลอง demote และ deactivateA
2. สร้าง Admin คนที่สองแล้วส่งคำสั่งปิด/demote ทั้งสองพร้อมกัน
3. edit ชื่อ M1/deactivate/reactivate

**Expected Results:**

- Admin สุดท้ายเปลี่ยนไม่ได้และยังเข้าได้
- หลัง concurrent ต้องเหลือ activeAdmin≥1
- แก้ชื่อคงอยู่;inactivelogin ไม่ได้/reactivate ได้

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## B. ทีม โปรเจกต์ และสิทธิ์

### TC-013 — สร้างทีม ชื่อไม่ซ้ำ และสมาชิกหลายทีม

**Priority:** P0 · **Role:** A · **Method:** UI + Integration  
**Trace:** FR-06, FR-07, FR-08 · **Acceptance:** AT-06  
**Preconditions / Test Data:** fixture ทีม1/ทีม2 พร้อม A/M1

**ขั้นตอน:**

1. สร้างทีม3 แล้วลองสร้างชื่อซ้ำต่าง case
2. เพิ่ม M1 ทั้งทีม1/ทีม2 เป็น member และแต่ง L1 เป็น Lead เฉพาะทีม1
3. M1 ลองแต่งตนเป็น Lead ทาง API

**Expected Results:**

- ชื่อซ้ำถูกปฏิเสธ
- M1 อยู่หลายทีมได้;สิทธิ์ต่างทีมไม่ปะปน
- M1 ยกระดับไม่ได้403

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-014 — Team-only membership ไม่เปิด private project

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-05, FR-10 · **Acceptance:** AT-05  
**Preconditions / Test Data:** M1 เป็นสมาชิกทีม1 แต่ไม่มี membership ใน Pprivate; มี task/ไฟล์ชื่อ PRIVATE_ONLY

**ขั้นตอน:**

1. เปิด projectselector/list และค้น PRIVATE_ONLY
2. เรียก project/task/file IDs โดยตรง
3. ดู report/export/notifications

**Expected Results:**

- Pprivate/PRIVATE_ONLY ไม่อยู่ในรายการ/count/CSV/แจ้งเตือน
- directresource404 ไม่มีเนื้อหาและ metadata รั่ว

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-015 — Lead ดูแลได้เฉพาะทีมที่เป็นเจ้าของ

**Priority:** P0 · **Role:** L1 · **Method:** UI + Integration  
**Trace:** FR-05, FR-08, FR-09 · **Acceptance:** AT-06, AT-07  
**Preconditions / Test Data:** L1Lead ทีม1 ไม่มี P2membership

**ขั้นตอน:**

1. สร้าง/แก้ P1 และจัด membership
2. ลองแก้ P2 หรือแต่ง Lead ทีม2 ทาง API

**Expected Results:**

- จัดโปรเจกต์ owner ทีม1 ได้
- ทีม2/โปรเจกต์ที่ไม่เข้าถึงถูกปฏิเสธ ไม่มี roleexpansion

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-016 — โปรเจกต์ข้ามทีม Editor เขียนได้เฉพาะที่แชร์

**Priority:** P0 · **Role:** L1 และ M2 · **Method:** UI + Integration  
**Trace:** FR-09, FR-10 · **Acceptance:** AT-07  
**Preconditions / Test Data:** M2 ทีม2; L1ownerLeadPshared ทีม1

**ขั้นตอน:**

1. L1 เพิ่ม M2 เป็น EditorPshared
2. M2 สร้าง/แก้ task/แนบ comment
3. M2 เปิด Pprivate หรือ P1 ที่ไม่ได้แชร์

**Expected Results:**

- Editor ทำงาน Pshared ได้
- ไม่เปิดโปรเจกต์อื่นของทีม1 โดยอัตโนมัติ

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-017 — Viewer อ่านได้แต่ทุก write ถูกบล็อก

**Priority:** P0 · **Role:** V · **Method:** UI + Integration  
**Trace:** FR-05, FR-10 · **Acceptance:** AT-07  
**Preconditions / Test Data:** V เป็น ViewerPshared มี task/files

**ขั้นตอน:**

1. อ่าน task/comments/history/download
2. ลอง create/edit/move/subtask/comment/upload/delete/restore โดยตรงผ่าน API

**Expected Results:**

- อ่าน allowed ตาม scope
- write403 ทั้งหมดและ DB/filebytes ไม่เปลี่ยน

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-018 — ถอน project access ขณะเปิดงาน

**Priority:** P0 · **Role:** L1 และ M2 · **Method:** UI + Integration  
**Trace:** FR-05, FR-11 · **Acceptance:** AT-08  
**Preconditions / Test Data:** M2EditorPshared มีงาน open และ done ที่มอบหมาย; เปิด detail ก่อนถอน

**ขั้นตอน:**

1. L1 ถอน M2 จาก project
2. M2save/download/API ใหม่และรอ poll รอบถัดไป
3. ตรวจ openassignee/donehistory/notifications

**Expected Results:**

- request ใหม่404 และ UI ปิด access≤pollinterval
- open งาน unassign;done คง history
- notifications ไม่เผย task ที่หมดสิทธิ์

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-019 — ลด Editor เป็น Viewer และยกเว้นคนที่ยังมีสิทธิ์จาก Lead

**Priority:** P0 · **Role:** A/L1/M2 · **Method:** Integration  
**Trace:** FR-10, FR-11, FR-13 · **Acceptance:** AT-08  
**Preconditions / Test Data:** M2explicitEditor; L1 เป็น ownerLead และมี explicitEditor เพื่อทดสอบ

**ขั้นตอน:**

1. ลด M2 เป็น Viewer
2. ลด explicitL1 เป็น Viewer โดยไม่ถอด Lead
3. ตรวจ assignment และ effectivewrite

**Expected Results:**

- M2write ไม่ได้/open งาน unassign
- L1 ยังมี write จาก Lead ไม่ unassign โดยผิดพลาด

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-020 — ถอนสมาชิกทีมคง explicit project access

**Priority:** P0 · **Role:** A และ M2 · **Method:** Integration  
**Trace:** FR-07, FR-11 · **Acceptance:** AT-06, AT-08  
**Preconditions / Test Data:** M2 อยู่ทีม2 และ EditorPshared ทีม1; L2Lead ทีม2 ไม่มี explicitP2

**ขั้นตอน:**

1. ถอน M2 จากทีม2
2. ถอน L2 จาก team2
3. ตรวจ Pshared/P2access และ openassignments

**Expected Results:**

- M2 ยังใช้ Pshared จาก explicitmembership
- L2 เสีย implicitLead;งาน opencleanup เมื่อไม่มีสิทธิ์อื่น
- donehistory คงเดิม

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-021 — Deactivate user ตัด session และ unassign งานค้าง

**Priority:** P0 · **Role:** A/M1 · **Method:** UI + Integration  
**Trace:** FR-03, FR-11, FR-13 · **Acceptance:** AT-03, AT-08  
**Preconditions / Test Data:** M1 มี open/done งานหลาย project และสอง session

**ขั้นตอน:**

1. A ปิดบัญชี M1
2. M1 เรียก API เก่าและ A ดู assigneeoptions
3. ตรวจงาน/history แล้ว reactivate

**Expected Results:**

- session เก่า401;ไม่อยู่ eligiblepicker
- openunassign ทั่ว scope;done/comments/creator คงประวัติ
- reactivate ไม่คืน session เก่าอัตโนมัติ

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-022 — Archive project read-only พร้อม Admin/Lead lifecycle exceptions

**Priority:** P0 · **Role:** L1/M1 · **Method:** UI + Integration  
**Trace:** FR-09 · **Acceptance:** AT-29  
**Preconditions / Test Data:** P1 มี task/recurrence/comment/file/subtask

**ขั้นตอน:**

1. L1archiveP1
2. M1 อ่านและลองแก้/move/comment/upload/subtask/complete
3. L1unarchive ด้วย version ล่าสุด

**Expected Results:**

- M1 อ่านตามสิทธิ์ได้; writes งาน/move/comment/upload/subtask/complete ถูกปฏิเสธไม่มี successor; Admin/owner Lead ลบ/คืนงานได้ผ่าน endpoint เฉพาะตาม RD-01
- unarchive คืนใช้งานตามสิทธิ์

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-023 — Archive team และ directory privacy

**Priority:** P1 · **Role:** A/L1/M1 · **Method:** UI + Integration  
**Trace:** FR-06, FR-09, FR-10 · **Acceptance:** AT-06, AT-07  
**Preconditions / Test Data:** ทีม1 มี activeP1; อีกทีมไม่มี activeproject

**ขั้นตอน:**

1. ลอง archive ทีม1 แล้ว archive ทีมว่าง
2. ลองสร้าง project ใน teamarchived
3. L1 เปิด directory เพื่อแชร์;M1 เรียก directory

**Expected Results:**

- activeproject ทำให้ archive ถูกบล็อก
- teamarchived สร้าง project ไม่ได้
- L1 เห็นเฉพาะ active display-name/team ข้อมูลที่จำเป็น;M1 ไม่ได้ directory องค์กร

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## C. งาน Checklist งานซ้ำและถังขยะ

### TC-024 — สร้าง แก้ และมอบหมายงานพร้อมทุก field

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-12, FR-13, FR-14 · **Acceptance:** AT-09  
**Preconditions / Test Data:** M1EditorP1; eligibleM1/L1; VViewer

**ขั้นตอน:**

1. สร้างงานชื่อทดสอบไทย description/category/high/startD0/dueD0+2/assigneeM1
2. แก้ชื่อ/ผู้รับ/priority/status ด้วย version ล่าสุด
3. reload และตรวจ history

**Expected Results:**

- fields บันทึกคงและ version เพิ่ม
- ผู้รับถูกต้อง;มี event ผู้ทำ/เวลา/fieldchanges ไม่มี project ย้าย

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-025 — Validation task และ unknown fields

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-12, FR-13, FR-14 · **Acceptance:** AT-09  
**Preconditions / Test Data:** P1active; snapshot ก่อนแต่ละ case

**ขั้นตอน:**

1. ส่ง title ว่าง/201chars, date2026-02-30, start หลัง due, enum ผิด
2. ส่ง assigneeV/inactive/noaccess
3. ส่ง creator_id/projectchange/version ปลอมใน allowlistboundary

**Expected Results:**

- syntax/businessvalidation ตาม contract และ fielderrors
- ผู้รับไม่ eligible ถูกปฏิเสธ
- ห้ามแก้ protectedfields;ไม่มี partialrecord

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-026 — งานไม่มอบหมายและไม่มีวันส่ง

**Priority:** P1 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-12, FR-13, FR-19 · **Acceptance:** AT-09, AT-15  
**Preconditions / Test Data:** P1active

**ขั้นตอน:**

1. สร้าง taskassignee=null/start=null/due=null
2. เปิด list/MyTasks/calendar/report

**Expected Results:**

- สร้างได้;ไม่มี date สมมติ
- ไม่อยู่ MyTasksassigned และ calendardate
- reportunassigned ถูก;no-duelist แสดงงานตาม scope

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-027 — Checklist CRUD และ completion gate

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-15, FR-14 · **Acceptance:** AT-10  
**Preconditions / Test Data:** R-01resolved; tasktodo มีสอง subtasks

**Baseline decision:** R-01–R-04 RESOLVED ตาม version1.1;กรณีนี้ยัง NOT_RUN จนทดสอบจริง

**ขั้นตอน:**

1. เพิ่ม/แก้ชื่อ/ลบ subtask ทดสอบหนึ่งรายการ
2. เหลือสองงานและ done เพียงหนึ่ง แล้วเปลี่ยน parentdone
3. ติ๊กครบแล้วดู status จากนั้นกด done เอง

**Expected Results:**

- CRUDversion ถูก
- incomplete422 SUBTASKS_INCOMPLETE ไม่เปลี่ยน parent
- ติ๊กครบไม่ auto-done;กด done สำเร็จเมื่อ baseline ยืนยันแบบ SRS

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-028 — Reopen และ subtask guard ตอน done

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-14, FR-15, FR-33 · **Acceptance:** AT-10, AT-24  
**Preconditions / Test Data:** taskdone checklist ครบและ completed_at มีค่า

**ขั้นตอน:**

1. ลองเพิ่มหรือ untick subtask ที่ parent done
2. reopenparent และ untick
3. เปิด history/reportcompletion

**Expected Results:**

- ตอน done ห้ามเพิ่มหรือ untick checklist ตาม guard
- reopenclearscompleted_at และแก้ได้
- history คง event;งานไม่อยู่ doneperiod อีก

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-029 — Recurring daily/weekly และ field copy

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-16 · **Acceptance:** AT-11  
**Preconditions / Test Data:** taskdueD0/startD0-2 มี subtasks ครบ/comment/file; clone แยก dailyweekly

**ขั้นตอน:**

1. ปิด taskdaily/weekly
2. ตรวจ successordue/start/fields/checklist
3. เปิด comments/files ของ successor

**Expected Results:**

- daily+1 weekly+7;start รักษา offset
- successortodo/version1/checklistreset
- ไม่ copycomment/file/history มี serieslink

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-030 — Monthly anchor และ leap year

**Priority:** P0 · **Role:** M1 · **Method:** Unit + Integration  
**Trace:** FR-16 · **Acceptance:** AT-11  
**Preconditions / Test Data:** isolatedfixturemonthlyanchor31; due2027-01-31 และ2028-01-31 สอง series

**ขั้นตอน:**

1. ปิด series2027Jan แล้ว Feb แล้วตรวจ March
2. ทำแบบเดียวกัน series2028
3. ตรวจ startoffset ถ้ามี

**Expected Results:**

- 2027→Feb28→Mar31
- 2028→Feb29→Mar31 ไม่ drift เป็น28/29 ถาวร
- due_date จริงและ startoffset ถูก

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-031 — Recurring completion retry/concurrent/reopen

**Priority:** P0 · **Role:** M1/L1 · **Method:** Integration  
**Trace:** FR-16, FR-18 · **Acceptance:** AT-12  
**Preconditions / Test Data:** taskrecurring หนึ่งงาน version เดียวกัน; แยก session และ keys

**ขั้นตอน:**

1. ส่ง completion พร้อมกันสอง user
2. retryrequestkey เดิม และเปิดกลับ/ปิดซ้ำ
3. ตรวจ source/successor/event

**Expected Results:**

- successor หนึ่งรายการ
- stale409 หรือ cachedsame-result ตาม key
- reopen/recomplete ไม่สร้างรอบเพิ่ม

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-032 — Recurring validation และ overdue ไม่ catch-up

**Priority:** P1 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-16 · **Acceptance:** AT-11, AT-12  
**Preconditions / Test Data:** recurringweeklydueD0-30days

**ขั้นตอน:**

1. ลอง recurrenceweekly โดย due=null
2. ปิด overduetask และตรวจจำนวน nexttasks
3. ตั้ง recurrencenone ก่อนปิด source ใหม่

**Expected Results:**

- ไม่มี due ถูก422
- สร้างเพียงรอบถัดไปหนึ่งงานแม้ยัง overdue
- none ไม่สร้าง successor

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-033 — Atomic rollback เมื่อ completion/recurrence ล้มเหลว

**Priority:** P0 · **Role:** ผู้พัฒนา · **Method:** Integration  
**Trace:** FR-16, FR-18 · **Acceptance:** AT-12, AT-14  
**Preconditions / Test Data:** testfault-injection ภายใน integrationharness ไม่เปิดบน production

**ขั้นตอน:**

1. ทำ taskrecurringcomplete แล้ว injectDBerror หลังเตรียม successor
2. ตรวจ task/columns/events/notifications/recurrence rows
3. retry หลัง removefault

**Expected Results:**

- transaction ย้อนทั้งหมด ไม่มี sourcedone ครึ่งชุด
- retry สร้าง successor หนึ่งครั้งและ order/version สอดคล้อง

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-034 — Soft delete และ restore พร้อมสิทธิ์

**Priority:** P0 · **Role:** M1/L1/V · **Method:** UI + Integration  
**Trace:** FR-17 · **Acceptance:** AT-13  
**Preconditions / Test Data:** R-02resolved; M1creator task มี files/checklist; M2Editor แต่ไม่ creator

**Baseline decision:** R-01–R-04 RESOLVED ตาม version1.1;กรณีนี้ยัง NOT_RUN จนทดสอบจริง

**ขั้นตอน:**

1. M2 ลอง delete งาน M1
2. M1softdelete;ดู active/search/export/reminder
3. L1restore ภายใน30 วัน;V ลอง restore

**Expected Results:**

- M2 ไม่ได้;creatordelete ได้
- งานไม่ปรากฏ active แต่ยังใน trash ตาม scope
- L1restore ท้ายคอลัมน์เดิมพร้อมข้อมูล;V ไม่ได้

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-035 — Task version conflict สองผู้ใช้

**Priority:** P0 · **Role:** M1/L1 · **Method:** UI + Integration  
**Trace:** FR-18 · **Acceptance:** AT-14  
**Preconditions / Test Data:** เปิด task เดียว versionv ในสอง session

**ขั้นตอน:**

1. M1 เปลี่ยน title และ save
2. L1 เปลี่ยน description ด้วย versionv เก่า
3. reloadlatest/เก็บ draft ตาม UI แล้ว save ใหม่

**Expected Results:**

- M1 สำเร็จ;L1 ได้409 ไม่มีการทับ
- UI แสดง latest กับ draft หรือทาง reload ชัดเจน
- ข้อมูลล่าสุดไม่สูญ

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## D. Kanban Drag & Drop

### TC-036 — ลากข้ามคอลัมน์ persist หลัง reload

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-21, FR-22 · **Acceptance:** AT-16  
**Preconditions / Test Data:** P1 ไม่มี filter มี A/B/Ctodo; columnsversions ล่าสุด

**ขั้นตอน:**

1. ลาก A ไป doing ก่อน cardX
2. reload และเปิด browser อีก session
3. ตรวจ taskstatus/columnorder

**Expected Results:**

- Adoing และอยู่ก่อน X ทั้งสอง session
- DB/status/rank ตรง;versions เพิ่มเฉพาะ affectedcolumns

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-037 — ลากจัดลำดับในคอลัมน์และ append

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-22 · **Acceptance:** AT-16  
**Preconditions / Test Data:** todoA/B/C full unfilteredboard

**ขั้นตอน:**

1. ลาก C ก่อน A
2. ลาก C ไปท้ายโดย before_task_id=null
3. reload ทุกครั้ง

**Expected Results:**

- orderC/A/B แล้ว A/B/C ตามคำสั่ง
- rankunique และ refresh ไม่เปลี่ยนลำดับ

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-038 — Done ด้วยการลากใช้ completion gate

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-15, FR-21 · **Acceptance:** AT-10, AT-16  
**Preconditions / Test Data:** R-01resolved; taskchecklist ไม่ครบ

**Baseline decision:** R-01–R-04 RESOLVED ตาม version1.1;กรณีนี้ยัง NOT_RUN จนทดสอบจริง

**ขั้นตอน:**

1. ลาก task ไป done
2. ติ๊กครบแล้วลาก done อีกครั้ง

**Expected Results:**

- ครั้งแรก422 และ card กลับเดิม ไม่มี completed_at
- ครั้งที่สอง done และ recurrence ตามกติกาถ้ามี

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-039 — ลากตอน offline/403 คืนตำแหน่ง

**Priority:** P0 · **Role:** M1/L1 · **Method:** UI + Integration  
**Trace:** FR-21 · **Acceptance:** AT-17  
**Preconditions / Test Data:** board เปิดพร้อม currentdata

**ขั้นตอน:**

1. ตัด network แล้วลาก card
2. เชื่อมคืน/refresh
3. L1 ลด M1 เป็น Viewer แล้ว M1 ลองลากจากหน้าเก่า

**Expected Results:**

- ไม่แสดง saved ก่อน ack;failure คืน card และ error
- refresh ใช้ authoritativestate
- 403/404 ไม่เปลี่ยน DB และ UI หยุด write

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-040 — ลากพร้อมกันในคอลัมน์เดียว

**Priority:** P0 · **Role:** M1/L1 · **Method:** Integration  
**Trace:** FR-18, FR-21, FR-22 · **Acceptance:** AT-17  
**Preconditions / Test Data:** สอง session อ่าน source/targetcolumnversion เดียวกัน

**ขั้นตอน:**

1. ส่ง moveA และ moveB พร้อมกันโดยใช้ versions เดิม
2. reload ทั้งสองและ retry คำสั่งที่ stale ด้วย versions ใหม่

**Expected Results:**

- คำสั่งแรก commit อีกคำสั่ง409
- ไม่มี rank ซ้ำหรือ task หาย;reload ล่าสุดชัด
- retry เปลี่ยนตาม userintent ไม่ทับเงียบ

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-041 — Move timeout และ idempotent retry

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-18, FR-21 · **Acceptance:** AT-17  
**Preconditions / Test Data:** networkproxytest ยอม servercommit แต่ตัด response;key คงเดิม

**ขั้นตอน:**

1. ส่ง move แล้วทำ response หาย
2. UIGETboard ล่าสุดก่อน retry
3. ส่ง requestkey เดิมอีกครั้ง

**Expected Results:**

- task ย้ายเพียงครั้งเดียว
- UI แก้ตำแหน่งจาก authoritativeboard
- cachedsame-result ไม่ incrementcolumn/event ซ้ำ

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-042 — Filtered board ปิด reorder

**Priority:** P1 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-20, FR-23 · **Acceptance:** AT-18  
**Preconditions / Test Data:** board เต็มแล้วเปิด filter

**ขั้นตอน:**

1. เปิด search/assignee/priority/category/date/status ทีละตัว
2. ลอง drag/reorder และ clearfilters
3. ใช้ detail เปลี่ยน status ขณะ filter เปิด

**Expected Results:**

- reorderdisabled และมีเหตุผล
- clearfilter คืน drag
- detailstatus ยังทำได้ตาม permission ไม่จัด hiddenrows ผิด

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-043 — Keyboard และ touch alternative

**Priority:** P1 · **Role:** M1/V · **Method:** UI  
**Trace:** FR-23, FR-35 · **Acceptance:** AT-18  
**Preconditions / Test Data:** device/browser ที่ทดสอบ keyboard+touch

**ขั้นตอน:**

1. Tab เข้าการ์ดแล้วใช้ menuchangestatus/move ก่อนหลัง
2. บน touch เลื่อน page และใช้ handlelongpress
3. V ตรวจ controls และลอง API ตรง

**Expected Results:**

- ทำได้โดยไม่ drag ด้วย mouse และ focus ถูก
- touchscroll ไม่ถูกแย่ง;alternative ใช้งานได้
- Viewer ไม่มี write และ server บล็อก

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-044 — Invalid anchor/project และ stale task version

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-18, FR-21, FR-22 · **Acceptance:** AT-17  
**Preconditions / Test Data:** มี P1/Psharedtasks และ versions

**ขั้นตอน:**

1. ส่ง before_task_id ของอีก project/ตัวเอง/ผิด targetstatus
2. ส่ง task_version เก่าและ columnversion ถูก
3. ตรวจ DB หลังทุก request

**Expected Results:**

- validation/conflict ปฏิเสธและไม่มี partialmove
- rank/status/version ก่อนคำสั่งที่ถูกปฏิเสธคงเดิม

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-045 — Board เกิน500 งาน fallback

**Priority:** P1 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-20, FR-21, FR-23 · **Acceptance:** AT-18, AT-19  
**Preconditions / Test Data:** P1seed501active tasks

**ขั้นตอน:**

1. เปิด board และ paginationfallback
2. ใช้ list/menuchangestatus
3. ตรวจไม่มี reorder บนรายการที่โหลดไม่ครบ

**Expected Results:**

- ใช้ fallback ตาม SRS ไม่โหลดไม่จำกัด
- taskstatus ทำงานได้แต่ไม่ reorderhiddentasks โดยผิด

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## E. รายการ ปฏิทิน และ refresh

### TC-046 — My Tasks วันนี้/เกินกำหนด/ถัดไป/ไม่มีวันส่ง

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-19, FR-20 · **Acceptance:** AT-15  
**Preconditions / Test Data:** 4openassignedM1:dueD0-1/D0/D0+1/null;อีก taskcreatorM1assigneeM2

**ขั้นตอน:**

1. เปิด MyTasks และแต่ละกลุ่ม
2. เปิดงานที่ฉันสร้างแยก view

**Expected Results:**

- dueD0 ไม่ overdue;dueD0-1overdue
- null อยู่ nodue และ M2 ไม่อยู่ assignedview
- created-by-view แยกไม่ผสม

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-047 — Bangkok midnight และวันที่จริง

**Priority:** P0 · **Role:** M1 · **Method:** Unit + Integration  
**Trace:** FR-19, FR-25 · **Acceptance:** AT-15  
**Preconditions / Test Data:** isolatedclock2026-10-05T16:59Z แล้ว17:01Z;taskdueOct5

**ขั้นตอน:**

1. ดูวันนี้/overdue ก่อนและหลัง clock เปลี่ยน
2. เปิด calendar ใน browsertimezone อื่น

**Expected Results:**

- ก่อนคือ23:59Oct5/หลังคือ00:01Oct6Bangkok
- task เป็น overdue หลัง midnightBangkok
- calendardate-only ไม่เลื่อนตาม browsertimezone

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-048 — Search/filter/sort/pagination ครบและ scope

**Priority:** P1 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-20, FR-24 · **Acceptance:** AT-15, AT-19  
**Preconditions / Test Data:** P1seed≥120tasks หลาย fields และ hiddenPRIVATE_ONLY

**ขั้นตอน:**

1. ค้น Thai title/description/category
2. combineANDfilters และ ORstatus/priority
3. nextpage/maxpage100/duedatenull-last
4. ค้น hidden และดู total

**Expected Results:**

- ผลตามนิยามและไม่มี duplicate/หายข้าม page
- unknown/private ไม่อยู่ทั้ง items และ total
- sortnull-last พร้อม IDtie-break

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-049 — Calendar/Gantt และวันที่ไม่ครบ

**Priority:** P1 · **Role:** M1/Viewer · **Method:** UI + Integration\
**Trace:** FR-24, FR-25 · **Acceptance:** AT-19  
**Preconditions / Test Data:** taskdueOct31/Nov1/null, start-only, both-null, start=due, cross-year, leapday และ ≥120tasks; Viewer/archived/private fixtures

**ขั้นตอน:**

1. เลื่อนเดือน Oct/Nov
2. ใช้ filter เดียวกับ tasklist
3. คลิก task และดู no-duelist
4. สลับ Gantt; ตรวจ inclusive start–due, due-only marker, incomplete-date list
5. เลื่อนช่วง/วันนี้/day-week-month; ตรวจ cross-month/year/leapday/Bangkok midnight
6. ตรวจ overlap viewport, pagination ข้าม first page และ filters/search/scope เทียบ Table
7. Keyboard/Enter/detail; Viewer/archived ไม่มี write; private tasks ไม่อยู่ bars/list/count
8. แก้วันผ่านฟอร์มเดิมด้วย version ล่าสุด/เก่า และ refresh ขณะมี draft; ตรวจ atomic audit/notifications และ rollback

**Expected Results:**

- task วางวัน due เท่านั้นไม่ durationbar
- list/calendar ผลเทียบตรง
- null อยู่แยกไม่กลายเป็นวันนี้;เปิด detail ถูก
- Gantt bar รวมวันปลายและ start=due หนึ่งวัน; due-only ไม่สมมติ start; start-only/both-null อยู่รายการแยก
- วันนี้/ช่วง/zoom ข้ามปี/leapday ถูก; pagination ไม่ตกข้อมูล
- ทั้ง4 views ใช้ filter/สิทธิ์ชุดเดียวกัน; viewport เปลี่ยนเฉพาะพื้นที่เวลา
- keyboard/mobile อ่านได้; Viewer/archived ไม่มี write; conflict ไม่ทับข้อมูลและ draft ไม่หาย
- ไม่มี drag scheduling/dependency arrows/invented progress; full UI/provider checks มีหลักฐานจริง

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-050 — Polling และ dirty draft ไม่หาย

**Priority:** P0 · **Role:** M1/L1 · **Method:** UI + Integration  
**Trace:** FR-18, FR-26 · **Acceptance:** AT-20  
**Preconditions / Test Data:** visibleonlinetabs ทั้งสอง;M1 พิมพ์ draft ใน detail

**ขั้นตอน:**

1. L1 แก้ tasksave
2. รอ≤10s ที่ M1 โดยไม่ refresh
3. M1saveversion เก่า แล้ว hidden/focus/offline/reconnect

**Expected Results:**

- M1 เห็น updatebadge โดย draft คง
- save409 ไม่ทับ
- hidden/offline หยุด poll;focusonlineGET ทันที;ไม่ทำ poll ต่อ idle

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## F. ความคิดเห็น ประวัติ และไฟล์แนบ

### TC-051 — Comment ไทย plain text และ idempotency

**Priority:** P0 · **Role:** M1/L1 · **Method:** UI + Integration  
**Trace:** FR-27 · **Acceptance:** AT-21  
**Preconditions / Test Data:** taskactiveM1Editor;ดูจาก L1 อีก session

**ขั้นตอน:**

1. เพิ่ม comment ไทยและ<svg onload=alert(1)>
2. ส่ง body เดิม key เดิม2 ครั้งและลอง key เดิม body ต่าง
3. reload/paginate

**Expected Results:**

- ข้อความแสดงเป็น text ไม่ execute
- samekey มี comment1;differentbody409
- author/time/ordering ถูก

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-052 — Audit fields/actor/time และ immutability

**Priority:** P0 · **Role:** M1/A · **Method:** UI + Integration  
**Trace:** FR-29, FR-39 · **Acceptance:** AT-21, AT-28  
**Preconditions / Test Data:** task มี create/edit/assign/status/fileevents

**ขั้นตอน:**

1. เปลี่ยน field ตามลำดับและเปิด history
2. พยายามแก้ audit ผ่าน API
3. Aresetpassword แล้วตรวจ redactedadminaudit

**Expected Results:**

- มี before/after/actor/UTC→Bangkok เวลา
- ไม่มี API แก้ history
- ไม่เก็บ password/rawtoken/setupsecret

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-053 — อัปโหลดไฟล์ valid/download bytes ตรง

**Priority:** P0 · **Role:** M1/V · **Method:** UI + Integration  
**Trace:** FR-28 · **Acceptance:** AT-22  
**Preconditions / Test Data:** generatedPDF/JPEG/Office จริงที่ checksum ทราบ;ขนาดเล็ก

**ขั้นตอน:**

1. upload แต่ละ allowedtype ที่ fixture เตรียม
2. Vdownload และเทียบ SHA256
3. ตรวจ headers/storage key

**Expected Results:**

- สำเร็จและ bytes ตรง
- filename ไทยถูก;attachment/nosniff
- ไม่มี publicURL และ storagekey สุ่มนอก webroot

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-054 — Boundary ไฟล์1byte/10MiB/+1byte/ว่าง

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-28 · **Acceptance:** AT-22  
**Preconditions / Test Data:** validUTF8.txt ขนาด1,10485760,10485761,0bytes

**ขั้นตอน:**

1. upload แต่ละ file ใน snapshot แยก
2. ตรวจ metadata/tempfiles หลัง fail

**Expected Results:**

- 1byte และ10MiB พอดี allowed ภายใต้ quota
- 10MiB+1 ได้413;ว่างปฏิเสธ
- noorphanmetadata/temp ค้างหลัง cleanup

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-055 — Extension/magic/UTF8 allowlist

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-28 · **Acceptance:** AT-22  
**Preconditions / Test Data:** fileshtml/svg/exe;pngrename จาก exe;UTF8invalidtxt;validdocx

**ขั้นตอน:**

1. uploaddeniedextensions
2. uploadextension ปลอม/magic ไม่ตรง/invalidUTF8
3. uploadvalidOffice แล้วตรวจ server ไม่ extract

**Expected Results:**

- invalid422 หรือ contractvalidation;ไม่มี bytes เผยผ่าน static
- validOffice ได้โดยไม่ unzipserver
- ไม่อ้างว่า allowlist เท่ากับ malwarescan

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-056 — Filename traversal และ file IDOR

**Priority:** P0 · **Role:** M1/M2 · **Method:** Integration  
**Trace:** FR-05, FR-28 · **Acceptance:** AT-05, AT-22, AT-30  
**Preconditions / Test Data:** multipartfilename../outside.txt และ controlchars;filePprivate

**ขั้นตอน:**

1. uploadfilenamepath/controlchar
2. ตรวจชื่อแสดง/storagepath
3. M2requestprivateattachmentID และลอง staticuploadsURL

**Expected Results:**

- normalize/strippath;ไม่เขียนนอก datauploads
- privateID404/staticURL ไม่เปิด bytes
- ไม่มี serverpath ใน error

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-057 — Quota race และ reservation release

**Priority:** P0 · **Role:** M1/L1 · **Method:** Integration  
**Trace:** FR-28 · **Acceptance:** AT-22  
**Preconditions / Test Data:** ใช้ configtestquota20MiB;used15MiB;สอง valid4MiBfiles

**ขั้นตอน:**

1. upload4MiB สอง requests พร้อมกัน
2. ทำ upload กลางทาง fail แล้ว retry ภายหลัง
3. ตรวจ stored+reservedbytes

**Expected Results:**

- รับได้ไม่เกิน quota;fail ชัดไม่ overcommit
- failedreservationrelease;retry เมื่อมีพื้นที่ได้
- counter ตรง disk หลัง cleanup

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-058 — Upload DB/file partial failure และ startup recovery

**Priority:** P0 · **Role:** ผู้พัฒนา · **Method:** Integration  
**Trace:** FR-28, FR-39 · **Acceptance:** AT-22, AT-28  
**Preconditions / Test Data:** testfault-injectionDBinsert/filemove/crash;ใช้งานใน testinstance เท่านั้น

**ขั้นตอน:**

1. injectfail หลัง temp ก่อน metadata/หลัง metadata ก่อน finalization
2. restart และ runrecovery
3. ตรวจ referencedfile/temp/reservation

**Expected Results:**

- ไม่มี metadata ดาวน์โหลดไฟล์ผิด
- cleanuporphan/temp/reservation ที่ค้าง
- referencedfiles เดิมไม่ถูกลบและ log ไม่เผย secret

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-059 — สิทธิ์ลบและคืนไฟล์ ภายใน30 วัน พร้อม quota

**Priority:** P0 · **Role:** M1/L1/M2/V · **Method:** UI + Integration  
**Trace:** FR-28, FR-17 · **Acceptance:** AT-22, AT-13  
**Preconditions / Test Data:** M1 uploader; M2Editor ที่ไม่ได้ upload; VViewer; parenttask/projectactive;ไฟล์ validchecksum และ bytes ที่ทราบ

**ขั้นตอน:**

1. M2/V ลองลบไฟล์ M1; M1softdelete แล้ว GETactivefilelist/download
2. M1/ownerLead เปิด filetrash และ restore วันที่29;Viewer ลอง restore ผ่าน API
3. ลบอีกครั้งและเลื่อน testclock เป็นวันที่31;runcleanup;ตรวจ disk/quota
4. จำลอง diskcleanupfail ใน isolatedtest แล้ว retry;parentarchived/deleted ลอง restore

**Expected Results:**

- M2/V ไม่มีสิทธิ์ลบ;M1 ลบได้;activefilelist ไม่แสดงและ download404 ทันที;bytes คงอยู่และยังนับ quota
- M1/Admin/ownerLead ที่มี writeaccess คืนได้ก่อนครบ30 วัน;checksums เดิม;Viewer403;restore ไม่เพิ่ม bytes ซ้ำ
- ครบ30 วัน purgebytes ตาม job;นับพื้นที่คืนเมื่อ bytes ลบจริง;metadata/cleanupstate ไม่ค้างโดยไม่ติดตาม
- cleanupfail เข้าคิว retry/log;project/task ที่ไม่ active คืนไม่ได้;ไม่เผย path/token

**Actual / Evidence / Defect:** NOT_RUN — เก็บผลพร้อม Build/Role/Date


### TC-060 — Assignment/comment/status recipients และไม่แจ้งตัวเอง

**Priority:** P0 · **Role:** M1/L1 · **Method:** UI + Integration  
**Trace:** FR-30 · **Acceptance:** AT-23  
**Preconditions / Test Data:** L1creator;M1assignee;M2Editor ร่วม project

**ขั้นตอน:**

1. L1assignM1 แล้ว M2comment
2. M1 เปลี่ยน status และ M1assign ตนเองในงานใหม่
3. ตรวจ notifications ทุกคน

**Expected Results:**

- assignment→M1;comment→creator/assignee ที่ไม่ใช่ actor
- status ไม่แจ้ง actor;selfassignment ไม่แจ้งตน
- ไม่มี recipientnoaccess/inactive

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-061 — Reminder D-1/D0/overdue ไม่ซ้ำหลัง restart

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-30 · **Acceptance:** AT-23  
**Preconditions / Test Data:** clockD0;tasksdueD0+1/D0/D0-1/done/archived/unassigned

**ขั้นตอน:**

1. runjob2 ครั้งแล้ว restart/run อีก
2. ตรวจ type/day/dedupe
3. เลื่อนวัน D0+1 แล้ว run

**Expected Results:**

- วันเดียวแต่ละ task/recipient/type มีหนึ่ง notification
- skipdone/deleted/archived/unassigned/inactive/noaccess
- วันใหม่แจ้งตาม type ใหม่ไม่สร้างย้อนหลังทุกวันที่ server ปิด

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-062 — Read-one/read-all เฉพาะตนและ unread badge

**Priority:** P1 · **Role:** M1/M2 · **Method:** UI + Integration  
**Trace:** FR-31 · **Acceptance:** AT-23  
**Preconditions / Test Data:** M1 มี3unread;M2 มี notificationID ที่รู้จาก fixture

**ขั้นตอน:**

1. M1read หนึ่งแล้ว readall
2. M1 ลอง markreadM2ID
3. เปิด badge แล้ว poll/reload

**Expected Results:**

- count3→2→0 ตาม currentaccess
- M2 ไม่ถูกเปลี่ยน read
- badge คงผลหลัง reload

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-063 — ถอน access แล้ว notification ไม่รั่วและ retention90 วัน

**Priority:** P0 · **Role:** L1/M1 · **Method:** Integration  
**Trace:** FR-11, FR-30, FR-31 · **Acceptance:** AT-08, AT-23  
**Preconditions / Test Data:** M1 มี notificationPshared และ olderthan90days;Rpolicyjobs พร้อม

**ขั้นตอน:**

1. ถอน M1access และ GETnotificationlist/unread
2. คลิกลิงก์จากหน้าเก่า
3. runretentionjob และตรวจ records

**Expected Results:**

- ไม่มี message/privatecount ที่หมดสิทธิ์
- task ใหม่404 และ UI ไม่เผย detail
- expirednotification ถูก cleanup ตาม90 วัน

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## H. รายงานและ CSV

### TC-064 — Report totals/status/overdue/unassigned/zero

**Priority:** P0 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-32, FR-33 · **Acceptance:** AT-24  
**Preconditions / Test Data:** isolateP1:6active tasks(todo2,doing1,review1,done2),1openoverdue,1unassigned;hidden/archived/deletedextra

**ขั้นตอน:**

1. ดู summaryP1 แบบ all-dates หรือ range ที่ครอบ fixture
2. เทียบ statussum กับ total
3. เลือก emptyproject

**Expected Results:**

- total6/status2+1+1+2=6;completion33.33%ตาม roundingUI
- overdue1/unassigned1;hidden/archived/deleted ไม่รวม
- zero0%/ไม่มีงาน ไม่ NaN

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-065 — Date basis/owner team/done period และ reopen

**Priority:** P0 · **Role:** L1/M1 · **Method:** Unit + Integration  
**Trace:** FR-33, FR-32 · **Acceptance:** AT-24  
**Preconditions / Test Data:** Psharedownerteam1/assigneeM2team2;created/duedate/completed คนละเดือน

**ขั้นตอน:**

1. เลือก created/due/completedbasis ทีละค่า
2. กรอง team1/team2/personM2
3. reopendone แล้วดู doneperiod ก่อนปิดใหม่

**Expected Results:**

- ฐานวันที่ใช้ค่าที่เลือกและ boundaryBangkokinclusive→UTC
- team ตาม owner ไม่ตาม assignee;person ตาม assignee
- reopen ออกจาก doneperiod;eventhistory ยังอยู่

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-066 — CSV ไทย escaping/formula/filter/scope/full rows

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-34, FR-20, FR-05 · **Acceptance:** AT-24, AT-05  
**Preconditions / Test Data:** P1≥120rows;titles ไทย/quote/newline/=SUM/space+=/@/tab;hiddenPRIVATE_ONLY

**ขั้นตอน:**

1. filterprojectP1 และ export
2. ตรวจ CSVparsedcount เทียบ reporttotal
3. เปิด Excel ใน safeisolatedtest และตรวจ formula-neutralization

**Expected Results:**

- ไม่ติด page50;ครบ rows/fieldsUTF8BOM/RFC4180
- nohidden/comments/password/filebytes
- ค่าที่อาจ formula เป็น text ไม่ execute

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-067 — Export cap ไม่ตัดเงียบ

**Priority:** P1 · **Role:** A · **Method:** Integration  
**Trace:** FR-34 · **Acceptance:** AT-24  
**Preconditions / Test Data:** isolateddataset50001matchedtasks;streamtest พร้อม

**ขั้นตอน:**

1. export เกิน50000
2. filter ลดเหลือ50000 และ export
3. วัด memory/response เมื่อมากกว่าหน้า UI

**Expected Results:**

- เกิน cap แจ้งชัดไม่คืนไฟล์ที่อ้างว่าครบแต่ตัด
- 50000 ตาม capexport ได้ครบและ stream ไม่ memory พุ่งจาก buffer ทั้งหมด

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## I. API security

### TC-068 — CSRF, Origin และ no mutation on rejected request

**Priority:** P0 · **Role:** M1 · **Method:** Integration  
**Trace:** FR-05 · **Acceptance:** AT-30  
**Preconditions / Test Data:** validcookie/currentcsrf;เรียก taskPATCH ที่ change ได้

**ขั้นตอน:**

1. ส่ง write ไม่มี Origin/Origin ผิด/CSRF ไม่มีหรือผิด
2. ส่ง same-origin+validCSRF controlrequest
3. ตรวจ DB และ events หลังแต่ละ reject

**Expected Results:**

- unsafe403 และไม่ mutate
- validrequest ทำได้ตาม role
- ไม่มี permissiveCORS ที่ข้าม origin

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-069 — SQL injection/XSS และ error redaction

**Priority:** P0 · **Role:** M1/ผู้ไม่ login · **Method:** Integration  
**Trace:** FR-05, FR-27, FR-39 · **Acceptance:** AT-21, AT-30  
**Preconditions / Test Data:** isolatedDB/config;payload ทดสอบไม่ใช้ระบบจริง

**ขั้นตอน:**

1. ส่ง username/search/title/comment ที่มี quote/SQLfragment/HTMLscript
2. ส่ง JSON ผิด/contenttype ผิด/unknownfields/oversizebody
3. ตรวจ UI/responses/logs

**Expected Results:**

- parameterizedquery ไม่ข้าม auth หรือทำ DB เปลี่ยน
- HTML เป็น text;syntax400/oversize413 ตาม contract
- noSQLstack/password/token/internalpath

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-070 — Spoofed proxy/Host และ security headers

**Priority:** P0 · **Role:** ผู้ทดสอบ · **Method:** Integration  
**Trace:** FR-05, FR-39 · **Acceptance:** AT-30  
**Preconditions / Test Data:** HTTPSproxytest มี trustedproxyallowlist

**ขั้นตอน:**

1. ส่ง X-Forwarded-Host/Proto/IP จากแหล่งไม่ trusted
2. ตรวจ CSP/nosniff/frame/referrerheaders
3. เปิด productionconfighttps แต่ COOKIE_SECURE=false

**Expected Results:**

- ไม่สร้าง trustedorigin จาก spoof และไม่ bypassIPpolicy
- headers ตาม SRS/CSP ไม่ unsafe-eval
- startup ปฏิเสธ config ขัดกัน

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## J. PWA / offline / responsive / browser

### TC-071 — PWA install และ static-only cache

**Priority:** P0 · **Role:** M1 · **Method:** UI  
**Trace:** FR-35, FR-36 · **Acceptance:** AT-26  
**Preconditions / Test Data:** HTTPSbrowser รองรับ PWA;ก่อน login/หลัง login มี CacheStorageinspect

**ขั้นตอน:**

1. installshortcut และเปิด
2. เปิด task/file/API แล้ว inspectcache
3. logout แล้ว offline/reopen

**Expected Results:**

- appmanifest/icons/starturl ถูก
- cache มีเฉพาะ static ไม่ API/task/file/login
- offline บอกต้อง online ไม่มี sensitivepersisteddata

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-072 — Reconnect ไม่ queue writes และไม่ล้าง draft

**Priority:** P0 · **Role:** M1 · **Method:** UI  
**Trace:** FR-26, FR-36 · **Acceptance:** AT-20, AT-26  
**Preconditions / Test Data:** มี dirtytaskform;PWAonline

**ขั้นตอน:**

1. offline แล้วลอง save
2. online กลับและ server มี version ใหม่
3. updateSW ขณะ dirtyform

**Expected Results:**

- ไม่มี offlinewritequeue ที่ส่งคำสั่งเก่าเอง
- refreshauthoritative;draft คงและ conflict ชัด
- SW ไม่ forcereload ล้าง draft

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-073 — Responsive/keyboard/modal/color/text zoom

**Priority:** P1 · **Role:** M1/V/A · **Method:** UI  
**Trace:** FR-23, FR-35 · **Acceptance:** AT-18, AT-26  
**Preconditions / Test Data:** 15screens จาก SRS;viewport360/tablet/desktop;zoom200%

**ขั้นตอน:**

1. เดินทุก screen ด้วย Tab/Enter/Escape
2. เปิด/ปิด modal และตรวจ returnfocus
3. ใช้ touchmenu/cardscroll และดู statuslabels

**Expected Results:**

- controls ไม่ทับ/ล้นจนใช้ไม่ได้
- label/focus trap/returnfocus ถูก
- status ไม่ใช้สีอย่างเดียวและ Viewerread-only

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-074 — Browser matrix ปัจจุบันและก่อนหน้าหนึ่งรุ่น

**Priority:** P1 · **Role:** ผู้ทดสอบ · **Method:** UI  
**Trace:** FR-35, FR-36 · **Acceptance:** AT-18, AT-26  
**Preconditions / Test Data:** มี Chrome/Edge/Firefox/Safari ตาม availability พร้อม versionrecord

**ขั้นตอน:**

1. รัน login/taskdrag/menu/upload/report/PWA หลักแต่ละ browser
2. บันทึก realdevice/emulation แยก
3. บันทึก browser/device ที่ไม่มี

**Expected Results:**

- blockingdefect ไม่มีใน supportedmatrix
- PWAfallback ชัดเมื่อไม่รองรับ
- ไม่มี device ระบุ NOT_RUN ไม่อ้างว่าผ่านจริง

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## K. Backup / restore / Windows / operations

### TC-075 — Restart persistence และ name/settings/health

**Priority:** P0 · **Role:** A/ผู้ติดตั้ง · **Method:** Operations  
**Trace:** FR-37, FR-39 · **Acceptance:** AT-28, AT-25  
**Preconditions / Test Data:** มี task/comments/files;Admin และ Member

**ขั้นตอน:**

1. A เปลี่ยนชื่อองค์กร;Member ลอง PATCH
2. restartapp และ GEThealthlive/ready จาก authorizedlocation
3. เปิดข้อมูลเดิม

**Expected Results:**

- ชื่อคง;Member403
- live ไม่เผย DBpath;readiness ตรง DB/storage
- task/comment/filechecksums คงหลัง restart

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-076 — Backup ระหว่าง writes และ checksum snapshot

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** Operations  
**Trace:** FR-38 · **Acceptance:** AT-25  
**Preconditions / Test Data:** testinstance มี DB/uploads;มี writer+upload กำลังทำ

**ขั้นตอน:**

1. runbackup ตาม README และส่ง writes ระหว่าง freeze
2. ตรวจ manifestDB/files/schema/hash
3. ทำ backupfail ด้วย disktest แล้วดู exit/unfreeze

**Expected Results:**

- freeze หยุด writes/jobs และรอ request จบ
- snapshotDB+files ตรงไม่มี halfstate
- failnonzero ไม่อ้างสำเร็จและ unfreeze ปลอดภัย

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-077 — Restore ลง clean instance และ revoke sessions

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** Operations  
**Trace:** FR-38, FR-40 · **Acceptance:** AT-25  
**Preconditions / Test Data:** validbackup+checksums;isolatedcleandir;session ก่อน backup เก็บเฉพาะ harness

**ขั้นตอน:**

1. หยุด apprestoreDB/files ตาม README
2. ตรวจ hash/taskcounts/access/download
3. ใช้ session เก่าและจับเวลา restore

**Expected Results:**

- checksum/count/permissions/files ตรง backup
- session เก่า401 หลัง restore
- บันทึก RPO≤24h/RTO≤4h ภายใต้ schedule/ops จริง ไม่ claim จาก script อย่างเดียว

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-078 — Migration/rollback checksum และ existing data

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** Operations  
**Trace:** FR-40 · **Acceptance:** AT-25, AT-28  
**Preconditions / Test Data:** fixtureoldschema กับ data/files และ backup

**ขั้นตอน:**

1. upgrade และ rerunmigration
2. ทดลอง checksummismatch/unsupporteddowngrade ใน copy
3. rollback ตาม README จาก backup

**Expected Results:**

- data/history คงและ migrationrepeat-safe
- invalidschema/checksum ถูกบล็อก
- rollback กู้ได้ DB/files รุ่นเดียวกัน

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-079 — Trash purge/recurrence tombstone/file cleanup

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** Operations  
**Trace:** FR-17, FR-16, FR-28 · **Acceptance:** AT-13, AT-12, AT-22  
**Preconditions / Test Data:** R-02/03/04resolved;deletedtasks29/31 วันมี series/files;faultcleanup

**Baseline decision:** R-01–R-04 RESOLVED ตาม version1.1;กรณีนี้ยัง NOT_RUN จนทดสอบจริง

**ขั้นตอน:**

1. runretentionjob
2. ตรวจ29 วันยัง restore ได้/31 วัน purge ตาม baseline
3. ทำ filesystemcleanupfail แล้ว retry/restart และตรวจ series

**Expected Results:**

- retention ตาม confirmedpolicy
- audit ก่อน purge และ DB/files สัมพันธ์
- tombstone กัน seriesretry ซ้ำหลัง purge;cleanupfail มี retry ไม่ claim ลบครบ

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-080 — Fresh Windows ZIP install/service/HTTPS/backup

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** Operations  
**Trace:** FR-37, FR-39, FR-40 · **Acceptance:** AT-28  
**Preconditions / Test Data:** Windows จริงที่ติด runtime/service/proxy ได้;freshZIP;ไม่ใช้ Server จริงโดยไม่อนุญาต

**ขั้นตอน:**

1. unzip และทำ README/setupadmin/service/dataACL
2. reboot และเปิด domainHTTPStest
3. รัน scheduledbackup และ reviewpackageinventory

**Expected Results:**

- freshinstall ทำได้ไม่มี defaultsecret
- service เริ่มอัตโนมัติ/origin-cookie ถูก
- ZIP ไม่มี.env/liveDB/uploads/logs/session/testcredentials;Windows ที่ไม่มี environment ระบุ BLOCKED

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-081 — Admin local recovery ไม่มี public recovery route

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** Operations  
**Trace:** FR-04, FR-39, FR-40 · **Acceptance:** AT-28, AT-30  
**Preconditions / Test Data:** isolatedinstanceAdmin เข้าไม่ได้;accessfilesystem ตาม servicepermissions

**ขั้นตอน:**

1. รัน recoveryCLI ตาม README โดยไม่ใส่ password ใน commandlog
2. login ใหม่และตรวจ oldsession
3. ลอง unauthwebrecoveryendpoint

**Expected Results:**

- กู้ Admin และ audit ได้ตามเครื่องที่มีสิทธิ์
- sessions เก่า revoke
- ไม่มี publicunauthpasswordrecovery

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-082 — DB busy/maintenance readiness/cleanup jobs

**Priority:** P0 · **Role:** ผู้ติดตั้ง · **Method:** Integration  
**Trace:** FR-39, FR-18, FR-38 · **Acceptance:** AT-14, AT-25, AT-28  
**Preconditions / Test Data:** test SQL Server lock และ readinessstoragefail จำลอง

**ขั้นตอน:**

1. ถือ SQL Server update lock เกิน DB_LOCK_TIMEOUT_MS และส่ง write
2. ปล่อย lock/retry ด้วย idempotencykey
3. จำลอง dataunwritable และตรวจ health/log

**Expected Results:**

- lock timeout/deadlock retries exhausted503/Retry-After ไม่มี partialcommit
- retry ไม่เพิ่ม record ซ้ำ
- readinessfail อย่างปลอดภัย/logrequestId และไม่มี secret

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ


## L. Performance

### TC-083 — Load test และ update latency

**Priority:** P1 · **Role:** ผู้พัฒนา · **Method:** Performance  
**Trace:** FR-26 · **Acceptance:** AT-27  
**Preconditions / Test Data:** 30users/6teams/20projects/10000tasks/20000comments;15activesessions;≥2logicalCPU/4GB/SSD หรือบันทึกสเปกจริง

**ขั้นตอน:**

1. warmup แล้ว run10minutes read/write70/30
2. วัด readp95/writep95/errors และ visiblepollupdate
3. บันทึก OS/runtime/version/spec/sample/knownvalidationconflicts

**Expected Results:**

- readp95≤2s/writep95≤3s;unexpectederror<1%
- pollupdate≤10s เมื่อ onlinevisible
- แยกผล actualfiletransfer และ deliberatevalidation ตาม SRS;fail ไม่อ้างผ่าน

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-084 — Cold startup/CSV memory/board concurrency stress

**Priority:** P1 · **Role:** ผู้พัฒนา · **Method:** Performance  
**Trace:** FR-21, FR-34, FR-39 · **Acceptance:** AT-27, AT-17, AT-28  
**Preconditions / Test Data:** performancefixture;reportexportdataset อยู่ใต้ cap

**ขั้นตอน:**

1. จับ coldstart และ memorybaseline
2. concurrentboardmove/poll/export/upload ภายใต้ quota
3. วัด memory/DBlocks/ordering แล้ว stop/restart

**Expected Results:**

- ไม่มี task หาย/order ซ้ำหรือ memory สะสมจาก bufferfiles
- 503/conflict ถูกจัดการและไม่ halfstate
- startup/CSV ผล record แม้ไม่มีเกณฑ์วินาทีที่ SRS กำหนดเฉพาะ

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

## M. Monday-style addendum (T-078)

### TC-085 — Job title CRUD/assign/disable ไม่เปลี่ยนสิทธิ์

**Priority:** P0 · **Role:** Admin · **Method:** UI + Integration
**Trace:** FR-41, BR-19, BR-20, BR-21 · **Acceptance:** AT-31
**Preconditions / Test Data:** Admin A, M1 Editor P1, ตำแหน่งตั้งต้น

**ขั้นตอน:**

1. สร้าง/เปลี่ยนชื่อ/ปิดตำแหน่งและพยายามลบตำแหน่งที่ถูกอ้าง
2. ตั้ง M1 เป็น PM แล้วเรียก endpoint ที่ต้องใช้ P-key
3. เปลี่ยน M1 เป็น Dev แล้วเรียกซ้ำ

**Expected Results:**

- ชื่อซ้ำ/ลบที่ถูกอ้างถูกปฏิเสธ
- สิทธิ์ M1 เหมือนเดิมทุกครั้ง (ไม่ได้ P-key จากตำแหน่ง)
- admin audit บันทึกการเปลี่ยน

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-086 — Job title ป้าย/filter/report/CSV

**Priority:** P1 · **Role:** Lead · **Method:** UI + Integration
**Trace:** FR-41, BR-16 · **Acceptance:** AT-31
**Preconditions / Test Data:** ผู้ใช้หลายตำแหน่งในโปรเจกต์ที่ L1 เข้าถึงและไม่เข้าถึง

**ขั้นตอน:**

1. ดูป้ายใน picker/members/workload/report
2. กรองงานและสมาชิกตามตำแหน่ง
3. Export CSV

**Expected Results:**

- ป้ายและตัวกรองถูก
- CSV มีคอลัมน์ตำแหน่งและ formula neutralization เดิม
- ไม่เห็นข้อมูลนอกสิทธิ์

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-087 — P-key ทีละข้อให้ทำได้เฉพาะข้อนั้น

**Priority:** P0 · **Role:** Admin / Manager · **Method:** Integration
**Trace:** FR-42, FR-42A, BR-21 · **Acceptance:** AT-32
**Preconditions / Test Data:** SA เป็น manager ใน P1 ไม่ใช่ใน P2

**ขั้นตอน:**

1. ติ๊กทีละ P-01–P-07 แล้วเรียกทุก endpoint ที่เกี่ยวข้องใน P1 และ P2
2. ติ๊ก P-08–P-10 แล้วสร้างโปรเจกต์/ดู workload/report ทีม
3. ใช้ preset PM/SM กับ SA และเทียบกับ PM

**Expected Results:**

- ทำได้เฉพาะข้อที่ติ๊กและเฉพาะโปรเจกต์ที่เป็น manager
- P2 ถูกปฏิเสธ 403/404 ตาม policy
- SA preset ทำได้เท่า PM preset; PM ไม่ติ๊กทำไม่ได้

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-088 — เอา permission ออกมีผลทันทีและ demote manager

**Priority:** P0 · **Role:** Admin · **Method:** Integration
**Trace:** FR-42A, BR-22 · **Acceptance:** AT-32
**Preconditions / Test Data:** U เป็น manager ในสองโปรเจกต์ มี P-01, P-04

**ขั้นตอน:**

1. เปิด session ของ U ค้างไว้
2. Admin เอา P-04 ออกแล้ว U ลองลบงานผู้อื่น
3. เอา P-01 ออก (ไม่เหลือ P-01–P-07)
4. จำลอง failure ระหว่าง demote

**Expected Results:**

- request ถัดไปถูกปฏิเสธโดยไม่ต้อง login ใหม่
- manager→editor ทุกโปรเจกต์ใน transaction เดียว พร้อม audit และ view revision
- failure rollback ทั้งหมด ไม่เหลือสถานะครึ่งเดียว

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-089 — กันยกระดับสิทธิ์และกติกาแต่งตั้ง manager

**Priority:** P0 · **Role:** Member / Manager / Admin · **Method:** Integration
**Trace:** FR-42, BR-23 · **Acceptance:** AT-32, AT-30
**Preconditions / Test Data:** Manager มี P-03, Member ทั่วไป, Admin

**ขั้นตอน:**

1. non-Admin เรียก PUT permissions ของตนและผู้อื่น
2. Admin แก้ permission ของตนเอง
3. ผู้มี P-03 ตั้ง manager
4. ตั้ง manager ให้ผู้ไม่มี P-01–P-07
5. ส่ง key ที่ไม่รู้จัก

**Expected Results:**

- non-Admin/self 403
- P-03 ตั้งได้แค่ Editor/Viewer
- ไม่มี key 422; unknown key ถูกปฏิเสธ
- ไม่มีการเปลี่ยนข้อมูล

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-090 — Admin center + Permission matrix bulk/preset/conflict

**Priority:** P1 · **Role:** Admin · **Method:** UI + Integration
**Trace:** FR-43 · **Acceptance:** AT-33
**Preconditions / Test Data:** สมาชิกหลายทีม/ตำแหน่ง

**ขั้นตอน:**

1. กรองตามทีม/ตำแหน่ง เลือกหลายคนแล้วใช้ preset
2. ตรวจสรุปก่อนยืนยัน
3. อีกแท็บแก้ผู้ใช้เดียวกันก่อนบันทึก
4. ผู้ใช้ทั่วไปเปิด Settings

**Expected Results:**

- สรุปตรงกับที่จะเปลี่ยน
- stale แจ้ง 409 รายผู้ใช้ ไม่ทับเงียบ
- matrix หลัง reload ตรงกับ server
- ผู้ใช้ทั่วไปเห็นสิทธิ์ตนอ่านอย่างเดียว

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-091 — My overview ตัวเลขตรง My work และ grouped table

**Priority:** P1 · **Role:** Member · **Method:** UI + Integration
**Trace:** FR-44, FR-45 · **Acceptance:** AT-34
**Preconditions / Test Data:** งานหลายสถานะ/วัน/โปรเจกต์ รวมโปรเจกต์ที่ถูกถอนสิทธิ์

**ขั้นตอน:**

1. เปิด Home เทียบ widget กับ My work/รายงาน
2. คลิก widget
3. ข้ามเที่ยงคืน Bangkok
4. สลับ “ได้รับมอบหมาย/ฉันสร้าง” และเปลี่ยนสถานะ inline

**Expected Results:**

- ตัวเลขตรงกันและไม่รวมโปรเจกต์ที่หมดสิทธิ์
- ไป My work พร้อมตัวกรองตรงกัน
- กลุ่ม Overdue/Today/… ถูกตามวัน Bangkok

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-092 — Docs CRUD/version conflict/Viewer/trash

**Priority:** P0 · **Role:** Editor / Viewer / Manager · **Method:** UI + Integration
**Trace:** FR-48, NFR-03 · **Acceptance:** AT-35
**Preconditions / Test Data:** P1 มี Editor E1/E2, Viewer V, Manager มี P-05

**ขั้นตอน:**

1. E1 สร้าง doc ที่ boundary ชื่อ 200/เนื้อหา 200,000
2. E1 และ E2 แก้พร้อมกัน
3. V ลองแก้
4. ลบ/คืน doc ของผู้อื่นด้วยและไม่ด้วย P-05
5. ทดสอบ 29/30/31 วัน

**Expected Results:**

- เกิน boundary ถูกปฏิเสธ
- คนที่สอง 409 ไม่ทับ และมีประวัติ version
- V อ่านอย่างเดียว
- ลบ/คืนตามสิทธิ์และกำหนด 30 วัน

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-093 — Docs sanitize XSS ฝั่ง server

**Priority:** P0 · **Role:** Editor · **Method:** Unit + Integration
**Trace:** FR-48, NFR-02 · **Acceptance:** AT-35, AT-30
**Preconditions / Test Data:** XSS corpus (script, on*, javascript:, data URI, svg, iframe, style, encoded)

**ขั้นตอน:**

1. บันทึกผ่าน API โดยตรงข้าม UI
2. อ่านกลับและ render ใน browser

**Expected Results:**

- payload อันตรายถูกตัดฝั่ง server
- tag ใน allowlist คงอยู่
- ไม่มี script ทำงานและ CSP ไม่มี violation

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-094 — Project Files รวม/อัปโหลด/preview/สิทธิ์/quota

**Priority:** P1 · **Role:** Editor / Viewer · **Method:** UI + Integration
**Trace:** FR-49, FR-28 · **Acceptance:** AT-36
**Preconditions / Test Data:** ไฟล์ระดับโปรเจกต์และจากหลายงาน รวมงานที่ถูกลบ

**ขั้นตอน:**

1. เปิดแท็บ Files ค้นหา/กรอง
2. อัปโหลดระดับโปรเจกต์ที่ quota boundary
3. preview รูป/PDF และไฟล์ชนิดอื่น
4. ลบ/คืนไฟล์ผู้อื่นด้วยและไม่ด้วย P-06

**Expected Results:**

- แสดงเฉพาะไฟล์ที่เข้าถึงพร้อมงานต้นทาง
- quota/ตรวจชนิดตามเดิม
- preview ปลอดภัย
- ลบ/คืนตามสิทธิ์

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-095 — Workload และ Project overview ตัวเลข/เกณฑ์/สิทธิ์

**Priority:** P1 · **Role:** Lead / Manager · **Method:** UI + Integration
**Trace:** FR-50, FR-51, BR-16 · **Acceptance:** AT-37
**Preconditions / Test Data:** งานข้ามสัปดาห์, start-only, due-only, no date, done; threshold 10

**ขั้นตอน:**

1. ดู workload โปรเจกต์และทีม (มี/ไม่มี P-09)
2. ตั้ง threshold แล้วตรวจไฮไลต์ที่ 10/11
3. ดู Overview (มี/ไม่มี P-07)

**Expected Results:**

- จำนวนต่อคน/สัปดาห์ถูกตาม §9.9
- ไฮไลต์เมื่อ > threshold
- Overview ตรงข้อมูล; ไม่มีสิทธิ์ถูกปฏิเสธ/ไม่รั่ว

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-096 — Main table inline/batch/drag/sticky/resize

**Priority:** P1 · **Role:** Editor · **Method:** UI + Integration
**Trace:** FR-52, FR-45 · **Acceptance:** AT-38
**Preconditions / Test Data:** กลุ่มหลายกลุ่ม งาน >50 แถว

**ขั้นตอน:**

1. inline edit ชื่อ/วันที่/priority/ผู้รับ และเพิ่มงานท้ายกลุ่มด้วย Enter
2. เลือกหลายแถวที่มีงานหนึ่ง stale และหนึ่งไม่มีสิทธิ์ แล้ว batch
3. ลากแถวย้ายกลุ่ม
4. scroll แนวนอน/ตั้ง column width แล้ว reload

**Expected Results:**

- batch คืนผลรายข้อ 200/409/403 ไม่ทำบางส่วนเงียบ
- drag persist หลัง reload
- sticky ทำงานและ width จำต่อผู้ใช้
- มีทางเลือกคีย์บอร์ด

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-097 — Task side panel แท็บ/@mention/Esc/deep link

**Priority:** P1 · **Role:** Editor · **Method:** UI + Integration
**Trace:** FR-53 · **Acceptance:** AT-38
**Preconditions / Test Data:** P1 มีสมาชิกและผู้ที่ไม่มีสิทธิ์

**ขั้นตอน:**

1. เปิด panel ผ่านแถวและ deep link
2. พิมพ์ @ ใน Updates
3. สลับแท็บ Files/Activity/Details แล้วกด Esc
4. เปิด deep link ด้วยผู้ไม่มีสิทธิ์

**Expected Results:**

- @mention แนะนำเฉพาะผู้เข้าถึง และแจ้งเตือนตามเดิม
- Esc ปิดและคืน focus
- ผู้ไม่มีสิทธิ์ไม่เห็นข้อมูลงาน

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-098 — UX/motion reduced motion/toggle/360px/keyboard

**Priority:** P1 · **Role:** Member · **Method:** UI
**Trace:** NFR-09, NFR-05, NFR-06 · **Acceptance:** AT-39
**Preconditions / Test Data:** mock ที่เจ้าของรีวิวแล้วจาก T-079

**ขั้นตอน:**

1. เทียบหน้าหลักกับ mock ที่ 360/768/1440px
2. เปิด prefers-reduced-motion และ toggle Reduce animations/ปิด confetti
3. ทำงาน Done ติดกันภายใน 2 วินาที
4. ใช้ N, /, Esc และบันทึก performance trace

**Expected Results:**

- ไม่มี horizontal scroll ของเอกสาร
- reduced motion ปิด motion ที่ไม่จำเป็น
- confetti ≤1 ครั้ง/2 วินาที
- action ไม่ถูกบล็อกและ trace ~60fps

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

### TC-099 — Favorites ส่วนตัวและถอนสิทธิ์

**Priority:** P1 · **Role:** Member · **Method:** UI + Integration
**Trace:** FR-47 · **Acceptance:** AT-40
**Preconditions / Test Data:** M1/M2 เข้าถึง P1

**ขั้นตอน:**

1. M1 ติดดาว P1
2. M2 เปิด sidebar
3. ถอนสิทธิ์ M1 จาก P1

**Expected Results:**

- P1 อยู่บนสุดของ M1 เท่านั้น
- ถอนสิทธิ์แล้ว favorite หายและไม่เผยชื่อโปรเจกต์

**Actual / Evidence / Defect:** รอทดสอบ — บันทึกผลใน Test Run Register พร้อม Build/Role/วันที่; ลบ cookie/token/password จากภาพหรือ log ก่อนแนบ

## Traceability — Acceptance Tests

การจับคู่ครบเป็น coverage ของแผน ไม่ได้ยืนยันว่าทุก subscenario ใน AT ผ่านจนตรวจ steps/results จริง

| AT | Cases | Status |
|---|---|---|
| AT-01 | TC-001, TC-002 | NOT_RUN |
| AT-02 | TC-003, TC-004, TC-005, TC-006, TC-010, TC-011 | NOT_RUN |
| AT-03 | TC-007, TC-008, TC-009, TC-021 | NOT_RUN |
| AT-04 | TC-012 | NOT_RUN |
| AT-05 | TC-014, TC-056, TC-066 | NOT_RUN |
| AT-06 | TC-013, TC-015, TC-020, TC-023 | NOT_RUN |
| AT-07 | TC-015, TC-016, TC-017, TC-023 | NOT_RUN |
| AT-08 | TC-018, TC-019, TC-020, TC-021, TC-063 | NOT_RUN |
| AT-09 | TC-024, TC-025, TC-026 | NOT_RUN |
| AT-10 | TC-027, TC-028, TC-038 | NOT_RUN |
| AT-11 | TC-029, TC-030, TC-032 | NOT_RUN |
| AT-12 | TC-031, TC-032, TC-033, TC-079 | NOT_RUN |
| AT-13 | TC-034, TC-059, TC-079 | NOT_RUN |
| AT-14 | TC-033, TC-035, TC-082 | NOT_RUN |
| AT-15 | TC-026, TC-046, TC-047, TC-048 | NOT_RUN |
| AT-16 | TC-036, TC-037, TC-038 | NOT_RUN |
| AT-17 | TC-039, TC-040, TC-041, TC-044, TC-084 | NOT_RUN |
| AT-18 | TC-042, TC-043, TC-045, TC-073, TC-074 | NOT_RUN |
| AT-19 | TC-045, TC-048, TC-049 | NOT_RUN |
| AT-20 | TC-050, TC-072 | NOT_RUN |
| AT-21 | TC-051, TC-052, TC-069 | NOT_RUN |
| AT-22 | TC-053, TC-054, TC-055, TC-056, TC-057, TC-058, TC-059, TC-079 | NOT_RUN |
| AT-23 | TC-060, TC-061, TC-062, TC-063 | NOT_RUN |
| AT-24 | TC-028, TC-064, TC-065, TC-066, TC-067 | NOT_RUN |
| AT-25 | TC-075, TC-076, TC-077, TC-078, TC-082 | NOT_RUN |
| AT-26 | TC-071, TC-072, TC-073, TC-074 | NOT_RUN |
| AT-27 | TC-083, TC-084 | NOT_RUN |
| AT-28 | TC-052, TC-058, TC-075, TC-078, TC-080, TC-081, TC-082, TC-084 | NOT_RUN |
| AT-29 | TC-022 | NOT_RUN |
| AT-30 | TC-056, TC-068, TC-069, TC-070, TC-081 | NOT_RUN |
| AT-31 | TC-085, TC-086 | NOT_RUN |
| AT-32 | TC-087, TC-088, TC-089 | NOT_RUN |
| AT-33 | TC-090 | NOT_RUN |
| AT-34 | TC-091 | NOT_RUN |
| AT-35 | TC-092, TC-093 | NOT_RUN |
| AT-36 | TC-094 | NOT_RUN |
| AT-37 | TC-095 | NOT_RUN |
| AT-38 | TC-096, TC-097 | NOT_RUN |
| AT-39 | TC-098 | NOT_RUN |
| AT-40 | TC-099 | NOT_RUN |

## Traceability — Functional Requirements

| FR | Cases |
|---|---|
| FR-01 | TC-001, TC-002 |
| FR-02 | TC-003, TC-004, TC-005, TC-006, TC-010, TC-011 |
| FR-03 | TC-007, TC-012, TC-021 |
| FR-04 | TC-004, TC-007, TC-008, TC-009, TC-081 |
| FR-05 | TC-014, TC-015, TC-017, TC-018, TC-056, TC-066, TC-068, TC-069, TC-070 |
| FR-06 | TC-013, TC-023 |
| FR-07 | TC-013, TC-020 |
| FR-08 | TC-013, TC-015 |
| FR-09 | TC-015, TC-016, TC-022, TC-023 |
| FR-10 | TC-014, TC-016, TC-017, TC-019, TC-023 |
| FR-11 | TC-018, TC-019, TC-020, TC-021, TC-063 |
| FR-12 | TC-024, TC-025, TC-026 |
| FR-13 | TC-019, TC-021, TC-024, TC-025, TC-026 |
| FR-14 | TC-024, TC-025, TC-027, TC-028 |
| FR-15 | TC-027, TC-028, TC-038 |
| FR-16 | TC-029, TC-030, TC-031, TC-032, TC-033, TC-079 |
| FR-17 | TC-034, TC-059, TC-079 |
| FR-18 | TC-031, TC-033, TC-035, TC-040, TC-041, TC-044, TC-050, TC-082 |
| FR-19 | TC-026, TC-046, TC-047 |
| FR-20 | TC-042, TC-045, TC-046, TC-048, TC-066 |
| FR-21 | TC-036, TC-038, TC-039, TC-040, TC-041, TC-044, TC-045, TC-084 |
| FR-22 | TC-036, TC-037, TC-040, TC-044 |
| FR-23 | TC-042, TC-043, TC-045, TC-073 |
| FR-24 | TC-048, TC-049 |
| FR-25 | TC-047, TC-049 |
| FR-26 | TC-050, TC-072, TC-083 |
| FR-27 | TC-051, TC-069 |
| FR-28 | TC-053, TC-054, TC-055, TC-056, TC-057, TC-058, TC-059, TC-079 |
| FR-29 | TC-052 |
| FR-30 | TC-060, TC-061, TC-063 |
| FR-31 | TC-062, TC-063 |
| FR-32 | TC-064, TC-065 |
| FR-33 | TC-028, TC-064, TC-065 |
| FR-34 | TC-066, TC-067, TC-084 |
| FR-35 | TC-043, TC-071, TC-073, TC-074 |
| FR-36 | TC-071, TC-072, TC-074 |
| FR-37 | TC-075, TC-080 |
| FR-38 | TC-076, TC-077, TC-082 |
| FR-39 | TC-052, TC-058, TC-069, TC-070, TC-075, TC-080, TC-081, TC-082, TC-084 |
| FR-40 | TC-077, TC-078, TC-080, TC-081 |
| FR-41 | TC-085, TC-086 |
| FR-42 | TC-087, TC-089 |
| FR-42A | TC-087, TC-088 |
| FR-43 | TC-090 |
| FR-44 | TC-091 |
| FR-45 | TC-091, TC-096 |
| FR-47 | TC-099 |
| FR-48 | TC-092, TC-093 |
| FR-49 | TC-094 |
| FR-50 | TC-095 |
| FR-51 | TC-095 |
| FR-52 | TC-096 |
| FR-53 | TC-097 |

## UAT Journeys ของเจ้าของระบบ

- [ ] Admin ตั้งองค์กร/ทีม/บัญชี → ผู้ใช้เปลี่ยน temp password → Lead สร้าง project/แชร์สมาชิก → Member เห็นเฉพาะงานที่มีสิทธิ์
- [ ] สร้างงานและมอบหมาย → ผู้รับเห็น notification → ใช้ Kanban → checklist/comment/file → done → report/CSV ตรง
- [ ] แชร์ project ข้ามทีมเป็น Editor/Viewer → ทดสอบสิทธิ์ → ถอน access → ตรวจหน้าเดิม/filelink/notification
- [ ] สองคนแก้/ลากงานเดียวกัน → conflict ชัดไม่สูญข้อมูล → reload/retry ตามเจตนา
- [ ] ผู้ติดตั้ง backup → cleanrestore → permissions/files/checksums ตรง → ผู้ใช้ login ใหม่และทำงานต่อ

- [ ] (addendum) Admin ติ๊ก preset PM/SM ให้ SA → SA จัดการโปรเจกต์ที่เป็น manager → Admin เอาสิทธิ์ออก → SA ถูกลดเป็น Editor ทันที; ทุกคนใช้ My overview/Docs/Files/Main table ตามสิทธิ์ (รวมใน T-091 UAT)

## Change Log

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | สร้าง Test Cases จาก Task/SRS; ทุกกรณี NOT_RUN; ไม่แก้ sourceTask หรืออนุมัติ baseline แทนผู้ใช้ |
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

## SQL Server 2022 technical test variants

กรณีเหล่านี้เป็น variants ของ cases/AT เดิม ไม่ใช่ผลว่าทดสอบแล้ว:

- AT-12/14/17: ใช้ mssql กับ SQLServer2022 จริง ตรวจ XACT_ABORT/rollback/UPDLOCK/HOLDLOCK/temporaryrank และ deadlock retry
- AT-22: DBmetadata/tempfiles/quotareservation และ30 วัน filetrashrestore ตรง SRS1.1
- AT-25: BACKUPDATABASECOPY_ONLY/CHECKSUM เป็น.bak+uploads snapshot และ actualRESTORE ใน isolatedDB/sessionrevoke
- AT-28: SQLhost/port/encryption/cert/pool/runtimeDBlogin/migrationlogin/backupaccountpermissions;Edition/build ผลจริง
- AT-27: เก็บ SQLServerbuild/DBsettings/poolsize/queryplan/loadmetrics ไม่ใช้ผล SQLite เดิมแทน

## SQLite local test profile

ใช้ Node22/SQLite สำหรับกรณี local ที่ทำได้ แต่ทุก run ต้องระบุ provider/version/schema/driver และ environment; SQL2022-specific lock/deadlock/connection-loss/.bak/RESTORE/Windows variants ยังคง NOT_RUN/BLOCKED จนรันบน environment ที่ถูกต้อง การทดสอบ SQLite ไม่เปลี่ยนทั้ง case/AT เป็น PASS หากยังมี required variants ค้าง ไม่ใช้ NOT_APPLICABLE เพื่อเลี่ยงเกณฑ์ปลายทาง

## Required variants หลังยืนยัน readiness proposals (ทั้งหมด NOT_RUN)

| Cases / AT | Steps และ expected ที่เพิ่ม |
|---|---|
| TC-022/034; AT-13/29 | Archived project: Editor creator DELETE ถูกปฏิเสธ; Admin/owner Lead DELETE และ restore งานสำเร็จตาม cutoff/version; restored task ยัง read-only; comments/files/subtasks ยังห้าม write |
| TC-019/021/028/034; AT-04/08/10/13 | Demote Admin, reopen done, restore non-done หลัง assignee inactive/Viewer/no-write: effective rights recompute/assignee=null พร้อม audit; คนที่ยังมี Lead/Editor คง assignment; done history คง |
| TC-023; AT-06/07/29 | Unarchive project ใน archived team ถูกปฏิเสธ; เปิด team ก่อนแล้วทำได้; create/unarchive แข่งกับ archive team ไม่ทำให้ parent invariant ผิด |
| TC-034/059/079; AT-13/22 | controlled UTC clock ที่ cutoff-1ms/cutoff/cutoff+1ms: restore ได้เฉพาะก่อน cutoff; purge ได้ตั้งแต่ cutoff; restore-vs-purge ไม่มี half state; failed bytes cleanup คง tracking/quota |
| TC-029/030/032; AT-11/12 | เปลี่ยน due ของ monthly และ none/weekly↔monthly ตรวจ reset/preserve/clear anchor ตาม RD-06; generation ตามปกติกลับวัน anchor; successor เดิมไม่เปลี่ยน; checklist ใหม่ done=false |
| TC-017/018/027/033/040/057/058/076/082; AT-08/10/12/17/22/25/30 | เพิ่ม deterministic race barriers สำหรับ revoke-vs-write, checklist-vs-complete, quota-finalize-vs-freeze; SQL2022 variants จำลอง lock timeout/deadlock/connection loss/query timeout และ unknown commit; ตรวจ authoritative key/state/rollback/no duplicates; ไม่เปิด fault injection ใน production |
| TC-006/010/011/050/068/071/072; AT-02/20/26/30 | ตรวจ HTTP browser/proxy cache/back navigation และ logout/expiry/CSRF rotation ข้ามแท็บ; draft คงเมื่อ refresh แต่ sensitive data ต้องถูกล้างเมื่อหมดสิทธิ์; polling รวม response latency ยังอยู่ใน approved target |
| TC-075/078/080/081; AT-25/28 | รันกับ source candidate/build/schema ที่ระบุ; Windows/SQL2022/UAT required ยัง NOT_RUN/BLOCKED ไม่อนุญาต final task sign-off; migration/reset/backup accounts ใช้สิทธิ์ที่กำหนดและไม่มี secrets ใน evidence |

84 case IDs เดิมคงอยู่; variants เป็น required subscenarios ไม่ใช่ cases ใหม่หรือผล PASS จากการยืนยัน; T-003/T-004 สร้าง contracts/executable manifest ตาม acceptance แล้ว ดู tests/test-manifest.json; variants ทั้งหมดยัง NOT_RUN

## T-003 contract-only evidence

TC-025/035/044/048/068/069 มีshape/purevalidation checksที่เกี่ยวข้องในtests/contracts/contract.test.mjsและcontracts/test-manifest.json; ไม่ใช่การรันstepsทั้งหมดของTC/AT ผลทั้ง84casesและ30ATในregisterคงNOT_RUN จนมีHTTP/UI/database evidenceตามrequiredvariants

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

## T-078 addendum test design — 2026-10-08

TC-085–TC-099 และ AT-31–AT-40 ออกแบบจาก addendum ที่อนุมัติแล้ว; ยังไม่มี implementation จึงเป็น NOT_RUN ทั้งหมด. Evidence ของการรวมเอกสาร: TeamFlow_T078_Addendum_Merge_Report.md
