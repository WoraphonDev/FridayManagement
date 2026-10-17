# TeamFlow — ทดสอบ T-089 Motion system + preferences

**วันที่:** 8 ตุลาคม 2026 · **Environment:** macOS (Darwin 24.6.0), Node 22.23.3, SQLite local ชั่วคราว, Playwright headless Chromium · **Declared effort:** Medium · actual model/effort NOT_VERIFIED
**Evidence:** `reports/T-089-motion-results.json`, `reports/T-089-motion-trace.json` · **Trace:** NFR-09, UX-01–UX-06, AN-01–AN-12, AT-39

## ก่อนเริ่ม

เจ้าของอนุมัติ mock T-079 ในแชทเมื่อ 8 ต.ค. 2026 โดยไม่มีข้อแก้ จึงปิด T-079 เป็น DONE (AT-39 ของแอปจริงยังรอ T-091)

## งานที่ทำ

- **Preferences (ใหม่):** migration 0010 `user_preferences` (JSON ≤ 4,000 ตัวอักษร), contract 1.7.0 (85 routes/110 schemas) `GET/PATCH /api/me/preferences` รับเฉพาะ key ที่อนุญาต ได้แก่ `reduce_motion`, `confetti` (ค่าเริ่มต้นเปิด), `column_widths` (60–800px, ≤30 key) และ `hidden_tabs` ใช้ได้เฉพาะของตนเอง ค่าที่ PATCH จะถูก merge กับค่าเดิม
- **Motion (`motion.css`, `motion.ts`):** AN-01 เปลี่ยนหน้า/view (fade+slide 6px), AN-02 keyframes ของ side panel (เปิดใช้ใน T-087), AN-03 pulse ตอนเปลี่ยนสถานะ, AN-04 confetti เมื่อเป็น Done (≤1 ครั้ง/2 วินาที, `pointer-events: none`), AN-05 Kanban ยกการ์ดขณะลาก (เอียงเฉพาะ content เพราะ dnd-kit คุม transform ของการ์ด), AN-06 chevron/เนื้อหา group, AN-07 แถวใหม่ highlight, AN-08 skeleton shimmer, AN-09 badge pop เมื่อมีแจ้งเตือนเพิ่ม, AN-10 count-up และ bar โตจาก 0, AN-11 hover/press, AN-12 toast slide-up พร้อมแถบเวลา ทุกตัวใช้ transform/opacity เท่านั้น
- **Reduced motion:** ปิดได้ทั้งจาก `html.reduce-motion` (ค่าใน Settings) และ `prefers-reduced-motion` ของระบบ โดยย่อ duration เหลือ 0.01ms แทนการตั้งเป็น `none` เพื่อให้ component ที่รอ animationend ยังทำงานได้; JS motion (page, Kanban FLIP, confetti, count-up) เช็ก `motionAllowed()`
- **Settings:** ส่วน Motion ใน Profile & settings มีตัวเลือก Reduce animations และ Confetti
- **แก้ระหว่างทดสอบ:** (1) confetti/pulse ไม่ขึ้น เพราะตารางถูก mount ใหม่หลังบันทึก จึงเปลี่ยนให้เล่นตอนผู้ใช้เลือกสถานะ; (2) regression จาก T-090: ปุ่มดาวอยู่ใน `<h1>` ทำให้ชื่อ heading เปลี่ยน จึงย้ายออกมาเป็นปุ่มข้าง heading

## ผลทดสอบ (รันจริง)

| ชุด | ผล |
|---|---|
| Preferences HTTP (ค่าเริ่มต้น, merge, ผู้อื่นไม่กระทบ, key/ขอบเขตผิด 7 แบบ → 422) | 1/1 PASS |
| Chromium `tests/browser/motion.spec.ts`: pulse + confetti เมื่อเป็น Done, confetti `pointer-events: none`, กดเปลี่ยน view ได้ทันทีขณะ animation, เปิด Reduce animations แล้วบันทึกและคงอยู่หลัง reload, toast duration ≈0, ไม่มี confetti, `prefers-reduced-motion` ของระบบชนะแม้ปิด preference | 1/1 PASS (รันซ้ำ 3/3 + รอบรวม) |
| Frame timing ขณะเปลี่ยนเป็น Done + confetti 900ms (rAF, headless) | 55 frames, 60 fps, p95 17ms |
| Schema/foundation (migration 0000–0010, FK 51) | 18/18 PASS |
| `npm test` ทุก suite | Node 451/451 + frontend 47/47 PASS |
| Browser addendum + vibe-integration | 9/10 PASS — ตัวที่ fail คือ `vibe-integration` ตรวจความสูงแถว 38px แต่ได้ 39.78px ซึ่ง fail มาตั้งแต่ `3a76fd7` (bisect 3 commit) ไม่เกี่ยวกับงานนี้ |
| typecheck / lint / build / check:contract | PASS / PASS (warning เดิม 1) / PASS / PASS 85 routes |

## ยังไม่ได้รัน / ข้อจำกัด

- frame timing วัดด้วย requestAnimationFrame บน headless Chromium ยังไม่ใช่ performance trace บนเครื่อง/GPU จริง และยังไม่ได้วัด Kanban drag หรือ side panel; AT-39 ต้องให้เจ้าของเทียบแอปจริงกับ mock และ UAT ใน T-091
- SQL Server 2022 (migration 0010), Windows: NOT_RUN
- AN-02 side panel จะตรวจใน T-087
