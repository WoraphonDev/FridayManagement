# Friday UI redesign — review before implementation

วันที่ 7 ตุลาคม 2026 · Design proposal 06 · Vibe / English / Compact + Color · ข้อมูลสมมติเท่านั้น

เจ้าของขอปรับ UI ทั้งระบบให้ใกล้ Monday เพิ่ม animation และขอดู mockup HTML อย่างละเอียดก่อนแก้แอปจริง งานรอบนี้ส่งตัวอย่างและหลักฐานการรีวิวเท่านั้น ไม่ใช่ implementation หรือ acceptance ของระบบจริง

## เปิดดูและทดลอง

เปิด `TeamFlow_UI_Vibe_Preview.html` โดยตรง (รุ่น Vibe ล่าสุด) หรือ [เปิด preview ที่กำลังรัน](http://127.0.0.1:43191/TeamFlow_UI_Vibe_Preview.html) โดยตรงใน browser ได้โดยไม่ต้องติดตั้ง dependency หรือเปิด backend กด **ทดลองใช้ข้อมูลตัวอย่าง** จากหน้า Login แล้วใช้ **แผนหน้าจอ / Process** ในแถบสีครีมเพื่อดูรายละเอียดและเปิดแต่ละหน้าจอ

- แถบสีครีมเป็นเครื่องมือรีวิว แยกจาก UI ที่เสนอ: สลับบทบาท สภาวะ และ animation
- ข้อมูลเก็บในหน่วยความจำของหน้าเท่านั้น ไม่มี API, database, cookie, localStorage หรือ sessionStorage สำหรับข้อมูลตัวอย่าง
- ช่อง username/password/setup token ใช้ดูหน้าตาและ validation เท่านั้น ไม่จัดเก็บ credential กรุณาใช้ค่าตัวอย่าง
- ปุ่ม CSV ดาวน์โหลดข้อมูลสมมติจริง; ตัวกรองรายงานแสดง process ตัวอย่างและระบุชัดว่าชุดข้อมูลยังคงเดิม
- การเลือกไฟล์อ่านเฉพาะ metadata ชื่อ/ขนาด ไม่อ่านเนื้อหาและไม่อัปโหลด
- **เริ่มตัวอย่างใหม่** คืน tasks, Groups, directory, notifications และ trash เป็นข้อมูลตั้งต้น
- ตัวอย่างเดิม `TeamFlow_Mock_UI.html` เก็บไว้; frontend/backend/contracts/runtime/deployment ไม่ถูกแก้ในรอบนี้

## แผนหน้าจอ

| หน้า / process | สิ่งที่รีวิวได้ | อ้างอิงเดิม |
|---|---|---|
| Login | split layout, username/password, show password, help, session expired, rate limit | SRS §6.2 / T-018 |
| First-run Setup | token, organization, Admin username/name/password | SRS §6.1 / T-013 |
| Forced password change | รหัสชั่วคราว/ใหม่/ยืนยัน, mismatch, ปิดหน้างานจนผ่าน | SRS §6.2 / T-018 |
| Home | งาน active, สิ่งที่ต้องโฟกัส, project cards, อัปเดต | SRS §10–11 / T-054 |
| My tasks | assignee=self / created-by-me, วันนี้/เกินกำหนด/ถัดไป/ไม่มีวันส่ง/เสร็จ | SRS §9.2 / T-045 |
| Projects | active/archived directory, create project, owner team คงที่ | SRS §7 / T-024 |
| Table | named Groups / group by status, avatars, priority, Start Plan / End Plan, search/filter/sort | SRS §9.2 / T-045 |
| Kanban | 4 status columns, Group label, Start Plan / End Plan, add/delete Card, drag / dropdown, ปิด drag เมื่อมี filter | SRS §9.1 / T-036–038 |
| Calendar | month navigation, today, due-date events, no-due list | SRS §9.3 / T-046 |
| Gantt | day/week/month, period navigation, inclusive bars, due-only marker, incomplete dates | SRS §9.3.1 / T-046 |
| New/edit task drawer | title/description/category/assignee/priority/status/dates/recurrence; validation/pending/dirty | SRS §8.1 / T-032–033 |
| Checklist | done guard, ครบแล้วไม่ auto-done, reopen ก่อนแก้ checklist ของงานที่บันทึก done แล้ว | SRS §8.2 / T-032–033 |
| Comments/files/history | local comment, preserved draft, file metadata/trash/restore, history read-only | SRS §9.4–9.5 / T-044 |
| Notify | top-right popover/toast, badge, unread/read-one/read-all, เปิดงานที่เกี่ยวข้อง | SRS §9.6 / T-051 |
| Reports / CSV | metric definitions, status ratio, workload, scope/date-basis UI, downloadable demo CSV | SRS §10 / T-054 |
| Teams/members | Lead/member display, Admin team creation, shared-project Editor/Viewer controls | SRS §7 / T-024 |
| Admin users/audit | create/reset/deactivate/reactivate, Admin password confirmation form, last-admin guard, audit view | SRS §6.3 / T-018/T-040 |
| Trash | soft delete, 30-day retention label, Admin/Owner Lead restore, no permanent-delete button | SRS §8.4 / T-033 |
| Profile/settings | display name/password/organization, motion preference proposal | SRS §11 / T-018/T-019/T-055 |
| State gallery | loading, empty, error, offline, archived, forbidden, conflict, session, rate limit | SRS §11 / T-055/T-057 |

## Interaction และ visual decisions

ใช้ top navigation สี navy, sidebar สีอ่อน, project header, shared-view tabs, dense grouped table, status cells สีพร้อมข้อความ, avatars และ drawer ที่รักษาบริบทงาน อ้างอิง [Monday board structure](https://support.monday.com/hc/en-us/articles/115005317249-The-basics-of-a-board) และ [Monday board views](https://support.monday.com/hc/en-us/articles/360001267945-The-board-views) ที่ตรวจเมื่อ 7 ตุลาคม 2026 โดยใช้ชื่อและเครื่องหมาย Friday ของตัวอย่างเอง

สถานะใช้เฉด gray/amber/purple/green พร้อม label; amber/green ใช้อักษรเข้มให้ชัด ปุ่มและ card ใช้ transition 160–250ms; view/drawer ใช้ entrance 200–300ms; skeleton จำกัด 3 รอบ; ไม่มี looping decoration และเคารพ `prefers-reduced-motion` ใช้ฟอนต์ระบบ ไม่มี resource ภายนอกที่ต้องโหลด

หน้าจอมือถือยุบ sidebar ใช้ overflow เฉพาะพื้นที่ตาราง/Calendar/Gantt/Kanban ฟอร์มจัดเรียงตามความกว้าง Native dialog ใช้ focus trap/Escape/return focus; tabs มี arrow/Home/End controls; error สำคัญค้างอยู่ในพื้นที่ที่เกี่ยวข้อง

Conflict เป็น simulation: ร่างไม่ถูกแทนที่อัตโนมัติ เลือกเก็บเพื่อเปรียบเทียบหรือยืนยันโหลด latest; ใน drawer มีเครื่องมือรีวิวจำลอง offline/ข้อมูลใหม่โดยรักษาร่างงานและความคิดเห็น การสลับบทบาทเป็นการแสดง UI ตามบทบาท ไม่ใช่ enforcement ของ ACL

ไม่มี AI/email/custom fields/dependencies/critical path/automatic scheduling/Gantt resize/Calendar drag/offline write queue ส่วน personal motion toggle เป็นข้อเสนอ interaction ที่ต้องรีวิวก่อนเพิ่มให้ production

## การตรวจและข้อจำกัด

สคริปต์ review: `node scripts/review-ui-mockup.mjs` ใช้ Chromium กับ HTML โดยตรงและข้อมูลสมมติ บันทึกผลใน `reports/UI-redesign-preview-results.json` และภาพ `reports/UI-redesign-*.png` ผลสุดท้ายและข้อแก้จากการรีวิวอยู่ใน JSON และบันทึกท้ายเอกสารนี้

Traceability ของ design review: TC-001/003/005/007/009/012 สำหรับ entry/account forms, TC-024/025/027/028/029/031/034/035 สำหรับ task lifecycle และ conflict, TC-046/048/049 สำหรับ task views, TC-050/051/053/059 สำหรับ collaboration, TC-062/064/066 สำหรับ notifications/reports และ TC-072/073 สำหรับ reconnect/responsive/keyboard เป็น **visual/interaction preview subset เท่านั้น** ไม่รับรอง authentication, idempotency, transactions, uploads หรือ security และไม่เพิ่มผล PASS ลง formal TC/AT execution records

ยัง NOT_RUN: React/API integration ของ UI ใหม่, actual permissions/transactions/concurrency/idempotency, native SQL Server 2022, Windows, physical device/browser matrix, screen-reader/full WCAG, browser zoom 200%, UAT และ feature/release sign-off รายงาน prototype ไม่ใช้แทนผลเหล่านี้

Declared effort: T-032/T-044/T-045/T-054/T-055 Medium; T-046/T-057 High. Actual selected model/effort NOT_VERIFIED; local Node v22.23.3 verified และไม่เปลี่ยน shared runtime

ขั้นต่อไปหลัง owner รีวิวแบบ: นำไปใช้กับ React shell/auth/task flows โดยคง API และสิทธิ์เดิม; ตรวจตาม parent tasks ข้างต้นและบันทึกหลักฐานแยกจาก mock

Task Register: DONE 6 / total 77 / remaining 71; IN_PROGRESS 71. ไม่มี task ถูกปิดจากการรีวิว mockup

## ผลรีวิวรุ่น 02 (หลักฐานก่อนปรับ Group)

**PASS: 21/21 distinct preview cases** (M01–M21), Chromium 153.0.8010.12 / Node22.23.3 / macOS. ตรวจ desktop 1440px และ emulated 360/768px ครบทุกหน้าหลัก, task drawer, 4 views, create/validation, dirty/comment draft, simulated conflict/offline, visible role controls, Checklist/completion/weekly successor, Kanban grip drag/dropdown, file metadata/trash, notifications, task restore, Admin guard/reset form, CSV BOM/11 rows, keyboard focus/return และ reduced motion. Browser page errors และ private API requests เป็น 0 ในรอบตรวจสุดท้าย

ผลเป็นหลักฐานสะสมของ 21 กรณี หลังแก้ปัญหาให้รันซ้ำเฉพาะกรณีที่ได้รับผล กระบวนการไม่ได้รันทุกกรณีซ้ำหลังทุกการแก้; JSON เก็บผลสุดท้ายและ SHA256 ของ HTML ส่วน raw snapshots เก็บการตรวจที่หยุดเมื่อพบปัญหาไว้ครบ

แก้ prototype: ใช้สถานะที่บันทึกแล้วสำหรับ Checklist guard หลัง reject การปิดงาน, เก็บ comment draft ข้าม tabs/offline, จำกัด absolute accessible labels ภายใน scroll container เพื่อแก้ My Tasks ล้นมือถือ, จัดช่องค้นหาบนมือถือ, ให้ drawer เต็มความกว้างมือถือ และวน Tab/Shift+Tab ภายใน dialog

ปรับ review runner: คำค้นหาที่ตรง title/description อาจคืนหลายงาน จึงใช้คำค้นเฉพาะในการ assert; เลือก reconnect ใน modal ที่เปิดแทนปุ่มใต้ backdrop; ลากจาก grip เพื่อไม่กดปุ่มชื่อการ์ด; จำกัด alert/motion locators เฉพาะ main UI แทน hidden auth DOM Raw evidence อยู่ `reports/UI-redesign-preview-raw-*.json`; ไม่ได้ลบ raw failures เพื่อเปลี่ยนรายงานเป็น PASS

`npm run check:test-plan`: **PASS** สำหรับ inventory/dependencies/evidence-plan validation เท่านั้น; 143 formal items และ final/production gates ยัง **NOT_RUN** ไม่มีการรัน application regression suite เพราะรอบนี้ไม่ได้เปลี่ยน application implementation หรือ API contract

ภาพที่ตรวจด้วยสายตา: Login desktop, Board desktop, drawer create 360px และ Gantt 360px; ภาพทุกหน้าหลักและ view ที่ desktop/mobile อยู่ใน `reports/UI-redesign-*.png` Source/UI review นี้ไม่มี unresolved blocking defect ที่พบในชุดตรวจดังกล่าว ส่วน limitation และ production acceptance ข้างต้นยังคง NOT_RUN


## รุ่น 03 — Group และการปรับ interaction ตามคำขอเจ้าของ

จากภาพ Monday ที่เจ้าของแนบ เพิ่ม **New Group** และ **Add new group**: ตั้งชื่อ/เลือกสี 6 สี, แก้ชื่อ/สี, ยุบ/ขยายโดยคงสภาวะเมื่อเรียงงาน, แสดงกลุ่มว่าง และเพิ่ม Task ภายใน Group ได้ Task drawer มี Group dropdown สำหรับย้ายงานโดยคงสถานะ; Table เลือก group by Group หรือสถานะ, Kanban แสดงชื่อ Group และ filter ใช้ร่วมทุก view ชื่อ Group ห้ามว่าง/ซ้ำและยาวเกิน 80 ตัวอักษร

แยก **Start Plan / End Plan** เป็นสองช่องและสองคอลัมน์พร้อม validation, เพิ่ม/ลบ Task Card ผ่าน soft delete และ restore, กัน reuse id หลังลบ, จัด dropdown ให้สม่ำเสมอ และย้าย **Notify** ไปมุมบนขวา พร้อม unread/read-one/read-all, Escape/light-dismiss และ toast ที่ปิดได้ Header ค้างขณะเลื่อน; ไม่มี toast ซ้อนแผง Notify

**PASS 41/41 focused preview checks** ใน Codex In-app Browser (version NOT_VERIFIED), responsive viewport 360/768/1440px, Node22.23.3; HTML syntax และ check:test-plan PASS แผนทดสอบเท่านั้น หลักฐาน `reports/UI-redesign-v03-results.json` พร้อม SHA256 และภาพ `reports/UI-redesign-v03-board.jpg` / `reports/UI-redesign-v03-new-group.jpg` Checks เป็นหลักฐานสะสม: 13 กรณีแรกก่อนเพิ่ม Group; หลังเพิ่ม Group ตรวจ creation/move/rename/color/collapse/filter/shared flows/permissions/viewport ไม่อ้างว่า rerun ทั้งชุดบนไฟล์สุดท้าย สคริปต์ M01–M21 ปรับ locator รองรับ UI ใหม่แต่ **NOT_RUN สำหรับรุ่น 03** ผล 21/21 ด้านบนเป็นรุ่น 02

ระหว่างตรวจพบ form input `name=id` บัง `form.id` ทำให้ submit ไม่เข้าขั้นตอนสร้าง Group แก้เป็น `groupId` และตรวจสร้าง/แก้ชื่อ/สีซ้ำผ่าน; assertion ของการบันทึก Task ครั้งแรกตรวจเร็วกว่า async render แก้ review ให้รอ Task ปรากฏ ข้อมูลทั้งหมดสมมติ Browser page error logs ของการตรวจรุ่นนี้เป็น 0

**Group เป็นข้อเสนอข้อมูลใหม่ตามคำขอเจ้าของ ยังไม่มี persistence/API/schema ในแอปจริง** ก่อน implementation ต้องกำหนด Group scope/ordering/permissions/migration และการจัดงานเดิม รวมถึงทบทวน requirements/SRS/contracts และ tests ที่เกี่ยวข้อง ไม่เพิ่ม Group API หรือเปลี่ยน start_date/due_date ในงาน mock นี้; ไม่มีการลบ Group หรือ automatic scheduling แฝงใน UI งานเดิมยัง IN_PROGRESS และ formal TC/AT/SQL2022/Windows/UAT acceptance ยัง NOT_RUN


## รุ่น 04 — Vibe และเมนูซ้าย

เจ้าของเลือก [Vibe ของ Monday](https://github.com/mondaycom/vibe) วันที่ 7 ตุลาคม 2026 ใช้ `@vibe/core@4.5.34` จริงใน preview โดย pin lockfile แยกที่ `design-preview/vibe/` พร้อม React/ReactDOM19.3.0 และ Node22.23.3 ที่ตรวจแล้ว ใช้ Button, Dropdown, TextField, DatePicker, Avatar, LayerProvider และ design tokens ของ Vibe; core ใช้ MIT ตาม LICENSE ของแพ็กเกจที่ติดตั้ง ซึ่งเก็บสำเนาไว้ใน `design-preview/vibe/VIBE-LICENSE.txt` ไม่ได้เปลี่ยน dependency/runtime ของแอปจริง

`TeamFlow_UI_Vibe_Preview.html` รวม React/Vibe/CSS ไว้ในไฟล์เดียว เปิดแบบ local โดยไม่มี CDN/API runtime requests ปุ่มและ fields เป็น React islands เชื่อม form/events ของ mock เดิม **bridge นี้ใช้กับ preview เท่านั้น** Production ต้อง render Vibe โดยตรงใน React tree ของแอป Table/Kanban/Calendar/Gantt และ native dialog/checkbox ยังคงเป็น UI ของโครงการ ไม่อ้างว่าเป็น Vibe components ทุกส่วน วิธีสร้างซ้ำอยู่ `design-preview/vibe/README.md`; SHA256, package/license inventory และ modules ที่ bundle อยู่ `design-preview/vibe/bundle-report.json`

ตาม feedback ของเจ้าของ เมนูซ้ายแบ่งหัวข้อภาษาไทย **ส่วนตัว / พื้นที่ทำงาน / โปรเจกต์ของคุณ / จัดการระบบ** พร้อมไอคอน ชื่อทีมใต้โปรเจกต์ และสถานะ **เปิดอยู่** ด้วยสีพื้น เส้นซ้าย และ `aria-current=page` แยกโปรเจกต์ทั้งหมดจากลิงก์เข้าแต่ละโปรเจกต์ เอาลูกศร workspace ที่ไม่มี action ออก เมนูระบบแสดงตาม role; การตั้งค่าและออกจากระบบอยู่ท้ายแผง Sidebar desktop อยู่กับที่เมื่อเลื่อน main และเลื่อนภายในได้ บนมือถือมี backdrop, close/Escape, focus wrap, inert main และคืน focus; เมื่อเลือกหน้าใหม่ focus ไปที่ heading และกลับด้านบนของหน้า ปุ่มเมนูจริงใช้ Vibe Button ทั้งหมด

**PASS 74/74 focused preview checks สะสม**: 43 กรณีช่วงรวม Vibe ก่อน lifecycle/sidebar final, 27 กรณีหลังแก้ lifecycle/menu และ 3 กรณีหลังปรับความสูง sidebar พร้อม 1 กรณีบน SHA สุดท้ายสำหรับ navigation focus/scroll ไม่อ้างว่า rerun ทั้งชุดบน SHA สุดท้าย รวมการสร้าง Group/Task, Start Plan/End Plan ผ่าน DatePicker, เพิ่ม/ลบ/คืน Card, status/Group dropdown, validation/permissions/Notify, ทุกหน้าหลัก, 4 views, 360/768/1440px และ keyboard ของเมนูมือถือ หลักฐาน `reports/UI-vibe-v04-results.json`, `reports/UI-vibe-v04-board.jpg`, `reports/UI-vibe-v04-menu-mobile.jpg` Browser version NOT_VERIFIED; build/strict TypeScript/HTML script syntax PASS; check:test-plan PASS เฉพาะแผน M01–M21 NOT_RUN สำหรับ V04 ผล V02/V03 เป็นหลักฐานประวัติ ไม่ใช่ regression ของ V04

แก้ dropdown portal ที่อยู่หลัง native dialog ด้วย LayerProvider, Escape ที่ปิด drawer แทน dropdown, disabled/label attributes และ React NotFoundError ระหว่าง native DOM replacement โดย unmount roots/portals ก่อน render เก็บ logs ก่อนซ่อมใน `reports/UI-vibe-v04-errors-before-fix.json`; log error/warn ตั้งแต่ build ที่แก้ lifecycle/menu เป็น **0** ในชุดตรวจนี้ (`reports/UI-vibe-v04-errors-after-fix.json`) Initial build transform กระทบ unbraced else; แก้ scope และตรวจ heading ปลายทางจริงครบ 10 หน้า Review harness แก้ locators/title/Notify timing/inert attribute ตาม UI จริง ไม่ซ่อนข้อผิดพลาด

**Dependency audit ยังเปิด:** หลัง compatible audit fix มี 53 Moderate / 6 High / 0 Critical ใน dependency graph แยกของ preview (`reports/UI-vibe-dependency-audit-final.json`) High ได้แก่ braces/fast-glob/globby/micromatch/postcss/stylelint ซึ่งมาจากสายเครื่องมือ styling; ตรวจ esbuild metafile แล้วทั้ง 6 แพ็กเกจไม่อยู่ใน browser bundle ไม่ถือว่าระบบปลอดช่องโหว่หรือ production audit PASS ต้องจัดการก่อนผูกเข้าระบบจริง Inventory 329 packages ไม่มี license metadata ที่ขาด แต่ไม่ได้แทน legal/security review

ไม่มี production API/Group schema/migration หรือการปิด TC/AT/SQL2022/Windows/UAT ในรอบนี้ Source mock แบบ native เป็นฐานสร้าง Vibe จึงมี sidebar ใหม่ด้วย; หลักฐาน V03 ใช้ SHA เดิมในรายงาน V03 Tasks ยังคง DONE6/77, IN_PROGRESS71, remaining71 ขั้นต่อไป owner รีวิว mock แล้วนำไปใช้ React UI ตาม T-045 Medium / T-057 High โดยกำหนด Group persistence/contract ก่อน implementation


## รุ่น 05 — English base และ Compact Minimal

เจ้าของขอลดขนาด font/layout ใช้ภาษาอังกฤษเป็นหลักและทำ style ให้ Minimal วันที่ 7 ตุลาคม 2026 รอบนี้ปรับเฉพาะ Vibe mockup เดิม ผ่าน `minimal.css` และ `english-copy.json` โดยไม่เปลี่ยน application frontend/backend/API หรือ runtime ภาษาอังกฤษเป็น design direction ล่าสุดของเจ้าของ แม้ข้อกำหนดภาษาไทยเดิมใน FR-35/D-01 ยังต้องปรับให้ตรงเมื่อเริ่ม application integration; ภาษาไทย/Unicode ในข้อมูลที่ผู้ใช้กรอกยังรองรับ และ timezone/date-only semantics เดิมยังอยู่

วัดจริงที่ desktop1440px: body13px, menu12px, heading20px, sidebar216px, Vibe TextField small32px, Table row38px, task drawer590px ลด toolbar/card/dialog padding, ตัดเงา/ภาพตกแต่งและใช้พื้น neutral, เส้นบาง, status pastel พร้อมข้อความ โดยยังแสดง selected menu เป็นสีน้ำเงิน ดู Calendar/Gantt ที่ compact ลงได้ด้วย English catalog มี597 static entries, build output ไม่มีตัวอักษรไทยใน UI copy (`lang=en`, date display `en-GB`); ไม่มี runtime translator และไม่เปลี่ยนข้อความ Unicode ที่ผู้ใช้พิมพ์

**PASS33/33 focused browser checks สะสม**: Login, density/English checks, 10หน้าหลัก, Group creation/color, task creation ด้วยชื่อภาษาไทย, separate date controls, 4views, Notify read-all, calendar/Gantt/drawer dimensions, 360/768/1440px overflow, mobile menu/Escape/date picker, Viewer/offline read-only และ selected-menu color. 32กรณีก่อน final active-menu CSS specificity fix และ1กรณีบน SHA สุดท้าย; ไม่อ้างว่า full suite rerun ทุกกรณีบน SHA สุดท้าย หลักฐาน `reports/UI-vibe-v05-results.json` และภาพ `UI-vibe-v05-board.jpg`, `UI-vibe-v05-login.jpg`, `UI-vibe-v05-task.jpg`, `UI-vibe-v05-mobile.jpg` ที่ตรวจด้วยสายตา

แก้ field wrapper40px โดยใช้ Vibe size=small จริงแทนการลดเฉพาะ input, แก้ line boxes ของ Gantt ที่ทำให้ row51.24px และปรับ review timing ให้รอ DatePicker/Notify ที่แสดงแล้วก่อนอ่าน DOM. Build/strictTS/HTMLsyntax PASS; error/warn logsตั้งแต่เริ่ม V05 review เป็น0. V04 74กรณีและ M01–M21 ไม่ได้ rerun ทั้งชุดใน V05; formal TC/AT/UAT/Windows/SQL2022/full WCAG/physical devices/production security acceptance ยัง NOT_RUN Dependency auditเดิมยัง OPEN ไม่มีการเปลี่ยน dependencies ยกเว้น preview package version0.5.0

Task Register DONE6/77, IN_PROGRESS71, remaining71 ไม่มีการปิดงานจาก mock. ขั้นถัดไป owner review แล้ว integrate ตาม T045 Medium/T057 High; actual model/effort NOT_VERIFIED

## รุ่น 06 — สีเดิม ขนาดเดิม และ Avatar ที่สมดุล

Preview V06 owner decision: retain V05 compact layout and English base; restore richer color/motion from the earlier preview and refine typography. Added colorful.css after minimal.css with navy navigation, lavender login decoration, tilted demo board, floating completion card, vivid labelled status colors and gentle card lift. Corrected Vibe Avatar initials independently from customSize:10px text/24px circle; approved body13/heading20/sidebar216/table38/fields32px retained. Focused10/10 browser checks PASS on final HTML; strictTS/build/HTMLsyntax PASS; scoped browser error/warn0. Evidence reports/UI-vibe-v06-results.json and UI-vibe-v06-login.jpg/board.jpg. System font fallbacks used; OS reduced-motion not emulated this round, existing support retained. V05 full suite/formal acceptance NOT_RUN on V06. Mock-only cosmetic effort Low/Light; actual model/effort NOT_VERIFIED. No tasks closed: DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner mock review then T045 Medium/T057 High.


V06 parameter typography follow-up: owner screenshot showed inconsistent field values/dropdown labels. Actual nested Vibe Typography/TextField retained14px despite smaller wrappers. colorful.css now applies13px to actual TextField values, form combobox text descendants and option text (including dialog/body portals), with consistent family/weight/spacing. Seven focused checks PASS on current SHA: inputs/5 selected values/5 Assignee options,590px drawer/32px fields, selection-to-native assignee=1,360px no document overflow, scoped browser error/warn0; build/script syntax PASS. Evidence reports/UI-vibe-v06-parameter-font-results.json, values.json and parameter-font.jpg. Earlier V06 full checks not rerun on this SHA; formal acceptance NOT_RUN. Cosmetic declared Low/Light, actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner preview review then T045 Medium/T055 Medium.

V06 Kanban motion follow-up: added preview-only FLIP animation after successful changeStatus validation (shared dropdown and native drag/drop path). Moved card320ms, neighbouring cards220ms, ease-out; transient lifted shadow, final transform cleared, status combobox focus restored. Animation off/OS reduced-motion gates and cancellation retained. Browser7/7 focused checks PASS: moving→settled, neighbours, focus, motion-off, incomplete Checklist guard,360px move/no document overflow and scoped error/warn0; build/strictTS/script syntax PASS. Native drag gesture and OS motion emulation NOT_RUN; existing shared hook inspected, not claimed as drag browser execution. Evidence reports/UI-vibe-v06-kanban-motion-results.json and kanban-motion.jpg. Mock only; actual app/contracts unchanged. Declared cosmetic Low/Light; actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner mock review then T045 Medium/T055 Medium.

V06 card assignee spacing follow-up: replaced Kanban assignee row space-between with explicit card-assignee flex-start; avatar precedes name with7px gap. Build PASS; browser10/10 cards have7px gaps at1440 and360px, including Unassigned;360px no document overflow. Evidence reports/UI-vibe-v06-card-assignee.jpg. Mock-only cosmetic Low/Light; actual model/effort NOT_VERIFIED; no feature sign-off. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next T045 Medium.

V06 owner assignment/status follow-up: Task supports multiple Assignees in real Vibe multi Dropdown (unique native selectedOptions/FormData); all avatars/names appear in Table/Kanban, My work/person filtering/workload/Gantt/CSV use assignee collection in mock. Checklist rows have independent single-person Dropdown, save/reopen retains choices; eligible sample project members active only, no new project rights. Table status now26px inline Dropdown instead of large status dialog;38px rows retained. Requirements1.7/SRS1.8 record owner superseding FR13/FR15; production contracts/migrations/notifications/withdrawal rules require follow-up review and implementation, not closed by preview. Build/strictTS/script syntax PASS; scoped browser error/warn0. Focused10 cases PASS: multi select bridge; save/reopen/Table2avatars; clear-all save/reopen; Kanban2avatars/names; Checklist2 separate saved assignees; Viewer disabled; mobile360 no overflow;26px status/38px row; inline status change without modal; scoped logs0. Tests of secondary-assignee filtering/workload/CSV/recurrence/OS/native drag NOT_RUN this round. Evidence reports/UI-vibe-v06-assignment-results.json and multi-assignees/checklist-assignees/inline-status.jpg. Actual model/effort NOT_VERIFIED; declared feature proposal Medium. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next contract/schema impact review High; UI integration Medium after review.

V06 status paint cleanup: owner asked to remove dropdown chevron/white trailing segment. Scoped status-picker CSS hides its secondary toggle, fills a single26px color bar with centered text/4px corners and7px horizontal margins;38px table row preserved. Combo retains click/keyboard semantics/focus-visible outline. Build PASS; browser final styling verified chevron display:none/centered content/26px bar/38px row; prior click-to-open and change to Working on it PASS before final cosmetic height/centering adjustment. Evidence reports/UI-vibe-v06-status-clean.jpg and status-clean-detail.jpg. No app change; Low/Light declared, actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner preview review; contract/schema impact High before production multi-assignee integration.

V06 status centering correction: Vibe selectedItem retained32px height inside26px bar, putting text3px above center. Enforced26px height/flex centering on selected value wrappers. Build PASS; measured all10 labels: vertical center delta0px and horizontal delta≤0.004px at1440px. Evidence reports/UI-vibe-v06-status-centered.jpg. Mock-only Low/Light, actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner review; contract/schema impact High.
