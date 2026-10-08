# TeamFlow — ทดสอบ T-084 Project Docs

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS (Darwin 24.6.0), Node 22.23.3, SQLite local ชั่วคราว, Playwright Chromium · **Declared effort:** High · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-084-docs-results.json` · **Trace:** FR-48, NFR-02, NFR-03, AT-35, TC-092

## สถานะก่อนเริ่ม

โค้ด Docs ถูก commit มาพร้อม `3a76fd7` โดยยังไม่ได้บันทึกใน Register ได้แก่ migration `0007_docs_files` (SQLite/SQL Server), `docs.ts`, `html-sanitizer.ts`, 7 routes ใน contract 1.4.0, `ProjectDocs.tsx` และเทส AT-35 1 ตัว ผมตรวจใหม่ทั้งหมดเทียบกับ SRS §9.7 และสิทธิ์ใน §4.4

## ผลตรวจโค้ด

- **Sanitizer:** ใช้ allowlist และ serialize ใหม่ทั้งหมด escape ทั้ง text และ attribute; href รับเฉพาะ http/https/mailto หลังตัดช่องว่างและ control char; img รับเฉพาะ URL ไฟล์ของโปรเจกต์เดียวกันที่ยังไม่ถูกลบ; ตัด script/svg/style/iframe/form พร้อมเนื้อหาข้างใน; จำกัดความลึก 64 ชั้น ไม่พบช่องโหว่
- **สิทธิ์:** Viewer อ่านอย่างเดียว; Editor/Manager แก้ได้ทุก doc; ลบ/คืนได้เฉพาะ doc ของตน หรือเมื่อมี P-05/Admin/Lead; โปรเจกต์หรือทีมที่ archived เป็นอ่านอย่างเดียว; ตรวจ version หลังเช็กสิทธิ์ (409 พร้อม currentVersion); บันทึก project_doc_versions ทุกครั้งที่บันทึก; purge ผ่าน retention job — ตรง matrix
- **ช่องว่างที่แก้:**
  1. ลบ/คืน doc ไม่มี audit (§8.4) → เพิ่ม `admin_events` `doc_deleted`/`doc_restored` ใน transaction เดียวกัน เก็บเฉพาะ project_id/title ไม่เก็บเนื้อหา
  2. Editor ยังไม่มีเครื่องมือตาม FR-48 → เพิ่ม H3, Checklist (คลิกช่องเพื่อติ๊ก), Table, Image จาก Files ของโปรเจกต์ (เลือกจาก dialog, escape ชื่อไฟล์ใน alt)
  3. ไม่มี CSS ของ Docs เลย → เพิ่ม layout/checklist/table/image/responsive ใน `vibe.css`
  4. Bug ที่เจอระหว่างทดสอบ: dialog เลือกรูปแบบ modal ทำให้ editor inert จนแทรกรูปไม่ได้ → แทรกหลัง dialog ปิดแล้ว

Contract/migration ไม่เปลี่ยน ไม่มี library หรือ CDN ใหม่

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| `tests/addendum/sanitizer.test.ts`: XSS corpus 47 vectors (no tag/handler/scheme/style ที่อันตราย + output เป็น fixed point), allowlist formatting, text length ไทย/emoji, ความลึก/linear time ~1 MB | 3/3 PASS |
| AT-35 HTTP เดิม + ใหม่ (ชื่อ 200/201/blank, เนื้อหา 200,000/200,001, PATCH พร้อมกัน → 200+409 ไม่ทับ, history, Editor ลบ/คืนของตน, Manager ไม่มี/มี P-05, คืนได้วันที่ 29 / 30×24h → 422 RETENTION_EXPIRED / หายจาก trash, audit, archived → 422 PROJECT_ARCHIVED) | 2/2 PASS |
| Frontend `project-docs.test.tsx` (snippet ผ่าน sanitizer, alt escape) | 2/2 PASS |
| Chromium `tests/browser/project-docs.spec.ts` (server จริง): stored XSS ไม่ทำงาน, H3/Checklist/Table/Image บันทึกแล้วแสดงรูปจริง (naturalWidth 1), ติ๊ก checklist, 2 แท็บ → 409 แจ้งเตือนและข้อความที่ยังไม่บันทึกยังอยู่, 375px ไม่มี horizontal scroll | 1/1 PASS |
| `npm test` ทุก suite | Node 445/445 + frontend 44/44 PASS |
| typecheck / lint / build / check:contract | PASS / PASS (warning เดิม 1) / PASS / PASS 77 routes |

## ยังไม่ได้รัน / ข้อจำกัด

- SQL Server 2022 (migration 0007 + transaction/UPDLOCK), Windows, UAT: NOT_RUN — AT-35/TC-092 ใน Test Run Register คง NOT_RUN จนรันใน T-091
- Editor ใช้ `contentEditable` + `execCommand` (deprecated แต่ไม่ต้องเพิ่ม dependency) และให้ sanitizer ฝั่ง server เป็นขอบเขตความปลอดภัยจริง; ตารางที่แทรกในรายการจะอยู่ในรายการนั้น (พฤติกรรมของเบราว์เซอร์)
- เลือกรูปได้เฉพาะ 100 ไฟล์แรกของแท็บ Files; ไฟล์แนบของงานแทรกได้ทางเทคนิค (sanitizer อนุญาต) แต่ dialog แสดงตามรายการ Files
- Fixture มีผู้ใช้แค่ 2 คน: ทดสอบ E1/E2 ด้วย Admin+Member; Lead ทีมเจ้าของยังไม่ได้ทดสอบแยก (ใช้ `can()` เดียวกับ T-081)
- Audit ของ doc ไม่ถูกลบตอน purge (เหมือน audit กลางอื่น)
