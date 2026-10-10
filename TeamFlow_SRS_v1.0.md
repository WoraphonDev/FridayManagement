# TeamFlow — Software Requirements Specification (SRS)


**เวอร์ชัน:** 1.30 · **วันที่:** 10 ตุลาคม 2026\
**สถานะ:** Baseline ยืนยันแล้วสำหรับพัฒนา; ยังไม่ทดสอบ  
**Requirements ต้นทาง:** `TeamFlow_Requirements_v1.0.md`  
**ขอบเขต:** องค์กรเดียว หลายทีม ประมาณ 30 บัญชี ไม่มีอีเมล ไม่มี AI เจ้าของระบบ deploy เอง



## Subitem cells and assignment/status popovers - 10 October 2026

Owner requested actual integration of the Subitem and assignment references. UI §11 now presents Subitem / Owner / Status / Remark, + Add subitem and aligned 32px initial draft fields with icon cancellation. Shared PeoplePicker uses an avatar/text cell trigger and searchable member popover; StatusPicker uses a colored cell trigger and colored options, with no dropdown arrows. Native popovers appear in the browser top layer while retaining DOM ancestry inside the task dialog/row, preventing table clipping and premature checklist autosave. Search uses existing permitted member name/job-title/effective-access fields; no additional API or private directory data. Keyboard selection, Escape, light dismissal, focus restoration and viewport positioning are supported. ChecklistStatusPicker maps only the persisted done boolean; new rows start incomplete. Existing provider/schema/contracts, versions, guards and atomic effects remain unchanged. Parent Task status retains its four existing values and completion gate. Evidence: TeamFlow_Cell_Pickers_Implementation_Report.md; real SQL2022/Windows/full-browser/UAT remain required.

## Checklist table and autosave - 9 October 2026

Owner final scope supersedes earlier Start/End request: Checklist | Assign | Remark. + Add reveals a draft row; click the title/remark cell to edit; leaving the entire row by pointer or keyboard saves automatically, with no Save button. Moving between fields does not save. Cancel/Escape discards the row draft; empty rows never create items; failed saves preserve input. Delete is a trash icon with an accessible name and confirmation. Child remark is plain text, max2000 UTF16 units; omission on PATCH preserves it, empty string clears it. Provider-specific migration0014 adds only remark, defaults legacy rows to empty, preserving all old fields/versions/history. Recurrence copies remark as checklist instructions and resets completion; independent assignee eligibility and existing lifecycle/permission/version/idempotency/atomic audit guards remain. API1.11.0,85 routes/115 schemas. Declared UI T-033 Medium, schema/contracts T-008/T-003 High; actual model/effort NOT_VERIFIED. Local validation PASS: npm test511 (Node462/frontend49, contract66 and plan17 subsets);11 distinct Chromium cases PASS across runs, initial10/11 followed by corrected2/2 and final visual2/2. The initial failure was a test missing reopening the drawer after reload, not data loss. Build/typecheck/lint/check:contract PASS; lint2 existing warnings. Evidence: TeamFlow_Checklist_Table_Report.md / reports/checklist-table/results.json. Live local0014 upgrade preserves hashes of all33 legacy tables/256 rows before restart; backup kept outside repository; readiness PASS and existing Task inspected without mutations. formal tasks remain unchanged. Native SQL2022/Windows/UAT NOT_RUN. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; next formal T-091 High.

## System functional precheck and compact file actions - 9 October 2026

Owner requested checking other functions after the attachment screenshot. Declared T-044 Medium / T-091 local precheck High; actual model/effort NOT_VERIFIED. Compact file cards retain full accessible action names and lifecycle guards. Full check found and repaired Task textarea approved minimum92px (new CSS had90px) and an unused Main table test binding; production board behavior unchanged. npm test508PASS (Node459/frontend49, including contract65/planning17); initial browser84/85PASS then focused7/7PASS, all85 distinct cases PASS across runs. Build/typecheck/lint PASS, lint2 existing warnings. Partial FR-12/28/29/41–53, TC-025/027/035/052–059/085–099 and AT-09/14/15/21/22/31–40; no full acceptance claim. Evidence: TeamFlow_System_Functional_Check_Report.md / reports/system-functional-check/results.json. Native SQL2022/Windows/UAT/actual performance/ZIP release NOT_RUN; formal dependencies and task statuses unchanged. DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; next formal T-091 High.


## Task group-order history correction - 9 October 2026

Owner reported Task#4 Reference ID a54f4fcd-e810-4528-b102-c7bf52c25135. Live operational log confirms INTERNAL_ERROR/HTTP500 during periodic reads; opening the unchanged task reproduces the banner before Save. Existing group-order events contain group_before_task_id, documented since API1.8, but EventChange and the frontend parser omitted it. Contract1.10.1 adds that existing field and an Activity label; no new route, database migration or mutation behavior. Declared T-003/T-040 High and T-032/T-044 Medium; actual model/effort NOT_VERIFIED. Partial FR-12/18/29, TC-025/027/035/052 and AT-09/14/15/21. Evidence: TeamFlow_Task_History_Fix_Report.md / reports/task-history-fix/results.json. Parent statuses remain unchanged; native SQL2022/Windows/UAT NOT_RUN. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; next formal T-091 High.


## Task editor sub-tabs visual follow-up - 9 October 2026

Owner requested individual review of Details, Checklist, Updates, Files and Activity from Task#11 Files screenshot. Scoped task-editor-tabs.css corrects checkbox16x16/horizontal labels; styles empty/populated checklist, comments, attachment/upload and history panels; preserves readable mobile tabs and explicit action colors. Short Checklist Edit/Delete controls retain full accessible names. Drawer notices flow vertically to avoid overlap after several independent saves. No API/schema/migration/permission/save/idempotency change. Declared T-044/T-089 Medium; actual model/effort NOT_VERIFIED. Partial FR-16/19/27/28/29, NFR-09, TC-027/035/053–058/098 and AT-15/21/22/39. Seven distinct Chromium scenarios PASS across runs (final notice regression2/2); frontend49/49, build/typecheck/focused lint PASS. Evidence: TeamFlow_Task_Editor_Tabs_Visual_Report.md / reports/task-editor-tabs-visual/results.json. Actual Task#11 inspected read-only; user data unchanged; Claude board files/port untouched. Parent statuses unchanged; native SQL2022/Windows/UAT NOT_RUN. Register DONE7/91, remaining84; next formal T-091 High.

## Project details and subforms visual follow-up - 9 October 2026

Owner requested Project details/subforms to match the styled menus. Dedicated project-detail-visual.css preserves the plain header and styles stationary horizontal tabs, Overview, Members, Docs, Files, Workload, filters, tables, Kanban and Calendar/Gantt surfaces. Shared Task editor uses readable mobile tabs/fields and blue Save/gray Cancel/red Delete; metadata/archive dialogs add explicit Cancel without submitting; membership/Docs controls receive action colors. Preserve permission/privacy/version/idempotency/offline/maintenance checks and existing motion/reduced motion. Declared T-024/T-084/T-088/T-089 Medium (shared Calendar/Gantt T-046 High); actual model/effort NOT_VERIFIED. Partial FR-09–11/19/25/48–51, NFR-09, TC-016/017/018/049/093/094/095/098 and AT-07/08/19/29/35/36/37/39. Final Chromium8/8, frontend49/49, build/typecheck/focused lint PASS. Evidence: TeamFlow_Project_Detail_Visual_Report.md / reports/project-detail-visual/results.json. No backend/API/schema/data change; concurrent Claude board files untouched. Parent statuses unchanged; SQL2022/Windows/UAT NOT_RUN. Register DONE7/91, remaining84; next formal T-091 High.

## Plain menu headers and Add member search follow-up - 9 October 2026

Owner supplied the Home plain-header reference and requested it across all styled menus while the Add member follow-up was active. Declared T-023/T-089 Medium (Calendar parent T-046 High); actual model/effort NOT_VERIFIED. New page-headers.css provides plain breadcrumb/title20px/description13px/bottom-divider headers for Home, Reports, My Work, Trash, Admin, Settings, All Projects, Work Calendar and Teams, plus the team details title; cards/buttons keep existing color. Member dialog uses aligned search controls, visible Users loading/empty states, position/access fields and Save/Cancel colors. Fix repeated/blank Search clearing Users without a fresh request by adding directoryReload to the directory effect. Preserve manual Review & Save, permissions/privacy, versions, paging, offline/maintenance guards and reduced motion. Partial FR-06/07/08 and NFR-09, TC-013/015/023/098, AT-06/07/39. Evidence: TeamFlow_Header_Member_Followup_Report.md / reports/header-member-followup/results.json. Six distinct browser scenarios PASS across focused runs, frontend49/49, typecheck/build/focused lint PASS. Parent statuses unchanged; SQL2022/Windows/UAT NOT_RUN. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; next formal T-091 High.

## Teams and members visual follow-up - 9 October 2026

Owner requested Teams & members to match the other styled pages. Declared T-023/T-088 Medium; partial FR-06/07/08/50, TC-013/015/023/095/098 and AT-06/07/37/39. Dedicated teams-visual.css uses tinted headers, purple/blue/green team cards, gray archived cards, stationary pill tabs, Team info/summary surfaces, position chips, Members grid/action colors and Workload card. Cards reveal by opacity only; tab panels do not animate. Mobile directory stacks, info cards stack and Members/Workload tables scroll internally. Preserve PM/Lead/Dev separate from permissions, privacy, explicit Save/Cancel/review/version behavior and actual workload counts. No API/schema/data change; Claude board files untouched. Evidence: TeamFlow_Teams_Visual_Report.md / reports/teams-visual/results.json. Five distinct Chromium scenarios PASS across focused runs, typecheck/build/focused lint PASS; parent statuses unchanged. SQL2022/Windows/UAT NOT_RUN. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; actual model/effort NOT_VERIFIED; next formal T-091 High.

## Work Calendar visual follow-up - 9 October 2026

Owner requested Work Calendar to match the other styled pages. Declared T-046 High, partial FR-25/TC-049/098 and AT-19/39. Dedicated work-calendar-visual.css styles only the Work calendar root: tinted header/filter card, stationary pill tabs, month controls, colored status events, explicit Today text and bordered grid, undated/range lists. CalendarView adds semantic date labels/aria-current for today. Mobile grid scrolls internally; opacity reveal380ms honors reduced motion. Preserve date-only Bangkok placement, actual counts, month/filter/detail/paging and Viewer/archived permissions. No API/schema/live-data change; Claude board files untouched. Evidence: TeamFlow_Work_Calendar_Visual_Report.md / reports/work-calendar-visual/results.json. Chromium4/4 plus final visual1/1, frontend49/49, typecheck/build/focused lint PASS. Parent T-046 remains IN_PROGRESS; SQL2022/Windows/UAT NOT_RUN. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; actual model/effort NOT_VERIFIED; next formal T-091 High.

## All Projects visual follow-up - 9 October 2026

Owner requested All Projects to match Home/Reports/My Work. T-024 Medium, partial FR-09/10, TC-015/016/022/098, AT-07/39. Scoped all-projects-visual.css adds a tinted header, primary Create button, purple/blue/green cards, owner-team chips, clearer progress and gray archived cards. Cards reveal with opacity only; hover does not translate. Preserve actual API counts, permission scope, card/menu/keyboard navigation, explicit Save, version handling and reduced motion. No business/API/schema/data change; concurrent Claude board files untouched. Evidence: TeamFlow_All_Projects_Visual_Report.md / reports/all-projects-visual/results.json. T-024 remains IN_PROGRESS; SQL2022/Windows/UAT NOT_RUN. Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; actual model/effort NOT_VERIFIED; next formal T-091 High.

## Trash / Admin / Settings visual follow-up - 9 October 2026

Owner requested the Home/Reports/My Work style for Trash, Admin and Settings. Declared T-018/T-025/T-033/T-082/T-089 Medium; partial FR-03/04/17/43 and NFR-09, TC-034/075/090/098 plus existing account UI cases. Scoped management-visual.css uses tinted page headers, card surfaces, pill navigation, readable tables, colored member actions and restore controls, mobile layouts and reduced-motion-compatible opacity reveal. Trash adds gray Cancel in restore confirmation; it closes without a write and is disabled while pending. Preserve restore cutoff/idempotency/archived access, Admin permissions/versions/sticky matrix, Profile permissions read-only, Organization manual Save and Appearance preference autosave. No backend/API/schema/migration or live data change. Evidence: TeamFlow_Management_Visual_Report.md / reports/management-visual/results.json. Nine distinct Chromium scenarios PASS across focused runs (existing8 + finalvisual1), frontend49/49, typecheck/build/focused lint PASS; test-plan17/17 PASS (inventory only). Parent statuses unchanged; SQL2022/Windows/UAT NOT_RUN. DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; actual model/effort NOT_VERIFIED; next formal T-091 High.

## My Work visual follow-up - 9 October 2026

Owner requested My Work to match the Home/Reports style. T-083 Medium, T-086 High (presentation-only follow-up), reusing T-089 motion. Trace FR-45/52, partial TC-091/096/098 and AT-34/38/39. Add a tinted header, pill view tabs, grouped filter card, colored due-group cards/count badges and readable grid rows. Personal Task column stays pinned; Assignee is not pinned (there is no Select column). Responsive grid has a minimum width so mobile titles remain readable and other columns scroll inside the table; document does not widen. Group reveal is opacity only; collapse does not translate content. Preserve existing query/scope/inline status/task details/calendar/Gantt/access and reduced-motion behavior. No TaskWorkspace/ProjectTasks/backend/API/schema/data change in this follow-up. Evidence: TeamFlow_My_Work_Visual_Report.md / reports/my-work-visual/results.json. Isolated Chromium5/5 plus final visual1/1, typecheck/build/focused lint PASS; formal SQL2022/Windows/UAT NOT_RUN. Parent statuses unchanged. DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; actual model/effort NOT_VERIFIED; next formal T-091 High.

## Home visual follow-up - 9 October 2026

Owner requested Home to use the same colors and animation as Reports. T-083 Medium, FR-44/45, AT-34 and partial TC-091/098; existing T-089 motion helpers reused. Add a tinted welcome card with Bangkok date/open-task link, five colored/icon summary cards, bordered status/project bar panels and a full-width Up next list with status/date badges. Preserve all widget queries, API counts, permission scope, task deep links and empty states. Card reveal uses opacity; bars use scaleX650ms and existing count-up remains accessible with immediate final labels. User/OS reduced motion respected; no tab/page translation added. Home-only styles preserve shared Project overview presentation. No backend/API/schema/migration change. Evidence: TeamFlow_Home_Visual_Report.md / reports/home-visual/results.json. Browser2/2, frontend49/49, typecheck/build/focused lint PASS; test-plan17/17 PASS (inventory only). SQL2022/Windows/UAT NOT_RUN; T-083 remains IN_PROGRESS. DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; actual model/effort NOT_VERIFIED; next formal T-091 High.

## Reports visual follow-up - 9 October 2026

Owner asked for a more attractive Reports dashboard with color and animation. T-054 Medium (existing T-089 motion helpers reused); FR-32/33/34 and partial TC-064/065/066/073/098, AT-24/18/26/39. Group scope/date controls in a filter card with primary CSV export, five tinted/icon KPI cards, bordered chart panels, status counts/rounded shares, assignee avatars and colored bars. Animate numbers and chart bars only; keep the filter/page stationary and honor user/OS reduced motion. Exact percentage precision, metric/date definitions, permission scope and shared CSV filters remain unchanged. No API/schema/migration change. Evidence: TeamFlow_Reports_Visual_Report.md / reports/reports-visual/results.json. Browser5/5 plus final visual1/1, frontend49/49, typecheck/build/focused lint PASS; formal SQL2022/Windows/UAT NOT_RUN. DONE7/91, remaining84; actual model/effort NOT_VERIFIED; next formal T-091 High.

## Team tabs stay stationary - owner correction 9 October 2026

T-023/T-089 Medium; partial TC-073/098 and AT-18/26/39. AN-01 whole-page fade/slide runs on main pathname changes only. Query-only changes such as tab/filter selection must not replay it or move the tab bar. Team keyboard tab focus uses preventScroll. Preserve URL/reload, existing scoped permissions and reduced-motion preferences. Evidence: TeamFlow_Team_Details_UX_Report.md / reports/team-details-ux/stable-results.json. Browser3/3 PASS (1280px/360px stable geometry, zero page animation calls for tab changes, one for main navigation, original motion/reduced-motion regression); typecheck/build/focused lint PASS. No API/schema/data change; SQL2022/Windows/UAT NOT_RUN. DONE7/91, remaining84; actual model/effort NOT_VERIFIED; next formal T-091 High.

## Owner team details UX - 9 October 2026

T-023/T-088 Medium: team cards use /teams?team={id}&tab=info|members|workload from both Teams and Admin. Default Team info shows name/description/status/summary with scoped Edit/Archive. Members uses a semantic table grid with internal horizontal scrolling at 360px, Edit per row and More > Remove confirmation. Add/Edit opens a compact dialog with separate position/Team access, Review & Save confirmation, blue Save, gray Cancel and red Remove. Reuse version/CSRF/transaction guards; conflict requires explicit refresh/review; archived teams are read-only and polling does not overwrite info edit drafts. Non-Admin receives no members from the existing API: show Admin only without zero counts/positions. Workload requires Admin, own team permission Lead or member P-09; position Lead alone grants nothing. Arrow/Home/End tabs, deep-link/reload and revoked team hiding are verified locally. No contract/migration/permission expansion.

## Owner-approved Monday-style addendum — 8 ตุลาคม 2026 (T-078)

เจ้าของอนุมัติ `TeamFlow_Requirements_Addendum_Monday_Draft.md` (8 ต.ค. 2026) ด้วยคำสั่งให้ทำ T-078 ต่อ: เพิ่ม Personal/Workspace/Admin แบบ monday, แยก job title ออกจากสิทธิ์, project role `manager` + permission checkbox รายคน P-01–P-10, Docs/Files/Workload/Overview/Favorites, Main table/side panel ใหม่ และ motion AN-01–AN-13. FR-46 Updates feed เลื่อนไปรอบถัดไป; exclusion เดิม (custom fields/status, dependencies, time tracking, automations, integrations, chat, real-time co-editing, email/AI) คงอยู่. เป็นการเปลี่ยนเอกสารเท่านั้น ยังไม่มี code/schema/API ของ addendum และ FR/AT ใหม่ทั้งหมด NOT_RUN. ข้อกำหนดอยู่ใน §4.4, §5.3, §9.7–§9.11, §11 (addendum screens), §12.6, §13.6, AT-31–AT-40 และ §15; route ใน §12.6 เป็น **planned** ยังไม่อยู่ใน OpenAPI จนงาน T-080–T-090 ล็อก contract และรัน build/check/test:contract

## Owner-approved Vibe implementation — 7 ตุลาคม 2026

เจ้าของอนุมัติให้นำแบบ `TeamFlow_UI_Vibe_Preview.html` มาใช้กับโปรเจกต์จริง ใช้ Monday Vibe 4.5.34, compact layout, English เป็นภาษาหลัก, สีสถานะชัดเจน และ animation ที่เคารพ reduced motion. ข้อมูลที่ผู้ใช้กรอกยังรองรับ Unicode/ภาษาไทย. ข้อกำหนดล่าสุดนี้แทนข้อจำกัดเดิมเรื่องผู้รับผิดชอบ Task คนเดียวและ Thai เป็นภาษาหลักในส่วนที่ขัดกัน; business rules และ permission boundaries อื่นคงเดิม.

Task มีผู้รับผิดชอบ 0–30 คนที่ active และมี effective project write; Checklist แต่ละข้อมีผู้รับผิดชอบ 0–1 คนแยกจาก Task. การมอบหมายไม่เพิ่มสิทธิ์เข้าถึง. ถอนสิทธิ์ต้องล้าง assignment ของงานที่ยังไม่ Done แบบ atomic พร้อม audit/notification; Done เก็บประวัติ. Recurrence คัดลอกเฉพาะผู้รับผิดชอบที่ยังมีสิทธิ์ และ reset checklist completion. My work/filter/report/CSV/reminders รองรับผู้รับผิดชอบรองด้วย.

Project สร้าง named/color Group ได้ไม่เกิน 1,000 กลุ่ม; Task อยู่ได้หนึ่งกลุ่มหรือไม่มีกลุ่ม. การย้าย Group ไม่เปลี่ยน status. Start Plan/End Plan ใช้ `start_date`/`due_date` เดิม. Inline status ไม่มีปุ่มลูกศรแยก ข้อความอยู่กลาง; Done ยังต้องมี checklist ครบ. Kanban ใช้ motion 320ms เมื่อข้ามคอลัมน์/220ms เมื่อขยับในคอลัมน์ และปิด motion เมื่อ reduced motion. Notify อยู่มุมขวาบน. รายละเอียดผลจริง/ข้อจำกัดอยู่ `TeamFlow_UI_Vibe_Implementation_Report.md`; native SQL2022/Windows/full TC-AT/UAT ยังไม่ถือว่าผ่าน.

## เพิ่ม Gantt และดีไซน์ตามคำสั่งเจ้าของ — 6 ตุลาคม 2026

เจ้าของเลือกปรับแผนและตัวอย่างดีไซน์ก่อน เพิ่ม Gantt เข้าเวอร์ชันแรก และใช้แนว Monday Project Management: sidebar, project header, view tabs Table/Gantt/Calendar/Kanban, grouped table, status สีพร้อมข้อความ, owner avatars และ task detail. ใช้ข้อมูล/สิทธิ์เดียวกันทุกมุมมอง; ไม่เพิ่ม AI/email/custom fields/dependencies/critical path/automatic scheduling. Mock ใช้ข้อมูลสมมติ ไม่ใช่ระบบบันทึกงานจริง. เพิ่มเกณฑ์ FR-25/T-046 High/AT-19/TC-049; ดีไซน์ Table อยู่ T-045 และ review T-055. API/schema เดิมใช้ start_date/due_date; หากภายหลังเปลี่ยน contract ต้องรัน checks ของ T-003.

## การปรับ runtime ตามคำสั่งเจ้าของระบบ — 5 ตุลาคม 2026

ใช้ **Node.js 22** แทน Node.js 24 เพื่อให้ตรงกับโปรเจกต์อื่นในเครื่อง; ไม่อัปเกรดหรือเปลี่ยน runtime ส่วนกลาง แพ็กเกจต้องเลือกรุ่นที่รองรับ Node22 และ pin patch/lockfile ใน T-005 ก่อนปิดงาน การเปลี่ยนนี้ไม่เปลี่ยน business rules ของ Baseline1.1 และไม่ใช่ผลว่ารันทดสอบแล้ว

เจ้าของระบบยืนยันใช้ **SQLite สำหรับพัฒนา local ชั่วคราว** ร่วมกับ Node.js22; ฐานข้อมูลปลายทางสำหรับ Windows ยังคง SQL Server2022 ต้องแยก adapter/migrations/configuration และรายงานผลทดสอบตาม database provider ผล SQLite ไม่ใช้แทน SQL Server integration/concurrency/backup-restore sign-off

## ข้อยืนยันจาก readiness review — 5 ตุลาคม 2026

เจ้าของระบบยืนยัน “ok ตามที่แนะนำ” สำหรับรายการ22ประเด็นในบทสนทนา: กติกา8ข้อถือว่ายืนยันแล้วตาม SRS §18; รายละเอียดสัญญา10ข้อและแผนงาน4ข้อเป็นงานที่ต้องทำใน T-003/T-004/T-005 และ task ที่เกี่ยวข้อง ไม่ใช่ผลว่า implementation หรือ tests ผ่านแล้ว ใช้ Baseline1.1 พร้อมข้อยืนยันเพิ่มเติมนี้เมื่อข้อความเดิมกำกวม; ไม่ต้องขออนุมัติกติกาเดิมซ้ำ

## บันทึกการยืนยัน — Baseline 1.1

เจ้าของระบบยืนยันในบทสนทนานี้: “ผม ok ตามที่เสนอ และ sql server 2022” กติกา D-01–D-11 และคำตอบ R-01–R-04 ที่เสนอถือเป็น baseline แล้ว; ฐานข้อมูลใช้ **Microsoft SQL Server 2022** แทนข้อเสนอเดิม

- R-01: ผู้ใช้กดเสร็จเองหลัง Checklist ครบ ไม่ auto-done
- R-02: Archive ระดับโปรเจกต์; งานใช้ soft delete/restore 30 วัน ไม่มี task archive แยก
- R-03: ไฟล์แนบที่ลบเก็บในถังขยะ 30 วัน ยังนับ quota จน purge; uploader/owner Lead/Admin คืนไฟล์ได้ในช่วงนี้หากยังมี write access และโปรเจกต์ active
- R-04: คง recurrence tombstone หลัง purge เพื่อกันสร้างรอบซ้ำ; technical design ใช้ source/generated ID snapshots ที่ไม่ผูก FK ถึง task ที่อาจถูกลบ
- Stack: React + TypeScript + Vite, Node.js 22 + Express 5 + `mssql`/Tedious, SQL Server 2022; เครื่องมือหน้าจอ/ตรวจข้อมูล/ทดสอบตาม SRS §3.4
- Edition ของ SQL Server, patch/runtime/package versions และสิทธิ์ติดตั้งยังต้องตรวจตอนติดตั้ง ไม่มีข้อสรุปว่าเป็น Express/Developer หรือพร้อม production แล้ว

การยืนยัน baseline ไม่ใช่ผลทดสอบระบบ สถานะปัจจุบัน: T-001/T-002 DONE ด้านเอกสาร และ T-003 DONE เฉพาะ API contract/schema tests ตามหลักฐานใน Task Register; application/ฐานข้อมูล/Windows/UAT และ TC/AT เต็มกรณียัง NOT_RUN **ชื่อไฟล์คงเดิมเพื่อรักษา references; ให้ดู version 1.6 ในส่วนหัวเป็นรุ่นเนื้อหาปัจจุบัน**


## 1. แนวทางอ่านเอกสาร

คำว่า **ต้อง** เป็นข้อกำหนดของ Baseline 1.1 ที่เจ้าของระบบยืนยันแล้ว FR/NFR/BR อ้างถึงเอกสาร Requirements; SP เป็นข้อกำหนดการทำงาน; AT เป็น acceptance test; D เป็นค่าเริ่มต้นที่เสนอ

SRS นี้กำหนดพฤติกรรมของแอปที่เราจะสร้าง ไม่รับรองฟีเจอร์ของ MobMai รายละเอียดไม่ได้อ้างอิงจากการเดาพฤติกรรมภายในของ MobMai

## 2. ค่าเริ่มต้นที่ยืนยันและการตัดสินใจ

| ID | ค่าเริ่มต้นที่ใช้พัฒนา | เหตุผล/ผลกระทบ |
|---|---|---|
| D-01 | ชื่อทำงาน TeamFlow, English base (owner7Oct2026), Unicode data, timezone Asia/Bangkok | เปลี่ยนชื่อองค์กรในระบบได้; timestamp เก็บ UTC |
| D-02 | Admin/Lead/Member และ project Editor/Viewer | สมาชิกเห็นเฉพาะโปรเจกต์ที่เพิ่มให้; Lead ดูแลของทีมตน |
| D-03 | โปรเจกต์เจ้าของหนึ่งทีม แชร์ให้ผู้ใช้จากทีมอื่นได้ | การแชร์ไม่เปิดทั้งทีมโดยอัตโนมัติ |
| D-04 | Editor แก้ไข/ย้ายงานใดก็ได้ในโปรเจกต์ | เก็บ audit; ลบงานได้เฉพาะผู้สร้าง/ผู้ดูแล |
| D-05 | ผู้รับหนึ่งคนหรือไม่มอบหมาย | ผู้ร่วมงานอื่นเข้าผ่าน project membership |
| D-06 | สถานะ todo/doing/review/done; priority low/medium/high/urgent | ไม่มี custom columns หรือ approval workflow ใน v1 |
| D-07 | Checklist ต้องครบก่อน done; งานซ้ำสร้างรอบถัดไปเมื่อ done | ป้องกันปิดงานค้าง/สร้างรายการล่วงหน้าซ้ำ |
| D-08 | ไฟล์สูงสุด 10 MiB ต่อไฟล์, พื้นที่รวม 5 GiB | ค่า config; allowlist ตาม §9.5; ไม่บังคับใช้ antivirus SaaS |
| D-09 | soft delete 30 วัน; audit/comment เก็บจน purge parent | งาน archived ไม่อยู่ในรายงานงาน active |
| D-10 | แจ้งเตือนเก็บ 90 วัน; update UI ด้วย polling ≤10 วินาทีเมื่อเปิดหน้า | ไม่มีอีเมล/Push เมื่อปิดเว็บ; reminder ตรวจทุก 60 วินาที |
| D-11 | session absolute 12 ชั่วโมง, idle 60 นาที; รหัส 6–128 ตัวอักษร | ไม่ใช้ public registration; reset โดย Admin |
| D-12 | React/TypeScript/Vite + Node.js 22/Express 5 + SQL Server 2022 ผ่าน mssql/Tedious | ใช้ฐานข้อมูลที่องค์กรมี; Edition/connection/service permissions ตรวจตอนติดตั้ง |

D-12 ใช้ฐานข้อมูล SQL Server 2022 ตามคำยืนยันของเจ้าของระบบ; กำหนด stack สำหรับพัฒนาตาม §3.4 และล็อก patch/dependency versions ใน T-003/T-005 ก่อนใช้จริง SQL2022 ใช้ mssql/Tedious; local dev ใช้ SQLite adapter แยกตามคำสั่งเพิ่มเติม และไม่สมมติ Edition ของ SQL Server

อ้างอิงทางเทคนิค: [node-mssql](https://github.com/tediousjs/node-mssql), [SQL Server BACKUP](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver16), [SET XACT_ABORT](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-xact-abort-transact-sql?view=sql-server-ver16), [Filtered indexes](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-filtered-indexes?view=sql-server-ver16)

## 3. Architecture และขอบเขตระบบ

### 3.1 องค์ประกอบ

| องค์ประกอบ | หน้าที่ |
|---|---|
| Browser UI | Login, งานของฉัน, Kanban, รายการ, ปฏิทิน, Gantt, รายงาน, ทีมและ Admin |
| Application API | Authentication, authorization, validation, transaction และ export |
| SQL Server repository | mssql/Tedious connection pool; parameterized T-SQL, FK/constraints/indexes; transaction; versioned migration |
| File storage | เก็บไฟล์ด้วยชื่อสุ่มนอก webroot; ดาวน์โหลดผ่าน API ที่ตรวจสิทธิ์ |
| In-process scheduler | Reminder, retention และ session cleanup; ไม่สร้าง recurring tasks ตาม timer |
| Deployment configuration | origin, cookie policy, data path, port, quota และ log path |
| Backup/restore scripts | หยุด writes สำรอง DB/files คู่กัน ตรวจ manifest และ restore ทดสอบ |

### 3.2 ข้อจำกัดการติดตั้งที่ตั้งใจ

- v1 รัน application instance เดียวเพื่อควบคุม scheduler/maintenance; เชื่อม SQL Server 2022 ผ่าน connection pool; การใช้ SQL Server ไม่ได้เพิ่ม multi-instance scope อัตโนมัติ
- SQL Server จัดการ database storage เอง; uploads/temp/logs อยู่บน local disk ของ app นอก source/build/webroot; SQL Server อาจเป็น host แยกได้ตามการตั้งค่าผู้ติดตั้ง
- app bind loopback เมื่ออยู่หลัง reverse proxy; HTTPS จบที่ IIS/proxy หรือแอปตาม configuration
- ไม่ใช้ Control Panel เป็น runtime โดยอัตโนมัติ ต้องมีวิธีรัน Node process และเริ่มอัตโนมัติหลัง reboot
- ไม่พึ่ง connector, ChatGPT account, cloud storage, SMTP, AI API หรือ CDN font เพื่อใช้งานฟังก์ชันหลัก
- ไม่ต้องใช้ Docker; Windows installation scripts และ service configuration อยู่ใน deliverables

### 3.3 Configuration contract

`APP_ORIGIN` ต้องเป็น origin จริงหนึ่งค่า เช่น `https://tasks.example.com`; ไม่รับ wildcard เมื่อใช้งานจริง

| Key | Default/ข้อกำหนด |
|---|---|
| HOST / PORT | 127.0.0.1 / 3000; เปลี่ยนได้ |
| APP_ORIGIN | ต้องระบุใน production; ใช้ตรวจ Origin/CSRF |
| COOKIE_SECURE | true ใน production HTTPS; startup ปฏิเสธค่าที่ขัดกัน |
| DATA_DIR / LOG_DIR | สำหรับ uploads/temp/logs; absolute path; app service account อ่าน/เขียนได้ ไม่ใช่ตำแหน่งไฟล์ DB |
| DB_PROVIDER | sqlite สำหรับ local dev ชั่วคราว; sqlserver สำหรับ Windows ปลายทาง; ต้องระบุชัด ไม่ fallback เงียบ |
| SQLITE_DB_PATH | SQLite local dev เท่านั้น; absolute path นอก source/build/webroot อยู่ใน DATA_DIR; ไม่ commit database/sidecar files |
| DB_SERVER / DB_PORT / DB_NAME | SQL Server host; port ที่ตั้งจริง (ค่าแนะนำ 1433 ไม่เดาว่าเปิดอยู่); database แยก TeamFlow |
| DB_USER / DB_PASSWORD | SQL Authentication แบบ dedicated least-privilege login; secret นอก source/log; integrated auth เป็นทางเลือกติดตั้งที่ต้องตรวจ driver แยก |
| DB_ENCRYPT / DB_TRUST_SERVER_CERTIFICATE | true / false เมื่อใช้จริง; certificate ของ SQL Server ต้องเชื่อถือได้; local test ข้อยกเว้นลง config แยก |
| DB_POOL_MAX / DB_REQUEST_TIMEOUT_MS / DB_LOCK_TIMEOUT_MS | 10 / 15000 / 5000; ค่าปรับได้และทดสอบตาม load |
| DB_BACKUP_DIR | ตำแหน่ง .bak ที่ SQL Server service account เขียนได้; host/path ต้องตรง SQL host; แยกจาก uploads/manifest destination |
| MAX_FILE_BYTES | 10,485,760 |
| TOTAL_UPLOAD_BYTES | 5,368,709,120 |
| SESSION_ABSOLUTE_MIN / SESSION_IDLE_MIN | 720 / 60 |
| POLL_SECONDS / REMINDER_SECONDS | 5 / 60; poll5sเผื่อresponseสำหรับtargetupdate≤10s |
| TRASH_RETENTION_DAYS / NOTIFICATION_RETENTION_DAYS | 30 / 90 |
| TRUSTED_PROXY | explicit IP allowlist ถ้าจำเป็น; ไม่เชื่อ X-Forwarded-* จากทุกแหล่ง |

### 3.4 Stack ที่ใช้เป็นฐานพัฒนา

| ส่วน | Technology |
|---|---|
| Frontend | React + TypeScript + Vite; React Router; CSS/CSS Variables; Fetch API |
| Kanban | dnd-kit พร้อม keyboard/touch alternative |
| Backend | Node.js 22 + Express 5 + TypeScript |
| Validation / upload | Zod; Busboy + Node Streams |
| Database | Local dev ชั่วคราว: SQLite adapter; Windows ปลายทาง: SQL Server2022/mssql/Tedious; แยก migrations ต่อ provider ไม่มี ORM บังคับ |
| Password / session | Node Crypto asynchronous scrypt; cookie session ที่เก็บ hash ใน SQL Server |
| Date / polling / jobs | Intl/UTC/Bangkok date helpers; polling ≤10s; in-process jobs ทุก60s |
| Unit / integration / UI tests | node:test/node:assert; Vitest สำหรับ frontend logic; Playwright สำหรับ browser/API |
| PWA | Web Manifest + Service Worker cache เฉพาะ static |
| Windows | IIS/proxy ตามสิทธิ์ที่มี; WinSW; Task Scheduler; env config; JSON logs |
| Source tools | npm/lockfile; tsc; ESLint/Prettier; Git |

Pin versions/license inventory ใน code manifest; ข้อกำหนด runtime/HTTPS/service/Edition ต้องตรวจติดตั้งจริง ไม่มีบริการ SMTP/AI/SaaS บังคับ

## 4. Permission Model

### 4.1 การคำนวณ effective permission

ตรวจตามลำดับ: active user → session valid → บัญชีไม่ติด must_change_password สำหรับ operation ทั่วไป → resource ไม่ถูก purge → ขอบเขตองค์กร → effective permission → archived/deleted state → business validation

1. Admin: ดูแลทุกทีมและทุกโปรเจกต์
2. Lead: ดูแลโปรเจกต์ที่ `owner_team_id` อยู่ในทีมที่ตนเป็น Lead
3. คนอื่น: ใช้ `project_members` ของโปรเจกต์นั้น; Editor เขียนได้ Viewer อ่านได้
4. สมาชิกทีมอย่างเดียว **ไม่** เพิ่ม project permission
5. การเป็น assignee/creator/comment author อย่างเดียว **ไม่** ให้สิทธิ์หาก project access ถูกถอน

### 4.2 Permission matrix

| Operation | Admin | Lead ทีมเจ้าของ | Editor | Viewer | ไม่มี project access |
|---|---|---|---|---|---|
| สร้าง/ปิดบัญชี แต่งตั้ง Lead | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| เพิ่ม/ถอนสมาชิกทีม | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| สร้างโปรเจกต์ | ได้ | ในทีมตน | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| แก้/เก็บ/เปิดคืนโปรเจกต์ | ได้ | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| เพิ่ม/เปลี่ยน/ถอน project member | ได้ | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| อ่านงาน/ประวัติ/ความคิดเห็น/ไฟล์ | ได้ | ได้ | ได้ | ได้ | ไม่ได้ |
| สร้าง/แก้/มอบหมาย/ลากงาน | ได้ | ได้ | ได้ | ไม่ได้ | ไม่ได้ |
| เพิ่ม/ติ๊ก/แก้/ลบงานย่อย | ได้ | ได้ | ได้ | ไม่ได้ | ไม่ได้ |
| แสดงความคิดเห็น/อัปโหลด | ได้ | ได้ | ได้ | ไม่ได้ | ไม่ได้ |
| ลบไฟล์แนบ | ได้ | ได้ | เฉพาะที่อัปโหลดเอง | ไม่ได้ | ไม่ได้ |
| Soft delete งาน | ได้ | ได้ | เฉพาะงานที่สร้างเอง | ไม่ได้ | ไม่ได้ |
| คืนงานจากถังขยะ | ได้ | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| รายงาน/CSV | ทั้งองค์กร | โปรเจกต์ทีมตน + ที่ได้รับเพิ่ม | เฉพาะโปรเจกต์ที่เข้าถึง | เฉพาะโปรเจกต์ที่เข้าถึง | ไม่ได้ |
| กู้คืน backup / เรียก purge CLI ถาวร | ผู้ดูแลการติดตั้งเท่านั้น | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |

โปรเจกต์ archived ให้ทุกบทบาทอ่านตามสิทธิ์ได้ แต่ห้าม write งาน/comments/files/subtasks/recurrence ยกเว้น Admin/owner Lead unarchive, soft delete หรือ restore งานผ่าน endpoint เฉพาะ; creator ที่เป็น Editor ลบใน archived project ไม่ได้; งานที่คืนยัง read-only จน project active; งาน deleted อ่านได้เฉพาะ Admin/Lead ผ่าน trash ไม่ปรากฏใน endpoint งานปกติ

### 4.3 ความเป็นส่วนตัวของ directory

Lead ดูรายชื่อผู้ใช้ active และชื่อทีมเพื่อเลือกเพิ่ม project member ได้ แต่ไม่เห็นงานหรือข้อมูลบัญชีส่วนตัวของทีมอื่น Member/Viewer เห็นชื่อผู้ร่วมโปรเจกต์ที่ตนเข้าถึง ไม่เห็นบัญชีทั้งหมดขององค์กร Username/active/role จัดการผ่าน Admin API เท่านั้น

### 4.4 Project manager และ permission catalog (addendum 1.11)

ลำดับตรวจเพิ่มจาก §4.1: หลัง membership ให้อ่าน `user_permissions` ปัจจุบันของผู้ใช้ในทุก request (ไม่ cache ข้าม request) แล้วใช้กับ resource ในโปรเจกต์ที่ผู้ใช้เป็น `manager` (P-01–P-07) หรือทีมที่เป็นสมาชิก (P-08–P-10). Job title ไม่อยู่ในการคำนวณสิทธิ์ (BR-19/BR-21)

| Operation | Admin | Lead ทีมเจ้าของ | Manager + key | Manager ไม่มี key นั้น | Editor | Viewer |
|---|---|---|---|---|---|---|
| แก้ชื่อ/รายละเอียดโปรเจกต์ | ได้ | ได้ | P-01 | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| จัดการ Group | ได้ | ได้ | P-02 | ไม่ได้ | ตามเดิม | ไม่ได้ |
| เพิ่ม/ถอด Editor/Viewer | ได้ | ได้ | P-03 | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| แต่งตั้ง/ถอด manager | ได้ | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| ลบ/คืนงานของผู้อื่น | ได้ | ได้ | P-04 | เฉพาะงานที่สร้างเอง (ลบ) | เฉพาะงานที่สร้างเอง (ลบ) | ไม่ได้ |
| แก้/ลบ/คืน Docs ของผู้อื่น | ได้ | ได้ | P-05 | แก้ได้; ลบ/คืนเฉพาะของตน | แก้ได้; ลบ/คืนเฉพาะของตน | อ่าน |
| ลบ/คืนไฟล์ของผู้อื่น | ได้ | ได้ | P-06 | เฉพาะที่อัปโหลดเอง | เฉพาะที่อัปโหลดเอง | ไม่ได้ |
| Overview/Reports/CSV ของโปรเจกต์ | ได้ | ได้ | P-07 | ตาม Editor | ตามโปรเจกต์ที่เข้าถึง | ตามโปรเจกต์ที่เข้าถึง |
| สร้างโปรเจกต์ในทีมที่เป็นสมาชิก | ได้ | ในทีมตน | P-08 (ผู้สร้างเป็น manager) | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| Workload/Reports ระดับทีม | ได้ | ทีมตน | P-09/P-10 เฉพาะงานในโปรเจกต์ที่เข้าถึง | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| ติ๊ก/เอาออก permission, จัดการ job title | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |

กติกา server: แต่งตั้ง `manager` ต้องมี P-01–P-07 ≥1 ข้อมิฉะนั้น 422; ผู้ใช้แก้ permission ของตนเอง 403 แม้เป็น Admin คนเดียวให้ใช้ admin CLI; บันทึก permission ใช้ `permissions_version` ต่อผู้ใช้ (409 เมื่อ stale); เอาออกจนไม่เหลือ P-01–P-07 ให้ลด `manager` → `editor` ทุกโปรเจกต์ใน transaction เดียวกับการบันทึก + admin audit + เพิ่ม scoped view revision ของผู้ใช้; deny-by-default เมื่อ key ไม่รู้จัก

## 5. Data Dictionary

IDs ใช้ positive integer ภายใน API; ไม่ถือว่า ID ที่เดาไม่ได้แทน authorization. Text ใช้ Unicode. Timestamp ใช้ ISO 8601 UTC; date-only ใช้ YYYY-MM-DD. FK ไม่ลบ user ที่มีประวัติ ให้ deactivate แทน

| Entity | Fields สำคัญ / constraints |
|---|---|
| organizations | id=1, name ≤100, timezone='Asia/Bangkok', version int≥1, created_at, updated_at |
| users | id PK, username UNIQUE case-insensitive ≤60 pattern `[A-Za-z0-9._-]+`, display_name ≤100, email ≤254 default empty, telephone ≤40 default empty, password_hash, org_role admin/member, active bool, must_change_password bool, auth_version, version int≥1, created_at, updated_at |
| sessions | token_hash PK, user_id FK, csrf_token, auth_version, created_at, last_seen_at, absolute_expires_at; raw session token ไม่เก็บใน DB |
| teams | id PK, name UNIQUE case-insensitive ≤100, description ≤1000, archived_at nullable, version |
| team_members | team_id + user_id composite PK, team_role lead/member, team_position pm/lead/dev default dev (label only), joined_at |
| projects | id PK, owner_team_id FK, name ≤100, description ≤2000, project_type enum (default internal), project_category enum (default development), archived_at nullable, version, created_by, created_at, updated_at |
| project_members | project_id + user_id composite PK, access editor/viewer, added_by, added_at; user ไม่จำเป็นอยู่ทีมเจ้าของ |
| tasks | id PK, project_id FK, title ≤200, description ≤10000, category ≤80, status enum, priority enum, group_id nullable FK project_groups, assignee_id nullable FK (compatibility alias), creator_id FK, start_date nullable, due_date nullable, recurrence none/daily/weekly/monthly, recurrence_anchor_day nullable, predecessor_task_id nullable FK (unique filtered index), successor_task_id nullable FK, version int≥1, created_at, updated_at, completed_at nullable, deleted_at/by nullable |
| task_assignees | task_id FK + user_id FK composite PK; max30 distinct active effective-write owners enforced by service; user index; legacy scalar synchronized to lowest ID |
| project_groups | id PK, project_id FK, name≤100UTF16, color hex7, position≥0, version, created_at; max1000/project; same-project Task links enforced by service |
| subtasks | id PK, task_id FK, title ≤200, done bool, nullable assignee_id FK users, remark plain text <=2000 UTF16 units default empty, version, created_at; independent assignment active/effective-write; ไม่มีวันส่งแยก |
| board_columns | project_id + status composite PK, version int≥1; ใช้ concurrency ของการเรียงทั้งคอลัมน์ |
| board_positions | task_id UNIQUE FK, project_id, status, rank int; UNIQUE(project_id,status,rank) ทุก statement; ใช้ temporary unique ranks ใน transaction; สอดคล้อง tasks.status |
| comments | id PK, task_id FK, author_id FK, body ≤5000, created_at; append-only ใน UI |
| attachments | id PK, task_id FK, uploader_id FK, original_name ≤200, storage_key UNIQUE random UUID, bytes≥1, validated_type, sha256, created_at, deleted_at nullable |
| task_events | id PK, task_id FK, actor_id nullable, action, field_changes JSON, request_id, created_at; append-only |
| admin_events | id PK, actor_id, action, resource_type/id, redacted_changes, request_id, created_at |
| notifications | id PK, recipient_id FK, task_id FK, type, message, dedupe_key UNIQUE, read_at nullable, created_at; read access ตรวจตาม parent เสมอ |
| recurrence_events | source_task_id INT UNIQUE NOT NULL snapshot (ไม่มี FK), generated_task_id INT NOT NULL snapshot (unique index ไม่มี FK), created_at; คง tombstone หลัง task purge; IDs ไม่ reuse/reseed ใน production |
| idempotency_keys | user_id + route + key composite UNIQUE, request_hash, response_status/body, expires_at; ไม่เก็บ upload bytes หรือ password |
| user_view_revisions | user_id PK FK, revision UUID, updated_at; เปลี่ยนพร้อมvisiblemutation/accessrevoke; Self.view_revisionเป็นscopedopaqueUUIDไม่ใช่globalactivitycounter |
| storage_quota | singleton stored_bytes/reserved_bytes≥0; diskcleanupสำเร็จก่อนreleaseusedbytes |
| upload_reservations | randomid,user_id,task_id,reserved/actual_bytes,temp_key,expires_at,phase; persistก่อนstream/recovery |
| file_cleanup_queue | storage_key/bytes snapshots,reason,attempts,next_attempt_at; survivesparentpurgeจนcleanupbytesสำเร็จ |
| maintenance_state | singletonownerid/state/lease_expires_at; coordinationwritegate/jobs/drain; designตามAPI Contract§7 |
| schema_migrations | version UNIQUE, checksum, applied_at |

Index ขั้นต่ำ: team_members(user_id), project_members(user_id), tasks(project_id,status,deleted_at), tasks(assignee_id,due_date), tasks(completed_at), comments(task_id,id), task_events(task_id,id), notifications(recipient_id,read_at), sessions(absolute_expires_at), sessions(last_seen_at), board_positions(project_id,status,rank). ตรวจ query plan และ pagination จากงานจริง

### 5.1 SQL Server 2022 Physical Mapping / Concurrency

- IDs ใช้ INT IDENTITY(1,1); BIT สำหรับ boolean; DATE สำหรับ date-only; DATETIME2(3) UTC สำหรับ timestamps (default SYSUTCDATETIME()); NVARCHAR สำหรับภาษาไทย; BIGINT สำหรับ byte counts; application version ใช้ INT ไม่สับสนกับ SQL rowversion
- JSON field_changes/redacted_changes/response body ใช้ NVARCHAR(MAX) + ISJSON validation เมื่อไม่ NULL; ไม่มี native JSON column dependency
- username/team name uniqueness ใช้ collation case-insensitive ที่กำหนดและทดสอบภาษาไทย/Unicode; text length validator ให้นิยามตรง DB storage และ boundary tests
- optional UNIQUE เช่น predecessor_task_id/generated reference ใช้ unique filtered index `WHERE ... IS NOT NULL`; อย่าใช้ UNIQUE nullable แบบไม่กรองแล้วจำกัดให้มี NULL เพียงรายการเดียว
- Foreign keys ที่มีหลายเส้นทางใช้ NO ACTION และ purge แบบ explicit ใน transaction; ไม่ใช้ cascade ทุกตารางจนเกิด multiple-cascade-path errors
- ทุก mutation ที่ต้อง atomic ใช้ SET XACT_ABORT ON + explicit transaction ผ่าน mssql connection เดียว; rollback เมื่อ error; SQL แทรกค่าด้วย typed parameters ไม่ต่อ string จากผู้ใช้
- Optimistic version: UPDATE ... WHERE id=@id AND version=@expected; ถ้า affected rows=0 ให้ตรวจ access/exists แล้วตอบ 409 หรือ 404; ไม่ increment ก่อน server commit
- Board move lock board_columns/task ที่เกี่ยวข้องด้วย UPDLOCK/HOLDLOCK และ lock columns ตามลำดับคงที่; เปลี่ยน rank สองระยะ (temporary negative rank ที่ไม่ซ้ำ แล้ว final positive1..N) ใน transaction เพื่อไม่ชน UNIQUE ระหว่าง statements เพราะ SQL Server ไม่มี deferred unique validation หลัง commit
- Recurrence source completion + unique tombstone + successor + board/audit/notifications ใช้ transaction เดียว; source-task lock/UNIQUE guards ป้องกัน concurrent duplicate
- Quota reservations/idempotency/setup/last-active-Admin ใช้ DB locks/unique constraints ไม่ใช่ in-memory locks อย่างเดียว
- Lock timeout/deadlock ต้อง rollback ก่อน retry; deadlock1205 retry whole transaction แบบจำกัดเฉพาะคำสั่ง idempotent (สูงสุด2 ครั้ง); timeout ที่ไม่ทราบ commitresult ห้าม blind retry ให้ตรวจ authoritative state/key result ก่อน; หมด retry ตอบ503/Retry-After
- จำกัด query pagination ด้วย ORDER BY + OFFSET/FETCH; ทุก sort column ใช้ allowlist; index/query-plan/load tests ใช้ SQL Server จริง ไม่ใช้ in-memory SQLite แทน integration

### 5.2 SQLite สำหรับพัฒนา local ชั่วคราว

- ใช้ business rules, permissions, DTO/API และ application versions เดียวกับปลายทาง; ไม่ลด checklist/recurrence/idempotency/quota/audit rules เพื่อให้ local ผ่านง่ายขึ้น
- แยก repository adapter และ migrations ของ SQLite จาก SQL2022; ไม่ส่ง T-SQL/SQL Server lock syntax ไป SQLite และไม่ถือว่า local transaction behavior พิสูจน์ SQL2022 concurrency แล้ว
- เลือก driver ที่รองรับ Node22 และ pin version/API ใน T-005; ตรวจ local migration/constraints/date/text serialization กับ provider จริง ไม่อ้างว่ามี implementation แล้วจากการยืนยันนี้
- local database/uploads เป็น fixture แยก ไม่มีข้อมูลจริง; ignore database/sidecar/temp files; ไม่ seed production อัตโนมัติ
- การย้ายไปปลายทางครั้งแรกใช้ SQL2022 fresh migrations และ fixture ที่สร้างซ้ำได้; ไม่รวมการย้ายข้อมูล SQLite จริงขึ้น production อัตโนมัติ หากต้องเก็บข้อมูล local ให้กำหนด migration/data validation แยกก่อนใช้งานจริง
- local backup/restart checks ระบุว่า SQLite; SQL2022 .bak/RESTORE/locks/query plan/performance และ Windows tests ตาม §5.1/§13 ต้องรันกับ environment นั้นก่อนปิด acceptance ที่เกี่ยวข้อง
- SQLite ช่วยให้ทำ local implementation/tests ต่อได้เมื่อ SQL2022 ยังไม่พร้อม แต่ task ที่ต้องมี SQL2022 evidence ยังคงเปิดจนเกณฑ์ปลายทางผ่าน; ไม่เปลี่ยนผลเหล่านั้นเป็น PASS หรือ NOT_APPLICABLE

### 5.3 Addendum entities (planned migrations SQLite + SQL Server)

| Entity | Fields / constraints |
|---|---|
| job_titles | id, name (unique case-insensitive ≤50), color, is_active, sort_order, created_at/updated_at; ตั้งต้น PM, SM, BA, SA, Dev, Tester; ห้ามลบเมื่อยังถูกอ้าง |
| users (เพิ่ม) | job_title_id nullable FK, permissions_version int |
| user_permissions | user_id, permission_key (P-01–P-10 check), granted_by, granted_at; PK(user_id, permission_key) |
| project_members.role | เพิ่มค่า `manager` ใน check constraint |
| project_docs | id, project_id, title ≤200, body_html sanitized ≤200,000 ตัวอักษร (ข้อความ), version, created_by/updated_by, timestamps, deleted_at/deleted_by |
| project_doc_versions | doc_id, version, title, body_html, edited_by, edited_at |
| project files | attachments ขยายให้ `task_id` nullable + `project_id` not null (หรือ table แยก) โดยคง quota/ตรวจชนิด/trash เดิม |
| user_favorites | user_id, project_id, created_at; PK คู่; ลบเมื่อหมด access |
| user_preferences | user_id, key, value_json ≤8KB (column widths, hidden tabs, reduce animations, confetti) |
| organization settings (เพิ่ม) | workload_threshold default 10 |

## 6. Authentication / Accounts — SP-01

**เกี่ยวข้อง:** FR-01–05, NFR-02, BR-01–02

### 6.1 First-run

- ถ้าไม่มี user ให้ server สร้าง setup token อย่างน้อย 256-bit และแสดงเฉพาะ console; token เปลี่ยนเมื่อ restart
- `/api/meta` เปิดเผยเฉพาะ `setupRequired` และ app version ไม่แสดง token หรือ DB path
- `/api/setup` รับ token, username, display_name, password, organization_name; ใช้ transaction + เงื่อนไข no users เพื่อป้องกัน setup พร้อมกัน
- หลังสร้าง Admin สำเร็จ setup token ใช้อีกไม่ได้; endpoint ตอบ 409 แม้ token เดิมถูกต้อง
- ไม่มี default admin/password ที่ commit ใน source หรือ sample config

### 6.2 Login/session

- Username case-insensitive; password ไม่ trim; ตรวจความยาวก่อนทำ password hash
- ใช้ asynchronous scrypt พร้อม random salt อย่างน้อย 128-bit และ constant-time comparison; ค่าเริ่มต้น N=32768, r=8, p=1, key length=64 bytes, maxmem อย่างน้อย 64 MiB; เก็บ algorithm/cost/salt/hash เพื่อรองรับการปรับรุ่น; ห้าม plaintext/reversible encryption
- Login fail ทุกสาเหตุใช้ข้อความเดียว; rate limit ค่าเริ่มต้น 10 attempts ต่อ username และ 30 attempts ต่อ IP ใน 15 นาที; success ไม่ปลดข้อจำกัด IP ทั้งหมด
- random session token อย่างน้อย 256-bit; cookie HttpOnly, SameSite=Strict, Secure เมื่อ production HTTPS, Path=/; DB เก็บ hash
- session absolute 12 ชั่วโมง/idle 60 นาที; GET notification polling ไม่ต่อ idle age; intentional user interaction ส่ง activity ผ่าน endpoint ที่มี CSRF
- reset, deactivate, role change และ forced logout revoke session ของผู้ใช้เป้าหมาย; permissions ตรวจ DB ปัจจุบันทุก request
- account ที่ must_change_password ใช้ได้เฉพาะ me/password/logout/activity; operation อื่นตอบ 403 `PASSWORD_CHANGE_REQUIRED`
- logout revoke DB session และ clear cookie; password change revoke session อื่นและ rotate session/CSRF ของผู้ใช้ปัจจุบัน

### 6.3 Admin account actions

- Owner request 2026-10-09: Admin Member create/edit เพิ่ม Member Name (`display_name` ≤100), Email (optional ≤254; empty หรือ email format), Tel. (optional ≤40; อนุญาตตัวเลข `+(). #/-`), Role (`org_role` admin/member) และ Team selector. `team_ids` optional unique ≤100 เป็นการเพิ่มสมาชิกแบบ additive: ทีมเดิม/permission role/ตำแหน่งเดิมคงอยู่, ทีมใหม่ต้อง active และใช้ member/dev; omitted/empty array ไม่ถอนสมาชิก. การถอน/เปลี่ยนตำแหน่งใช้ Teams → Members. contacts-only edit ไม่ revoke sessions; version/last-admin/CSRF/audit/transaction เดิมยังบังคับ. Email/telephone อยู่ใน AdminUser/own Self เท่านั้น ไม่เพิ่มใน directory/Person. ไม่มี email delivery.
- Admin สร้างบัญชีพร้อมรหัสชั่วคราวที่ตนกรอก; ตั้ง must_change_password=true
- Admin reset password ต้องยืนยันรหัสผ่าน Admin ปัจจุบัน; ไม่คืนค่า password ใน API/log
- ผู้ใช้ inactive ยังอ้างอิงในประวัติได้; login ไม่ได้และไม่อยู่ assignee picker
- ห้าม demote/deactivate Admin active คนสุดท้ายด้วย transaction; ห้ามลบ user hard delete ผ่าน UI
- ผู้ดูแล server กู้ Admin ได้ด้วย CLI ที่รันบนเครื่องและมี audit; ไม่เปิด unauthenticated recovery endpoint

## 7. Teams / Projects — SP-02

**เกี่ยวข้อง:** FR-06–11, BR-03–05, BR-14–16

- Owner request 2026-10-09: Team Name ≤100 / Team Description ≤2000; create รับ `members` optional ≤100 รายการ `{user_id,team_position}` ที่ไม่ซ้ำและ active. ทั้งทีม สมาชิก และ audit บันทึก/rollback ใน transaction เดียว; permission role เริ่มต้น member ทุกตำแหน่ง. `team_position` pm/lead/dev เป็น label ไม่เพิ่มสิทธิ์ ไม่ใช้ในการ authorization; สมาชิกเดิม permission Lead migrate เป็นตำแหน่ง Lead, อื่น ๆ Dev โดยไม่เปลี่ยน permission. PUT membership ส่งตำแหน่งได้; omitted คงเดิมหรือ default Dev สำหรับสมาชิกใหม่. Pure position change ไม่เรียก assignment cleanup. Migration 0013 แยก SQLite/SQL Server; formal SQL2022 evidence NOT_RUN.
- team membership เพิ่ม/ถอน/เปลี่ยน Lead โดย Admin เท่านั้น
- archive team ได้เมื่อไม่มีโปรเจกต์ active; ไม่เปลี่ยน project status แบบเงียบ; สมาชิกอยู่ในประวัติได้
- team archived สร้างหรือ unarchive โปรเจกต์ไม่ได้; Admin ต้อง unarchive team ก่อน; โปรเจกต์ archived ยังอ่านได้ผ่าน archived list
- สร้างโปรเจกต์ต้อง owner team active; creator Admin/Lead ทีมเจ้าของ; project name ซ้ำข้ามทีมได้
- Owner request 2026-10-09: ฟอร์มสร้าง/แก้ไขมี Project Name (free text ≤100), Project Type (dropdown: Internal/Client/Operations/Other; default Internal), Project Category (dropdown: Development/General/IT/Marketing/Finance/HR/Other; default Development), Project Detail (textarea ≤2000); สร้างเลือก Owner team จากทีม active ตามสิทธิ์เดิม ส่วนแก้ไข owner team คงอ่านอย่างเดียว. Type/Category เว้นว่างได้; API ใช้ `project_type`/`project_category` แบบ lowercase enum (รวม empty string), ค่าที่ไม่อยู่ในรายการตอบ 422; PATCH ที่ไม่ส่ง field คงค่าเดิม และใช้ version/audit transaction เดิม. Migration 0012 เติม Internal/Development ให้โปรเจกต์เดิม โดยคงชื่อ/รายละเอียด/version/owner; SQLite local กับ SQL Server แยกไฟล์และหลักฐาน.
- project membership เพิ่มได้จาก active users ทั้งองค์กร; role editor/viewer; Admin/Lead ไม่จำเป็นมี row membership เพื่อเข้าถึงของทีมตน
- ต้องไม่แก้ owner team ของโปรเจกต์ใน v1; ถ้าต้องย้ายทีมให้เป็น change request เพราะกระทบ access
- ถอนสิทธิ์/ลด Editor เป็น Viewer: ถ้าผู้ใช้ไม่มี effective write access แล้ว ให้ unassign **งานที่ยังไม่ done** ในโปรเจกต์ พร้อม audit และแจ้ง Admin/Lead ทีมเจ้าของ; งาน done คง assignee เป็นประวัติ
- ถอน team membership: คง explicit project membership ที่มีอยู่; ถ้าเสีย Lead แต่มี project Editor ยังคง access; ถ้าไม่มี effective access ให้ cleanup งานค้างตามกติกาด้านบน
- deactivate user: revoke sessions และ unassign งานไม่ done ทั้งหมดใน transaction; คงงาน done/ผู้สร้าง/comments/audit
- demote org Admin: revoke sessions, คำนวณ effective write ใหม่และ unassign งานไม่ done เฉพาะโปรเจกต์ที่เสีย write ใน transaction; คงสิทธิ์ owner Lead/explicit Editor ที่ยังมี
- เมื่อ access ถูกถอน API ใหม่ต้องถูกปฏิเสธทันที; browser อัปเดตในรอบ polling ถัดไป; file download ที่กำลัง stream แล้วอาจจบได้ แต่ request ใหม่ต้องปฏิเสธ

## 8. Task Lifecycle — SP-03

**เกี่ยวข้อง:** FR-12–20, BR-06–12, BR-17

### 8.1 ฟอร์มและ validation

| Field | Required | Validation |
|---|---|---|
| project_id | ใช่ | Active project, effective write access; แก้ข้ามโปรเจกต์ไม่ได้ |
| title | ใช่ | trim แล้ว 1–200 ตัวอักษร |
| description | ไม่ | plain text 0–10,000; ไม่รัน HTML/Markdown script |
| category | ไม่ | trim 0–80; free text ใน v1 |
| assignee_id | ไม่ | active และ effective write access; null หมายถึงไม่มอบหมาย |
| priority | ใช่ | low/medium/high/urgent; default medium |
| status | ใช่ | สร้างใหม่ todo; เปลี่ยนตาม transition rules |
| start_date/due_date | ไม่ | วันที่จริง YYYY-MM-DD; start≤due ถ้ามีสองค่า |
| recurrence | ใช่ | none/daily/weekly/monthly; ต้องมี due_date เมื่อไม่ใช่ none |
| version | ตอนแก้ไข | ต้องตรง version ปัจจุบัน; ไม่ตรงตอบ 409 |

API ปฏิเสธทุก unknown body/query fieldด้วยexplicitschema; ไม่strip/coerceเงียบ; versionเป็นexpectedversionเท่านั้น ไม่ใช่ค่าที่clientตั้งversionใหม่

### 8.2 State transitions

ทุกสถานะย้ายไปทุกสถานะอื่นได้โดย Editor/Lead/Admin ในโปรเจกต์ active; review เป็นสถานะติดตาม ไม่ใช่การอนุมัติ. เปลี่ยนไป done ตรวจ subtasks ทั้งหมด done ก่อน; ไม่ผ่านตอบ 422 `SUBTASKS_INCOMPLETE` โดยไม่เปลี่ยนข้อมูล

- todo/doing/review → done: ตั้ง completed_at=now, audit, notifications, recurrence generation ใน transaction เดียว
- done → todo/doing/review: completed_at=null และเก็บ reopen event; ถ้า assignee ไม่ active หรือไม่มี effective write ให้ null พร้อม audit; งานที่สร้างจาก recurrence ไว้แล้วไม่ถูกลบ
- done → done: no-op ไม่เปลี่ยน completed_at ไม่สร้าง recurrence; ถ้า request key เดิมให้คืนผลเดิม
- งานหลัก done ห้ามเพิ่มหรือ untick subtask จน reopen; ไม่กำหนด checklist completion ให้เปลี่ยนสถานะหลักเอง
- งาน deleted ไม่รับแก้ไข/ความคิดเห็น/files; การ restore คืนสถานะเดิมแต่ version เพิ่ม

### 8.3 Recurring tasks

1. ใช้ due_date รอบเดิมเป็นฐาน daily +1 วัน weekly +7 วัน monthly เดือนถัดไป
2. Monthly เก็บ recurrence_anchor_day ของ series: วันที่ 31 → ก.พ.วันสุดท้าย → มี.ค.31; ไม่เลื่อนไปเป็น 28 ถาวร; หากผู้ใช้แก้ due_date ของงาน monthly รอบปัจจุบันให้ตั้ง anchor ใหม่จาก due_date นั้น; none/weekly/daily→monthly ตั้ง anchor จาก due_date, ออกจาก monthly ล้าง anchor; ไม่แก้ successor ที่สร้างแล้ว
3. start_date หากมีให้รักษาระยะห่างวันจาก due_date; ถ้าไม่มีคง null
4. Copy title, description, category, priority, assignee ที่ยัง eligible, checklist titles โดย done=false, recurrence และ anchor; ไม่ copy comments/files/audit/completion
5. งานรอบใหม่ status=todo, version=1; เก็บ predecessor/successor และ recurrence_events source UNIQUE
6. ผู้รับหมดสิทธิ์ให้ null; ถ้าโปรเจกต์ archived ไม่ให้ปิดงาน/สร้างรอบใหม่
7. reopening + recompleting source ไม่สร้างเพิ่ม; repeat no longer desired ให้ตั้ง recurrence=none ก่อน done; เปลี่ยน source หลังมี successor ไม่แก้ successor โดยอัตโนมัติ
8. งาน overdue หลายรอบสร้างเพียงรอบถัดไปหนึ่งงาน ไม่ catch-up สร้างทุกวันย้อนหลัง; งานใหม่อาจยัง overdue ตาม due_date ที่ได้
9. ถ้า transaction ล้มเหลว ห้าม source เปลี่ยน done โดยยังไม่มี successor; retry source ได้โดยไม่ซ้ำ

### 8.4 Trash/retention

- soft delete ตั้ง deleted_at/deleted_by, ถอนจาก board position และเก็บ audit; ไม่ปรากฏงาน active/CSV/calendar/reminder
- คืนโดย Admin/owner Lead เมื่อ nowUTC < deleted_atUTC + 30×24ชั่วโมง; คืนเข้าท้ายคอลัมน์เดิม; ถ้าโปรเจกต์ archived คืนแบบ read-only; งานที่คืนเป็น non-done และ assignee ไม่ eligible ให้ null พร้อม audit
- retention job purge อัตโนมัติเมื่อ nowUTC >= deleted_atUTC + 30×24ชั่วโมง รวม comments/subtasks/attachments bytes/notifications/event ตาม parent; admin CLI ใช้กลไกเดียวกัน; บันทึก admin_events ก่อน purge และคง cleanup tracking จนลบ bytes สำเร็จ
- ถ้ามี recurrence live links ให้ตั้ง predecessor/successor FK เป็น NULL ก่อน purge parent; recurrence_events เก็บ source/generated integer ID snapshots ไม่มี FK คงอยู่จน policy maintenance เปลี่ยนอย่างมี version ห้ามลบ tombstone เพื่อเลี่ยง constraint; source IDs ไม่ reuse
- cleanup files ไม่สำเร็จให้คิว retry และ log; ไม่ถือว่าข้อมูลถูกลบครบก่อน cleanup สำเร็จ

## 9. Collaboration / Views — SP-04

**เกี่ยวข้อง:** FR-21–31, FR-35–36

### 9.1 Kanban

- 4 คอลัมน์: รอทำ (todo), กำลังทำ (doing), รอตรวจ (review), เสร็จแล้ว (done)
- เปิดได้ต่อโปรเจกต์หนึ่งโปรเจกต์; All projects ใช้รายการ/รายงาน ไม่สร้างลำดับข้ามโปรเจกต์
- การ์ดแสดง title, ID, assignee หรือ “ยังไม่มอบหมาย”, priority label, due date, overdue label, checklist count
- ลากข้ามคอลัมน์แก้ status+position; ลากในคอลัมน์แก้ position; ดูหน้าจอใหม่แล้วลำดับเดิม
- ถ้ามี text search หรือ filter assignee/priority/category/date/status ให้ปิดการลากและปุ่ม reorder เพราะรายการไม่ครบ; ใช้ task detail เปลี่ยน status ได้
- ตัวกรองถูกล้างก่อนเปิด reorder; UI แจ้งเหตุผล ไม่ย้ายงานที่ถูกซ่อนแบบไม่มีเจตนา
- keyboard/touch มีปุ่มเลือกสถานะและเลื่อนก่อน/หลังหนึ่งตำแหน่งที่ใช้ API transaction เดียวกับลาก
- touch drag มี handle/long-press และไม่แย่งการเลื่อนหน้า; ต้องทดสอบจริงบน touch device/emulation
- client แสดง pending; success commit; network/permission/validation fail คืนตำแหน่งก่อนลากแล้วแสดง error; conflict โหลด column ล่าสุด
- ไม่เปลี่ยน UI เป็น saved จน server ยืนยัน; ถ้า timeout ไม่รู้ผล GET authoritative state ก่อน retry

#### Ordering/concurrency contract

`POST /api/projects/{id}/board/move` รับ task_id, task_version, from_status, to_status, source_column_version, target_column_version, before_task_id หรือ null และ Idempotency-Key

Server ใน transaction: ตรวจสิทธิ์/project/status/task version/column versions/anchor validity → ลบจาก source list → แทรกก่อน anchor ใน target หรือ append → renumber rank 1..N ของคอลัมน์ที่กระทบ → update task status/version และ completed_at/recurrence → increment column versions → audit/notifications → commit

source=target ใช้ column version เดียว; anchor ต้องเป็น task ใน target/project เดียวกันและไม่ใช่ task ตัวเอง; stale version ตอบ 409 ไม่มี partial update. Response คืน task และ ordering/versions ของ affected columns

การเปลี่ยน status จากฟอร์มรายละเอียดใช้ task version เป็นเงื่อนไขหลัก และ append เข้าท้ายคอลัมน์ปลายทางตามลำดับล่าสุดใน transaction; ต้องเพิ่ม column versions เพื่อให้คำสั่งลากที่ค้างอยู่เกิด conflict แทนทับลำดับใหม่ การสร้าง/ลบ/restore งานเพิ่ม version ของคอลัมน์ที่ได้รับผลเช่นเดียวกัน

### 9.2 รายการ/งานของฉัน/ค้นหา

- รายการคอลัมน์หลัก: งาน, โปรเจกต์, ผู้รับ, สถานะ, ความสำคัญ, วันส่ง
- งานของฉันคือ current assignee_id=user.id ไม่รวมงานของคนอื่นที่ผู้ใช้สร้าง เว้นเลือก view “งานที่ฉันสร้าง”
- วันนี้ due_date=today และ status!=done; overdue ตาม BR-09; no due แยกกลุ่ม; future แยก “ถัดไป”
- search title/description/category case-insensitive; query≤100; filter รวมแบบ AND; multiple statuses/priorities รวมแบบ OR ภายใน field
- due_from/to inclusive; ไม่มีวันส่งไม่ผ่าน due filter; sort due null last แล้ว ID เป็น tie-breaker
- paginated API default 50 max 100; Kanban โหลดคอลัมน์แบบ pagination แล้ว disable reorder จนโหลดครบ หรือใช้ move anchor ที่อ้าง authoritative list; v1 ใช้ server ordered list และโหลดครบเฉพาะเมื่อ ≤500 งาน/โปรเจกต์ สำหรับเกินนั้นใช้ paginated list และ menu change-status

### 9.3 Calendar

- month grid ตามวันส่ง date-only; เลือก month/project/team/assignee/status ตามสิทธิ์
- งานไม่มีวันส่งอยู่รายการแยก ไม่สร้างวันที่สมมติ; งานหลายวันยังวางเป็น due-date item ไม่แสดง duration bar
- คลิกงานเปิด detail; วันที่วันนี้เน้นโดยไม่ใช้สีอย่างเดียว; ไม่ลากใน calendar v1

### 9.3.1 Gantt

- ใช้ task list API และ start_date/due_date เดิม; โหลด pagination ครบ ห้ามถือ first page ว่าเป็นข้อมูลทั้งหมด. Filter ใช้ semantic ของ list; due filter ยังคงหมายถึงวันส่ง. Viewport แสดงช่วงที่ทับพื้นที่เวลา (start <= end และ due >= begin) จากรายการที่ผ่าน filter แล้ว.
- start+due แสดง bar รวมวันเริ่ม/วันส่ง; start=due เป็นหนึ่งวัน. due-only แสดง marker พร้อมป้ายไม่มีวันเริ่ม; start-only/null-null อยู่รายการช่วงเวลาไม่ครบ. ไม่เติม today ให้วันที่ว่าง.
- เส้นวันนี้อิง Asia/Bangkok date-only; เลื่อนช่วง/วันนี้/วัน–สัปดาห์–เดือน; ข้ามเดือน/ปี/leap day ไม่เกิด UTC shift. ไม่วาด dependency arrows หรือ progress percentage ที่ไม่มีฐานข้อมูล.
- คลิกหรือ Enter เปิด task detail เดิม; Viewer/archived อ่านอย่างเดียว. แก้วันผ่านฟอร์ม T-032 และ transaction T-026/version เดิม; ไม่ลาก/resize bar รุ่นแรก. Refresh ใช้ T-047 รักษา draft; stale version ไม่ทับข้อมูล.
- Virtualize หรือแสดงช่วงย่อยพร้อมจำนวนทั้งหมดสำหรับชุดใหญ่; keyboard/focus/labels/mobile horizontal scroll มีทางเลือกอ่านรายการครบ. ตรวจข้อจำกัด query/API เดิมก่อน sign-off; หากต้องเปลี่ยน contract ใช้ workflow T-003.

### 9.4 Comments/activity

- comment append-only 1–5000 plain-text; Idempotency-Key กันการกดซ้ำ; ไม่รองรับ mention/แชตแยก
- events มี actor/time และ before/after ของ fields ที่เปลี่ยน; status event ใช้ชื่ออ่านได้ใน UI
- password/token/setup secret ไม่เข้าสู่ task_events/admin_events; audit admin actions เก็บเฉพาะว่ามี reset ไม่เก็บค่า
- pagination comments/activity 50 max100; UI แสดงข้อมูลหลัง refresh แต่ไม่ลบร่าง comment ที่กำลังพิมพ์

### 9.5 Attachments

- allowlist เริ่มต้น: jpg/jpeg/png/webp/pdf/txt/csv/docx/xlsx/pptx/zip; ไม่อนุญาต html/svg/js/exe/bat/cmd/ps1
- 1 byte–10 MiB ต่อไฟล์ (ตรงกับ locked Attachment/Upload fingerprint schema และ DB bytes constraint); quota 5 GiB รวม stored bytes ที่ยังไม่ purge; concurrency ตรวจ quota และ reserved bytes ก่อนรับไฟล์; release reservation เมื่อ fail
- รับ multipart form file เดียวต่อ request; stream สู่ temp file; ไม่ buffer ทั้งไฟล์ในหน่วยความจำ
- normalize filename, strip path/control characters, ชื่อแสดง≤200; storage_key random ไม่ใช้ user filename เป็น path
- validate extension + expected magic/type สำหรับ image/PDF/ZIP-based Office; TXT/CSV จำกัด valid UTF-8; ZIP/Office ไม่แตกไฟล์บน server
- allowlist ไม่ใช่ antivirus; ชุดนี้ไม่อ้างว่าสแกน malware แล้ว หากองค์กรต้องการ scanner เพิ่ม ให้เป็น integration แยกที่ไม่บังคับเสียค่า SaaS
- ดาวน์โหลด Content-Disposition attachment, nosniff, ไม่ inline executable content; ตรวจ access ทุก request
- DB insert และ file move ต้องมี recovery log/cleanup สำหรับ partial failure; orphan temp cleanup หลัง restart
- uploader หรือ Admin/owner Lead soft delete ไฟล์ได้; ตั้ง deleted_at; ไฟล์หายจาก active list/download endpoint ทันที แต่ bytes ยังอยู่30 วันและนับ quota จน purge; parent task ที่ deleted คงไฟล์จน parentpurge
- uploader/Admin/owner Lead คืนไฟล์ที่ลบได้ผ่านรายการถังขยะไฟล์ของ task ก่อน cutoff deleted_atUTC + 30×24ชั่วโมง เมื่อมี effective write access และ project/taskactive; Viewer ไม่มีสิทธิ์คืน; restore ล้าง deleted_at ไม่เปลี่ยน bytes/hash
- เมื่อ nowUTC >= attachment.deleted_atUTC + 30×24ชั่วโมงให้ cleanupbytes/metadata ตาม job; filesystemfail เก็บ cleanupqueue และ retry ไม่นับว่าพื้นที่คืนจน bytes ลบจริง; no public static URL

### 9.6 Notifications/update/PWA

- เกิดเมื่อมอบหมายให้คนอื่น, comment ใหม่สำหรับ creator/assignee, status change สำหรับ creator/assignee; ไม่แจ้งผู้กระทำเอง
- assignment เปลี่ยนแจ้งผู้รับใหม่; unassign จากถอนสิทธิ์แจ้ง Admin/Lead เจ้าของ ไม่ส่งงานให้คนที่หมดสิทธิ์
- due reminder: วันก่อนส่ง/วันส่ง/เกินกำหนด; scheduler ทุก60 วินาที; dedupe `(task,recipient,type,Bangkok date)` ป้องกันซ้ำวันเดียว
- ไม่สร้าง reminder สำหรับ done/deleted/archived/unassigned/inactive/no-access
- unread badge/read one/read all; read-all เฉพาะของตน; retention 90 วัน; page size50
- polling ทุก≤10 วินาทีเฉพาะ visible online tab; ทำ request ทันทีเมื่อ focus; ไม่สัญญา realtime push หรือแจ้งเมื่อปิดเว็บ
- poll แสดง badge ว่ามีข้อมูลเปลี่ยน ถ้า modal/form dirty ไม่แทนค่าร่าง; task save ใช้ version detect conflict
- PWA manifest/icon/service worker cache **static assets เท่านั้น**; ไม่ cache API/login/user/task/file responses; offline แสดง “ต้องเชื่อมต่อเพื่อใช้งาน”; ไม่มี offline write queue

### 9.7 Project Docs (FR-48)

Rich text เก็บเป็น HTML ที่ sanitize ฝั่ง server ด้วย allowlist (h1–h3, p, strong, em, ul/ol/li, checklist, a[href http/https/mailto ไม่รับ javascript:], code/pre, table, img เฉพาะ URL ไฟล์ของโปรเจกต์เดียวกัน); ตัด script/style/iframe/on*/svg/data URI; ความยาวนับจากข้อความหลัง sanitize. PATCH ต้องส่ง version; ไม่ตรง 409 พร้อม current version; ทุกการบันทึกสร้าง project_doc_versions. Soft delete/restore 30 วันและ purge ตาม §8.4; โปรเจกต์ archived อ่านอย่างเดียว

### 9.8 Project Files (FR-49)

รวมไฟล์ระดับโปรเจกต์และไฟล์แนบของงานที่ผู้ใช้เข้าถึงในโปรเจกต์ (งานที่ถูกลบไม่แสดงยกเว้นผู้มีสิทธิ์ trash); upload ระดับโปรเจกต์ใช้ validation/quota/reservation/ตรวจชนิด และ download headers เดิม; preview เฉพาะรูป/PDF ที่ผ่าน allowlist ด้วย `Content-Disposition` ที่ปลอดภัย

### 9.9 Workload / Overview / My overview (FR-44, FR-50, FR-51)

สัปดาห์เริ่มวันจันทร์ตามวันที่ Bangkok; งานนับในทุกสัปดาห์ที่ช่วง start–due ทับ (มีวันเดียวใช้วันนั้น; ไม่มีวันอยู่ “No date”); นับเฉพาะงานยังไม่ done/deleted; เกินเกณฑ์เมื่อ > threshold. ตัวเลขทุก widget คำนวณจาก query/scope เดียวกับ §10 และ My work

### 9.10 Main table / Task side panel (FR-45, FR-52, FR-53)

Batch update ส่งรายการ task id+version, ทำต่อรายการภายใน transaction ต่องานและคืนผลรายข้อ (สำเร็จ/409/403) ไม่ทำบางส่วนเงียบ; ลากแถวย้ายกลุ่มใช้ version ของงานและกลุ่ม; inline edit ใช้ PATCH เดิม; @mention แนะนำเฉพาะผู้เข้าถึงโปรเจกต์ขณะนั้นและแจ้งเตือนผ่าน notifications เดิมโดยไม่ขยายสิทธิ์; deep link `/projects/{id}/tasks/{taskId}` ตรวจสิทธิ์ก่อนแสดง

### 9.11 Favorites / preferences (FR-47, UX-03, NFR-09)

Favorites/preferences เป็นของผู้ใช้เท่านั้น; อ่าน favorites กรองด้วย access ปัจจุบันเสมอ และลบเมื่อถอนสิทธิ์; preferences validate key allowlist และขนาด

## 10. Reports / Export — SP-05

**เกี่ยวข้อง:** FR-32–34, BR-09, BR-16–17

| Metric | นิยาม |
|---|---|
| Total active tasks | จำนวนงาน not deleted ในโปรเจกต์ not archived ตาม filter/access |
| By status | จำนวนจาก current status; total ต้องเท่ากับผลรวม 4 สถานะ |
| Overdue | due_date < Bangkok today และ status!=done |
| Unassigned | assignee_id=null และ status!=done |
| Done in period | current status=done และ completed_at อยู่ในช่วง local dates ที่แปลงเป็น UTC `[start,endExclusive)` |
| Completion percentage | current done / total active filtered tasks ×100; total=0 แสดง 0% พร้อม “ไม่มีงาน” |
| Workload by assignee | current non-done counts; assignee inactive/history แสดงแยก; unassigned มีแถวเอง |

- Team filter ใช้ owner_team_id ไม่ใช้ทีมของ assignee; cross-team project จัดอยู่ทีมเจ้าของ; person filter ใช้ assignee_id
- เลือก date basis: created date, due date, completed date; UI/report/export metadata แสดงฐานที่เลือก; default created date ช่วงเดือนปัจจุบัน; completed date filter ไม่รวม non-done
- รายงานไม่คำนวณเวลาใช้ทำงาน ผลผลิต หรือประสิทธิภาพเชิงคุณภาพจากจำนวนงานโดยอ้างว่าเป็นข้อเท็จจริง
- CSV ใช้ filter/access เดียวกับ report/list, รวม ID/title/project/owner team/status/priority/assignee/start/due/category/created/completed; ไม่ export comments/file bytes/password
- UTF-8 BOM, RFC4180 escaping; ป้องกัน cell ขึ้นต้น whitespace+`= + - @` หรือ tab/CR โดย prefix apostrophe; test ด้วย Excel text behavior
- ไม่ใช้ pagination limit ของ UI ตัด CSV; stream export; cap 50,000 แถวและแจ้งชัดเมื่อเกิน ห้ามตัดเงียบ

## 11. Screen Inventory — SP-06

Owner layout request 2026-10-09 (FR-43/T-082/AT-33): Admin Permission matrix ใช้ permission P-01–P-10 เป็นแถวพร้อมชื่อ/คำอธิบาย สมาชิกเป็นคอลัมน์ด้านบน. พื้นที่ตาราง scroll สองแกน; คอลัมน์ซ้าย sticky left และหัวชื่อสมาชิก sticky top พร้อมพื้นหลังทึบ/ลำดับชั้นที่จุดตัด. Responsive 360px ต้องเลื่อนสมาชิกในตารางได้โดยหน้าไม่ overflow. Checkbox/selection/preset/dirty/conflict ต้องผูก user ID + permission key เดิม; header select-all นับเฉพาะสมาชิกที่แก้ได้ (ไม่รวมตน). ไม่เปลี่ยน API/schema/permission grants. Existing summary/atomic-save/stale/self-block rules คงเดิม.

### แนวทางดีไซน์ FridayManagement

อ้างอิง [Monday board views](https://support.monday.com/hc/en-us/articles/360001267945-The-board-views) และ [Gantt view](https://support.monday.com/hc/en-us/articles/360015643840-The-Gantt-Chart-View-and-Widget) สำหรับ view tabs และ shared board data. `TeamFlow_Mock_UI.html` เป็น design reference: sidebar workspace/project, header+description, search/filter toolbar, 4 view tabs, Table จัดกลุ่มตามสถานะเดิม (ไม่เพิ่ม phase/custom fields), owner avatars, status cells พร้อมข้อความ, timeline pills, Kanban cards, Calendar grid, Gantt bars และ detail dialog. ใช้ชื่อ FridayManagement. Implementation ต้องมี loading/empty/error/pending/conflict/archived/view-only; ตรวจ 360px/200% zoom/keyboard/focus. Mock ไม่เป็น feature acceptance.


| Screen | Controls / states |
|---|---|
| Setup | setup token, ชื่อองค์กร, Admin username/name/password; validation, configured/invalid token |
| Login | username/password, show password, error/rate limited/session expired |
| Forced password change | รหัสชั่วคราว + รหัสใหม่; บล็อกหน้าอื่นจนผ่าน |
| My tasks | วันนี้/เกินกำหนด/ถัดไป/ไม่มีวันส่ง, filters, empty/loading/error |
| Project board | project selector, 4 columns, cards, drag handle, create task, filter/reorder-disabled |
| Task detail | fields, checklist, comments, files, history; dirty/save/pending/conflict/archived/view-only |
| Task list | filters/search/sort/pagination, accessible change status |
| Calendar | month navigation, date cells, due tasks, no-due list |
| Gantt | date range, day/week/month scale, inclusive bars/due markers, incomplete-date list, accessible detail |
| Reports | scope/date basis/date range, metrics/grouped table, CSV |
| Notifications | unread/count/read-one/read-all; removed-access item hidden |
| Teams | team membership, lead assignment, archive team; controls ตามสิทธิ์ |
| Projects | create/edit/archive/unarchive, Editor/Viewer membership รวมข้ามทีม |
| Admin users | create/edit/deactivate/reactivate/reset; last-admin guard |
| Trash | Admin/Lead restore; deletion date/retention; no permanent-delete UI |
| Profile/settings | change password; Admin organization name; ไม่มี SMTP/AI config |

ทุกหน้า: มี loading, empty, offline/error, unauthorized/session expired; destructive action มี confirmation ระบุ resource; errors ไม่ใช้เพียง toast ที่หายก่อนอ่าน; modal focus trap/Escape/return focus; ปุ่มมี label ไม่ใช้ icon เพียงอย่างเดียว

### Addendum screens (1.11)

Home/My overview, My work grouped table, Favorites ใน sidebar, Project Docs, Project Files, Workload (โปรเจกต์/ทีม), Project Overview, Main table แบบ monday, Task side panel, Admin center (Members/Teams/Job titles/Permission matrix), แท็บ Permissions ของผู้ใช้, Settings (สิทธิ์ของฉันแบบอ่านอย่างเดียว, Reduce animations, Confetti) — mock ตาม T-079 ต้องได้รับการรีวิวจากเจ้าของก่อน implement

## 12. API Contract — SP-07

### 12.1 Common rules

- Same-origin HTTPS JSON API prefix `/api`; UTF-8; request JSON max1MiB ไม่รวม attachment upload
- `Content-Type: application/json` สำหรับ JSON writes; reject mismatched type; upload multipart
- auth ด้วย cookie; protected writes ต้อง `X-CSRF-Token` + exact trusted Origin; setup/login ต้อง Origin ถูกต้อง; ไม่เปิด permissive CORS
- Required Idempotency-Key UUIDสำหรับcreate team/project/task/subtask/comment/upload, PATCH task, taskrestore, boardmove; setup/auth/credential commandsและserialized/no-op commandsใช้exceptionsตามAPI Contract§5; TTL24h; bodyต่าง409; replayตรวจcurrentaccessก่อนคืนผล
- PATCH resource ใช้ version; version ไม่ตรงตอบ409 พร้อม currentVersion ไม่คืนข้อมูลถ้าเสียสิทธิ์แล้ว
- HTTP400syntax/query/path,401unauthenticated/credentials,403operation/securitydenied,404absent/no-project-access,409conflict,413oversize,415content-type,422businessvalidation,429ratelimited,503busy/notready/maintenance,500safeinternalerror; catalogตามAPI Contract§6
- Error format: `{ "error": { "code": "VERSION_CONFLICT", "message": "ข้อมูลถูกแก้ไขแล้ว", "fieldErrors": {}, "requestId": "server UUID", "currentVersion": 2 } }`
- List response: `{ "items": [], "page": 1, "pageSize": 50, "total": 0 }`; ใช้page/pageSizeทุกlistรวมcomments/events ไม่ใช้cursorในcontract1.0.0; unknownbody/queryfieldsreject ไม่stripเงียบ
- GET ห้าม mutate business state; reminder/cleanup เป็น scheduler ไม่ทำใน state read

### 12.2 Endpoints

| Method / Route | Payload/filter | Permission / response |
|---|---|---|
| GET /api/meta | — | Public: setupRequired/version |
| POST /api/setup | token, organization_name, username, display_name, password | เฉพาะ initial setup; 201 |
| POST /api/login | username,password | Public+origin+rate limit; user/csrf + cookie |
| GET /api/me | — | Auth: Self user/effective summary/csrf/must_change_password/maintenance/scopedview_revision |
| POST /api/session/activity | — | Auth+CSRF; update intentional activity |
| POST /api/logout | — | Auth+CSRF; 204 |
| POST /api/password | current_password,new_password | Own; rotate/revoke sessions |
| GET /api/users | page,q,active | Admin directory |
| POST /api/users | username,display_name,temp_password,org_role | Admin; 201 |
| PATCH /api/users/{id} | display_name,active,org_role,version | Admin; last-admin guard |
| POST /api/users/{id}/reset-password | admin_password,temp_password,version | Admin; must change+revoke |
| GET /api/directory | q,page | Admin/Lead only active display names+team names |
| GET /api/teams | page,pageSize,includeArchived | Own Team summaries; Admin allพร้อมnestedmembers |
| POST /api/teams | name,description | Admin; 201 |
| PATCH /api/teams/{id} | name,description,archived,version | Admin |
| PUT /api/teams/{id}/members/{userId} | team_role,version(parentteam) | Admin |
| DELETE /api/teams/{id}/members/{userId} | JSON version(parentteam) | Admin; access cleanup |
| GET /api/projects | team,includeArchived,page | Access-filtered |
| POST /api/projects | owner_team_id,name,description | Admin/Lead |
| PATCH /api/projects/{id} | name,description,archived,version | Admin/owner Lead |
| GET /api/projects/{id}/members | — | Scoped Person/effective_access/assignee_eligibleรวมimplicitAdmin/Lead; membership_version=project.version |
| PUT /api/projects/{id}/members/{userId} | access editor/viewer,version(parentproject) | Admin/owner Lead |
| DELETE /api/projects/{id}/members/{userId} | JSON version(parentproject) | Admin/owner Lead; access cleanup |
| GET /api/tasks | q,team,project,assignee(nullได้),creator,status/priority repeatedkeys,category,has_due,due_from,due_to,date_basis,date_from,date_to,sort,page,pageSize | Project-access filtered |
| POST /api/tasks | §8.1 fields except version/status | Project write+idempotency;201 |
| GET /api/tasks/{id} | — | Project read; TaskDetailพร้อมnestedsubtasksและcounts |
| PATCH /api/tasks/{id} | allowed fields+version | Write+idempotency; merged-statevalidation/completion/recurrence transaction |
| DELETE /api/tasks/{id} | version | Creator or Admin/Lead; soft delete |
| GET /api/trash | project,page | Admin/Lead scopes only |
| POST /api/tasks/{id}/restore | version | Admin/Lead; within retention |
| GET /api/me/overview | — | Self scope; same task scope as reports/My work |
| POST /api/tasks/batch | operation, patch, items[id,version] | Per-item savepoint + authorization; outcome per item |
| GET /api/projects/{id}/docs | includeDeleted | Project read; summaries |
| POST /api/projects/{id}/docs | title, body_html | Active project write; sanitized; idempotent |
| GET /api/docs/{id} | — | Project read |
| PATCH /api/docs/{id} | version, title/body_html | Write; sanitized; 409 stale; version history |
| DELETE /api/docs/{id} | version | Own doc or Admin/Lead/P-05; soft delete |
| POST /api/docs/{id}/restore | version | Own doc or Admin/Lead/P-05; within 30 days |
| GET /api/docs/{id}/versions | — | Project read; edit history |
| GET /api/projects/{id}/files | q,type,source,includeDeleted,page | Project read; project files + readable task attachments |
| POST /api/projects/{id}/files | multipart file | Active project write; same quota/validation |
| GET /api/project-files/{id}/download | — | Project read; attachment disposition + nosniff |
| DELETE /api/project-files/{id} | — | Uploader or Admin/Lead/P-06 |
| POST /api/project-files/{id}/restore | — | Uploader or Admin/Lead/P-06; within 30 days |
| GET /api/projects/{id}/workload | from,weeks | Project read; open tasks per assignee per Monday-start Bangkok week |
| GET /api/teams/{id}/workload | from,weeks | Admin, team Lead or member with P-09; only tasks in projects the viewer can access (BR-16) |
| GET /api/projects/{id}/overview | — | Project read (P-07 for managers); progress/status/overdue/assignee/job title/recent activity |
| GET /api/me/preferences | — | Self; defaults when unset |
| PATCH /api/me/preferences | reduce_motion,confetti,column_widths,hidden_tabs | Self; allowlisted keys, merged |
| GET /api/me/favorites | — | Self; current-access filtered |
| PUT /api/me/favorites/{id} | — | Self + project read (404 otherwise); idempotent; max 100 |
| DELETE /api/me/favorites/{id} | — | Self; own row only |
| GET /api/users/{id}/permissions | — | Admin or self; keys + permissions_version + manager projects |
| PUT /api/users/{id}/permissions | keys, permissions_version | Admin not self (403); stale 409; BR-22 demote manager→editor atomically + audit |
| GET /api/permissions/catalog | — | Authenticated; P-01–P-10 labels/scope/preset |
| PUT /api/permissions/matrix | changes[≤100] | Admin; all-or-nothing; per-user version; self 403; stale 409 with fieldErrors per user |
| GET /api/job-titles | includeInactive | Authenticated; label list with user_count |
| POST /api/job-titles | name, color, sort_order | Admin; unique case-insensitive; idempotent creation; audit |
| PATCH /api/job-titles/{id} | version, name/color/is_active/sort_order | Admin; optimistic version; deactivate instead of delete; audit |
| GET /api/projects/{id}/groups | — | Project-scoped named groups |
| POST /api/projects/{id}/groups | name, color | Active project write; idempotent creation |
| PATCH /api/groups/{id} | version, name/color | Active project write; optimistic version |
| GET /api/projects/{id}/board | — | Ordered columns + versions |
| POST /api/projects/{id}/board/move | §9.1 contract | Write+idempotency; atomic move |
| POST /api/tasks/{id}/subtasks | title,task_version; optional assignee_id,remark | Write; reject if parent done |
| PATCH /api/subtasks/{id} | title/done/assignee_id/remark,version,task_version | Write; parent status guard |
| DELETE /api/subtasks/{id} | JSON version,task_version | Write; parent guard |
| GET /api/tasks/{id}/comments | page | Read; scoped |
| POST /api/tasks/{id}/comments | body | Write+idempotency;201 |
| GET /api/tasks/{id}/attachments | includeDeleted=true เฉพาะ writer; defaultfalse | Read active metadata; deleted listing เฉพาะ uploader/Admin/Lead ที่ยังมีสิทธิ์คืน |
| POST /api/tasks/{id}/attachments | multipart file | Write+idempotency+quota/type checks;201 |
| GET /api/attachments/{id}/download | — | Parent project read, force attachment |
| DELETE /api/attachments/{id} | — | Uploader or Admin/Lead; soft delete30 วัน |
| POST /api/attachments/{id}/restore | — | Uploader/Admin/ownerLead ที่มี write และ task/projectactive;คืนภายใน30 วัน |
| GET /api/audit | page | Admin; read-only/redacted |
| GET /api/tasks/{id}/events | page | Read; scoped |
| GET /api/notifications | unread,page | Own+current project access |
| POST /api/notifications/{id}/read | — | Own |
| POST /api/notifications/read-all | — | Own |
| GET /api/reports/summary | task filters+date basis | Read scoped aggregates |
| GET /api/export/tasks.csv | same filters | Read scoped streaming CSV |
| GET /api/organization | — | Auth: name/timezone |
| PATCH /api/organization | name,version | Admin |
| GET /health/live | — | Public: status only |
| GET /health/ready | — | Proxy/local restriction; DB/storage readiness only |

### 12.3 Example create task

```json
{
  "project_id": 12,
  "title": "เตรียมรายงานประจำสัปดาห์",
  "description": "รวบรวมงานของโปรเจกต์และตรวจยอด",
  "category": "รายงาน",
  "priority": "high",
  "assignee_id": 7,
  "start_date": "2026-10-05",
  "due_date": "2026-10-09",
  "recurrence": "weekly"
}
```

Response201ใช้TaskMutationResultในcontracts/openapi.json: item=TaskDetail(status=todo/version1), successor=null, affected_columns=status/version; DTOไม่คืนpassword/token/storagepathหรือinternalpermissionsของโปรเจกต์อื่น

### 12.4 Example board move

```json
{
  "task_id": 101,
  "task_version": 3,
  "from_status": "todo",
  "to_status": "doing",
  "source_column_version": 5,
  "target_column_version": 8,
  "before_task_id": 203
}
```

ถ้า before_task_id=null ให้ append; หาก column เปลี่ยนไปแล้วตอบ409 และไม่มี partial move; PUT/PATCH ทั่วไปที่เปลี่ยน status ต้องใช้ ordering transaction เดียวกันเพื่อไม่ทำ tasks.status กับ board_positions ขัดกัน

### 12.5 สัญญาเครื่องที่ล็อกใน T-003

ใช้ [TeamFlow_API_Contract.md](TeamFlow_API_Contract.md) และ [contracts/openapi.json](contracts/openapi.json) เป็นรายละเอียด schema/DTO/query/date/headers/status/version/idempotency/DELETE payload; 52routesเดิมมีเจ้าของครบ ตรวจด้วยcheck:contract/test:contract; purevalidationไม่แทนDBpermissions/transactions และSQL2022 acceptanceยังNOT_RUN

### 12.6 Planned endpoints — addendum 1.11

รายการนี้เป็นแผน ไม่ใช่ contract ที่ล็อกแล้ว; งานเจ้าของต้องเพิ่มใน `TeamFlow_API_Contract.md`/`contracts/openapi.json`, §12.2 และ Task Register §21 พร้อมกัน แล้วรัน build/check/test:contract

| Planned route | Owner task | Permission |
|---|---|---|
| `GET/POST /api/job-titles`, `PATCH /api/job-titles/{id}` (locked in contract 1.3.0, §12.2) | T-080 | อ่าน: auth; เขียน: Admin |
| `GET /api/permissions/catalog` (locked in contract 1.3.0, §12.2) | T-081 | Auth |
| `GET/PUT /api/users/{id}/permissions` (locked in contract 1.3.0, §12.2) | T-081 | อ่าน: Admin หรือตนเอง; เขียน: Admin ที่ไม่ใช่ตนเอง + version |
| `PUT /api/permissions/matrix` (locked in contract 1.3.0, §12.2) | T-082 | Admin; bulk พร้อม version ต่อผู้ใช้ |
| `GET /api/me/overview` | T-083 | Self scope |
| `GET/POST /api/projects/{id}/docs`, `GET/PATCH/DELETE /api/docs/{id}`, `POST /api/docs/{id}/restore`, `GET /api/docs/{id}/versions` | T-084 | ตาม §4.4 |
| `GET/POST /api/projects/{id}/files` | T-085 | ตาม §4.4 |
| `POST /api/tasks/batch` | T-086 | Editor+ ต่องาน |
| `GET /api/projects/{id}/workload`, `GET /api/teams/{id}/workload`, `GET /api/projects/{id}/overview` (locked in contract 1.5.0, §12.2) | T-088 | ตาม §4.4/P-07/P-09 |
| `GET/PATCH /api/me/preferences` (locked in contract 1.7.0, §12.2) | T-089 | Self |
| `GET /api/me/favorites`, `PUT/DELETE /api/me/favorites/{id}` (locked in contract 1.6.0, §12.2; `{id}` = project id) | T-090 | Self + project access |

## 13. Security / Operational Specifications — SP-08

**เกี่ยวข้อง:** NFR-01–08, FR-37–40

### 13.1 Security

- ทุก query parameterized; explicit request field allowlist; escape display text; CSP ไม่อนุญาต inline script/unsafe-eval; ไม่มี arbitrary HTML
- headers: nosniff, frame-ancestors none, referrer-policy same-origin; HTTPS production ใช้ HSTS เมื่อ proxy/domain พร้อม
- cookie settings และ trusted Origin ต้องสอดคล้องกัน; ห้ามใช้ Host/X-Forwarded-Host ที่ไม่ตรวจสอบสร้าง trusted origin
- Path traversal/download IDOR tests ครอบคลุม attachments; secret/file paths ไม่อยู่ response
- limit request/upload size, rate limits และ timeouts; log error ใช้ requestId และ redaction; login/password/upload content ไม่บันทึก
- runtime/library pin versions และส่ง license inventory; patch process มี backup/migration/rollback
- Service account สิทธิ์เท่าที่จำเป็น; source อ่านได้ data เขียนได้; data ไม่อยู่ wwwroot

### 13.2 Reliability/concurrency

- Tasks + board + recurrence + audit + notifications ใน transaction เดียว; columns/version ต้องตรง
- SQL Server lock timeout5000ms/request timeout15000ms; deadlock/lock retry ตาม§5.1; เมื่อไม่สำเร็จตอบ503/Retry-After หลัง rollback ไม่มี partial commit
- scheduler instance เดียว; dedupe DB constraints กัน reminder ซ้ำเมื่อ restart
- jobs ทำ catch-up reminder ปัจจุบันเมื่อ startup; ไม่สร้าง reminder ทุกวันที่ server ปิดย้อนหลัง
- ทุก upload/backup temporary file มี lifecycle cleanup; startup recovery ไม่ลบไฟล์ referenced

### 13.3 Performance acceptance

- dataset: 30 users, 6 teams, 20 projects, 10,000 tasks, 20,000 comments, sample attachments ไม่เกิน quota
- workload: 15 active sessions mixed role; 10 minutes หลัง warmup; read/write70/30; exclude actual file-transfer duration
- เป้าหมาย read p95≤2s write p95≤3s, error rate<1% excluding deliberate validation/conflict; polling updates≤10s เมื่อ online/visible
- เริ่มประเมินบนเครื่องอย่างน้อย2 logical CPU,4GB RAM,SSD; สเปกนี้เป็นเครื่องทดสอบเสนอ ไม่ใช่หลักฐานว่าสเปก Server จริงเพียงพอ
- แยก test cold startup, pagination, CSV และ board reorder concurrency; บันทึก OS/runtime/spec/version และผลจริง ไม่รับรองก่อนทดสอบ

### 13.4 Backup/restore

1. Maintenance mode หยุดรับ writes และหยุด scheduler; รอ active requests/uploads จบ
2. ใช้ SQL Server `BACKUP DATABASE ... WITH COPY_ONLY, CHECKSUM` เป็น .bak และ copy uploads ภายใต้ app write freeze; SQL service account ต้องเขียน backup path ได้ (อาจคนละ host กับ app); รวบรวม .bak+uploads+manifest SHA-256 เป็น snapshot คู่กัน
3. บันทึก schema/app version, timestamp, file count/checksum; ไม่รวม plaintext .env/password/secrets ใน deliverable
4. เปิด writes เมื่อ snapshot เสร็จ; ถ้า fail ต้อง exit nonzero และไม่เขียนว่า backup สำเร็จ
5. สำรองรายวันผ่าน Windows Task Scheduler; retention7daily+4weekly เป็นค่าแนะนำ; เก็บอย่างน้อยอีก disk/location ที่องค์กรจัดให้
6. Restore ขณะ application หยุด: ตรวจ manifest hashes; `RESTORE VERIFYONLY WITH CHECKSUM` เป็นการตรวจประกอบ ไม่แทน actual restore; ใช้ RESTORE DATABASE ลง database ทดสอบ/เป้าหมายที่ผู้ติดตั้งระบุอย่างชัดเจน (ห้าม overwriteDB อื่นโดย default), restore uploads คู่กัน, migrate เมื่อรองรับ, revoke sessions ทั้งหมด, ทดสอบ permissions/download ก่อนเปิด
7. เป้าหมาย RPO24h/RTO4h ต้องวัดจริง; การมี script อย่างเดียวไม่ถือผ่าน AT-25

### 13.5 Packaging/deployment

- ZIP source ไม่มี node_modules, live DB/uploads, .env, sessions, logs, test credentials
- รวม README ไทย, env.example, runtime version, package/lockfile ถ้ามี, migrations, Windows start/service/backup scripts, tests, license inventory
- Local quick start ต้องตั้ง Admin ด้วย one-time setup; sample data ใช้คำสั่งแยกและห้ามรัน production อัตโนมัติ
- Windows คู่มือมี runtime install, service account, data ACL, IIS/proxy, HTTPS, origin/cookie, restart/start-on-boot, logs, backup, upgrade/rollback
- ผู้ใช้นำ deploy เอง; ไม่สั่งเผยแพร่เว็บไซต์หรือปรับ DNS/Server จริงในขั้นเอกสาร

### 13.6 Motion (NFR-09)

Animation ใช้ CSS/Web Animations API ด้วย transform/opacity; `prefers-reduced-motion: reduce` หรือ preference reduce ปิด AN ทั้งหมดยกเว้นการเปลี่ยนสีทันที; confetti throttle ≥2 วินาที; ไม่มี animation ใดหน่วง request หรือบล็อก input; ห้ามโหลด asset จาก CDN

## 14. Acceptance Tests / UAT

เตรียม fixture: Admin A; Lead L1 ทีม1/L2 ทีม2; Member M1 ทีม1/M2 ทีม2; Viewer V; โปรเจกต์ P1 ทีม1/P2 ทีม2/Pshared ทีม1 ที่ M2 เป็น Editor; Pprivate ที่สมาชิกทีม1 ไม่ได้รับ membership

| ID | ขั้นตอน/กรณี | Expected result | Trace |
|---|---|---|---|
| AT-01 | เปิดระบบใหม่/setup token ผิด/ถูก/ใช้ซ้ำ | ผิด403;ถูก201;ใช้ซ้ำ409;ไม่มี default account | FR-01 |
| AT-02 | Login ผิด, rate limit, logout, cookie reuse | ข้อความกลาง;429 ตาม limit;logout แล้ว401 | FR-02,NFR-02 |
| AT-03 | Admin สร้าง/reset user แล้วเรียก task API ก่อนเปลี่ยนรหัส | บังคับเปลี่ยน;เปลี่ยนแล้วใช้ได้;session เก่าถูก revoke | FR-03–04 |
| AT-04 | demote/deactivate Admin คนสุดท้ายรวม concurrent requests | อย่างน้อยหนึ่ง active Admin;transaction ไม่เปิดช่องว่าง | FR-03,BR-02 |
| AT-05 | M1 ดู Pprivate/P2 ผ่าน ID,search,report,CSV,fileURL | ไม่เห็นรายการ;resource404;ไม่มีข้อมูลรั่ว | FR-05,FR-10 |
| AT-06 | เพิ่ม M1 หลายทีม/Lead เฉพาะทีม1 | สิทธิ์แต่ละทีมไม่ยกระดับข้ามทีม | FR-06–08 |
| AT-07 | L1 เพิ่ม M2 ใน Pshared เป็น Editor และ V เป็น Viewer | M2 เขียนได้เฉพาะ Pshared;V อ่านได้แต่ write403 | FR-09–10 |
| AT-08 | ถอน M2 จาก Pshared ขณะเปิด detail และมีงานค้าง | request ใหม่404;UI ถัดไปปิด access;งานค้าง unassign;notifications ไม่รั่ว | FR-11 |
| AT-09 | สร้างงานข้อมูลผิด/ไม่มีผู้รับ/ผู้รับ Viewer/วันเริ่มเกินวันส่ง | validate field ชัด;ไม่มีผู้รับได้;Viewer/วันผิด422 | FR-12–14 |
| AT-10 | งาน checklist ไม่ครบ→done;ติ๊กครบ→done;untick ตอน done | ครั้งแรก422 ไม่มี partial;ครบสำเร็จ;untick ถูกบล็อกจน reopen | FR-15 |
| AT-11 | งานซ้ำ daily/weekly/monthly,Jan31→Feb→Mar | +1/+7;monthly กลับ Mar31 ตาม anchor;ไม่ copyfiles/comments | FR-16 |
| AT-12 | done งานซ้ำพร้อมกัน/retry/reopen แล้ว done ใหม่ | successor เพียงหนึ่ง;ไม่มี duplicate หรือ half transaction | FR-16,FR-18 |
| AT-13 | delete/restore/retentionpurge และ parentfiles | activehidden;คืนลำดับท้าย;purge ลบ bytes+DB สัมพันธ์ | FR-17 |
| AT-14 | สองคนแก้ task version เดียวกัน | คนหนึ่งสำเร็จ อีกคน409 ไม่ทับเงียบ | FR-18 |
| AT-15 | My tasks วันนี้/overdue/null และ Bangkok ใกล้เที่ยงคืน | วันไม่เลื่อนจาก UTC;วันนี้ไม่ overdue;null อยู่กลุ่มตน | FR-19–20 |
| AT-16 | ลากข้ามคอลัมน์/จัดลำดับ/refresh | status+rank บันทึกและคงหลัง reload;versions เพิ่ม | FR-21–22 |
| AT-17 | boardmove ขณะ offline/403/409 และ samecolumnconcurrent | rollbackUI;โหลดล่าสุด;DB ไม่ partial;ไม่มี rank ซ้ำ | FR-18,FR-21–22 |
| AT-18 | filteredboard drag + keyboard/touchalternative | filter ปิด reorder;menu/keyboard ใช้ได้;touchscroll ไม่เสีย | FR-23,NFR-05 |
| AT-19 | Table/Calendar/Gantt มีวันส่ง/ไม่มีวันส่ง/filter หลายตัว | รายการ/ปฏิทิน/Gantt สอดคล้อง;วันที่ว่างไม่ถูกเติม;ช่วงวันและขอบเขตถูกต้อง | FR-24–25 |
| AT-20 | คนอื่นแก้งานขณะ user มี dirtyform | เห็น update≤10s;ร่างไม่หาย;saveconflict ชัด | FR-26 |
| AT-21 | commentHTML/script/กดซ้ำ/ลองแก้ audit | rendertext;key ซ้ำไม่เพิ่ม;แก้ audit ไม่ได้ | FR-27,FR-29 |
| AT-22 | upload10MiB/เกิน/extension ปลอม/pathtraversal/quota race | valid ได้;เกิน413;invalid422;quota ไม่เกิน;ไม่หนี data directory | FR-28,NFR-02 |
| AT-23 | notificationassignment/comment/status/remindertwice/readone/all | recipient ถูก;ไม่แจ้ง self;dedupe;read เฉพาะตน;ไม่ใช้อีเมล | FR-30–31 |
| AT-24 | reportdatebasis/reopen/CSV ไทยและ formula | metric ตามนิยาม;reopen ไม่ done;filtermatch;CSV ไม่รัน formula | FR-32–34 |
| AT-25 | backup ระหว่างมีงาน/restore เครื่องทดสอบ/restart | snapshotDB/files ตรง;checksums ผ่าน;sessionsrevoke;ข้อมูลอยู่หลัง restart | FR-38,NFR-03–04 |
| AT-26 | เปิด PWAoffline/logout แล้วเปิด cache | static shell ได้;ไม่เห็น task/API/filecache;บอกต้อง online | FR-35–36 |
| AT-27 | performancefixture/loadtest ตาม§13.3 | ผล p95/error/update ผ่านหรือระบุสิ่งที่ไม่ผ่านพร้อมสเปกจริง | NFR-01 |
| AT-28 | freshWindowsinstall จาก ZIP/env/one-timesetup | run ได้ตามคู่มือ;ไม่มี secret;service/HTTPS ตามสิทธิ์ที่มี | FR-37,FR-39–40 |
| AT-29 | archivedproject ลองแก้ task/comment/upload/recur | อ่านได้;normal writes ถูกปฏิเสธ;Admin/owner Lead task delete/restore exception ตาม RD-01;unarchive คืนใช้งาน | FR-09,BR-14 |
| AT-30 | CSRF/noOrigin/spoofproxy/XSS/SQLi/fileIDOR | requests ไม่ปลอดภัยถูกบล็อก;ไม่มี secret/ข้ามสิทธิ์ | FR-05,NFR-02 |
| AT-31 | ตั้ง/แก้/ปิดตำแหน่ง, กรอง/รายงาน/CSV, เปลี่ยนตำแหน่ง | ป้าย/กรอง/CSV ถูก; audit มี; สิทธิ์ก่อน/หลังเปลี่ยนตำแหน่งเหมือนเดิม | FR-41,BR-19–21 |
| AT-32 | ติ๊ก P-key ทีละข้อ, preset PM/SM ให้ SA, PM ไม่ติ๊ก, เอาออก, ผู้ไม่ใช่ Admin/แก้ตนเอง | ทำได้เฉพาะข้อที่ติ๊กทั้ง UI/API; เอาออกมีผลทันที; ไม่เหลือ P-01–P-07 แล้ว manager→editor พร้อม audit; non-Admin/self 403 | FR-42,FR-42A,BR-21–23 |
| AT-33 | Admin center + Permission matrix bulk/preset/stale version | matrix ตรงกับสิทธิ์จริง; สรุปก่อนบันทึก; stale 409; ผู้ใช้ทั่วไปเห็นสิทธิ์ตนอ่านอย่างเดียว | FR-43 |
| AT-34 | My overview widgets และ My work grouped table | ตัวเลขตรงกับ My work/รายงานและสิทธิ์; คลิกไปตัวกรองตรงกัน; สลับมอบหมาย/สร้าง | FR-44,FR-45 |
| AT-35 | Docs CRUD/conflict/XSS/soft delete/restore/Viewer | conflict 409 ไม่ทับ; script/on*/javascript: ถูกตัด; Viewer อ่านอย่างเดียว; restore ภายใน 30 วัน | FR-48 |
| AT-36 | Project Files รวม/อัปโหลด/preview/สิทธิ์/quota | แสดงเฉพาะไฟล์ที่เข้าถึง; quota/ตรวจชนิดเดิม; ลบ/คืนตาม P-06 | FR-49 |
| AT-37 | Workload และ Overview | จำนวนต่อคน/สัปดาห์และเกณฑ์ถูก; % และกราฟตรงกับข้อมูล; ไม่รั่วข้ามสิทธิ์ | FR-50,FR-51 |
| AT-38 | Main table inline/batch/drag/sticky/resize และ side panel/@mention | ผล batch รายข้อถูก; 409 ไม่ทับ; @mention เฉพาะผู้เข้าถึง; Esc/deep link ใช้ได้ | FR-52,FR-53 |
| AT-39 | UX-01–06, AN-01–12, reduced motion, 360px, keyboard | ตรง mock ที่เจ้าของรีวิว; reduced motion ปิด motion; ไม่มี horizontal scroll; 60fps trace | NFR-09,NFR-05,NFR-06 |
| AT-40 | Favorites ส่วนตัวและถอนสิทธิ์ | ไม่กระทบผู้อื่น; ถอนสิทธิ์แล้วหาย; ไม่ขยายสิทธิ์ | FR-47 |

Unit/integration tests เน้นธุรกรรมและสิทธิ์; UI/UAT เน้น interaction/touch/accessibility; tests ที่ยืนยันได้ใน local ไม่ถือว่าผ่าน Windows จริงจนรันทดสอบบน Windows

นอกเหนือจาก AT-01–30 ให้มี checklist การทดสอบ browser รุ่นเป้าหมาย, session idle/absolute expiry, role revocation, startup recovery ของไฟล์ค้าง และ migration จาก schema ก่อนหน้า บันทึกผลเป็น evidence ของ NFR ที่เกี่ยวข้อง

## 15. Requirements Traceability

| Requirements | Specification | Acceptance |
|---|---|---|
| FR-01–04 | SP-01 §6 | AT-01–04 |
| FR-05 | §4,SP-07,SP-08 | AT-05,AT-08,AT-30 |
| FR-06–11 | SP-02 §7 | AT-06–08,AT-29 |
| FR-12–18 | SP-03 §8 | AT-09–14 |
| FR-19–20 | SP-04 §9.2 | AT-15 |
| FR-21–23 | SP-04 §9.1 | AT-16–18 |
| FR-24–26 | SP-04 §9.2–9.3,§9.6 | AT-19–20 |
| FR-27–29 | SP-04 §9.4–9.5 | AT-21–22 |
| FR-30–31 | SP-04 §9.6 | AT-23 |
| FR-32–34 | SP-05 §10 | AT-24 |
| FR-35–36 | SP-06,§9.6 | AT-18,AT-26 |
| FR-37–40 | SP-08 §13 | AT-25,AT-28 |
| NFR-01 | §13.3 | AT-27 |
| NFR-02 | §6,§9.5,§12,§13.1 | AT-02,AT-05,AT-22,AT-30 |
| NFR-03 | §8,§9.1,§13.2 | AT-12,AT-14,AT-17,AT-25 |
| NFR-04 | §13.4 | AT-25 |
| NFR-05–06 | §9.1,§11 | AT-18,AT-26,AT-28 |
| NFR-07–08 | §3,§13.5 | AT-25,AT-28 + license/config review |
| FR-41–43 | §4.4,§5.3,§12.6 | AT-31–33 |
| FR-44–45 | §9.9–§9.10 | AT-34 |
| FR-47 | §9.11 | AT-40 |
| FR-48–49 | §9.7–§9.8 | AT-35–36 |
| FR-50–51 | §9.9 | AT-37 |
| FR-52–53 | §9.10 | AT-38 |
| NFR-09 | §13.6,§11 | AT-39 |

## 16. Definition of Ready / Done

**Ready สำหรับเริ่มพัฒนา:** Baseline 1.1 และ R-01–R-04 ยืนยันแล้ว; ใช้ stack §3.4/SQL Server 2022; T-003/T-005 ต้องล็อก DTO/package versions/migrations/test setup ให้ครบ; Edition/credentials/service permissions ตรวจก่อน deploy ไม่ขวาง coding local ด้วย SQLite ที่ยืนยันเพิ่ม; SQL2022 acceptance ยังต้องทดสอบกับ SQL2022 จริง

**Done สำหรับ final source sign-off:** FR ใน approvedscope ทำงานจริง; AT ด้านสิทธิ์/ธุรกรรม/backup ที่เป็น critical ผ่าน; มี freshinstall และ migrationtest; UI หลักผ่าน UAT; ไม่มีข้อมูลจริง/secrets ใน ZIP; README/license/config ครบ; Windows/performance/UAT ที่เป็น required acceptance ต้องมีผลจริงก่อน final sign-off; source candidate ส่งเพื่อทดสอบได้พร้อมรายการ NOT_RUN/BLOCKED แต่ไม่ปิด final release tasks หรือเรียก production-ready

## 17. Change Log

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | ร่าง SRS แรก; permission matrix, data model, API, Kanban concurrency, recurrence, retention และ30 acceptance scenarios |
| 1.1 | 2026-10-05 | เจ้าของระบบยืนยันกติกา; R-01–R-04 resolved; SQL Server2022/mssql; filetrash/restore30วัน; coding/testsยังไม่ผ่าน |
| 1.2 | 2026-10-05 | เจ้าของระบบกำหนด Node.js22 แทน24; ขอ SQL อื่นชั่วคราวและรอเลือกชนิด/ขอบเขต; คง business baseline1.1 และผลทดสอบเดิม |
| 1.3 | 2026-10-05 | ยืนยัน SQLite สำหรับพัฒนา local ชั่วคราว; SQL2022 ยังคงปลายทาง; ผลทดสอบแยก provider และไม่เปลี่ยน NOT_RUN เป็น PASS |
| 1.4 | 2026-10-05 | เจ้าของระบบยืนยันข้อเสนอ readiness22ประเด็น; ล็อก8กติกา/แผนปิด10contracts+4planning gaps; ไม่มีผล application tests ใหม่ |
| 1.5 | 2026-10-05 | T-003 ล็อก52routes/DTO schemas/versions/idempotency/DELETE/query/error contract; scopedviewrevisionและpersistentstate design; ไม่ใช่ผลAT/DBintegration |
| 1.11 | 2026-10-08 | T-078 รวม Monday-style addendum: §4.4 manager/P-01–P-10, entities §5.3, §9.7–§9.11, screens, planned routes §12.6, motion §13.6, AT-31–AT-40; OpenAPI ยังไม่เปลี่ยน |

## 18. Readiness decisions ที่เจ้าของระบบยืนยัน

| ID | กติกาที่ใช้พัฒนา |
|---|---|
| RD-01 | Archived project: Admin/owner Lead soft delete/restore งานได้ผ่าน endpoint เฉพาะ; Editor creator ไม่ได้; ไม่เปิดสิทธิ์แก้งาน/comments/files/checklist; คืนงานแล้ว read-only จน project active |
| RD-02 | Reopen/restore งาน non-done ตรวจ assignee ใหม่; ถ้า inactive/Viewer/no-write ให้ null พร้อม audit; งาน done คงประวัติ |
| RD-03 | Demote Admin คำนวณ effective write และ cleanup งานค้างพร้อม revoke ใน transaction; คงสิทธิ์ Lead/Editor ที่ยังมี |
| RD-04 | ต้องเปิด team กลับก่อนเปิด project กลับ; archive/create/unarchive ต้องรักษา parent-state invariant แม้คำสั่งพร้อมกัน |
| RD-05 | Restore ก่อน UTC cutoff เท่านั้น; purge ตั้งแต่ cutoff ที่ deleted_at + 30×24ชั่วโมง; งาน/ไฟล์ใช้ comparator เดียวกัน |
| RD-06 | Monthly generation คง anchor; การแก้ due_date รอบปัจจุบันหรือเปลี่ยนเข้า monthly ตั้ง anchor จากวันส่งใหม่; ออกจาก monthly ล้าง anchor; successor ที่มีแล้วไม่ถูกแก้อัตโนมัติ |
| RD-07 | Retention job purge อัตโนมัติและ CLI เรียกกลไกเดียวกัน; มี audit/cleanup retry tracking; ไม่มี permanent-delete UI |
| RD-08 | Source candidate ส่งเพื่อทดสอบได้ก่อน TC-080/UAT; final source sign-off และพร้อมใช้ข้อมูลจริงต้องผ่าน required Windows/UAT/SQL2022 acceptance จริง; ไม่ปิด final tasks เพราะมี release notes ระบุ pending |

ข้อเสนอ C-01–C-10/M-01–M-04 ใน readiness review ได้รับอนุมัติให้ทำใน task ที่รับผิดชอบแล้ว ต้องสร้าง contract/schema/test manifest/หลักฐานตามจริงก่อนปิด ไม่ถือว่าตารางนี้แทน T-003/T-004 หรือ automated tests

## T-040 contract clarification — 2026-10-06

API1.1.0 adds GET /api/audit (Admin only; page50/max100; ID ascending; immutable read-only). AdminAuditPage exposes actor/time/request_id/action/resource reference and redacted_changes as serialized JSON, never credentials/storage paths. Recursively redact secret field names at write and read; retain boolean password_reset/must_change_password markers and local_cli installation_operator/machine_file_permissions authority markers. Existing TaskEvent fields include task/completed_at/comment_id/before_task_id/predecessor/successor references emitted by earlier mutations; structured before/after values encode as JSON strings within the locked scalar wire format. No history mutation endpoint; regenerate/check/test contract after changes. Business baseline unchanged.

## Owner change: multi-assignee / Checklist assignment — 7 ตุลาคม 2026

FR-13 supersedes single-assignee business behavior: Task เลือกผู้รับผิดชอบได้หลายคนหรือไม่มีรายชื่อ; FR-15 Checklist แต่ละข้อเลือกผู้รับผิดชอบได้หนึ่งคนหรือไม่มี และเลือกคนอื่นที่ active/มี write access ในโปรเจกต์ได้. บทบาท/การถอนสิทธิ์/Checklist completion guard เดิมยังใช้. ตาราง tasks.assignee_id/indexes/DTO ในเอกสารส่วนเดิมอธิบาย implementation/contract เดิมและยังไม่รองรับกติกาใหม่; ต้องออกแบบ task-assignee relation, Checklist assignee FK, atomic migration/audit/notifications, recurrence copy, shared views/CSV/workload และ withdrawal/inactive cleanup ภายใต้ SQL2022/SQLite แยกกันก่อนใช้งานจริง. Vibe mock เก็บ assignees[]/check.assignee เฉพาะข้อมูลสมมติ; scalar assignee ที่เหลือเป็น preview compatibility เท่านั้น ไม่ใช่ primary-assignee business role. สถานะตอนบันทึก preview: Contracts/openapi และ application code ยังไม่เปลี่ยน. Implementation ล่าสุดอยู่ owner-approved section ด้านบนและ TeamFlow_UI_Vibe_Implementation_Report.md; formal UAT ยัง NOT_RUN.


## Owner password policy amendment — 8 October 2026

Owner supersedes D-11 password minimum12 with6 Unicode scalars, maximum128 unchanged. All new password flows use this policy; existing credential verification remains1–128. Hashing, rate limits, CSRF and session revocation remain required. API contract1.2.1. Local test account password is not recorded in source.
