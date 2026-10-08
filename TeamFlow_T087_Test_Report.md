# TeamFlow — ทดสอบ T-087 Task side panel

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS (Darwin 24.6.0), Node 22.23.3, SQLite local ชั่วคราว, Playwright Chromium · **Declared effort:** Medium · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-087-side-panel-results.json` · **Trace:** FR-53, AT-38 (ส่วน side panel), TC-097

## สถานะก่อนเริ่ม

มีอยู่แล้ว: drawer ด้านขวาเต็มความสูง (`dialog.task-editor`, เต็มจอเมื่อจอแคบ), แท็บ, focus trap และ Esc ของ Dialog, deep link `/projects/{id}/tasks/{taskId}` ที่ GET ตรวจสิทธิ์ก่อนแสดง และ backend @mention token `@[Name](#user-ID)` ที่แจ้งเตือนผ่าน notification เดิม (AT-38 HTTP) ส่วนที่ยังขาดคือ UI ของ @mention และชื่อแท็บที่ไม่ตรง spec

## สิ่งที่ทำ

1. **ชื่อแท็บ:** Details / Checklist / Updates / Files / Activity (เดิมเป็น Comments, History)
2. **@mention:** พิมพ์ `@` แล้วแสดงรายการจาก `GET /api/projects/{id}/members` (เฉพาะผู้ใช้ active ที่เข้าโปรเจกต์ได้ ไม่รวมตัวเอง สูงสุด 8 คน พร้อมตำแหน่ง); เลือกได้ด้วยลูกศร + Enter/Tab หรือเมาส์; แทรก token ให้; Esc ปิดเฉพาะรายการโดยไม่ปิด panel; ตอนแสดง comment แยก token เป็นข้อความ `@ชื่อ` ไม่มี HTML (`mentions.ts`)
3. CSS สำหรับ mention และรายการแนะนำ

ไม่เปลี่ยน contract/backend

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| AT-38 HTTP เดิม (@mention แจ้งเตือนเฉพาะผู้เข้าถึงโปรเจกต์) | 1/1 PASS |
| Frontend `mentions.test.ts` (token ไทย/วงเล็บ, แยก token แบบ text-only, ตรวจ query ก่อน caret) | 2/2 PASS |
| Chromium `tests/browser/side-panel.spec.ts` (server จริง): แท็บครบ, panel ชิดขวา, รายการ @ แสดงเฉพาะสมาชิกโปรเจกต์ (คนนอกที่ชื่อคล้ายกันไม่แสดง), Esc ปิดรายการแต่ panel ยังเปิด, Enter แทรก token, โพสต์แล้วแสดง `@ชื่อ`, Tab 25 ครั้ง focus ยังอยู่ใน panel, Esc ปิด panel และ focus กลับไปที่ปุ่มที่เปิด, deep link เปิด panel / task ที่ไม่มีไม่เปิด, 375px เต็มจอ | 1/1 PASS (รันซ้ำ 3/3) |
| `npm test` ทุก suite | Node 451/451 + frontend 49/49 PASS |
| Browser addendum ทั้ง 8 spec | 8/8 PASS |
| typecheck / lint / build | PASS / PASS (warning เดิม 1) / PASS |

## ยังไม่ได้รัน / ข้อจำกัด

- SQL Server 2022, Windows, UAT: NOT_RUN — AT-38/TC-097 ใน Test Run Register คง NOT_RUN จนรันใน T-091
- รายการแนะนำใช้ข้อมูลสมาชิกตอนที่พิมพ์ `@` ครั้งแรก ถ้าสิทธิ์เปลี่ยนระหว่างนั้น server ยังเป็นผู้ตัดสินว่าใครได้รับแจ้งเตือน
- ยังไม่ได้ทดสอบแบบแยกว่าผู้ถูก mention ได้รับแจ้งเตือนผ่าน browser (ครอบคลุมใน HTTP AT-38 แล้ว)
