# UI Audit เทียบ Vibe Preview — 2026-10-09

ต้นแบบ: `TeamFlow_UI_Vibe_Preview.html` (owner-approved). แอปจริง: build ปัจจุบัน (295ca55), SQLite local, 1440×900, ข้อมูลทดสอบแยกที่ `/private/tmp/friday-audit`.
ระดับ: **H** = โครงสร้าง/ใช้งานผิด, **M** = ต่างจาก mock ชัดเจน, **L** = ขัดเกลา

## ทุกหน้า (shell)
| # | ระดับ | ปัญหา | mock |
|---|---|---|---|
| G1 | H | หัวหน้าซ้อน: ป้าย "Shared workspace" + h1 + เส้นคั่น แล้วเนื้อหามี h1/breadcrumb ของตัวเองซ้ำอีกชั้น (My work, Calendar) | breadcrumb "Workspace › หน้า" + h1 + คำอธิบาย ชั้นเดียว |
| G2 | M | ไม่มี breadcrumb มาตรฐานบนสุด (มีแค่ "Shared workspace") | มีทุกหน้า |
| G3 | M | ปุ่ม pager ("Previous/Next page", "Page 1 · Total…") แสดงแม้มีหน้าเดียวหรือ 0 รายการ | ไม่แสดง |
| G4 | M | ปุ่มแบบ native สีเทา ไม่ใช่ปุ่ม Vibe (Teams, Admin, Projects, Settings) | Vibe button/secondary |
| G5 | L | ปุ่ม "Install app" ลอยมุมขวาล่างทุกหน้า บังเนื้อหา | ไม่มีในหน้าที่ล็อกอินแล้ว |
| G6 | M | ข้อความ error จาก API เป็นภาษาไทย (เช่น "คำขอไม่ถูกต้อง…") ใน UI ภาษาอังกฤษ | English |

## รายหน้า
| หน้า | ระดับ | ปัญหา |
|---|---|---|
| Home | M | ชื่อ "Team workspace" + widget แบบลิงก์ขีดเส้นใต้/การ์ดขอบเทา ไม่ใช่สไตล์ mock; mock = "Home" + คำอธิบาย |
| My work | H | หัวซ้อน (G1); ปุ่ม "Assigned to me/Created by me" เป็นปุ่ม native แทน dropdown "Assigned to me ▾"; ตารางเป็นลิงก์สีฟ้าทั้งแถว + คอลัมน์ Project/Checklist/ปุ่ม "Open task #n" — mock ใช้ตารางกลุ่มเดียวกับ Main table (Assignee avatar, status pill, priority pill, วันที่มีไอคอน); วันที่รูปแบบ 2026-10-06 แทน "6 Oct" |
| All projects | M | การ์ดไม่มีแถบหัวสี/ไอคอน, progress bar, จำนวนงาน, avatar; ปุ่ม Tasks/Edit/Archive/Members แสดงบนการ์ดตลอด; ไม่แยก Active/Archived; ใช้ checkbox "Include archived" + "Refresh list" |
| Project › Main table | M | มีคอลัมน์ "Select" + checkbox ทุกแถว; Priority เป็น select native แทน pill; วันที่เป็น input dd/mm/yyyy native แทน "📅 1 Oct"; แท็บเกิน (Docs/Files/Workload/Overview) ทำแถวแน่น; sort "Earliest End Plan" แทน "Board order"; ไม่มี completion summary ท้ายกลุ่ม |
| Work calendar | H | หัวซ้อน (G1); breadcrumb ผิด "My work"; แท็บเริ่มที่ Main table (ภาพจากเจ้าของ) / ปฏิทินมีงานล้นเซลล์ ("More 1 tasks · See the list below"); ปุ่มเดือนเป็นปุ่ม native แทน ‹ › + Today |
| Reports overview | M | ชื่อ "Reports" (mock "Work overview"); ไม่มี donut สถานะ / bar ตามผู้รับผิดชอบ / การ์ด KPI มีไอคอน; ตัวกรองไม่อยู่ในกรอบ |
| Teams & members | M | ตาราง + ปุ่ม Edit/Archive/Members/Workload ทุกแถว; mock = การ์ดทีม (Lead, จำนวนสมาชิก, avatar, "View members →") |
| Settings | H | หน้าเดียวยาว (Organization, Motion, Profile, My permissions P-01…) ไม่มีเมนูซ้าย Profile/Change password/Appearance; Profile เป็นข้อความเรียงไม่มีฟอร์ม |
| Notify | H | คลิก Notify ไปหน้าเต็ม `/notifications` (ค้าง "Loading…" ช่วงแรก) แทน popover ขวาบนพร้อม Mark all read / View all |
| Admin | M | ตารางปุ่มยาวต่อแถว (Edit/Deactivate/Reset password + username); คอลัมน์ Status แสดง "Activate" แทนสถานะจริง (บั๊ก) |
| Task drawer | L | ใกล้ mock แล้ว; มีปุ่ม "Review latest data" โผล่ตลอดที่หัว |

## ข้อจำกัดของการตรวจ
ยังไม่ได้ตรวจ Kanban/Gantt/Docs/Files/Workload/Overview ในโปรเจกต์, Trash, มือถือ 375px และ dark mode. ข้อมูลทดสอบมีงานซ้ำ 3 ชุดจาก seed script (ไม่ใช่บั๊กแอป).

## รอบ 2 — หน้าที่ยังไม่ได้ตรวจ (2026-10-09, port 5000, demo data)
| หน้า | ระดับ | ปัญหา |
|---|---|---|
| P1 ทุกแท็บในโปรเจกต์ยกเว้น Main table/Kanban | M | Gantt, Docs, Files, Workload, Overview ชิดขอบซ้ายไม่มี padding (แบบที่ Calendar เคยเป็น) |
| Kanban | M | การ์ดแน่นเกิน: FR-id + กลุ่ม + priority + checklist + Start/End + avatar + dropdown สถานะ + ลิงก์ "Manage task #n" ในการ์ดเดียว; ปุ่ม "Board filters/Refresh board" เป็นปุ่มพื้น |
| Gantt | M | ปุ่ม "Previous period/Today/Next period" แบบข้อความยาว; ป้าย "#2 Weekly…" มี id; bar สั้นตัดชื่อ "Week…"; ข้อความอธิบายยาว; มี Groups/New Group ที่ไม่เกี่ยวกับ Gantt |
| Docs | L | หน้าว่างโล่ง "Select a doc" ลอย; ปุ่ม "+ New doc" เล็ก; ไม่มี empty state แบบ Vibe |
| Files | L | ใช้ได้; empty state เรียบเกิน |
| Workload | L | ปุ่ม Previous/This/Next week แบบพื้น; ตัวเลขในกรอบดูเป็นปุ่ม |
| Overview | M | layout บีบ: Recent activity คอลัมน์แคบมากจนข้อความหักหลายบรรทัด; วันที่แบบ 2026-10-06; ตาราง By assignee/By job title แคบ |
| Trash | L | หัว "Task trash" ซ้ำกับ h1 "Trash"; ตารางว่างไม่มี empty state |
| มือถือ 375px | M | ไม่มี scroll แนวนอนทั้งหน้า (ผ่าน) แต่ Main table เห็นแค่คอลัมน์ Task ต้องเลื่อนในตาราง; ปุ่ม Install app + toast Update ready บังเนื้อหาครึ่งล่าง; แท็บมุมมองถูกตัด |
| Dark mode | — | แอปไม่มี dark mode (ไม่ตอบสนอง prefers-color-scheme) แต่ไม่อยู่ใน Requirements/SRS/mock จึงไม่ถือเป็น defect |

## ผลการแก้ (2026-10-09, SQLite local, Chromium)
- แก้ครบทุกข้อในรอบ 1–2 (G1–G6, My work, Calendar, Settings, Notify, Projects, Main table, Reports, Teams, Admin, Home, Gantt, Overview, Kanban, Docs/Files/Workload/Trash, มือถือ 360/375px); Dark mode ไม่อยู่ในขอบเขต
- บั๊กที่พบระหว่างแก้: toast บังปุ่ม, copy "CreateNext"/"Checklist updated"/"DeleteFiles"/"ConfirmDelete file", Admin status "Activate", popover Vibe ที่ปิดแล้วดันหน้ากว้างเกิน 360px, row menu ถูกแถวล่างทับ, หน้า offline ภาษาไทย, Save แสดงระหว่างตรวจข้อมูลหลังกลับมาออนไลน์
- ผลทดสอบ: Playwright 67/67 PASS (5.7m), `npm test` PASS (Node + frontend 49/49 + contract/test-plan), typecheck PASS, lint 0 error (warning เดิม 1)
- ยังไม่ได้ทำ: SQL Server 2022/Windows/UAT (NOT_RUN), human visual sign-off จากเจ้าของ
