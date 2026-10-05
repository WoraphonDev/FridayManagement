# TeamFlow — Test Cases หลังพัฒนา v1.1

**วันที่:** 5 ตุลาคม 2026 · **สถานะ:** ชุดทดสอบที่ออกแบบไว้ ยังไม่รัน  
**จำนวน:** 84 Test Cases · 12 หมวด · ครอบคลุม FR-01–FR-40 และ AT-01–AT-30  
**ใช้คู่กับ:** `TeamFlow_Test_Plan_v1.0.md` และต้นทาง Requirements/SRS/Task v1.0

เอกสารนี้มีทั้งกรณีให้ผู้ใช้ทดสอบผ่านหน้าเว็บและกรณีที่ต้องให้ผู้พัฒนาหรือผู้ติดตั้งช่วยตรวจ API/DB/เครื่อง ไม่อ้างว่าผู้ใช้ต้องเขียนหรือรัน Unit Tests เอง การมี testcase ไม่เท่ากับมี testcode และไม่ได้ยืนยันว่าระบบผ่านแล้ว

P0=critical ก่อนใช้ข้อมูลจริง; P1=ต้องผ่านก่อน fullrelease. Kind ระบุวิธีตรวจ: UI, Unit, Integration, Operations หรือ Performance. คำว่า Unit+Integration เป็นแผนสองระดับ ไม่ใช่ unit test ที่เขียนแล้ว


## บันทึกการยืนยัน — Baseline 1.1

เจ้าของระบบยืนยันในบทสนทนานี้: “ผม ok ตามที่เสนอ และ sql server 2022” กติกา D-01–D-11 และคำตอบ R-01–R-04 ที่เสนอถือเป็น baseline แล้ว; ฐานข้อมูลใช้ **Microsoft SQL Server 2022** แทนข้อเสนอเดิม

- R-01: ผู้ใช้กดเสร็จเองหลัง Checklist ครบ ไม่ auto-done
- R-02: Archive ระดับโปรเจกต์; งานใช้ soft delete/restore 30 วัน ไม่มี task archive แยก
- R-03: ไฟล์แนบที่ลบเก็บในถังขยะ 30 วัน ยังนับ quota จน purge; uploader/owner Lead/Admin คืนไฟล์ได้ในช่วงนี้หากยังมี write access และโปรเจกต์ active
- R-04: คง recurrence tombstone หลัง purge เพื่อกันสร้างรอบซ้ำ; technical design ใช้ source/generated ID snapshots ที่ไม่ผูก FK ถึง task ที่อาจถูกลบ
- Stack: React + TypeScript + Vite, Node.js 24 LTS + Express 5 + `mssql`/Tedious, SQL Server 2022; เครื่องมือหน้าจอ/ตรวจข้อมูล/ทดสอบตาม SRS §3.4
- Edition ของ SQL Server, patch/runtime/package versions และสิทธิ์ติดตั้งยังต้องตรวจตอนติดตั้ง ไม่มีข้อสรุปว่าเป็น Express/Developer หรือพร้อม production แล้ว

การยืนยันนี้เป็น baseline สำหรับพัฒนา ไม่ใช่ผลว่าพัฒนาหรือทดสอบแล้ว งาน coding/test ยัง TODO/NOT_RUN ยกเว้น T-001/T-002 ซึ่งปิดได้ด้วยการยืนยันและแก้เอกสารนี้ **ชื่อไฟล์คงเดิมเพื่อรักษา references; ให้ดู version 1.1 ในส่วนหัวเป็นรุ่นเนื้อหาปัจจุบัน**


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
| TC-022 | P0 | Archive project อ่านได้แต่ห้ามทุก mutation | UI + Integration | NOT_RUN | — | — |
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
| TC-049 | P1 | Calendar due-only และ no-due | UI + Integration | NOT_RUN | — | — |
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

### TC-022 — Archive project อ่านได้แต่ห้ามทุก mutation

**Priority:** P0 · **Role:** L1/M1 · **Method:** UI + Integration  
**Trace:** FR-09 · **Acceptance:** AT-29  
**Preconditions / Test Data:** P1 มี task/recurrence/comment/file/subtask

**ขั้นตอน:**

1. L1archiveP1
2. M1 อ่านและลองแก้/move/comment/upload/subtask/complete
3. L1unarchive ด้วย version ล่าสุด

**Expected Results:**

- อ่านตามสิทธิ์ได้;writes ทั้งหมดปฏิเสธไม่มี successor
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

### TC-049 — Calendar due-only และ no-due

**Priority:** P1 · **Role:** M1 · **Method:** UI + Integration  
**Trace:** FR-24, FR-25 · **Acceptance:** AT-19  
**Preconditions / Test Data:** taskdueOct31/Nov1/null และมี start หลายวัน

**ขั้นตอน:**

1. เลื่อนเดือน Oct/Nov
2. ใช้ filter เดียวกับ tasklist
3. คลิก task และดู no-duelist

**Expected Results:**

- task วางวัน due เท่านั้นไม่ durationbar
- list/calendar ผลเทียบตรง
- null อยู่แยกไม่กลายเป็นวันนี้;เปิด detail ถูก

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

## UAT Journeys ของเจ้าของระบบ

- [ ] Admin ตั้งองค์กร/ทีม/บัญชี → ผู้ใช้เปลี่ยน temp password → Lead สร้าง project/แชร์สมาชิก → Member เห็นเฉพาะงานที่มีสิทธิ์
- [ ] สร้างงานและมอบหมาย → ผู้รับเห็น notification → ใช้ Kanban → checklist/comment/file → done → report/CSV ตรง
- [ ] แชร์ project ข้ามทีมเป็น Editor/Viewer → ทดสอบสิทธิ์ → ถอน access → ตรวจหน้าเดิม/filelink/notification
- [ ] สองคนแก้/ลากงานเดียวกัน → conflict ชัดไม่สูญข้อมูล → reload/retry ตามเจตนา
- [ ] ผู้ติดตั้ง backup → cleanrestore → permissions/files/checksums ตรง → ผู้ใช้ login ใหม่และทำงานต่อ

## Change Log

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | สร้าง Test Cases จาก Task/SRS; ทุกกรณี NOT_RUN; ไม่แก้ sourceTask หรืออนุมัติ baseline แทนผู้ใช้ |
| 1.1 | 2026-10-05 | เจ้าของระบบยืนยันกติกา; R-01–R-04 resolved; SQL Server2022/mssql; filetrash/restore30วัน; coding/testsยังไม่ผ่าน |

## SQL Server 2022 technical test variants

กรณีเหล่านี้เป็น variants ของ cases/AT เดิม ไม่ใช่ผลว่าทดสอบแล้ว:

- AT-12/14/17: ใช้ mssql กับ SQLServer2022 จริง ตรวจ XACT_ABORT/rollback/UPDLOCK/HOLDLOCK/temporaryrank และ deadlock retry
- AT-22: DBmetadata/tempfiles/quotareservation และ30 วัน filetrashrestore ตรง SRS1.1
- AT-25: BACKUPDATABASECOPY_ONLY/CHECKSUM เป็น.bak+uploads snapshot และ actualRESTORE ใน isolatedDB/sessionrevoke
- AT-28: SQLhost/port/encryption/cert/pool/runtimeDBlogin/migrationlogin/backupaccountpermissions;Edition/build ผลจริง
- AT-27: เก็บ SQLServerbuild/DBsettings/poolsize/queryplan/loadmetrics ไม่ใช้ผล SQLite เดิมแทน
