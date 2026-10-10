# TeamFlow — Task.md: แผนพัฒนาและตรวจความครบถ้วน

**Version:** 1.62 · **วันที่:** 8 ตุลาคม 2026\
**สถานะ:** แผนงานตาม Baseline 1.1 ที่ยืนยันแล้ว; coding/testing ยังไม่เสร็จ  
**จำนวน:** 94 งานหลัก · 14 ช่วงงาน · 52 FR (+FR-42A; FR-46 deferred) · 9 NFR · 23 BR · 40 Acceptance Tests · 85 API routes ที่ล็อก (contract 1.7.0) + planned routes SRS §12.6
**ต้นทาง:** `TeamFlow_Requirements_v1.0.md` และ `TeamFlow_SRS_v1.0.md` รุ่นปัจจุบันที่อ่านเมื่อ 5 ตุลาคม 2026




## T-087 Task side panel — 8 October 2026

ตรวจ side panel ที่มีอยู่ (drawer ขวา/แท็บ/focus trap/Esc/deep link) แล้วเพิ่ม UI @mention (เฉพาะสมาชิกโปรเจกต์, คีย์บอร์ด, Esc ปิดเฉพาะรายการ, แสดงเป็นข้อความ) และเปลี่ยนชื่อแท็บเป็น Updates/Activity. ผล: AT-38 HTTP 1/1, mentions 2/2, Chromium side-panel 1/1 (3/3), Node 451/451 + frontend 49/49, addendum browser 8/8, typecheck/lint/build PASS. SQL Server 2022/Windows/UAT NOT_RUN. Evidence: TeamFlow_T087_Test_Report.md / reports/T-087-side-panel-results.json. DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84. Declared Medium; actual model/effort NOT_VERIFIED. Next: T-091 High ต้องมี SQL Server 2022/Windows/UAT จริง.

## T-086 Main table — 8 October 2026

ตรวจโค้ด Main table ที่มีอยู่ (batch/quick add/rename/drag/move/resize) แล้วแก้: column widths เก็บต่อผู้ใช้ผ่าน preferences แทน localStorage, sticky header + คอลัมน์ Select/Task, เอา double-click rename ที่ใช้ไม่ได้ออก (ใช้ F2/เมนู). ผล: AT-38 HTTP 1/1, Chromium main-table 1/1 (3/3), Node 451/451 + frontend 47/47, addendum browser 7/7, typecheck/lint/build PASS. SQL Server 2022/Windows/UAT NOT_RUN. Evidence: TeamFlow_T086_Test_Report.md / reports/T-086-main-table-results.json. DONE7/91, IN_PROGRESS81, IN_REVIEW1, TODO2, remaining84. Declared High; actual model/effort NOT_VERIFIED. Next: T-087 Medium (Task side panel).

## T-079 owner approval + T-089 Motion/preferences — 8 October 2026

เจ้าของอนุมัติ mock T-079 ในแชท (ไม่มีข้อแก้) → T-079 DONE. T-089: migration 0010 `user_preferences`, contract 1.7.0 (85 routes/110 schemas) GET/PATCH `/api/me/preferences`, motion.css/motion.ts AN-01–AN-12 (AN-02 รอ T-087), reduced motion จาก Settings และ OS (ย่อ duration แทน none), Settings Motion. แก้ regression ของ T-090 (ดาวอยู่ใน h1). ผล: preferences HTTP 1/1, Chromium motion 1/1 (3/3), frame timing headless 60fps/p95 17ms, Node 451/451 + frontend 47/47, schema 18/18, typecheck/lint/build/contract PASS. vibe-integration row-height (38 vs 39.78) fail มาก่อนตั้งแต่ 3a76fd7. Evidence: TeamFlow_T089_Test_Report.md / reports/T-089-motion-results.json. DONE7/91, IN_PROGRESS80, IN_REVIEW1, TODO3, remaining84. Declared Medium; actual model/effort NOT_VERIFIED. Next: T-086 High (Main table) แล้ว T-087 Medium.

## T-090 Favorites — 8 October 2026

สร้างใหม่: migration 0009 `user_favorites`, contract 1.6.0 (83 routes/108 schemas) GET/PUT/DELETE `/api/me/favorites{/id}`, `cleanupFavorites()` ใน transaction ของทุกการเปลี่ยนสิทธิ์, ปุ่มดาวในหัวโปรเจกต์ และ Favorites บนสุดของ sidebar. ผล: AT-40 HTTP 1/1, schema 18/18, Node 450/450 + frontend 47/47, Chromium addendum 5/5, typecheck/lint/build/contract PASS. SQL Server 2022/Windows/UAT NOT_RUN. Evidence: TeamFlow_T090_Test_Report.md / reports/T-090-favorites-results.json. DONE6/91, IN_PROGRESS79, IN_REVIEW2, TODO4, remaining85. Declared Low; actual model/effort NOT_VERIFIED. Next: T-086 High / T-087 Medium / T-089 Medium รอเจ้าของรีวิว mock T-079; T-091 High ต้องมี SQL Server 2022/Windows/UAT.

## T-088 Workload + Project overview — 8 October 2026

สร้างใหม่: migration 0008 `organizations.workload_threshold` (default 10), contract 1.5.0 (80 routes/107 schemas) เพิ่ม workload โปรเจกต์/ทีมและ project overview, สิทธิ์ team_workload (Admin/Lead/P-09), insights service ใช้ taskQuery เดียวกับ My work (BR-16), แท็บ Workload/Overview, ปุ่ม Workload ทีม, ช่อง threshold ใน settings, CSS widget กลาง. ผล: workload helper 2/2, AT-37 HTTP 1/1, frontend 47/47, Node 449/449, Chromium 1/1, typecheck/lint/build/contract PASS. SQL Server 2022/Windows/UAT NOT_RUN. Evidence: TeamFlow_T088_Test_Report.md / reports/T-088-workload-results.json. DONE6/91, IN_PROGRESS78, IN_REVIEW2, TODO5, remaining85. Declared Medium; actual model/effort NOT_VERIFIED. Next: T-090 Low (Favorites).

## T-085 Project Files — 8 October 2026

ตรวจโค้ด Files ที่มีอยู่เทียบ SRS §9.8/FR-28: quota/validation/download headers/P-06 ถูกต้อง. แก้: audit project_file_deleted/restored ใน transaction เดียว, ค้นหาหน่วง 300 ms, CSS ของ preview. เพิ่ม AT-36 (Viewer, quota boundary, type filter, ไฟล์ของงานที่ถูกลบซ่อน, P-06, 29/30 วัน, purge คืน quota/ลบ disk, audit) และ Chromium spec. ผล: Node 446/446 + frontend 44/44, Chromium 1/1, typecheck/lint/build/contract PASS. Contract/migration ไม่เปลี่ยน. Spec browser เดิมที่ใช้ป้ายไทยตอน login fail อยู่ก่อนแล้ว (แยกเป็นงาน). SQL Server 2022/Windows/UAT NOT_RUN. Evidence: TeamFlow_T085_Test_Report.md / reports/T-085-files-results.json. DONE6/91, IN_PROGRESS77, IN_REVIEW2, TODO6, remaining85. Declared Medium; actual model/effort NOT_VERIFIED. Next: T-088 Medium (Workload/Overview).

## T-084 Project Docs — 8 October 2026

ตรวจโค้ด Docs ที่มีอยู่ (migration 0007, sanitizer, service, 7 routes, UI) เทียบ SRS §9.7/§4.4: sanitizer และสิทธิ์ถูกต้อง. แก้: audit doc_deleted/doc_restored ใน transaction เดียว, editor เพิ่ม H3/Checklist/Table/Image จาก Files, CSS ของ Docs, bug แทรกรูปไม่ได้ขณะ dialog modal เปิด. เพิ่ม XSS corpus 47 vectors, AT-35 boundaries/concurrency/P-05/29-30 วัน/archived/audit, frontend snippet tests และ Chromium spec. ผล: Node 445/445 + frontend 44/44, Chromium 1/1, typecheck/lint/build/contract PASS. Contract/migration ไม่เปลี่ยน. SQL Server 2022/Windows/UAT NOT_RUN. Evidence: TeamFlow_T084_Test_Report.md / reports/T-084-docs-results.json. DONE6/91, IN_PROGRESS76, IN_REVIEW2, TODO7, remaining85. Declared High; actual model/effort NOT_VERIFIED. Next: T-085 Medium (Files, โค้ดมีแล้วรอตรวจรับ); T-086/T-087/T-089 รอเจ้าของรีวิว T-079.

## T-083 My overview + My work — 8 October 2026

ตรวจโค้ด T-083 ที่มีอยู่เทียบ AT-34 แล้วแก้: This week ไม่รวมวันนี้ให้ตรงกลุ่ม My work, Done 7 วันใช้วันที่ Bangkok, link widget/สถานะ/โปรเจกต์ส่งตัวกรองไป My work จริง (`myWorkFilters`), ตัวกรอง This week; ใส่ `test:addendum` เข้า `npm test`/lint และแก้เทส route count 63→77 ที่ fail ค้าง. ผล: addendum 5/5, Node 441/441 + frontend 42/42, Chromium 1/1, typecheck/lint/build/contract/test-plan PASS. Contract/migration ไม่เปลี่ยน. SQL Server 2022/Windows/UAT NOT_RUN. พบโค้ด T-084–T-087 ที่ยังไม่บันทึก ยังไม่ตรวจรับ. Evidence: TeamFlow_T083_Test_Report.md / reports/T-083-my-overview-results.json. DONE6/91, IN_PROGRESS75, IN_REVIEW2, TODO8, remaining85. Declared Medium; actual model/effort NOT_VERIFIED. Next: T-084 High (Docs, โค้ดมีแล้วรอตรวจรับ) หรือ T-085 Medium; T-086/T-087/T-089 รอเจ้าของรีวิว T-079.

## T-079–T-082 implementation + batch test T-078–T-082 — 8 October 2026

ทำตาม handoff: วาง mock T-079 (IN_REVIEW รอเจ้าของ), T-080 job titles, T-081 permission catalog/role manager/BR-22, T-082 Admin center + matrix. Contract 1.3.0 = 63 routes/93 schemas; migrations 0005/0006 ทั้ง SQLite และ SQL Server. ทดสอบรวมชุด: test-plan 17/17, contract 64/64, Node 436/436 + frontend 38/38 = 474/474, typecheck/lint/build PASS, migration fresh+upgrade SQLite PASS, browser mock 13 หน้า×3 ขนาด และ Admin center (preset/สรุป/409/375px/Settings) PASS. แก้ระหว่างทดสอบ 5 จุด (ดูรายงาน). SQL Server 2022/Windows/UAT/owner review NOT_RUN; ยังไม่ commit. Evidence: TeamFlow_T078_T082_Test_Report.md / reports/T-078-T-082-batch-results.json. DONE6/91, IN_PROGRESS74, IN_REVIEW2, TODO9, remaining85. Declared T-081 High อื่น Medium; actual model/effort NOT_VERIFIED. Next: T-083 Medium (My overview/My work) หลังเจ้าของรีวิว mock T-079.

## T-078 Monday-style addendum merge — 8 October 2026

เจ้าของอนุมัติ `TeamFlow_Requirements_Addendum_Monday_Draft.md` (8 ต.ค. 2026) ด้วยคำสั่งให้ทำ T-078 ต่อ: เพิ่ม Personal/Workspace/Admin แบบ monday, แยก job title ออกจากสิทธิ์, project role `manager` + permission checkbox รายคน P-01–P-10, Docs/Files/Workload/Overview/Favorites, Main table/side panel ใหม่ และ motion AN-01–AN-13. FR-46 Updates feed เลื่อนไปรอบถัดไป; exclusion เดิม (custom fields/status, dependencies, time tracking, automations, integrations, chat, real-time co-editing, email/AI) คงอยู่. เป็นการเปลี่ยนเอกสารเท่านั้น ยังไม่มี code/schema/API ของ addendum และ FR/AT ใหม่ทั้งหมด NOT_RUN. เพิ่ม T-079–T-091 (Phase 13), FR/NFR/BR/AT/Screen coverage และ TC-085–TC-099/UT-21–UT-23. Evidence: TeamFlow_T078_Addendum_Merge_Report.md

## Workspace typography/detail correction — 8 October 2026

Owner rejected workspace detail/font fidelity and asked whether modified Vibe mock CSS was applied. Actual @vibe/core4.5.34 was present, but mock minimal/colorful CSS had been separately translated into app overrides. Added workspace-theme.css imported directly by both preview adapter and actual main.tsx; shared font stack/scale/leading/weights plus mapped control/table/sidebar/drawer refinements. Corrected body13/18.85, heading20/28, task12/16.2 weight500, drawer title17, input13/label12, sidebar heading case/current project, Members alignment and group add/summary. Initial added browser check caught older drawer selector overriding17 with20; corrected specificity, final Chromium4/4 + frontend38/38/type/lint/build/preview build PASS. Evidence TeamFlow_UI_Workspace_Detail_Report.md / reports/UI-workspace-detail-results.json and actual1440x900 screenshot. No pixel-identity/human UAT claim; native controls and real admin/pagination/conflict behavior remain. Backend/contracts unchanged. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Declared Medium; actual model/effort NOT_VERIFIED; next owner visual review T055/T076 Medium; nativeSQL T006/T007 High when environment available.

## Native SQL foundation preparation — 8 October 2026

Owner asked to start T-006/T-007 High, then confirmed no isolated SQL server and requested test suite/runbook first. Added read-only preflight with explicit opt-in/test/provider/database guard, actual SQL2022/database identity, fixture permissions and separate SHOWPLAN readiness; driver errors remain redacted. Focused command runs13 native cases sequentially only after successful preflight. Readiness tests5/5, config43/43, schema13/13, typecheck and changed-file lint PASS. Current focused command correctly exits1 NOT_READY; native13SKIP/0executed, no acceptance claim. Runbook TeamFlow_SQLServer_Foundation_Runbook.md; evidence reports/sql-foundation-preparation-results.json. Both remain IN_PROGRESS. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Declared High; actual runtime model/effort NOT_VERIFIED. Next native T006/T007 High when owner provides isolated SQL2022; no server configuration/deploy/shared runtime changes.

## Password minimum correction — 8 October 2026

Owner authorizes minimum6 Unicode scalars (maximum128; no trim) and a new local test Admin password. Updated setup/own change/create/reset/recovery UI and server hashing policy; API1.2.1 regenerated (56routes/81schemas), SRS D-11 and Test Plan UT-04 aligned. CurrentPassword1–128, scrypt/cap/rate limits/session security unchanged. Full regression466/466(Node428+frontend38), final accounts19/19 and frontend38/38 PASS; type/lint/build/contract PASS. Local own-password API mutation PASS; fresh login PASS; previous password and session rejected. Credentials omitted from source/evidence. Report TeamFlow_Password_Policy_Report.md / reports/password-policy-results.json. T-013/T-014/T-015/T-016/T-019 remain IN_PROGRESS; SQLServer/Windows/UAT/browser matrix NOT_RUN. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Declared auth High; actual model/effort NOT_VERIFIED; next nativeSQL T006/T007 High.

## Login / logo / install / motion correction — 7 October 2026

Owner reported Login did not match the approved mock and requested a larger Friday wordmark, eye icon inside Password, polished install control and restored animations. Actual Login now follows V06 two-column340px form/lavender board layout; logo40px desktop/34px mobile and26px workspace, native vector mark; preview logo rebuilt too. Eye click/keyboard/containment, help modal Escape, invalid/valid actual login/logout, Install panel, normal motion and360px reduced-motion/no overflow verified. Type/lint/build/mock build PASS; frontend38/38 before final logo cosmetics; final Chromium4/4 plus focused screenshot1/1 PASS. Evidence TeamFlow_UI_Vibe_Login_Report.md / reports/UI-vibe-login-results.json. API/backend/migrations unchanged; full466 regression/native SQL/Windows/human UAT/OS PWA install NOT_RUN. No default credentials or demo bypass. Declared UI Medium; actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71; next owner review T055/T076 Medium; nativeSQL T006/T007 High.

## Approved design fidelity correction — 7 October 2026

Owner reported the real app did not match V06. Replaced old project list with card directory, restructured sidebar/deep links/project board/7-column groups/compact toolbar, added existing-API group edit and status grouping, fixed-footer590px Task drawer and Kanban card/toolbar/lane spacing. Final type/lint/build PASS; frontend38/38 and Chromium3/3 PASS with real API persistence,216px sidebar/38px rows/26px centered status/590px drawer, native drag320ms,360px menu/reduced-motion/CSP0errors. Manual desktop comparison against approved mock at same1440x900; different synthetic roles/data and actual admin/version/pagination controls mean no pixel-identity or human UAT claim. Evidence TeamFlow_UI_Vibe_Parity_Report.md / reports/UI-vibe-parity-results.json. Backend/contracts/migrations unchanged; full466 regression not rerun this correction. SQL Server/Windows/full browser matrix/human UAT NOT_RUN. Existing dependency audit62 and bundle warning remain open. Declared UI Medium; actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71; next owner review T055/T076 Medium; T006/T007 nativeSQL High.

## เพิ่ม Gantt และดีไซน์ตามคำสั่งเจ้าของ — 6 ตุลาคม 2026

เจ้าของเลือกปรับแผนและตัวอย่างดีไซน์ก่อน เพิ่ม Gantt เข้าเวอร์ชันแรก และใช้แนว Monday Project Management: sidebar, project header, view tabs Table/Gantt/Calendar/Kanban, grouped table, status สีพร้อมข้อความ, owner avatars และ task detail. ใช้ข้อมูล/สิทธิ์เดียวกันทุกมุมมอง; ไม่เพิ่ม AI/email/custom fields/dependencies/critical path/automatic scheduling. Mock ใช้ข้อมูลสมมติ ไม่ใช่ระบบบันทึกงานจริง. เพิ่มเกณฑ์ FR-25/T-046 High/AT-19/TC-049; ดีไซน์ Table อยู่ T-045 และ review T-055. API/schema เดิมใช้ start_date/due_date; หากภายหลังเปลี่ยน contract ต้องรัน checks ของ T-003.

## UI redesign mockup ก่อนแก้แอปจริง — 7 ตุลาคม 2026

เจ้าของขอปรับหน้าจอตั้งแต่ Login/Setup/forced password ถึง task creation/detail/views/collaboration/reports/notifications/team/project/user/trash/settings และเพิ่ม animation โดยให้ทำ HTML mockup อย่างละเอียดก่อน งานรอบนี้ใช้ `TeamFlow_UI_Redesign_Mockup.html` พร้อม screen/process guide และ `TeamFlow_UI_Redesign_Review.md`; เก็บ mock เดิมไว้ ไม่มีการแก้ frontend/backend/contracts หรือ deployment และยังไม่ถือว่าเจ้าของอนุมัติแบบใหม่สำหรับ implementation

Declared T-032/T-044/T-045/T-054/T-055 Medium; T-046/T-057 High. Actual selected model/effort NOT_VERIFIED; Node22.23.3 verified. Design review evidence อยู่ `reports/UI-redesign-preview-results.json` และ `reports/UI-redesign-*.png`; formal TC/AT/SQL2022/Windows/UAT ไม่ถูกปิดจาก preview. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next หลัง owner รีวิว: React auth/shell/task UI Medium, Gantt/dirty-offline behavior High ตาม parent tasks.

Preview V02 verification: 21/21 distinct mock-only cases PASS หลัง targeted repairs; Chromium153.0.8010.12; main screens 360/768/1440px + keyboard/reduced-motion + synthetic task/process flows. Raw failures and runner corrections retained as `reports/UI-redesign-preview-raw-*.json`; details in review document. `check:test-plan` inventory/dependencies PASS only; 143 formal items/final/production NOT_RUN. ไม่มี application UI redesign implementation หรือ feature acceptance ถูกปิด; task counts/statuses unchanged.


Preview V03 follow-up: owner requested separate Start Plan/End Plan, task Card add/delete, top-right Notify and Monday-style New Group from attached reference. Standalone HTML now supports named/color Groups, empty Groups, create/edit/collapse/filter, per-Group task creation and moving tasks without changing status. Group is mock-only design proposal: persistence/schema/API/ordering/permission/migration decisions require review before app implementation; existing wire contract unchanged. Cumulative41/41 focused browser checks PASS, HTML syntax/check:test-plan PASS; legacy M01–M21 NOT_RUN on V03. Evidence TeamFlow_UI_Redesign_Review.md / reports/UI-redesign-v03-results.json / UI-redesign-v03-*.jpg. No feature sign-off/status changes; DONE6/77, IN_PROGRESS71, TODO0, remaining71. Declared parent effort T032/T044/T045/T054/T055 Medium; T046/T057 High; actual runtime model/effort NOT_VERIFIED. Next owner design review; implementation T045 Medium, responsive/accessibility T057 High.

Preview V04 owner decision: use Monday Vibe (`@vibe/core@4.5.34`, React19.3.0), isolated pinned package/lockfile and single-file `TeamFlow_UI_Vibe_Preview.html`. Actual Vibe Button/Dropdown/TextField/DatePicker/Avatar/LayerProvider tokens integrated in preview only; source sidebar also redesigned per owner feedback with Thai sections, clear active/aria-current, project/team labels, role menu and mobile focus/backdrop/Escape/inert behavior. Cumulative74/74 focused checks PASS (43 earlier +27 lifecycle/menu +3 final CSS checks +1 final navigation check; not full final-SHA rerun); strictTS/build/HTMLsyntax/check:test-plan PASS_PLAN_ONLY; final scoped browser error/warn0. Historical errors/repairs retained. Evidence TeamFlow_UI_Redesign_Review.md / reports/UI-vibe-v04-results.json / design-preview/vibe/bundle-report.json. Preview dependency audit remains OPEN53Moderate/6High/0Critical; six High tooling packages absent from browser bundle, not production security acceptance. Root app/API/contracts/runtime/deployment unchanged; Group persistence review and React/API integration/formal TC-AT/SQL2022/Windows/UAT NOT_RUN. No status closure: DONE6/77, IN_PROGRESS71, TODO0, remaining71. Declared T045 Medium/T057 High; actual model/effort NOT_VERIFIED. Next owner mock review then React UI T045 Medium/accessibility T057 High.

Preview V05 owner decision: English as the base UI language and a compact Minimal style. `design-preview/vibe/english-copy.json` translates597 static copy entries at build time; HTML lang=en and date display en-GB, while date-only storage/Asia-Bangkok semantics and user-entered Unicode remain unchanged. Body13px/menu12px/heading20px, sidebar216px, actual Vibe small fields32px, table rows38px and drawer590px; neutral surfaces, subtle borders/pastel status labels and less spacing/decorative shadow. Cumulative33/33 focused browser checks PASS after sizing/timing repairs (32 earlier +1 final active-menu check, not full final-SHA rerun); strictTS/build/HTMLsyntax PASS; browser error/warn0. Evidence reports/UI-vibe-v05-results.json and UI-vibe-v05-*.jpg. V04 results are historical, not rerun for V05. Production UI/requirements language alignment and formal TC-AT/SQL2022/Windows/UAT/security acceptance remain pending; prior dependency audit stays OPEN. No task closed: DONE6/77, IN_PROGRESS71, TODO0, remaining71. Declared T045/T055 Medium, T057 High; actual model/effort NOT_VERIFIED. Next owner mock review, then production React UI T045 Medium/accessibility T057 High.

Preview V06 owner decision: retain V05 compact layout and English base; restore richer color/motion from the earlier preview and refine typography. Added colorful.css after minimal.css with navy navigation, lavender login decoration, tilted demo board, floating completion card, vivid labelled status colors and gentle card lift. Corrected Vibe Avatar initials independently from customSize:10px text/24px circle; approved body13/heading20/sidebar216/table38/fields32px retained. Focused10/10 browser checks PASS on final HTML; strictTS/build/HTMLsyntax PASS; scoped browser error/warn0. Evidence reports/UI-vibe-v06-results.json and UI-vibe-v06-login.jpg/board.jpg. System font fallbacks used; OS reduced-motion not emulated this round, existing support retained. V05 full suite/formal acceptance NOT_RUN on V06. Mock-only cosmetic effort Low/Light; actual model/effort NOT_VERIFIED. No tasks closed: DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner mock review then T045 Medium/T057 High.


V06 parameter typography follow-up: owner screenshot showed inconsistent field values/dropdown labels. Actual nested Vibe Typography/TextField retained14px despite smaller wrappers. colorful.css now applies13px to actual TextField values, form combobox text descendants and option text (including dialog/body portals), with consistent family/weight/spacing. Seven focused checks PASS on current SHA: inputs/5 selected values/5 Assignee options,590px drawer/32px fields, selection-to-native assignee=1,360px no document overflow, scoped browser error/warn0; build/script syntax PASS. Evidence reports/UI-vibe-v06-parameter-font-results.json, values.json and parameter-font.jpg. Earlier V06 full checks not rerun on this SHA; formal acceptance NOT_RUN. Cosmetic declared Low/Light, actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner preview review then T045 Medium/T055 Medium.


V06 Kanban motion follow-up: added preview-only FLIP animation after successful changeStatus validation (shared dropdown and native drag/drop path). Moved card320ms, neighbouring cards220ms, ease-out; transient lifted shadow, final transform cleared, status combobox focus restored. Animation off/OS reduced-motion gates and cancellation retained. Browser7/7 focused checks PASS: moving→settled, neighbours, focus, motion-off, incomplete Checklist guard,360px move/no document overflow and scoped error/warn0; build/strictTS/script syntax PASS. Native drag gesture and OS motion emulation NOT_RUN; existing shared hook inspected, not claimed as drag browser execution. Evidence reports/UI-vibe-v06-kanban-motion-results.json and kanban-motion.jpg. Mock only; actual app/contracts unchanged. Declared cosmetic Low/Light; actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner mock review then T045 Medium/T055 Medium.


V06 card assignee spacing follow-up: replaced Kanban assignee row space-between with explicit card-assignee flex-start; avatar precedes name with7px gap. Build PASS; browser10/10 cards have7px gaps at1440 and360px, including Unassigned;360px no document overflow. Evidence reports/UI-vibe-v06-card-assignee.jpg. Mock-only cosmetic Low/Light; actual model/effort NOT_VERIFIED; no feature sign-off. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next T045 Medium.


V06 owner assignment/status follow-up: Task supports multiple Assignees in real Vibe multi Dropdown (unique native selectedOptions/FormData); all avatars/names appear in Table/Kanban, My work/person filtering/workload/Gantt/CSV use assignee collection in mock. Checklist rows have independent single-person Dropdown, save/reopen retains choices; eligible sample project members active only, no new project rights. Table status now26px inline Dropdown instead of large status dialog;38px rows retained. Requirements1.7/SRS1.8 record owner superseding FR13/FR15; production contracts/migrations/notifications/withdrawal rules require follow-up review and implementation, not closed by preview. Build/strictTS/script syntax PASS; scoped browser error/warn0. Focused10 cases PASS: multi select bridge; save/reopen/Table2avatars; clear-all save/reopen; Kanban2avatars/names; Checklist2 separate saved assignees; Viewer disabled; mobile360 no overflow;26px status/38px row; inline status change without modal; scoped logs0. Tests of secondary-assignee filtering/workload/CSV/recurrence/OS/native drag NOT_RUN this round. Evidence reports/UI-vibe-v06-assignment-results.json and multi-assignees/checklist-assignees/inline-status.jpg. Actual model/effort NOT_VERIFIED; declared feature proposal Medium. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next contract/schema impact review High; UI integration Medium after review.


V06 status paint cleanup: owner asked to remove dropdown chevron/white trailing segment. Scoped status-picker CSS hides its secondary toggle, fills a single26px color bar with centered text/4px corners and7px horizontal margins;38px table row preserved. Combo retains click/keyboard semantics/focus-visible outline. Build PASS; browser final styling verified chevron display:none/centered content/26px bar/38px row; prior click-to-open and change to Working on it PASS before final cosmetic height/centering adjustment. Evidence reports/UI-vibe-v06-status-clean.jpg and status-clean-detail.jpg. No app change; Low/Light declared, actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner preview review; contract/schema impact High before production multi-assignee integration.


V06 status centering correction: Vibe selectedItem retained32px height inside26px bar, putting text3px above center. Enforced26px height/flex centering on selected value wrappers. Build PASS; measured all10 labels: vertical center delta0px and horizontal delta≤0.004px at1440px. Evidence reports/UI-vibe-v06-status-centered.jpg. Mock-only Low/Light, actual model/effort NOT_VERIFIED. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next owner review; contract/schema impact High.

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

การยืนยัน baseline ไม่ใช่ผลทดสอบระบบ สถานะปัจจุบัน: T-001/T-002 DONE ด้านเอกสาร และ T-003 DONE เฉพาะ API contract/schema tests และ T-004 DONE เฉพาะ test/release plan validation ตามหลักฐานใน Task Register; application/ฐานข้อมูล/Windows/UAT และ TC/AT เต็มกรณียัง NOT_RUN **ชื่อไฟล์คงเดิมเพื่อรักษา references; ให้ดู version 1.40 ในส่วนหัวเป็นรุ่นเนื้อหาปัจจุบัน**


## 1. ขอบเขตและกติกาการใช้

ใช้สำหรับ Web App ภายในองค์กรเดียว หลายทีม ประมาณ 30 คน มี Kanban ลากวาง ไม่มีอีเมล ไม่มี AI เน้นเครื่องมือไม่มีค่าสมาชิกบังคับ ผู้ใช้นำ source code ไป deploy บน Windows Server/domain เอง การแตกงานครั้งนี้เป็นเอกสารเท่านั้น ไม่ใช่คำสั่งเริ่มพัฒนาหรือเผยแพร่ระบบ

งานที่เขียนหรือทดลองไว้ก่อนสร้าง SRS **ไม่ถือว่าผ่าน Task ใดโดยอัตโนมัติ** ต้องเทียบ approved baseline และทดสอบใหม่ตามเกณฑ์ที่เกี่ยวข้อง

- Requirements คือเป้าหมายธุรกิจ; SRS คือพฤติกรรมที่ต้องทำ; Task.md คือรายการลงมือและวิธีตรวจ ไม่แก้ขอบเขตต้นทางโดยเงียบ ๆ
- Baseline 1.1/SQL Server 2022 ยืนยันแล้ว; T-001/T-002 เป็น DONE ด้านเอกสาร; dependency ของ coding/test ยังต้องทำตามจริง
- R-01–R-04 ปิดแล้วด้วย decision ข้างต้น; issue ใหม่ให้บันทึก changeimpact ไม่เปิด permissionflow ซ้ำสำหรับเรื่องที่ยืนยันแล้ว
- แยกงาน backend, frontend และ tests ให้ครบ ฟีเจอร์ไม่เสร็จเพียงเพราะหน้าจอแสดงได้หรือ API ทำงานเมื่อใช้ Admin เท่านั้น
- ลำดับ dependency เป็นข้อกำหนดก่อนเริ่ม ไม่ใช่คำสั่งให้สร้างงานเรียงทีละบรรทัดทุกงาน; งานอิสระทำพร้อมกันได้หลัง dependency ผ่าน
- ไม่มี timeline/ชั่วโมงที่ยืนยัน: stack ยืนยันแล้ว แต่ต้องตรวจความพร้อมของสภาพแวดล้อมและรายละเอียดงานก่อนประเมิน ไม่คำนวณความคืบหน้าเป็นเปอร์เซ็นต์จากจำนวน checkbox เพราะงานมีขนาดต่างกัน

### สถานะที่ใช้

| Status | ความหมาย |
|---|---|
| TODO | ยังไม่เริ่ม (backlog); ดู readiness/dependencies แยกก่อนเริ่ม |
| BLOCKED | ติด decision/dependency/environment; ระบุสาเหตุและสิ่งที่ปลดได้ |
| IN_PROGRESS | มีการลงมือและระบุ owner |
| IN_REVIEW | implementation เสร็จ อยู่ระหว่างตรวจหลักฐาน/ผลทดสอบ |
| DONE | checklist + เกณฑ์รับงาน + หลักฐานที่เกี่ยวข้องผ่าน |
| DEFERRED | เจ้าของ scope ย้ายออกจากรุ่นนี้และแก้ Requirements/SRS แล้ว ไม่ใช้เพื่อซ่อนงานตกหล่น |

T-001/T-002 DONE ด้าน baseline;งานที่เหลือ TODO และ BLOCKED เฉพาะ dependency/environment ที่ยังไม่พร้อม ไม่ถือว่า coding/test ผ่านจากการยืนยัน scope

### Definition of Done ต่อ Task

- [ ] ขอบเขตใน checklist ครบตาม baseline และ API/permission/data contract ตรงกัน
- [ ] มีผลตรวจเฉพาะความเสี่ยงของงาน เช่นสิทธิ์ transaction concurrency หรือ interaction ไม่เพิ่ม tests ที่ไม่จำเป็น
- [ ] เรียกผ่านผู้ใช้ที่มี/ไม่มีสิทธิ์ได้ผลถูก ไม่ใช้ frontend hiding เป็น security
- [ ] loading/empty/error/offline/archived/dirty/conflict ที่เกี่ยวข้องมีทางจัดการ
- [ ] บันทึกไฟล์/commit/คำสั่งตรวจ/ผลทดสอบ และ known limitations โดยไม่ใส่ secret
- [ ] อัปเดต task register และ coverage ที่ได้รับผล ไม่เปลี่ยน DONE ให้กับงานทดสอบที่ยัง NOT_RUN

## 2. Decision Log — ประเด็นเดิมปิดแล้ว

| Issue | คำตอบที่ยืนยัน | Status |
|---|---|---|
| R-01 | Checklist ครบแล้วผู้ใช้กด done เอง ไม่ auto | RESOLVED |
| R-02 | Project archive; task soft delete/restore30 วัน ไม่มี taskarchive แยก | RESOLVED |
| R-03 | Attachmentsoftdelete30 วันและนับ quota จน purge;คืนผ่าน authorizedrestoreendpoint | RESOLVED |
| R-04 | Recurrencetombstone เป็น IDsnapshot ไม่มี FK ถึง task ที่ purge | RESOLVED |

SQL Server2022 ยืนยันแล้ว; Edition/build/connection details/service permissions เป็น deployment checklist; T-003 ยืนยัน API/DTO ที่ปรับและ T-005 ล็อก package versions

## 3. ลำดับและจุดตรวจผ่าน

| Gate | สิ่งที่ต้องผ่านก่อนขยับ | หลักฐาน |
|---|---|---|
| G0 เริ่มพัฒนา | T-001–T-004 | baseline/decision/API/test manifest |
| G1 เปิดข้อมูลให้สมาชิก | foundation + auth + ACL/teams/projects | negative permission tests, session tests; ห้ามใช้ mock auth เป็นระบบจริง |
| G2 ปิดงานและใช้ Kanban | task lifecycle/recurrence/atomic move | AT-09–AT-18 โดยเฉพาะ duplicate/409/rollback |
| G3 ใช้ร่วมทีม | files/comments/notifications/refresh/reports/PWA | AT-19–AT-24/AT-26 + scope/cache evidence |
| G4 ส่ง source | QA/security/backup/performance/UAT/packaging | FR/NFR/BR/AT coverage, fresh unzip, known blockers |
| G5 พร้อมใช้ Server จริง | Windows fresh install/HTTPS/service/backup + ผู้ใช้ UAT | ผลบน environment จริง; ถ้าไม่มีให้ระบุยังไม่ผ่าน ไม่อ้าง production-ready |

G5 เป็นรายการให้ผู้ใช้ตรวจเมื่อ deploy เอง ไม่อนุญาตให้ผู้พัฒนาไปแก้ DNS หรือ Server โดยอัตโนมัติ

## 4. Task Register

### กฎการใช้ token และการรายงานผล

ใช้กับทุก Task ตามคำขอเจ้าของระบบ:

- ตอบภาษาไทยให้กระชับ ชัดเจน และตรงประเด็น รายละเอียดเพิ่มเติมอธิบายเมื่อผู้ใช้ถาม
- ก่อนเริ่มแต่ละ Task แจ้ง effort ที่กำหนด และระบุ effort ของงานถัดไปเมื่อส่งต่อ; แยกค่าที่กำหนดจาก runtime setting จริงที่ตรวจไม่ได้
- ระหว่างทำงานแจ้งเฉพาะความคืบหน้าที่สำคัญ ปัญหาที่มีผลต่อการตัดสินใจ หรือการเปลี่ยนแนวทาง; ไม่บรรยายทุกคำสั่ง
- รายงานจบ Task ประมาณ 3–5 บรรทัด: งานที่เสร็จ, ผลตรวจ/ทดสอบ, ปัญหาค้าง และงานถัดไปพร้อม effort; เพิ่มจำนวนเสร็จแล้ว/ทั้งหมด/คงเหลือจากTask Registerทุกครั้ง ใช้ลิงก์ไฟล์เมื่อจำเป็น
- ไม่ทวน requirements/แผนเดิม ไม่แสดง code, diff, logs หรือ stack trace ยาวในคำตอบ เว้นแต่ผู้ใช้ขอหรือจำเป็นต้องตัดสินใจ
- ค้นหาและอ่านเฉพาะไฟล์/ช่วงที่เกี่ยวข้อง ใช้ข้อมูลที่ตรวจแล้วซ้ำเมื่อยังเป็นรุ่นปัจจุบัน; อ่านใหม่เมื่อมีการเปลี่ยนแปลงหรือข้อมูลไม่พอ
- จำกัด output ของเครื่องมือให้พอตรวจผล เก็บหลักฐานที่จำเป็นใน Task Register หรือรายงานทดสอบ แทนการคัดลอกทั้งหมดลงแชต
- ไม่รันการตรวจเดิมซ้ำหลังผ่านแล้ว เว้นแต่มีการแก้ไข ความล้มเหลว หรือข้อสงสัยใหม่ที่เกี่ยวข้อง
- ใช้ model/effort ตาม Task ไม่เพิ่มโดยไม่มีเหตุผล และไม่เรียกงานเพิ่มนอกขอบเขตเพื่อเติมคำตอบ
- ความกระชับไม่ลดคุณภาพงาน: ต้องตรวจสิทธิ์, transaction, acceptance และ tests ที่เกี่ยวข้องให้ครบ; รายงาน FAIL/BLOCKED/NOT_RUN และข้อจำกัดสำคัญอย่างตรงไปตรงมา

### ค่าเริ่มต้น Model / Effort สำหรับผู้พัฒนา

- **Default model:** GPT-6.1 Sol (`gpt-6.1-sol`)
- **Default reasoning effort:** Medium (`medium`)
- **Default speed:** Standard
- ใช้ High (`high`) สำหรับ Tasks ที่ระบุใน Task Register และรายละเอียดงาน; งานอื่นใช้ Medium ตาม default
- ตารางนี้เป็นคำแนะนำสำหรับโปรเจกต์ ไม่ใช่การรับรองว่า effort ใดทำให้ผ่าน test หรือเสร็จภายในเวลาที่กำหนด
- ค่าใน Markdown ไม่เปลี่ยน model/effort ในแอปหรือ CLI อัตโนมัติ ผู้พัฒนาต้องเลือกค่าก่อนเริ่ม Task; หากเปลี่ยน Task ภายใน session เดียว ให้ตรวจค่าที่ใช้อีกครั้ง
- ถ้า High ยังแก้ปัญหาซับซ้อนไม่จบ ให้ระบุสิ่งที่ลอง/ผลตรวจ แล้วเพิ่ม Extra High เฉพาะงานนั้น; ไม่ใช้ Max/Ultra เป็น default
- งานแก้ข้อความ/สี/ระยะห่างเล็กน้อยภายใน Task สามารถใช้ Low/Light ได้ แต่ก่อนปิด Task ให้ใช้ effort ที่ระบุเพื่อตรวจ business rules และหลักฐานที่เกี่ยวข้อง
- ไม่สลับไป Luna อัตโนมัติ หากเลือก Luna สำหรับงานย่อยที่ขอบเขตชัด ให้ใช้ High และยังต้องตรวจตาม acceptance ของ Task เดิม
- T-001/T-002 ปิดงานเอกสารแล้ว ค่า effort ที่เพิ่มเป็นแนวทางหากต้องแก้ไขต่อ ไม่ได้เปิดสถานะงานใหม่


เพิ่ม Owner / Status / Evidence / Blocker ในแถวของงานเมื่อเริ่มดำเนินการ; initial owner เป็น “ยังไม่มอบหมาย” ไม่เดาว่าใครทำ

| Task | งาน | Depends on | Effort | Status | Owner | Evidence / Blocker |
|---|---|---|---|---|---|---|
| T-001 | ล็อกขอบเขตและค่าที่ใช้พัฒนา | — | Medium | DONE | เจ้าของระบบ/ผู้จัดทำเอกสาร | คำยืนยันของเจ้าของระบบในบทสนทนา; Baseline1.1 |
| T-002 | ปิดจุดกำกวมระหว่าง Requirements กับ SRS | T-001 | Medium | DONE | ผู้จัดทำเอกสาร | R-01–R-04 resolved; Requirements/SRS1.1 |
| T-003 | จัด API/DTO และ error contract ให้เป็นสัญญาเดียว | T-001, T-002 | High | DONE | Codex | TeamFlow_API_Contract.md; contracts/openapi.json; TeamFlow_T003_Test_Report.md; reports/T-003-contract-results.json: 52routes/75schemas + 61/61contract tests PASS; HTTP/DB/AT/TC NOT_RUN |
| T-004 | จัด test plan และเกณฑ์ release | T-003 | Medium | DONE | Codex | TeamFlow_Test_Release_Manifest.md; tests/test-manifest.json; TeamFlow_T004_Test_Report.md; reports/T-004-plan-results.json: inventories/coverage/dependencies PASS + 17/17policy tests PASS; full application results NOT_RUN |
| T-005 | โครงสร้างโปรเจกต์และชุดคำสั่งพื้นฐาน | T-003, T-004 | Medium | DONE | Codex | Node22.23.3/React/Vite/Express/TS; adapters/migrations/harness separated; 84/84combined tests + 1browser smoke PASS; fresh copy ci/build/migrate/seed/start PASS; TeamFlow_T005_Test_Report.md; reports/T-005-foundation-results.json; actualSQL2022/Windows NOT_RUN |
| T-006 | Configuration และ startup validation | T-005 | High | IN_PROGRESS | Codex | Local/config/startup/guard evidence: TeamFlow_T006_Test_Report.md; SQL2022 real guard NOT_RUN; no SQL/Windows/AT sign-off |
| T-007 | Schema และ migrations ครบทุก entity | T-005, T-002 | High | IN_PROGRESS | Codex | SQLite schema/migration/atomic-effects evidence: TeamFlow_T007_Test_Report.md; SQL2022 apply/trusted constraints/query plans NOT_RUN |
| T-008 | Transaction, date และ lifecycle helpers | T-007, T-003 | High | IN_PROGRESS | Codex | TeamFlow_T008_Test_Report.md; reports/T-008-helper-results.json: helpers25/25 + combined174/174 PASS; SRS5.2 local work; SQL2022/feature wiring NOT_RUN |
| T-009 | API middleware และ validation | T-006, T-003 | High | IN_PROGRESS | Codex | TeamFlow_T009_Test_Report.md; reports/T-009-api-results.json: API12/12 + combined186/186 + browser5/5 + fresh source/runtime install PASS; real session/ACL/SQL/TLS NOT_RUN |
| T-010 | Idempotency สำหรับคำสั่งสร้างและย้ายบอร์ด | T-007, T-009, T-008 | High | IN_PROGRESS | Codex | TeamFlow_T010_Test_Report.md; reports/T-010-idempotency-results.json: local13 + combined199 PASS; SQL28SKIP/NOT_RUN; real auth/features/scheduler pending |
| T-011 | Authorization service และ query scoping | T-007, T-009 | High | IN_PROGRESS | Codex | TeamFlow_T011_Test_Report.md; reports/T-011-authorization-results.json: authorization14 + combined213 PASS; SQL38SKIP/NOT_RUN; real login/cookie/feature/SQL integration pending |
| T-012 | Frontend shell, navigation และสถานะร่วม | T-005, T-003 | Medium | DONE | Codex | TeamFlow_T012_Test_Report.md; reports/T-012-shell-results.json: frontend16/16 + Chromium5/5 + HTTP1/1 PASS; synthetic Self navigation, real auth/ACL/matrix NOT_RUN |
| T-013 | First-run setup API และหน้าจอ | T-007, T-009, T-012 | High | IN_PROGRESS | Codex | TeamFlow_T013_Test_Report.md; reports/T-013-setup-results.json; setup17 + combined233 + Chromium7 + fresh source/runtime install PASS; SQL46SKIP/NOT_RUN; full SQL/Windows/browser matrix/auth acceptance pending |
| T-014 | Password hashing, login และ session | T-011, T-006, T-008 | High | IN_PROGRESS | Codex | TeamFlow_T014_Test_Report.md; reports/T-014-session-results.json; sessions19 + combined252 + Chromium9 + fresh source/runtime install PASS; SQL56SKIP/NOT_RUN; native SQL/HTTPS/Windows/login UI/full acceptance pending ; Login/logo/install/motion follow-up TeamFlow_UI_Vibe_Login_Report.md / reports/UI-vibe-login-results.json; local UI verified, formal acceptance pending |
| T-015 | เปลี่ยนรหัสและ forced password gate | T-014 | High | IN_PROGRESS | Codex | TeamFlow_T015_T018_Test_Report.md; accounts19 + combined273 + Chromium14 PASS; own password/reset/rotation/gate verified locally; native SQL/HTTPS/Windows/full acceptance pending |
| T-016 | Admin users API และ last-admin guard | T-015, T-011 | High | IN_PROGRESS | Codex | TeamFlow_T015_T018_Test_Report.md; accounts19 + combined273 + Chromium14 PASS; CRUD/last-admin two-process/unassign atomic fixtures verified locally; SQL/T-022/T-027 cleanup+recurrence integration pending |
| T-017 | Login, logout, profile และเปลี่ยนรหัส UI | T-012, T-013, T-015 | Medium | IN_PROGRESS | Codex | TeamFlow_T015_T018_Test_Report.md; accounts19 + combined273 + Chromium14 PASS; actual login/forced-change/profile/logout/cross-tab/activity verified; real task feature/T-068/full browser matrix pending |
| T-018 | Admin user management UI | T-017, T-016 | Medium | IN_PROGRESS | Codex | TeamFlow_T015_T018_Test_Report.md; accounts19 + combined273 + Chromium14 PASS; actual Admin create/edit/active/reset/search/page/conflict verified; native provider/T-068/full matrix pending |
| T-019 | CLI กู้ Admin และบังคับออกจากระบบ | T-016 | High | IN_PROGRESS | Codex | TeamFlow_T019_Test_Report.md; local CLI15 + combined288 PASS; compiled/POSIX hidden terminal/filesystem/audit/revoke verified; native SQL/Windows/AT-28 pending |
| T-020 | Team CRUD/archive และสมาชิกหลายทีม | T-016, T-011, T-008 | High | IN_PROGRESS | Codex | TeamFlow_T020_T024_Test_Report.md; local batch5/5 implemented/verified, workspaces17 + combined305 + Chromium17 PASS; real SQL89SKIP/Windows/full TC-AT NOT_RUN; cleanup/recurrence/download feature acceptance still partial |
| T-021 | Project CRUD/archive และ membership ข้ามทีม | T-020, T-011 | High | IN_PROGRESS | Codex | TeamFlow_T020_T024_Test_Report.md; local batch5/5 implemented/verified, workspaces17 + combined305 + Chromium17 PASS; real SQL89SKIP/Windows/full TC-AT NOT_RUN; cleanup/recurrence/download feature acceptance still partial |
| T-022 | ถอนสิทธิ์ ปิดบัญชี และ cleanup assignee | T-021, T-016, T-008 | High | IN_PROGRESS | Codex | TeamFlow_T020_T024_Test_Report.md; local batch5/5 implemented/verified, workspaces17 + combined305 + Chromium17 PASS; real SQL89SKIP/Windows/full TC-AT NOT_RUN; cleanup/recurrence/download feature acceptance still partial |
| T-023 | หน้าทีมและแต่งตั้ง Lead | T-020, T-017 | Medium | IN_PROGRESS | Codex | TeamFlow_T020_T024_Test_Report.md; local batch5/5 implemented/verified, workspaces17 + combined305 + Chromium17 PASS; real SQL89SKIP/Windows/full TC-AT NOT_RUN; cleanup/recurrence/download feature acceptance still partial |
| T-024 | หน้าโปรเจกต์และ Editor/Viewer picker | T-021, T-023, T-022 | Medium | IN_PROGRESS | Codex | TeamFlow_T020_T024_Test_Report.md; local batch5/5 implemented/verified, workspaces17 + combined305 + Chromium17 PASS; real SQL89SKIP/Windows/full TC-AT NOT_RUN; cleanup/recurrence/download feature acceptance still partial |
| T-025 | ชื่อองค์กรและ settings | T-013, T-016, T-017 | Medium | IN_PROGRESS | Codex | TeamFlow_T025_T029_Test_Report.md; tasks26 + combined331 PASS; local SQLite scope verified; real SQL2022/Windows/full TC-AT pending |
| T-026 | Task create/read/update และ validation | T-021, T-010, T-008, T-022 | High | IN_PROGRESS | Codex | TeamFlow_T025_T029_Test_Report.md; tasks26 + combined331 PASS; local SQLite scope verified; real SQL2022/Windows/full TC-AT pending |
| T-027 | Status transitions และ completion | T-026 | High | IN_PROGRESS | Codex | TeamFlow_T025_T029_Test_Report.md; tasks26 + combined331 PASS; local SQLite scope verified; real SQL2022/Windows/full TC-AT pending |
| T-028 | Checklist API และ parent guard | T-027 | High | IN_PROGRESS | Codex | TeamFlow_T025_T029_Test_Report.md; tasks26 + combined331 PASS; local SQLite scope verified; real SQL2022/Windows/full TC-AT pending |
| T-029 | Recurring series และ monthly anchor | T-027, T-028, T-010, T-002 | High | IN_PROGRESS | Codex | TeamFlow_T025_T029_Test_Report.md; tasks26 + combined331 PASS; local SQLite scope verified; real SQL2022/Windows/full TC-AT pending |
| T-030 | Soft delete/restore และการคง series | T-026, T-029, T-002 | High | IN_PROGRESS | Codex | TeamFlow_T030_T034_Test_Report.md; local18 + combined349 + Chromium22 + fresh349 PASS; SQL120 SKIP/Windows/full TC-AT NOT_RUN |
| T-031 | Task query/search/filter/sort และ pagination | T-026, T-011 | High | IN_PROGRESS | Codex | TeamFlow_T030_T034_Test_Report.md; local18 + combined349 + Chromium22 + fresh349 PASS; SQL120 SKIP/Windows/full TC-AT NOT_RUN |
| T-032 | Task form/detail และ save conflict UX | T-026, T-027, T-017, T-024 | Medium | IN_PROGRESS | Codex | TeamFlow_T030_T034_Test_Report.md; local18 + combined349 + Chromium22 + fresh349 PASS; SQL120 SKIP/Windows/full TC-AT NOT_RUN; actual Vibe integration: TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json; local UI/API verified, full acceptance pending |
| T-033 | Checklist/recurrence/trash UI | T-032, T-028, T-029, T-030 | Medium | IN_PROGRESS | Codex | TeamFlow_T030_T034_Test_Report.md; local18 + combined349 + Chromium22 + fresh349 PASS; SQL120 SKIP/Windows/full TC-AT NOT_RUN |
| T-034 | Board read และ column versions | T-027, T-030, T-007 | High | IN_PROGRESS | Codex | TeamFlow_T030_T034_Test_Report.md; local18 + combined349 + Chromium22 + fresh349 PASS; SQL120 SKIP/Windows/full TC-AT NOT_RUN |
| T-035 | Atomic board move/reorder endpoint | T-034, T-029, T-010 | High | IN_PROGRESS | Codex | TeamFlow_T035_T039_Test_Report.md; local15 + combined364 + Chromium28/affected6 + fresh364 PASS; SQL130SKIP/Windows/full TC-AT NOT_RUN |
| T-036 | Kanban layout และ Drag & Drop | T-035, T-032 | Medium | IN_PROGRESS | Codex | TeamFlow_T035_T039_Test_Report.md; local15 + combined364 + Chromium28/affected6 + fresh364 PASS; SQL130SKIP/Windows/full TC-AT NOT_RUN |
| T-037 | Keyboard/touch actions และ filtered-board guard | T-036, T-031 | Medium | IN_PROGRESS | Codex | TeamFlow_T035_T039_Test_Report.md; local15 + combined364 + Chromium28/affected6 + fresh364 PASS; SQL130SKIP/Windows/full TC-AT NOT_RUN |
| T-038 | Kanban rollback และ conflict recovery | T-037 | High | IN_PROGRESS | Codex | TeamFlow_T035_T039_Test_Report.md; local15 + combined364 + Chromium28/affected6 + fresh364 PASS; SQL130SKIP/Windows/full TC-AT NOT_RUN |
| T-039 | Comments API และ append-only rules | T-026, T-010, T-011 | Medium | IN_PROGRESS | Codex | TeamFlow_T035_T039_Test_Report.md; local15 + combined364 + Chromium28/affected6 + fresh364 PASS; SQL130SKIP/Windows/full TC-AT NOT_RUN |
| T-040 | Task events และ Admin audit | T-027, T-016, T-021, T-030, T-039 | High | IN_PROGRESS | Codex | Local implementation/evidence: TeamFlow_T040_T044_Test_Report.md; SQLite/filesystem/HTTP/Chromium; SQL2022/Windows/full TC-AT/UAT NOT_RUN |
| T-041 | Multipart upload และ file validation | T-026, T-006, T-002 | High | IN_PROGRESS | Codex | Local implementation/evidence: TeamFlow_T040_T044_Test_Report.md; SQLite/filesystem/HTTP/Chromium; SQL2022/Windows/full TC-AT/UAT NOT_RUN |
| T-042 | Upload quota reservation และ cleanup | T-041, T-007 | High | IN_PROGRESS | Codex | Local implementation/evidence: TeamFlow_T040_T044_Test_Report.md; SQLite/filesystem/HTTP/Chromium; SQL2022/Windows/full TC-AT/UAT NOT_RUN |
| T-043 | Authorized download และ file delete | T-042, T-011, T-040 | High | IN_PROGRESS | Codex | Local implementation/evidence: TeamFlow_T040_T044_Test_Report.md; SQLite/filesystem/HTTP/Chromium; SQL2022/Windows/full TC-AT/UAT NOT_RUN |
| T-044 | Comments/files/history panels | T-032, T-039, T-040, T-043 | Medium | IN_PROGRESS | Codex | Local implementation/evidence: TeamFlow_T040_T044_Test_Report.md; SQLite/filesystem/HTTP/Chromium; SQL2022/Windows/full TC-AT/UAT NOT_RUN; actual Vibe integration: TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json; local UI/API verified, full acceptance pending |
| T-045 | งานของฉันและ task list UI | T-031, T-032, T-033 | Medium | IN_PROGRESS | Codex | TeamFlow_T045_T049_Test_Report.md; local backend14/all407/Chromium37 after focused recheck PASS; SQL152SKIP/Windows/full TC-AT NOT_RUN; actual Vibe integration: TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json; local UI/API verified, full acceptance pending ; fidelity correction TeamFlow_UI_Vibe_Parity_Report.md / reports/UI-vibe-parity-results.json; local frontend38/browser3 PASS, formal UAT pending |
| T-046 | Calendar/Gantt และรายการวันที่ไม่ครบ | T-045, T-031 | High | IN_PROGRESS | Codex | TeamFlow_T045_T049_Test_Report.md; local backend14/all407/Chromium37 after focused recheck PASS; SQL152SKIP/Windows/full TC-AT NOT_RUN; actual Vibe integration: TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json; local UI/API verified, full acceptance pending |
| T-047 | Shared refresh และ dirty draft preservation | T-045, T-046, T-044, T-038, T-017 | High | IN_PROGRESS | Codex | TeamFlow_T045_T049_Test_Report.md; local backend14/all407/Chromium37 after focused recheck PASS; SQL152SKIP/Windows/full TC-AT NOT_RUN |
| T-048 | Notification event dispatch | T-022, T-027, T-039, T-029, T-040 | High | IN_PROGRESS | Codex | TeamFlow_T045_T049_Test_Report.md; local backend14/all407/Chromium37 after focused recheck PASS; SQL152SKIP/Windows/full TC-AT NOT_RUN |
| T-049 | Due reminder scheduler | T-048, T-008, T-006 | High | IN_PROGRESS | Codex | TeamFlow_T045_T049_Test_Report.md; local backend14/all407/Chromium37 after focused recheck PASS; SQL152SKIP/Windows/full TC-AT NOT_RUN |
| T-050 | Notification list/read-one/read-all | T-048, T-049, T-011 | High | IN_PROGRESS | Codex | TeamFlow_T050_T054_Test_Report.md; backend23/all420/Chromium14 + visual1 + fresh420 PASS; SQL160SKIP/Windows/full TC-AT/UAT NOT_RUN |
| T-051 | Notification center และ badge | T-050, T-047 | Medium | IN_PROGRESS | Codex | TeamFlow_T050_T054_Test_Report.md; backend23/all420/Chromium14 + visual1 + fresh420 PASS; SQL160SKIP/Windows/full TC-AT/UAT NOT_RUN |
| T-052 | Report aggregates และนิยามตัวเลข | T-031, T-027, T-011 | High | IN_PROGRESS | Codex | TeamFlow_T050_T054_Test_Report.md; backend23/all420/Chromium14 + visual1 + fresh420 PASS; SQL160SKIP/Windows/full TC-AT/UAT NOT_RUN |
| T-053 | CSV export ตาม filter/access | T-052 | High | IN_PROGRESS | Codex | TeamFlow_T050_T054_Test_Report.md; backend23/all420/Chromium14 + visual1 + fresh420 PASS; SQL160SKIP/Windows/full TC-AT/UAT NOT_RUN |
| T-054 | Dashboard/report และ export UI | T-052, T-053, T-051 | Medium | IN_PROGRESS | Codex | TeamFlow_T050_T054_Test_Report.md; backend23/all420/Chromium14 + visual1 + fresh420 PASS; SQL160SKIP/Windows/full TC-AT/UAT NOT_RUN; actual Vibe integration: TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json; local UI/API verified, full acceptance pending |
| T-055 | Responsive และ accessible interaction review | T-054, T-037, T-024, T-018, T-044, T-046 | Medium | IN_PROGRESS | Codex | TeamFlow_T055_T059_Test_Report.md; TeamFlow_T056_PWA_Followup_Report.md; local partial / OS install and full acceptance NOT_RUN; actual Vibe integration: TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json; local UI/API verified, full acceptance pending ; fidelity correction TeamFlow_UI_Vibe_Parity_Report.md / reports/UI-vibe-parity-results.json; local frontend38/browser3 PASS, formal UAT pending ; Login/logo/install/motion follow-up TeamFlow_UI_Vibe_Login_Report.md / reports/UI-vibe-login-results.json; local UI verified, formal acceptance pending |
| T-056 | PWA manifest/icons/service worker | T-012, T-006 | Medium | IN_PROGRESS | Codex | TeamFlow_T055_T059_Test_Report.md; TeamFlow_T056_PWA_Followup_Report.md; local partial / OS install and full acceptance NOT_RUN ; Login/logo/install/motion follow-up TeamFlow_UI_Vibe_Login_Report.md / reports/UI-vibe-login-results.json; local UI verified, formal acceptance pending |
| T-057 | Offline/reconnect/logout cache behavior | T-056, T-047, T-055 | High | IN_PROGRESS | Codex | TeamFlow_T055_T059_Test_Report.md; TeamFlow_T056_PWA_Followup_Report.md; local partial / OS install and full acceptance NOT_RUN; actual Vibe integration: TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json; local UI/API verified, full acceptance pending |
| T-058 | Browser matrix และ PWA/touch QA | T-057, T-037 | Medium | IN_PROGRESS | Codex | TeamFlow_T055_T059_Test_Report.md; TeamFlow_T056_PWA_Followup_Report.md; local partial / OS install and full acceptance NOT_RUN |
| T-059 | Health endpoints และ operational logs | T-006, T-009, T-040 | Medium | IN_PROGRESS | Codex | TeamFlow_T055_T059_Test_Report.md; TeamFlow_T056_PWA_Followup_Report.md; local partial / OS install and full acceptance NOT_RUN |
| T-060 | Retention jobs และ orphan recovery | T-030, T-042, T-050, T-010, T-002 | High | IN_PROGRESS | Codex | TeamFlow_T060_T064_Test_Report.md; local SQLite/source subset; native SQL/Windows/full TC-AT pending |
| T-061 | Write freeze และ job coordination | T-059, T-060 | High | IN_PROGRESS | Codex | TeamFlow_T060_T064_Test_Report.md; local SQLite/source subset; native SQL/Windows/full TC-AT pending |
| T-062 | Consistent backup script และ manifest | T-061, T-007, T-043 | High | IN_PROGRESS | Codex | TeamFlow_T060_T064_Test_Report.md; local SQLite/source subset; native SQL/Windows/full TC-AT pending |
| T-063 | Restore/verification script และ rollback | T-062, T-014 | High | IN_PROGRESS | Codex | TeamFlow_T060_T064_Test_Report.md; local SQLite/source subset; native SQL/Windows/full TC-AT pending |
| T-064 | Migration upgrade และ recovery procedure | T-063, T-007 | High | IN_PROGRESS | Codex | TeamFlow_T060_T064_Test_Report.md; local SQLite/source subset; native SQL/Windows/full TC-AT pending |
| T-065 | Windows scripts และ installation guide | T-064, T-006, T-059, T-019 | Medium | IN_PROGRESS | Codex | TeamFlow_T065_T069_Test_Report.md; local regression/documentation subset; Windows/native SQL/full acceptance/UAT pending |
| T-066 | คู่มือ Admin/Lead/Member และ developer handoff | T-065, T-054, T-058 | Medium | IN_PROGRESS | Codex | TeamFlow_T065_T069_Test_Report.md; local regression/documentation subset; Windows/native SQL/full acceptance/UAT pending |
| T-067 | Complete test fixtures และ automated harness | T-004, T-007, T-011 | High | IN_PROGRESS | Codex | TeamFlow_T065_T069_Test_Report.md; local regression/documentation subset; Windows/native SQL/full acceptance/UAT pending |
| T-068 | ทดสอบ setup/auth/users และ session edges | T-067, T-018, T-017, T-019 | High | IN_PROGRESS | Codex | TeamFlow_T065_T069_Test_Report.md; local regression/documentation subset; Windows/native SQL/full acceptance/UAT pending |
| T-069 | ทดสอบสิทธิ์ข้ามทีมและ revocation ทุกช่องทาง | T-067, T-022, T-043, T-053, T-050, T-024 | High | IN_PROGRESS | Codex | TeamFlow_T065_T069_Test_Report.md; local regression/documentation subset; Windows/native SQL/full acceptance/UAT pending |
| T-070 | ทดสอบงาน งานซ้ำ การลบ และแก้พร้อมกัน | T-067, T-033, T-060, T-027 | High | IN_PROGRESS | Codex | TeamFlow_T070_T074_Test_Report.md; grouped QA/local subset; native SQL/Windows/browser matrix/full TC-AT/UAT pending |
| T-071 | ทดสอบ Kanban/list/calendar/Gantt และ refresh | T-067, T-038, T-045, T-046, T-047, T-058 | Medium | IN_PROGRESS | Codex | TeamFlow_T070_T074_Test_Report.md; grouped QA/local subset; native SQL/Windows/browser matrix/full TC-AT/UAT pending |
| T-072 | ทดสอบ comments/files/audit/notifications | T-067, T-044, T-051, T-060 | High | IN_PROGRESS | Codex | TeamFlow_T070_T074_Test_Report.md; grouped QA/local subset; native SQL/Windows/browser matrix/full TC-AT/UAT pending |
| T-073 | ทดสอบรายงาน CSV และ PWA | T-067, T-054, T-057 | Medium | IN_PROGRESS | Codex | TeamFlow_T070_T074_Test_Report.md; grouped QA/local subset; native SQL/Windows/browser matrix/full TC-AT/UAT pending |
| T-074 | ทดสอบ restart/backup/restore/migration และ Windows | T-067, T-063, T-064, T-065, T-059 | High | IN_PROGRESS | Codex | TeamFlow_T070_T074_Test_Report.md; grouped QA/local subset; native SQL/Windows/browser matrix/full TC-AT/UAT pending |
| T-075 | Load/performance test 30 users | T-067, T-031, T-052, T-035, T-041 | High | IN_PROGRESS | Codex / 2026-10-07 | Local subset: TeamFlow_T075_T077_Test_Report.md; native SQL/Windows/full acceptance/UAT pending |
| T-076 | UAT และ acceptance sign-off record | T-068, T-069, T-070, T-071, T-072, T-073, T-074, T-075 | Medium | IN_PROGRESS | Codex / 2026-10-07 | Local subset: TeamFlow_T075_T077_Test_Report.md; native SQL/Windows/full acceptance/UAT pending |
| T-077 | Source ZIP และ release completeness audit | T-076, T-066 | High | IN_PROGRESS | Codex / 2026-10-07 | Local subset: TeamFlow_T075_T077_Test_Report.md; native SQL/Windows/full acceptance/UAT pending |
| T-078 | อนุมัติ addendum และรวมเข้า Requirements/SRS/Test Plan/Test Cases | T-003, T-004 | Medium | IN_REVIEW | Claude / 2026-10-08 | TeamFlow_T078_Addendum_Merge_Report.md; batch TeamFlow_T078_T082_Test_Report.md: build/check/test:test-plan PASS 17/17, check/test:contract PASS 64/64; owner review pending |
| T-079 | Mock UI monday-style ใหม่ (ทุกหน้า + animation) ให้เจ้าของรีวิว | T-078 | Medium | DONE | Claude / 2026-10-08 | TeamFlow_UI_Monday_Mock.html; TeamFlow_T079_Mock_Report.md; batch 13 views×360/768/1440 no h-scroll, N/Esc, reduce toggle PASS; owner review/AT-39 pending; owner approved mock in chat 2026-10-08 with no change requests (app AT-39 stays with T-089/T-091) |
| T-080 | Job titles: schema/API/Admin UI/filter/report/CSV | T-078 | Medium | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T078_T082_Test_Report.md; reports/T-078-T-082-batch-results.json; SQLite AT-31 HTTP + combined474 + browser PASS; SQL2022/Windows/UAT NOT_RUN |
| T-081 | Permission catalog + checkbox รายคน + project role manager + authorization matrix | T-078 | High | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T078_T082_Test_Report.md; SQLite AT-32 HTTP + combined474 PASS; SQL2022 NOT_RUN; full P-key×role×endpoint matrix and two-process race pending |
| T-082 | Admin center + Permission matrix (checkbox/bulk/preset) | T-080, T-081 | Medium | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T078_T082_Test_Report.md; SQLite AT-33 HTTP + browser preset/summary/409/375px/Settings PASS; SQL2022/Windows/UAT NOT_RUN |
| T-083 | My overview + My work grouped table | T-078 | Medium | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T083_Test_Report.md; reports/T-083-my-overview-results.json: addendum5/5 (AT-34×2) + Node441 + frontend42 + Chromium1/1 PASS SQLite; SQL2022/Windows/UAT NOT_RUN |
| T-084 | Project Docs (schema/API/editor/sanitize/version/trash) | T-081 | High | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T084_Test_Report.md; reports/T-084-docs-results.json: XSS corpus47 + AT-35 HTTP2/2 + Node445 + frontend44 + Chromium1/1 PASS SQLite; SQL2022/Windows/UAT NOT_RUN |
| T-085 | Project Files tab + project-level upload | T-081 | Medium | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T085_Test_Report.md; reports/T-085-files-results.json: AT-36 HTTP2/2 + Node446 + frontend44 + Chromium1/1 PASS SQLite+temp FS; SQL2022/Windows/UAT NOT_RUN |
| T-086 | Main table monday upgrade (inline/batch/drag/sticky/resize) | T-079 | High | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T086_Test_Report.md; reports/T-086-main-table-results.json: AT-38 HTTP + Chromium main-table 1/1 (3/3) + Node451 + frontend47 PASS SQLite; SQL2022/Windows/UAT NOT_RUN |
| T-087 | Task side panel (Updates/@mention/Files/Activity) | T-079 | Medium | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T087_Test_Report.md; reports/T-087-side-panel-results.json: AT-38 HTTP + mentions2/2 + Chromium side-panel 1/1 (3/3) + Node451 + frontend49 PASS SQLite; SQL2022/Windows/UAT NOT_RUN |
| T-088 | Workload + Project overview | T-080 | Medium | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T088_Test_Report.md; reports/T-088-workload-results.json: contract1.5.0 80 routes + migration0008 + AT-37 HTTP1/1 + Node449 + frontend47 + Chromium1/1 PASS SQLite; SQL2022/Windows/UAT NOT_RUN |
| T-089 | Motion system AN-01–AN-12 + reduced-motion + Settings toggle | T-079 | Medium | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T089_Test_Report.md; reports/T-089-motion-results.json + motion-trace: contract1.7.0 85 routes + migration0010 + preferences HTTP + Chromium motion 1/1 (60fps headless) + Node451 + frontend47 PASS; GPU trace/owner AT-39/SQL2022/UAT NOT_RUN |
| T-090 | Favorites (Updates feed เลื่อนไปรอบถัดไป) | T-083 | Low | IN_PROGRESS | Claude / 2026-10-08 | TeamFlow_T090_Test_Report.md; reports/T-090-favorites-results.json: contract1.6.0 83 routes + migration0009 + AT-40 HTTP1/1 + Node450 + Chromium1/1 PASS SQLite; SQL2022/Windows/UAT NOT_RUN |
| T-091 | Regression รวม addendum, SQL Server 2022 native, Windows, UAT | T-079, T-080, T-081, T-082, T-083, T-084, T-085, T-086, T-087, T-088, T-089, T-090 | High | TODO | ยังไม่มอบหมาย | — |
| T-092 | Security Design + Threat model (tickets/T-092-security-design.md) | — | Medium | DONE | Claude / 2026-10-10 | docs/07-security.md 1.0 owner-approved 2026-10-10; Q-T-092-1 B, Q-T-092-2 A; document task only (controls verified in T-093/T-094) |
| T-093 | OWASP Top 10 verification release 1.0 (tickets/T-093-owasp-verification.md) | T-091, T-092 | High | TODO | ยังไม่มอบหมาย | docs/security/OWASP-1.0.md NOT_RUN |
| T-094 | Pen-Test + remediation/retest (tickets/T-094-pentest.md) | T-093 | High | TODO | ยังไม่มอบหมาย | docs/security/PENTEST-1.0.md plan only |

## 5. Phase 00: Baseline และสัญญาการพัฒนา

### T-001 — ล็อกขอบเขตและค่าที่ใช้พัฒนา

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** DONE (เอกสาร) · **Depends on:** ไม่มี · **Trace:** NFR-08 · **SRS:** §2

- [x] เจ้าของระบบยืนยันกติกาที่เสนอเมื่อ2026-10-05 11:33+07
- [x] คงหลายทีม/30 คน/noemail/noAI/selfdeployment
- [x] เปลี่ยน database เป็น SQL Server2022; stack ตาม SRS§3.4
- [x] Edition/installcredentials บันทึกเป็น deploymentcheck ไม่สมมติ Edition

**Evidence:** คำยืนยันในบทสนทนาและ Baseline1.1;ไม่มี coding/testing ได้รับสถานะ DONE จากงานนี้

### T-002 — ปิดจุดกำกวมระหว่าง Requirements กับ SRS

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** DONE (เอกสาร) · **Depends on:** T-001 · **Trace:** FR-15/16/17/28

- [x] R-01 manualdone เมื่อ checklist ครบ
- [x] R-02 projectarchive/tasktrash30 วัน
- [x] R-03 filetrash30 วัน/countquota/authorizedrestore
- [x] R-04 recurrenceIDsnapshot/tombstone ไม่ติด FK หลัง purge
- [x] Requirements/SRS/Task/TestPlan/TestCases ปรับ version1.1 ตรงกัน

**Evidence:** DecisionLog และ SRS§5.1/§8/§9.5;ทดสอบ implementation ยัง NOT_RUN

### T-003 — จัด API/DTO และ error contract ให้เป็นสัญญาเดียว

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ล็อกสัญญาข้อมูลและ error ให้สอดคล้องทั้งระบบ

**Status:** DONE (API contract/schema tests) · **Owner:** Codex

**Depends on:** T-001, T-002  
**Trace:** FR-05, FR-18, FR-40 · **SRS:** §5, §12  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [x] ทำ route inventory ทุกแถวใน SRS §12.2 และ DTO/request schema
- [x] กำหนด unknown-field policy, pagination, status codes, date serialization และ requestId
- [x] ระบุ version ของ users/org/team/project/subtask/task/columns ที่ API ใช้
- [x] นิยาม Idempotency-Key และ DELETE version payload ให้ frontend/backend ตรงกัน

**เกณฑ์รับงาน:** มี API contract ที่ตรวจ schema ได้; ไม่มี endpoint ใน SRS ที่ไร้เจ้าของ task

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Evidence:** TeamFlow_API_Contract.md / contracts/openapi.json / contracts/test-manifest.json; npm run check:contract PASS(52routes/75schemas); UT-01/T-003 contract tests61/61PASS บนNode22.23.3/macOS; รายงาน TeamFlow_T003_Test_Report.md และ reports/T-003-contract-results.json. Model/effort/speedจริงยังNOT_VERIFIEDตามข้อจำกัดเครื่องมือ ไม่อ้างว่าเปลี่ยนค่าแล้ว; application/DB/Windows/UAT/AT/TCยังNOT_RUN

### T-004 — จัด test plan และเกณฑ์ release

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** DONE (test/release plan validation) · **Owner:** Codex

**Depends on:** T-003  
**Trace:** FR-40, NFR-01, NFR-02, NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-08 · **SRS:** §14–16  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [x] แยก unit/integration/UI/UAT/Windows tests
- [x] กำหนด fixture roles และวิธีส่งผล PASS/FAIL/BLOCKED/NOT_RUN
- [x] จับคู่ AT-01–AT-30 กับงานและหลักฐานที่ต้องเก็บ
- [x] กำหนด critical gate เรื่องสิทธิ์ transaction recurrence backup และไม่มี secrets

**เกณฑ์รับงาน:** มี test manifest ที่ไม่มี AT ตกหล่น และไม่ใช้การเช็ก checkbox แทนผลทดสอบ

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


**Evidence:** TeamFlow_Test_Release_Manifest.md / tests/test-manifest.json / tests/execution-records.json; check:test-plan PASS: 77tasks/20suites/84TC/30AT/20RV/5UAT/4reviews/30smoke + FR40/NFR8/BR18; 17/17planning-policy tests PASS. Actual TC/AT/RV/UAT/REL remain NOT_RUN. Effort required Medium; selected runtime settings NOT_VERIFIED.

## 6. Phase 01: Foundation / database / permissions

### T-005 — โครงสร้างโปรเจกต์และชุดคำสั่งพื้นฐาน

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** DONE (foundation bootstrap only) · **Owner:** Codex

**Depends on:** T-003, T-004\
**Trace:** FR-40, NFR-07, NFR-08 · **SRS:** §3, §13.5  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [x] แยก frontend/API/domain/repository/jobs/scripts/tests ตาม stack ที่เลือก
- [x] SQLite local dev และ SQL2022 ใช้ domain/API เดียวกัน แต่แยก repository adapter/migrations/test commands; local seed ไม่ใช้ข้อมูลจริง
- [x] ล็อก runtime และ dependency พร้อม lockfile/license inventory
- [x] แยก production data/.env/logs ออกจาก source และกำหนด ignore
- [x] จัด start/test/migrate/sample-data scripts; sample data ไม่รันอัตโนมัติ

**เกณฑ์รับงาน:** checkout ใหม่รันขั้นพื้นฐานตาม README ได้; ไม่มี secret/data จริง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Evidence:** README.md; package/lockfile/.nvmrc; dependencies/license-inventory.json (390 packages); src/frontend/migrations/tests/scripts separated; fresh source copy npmci/typecheck/build/84combinedtests/migrate repeat/explicit seed/start PASS + Chromium smoke1PASS. Provider-independent atomic-effects tested with actualSQLite fixture rollback; SQL2022 harness exists but NOT_RUN (1 skipped), fullbusinessschema/auth/config/Windows/UAT still pending. See TeamFlow_T005_Test_Report.md and reports/T-005-foundation-results.json.

### T-006 — Configuration และ startup validation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ตรวจ secrets, TLS และ configuration ก่อนเปิดระบบ

**Status:** IN_PROGRESS (local/config implementation verified; SQL2022 guard integration pending) · **Owner:** Codex

**Depends on:** T-005  
**Trace:** FR-37, FR-40, NFR-02, NFR-07 · **SRS:** §3.2–3.3  
**Acceptance:** AT-28

- [x] รองรับ keys ทุกตัวใน configuration contract และ .env.example
- [x] DB_PROVIDER=sqlite สำหรับ local / sqlserver สำหรับปลายทาง; SQLITE_DB_PATH อยู่นอก source/webroot; ไม่ fallback provider เงียบเมื่อ SQL2022 ใช้ไม่ได้
- [x] ตรวจ APP_ORIGIN, COOKIE_SECURE, data/log paths, quota และค่าระยะเวลา
- [x] แยก local defaults จาก production; ไม่ใช้ Host header เป็น trusted origin
- [ ] ทำ single-instance guard; SQLite local DB อยู่นอก source/webroot; SQL2022 host แยกได้ตาม configuration

**เกณฑ์รับงาน:** configuration ผิดหยุด startup พร้อมข้อความที่ไม่เผย secrets; data paths อยู่ข้างนอก webroot

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Evidence:** TeamFlow_Configuration.md / TeamFlow_T006_Test_Report.md / reports/T-006-config-results.json / reports/T-006-fresh-checkout.json. Local startup/path/exclusion/crash-recovery and synthetic SQL session lifecycle verified separately; actual SQL2022 connection/exclusion/session-loss acceptance NOT_RUN. Final checklist remains pending until real SQL integration; AT-28/Windows/full TC results not closed. Declared effort High; actual runtime settings NOT_VERIFIED.

### T-007 — Schema และ migrations ครบทุก entity

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ออกแบบ constraints, indexes และ SQL Server migrations

**Status:** IN_PROGRESS (SQLite/pure verification; SQL2022 acceptance pending) · **Owner:** Codex

**Depends on:** T-005, T-002  
**Trace:** FR-40, NFR-03, NFR-07 · **SRS:** §5  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] สร้าง entities/FK/UNIQUE/CHECK/index เป็น T-SQL ทุกแถว;optionalUNIQUE ใช้ filteredindex; NO ACTION/purge ตาม SRS§5.1
- [x] กำหนด versions/timestamps/auth_version และ date-only ที่ชัดเจน
- [x] แยก SQLite migrations/local fixtures จาก T-SQL migrations; เก็บผล provider-specific; SQLite ผ่านไม่ปิด SQL2022 acceptance ของ T-007
- [x] รองรับ quota reservation/cleanup state ตาม design ที่ล็อก ไม่ทำแค่ counter ในหน่วยความจำ
- [x] สร้าง schema_migrations checksum และปฏิเสธ checksum mismatch
- [x] ตรวจ fresh migration และ migration จาก fixture รุ่นก่อน

**เกณฑ์รับงาน:** schema สอดคล้อง DTO; migration ทำซ้ำไม่ทำข้อมูลหาย; SQL Server FK/constraints เปิดและ trusted จริง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Evidence T-007:** TeamFlow_Database_Schema.md / TeamFlow_T007_Test_Report.md / reports/T-007-schema-results.json / reports/T-007-fresh-checkout.json. 0000 unchanged; 0001 provider-specific 24 tables/31 FK + existing ledger. Checkmarks mean implementation/local verification; actual SQL2022 apply/enabled trusted FK/CHECK/collation/serialization/plans remain NOT_RUN. T-007 stays IN_PROGRESS. Declared High; actual runtime settings NOT_VERIFIED.

### T-008 — Transaction, date และ lifecycle helpers

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ควบคุม transaction, วันเวลา และ lifecycle

**Status:** IN_PROGRESS (local implementation under SRS5.2; SQL2022/feature integration pending) - **Owner:** Codex

**Depends on:** T-007, T-003  
**Trace:** FR-14, FR-18, NFR-03 · **SRS:** §8, §9.1, §13.2  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] สร้าง transaction wrapper และ SQL Server lock-timeout/deadlock handling 503/Retry-After
- [x] สร้าง Bangkok today/date interval/UTC conversion และ monthly anchor helper
- [ ] สร้าง optimistic version helpers และ column locks/rank สองระยะ/column version invariants ตาม SQL Server§5.1
- [ ] ทำ deletion/archived/active checks แบบใช้ร่วมกันในทุก write

**เกณฑ์รับงาน:** helper ผ่านกรณีขอบวัน/เดือนและ rollback; ไม่ใช้เวลาจาก browser ตัดสิน overdue

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


**Evidence:** TeamFlow_T008_Test_Report.md / reports/T-008-helper-results.json; helper25 + combined174 PASS. Other checklists have local implementations; SQL2022/provider/feature wiring remains pending. T-007 dependency stays IN_PROGRESS. SRS5.2/16 permits local work; no dependency graph/sign-off bypass.

### T-009 — API middleware และ validation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ป้องกัน request ที่ไม่ปลอดภัยและ validation ช่องทางกลาง

**Status:** IN_PROGRESS (local middleware verified; real auth/ACL/SQL integration pending) - **Owner:** Codex

**Depends on:** T-006, T-003  
**Trace:** FR-05, FR-18, NFR-02 · **SRS:** §12.1, §13.1  
**Acceptance:** AT-30

- [x] JSON Content-Type/size limits, explicit allowlist, error envelope/requestId
- [x] exact Origin และ CSRF hooks, secure headers/CSP, no permissive CORS
- [ ] parameterized queries และป้องกัน sensitive fields ออก DTO
- [ ] pagination max100 และ resource404 เมื่อไม่มี project access

**เกณฑ์รับงาน:** middleware ใช้กับทุก route ตาม contract; error ไม่เผย stack/password/path

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


**Evidence:** TeamFlow_T009_Test_Report.md / reports/T-009-api-results.json / reports/T-009-fresh-checkout.json. API12 + combined186 + browser5 PASS. Parameter binding/DTO privacy/pagination/scoped404 have local/synthetic evidence; real permissions/session/SQL integration pending. T-006 remains IN_PROGRESS; SRS5.2 permits local implementation without closing dependency/sign-off.

### T-010 — Idempotency สำหรับคำสั่งสร้างและย้ายบอร์ด

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ป้องกันคำสั่งซ้ำและผล commit ที่ไม่แน่นอน

**Status:** IN_PROGRESS (local idempotency verified; SQL/auth/features/job integration pending) - **Owner:** Codex

**Depends on:** T-007, T-009, T-008  
**Trace:** FR-16, FR-18, FR-21, FR-27, NFR-03 · **SRS:** §12.1  
**Acceptance:** AT-12, AT-17, AT-21

- [ ] เก็บ key ต่อ user/route และ request hash TTL24h
- [ ] key เดิม/body เดิมคืน response เดิม; body ต่าง409
- [ ] ผูก key result กับ business transaction เพื่อกัน parallel retry
- [ ] ไม่เก็บ password/upload bytes ใน table นี้ และมี cleanup job

**เกณฑ์รับงาน:** parallel requests key เดียวไม่เพิ่ม records ซ้ำ; permission ตรวจซ้ำก่อนคืน cached response

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Evidence:** TeamFlow_T010_Test_Report.md / reports/T-010-idempotency-results.json. Local13 + combined199 PASS; synchronized three-process SQLite claim yields one business/audit/notification/cache set. Checklists have local implementation evidence; full SQL2022, real auth/feature handlers/upload streaming and scheduler acceptance remains open. TTL stamped at successful transaction finalization. Dependencies unchanged under SRS5.2/16.

### T-011 — Authorization service และ query scoping

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ป้องกันข้อมูลข้ามทีมและตรวจสิทธิ์ทุกช่องทาง

**Status:** IN_PROGRESS (local authorization/scopes verified; SQL/login/features integration pending) - **Owner:** Codex

**Depends on:** T-007, T-009  
**Trace:** FR-05, FR-10, FR-11, NFR-02 · **SRS:** §4  
**Acceptance:** AT-05, AT-07, AT-08, AT-30

- [ ] effective rights จาก Admin/Lead ทีมเจ้าของ/project Editor/Viewer
- [ ] team membership/creator/assignee ไม่เพิ่มสิทธิ์เอง
- [ ] scoping บน read/list/search/report/export/notification/file download
- [ ] ตรวจ active/session/forced password และ archived/deleted state ก่อนทำงาน

**เกณฑ์รับงาน:** permission matrix มี executable tests ทั้ง allowed/denied; frontend hiding ไม่ใช่การป้องกันเพียงอย่างเดียว

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Evidence:** TeamFlow_T011_Test_Report.md / reports/T-011-authorization-results.json. Role matrix/current DB session and membership/scoped rows-counts-search-export-notifications/files, HTTP integration and deterministic cross-process revoke-vs-write verified locally; authorization14 + combined213 PASS. SQL38SKIP/NOT_RUN. Checklists have local groundwork; full feature/login/SQL acceptance pending under SRS5.2/16; dependency graph unchanged.

### T-012 — Frontend shell, navigation และสถานะร่วม

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** DONE (frontend shell only) · **Evidence:** TeamFlow_T012_Test_Report.md; reports/T-012-shell-results.json

**Depends on:** T-005, T-003  
**Trace:** FR-35, NFR-05, NFR-06 · **SRS:** §11  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [x] สร้าง app layout/nav ตามสิทธิ์และ app-specific favicon
- [x] shared form/dialog/table/toast/error/loading/empty components
- [x] API client จัด401/403/404/409/offline โดยไม่ล้างข้อมูลร่าง
- [x] รองรับ labels/focus/200% text zoom และข้อความไทย

**เกณฑ์รับงาน:** หน้าเริ่มเป็น working app; navigation ไม่แสดงทางเข้าที่ผู้ใช้ไม่มีสิทธิ์

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 7. Phase 02: บัญชีและความปลอดภัย

### T-013 — First-run setup API และหน้าจอ

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ป้องกัน concurrent setup และบัญชีเริ่มต้น

**Depends on:** T-007, T-009, T-012  
**Trace:** FR-01 · **SRS:** §6.1  
**Acceptance:** AT-01

- [x] สร้าง setup token256-bit ที่ console เท่านั้นและเปลี่ยนหลัง restart
- [x] meta เปิดเฉพาะ setupRequired/version; setup บันทึก organization/Admin ใน transaction
- [x] no-users guard รับมือ setup พร้อมกัน; ปิด endpoint หลังสำเร็จ
- [x] ฟอร์ม token/ชื่อองค์กร/username/name/password พร้อม validation

**เกณฑ์รับงาน:** setup ถูกต้อง201;ผิด403;ใช้ซ้ำ409;ไม่มี default password

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Evidence:** TeamFlow_T013_Test_Report.md / reports/T-013-setup-results.json / reports/T-013-fresh-checkout.json. Checkmarks mean implemented/local verification: SQLite provider8 + security4 + HTTP2 + actual startup2 + separate-process race1 =17, frontend19 and Chromium7 PASS (2 real setup cases; 4 shell Self fixtures). SQL setup8 and total46 SKIP/NOT_RUN; AT-01/TC-001/002 partial local evidence only. No auto-login/default credentials; T-014/T-017 authentication pending. T-007/T-009 stay IN_PROGRESS, T-012 DONE; SRS5.2/16 permits local continuation. Declared High; actual runtime settings NOT_VERIFIED.

### T-014 — Password hashing, login และ session

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ความปลอดภัย password/session และวันหมดอายุ

**Depends on:** T-011, T-006, T-008  
**Trace:** FR-02, FR-04, NFR-02 · **SRS:** §6.2  
**Acceptance:** AT-02, AT-03

- [x] async scrypt และ cost/salt ตาม SRS; constant-time compare
- [x] rate limits ต่อ username/IP; generic login error
- [x] random session/token hash/HttpOnly SameSite Secure cookie
- [x] absolute12h idle60m; polling ไม่ต่อ idle; activity จาก interaction มี CSRF
- [x] logoutrevoke; role/reset/deactivate ใช้ auth_version ปิด sessions

**เกณฑ์รับงาน:** session lifecycle ผ่าน expired/revoked/logout;ไม่มี raw session token ใน DB หรือ log

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Evidence:** TeamFlow_T014_Test_Report.md / reports/T-014-session-results.json. Checkmarks mean local implementation/verification: provider10 + HTTP4 + security2 + separate-process2 + actual startup1 =19; combined252 PASS. Explicit cookie resolver/current DB authorization wired for login/me/activity/logout; cookie effects occur only after confirmed commit and validated response. Revoke helper composes with caller mutation in the same transaction; full Admin role/reset/deactivate/unassign APIs remain T-015/T-016. SQL56SKIP/NOT_RUN including session10; full TC-003/004/005/006/010/011 and AT-02/03/Windows/HTTPS/matrix acceptance pending. T-011/T-006/T-008 stay IN_PROGRESS under SRS5.2/16. Declared High; actual runtime settings NOT_VERIFIED.

### T-015 — เปลี่ยนรหัสและ forced password gate

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** forced password gate และ revoke sessions

**Status:** IN_PROGRESS — local SQLite implemented/tested; full acceptance/dependencies not closed.

**Depends on:** T-014  
**Trace:** FR-04 · **SRS:** §6.2–6.3  
**Acceptance:** AT-03

- [x] (local SQLite evidence) own password ต้อง current password; validate12–128 ไม่ trim
- [x] (local SQLite evidence) rotate current session/CSRF และ revoke session อื่น
- [x] (local SQLite evidence) must_change_password อนุญาตเพียง me/password/logout/activity
- [x] (local SQLite evidence) adminreset ยืนยัน Admin password และตั้ง forced flag

**เกณฑ์รับงาน:** ใช้รหัสชั่วคราวเรียก taskAPI ถูก403 PASSWORD_CHANGE_REQUIRED;เปลี่ยนแล้วใช้ได้

**Local evidence:** [TeamFlow_T015_T018_Test_Report.md](TeamFlow_T015_T018_Test_Report.md) / reports/T-015-018-batch-results.json; native SQL2022/Windows/actualHTTPS/full matrix NOT_RUN; declared effort as above, actual runtime NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-016 — Admin users API และ last-admin guard

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** last-admin guard ต้องถูกต้องเมื่อแก้พร้อมกัน

**Status:** IN_PROGRESS — local SQLite implemented/tested; full acceptance/dependencies not closed.

**Depends on:** T-015, T-011  
**Trace:** FR-03, FR-04 · **SRS:** §6.3  
**Acceptance:** AT-03, AT-04

- [x] (local SQLite evidence) create/edit/deactivate/reactivate users ตาม version;usernameuniquecase-insensitive
- [x] (local SQLite evidence) ไม่ทำ harddelete user ที่มี history
- [x] (local SQLite evidence) ห้าม demote/deactivateactiveAdmin คนสุดท้ายด้วย transaction
- [x] (local SQLite evidence) reset endpoint ไม่คืน password และ admin_events ไม่มี secret

**เกณฑ์รับงาน:** concurrent admin changes ไม่ทำให้ไม่มี Admin;inactive login ไม่ได้

**Local evidence:** [TeamFlow_T015_T018_Test_Report.md](TeamFlow_T015_T018_Test_Report.md) / reports/T-015-018-batch-results.json; native SQL2022/Windows/actualHTTPS/full matrix NOT_RUN; declared effort as above, actual runtime NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-017 — Login, logout, profile และเปลี่ยนรหัส UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** IN_PROGRESS — local SQLite implemented/tested; full acceptance/dependencies not closed.

**Depends on:** T-012, T-013, T-015  
**Trace:** FR-02, FR-04, FR-35 · **SRS:** §11  
**Acceptance:** AT-02, AT-03

- [x] (local SQLite evidence) login/show-password/error429 และ sessionexpired
- [x] (local SQLite evidence) forced password หน้าบังคับพร้อม field errors
- [x] (local SQLite evidence) profile/change-password/logout;intentionalactivity แยกจาก poll
- [x] (local SQLite evidence) ไม่เก็บ password/session token ใน localStorage

**เกณฑ์รับงาน:** ทดสอบ login→forcedchange→งาน→logout ครบผ่าน browser

**Local evidence:** [TeamFlow_T015_T018_Test_Report.md](TeamFlow_T015_T018_Test_Report.md) / reports/T-015-018-batch-results.json; native SQL2022/Windows/actualHTTPS/full matrix NOT_RUN; declared effort as above, actual runtime NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-018 — Admin user management UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Status:** IN_PROGRESS — local SQLite implemented/tested; full acceptance/dependencies not closed.

**Depends on:** T-017, T-016  
**Trace:** FR-03, FR-04 · **SRS:** §11  
**Acceptance:** AT-03, AT-04

- [x] (local SQLite evidence) list/search/page users และ create/editrole/name
- [x] (local SQLite evidence) deactivate/reactivate/reset พร้อม confirmation
- [x] (local SQLite evidence) แสดง temp-password การกรอกโดย Admin ไม่ใส่ default
- [x] (local SQLite evidence) ห้ามปิด Admin สุดท้ายและแสดงเหตุผลจาก API

**เกณฑ์รับงาน:** บัญชี active/inactive/history แสดงถูก;reset แจ้ง forcedchange

**Local evidence:** [TeamFlow_T015_T018_Test_Report.md](TeamFlow_T015_T018_Test_Report.md) / reports/T-015-018-batch-results.json; native SQL2022/Windows/actualHTTPS/full matrix NOT_RUN; declared effort as above, actual runtime NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-019 — CLI กู้ Admin และบังคับออกจากระบบ

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** กู้สิทธิ์ Admin อย่างปลอดภัยและบังคับ logout

**Status:** IN_PROGRESS (local SQLite/POSIX implemented/tested; native SQL2022/Windows/AT-28 not closed).

**Depends on:** T-016  
**Trace:** FR-04, FR-39, FR-40, NFR-02, NFR-07 · **SRS:** §6.3, §13.5  
**Acceptance:** AT-28

- [x] (local SQLite/POSIX evidence) local-only CLI require machine/file permissions
- [x] (local SQLite/POSIX evidence) ไม่เปิด public password recovery route
- [x] (local SQLite/POSIX evidence) revoke sessions และ writeadmin maintenance audit
- [x] (local SQLite/POSIX evidence) คู่มือจัดการ Admin หายโดยไม่เปิดเผย password ผ่าน arguments/log

**เกณฑ์รับงาน:** กู้คืนใน testinstance ได้;ไม่เปิดช่อง webunauthenticated

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


**Local evidence:** TeamFlow_T019_Test_Report.md / reports/T-019-installer-results.json; declared High, actual runtime model/effort NOT_VERIFIED.

## 8. Phase 03: ทีม โปรเจกต์ และการถอนสิทธิ์

### T-020 — Team CRUD/archive และสมาชิกหลายทีม

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** สมาชิกหลายทีมและกติกา archive

**Depends on:** T-016, T-011, T-008  
**Trace:** FR-06, FR-07, FR-08 · **SRS:** §7  
**Acceptance:** AT-06

- [x] (local SQLite evidence) teamnamesuniquecase-insensitive;Admincreate/edit/archive
- [x] (local SQLite evidence) membershipcompositeunique;user หลายทีม/role ต่างกัน
- [x] (local SQLite evidence) Admin แต่งตั้ง/ถอด Lead เท่านั้น
- [x] (local SQLite evidence) archive ได้เฉพาะไม่มี activeproject;ไม่ cascade เงียบ

**เกณฑ์รับงาน:** member ไม่ยกระดับตนเอง;ทีม archived สร้าง project ใหม่ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T020_T024_Test_Report.md / reports/T-020-024-batch-results.json. Local implementation/checks PASS; full SQL2022/Windows/browser matrix/TC-AT acceptance NOT_RUN, task remains IN_PROGRESS.

### T-021 — Project CRUD/archive และ membership ข้ามทีม

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** สิทธิ์โปรเจกต์ข้ามทีมและ membership

**Depends on:** T-020, T-011  
**Trace:** FR-09, FR-10 · **SRS:** §7  
**Acceptance:** AT-07, AT-29

- [x] (local SQLite evidence) activeownerteam หนึ่งทีม;Admin/ownerLead จัดการ
- [x] (local SQLite evidence) cross-team Editor/Viewer explicit membership
- [x] (local SQLite evidence) ownerteam ย้ายไม่ได้ v1;directory ตาม privacycontract
- [ ] archive อ่านได้แต่ writes งาน/comment/file/subtask ถูกบล็อก;unarchive ตาม version

**เกณฑ์รับงาน:** M2 เห็นเฉพาะ Pshared;Viewer อ่านอย่างเดียว;Lead ไม่ดูทีมอื่นเพราะเป็น Lead

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T020_T024_Test_Report.md / reports/T-020-024-batch-results.json. Local implementation/checks PASS; full SQL2022/Windows/browser matrix/TC-AT acceptance NOT_RUN, task remains IN_PROGRESS.

### T-022 — ถอนสิทธิ์ ปิดบัญชี และ cleanup assignee

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ถอนสิทธิ์พร้อม cleanup ผู้รับงานให้ atomic

**Depends on:** T-021, T-016, T-008  
**Trace:** FR-11, FR-13, NFR-02, NFR-03 · **SRS:** §7  
**Acceptance:** AT-08

- [x] (local SQLite evidence) projectremove/editor→viewerunassignopen งานเมื่อเสีย effectivewrite
- [x] (local SQLite evidence) teamremove คง explicitprojectmembership;สูญเสีย Lead คำนวณ rights ใหม่
- [x] (local SQLite evidence) deactivateuserrevoke sessions/unassignopen งานทั้งองค์กร
- [x] (local SQLite evidence) done งานคง assigneehistory;notifyownerAdmin/Lead ไม่แจ้งคนหมดสิทธิ์
- [ ] download/notification/APIrequest ใหม่ตรวจสิทธิ์ปัจจุบัน

**เกณฑ์รับงาน:** ทุกกรณีถอนสิทธิ์ไม่มีงานมอบหมายค้างให้คนไม่มี access และไม่มีข้อมูลรั่ว

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T020_T024_Test_Report.md / reports/T-020-024-batch-results.json. Local implementation/checks PASS; full SQL2022/Windows/browser matrix/TC-AT acceptance NOT_RUN, task remains IN_PROGRESS.

### T-023 — หน้าทีมและแต่งตั้ง Lead

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-020, T-017  
**Trace:** FR-06, FR-07, FR-08 · **SRS:** §11  
**Acceptance:** AT-06

- [x] (local SQLite evidence) teamlist/edit/archive ตามบทบาท
- [x] (local SQLite evidence) membershipmulti-team และ Leadassignment
- [x] (local SQLite evidence) confirmremoval พร้อมผลกระทบต่อสิทธิ์
- [x] (local SQLite evidence) loading/empty/conflict/error และ own-teamlist

**เกณฑ์รับงาน:** Admin จัดทีมได้ครบ;สมาชิกเห็นข้อมูลทีมตาม scope

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T020_T024_Test_Report.md / reports/T-020-024-batch-results.json. Local implementation/checks PASS; full SQL2022/Windows/browser matrix/TC-AT acceptance NOT_RUN, task remains IN_PROGRESS.

### T-024 — หน้าโปรเจกต์และ Editor/Viewer picker

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-021, T-023, T-022  
**Trace:** FR-09, FR-10, FR-11 · **SRS:** §11  
**Acceptance:** AT-07, AT-08, AT-29

- [x] (local SQLite evidence) projectselector/list/create/edit/archive/unarchive
- [x] (local SQLite evidence) activeuserdirectory สำหรับ Lead/Admin และ cross-team rolepicker
- [x] (local SQLite evidence) remove/reduceaccessconfirmation
- [x] (local SQLite evidence) archived/read-only state และไม่เปิดแสดง hiddenprojects

**เกณฑ์รับงาน:** projectmembershipflow ครบทั้งข้ามทีมและถอนสิทธิ์

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T020_T024_Test_Report.md / reports/T-020-024-batch-results.json. Local implementation/checks PASS; full SQL2022/Windows/browser matrix/TC-AT acceptance NOT_RUN, task remains IN_PROGRESS.

### T-025 — ชื่อองค์กรและ settings

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-013, T-016, T-017  
**Trace:** FR-37 · **SRS:** §3.3, §11–12  
**Acceptance:** AT-28

- [x] (local SQLite evidence) organization GET/PATCH version โดย Admin
- [x] (local SQLite evidence) ชื่อองค์กรใน authenticated navigation/settings; public meta คงเฉพาะ setupRequired/version
- [x] (local SQLite evidence) deploymentvalues ใน config ไม่เพิ่ม SMTP/AIsettings
- [x] (local SQLite evidence) read-only สำหรับ Member และ validate ชื่อ≤100

**เกณฑ์รับงาน:** ชื่อที่แก้คงหลัง restart;role ที่ไม่มีสิทธิ์ PATCH ถูก403

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


**Local batch evidence:** TeamFlow_T025_T029_Test_Report.md / reports/T-025-029-batch-results.json. Local backend/settings checks PASS; full SQL2022/Windows/TC-AT sign-off remains NOT_RUN, task stays IN_PROGRESS. Task/checklist/recurrence UI belongs to T-032/T-033.

## 9. Phase 04: งาน Checklist งานซ้ำ และถังขยะ

### T-026 — Task create/read/update และ validation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** permissions, validation และ optimistic concurrency

**Depends on:** T-021, T-010, T-008, T-022  
**Trace:** FR-12, FR-13, FR-14, FR-18 · **SRS:** §8.1  
**Acceptance:** AT-09, AT-14

- [x] (local SQLite evidence) fields/length/enums/date-only/start≤due ตาม SRS
- [x] (local SQLite evidence) projectimmutable;activeeligibleassignee หนึ่งคน/null
- [x] (local SQLite evidence) taskversioncheck409 และ updated_at
- [x] (local SQLite evidence) createinitialtodo/medium/position พร้อม events ใน transaction
- [x] (local SQLite evidence) ไม่มี write ใน archived/deletedproject/task

**เกณฑ์รับงาน:** validate ทุก field และ conflict ไม่ทับข้อมูล;HTTP ตาม contract

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T025_T029_Test_Report.md / reports/T-025-029-batch-results.json. Local backend/settings checks PASS; full SQL2022/Windows/TC-AT sign-off remains NOT_RUN, task stays IN_PROGRESS. Task/checklist/recurrence UI belongs to T-032/T-033.

### T-027 — Status transitions และ completion

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** เปลี่ยนสถานะสัมพันธ์กับ completion และงานซ้ำ

**Depends on:** T-026  
**Trace:** FR-14, FR-15, FR-18, NFR-03 · **SRS:** §8.2, §9.1  
**Acceptance:** AT-10, AT-14

- [x] (local SQLite evidence) ทุก transition ตาม4status รวม reopen
- [x] (local SQLite evidence) done ต้อง subtasks ครบ;completed_atnow และ reopen=null
- [x] (local SQLite evidence) done→done เป็น noop ไม่เปลี่ยน completion หรือ recurrence
- [x] (local SQLite evidence) detailstatusappendtargetboard และเพิ่ม columnversions
- [x] (local SQLite evidence) transactionrollback และ notification/audit hooks

**เกณฑ์รับงาน:** taskstatus/boardordering/completed_at ไม่ขัดกัน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T025_T029_Test_Report.md / reports/T-025-029-batch-results.json. Local backend/settings checks PASS; full SQL2022/Windows/TC-AT sign-off remains NOT_RUN, task stays IN_PROGRESS. Task/checklist/recurrence UI belongs to T-032/T-033.

### T-028 — Checklist API และ parent guard

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** checklist กับ parent guard ต้องตรวจใน transaction

**Depends on:** T-027  
**Trace:** FR-15 · **SRS:** §8.2  
**Acceptance:** AT-10

- [x] (local SQLite evidence) create/edittitle/toggle/delete ตาม version
- [x] (local SQLite evidence) reject เพิ่ม/untick ตอน parentdone จน reopen
- [x] (local SQLite evidence) ไม่มี assignee/duedate ของ subtask แยก v1
- [x] (local SQLite evidence) checklist ครบไม่ auto-done ตาม baseline ที่ล็อก

**เกณฑ์รับงาน:** checklistguard ตรง closedtask และ completiontest

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T025_T029_Test_Report.md / reports/T-025-029-batch-results.json. Local backend/settings checks PASS; full SQL2022/Windows/TC-AT sign-off remains NOT_RUN, task stays IN_PROGRESS. Task/checklist/recurrence UI belongs to T-032/T-033.

### T-029 — Recurring series และ monthly anchor

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** monthly anchor และสร้างงานซ้ำเพียงครั้งเดียว

**Depends on:** T-027, T-028, T-010, T-002  
**Trace:** FR-16, NFR-03 · **SRS:** §8.3  
**Acceptance:** AT-11, AT-12

- [x] (local SQLite evidence) duedaterequired;daily+1 weekly+7 monthlyanchor
- [x] (local SQLite evidence) copystartdueoffset/checklisttitles ไม่ copyfiles/comments
- [x] (local SQLite evidence) successoronce unique source;copyeligibleassignee เท่านั้น
- [x] (local SQLite evidence) reopen/recomplete ไม่สร้างเพิ่ม;ไม่ catchup หลายรอบย้อนหลัง
- [x] (local SQLite evidence) statusdone+successor+event+notification ใน transaction เดียว

**เกณฑ์รับงาน:** Jan31→Febend→Mar31 และ parallelcompletion มี successor หนึ่งงาน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local batch evidence:** TeamFlow_T025_T029_Test_Report.md / reports/T-025-029-batch-results.json. Local backend/settings checks PASS; full SQL2022/Windows/TC-AT sign-off remains NOT_RUN, task stays IN_PROGRESS. Task/checklist/recurrence UI belongs to T-032/T-033.

### T-030 — Soft delete/restore และการคง series

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** restore/purge และ recurrence tombstone

**Depends on:** T-026, T-029, T-002  
**Trace:** FR-17, NFR-03 · **SRS:** §8.4  
**Acceptance:** AT-13

- [x] (local SQLite/Chromium evidence) creator/ownerLead/Adminsoftdelete ตาม version
- [ ] deleted ออกจาก activequeries/positions/reminders/exports
- [x] (local SQLite/Chromium evidence) trashscopedAdmin/Lead;restore ก่อน UTC cutoff deleted_at+30×24ชั่วโมง และ append เดิม
- [x] (local SQLite/Chromium evidence) recurrencelinks/tombstones ตาม resolveddesign
- [x] (local SQLite/Chromium evidence) ไม่ harddelete ทันทีและไม่เปิด write งานใน trash

**เกณฑ์รับงาน:** restore กลับครบและไม่สร้าง recurrence ซ้ำหลังการลบ

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T030_T034_Test_Report.md / reports/T-030-034-batch-results.json. Local service/UI evidence only; native SQL2022/Windows/full TC-AT remain NOT_RUN, task remains IN_PROGRESS. Shared calendar/report/export consumers, retention/reminder jobs and board fallback UI acceptance await their feature tasks.

### T-031 — Task query/search/filter/sort และ pagination

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** query scoping, dynamic filters และ pagination

**Depends on:** T-026, T-011  
**Trace:** FR-19, FR-20 · **SRS:** §9.2  
**Acceptance:** AT-15, AT-19

- [x] (local SQLite/Chromium evidence) AND ข้าม fields OR ใน multiplevalues
- [x] (local SQLite/Chromium evidence) searchtitle/description/category;max100chars
- [x] (local SQLite/Chromium evidence) datebasis/dueinclusive/null-last/tie-ID
- [x] (local SQLite/Chromium evidence) scope ก่อน count/pagination ไม่แค่กรองหน้าที่โหลด
- [ ] sharedfilterlogic กับ calendar/report/export

**เกณฑ์รับงาน:** total/count/search ไม่รั่ว hiddenproject;filters ให้ผลสอดคล้อง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T030_T034_Test_Report.md / reports/T-030-034-batch-results.json. Local service/UI evidence only; native SQL2022/Windows/full TC-AT remain NOT_RUN, task remains IN_PROGRESS. Shared calendar/report/export consumers, retention/reminder jobs and board fallback UI acceptance await their feature tasks.

### T-032 — Task form/detail และ save conflict UX

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-026, T-027, T-017, T-024  
**Trace:** FR-12, FR-13, FR-14, FR-18 · **SRS:** §11  
**Acceptance:** AT-09, AT-14, AT-20

- [x] (local SQLite/Chromium evidence) create/editfields และ eligibleassigneepicker
- [x] (local SQLite/Chromium evidence) loading/readonly/archived/dirty/pending states
- [x] (local SQLite/Chromium evidence) 409 ให้โหลด latest หรือเก็บ draft เทียบไม่ทับอัตโนมัติ
- [x] (local SQLite/Chromium evidence) close/routechange เตือน unsaveddraft
- [x] (local SQLite/Chromium evidence) taskversionsfromserver ไม่ increment เอง

**เกณฑ์รับงาน:** แก้ task จริงได้ครบ;dirtydraft ไม่หายจาก refresh

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T030_T034_Test_Report.md / reports/T-030-034-batch-results.json. Local service/UI evidence only; native SQL2022/Windows/full TC-AT remain NOT_RUN, task remains IN_PROGRESS. Shared calendar/report/export consumers, retention/reminder jobs and board fallback UI acceptance await their feature tasks.

### T-033 — Checklist/recurrence/trash UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-032, T-028, T-029, T-030  
**Trace:** FR-15, FR-16, FR-17 · **SRS:** §11  
**Acceptance:** AT-10, AT-11, AT-13

- [x] (local SQLite/Chromium evidence) Checklistcounts/edit/toggle/delete/closedguard
- [x] (local SQLite/Chromium evidence) recurrencepicker และ requiredduedate อธิบาย monthlyanchor
- [x] (local SQLite/Chromium evidence) trashscreenrestore เฉพาะ Admin/Lead
- [x] (local SQLite/Chromium evidence) confirmationdelete และวันหมดระยะกู้คืน

**เกณฑ์รับงาน:** user จัด subtasks/งานซ้ำ/delete-restore ผ่าน UI โดยไม่ใช้ API เอง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 10. Phase 05: Kanban Drag & Drop

**Local evidence / limits:** TeamFlow_T030_T034_Test_Report.md / reports/T-030-034-batch-results.json. Local service/UI evidence only; native SQL2022/Windows/full TC-AT remain NOT_RUN, task remains IN_PROGRESS. Shared calendar/report/export consumers, retention/reminder jobs and board fallback UI acceptance await their feature tasks.

### T-034 — Board read และ column versions

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** column versions และ snapshot บอร์ด

**Depends on:** T-027, T-030, T-007  
**Trace:** FR-21, FR-22 · **SRS:** §9.1  
**Acceptance:** AT-16

- [x] (local SQLite/Chromium evidence) ordered4columns ตาม projectaccess
- [x] (local SQLite/Chromium evidence) rankinvariant และ taskversions/columnversionsDTO
- [x] (local SQLite/Chromium evidence) สร้าง/ลบ/restore/detailstatus เพิ่ม columnversion
- [ ] >500tasksfallbackpaginatedlist/menu ไม่โหลดไม่จำกัด

**เกณฑ์รับงาน:** refresh ได้ลำดับเดียวกับ DB;ข้อมูล versions ใช้ move ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T030_T034_Test_Report.md / reports/T-030-034-batch-results.json. Local service/UI evidence only; native SQL2022/Windows/full TC-AT remain NOT_RUN, task remains IN_PROGRESS. Shared calendar/report/export consumers, retention/reminder jobs and board fallback UI acceptance await their feature tasks.

### T-035 — Atomic board move/reorder endpoint

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** atomic reorder, rank constraints และการลากพร้อมกัน

**Depends on:** T-034, T-029, T-010  
**Trace:** FR-18, FR-21, FR-22, NFR-03 · **SRS:** §9.1, §12.4  
**Acceptance:** AT-16, AT-17

- [x] (local SQLite/Chromium evidence) ตรวจ source/target/task/anchor/project/versions
- [x] (local SQLite/Chromium evidence) from=to ใช้ version เดียว;before=nullappend
- [x] (local SQLite/Chromium evidence) transactionrenumberrank1..N และ status/completion/subtasks/recurhooks
- [x] (local SQLite/Chromium evidence) stale409 ไม่มี partial;idempotentretry คืนผลเดิม
- [x] (local SQLite/Chromium evidence) networktimeoutGETauthoritativestate ก่อนส่งซ้ำ

**เกณฑ์รับงาน:** parallelmove ไม่มี duplicate rank/สถานะผิด;done ลากยังผ่าน completionrules

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T035_T039_Test_Report.md / reports/T-035-039-batch-results.json. Local service and actual browser interactions only; native SQL2022/Windows/full device-browser/UAT/TC-AT remain NOT_RUN. Comments panel and history UI await T-044/T-040; polling T-047 remains pending.

### T-036 — Kanban layout และ Drag & Drop

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-035, T-032  
**Trace:** FR-21, FR-22 · **SRS:** §9.1  
**Acceptance:** AT-16

- [x] (local SQLite/Chromium evidence) cardtitle/ID/assignee/priority/due/overdue/checklistcount
- [x] (local SQLite/Chromium evidence) drag ข้าม column/in-column ผ่าน singlemoveAPI
- [x] (local SQLite/Chromium evidence) pending→saved หลัง serverack;refreshpersist
- [x] (local SQLite/Chromium evidence) handle/longpress ไม่แย่ง touchscroll

**เกณฑ์รับงาน:** ลากจริงแล้วข้อมูล persist ไม่เป็นเพียง visualmock

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T035_T039_Test_Report.md / reports/T-035-039-batch-results.json. Local service and actual browser interactions only; native SQL2022/Windows/full device-browser/UAT/TC-AT remain NOT_RUN. Comments panel and history UI await T-044/T-040; polling T-047 remains pending.

### T-037 — Keyboard/touch actions และ filtered-board guard

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-036, T-031  
**Trace:** FR-20, FR-23, FR-35, NFR-05, NFR-06 · **SRS:** §9.1  
**Acceptance:** AT-18

- [x] (local SQLite/Chromium evidence) text/assignee/priority/category/date/statusfilter ปิด reorder
- [x] (local SQLite/Chromium evidence) ปุ่ม clearfilters และเหตุผลที่ลากไม่ได้
- [x] (local SQLite/Chromium evidence) menuchangestatus และ movebefore/after ทางคีย์บอร์ด
- [x] (local SQLite/Chromium evidence) focus/aria feedback และ Viewer ไม่มี writecontrols

**เกณฑ์รับงาน:** ไม่ต้องลากก็ทำ status/order ได้;hiddencards ไม่ถูกจัดลำดับผิด

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T035_T039_Test_Report.md / reports/T-035-039-batch-results.json. Local service and actual browser interactions only; native SQL2022/Windows/full device-browser/UAT/TC-AT remain NOT_RUN. Comments panel and history UI await T-044/T-040; polling T-047 remains pending.

### T-038 — Kanban rollback และ conflict recovery

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** rollback optimistic UI และจัดการ conflict

**Depends on:** T-037  
**Trace:** FR-18, FR-21, FR-26 · **SRS:** §9.1, §9.6  
**Acceptance:** AT-17, AT-20

- [x] (local SQLite/Chromium evidence) networkfail/permission/validation คืน optimisticstate
- [x] (local SQLite/Chromium evidence) 409 โหลด columnlatest และแจ้งเหตุผล
- [x] (local SQLite/Chromium evidence) timeout ตรวจผลจาก server ไม่ doublemove
- [x] (local SQLite/Chromium evidence) tab หลายผู้ใช้และ dirtydetail ไม่สูญ draft

**เกณฑ์รับงาน:** จำลอง fail ทุกแบบแล้ว UI/DB กลับมาสอดคล้องกัน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 11. Phase 06: Comments / files / history

**Local evidence / limits:** TeamFlow_T035_T039_Test_Report.md / reports/T-035-039-batch-results.json. Local service and actual browser interactions only; native SQL2022/Windows/full device-browser/UAT/TC-AT remain NOT_RUN. Comments panel and history UI await T-044/T-040; polling T-047 remains pending.

### T-039 — Comments API และ append-only rules

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-026, T-010, T-011  
**Trace:** FR-27 · **SRS:** §9.4  
**Acceptance:** AT-21

- [x] (local SQLite/Chromium evidence) plain-text1–5000paginate50/max100
- [x] (local SQLite/Chromium evidence) writerpermission และ archived/deletedguard
- [x] (local SQLite/Chromium evidence) idempotentduplicateprevent;noedit/deleteUIv1
- [x] (local SQLite/Chromium evidence) comment/event/notificationintransaction

**เกณฑ์รับงาน:** HTML/script เป็น text และ comment retry ไม่ซ้ำ

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T035_T039_Test_Report.md / reports/T-035-039-batch-results.json. Local service and actual browser interactions only; native SQL2022/Windows/full device-browser/UAT/TC-AT remain NOT_RUN. Comments panel and history UI await T-044/T-040; polling T-047 remains pending.

### T-040 — Task events และ Admin audit

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** audit ครบและไม่บันทึก secrets

**Depends on:** T-027, T-016, T-021, T-030, T-039  
**Trace:** FR-29, FR-39, NFR-02 · **SRS:** §9.4, §13.1  
**Acceptance:** AT-21

- [x] (local SQLite/HTTP/Chromium evidence) taskbefore/afterfields actor/time/requestId
- [x] (local SQLite/HTTP/Chromium evidence) adminrole/reset/membership/configactionaudit
- [x] (local SQLite/HTTP/Chromium evidence) append-onlyAPI ไม่มี endpoint แก้ history
- [x] (local SQLite/HTTP/Chromium evidence) pagination และ redactionsecret/temp-password/tokens

**เกณฑ์รับงาน:** ทุก mutation สำคัญมี audit ที่อ่านตาม scope ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T040_T044_Test_Report.md / reports/T-040-044-batch-results.json. Local subset only; native SQL2022/Windows/full TC-AT/UAT NOT_RUN. Scheduler integration/full orphan/retention jobs remain T-060; shared polling T-047 remains pending. Actual model/effort NOT_VERIFIED.

### T-041 — Multipart upload และ file validation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** file validation, path safety และการ finalize

**Depends on:** T-026, T-006, T-002  
**Trace:** FR-28, NFR-02, NFR-03 · **SRS:** §9.5  
**Acceptance:** AT-22

- [x] (local SQLite/HTTP/Chromium evidence) streamtempfile ไม่ buffer ทั้งไฟล์;1 byte–10MiB ตาม locked schema
- [x] (local SQLite/HTTP/Chromium evidence) allowlist/magicUTF8validation;ZIP/Office ไม่ extract
- [x] (local SQLite/HTTP/Chromium evidence) normalizedfilename/randomstoragekey นอก webroot
- [x] (local SQLite/HTTP/Chromium evidence) permission/archivedguard ก่อน write และระหว่าง finalize
- [x] (local SQLite/HTTP/Chromium evidence) atomicDBmetadata/filemove กับ recoverycleanup

**เกณฑ์รับงาน:** files ปลอม/extension ต้องห้าม/pathtraversal ถูกปฏิเสธ;partialfail ไม่ทิ้งไฟล์ไม่ติดตาม

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T040_T044_Test_Report.md / reports/T-040-044-batch-results.json. Local subset only; native SQL2022/Windows/full TC-AT/UAT NOT_RUN. Scheduler integration/full orphan/retention jobs remain T-060; shared polling T-047 remains pending. Actual model/effort NOT_VERIFIED.

### T-042 — Upload quota reservation และ cleanup

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** quota reservation พร้อมกันและ crash recovery

**Depends on:** T-041, T-007  
**Trace:** FR-28, NFR-03 · **SRS:** §9.5, §13.2  
**Acceptance:** AT-22

- [x] (local SQLite/HTTP/Chromium evidence) persistreservation ก่อน stream และตรวจ bytes รวม5GiB
- [x] (local SQLite/HTTP/Chromium evidence) paralleluploads ไม่เกิน quota;failrelease
- [x] (local SQLite/HTTP/Chromium evidence) นับ storedsoftdeletedfiles ตาม resolvedretention
- [x] (local SQLite/HTTP/Chromium evidence) cleanupreservation/temp หลัง crash โดยไม่ลบ referencedfiles

**เกณฑ์รับงาน:** quota race ผ่านและ startuprecover พื้นที่ถูกต้อง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T040_T044_Test_Report.md / reports/T-040-044-batch-results.json. Local subset only; native SQL2022/Windows/full TC-AT/UAT NOT_RUN. Scheduler integration/full orphan/retention jobs remain T-060; shared polling T-047 remains pending. Actual model/effort NOT_VERIFIED.

### T-043 — Authorized download และ file delete

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ตรวจสิทธิ์ download/delete/restore และ retention

**Depends on:** T-042, T-011, T-040  
**Trace:** FR-05, FR-28, NFR-02 · **SRS:** §9.5  
**Acceptance:** AT-05, AT-08, AT-22, AT-30

- [x] (local SQLite/HTTP/Chromium evidence) download ตรวจ projectcurrentaccess ทุก request
- [x] (local SQLite/HTTP/Chromium evidence) attachmentheaders/nosniff ไม่ inlineexecutable
- [x] (local SQLite/HTTP/Chromium evidence) Uploader/Admin/ownerLeadsoftdelete และ restore30 วันตาม SRS;พื้นที่นับจน purge
- [x] (local SQLite/HTTP/Chromium evidence) missingdiskfile เป็น404/logrequestId ไม่เผย path
- [x] (local SQLite/HTTP/Chromium evidence) no public static URL/uploadsroute

**เกณฑ์รับงาน:** เดา fileID ข้าม project ไม่ได้และผู้หมดสิทธิ์ download ใหม่ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T040_T044_Test_Report.md / reports/T-040-044-batch-results.json. Local subset only; native SQL2022/Windows/full TC-AT/UAT NOT_RUN. Scheduler integration/full orphan/retention jobs remain T-060; shared polling T-047 remains pending. Actual model/effort NOT_VERIFIED.

### T-044 — Comments/files/history panels

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-032, T-039, T-040, T-043  
**Trace:** FR-27, FR-28, FR-29 · **SRS:** §11  
**Acceptance:** AT-21, AT-22

- [x] (local SQLite/HTTP/Chromium evidence) commentform/pagination plaintext และ dirtydraft
- [x] (local SQLite/HTTP/Chromium evidence) uploadprogress/size/type/quotaerror;authorizeddownload
- [x] (local SQLite/HTTP/Chromium evidence) softdelete/restore file confirmation ตาม uploaderpermission
- [x] (local SQLite/HTTP/Chromium evidence) historybefore/after ผู้ทำเวลาไทยและ read-only

**เกณฑ์รับงาน:** ฟังก์ชันร่วมงานครบผ่าน UI;error แสดงคงพอให้อ่าน

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


**Local evidence / limits:** TeamFlow_T040_T044_Test_Report.md / reports/T-040-044-batch-results.json. Local subset only; native SQL2022/Windows/full TC-AT/UAT NOT_RUN. Scheduler integration/full orphan/retention jobs remain T-060; shared polling T-047 remains pending. Actual model/effort NOT_VERIFIED.

## 12. Phase 07: มุมมองงาน ปฏิทิน และแจ้งเตือน

### T-045 — งานของฉันและ task list UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-031, T-032, T-033  
**Trace:** FR-19, FR-20, FR-24 · **SRS:** §9.2, §11  
**Acceptance:** AT-15, AT-19

- [x] (local subset evidence) assignee=selfdefault;created-by-me แยก view
- [x] (local subset evidence) วันนี้/overdue/future/nodue และ due-dateBangkok
- [x] (local subset evidence) filters/sort/page/search debounce ตาม API
- [x] (local subset evidence) listcolumns ครบและ taskdetail/statusmenu
- [x] (local subset evidence) Table ดีไซน์ SRS11: grouped status rows, owner, status/priority labels, start–due และ view tabs 4 แบบ

**เกณฑ์รับงาน:** งานของฉันไม่รวมงานที่สร้างให้คนอื่นโดยเงียบ;pagination ไม่ตกข้อมูล

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T045_T049_Test_Report.md / reports/T-045-049-batch-results.json. Backend14/14 + all407/407(Node375+frontend32) PASS. Chromium37 distinct cases verified after focused3-case recheck; raw regression36PASS/1 selector FAIL, corrected recheck2PASS plus strengthened My Tasks1PASS. NativeSQL152SKIP/Windows/full TC-AT/UAT NOT_RUN; all five IN_PROGRESS. Actual model/effort NOT_VERIFIED.

### T-046 — Calendar/Gantt และรายการวันที่ไม่ครบ

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** เพิ่ม Gantt/date boundaries/pagination/accessibility ร่วม Calendar

**Depends on:** T-045, T-031  
**Trace:** FR-25 · **SRS:** §9.3–9.3.1\
**Acceptance:** AT-15, AT-19

- [x] (local subset evidence) monthprev/next/today และ filterscope
- [x] (local subset evidence) duedate-onlyitem ไม่ durationbar ไม่ drag
- [x] (local subset evidence) คลิกงาน opendetail และ no-duelist แยก
- [x] (local subset evidence) inclusiveboundary ตาม Bangkok ไม่ UTCshift

- [x] (local subset evidence) Gantt inclusive bars/due-only markers/incomplete-date list; ไม่เติมวันสมมติ
- [x] (local subset evidence) เลื่อนช่วง/วันนี้/day-week-month, overlap viewport, pagination ครบและ large dataset
- [x] (local subset evidence) Bangkok midnight/cross-month/year/leapday และ start=due
- [x] (local subset evidence) คลิก/Enter เปิด detail เดิม; Viewer/archived อ่านอย่างเดียว; date edits ใช้ form/version/atomic transaction เดิม

**เกณฑ์รับงาน:** calendar/list/Gantt ใช้ filter/API/สิทธิ์เดียวกัน; TC-049/AT-19 ครบทั้ง Calendar/Gantt พร้อม provider-specific/browser evidence

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T045_T049_Test_Report.md / reports/T-045-049-batch-results.json. Backend14/14 + all407/407(Node375+frontend32) PASS. Chromium37 distinct cases verified after focused3-case recheck; raw regression36PASS/1 selector FAIL, corrected recheck2PASS plus strengthened My Tasks1PASS. NativeSQL152SKIP/Windows/full TC-AT/UAT NOT_RUN; all five IN_PROGRESS. Actual model/effort NOT_VERIFIED.

### T-047 — Shared refresh และ dirty draft preservation

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** polling/session/conflict โดยรักษาร่างผู้ใช้

**Depends on:** T-045, T-046, T-044, T-038, T-017  
**Trace:** FR-26 · **SRS:** §9.6  
**Acceptance:** AT-20

- [x] (local subset evidence) visibleonlinetabpoll≤10s;focusrequest ทันที
- [x] (local subset evidence) stoppoll เมื่อ hidden/offline/logout
- [x] (local subset evidence) changedatabadge แจ้งว่ามีข้อมูลเปลี่ยน โดยไม่แทน dirtyform
- [x] (local subset evidence) accessremoved ปิดหน้าที่ไม่มีสิทธิ์และ clearclientdata
- [x] (local subset evidence) poll ไม่ต่อ sessionidle;intentionalinteraction เท่านั้น

**เกณฑ์รับงาน:** คนอื่นแก้แล้วเห็นในเวลาที่กำหนดโดย draft ไม่หาย

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T045_T049_Test_Report.md / reports/T-045-049-batch-results.json. Backend14/14 + all407/407(Node375+frontend32) PASS. Chromium37 distinct cases verified after focused3-case recheck; raw regression36PASS/1 selector FAIL, corrected recheck2PASS plus strengthened My Tasks1PASS. NativeSQL152SKIP/Windows/full TC-AT/UAT NOT_RUN; all five IN_PROGRESS. Actual model/effort NOT_VERIFIED.

### T-048 — Notification event dispatch

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** event dispatch ต้องไม่ซ้ำและไม่รั่วข้อมูล

**Depends on:** T-022, T-027, T-039, T-029, T-040  
**Trace:** FR-30 · **SRS:** §9.6  
**Acceptance:** AT-23

- [x] (local subset evidence) assignment ให้ผู้รับใหม่;comment/status ให้ creator/assignee
- [x] (local subset evidence) ไม่แจ้ง self/inactive/noaccess
- [x] (local subset evidence) transaction กับ event/task;dedupekeys
- [x] (local subset evidence) unassignpermissioncleanup แจ้ง ownerAdmin/Lead

**เกณฑ์รับงาน:** recipients ตาม SRS และไม่มีเนื้อหาถึงคนหมดสิทธิ์

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T045_T049_Test_Report.md / reports/T-045-049-batch-results.json. Backend14/14 + all407/407(Node375+frontend32) PASS. Chromium37 distinct cases verified after focused3-case recheck; raw regression36PASS/1 selector FAIL, corrected recheck2PASS plus strengthened My Tasks1PASS. NativeSQL152SKIP/Windows/full TC-AT/UAT NOT_RUN; all five IN_PROGRESS. Actual model/effort NOT_VERIFIED.

### T-049 — Due reminder scheduler

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** เวลา reminder, deduplication และ restart

**Depends on:** T-048, T-008, T-006  
**Trace:** FR-30, NFR-03 · **SRS:** §9.6, §13.2  
**Acceptance:** AT-23

- [x] (local subset evidence) 60sjob สำหรับ tomorrow/today/overdueBangkok
- [x] (local subset evidence) skipdone/deleted/archived/unassigned/inactive/noaccess
- [x] (local subset evidence) dedupe(task,recipient,type,date)DBunique
- [x] (local subset evidence) startup เฉพาะ reminder ปัจจุบันไม่ย้อนหลังทุกวัน
- [x] (local subset evidence) GET API ไม่สร้าง notification ธุรกิจ

**เกณฑ์รับงาน:** restart/paralleljob ไม่แจ้งซ้ำวันเดียว;ไม่พึ่งเว็บเปิดเพื่อบันทึก reminder

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

**Local evidence / limits:** TeamFlow_T045_T049_Test_Report.md / reports/T-045-049-batch-results.json. Backend14/14 + all407/407(Node375+frontend32) PASS. Chromium37 distinct cases verified after focused3-case recheck; raw regression36PASS/1 selector FAIL, corrected recheck2PASS plus strengthened My Tasks1PASS. NativeSQL152SKIP/Windows/full TC-AT/UAT NOT_RUN; all five IN_PROGRESS. Actual model/effort NOT_VERIFIED.

> Checklist T-050–T-054 below records executed local SQLite/Chromium subset only. Full native SQL/Windows/TC-AT/UAT acceptance remains NOT_RUN; all five IN_PROGRESS. Report: TeamFlow_T050_T054_Test_Report.md.

### T-050 — Notification list/read-one/read-all

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** notification access และ read-all concurrency

**Depends on:** T-048, T-049, T-011  
**Trace:** FR-31 · **SRS:** §9.6  
**Acceptance:** AT-23

- [x] own-recipientaccess รวม currentparentaccess
- [x] pagination50/unreadcount/read_at
- [x] read-one/read-all ไม่แก้ของผู้อื่น
- [x] retention90day ผ่าน job ไม่แอบ mutate จาก GET

**เกณฑ์รับงาน:** IDs ที่เดาของคนอื่นอ่าน/เปลี่ยน read ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-051 — Notification center และ badge

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-050, T-047  
**Trace:** FR-30, FR-31 · **SRS:** §11  
**Acceptance:** AT-23

- [x] unreadbadge/list/readone/readall
- [x] เปิด task ได้เมื่อยังมี access;404closegracefully
- [x] pollrefresh โดยไม่เขียน notification ซ้ำ
- [x] ระบุแจ้งภายในเว็บไม่มี email/push เมื่อปิดเว็บ

**เกณฑ์รับงาน:** notificationflow ครบจาก assignment ถึง readall

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 13. Phase 08: รายงาน CSV และ responsive

### T-052 — Report aggregates และนิยามตัวเลข

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ตัวเลขรายงานต้องตรงนิยามและสิทธิ์

**Depends on:** T-031, T-027, T-011  
**Trace:** FR-32, FR-33 · **SRS:** §10  
**Acceptance:** AT-24

- [x] totalstatussum/overdue/unassigned/doneperiod/completionpct/workload
- [x] team=ownerteam person=assignee ไม่ใช้ทีมคนรับ
- [x] datebasiscreated/due/completed และ localinterval→UTC
- [x] reopen ล้าง completion และ zero-total ไม่ NaN
- [x] aggregatequeryscoped ก่อนคำนวณ

**เกณฑ์รับงาน:** metric นิยามตรง SRS และตัวเลขไม่รวม hidden/archived/deleted

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-053 — CSV export ตาม filter/access

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** CSV scope และ formula injection

**Depends on:** T-052  
**Trace:** FR-34 · **SRS:** §10  
**Acceptance:** AT-24, AT-05

- [x] sharedfilter กับ reports/list;UTF8BOM/RFC4180
- [x] ครบ specifiedcolumns ไม่ exportcomment/files/password
- [x] formula-neutralization รวม leadingwhitespace/tab/CR
- [x] streamexport ไม่ติด page50;cap50000 แจ้งไม่ตัดเงียบ

**เกณฑ์รับงาน:** ไทย/quote/newline/formula test ผ่านและ rows ตรง filterscope

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-054 — Dashboard/report และ export UI

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-052, T-053, T-051  
**Trace:** FR-32, FR-33, FR-34 · **SRS:** §10–11  
**Acceptance:** AT-24

- [x] scopepickerteam/project/person และ datebasis/range
- [x] metriclabels และ zerostate;workloadtable
- [x] CSVlink ใช้ filter เดียวกับที่เห็น
- [x] ไม่แสดง quality/productivityranking ที่ไม่มีข้อมูลจริง

**เกณฑ์รับงาน:** ผู้ใช้ตรวจความหมายและฐานวันที่ของตัวเลขได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-055 — Responsive และ accessible interaction review

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-054, T-037, T-024, T-018, T-044, T-046\
**Trace:** FR-23, FR-35, NFR-05, NFR-06 · **SRS:** §11, §13.1  
**Acceptance:** AT-18, AT-26

- [ ] ทุก screeninventory ที่360px/tablet/desktop/200%zoom
- [x] keyboard/focuslabels/modaldialog/escape/returnfocus
- [x] ไม่สื่อ status ด้วยสีอย่างเดียว;touchmenualternative
- [x] ทดสอบ controls ไม่ล้น/ข้อความไทยไม่ทับ
- [x] review ดีไซน์ SRS11/mock ครบ Table/Gantt/Calendar/Kanban รวม mobile/keyboard

**เกณฑ์รับงาน:** มี reviewevidence ทุกหน้าจอหลักและไม่มี blockingaccessibilitydefect

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 14. Phase 09: PWA / offline / browser

Local evidence only: see TeamFlow_T055_T059_Test_Report.md and TeamFlow_T056_PWA_Followup_Report.md. The prior native worker installation/cache FAIL is resolved locally; native waiting-update lifecycle preserves a synthetic open draft. Full task-edit update notice/OS installation/full screen200%/physical browser matrix/native SQL/Windows/full TC-AT acceptance remain NOT_RUN. All five tasks remain IN_PROGRESS.

### T-056 — PWA manifest/icons/service worker

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-012, T-006  
**Trace:** FR-36 · **SRS:** §9.6  
**Acceptance:** AT-26

- [ ] manifestname/start_url/scope/icons และ installbehavior
- [x] cacheversioningstaticassets เท่านั้น
- [x] ไม่ cacheAPI/login/file/users/tasks หรือ authresponse
- [x] HTTPS/localrequirements ชัดไม่สัญญา nativeapp

**เกณฑ์รับงาน:** SWroutingtests ยืนยันไม่มี sensitive response ใน cache

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

Local evidence only: see TeamFlow_T055_T059_Test_Report.md and TeamFlow_T056_PWA_Followup_Report.md. The prior native worker installation/cache FAIL is resolved locally; native waiting-update lifecycle preserves a synthetic open draft. Full task-edit update notice/OS installation/full screen200%/physical browser matrix/native SQL/Windows/full TC-AT acceptance remain NOT_RUN. All five tasks remain IN_PROGRESS.

### T-057 — Offline/reconnect/logout cache behavior

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** cache/logout ต้องไม่เผยข้อมูลผู้ใช้เก่า

**Depends on:** T-056, T-047, T-055  
**Trace:** FR-35, FR-36 · **SRS:** §9.6, §11  
**Acceptance:** AT-26

- [x] offlinebanner/shell ต้อง online ไม่มี writequeue
- [x] reconnectrefreshauthoritative ข้อมูลก่อนเปิด write
- [x] logout ล้าง in-memoryuserdata ไม่ดึง cachedteamdata กลับ
- [ ] SWupdate ไม่ล้าง dirtydraft หรือบังคับ reload กลาง edit

**เกณฑ์รับงาน:** offline/logout ไม่มีข้อมูลทีมหลงใน persistentcache

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

Local evidence only: see TeamFlow_T055_T059_Test_Report.md and TeamFlow_T056_PWA_Followup_Report.md. The prior native worker installation/cache FAIL is resolved locally; native waiting-update lifecycle preserves a synthetic open draft. Full task-edit update notice/OS installation/full screen200%/physical browser matrix/native SQL/Windows/full TC-AT acceptance remain NOT_RUN. All five tasks remain IN_PROGRESS.

### T-058 — Browser matrix และ PWA/touch QA

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-057, T-037  
**Trace:** FR-23, FR-35, FR-36, NFR-05, NFR-06 · **SRS:** NFR-06, §14  
**Acceptance:** AT-18, AT-26

- [ ] recordversionChrome/Edge/Firefox/Safaricurrent+previous ณทดสอบ
- [ ] desktop/touchkeyboarddrag/menu/upload/dialog
- [ ] ติดตั้ง PWA เมื่อ browser รองรับและ fallback เมื่อไม่รองรับ
- [x] markNOT_RUN ถ้าไม่มี device จริง ไม่ตีว่า emulation แทนทุกอย่าง

**เกณฑ์รับงาน:** browser/device ผลตรวจครบหรือ blocked ชัด

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 15. Phase 10: Operations / backup / Windows handoff

Local evidence only: see TeamFlow_T055_T059_Test_Report.md and TeamFlow_T056_PWA_Followup_Report.md. The prior native worker installation/cache FAIL is resolved locally; native waiting-update lifecycle preserves a synthetic open draft. Full task-edit update notice/OS installation/full screen200%/physical browser matrix/native SQL/Windows/full TC-AT acceptance remain NOT_RUN. All five tasks remain IN_PROGRESS.

### T-059 — Health endpoints และ operational logs

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-006, T-009, T-040  
**Trace:** FR-39, NFR-02, NFR-07 · **SRS:** §13.1–13.2  
**Acceptance:** AT-28, AT-30

- [x] livepublicstatusonly;readylocal/proxyrestricted
- [x] DB/storagechecks และ requestIdstructuredlog
- [x] secretredaction/requestbody ไม่ logpassword/upload
- [x] logrotation และ Adminauditlinkederrors

**เกณฑ์รับงาน:** readinessfail ชัดและ public ไม่มี DBpath/versionsecrets

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

Local evidence only: see TeamFlow_T055_T059_Test_Report.md and TeamFlow_T056_PWA_Followup_Report.md. The prior native worker installation/cache FAIL is resolved locally; native waiting-update lifecycle preserves a synthetic open draft. Full task-edit update notice/OS installation/full screen200%/physical browser matrix/native SQL/Windows/full TC-AT acceptance remain NOT_RUN. All five tasks remain IN_PROGRESS.

### T-060 — Retention jobs และ orphan recovery

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** purge, tombstone และ orphan recovery

**Depends on:** T-030, T-042, T-050, T-010, T-002  
**Trace:** FR-17, FR-28, FR-31, FR-39, NFR-03, NFR-07 · **SRS:** §8.4, §13.2  
**Acceptance:** AT-13, AT-22

- [ ] purge30day พร้อม audit ก่อนลบ parent
- [ ] notification90day/session/idempotencyexpirycleanup
- [ ] recurrence tombstone ไม่หายตาม resolveddesign
- [ ] orphanfile/temp/reservationstartupscan ไม่ลบ referenced
- [ ] failedfilesystemcleanupretry/log ไม่ claim ครบ

**เกณฑ์รับงาน:** crash/purge/restarttests ไม่มีข้อมูลหรือพื้นที่ค้างที่ไม่ติดตาม

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-061 — Write freeze และ job coordination

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** write freeze กับ uploads/jobs ต้องประสานกัน

**Depends on:** T-059, T-060  
**Trace:** FR-38, FR-39 · **SRS:** §13.4  
**Acceptance:** AT-25

- [ ] maintenance หยุด writes/jobs และรอ activeupload/request
- [ ] อ่านได้ตาม mode ที่คู่มือระบุไม่ halfstate
- [ ] singleinstance/maintenanceownership และ safeunlockfail
- [ ] statevisible ให้ผู้ใช้รู้กำลังสำรอง

**เกณฑ์รับงาน:** snapshotfreeze ไม่มี writes แทรกและ failure ไม่ค้างระบบโดยไม่แจ้ง

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-062 — Consistent backup script และ manifest

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** SQL backup และ uploads เป็น snapshot คู่กัน

**Depends on:** T-061, T-007, T-043  
**Trace:** FR-38, NFR-04, NFR-07 · **SRS:** §13.4  
**Acceptance:** AT-25

- [ ] SQL Server BACKUP DATABASE WITH COPY_ONLY, CHECKSUM (.bak) + upload snapshot ภายใต้ freeze; ตรวจสิทธิ์ SQL service account บน backup path
- [ ] manifestapp/schema/date/filecount/SHA256
- [ ] exitnonzero เมื่อ fail และปลด freeze อย่างปลอดภัย
- [ ] ไม่รวม plaintext.envsecrets ในชุดแชร์;backupstorageaccessprivate
- [ ] WindowsTaskSchedulerexample7daily/4weekly และ copy อีก location

**เกณฑ์รับงาน:** restore-readybackup ที่ checksum ตรง;ไม่ใช่ copyDB อย่างเดียว

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-063 — Restore/verification script และ rollback

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** actual restore, session revoke และ rollback

**Depends on:** T-062, T-014  
**Trace:** FR-38, FR-40, NFR-03, NFR-04, NFR-07 · **SRS:** §13.4–13.5  
**Acceptance:** AT-25

- [ ] stopapp ตรวจ manifest/hashes/schema ก่อน overwrite
- [ ] RESTORE DATABASE ลง isolated target + files คู่กัน; ตรวจ schema compatibility; VERIFYONLY ไม่แทน actual restore; ไม่ overwrite DB อื่นโดย default
- [ ] revokesessions ทั้งหมดหลัง restore
- [ ] verifypermissions/taskcounts/filedownload และ health
- [ ] recordRPO/RTO จากจริงไม่จากค่าคาด

**เกณฑ์รับงาน:** กู้ลง cleaninstance ได้ครบและ sessions เก่าใช้ไม่ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-064 — Migration upgrade และ recovery procedure

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** migration failure และกู้คืนโดยไม่สูญข้อมูล

**Depends on:** T-063, T-007  
**Trace:** FR-40, NFR-07 · **SRS:** §13.5  
**Acceptance:** AT-25, AT-28

- [ ] preupgradebackup/runtime/schema compatibility
- [ ] migrationrepeat-safe/checksumguard
- [ ] app/schemarollbackpath และ noauto-downgradeunsafe
- [ ] fixtureupgradeexistingdata รักษา users/tasks/files

**เกณฑ์รับงาน:** อัปเดตรุ่นทดสอบแล้ว data/history คง;rollback ใช้ backup ได้

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-065 — Windows scripts และ installation guide

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-064, T-006, T-059, T-019  
**Trace:** FR-37, FR-39, FR-40, NFR-07, NFR-08 · **SRS:** §3, §13.5  
**Acceptance:** AT-28

- [ ] runtime/start/serviceaccount/dataACL และ start-on-reboot
- [ ] IIS/reverseproxy/HTTPS/exactorigin/trustedproxy คู่มือ
- [ ] backupTaskScheduler/logrotation/update/restore ขั้นตอน
- [ ] ระบุ ControlPanelunknown ไม่ claim รองรับ;freshinstalltest เมื่อมี Windows

**เกณฑ์รับงาน:** codepack มีขั้นตอน Windows ที่ตรวจซ้ำได้;server จริงยัง deploy โดยผู้ใช้

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T065_T069_Test_Report.md / reports/T-065-069-batch-results.json. Checklist acceptance remains open for required provider/Windows/full TC-AT/UAT evidence; source/local subset verified. Declared effort Medium; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-066 — คู่มือ Admin/Lead/Member และ developer handoff

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-065, T-054, T-058  
**Trace:** FR-40 · **SRS:** §11, §13.5  
**Acceptance:** AT-28

- [ ] roles/workflows/setup/temp-password/reset/memberaccess
- [ ] Kanbanfilter/reorder/conflict/recurrence/monthlyanchor
- [ ] filequota/archived/trash/notification/PWAlimitations
- [ ] developerAPI/architecture/config/migration/testcommands

**เกณฑ์รับงาน:** ผู้ใช้ใหม่ตามคู่มือทำ workflow หลักได้โดยไม่ถามผู้พัฒนา

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T065_T069_Test_Report.md / reports/T-065-069-batch-results.json. Checklist acceptance remains open for required provider/Windows/full TC-AT/UAT evidence; source/local subset verified. Declared effort Medium; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 16. Phase 11: Testing และ UAT

### T-067 — Complete test fixtures และ automated harness

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** fixtures/harness SQL Server จริงและ isolation

**Depends on:** T-004, T-007, T-011  
**Trace:** FR-40 · **SRS:** §14  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] A/L1/L2/M1/M2/V/P1/P2/Pshared/Pprivate ตาม SRS
- [ ] freshdb isolated reset/timeclockBangkok controllable
- [ ] fixtures/commands/results แยก SQLite local กับ SQL2022 integration; ไม่ใช้ local provider เป็น production หรืออ้าง lock/backup tests ข้าม engine
- [ ] integrationrequestwithcookies/CSRF/origin/keys
- [ ] แยก seedperformance จาก UAT/production

**เกณฑ์รับงาน:** test รันซ้ำได้ไม่ใช้ข้อมูลจริงและผลไม่ขึ้นกับวันที่ปัจจุบัน

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T065_T069_Test_Report.md / reports/T-065-069-batch-results.json. Checklist acceptance remains open for required provider/Windows/full TC-AT/UAT evidence; source/local subset verified. Declared effort High; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-068 — ทดสอบ setup/auth/users และ session edges

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบ session/security และ auth edge cases

**Depends on:** T-067, T-018, T-017, T-019  
**Trace:** FR-01, FR-02, FR-03, FR-04, NFR-02 · **SRS:** §6, §14  
**Acceptance:** AT-01, AT-02, AT-03, AT-04

- [ ] AT01–04 รวม setup/adminconcurrentlastguard
- [ ] idle/absoluteexpiration/pollnotkeepalive
- [ ] passwordreset/rolechange/deactivate revoke
- [ ] noplaintext/passwordleak และ CLIrecoveryaudit

**เกณฑ์รับงาน:** ผล AT01–04 และ sessionextendedcasesPASS พร้อม evidence

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T065_T069_Test_Report.md / reports/T-065-069-batch-results.json. Checklist acceptance remains open for required provider/Windows/full TC-AT/UAT evidence; source/local subset verified. Declared effort High; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-069 — ทดสอบสิทธิ์ข้ามทีมและ revocation ทุกช่องทาง

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบสิทธิ์ข้ามทีมและถอนสิทธิ์ทุกช่องทาง

**Depends on:** T-067, T-022, T-043, T-053, T-050, T-024  
**Trace:** FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, NFR-02 · **SRS:** §4, §7, §14  
**Acceptance:** AT-05, AT-06, AT-07, AT-08, AT-29, AT-30

- [ ] allow/denyrole/resourceendpointmatrix
- [ ] searchcounts/reportCSV/notification/fileIDOR
- [ ] cross-teamEditor/Viewer/team-onlynoaccess
- [ ] archivedwrites/revokeopen-tab/requestnewdenied
- [ ] CSRF/noOrigin/spoofproxy/SQLi/XSS ตาม AT30

**เกณฑ์รับงาน:** ไม่มีข้อมูลรั่วและ AT05–08/29/30PASS

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T065_T069_Test_Report.md / reports/T-065-069-batch-results.json. Checklist acceptance remains open for required provider/Windows/full TC-AT/UAT evidence; source/local subset verified. Declared effort High; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-070 — ทดสอบงาน งานซ้ำ การลบ และแก้พร้อมกัน

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบ recurrence, purge และ concurrent writes

**Depends on:** T-067, T-033, T-060, T-027  
**Trace:** FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, NFR-03 · **SRS:** §8, §14  
**Acceptance:** AT-09, AT-10, AT-11, AT-12, AT-13, AT-14

- [ ] validation/nullassignee/Viewernoteligible
- [ ] checklistclosedguard/completion/reopen
- [ ] monthlyanchor/leapyear/overdueone-successor
- [ ] retry/concurrentdone/rollbackfailure
- [ ] softdelete/restore/purgeseries/filecleanup

**เกณฑ์รับงาน:** AT09–14PASS ไม่มี duplicate หรือ halftransaction

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T070_T074_Test_Report.md / reports/T-070-074-batch-results.json. New journeys/provider wrappers and grouped local QA; required native provider/Windows/full TC-AT/RV/UAT acceptance remains open. Declared effort High; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-071 — ทดสอบ Kanban/list/calendar/Gantt และ refresh

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-067, T-038, T-045, T-046, T-047, T-058  
**Trace:** FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25, FR-26, NFR-05, NFR-06 · **SRS:** §9.1–9.3, §14  
**Acceptance:** AT-15, AT-16, AT-17, AT-18, AT-19, AT-20

- [ ] Bangkokmidnight/null-due/filter/pagination
- [ ] persistdrag/crosscolumn/incolumn/doneguard
- [ ] samecolumnconcurrent/timeout/403/409/offline
- [ ] keyboardtouch/filterguard และ dirtydraft
- [ ] >500boardfallback ไม่ทำ order เพี้ยน

**เกณฑ์รับงาน:** AT15–20PASS ทั้ง API และ UI ที่ทดสอบได้

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T070_T074_Test_Report.md / reports/T-070-074-batch-results.json. New journeys/provider wrappers and grouped local QA; required native provider/Windows/full TC-AT/RV/UAT acceptance remains open. Declared effort Medium; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-072 — ทดสอบ comments/files/audit/notifications

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบ file quota/recovery และ notification dedupe

**Depends on:** T-067, T-044, T-051, T-060  
**Trace:** FR-27, FR-28, FR-29, FR-30, FR-31, NFR-02, NFR-03 · **SRS:** §9.4–9.6, §14  
**Acceptance:** AT-21, AT-22, AT-23

- [ ] commentscript/doubleclick/auditimmutability
- [ ] 10MiBboundary/oversize/magicfake/pathtraversal
- [ ] quotarace/fileDBpartial/crashcleanup
- [ ] recipientself/noaccess/readothers/reminderdedupe
- [ ] 90daycleanup และ readallscope

**เกณฑ์รับงาน:** AT21–23PASS;attachmentallowlist ไม่อ้างว่า antivirus

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T070_T074_Test_Report.md / reports/T-070-074-batch-results.json. New journeys/provider wrappers and grouped local QA; required native provider/Windows/full TC-AT/RV/UAT acceptance remains open. Declared effort High; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-073 — ทดสอบรายงาน CSV และ PWA

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-067, T-054, T-057  
**Trace:** FR-32, FR-33, FR-34, FR-35, FR-36 · **SRS:** §10, §9.6, §14  
**Acceptance:** AT-24, AT-26

- [ ] datesbasismetricreopen/zero/ownerteam
- [ ] CSVthai/formula/newline/allrowsnotpage50
- [ ] SWcacheAPI/file/loginabsence
- [ ] offline/logout/reconnectdirtyform

**เกณฑ์รับงาน:** AT24/26PASS โดยตรวจ generatedCSV และ cache จริง

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T070_T074_Test_Report.md / reports/T-070-074-batch-results.json. New journeys/provider wrappers and grouped local QA; required native provider/Windows/full TC-AT/RV/UAT acceptance remains open. Declared effort Medium; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-074 — ทดสอบ restart/backup/restore/migration และ Windows

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ทดสอบ restore/migration/restart บน Windows

**Depends on:** T-067, T-063, T-064, T-065, T-059  
**Trace:** FR-37, FR-38, FR-39, FR-40, NFR-03, NFR-04, NFR-07 · **SRS:** §13.4–13.5, §14  
**Acceptance:** AT-25, AT-28

- [ ] writesduringbackupfreeze และ fileschecksum
- [ ] cleanrestore/sessionrevocation/restartpersist
- [ ] startuporphans/migrationrollback/errorlogging
- [ ] freshZIPinstall บน Windows เมื่อมี environment
- [ ] ถ้าไม่มี Windows ให้ BLOCKED/NOT_RUN ไม่ใช้ Linux ผลแทน

**เกณฑ์รับงาน:** AT25/AT28 ผ่านจริงบน provider/environment ที่กำหนด; ถ้า Windows ไม่มีให้ BLOCKED/NOT_RUN และไม่ปิด T-074; ใช้ candidate ZIP ทดสอบก่อน T-077

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T070_T074_Test_Report.md / reports/T-070-074-batch-results.json. New journeys/provider wrappers and grouped local QA; required native provider/Windows/full TC-AT/RV/UAT acceptance remains open. Declared effort High; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-075 — Load/performance test 30 users

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** วิเคราะห์ load, SQL locks และ bottlenecks

**Depends on:** T-067, T-031, T-052, T-035, T-041  
**Trace:** FR-26, NFR-01 · **SRS:** §13.3  
**Acceptance:** AT-27

- [ ] seed30users/6teams/20projects/10000tasks/20000comments
- [ ] 15activesessions10minutes70/30 และ warmup
- [ ] recordreadp95≤2s/writep95≤3s/error<1%/poll≤10s
- [ ] DBbusy/reorderconcurrency/CSVmemory/startupmeasure
- [ ] บันทึก OS/runtime/spec/version และ excludederrors

**เกณฑ์รับงาน:** AT27 รายงานผลจริง;fail แก้ query/index แล้วทดสอบเฉพาะเหตุที่เหลือ

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T075_T077_Test_Report.md. T075 isolated SQLite performance; T076 unsigned AT/UAT register; T077 candidate archive/inventory/fresh local extraction. Required dependencies/native SQL2022/Windows/full acceptance/human sign-off remain open; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-076 — UAT และ acceptance sign-off record

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานขอบเขตชัด ใช้ default; ตรวจ checklist และ acceptance ตามเดิม

**Depends on:** T-068, T-069, T-070, T-071, T-072, T-073, T-074, T-075  
**Trace:** FR-40, NFR-01, NFR-02, NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-08 · **SRS:** §14–16  
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [ ] รวม AT01–30 พร้อม PASS/FAIL/BLOCKED/NOT_RUN และหลักฐาน
- [ ] เดิน journey เริ่มองค์กร/ทำงาน/ข้ามทีม/ลาก fail
- [ ] triagedefectseverity และ retest สิ่งที่แก้
- [ ] บันทึกผู้ review/date/baselineversion;ไม่ tick ผ่านแทนผู้ใช้

**เกณฑ์รับงาน:** required acceptance/Windows/UAT ผ่านจริงและไม่มี critical/major open issues; สิ่งยังไม่ทดสอบต้องคงสถานะค้าง ไม่ปิด T-076

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T075_T077_Test_Report.md. T075 isolated SQLite performance; T076 unsigned AT/UAT register; T077 candidate archive/inventory/fresh local extraction. Required dependencies/native SQL2022/Windows/full acceptance/human sign-off remain open; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน


## 17. Phase 12: Packaging และ release

### T-077 — Source ZIP และ release completeness audit

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** ตรวจความครบถ้วน source และหลักฐาน release

**Depends on:** T-076, T-066  
**Trace:** FR-40, NFR-07, NFR-08 · **SRS:** §13.5, §16  
**Acceptance:** AT-28

- [ ] source/migrations/config/scripts/tests/README/license ครบ
- [ ] exclude.env/liveDB/uploads/logs/sessions/node_modules/testcredentials
- [ ] archiveinventory/checksum และ freshunzipquickstart
- [ ] coverageFR/NFR/BR/endpoint/screen/AT ทั้งหมดพร้อมหลักฐาน
- [ ] ส่งผู้ใช้ deploy เองไม่เผยแพร่หรือแก้ DNS

**เกณฑ์รับงาน:** releasechecklist ครบ;ZIP ไม่มี secret;candidate ที่ pendingWindows/UAT ต้องติด release notes และยังไม่ปิด T-077; final ต้องผ่าน dependencies

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T075_T077_Test_Report.md. T075 isolated SQLite performance; T076 unsigned AT/UAT register; T077 candidate archive/inventory/fresh local extraction. Required dependencies/native SQL2022/Windows/full acceptance/human sign-off remain open; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

## 17A. Phase 13: Monday-style addendum (owner-approved 8 ตุลาคม 2026)

ลำดับ: T-078 → (T-079, T-080, T-081, T-083) → งาน feature → T-091. งาน UI หลัก (T-086/T-087/T-089) รอเจ้าของรีวิว mock T-079 ก่อน

### T-078 — อนุมัติ addendum และรวมเข้า Requirements/SRS/Test Plan/Test Cases

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งานเอกสาร/traceability ขอบเขตชัด

**Depends on:** T-003, T-004
**Trace:** FR-41–FR-53, NFR-09, BR-19–BR-23 · **SRS:** §4.4, §5.3, §9.7–§9.11, §12.6, §13.6, §14
**Acceptance:** ตรวจตามเกณฑ์รับงานนี้ + test manifest ที่เกี่ยวข้อง

- [x] บันทึกการอนุมัติของเจ้าของและคำตอบ I.1–I.5
- [x] รวม FR/NFR/BR/UX/AN เข้า Requirements และพฤติกรรม/สิทธิ์/entities/planned routes เข้า SRS
- [x] เพิ่ม AT-31–AT-40, TC-085–TC-099, UT-21–UT-23 และ T-079–T-091
- [ ] ปรับ manifest/checker และรัน planning/contract checks

**เกณฑ์รับงาน:** เอกสารหลักสอดคล้องกัน, FR-46 ระบุ deferred, route ยังไม่เข้า OpenAPI และ checks ที่เกี่ยวข้องผ่าน

**Status:** IN_REVIEW · **Evidence:** TeamFlow_T078_Addendum_Merge_Report.md; อนุมัติจากคำสั่งเจ้าของ 8 ต.ค. 2026 ให้ทำ T-078 ต่อ; checks รอทดสอบรวมชุด T-078–T-082 ตามคำสั่งเจ้าของ; actual model/effort NOT_VERIFIED

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-079 — Mock UI monday-style ใหม่ (ทุกหน้า + animation) ให้เจ้าของรีวิว

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** งาน UI mock ขอบเขตชัด

**Depends on:** T-078
**Trace:** UX-01–UX-06, NFR-09 · **SRS:** §11, §13.6
**Acceptance:** AT-39

- [x] mock Personal/Workspace/Admin/Docs/Files/Workload/Overview/side panel
- [x] แสดง AN-01–AN-13 และ reduced motion
- [x] ตรวจ 360/768/1440px และคีย์บอร์ด
- [x] บันทึกผลรีวิวของเจ้าของ ไม่ติ๊กแทน — เจ้าของอนุมัติในแชท 8 ต.ค. 2026 ไม่มีข้อแก้

**เกณฑ์รับงาน:** เจ้าของรีวิว mock แล้วและบันทึกข้อแก้; ยังไม่แก้แอปจริง

**Status:** DONE · **Evidence:** TeamFlow_UI_Monday_Mock.html, TeamFlow_T079_Mock_Report.md, TeamFlow_T078_T082_Test_Report.md; เจ้าของอนุมัติ mock ในแชทเมื่อ 8 ต.ค. 2026 โดยไม่มีข้อแก้ (AT-39 ของแอปจริงยังรอ T-089/T-091)

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-080 — Job titles: schema/API/Admin UI/filter/report/CSV

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** CRUD/report ขอบเขตชัด

**Depends on:** T-078
**Trace:** FR-41, BR-19, BR-20 · **SRS:** §5.3, §12.6
**Acceptance:** AT-31

- [x] migration SQLite + SQL Server job_titles/users.job_title_id
- [x] API + contract + audit
- [x] Admin UI และป้ายใน picker/members/report
- [x] filter/report/CSV column
- [x] tests ยืนยันตำแหน่งไม่เปลี่ยนสิทธิ์

**เกณฑ์รับงาน:** AT-31 รันจริงและหลักฐานบันทึก; ตำแหน่งไม่ถูกใช้ใน authorization

**Status:** IN_PROGRESS · **Evidence:** TeamFlow_T078_T082_Test_Report.md; SQLite PASS; SQL Server migration เขียนแล้วแต่ NOT_RUN

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-081 — Permission catalog + checkbox รายคน + project role manager + authorization matrix

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** security/transaction ข้าม endpoint

**Depends on:** T-078
**Trace:** FR-42, FR-42A, BR-21, BR-22, BR-23, NFR-02 · **SRS:** §4.4, §5.3, §12.6
**Acceptance:** AT-32

- [x] migration user_permissions/permissions_version/role manager
- [x] authorization service อ่าน permission ทุก request deny-by-default
- [x] GET/PUT permissions พร้อม version/audit/self-block
- [x] demote manager→editor ใน transaction เดียว + view revision
- [ ] negative tests ทุก P-key × role × endpoint และ race

**เกณฑ์รับงาน:** AT-32 ผ่านจริงบน provider ที่กำหนด; ไม่มีเส้นทางยกระดับสิทธิ์

**Status:** IN_PROGRESS · **Evidence:** TeamFlow_T078_T082_Test_Report.md; negative tests ครอบคลุมบางส่วน + race ยังไม่ทำ; SQL2022 NOT_RUN

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-082 — Admin center + Permission matrix (checkbox/bulk/preset)

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** UI บน API ที่ล็อกแล้ว

**Depends on:** T-080, T-081
**Trace:** FR-43, FR-42A, BR-23 · **SRS:** §4.4, §11, §12.6
**Acceptance:** AT-33

- [x] Members/Teams/Job titles/Permission matrix
- [x] เลือกหลายคน + preset + สรุปก่อนบันทึก
- [x] stale version 409 และ partial result ชัดเจน
- [x] Settings แสดงสิทธิ์ตนอ่านอย่างเดียว

**เกณฑ์รับงาน:** AT-33 รันจริง; matrix ตรงกับสิทธิ์ server

**Status:** IN_PROGRESS · **Evidence:** TeamFlow_T078_T082_Test_Report.md; local SQLite/browser PASS; SQL2022/Windows/UAT NOT_RUN

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-083 — My overview + My work grouped table

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** คำนวณ/แสดงผลขอบเขตชัด

**Depends on:** T-078
**Trace:** FR-44, FR-45 · **SRS:** §9.9, §9.10, §12.6
**Acceptance:** AT-34

- [x] API my overview ใช้ scope เดียวกับรายงาน
- [x] widgets + ลิงก์ตัวกรอง
- [x] My work grouped table + toggle
- [x] ทดสอบเที่ยงคืน Bangkok และสิทธิ์ (SQLite local)

**เกณฑ์รับงาน:** AT-34 รันจริงและตัวเลขตรงกัน

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T083_Test_Report.md. AT-34 local SQLite HTTP + Chromium PASS; SQL Server 2022/Windows/UAT NOT_RUN; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-084 — Project Docs (schema/API/editor/sanitize/version/trash)

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** XSS/concurrency/retention

**Depends on:** T-081
**Trace:** FR-48, NFR-02, NFR-03 · **SRS:** §5.3, §9.7, §12.6
**Acceptance:** AT-35

- [x] migration project_docs/project_doc_versions (SQLite run; SQL Server NOT_RUN)
- [x] server sanitizer allowlist + XSS corpus
- [x] version/409/history
- [x] soft delete/restore/purge 30 วัน + audit
- [x] editor UI ไม่ดึง CDN + สิทธิ์ Viewer/P-05

**เกณฑ์รับงาน:** AT-35 ผ่านจริงรวม XSS และ conflict

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T084_Test_Report.md. AT-35 local SQLite HTTP + XSS corpus + Chromium PASS; SQL Server 2022/Windows/UAT NOT_RUN; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-085 — Project Files tab + project-level upload

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** ขยายกลไกไฟล์เดิม

**Depends on:** T-081
**Trace:** FR-49, FR-28 · **SRS:** §9.8, §12.6
**Acceptance:** AT-36

- [x] schema/attachments project scope (SQLite run; SQL Server NOT_RUN)
- [x] รวมไฟล์ตามสิทธิ์ + search/filter
- [x] upload ระดับโปรเจกต์ใช้ quota/ตรวจชนิดเดิม
- [x] preview รูป/PDF ปลอดภัย (PDF headed NOT_RUN)
- [x] ลบ/คืนตาม P-06 + audit

**เกณฑ์รับงาน:** AT-36 รันจริงบน filesystem จริง

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T085_Test_Report.md. AT-36 local SQLite + temp filesystem HTTP + Chromium PASS; SQL Server 2022/Windows/UAT NOT_RUN; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-086 — Main table monday upgrade (inline/batch/drag/sticky/resize)

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** concurrency + interaction ซับซ้อน

**Depends on:** T-079
**Trace:** FR-52, FR-45 · **SRS:** §9.10, §12.6
**Acceptance:** AT-38

- [x] sticky header/คอลัมน์ Task และ resize จำต่อผู้ใช้ (preferences)
- [x] inline edit + เพิ่มงานท้ายกลุ่ม
- [x] batch endpoint ผลรายข้อ/409/403
- [x] ลากแถวย้ายกลุ่มพร้อม version (task version)
- [x] keyboard/touch alternative (Move to group, F2, resize ด้วยลูกศร)

**เกณฑ์รับงาน:** AT-38 ส่วน Main table ผ่านจริง; ไม่มี partial update เงียบ

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T086_Test_Report.md. AT-38 Main table local SQLite HTTP + Chromium PASS; SQL Server 2022/Windows/UAT NOT_RUN; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-087 — Task side panel (Updates/@mention/Files/Activity)

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** UI บน API เดิม

**Depends on:** T-079
**Trace:** FR-53 · **SRS:** §9.10
**Acceptance:** AT-38

- [x] panel ขวา + แท็บ Updates/Files/Activity/Details
- [x] @mention เฉพาะผู้เข้าถึง + notification เดิม
- [x] Esc/focus trap/deep link ตรวจสิทธิ์
- [x] มือถือเต็มจอ

**เกณฑ์รับงาน:** AT-38 ส่วน side panel ผ่านจริง

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T087_Test_Report.md. AT-38 side panel local SQLite HTTP + Chromium PASS; SQL Server 2022/Windows/UAT NOT_RUN; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-088 — Workload + Project overview

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** คำนวณขอบเขตชัด

**Depends on:** T-080
**Trace:** FR-50, FR-51 · **SRS:** §9.9, §12.6
**Acceptance:** AT-37

- [x] workload API โปรเจกต์/ทีม + threshold ตั้งค่าได้ (migration 0008; SQL Server NOT_RUN)
- [x] overview % / สถานะ / overdue / ผู้รับ / ตำแหน่ง
- [x] scope P-07/P-09 และ BR-16
- [x] tests ขอบสัปดาห์และ threshold

**เกณฑ์รับงาน:** AT-37 รันจริง; ตัวเลขตรงข้อมูลและสิทธิ์

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T088_Test_Report.md. AT-37 local SQLite HTTP + Chromium PASS; SQL Server 2022/Windows/UAT NOT_RUN; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-089 — Motion system AN-01–AN-12 + reduced-motion + Settings toggle

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** UI motion

**Depends on:** T-079
**Trace:** NFR-09, UX-01–UX-06 · **SRS:** §13.6
**Acceptance:** AT-39

- [x] AN-01–AN-12 ด้วย transform/opacity (AN-02 เปิดใช้ใน T-087)
- [x] preference Reduce animations/confetti + prefers-reduced-motion
- [x] ยืนยัน action ไม่ถูกบล็อก
- [ ] performance trace 60fps — headless rAF 60fps/p95 17ms บันทึกแล้ว; trace บน GPU จริงยัง NOT_RUN

**เกณฑ์รับงาน:** AT-39 ส่วน motion ผ่านจริงพร้อม trace

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T089_Test_Report.md. Motion + preferences local SQLite/Chromium PASS; GPU trace, owner AT-39 comparison, SQL Server 2022/Windows/UAT NOT_RUN; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-090 — Favorites (Updates feed เลื่อนไปรอบถัดไป)

**Model:** GPT-6.1 Sol · **Effort:** Low · **เหตุผล:** งานเล็กขอบเขตชัด; ใช้ Medium ตรวจก่อนปิด

**Depends on:** T-083
**Trace:** FR-47 · **SRS:** §9.11, §12.6
**Acceptance:** AT-40

- [x] migration user_favorites (SQLite run; SQL Server NOT_RUN)
- [x] API + sidebar บนสุด
- [x] ลบเมื่อถอนสิทธิ์
- [x] ไม่กระทบผู้อื่น

**เกณฑ์รับงาน:** AT-40 รันจริง

**Status:** IN_PROGRESS · **Local evidence:** TeamFlow_T090_Test_Report.md. AT-40 local SQLite HTTP + Chromium PASS; SQL Server 2022/Windows/UAT NOT_RUN; actual model/effort NOT_VERIFIED.

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-091 — Regression รวม addendum, SQL Server 2022 native, Windows, UAT

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** regression/environment จริง

**Depends on:** T-079, T-080, T-081, T-082, T-083, T-084, T-085, T-086, T-087, T-088, T-089, T-090
**Trace:** FR-41–FR-53, NFR-09, BR-19–BR-23 · **SRS:** §14–16
**Acceptance:** AT-31, AT-32, AT-33, AT-34, AT-35, AT-36, AT-37, AT-38, AT-39, AT-40

- [ ] regression เดิมทั้งหมด + TC-085–TC-099
- [ ] SQL Server 2022 native และ Windows
- [ ] UAT กับเจ้าของ
- [ ] อัปเดต source ZIP/release notes

**เกณฑ์รับงาน:** AT-31–AT-40 และ regression ผ่านจริง; ไม่มี critical/major open

**Status:** TODO

**หลักฐานเมื่อปิดงาน:** บันทึกใน Task Register; สำหรับการทดสอบระบุผลและ environment ไม่ใช้คำว่า “ผ่าน” โดยไม่มีการรัน

### T-092 — Security Design + Threat model

**Model:** GPT-6.1 Sol · **Effort:** Medium · **เหตุผล:** เพิ่มตาม PROJECT_TEMPLATE 1.0 หมวด 5 (2026-10-10)

**Depends on:** ไม่มี
**Trace:** NFR-02 · **SRS:** §4, §6, §9.5, §13
**รายละเอียด:** `tickets/T-092-security-design.md` · **เอกสาร:** `docs/07-security.md`

**Status:** DONE (เอกสาร; owner approved 2026-10-10)

### T-093 — OWASP Top 10 verification release 1.0

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** เพิ่มตาม PROJECT_TEMPLATE 1.0 หมวด 5 (2026-10-10)

**Depends on:** T-091, T-092
**Trace:** NFR-02 · **SRS:** §4, §6, §9.5, §13
**รายละเอียด:** `tickets/T-093-owasp-verification.md` · **เอกสาร:** `docs/security/OWASP-1.0.md`

**Status:** TODO

### T-094 — Pen-Test + remediation/retest

**Model:** GPT-6.1 Sol · **Effort:** High · **เหตุผล:** เพิ่มตาม PROJECT_TEMPLATE 1.0 หมวด 5 (2026-10-10)

**Depends on:** T-093
**Trace:** NFR-02 · **SRS:** §4, §6, §9.5, §13
**รายละเอียด:** `tickets/T-094-pentest.md` · **เอกสาร:** `docs/security/PENTEST-1.0.md`

**Status:** TODO

## 18. Functional Requirements Coverage

Task อ้างอิงแต่ละ FR ครบไม่ได้แปลว่า implementation ผ่านแล้ว ให้ใส่สถานะและหลักฐานเมื่อปิดงาน รายการที่อ้าง FR เดียวกันแยก implementation/UI/test เพื่อกันตกหล่น

| FR | ความต้องการ | Tasks | Evidence / Result |
|---|---|---|---|
| FR-01 | ตั้งผู้ดูแลคนแรก | T-013, T-068 | รอพัฒนา/ทดสอบ |
| FR-02 | เข้าสู่ระบบและออกจากระบบ | T-014, T-017, T-068 | รอพัฒนา/ทดสอบ |
| FR-03 | จัดการผู้ใช้ | T-016, T-018, T-068 | รอพัฒนา/ทดสอบ |
| FR-04 | เปลี่ยนและรีเซ็ตรหัสผ่าน | T-014, T-015, T-016, T-017, T-018, T-019, T-068 | รอพัฒนา/ทดสอบ |
| FR-05 | บังคับสิทธิ์ทุกช่องทาง | T-003, T-009, T-011, T-043, T-069 | รอพัฒนา/ทดสอบ |
| FR-06 | สร้างและจัดการหลายทีม | T-020, T-023, T-069 | รอพัฒนา/ทดสอบ |
| FR-07 | สมาชิกอยู่หลายทีม | T-020, T-023, T-069 | รอพัฒนา/ทดสอบ |
| FR-08 | ตั้งหัวหน้าทีม | T-020, T-023, T-069 | รอพัฒนา/ทดสอบ |
| FR-09 | จัดการโปรเจกต์ | T-021, T-024, T-069 | รอพัฒนา/ทดสอบ |
| FR-10 | กำหนดสมาชิกโปรเจกต์ | T-011, T-021, T-024, T-069 | รอพัฒนา/ทดสอบ |
| FR-11 | ถอนสิทธิ์และปิดบัญชี | T-011, T-022, T-024, T-069 | รอพัฒนา/ทดสอบ |
| FR-12 | สร้างและแก้ไขงาน | T-026, T-032, T-070 | รอพัฒนา/ทดสอบ |
| FR-13 | มอบหมายงาน | T-022, T-026, T-032, T-070 | รอพัฒนา/ทดสอบ |
| FR-14 | จัดการสถานะและความสำคัญ | T-008, T-026, T-027, T-032, T-070 | รอพัฒนา/ทดสอบ |
| FR-15 | งานย่อย | T-002, T-027, T-028, T-033, T-070 | รอพัฒนา/ทดสอบ |
| FR-16 | งานซ้ำ | T-002, T-010, T-029, T-033, T-070 | รอพัฒนา/ทดสอบ |
| FR-17 | เก็บ ลบแบบกู้คืน และคืนงาน | T-002, T-030, T-033, T-060, T-070 | รอพัฒนา/ทดสอบ |
| FR-18 | รับมือแก้ไขพร้อมกัน | T-003, T-008, T-009, T-010, T-026, T-027, T-032, T-035, T-038, T-070 | รอพัฒนา/ทดสอบ |
| FR-19 | งานของฉัน | T-031, T-045, T-071 | รอพัฒนา/ทดสอบ |
| FR-20 | ค้นหา กรอง และจัดลำดับ | T-031, T-037, T-045, T-071 | รอพัฒนา/ทดสอบ |
| FR-21 | Kanban เปลี่ยนสถานะด้วยการลาก | T-010, T-034, T-035, T-036, T-038, T-071 | รอพัฒนา/ทดสอบ |
| FR-22 | Kanban จัดลำดับด้วยการลาก | T-034, T-035, T-036, T-071 | รอพัฒนา/ทดสอบ |
| FR-23 | ทางเลือกแทนการลาก | T-037, T-055, T-058, T-071 | รอพัฒนา/ทดสอบ |
| FR-24 | มุมมองรายการ | T-045, T-071 | รอพัฒนา/ทดสอบ |
| FR-25 | ปฏิทินและ Gantt | T-046, T-071 | รอพัฒนา/ทดสอบ |
| FR-26 | อัปเดตการเปลี่ยนแปลงทีม | T-038, T-047, T-071, T-075 | รอพัฒนา/ทดสอบ |
| FR-27 | ความคิดเห็นในงาน | T-010, T-039, T-044, T-072 | รอพัฒนา/ทดสอบ |
| FR-28 | ไฟล์แนบ | T-002, T-041, T-042, T-043, T-044, T-060, T-072 | รอพัฒนา/ทดสอบ |
| FR-29 | ประวัติงาน | T-040, T-044, T-072 | รอพัฒนา/ทดสอบ |
| FR-30 | แจ้งเตือนภายในเว็บ | T-048, T-049, T-051, T-072 | รอพัฒนา/ทดสอบ |
| FR-31 | อ่านแจ้งเตือน | T-050, T-051, T-060, T-072 | รอพัฒนา/ทดสอบ |
| FR-32 | ภาพรวมองค์กร/ทีม/โปรเจกต์ | T-052, T-054, T-073 | รอพัฒนา/ทดสอบ |
| FR-33 | รายงานตามสมาชิกและช่วงเวลา | T-052, T-054, T-073 | รอพัฒนา/ทดสอบ |
| FR-34 | Export CSV | T-053, T-054, T-073 | รอพัฒนา/ทดสอบ |
| FR-35 | Responsive และภาษาไทย | T-012, T-017, T-037, T-055, T-057, T-058, T-073 | รอพัฒนา/ทดสอบ |
| FR-36 | PWA แบบออนไลน์ | T-056, T-057, T-058, T-073 | รอพัฒนา/ทดสอบ |
| FR-37 | ตั้งค่าระบบที่จำเป็น | T-006, T-025, T-065, T-074 | รอพัฒนา/ทดสอบ |
| FR-38 | สำรองและกู้คืน | T-061, T-062, T-063, T-074 | รอพัฒนา/ทดสอบ |
| FR-39 | สุขภาพระบบและ log | T-019, T-040, T-059, T-060, T-061, T-065, T-074 | รอพัฒนา/ทดสอบ |
| FR-40 | ชุดโค้ดติดตั้งเอง | T-003, T-004, T-005, T-006, T-007, T-019, T-063, T-064, T-065, T-066, T-067, T-074, T-076, T-077 | รอพัฒนา/ทดสอบ |
| FR-41 | ตำแหน่งงานของผู้ใช้ | T-080, T-082, T-091 | รอพัฒนา/ทดสอบ |
| FR-42 | Project role manager | T-081, T-082, T-091 | รอพัฒนา/ทดสอบ |
| FR-42A | Permission checkbox รายคน (นับรวมกับ FR-42) | T-081, T-082, T-091 | รอพัฒนา/ทดสอบ |
| FR-43 | หน้า Admin รวมศูนย์ / Permission matrix | T-082, T-091 | รอพัฒนา/ทดสอบ |
| FR-44 | My overview | T-083, T-091 | รอพัฒนา/ทดสอบ |
| FR-45 | My work แบบ monday | T-083, T-086, T-091 | รอพัฒนา/ทดสอบ |
| FR-47 | Favorites | T-090, T-091 | รอพัฒนา/ทดสอบ |
| FR-48 | Project Docs | T-084, T-091 | รอพัฒนา/ทดสอบ |
| FR-49 | Project Files | T-085, T-091 | รอพัฒนา/ทดสอบ |
| FR-50 | Workload view | T-088, T-091 | รอพัฒนา/ทดสอบ |
| FR-51 | Project overview | T-088, T-091 | รอพัฒนา/ทดสอบ |
| FR-52 | Main table แบบ monday | T-086, T-091 | รอพัฒนา/ทดสอบ |
| FR-53 | Task side panel แบบ monday | T-087, T-091 | รอพัฒนา/ทดสอบ |

FR-46 Updates feed: DEFERRED ไปรอบถัดไปตามเจ้าของ ไม่มี Task ในรุ่นนี้

## 19. Non-functional Requirements Coverage

| NFR | Tasks | สิ่งที่ต้องตรวจ |
|---|---|---|
| NFR-01 | T-004, T-075, T-076 | 30 accounts / 15 active / p95 / polling บนสเปกที่บันทึก |
| NFR-02 | T-004, T-006, T-009, T-011, T-014, T-019, T-022, T-040, T-041, T-043, T-059, T-068, T-069, T-072, T-076 | server permissions / session / CSRF / upload / secret redaction |
| NFR-03 | T-004, T-007, T-008, T-010, T-022, T-027, T-029, T-030, T-035, T-041, T-042, T-049, T-060, T-063, T-070, T-072, T-074, T-076 | transaction / version / recurrence / DB-file consistency |
| NFR-04 | T-004, T-062, T-063, T-074, T-076 | backup จริง / restore จริง / RPO-RTO ที่วัด |
| NFR-05 | T-004, T-012, T-037, T-055, T-058, T-071, T-076 | keyboard / focus / touch alternative / 200% zoom |
| NFR-06 | T-004, T-012, T-037, T-055, T-058, T-071, T-076 | browser/device versions และ NOT_RUN เมื่อไม่มี device |
| NFR-07 | T-004, T-005, T-006, T-007, T-019, T-059, T-060, T-062, T-063, T-064, T-065, T-074, T-076, T-077 | config/migration/backup/Windows install/upgrade portability |
| NFR-08 | T-001, T-004, T-005, T-065, T-076, T-077 | ไม่มี mandatory subscriptions / license inventory / ไม่รวมต้นทุนเครื่อง |
| NFR-09 | T-079, T-089, T-091 | reduced motion / toggle / transform-opacity / 60fps trace / ไม่บล็อก action |

## 20. Acceptance Test Coverage — 40 กรณี

ตารางนี้เป็น checklist สำหรับผลทดสอบ ไม่ใช่ผลที่รันแล้ว

| AT | กรณีต้นทาง | Tasks | Result | Evidence / Environment |
|---|---|---|---|---|
| AT-01 | เปิดระบบใหม่/setup token ผิด/ถูก/ใช้ซ้ำ | T-013, T-068 | NOT_RUN | — |
| AT-02 | Login ผิด, rate limit, logout, cookie reuse | T-014, T-017, T-068 | NOT_RUN | — |
| AT-03 | Admin สร้าง/reset user แล้วเรียก task API ก่อนเปลี่ยนรหัส | T-014, T-015, T-016, T-017, T-018, T-068 | NOT_RUN | — |
| AT-04 | demote/deactivate Admin คนสุดท้ายรวม concurrent requests | T-016, T-018, T-068 | NOT_RUN | — |
| AT-05 | M1 ดู Pprivate/P2 ผ่าน ID,search,report,CSV,fileURL | T-011, T-043, T-053, T-069 | NOT_RUN | — |
| AT-06 | เพิ่ม M1 หลายทีม/Lead เฉพาะทีม1 | T-020, T-023, T-069 | NOT_RUN | — |
| AT-07 | L1 เพิ่ม M2 ใน Pshared เป็น Editor และ V เป็น Viewer | T-011, T-021, T-024, T-069 | NOT_RUN | — |
| AT-08 | ถอน M2 จาก Pshared ขณะเปิด detail และมีงานค้าง | T-011, T-022, T-024, T-043, T-069 | NOT_RUN | — |
| AT-09 | สร้างงานข้อมูลผิด/ไม่มีผู้รับ/ผู้รับ Viewer/วันเริ่มเกินวันส่ง | T-026, T-032, T-070 | NOT_RUN | — |
| AT-10 | งาน checklist ไม่ครบ→done;ติ๊กครบ→done;untick ตอน done | T-002, T-027, T-028, T-033, T-070 | NOT_RUN | — |
| AT-11 | งานซ้ำ daily/weekly/monthly,Jan31→Feb→Mar | T-029, T-033, T-070 | NOT_RUN | — |
| AT-12 | done งานซ้ำพร้อมกัน/retry/reopen แล้ว done ใหม่ | T-002, T-010, T-029, T-070 | NOT_RUN | — |
| AT-13 | delete/restore/retentionpurge และ parentfiles | T-002, T-030, T-033, T-060, T-070 | NOT_RUN | — |
| AT-14 | สองคนแก้ task version เดียวกัน | T-026, T-027, T-032, T-070 | NOT_RUN | — |
| AT-15 | My tasks วันนี้/overdue/null และ Bangkok ใกล้เที่ยงคืน | T-031, T-045, T-046, T-071 | NOT_RUN | — |
| AT-16 | ลากข้ามคอลัมน์/จัดลำดับ/refresh | T-034, T-035, T-036, T-071 | NOT_RUN | — |
| AT-17 | boardmove ขณะ offline/403/409 และ samecolumnconcurrent | T-010, T-035, T-038, T-071 | NOT_RUN | — |
| AT-18 | filteredboard drag + keyboard/touchalternative | T-037, T-055, T-058, T-071 | NOT_RUN | — |
| AT-19 | Table/Calendar/Gantt มีวันส่ง/ไม่มีวันส่ง/filter หลายตัว | T-031, T-045, T-046, T-071 | NOT_RUN | — |
| AT-20 | คนอื่นแก้งานขณะ user มี dirtyform | T-032, T-038, T-047, T-071 | NOT_RUN | — |
| AT-21 | commentHTML/script/กดซ้ำ/ลองแก้ audit | T-010, T-039, T-040, T-044, T-072 | NOT_RUN | — |
| AT-22 | upload10MiB/เกิน/extension ปลอม/pathtraversal/quota race | T-002, T-041, T-042, T-043, T-044, T-060, T-072 | NOT_RUN | — |
| AT-23 | notificationassignment/comment/status/remindertwice/readone/all | T-048, T-049, T-050, T-051, T-072 | NOT_RUN | — |
| AT-24 | reportdatebasis/reopen/CSV ไทยและ formula | T-052, T-053, T-054, T-073 | NOT_RUN | — |
| AT-25 | backup ระหว่างมีงาน/restore เครื่องทดสอบ/restart | T-061, T-062, T-063, T-064, T-074 | NOT_RUN | — |
| AT-26 | เปิด PWAoffline/logout แล้วเปิด cache | T-055, T-056, T-057, T-058, T-073 | NOT_RUN | — |
| AT-27 | performancefixture/loadtest ตาม§13.3 | T-075 | NOT_RUN | — |
| AT-28 | freshWindowsinstall จาก ZIP/env/one-timesetup | T-006, T-019, T-025, T-059, T-064, T-065, T-066, T-074, T-077 | NOT_RUN | — |
| AT-29 | archivedproject ลองแก้ task/comment/upload/recur | T-021, T-024, T-069 | NOT_RUN | — |
| AT-30 | CSRF/noOrigin/spoofproxy/XSS/SQLi/fileIDOR | T-009, T-011, T-043, T-059, T-069 | NOT_RUN | — |
| AT-31 | Job title/filter/CSV ไม่เปลี่ยนสิทธิ์ | T-080, T-082, T-091 | NOT_RUN | — |
| AT-32 | Permission checkbox/manager/revoke/self-block | T-081, T-082, T-091 | NOT_RUN | — |
| AT-33 | Admin center + Permission matrix | T-082, T-091 | NOT_RUN | — |
| AT-34 | My overview + My work | T-083, T-091 | NOT_RUN | Local SQLite HTTP/Chromium PASS (TeamFlow_T083_Test_Report.md); formal run with SQL2022 pending |
| AT-35 | Docs CRUD/conflict/XSS/trash | T-084, T-091 | NOT_RUN | Local SQLite HTTP/XSS/Chromium PASS (TeamFlow_T084_Test_Report.md); formal run with SQL2022 pending |
| AT-36 | Project Files | T-085, T-091 | NOT_RUN | Local SQLite+FS HTTP/Chromium PASS (TeamFlow_T085_Test_Report.md); formal run with SQL2022/Windows pending |
| AT-37 | Workload + Overview | T-088, T-091 | NOT_RUN | Local SQLite HTTP/Chromium PASS (TeamFlow_T088_Test_Report.md); formal run with SQL2022 pending |
| AT-38 | Main table + side panel | T-086, T-087, T-091 | NOT_RUN | — |
| AT-39 | UX/motion/reduced motion | T-079, T-089, T-091 | NOT_RUN | — |
| AT-40 | Favorites | T-090, T-091 | NOT_RUN | Local SQLite HTTP/Chromium PASS (TeamFlow_T090_Test_Report.md); formal run with SQL2022 pending |

## 21. API Coverage — ทุก route ใน SRS §12.2

| Method / Route | Tasks ที่รับผิดชอบ |
|---|---|
| GET /api/meta | T-013, T-068 |
| POST /api/setup | T-013, T-068 |
| POST /api/login | T-014, T-017, T-068 |
| GET /api/me | T-014, T-017, T-068 |
| POST /api/session/activity | T-014, T-017, T-068 |
| POST /api/logout | T-014, T-017, T-068 |
| POST /api/password | T-015, T-017, T-068 |
| GET /api/users | T-016, T-018, T-068 |
| POST /api/users | T-016, T-018, T-068 |
| PATCH /api/users/{id} | T-016, T-018, T-068 |
| POST /api/users/{id}/reset-password | T-015, T-016, T-018, T-068 |
| GET /api/directory | T-021, T-024, T-069 |
| GET /api/teams | T-020, T-023, T-069 |
| POST /api/teams | T-020, T-023, T-069 |
| PATCH /api/teams/{id} | T-020, T-023, T-069 |
| PUT /api/teams/{id}/members/{userId} | T-020, T-023, T-069 |
| DELETE /api/teams/{id}/members/{userId} | T-020, T-023, T-069 |
| GET /api/projects | T-021, T-024, T-022, T-069 |
| POST /api/projects | T-021, T-024, T-022, T-069 |
| PATCH /api/projects/{id} | T-021, T-024, T-022, T-069 |
| GET /api/projects/{id}/members | T-021, T-024, T-022, T-069 |
| PUT /api/projects/{id}/members/{userId} | T-021, T-024, T-022, T-069 |
| DELETE /api/projects/{id}/members/{userId} | T-021, T-024, T-022, T-069 |
| GET /api/tasks | T-031, T-045, T-046, T-071 |
| POST /api/tasks | T-026, T-027, T-032, T-070 |
| GET /api/tasks/{id} | T-026, T-027, T-032, T-070 |
| PATCH /api/tasks/{id} | T-026, T-027, T-032, T-070 |
| DELETE /api/tasks/{id} | T-030, T-033, T-070 |
| GET /api/trash | T-030, T-033, T-070 |
| POST /api/tasks/{id}/restore | T-030, T-033, T-070 |
| GET /api/me/overview | T-083 |
| POST /api/tasks/batch | T-086 |
| GET /api/projects/{id}/docs | T-084 |
| POST /api/projects/{id}/docs | T-084 |
| GET /api/docs/{id} | T-084 |
| PATCH /api/docs/{id} | T-084 |
| DELETE /api/docs/{id} | T-084 |
| POST /api/docs/{id}/restore | T-084 |
| GET /api/docs/{id}/versions | T-084 |
| GET /api/projects/{id}/files | T-085 |
| POST /api/projects/{id}/files | T-085 |
| GET /api/project-files/{id}/download | T-085 |
| DELETE /api/project-files/{id} | T-085 |
| POST /api/project-files/{id}/restore | T-085 |
| GET /api/projects/{id}/workload | T-088 |
| GET /api/teams/{id}/workload | T-088 |
| GET /api/projects/{id}/overview | T-088 |
| GET /api/me/preferences | T-089, T-086 |
| PATCH /api/me/preferences | T-089, T-086 |
| GET /api/me/favorites | T-090 |
| PUT /api/me/favorites/{id} | T-090 |
| DELETE /api/me/favorites/{id} | T-090 |
| GET /api/users/{id}/permissions | T-081, T-082 |
| PUT /api/users/{id}/permissions | T-081, T-082 |
| GET /api/permissions/catalog | T-081, T-082 |
| PUT /api/permissions/matrix | T-082 |
| GET /api/job-titles | T-080, T-082 |
| POST /api/job-titles | T-080, T-082 |
| PATCH /api/job-titles/{id} | T-080, T-082 |
| GET /api/projects/{id}/groups | T-029, T-045, T-055 |
| POST /api/projects/{id}/groups | T-029, T-045, T-055 |
| PATCH /api/groups/{id} | T-029, T-045, T-055 |
| GET /api/projects/{id}/board | T-034, T-036, T-071 |
| POST /api/projects/{id}/board/move | T-035, T-036, T-037, T-038, T-071 |
| POST /api/tasks/{id}/subtasks | T-028, T-033, T-070 |
| PATCH /api/subtasks/{id} | T-028, T-033, T-070 |
| DELETE /api/subtasks/{id} | T-028, T-033, T-070 |
| GET /api/tasks/{id}/comments | T-039, T-044, T-072 |
| POST /api/tasks/{id}/comments | T-039, T-044, T-072 |
| GET /api/tasks/{id}/attachments | T-043, T-044, T-072 |
| POST /api/tasks/{id}/attachments | T-041, T-042, T-044, T-072 |
| GET /api/attachments/{id}/download | T-043, T-044, T-072 |
| DELETE /api/attachments/{id} | T-043, T-044, T-072 |
| POST /api/attachments/{id}/restore | T-043, T-044, T-072 |
| GET /api/audit | T-040, T-072 |
| GET /api/tasks/{id}/events | T-040, T-044, T-072 |
| GET /api/notifications | T-050, T-051, T-072 |
| POST /api/notifications/{id}/read | T-050, T-051, T-072 |
| POST /api/notifications/read-all | T-050, T-051, T-072 |
| GET /api/reports/summary | T-052, T-054, T-073 |
| GET /api/export/tasks.csv | T-053, T-054, T-073 |
| GET /api/organization | T-025, T-074 |
| PATCH /api/organization | T-025, T-074 |
| GET /health/live | T-059, T-074 |
| GET /health/ready | T-059, T-074 |

## 22. Screen Coverage — ทุกหน้าใน SRS §11

| Screen | Implementation tasks | Integration/UAT |
|---|---|---|
| Setup | T-013 | T-068 |
| Login | T-017 | T-068 |
| Forced password change | T-017, T-015 | T-068 |
| My tasks | T-045, T-047 | T-071 |
| Project board | T-036, T-037, T-038 | T-071 |
| Task detail | T-032, T-033, T-044 | T-070, T-072 |
| Task list | T-045, T-031 | T-071 |
| Calendar | T-046 | T-071 |
| Gantt | T-046 | T-071 |
| Reports | T-054, T-053 | T-073 |
| Notifications | T-051 | T-072 |
| Teams | T-023 | T-069 |
| Projects | T-024 | T-069 |
| Admin users | T-018 | T-068 |
| Trash | T-033, T-030 | T-070 |
| Profile/settings | T-017, T-025 | T-068, T-074 |
| Home / My overview | T-083 | T-091 |
| My work grouped table | T-083, T-086 | T-091 |
| Project Docs | T-084 | T-091 |
| Project Files | T-085 | T-091 |
| Workload / Project overview | T-088 | T-091 |
| Task side panel | T-087 | T-091 |
| Admin center / Permission matrix / Job titles | T-080, T-082 | T-091 |
| Monday-style mock (ทุกหน้า + motion) | T-079, T-089 | T-091 |

## 23. Business Rules Coverage — BR-01–BR-23

| BR | Tasks |
|---|---|
| BR-01 | T-013, T-014, T-016 |
| BR-02 | T-016, T-068 |
| BR-03 | T-020, T-023, T-069 |
| BR-04 | T-011, T-021, T-069 |
| BR-05 | T-021, T-022, T-069 |
| BR-06 | T-026, T-003, T-070 |
| BR-07 | T-026, T-022, T-070 |
| BR-08 | T-008, T-026, T-071 |
| BR-09 | T-008, T-045, T-049, T-052, T-071 |
| BR-10 | T-027, T-036, T-070 |
| BR-11 | T-028, T-027, T-070 |
| BR-12 | T-029, T-070 |
| BR-13 | T-035, T-037, T-071 |
| BR-14 | T-021, T-027, T-039, T-041, T-069 |
| BR-15 | T-022, T-069 |
| BR-16 | T-011, T-050, T-052, T-053, T-069 |
| BR-17 | T-027, T-052, T-073 |
| BR-18 | T-039, T-040, T-044, T-072 |
| BR-19 | T-080, T-081, T-091 |
| BR-20 | T-080, T-091 |
| BR-21 | T-081, T-082, T-091 |
| BR-22 | T-081, T-082, T-091 |
| BR-23 | T-081, T-082, T-091 |

## 24. NFR และกรณีเสริมที่ต้องไม่ตกหล่น

- [ ] session idle/absolute expiry และ poll ไม่ทำให้บัญชีค้างล็อกอินไม่จำกัด
- [ ] role/membership revoke กับ URL/API/file/notification/export ไม่ตรวจแค่เมนู
- [ ] task/column version เปลี่ยนจากทุกแหล่ง รวมสร้าง ลบ restore และ form status change
- [ ] recurrence เมื่อ leap year, month anchor, retry, reopen, purge และ crash
- [ ] update ไม่เขียนทับ dirty draft และ network timeout ไม่สร้าง/ย้ายซ้ำ
- [ ] quota reservation concurrency, DB-file partial failure, missing file และ orphan recovery
- [ ] archived/deleted resources อ่านหรือแก้ได้ตามกติกาในทุก subresource
- [ ] PWA ไม่เก็บข้อมูลทีม/API/download และ logout/reconnect ไม่คืน sensitive cache
- [ ] CSV formula injection รวม leading whitespace และ export ไม่เหลือแค่หน้าแรก
- [ ] DB busy/transaction failure/backup maintenance/readiness ใช้ error contract ชัดเจน
- [ ] log/audit/package ไม่มี password/raw token/setup secret/ข้อมูลจริง
- [ ] migrations/upgrade/rollback/restore ทดสอบกับข้อมูลที่มีอยู่ ไม่ทดสอบแค่ DB ว่าง
- [ ] PWA installation และ Windows deployment มีผล environment จริงหรือ NOT_RUN/BLOCKED

## 25. Release Checklist ที่ต้องตรวจทุกครั้ง

- [ ] T-001/T-002 ปิด baseline issues; version เอกสาร/โค้ด/manifest ตรงกัน
- [ ] Functional Requirements 40 ข้อมี implementation + UI + test/evidence ตามจำเป็นครบ
- [ ] NFR 8 ข้อ, Business Rules 18 ข้อ, API 52 routes และ Screen 15 หน้ามีเจ้าของและผลตรวจ
- [ ] AT-01–AT-30 มีผลจริงครบ; critical failure ไม่ถูกซ่อนด้วย DEFERRED
- [ ] Endpoint/Screen ที่มีใน SRS ไม่เป็นเพียง placeholder หรือ mock-only
- [ ] backup/restore ที่ consistent ผ่านจริง และข้อมูลยังอยู่หลัง restart
- [ ] ตรวจ package inventory/secret scan/fresh unzip และ README ทำตามได้
- [ ] license/dependency/configuration ครบ ไม่มีบริการ AI/SMTP/paid subscription บังคับ
- [ ] ไม่มีการ publish/DNS/Server changes เพราะผู้ใช้ deploy เอง
- [ ] ระบุ known limitations, Windows/browser/UAT ที่ยัง NOT_RUN และงานแก้ไขต่ออย่างตรงไปตรงมา

## 26. วิธีสั่ง Codex/Claude Code ให้ทำทีละ Task

ใช้ข้อความนี้ร่วมกับเอกสารทั้งสามไฟล์ โดยแทน T-xxx เป็นงานที่จะทำ:

> อ่าน TeamFlow_Requirements_v1.0.md, TeamFlow_SRS_v1.0.md และ TeamFlow_Task_v1.0.md แล้วทำ T-xxx ปฏิบัติตามกฎการใช้ token/การรายงานผลใน §4: ตอบสั้น ชัดเจน ไม่แสดงรายละเอียดซ้ำ; อธิบายเพิ่มเมื่อผู้ใช้ถาม ใช้ GPT-6.1 Sol / Standard และ effort ของ Task ตาม Task Register (default Medium; งานที่กำหนด High ต้องเลือก High ก่อนเริ่ม) หากเปลี่ยนค่า model/effort ด้วยตนเองไม่ได้ ให้แจ้งค่าที่ผู้ใช้ต้องเลือกและอย่าอ้างว่าเปลี่ยนแล้ว ตรวจว่า dependency และ baseline decisions พร้อมก่อนเริ่ม ทำ checklist กับเกณฑ์รับงานให้ครบ ใช้ permissions/API/data contracts ของ SRS และรันการตรวจเฉพาะที่เกี่ยวข้อง อัปเดต Task Register ด้วยไฟล์/commit/ผลทดสอบและ blocker ห้ามติ๊ก DONE จากการอ่าน code อย่างเดียว ห้ามข้าม acceptance test ห้ามเพิ่ม scope ที่ excluded และห้าม deploy เพราะเจ้าของระบบจะ deploy เอง

เมื่อทำหลาย Task ในครั้งเดียว ระบุรายการชัดเจนและยังปิดหลักฐานราย Task ไม่ใช้คำว่า “ทำครบแล้ว” แทน traceability

## 27. Source Fingerprint และ Change Log

Fingerprint ใช้ระบุข้อความต้นทางที่นำมาแตกงาน ไม่ใช่ตัวแทนการอ่านรุ่นใหม่ เมื่อ Requirements/SRS เปลี่ยน ให้ตรวจ impact ต่อ Tasks/AT/API/screens และแก้ version แผนนี้ตามจริง

- `TeamFlow_Requirements_v1.0.md` — SHA-256 `f275f656e588c741e75a449531c8a25d78b4ffca1652584db6c2c4f78da6251f`
- `TeamFlow_SRS_v1.0.md` — SHA-256 `62c2ca9e8b2ed382e5ce26773828b62492e3c09de487ff6fd73c43c409bd9abf`

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | แตกงานจาก Requirements/SRS: dependencies, checklist, acceptance, FR/NFR/BR/API/Screen coverage; ไม่มี implementation sign-off |
| 1.1 | 2026-10-05 | เจ้าของระบบยืนยันกติกา; R-01–R-04 resolved; SQL Server2022/mssql; filetrash/restore30วัน; coding/testsยังไม่ผ่าน |
| 1.2 | 2026-10-05 | เพิ่ม default GPT-6.1 Sol / Medium / Standard และ effort ราย Task ทั้ง 77 งาน; ไม่เปลี่ยน scope/dependencies/status หรือผลทดสอบ |
| 1.3 | 2026-10-05 | เพิ่มกฎลด token และรายงานกระชับตามคำขอ; คง acceptance/tests และ effort ราย Task เดิม |
| 1.4 | 2026-10-05 | บันทึก readiness review รอบรวม: ข้อขัดกัน/สัญญาที่ต้องเติม/runtime blockers; ไม่เปลี่ยน baseline/dependencies/status หรืออ้างผล application tests |
| 1.5 | 2026-10-05 | เจ้าของระบบกำหนด Node.js22 เพื่อไม่กระทบโปรเจกต์อื่น; ขอ SQL อื่นชั่วคราวแต่รอเลือกชนิด/ขอบเขต; คงสถานะงานและผลทดสอบ |
| 1.6 | 2026-10-05 | ยืนยัน SQLite สำหรับ local dev ชั่วคราว; คง SQL2022 ปลายทาง; เพิ่ม provider/config/migration/test separation; ไม่ปิด tasks หรือ AT/TC จากผล SQLite |
| 1.7 | 2026-10-05 | เจ้าของระบบยืนยันข้อเสนอ readiness22ประเด็น; ล็อก8กติกา/เพิ่ม acceptance variants และ G0 dependency/readiness; ยังไม่ปิด implementation/tests |
| 1.8 | 2026-10-05 | T-003 API/DTO contractพร้อมschema tests/evidence; ปิดเฉพาะcontract task; application/AT/TC/DB/Windows/UATยังไม่ผ่าน |
| 1.9 | 2026-10-05 | T-004 full test/release manifest + evidence validator/gate checks + 17policy tests; G0 ผ่านด้านเตรียมแผน; T-005 READY; actual application acceptanceยังNOT_RUN; แจ้ง effortก่อนเริ่มงาน |
| 1.10 | 2026-10-05 | T-005 foundation bootstrap/Node22 pinned dependencies/provider harness + fresh-copy validation; DONEเฉพาะโครงแอป; fullSQL2022/Windows/business acceptanceยังNOT_RUN; เพิ่มprogresscountsหลังจบtask |
| 1.11 | 2026-10-06 | T-006 config/path/startup/instance implementation + provider-separated evidence; IN_PROGRESS pending real SQL2022 guard integration; DONE5/77 remaining72 |
| 1.12 | 2026-10-06 | T-007 provider-specific schema/local tests; IN_PROGRESS pending real SQL2022 migration/constraints; DONE5/77, IN_PROGRESS2, remaining72 |
| 1.13 | 2026-10-06 | T-012 frontend shell/navigation/shared states; scoped frontend/browser checks PASS; DONE6/77, IN_PROGRESS2, remaining71; real auth/SQL/Windows/UAT NOT_RUN |
| 1.14 | 2026-10-06 | T-008 local helpers under approved SRS5.2; corrective review-status migration preserves applied hashes/data; combined174 PASS; DONE6/77, IN_PROGRESS3, remaining71; SQL acceptance pending |
| 1.15 | 2026-10-06 | T-009 local contract middleware/hooks/privacy/security headers; API12 + combined186 + browser5 + fresh runtime install PASS; DONE6/77, IN_PROGRESS4, remaining71; real auth/ACL/SQL/HTTPS pending |
| 1.16 | 2026-10-06 | T-010 local idempotency/atomic replay/cleanup; local13 + combined199 PASS; SQL28SKIP/NOT_RUN; DONE6/77, IN_PROGRESS5, TODO66, remaining71; real auth/features/scheduler pending |
| 1.17 | 2026-10-06 | T-011 local authorization/current session/scopes; authorization14 + combined213 PASS; SQL38SKIP/NOT_RUN; DONE6/77, IN_PROGRESS6, TODO65, remaining71; login/full feature/SQL integration pending |
| 1.18 | 2026-10-06 | T-013 local first-run setup/API/UI; setup17 + combined233 + Chromium7 + fresh source/runtime install PASS; SQL46SKIP/NOT_RUN; DONE6/77, IN_PROGRESS7, TODO64, remaining71; full SQL/Windows/matrix/auth pending |
| 1.26 | 2026-10-06 | T-035–T-039 local board move/Kanban/keyboard-touch/recovery/comments; contract1.0.1 fixes recurring3-column result; evidence in batch report; DONE6/77, IN_PROGRESS33, TODO38, remaining71; native SQL/Windows/full TC-AT NOT_RUN |
| 1.29 | 2026-10-07 | T-050–T-054 local notification center/read/retention90, scoped reports, streamed CSV and Dashboard; grouped evidence in TeamFlow_T050_T054_Test_Report.md; DONE6/77, IN_PROGRESS48, TODO23, remaining71; native SQL/Windows/full TC-AT NOT_RUN |
| 1.28 | 2026-10-06 | T-045–T-049 local Table/Calendar/Gantt/shared refresh/dispatch/reminders; backend14/all407/Chromium37 after recheck; DONE6/77, IN_PROGRESS43, TODO28, remaining71; native SQL/Windows/full TC-AT NOT_RUN |
| 1.25 | 2026-10-06 | T-030–T-034 local task delete/restore/query/form/checklist/trash/board implementation; results in batch report; DONE6/77, IN_PROGRESS28, TODO43, remaining71; native SQL/Windows/full TC-AT NOT_RUN |
| 1.19 | 2026-10-06 | T-014 local login/session/current resolver; sessions19 + combined252 PASS; SQL56SKIP/NOT_RUN; DONE6/77, IN_PROGRESS8, TODO63, remaining71; full SQL/HTTPS/Windows/auth UI pending |

### SQL Server 2022 implementation checks

- [ ] T-006: DBconnection/pool/encryption/secretconfig และ leastprivilegeruntimelogin
- [ ] T-007/T-008: NVARCHAR/DATE/DATETIME2/IDENTITY/filtered UNIQUE/FK NO ACTION/XACT_ABORT/lock policy
- [ ] T-035: temporaryunique rank สองระยะ;ไม่ใช้ deferredconstraint แบบเดิม
- [ ] T-043/T-044: file softdelete/restore30 วัน endpoint และ UI
- [ ] T-062/T-063/T-074: .bak+uploads consistent snapshot/actualRESTORE บน SQL Server2022
- [ ] T-067–T-075: integration ใช้ SQL Server2022 จริง;deadlock/locktimeout/connectionloss tests

## 28. หลักฐานการตรวจความพร้อมก่อน T-003 — 5 ตุลาคม 2026

รายงาน: [TeamFlow_Readiness_Review_2026-10-05.md](TeamFlow_Readiness_Review_2026-10-05.md)

- PASS เฉพาะการตรวจโครงสร้าง: 77 tasks/details, dependencies ตรงกันและไม่วน, 52 routes ตรง SRS, FR40/NFR8/BR18/AT30 coverage และ84cases/30smoke/15screens ครบ
- G0 ยังไม่ผ่าน: T-003/T-004 ยัง TODO; เริ่มงานเตรียม T-003 ได้ตาม dependency แต่ต้องล็อกข้อขัดกันและ contracts ในรายงานก่อน feature implementation
- Environment หลังคำสั่งเจ้าของระบบ: Node22.23.3/npm10.9.9 เปิดได้และตรง runtime ใหม่; ไม่ต้องซ่อม Node24 สำหรับงานนี้; SQLite local dev ยืนยันแล้ว; SQL2022 ยังเป็นปลายทาง; SQL2022 integration/Windows/UAT/application tests ยัง NOT_RUN หรือ NOT_VERIFIED ตามรายงาน
- ประเด็นที่ต้องใช้ก่อนปิดงาน: T-003 ใช้ R-01–R-08/C-01–C-10; T-004 ใช้ M-01/M-04 และ release gates; T-005–T-008 ใช้ E-01–E-03 และ schema gaps; task ที่ได้รับผลอื่นระบุในรายงาน
- รายงานนี้ไม่ปิด T-003/T-004 หรือ task อื่น ไม่เปลี่ยน AT/TC เป็น PASS และไม่แก้ business policy ที่ยังขัดกันแทนเจ้าของระบบ

- ผลตรวจ DB เพิ่มตามคำขอเจ้าของระบบ: SQLite macOS3.43.2/Homebrew3.53.4 เปิดได้; Node22 SQLite in-memory smoke PASS เฉพาะสร้าง/อ่าน1แถว; DBeaver เป็น client; ไม่พบ PostgreSQL/MySQL/MariaDB engine ในตำแหน่งที่ตรวจ; local DB ports ไม่ตอบรับ; ยังไม่ปิด application/integration tests หรือเลือก production DB ใหม่

- SQLite local dev ยืนยันแล้วตามคำสั่งเจ้าของระบบ: รายละเอียดใน SRS §3.3/§3.4/§5.2; ผลทดสอบต้องระบุ provider; SQL2022 acceptance ยังต้องมีหลักฐานจริงก่อนปิด task ที่กำหนด

## 29. ผลยืนยัน readiness proposals — 5 ตุลาคม 2026

- Owner: เจ้าของระบบยืนยันข้อเสนอ22ประเด็นในบทสนทนา; RD-01–RD-08 บันทึกเป็นกติกาใน SRS §18 แล้ว; C-01–C-10/M-01–M-04 เป็น approved work ที่ต้องทำต่อ ไม่ใช่ implementation DONE
- Readiness หลัง T-004: T-001/T-002 DONE ด้านเอกสาร; T-003 DONE ด้านcontract/schema tests; T-004 DONE ด้านtest/release manifest; T-005 READY (Medium); T-006–T-077 WAIT_DEPENDENCY; อีก73งานคง TODO backlog
- G0: T-005 ต้อง T-003/T-004 ทั้งคู่; foundation ต้องมี shared audit/notification primitives และ minimal provider-specific harness ก่อนปิด feature acceptance ที่ต้องใช้
- T-022/T-027/T-030 ใช้ cleanup ตาม RD-02/03; T-020/T-021 ใช้ parent-state invariant RD-04; T-008/T-030/T-043/T-060 ใช้ UTC cutoff RD-05; T-029 ใช้ RD-06; T-060 ใช้ RD-07
- Candidate ZIP เพื่อ TC-080/UAT จัดใน T-065/pre-release work; ไม่ต้องรอ final T-077 DONE; T-074/T-076/T-077 final ปิดได้เมื่อ required evidence ครบตาม RD-08
- ไม่มีการเปลี่ยน AT/TC results หรือปิด tasks จากการอนุมัติข้อเสนอ; Node22/SQLite local พร้อมเรียกใช้ตาม smoke เดิม แต่ SQL2022/Windows/UAT ยังไม่รัน

## 30. T-003 completion evidence — 5 ตุลาคม 2026

- Result: DONE เฉพาะAPI/DTO/error/version/idempotency/query contracts; 52routes/75schemas และ61contract tests PASS; source regeneratedตรงschema; npmci reproducibleจากlockfile; dependency audit0vulnerabilitiesณเวลาตรวจ
- Artifacts: [TeamFlow_API_Contract.md](TeamFlow_API_Contract.md), [OpenAPI](contracts/openapi.json), [T-003 test report](TeamFlow_T003_Test_Report.md), [machine results](reports/T-003-contract-results.json), [test manifest](contracts/test-manifest.json)
- Contract-owner/API inventoryครบ; FR-05/18/40มีshape/schema evidence แต่FR implementation/API security/AT/TC resultsยังไม่PASS; T-004ต่อไปต้องล็อกfulltest/release manifest
- Actual model/effort/speed NOT_VERIFIED เพราะเครื่องมือที่มีไม่คืนselected settings; ไม่มีการเปลี่ยนหรืออ้างว่าเลือกตามค่าในMarkdownแล้ว

## 31. T-004 completion evidence — 5 ตุลาคม 2026

- DONE เฉพาะแผน/traceability/หลักฐานและเครื่องมือตรวจ: 77tasks/20unit suites/84TC/30AT/20requiredvariants/5UAT/4release reviews/30smoke + FR40/NFR8/BR18 ครบ; 17/17policy tests PASS
- Artifacts: [test/release policy](TeamFlow_Test_Release_Manifest.md), [machine manifest](tests/test-manifest.json), [actual record store](tests/execution-records.json), [test report](TeamFlow_T004_Test_Report.md), [machine evidence](reports/T-004-plan-results.json)
- G0 ผ่านด้านbaseline/contracts/testplan; T-005 READY — Effort Medium; 73งานยังTODO; source candidate/final/productionยังNOT_RUN ไม่มีผลTC/AT/RV/UAT/Windows/SQL2022ใหม่
- Foundationต้องมีminimal test harness + atomic audit/notification primitives; T-016/T-027ปิดfullacceptanceได้เมื่อcleanup/recurrenceที่เกี่ยวข้องผ่าน; candidate ZIPในpre-release/T-065ก่อนWindows/UAT, ไม่ปิดT-074/T-076/T-077จากpending notes
- Effortที่กำหนดMedium; actual model/effort/speed NOT_VERIFIEDตามข้อจำกัดเครื่องมือเดิม ไม่มีการเปลี่ยนหรืออ้างว่าเลือกค่าแล้ว

## 32. T-005 completion evidence — 5 ตุลาคม 2026

- DONE เฉพาะโครงแอปและtooling: Node22.23.3/npm10.9.9; React/TS/Vite/Express5; SQLite local/SQL2022 adapters/migrations/test commandsแยก; atomic effectsอยู่ในtransactionเดียว; jobs/seedไม่เริ่มอัตโนมัติ
- Fresh source copy: npmci/typecheck/build/84tests/migrate ledger apply-repeat/explicit synthetic fixture/start PASS; Chromium real browser smoke1PASS; lint/license inventory390packages/lockfile PASS
- SQL2022 real test NOT_RUN(1skipped); Windows/UAT/fullbusinessschema/auth/ACL/health readiness acceptanceยังไม่ผ่าน; appแสดงfoundation shellและready503; ไม่commit/deployหรือแตะprocessโปรเจกต์อื่น
- Artifacts: [README](README.md), [test report](TeamFlow_T005_Test_Report.md), [machine evidence](reports/T-005-foundation-results.json), [fresh-copy evidence](reports/T-005-fresh-checkout.json), [licenses](dependencies/LICENSES.md)
- Progress: DONE5/77tasks; remaining72TODO. READY: T-006 (High), T-007 (High), T-012 (Medium); งานถัดไปตามลำดับT-006. Effortที่กำหนดMediumสำหรับT-005; actualruntime settingsNOT_VERIFIEDตามข้อจำกัดเดิม

## 33. T-006 implementation/evidence — 6 ตุลาคม 2026

- Config keys/TLS/origin/proxy/paths/quotas/timings ตรวจครบก่อน HTTP; secret-safe errors, explicit provider และไม่มี SQLite fallback; canonical local DB guard กันเปิดซ้ำและคืนหลัง process ตาย
- Dedicated SQL Session guard implemented พร้อม pure/synthetic lifecycle tests; real SQL2022 exclusion/release/session-loss ยัง NOT_RUN จึงคง T-006 IN_PROGRESS ไม่ใช้ mock/local ปิด SQL acceptance
- หลักฐาน: [Configuration](TeamFlow_Configuration.md), [รายงาน](TeamFlow_T006_Test_Report.md), [machine evidence](reports/T-006-config-results.json), [fresh-copy](reports/T-006-fresh-checkout.json); ready503/production refused จน business tasks พร้อม
- Progress: DONE5/77; IN_PROGRESS1; TODO71; remaining72. READY: T-007 High / T-012 Medium; next independent task T-007 High. Windows/AT/TC/UATยังNOT_RUN; ไม่มี commit/deploy/server changes

## 34. T-007 implementation/evidence - 2026-10-06

- SQLite/SQL2022 static migrations: 24 business/support tables + existing ledger; positive INT identities/versions, DATE/UTCms, UTF16 caps/CI names, optional filtered UNIQUE, 31 NO ACTION FKs, required indexes.
- Durable quota/reservations/cleanup/idempotency/maintenance/view revisions/rate limits; recurrence snapshot tombstones without FK; actual task/audit/notification atomic transaction fixtures, separated by provider.
- Local constraints/fresh/repeat/legacy-ledger upgrade/reopen/checksum/source/version/rollback evidence in TeamFlow_T007_Test_Report.md and reports/T-007-schema-results.json; SQL2022 apply/trusted constraints/collation/serialization/plans NOT_RUN. IN_PROGRESS until required SQL evidence.
- Progress: DONE 5/77; IN_PROGRESS 2; TODO 70; remaining 72. New READY task: T-012 Medium. T-008 High WAIT_DEPENDENCY. Actual runtime settings NOT_VERIFIED; no commit/deploy/server changes.

## T-012 implementation evidence — 2026-10-06

- DONE เฉพาะ frontend shell/navigation/shared components/API client; 16frontend + 5Chromium + 1foundationHTTP checks PASS; build/typecheck/lint/contract PASS.
- Synthetic Self role fixtures ไม่ปิด backend auth/ACL; 200% text/360px/dialog keyboard shell evidence เป็น partial TC-073; full TC/matrix/AT/Windows/UAT NOT_RUN.
- TeamFlow_T012_Test_Report.md / reports/T-012-shell-results.json. DONE6/77; IN_PROGRESS2; TODO69; remaining71. No new TODO READY; T-006/T-007 High pending real SQL2022; T-008/T-009 High WAIT_DEPENDENCY. Actual runtime settings NOT_VERIFIED.

## T-008 local implementation evidence - 2026-10-06

- SRS5.2/16 permits temporary SQLite implementation/testing while SQL is unavailable; dependencies remain unchanged. T-008 IN_PROGRESS, not DONE/SQL accepted.
- dates/monthly anchor/cutoff/version/lifecycle/board locks/two-phase ranks/confirmed-rollback retry helpers; helper25 + combined174 PASS; SQL18SKIP/NOT_RUN. TeamFlow_T008_Test_Report.md / reports/T-008-helper-results.json.
- Corrected T-007 legacy blocked enum with new 0002_review_status migration; 0000/0001 hashes unchanged. Populated upgrade/children/identity/FK-assert/rollback/repeat/reopen verified on SQLite; SQL NOT_RUN.
- DONE6/77; IN_PROGRESS3; TODO68; remaining71. T-006/T-007/T-008 High pending SQL/integration; next local T-009 High under approved local profile, full T-006 dependency not closed.

## T-009 local implementation evidence - 2026-10-06

- SRS5.2/16 local profile; T-006 full dependency remains open. T-009 IN_PROGRESS, not final auth/SQL acceptance.
- Contract-derived ingress/UTF8/1MiB/path/query/body/pagination/DTO validation, security headers, exact Origin and fail-closed session/CSRF/scoping hooks. Default known API requests remain503; real business routes/auth/ACL not implemented.
- API12 + combined186 + browser5 + fresh source/runtime install PASS; 390license entries/missing0. TeamFlow_T009_Test_Report.md / reports/T-009-api-results.json / reports/T-009-fresh-checkout.json.
- DONE6/77; IN_PROGRESS4; TODO67; remaining71. Next local T-010 High; full T-007/T-009/T-008 dependencies/sign-off still pending. No deploy/commit/shared runtime changes.

## 38. T-010 implementation/evidence - 6 October 2026

- SRS5.2/16 permits local implementation/testing; T-007/T-009/T-008 dependencies remain IN_PROGRESS. T-010 IN_PROGRESS, not SQL/feature acceptance.
- Per-user/canonical concrete route/UUID key, normalized request SHA256, 24h TTL at transaction finalization; same-body replay/different-body409 with repeated current access check. Business/result/audit/notification persist in one DB transaction; no in-memory claim authority.
- Local13 + combined199 PASS; three synchronized Node processes against one SQLite file produce one set of effects; response privacy, rollback, simulated lost commit acknowledgement and bounded cleanup verified. SQL28SKIP/NOT_RUN. Report: TeamFlow_T010_Test_Report.md / reports/T-010-idempotency-results.json.
- Real session/ACL/feature handlers, actual upload validation and T-050 scheduler remain pending; no full TC/AT/Windows/UAT PASS. execution-records.json unchanged. Default protected API remains fail-closed503.
- DONE6/77; IN_PROGRESS5; TODO66; remaining71. Next local T-011 High; full T-007/T-009 acceptance pending. Declared High; actual runtime settings NOT_VERIFIED. No commit/deploy/shared runtime changes.

## 39. T-011 implementation/evidence - 6 October 2026

- T-007/T-009 full dependencies remain IN_PROGRESS; approved SRS5.2/16 permits local implementation/tests. T-011 IN_PROGRESS until SQL/session/feature integration accepted.
- Effective Admin/owner Lead/explicit Editor/Viewer; team-only/creator/assignee grants excluded. Current DB user/session/hash/auth-version/CSRF/forced-password/absolute-idle gates; no read extends idle. Middleware activity exception corrected to SRS6.2.
- Bound SQL scopes protect list/search/summary/export/notification recipient/read-all/files/trash/teams/directory; archived Lead retains directory permission. Guarded handlers validate success DTOs before commit. Version validation hook runs after rights and before state checks; unavailable hook503. Cached child/successor/current rights are rechecked by T-010 adapter.
- Authorization14 + combined213 PASS. Real SQLite rows/transactions and HTTP verified; deterministic two-process revoke-vs-write completes the authorized transaction, then new/replayed requests deny404 with one effect set. SQL38SKIP/NOT_RUN. Reports: TeamFlow_T011_Test_Report.md / reports/T-011-authorization-results.json.
- Token parser/login/cookie creation/rotation/activity updates and actual feature/CSV/download controllers pending; default protected API503. Full TC/AT/Windows/UAT NOT_RUN; execution-records.json unchanged. No commit/deploy/shared runtime changes.
- DONE6/77; IN_PROGRESS6; TODO65; remaining71. Next local T-013 High; full T-007/T-009 dependencies pending, T-012 DONE. Declared High; actual runtime settings NOT_VERIFIED.


## 40. T-013 implementation/evidence — 6 October 2026

- T-007/T-009 remain IN_PROGRESS, T-012 DONE; SRS5.2/16 permits local SQLite implementation without closing dependencies. T-013 IN_PROGRESS pending required SQL2022/Windows/browser matrix/auth integration.
- Startup opens explicitly migrated DB and checks applied ledger/checksums read-only; no DB creation/migration/seed from start. Empty users generate a256-bit console-only setup token after successful listen; restart rotates, configured/inactive-user DB emits none. Meta contains only setupRequired/version. Wrong403/correct201/reuse409; no default credentials/session/cookie.
- Async scrypt32768/8/1/key64/salt16/maxmem64MiB/no-trim/scalar12–128; shared hash/verify cap4, waiting capacity0 (503 Retry-After5). Setup rate10/IP/15min persisted independently from business rollback, no raw IP/token/password in buckets.
- Provider-specific no-users transaction claim creates organization/Admin/audit/view revision atomically. Audit failure rolls all effects back; two Node processes with independent valid tokens create one complete set. Simulated commit acknowledgement loss503 resolves through authoritative meta; actual browser response loss checks meta without resubmitting credentials.
- setup17 + combined233 + Chromium7 + fresh source npmci/typecheck/build/233tests/migrate-repeat/explicit synthetic seed/omit-dev runtime/live200/ready503 PASS. SQL46SKIP/NOT_RUN including setup8. API52routes/75schemas wire unchanged; execution-records.json unchanged. No full84TC/30AT/20RV/5UAT/4REL PASS inferred.
- Reports: TeamFlow_T013_Test_Report.md / reports/T-013-setup-results.json / reports/T-013-fresh-checkout.json. DONE6/77; IN_PROGRESS7; TODO64; remaining71. Next local T-014 High; declared High, actual runtime settings NOT_VERIFIED. No commit/deploy/DNS/server/shared runtime changes.


## 41. T-014 implementation/evidence — 6 October 2026

- T-011/T-006/T-008 remain IN_PROGRESS; SRS5.2/16 permits local SQLite continuation. T-014 IN_PROGRESS until native SQL2022/HTTPS/Windows/full auth acceptance. Next local T-015 High; full T-014 dependency not closed.
- POST login + GET me + POST activity/logout wired to actual cookie/session lookup and T-011 current transaction authorization. Username ASCII case-insensitive; creation passwords12–128 scalars, CurrentPassword verification1–128 by locked contract; no trim. Unknown/inactive/corrupt accounts do normal-cost dummy scrypt verification and return the same401 code/message. Shared hash/verify cap4, waiting capacity0 (503/Retry-After5).
- Persisted10/username30/IP15min, normalized hashes/no raw username/IP in buckets, both counters atomic in fixed lock order; success/restart do not reset limits. Random256-bit session/CSRF; DB only session hash; HttpOnly/SameSite=Strict/Path=/, host-only Secure policy from validated config and fixed absolute expiry. Presented old session rotates on successful login; failed login creates no session.
- Reads/polling never extend last_seen; CSRF+Origin activity extends idle only before expiry, never absolute12h; configured lower lifetimes and backwards clock checks preserved. Forced account only me/password/logout/activity (password endpoint next T-015). Self uses current scoped grants/revision/Bangkok day and maintenance row; forced summaries empty. Expired/revoked401 clears cookie; logout deletes only current session and clears cookie after commit.
- Caller-owned role/password/deactivate/forced-logout mutation can compose revokeUserSessions: increment auth_version and delete sessions atomically. Actual SQLite rollback/revoke/login-race and two-process username-limit/login-vs-revoke evidence; synthetic mutations are fixtures, not complete Admin endpoints or unassign acceptance. Maintenance freeze/drain/session cleanup and cross-tab clear/activity UI remain subsequent tasks.
- sessions19 + combined252 + Chromium9 + corrected fresh source/runtime install PASS; reports/T-014-fresh-checkout.json. Initial fresh assertion incorrectly assumed sample-data created accounts; corrected to setupRequired true and reran. tests/execution-records.json unchanged, no full TC/AT PASS inferred. SQL56SKIP/NOT_RUN includes session10. Native SQL range locks/serialization/deadlocks/rollback/revoke races, Windows, actualHTTPS, browser matrix and UAT required later. Browser/fresh source evidence recorded in TeamFlow_T014_Test_Report.md and reports/T-014-session-results.json.
- Shared shutdown promise waits concurrent stop callers; guard-loss checks cover awaited DB/setup/session preparation and close late-opened resources. Real SQL guard-loss timing remains NOT_RUN. Applied migrations/contracts/dependencies unchanged; verification subprocess timeout raised60s→180s for expanded crypto tests without changing app/runtime settings.
- DONE6/77; IN_PROGRESS8; TODO63; remaining71. Declared High; actual runtime settings NOT_VERIFIED. No commit/deploy/DNS/server/shared runtime changes.


## Batch T-015–T-018 — 6 October 2026

- Owner authorized developing four tasks first, then running one final batch of relevant tests; failures were repaired and affected/final combined checks rerun. Declared T-015/T-016 High, T-017/T-018 Medium; actual runtime model/effort NOT_VERIFIED. Node22.23.3/npm10.9.9; temporary SQLite profile, native SQL2022 acceptance separate.
- Implemented all four local scopes: own password/current verification/rotation/revocation/forced gate, Admin CRUD/reset/version/last-admin with atomic cleanup/audit/notifications/revisions; actual login/profile/password/logout and Admin management UI, explicit stale-version review, no credential replay, polling vs intentional activity, in-memory draft cleanup/BroadcastChannel only event strings.
- Final accounts19 + combined273 + Chromium14 PASS; typecheck/lint/build/contract/test-plan/fresh-source-and-runtime273 PASS; SQL69 SKIP/NOT_RUN. Full TC-007/008/009/012 and AT-03/04 remain NOT_RUN; local trace includes UT-04, session/admin permission checks and fixture task endpoint, not complete future task/business workflows. T-016/T-027 cleanup/recurrence acceptance awaits T-022/T-027 integration. /health/ready remains503; production startup remains blocked.
- Reports: TeamFlow_T015_T018_Test_Report.md, reports/T-015-018-batch-results.json, reports/T-018-fresh-checkout.json. DONE6/77; IN_PROGRESS12; TODO59; remaining71. Four local scopes implemented/verified4/4; no claim of four full DONE tasks.
- Next local batch T-019/T-020/T-021/T-022, all declared High; actual runtime NOT_VERIFIED. No commit/push/merge/deploy/DNS/server/shared runtime changes.

## T-019 local installer CLI evidence - 2026-10-06

- recover-admin/force-logout are local installer commands only; no new web recovery route. Existing target ID/exact username/local-maintenance confirmation, Node22, private owner/file modes or Windows DACL checks, existing migrated DB and application instance guards required. Never accept password in arguments/env/piped stdin; recovery uses two hidden TTY prompts. SQL/Windows branch remains NOT_RUN.
- Recovery promotes/reactivates existing target as forced-password Admin and revokes all old sessions; force logout changes auth version only. Atomic redacted installer audit/revisions; no assignments/history removed or resurrected. Audit target FK is explicitly marked local installer origin, not an authenticated web actor.
- Local CLI15/15 and combined288/288 PASS; compiled CLI was exercised via actual child processes/POSIX PTY. Typecheck/lint/build/contract PASS. SQL77SKIP/NOT_RUN (installer8 new). Initial fixture failures/type inference repaired; no full native SQL/Windows/TC-081/AT-28 PASS inferred. Fresh source/runtime report: reports/T-019-fresh-checkout.json, PASS: clean install/build/288 tests/migrations/omit-dev runtime and compiled CLI help.
- DONE6/77; IN_PROGRESS13; TODO58; remaining71. Owner requested finishing T-019, stopping dev services and then stopping work for a MacBook restart; next T-020 High not started. No commit/push/merge/deploy/DNS/shared runtime or startup-settings changes.

- Owner stop handoff: fresh verification PASS and dev service shutdown PASS (Python8777 SIGTERM; Node3000 already stopped; Colima default Stopped). TCP3000/8777/1433/53/59134 absent; application listeners retained, startup settings unchanged. T-020 High not started; work stopped.

## Scope/design update — 2026-10-06

เจ้าของเลือกปรับแผนและตัวอย่างก่อน: Requirements/SRS1.6, Task1.22, Test documents1.19. เพิ่ม Gantt FR-25/T-046 High/AT-19/TC-049; ดีไซน์ SRS11/T-045/T-055. T-046/T-045/T-055/T-071 ยัง TODO; mock ไม่เป็น feature DONE. จำนวน77คงเดิมเพราะขยาย T-046 ที่ใช้ list/dates เดิม. DONE6/77, IN_PROGRESS13, TODO58, remaining71; งานพัฒนาถัดไป T-020 High. Declared High; actual runtime settings NOT_VERIFIED.

หลักฐาน scope/design: `reports/design-preview-results.json` และ `reports/verify-design-preview.mjs`; Chromium153/Node22.23.3 mock interactions PASS และตรวจภาพ Table/Gantt/Calendar desktop + Gantt360px แล้ว. `build:test-plan`, `check:test-plan` และ17 planning-policy tests PASS; TC-049/AT-19/application/SQL2022/Windows/UAT ยัง NOT_RUN. การเปิด Chromium ใน sandbox ถูก OS บล็อก; รัน QA แบบอนุญาตนอก sandbox ผ่าน โดยไม่มีการเปิดบริการแอปหรือ deploy.

## Batch T-020–T-024 — 2026-10-06

เจ้าของสั่งเลือก5งาน พัฒนาแล้วทดสอบรวมท้ายชุด. เลือก T-020/T-021/T-022 High และ T-023/T-024 Medium; dependencies ภายในชุดตามลำดับเดิม, foundation/account local evidence ตาม SRS5.2 โดยไม่ถือ SQL dependencies DONE. Actual runtime model/effort NOT_VERIFIED. เริ่ม implementation APIs/cleanup/UI และ final batch checks; ไม่มี5 full DONE. DONE6/77, IN_PROGRESS18, TODO53, remaining71.

### Final batch evidence — T-020–T-024

- เจ้าของอนุมัติ5งานก่อนทดสอบรวม; local5/5 implemented/verified. Team/project CRUD/role/archive, scoped pagination/directory, shared atomic access cleanup and Admin account integration, team/project UI+pickers+confirmation/conflict handling.
- Workspaces17/17 (provider12 + real HTTP3 + two-process races2), combined305/305, Chromium17/17 PASS; typecheck/lint/build/contract/test-plan and fresh source/omit-dev runtime305 PASS. SQL89 SKIP/NOT_RUN; full browser/Windows/UAT/full TC-AT NOT_RUN. T-016/T-022 cleanup remains partial for future real task/recurrence/file/notification workflows; fixtures are identified separately.
- First failures: malformed fixture lifecycle/maintenance data, missing explicit select labels, disappearing review checkbox; repaired and affected checks rerun. Combined initial startup INSTANCE_GUARD_UNAVAILABLE observed while independent UI checks were running; sequential repeat PASS (cause not conclusively established). Fresh offline default npm cache lacked wsl-utils; used isolated temp cache, rerun PASS. No dependency/runtime upgrade.
- Reports: TeamFlow_T020_T024_Test_Report.md; reports/T-020-024-batch-results.json and reports/T-024-fresh-checkout.json. tests/execution-records.json unchanged. DONE6/77, IN_PROGRESS18, TODO53, remaining71. Next local task T-025 Medium; next candidate batch T-025 Medium / T-026–T-029 High follows existing dependencies. No commit/push/deploy/DNS/server/shared runtime/startup-setting changes.

## Batch T-025–T-029 — 2026-10-06

เจ้าของสั่งเริ่มชุดถัดไป5งาน แล้วทดสอบรวมท้ายชุด: T-025 Medium; T-026/T-027/T-028/T-029 High. Actual model/effort NOT_VERIFIED; Node22.23.3/npm10.9.9 ตรวจจริง. Dependencies ใช้ local evidence ตาม SRS5.2 ไม่ถือ SQL acceptance DONE. Local implementation/verification5/5; DONE6/77, IN_PROGRESS23, TODO48, remaining71.

- Organization API/settings/sidebar สำหรับ authenticated users, Admin-only versioned rename, Member read-only, public meta unchanged, name persistence after actual restart and explicit conflict review preserving draft.
- Task create/read/update strict fields/merged dates/current assignee rights/version; four-state completion/reopen and contiguous board ranks; checklist CRUD with parent+child versions, no auto-done, parent done guard. DELETE checklist returns200 {item:Task} ตาม contract เดิม.
- Recurrence daily/weekly/monthly anchor and offsets, reset checklist, eligible assignee, atomic source/successor/audit/notifications/tombstone. Reopen/recomplete/purged successor do not duplicate; actual HTTP key replay across restart; actual SQLite two-process completion/edit/checklist/demotion races. Account/membership cleanup now exercised with actual task/recurrence services; file bytes/download/notification-center/T-030 restore+retention and real SQL remain pending for complete T-016/T-022/T-027 sign-off.
- Backend26/26 (provider18 + HTTP4 + actual two-process races4), combined331/331 (Node310 + frontend21) PASS. Final browser/fresh/source results and exact profiles are in TeamFlow_T025_T029_Test_Report.md and reports/T-025-029-batch-results.json. Full TC/AT execution records unchanged; no deployment/commit/shared runtime/settings change.
- First failures were repaired: attachment fixture field names, public meta probe on controller fixture without installer hook, expected missing-key status, and DELETE subtask response mismatch. Contract source remains unchanged; actual startup browser verifies meta. Next candidate batch T-030 High, T-031 High, T-032 Medium, T-033 Medium, T-034 High; dependencies retained.

### Final batch evidence — T-025–T-029

Backend26/26 + combined331/331 + Chromium19/19 PASS; typecheck/lint0warnings/build/52-route contract/test-plan/fresh-source331/omit-dev runtime PASS. SQL107 SKIP/NOT_RUN. Report: TeamFlow_T025_T029_Test_Report.md; reports/T-025-029-batch-results.json; reports/T-029-fresh-checkout.json. Actual macOS/local Chromium and360px settings screenshot; Windows/full device/browser matrix/TC-AT/UAT NOT_RUN. Task/checklist/recurrence UI, restore/retention/bytes/notification center remain later work; T-016/T-022/T-027 full acceptance stays partial. Local5/5 implemented+verified; DONE6/77, IN_PROGRESS23, TODO48, remaining71. Next T-030 High; candidate batch T-030/T-031 High, T-032/T-033 Medium, T-034 High. No commit/push/deploy/shared runtime changes; test/fresh fixture processes stopped and temporary source removed.

## Local batch T-030–T-034 — 2026-10-06

TeamFlow_T030_T034_Test_Report.md / reports/T-030-034-batch-results.json: local18/18 (provider13 + HTTP2 + two-process SQLite races3), combined349/349 (Node328+frontend21), Chromium22/22 PASS. Actual task form/checklist/recurrence/delete/restore, current permissions,409 draft comparison/explicit review, dirty close/route/offline/360px; shared scoped SQL filters/dates/counts/sorts and board500/501 snapshots. Partial TC-024/026/027/028/030/031/034/035/045/047/048/065/075 and AT-09/10/11/13/14/15/16/19/20 evidence; future Calendar/Gantt/Report/Export consumers, Kanban move/fallback UI and retention remain pending. Full TC/AT and execution-records.json unchanged. Native SQL120 SKIP/Windows/full browser-device/UAT NOT_RUN. DONE6/77, IN_PROGRESS28, TODO43, remaining71; local5/5. Fresh-copy final outcome in batch report. Next T-035 High; candidate batch035High/036Medium/037Medium/038High/039Medium.

### Final batch evidence — T-030–T-034

Local5/5 implemented/verified; backend18/18 + combined349/349 + Chromium22/22 + fresh-source349/omit-dev runtime PASS; type/lint0warnings/build/contract/test-plan PASS. SQL120SKIP/Windows/full browser-device/UAT/full TC-AT NOT_RUN. TeamFlow_T030_T034_Test_Report.md; reports/T-030-034-batch-results.json; reports/T-034-fresh-checkout.json. DONE6/77, IN_PROGRESS28, TODO43, remaining71. Next T-035 High (candidate035High/036Medium/037Medium/038High/039Medium). No deployment/commit/push/runtime/settings change.

## Local batch T-035–T-039 — 2026-10-06

TeamFlow_T035_T039_Test_Report.md / reports/T-035-039-batch-results.json: local15/15 (provider10+HTTP2+two-process SQLite races3), combined364/364(Node343+frontend21), Chromium28/28 PASS. Atomic ordering/completion/recurrence; actual mouse/keyboard/touch emulated scroll+long-press; filters disable reorder; pending ack,409/validation/permission rollback, current demotion/revocation, lost response GET-before-same-key retry, acknowledged-write/read-failure recovery and501-task paginated fallback. Comments API plaintext/current rights/atomic effects/concurrent durable idempotency. Contract1.0.1 corrects recurring3-column response;52routes/75schemas unchanged. Partial TC-035–045/051/075 and AT-10/11/14/16/17/18/20/21/28 evidence only. Full TC/AT and execution-records.json unchanged; native SQL130SKIP/Windows/full device-browser/physical touch/UAT NOT_RUN; Comments panels/history/polling/Calendar/Gantt/full design pending. DONE6/77, IN_PROGRESS33, TODO38, remaining71; local5/5. Fresh-source364 tests/ci/type/build/migrate/seed/omit-dev runtime PASS; final people-picker/permission-clear UI6/6 recheck PASS. Next T-040 High; candidate040–043High/044Medium.

### Final batch evidence — T-035–T-039

Local5/5 implemented/verified; backend15/15 + combined364/364 + Chromium28/28 + final affectedKanban6/6 + fresh-source364/omit-dev runtime PASS. type/lint0warnings/build/contract1.0.1/test-plan PASS. SQL130SKIP/Windows/full browser-device/physical touch/UAT/full TC-AT NOT_RUN. TeamFlow_T035_T039_Test_Report.md; reports/T-035-039-batch-results.json; reports/T-039-fresh-checkout.json. DONE6/77, IN_PROGRESS33, TODO38, remaining71. Next T-040 High (candidate040–043High/044Medium). No commit/push/deploy/DNS/server/shared runtime changes; fixtures/processes/source copy cleaned.

## Local batch T-040–T-044 — 2026-10-06

Implemented all five tasks, then grouped validation: backend18/18 (provider11 + HTTP4 + actual two-process quota/SIGKILL recovery3), Chromium31/31 plus final affected panels recheck tracked in the report. Streamed actual 1 byte/10MiB/over-limit, allowlist/signatures/fatal UTF8 and ZIP/Office directory inspection without extraction. Quota persisted before disk writes; real20MiB/two-process4MiB race; current access rechecked during finalize. Metadata/quota/history/idempotency share transaction; rollback/move faults remain recoverable. Download is authenticated attachment/no-store/nosniff; delete/restore30UTCdays, queued disk cleanup retries and quota release after unlink. Comments/files/history panels preserve drafts and same-key retry; progress, pagination, confirmations, readable Thai history and390px layout. Additive API1.1.0: GET /api/audit Admin-only, recursive redaction and existing task-event scalar encoding,53routes/77schemas. Full TC/AT and execution-records.json unchanged. Partial TC-051–059/075 and AT-05/08/21/22/30 evidence only. All five IN_PROGRESS under SRS5.2; DONE6/77, IN_PROGRESS38, TODO33, remaining71. Final full-suite/fresh-source outcomes in TeamFlow_T040_T044_Test_Report.md / reports/T-040-044-batch-results.json. Next T-045 Medium, T-046/T-047/T-048/T-049 High. No commit/push/deploy/DNS/server/shared runtime changes.

### Final batch evidence — T-040–T-044

Local5/5 implemented/verified; backend18/18 + fresh all382/382(Node361+frontend21) + Chromium31/31 + final panels3/3 PASS. type/lint0warnings/build/contract1.1.0(53routes/77schemas)/test-plan/fresh offline ci+migrate+seed+omit-dev runtime PASS. Fresh build chunk-size warning remains, performance NOT_RUN. NativeSQL141SKIP/Windows/full TC-AT/UAT NOT_RUN; all five IN_PROGRESS. TeamFlow_T040_T044_Test_Report.md / reports/T-040-044-batch-results.json / reports/T-044-fresh-checkout.json. DONE6/77, IN_PROGRESS38, TODO33, remaining71. Next T-045 Medium; next batch045Medium/046Calendar-GanttHigh/047High/048High/049High. No commit/push/deploy/DNS/server/shared runtime changes. Full scheduler retention/orphan recovery T-060 and shared polling T-047 remain pending.

## T-045–T-049 — ชุดพัฒนา 5 งานและทดสอบรวม (2026-10-06)

Declared effort T-045 Medium, T-046–T-049 High; actual model/effort NOT_VERIFIED. Implemented My Tasks/Table, Calendar/Gantt using current list API and permissions, shared5s refresh with dirty drafts, atomic notification dispatch, and independent current-day Bangkok reminder scheduler. Grouped backend14/14 and all407/407 PASS; Chromium37 distinct cases verified after focused3-case recheck (raw36PASS/1 selector FAIL; corrected2PASS and strengthened My Tasks1PASS). NativeSQL152SKIP/Windows/full TC-AT/UAT remain NOT_RUN. Fresh-source outcome is recorded in the batch report. Task Register DONE6/77, IN_PROGRESS43, TODO28, remaining71. Next T-050 High; candidate batch T-050 High/T-051 Medium/T-052 High/T-053 High/T-054 Medium. No commit/push/deploy/DNS/server/shared runtime changes.

## Final handoff T-045–T-049 (2026-10-06)

Local implementation/verification5/5. Backend14/14 + all407/407(Node375+frontend32) + fresh-source407 PASS. Chromium37 distinct cases verified: raw run36PASS/1 test-selector FAIL; corrected focused2PASS and strengthened My Tasks1PASS complete the final evidence. Type/lint0warnings/build/contract1.1.0(53routes/77schemas)/test-plan/fresh cached offline ci+migrate+seed+omit-dev runtime PASS. Fresh build chunk-size warning; performance NOT_RUN. NativeSQL152SKIP/Windows/full TC-AT/UAT NOT_RUN; all five IN_PROGRESS. TeamFlow_T045_T049_Test_Report.md / reports/T-045-049-batch-results.json / reports/T-049-fresh-checkout.json. DONE6/77, IN_PROGRESS43, TODO28, remaining71. Next T-050 High (050High/051Medium/052High/053High/054Medium). Actual model/effort NOT_VERIFIED. No commit/push/deploy/DNS/server/shared runtime changes; temporary fixture processes/source copy cleaned.

## T-050–T-054 — grouped local implementation and verification (2026-10-07)

Declared effort T-050/T-052/T-053 High, T-051/T-054 Medium; actual model/effort NOT_VERIFIED. Implemented all five before grouped checks: own/current-parent notifications and 90 UTC day job, web-only center/badge and protected task opening, scoped aggregates with Bangkok date basis, bounded streaming CSV cap50000 and formula-safe cells, Dashboard/report/filter/export UI. Final outcomes and partial traceability are in TeamFlow_T050_T054_Test_Report.md and reports/T-050-054-batch-results.json. All five remain IN_PROGRESS under SRS5.2; DONE6/77, IN_PROGRESS48, TODO23, remaining71. Native SQL2022/Windows/full TC-AT/UAT/Excel execution/performance/full browser matrix remain NOT_RUN. Next T-055 Medium; next candidate batch T-055 Medium/T-056 Medium/T-057 High/T-058 Medium/T-059 Medium. No commit/push/deploy/DNS/server/shared runtime changes.

## Final handoff T-050–T-054 (2026-10-07)

Local5/5 implemented and verified. Backend23/23 (new provider8+HTTP1, prior14) + all420/420(Node384+frontend36) + Chromium14/14 + strengthened visual1/1 + fresh-source420/omit-dev runtime PASS. Type/lint0warnings/build/contract1.1.0(53routes/77schemas)/test-plan PASS. Raw failed runs and corrections remain separate evidence in TeamFlow_T050_T054_Test_Report.md / reports/T-050-054-batch-results.json. Fresh build chunk-size warning; performance NOT_RUN. NativeSQL160SKIP/Windows/full TC-AT/UAT/Excel/full browser-device NOT_RUN; all five remain IN_PROGRESS. DONE6/77, IN_PROGRESS48, TODO23, remaining71. Next T-055 Medium; next batch055Medium/056Medium/057High/058Medium/059Medium. Actual model/effort NOT_VERIFIED. No commit/push/deploy/DNS/server/shared runtime changes. Fixtures/source copy/processes cleaned.

## T-055–T-059 — grouped local work (2026-10-07)

Declared effort055Medium/056Medium/057High/058Medium/059Medium; actual model/effort NOT_VERIFIED. Implemented responsive/focus adjustments, versioned public-only PWA worker/manifest/icons, reconnect mutation barrier and current-resource refresh, truthful browser inventory, local DB/storage/setup readiness and rotating redacted request logs with Admin audit request ID correlation. All five IN_PROGRESS; native PWA cache/installation has an open FAIL and must not be signed off. Full results/raw failures are in TeamFlow_T055_T059_Test_Report.md and reports/T-055-059-batch-results.json. DONE6/77, IN_PROGRESS53, TODO18, remaining71. Next priority T-056 Medium to resolve native worker transport/installation, then T-060 High. No commit/push/deploy/DNS/server/shared runtime change; full TC/AT execution records unchanged.


## T-056 PWA follow-up — 2026-10-07

Declared effort T-056 Medium; actual model/effort NOT_VERIFIED. Resolved native precache hang by draining each no-store response body as it arrives before waiting for all responses. Security headers and static allowlist unchanged. Native cache/logout/offline and waiting-version lifecycle verified in Chromium and installed Chrome; public synthetic dirty draft survives update and previous cache remains until all clients close. Evidence: TeamFlow_T056_PWA_Followup_Report.md and reports/T-056-pwa-followup-results.json. OS installation, full task-edit update UI, vendor current+previous/physical devices, native SQL2022/Windows/full TC-AT/UAT remain NOT_RUN. DONE6/77, IN_PROGRESS53, TODO18, remaining71. Next batch T-060/T-061/T-062/T-063/T-064 all High; no commit/push/deploy/server/shared runtime change.


## T-060–T-064 grouped local delivery — 2026-10-07

Declared effort all five High; actual model/effort NOT_VERIFIED. Added scheduled/CLI retention with audit/byte queue/recurrence tombstones, API+job admission/drain and explicit persistent owner recovery, stopped-instance backup/manifest, isolated SQLite/SQL restore tooling with session revocation, pre-upgrade snapshot and transactional migration/rollback workflow. See TeamFlow_Backup_Recovery.md, TeamFlow_T060_T064_Test_Report.md and reports/T-060-064-batch-results.json for exact local checks, raw failures and limits. SQL2022 native backup/restore/roles, Windows PowerShell/service/Task Scheduler, full upload-freeze/restore permissions/download/RPO-RTO TC-AT/UAT remain NOT_RUN. All five IN_PROGRESS; DONE6/77, IN_PROGRESS58, TODO13, remaining71. Next T-065 Medium; candidate batch T-065 Medium/T-066 Medium/T-067 High/T-068 High/T-069 High. No commit/push/deploy/DNS/service installation/shared runtime changes.

## T-065–T-069 grouped local delivery — 2026-10-07

Declared effort T065/T066 Medium and T067–T069 High; actual model/effort NOT_VERIFIED. Windows foreground launcher and owner installation/rehearsal guide, user/developer handoff and exact-role isolated provider/HTTP/clock/file fixtures added. New regression10/10 and grouped449/449 PASS, final configuration-isolation follow-up10/10; type/lint/build/contract/test-plan PASS. Native SQL174SKIP/0executed; Windows/PowerShell/service/HTTPS/ACL/Task Scheduler/full TC-AT/browser/UAT NOT_RUN. All five IN_PROGRESS; DONE6/77, IN_PROGRESS63, TODO8, remaining71. Evidence: TeamFlow_T065_T069_Test_Report.md and reports/T-065-069-batch-results.json. Next batch T070 High/T071 Medium/T072 High/T073 Medium/T074 High. No deployment/server/shared runtime changes; formal execution records unchanged.

## T-070–T-074 grouped local QA — 2026-10-07

Declared T070/T072/T074 High; T071/T073 Medium; actual model/effort NOT_VERIFIED. Added6 provider/HTTP journeys plus clean restored role/session/download/restart operations and4view edit/restart browser sequence. New grouped26/26 and final full regression456/456 PASS. UI raw54PASS/1FAIL of55, first focused locator mismatch FAIL, corrected final1/1PASS yields55 distinct local cases verified; raw failures retained. Type/lint/contract/test-plan PASS;125 product source/migration/contract files match preceding verified build, so compiled assets reused. SQL180SKIP/0executed; Windows/fresh ZIP/HTTPS/RPO-RTO/physical browsers/Excel/full TC-AT/RV/UAT NOT_RUN. All five IN_PROGRESS; DONE6/77, IN_PROGRESS68, TODO3, remaining71. TeamFlow_T070_T074_Test_Report.md / reports/T-070-074-batch-results.json. Next T075 High; no deploy/shared runtime change, formal execution records unchanged.

## T-075–T-077 local performance/UAT/candidate delivery — 2026-10-07

Declared efforts: T075 High / T076 Medium / T077 High; actual model/effort NOT_VERIFIED. Evidence: TeamFlow_T075_T077_Test_Report.md; isolated performance and source ZIP reports. AT30/UAT5 unsigned NOT_RUN templates, FR40/NFR8/BR18/API53/screens mapping and safe archive inventory prepared. Native SQL/Windows/full TC-AT/RV/UAT and release sign-off remain NOT_RUN; formal execution-records.json unchanged. All three IN_PROGRESS. DONE6/77; IN_PROGRESS71; TODO0; remaining71. Next work: native SQL2022/Windows acceptance for existing High tasks; T076 human UAT Medium. No deploy/shared runtime changes.

T075–077 grouped results (external after immutable ZIP freeze): SQLite30s warmup/10min/9000requests70/30 p95read209.771ms/write153.441ms/error0%, Viewer4935.178ms one sample PASS_LOCAL_SUBSET. Peak whole-process RSS659MiB/heap432MiB, isolated memory trend/stability pending High. Archive policy initially excluded tests/sessions and failed fresh typecheck; corrected r2 SHAf443a8f566cc265a58138ba45b28909893fd7542829f46b53516ac90b7cc203b has430entries, all305previous source files included. Fresh offline ci/type/build/458npm tests/migrate repeat/fixture/omit-dev startup PASS; security policy6/6 and contract/test-plan/license390/0missing PASS. Pre-existing bundle>500kB warning remains. AT/UAT unsigned, formal candidate/final/production gates NOT_RUN;143formal items pending. Evidence TeamFlow_T075_T077_Test_Report.md / reports/T-075-077-batch-results.json / reports/T-077-fresh-archive.json. No full acceptance closed; DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next T075/T006/T007 High; T076 human UAT Medium.

## T-075 memory follow-up — 2026-10-07

Declared High; actual model/effort NOT_VERIFIED. TeamFlow_T075_Memory_Followup_Report.md records separated compiled API/client memory diagnostics and bounded contract-validator compilation cache. OpenAPI/wire rules unchanged, red/green cache regression and63contract tests PASS. Before/after memory comparisons and grouped/fresh delivery checks are pending until actual results are recorded. Formal SQL2022/Windows/fullTC-AT/UAT remain NOT_RUN, no task closed. DONE6/77, IN_PROGRESS71, TODO0, remaining71.

T075 memory measurements: separated compiled API before/after300s/4500requests70/30 both error0; post-GC/idle heap178.30MiB before→28.47MiB after, before retained delta+128.39MiB vs after−1.28MiB. Bounded128validator cache/release transient Ajv roots fixes specific retention; unchanged OpenAPI/API/business rules. Type/lint/contract/test-plan/syntax/archive-policy PASS; final regression/fresh candidate checks pending. Full10-minute on new build/native SQL/fullTC084/UAT remain NOT_RUN; do not close task.

T075 memory follow-up final grouped evidence: three cache regressions + all contract64/64; fresh immutable r3 ZIP cc2966480505a00a2ac6a5e25c783eaf05fe0aae3bbb476cfdf7b76472ebcf41/443entries, offline ci/type/build/461npm tests/migrate repeat/fixture/omit-dev startup PASS_LOCAL_SUBSET. Memory matched before/after4500requests; API post-idle178.301→28.468MiB (84.03percent lower), retained delta+128.395→−1.278MiB; error0both. Normal browser smoke150/error0/visible4889.761ms PASS_SMOKE; former10-minute r2 baseline is historical, updated-build10-minute/fullTC084/nativeSQL/Windows/UAT still NOT_RUN. T075 remainsIN_PROGRESS; no task closed; DONE6/77, IN_PROGRESS71, TODO0, remaining71. TeamFlow_T075_Memory_Followup_Report.md / reports/T-075-memory-followup-results.json. Next T075 High stress/native provider; T076 Medium human UAT.

## Owner Vibe applied to project — 2026-10-07

Owner authorized actual application integration after preview review. Declared UI T032/T044/T045/T054/T055 Medium; schema/contracts/assignment/recurrence/motion T003/T026/T027/T029/T047/T057 High; actual runtime model/effort NOT_VERIFIED. Vibe 4.5.34 real components, English base, compact shell/auth/drawer, top-right Notify, grouped tables, multiple Task owners, independent Checklist owner, centered inline status and reduced-motion Kanban implemented. API1.2.0 has56routes/81schemas; new SQLite0003/0004 and separate SQL Server0003/0004 migrations. See TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json for executed checks, raw failures and limits. SQLite verification does not close native SQL acceptance. No task newly closed: DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next T006/T007 High native SQL2022 and T076 Medium human UAT; no deploy/DNS/shared runtime changes.

Vibe final local evidence: full npm466/466 (Node428 + frontend38), final frontend38/38, Chromium2/2 including remote Group refresh within10s/native drag320ms/status26px centered/reduced motion/CSP0errors; type/lint/build/contract56routes81schemas/test-plan/license629missing0 PASS. SQL185SKIP/0executed, Windows/full TC-AT/RV/human UAT NOT_RUN. Production dependency audit62open (56moderate/6high/0critical) and >500kB build chunk warning recorded; no production sign-off. Evidence: TeamFlow_UI_Vibe_Implementation_Report.md / reports/UI-vibe-implementation-results.json / reports/vibe-implementation/*.txt. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Next T006/T007 High and T076 Medium.

## T-078 addendum merge — 2026-10-08

Declared Medium; actual model/effort NOT_VERIFIED. Owner instruction "ทำ T-078 ต่อเลย" recorded as approval of TeamFlow_Requirements_Addendum_Monday_Draft.md. Requirements1.9/SRS1.11/Task1.54/TestPlan1.35/TestCases1.34 updated: FR52(+FR-42A, FR-46 deferred)/NFR9/BR23/AT40/TC99/UT23/Tasks91. Planned routes kept outside OpenAPI (56routes unchanged). Owner asked to defer tests to grouped batches of5 tasks; planning/contract checks pending batch T-078–T-082. T-078 IN_REVIEW; T-079–T-091 TODO; no source/schema/API implementation, no commit.
