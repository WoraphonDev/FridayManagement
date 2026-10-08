# T-012 — Frontend shell/navigation evidence

วันที่ 6 ตุลาคม 2026 · DONE เฉพาะ frontend shell · declared effort Medium; actual model/effort/speed NOT_VERIFIED

Dependencies T-005/T-003 DONE; trace FR-35/NFR-05/NFR-06, SRS §11. สร้าง layout/Thai navigation/favicon, shared form/dialog/table/toast/error/loading/empty components และ API client ที่จัด 401/403/404/409/503/offline โดยไม่ reset caller draft หรือส่งซ้ำอัตโนมัติ เมนูและ direct frontend routes จำกัดจาก validated Self; unknown/inactive identity ไม่เปิดเมนูส่วนตัว และ forced password เปิดเฉพาะหน้าแรก/โปรไฟล์

## ผลที่รันจริง

Environment: macOS local, Node22.23.3/npm10.9.9, temporary SQLite; Playwright1.63.0 Chromium153.0.8010.12 headless, loopback43171 แยกจากโปรเจกต์อื่น

| Check | Result | Evidence |
| --- | --- | --- |
| Typecheck / ESLint / production build | PASS | strict server/frontend/tools; build หลังแก้ responsive CSS |
| Frontend unit/SSR | PASS 16/16 | frontend/src/App.test.tsx, api.test.tsx, shared/components.test.tsx |
| Browser shell | PASS 5/5 | tests/browser/foundation.spec.ts, shell.spec.ts; member/admin/lead/forced menus, denied direct URL, deep-link reload, invalid Self, offline, favicon |
| Keyboard/mobile | PASS scoped shell | native dialog Tab trap/Escape/focus return; 360px at 200% text size ไม่มี horizontal overflow |
| Foundation HTTP regression | PASS 1/1 | tests/foundation/http.test.ts; live200, ready503, writes503, hidden .env404 |
| Locked API contract | PASS | check:contract 52 routes/75 schemas; Self fixtures 4/4 validate against OpenAPI |

พบ horizontal overflow ในรอบแรกที่ 200% text: แก้ grid minimum width, brand wrapping และ mobile navigation minimum; รัน browser ทั้ง5กรณีใหม่ผ่าน ไม่มีการเปลี่ยน API schemas/wire format

## ขอบเขตหลักฐานและงานค้าง

Identity/role HTTP responses ใน browser tests เป็น synthetic fixtures; ไม่ใช่ real login/session/backend ACL acceptance. แอปจริง /api/me ยัง503 SERVICE_NOT_READY และ business pages เป็น placeholders ตาม tasks ถัดไป Shared form/labels/table/error ใช้ unit/SSR evidence; business form workflows ยังไม่พร้อม

เป็น partial TC-073 shell evidence เท่านั้น; full TC-073/TC-074/browser-device matrix/AT-18/AT-26, real auth/ACL, SQL2022/Windows/UAT ยัง NOT_RUN. tests/execution-records.json คงว่าง; ไม่ยกผลย่อยเป็น full application PASS

Task Register: DONE6/77 · IN_PROGRESS2 · TODO69 · remaining71. T-006/T-007 High รอ real SQL2022 evidence; T-008 High ยัง WAIT_DEPENDENCY(T-007), T-009 High WAIT_DEPENDENCY(T-006). ไม่มี TODO task ใหม่ที่ dependencies DONE ครบ ไม่มี commit/deploy/server/DNS/runtime ส่วนกลางเปลี่ยนแปลง
