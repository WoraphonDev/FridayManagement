# TeamFlow — Task.md: แผนพัฒนาและตรวจความครบถ้วน

**Version:** 1.3 · **วันที่:** 5 ตุลาคม 2026  
**สถานะ:** แผนงานตาม Baseline 1.1 ที่ยืนยันแล้ว; coding/testing ยังไม่เสร็จ  
**จำนวน:** 77 งานหลัก · 13 ช่วงงาน · 40 FR · 8 NFR · 30 Acceptance Tests · 52 API routes  
**ต้นทาง:** `TeamFlow_Requirements_v1.0.md` และ `TeamFlow_SRS_v1.0.md` รุ่นปัจจุบันที่อ่านเมื่อ 5 ตุลาคม 2026


## บันทึกการยืนยัน — Baseline 1.1

เจ้าของระบบยืนยันในบทสนทนานี้: “ผม ok ตามที่เสนอ และ sql server 2022” กติกา D-01–D-11 และคำตอบ R-01–R-04 ที่เสนอถือเป็น baseline แล้ว; ฐานข้อมูลใช้ **Microsoft SQL Server 2022** แทนข้อเสนอเดิม

- R-01: ผู้ใช้กดเสร็จเองหลัง Checklist ครบ ไม่ auto-done
- R-02: Archive ระดับโปรเจกต์; งานใช้ soft delete/restore 30 วัน ไม่มี task archive แยก
- R-03: ไฟล์แนบที่ลบเก็บในถังขยะ 30 วัน ยังนับ quota จน purge; uploader/owner Lead/Admin คืนไฟล์ได้ในช่วงนี้หากยังมี write access และโปรเจกต์ active
- R-04: คง recurrence tombstone หลัง purge เพื่อกันสร้างรอบซ้ำ; technical design ใช้ source/generated ID snapshots ที่ไม่ผูก FK ถึง task ที่อาจถูกลบ
- Stack: React + TypeScript + Vite, Node.js 24 LTS + Express 5 + `mssql`/Tedious, SQL Server 2022; เครื่องมือหน้าจอ/ตรวจข้อมูล/ทดสอบตาม SRS §3.4
- Edition ของ SQL Server, patch/runtime/package versions และสิทธิ์ติดตั้งยังต้องตรวจตอนติดตั้ง ไม่มีข้อสรุปว่าเป็น Express/Developer หรือพร้อม production แล้ว

การยืนยันนี้เป็น baseline สำหรับพัฒนา ไม่ใช่ผลว่าพัฒนาหรือทดสอบแล้ว งาน coding/test ยัง TODO/NOT_RUN ยกเว้น T-001/T-002 ซึ่งปิดได้ด้วยการยืนยันและแก้เอกสารนี้ **ชื่อไฟล์คงเดิมเพื่อรักษา references; ให้ดู version 1.3 ในส่วนหัวเป็นรุ่นเนื้อหาปัจจุบัน**


## 1. ขอบเขตและกติกาการใช้

ใช้สำหรับ Web App ภายในองค์กรเดียว หลายทีม ประมาณ 30 คน มี Kanban ลากวาง ไม่มีอีเมล ไม่มี AI เน้นเครื่องมือไม่มีค่าสมาชิกบังคับ ผู้ใช้นำ source code ไป deploy บน Windows Server/domain เอง การแตกงานครั้งนี้เป็นเอกสารเท่านั้น ไม่ใช่คำสั่งเริ่มพัฒนาหรือเผยแพร่ระบบ

งานที่เขียนหรือทดลองไว้ก่อนสร้าง SRS **ไม่ถือว่าผ่าน Task ใดโดยอัตโนมัติ** ต้องเทียบ approved baseline และทดสอบใหม่ตามเกณฑ์ที่เกี่ยวข้อง

- Requirements คือเป้าหมายธุรกิจ; SRS คือพฤติกรรมที่ต้องทำ; Task.md คือรายการลงมือและวิธีตรวจ ไม่แก้ขอบเขตต้นทางโดยเงียบ ๆ
- Baseline 1.1/SQL Server 2022 ยืนยันแล้ว; T-001/T-002 เป็น DONE ด้านเอกสาร; dependency ของ coding/test ยังต้องทำตามจริง
- R-01–R-04 ปิดแล้วด้วย decision ข้างต้น; issue ใหม่ให้บันทึก changeimpact ไม่เปิด permissionflow ซ้ำสำหรับเรื่องที่ยืนยันแล้ว
- แยกงาน backend, frontend และ tests ให้ครบ ฟีเจอร์ไม่เสร็จเพียงเพราะหน้าจอแสดงได้หรือ API ทำงานเมื่อใช้ Admin เท่านั้น
- ลำดับ dependency เป็นข้อกำหนดก่อนเริ่ม ไม่ใช่คำสั่งให้สร้างงานเรียงทีละบรรทัดทุกงาน; งานอิสระทำพร้อมกันได้หลัง dependency ผ่าน
- ไม่มี timeline/ชั่วโมงที่ยืนยัน: stack ยืนยันแล้ว แต่ต้องตรวจความพร้อมของสภาพแวดล้อมและรายละเอียดงานก่อนประเมิน ไม่คำนวณความคืบหน้าเป็นเปอร์เซ็นต์จากจำนวน checkbox เพราะงานมีขนาดต่างกัน

### สถานะที่ใช้

| Status | ความหมาย |
|---|---|
| TODO | ยังไม่เริ่ม และ prerequisites ไม่ค้าง |
| BLOCKED | ติด decision/dependency/environment; ระบุสาเหตุและสิ่งที่ปลดได้ |
| IN_PROGRESS | มีการลงมือและระบุ owner |
| IN_REVIEW | implementation เสร็จ อยู่ระหว่างตรวจหลักฐาน/ผลทดสอบ |
| DONE | checklist + เกณฑ์รับงาน + หลักฐานที่เกี่ยวข้องผ่าน |
| DEFERRED | เจ้าของ scope ย้ายออกจากรุ่นนี้และแก้ Requirements/SRS แล้ว ไม่ใช้เพื่อซ่อนงานตกหล่น |

T-001/T-002 DONE ด้าน baseline;งานที่เหลือ TODO และ BLOCKED เฉพาะ dependency/environment ที่ยังไม่พร้อม ไม่ถือว่า coding/test ผ่านจากการยืนยัน scope

### Definition of Done ต่อ Task

- [ ] ขอบเขตใน checklist ครบตาม baseline และ API/permission/data contract ตรงกัน
- [ ] มีผลตรวจเฉพาะความเสี่ยงของงาน เช่นสิทธิ์ transaction concurrency หรือ interaction ไม่เพิ่ม tests ที่ไม่จำเป็น
- [ ] เรียกผ่านผู้ใช้ที่มี/ไม่มีสิทธิ์ได้ผลถูก ไม่ใช้ frontend hiding เป็น security
- [ ] loading/empty/error/offline/archived/dirty/conflict ที่เกี่ยวข้องมีทางจัดการ
- [ ] บันทึกไฟล์/commit/คำสั่งตรวจ/ผลทดสอบ และ known limitations โดยไม่ใส่ secret
- [ ] อัปเดต task register และ coverage ที่ได้รับผล ไม่เปลี่ยน DONE ให้กับงานทดสอบที่ยัง NOT_RUN

## 2. Decision Log — ประเด็นเดิมปิดแล้ว

| Issue | คำตอบที่ยืนยัน | Status |
|---|---|---|
| R-01 | Checklist ครบแล้วผู้ใช้กด done เอง ไม่ auto | RESOLVED |
| R-02 | Project archive; task soft delete/restore30 วัน ไม่มี taskarchive แยก | RESOLVED |
| R-03 | Attachmentsoftdelete30 วันและนับ quota จน purge;คืนผ่าน authorizedrestoreendpoint | RESOLVED |
| R-04 | Recurrencetombstone เป็น IDsnapshot ไม่มี FK ถึง task ที่ purge | RESOLVED |

SQL Server2022 ยืนยันแล้ว; Edition/build/connection details/service permissions เป็น deployment checklist; T-003 ยืนยัน API/DTO ที่ปรับและ T-005 ล็อก package versions

## 3. ลำดับและจุดตรวจผ่าน

| Gate | สิ่งที่ต้องผ่านก่อนขยับ | หลักฐาน |
|---|---|---|
| G0 เริ่มพัฒนา | T-001–T-004 | baseline/decision/API/test manifest |
| G1 เปิดข้อมูลให้สมาชิก | foundation + auth + ACL/teams/projects | negative permission tests, session tests; ห้ามใช้ mock auth เป็นระบบจริง |
| G2 ปิดงานและใช้ Kanban | task lifecycle/recurrence/atomic move | AT-09–AT-18 โดยเฉพาะ duplicate/409/rollback |
| G3 ใช้ร่วมทีม | files/comments/notifications/refresh/reports/PWA | AT-19–AT-24/AT-26 + scope/cache evidence |
| G4 ส่ง source | QA/security/backup/performance/UAT/packaging | FR/NFR/BR/AT coverage, fresh unzip, known blockers |
| G5 พร้อมใช้ Server จริง | Windows fresh install/HTTPS/service/backup + ผู้ใช้ UAT | ผลบน environment จริง; ถ้าไม่มีให้ระบุยังไม่ผ่าน ไม่อ้าง production-ready |

G5 เป็นรายการให้ผู้ใช้ตรวจเมื่อ deploy เอง ไม่อนุญาตให้ผู้พัฒนาไปแก้ DNS หรือ Server โดยอัตโนมัติ

## 4. Task Register

### กฎการใช้ token และการรายงานผล

ใช้กับทุก Task ตามคำขอเจ้าของระบบ:

- ตอบภาษาไทยให้กระชับ ชัดเจน และตรงประเด็น รายละเอียดเพิ่มเติมอธิบายเมื่อผู้ใช้ถาม
- ระหว่างทำงานแจ้งเฉพาะความคืบหน้าที่สำคัญ ปัญหาที่มีผลต่อการตัดสินใจ หรือการเปลี่ยนแนวทาง; ไม่บรรยายทุกคำสั่ง
- รายงานจบ Task ประมาณ 3–5 บรรทัด: งานที่เสร็จ, ผลตรวจ/ทดสอบ, ปัญหาค้าง และงานถัดไปหากมี ใช้ลิงก์ไฟล์เมื่อจำเป็น
- ไม่ทวน requirements/แผนเดิม ไม่แสดง code, diff, logs หรือ stack trace ยาวในคำตอบ เว้นแต่ผู้ใช้ขอหรือจำเป็นต้องตัดสินใจ
- ค้นหาและอ่านเฉพาะไฟล์/ช่วงที่เกี่ยวข้อง ใช้ข้อมูลที่ตรวจแล้วซ้ำเมื่อยังเป็นรุ่นปัจจุบัน; อ่านใหม่เมื่อมีการเปลี่ยนแปลงหรือข้อมูลไม่พอ
- จำกัด output ของเครื่องมือให้พอตรวจผล เก็บหลักฐานที่จำเป็นใน Task Register หรือรายงานทดสอบ แทนการคัดลอกทั้งหมดลงแชต
- ไม่รันการตรวจเดิมซ้ำหลังผ่านแล้ว เว้นแต่มีการแก้ไข ความล้มเหลว หรือข้อสงสัยใหม่ที่เกี่ยวข้อง
- ใช้ model/effort ตาม Task ไม่เพิ่มโดยไม่มีเหตุผล และไม่เรียกงานเพิ่มนอกขอบเขตเพื่อเติมคำตอบ
- ความกระชับไม่ลดคุณภาพงาน: ต้องตรวจสิทธิ์, transaction, acceptance และ tests ที่เกี่ยวข้องให้ครบ; รายงาน FAIL/BLOCKED/NOT_RUN และข้อจำกัดสำคัญอย่างตรงไปตรงมา

### ค่าเริ่มต้น Model / Effort สำหรับผู้พัฒนา

- **Default model:** GPT-6.1 Sol (`gpt-6.1-sol`)
- **Default reasoning effort:** Medium (`medium`)
- **Default speed:** Standard
- ใช้ High (`high`) สำหรับ Tasks ที่ระบุใน Task Register และรายละเอียดงาน; งานอื่นใช้ Medium ตาม default
- ตารางนี้เป็นคำแนะนำสำหรับโปรเจกต์ ไม่ใช่การรับรองว่า effort ใดทำให้ผ่าน test หรือเสร็จภายในเวลาที่กำหนด
- ค่าใน Markdown ไม่เปลี่ยน model/effort ในแอปหรือ CLI อัตโนมัติ ผู้พัฒนาต้องเลือกค่าก่อนเริ่ม Task; หากเปลี่ยน Task ภายใน session เดียว ให้ตรวจค่าที่ใช้อีกครั้ง
- ถ้า High ยังแก้ปัญหาซับซ้อนไม่จบ ให้ระบุสิ่งที่ลอง/ผลตรวจ แล้วเพิ่ม Extra High เฉพาะงานนั้น; ไม่ใช้ Max/Ultra เป็น default
- งานแก้ข้อความ/สี/ระยะห่างเล็กน้อยภายใน Task สามารถใช้ Low/Light ได้ แต่ก่อนปิด Task ให้ใช้ effort ที่ระบุเพื่อตรวจ business rules และหลักฐานที่เกี่ยวข้อง
- ไม่สลับไป Luna อัตโนมัติ หากเลือก Luna สำหรับงานย่อยที่ขอบเขตชัด ให้ใช้ High และยังต้องตรวจตาม acceptance ของ Task เดิม
- T-001/T-002 ปิดงานเอกสารแล้ว ค่า effort ที่เพิ่มเป็นแนวทางหากต้องแก้ไขต่อ ไม่ได้เปิดสถานะงานใหม่


เพิ่ม Owner / Status / Evidence / Blocker ในแถวของงานเมื่อเริ่มดำเนินการ; initial owner เป็น “ยังไม่มอบหมาย” ไม่เดาว่าใครทำ

| Task | งาน | Depends on | Effort | Status | Owner | Evidence / Blocker |
|---|---|---|---|---|---|---|
| T-001 | ล็อกขอบเขตและค่าที่ใช้พัฒนา | — | Medium | DONE | เจ้าของระบบ/ผู้จัดทำเอกสาร | คำยืนยันของเจ้าของระบบในบทสนทนา; Baseline1.1 |
| T-002 | ปิดจุดกำกวมระหว่าง Requirements กับ SRS | T-001 | Medium | DONE | ผู้จัดทำเอกสาร | R-01–R-04 resolved; Requirements/SRS1.1 |
| T-003 | จัด API/DTO และ error contract ให้เป็นสัญญาเดียว | T-001, T-002 | High | TODO | ยังไม่มอบหมาย | — |
| T-004 | จัด test plan และเกณฑ์ release | T-003 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-005 | โครงสร้างโปรเจกต์และชุดคำสั่งพื้นฐาน | T-003 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-006 | Configuration และ startup validation | T-005 | High | TODO | ยังไม่มอบหมาย | — |
| T-007 | Schema และ migrations ครบทุก entity | T-005, T-002 | High | TODO | ยังไม่มอบหมาย | — |
| T-008 | Transaction, date และ lifecycle helpers | T-007, T-003 | High | TODO | ยังไม่มอบหมาย | — |
| T-009 | API middleware และ validation | T-006, T-003 | High | TODO | ยังไม่มอบหมาย | — |
| T-010 | Idempotency สำหรับคำสั่งสร้างและย้ายบอร์ด | T-007, T-009, T-008 | High | TODO | ยังไม่มอบหมาย | — |
| T-011 | Authorization service และ query scoping | T-007, T-009 | High | TODO | ยังไม่มอบหมาย | — |
| T-012 | Frontend shell, navigation และสถานะร่วม | T-005, T-003 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-013 | First-run setup API และหน้าจอ | T-007, T-009, T-012 | High | TODO | ยังไม่มอบหมาย | — |
| T-014 | Password hashing, login และ session | T-011, T-006, T-008 | High | TODO | ยังไม่มอบหมาย | — |
| T-015 | เปลี่ยนรหัสและ forced password gate | T-014 | High | TODO | ยังไม่มอบหมาย | — |
| T-016 | Admin users API และ last-admin guard | T-015, T-011 | High | TODO | ยังไม่มอบหมาย | — |
| T-017 | Login, logout, profile และเปลี่ยนรหัส UI | T-012, T-013, T-015 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-018 | Admin user management UI | T-017, T-016 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-019 | CLI กู้ Admin และบังคับออกจากระบบ | T-016 | High | TODO | ยังไม่มอบหมาย | — |
| T-020 | Team CRUD/archive และสมาชิกหลายทีม | T-016, T-011, T-008 | High | TODO | ยังไม่มอบหมาย | — |
| T-021 | Project CRUD/archive และ membership ข้ามทีม | T-020, T-011 | High | TODO | ยังไม่มอบหมาย | — |
| T-022 | ถอนสิทธิ์ ปิดบัญชี และ cleanup assignee | T-021, T-016, T-008 | High | TODO | ยังไม่มอบหมาย | — |
| T-023 | หน้าทีมและแต่งตั้ง Lead | T-020, T-017 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-024 | หน้าโปรเจกต์และ Editor/Viewer picker | T-021, T-023, T-022 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-025 | ชื่อองค์กรและ settings | T-013, T-016, T-017 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-026 | Task create/read/update และ validation | T-021, T-010, T-008, T-022 | High | TODO | ยังไม่มอบหมาย | — |
| T-027 | Status transitions และ completion | T-026 | High | TODO | ยังไม่มอบหมาย | — |
| T-028 | Checklist API และ parent guard | T-027 | High | TODO | ยังไม่มอบหมาย | — |
| T-029 | Recurring series และ monthly anchor | T-027, T-028, T-010, T-002 | High | TODO | ยังไม่มอบหมาย | — |
| T-030 | Soft delete/restore และการคง series | T-026, T-029, T-002 | High | TODO | ยังไม่มอบหมาย | — |
| T-031 | Task query/search/filter/sort และ pagination | T-026, T-011 | High | TODO | ยังไม่มอบหมาย | — |
| T-032 | Task form/detail และ save conflict UX | T-026, T-027, T-017, T-024 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-033 | Checklist/recurrence/trash UI | T-032, T-028, T-029, T-030 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-034 | Board read และ column versions | T-027, T-030, T-007 | High | TODO | ยังไม่มอบหมาย | — |
| T-035 | Atomic board move/reorder endpoint | T-034, T-029, T-010 | High | TODO | ยังไม่มอบหมาย | — |
| T-036 | Kanban layout และ Drag & Drop | T-035, T-032 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-037 | Keyboard/touch actions และ filtered-board guard | T-036, T-031 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-038 | Kanban rollback และ conflict recovery | T-037 | High | TODO | ยังไม่มอบหมาย | — |
| T-039 | Comments API และ append-only rules | T-026, T-010, T-011 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-040 | Task events และ Admin audit | T-027, T-016, T-021, T-030, T-039 | High | TODO | ยังไม่มอบหมาย | — |
| T-041 | Multipart upload และ file validation | T-026, T-006, T-002 | High | TODO | ยังไม่มอบหมาย | — |
| T-042 | Upload quota reservation และ cleanup | T-041, T-007 | High | TODO | ยังไม่มอบหมาย | — |
| T-043 | Authorized download และ file delete | T-042, T-011, T-040 | High | TODO | ยังไม่มอบหมาย | — |
| T-044 | Comments/files/history panels | T-032, T-039, T-040, T-043 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-045 | งานของฉันและ task list UI | T-031, T-032, T-033 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-046 | Month calendar และ no-due list | T-045, T-031 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-047 | Shared refresh และ dirty draft preservation | T-045, T-046, T-044, T-038, T-017 | High | TODO | ยังไม่มอบหมาย | — |
| T-048 | Notification event dispatch | T-022, T-027, T-039, T-029, T-040 | High | TODO | ยังไม่มอบหมาย | — |
| T-049 | Due reminder scheduler | T-048, T-008, T-006 | High | TODO | ยังไม่มอบหมาย | — |
| T-050 | Notification list/read-one/read-all | T-048, T-049, T-011 | High | TODO | ยังไม่มอบหมาย | — |
| T-051 | Notification center และ badge | T-050, T-047 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-052 | Report aggregates และนิยามตัวเลข | T-031, T-027, T-011 | High | TODO | ยังไม่มอบหมาย | — |
| T-053 | CSV export ตาม filter/access | T-052 | High | TODO | ยังไม่มอบหมาย | — |
| T-054 | Dashboard/report และ export UI | T-052, T-053, T-051 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-055 | Responsive และ accessible interaction review | T-054, T-037, T-024, T-018, T-044 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-056 | PWA manifest/icons/service worker | T-012, T-006 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-057 | Offline/reconnect/logout cache behavior | T-056, T-047, T-055 | High | TODO | ยังไม่มอบหมาย | — |
| T-058 | Browser matrix และ PWA/touch QA | T-057, T-037 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-059 | Health endpoints และ operational logs | T-006, T-009, T-040 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-060 | Retention jobs และ orphan recovery | T-030, T-042, T-050, T-010, T-002 | High | TODO | ยังไม่มอบหมาย | — |
| T-061 | Write freeze และ job coordination | T-059, T-060 | High | TODO | ยังไม่มอบหมาย | — |
| T-062 | Consistent backup script และ manifest | T-061, T-007, T-043 | High | TODO | ยังไม่มอบหมาย | — |
| T-063 | Restore/verification script และ rollback | T-062, T-014 | High | TODO | ยังไม่มอบหมาย | — |
| T-064 | Migration upgrade และ recovery procedure | T-063, T-007 | High | TODO | ยังไม่มอบหมาย | — |
| T-065 | Windows scripts และ installation guide | T-064, T-006, T-059, T-019 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-066 | คู่มือ Admin/Lead/Member และ developer handoff | T-065, T-054, T-058 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-067 | Complete test fixtures และ automated harness | T-004, T-007, T-011 | High | TODO | ยังไม่มอบหมาย | — |
| T-068 | ทดสอบ setup/auth/users และ session edges | T-067, T-018, T-017, T-019 | High | TODO | ยังไม่มอบหมาย | — |
| T-069 | ทดสอบสิทธิ์ข้ามทีมและ revocation ทุกช่องทาง | T-067, T-022, T-043, T-053, T-050, T-024 | High | TODO | ยังไม่มอบหมาย | — |
| T-070 | ทดสอบงาน งานซ้ำ การลบ และแก้พร้อมกัน | T-067, T-033, T-060, T-027 | High | TODO | ยังไม่มอบหมาย | — |
| T-071 | ทดสอบ Kanban/list/calendar และ refresh | T-067, T-038, T-045, T-046, T-047, T-058 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-072 | ทดสอบ comments/files/audit/notifications | T-067, T-044, T-051, T-060 | High | TODO | ยังไม่มอบหมาย | — |
| T-073 | ทดสอบรายงาน CSV และ PWA | T-067, T-054, T-057 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-074 | ทดสอบ restart/backup/restore/migration และ Windows | T-067, T-063, T-064, T-065, T-059 | High | TODO | ยังไม่มอบหมาย | — |
| T-075 | Load/performance test 30 users | T-067, T-031, T-052, T-035, T-041 | High | TODO | ยังไม่มอบหมาย | — |
| T-076 | UAT และ acceptance sign-off record | T-068, T-069, T-070, T-071, T-072, T-073, T-074, T-075 | Medium | TODO | ยังไม่มอบหมาย | — |
| T-077 | Source ZIP และ release completeness audit | T-076, T-066 | High | TODO | ยังไม่มอบหมาย | — |

## 5. Phase 00: Baseline และสัญญาการพัฒนา

### T-001 — ล็อกขอบเขตและค่าที่ใช้พัฒนา

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** DONE (เอกสาร) · **Depends on:** ไม่มี · **Trace:** NFR-08 · **SRS:** §2

- [x] เจ้าของระบบยืนยันกติกาที่เสนอเมื่อ2026-10-05 11:33+07
- [x] คงหลายทีม/30 คน/noemail/noAI/selfdeployment
- [x] เปลี่ยน database เป็น SQL Server2022; stack ตาม SRS§3.4
- [x] Edition/installcredentials บันทึกเป็น deploymentcheck ไม่สมมติ Edition

**Evidence:** คำยืนยันในบทสนทนาและ Baseline1.1;ไม่มี coding/testing ได้รับสถานะ DONE จากงานนี้

### T-002 — ปิดจุดกำกวมระหว่าง Requirements กับ SRS

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** DONE (เอกสาร) · **Depends on:** T-001 · **Trace:** FR-15/16/17/28

- [x] R-01 manualdone เมื่อ checklist ครบ
- [x] R-02 projectarchive/tasktrash30 วัน
- [x] R-03 filetrash30 วัน/countquota/authorizedrestore
- [x] R-04 recurrenceIDsnapshot/tombstone ไม่ติด FK หลัง purge
- [x] Requirements/SRS/Task/TestPlan/TestCases ปรับ version1.1 ตรงกัน

**Evidence:** DecisionLog และ SRS§5.1/§8/§9.5;ทดสอบ implementation ยัง NOT_RUN

### T-003 — จัด API/DTO และ error contract ให้เป็นสัญญาเดียว

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ล็อกสัญญาข้อมูลและ error ให้สอดคล้องทั้งระบบ

**Depends on:** T-001, T-002  
**Trace:** FR-05, FR-18, FR-40 · **SRS:** §5, §12  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] ทำ route inventory ทุกแถวใน SRS §12.2 และ DTO/request schema
- [ ] กำหนด unknown-field policy, pagination, status codes, date serialization และ requestId
- [ ] ระบุ version ของ users/org/team/project/subtask/task/columns ที่ API ใช้
- [ ] นิยาม Idempotency-Key และ DELETE version payload ให้ frontend/backend ตรงกัน

**เกณฑ์รับงาน:** มี API contract ที่ตรวจ schema ได้; ไม่มี endpoint ใน SRS ที่ไร้เจ้าของ task

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-004 — จัด test plan และเกณฑ์ release

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-003  
**Trace:** FR-40, NFR-01, NFR-02, NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-08 · **SRS:** §14–16  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] แยก unit/integration/UI/UAT/Windows tests
- [ ] กำหนด fixture roles และวิธีส่งผล PASS/FAIL/BLOCKED/NOT_RUN
- [ ] จับคู่ AT-01–AT-30 กับงานและหลักฐานที่ต้องเก็บ
- [ ] กำหนด critical gate เรื่องสิทธิ์ transaction recurrence backup และไม่มี secrets

**เกณฑ์รับงาน:** มี test manifest ที่ไม่มี AT ตกหล่น และไม่ใช้การเช็ก checkbox แทนผลทดสอบ

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 6. Phase 01: Foundation / database / permissions

### T-005 — โครงสร้างโปรเจกต์และชุดคำสั่งพื้นฐาน

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-003  
**Trace:** FR-40, NFR-07, NFR-08 · **SRS:** §3, §13.5  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] แยก frontend/API/domain/repository/jobs/scripts/tests ตาม stack ที่เลือก
- [ ] ล็อก runtime และ dependency พร้อม lockfile/license inventory
- [ ] แยก production data/.env/logs ออกจาก source และกำหนด ignore
- [ ] จัด start/test/migrate/sample-data scripts; sample data ไม่รันอัตโนมัติ

**เกณฑ์รับงาน:** checkout ใหม่รันขั้นพื้นฐานตาม README ได้; ไม่มี secret/data จริง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-006 — Configuration และ startup validation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ตรวจ secrets, TLS และ configuration ก่อนเปิดระบบ

**Depends on:** T-005  
**Trace:** FR-37, FR-40, NFR-02, NFR-07 · **SRS:** §3.2–3.3  
**Acceptance:** AT-28

- [ ] รองรับ keys ทุกตัวใน configuration contract และ .env.example
- [ ] ตรวจ APP_ORIGIN, COOKIE_SECURE, data/log paths, quota และค่าระยะเวลา
- [ ] แยก local defaults จาก production; ไม่ใช้ Host header เป็น trusted origin
- [ ] ทำ single-instance guard และปฏิเสธ DB บน network share ตามข้อจำกัด

**เกณฑ์รับงาน:** configuration ผิดหยุด startup พร้อมข้อความที่ไม่เผย secrets; data paths อยู่ข้างนอก webroot

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-007 — Schema และ migrations ครบทุก entity

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ออกแบบ constraints, indexes และ SQL Server migrations

**Depends on:** T-005, T-002  
**Trace:** FR-40, NFR-03, NFR-07 · **SRS:** §5  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] สร้าง entities/FK/UNIQUE/CHECK/index เป็น T-SQL ทุกแถว;optionalUNIQUE ใช้ filteredindex; NO ACTION/purge ตาม SRS§5.1
- [ ] กำหนด versions/timestamps/auth_version และ date-only ที่ชัดเจน
- [ ] รองรับ quota reservation/cleanup state ตาม design ที่ล็อก ไม่ทำแค่ counter ในหน่วยความจำ
- [ ] สร้าง schema_migrations checksum และปฏิเสธ checksum mismatch
- [ ] ตรวจ fresh migration และ migration จาก fixture รุ่นก่อน

**เกณฑ์รับงาน:** schema สอดคล้อง DTO; migration ทำซ้ำไม่ทำข้อมูลหาย; SQL Server FK/constraints เปิดและ trusted จริง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-008 — Transaction, date และ lifecycle helpers

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ควบคุม transaction, วันเวลา และ lifecycle

**Depends on:** T-007, T-003  
**Trace:** FR-14, FR-18, NFR-03 · **SRS:** §8, §9.1, §13.2  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] สร้าง transaction wrapper และ SQL Server lock-timeout/deadlock handling 503/Retry-After
- [ ] สร้าง Bangkok today/date interval/UTC conversion และ monthly anchor helper
- [ ] สร้าง optimistic version helpers และ column locks/rank สองระยะ/column version invariants ตาม SQL Server§5.1
- [ ] ทำ deletion/archived/active checks แบบใช้ร่วมกันในทุก write

**เกณฑ์รับงาน:** helper ผ่านกรณีขอบวัน/เดือนและ rollback; ไม่ใช้เวลาจาก browser ตัดสิน overdue

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-009 — API middleware และ validation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ป้องกัน request ที่ไม่ปลอดภัยและ validation ช่องทางกลาง

**Depends on:** T-006, T-003  
**Trace:** FR-05, FR-18, NFR-02 · **SRS:** §12.1, §13.1  
**Acceptance:** AT-30

- [ ] JSON Content-Type/size limits, explicit allowlist, error envelope/requestId
- [ ] exact Origin และ CSRF hooks, secure headers/CSP, no permissive CORS
- [ ] parameterized queries และป้องกัน sensitive fields ออก DTO
- [ ] pagination max100 และ resource404 เมื่อไม่มี project access

**เกณฑ์รับงาน:** middleware ใช้กับทุก route ตาม contract; error ไม่เผย stack/password/path

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-010 — Idempotency สำหรับคำสั่งสร้างและย้ายบอร์ด

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ป้องกันคำสั่งซ้ำและผล commit ที่ไม่แน่นอน

**Depends on:** T-007, T-009, T-008  
**Trace:** FR-16, FR-18, FR-21, FR-27, NFR-03 · **SRS:** §12.1  
**Acceptance:** AT-12, AT-17, AT-21

- [ ] เก็บ key ต่อ user/route และ request hash TTL24h
- [ ] key เดิม/body เดิมคืน response เดิม; body ต่าง409
- [ ] ผูก key result กับ business transaction เพื่อกัน parallel retry
- [ ] ไม่เก็บ password/upload bytes ใน table นี้ และมี cleanup job

**เกณฑ์รับงาน:** parallel requests key เดียวไม่เพิ่ม records ซ้ำ; permission ตรวจซ้ำก่อนคืน cached response

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-011 — Authorization service และ query scoping

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ป้องกันข้อมูลข้ามทีมและตรวจสิทธิ์ทุกช่องทาง

**Depends on:** T-007, T-009  
**Trace:** FR-05, FR-10, FR-11, NFR-02 · **SRS:** §4  
**Acceptance:** AT-05, AT-07, AT-08, AT-30

- [ ] effective rights จาก Admin/Lead ทีมเจ้าของ/project Editor/Viewer
- [ ] team membership/creator/assignee ไม่เพิ่มสิทธิ์เอง
- [ ] scoping บน read/list/search/report/export/notification/file download
- [ ] ตรวจ active/session/forced password และ archived/deleted state ก่อนทำงาน

**เกณฑ์รับงาน:** permission matrix มี executable tests ทั้ง allowed/denied; frontend hiding ไม่ใช่การป้องกันเพียงอย่างเดียว

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-012 — Frontend shell, navigation และสถานะร่วม

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-005, T-003  
**Trace:** FR-35, NFR-05, NFR-06 · **SRS:** §11  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] สร้าง app layout/nav ตามสิทธิ์และ app-specific favicon
- [ ] shared form/dialog/table/toast/error/loading/empty components
- [ ] API client จัด401/403/404/409/offline โดยไม่ล้างข้อมูลร่าง
- [ ] รองรับ labels/focus/200% text zoom และข้อความไทย

**เกณฑ์รับงาน:** หน้าเริ่มเป็น working app; navigation ไม่แสดงทางเข้าที่ผู้ใช้ไม่มีสิทธิ์

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 7. Phase 02: บัญชีและความปลอดภัย

### T-013 — First-run setup API และหน้าจอ

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ป้องกัน concurrent setup และบัญชีเริ่มต้น

**Depends on:** T-007, T-009, T-012  
**Trace:** FR-01 · **SRS:** §6.1  
**Acceptance:** AT-01

- [ ] สร้าง setup token256-bit ที่ console เท่านั้นและเปลี่ยนหลัง restart
- [ ] meta เปิดเฉพาะ setupRequired/version; setup บันทึก organization/Admin ใน transaction
- [ ] no-users guard รับมือ setup พร้อมกัน; ปิด endpoint หลังสำเร็จ
- [ ] ฟอร์ม token/ชื่อองค์กร/username/name/password พร้อม validation

**เกณฑ์รับงาน:** setup ถูกต้อง201;ผิด403;ใช้ซ้ำ409;ไม่มี default password

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-014 — Password hashing, login และ session

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ความปลอดภัย password/session และวันหมดอายุ

**Depends on:** T-011, T-006, T-008  
**Trace:** FR-02, FR-04, NFR-02 · **SRS:** §6.2  
**Acceptance:** AT-02, AT-03

- [ ] async scrypt และ cost/salt ตาม SRS; constant-time compare
- [ ] rate limits ต่อ username/IP; generic login error
- [ ] random session/token hash/HttpOnly SameSite Secure cookie
- [ ] absolute12h idle60m; polling ไม่ต่อ idle; activity จาก interaction มี CSRF
- [ ] logoutrevoke; role/reset/deactivate ใช้ auth_version ปิด sessions

**เกณฑ์รับงาน:** session lifecycle ผ่าน expired/revoked/logout;ไม่มี raw session token ใน DB หรือ log

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-015 — เปลี่ยนรหัสและ forced password gate

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** forced password gate และ revoke sessions

**Depends on:** T-014  
**Trace:** FR-04 · **SRS:** §6.2–6.3  
**Acceptance:** AT-03

- [ ] own password ต้อง current password; validate12–128 ไม่ trim
- [ ] rotate current session/CSRF และ revoke session อื่น
- [ ] must_change_password อนุญาตเพียง me/password/logout/activity
- [ ] adminreset ยืนยัน Admin password และตั้ง forced flag

**เกณฑ์รับงาน:** ใช้รหัสชั่วคราวเรียก taskAPI ถูก403 PASSWORD_CHANGE_REQUIRED;เปลี่ยนแล้วใช้ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-016 — Admin users API และ last-admin guard

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** last-admin guard ต้องถูกต้องเมื่อแก้พร้อมกัน

**Depends on:** T-015, T-011  
**Trace:** FR-03, FR-04 · **SRS:** §6.3  
**Acceptance:** AT-03, AT-04

- [ ] create/edit/deactivate/reactivate users ตาม version;usernameuniquecase-insensitive
- [ ] ไม่ทำ harddelete user ที่มี history
- [ ] ห้าม demote/deactivateactiveAdmin คนสุดท้ายด้วย transaction
- [ ] reset endpoint ไม่คืน password และ admin_events ไม่มี secret

**เกณฑ์รับงาน:** concurrent admin changes ไม่ทำให้ไม่มี Admin;inactive login ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-017 — Login, logout, profile และเปลี่ยนรหัส UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-012, T-013, T-015  
**Trace:** FR-02, FR-04, FR-35 · **SRS:** §11  
**Acceptance:** AT-02, AT-03

- [ ] login/show-password/error429 และ sessionexpired
- [ ] forced password หน้าบังคับพร้อม field errors
- [ ] profile/change-password/logout;intentionalactivity แยกจาก poll
- [ ] ไม่เก็บ password/session token ใน localStorage

**เกณฑ์รับงาน:** ทดสอบ login→forcedchange→งาน→logout ครบผ่าน browser

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-018 — Admin user management UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-017, T-016  
**Trace:** FR-03, FR-04 · **SRS:** §11  
**Acceptance:** AT-03, AT-04

- [ ] list/search/page users และ create/editrole/name
- [ ] deactivate/reactivate/reset พร้อม confirmation
- [ ] แสดง temp-password การกรอกโดย Admin ไม่ใส่ default
- [ ] ห้ามปิด Admin สุดท้ายและแสดงเหตุผลจาก API

**เกณฑ์รับงาน:** บัญชี active/inactive/history แสดงถูก;reset แจ้ง forcedchange

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-019 — CLI กู้ Admin และบังคับออกจากระบบ

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** กู้สิทธิ์ Admin อย่างปลอดภัยและบังคับ logout

**Depends on:** T-016  
**Trace:** FR-04, FR-39, FR-40, NFR-02, NFR-07 · **SRS:** §6.3, §13.5  
**Acceptance:** AT-28

- [ ] local-only CLI require machine/file permissions
- [ ] ไม่เปิด public password recovery route
- [ ] revoke sessions และ writeadmin maintenance audit
- [ ] คู่มือจัดการ Admin หายโดยไม่เปิดเผย password ผ่าน arguments/log

**เกณฑ์รับงาน:** กู้คืนใน testinstance ได้;ไม่เปิดช่อง webunauthenticated

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 8. Phase 03: ทีม โปรเจกต์ และการถอนสิทธิ์

### T-020 — Team CRUD/archive และสมาชิกหลายทีม

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** สมาชิกหลายทีมและกติกา archive

**Depends on:** T-016, T-011, T-008  
**Trace:** FR-06, FR-07, FR-08 · **SRS:** §7  
**Acceptance:** AT-06

- [ ] teamnamesuniquecase-insensitive;Admincreate/edit/archive
- [ ] membershipcompositeunique;user หลายทีม/role ต่างกัน
- [ ] Admin แต่งตั้ง/ถอด Lead เท่านั้น
- [ ] archive ได้เฉพาะไม่มี activeproject;ไม่ cascade เงียบ

**เกณฑ์รับงาน:** member ไม่ยกระดับตนเอง;ทีม archived สร้าง project ใหม่ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-021 — Project CRUD/archive และ membership ข้ามทีม

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** สิทธิ์โปรเจกต์ข้ามทีมและ membership

**Depends on:** T-020, T-011  
**Trace:** FR-09, FR-10 · **SRS:** §7  
**Acceptance:** AT-07, AT-29

- [ ] activeownerteam หนึ่งทีม;Admin/ownerLead จัดการ
- [ ] cross-team Editor/Viewer explicit membership
- [ ] ownerteam ย้ายไม่ได้ v1;directory ตาม privacycontract
- [ ] archive อ่านได้แต่ writes งาน/comment/file/subtask ถูกบล็อก;unarchive ตาม version

**เกณฑ์รับงาน:** M2 เห็นเฉพาะ Pshared;Viewer อ่านอย่างเดียว;Lead ไม่ดูทีมอื่นเพราะเป็น Lead

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-022 — ถอนสิทธิ์ ปิดบัญชี และ cleanup assignee

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ถอนสิทธิ์พร้อม cleanup ผู้รับงานให้ atomic

**Depends on:** T-021, T-016, T-008  
**Trace:** FR-11, FR-13, NFR-02, NFR-03 · **SRS:** §7  
**Acceptance:** AT-08

- [ ] projectremove/editor→viewerunassignopen งานเมื่อเสีย effectivewrite
- [ ] teamremove คง explicitprojectmembership;สูญเสีย Lead คำนวณ rights ใหม่
- [ ] deactivateuserrevoke sessions/unassignopen งานทั้งองค์กร
- [ ] done งานคง assigneehistory;notifyownerAdmin/Lead ไม่แจ้งคนหมดสิทธิ์
- [ ] download/notification/APIrequest ใหม่ตรวจสิทธิ์ปัจจุบัน

**เกณฑ์รับงาน:** ทุกกรณีถอนสิทธิ์ไม่มีงานมอบหมายค้างให้คนไม่มี access และไม่มีข้อมูลรั่ว

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-023 — หน้าทีมและแต่งตั้ง Lead

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-020, T-017  
**Trace:** FR-06, FR-07, FR-08 · **SRS:** §11  
**Acceptance:** AT-06

- [ ] teamlist/edit/archive ตามบทบาท
- [ ] membershipmulti-team และ Leadassignment
- [ ] confirmremoval พร้อมผลกระทบต่อสิทธิ์
- [ ] loading/empty/conflict/error และ own-teamlist

**เกณฑ์รับงาน:** Admin จัดทีมได้ครบ;สมาชิกเห็นข้อมูลทีมตาม scope

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-024 — หน้าโปรเจกต์และ Editor/Viewer picker

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-021, T-023, T-022  
**Trace:** FR-09, FR-10, FR-11 · **SRS:** §11  
**Acceptance:** AT-07, AT-08, AT-29

- [ ] projectselector/list/create/edit/archive/unarchive
- [ ] activeuserdirectory สำหรับ Lead/Admin และ cross-team rolepicker
- [ ] remove/reduceaccessconfirmation
- [ ] archived/read-only state และไม่เปิดแสดง hiddenprojects

**เกณฑ์รับงาน:** projectmembershipflow ครบทั้งข้ามทีมและถอนสิทธิ์

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-025 — ชื่อองค์กรและ settings

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-013, T-016, T-017  
**Trace:** FR-37 · **SRS:** §3.3, §11–12  
**Acceptance:** AT-28

- [ ] organization GET/PATCH version โดย Admin
- [ ] ชื่อองค์กรใน navigation/loginmetadata ตาม privacy ที่กำหนด
- [ ] deploymentvalues ใน config ไม่เพิ่ม SMTP/AIsettings
- [ ] read-only สำหรับ Member และ validate ชื่อ≤100

**เกณฑ์รับงาน:** ชื่อที่แก้คงหลัง restart;role ที่ไม่มีสิทธิ์ PATCH ถูก403

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 9. Phase 04: งาน Checklist งานซ้ำ และถังขยะ

### T-026 — Task create/read/update และ validation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** permissions, validation และ optimistic concurrency

**Depends on:** T-021, T-010, T-008, T-022  
**Trace:** FR-12, FR-13, FR-14, FR-18 · **SRS:** §8.1  
**Acceptance:** AT-09, AT-14

- [ ] fields/length/enums/date-only/start≤due ตาม SRS
- [ ] projectimmutable;activeeligibleassignee หนึ่งคน/null
- [ ] taskversioncheck409 และ updated_at
- [ ] createinitialtodo/medium/position พร้อม events ใน transaction
- [ ] ไม่มี write ใน archived/deletedproject/task

**เกณฑ์รับงาน:** validate ทุก field และ conflict ไม่ทับข้อมูล;HTTP ตาม contract

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-027 — Status transitions และ completion

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** เปลี่ยนสถานะสัมพันธ์กับ completion และงานซ้ำ

**Depends on:** T-026  
**Trace:** FR-14, FR-15, FR-18, NFR-03 · **SRS:** §8.2, §9.1  
**Acceptance:** AT-10, AT-14

- [ ] ทุก transition ตาม4status รวม reopen
- [ ] done ต้อง subtasks ครบ;completed_atnow และ reopen=null
- [ ] done→done เป็น noop ไม่เปลี่ยน completion หรือ recurrence
- [ ] detailstatusappendtargetboard และเพิ่ม columnversions
- [ ] transactionrollback และ notification/audit hooks

**เกณฑ์รับงาน:** taskstatus/boardordering/completed_at ไม่ขัดกัน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-028 — Checklist API และ parent guard

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** checklist กับ parent guard ต้องตรวจใน transaction

**Depends on:** T-027  
**Trace:** FR-15 · **SRS:** §8.2  
**Acceptance:** AT-10

- [ ] create/edittitle/toggle/delete ตาม version
- [ ] reject เพิ่ม/untick ตอน parentdone จน reopen
- [ ] ไม่มี assignee/duedate ของ subtask แยก v1
- [ ] checklist ครบไม่ auto-done ตาม baseline ที่ล็อก

**เกณฑ์รับงาน:** checklistguard ตรง closedtask และ completiontest

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-029 — Recurring series และ monthly anchor

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** monthly anchor และสร้างงานซ้ำเพียงครั้งเดียว

**Depends on:** T-027, T-028, T-010, T-002  
**Trace:** FR-16, NFR-03 · **SRS:** §8.3  
**Acceptance:** AT-11, AT-12

- [ ] duedaterequired;daily+1 weekly+7 monthlyanchor
- [ ] copystartdueoffset/checklisttitles ไม่ copyfiles/comments
- [ ] successoronce unique source;copyeligibleassignee เท่านั้น
- [ ] reopen/recomplete ไม่สร้างเพิ่ม;ไม่ catchup หลายรอบย้อนหลัง
- [ ] statusdone+successor+event+notification ใน transaction เดียว

**เกณฑ์รับงาน:** Jan31→Febend→Mar31 และ parallelcompletion มี successor หนึ่งงาน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-030 — Soft delete/restore และการคง series

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** restore/purge และ recurrence tombstone

**Depends on:** T-026, T-029, T-002  
**Trace:** FR-17, NFR-03 · **SRS:** §8.4  
**Acceptance:** AT-13

- [ ] creator/ownerLead/Adminsoftdelete ตาม version
- [ ] deleted ออกจาก activequeries/positions/reminders/exports
- [ ] trashscopedAdmin/Lead;restore≤30days และ append เดิม
- [ ] recurrencelinks/tombstones ตาม resolveddesign
- [ ] ไม่ harddelete ทันทีและไม่เปิด write งานใน trash

**เกณฑ์รับงาน:** restore กลับครบและไม่สร้าง recurrence ซ้ำหลังการลบ

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-031 — Task query/search/filter/sort และ pagination

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** query scoping, dynamic filters และ pagination

**Depends on:** T-026, T-011  
**Trace:** FR-19, FR-20 · **SRS:** §9.2  
**Acceptance:** AT-15, AT-19

- [ ] AND ข้าม fields OR ใน multiplevalues
- [ ] searchtitle/description/category;max100chars
- [ ] datebasis/dueinclusive/null-last/tie-ID
- [ ] scope ก่อน count/pagination ไม่แค่กรองหน้าที่โหลด
- [ ] sharedfilterlogic กับ calendar/report/export

**เกณฑ์รับงาน:** total/count/search ไม่รั่ว hiddenproject;filters ให้ผลสอดคล้อง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-032 — Task form/detail และ save conflict UX

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-026, T-027, T-017, T-024  
**Trace:** FR-12, FR-13, FR-14, FR-18 · **SRS:** §11  
**Acceptance:** AT-09, AT-14, AT-20

- [ ] create/editfields และ eligibleassigneepicker
- [ ] loading/readonly/archived/dirty/pending states
- [ ] 409 ให้โหลด latest หรือเก็บ draft เทียบไม่ทับอัตโนมัติ
- [ ] close/routechange เตือน unsaveddraft
- [ ] taskversionsfromserver ไม่ increment เอง

**เกณฑ์รับงาน:** แก้ task จริงได้ครบ;dirtydraft ไม่หายจาก refresh

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-033 — Checklist/recurrence/trash UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-032, T-028, T-029, T-030  
**Trace:** FR-15, FR-16, FR-17 · **SRS:** §11  
**Acceptance:** AT-10, AT-11, AT-13

- [ ] Checklistcounts/edit/toggle/delete/closedguard
- [ ] recurrencepicker และ requiredduedate อธิบาย monthlyanchor
- [ ] trashscreenrestore เฉพาะ Admin/Lead
- [ ] confirmationdelete และวันหมดระยะกู้คืน

**เกณฑ์รับงาน:** user จัด subtasks/งานซ้ำ/delete-restore ผ่าน UI โดยไม่ใช้ API เอง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 10. Phase 05: Kanban Drag & Drop

### T-034 — Board read และ column versions

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** column versions และ snapshot บอร์ด

**Depends on:** T-027, T-030, T-007  
**Trace:** FR-21, FR-22 · **SRS:** §9.1  
**Acceptance:** AT-16

- [ ] ordered4columns ตาม projectaccess
- [ ] rankinvariant และ taskversions/columnversionsDTO
- [ ] สร้าง/ลบ/restore/detailstatus เพิ่ม columnversion
- [ ] >500tasksfallbackpaginatedlist/menu ไม่โหลดไม่จำกัด

**เกณฑ์รับงาน:** refresh ได้ลำดับเดียวกับ DB;ข้อมูล versions ใช้ move ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-035 — Atomic board move/reorder endpoint

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** atomic reorder, rank constraints และการลากพร้อมกัน

**Depends on:** T-034, T-029, T-010  
**Trace:** FR-18, FR-21, FR-22, NFR-03 · **SRS:** §9.1, §12.4  
**Acceptance:** AT-16, AT-17

- [ ] ตรวจ source/target/task/anchor/project/versions
- [ ] from=to ใช้ version เดียว;before=nullappend
- [ ] transactionrenumberrank1..N และ status/completion/subtasks/recurhooks
- [ ] stale409 ไม่มี partial;idempotentretry คืนผลเดิม
- [ ] networktimeoutGETauthoritativestate ก่อนส่งซ้ำ

**เกณฑ์รับงาน:** parallelmove ไม่มี duplicate rank/สถานะผิด;done ลากยังผ่าน completionrules

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-036 — Kanban layout และ Drag & Drop

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-035, T-032  
**Trace:** FR-21, FR-22 · **SRS:** §9.1  
**Acceptance:** AT-16

- [ ] cardtitle/ID/assignee/priority/due/overdue/checklistcount
- [ ] drag ข้าม column/in-column ผ่าน singlemoveAPI
- [ ] pending→saved หลัง serverack;refreshpersist
- [ ] handle/longpress ไม่แย่ง touchscroll

**เกณฑ์รับงาน:** ลากจริงแล้วข้อมูล persist ไม่เป็นเพียง visualmock

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-037 — Keyboard/touch actions และ filtered-board guard

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-036, T-031  
**Trace:** FR-20, FR-23, FR-35, NFR-05, NFR-06 · **SRS:** §9.1  
**Acceptance:** AT-18

- [ ] text/assignee/priority/category/date/statusfilter ปิด reorder
- [ ] ปุ่ม clearfilters และเหตุผลที่ลากไม่ได้
- [ ] menuchangestatus และ movebefore/after ทางคีย์บอร์ด
- [ ] focus/aria feedback และ Viewer ไม่มี writecontrols

**เกณฑ์รับงาน:** ไม่ต้องลากก็ทำ status/order ได้;hiddencards ไม่ถูกจัดลำดับผิด

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-038 — Kanban rollback และ conflict recovery

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** rollback optimistic UI และจัดการ conflict

**Depends on:** T-037  
**Trace:** FR-18, FR-21, FR-26 · **SRS:** §9.1, §9.6  
**Acceptance:** AT-17, AT-20

- [ ] networkfail/permission/validation คืน optimisticstate
- [ ] 409 โหลด columnlatest และแจ้งเหตุผล
- [ ] timeout ตรวจผลจาก server ไม่ doublemove
- [ ] tab หลายผู้ใช้และ dirtydetail ไม่สูญ draft

**เกณฑ์รับงาน:** จำลอง fail ทุกแบบแล้ว UI/DB กลับมาสอดคล้องกัน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 11. Phase 06: Comments / files / history

### T-039 — Comments API และ append-only rules

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-026, T-010, T-011  
**Trace:** FR-27 · **SRS:** §9.4  
**Acceptance:** AT-21

- [ ] plain-text1–5000paginate50/max100
- [ ] writerpermission และ archived/deletedguard
- [ ] idempotentduplicateprevent;noedit/deleteUIv1
- [ ] comment/event/notificationintransaction

**เกณฑ์รับงาน:** HTML/script เป็น text และ comment retry ไม่ซ้ำ

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-040 — Task events และ Admin audit

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** audit ครบและไม่บันทึก secrets

**Depends on:** T-027, T-016, T-021, T-030, T-039  
**Trace:** FR-29, FR-39, NFR-02 · **SRS:** §9.4, §13.1  
**Acceptance:** AT-21

- [ ] taskbefore/afterfields actor/time/requestId
- [ ] adminrole/reset/membership/configactionaudit
- [ ] append-onlyAPI ไม่มี endpoint แก้ history
- [ ] pagination และ redactionsecret/temp-password/tokens

**เกณฑ์รับงาน:** ทุก mutation สำคัญมี audit ที่อ่านตาม scope ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-041 — Multipart upload และ file validation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** file validation, path safety และการ finalize

**Depends on:** T-026, T-006, T-002  
**Trace:** FR-28, NFR-02, NFR-03 · **SRS:** §9.5  
**Acceptance:** AT-22

- [ ] streamtempfile ไม่ buffer ทั้งไฟล์;1–10MiB
- [ ] allowlist/magicUTF8validation;ZIP/Office ไม่ extract
- [ ] normalizedfilename/randomstoragekey นอก webroot
- [ ] permission/archivedguard ก่อน write และระหว่าง finalize
- [ ] atomicDBmetadata/filemove กับ recoverycleanup

**เกณฑ์รับงาน:** files ปลอม/extension ต้องห้าม/pathtraversal ถูกปฏิเสธ;partialfail ไม่ทิ้งไฟล์ไม่ติดตาม

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-042 — Upload quota reservation และ cleanup

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** quota reservation พร้อมกันและ crash recovery

**Depends on:** T-041, T-007  
**Trace:** FR-28, NFR-03 · **SRS:** §9.5, §13.2  
**Acceptance:** AT-22

- [ ] persistreservation ก่อน stream และตรวจ bytes รวม5GiB
- [ ] paralleluploads ไม่เกิน quota;failrelease
- [ ] นับ storedsoftdeletedfiles ตาม resolvedretention
- [ ] cleanupreservation/temp หลัง crash โดยไม่ลบ referencedfiles

**เกณฑ์รับงาน:** quota race ผ่านและ startuprecover พื้นที่ถูกต้อง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-043 — Authorized download และ file delete

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ตรวจสิทธิ์ download/delete/restore และ retention

**Depends on:** T-042, T-011, T-040  
**Trace:** FR-05, FR-28, NFR-02 · **SRS:** §9.5  
**Acceptance:** AT-05, AT-08, AT-22, AT-30

- [ ] download ตรวจ projectcurrentaccess ทุก request
- [ ] attachmentheaders/nosniff ไม่ inlineexecutable
- [ ] Uploader/Admin/ownerLeadsoftdelete และ restore30 วันตาม SRS;พื้นที่นับจน purge
- [ ] missingdiskfile เป็น404/logrequestId ไม่เผย path
- [ ] no public static URL/uploadsroute

**เกณฑ์รับงาน:** เดา fileID ข้าม project ไม่ได้และผู้หมดสิทธิ์ download ใหม่ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-044 — Comments/files/history panels

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-032, T-039, T-040, T-043  
**Trace:** FR-27, FR-28, FR-29 · **SRS:** §11  
**Acceptance:** AT-21, AT-22

- [ ] commentform/pagination plaintext และ dirtydraft
- [ ] uploadprogress/size/type/quotaerror;authorizeddownload
- [ ] softdelete/restore file confirmation ตาม uploaderpermission
- [ ] historybefore/after ผู้ทำเวลาไทยและ read-only

**เกณฑ์รับงาน:** ฟังก์ชันร่วมงานครบผ่าน UI;error แสดงคงพอให้อ่าน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 12. Phase 07: มุมมองงาน ปฏิทิน และแจ้งเตือน

### T-045 — งานของฉันและ task list UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-031, T-032, T-033  
**Trace:** FR-19, FR-20, FR-24 · **SRS:** §9.2, §11  
**Acceptance:** AT-15, AT-19

- [ ] assignee=selfdefault;created-by-me แยก view
- [ ] วันนี้/overdue/future/nodue และ due-dateBangkok
- [ ] filters/sort/page/search debounce ตาม API
- [ ] listcolumns ครบและ taskdetail/statusmenu

**เกณฑ์รับงาน:** งานของฉันไม่รวมงานที่สร้างให้คนอื่นโดยเงียบ;pagination ไม่ตกข้อมูล

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-046 — Month calendar และ no-due list

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-045, T-031  
**Trace:** FR-25 · **SRS:** §9.3  
**Acceptance:** AT-15, AT-19

- [ ] monthprev/next/today และ filterscope
- [ ] duedate-onlyitem ไม่ durationbar ไม่ drag
- [ ] คลิกงาน opendetail และ no-duelist แยก
- [ ] inclusiveboundary ตาม Bangkok ไม่ UTCshift

**เกณฑ์รับงาน:** calendar/list ใช้ filter เดียวกันให้งานตรงกัน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-047 — Shared refresh และ dirty draft preservation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** polling/session/conflict โดยรักษาร่างผู้ใช้

**Depends on:** T-045, T-046, T-044, T-038, T-017  
**Trace:** FR-26 · **SRS:** §9.6  
**Acceptance:** AT-20

- [ ] visibleonlinetabpoll≤10s;focusrequest ทันที
- [ ] stoppoll เมื่อ hidden/offline/logout
- [ ] changedatabadge แจ้งว่ามีข้อมูลเปลี่ยน โดยไม่แทน dirtyform
- [ ] accessremoved ปิดหน้าที่ไม่มีสิทธิ์และ clearclientdata
- [ ] poll ไม่ต่อ sessionidle;intentionalinteraction เท่านั้น

**เกณฑ์รับงาน:** คนอื่นแก้แล้วเห็นในเวลาที่กำหนดโดย draft ไม่หาย

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-048 — Notification event dispatch

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** event dispatch ต้องไม่ซ้ำและไม่รั่วข้อมูล

**Depends on:** T-022, T-027, T-039, T-029, T-040  
**Trace:** FR-30 · **SRS:** §9.6  
**Acceptance:** AT-23

- [ ] assignment ให้ผู้รับใหม่;comment/status ให้ creator/assignee
- [ ] ไม่แจ้ง self/inactive/noaccess
- [ ] transaction กับ event/task;dedupekeys
- [ ] unassignpermissioncleanup แจ้ง ownerAdmin/Lead

**เกณฑ์รับงาน:** recipients ตาม SRS และไม่มีเนื้อหาถึงคนหมดสิทธิ์

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-049 — Due reminder scheduler

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** เวลา reminder, deduplication และ restart

**Depends on:** T-048, T-008, T-006  
**Trace:** FR-30, NFR-03 · **SRS:** §9.6, §13.2  
**Acceptance:** AT-23

- [ ] 60sjob สำหรับ tomorrow/today/overdueBangkok
- [ ] skipdone/deleted/archived/unassigned/inactive/noaccess
- [ ] dedupe(task,recipient,type,date)DBunique
- [ ] startup เฉพาะ reminder ปัจจุบันไม่ย้อนหลังทุกวัน
- [ ] GET API ไม่สร้าง notification ธุรกิจ

**เกณฑ์รับงาน:** restart/paralleljob ไม่แจ้งซ้ำวันเดียว;ไม่พึ่งเว็บเปิดเพื่อบันทึก reminder

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-050 — Notification list/read-one/read-all

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** notification access และ read-all concurrency

**Depends on:** T-048, T-049, T-011  
**Trace:** FR-31 · **SRS:** §9.6  
**Acceptance:** AT-23

- [ ] own-recipientaccess รวม currentparentaccess
- [ ] pagination50/unreadcount/read_at
- [ ] read-one/read-all ไม่แก้ของผู้อื่น
- [ ] retention90day ผ่าน job ไม่แอบ mutate จาก GET

**เกณฑ์รับงาน:** IDs ที่เดาของคนอื่นอ่าน/เปลี่ยน read ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-051 — Notification center และ badge

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-050, T-047  
**Trace:** FR-30, FR-31 · **SRS:** §11  
**Acceptance:** AT-23

- [ ] unreadbadge/list/readone/readall
- [ ] เปิด task ได้เมื่อยังมี access;404closegracefully
- [ ] pollrefresh โดยไม่เขียน notification ซ้ำ
- [ ] ระบุแจ้งภายในเว็บไม่มี email/push เมื่อปิดเว็บ

**เกณฑ์รับงาน:** notificationflow ครบจาก assignment ถึง readall

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 13. Phase 08: รายงาน CSV และ responsive

### T-052 — Report aggregates และนิยามตัวเลข

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ตัวเลขรายงานต้องตรงนิยามและสิทธิ์

**Depends on:** T-031, T-027, T-011  
**Trace:** FR-32, FR-33 · **SRS:** §10  
**Acceptance:** AT-24

- [ ] totalstatussum/overdue/unassigned/doneperiod/completionpct/workload
- [ ] team=ownerteam person=assignee ไม่ใช้ทีมคนรับ
- [ ] datebasiscreated/due/completed และ localinterval→UTC
- [ ] reopen ล้าง completion และ zero-total ไม่ NaN
- [ ] aggregatequeryscoped ก่อนคำนวณ

**เกณฑ์รับงาน:** metric นิยามตรง SRS และตัวเลขไม่รวม hidden/archived/deleted

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-053 — CSV export ตาม filter/access

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** CSV scope และ formula injection

**Depends on:** T-052  
**Trace:** FR-34 · **SRS:** §10  
**Acceptance:** AT-24, AT-05

- [ ] sharedfilter กับ reports/list;UTF8BOM/RFC4180
- [ ] ครบ specifiedcolumns ไม่ exportcomment/files/password
- [ ] formula-neutralization รวม leadingwhitespace/tab/CR
- [ ] streamexport ไม่ติด page50;cap50000 แจ้งไม่ตัดเงียบ

**เกณฑ์รับงาน:** ไทย/quote/newline/formula test ผ่านและ rows ตรง filterscope

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-054 — Dashboard/report และ export UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-052, T-053, T-051  
**Trace:** FR-32, FR-33, FR-34 · **SRS:** §10–11  
**Acceptance:** AT-24

- [ ] scopepickerteam/project/person และ datebasis/range
- [ ] metriclabels และ zerostate;workloadtable
- [ ] CSVlink ใช้ filter เดียวกับที่เห็น
- [ ] ไม่แสดง quality/productivityranking ที่ไม่มีข้อมูลจริง

**เกณฑ์รับงาน:** ผู้ใช้ตรวจความหมายและฐานวันที่ของตัวเลขได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-055 — Responsive และ accessible interaction review

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-054, T-037, T-024, T-018, T-044  
**Trace:** FR-23, FR-35, NFR-05, NFR-06 · **SRS:** §11, §13.1  
**Acceptance:** AT-18, AT-26

- [ ] ทุก screeninventory ที่360px/tablet/desktop/200%zoom
- [ ] keyboard/focuslabels/modaldialog/escape/returnfocus
- [ ] ไม่สื่อ status ด้วยสีอย่างเดียว;touchmenualternative
- [ ] ทดสอบ controls ไม่ล้น/ข้อความไทยไม่ทับ

**เกณฑ์รับงาน:** มี reviewevidence ทุกหน้าจอหลักและไม่มี blockingaccessibilitydefect

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 14. Phase 09: PWA / offline / browser

### T-056 — PWA manifest/icons/service worker

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-012, T-006  
**Trace:** FR-36 · **SRS:** §9.6  
**Acceptance:** AT-26

- [ ] manifestname/start_url/scope/icons และ installbehavior
- [ ] cacheversioningstaticassets เท่านั้น
- [ ] ไม่ cacheAPI/login/file/users/tasks หรือ authresponse
- [ ] HTTPS/localrequirements ชัดไม่สัญญา nativeapp

**เกณฑ์รับงาน:** SWroutingtests ยืนยันไม่มี sensitive response ใน cache

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-057 — Offline/reconnect/logout cache behavior

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** cache/logout ต้องไม่เผยข้อมูลผู้ใช้เก่า

**Depends on:** T-056, T-047, T-055  
**Trace:** FR-35, FR-36 · **SRS:** §9.6, §11  
**Acceptance:** AT-26

- [ ] offlinebanner/shell ต้อง online ไม่มี writequeue
- [ ] reconnectrefreshauthoritative ข้อมูลก่อนเปิด write
- [ ] logout ล้าง in-memoryuserdata ไม่ดึง cachedteamdata กลับ
- [ ] SWupdate ไม่ล้าง dirtydraft หรือบังคับ reload กลาง edit

**เกณฑ์รับงาน:** offline/logout ไม่มีข้อมูลทีมหลงใน persistentcache

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-058 — Browser matrix และ PWA/touch QA

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-057, T-037  
**Trace:** FR-23, FR-35, FR-36, NFR-05, NFR-06 · **SRS:** NFR-06, §14  
**Acceptance:** AT-18, AT-26

- [ ] recordversionChrome/Edge/Firefox/Safaricurrent+previous ณทดสอบ
- [ ] desktop/touchkeyboarddrag/menu/upload/dialog
- [ ] ติดตั้ง PWA เมื่อ browser รองรับและ fallback เมื่อไม่รองรับ
- [ ] markNOT_RUN ถ้าไม่มี device จริง ไม่ตีว่า emulation แทนทุกอย่าง

**เกณฑ์รับงาน:** browser/device ผลตรวจครบหรือ blocked ชัด

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 15. Phase 10: Operations / backup / Windows handoff

### T-059 — Health endpoints และ operational logs

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-006, T-009, T-040  
**Trace:** FR-39, NFR-02, NFR-07 · **SRS:** §13.1–13.2  
**Acceptance:** AT-28, AT-30

- [ ] livepublicstatusonly;readylocal/proxyrestricted
- [ ] DB/storagechecks และ requestIdstructuredlog
- [ ] secretredaction/requestbody ไม่ logpassword/upload
- [ ] logrotation และ Adminauditlinkederrors

**เกณฑ์รับงาน:** readinessfail ชัดและ public ไม่มี DBpath/versionsecrets

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-060 — Retention jobs และ orphan recovery

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** purge, tombstone และ orphan recovery

**Depends on:** T-030, T-042, T-050, T-010, T-002  
**Trace:** FR-17, FR-28, FR-31, FR-39, NFR-03, NFR-07 · **SRS:** §8.4, §13.2  
**Acceptance:** AT-13, AT-22

- [ ] purge30day พร้อม audit ก่อนลบ parent
- [ ] notification90day/session/idempotencyexpirycleanup
- [ ] recurrence tombstone ไม่หายตาม resolveddesign
- [ ] orphanfile/temp/reservationstartupscan ไม่ลบ referenced
- [ ] failedfilesystemcleanupretry/log ไม่ claim ครบ

**เกณฑ์รับงาน:** crash/purge/restarttests ไม่มีข้อมูลหรือพื้นที่ค้างที่ไม่ติดตาม

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-061 — Write freeze และ job coordination

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** write freeze กับ uploads/jobs ต้องประสานกัน

**Depends on:** T-059, T-060  
**Trace:** FR-38, FR-39 · **SRS:** §13.4  
**Acceptance:** AT-25

- [ ] maintenance หยุด writes/jobs และรอ activeupload/request
- [ ] อ่านได้ตาม mode ที่คู่มือระบุไม่ halfstate
- [ ] singleinstance/maintenanceownership และ safeunlockfail
- [ ] statevisible ให้ผู้ใช้รู้กำลังสำรอง

**เกณฑ์รับงาน:** snapshotfreeze ไม่มี writes แทรกและ failure ไม่ค้างระบบโดยไม่แจ้ง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-062 — Consistent backup script และ manifest

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** SQL backup และ uploads เป็น snapshot คู่กัน

**Depends on:** T-061, T-007, T-043  
**Trace:** FR-38, NFR-04, NFR-07 · **SRS:** §13.4  
**Acceptance:** AT-25

- [ ] SQL Server BACKUP DATABASE WITH COPY_ONLY, CHECKSUM (.bak) + upload snapshot ภายใต้ freeze; ตรวจสิทธิ์ SQL service account บน backup path
- [ ] manifestapp/schema/date/filecount/SHA256
- [ ] exitnonzero เมื่อ fail และปลด freeze อย่างปลอดภัย
- [ ] ไม่รวม plaintext.envsecrets ในชุดแชร์;backupstorageaccessprivate
- [ ] WindowsTaskSchedulerexample7daily/4weekly และ copy อีก location

**เกณฑ์รับงาน:** restore-readybackup ที่ checksum ตรง;ไม่ใช่ copyDB อย่างเดียว

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-063 — Restore/verification script และ rollback

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** actual restore, session revoke และ rollback

**Depends on:** T-062, T-014  
**Trace:** FR-38, FR-40, NFR-03, NFR-04, NFR-07 · **SRS:** §13.4–13.5  
**Acceptance:** AT-25

- [ ] stopapp ตรวจ manifest/hashes/schema ก่อน overwrite
- [ ] RESTORE DATABASE ลง isolated target + files คู่กัน; ตรวจ schema compatibility; VERIFYONLY ไม่แทน actual restore; ไม่ overwrite DB อื่นโดย default
- [ ] revokesessions ทั้งหมดหลัง restore
- [ ] verifypermissions/taskcounts/filedownload และ health
- [ ] recordRPO/RTO จากจริงไม่จากค่าคาด

**เกณฑ์รับงาน:** กู้ลง cleaninstance ได้ครบและ sessions เก่าใช้ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-064 — Migration upgrade และ recovery procedure

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** migration failure และกู้คืนโดยไม่สูญข้อมูล

**Depends on:** T-063, T-007  
**Trace:** FR-40, NFR-07 · **SRS:** §13.5  
**Acceptance:** AT-25, AT-28

- [ ] preupgradebackup/runtime/schema compatibility
- [ ] migrationrepeat-safe/checksumguard
- [ ] app/schemarollbackpath และ noauto-downgradeunsafe
- [ ] fixtureupgradeexistingdata รักษา users/tasks/files

**เกณฑ์รับงาน:** อัปเดตรุ่นทดสอบแล้ว data/history คง;rollback ใช้ backup ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-065 — Windows scripts และ installation guide

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-064, T-006, T-059, T-019  
**Trace:** FR-37, FR-39, FR-40, NFR-07, NFR-08 · **SRS:** §3, §13.5  
**Acceptance:** AT-28

- [ ] runtime/start/serviceaccount/dataACL และ start-on-reboot
- [ ] IIS/reverseproxy/HTTPS/exactorigin/trustedproxy คู่มือ
- [ ] backupTaskScheduler/logrotation/update/restore ขั้นตอน
- [ ] ระบุ ControlPanelunknown ไม่ claim รองรับ;freshinstalltest เมื่อมี Windows

**เกณฑ์รับงาน:** codepack มีขั้นตอน Windows ที่ตรวจซ้ำได้;server จริงยัง deploy โดยผู้ใช้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-066 — คู่มือ Admin/Lead/Member และ developer handoff

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-065, T-054, T-058  
**Trace:** FR-40 · **SRS:** §11, §13.5  
**Acceptance:** AT-28

- [ ] roles/workflows/setup/temp-password/reset/memberaccess
- [ ] Kanbanfilter/reorder/conflict/recurrence/monthlyanchor
- [ ] filequota/archived/trash/notification/PWAlimitations
- [ ] developerAPI/architecture/config/migration/testcommands

**เกณฑ์รับงาน:** ผู้ใช้ใหม่ตามคู่มือทำ workflow หลักได้โดยไม่ถามผู้พัฒนา

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 16. Phase 11: Testing และ UAT

### T-067 — Complete test fixtures และ automated harness

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** fixtures/harness SQL Server จริงและ isolation

**Depends on:** T-004, T-007, T-011  
**Trace:** FR-40 · **SRS:** §14  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] A/L1/L2/M1/M2/V/P1/P2/Pshared/Pprivate ตาม SRS
- [ ] freshdb isolated reset/timeclockBangkok controllable
- [ ] integrationrequestwithcookies/CSRF/origin/keys
- [ ] แยก seedperformance จาก UAT/production

**เกณฑ์รับงาน:** test รันซ้ำได้ไม่ใช้ข้อมูลจริงและผลไม่ขึ้นกับวันที่ปัจจุบัน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-068 — ทดสอบ setup/auth/users และ session edges

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบ session/security และ auth edge cases

**Depends on:** T-067, T-018, T-017, T-019  
**Trace:** FR-01, FR-02, FR-03, FR-04, NFR-02 · **SRS:** §6, §14  
**Acceptance:** AT-01, AT-02, AT-03, AT-04

- [ ] AT01–04 รวม setup/adminconcurrentlastguard
- [ ] idle/absoluteexpiration/pollnotkeepalive
- [ ] passwordreset/rolechange/deactivate revoke
- [ ] noplaintext/passwordleak และ CLIrecoveryaudit

**เกณฑ์รับงาน:** ผล AT01–04 และ sessionextendedcasesPASS พร้อม evidence

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-069 — ทดสอบสิทธิ์ข้ามทีมและ revocation ทุกช่องทาง

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบสิทธิ์ข้ามทีมและถอนสิทธิ์ทุกช่องทาง

**Depends on:** T-067, T-022, T-043, T-053, T-050, T-024  
**Trace:** FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, NFR-02 · **SRS:** §4, §7, §14  
**Acceptance:** AT-05, AT-06, AT-07, AT-08, AT-29, AT-30

- [ ] allow/denyrole/resourceendpointmatrix
- [ ] searchcounts/reportCSV/notification/fileIDOR
- [ ] cross-teamEditor/Viewer/team-onlynoaccess
- [ ] archivedwrites/revokeopen-tab/requestnewdenied
- [ ] CSRF/noOrigin/spoofproxy/SQLi/XSS ตาม AT30

**เกณฑ์รับงาน:** ไม่มีข้อมูลรั่วและ AT05–08/29/30PASS

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-070 — ทดสอบงาน งานซ้ำ การลบ และแก้พร้อมกัน

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบ recurrence, purge และ concurrent writes

**Depends on:** T-067, T-033, T-060, T-027  
**Trace:** FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, NFR-03 · **SRS:** §8, §14  
**Acceptance:** AT-09, AT-10, AT-11, AT-12, AT-13, AT-14

- [ ] validation/nullassignee/Viewernoteligible
- [ ] checklistclosedguard/completion/reopen
- [ ] monthlyanchor/leapyear/overdueone-successor
- [ ] retry/concurrentdone/rollbackfailure
- [ ] softdelete/restore/purgeseries/filecleanup

**เกณฑ์รับงาน:** AT09–14PASS ไม่มี duplicate หรือ halftransaction

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-071 — ทดสอบ Kanban/list/calendar และ refresh

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-067, T-038, T-045, T-046, T-047, T-058  
**Trace:** FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25, FR-26, NFR-05, NFR-06 · **SRS:** §9.1–9.3, §14  
**Acceptance:** AT-15, AT-16, AT-17, AT-18, AT-19, AT-20

- [ ] Bangkokmidnight/null-due/filter/pagination
- [ ] persistdrag/crosscolumn/incolumn/doneguard
- [ ] samecolumnconcurrent/timeout/403/409/offline
- [ ] keyboardtouch/filterguard และ dirtydraft
- [ ] >500boardfallback ไม่ทำ order เพี้ยน

**เกณฑ์รับงาน:** AT15–20PASS ทั้ง API และ UI ที่ทดสอบได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-072 — ทดสอบ comments/files/audit/notifications

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบ file quota/recovery และ notification dedupe

**Depends on:** T-067, T-044, T-051, T-060  
**Trace:** FR-27, FR-28, FR-29, FR-30, FR-31, NFR-02, NFR-03 · **SRS:** §9.4–9.6, §14  
**Acceptance:** AT-21, AT-22, AT-23

- [ ] commentscript/doubleclick/auditimmutability
- [ ] 10MiBboundary/oversize/magicfake/pathtraversal
- [ ] quotarace/fileDBpartial/crashcleanup
- [ ] recipientself/noaccess/readothers/reminderdedupe
- [ ] 90daycleanup และ readallscope

**เกณฑ์รับงาน:** AT21–23PASS;attachmentallowlist ไม่อ้างว่า antivirus

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-073 — ทดสอบรายงาน CSV และ PWA

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-067, T-054, T-057  
**Trace:** FR-32, FR-33, FR-34, FR-35, FR-36 · **SRS:** §10, §9.6, §14  
**Acceptance:** AT-24, AT-26

- [ ] datesbasismetricreopen/zero/ownerteam
- [ ] CSVthai/formula/newline/allrowsnotpage50
- [ ] SWcacheAPI/file/loginabsence
- [ ] offline/logout/reconnectdirtyform

**เกณฑ์รับงาน:** AT24/26PASS โดยตรวจ generatedCSV และ cache จริง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-074 — ทดสอบ restart/backup/restore/migration และ Windows

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบ restore/migration/restart บน Windows

**Depends on:** T-067, T-063, T-064, T-065, T-059  
**Trace:** FR-37, FR-38, FR-39, FR-40, NFR-03, NFR-04, NFR-07 · **SRS:** §13.4–13.5, §14  
**Acceptance:** AT-25, AT-28

- [ ] writesduringbackupfreeze และ fileschecksum
- [ ] cleanrestore/sessionrevocation/restartpersist
- [ ] startuporphans/migrationrollback/errorlogging
- [ ] freshZIPinstall บน Windows เมื่อมี environment
- [ ] ถ้าไม่มี Windows ให้ BLOCKED/NOT_RUN ไม่ใช้ Linux ผลแทน

**เกณฑ์รับงาน:** AT25 ผ่านจริง;AT28 มีผล Windows หรือระบุ blocker และวิธีตรวจที่เหลือ

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-075 — Load/performance test 30 users

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** วิเคราะห์ load, SQL locks และ bottlenecks

**Depends on:** T-067, T-031, T-052, T-035, T-041  
**Trace:** FR-26, NFR-01 · **SRS:** §13.3  
**Acceptance:** AT-27

- [ ] seed30users/6teams/20projects/10000tasks/20000comments
- [ ] 15activesessions10minutes70/30 และ warmup
- [ ] recordreadp95≤2s/writep95≤3s/error<1%/poll≤10s
- [ ] DBbusy/reorderconcurrency/CSVmemory/startupmeasure
- [ ] บันทึก OS/runtime/spec/version และ excludederrors

**เกณฑ์รับงาน:** AT27 รายงานผลจริง;fail แก้ query/index แล้วทดสอบเฉพาะเหตุที่เหลือ

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-076 — UAT และ acceptance sign-off record

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-068, T-069, T-070, T-071, T-072, T-073, T-074, T-075  
**Trace:** FR-40, NFR-01, NFR-02, NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-08 · **SRS:** §14–16  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] รวม AT01–30 พร้อม PASS/FAIL/BLOCKED/NOT_RUN และหลักฐาน
- [ ] เดิน journey เริ่มองค์กร/ทำงาน/ข้ามทีม/ลาก fail
- [ ] triagedefectseverity และ retest สิ่งที่แก้
- [ ] บันทึกผู้ review/date/baselineversion;ไม่ tick ผ่านแทนผู้ใช้

**เกณฑ์รับงาน:** ไม่มี criticalopenissues;สิ่งยังไม่ทดสอบถูกระบุไม่อ้าง production-ready

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 17. Phase 12: Packaging และ release

### T-077 — Source ZIP และ release completeness audit

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ตรวจความครบถ้วน source และหลักฐาน release

**Depends on:** T-076, T-066  
**Trace:** FR-40, NFR-07, NFR-08 · **SRS:** §13.5, §16  
**Acceptance:** AT-28

- [ ] source/migrations/config/scripts/tests/README/license ครบ
- [ ] exclude.env/liveDB/uploads/logs/sessions/node_modules/testcredentials
- [ ] archiveinventory/checksum และ freshunzipquickstart
- [ ] coverageFR/NFR/BR/endpoint/screen/AT ทั้งหมดพร้อมหลักฐาน
- [ ] ส่งผู้ใช้ deploy เองไม่เผยแพร่หรือแก้ DNS

**เกณฑ์รับงาน:** releasechecklist ครบ;ZIP ไม่มี secret;pendingWindows/UAT ข้อใดต้องติด release notes

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

## 18. Functional Requirements Coverage

Task อ้างอิงแต่ละ FR ครบไม่ได้แปลว่า implementation ผ่านแล้ว ให้ใส่สถานะและหลักฐานเมื่อปิดงาน รายการที่อ้าง FR เดียวกันแยก implementation/UI/test เพื่อกันตกหล่น

| FR | ความต้องการ | Tasks | Evidence / Result |
|---|---|---|---|
| FR-01 | ตั้งผู้ดูแลคนแรก | T-013, T-068 | รอพัฒนา/ทดสอบ |
| FR-02 | เข้าสู่ระบบและออกจากระบบ | T-014, T-017, T-068 | รอพัฒนา/ทดสอบ |
| FR-03 | จัดการผู้ใช้ | T-016, T-018, T-068 | รอพัฒนา/ทดสอบ |
| FR-04 | เปลี่ยนและรีเซ็ตรหัสผ่าน | T-014, T-015, T-016, T-017, T-018, T-019, T-068 | รอพัฒนา/ทดสอบ |
| FR-05 | บังคับสิทธิ์ทุกช่องทาง | T-003, T-009, T-011, T-043, T-069 | รอพัฒนา/ทดสอบ |
| FR-06 | สร้างและจัดการหลายทีม | T-020, T-023, T-069 | รอพัฒนา/ทดสอบ |
| FR-07 | สมาชิกอยู่หลายทีม | T-020, T-023, T-069 | รอพัฒนา/ทดสอบ |
| FR-08 | ตั้งหัวหน้าทีม | T-020, T-023, T-069 | รอพัฒนา/ทดสอบ |
| FR-09 | จัดการโปรเจกต์ | T-021, T-024, T-069 | รอพัฒนา/ทดสอบ |
| FR-10 | กำหนดสมาชิกโปรเจกต์ | T-011, T-021, T-024, T-069 | รอพัฒนา/ทดสอบ |
| FR-11 | ถอนสิทธิ์และปิดบัญชี | T-011, T-022, T-024, T-069 | รอพัฒนา/ทดสอบ |
| FR-12 | สร้างและแก้ไขงาน | T-026, T-032, T-070 | รอพัฒนา/ทดสอบ |
| FR-13 | มอบหมายงาน | T-022, T-026, T-032, T-070 | รอพัฒนา/ทดสอบ |
| FR-14 | จัดการสถานะและความสำคัญ | T-008, T-026, T-027, T-032, T-070 | รอพัฒนา/ทดสอบ |
| FR-15 | งานย่อย | T-002, T-027, T-028, T-033, T-070 | รอพัฒนา/ทดสอบ |
| FR-16 | งานซ้ำ | T-002, T-010, T-029, T-033, T-070 | รอพัฒนา/ทดสอบ |
| FR-17 | เก็บ ลบแบบกู้คืน และคืนงาน | T-002, T-030, T-033, T-060, T-070 | รอพัฒนา/ทดสอบ |
| FR-18 | รับมือแก้ไขพร้อมกัน | T-003, T-008, T-009, T-010, T-026, T-027, T-032, T-035, T-038, T-070 | รอพัฒนา/ทดสอบ |
| FR-19 | งานของฉัน | T-031, T-045, T-071 | รอพัฒนา/ทดสอบ |
| FR-20 | ค้นหา กรอง และจัดลำดับ | T-031, T-037, T-045, T-071 | รอพัฒนา/ทดสอบ |
| FR-21 | Kanban เปลี่ยนสถานะด้วยการลาก | T-010, T-034, T-035, T-036, T-038, T-071 | รอพัฒนา/ทดสอบ |
| FR-22 | Kanban จัดลำดับด้วยการลาก | T-034, T-035, T-036, T-071 | รอพัฒนา/ทดสอบ |
| FR-23 | ทางเลือกแทนการลาก | T-037, T-055, T-058, T-071 | รอพัฒนา/ทดสอบ |
| FR-24 | มุมมองรายการ | T-045, T-071 | รอพัฒนา/ทดสอบ |
| FR-25 | ปฏิทิน | T-046, T-071 | รอพัฒนา/ทดสอบ |
| FR-26 | อัปเดตการเปลี่ยนแปลงทีม | T-038, T-047, T-071, T-075 | รอพัฒนา/ทดสอบ |
| FR-27 | ความคิดเห็นในงาน | T-010, T-039, T-044, T-072 | รอพัฒนา/ทดสอบ |
| FR-28 | ไฟล์แนบ | T-002, T-041, T-042, T-043, T-044, T-060, T-072 | รอพัฒนา/ทดสอบ |
| FR-29 | ประวัติงาน | T-040, T-044, T-072 | รอพัฒนา/ทดสอบ |
| FR-30 | แจ้งเตือนภายในเว็บ | T-048, T-049, T-051, T-072 | รอพัฒนา/ทดสอบ |
| FR-31 | อ่านแจ้งเตือน | T-050, T-051, T-060, T-072 | รอพัฒนา/ทดสอบ |
| FR-32 | ภาพรวมองค์กร/ทีม/โปรเจกต์ | T-052, T-054, T-073 | รอพัฒนา/ทดสอบ |
| FR-33 | รายงานตามสมาชิกและช่วงเวลา | T-052, T-054, T-073 | รอพัฒนา/ทดสอบ |
| FR-34 | Export CSV | T-053, T-054, T-073 | รอพัฒนา/ทดสอบ |
| FR-35 | Responsive และภาษาไทย | T-012, T-017, T-037, T-055, T-057, T-058, T-073 | รอพัฒนา/ทดสอบ |
| FR-36 | PWA แบบออนไลน์ | T-056, T-057, T-058, T-073 | รอพัฒนา/ทดสอบ |
| FR-37 | ตั้งค่าระบบที่จำเป็น | T-006, T-025, T-065, T-074 | รอพัฒนา/ทดสอบ |
| FR-38 | สำรองและกู้คืน | T-061, T-062, T-063, T-074 | รอพัฒนา/ทดสอบ |
| FR-39 | สุขภาพระบบและ log | T-019, T-040, T-059, T-060, T-061, T-065, T-074 | รอพัฒนา/ทดสอบ |
| FR-40 | ชุดโค้ดติดตั้งเอง | T-003, T-004, T-005, T-006, T-007, T-019, T-063, T-064, T-065, T-066, T-067, T-074, T-076, T-077 | รอพัฒนา/ทดสอบ |

## 19. Non-functional Requirements Coverage

| NFR | Tasks | สิ่งที่ต้องตรวจ |
|---|---|---|
| NFR-01 | T-004, T-075, T-076 | 30 accounts / 15 active / p95 / polling บนสเปกที่บันทึก |
| NFR-02 | T-004, T-006, T-009, T-011, T-014, T-019, T-022, T-040, T-041, T-043, T-059, T-068, T-069, T-072, T-076 | server permissions / session / CSRF / upload / secret redaction |
| NFR-03 | T-004, T-007, T-008, T-010, T-022, T-027, T-029, T-030, T-035, T-041, T-042, T-049, T-060, T-063, T-070, T-072, T-074, T-076 | transaction / version / recurrence / DB-file consistency |
| NFR-04 | T-004, T-062, T-063, T-074, T-076 | backup จริง / restore จริง / RPO-RTO ที่วัด |
| NFR-05 | T-004, T-012, T-037, T-055, T-058, T-071, T-076 | keyboard / focus / touch alternative / 200% zoom |
| NFR-06 | T-004, T-012, T-037, T-055, T-058, T-071, T-076 | browser/device versions และ NOT_RUN เมื่อไม่มี device |
| NFR-07 | T-004, T-005, T-006, T-007, T-019, T-059, T-060, T-062, T-063, T-064, T-065, T-074, T-076, T-077 | config/migration/backup/Windows install/upgrade portability |
| NFR-08 | T-001, T-004, T-005, T-065, T-076, T-077 | ไม่มี mandatory subscriptions / license inventory / ไม่รวมต้นทุนเครื่อง |

## 20. Acceptance Test Coverage — 30 กรณี

ตารางนี้เป็น checklist สำหรับผลทดสอบ ไม่ใช่ผลที่รันแล้ว

| AT | กรณีต้นทาง | Tasks | Result | Evidence / Environment |
|---|---|---|---|---|
| AT-01 | เปิดระบบใหม่/setup token ผิด/ถูก/ใช้ซ้ำ | T-013, T-068 | NOT_RUN | — |
| AT-02 | Login ผิด, rate limit, logout, cookie reuse | T-014, T-017, T-068 | NOT_RUN | — |
| AT-03 | Admin สร้าง/reset user แล้วเรียก task API ก่อนเปลี่ยนรหัส | T-014, T-015, T-016, T-017, T-018, T-068 | NOT_RUN | — |
| AT-04 | demote/deactivate Admin คนสุดท้ายรวม concurrent requests | T-016, T-018, T-068 | NOT_RUN | — |
| AT-05 | M1 ดู Pprivate/P2 ผ่าน ID,search,report,CSV,fileURL | T-011, T-043, T-053, T-069 | NOT_RUN | — |
| AT-06 | เพิ่ม M1 หลายทีม/Lead เฉพาะทีม1 | T-020, T-023, T-069 | NOT_RUN | — |
| AT-07 | L1 เพิ่ม M2 ใน Pshared เป็น Editor และ V เป็น Viewer | T-011, T-021, T-024, T-069 | NOT_RUN | — |
| AT-08 | ถอน M2 จาก Pshared ขณะเปิด detail และมีงานค้าง | T-011, T-022, T-024, T-043, T-069 | NOT_RUN | — |
| AT-09 | สร้างงานข้อมูลผิด/ไม่มีผู้รับ/ผู้รับ Viewer/วันเริ่มเกินวันส่ง | T-026, T-032, T-070 | NOT_RUN | — |
| AT-10 | งาน checklist ไม่ครบ→done;ติ๊กครบ→done;untick ตอน done | T-002, T-027, T-028, T-033, T-070 | NOT_RUN | — |
| AT-11 | งานซ้ำ daily/weekly/monthly,Jan31→Feb→Mar | T-029, T-033, T-070 | NOT_RUN | — |
| AT-12 | done งานซ้ำพร้อมกัน/retry/reopen แล้ว done ใหม่ | T-002, T-010, T-029, T-070 | NOT_RUN | — |
| AT-13 | delete/restore/retentionpurge และ parentfiles | T-002, T-030, T-033, T-060, T-070 | NOT_RUN | — |
| AT-14 | สองคนแก้ task version เดียวกัน | T-026, T-027, T-032, T-070 | NOT_RUN | — |
| AT-15 | My tasks วันนี้/overdue/null และ Bangkok ใกล้เที่ยงคืน | T-031, T-045, T-046, T-071 | NOT_RUN | — |
| AT-16 | ลากข้ามคอลัมน์/จัดลำดับ/refresh | T-034, T-035, T-036, T-071 | NOT_RUN | — |
| AT-17 | boardmove ขณะ offline/403/409 และ samecolumnconcurrent | T-010, T-035, T-038, T-071 | NOT_RUN | — |
| AT-18 | filteredboard drag + keyboard/touchalternative | T-037, T-055, T-058, T-071 | NOT_RUN | — |
| AT-19 | tasklist/calendar มีวันส่ง/ไม่มีวันส่ง/filter หลายตัว | T-031, T-045, T-046, T-071 | NOT_RUN | — |
| AT-20 | คนอื่นแก้งานขณะ user มี dirtyform | T-032, T-038, T-047, T-071 | NOT_RUN | — |
| AT-21 | commentHTML/script/กดซ้ำ/ลองแก้ audit | T-010, T-039, T-040, T-044, T-072 | NOT_RUN | — |
| AT-22 | upload10MiB/เกิน/extension ปลอม/pathtraversal/quota race | T-002, T-041, T-042, T-043, T-044, T-060, T-072 | NOT_RUN | — |
| AT-23 | notificationassignment/comment/status/remindertwice/readone/all | T-048, T-049, T-050, T-051, T-072 | NOT_RUN | — |
| AT-24 | reportdatebasis/reopen/CSV ไทยและ formula | T-052, T-053, T-054, T-073 | NOT_RUN | — |
| AT-25 | backup ระหว่างมีงาน/restore เครื่องทดสอบ/restart | T-061, T-062, T-063, T-064, T-074 | NOT_RUN | — |
| AT-26 | เปิด PWAoffline/logout แล้วเปิด cache | T-055, T-056, T-057, T-058, T-073 | NOT_RUN | — |
| AT-27 | performancefixture/loadtest ตาม§13.3 | T-075 | NOT_RUN | — |
| AT-28 | freshWindowsinstall จาก ZIP/env/one-timesetup | T-006, T-019, T-025, T-059, T-064, T-065, T-066, T-074, T-077 | NOT_RUN | — |
| AT-29 | archivedproject ลองแก้ task/comment/upload/recur | T-021, T-024, T-069 | NOT_RUN | — |
| AT-30 | CSRF/noOrigin/spoofproxy/XSS/SQLi/fileIDOR | T-009, T-011, T-043, T-059, T-069 | NOT_RUN | — |

## 21. API Coverage — ทุก route ใน SRS §12.2

| Method / Route | Tasks ที่รับผิดชอบ |
|---|---|
| GET /api/meta | T-013, T-068 |
| POST /api/setup | T-013, T-068 |
| POST /api/login | T-014, T-017, T-068 |
| GET /api/me | T-014, T-017, T-068 |
| POST /api/session/activity | T-014, T-017, T-068 |
| POST /api/logout | T-014, T-017, T-068 |
| POST /api/password | T-015, T-017, T-068 |
| GET /api/users | T-016, T-018, T-068 |
| POST /api/users | T-016, T-018, T-068 |
| PATCH /api/users/{id} | T-016, T-018, T-068 |
| POST /api/users/{id}/reset-password | T-015, T-016, T-018, T-068 |
| GET /api/directory | T-021, T-024, T-069 |
| GET /api/teams | T-020, T-023, T-069 |
| POST /api/teams | T-020, T-023, T-069 |
| PATCH /api/teams/{id} | T-020, T-023, T-069 |
| PUT /api/teams/{id}/members/{userId} | T-020, T-023, T-069 |
| DELETE /api/teams/{id}/members/{userId} | T-020, T-023, T-069 |
| GET /api/projects | T-021, T-024, T-022, T-069 |
| POST /api/projects | T-021, T-024, T-022, T-069 |
| PATCH /api/projects/{id} | T-021, T-024, T-022, T-069 |
| GET /api/projects/{id}/members | T-021, T-024, T-022, T-069 |
| PUT /api/projects/{id}/members/{userId} | T-021, T-024, T-022, T-069 |
| DELETE /api/projects/{id}/members/{userId} | T-021, T-024, T-022, T-069 |
| GET /api/tasks | T-031, T-045, T-046, T-071 |
| POST /api/tasks | T-026, T-027, T-032, T-070 |
| GET /api/tasks/{id} | T-026, T-027, T-032, T-070 |
| PATCH /api/tasks/{id} | T-026, T-027, T-032, T-070 |
| DELETE /api/tasks/{id} | T-030, T-033, T-070 |
| GET /api/trash | T-030, T-033, T-070 |
| POST /api/tasks/{id}/restore | T-030, T-033, T-070 |
| GET /api/projects/{id}/board | T-034, T-036, T-071 |
| POST /api/projects/{id}/board/move | T-035, T-036, T-037, T-038, T-071 |
| POST /api/tasks/{id}/subtasks | T-028, T-033, T-070 |
| PATCH /api/subtasks/{id} | T-028, T-033, T-070 |
| DELETE /api/subtasks/{id} | T-028, T-033, T-070 |
| GET /api/tasks/{id}/comments | T-039, T-044, T-072 |
| POST /api/tasks/{id}/comments | T-039, T-044, T-072 |
| GET /api/tasks/{id}/attachments | T-043, T-044, T-072 |
| POST /api/tasks/{id}/attachments | T-041, T-042, T-044, T-072 |
| GET /api/attachments/{id}/download | T-043, T-044, T-072 |
| DELETE /api/attachments/{id} | T-043, T-044, T-072 |
| POST /api/attachments/{id}/restore | T-043, T-044, T-072 |
| GET /api/tasks/{id}/events | T-040, T-044, T-072 |
| GET /api/notifications | T-050, T-051, T-072 |
| POST /api/notifications/{id}/read | T-050, T-051, T-072 |
| POST /api/notifications/read-all | T-050, T-051, T-072 |
| GET /api/reports/summary | T-052, T-054, T-073 |
| GET /api/export/tasks.csv | T-053, T-054, T-073 |
| GET /api/organization | T-025, T-074 |
| PATCH /api/organization | T-025, T-074 |
| GET /health/live | T-059, T-074 |
| GET /health/ready | T-059, T-074 |

## 22. Screen Coverage — ทุกหน้าใน SRS §11

| Screen | Implementation tasks | Integration/UAT |
|---|---|---|
| Setup | T-013 | T-068 |
| Login | T-017 | T-068 |
| Forced password change | T-017, T-015 | T-068 |
| My tasks | T-045, T-047 | T-071 |
| Project board | T-036, T-037, T-038 | T-071 |
| Task detail | T-032, T-033, T-044 | T-070, T-072 |
| Task list | T-045, T-031 | T-071 |
| Calendar | T-046 | T-071 |
| Reports | T-054, T-053 | T-073 |
| Notifications | T-051 | T-072 |
| Teams | T-023 | T-069 |
| Projects | T-024 | T-069 |
| Admin users | T-018 | T-068 |
| Trash | T-033, T-030 | T-070 |
| Profile/settings | T-017, T-025 | T-068, T-074 |

## 23. Business Rules Coverage — BR-01–BR-18

| BR | Tasks |
|---|---|
| BR-01 | T-013, T-014, T-016 |
| BR-02 | T-016, T-068 |
| BR-03 | T-020, T-023, T-069 |
| BR-04 | T-011, T-021, T-069 |
| BR-05 | T-021, T-022, T-069 |
| BR-06 | T-026, T-003, T-070 |
| BR-07 | T-026, T-022, T-070 |
| BR-08 | T-008, T-026, T-071 |
| BR-09 | T-008, T-045, T-049, T-052, T-071 |
| BR-10 | T-027, T-036, T-070 |
| BR-11 | T-028, T-027, T-070 |
| BR-12 | T-029, T-070 |
| BR-13 | T-035, T-037, T-071 |
| BR-14 | T-021, T-027, T-039, T-041, T-069 |
| BR-15 | T-022, T-069 |
| BR-16 | T-011, T-050, T-052, T-053, T-069 |
| BR-17 | T-027, T-052, T-073 |
| BR-18 | T-039, T-040, T-044, T-072 |

## 24. NFR และกรณีเสริมที่ต้องไม่ตกหล่น

- [ ] session idle/absolute expiry และ poll ไม่ทำให้บัญชีค้างล็อกอินไม่จำกัด
- [ ] role/membership revoke กับ URL/API/file/notification/export ไม่ตรวจแค่เมนู
- [ ] task/column version เปลี่ยนจากทุกแหล่ง รวมสร้าง ลบ restore และ form status change
- [ ] recurrence เมื่อ leap year, month anchor, retry, reopen, purge และ crash
- [ ] update ไม่เขียนทับ dirty draft และ network timeout ไม่สร้าง/ย้ายซ้ำ
- [ ] quota reservation concurrency, DB-file partial failure, missing file และ orphan recovery
- [ ] archived/deleted resources อ่านหรือแก้ได้ตามกติกาในทุก subresource
- [ ] PWA ไม่เก็บข้อมูลทีม/API/download และ logout/reconnect ไม่คืน sensitive cache
- [ ] CSV formula injection รวม leading whitespace และ export ไม่เหลือแค่หน้าแรก
- [ ] DB busy/transaction failure/backup maintenance/readiness ใช้ error contract ชัดเจน
- [ ] log/audit/package ไม่มี password/raw token/setup secret/ข้อมูลจริง
- [ ] migrations/upgrade/rollback/restore ทดสอบกับข้อมูลที่มีอยู่ ไม่ทดสอบแค่ DB ว่าง
- [ ] PWA installation และ Windows deployment มีผล environment จริงหรือ NOT_RUN/BLOCKED

## 25. Release Checklist ที่ต้องตรวจทุกครั้ง

- [ ] T-001/T-002 ปิด baseline issues; version เอกสาร/โค้ด/manifest ตรงกัน
- [ ] Functional Requirements 40 ข้อมี implementation + UI + test/evidence ตามจำเป็นครบ
- [ ] NFR 8 ข้อ, Business Rules 18 ข้อ, API 52 routes และ Screen 15 หน้ามีเจ้าของและผลตรวจ
- [ ] AT-01–AT-30 มีผลจริงครบ; critical failure ไม่ถูกซ่อนด้วย DEFERRED
- [ ] Endpoint/Screen ที่มีใน SRS ไม่เป็นเพียง placeholder หรือ mock-only
- [ ] backup/restore ที่ consistent ผ่านจริง และข้อมูลยังอยู่หลัง restart
- [ ] ตรวจ package inventory/secret scan/fresh unzip และ README ทำตามได้
- [ ] license/dependency/configuration ครบ ไม่มีบริการ AI/SMTP/paid subscription บังคับ
- [ ] ไม่มีการ publish/DNS/Server changes เพราะผู้ใช้ deploy เอง
- [ ] ระบุ known limitations, Windows/browser/UAT ที่ยัง NOT_RUN และงานแก้ไขต่ออย่างตรงไปตรงมา

## 26. วิธีสั่ง Codex/Claude Code ให้ทำทีละ Task

ใช้ข้อความนี้ร่วมกับเอกสารทั้งสามไฟล์ โดยแทน T-xxx เป็นงานที่จะทำ:

> อ่าน TeamFlow_Requirements_v1.0.md, TeamFlow_SRS_v1.0.md และ TeamFlow_Task_v1.0.md แล้วทำ T-xxx ปฏิบัติตามกฎการใช้ token/การรายงานผลใน §4: ตอบสั้น ชัดเจน ไม่แสดงรายละเอียดซ้ำ; อธิบายเพิ่มเมื่อผู้ใช้ถาม ใช้ GPT-6.1 Sol / Standard และ effort ของ Task ตาม Task Register (default Medium; งานที่กำหนด High ต้องเลือก High ก่อนเริ่ม) หากเปลี่ยนค่า model/effort ด้วยตนเองไม่ได้ ให้แจ้งค่าที่ผู้ใช้ต้องเลือกและอย่าอ้างว่าเปลี่ยนแล้ว ตรวจว่า dependency และ baseline decisions พร้อมก่อนเริ่ม ทำ checklist กับเกณฑ์รับงานให้ครบ ใช้ permissions/API/data contracts ของ SRS และรันการตรวจเฉพาะที่เกี่ยวข้อง อัปเดต Task Register ด้วยไฟล์/commit/ผลทดสอบและ blocker ห้ามติ๊ก DONE จากการอ่าน code อย่างเดียว ห้ามข้าม acceptance test ห้ามเพิ่ม scope ที่ excluded และห้าม deploy เพราะเจ้าของระบบจะ deploy เอง

เมื่อทำหลาย Task ในครั้งเดียว ระบุรายการชัดเจนและยังปิดหลักฐานราย Task ไม่ใช้คำว่า “ทำครบแล้ว” แทน traceability

## 27. Source Fingerprint และ Change Log

Fingerprint ใช้ระบุข้อความต้นทางที่นำมาแตกงาน ไม่ใช่ตัวแทนการอ่านรุ่นใหม่ เมื่อ Requirements/SRS เปลี่ยน ให้ตรวจ impact ต่อ Tasks/AT/API/screens และแก้ version แผนนี้ตามจริง

- `TeamFlow_Requirements_v1.0.md` — SHA-256 `f275f656e588c741e75a449531c8a25d78b4ffca1652584db6c2c4f78da6251f`
- `TeamFlow_SRS_v1.0.md` — SHA-256 `62c2ca9e8b2ed382e5ce26773828b62492e3c09de487ff6fd73c43c409bd9abf`

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | แตกงานจาก Requirements/SRS: dependencies, checklist, acceptance, FR/NFR/BR/API/Screen coverage; ไม่มี implementation sign-off |
| 1.1 | 2026-10-05 | เจ้าของระบบยืนยันกติกา; R-01–R-04 resolved; SQL Server2022/mssql; filetrash/restore30วัน; coding/testsยังไม่ผ่าน |
| 1.2 | 2026-10-05 | เพิ่ม default GPT-6.1 Sol / Medium / Standard และ effort ราย Task ทั้ง 77 งาน; ไม่เปลี่ยน scope/dependencies/status หรือผลทดสอบ |
| 1.3 | 2026-10-05 | เพิ่มกฎลด token และรายงานกระชับตามคำขอ; คง acceptance/tests และ effort ราย Task เดิม |

### SQL Server 2022 implementation checks

- [ ] T-006: DBconnection/pool/encryption/secretconfig และ leastprivilegeruntimelogin
- [ ] T-007/T-008: NVARCHAR/DATE/DATETIME2/IDENTITY/filtered UNIQUE/FK NO ACTION/XACT_ABORT/lock policy
- [ ] T-035: temporaryunique rank สองระยะ;ไม่ใช้ deferredconstraint แบบเดิม
- [ ] T-043/T-044: file softdelete/restore30 วัน endpoint และ UI
- [ ] T-062/T-063/T-074: .bak+uploads consistent snapshot/actualRESTORE บน SQL Server2022
- [ ] T-067–T-075: integration ใช้ SQL Server2022 จริง;deadlock/locktimeout/connectionloss tests
