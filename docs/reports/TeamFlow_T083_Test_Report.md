# TeamFlow — ทดสอบ T-083 My overview + My work grouped table

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS (Darwin 24.6.0), Node 22.23.3, SQLite local ชั่วคราว, Playwright Chromium · **Declared effort:** Medium · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-083-my-overview-results.json` · **Trace:** FR-44, FR-45, AT-34, TC-091, UT-02, UT-23

## สถานะก่อนเริ่ม

โค้ดส่วนแรกของ T-083 ถูก commit มาพร้อม `3a76fd7` โดยยังไม่ได้บันทึกใน Task Register ได้แก่ `GET /api/me/overview`, `MyOverview.tsx`, กลุ่ม My work และ `tests/addendum/http.test.ts` แต่ไฟล์เทสยังไม่ได้อยู่ใน `npm test`/lint จึงตรวจเทียบกับ AT-34 ใหม่ทั้งหมด ไม่ได้ถือว่าเสร็จจากการที่มีโค้ดอยู่แล้ว

## จุดที่ไม่ผ่าน AT-34 และแก้แล้ว

1. **ตัวเลข This week ไม่ตรงกลุ่ม My work** — overview นับรวมงานที่ครบกำหนดวันนี้ แต่กลุ่ม This week ไม่นับ ตอนนี้แก้ให้ `due_this_week` นับเฉพาะวันที่หลังวันนี้จนถึงวันอาทิตย์ (สัปดาห์เริ่มจันทร์ เวลา Bangkok) และบน Home ใช้ชื่อ "Later this week"
2. **Done in 7 days ใช้ช่วงย้อนหลัง 168 ชั่วโมง** ซึ่งกรองใน My work ไม่ได้ เปลี่ยนเป็นวันที่ Bangkok today-6..today ให้ตรงกับ `date_basis=completed&date_from`
3. **คลิก widget แล้วไม่มีการกรองจริง** — เดิมแค่เลื่อนไปที่ anchor ซึ่งไม่ถูกต้องเมื่อแบ่งหน้าละ 20 รายการ ตอนนี้ link ส่ง `range`/`status`/`project`/`completed_from` และ My work อ่านค่าผ่าน `myWorkFilters()` (ค่าที่ไม่รู้จักถูกทิ้ง ไม่ขยาย query)
4. ลิงก์ "Open work by project" เดิมไปที่ `/projects` เปลี่ยนเป็น My work กรองตามโปรเจกต์; แถบสถานะคลิกได้; เพิ่มตัวกรอง Due range "This week" และป้าย "Future" ที่หายไป
5. เทสเดิม `tests/api/http.test.ts` ยังนับ 63 routes ทั้งที่ contract เป็น 77 แล้ว (fail อยู่ก่อนแก้ครั้งนี้) แก้เป็น 77

ไม่เปลี่ยน contract/schema/migration (`MyOverview` schema คงเดิม เปลี่ยนเฉพาะวิธีนับ)

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| `tests/addendum` (AT-34 ×2 + AT-35/36/38) — ทุก widget = จำนวนแถวของ link My work จริง, กลุ่ม grouped table, toggle ได้รับมอบหมาย/ฉันสร้าง, ข้ามเที่ยงคืน Bangkok, ถอนสิทธิ์แล้วตัวเลขลดลง, link ปลอมถูกทิ้ง | 5/5 PASS |
| `npm test` ทุก suite (เพิ่ม `test:addendum`) | Node 441/441 + frontend 42/42 PASS |
| Frontend ใหม่ `my-overview.test.tsx` (href ทุก widget, link→query, ขอบสัปดาห์/ข้ามปี) | 3/3 PASS |
| Chromium `tests/browser/my-overview.spec.ts` (server จริง): Overdue/No date/project link กรองถูก, เปลี่ยนสถานะ inline → กลุ่ม Done, Home อัปเดต Done in 7 days, 375px ไม่มี horizontal scroll | 1/1 PASS |
| typecheck / lint / build | PASS / PASS (warning `react-refresh` เดิม 1) / PASS |
| check:contract / test:contract / check+test:test-plan | PASS 77 routes / 64/64 / PASS 17/17 |

## ยังไม่ได้รัน / ข้อจำกัด

- SQL Server 2022, Windows, UAT ผู้ใช้จริง: NOT_RUN — AT-34/TC-091 ใน Test Run Register คง NOT_RUN จนรันครบใน T-091
- My work ไม่มีสิทธิ์รายงาน: dropdown สถานะยังเปิดได้แม้งานใน "Created by me" ที่ผู้ใช้ไม่มีสิทธิ์เขียนแล้ว แต่ server ตอบ 403 และแสดงข้อผิดพลาด (ขอบเขตสิทธิ์อยู่ฝั่ง server) — ควรเพิ่ม field สิทธิ์ใน Task DTO ภายหลังถ้าเจ้าของต้องการ
- ชุด browser เดิมบางไฟล์ (เช่น `shell.spec.ts`) ยังใช้ป้ายภาษาไทยก่อนเปลี่ยนเป็น English-base ไม่ได้รันในรอบนี้
- พบโค้ด T-084–T-087 ที่มีอยู่แล้วแต่ยังไม่ได้บันทึก (Docs/Files/batch/@mention) ยังไม่ได้ตรวจรับในรอบนี้
