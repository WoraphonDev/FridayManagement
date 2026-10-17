# TeamFlow — ทดสอบ T-090 Favorites

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS (Darwin 24.6.0), Node 22.23.3, SQLite local ชั่วคราว, Playwright Chromium · **Declared effort:** Low (ตรวจก่อนปิดแบบ Medium ตาม Task) · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-090-favorites-results.json` · **Trace:** FR-47, AT-40, SRS §9.11

## งานที่ทำ (ใหม่ทั้งหมด)

- **Migration 0009** (SQLite + SQL Server): `user_favorites(user_id, project_id, created_at)` PK คู่ + FK NO ACTION + index ตาม project
- **Contract 1.6.0** (83 routes/108 schemas): `GET /api/me/favorites`, `PUT /api/me/favorites/{id}` (ต้องอ่านโปรเจกต์ได้ ไม่งั้น 404, ทำซ้ำได้, ไม่เกิน 100), `DELETE /api/me/favorites/{id}` (ลบเฉพาะของตนเอง) ทุกตัวคืน `Favorites` ล่าสุด; path ใช้ `{id}` (= project id) ตามแบบเดียวกับ route อื่น
- **ถอนสิทธิ์:** เพิ่ม `cleanupFavorites()` ใน `cleanupAssignments()` ซึ่งถูกเรียกใน transaction เดียวกับการเปลี่ยนสมาชิกทีม/โปรเจกต์/บัญชีทุกครั้ง โดยจะลบ favorite ที่ไม่มีทาง Admin/Lead/สมาชิกโปรเจกต์แล้ว นอกจากนี้ GET ยังกรองตามสิทธิ์ปัจจุบันทุกครั้ง (ผู้ใช้ที่ถูกปิดหรือถูกบังคับเปลี่ยนรหัสจะไม่เห็นรายการ แต่ข้อมูลยังเก็บไว้)
- **Frontend:** ปุ่มดาวในหัวโปรเจกต์ (`aria-pressed`), ส่วน Favorites บนสุดของ sidebar, sync ระหว่าง header และ sidebar ด้วย event ภายในแท็บ

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| AT-40 HTTP: เพิ่มซ้ำได้, ของใครของมัน (Admin/Member ไม่กระทบกัน), ไม่มีสิทธิ์/ไม่มีโปรเจกต์ → 404 และไม่บันทึก, Lead ทีม favorite ได้ และหายเมื่อถูกถอด lead, ถอนสมาชิกโปรเจกต์ → ลบ row, ได้สิทธิ์คืนแล้วไม่กลับมาเอง, จำกัด 100 → 422 | 1/1 PASS |
| Schema/foundation (migration 0000–0009, FK 50 ตัว NO ACTION, STRICT) | 18/18 PASS |
| Chromium `tests/browser/favorites.spec.ts`: ติดดาว → Favorites เป็น section แรกของ sidebar, คงอยู่หลัง reload, คลิกแล้วเปิดโปรเจกต์, เอาดาวออกแล้ว section หาย | 1/1 PASS |
| `npm test` ทุก suite | Node 450/450 + frontend 47/47 PASS |
| typecheck / lint / build / check:contract | PASS / PASS (warning เดิม 1) / PASS / PASS 83 routes |
| Browser addendum ทั้งหมด (favorites, workload-overview, project-files, project-docs, my-overview) | 5/5 PASS |

## ยังไม่ได้รัน / ข้อจำกัด

- SQL Server 2022 (migration 0009, correlated DELETE), Windows, UAT: NOT_RUN — AT-40 ใน Test Run Register คง NOT_RUN จนรันใน T-091
- ยังไม่มีการเรียงลำดับ favorite เอง (เรียงตามเวลาที่ติดดาว) และยังไม่ได้ทำ Updates feed ซึ่ง FR-46 เลื่อนไปรอบถัดไปตามขอบเขต
