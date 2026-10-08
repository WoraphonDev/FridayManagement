# TeamFlow — ทดสอบ T-085 Project Files

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS (Darwin 24.6.0), Node 22.23.3, SQLite local ชั่วคราว + filesystem จริงใน temp directory, Playwright Chromium · **Declared effort:** Medium · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-085-files-results.json` · **Trace:** FR-49, FR-28, AT-36, TC-094

## สถานะก่อนเริ่ม

โค้ดถูก commit มาพร้อม `3a76fd7` โดยยังไม่ได้บันทึก ได้แก่ ตาราง `project_files` (migration 0007), รายการรวม `GET /api/projects/{id}/files`, upload/download/delete/restore ระดับโปรเจกต์, `ProjectFiles.tsx` และเทส AT-36 1 ตัว ผมตรวจใหม่เทียบ SRS §9.8 และ FR-28

## ผลตรวจและสิ่งที่แก้

- **ถูกต้องแล้ว:** upload ใช้ reservation/quota/ตรวจ magic bytes เดิม; download เป็น `attachment` + `nosniff` + `O_NOFOLLOW`; รายการรวมไฟล์โปรเจกต์กับไฟล์แนบของงานที่ยังไม่ถูกลบ; ลบ/คืนได้เฉพาะผู้อัปโหลดหรือ P-06/Admin/Lead; ไฟล์ที่ลบยังนับ quota จนถึงการ purge; preview เฉพาะ png/jpeg/webp/pdf ผ่าน blob ที่กำหนด type แล้ว
- **แก้:**
  1. ลบ/คืนไฟล์ระดับโปรเจกต์ไม่มี audit ขณะที่ไฟล์แนบของงานมี event → เพิ่ม `admin_events` `project_file_deleted`/`project_file_restored` ใน transaction เดียวกัน (บันทึกเฉพาะเมื่อสถานะเปลี่ยน)
  2. ช่องค้นหายิง request ทุกครั้งที่พิมพ์ → หน่วง 300 ms
  3. ไม่มี CSS ของ preview (รูปอาจล้น dialog) → เพิ่ม `max-height: 70vh` และจัดปุ่มให้ wrap
- ไฟล์แนบของงานที่ถูกลบจะไม่แสดงในแท็บ Files สำหรับทุกคน (เข้มกว่า SRS ที่ให้ผู้มีสิทธิ์ trash เห็นได้) ผู้มีสิทธิ์ยังเห็นได้ผ่าน trash ของงาน

Contract/migration ไม่เปลี่ยน

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| AT-36 HTTP เดิม + ใหม่ (Viewer อ่านได้แต่อัปโหลด/ดู trash ไม่ได้, quota พอดีขอบ 201 / เกิน 1 byte 422 QUOTA_EXCEEDED และไม่ค้าง reserved, กรองชนิด image/document/pdf, ไฟล์ของงานที่ถูกลบหาย, Manager ไม่มี P-06 ลบของผู้อื่นไม่ได้, คืนได้วันที่ 29 / 30×24h → 422, purge ลบไฟล์จาก disk และคืน quota, คนนอก 404, audit) | 2/2 PASS |
| Chromium `tests/browser/project-files.spec.ts` (server จริง): อัปโหลด png/pdf/txt ผ่าน UI, .exe ถูกปฏิเสธ, ไฟล์แนบของงานแสดง "Task: …", ค้นหาไทย/กรอง type, preview รูปจาก blob (naturalWidth 1), PDF เปิดแท็บ `noopener` ด้วย blob URL, txt ไม่มี preview, ลบ/คืน, 375px ไม่มี horizontal scroll | 1/1 PASS |
| `npm test` ทุก suite | Node 446/446 + frontend 44/44 PASS |
| typecheck / lint / build / check:contract | PASS / PASS (warning เดิม 1) / PASS / PASS 77 routes |

## ยังไม่ได้รัน / ข้อจำกัด

- SQL Server 2022, Windows (NTFS/ACL), UAT: NOT_RUN — AT-36/TC-094 ใน Test Run Register คง NOT_RUN จนรันใน T-091
- Headless Chromium ดาวน์โหลด PDF แทนการแสดง จึงยืนยันได้แค่ว่าเรียก `window.open(blob, '_blank', 'noopener')` ยังไม่ได้ยืนยันว่าเบราว์เซอร์แบบมีหน้าจอแสดง PDF ได้จริง
- `tests/browser/files.spec.ts` (T-044) และ spec เดิมอีกหลายไฟล์ fail อยู่ก่อนแล้วเพราะยังใช้ป้ายภาษาไทยตอน login (ยืนยันด้วย stash) ไม่เกี่ยวกับงานนี้ แยกไว้เป็นงานต่างหาก
