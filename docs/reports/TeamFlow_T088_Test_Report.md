# TeamFlow — ทดสอบ T-088 Workload + Project overview

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS (Darwin 24.6.0), Node 22.23.3, SQLite local ชั่วคราว, Playwright Chromium · **Declared effort:** Medium · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-088-workload-results.json` · **Trace:** FR-50, FR-51, BR-16, AT-37, TC-095, UT-23

## งานที่ทำ (ใหม่ทั้งหมด)

- **Migration 0008** (SQLite + SQL Server): `organizations.workload_threshold` ค่าเริ่มต้น 10, CHECK 1–1000
- **Contract 1.5.0** (80 routes/107 schemas): `GET /api/projects/{id}/workload`, `GET /api/teams/{id}/workload`, `GET /api/projects/{id}/overview`; `Organization.workload_threshold`; `PatchOrganization` ไม่บังคับ name แล้ว อัปเดต SRS §12.2/§12.6, Task §21 และ API Contract doc (รวมถึง routes ของ 1.4.0 ที่ยังขาดในเอกสาร)
- **Backend:** `src/domain/workload.ts` (หาวันจันทร์ของสัปดาห์และสัปดาห์ที่ช่วง start–due ทับ); `src/services/insights.ts` ใช้ `taskQuery` เดียวกับ My work/รายงาน (BR-16); สิทธิ์ `team_workload` ให้เฉพาะ Admin, Lead ของทีม หรือสมาชิกที่มี P-09 (ทีมไม่มี 404); Admin ตั้ง threshold ได้ผ่าน `PATCH /api/organization` และบันทึก audit ค่าก่อน/หลัง
- **Frontend:** แท็บ Workload/Overview ในโปรเจกต์; ปุ่ม Workload ในหน้า Teams (เห็นเฉพาะ Admin/Lead/P-09); เลื่อนสัปดาห์ได้; คลิกช่องเพื่อดูรายการงาน; ไฮไลต์เมื่อ > threshold; ช่อง Workload threshold ใน Profile & settings; CSS ของ widget กลางที่ใช้ร่วมกับ Home ของ T-083 (ซึ่งก่อนหน้านี้ยังไม่มี style)
- **การตีความ:** Overview ของโปรเจกต์เปิดให้ทุกคนที่อ่านโปรเจกต์ได้ ตาม matrix SRS §4.4 ที่ให้ Editor/Viewer เห็น "ตามโปรเจกต์ที่เข้าถึง" ทำให้ P-07 ยังไม่ได้ให้สิทธิ์อะไรเพิ่มในตอนนี้

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| `tests/helpers/workload.test.ts` (ขอบสัปดาห์/เดือน/ปี/leap, start-only/due-only/cross-week/no date) | 2/2 PASS |
| AT-37 HTTP: from วันอาทิตย์ → จันทร์, counts [2,2,1] + no_date 1, done ไม่นับ, แถว unassigned อยู่ท้าย, job title; threshold Admin เท่านั้น / 0 และ 1001 → 422; ทีมไม่มี P-09 → 403 / ทีมไม่มี → 404 / มี P-09 → ไม่เห็นงานของโปรเจกต์ที่เข้าไม่ได้; overview total 7 / done 1 / 14% / overdue 1 / by_status / by_assignee / by_job_title / activity; Viewer 200; คนนอก 404 | 1/1 PASS |
| Frontend `insights.test.tsx` (10 ไม่ไฮไลต์ / 11 ไฮไลต์, รายการในช่อง, overview render) | 3/3 PASS |
| Chromium `tests/browser/workload-overview.spec.ts` (server จริง): ไฮไลต์ตาม threshold, dialog ช่อง No date, Overview, workload ทีมจากหน้า Teams + Next week, ฟอร์ม threshold ปิด Save เมื่อค่า 0 และบันทึก 12 ได้หลัง reload | 1/1 PASS |
| `npm test` ทุก suite | Node 449/449 + frontend 47/47 PASS |
| typecheck / lint / build / check:contract / test:contract | PASS / PASS (warning เดิม 1) / PASS / PASS 80 routes / 64/64 |

## ยังไม่ได้รัน / ข้อจำกัด

- SQL Server 2022 (migration 0008, `TOP 10` query), Windows, UAT: NOT_RUN — AT-37/TC-095 ใน Test Run Register คง NOT_RUN จนรันใน T-091
- คำนวณใน memory สูงสุด 5,000 งานที่ยังเปิดต่อคำขอ (มี `truncated`) เพียงพอสำหรับ ~30 ผู้ใช้ แต่ยังไม่ได้วัด performance
- Fixture มีผู้ใช้ 2 คน: Lead ทีมเจ้าของ (ไม่ใช่ Admin) ยังไม่ได้ทดสอบแยก
