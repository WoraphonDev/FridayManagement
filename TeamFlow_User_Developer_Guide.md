# คู่มือใช้งานและส่งต่อ FridayManagement — T-066

รุ่น source candidate 2026-10-07; ใช้ข้อมูล synthetic ใน isolated rehearsal เท่านั้น ระบบ production ยังมี readiness guard. การทดลองให้ผู้ใช้ใหม่ทำเองและ UAT ยัง NOT_RUN.

## เริ่มใช้ตามบทบาท

ผู้ติดตั้งเปิดเว็บครั้งแรกและใช้ setup token ที่แสดงใน console ส่วนตัว สร้างชื่อองค์กรและ Admin; token ใช้ครั้งเดียว ไม่มี default password. Admin สร้างบัญชีที่เมนูผู้ใช้ ส่งรหัสชั่วคราวผ่านช่องทางส่วนตัวที่องค์กรเลือกเอง; แอปไม่มี email/AI. ผู้ใช้ login และเปลี่ยนรหัสก่อนเปิดงาน รหัสไม่ถูก trim. Reset ต้องให้ Admin ยืนยันรหัสตัวเอง; reset/เปลี่ยน role/deactivate ตัด session เก่า. ปิด Admin คนสุดท้ายไม่ได้. กู้ Admin ผ่าน local CLI ตาม README โดยหยุดแอปและยืนยันบัญชีเดิม; ไม่ทำผ่าน public URL.

Admin สร้างทีม/ตั้ง Lead แล้วสร้างโปรเจกต์และเพิ่ม Editor/Viewer. Lead ดูแลโปรเจกต์ของทีมที่นำและสมาชิกโปรเจกต์; ไม่มีสิทธิ์แต่ง Lead อีกทีม. Member ที่เป็นสมาชิกทีมอย่างเดียวไม่เห็น private project ต้องมี explicit project membership; Lead ของ owner team อ่าน/เขียนได้ ส่วน Admin เข้าถึงทั้งหมด. Editor ข้ามทีมทำงานได้เฉพาะโปรเจกต์ที่แชร์; Viewer อ่าน/ดาวน์โหลดได้และเขียนไม่ได้. Viewer/Inactive เลือกเป็น assignee ไม่ได้. ถอนหรือลดสิทธิ์จะ unassign งานค้างที่เสีย effective write; งาน done และประวัติคงอยู่. เปิดแท็บค้างไม่ได้รักษาสิทธิ์เดิม.

Member เปิดโปรเจกต์ เลือก Table/List, Kanban, Calendar หรือ Gantt. สร้างงานด้วยชื่อ ผู้รับผิดชอบ วันเริ่ม/ครบกำหนด priority/description/checklist. วันที่ใช้ Asia/Bangkok; start ต้องไม่หลัง due. กรอง/search ก่อนเปลี่ยนมุมมอง; Calendar ใช้ due date และเลือกวันที่เปิดรายการ; Gantt แสดงช่วง start–due/งานไร้วันที่ตาม UI ไม่มี dependency scheduling/ลากเปลี่ยนวันเพิ่มจาก baseline. Table/List แก้ผ่านรายละเอียดตามสิทธิ์. Kanban ย้ายคอลัมน์ด้วยลากหรือเมนู/คีย์บอร์ด; reorder ได้ตามลำดับที่อนุญาตและ filter. เมื่อเกิน500 งาน ใช้ paginated list แทน board snapshot.

เปิดรายละเอียด เพิ่ม checklist/comment/ไฟล์แล้วกดบันทึก. ก่อนทำ done ต้องติ๊ก checklist ครบ; ไม่มี auto-complete. งานซ้ำสร้างเพียง successor รอบถัดไปเมื่อปิดงานสำเร็จ; monthly เก็บ anchor เช่น31Jan→28Feb→31Mar ตามปีจริง. เปลี่ยน due date ตั้ง anchor ใหม่; successor เดิมไม่ถูกแก้ตามย้อนหลัง. พบ409 ให้ตรวจข้อมูลล่าสุดและร่างเดิมก่อนส่งอีกครั้ง; ไม่กดซ้ำรัว ระบบไม่ retry writes ให้อัตโนมัติ. หลังเครือข่ายกลับ รอข้อมูลสิทธิ์ล่าสุดก่อนบันทึก. Offline อ่านได้เฉพาะ public app shell ที่ cache ไว้; ไม่มี offline private-data/write queue.

แนบไฟล์ที่ระบบตรวจชนิดได้ สูงสุด10MiB/ไฟล์ และ quotaรวม5GiB; MIME/นามสกุลอย่างเดียวไม่เพียงพอ ไฟล์ที่ลบยังใช้ quotaจนลบ bytes สำเร็จ. ดาวน์โหลดตรวจสิทธิ์ทุกครั้ง; URL ไม่ใช่ public link. งาน/ไฟล์ที่ลบคืนจาก Trash ภายใน30×24ชั่วโมง; ที่ cutoffคืนไม่ได้. Archived project อ่านได้ตามสิทธิ์และบล็อกการเขียนทั่วไป; Admin/owner Lead ใช้ endpointลบ/คืนงานตามข้อยกเว้นได้ และ project ที่คืนยัง archived. เปิดทีมก่อนเปิด project ที่ archived.

Notification เป็น in-app เฉพาะที่ยังมีสิทธิ์; กดอ่าน/อ่านทั้งหมดได้; เก็บ90วัน. รายงาน/CSV เคารพ scope เดียวกับงาน. การเปิดหน้า/notification poll ไม่ต่อ idle60นาที; activity ที่ตั้งใจต่อ idle แต่ไม่เกิน absolute12ชั่วโมง. Logout แล้ว private cache/state ต้องถูกล้าง. PWA cache เฉพาะ public static assets; installation ขึ้นกับ browser/OS, ระบบไม่อ้างรองรับทุกเครื่อง. เมื่อมีเวอร์ชันใหม่ ให้จัดการร่างก่อน reload. Maintenance หยุดการเขียน/อ่านธุรกิจบางส่วนและคงร่างจนกลับมา; ติดต่อ Admin เมื่อสิทธิ์หรือ session เปลี่ยน.

## แบบทดลองผู้ใช้ใหม่ — UAT NOT_RUN

ให้ตัวแทน Admin สร้างบัญชี/ทีม/Lead/project; Lead เพิ่ม M2 Editor กับ V Viewer; Member เปลี่ยนรหัส สร้าง/มอบหมาย/checklist/done/recurrence ใช้ทั้ง4views; Viewer ทดลองอ่านและถูกปฏิเสธเขียน; Lead ถอน Editor แล้วตรวจแท็บค้าง/assignment. ทดลอง archive/trash/ไฟล์/quota/conflict/notification/PWA ตาม5journeysใน Test Plan. บันทึกชื่อบทบาท/build/date ผลจริง/จุดติดขัด/หลักฐาน redacted และ sign-off; เอกสารนี้ไม่แทน UAT.

## Developer handoff

Node22.23.3, TypeScript/Express, React/Vite; database adapter SQLite local กับ SQL Server2022 แยก migrations/fixtures. `src/api` ทำ ingress/DTO/session/CSRF; `src/services` ทำ permission/business transaction, audit/notifications; `src/repository` ให้ adapter/access-scope; frontend ใช้ current Self/version/opaque revision. หนึ่ง instance มี local+SQL guards/jobs, storage privateนอกwebroot. อ่าน SRS readiness RD-01–RD-08 ก่อนแก้ lifecycle.

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm test
npm run test:ui
npm run test:regression
npm run check:contract
npm run check:test-plan
```

API1.1.0/DTO/wire format เป็น locked contract: [API Contract](TeamFlow_API_Contract.md), contracts/openapi.json; เปลี่ยน schema ให้ `build:contract`/`check:contract`/`test:contract`. Permission ต้องตรวจ server/transaction ไม่ใช้ UI hiding. Tests/fixtures cookies/CSRF/key/clock ดู [Regression harness](TeamFlow_Regression_Harness.md); run SQL2022 แยกจริง ไม่แปลง local PASS เป็น SQL PASS. Test-plan checkerตรวจinventory ไม่ใช่ application acceptance.

Configuration/migration/sample-data/recovery: [Configuration](TeamFlow_Configuration.md), [Windows installation](TeamFlow_Windows_Installation.md), [Backup/Recovery](TeamFlow_Backup_Recovery.md), [Database schema](TeamFlow_Database_Schema.md), README. Envไม่โหลดเองใช้ Node --env-file หรือ process environment; ไม่ commit secrets/DB/uploads. ไม่มี source ZIP/production-ready sign-off จน finalgates ผ่าน; T-065/T-066/T-067–069และ native SQL/Windows/browser/UAT criteria ยังต้องปิดด้วยหลักฐานจริง.
