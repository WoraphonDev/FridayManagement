# TeamFlow — Requirements Addendum: Monday-style Project Management (APPROVED)

สถานะ: **APPROVED — รวมเข้าเอกสารหลักแล้วใน T-078 (Requirements 1.9 / SRS 1.11 / Task 1.54 / Test Plan 1.35 / Test Cases 1.34)** · วันที่ 8 ตุลาคม 2026 · อ้างอิง Requirements content 1.8 / SRS content 1.10
เอกสารนี้ยังไม่แก้ไข `TeamFlow_Requirements_v1.0.md` หรือ SRS; เมื่ออนุมัติแล้วจึงรวมเข้าเอกสารหลัก ปรับ SRS/API contract/Test Cases/Task Register และ rerun checks ของ T-003/T-004

## A. เป้าหมาย

ให้ FridayManagement มีประสบการณ์ใช้งานใกล้ monday.com มากที่สุด แต่เก็บเฉพาะความสามารถที่จำเป็นต่อการบริหารโปรเจกต์ภายในองค์กร แบ่งเป็น 3 พื้นที่:

1. **Personal** — เห็นงานของตนทุกโปรเจกต์และภาพรวมของตน
2. **Workspace** — โปรเจกต์ที่ตนเข้าถึง พร้อม Main table / Kanban / Calendar / Gantt / Docs / Files
3. **Admin** — จัดการสมาชิก ตำแหน่ง สิทธิ์ ทีม และโปรเจกต์ของทีม

ข้อจำกัดเดิมยังคงอยู่: หนึ่งองค์กร, ไม่มี email/AI, permission ตรวจที่ server ทุกช่องทาง, Windows + SQL Server 2022 เป็นเป้าหมาย production

## B. บทบาทและตำแหน่ง (Role vs Job title)

แยก **สิทธิ์ (permission role)** ออกจาก **ตำแหน่งงาน (job title)** อย่างชัดเจน

| กลุ่มที่เจ้าของกำหนด | ตำแหน่ง (job title) | สิทธิ์ที่ได้รับ |
|---|---|---|
| Admin | Admin | Organization Admin (เดิม) |
| Management | PM, SM | สิทธิ์ตาม **Permission checkbox** ที่ Admin ติ๊กให้รายคน (FR-42A) ใช้กับโปรเจกต์ที่ตนเป็น `manager` (FR-42); ใช้ preset “PM/SM” ช่วยติ๊กได้ |
| Dev | BA, SA, Dev, Tester | Editor หรือ Viewer ระดับโปรเจกต์ (เดิม) — ตำแหน่งเป็นป้ายเท่านั้น; **Admin ติ๊ก permission เพิ่มรายคนได้** เช่น SA ที่ทำหน้าที่แบบ PM/SM |

กติกา:
- BR-19: Job title เป็นข้อมูลแสดงผล/กรอง/รายงานเท่านั้น ห้ามใช้ตัดสินสิทธิ์ใน server
- BR-20: ผู้ใช้มีได้หนึ่งตำแหน่งหลัก หรือไม่มี; รายการตำแหน่งตั้งต้นคือ PM, SM, BA, SA, Dev, Tester และ Admin เพิ่ม/เปลี่ยนชื่อ/ปิดใช้งานตำแหน่งได้ (ไม่ลบถาวรถ้ายังมีผู้ใช้อ้างถึง)
- BR-21: สิทธิ์ทั้งหมดมาจากการตั้งค่าของ Admin รายบุคคล/รายโปรเจกต์ ไม่ได้มาจากตำแหน่ง: ตำแหน่ง PM/SM **ไม่ได้** ให้สิทธิ์อัตโนมัติ และตำแหน่งอื่น (เช่น SA) ก็ได้รับสิทธิ์และหน้าทำงานแบบ PM/SM ได้เมื่อ Admin กำหนด; การเปลี่ยนตำแหน่งไม่เพิ่มหรือลดสิทธิ์
- BR-22: เมื่อ Admin เอาเครื่องหมายออกจาก permission ใด สิทธิ์นั้นหมดผลทันทีทั้ง UI/API; ถ้าไม่เหลือ permission กลุ่มโปรเจกต์ (P-01–P-07) เลย ให้ลด project role `manager` ทั้งหมดของผู้ใช้นั้นเป็น `editor` ใน transaction เดียวพร้อม audit และ refresh view ของผู้ใช้
- BR-23: เฉพาะ Organization Admin เท่านั้นที่ติ๊ก/เอาออก permission ได้; ผู้ใช้แก้ permission ของตนเองหรือมอบต่อให้ผู้อื่นไม่ได้ (กันการยกระดับสิทธิ์); สิทธิ์เฉพาะ Admin (จัดการผู้ใช้/ทีม/ตำแหน่ง/permission, archive/ลบโปรเจกต์, ตั้งค่าระบบ, Trash ทั้งองค์กร) ไม่อยู่ในรายการ checkbox

## C. Functional Requirements ใหม่

ลำดับความสำคัญ: **M** = Must, **S** = Should, **C** = Could

### C.1 Admin และสิทธิ์

| ID | ชื่อ | เกณฑ์ยอมรับ | P |
|---|---|---|---|
| FR-41 | ตำแหน่งงานของผู้ใช้ | Admin กำหนดตำแหน่งให้ผู้ใช้ในหน้า Users และจัดการรายการตำแหน่งได้; แสดงตำแหน่งเป็นป้ายสีถัดจากชื่อใน People picker, Members, Workload และรายงาน; กรองงาน/สมาชิกตามตำแหน่งได้; Export CSV มีคอลัมน์ตำแหน่ง; การเปลี่ยนตำแหน่งบันทึก admin audit | M |
| FR-42 | Project role `manager` | เพิ่ม project role `manager` นอกจาก `editor`/`viewer`; แต่งตั้งได้เฉพาะผู้ที่มี permission กลุ่มโปรเจกต์ (P-01–P-07) อย่างน้อยหนึ่งข้อ (server ปฏิเสธถ้าไม่มี); Manager ทำได้**เฉพาะ**ข้อที่ถูกติ๊กใน FR-42A และเฉพาะโปรเจกต์ที่ตนเป็น `manager`; แต่งตั้ง/ถอด Manager ทำได้โดย Admin/Lead ทีมเจ้าของเท่านั้น (ผู้มี P-03 ตั้งได้แค่ Editor/Viewer); ทุกการกระทำตรวจสิทธิ์ที่ server | M |
| FR-42A | Permission checkbox รายคน | Admin เปิดหน้า Members › ผู้ใช้ › แท็บ **Permissions** แล้วติ๊ก checkbox สิทธิ์จากรายการในตาราง C.1.1 ได้ทีละข้อ; มีปุ่ม preset “PM/SM” (ติ๊ก P-01–P-10), “Clear” และแสดงคำอธิบายแต่ละข้อ; บันทึกแบบ version ป้องกันทับกัน; audit เก็บรายการที่เพิ่ม/เอาออก ผู้ทำ และเวลา; มีผลทันทีโดยไม่ต้อง login ใหม่; ไม่ขึ้นกับตำแหน่ง (UI อาจ *แนะนำ* preset เมื่อตั้งตำแหน่ง PM/SM แต่ Admin ต้องกดยืนยันเอง); ข้อมูลที่เห็นยังจำกัดตามโปรเจกต์ที่เข้าถึง (BR-16) | M |
| FR-43 | หน้า Admin รวมศูนย์ | เมนู Admin มี Members (สร้าง/ปิดใช้งาน/รีเซ็ตรหัส/ตำแหน่ง/role องค์กร/Permissions), Teams (สมาชิก/Lead/โปรเจกต์ของทีม), Job titles และ **Permission matrix**: ตาราง แถว = สมาชิก, คอลัมน์ = P-01–P-10 เป็น checkbox ติ๊กได้ทันที (Admin เท่านั้น), กรองตามทีม/ตำแหน่ง, เลือกหลายคนแล้วใช้ preset ทีเดียว, แสดงสรุปการเปลี่ยนแปลงก่อนยืนยันบันทึก; ผู้ใช้ทั่วไปเห็นเฉพาะสิทธิ์ของตนเองในหน้า Settings แบบอ่านอย่างเดียว | M |

#### C.1.1 รายการ Permission checkbox (ข้อเสนอ)

| Key | Checkbox | ขอบเขต | PM/SM preset |
|---|---|---|---|
| P-01 | แก้ชื่อ/รายละเอียดโปรเจกต์ | โปรเจกต์ที่เป็น `manager` | ✓ |
| P-02 | จัดการ Group (สร้าง/แก้ชื่อ/สี/ลบ) | โปรเจกต์ที่เป็น `manager` | ✓ |
| P-03 | เพิ่ม/ถอดสมาชิกโปรเจกต์ (Editor/Viewer) | โปรเจกต์ที่เป็น `manager` | ✓ |
| P-04 | ลบและคืนงานของผู้อื่น | โปรเจกต์ที่เป็น `manager` | ✓ |
| P-05 | จัดการ Docs ของผู้อื่น (แก้/ลบ/คืน) | โปรเจกต์ที่เป็น `manager` | ✓ |
| P-06 | ลบ/คืนไฟล์ของผู้อื่นใน Files | โปรเจกต์ที่เป็น `manager` | ✓ |
| P-07 | ดู Project overview / Reports / Export CSV ของโปรเจกต์ | โปรเจกต์ที่เป็น `manager` | ✓ |
| P-08 | สร้างโปรเจกต์ใหม่ (ผู้สร้างเป็น `manager` อัตโนมัติ) | ทีมที่ตนเป็นสมาชิก | ✓ |
| P-09 | ดู Workload ระดับทีม | ทีมที่ตนเป็นสมาชิก (เห็นเฉพาะงานในโปรเจกต์ที่ตนเข้าถึง) | ✓ |
| P-10 | ดู Reports ระดับทีม | ทีมที่ตนเป็นสมาชิก (BR-16) | ✓ |

สิทธิ์พื้นฐานของ Editor/Viewer (สร้าง/แก้งาน, comment, แนบไฟล์, ดูงาน) ยังมาจาก project membership เดิม ไม่อยู่ใน checkbox; Team Lead และ Admin มีสิทธิ์ตามเดิมโดยไม่ต้องติ๊ก

### C.2 Personal

| ID | ชื่อ | เกณฑ์ยอมรับ | P |
|---|---|---|---|
| FR-44 | My overview (Home ส่วนตัว) | หน้า Home ของผู้ใช้แสดง widget: จำนวนงานของฉันตามสถานะ, เกินกำหนด/วันนี้/สัปดาห์นี้, งานแยกตามโปรเจกต์, งานที่เสร็จ 7 วันล่าสุด, และรายการ “ต้องทำต่อไป” 5 รายการ; คลิก widget แล้วไปยัง My work พร้อมตัวกรองที่ตรงกัน; ตัวเลขใช้ API/สิทธิ์เดียวกับรายงาน; รายงานระดับทีมเดิมย้ายไป Reports | M |
| FR-45 | My work แบบ monday | My work ใช้ grouped table เดียวกับ Main table (Overdue / Today / This week / Next week / Later / No date / Done) แสดงคอลัมน์ Project พร้อมลิงก์; เปลี่ยนสถานะ inline ได้ตามสิทธิ์; สลับ “ได้รับมอบหมาย / ฉันสร้าง” ได้ | M |
| FR-46 | Updates feed (**เลื่อนไปรอบถัดไป** ตามคำตอบ I.5) | หน้า/แผง Updates แสดงกิจกรรมล่าสุดที่เกี่ยวข้องกับฉัน (ถูกมอบหมาย, comment ในงานของฉัน, สถานะเปลี่ยน) จาก notifications/task events เดิม โดยไม่ขยายสิทธิ์; mark read ได้ | S |
| FR-47 | Favorites | ติดดาวโปรเจกต์ได้ (ส่วนตัว ไม่กระทบผู้อื่น); โปรเจกต์ที่ติดดาวแสดงบนสุดของ sidebar “Your projects”; ถอนสิทธิ์แล้ว favorite หายตาม | M |

### C.3 Workspace / Project

| ID | ชื่อ | เกณฑ์ยอมรับ | P |
|---|---|---|---|
| FR-48 | Project Docs | แต่ละโปรเจกต์มีแท็บ **Docs**: สร้างเอกสารหลายหน้า (ชื่อ ≤200, เนื้อหา ≤200,000 ตัวอักษร) ด้วย rich-text editor พื้นฐาน (หัวข้อ, ตัวหนา/เอียง, list, checklist, ลิงก์, code, ตาราง, รูปจาก Files ของโปรเจกต์); อ่านตามสิทธิ์ Viewer, แก้ไขโดย Editor/Manager; บันทึกแบบ version (optimistic concurrency) แจ้ง conflict ไม่ทับเงียบ; มีประวัติผู้แก้/เวลา; soft delete/restore 30 วันแบบเดียวกับงาน; sanitize HTML ฝั่ง server ป้องกัน XSS; **ไม่รวม** real-time co-editing | M |
| FR-49 | Project Files | แท็บ **Files** รวมไฟล์ระดับโปรเจกต์และไฟล์แนบจากทุกงานในโปรเจกต์ แสดงชื่อ ขนาด ผู้อัปโหลด เวลา และงานต้นทาง; อัปโหลดระดับโปรเจกต์ได้โดย Editor/Manager; ค้นหา/กรองตามชนิดไฟล์; preview รูปภาพ/PDF; ใช้กติกา quota/scan/ลบ/กู้คืนของ FR-28 | M |
| FR-50 | Workload view | มุมมองที่ 5 ในโปรเจกต์ (และในระดับทีมสำหรับ Lead/Admin): แสดงจำนวนงานต่อคนต่อสัปดาห์จาก start/due ที่มี พร้อมป้ายตำแหน่ง, ไฮไลต์คนที่เกินเกณฑ์ (ค่าเริ่มต้น 10 งานเปิด/สัปดาห์, Admin ตั้งได้); คลิกเพื่อดูรายการงาน; ไม่ใช่ time tracking | S |
| FR-51 | Project overview | แท็บ Overview ของโปรเจกต์: ความคืบหน้า % ตามงาน done, กราฟสถานะ, งานเกินกำหนด, งานตามผู้รับผิดชอบ/ตำแหน่ง, กิจกรรมล่าสุด | S |
| FR-52 | Main table แบบ monday | ปรับ Main table ให้ใกล้ monday: แถว sticky header ต่อกลุ่ม, คอลัมน์ Task sticky ซ้ายเมื่อ scroll แนวนอน, ปรับความกว้างคอลัมน์ได้ (จำต่อผู้ใช้), แก้ชื่องาน/วันที่/priority/ผู้รับ inline, เพิ่มงานจากแถวท้ายกลุ่มด้วยการพิมพ์ชื่อแล้ว Enter, เลือกหลายแถว (checkbox) แล้วเปลี่ยนสถานะ/ผู้รับ/กลุ่ม/ลบแบบ batch, ลากแถวย้ายกลุ่ม, แถบสรุปท้ายกลุ่มเป็น status distribution bar และช่วงวันที่ | M |
| FR-53 | Task side panel แบบ monday | เปิดงานเป็น panel ขวาที่มีแท็บ Updates (comments + @mention สมาชิกที่เข้าถึงโปรเจกต์), Files, Activity log, Details/Checklist; ปิดด้วย Esc; URL deep link ไปยังงานได้ | M |

### C.4 ที่ยังคงไม่รวม (คงตาม §3.2 เดิม)

custom fields/columns, custom status, dependencies/critical path/auto-scheduling ใน Gantt, time tracking, automations, integrations, chat แยก, real-time co-editing ของ Docs, email/AI — หากต้องการต้องเปิด scope change แยก

## D. UX/UI แบบ monday.com

| ID | ความต้องการ | เกณฑ์วัด |
|---|---|---|
| UX-01 | Visual language | ใช้ Vibe design system (`@vibe/core` เดิม) ทุกหน้า: navy top bar, sidebar ขาว-เทา, การ์ดมุมโค้ง 8px, status pill สีเต็มช่องข้อความกลาง, group สีแถบซ้าย, avatar วงกลม, ฟอนต์ระบบ (Figtree/Poppins ถ้าติดตั้ง ไม่ดึงจาก internet) |
| UX-02 | Navigation | Sidebar 3 ส่วน: Personal (Home, My work, Updates), Workspace (All projects, Favorites, Your projects), Admin (เฉพาะผู้มีสิทธิ์); ค้นหาโปรเจกต์ใน sidebar; ยุบ sidebar ได้ |
| UX-03 | Project header | ชื่อ + ดาว + คำอธิบาย + avatar stack + Members + ⋯ menu; แท็บ view: Main table / Kanban / Calendar / Gantt / Workload / Docs / Files / Overview พร้อม “+” เพื่อซ่อน/แสดงแท็บ (จำต่อผู้ใช้) |
| UX-04 | Empty states | ทุก view มี empty state พร้อมภาพประกอบเรียบ ๆ และปุ่ม action หลัก |
| UX-05 | Responsive | 360px ขึ้นไปไม่มี horizontal scroll ของเอกสาร (ตารางเลื่อนในกรอบตัวเองได้); side panel เต็มจอบนมือถือ |
| UX-06 | Keyboard | ทุก action ทำได้ด้วยคีย์บอร์ด; shortcut: `N` งานใหม่, `/` ค้นหา, `Esc` ปิด panel |

## E. Animation และลูกเล่น

### E.1 จุดที่ต้องมี animation

| ID | จุด | พฤติกรรม | ระยะเวลา |
|---|---|---|---|
| AN-01 | เปลี่ยนหน้า/แท็บ view | fade + slide 6px | 180–220ms |
| AN-02 | Task side panel | slide-in จากขวา + backdrop fade; ปิดย้อนกลับ | 260ms |
| AN-03 | เปลี่ยนสถานะ | pill เปลี่ยนสีแบบ crossfade + scale pulse 1→1.06→1 | 240ms |
| AN-04 | งานเป็น **Done** | confetti burst เล็กจาก pill + เสียงไม่มี; แสดงไม่เกิน 1 ครั้ง/2 วินาที; **เปิดเป็นค่าเริ่มต้น** ปิดได้ใน Settings และปิดอัตโนมัติเมื่อ reduced motion | 700ms |
| AN-05 | Kanban drag | การ์ดยก (shadow + rotate 2°), ช่องว่างเปิดรอ, FLIP เมื่อวาง (คงของเดิม 320/220ms) | 220–320ms |
| AN-06 | ย่อ/ขยาย group | height + chevron rotate | 200ms |
| AN-07 | เพิ่มงาน/ลบงาน | แถวใหม่ highlight สีฟ้าจางแล้ว fade; ลบแล้วแถวยุบ | 300ms |
| AN-08 | Loading | skeleton shimmer แทน spinner ใน table/kanban/cards | วนต่อเนื่อง |
| AN-09 | Notify | กระดิ่งสั่นเบา ๆ + badge pop เมื่อมีแจ้งเตือนใหม่ | 400ms |
| AN-10 | Dashboard/Overview | ตัวเลข count-up, progress/status bar เติบโตจาก 0 | 600ms |
| AN-11 | Hover/press | ปุ่มและแถว hover elevation, press scale 0.98 | 120ms |
| AN-12 | Toast | slide-up + auto dismiss พร้อม progress bar | 220ms |
| AN-13 | Login | (มีแล้ว) ภาพประกอบเคลื่อนไหวและ card ลอย | — |

### E.2 กติกา (NFR-09 Motion)

- ใช้ `transform`/`opacity` เท่านั้น; ไม่ animate layout properties ใหญ่; 60fps บนเครื่องระดับสำนักงาน
- `prefers-reduced-motion: reduce` ปิด motion ที่ไม่จำเป็นทั้งหมด (เหลือการเปลี่ยนสีทันที) และมี toggle “Reduce animations” ใน Settings ต่อผู้ใช้
- Animation ห้ามบล็อกการกระทำหรือหน่วงการบันทึก; action ใช้ได้ทันทีระหว่าง animation
- ไม่ใช้ library ขนาดใหญ่เพิ่มถ้าไม่จำเป็น (Web Animations API/CSS ก่อน); ถ้าเพิ่ม dependency ต้องผ่าน license/audit และไม่ดึงจาก CDN
- ไม่สื่อความหมายด้วย motion อย่างเดียว (มีข้อความ/สถานะคู่กันเสมอ)

## F. ผลต่อระบบ (สำหรับ SRS)

- Schema: `job_titles`, `users.job_title_id`, `user_permissions` (user_id, permission_key, granted_by, granted_at) + version ต่อผู้ใช้, `project_members.role` เพิ่ม `manager`, `project_docs` + `project_doc_versions`, `project_files` (หรือ attachments ที่ `task_id` nullable + `project_id`), `user_favorites`, `user_preferences` (column widths, hidden tabs, reduce animations) — ต้องมี migration ทั้ง SQLite และ SQL Server
- API: endpoints ใหม่สำหรับ permission catalog, `GET`/`PUT /api/users/{id}/permissions`, matrix bulk update, job titles, docs, project files, favorites, preferences, workload, my overview — ต้องอัปเดต `TeamFlow_API_Contract.md`/`contracts/openapi.json` แล้วรัน `build:contract`/`check:contract`/`test:contract`
- Authorization: เพิ่ม `manager` ใน matrix ของ `src/services/authorization.ts` พร้อม negative tests ทุก endpoint
- Report/Export: เพิ่มมิติ job title โดยไม่ขยายสิทธิ์ (BR-16)

## G. Acceptance tests ที่เสนอ

| AT | ครอบคลุม |
|---|---|
| AT-31 | FR-41/BR-19–21: ตั้ง/แก้ตำแหน่ง, กรอง/รายงาน/CSV, ยืนยันว่าตำแหน่งไม่เปลี่ยนสิทธิ์ |
| AT-32 | FR-42/42A, BR-21–23: ติ๊กทีละข้อแล้ว UI/API ทำได้เฉพาะข้อนั้น; SA ที่ได้ preset PM/SM ทำได้เท่า PM; PM ที่ไม่ได้ติ๊กทำไม่ได้; เอาออกแล้วหมดผลทันทีและลด `manager` เป็น `editor` เมื่อไม่เหลือ P-01–P-07; ผู้ไม่ใช่ Admin แก้ permission ไม่ได้ |
| AT-33 | FR-43: Admin center + Permission overview ตรงกับสิทธิ์จริง |
| AT-34 | FR-44/45: My overview ตัวเลขตรงกับ My work และสิทธิ์ |
| AT-35 | FR-48: Docs CRUD, conflict, XSS sanitization, soft delete/restore, Viewer read-only |
| AT-36 | FR-49: Files รวม/อัปโหลด/preview/สิทธิ์/quota |
| AT-37 | FR-50/51: Workload และ Overview ตัวเลขถูกต้อง |
| AT-38 | FR-52/53: inline edit, batch, drag row, side panel, @mention |
| AT-39 | UX-01–06 + AN-01–12 + NFR-09: visual review กับ mock, reduced-motion, 360px, keyboard, 60fps trace |
| AT-40 | FR-47: Favorites ส่วนตัวและไม่ขยายสิทธิ์ (FR-46 เลื่อน) |

## H. Task ที่เสนอ (ต่อจาก T-077)

| Task | งาน | ขึ้นกับ | Effort |
|---|---|---|---|
| T-078 | อนุมัติ addendum, รวมเข้า Requirements/SRS/Test Plan/Test Cases | — | Medium |
| T-079 | Mock UI monday-style ใหม่ (ทุกหน้า + animation) ให้เจ้าของรีวิวก่อน implement | T-078 | Medium |
| T-080 | Job titles: schema/API/Admin UI/filter/report/CSV | T-078 | Medium |
| T-081 | Permission catalog + checkbox รายคน (FR-42A) + project role `manager` + authorization matrix + negative tests ทุก P-key | T-078 | **High** |
| T-082 | Admin center + Permission matrix (checkbox/bulk/preset) | T-080, T-081 | Medium |
| T-083 | My overview + My work grouped table | T-078 | Medium |
| T-084 | Project Docs (schema/API/editor/sanitize/version/trash) | T-081 | **High** |
| T-085 | Project Files tab + project-level upload | T-081 | Medium |
| T-086 | Main table monday upgrade (inline/batch/drag/sticky/resize) | T-079 | **High** |
| T-087 | Task side panel (Updates/@mention/Files/Activity) | T-079 | Medium |
| T-088 | Workload + Project overview | T-080 | Medium |
| T-089 | Motion system AN-01–12 + reduced-motion + Settings toggle | T-079 | Medium |
| T-090 | Favorites (Updates feed เลื่อนไปรอบถัดไป) | T-083 | Low |
| T-091 | Regression รวม, SQL Server 2022 native, Windows, UAT | ทั้งหมด | **High** |

## I. ข้อตัดสินใจของเจ้าของ — 8 ตุลาคม 2026

| # | คำถาม | คำตอบ |
|---|---|---|
| 1 | สิทธิ์ของ PM/SM | project role `manager` รายโปรเจกต์ (FR-42) ไม่ใช้ Team Lead ทั้งทีม |
| 2 | รูปแบบ Docs | Rich text editor (FR-48) พร้อม sanitize ฝั่ง server |
| 3 | Confetti เมื่อ Done | เปิดเป็นค่าเริ่มต้น ผู้ใช้ปิดเองได้ และปิดอัตโนมัติเมื่อ reduced motion (AN-04) |
| 4 | เกณฑ์ Workload | 10 งานที่ยังไม่เสร็จต่อคนต่อสัปดาห์ Admin ปรับได้ (FR-50) |
| 5 | Updates feed / Favorites | Favorites ทำรอบนี้ (FR-47 = M); Updates feed เลื่อนไปรอบถัดไป (FR-46) |

Job title กลุ่ม Dev (BA/SA/Dev/Tester) เป็นป้ายตำแหน่งเท่านั้นตาม BR-19 (ยืนยันโดยเจ้าของ)

เพิ่มเติม 8 ตุลาคม 2026: Admin กำหนดสิทธิ์รายคนด้วย **checkbox** (FR-42A, ตาราง C.1.1) ให้ผู้ใช้ตำแหน่งใดก็ได้ (เช่น SA) มีหน้าทำงานและสิทธิ์แบบ PM/SM; มีหน้า Permission matrix สำหรับติ๊กหลายคน (FR-43)
