# TeamFlow — ทดสอบ T-086 Main table monday upgrade

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS (Darwin 24.6.0), Node 22.23.3, SQLite local ชั่วคราว, Playwright Chromium · **Declared effort:** High · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-086-main-table-results.json` · **Trace:** FR-52, FR-45, AT-38 (ส่วน Main table), TC-096

## สถานะก่อนเริ่ม

โค้ดถูก commit มาพร้อม `3a76fd7` โดยยังไม่ได้บันทึก ได้แก่ `POST /api/tasks/batch` (savepoint รายงาน, ผลรายข้อ), batch bar, quick add ท้ายกลุ่ม, inline rename, ลากแถวย้ายกลุ่ม, เมนู "Move to group" และ resize คอลัมน์ (เมาส์ + ลูกศร) ผมตรวจทุกข้อเทียบ SRS §9.10

## สิ่งที่แก้

1. **ความกว้างคอลัมน์ไม่ได้จำต่อผู้ใช้:** เดิมเก็บใน localStorage (จำเฉพาะเบราว์เซอร์นั้น) → เก็บใน `column_widths` ของ `/api/me/preferences` (T-089) บันทึกหลังหยุด resize 400ms แสดงผลทันทีขณะลาก
2. **ไม่มี sticky:** เพิ่ม header ของแต่ละกลุ่มให้ sticky และให้คอลัมน์ Select + Task sticky ด้านซ้ายภายในกรอบตาราง (สูงสุด 70vh)
3. **Bug:** double-click เพื่อแก้ชื่อใช้ไม่ได้จริง เพราะคลิกแรกเปิด dialog รายละเอียดงาน → เอาออก เปลี่ยนเป็น F2 บนชื่องาน และเมนู "Rename task"

Contract/migration ไม่เปลี่ยน (ใช้ preferences จาก T-089)

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| AT-38 HTTP เดิม (batch ผลรายข้อ updated/conflict/forbidden, ไม่มี partial update เงียบ, @mention) | 1/1 PASS |
| Chromium `tests/browser/main-table.spec.ts` (server จริง): quick add ท้ายกลุ่ม, rename จากเมนู + F2, batch 2 งานโดยงานหนึ่งถูกแก้ไปก่อน → แสดง "Task #3: changed by someone else" อีกงานเป็น Done และงานที่ fail ยังถูกเลือกไว้, ย้ายกลุ่มด้วยเมนู (ทางเลือกสำหรับคีย์บอร์ด/จอสัมผัส), ลากแถวไปอีกกลุ่ม, header/คอลัมน์ Task เป็น sticky, resize ด้วยคีย์บอร์ด +32px แล้วบันทึกใน preferences และคงอยู่หลัง reload | 1/1 PASS (รันซ้ำ 3/3) |
| `npm test` ทุก suite | Node 451/451 + frontend 47/47 PASS |
| Browser addendum ทั้ง 7 spec | 7/7 PASS |
| typecheck / lint / build | PASS / PASS (warning เดิม 1) / PASS |

## ยังไม่ได้รัน / ข้อจำกัด

- SQL Server 2022 (savepoint ต่อรายการของ batch), Windows, UAT: NOT_RUN — AT-38 ใน Test Run Register คง NOT_RUN จนรันใน T-091
- การลากแถวใช้ HTML5 drag ซึ่งใช้บนจอสัมผัสไม่ได้ ทางเลือกคือเมนู "Move to group"; การย้ายกลุ่มส่ง version ของงาน แต่ PATCH task ไม่รับ version ของกลุ่ม (SRS §9.10 ระบุทั้งสองอย่าง) — ถ้ากลุ่มถูกลบระหว่างนั้น server ตอบ 4xx
- inline rename ถ้าคลิกออกนอกช่อง (blur) จะยกเลิก ไม่บันทึก
