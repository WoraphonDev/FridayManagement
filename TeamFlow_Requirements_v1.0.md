# TeamFlow — Business & Functional Requirements


**เวอร์ชัน:** 1.28 · **วันที่:** 10 ตุลาคม 2026\
**สถานะ:** Baseline ยืนยันแล้ว; รอพัฒนา  
**เอกสารคู่กัน:** `TeamFlow_SRS_v1.0.md`  
**ชื่อ TeamFlow:** ชื่อทำงานชั่วคราว ยังไม่ใช่ชื่อที่เจ้าของระบบเลือก



## Subitem cells and assignment/status popovers - 10 October 2026

Owner approved actual application changes after reviewing references: Checklist presents Subitem / Owner / Status / Remark with + Add subitem inside the table. Owner is an avatar cell opening a searchable eligible-member popup with current selection and Unassigned; no dropdown arrow. Status opens colored options from the cell, also without a dropdown arrow. Checklist status remains the existing boolean (To do/Done); Task status retains Not started/Working on it/In review/Done. No child dates, new workflow, email invitation or AI features. Task assignees remain multiple; each subitem retains one independent eligible owner. Preserve existing write/version/idempotency/atomic notification/audit guards and whole-row autosave/cancel. Compact aligned edit controls fix the reported broken layout. This decision supersedes the preceding three-column presentation only. Evidence: TeamFlow_Cell_Pickers_Implementation_Report.md; local evidence does not close native SQL/Windows/UAT acceptance.

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

## Owner team details navigation - 9 October 2026

FR-06/07/08/50: clicking a team card from Teams or Admin Teams opens one details page with Team info, Members (compact table grid) and Workload tabs. Add/Edit forms open on demand; Review & Save then Save writes explicitly; Cancel does not write. PM/Lead/Dev positions remain separate from Team access. Team CRUD/membership and member list remain Admin-only under the existing API. Show the access restriction rather than inventing a zero member count. Workload retains Admin/team Lead/member P-09 scope. URL tabs, keyboard/mobile/reload supported. No API/schema/data change. Local subset evidence: TeamFlow_Team_Details_UX_Report.md.

## Owner-approved Team / Member details — 9 ตุลาคม 2026

FR-03/FR-06–08: เพิ่ม Team Name, Team Description และ Add Member พร้อมตำแหน่ง PM/Lead/Dev; เพิ่ม Member Name, Email, Role, Team และ Tel. เจ้าของยืนยันว่าตำแหน่งในทีมไม่กำหนดสิทธิ์: คง org role Admin/Member และ team permission Lead/Member เดิม. Email/Tel. เป็นข้อมูลติดต่อ optional เท่านั้น ไม่มีการส่ง email. เพิ่มสมาชิกเริ่มต้นตอนสร้างทีมใน transaction เดียว; ฟอร์ม Member เพิ่มทีมที่เลือกโดยไม่ถอนทีม/เปลี่ยนสิทธิ์หรือตำแหน่งเดิม. แก้ตำแหน่ง/ถอนสมาชิกที่ Teams → Members. Migration 0013 คงข้อมูลเดิมและเติมตำแหน่ง Lead ให้ permission Lead เดิม, Dev ให้สมาชิกอื่น. Native SQL2022/Windows/UAT acceptance ยังแยกจาก SQLite local.

## Owner-approved Monday-style addendum — 8 ตุลาคม 2026 (T-078)

เจ้าของอนุมัติ `TeamFlow_Requirements_Addendum_Monday_Draft.md` (8 ต.ค. 2026) ด้วยคำสั่งให้ทำ T-078 ต่อ: เพิ่ม Personal/Workspace/Admin แบบ monday, แยก job title ออกจากสิทธิ์, project role `manager` + permission checkbox รายคน P-01–P-10, Docs/Files/Workload/Overview/Favorites, Main table/side panel ใหม่ และ motion AN-01–AN-13. FR-46 Updates feed เลื่อนไปรอบถัดไป; exclusion เดิม (custom fields/status, dependencies, time tracking, automations, integrations, chat, real-time co-editing, email/AI) คงอยู่. เป็นการเปลี่ยนเอกสารเท่านั้น ยังไม่มี code/schema/API ของ addendum และ FR/AT ใหม่ทั้งหมด NOT_RUN. รายละเอียดอยู่ใน §3, §4, §5.7–§5.9, NFR-09, BR-19–BR-23 และ §7A ของเอกสารนี้; SRS 1.11 ระบุพฤติกรรม/สิทธิ์ และ Task T-079–T-091 เป็นงานลงมือ

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


## 1. จุดประสงค์และสถานะของข้อมูล

สร้าง Web App สำหรับจัดการงานภายในองค์กรที่มีหลายทีม ผู้ใช้ประมาณ 30 คน เพื่อมอบหมายงาน ติดตามความคืบหน้า และทำงานร่วมกันผ่านคอมพิวเตอร์และมือถือ โดยเจ้าของระบบรับ source code ไป deploy บน Windows Server และ domain ที่มีอยู่เอง

เอกสารนี้อธิบาย **สิ่งที่ระบบของเราต้องทำ** ไม่ใช่รายการฟีเจอร์ที่รับรองว่ามีใน MobMai และไม่ใช่การคัดลอกโค้ด หน้าตา หรือทรัพย์สินของแอปนั้น ส่วน SRS ระบุรายละเอียดการทำงาน ข้อมูล API และเกณฑ์ทดสอบของระบบที่เราจะพัฒนา

### 1.1 ข้อมูลที่ผู้ใช้ยืนยันแล้ว

| รหัส | ข้อกำหนดที่ยืนยัน | ผลต่อขอบเขต |
|---|---|---|
| C-01 | ใช้ภายในองค์กรที่มีหลายทีม | รองรับหลายทีมและการแบ่งสิทธิ์ |
| C-02 | ผู้ใช้ประมาณ 30 คน | ใช้เป็นขนาดตั้งต้นสำหรับการออกแบบและทดสอบ |
| C-03 | ต้องการ Kanban แบบ Drag & Drop | ย้ายสถานะและจัดลำดับการ์ดได้ |
| C-04 | ไม่ต้องส่งอีเมล | ไม่ใช้ SMTP ไม่เชิญหรือกู้รหัสผ่านด้วยอีเมล |
| C-05 | ยังไม่เอา AI | ไม่ใช้ AI เสียง สรุปงาน หรือบริการ AI ภายนอก |
| C-06 | เน้นฟรี | ไม่บังคับใช้บริการ SaaS หรือฐานข้อมูลแบบเสียค่าสมาชิก |
| C-07 | มี Windows Server และ domain แล้ว ใช้งานผ่าน Control Panel | ส่งมอบโค้ดและคู่มือติดตั้ง; ยังไม่สมมติว่า panel รองรับ runtime ใด |
| C-08 | ผู้ใช้ pack code และ deploy เอง | ไม่เผยแพร่หรือตั้งค่า Server จริงในงานเอกสารนี้ |
| C-09 | ทำ Requirements และ SRS ก่อน | ใช้ baseline ที่ยืนยันแล้วเป็นฐานพัฒนา |
| C-10 | ยอมรับกติกาที่เสนอและมี SQL Server 2022 | ปิด R-01–R-04; ใช้ SQL Server 2022; Edition ตรวจตอนติดตั้ง |

### 1.2 ค่าเริ่มต้นที่ได้รับการยืนยัน

ค่า D-01–D-11 และคำตอบ R-01–R-04 ได้รับการยืนยันแล้วตามบันทึก Baseline 1.1 ส่วน D-12 เปลี่ยนเป็น SQL Server 2022 และ stack ใน SRS §3.4 การเปลี่ยนกติกาต่อจากนี้ต้องลง change log ไม่ถือว่าฟีเจอร์นอก scope ได้รับอนุมัติด้วย

## 2. เป้าหมายและผลลัพธ์

1. หัวหน้าทีมเห็นผู้รับผิดชอบ กำหนดส่ง และสถานะงานของโปรเจกต์ที่ตนดูแล
2. สมาชิกเห็นงานของตนและงานในโปรเจกต์ที่ได้รับสิทธิ์ พร้อมอัปเดตงานจากเว็บ
3. แต่ละทีมเก็บงานแยกกัน และแชร์เฉพาะโปรเจกต์ที่ต้องทำร่วมกับทีมอื่นได้
4. การเปลี่ยนสถานะ การมอบหมาย และความคิดเห็นมีประวัติให้ติดตาม
5. ข้อมูลอยู่บนระบบที่องค์กรดูแลเอง และส่งออกหรือสำรองได้

เกณฑ์สำเร็จ: ผู้ใช้ทดสอบครบตาม acceptance tests ใน SRS; งานหลายทีมไม่รั่วข้ามสิทธิ์; Drag & Drop บันทึกจริง; ข้อมูลยังอยู่หลัง restart; สำรองและกู้คืนได้; ไม่มีบริการอีเมลหรือ AI เป็นเงื่อนไขการใช้งาน

## 3. ขอบเขต

### 3.1 รวมในเวอร์ชันแรก

บัญชีผู้ใช้ที่ผู้ดูแลสร้าง, หลายทีม, สมาชิกอยู่ได้หลายทีม, สิทธิ์ระดับองค์กร/ทีม/โปรเจกต์, โปรเจกต์ร่วมข้ามทีม, งานและการมอบหมาย, งานย่อย, งานซ้ำ, หมวดหมู่, วันเริ่ม/กำหนดส่ง, Kanban ลากวาง, รายการงาน, ปฏิทิน, Gantt, ความคิดเห็น, ไฟล์แนบ, ประวัติ, การแจ้งเตือนในเว็บ, สรุปผลงานตามสิทธิ์, CSV, หน้าเว็บรองรับมือถือ, PWA แบบติดตั้งทางลัด, การสำรองและกู้คืน, และชุดโค้ดสำหรับ deploy เอง

เพิ่มตาม addendum 1.9: ตำแหน่งงาน (job title), project role `manager` และ permission checkbox รายคน, หน้า Admin รวมศูนย์/Permission matrix, My overview, My work แบบ grouped table, Favorites, Project Docs (rich text ไม่ co-edit), Project Files, Workload, Project overview, Main table/Task side panel แบบ monday และ motion ที่ปิดได้

### 3.2 ไม่รวมในเวอร์ชันแรก

- อีเมล, AI, การสมัครเองจากบุคคลภายนอก, ลูกค้าภายนอกองค์กร และหลายองค์กรในระบบเดียว
- LINE/Telegram, SMS, Web Push เมื่อปิดเว็บ, SSO/AD/OAuth และการซิงก์ Google/Outlook Calendar
- แอป native iOS/Android, การแก้ไขข้อมูลแบบ offline, dependencies ระหว่างงาน และ time tracking
- แชตแยกจากงาน, การคิดเงิน/เงินเดือน, workflow อนุมัติหลายชั้น, custom fields หรือ custom status
- การเก็บไฟล์บน cloud แบบบังคับ, การติดตั้งบน Server จริง และการรับรองว่า Control Panel ปัจจุบันรองรับระบบโดยไม่ตรวจสอบ
- (addendum 1.9) Updates feed FR-46 เลื่อนไปรอบถัดไป; real-time co-editing ของ Docs, automations, integrations, dependencies/critical path/auto-scheduling ใน Gantt และ custom columns ยังไม่รวม ต้องเปิด scope change แยก

## 4. ผู้ใช้และสิทธิ์ทางธุรกิจ

| บทบาท | หน้าที่และขอบเขต |
|---|---|
| ผู้ดูแลองค์กร (Organization Admin) | จัดการบัญชี ทีม หัวหน้าทีม ทุกโปรเจกต์ การคืนข้อมูล และค่าระบบ |
| หัวหน้าทีม (Team Lead) | จัดการโปรเจกต์ที่ทีมตนเป็นเจ้าของ สมาชิกโปรเจกต์ และติดตามงานในขอบเขตนั้น |
| สมาชิก (Member) | ใช้งานโปรเจกต์ที่ได้รับสิทธิ์เท่านั้น สมาชิกทีมไม่ได้เห็นทุกโปรเจกต์ของทีมโดยอัตโนมัติ |
| ผู้แก้ไขโปรเจกต์ (Editor) | สิทธิ์เพิ่มเติมของสมาชิกในแต่ละโปรเจกต์: สร้าง/แก้ไขงาน แสดงความคิดเห็นและแนบไฟล์ |
| ผู้ดูโปรเจกต์ (Viewer) | ดูงานและดาวน์โหลดไฟล์ในโปรเจกต์ ไม่แก้ไขงานหรือเพิ่มความคิดเห็น |
| ผู้จัดการโปรเจกต์ (Project Manager, role `manager`) | สิทธิ์รายโปรเจกต์ที่ Admin/Lead ทีมเจ้าของแต่งตั้ง ทำได้เท่า Editor และเพิ่มเฉพาะ permission P-01–P-07 ที่ Admin ติ๊กให้รายคน (FR-42/FR-42A) |

Admin มีสิทธิ์ระดับองค์กร; Team Lead ผูกกับทีมและอาจเป็นสมาชิกปกติในอีกทีมหนึ่ง; Editor/Viewer ผูกกับโปรเจกต์ ข้อมูลอื่นที่ไม่อยู่ในสิทธิ์ต้องไม่ปรากฏทั้งในหน้าจอ API การค้นหา รายงาน การแจ้งเตือน และ export

โปรเจกต์มีทีมเจ้าของหนึ่งทีมเพื่อระบุผู้ดูแล สามารถเพิ่มผู้ใช้ที่ active จากทีมอื่นเป็น Editor/Viewer ได้ โดยไม่ให้สิทธิ์เห็นโปรเจกต์อื่นของทีมเจ้าของ

## 5. Functional Requirements

ทุกรายการต่อไปนี้เป็น Must ใน **Baseline 1.1**; ค่าเฉพาะและการตรวจสอบอยู่ใน SRS คำว่า “ผู้มีสิทธิ์” ให้ใช้ permission matrix ใน SRS ไม่ใช้การตีความจากหน้าจอ

### 5.1 บัญชีและการรักษาการเข้าถึง

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-01 | ตั้งผู้ดูแลคนแรก | ไม่มีบัญชีเริ่มต้นรหัสผ่านตายตัว ตั้งค่าครั้งแรกได้เฉพาะผู้มี setup token |
| FR-02 | เข้าสู่ระบบและออกจากระบบ | ใช้ username/password; session ถูกยกเลิกเมื่อ logout |
| FR-03 | จัดการผู้ใช้ | Admin สร้าง แก้ไขชื่อ/บทบาท และปิดใช้งานบัญชี; ห้ามปิด Admin คนสุดท้าย |
| FR-04 | เปลี่ยนและรีเซ็ตรหัสผ่าน | สมาชิกเปลี่ยนของตนด้วยรหัสปัจจุบัน; Admin reset ให้; บังคับเปลี่ยนรหัสชั่วคราว |
| FR-05 | บังคับสิทธิ์ทุกช่องทาง | ผู้ไม่มีสิทธิ์เข้าถึงงาน/ไฟล์ไม่ได้ แม้ใช้ URL หรือ API โดยตรง |

### 5.2 ทีมและโปรเจกต์

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-06 | สร้างและจัดการหลายทีม | Admin สร้าง แก้ไข และเก็บทีม; ชื่อทีมไม่ซ้ำในองค์กร |
| FR-07 | สมาชิกอยู่หลายทีม | ผู้ใช้หนึ่งคนเป็นสมาชิกหลายทีมได้ และมีบทบาทต่างกันแต่ละทีม |
| FR-08 | ตั้งหัวหน้าทีม | Admin แต่งตั้ง/ถอดหัวหน้าทีมได้; ไม่ให้ผู้ใช้ยกระดับสิทธิ์ตนเอง |
| FR-09 | จัดการโปรเจกต์ | Admin/Lead ของทีมเจ้าของสร้าง แก้ไขชื่อ/รายละเอียด/ประเภท/หมวดหมู่ เก็บและเปิดคืนโปรเจกต์; Project Type เริ่มต้น Internal และ Project Category เริ่มต้น Development ตามคำขอเจ้าของ 2026-10-09 |
| FR-10 | กำหนดสมาชิกโปรเจกต์ | เพิ่ม Editor/Viewer ได้ รวมคนจากทีมอื่น; การอยู่ในทีมเพียงอย่างเดียวไม่ให้สิทธิ์ดูโปรเจกต์ |
| FR-11 | ถอนสิทธิ์และปิดบัญชี | การถอนสิทธิ์มีผลกับ API/ไฟล์/แจ้งเตือน; จัดการงานค้างที่มอบหมายอย่างชัดเจน |

### 5.3 งานและกำหนดการ

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-12 | สร้างและแก้ไขงาน | เก็บชื่อ รายละเอียด โปรเจกต์ หมวดหมู่ ผู้รับผิดชอบ ความสำคัญ วันเริ่ม วันครบกำหนด |
| FR-13 | มอบหมายงาน | งานมีผู้รับผิดชอบหลายคนหรือยังไม่มอบหมายได้ (เจ้าของแก้กติกา 7 ต.ค. 2026) ผู้รับต้อง active และมีสิทธิ์ Editor/ดูแลโปรเจกต์ |
| FR-14 | จัดการสถานะและความสำคัญ | มีสถานะและระดับความสำคัญที่กำหนดไว้; ทุกการเปลี่ยนมีประวัติ |
| FR-15 | งานย่อย | Checklist อยู่ใต้งานหลัก เพิ่ม แก้ชื่อ ลบ และติ๊กเสร็จได้; แต่ละข้อเลือกผู้รับผิดชอบหนึ่งคนหรือยังไม่มอบหมายได้จากผู้ใช้ active ที่มีสิทธิ์เขียนในโปรเจกต์ โดยไม่จำกัดเฉพาะผู้รับผิดชอบ Task; ผู้ใช้กดเสร็จเองได้เมื่อ checklist ครบ; ไม่เสร็จอัตโนมัติ |
| FR-16 | งานซ้ำ | รองรับรายวัน รายสัปดาห์ รายเดือน; สร้างรอบถัดไปเมื่อปิดงาน โดยไม่สร้างซ้ำเมื่อส่งคำสั่งซ้ำ |
| FR-17 | ลบงานแบบกู้คืนและคืนงาน | งาน soft delete/restore 30 วัน; ไม่มี task archive แยก; project archive ตาม FR-09 |
| FR-18 | รับมือแก้ไขพร้อมกัน | ไม่ทับข้อมูลสมาชิกอื่นเงียบ ๆ แจ้ง conflict และให้โหลดข้อมูลล่าสุด |
| FR-19 | งานของฉัน | แสดงงานที่มอบหมายให้ตน แยกวันนี้ เกินกำหนด และยังไม่มีวันส่ง |
| FR-20 | ค้นหา กรอง และจัดลำดับ | กรองทีม โปรเจกต์ ผู้รับ สถานะ ความสำคัญ หมวดหมู่ ช่วงวันที่; ค้นเฉพาะข้อมูลที่มีสิทธิ์ |

### 5.4 Kanban รายการและปฏิทิน

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-21 | Kanban เปลี่ยนสถานะด้วยการลาก | ลากข้ามคอลัมน์แล้วบันทึกสถานะ; ถ้าบันทึกไม่สำเร็จ คืนการ์ดและแจ้งข้อผิดพลาด |
| FR-22 | Kanban จัดลำดับด้วยการลาก | ลากขึ้นลงแล้วเก็บลำดับต่อโปรเจกต์/สถานะ; โหลดใหม่แล้วยังเรียงเดิม |
| FR-23 | ทางเลือกแทนการลาก | เปลี่ยนสถานะและเลื่อนลำดับได้ด้วยปุ่ม/เมนูสำหรับมือถือและคีย์บอร์ด |
| FR-24 | มุมมองรายการ | เห็นชื่อ ผู้รับ วันส่ง สถานะ ความสำคัญ และเปิดรายละเอียดงานได้ |
| FR-25 | ปฏิทินและ Gantt | มุมมองเดือนตามวันครบกำหนด เปิดงานจากวันได้; ไม่ตีความงานไม่มีวันส่งเป็นวันนี้; Gantt แสดงช่วง start–due รวมวันปลายและแยกรายการวันที่ไม่ครบตาม SRS9.3.1 |
| FR-26 | อัปเดตการเปลี่ยนแปลงทีม | ข้อมูลที่สมาชิกอื่นบันทึกแสดงภายในเวลาที่กำหนด โดยไม่ล้างร่างที่กำลังแก้ไข |

### 5.5 การร่วมงาน

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-27 | ความคิดเห็นในงาน | Editor/ผู้ดูแลเพิ่มความคิดเห็นได้ ระบุผู้เขียนและเวลา; render ข้อความโดยไม่รัน HTML |
| FR-28 | ไฟล์แนบ | ผู้มีสิทธิ์อัปโหลด ดาวน์โหลด และลบตามกติกา; ตรวจขนาด/นามสกุล; URL ไม่เปิดสาธารณะ; ไฟล์ที่ลบกู้คืนได้ 30 วันและยังนับพื้นที่จน purge |
| FR-29 | ประวัติงาน | ดูผู้ทำ เวลา และการเปลี่ยนรายละเอียด ผู้รับ สถานะและไฟล์; ประวัติแก้ย้อนหลังไม่ได้ |
| FR-30 | แจ้งเตือนภายในเว็บ | แจ้งการมอบหมาย ความคิดเห็น สถานะ ใกล้วันส่ง/เกินกำหนด; ไม่ส่งอีเมลหรือ AI |
| FR-31 | อ่านแจ้งเตือน | อ่านรายรายการ/ทั้งหมดได้; แจ้งเตือนงานที่หมดสิทธิ์ต้องไม่เผยเนื้อหา |

### 5.6 รายงาน ระบบและการส่งมอบ

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-32 | ภาพรวมองค์กร/ทีม/โปรเจกต์ | แสดงจำนวนงานตามสถานะ งานเกินกำหนด และงานยังไม่มอบหมายตามสิทธิ์ |
| FR-33 | รายงานตามสมาชิกและช่วงเวลา | ระบุฐานวันที่ที่ใช้คำนวณและนิยามงานเสร็จ ไม่จัดอันดับด้วยข้อมูลที่ไม่ได้เก็บ |
| FR-34 | Export CSV | Export ตามตัวกรองและสิทธิ์ที่ดู; รองรับภาษาไทยและป้องกันสูตรใน CSV |
| FR-35 | Responsive และ English base | ใช้งานบนคอมพิวเตอร์/มือถือได้; ข้อความหลัก English ตาม owner approval 7 ต.ค. 2026; ข้อมูลรองรับไทย/Unicode; เวลา Asia/Bangkok |
| FR-36 | PWA แบบออนไลน์ | เพิ่มทางลัดบนหน้าจอได้ตาม browser; ไม่เก็บข้อมูลทีมอ่อนไหวไว้ใน offline cache |
| FR-37 | ตั้งค่าระบบที่จำเป็น | Admin ตั้งชื่อองค์กร; ค่าติดตั้ง/พื้นที่/สำรองตั้งผ่าน configuration ที่มีคู่มือ |
| FR-38 | สำรองและกู้คืน | มีเครื่องมือสำรองฐานข้อมูลและไฟล์ให้สัมพันธ์กัน พร้อมขั้นตอนทดสอบ restore |
| FR-39 | สุขภาพระบบและ log | ตรวจ readiness ได้โดยไม่เผยข้อมูล; log ข้อผิดพลาดและ admin actions โดยไม่เก็บรหัสผ่าน |
| FR-40 | ชุดโค้ดติดตั้งเอง | ส่ง source, lockfile เมื่อมี dependency, migrations, env template, scripts, test และคู่มือ Windows |

### 5.7 Admin ตำแหน่ง และสิทธิ์ (addendum 1.9)

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-41 | ตำแหน่งงานของผู้ใช้ | Admin กำหนดตำแหน่งให้ผู้ใช้ในหน้า Users และจัดการรายการตำแหน่งได้; แสดงป้ายตำแหน่งถัดจากชื่อใน People picker, Members, Workload และรายงาน; กรองงาน/สมาชิกตามตำแหน่งได้; CSV มีคอลัมน์ตำแหน่ง; การเปลี่ยนบันทึก admin audit |
| FR-42 | Project role `manager` | เพิ่ม role `manager` นอกจาก Editor/Viewer; แต่งตั้งได้เฉพาะผู้มี permission กลุ่มโปรเจกต์ P-01–P-07 อย่างน้อยหนึ่งข้อ; Manager ทำได้เฉพาะข้อที่ถูกติ๊กและเฉพาะโปรเจกต์ที่ตนเป็น manager; แต่งตั้ง/ถอดโดย Admin/Lead ทีมเจ้าของเท่านั้น (ผู้มี P-03 ตั้งได้แค่ Editor/Viewer); ตรวจสิทธิ์ที่ server ทุกช่องทาง |
| FR-42A | Permission checkbox รายคน | Admin ติ๊ก P-01–P-10 (§7A.1) ทีละข้อในแท็บ Permissions ของผู้ใช้; preset “PM/SM” ติ๊ก P-01–P-10 และ “Clear”; มีคำอธิบายแต่ละข้อ; บันทึกแบบ version กันทับ; audit เก็บรายการเพิ่ม/เอาออก ผู้ทำ เวลา; มีผลทันทีไม่ต้อง login ใหม่; ไม่ขึ้นกับตำแหน่ง (UI แนะนำ preset ได้แต่ Admin ต้องยืนยันเอง); ข้อมูลยังจำกัดตาม BR-16 |
| FR-43 | หน้า Admin รวมศูนย์ | เมนู Admin มี Members, Teams, Job titles และ Permission matrix (แถว P-01–P-10 × คอลัมน์สมาชิก ตามคำสั่งเจ้าของ 9 ต.ค. 2026); ตรึงคอลัมน์ Permission ซ้ายเมื่อเลื่อนสมาชิกแนวนอนและตรึงชื่อสมาชิกด้านบนเมื่อเลื่อนลง. ติ๊กได้เฉพาะ Admin, กรองตามทีม/ตำแหน่ง, เลือกหลายคนแล้วใช้ preset, สรุปการเปลี่ยนแปลงก่อนยืนยัน; ผู้ใช้ทั่วไปเห็นสิทธิ์ของตนใน Settings แบบอ่านอย่างเดียว |

### 5.8 Personal (addendum 1.9)

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-44 | My overview | Home แสดงจำนวนงานของฉันตามสถานะ, เกินกำหนด/วันนี้/สัปดาห์นี้, งานตามโปรเจกต์, งานเสร็จ 7 วันล่าสุด และ “ต้องทำต่อไป” 5 รายการ; คลิกแล้วไป My work ด้วยตัวกรองตรงกัน; ตัวเลขใช้ API/สิทธิ์เดียวกับรายงาน |
| FR-45 | My work แบบ monday | Grouped table Overdue/Today/This week/Next week/Later/No date/Done พร้อมคอลัมน์ Project และลิงก์; เปลี่ยนสถานะ inline ตามสิทธิ์; สลับ “ได้รับมอบหมาย/ฉันสร้าง” |
| FR-47 | Favorites | ติดดาวโปรเจกต์แบบส่วนตัว แสดงบนสุดของ sidebar; ถอนสิทธิ์แล้ว favorite หายตาม |

FR-46 Updates feed **DEFERRED** ไปรอบถัดไปตามคำตอบเจ้าของ (ไม่อยู่ใน coverage ของรุ่นนี้)

### 5.9 Workspace / Project (addendum 1.9)

| ID | ความต้องการ | ผลลัพธ์ที่ต้องยอมรับได้ |
|---|---|---|
| FR-48 | Project Docs | แท็บ Docs สร้างหลายหน้า (ชื่อ ≤200, เนื้อหา ≤200,000 ตัวอักษร) ด้วย rich text พื้นฐาน (หัวข้อ, ตัวหนา/เอียง, list, checklist, ลิงก์, code, ตาราง, รูปจาก Files ของโปรเจกต์); Viewer อ่าน, Editor/Manager แก้; version กัน conflict; ประวัติผู้แก้/เวลา; soft delete/restore 30 วัน; sanitize HTML ฝั่ง server; ไม่มี real-time co-editing |
| FR-49 | Project Files | แท็บ Files รวมไฟล์ระดับโปรเจกต์และไฟล์แนบทุกงาน แสดงชื่อ ขนาด ผู้อัปโหลด เวลา งานต้นทาง; Editor/Manager อัปโหลดระดับโปรเจกต์; ค้นหา/กรองชนิด; preview รูป/PDF; ใช้กติกา quota/ตรวจชนิด/ลบ/กู้คืนของ FR-28 |
| FR-50 | Workload view | มุมมองในโปรเจกต์ (และระดับทีมสำหรับ Lead/Admin/ผู้มี P-09): จำนวนงานต่อคนต่อสัปดาห์จาก start/due พร้อมป้ายตำแหน่ง, ไฮไลต์เกินเกณฑ์ (ค่าเริ่มต้น 10 งานยังไม่เสร็จ/สัปดาห์, Admin ปรับได้); คลิกดูรายการ; ไม่ใช่ time tracking |
| FR-51 | Project overview | แท็บ Overview: % ความคืบหน้าจากงาน done, กราฟสถานะ, งานเกินกำหนด, งานตามผู้รับผิดชอบ/ตำแหน่ง, กิจกรรมล่าสุด |
| FR-52 | Main table แบบ monday | sticky header ต่อกลุ่ม, คอลัมน์ Task sticky ซ้าย, ปรับความกว้างคอลัมน์ (จำต่อผู้ใช้), inline edit ชื่อ/วันที่/priority/ผู้รับ, เพิ่มงานท้ายกลุ่มด้วยพิมพ์แล้ว Enter, เลือกหลายแถวแล้วเปลี่ยนสถานะ/ผู้รับ/กลุ่ม/ลบแบบ batch, ลากแถวย้ายกลุ่ม, แถบสรุปท้ายกลุ่ม |
| FR-53 | Task side panel แบบ monday | panel ขวามีแท็บ Updates (comments + @mention เฉพาะผู้เข้าถึงโปรเจกต์), Files, Activity log, Details/Checklist; ปิดด้วย Esc; deep link ไปงานได้ |

## 6. Non-functional Requirements

| ID | ความต้องการ | เป้าหมายที่วัดได้ |
|---|---|---|
| NFR-01 | ขนาดและความเร็ว | 30 บัญชี; ทดสอบ 15 active sessions, 10,000 งาน, 20,000 comments; API อ่าน p95 ≤2 วินาที และเขียน p95 ≤3 วินาทีบนเครื่องทดสอบที่บันทึกสเปก |
| NFR-02 | ความปลอดภัย | HTTPS เมื่อใช้จริง; password hash; secure session; CSRF; server-side permission; ป้องกัน XSS/SQL injection และไม่เผย secrets |
| NFR-03 | ความถูกต้อง | งาน/ประวัติ/แจ้งเตือนและการสร้างงานซ้ำบันทึกใน transaction; concurrency ไม่ทำข้อมูลหาย |
| NFR-04 | การกู้คืน | เป้าหมาย RPO ≤24 ชั่วโมง, RTO ≤4 ชั่วโมง ภายใต้การสำรองรายวันและผู้ดูแลที่พร้อมดำเนินการ; ต้องทดสอบจริง |
| NFR-05 | การเข้าถึง | ใช้คีย์บอร์ดได้; มี label/focus; เปลี่ยนสถานะโดยไม่ลากได้; ไม่สื่อความหมายด้วยสีอย่างเดียว |
| NFR-06 | ความเข้ากันได้ | Chrome/Edge/Firefox และ Safari รุ่นปัจจุบัน/ก่อนหน้าหนึ่งรุ่น ณวันทดสอบ; responsive ตั้งแต่ 360px |
| NFR-07 | ดูแลและย้ายระบบ | configuration แยกจาก code, migrations มี version, backup/restore มีคู่มือ, ไม่ผูก provider |
| NFR-08 | ต้นทุน | app/runtime/library ไม่บังคับ subscription; ใช้ SQL Server 2022 ที่องค์กรมี; ตรวจ Edition/สิทธิ์ใช้งานก่อน production; ค่าเครื่อง domain พื้นที่และดูแลเป็นต้นทุนองค์กร |
| NFR-09 | Motion | ใช้ transform/opacity, 60fps บนเครื่องสำนักงาน; `prefers-reduced-motion` และ toggle “Reduce animations” ปิด motion ที่ไม่จำเป็น; animation ไม่บล็อก action/การบันทึก; ไม่สื่อความหมายด้วย motion อย่างเดียว; ไม่เพิ่ม library/CDN โดยไม่ผ่าน license/audit |

ค่าประสิทธิภาพเป็น **เป้าหมายทดสอบ** ไม่ใช่คำรับรองว่า Server ที่ยังไม่ทราบสเปกจะทำได้ตามนั้น

## 7. กติกาธุรกิจสำคัญ

| ID | กติกา |
|---|---|
| BR-01 | หนึ่งระบบให้บริการหนึ่งองค์กร; ผู้ใช้ username ไม่ซ้ำและไม่มี public registration |
| BR-02 | Admin อย่างน้อยหนึ่งคนต้อง active อยู่เสมอ |
| BR-03 | ทีมมีสมาชิกหลายคน; คนเดียวอยู่หลายทีมได้; Lead แต่งตั้งโดย Admin |
| BR-04 | โปรเจกต์มีทีมเจ้าของหนึ่งทีม; Admin/Lead ทีมเจ้าของมีสิทธิ์ดูแล; ผู้ใช้คนอื่นต้องมี project membership |
| BR-05 | ผู้ใช้ข้ามทีมได้รับสิทธิ์เฉพาะโปรเจกต์ที่เพิ่มให้; ไม่ได้รับสิทธิ์ตามทีมเจ้าของโดยปริยาย |
| BR-06 | งานอยู่ในโปรเจกต์เดียว; v1 ไม่ย้ายงานข้ามโปรเจกต์เพื่อหลีกเลี่ยงเปลี่ยนสิทธิ์ของไฟล์และประวัติโดยไม่ตั้งใจ |
| BR-07 | ผู้รับผิดชอบหลักมีได้หนึ่งคนหรือไม่มี; ไม่มอบหมายให้ Viewer/บัญชี inactive |
| BR-08 | วันเริ่ม ≤ วันส่งเมื่อมีทั้งสองวัน; วันที่เป็น date-only; timestamps เก็บ UTC แสดง Bangkok |
| BR-09 | งานเกินกำหนดคือ due date < วันนี้ใน Bangkok และไม่ใช่ done/deleted; งานวันนี้ยังไม่ถือเกินกำหนด |
| BR-10 | สถานะเริ่มต้น: รอทำ, กำลังทำ, รอตรวจ, เสร็จแล้ว; รอตรวจไม่ใช่ระบบอนุมัติที่บังคับเฉพาะหัวหน้า |
| BR-11 | ย้ายเป็นเสร็จแล้วได้เมื่อ checklist ครบ; เปิดงานเสร็จแล้วกลับได้ตามสิทธิ์ |
| BR-12 | งานซ้ำใช้วันส่งเดิมเป็นฐาน สร้างรอบถัดไปเมื่อเสร็จครั้งแรก; การเปิดกลับและปิดซ้ำไม่สร้างรอบเพิ่ม |
| BR-13 | ลำดับ Kanban แยกตามโปรเจกต์และสถานะ; อนุญาตจัดลำดับเฉพาะบอร์ดที่ไม่เปิดตัวกรองอื่น |
| BR-14 | งานในโปรเจกต์ archived อ่านได้ตามสิทธิ์ แต่แก้ไข แสดงความคิดเห็น อัปโหลดหรือสร้างงานซ้ำไม่ได้; Admin/owner Lead ลบและคืนงานผ่าน endpoint เฉพาะได้ โดยงานที่คืนยัง read-only |
| BR-15 | เมื่อถอน project access ให้ unassign งานค้างของคนที่หมดสิทธิ์; งานเสร็จเก็บผู้รับเดิมเป็นประวัติ |
| BR-16 | การแจ้งเตือนและ export ไม่ขยายสิทธิ์; สมาชิกเห็นรายงานสมาชิกอื่นเฉพาะโปรเจกต์ที่ตนเข้าถึง |
| BR-17 | “เสร็จในช่วงเวลา” นับงานที่สถานะปัจจุบัน done และ completed_at อยู่ในช่วง; reopen ล้าง completed_at แต่เก็บ event history |
| BR-18 | ความคิดเห็นแก้หรือลบไม่ได้ใน v1; ถ้าจำเป็นแก้ข้อมูลส่วนบุคคลให้ทำผ่าน admin maintenance ที่มี audit |
| BR-19 | Job title เป็นข้อมูลแสดงผล/กรอง/รายงานเท่านั้น ห้ามใช้ตัดสินสิทธิ์ใน server |
| BR-20 | ผู้ใช้มีตำแหน่งหลักหนึ่งตำแหน่งหรือไม่มี; ตั้งต้น PM, SM, BA, SA, Dev, Tester; Admin เพิ่ม/เปลี่ยนชื่อ/ปิดใช้งานได้ ไม่ลบถาวรถ้ายังมีผู้ใช้อ้างถึง |
| BR-21 | สิทธิ์มาจากการตั้งค่าของ Admin รายบุคคล/รายโปรเจกต์ ไม่ได้มาจากตำแหน่ง; PM/SM ไม่ได้สิทธิ์อัตโนมัติ และตำแหน่งอื่นได้สิทธิ์แบบ PM/SM เมื่อ Admin กำหนด; การเปลี่ยนตำแหน่งไม่เพิ่มหรือลดสิทธิ์ |
| BR-22 | เอา permission ออกแล้วหมดผลทันทีทั้ง UI/API; ถ้าไม่เหลือ P-01–P-07 ให้ลด role `manager` ทั้งหมดของผู้ใช้นั้นเป็น Editor ใน transaction เดียวพร้อม audit และ refresh view |
| BR-23 | เฉพาะ Organization Admin ติ๊ก/เอาออก permission ได้; แก้ของตนเองหรือมอบต่อไม่ได้; สิทธิ์เฉพาะ Admin (ผู้ใช้/ทีม/ตำแหน่ง/permission, archive/ลบโปรเจกต์, ตั้งค่าระบบ, Trash ทั้งองค์กร) ไม่อยู่ใน checkbox |

## 7A. UX/UI, permission catalog และ animation (addendum 1.9)

### 7A.1 Permission checkbox

| Key | Checkbox | ขอบเขต | PM/SM preset |
|---|---|---|---|
| P-01 | แก้ชื่อ/รายละเอียดโปรเจกต์ | โปรเจกต์ที่เป็น manager | ✓ |
| P-02 | จัดการ Group (สร้าง/แก้ชื่อ/สี/ลบ) | โปรเจกต์ที่เป็น manager | ✓ |
| P-03 | เพิ่ม/ถอดสมาชิกโปรเจกต์ (Editor/Viewer) | โปรเจกต์ที่เป็น manager | ✓ |
| P-04 | ลบและคืนงานของผู้อื่น | โปรเจกต์ที่เป็น manager | ✓ |
| P-05 | จัดการ Docs ของผู้อื่น (แก้/ลบ/คืน) | โปรเจกต์ที่เป็น manager | ✓ |
| P-06 | ลบ/คืนไฟล์ของผู้อื่นใน Files | โปรเจกต์ที่เป็น manager | ✓ |
| P-07 | ดู Project overview / Reports / Export CSV ของโปรเจกต์ | โปรเจกต์ที่เป็น manager | ✓ |
| P-08 | สร้างโปรเจกต์ใหม่ (ผู้สร้างเป็น manager อัตโนมัติ) | ทีมที่ตนเป็นสมาชิก | ✓ |
| P-09 | ดู Workload ระดับทีม | ทีมที่ตนเป็นสมาชิก เห็นเฉพาะงานในโปรเจกต์ที่ตนเข้าถึง | ✓ |
| P-10 | ดู Reports ระดับทีม | ทีมที่ตนเป็นสมาชิก ตาม BR-16 | ✓ |

สิทธิ์พื้นฐาน Editor/Viewer ยังมาจาก project membership เดิม; Team Lead และ Admin มีสิทธิ์ตามเดิมโดยไม่ต้องติ๊ก. ตำแหน่ง PM/SM เป็นกลุ่ม Management, BA/SA/Dev/Tester เป็นกลุ่ม Dev และเป็นป้ายเท่านั้น

### 7A.2 UX/UI

| ID | ความต้องการ | เกณฑ์วัด |
|---|---|---|
| UX-01 | Visual language | Vibe `@vibe/core` ทุกหน้า: navy top bar, sidebar ขาว-เทา, การ์ดมุม 8px, status pill เต็มช่อง, group แถบสีซ้าย, avatar วงกลม, ฟอนต์ระบบ (ไม่ดึงจาก internet) |
| UX-02 | Navigation | Sidebar Personal (Home, My work) / Workspace (All projects, Favorites, Your projects) / Admin (เฉพาะผู้มีสิทธิ์); ค้นหาโปรเจกต์; ยุบได้ |
| UX-03 | Project header | ชื่อ + ดาว + คำอธิบาย + avatar stack + Members + เมนู; แท็บ Main table/Kanban/Calendar/Gantt/Workload/Docs/Files/Overview พร้อมซ่อน/แสดงแท็บ (จำต่อผู้ใช้) |
| UX-04 | Empty states | ทุก view มี empty state และปุ่ม action หลัก |
| UX-05 | Responsive | ตั้งแต่ 360px ไม่มี horizontal scroll ของเอกสาร; ตารางเลื่อนในกรอบ; side panel เต็มจอบนมือถือ |
| UX-06 | Keyboard | ทุก action ใช้คีย์บอร์ดได้; `N` งานใหม่, `/` ค้นหา, `Esc` ปิด panel |

### 7A.3 Animation

| ID | จุด | พฤติกรรม | ระยะเวลา |
|---|---|---|---|
| AN-01 | เปลี่ยนหน้าหลัก | fade + slide 6px เฉพาะ pathname เปลี่ยน; การเลือกแท็บ/ตัวกรองในหน้าเดิมคงตำแหน่งและไม่ replay ทั้งหน้า (owner correction 2026-10-09) | 180–220ms เฉพาะหน้าหลัก |
| AN-02 | Task side panel | slide-in จากขวา + backdrop fade | 260ms |
| AN-03 | เปลี่ยนสถานะ | crossfade + scale 1→1.06→1 | 240ms |
| AN-04 | งานเป็น Done | confetti เล็ก ไม่มีเสียง ≤1 ครั้ง/2 วินาที; เปิดเป็นค่าเริ่มต้น ปิดได้ใน Settings และปิดเมื่อ reduced motion | 700ms |
| AN-05 | Kanban drag | การ์ดยก shadow + rotate 2°, FLIP เมื่อวาง | 220–320ms |
| AN-06 | ย่อ/ขยาย group | height + chevron rotate | 200ms |
| AN-07 | เพิ่ม/ลบงาน | แถวใหม่ highlight แล้ว fade; ลบแล้วยุบ | 300ms |
| AN-08 | Loading | skeleton shimmer ใน table/kanban/cards | ต่อเนื่อง |
| AN-09 | Notify | กระดิ่งสั่นเบา ๆ + badge pop | 400ms |
| AN-10 | Overview | count-up และ bar เติบโตจาก 0 | 600ms |
| AN-11 | Hover/press | hover elevation, press scale 0.98 | 120ms |
| AN-12 | Toast | slide-up + auto dismiss พร้อม progress | 220ms |
| AN-13 | Login | ภาพประกอบเคลื่อนไหวเดิม | — |

## 8. User Journeys

### 8.1 เริ่มองค์กร

ผู้ติดตั้งรันระบบ → ใช้ setup token ตั้ง Admin คนแรก → ตั้งชื่อองค์กร → สร้างบัญชี/ทีม → แต่งตั้ง Lead → Lead สร้างโปรเจกต์และเพิ่มผู้ใช้ → สมาชิกเข้าสู่ระบบและเปลี่ยนรหัสชั่วคราว

### 8.2 ทำงานร่วมกัน

Editor สร้างงานในโปรเจกต์ → เลือกผู้รับและวันส่ง → ผู้รับเห็นแจ้งเตือน → ลากไปกำลังทำ → เพิ่มความคิดเห็น/ไฟล์ → checklist ครบ → ลากเป็นเสร็จ → เก็บประวัติและอัปเดตรายงาน

### 8.3 ทำงานข้ามทีม

Lead ทีมเจ้าของเปิดโปรเจกต์ → เพิ่มคนจากทีมอื่นเป็น Editor/Viewer → ผู้ใช้เห็นเฉพาะโปรเจกต์ร่วม → ถอนสมาชิกเมื่อจบการร่วมงาน → รายการงาน/ไฟล์/แจ้งเตือนและ CSV ต้องตัดสิทธิ์ทันที

### 8.4 จัดการข้อผิดพลาด Kanban

ผู้ใช้ลากการ์ด → แสดงกำลังบันทึก → ถ้าสำเร็จเก็บลำดับ → ถ้า connection fail คืนการ์ด → ถ้า conflict โหลดตำแหน่งล่าสุดและแจ้งว่างานถูกเปลี่ยนโดยคนอื่น; ไม่ส่งซ้ำแบบสร้างงานซ้ำ

## 9. สิ่งที่ต้องส่งมอบเมื่อเข้าสู่การพัฒนา

1. Source code ทั้ง frontend/backend โดยไม่ใส่ secrets หรือข้อมูลจริง
2. Database migrations, sample data แยกจาก production และคำสั่งตั้ง Admin
3. คู่มือ local run และ Windows deploy พร้อมค่าระบบที่ต้องตั้งและการใช้งาน HTTPS
4. คู่มือ Admin/สมาชิก และวิธีสำรอง กู้คืน update/rollback
5. Automated tests ด้านสิทธิ์/ธุรกรรม/งานซ้ำ/Kanban และรายงาน UAT
6. รายการ dependency/license และข้อจำกัดที่ยังไม่ผ่านการทดสอบ

## 10. สิ่งที่ยังต้องตรวจตอนติดตั้ง

กติกาการใช้งานได้ยืนยันแล้ว ไม่ต้องขออนุมัติซ้ำสำหรับ R-01–R-04 หรือ D-01–D-11 ฐานข้อมูล SQL Server 2022 ยืนยันแล้ว แต่ Edition/build, connection details, SQL authentication และสิทธิ์สำรอง/กู้คืนยังต้องตรวจ ไม่มีการขอให้ส่ง password ในแชต

ข้อมูลติดตั้งจริงที่ยังไม่ทราบ: รุ่น Windows Server, สเปกเครื่อง, สิทธิ์ติดตั้ง runtime/Windows Service, IIS/reverse proxy ที่มี, certificate และตำแหน่งสำรอง สามารถพัฒนา/ทดสอบ local ตาม SRS ได้ก่อน แต่ยังสรุปว่า deploy ด้วย panel เดิมได้ไม่ได้

## 11. เงื่อนไขเปลี่ยนขอบเขต

ปรับเอกสาร Requirements และ SRS คู่กันเมื่อเปลี่ยน business rule, API, data model หรือ acceptance criteria โดยเพิ่ม version และบันทึกผลกระทบก่อนแก้ code เรื่องที่ excluded ไม่กลายเป็น scope โดยอัตโนมัติจากการมี library รองรับ

## 12. Change Log

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | ร่างแรกจากบทสนทนาองค์กรหลายทีม 30 คน; ไม่มีอีเมล/AI; ส่งโค้ด deploy เอง |
| 1.1 | 2026-10-05 | เจ้าของระบบยืนยันกติกา; R-01–R-04 resolved; SQL Server2022/mssql; filetrash/restore30วัน; coding/testsยังไม่ผ่าน |
| 1.2 | 2026-10-05 | เจ้าของระบบกำหนด Node.js22 แทน24; ขอ SQL อื่นชั่วคราวและรอเลือกชนิด/ขอบเขต; คง business baseline1.1 และผลทดสอบเดิม |
| 1.3 | 2026-10-05 | ยืนยัน SQLite สำหรับพัฒนา local ชั่วคราว; SQL2022 ยังคงปลายทาง; ผลทดสอบแยก provider และไม่เปลี่ยน NOT_RUN เป็น PASS |
| 1.4 | 2026-10-05 | เจ้าของระบบยืนยันข้อเสนอ readiness22ประเด็น; ล็อก8กติกา/แผนปิด10contracts+4planning gaps; ไม่มีผล application tests ใหม่ |
| 1.5 | 2026-10-05 | T-003 เพิ่มmachine API/DTO contractและUT-01/T-003 schema checks; relatedAT/TCยังNOT_RUN; ไม่เปลี่ยนbusinessscope |
| 1.9 | 2026-10-08 | T-078 รวม Monday-style addendum ที่เจ้าของอนุมัติ: FR-41–FR-53 (FR-42A, FR-46 deferred), NFR-09, BR-19–BR-23, UX-01–06, AN-01–13, permission P-01–P-10; ยังไม่มี implementation/ผลทดสอบ |

## ข้อยืนยันเพิ่มเติมด้าน lifecycle/release

ใช้ RD-01–RD-08 ใน SRS §18: cleanup assignee เมื่อ reopen/restore/demote, team ต้อง active ก่อนเปิด project, cutoff30วันตาม timestampUTC, monthly anchor เมื่อผู้ใช้แก้วันส่ง, purge job/CLI กลไกเดียวกัน และแยก source candidate จาก final source/production sign-off; approved scope ยังคงไม่มี SMTP/AI/offline writes และไม่ deploy โดยผู้พัฒนา

## Contract implementation reference — T-003

รายละเอียดภายในscopeเดิม: TeamFlow_API_Contract.md และ contracts/openapi.json ล็อก52routes/DTO/request schema/error/version/idempotency/query; การทดสอบcontractเป็นหลักฐานFR-05/18/40เฉพาะshape/contract ยังไม่พิสูจน์serverpermissions/SQLtransactionsหรือAT/TCผ่าน

## Owner assignment change — 7 ตุลาคม 2026

เจ้าของเปลี่ยน FR-13 ให้ Task มีผู้รับผิดชอบหลายคน และ FR-15 ให้ Checklist แต่ละข้อ assign คนอื่นได้; คงสิทธิ์โปรเจกต์เดิมและกติกาทำ Checklist ครบก่อนกด Done. Preview Vibe รองรับการเลือกหลายคน/ล้างรายชื่อ และ Checklist assignment ในข้อมูลสมมติแล้ว. แอปจริง/API/database ยังใช้ contract เดิม ต้องทำ change review/schema/migration/notification/withdrawal/recurrence และ test traceability ก่อน implementation; ผล mock ไม่ปิด acceptance. การเลือกผู้รับผิดชอบไม่ให้สิทธิ์โปรเจกต์เพิ่ม.
