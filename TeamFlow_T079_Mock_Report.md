# TeamFlow — T-079 Monday-style Mock Report

**วันที่:** 8 ตุลาคม 2026 · **Task:** T-079 (Declared Medium; actual model/effort NOT_VERIFIED) · **สถานะ:** IN_REVIEW (รอเจ้าของรีวิว)

## ผลงาน

- `TeamFlow_UI_Monday_Mock.html` — standalone HTML ไฟล์เดียว, synthetic data, CSP `default-src 'none'`, ไม่มี network/API/CDN, ฟอนต์ระบบ
- หน้า: Login (AN-13), Home/My overview, My work (grouped), All projects/Favorites/Your projects, Project header + แท็บ Main table/Kanban/Calendar/Gantt/Workload/Docs/Files/Overview (ซ่อน/แสดงแท็บ), Task side panel (Updates/@mention/Files/Activity), Admin (Members/Teams/Job titles/Permission matrix P-01–P-10 + preset PM/SM/Clear), Settings (Reduce animations, confetti toggle)
- Motion AN-01–AN-13 ด้วย transform/opacity; `prefers-reduced-motion` + toggle ปิด motion; คีย์ลัด `N`, `/`, `Esc`
- ใช้ token สี/ขนาดตาม V06 workspace-theme; **ไม่ได้ bundle `@vibe/core` จริง** ใน mock นี้ (UX-01 สำหรับแอปจริงยังคงใช้ Vibe)

## ผลตรวจ

ทดสอบรวมชุด T-078–T-082 (`TeamFlow_T078_T082_Test_Report.md`): 13 หน้า × 360/768/1440px ไม่มี horizontal scroll, `N`/`Esc` ผ่าน (แก้ bug `N` ที่พิมพ์ตัว n ลงช่อง Add task), `/` ผ่านด้วย keydown event, toggle Reduce animations ปิด animation/transition, console error 0. `prefers-reduced-motion` ระดับ OS และ 60fps trace ยัง NOT_RUN

## ข้อจำกัด

- ยังไม่มีผลรีวิวของเจ้าของ; ไม่ติ๊กแทน (AT-39 NOT_RUN)
- ไม่แก้แอปจริงใน T-079; T-086/T-087/T-089 รอผลรีวิว
