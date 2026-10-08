# TeamFlow — ชุดทดสอบ T-078–T-082

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS, Node 22.23.3, SQLite local ชั่วคราว (scratchpad), Chromium ใน Claude desktop · **Declared effort:** T-078/T-079/T-080/T-082 Medium, T-081 High · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-078-T-082-batch-results.json`

## งานที่ทำ

- **T-079** — วาง `TeamFlow_UI_Monday_Mock.html` + รายงาน `TeamFlow_T079_Mock_Report.md`; แก้ bug ปุ่มลัด `N`
- **T-080 Job titles** — migration `0005_job_titles` (SQLite + SQL Server; seed PM/SM/BA/SA/Dev/Tester, `users.job_title_id`), API `GET/POST /api/job-titles`, `PATCH /api/job-titles/{id}`, `PatchUser.job_title_id`, ป้ายใน Members/Directory/Workload, filter users/tasks/reports, CSV `assignee_job_title`, audit; UI หน้า Users/Reports/Admin › Job titles
- **T-081 Permissions/manager** — migration `0006_permissions` (`user_permissions`, `users.permissions_version`, role `manager`; SQLite rebuild ตาราง, SQL Server ขยายคอลัมน์ 7 ตัวอักษร), catalog + GET/PUT สิทธิ์รายคน (Admin ไม่ใช่ตนเอง, version 409), authorization อ่าน key ใหม่ทุก request (P-01/P-03/P-04/P-06/P-08), BR-22 demote manager→editor ใน transaction เดียว + audit
- **T-082 Admin center** — แท็บ Members/Teams/Job titles/Permissions, matrix ติ๊กรายคน, เลือกหลายคน + preset PM/SM/Clear, สรุปก่อนบันทึก, `PUT /api/permissions/matrix` all-or-nothing + 409 ระบุผู้ใช้, Settings แสดงสิทธิ์ตนเองแบบอ่านอย่างเดียว
- Contract 1.3.0: 63 routes/93 schemas; SRS §12.2, Task §21, API Contract อัปเดตพร้อมกัน

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| build/check/test:test-plan | PASS / PASS / 17/17 PASS |
| check:contract / test:contract | PASS (63 routes) / 64/64 PASS |
| typecheck / lint / build | PASS / PASS / PASS (มี warning chunk >500kB เดิม) |
| Node regression ทุก suite (รวม permissions ใหม่ 3 test: AT-31/32/33 ระดับ HTTP) | 436/436 PASS |
| Frontend vitest | 38/38 PASS |
| Migration fresh 0000–0006 และ upgrade 0004→0006 ที่มีข้อมูลสมาชิก | PASS (SQLite) |
| Browser mock T-079: 13 หน้า × 360/768/1440 ไม่มี horizontal scroll; N/Esc; Reduce animations; console error 0 | PASS (`/` ผ่านด้วย keydown event) |
| Browser แอปจริง: Admin center, preset→สรุป→บันทึก, stale 409, 375px, Settings ของสมาชิก | PASS |

แก้ระหว่างทดสอบ: ค่าคาดหวัง planning ที่ค้างจาก T-078 (143→168), จำนวน route ในเทสต์ (56→63), trash list ยังกั้นเฉพาะ Lead (แก้ให้ manager ที่มี P-04 ผ่าน), toast/dialog ตอน 409, ปุ่มลัด N ใน mock

## ยังไม่ได้รัน / ข้อจำกัด

- SQL Server 2022 native (migration 0005/0006 และ AT-31–33), Windows, UAT, browser matrix เต็ม: **NOT_RUN**
- เจ้าของยังไม่ได้รีวิว mock (AT-39); `prefers-reduced-motion` ระดับ OS ไม่ได้ emulate; ไม่มี 60fps trace
- ยังไม่มี two-process race test ของ permission matrix; negative test ยังไม่ครบทุก P-key × role × endpoint (ครอบคลุม P-01/P-03/P-04/P-08 + self/non-Admin/stale/BR-22)
- P-02 ใช้สิทธิ์ Editor เดิม; P-05/P-07/P-09/P-10 เก็บและแสดงได้ แต่ยังไม่มี endpoint (T-084/T-088) จึงยังไม่ให้สิทธิ์เพิ่ม
- ผู้สร้างโปรเจกต์ด้วย P-08 ที่ไม่มี P-01–P-07 จะได้ role `editor` (รักษา invariant BR-22) — รอเจ้าของยืนยัน
- ไม่ได้ commit ตามคำสั่งเจ้าของ
