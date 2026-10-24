# DEL-ACCESS follow-ups — proposal appendix

สถานะ **PROPOSED / docs-only / ยังไม่ adopt** · 2026-10-25 · declared effort **High**; actual author runtime **gpt-6.1-sol / High**, verified by host launch log ตามที่ host ยืนยัน. Sole Codex CLI author; host ดูแล Git/auth/PR/review ทั้งหมด งานนี้หยุดพร้อม independent review และ parent precommit gate ไม่ใช่การเรียก review หรืออนุญาต merge

Base ที่ตรวจใน checkout: `ab47abe0d52ad12d73de7c3d6694ecbf85c149ea`. ใช้ merged **partial PR6** เป็นบริบทตามโจทย์ ไม่ได้ตรวจ remote/CI/merge ใหม่ อ่านเฉพาะ blocker และ integration ที่เกี่ยวข้อง ไม่มี broad repository audit

## Status boundary

[DEL-ACCESS](../../tickets/delivery/DEL-ACCESS.md) ยัง **in_progress**. [Evidence: scope limitations](evidence/DEL-ACCESS.md#scope-limitations-found) และ [final host verification](evidence/DEL-ACCESS.md#final-approved-host-verification-and-independent-delta-review--2026-10-25) ระบุ scoped partial acceptance พร้อม blocker สามข้อ; final CLEAN ใช้กับ partial PR เท่านั้น ไม่ได้อนุมัติ policy ที่เสนอที่นี่ ไม่อ้างว่า Zo เลือก follow-up ใดแล้ว

[DEL-VALIDATION](../../tickets/delivery/DEL-VALIDATION.md) ยังติด dependency DEL-ACCESS จน aggregate closure จริง แม้ PR6 merged หรือ NAV ผ่านแล้วก็ยังไม่ปลด dependency. ข้อสังเกต notice/Dismiss อื่นใน evidence ไม่อยู่ใน proposal นี้

Appendix นี้แยกจาก [inventory เดิม 16 cards](../../tickets/delivery/README.md) ไม่เพิ่มแถว ไม่ adopt และไม่ allocate official T-ID. ตรวจ tracked filenames ก่อนใช้ชื่อแล้ว: ทั้งสี่ output paths ยังไม่มีที่ base และสาม proposed IDs ไม่ชนชื่อ tracked card เดิม. Official Task Register คง **completed 9 / total 96 / remaining 87**; ไม่แก้ register, inventory, DEL-ACCESS card/evidence หรือ execution records เดิม

## Source-grounded findings

Anchor ระบุ symbol + บรรทัดที่ base เพื่อให้ตรวจซ้ำได้เมื่อบรรทัดเลื่อน; เป็น source inspection ไม่ใช่ผลทดสอบ

| Blocker | Source anchors ที่ตรวจ | ข้อจำกัดที่ต้องรักษา |
|---|---|---|
| Plain P-04 manager เข้า Trash ไม่ได้ | [navigation.ts](../../frontend/src/navigation.ts) `pages` / `allowedPages` L1–29; [App.tsx](../../frontend/src/App.tsx) scoped sidebar read L370–387, `nav = allowedPages(self)` L409, `allowed` L419, deny branch L725 และ Trash branch L805 | ทั้ง sidebar และ direct `/trash` ใช้ nav ชุดเดียวกัน; แก้เพียงปุ่มไม่พอ |
| Self บอก scoped manager ไม่ได้ | [api.ts](../../frontend/src/api.ts) `selfSchema` L13–79; [contract generator](../../scripts/build-contract.mjs) `schemas.Self` L96; [OpenAPI](../../contracts/openapi.json) `Self` | มี global `permission_keys`, `lead_team_ids`, `project_ids`; ไม่มี per-project role. `project_ids` ไม่ใช่ manager IDs และ P-04 อย่างเดียวไม่ใช่ membership |
| Server รองรับ scoped P-04 อยู่แล้ว | [authorization.ts](../../src/services/authorization.ts) `currentActor`, `projectAccess`, Trash exception L291–310; [tasks.ts](../../src/services/tasks.ts) `list` L936–965 / `trashMutation` L967–1010; [task-query.ts](../../src/repository/task-query.ts) L29–33; [access-scope.ts](../../src/repository/access-scope.ts) `projectVisibility` | ต้องเป็น manager ใน project นั้น + P-04; Admin/owner-team access Lead คงเดิม. Global key, team_position หรือ unrelated-team Lead ไม่ให้สิทธิ์ใน project |
| P-03 เปลี่ยนสมาชิกได้แต่ directory ปฏิเสธ | [workspaces route](../../src/api/workspaces.ts) `get_api_directory` L15–18 ส่ง `c.query`; [authorization.ts](../../src/services/authorization.ts) `admin_or_any_active_lead` L291; [workspaces service](../../src/services/workspaces.ts) `projectMember` L555–625 / `directory` L627–678 | Route authorization และ service ตรวจแยกกัน; ต้องแก้ทั้งคู่หาก policy ถูก adopt ไม่ใช่ปล่อย frontend เรียก endpoint ที่ยัง denied |
| Directory มีข้อมูลเกิน candidate picker ขั้นต่ำ | [workspace-api.ts](../../frontend/src/workspace-api.ts) `directoryPage` L56; [Workspaces.tsx](../../frontend/src/Workspaces.tsx) `Members` / `managerP03` / `canDirectory` L1340–1517; [generator](../../scripts/build-contract.mjs) `DirectoryPerson` L73 และ route L256 | Legacy directory ส่ง job title และ teams[]; ห้ามยืม broad directory grant หรือส่ง hidden affiliations ให้ P-03 manager |
| Invisible owner-team state ไม่มีใน DTO | [workspaces service](../../src/services/workspaces.ts) `projectColumns`, `project`, `projects` L60–63 / L131–146 / L434–453; [tasks.ts](../../src/services/tasks.ts) `dtos` L199 และ Trash assembly L960–964; [workspace-api.ts](../../frontend/src/workspace-api.ts) `projectSchema`; [task-api.ts](../../frontend/src/task-api.ts) `trashPage` L89 | Project/Task มี owner-team id/name ที่อยู่ใน existing readable resource แต่ไม่มี lifecycle/capability. `GET teams` ไม่ใช่แหล่งข้อมูลครบสำหรับ cross-team manager |
| UI ใช้ข้อมูลที่อ่านได้ไม่ครบ | [Trash.tsx](../../frontend/src/Trash.tsx) `read` L60–135; [Workspaces.tsx](../../frontend/src/Workspaces.tsx) `actionsFor` L320–349 / `EntityDialog.submit` L1073 เป็นต้นไป | Trash กวาดทุกหน้า projects/teams แล้ว missing team ถูกตีความเหมือนไม่ archived. ต้องเลิกอนุมานสิทธิ์จาก absence; unarchive ต้องรู้ action eligibility ไม่ใช่อ่านทีมที่ซ่อนไว้เพิ่ม |

หลักฐานประกอบ: [D09](delivery-decisions.md#d09--uiserver-permission-parity-no-automatic-grants), [R09](delivery-rules.md#10-ux-reliability-และ-validation-r09r11), [rollout gates](delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here), [SRS §4.3–4.4](../../TeamFlow_SRS_v1.0.md), [requirements FR-17/42/42A, BR-14/16/21–23](../../TeamFlow_Requirements_v1.0.md), [locked API](../../TeamFlow_API_Contract.md), [test cases](../../TeamFlow_Test_Cases_v1.0.md), [test plan](../../TeamFlow_Test_Plan_v1.0.md), [test/release policy](../../TeamFlow_Test_Release_Manifest.md). Test trace ที่เสนอเป็น partial TC-034/035/087–090, AT-13/14/32–33 ตามความเกี่ยวข้อง ไม่ใช่ปิด TC/AT เดิม

## Recommended selections and alternatives

| Proposed card / declared effort | Recommended scope | Alternatives และเหตุผล |
|---|---|---|
| **1. [DEL-ACCESS-NAV](../../tickets/delivery/DEL-ACCESS-NAV.md) / High** | Smallest first card: frontend-only scoped project input ให้ `allowedPages` และ App ใช้ร่วมกัน ไม่เปลี่ยน Self/server/contract | Key-only navigation ง่ายแต่ทำให้ editor/viewer/unrelated ที่มี P-04 ดูเหมือนมี authority. เพิ่ม Self capability เป็นอีกทาง แต่ขยาย server/wire scope โดยไม่จำเป็นสำหรับก้อนแรก |
| **2. [DEL-ACCESS-DIRECTORY](../../tickets/delivery/DEL-ACCESS-DIRECTORY.md) / High** | เสนอ project-scoped eligible-candidate mode บน `GET /api/directory?project=<id>`; policy gate ต้องตัดสินก่อน coding | Endpoint ใหม่ `/api/projects/{id}/member-candidates` แยกความหมายได้ดี แต่ generator/checker ปัจจุบันผูก route owners กับ old register และ assert 89 routes. โหมด scoped บน route เดิมเล็กกว่าและไม่ต้องแก้ old register; broad directory grants ไม่แนะนำ |
| **3. [DEL-ACCESS-PARENT-STATE](../../tickets/delivery/DEL-ACCESS-PARENT-STATE.md) / High** | เสนอ actor-scoped booleans บน readable Project/Trash DTO: candidate names `can_unarchive` / `can_restore`; false ใช้ generic unavailable | Raw `owner_team_archived_at`, ขยาย GET teams หรือซ่อนทีมแต่ส่ง roster ไม่แนะนำ. คง mutation-error fallback อย่างเดียวปลอดภัยได้แต่ไม่ปิด predictive parity blocker |

NAV ไม่รอ policy ของ directory/parent-state. Directory ไม่ต้องรอ NAV ทาง runtime เพราะเปิดจาก Projects ได้; parent-state เสนอให้ตาม NAV เพื่อทดสอบ plain cross-team manager ผ่าน shell จริง. ทั้งสอง policy streams แยกตัดสินและแยก PR; contract versions ต้องเลือกตาม target หลัง card ก่อนหน้า merge ไม่จองเลข version ล่วงหน้า

### NAV design boundary

แนะนำเพิ่ม scoped input แบบไม่ให้สิทธิ์โดย default ใน `allowedPages(self, scope?)`. App ใช้ reader แยกเฉพาะเมื่อ active/password-cleared P-04 non-Admin/non-Lead ต้องพิสูจน์ manager scope; อ่าน `GET /api/projects?includeArchived=true&pageSize=100&page=N` จนพบ `effective_access === 'manager'` หรืออ่านครบ. ไม่ใช้ sidebar first 100 active rows เป็น authority; manager อาจอยู่หน้าถัดไปหรือมีเฉพาะ archived project และยัง list Trash ได้

คง sidebar read/display เดิมเพื่อไม่เปลี่ยน board list. Snapshot ใหม่ต้องผูก actor/session + `view_revision`; login/logout/password change/reconnect/revocation ต้อง invalidate, abort และกัน late reply. Loading/error/unknown ไม่เป็น positive scope; pending direct `/trash` แสดงสถานะโหลด/ลองใหม่อย่างไม่รั่วข้อมูล ไม่ประกาศ permanent denied ก่อน read เสร็จ. Admin/Lead เดิมไม่ต้องรอ scoped lookup และผ่าน account/password gates เดิมเสมอ. Trash endpoint ยัง scope ทุก row/count และ restore ยังตรวจ server

### Directory business/security boundary

นี่คือ **policy เพิ่มการค้นพบชื่อคน** ไม่ใช่ UI-only parity ที่ D09 อนุมัติไว้แล้ว. แนะนำเสนอให้ active Admin/owner-team Lead หรือ actual manager + P-03 ของ project ค้น candidate ได้; global P-03 / manager ของ project อื่น / editor/viewer ไม่ได้. Scoped query ไม่ fallback ไป legacy directory เมื่อ denied

Candidate pool ที่แนะนำให้ owner/security พิจารณา: active organization accounts ที่เพิ่ม/คงเป็น Editor/Viewer ได้ตาม policy ที่เลือก โดยไม่เสนอ effective Admin/owner-team Lead หรือ explicit manager เป็นเป้าหมายให้ P-03 แก้. การเปิด display name ข้ามทีมแม้ไม่ส่ง affiliations ต้องได้รับคำตอบชัดเจน. ทางเลือก conservative คือคงเฉพาะ already-readable members และใช้ Admin/Lead เพิ่มคนใหม่ ซึ่งยังไม่ปิด arbitrary-new-member blocker. ไม่ใช้ hidden-team roster เป็น pool โดยปริยาย

แนะนำ scoped response ใหม่ `{items:[{id,display_name}],page,pageSize,total}` แยกจาก legacy `DirectoryPersonPage`; ไม่ส่ง team IDs/names/counts, job title, username, email, active/role flags หรือบัญชี inactive. `total` นับเฉพาะ eligible pool ที่ได้รับอนุมัติ ไม่ใช่ทั้ง users/teams. Query omission คง Admin/any access Lead แบบเดิม; invalid project ห้ามตกลงไป unscoped branch. Selection ไม่เพิ่มสมาชิก/role/P-key; PUT เดิมต้อง recheck actor/target/version และ manager appointment guard

### Parent-state disclosure boundary

แนะนำ capability ณ server snapshot เฉพาะ resource ที่ actor อ่านได้: `can_restore` บน Trash row และ `can_unarchive` บน Project. ค่า false หมายถึง action unavailable โดยไม่ส่ง raw invisible-team archive flag/timestamp หรือเหตุผลเจาะทีม. ชื่อ field, required/optional, version และ missing/null default **ยังเสนอ**; แนะนำ required boolean ใน wire รุ่นใหม่ และ missing/null/failed load เป็น unknown → disable ไม่ default true ใน UI

Restore predicate ต้องคง Admin/owner-team Lead archived-parent exception, manager + P-04 active parents และ retention cutoff. Unarchive ต่างกัน: ต้องเป็น Admin/owner-team Lead, project archived และ owner team active; Admin ก็ bypass archived owner team ไม่ได้. Online/maintenance และ explicit version confirmation ยังเป็น gate เพิ่ม ไม่ถือ capability เป็น write token. ไม่เปลี่ยน conservative archived edit/member restrictions ของ PR6

Server recheck ตอน mutation เป็น authoritative: capability true อาจเก่าเพราะ archive/revoke/retention/version race. ต้อง deny ตาม locked errors, refresh capability, ล้าง dialog/private state เมื่อเสีย access และไม่รับ late success กลับมาแสดง. False ไม่ให้ expose denial detail ของ resource ที่มองไม่เห็น; 403/404 ไม่สร้างชื่อ/จำนวนทีมใหม่

## Unanswered follow-up decisions

IDs ใหม่นี้แยกจาก Q-DEL-01–11 และไม่ใช่ recorded owner decisions

| ID | คำตอบที่ต้องบันทึก | Recommended selection / gate |
|---|---|---|
| Q-DAF-NAV-01 | Adopt frontend scoped-input approach และ pending/error route UX หรือเลือก Self capability? | เลือก scoped input ตาม NAV; scope/UX adoption gate ไม่ใช่ขอ business grant ใหม่ |
| Q-DAF-DIR-01 | P-03 manager ค้นพบ active candidate display names ข้ามทีมได้หรือไม่; pool/targets/exclusions/total ที่อนุญาตคืออะไร? | เสนอ eligible active organization pool แบบ identity-only ข้างต้น; owner + security ต้องตอบก่อนเปิด discovery |
| Q-DAF-DIR-02 | ใช้ scoped mode route เดิม, response แยก และ query validation/error policy แบบใด? | เลือก scoped mode; preserve legacy branch. Endpoint ใหม่ต้อง re-scope contract planning โดยห้ามฝืน 89-route/owner checks หรือแก้ old register ใน card นี้ |
| Q-DAF-PARENT-01 | ยอมรับ capability-only disclosure และ predicate/role exceptions ที่ระบุหรือไม่? | เลือก booleans + generic unavailable ไม่ raw team state; owner/security sign-off ก่อน DTO/UI เปลี่ยน |
| Q-DAF-PARENT-02 | ชื่อ field, requiredness, missing/null behavior และ contract compatibility/version rollout คืออะไร? | เสนอ required `can_restore` / `can_unarchive`, unknown disabled, coordinated server/client contract release; ยังไม่ใช่ locked schema |

## Adoption, implementation and merge gates

1. **Proposal review:** ตรวจ source anchors, threat/privacy assumptions และ exact allowed paths ของแต่ละ card. Host จัด independent specification/security review; author ไม่เรียก reviewer เอง และ parent ตรวจสี่ไฟล์ก่อน host precommit. Passing docs checks ไม่ adopt runtime
2. **Adoption:** owner เลือก card/decisions ที่เกี่ยวข้องอย่าง explicit, ยืนยัน dependencies/ceiling/test mapping บน target main. ถ้าจำเป็นต้องเพิ่ม official mapping/manifest ทำ dedicated planning scope แยก; proposal นี้ไม่ให้แก้ 16-card inventory/old register/totals. Decision ที่ยังไม่ตอบ block เฉพาะ card ที่พึ่งคำตอบ
3. **Implementation:** one coherent PR ต่อ card; RED จาก behavior จริง → GREEN โดยไม่ลด assertions. Exact planned commands อยู่ใน card พร้อม [common gates](delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here). Directory/parent-state ต้อง regenerate contract และทำ real PostgreSQL17 HTTP/service fixtures; NAV ไม่มี provider behavior change จึงใช้ scoped server regression เดิม ไม่อ้าง new PG acceptance
4. **Merge readiness:** host freeze source/build, record actual command/exits/executed/skipped/provider, independent spec/code/security review และ parent gate ก่อน Git actions ตาม authorization ณตอนนั้น. Contract/privacy decision, outstanding regression หรือ all-skipped PG ไม่ถือว่าผ่าน. เอกสารนี้ไม่มี merge authority
5. **Aggregate closure:** NAV + directory discovery + parent capability ต้องมี adopted acceptance และ affected regression ครบ พร้อม reconcile blocker ทั้งสามใน DEL-ACCESS ผ่าน separate authorized evidence/status update. ไม่มี child ใดปิด parent เอง; DEL-VALIDATION ยัง blocked จน full aggregate closure. PostgreSQL local test ไม่ปิด Linux/Docker/backup-restore/UAT/deploy gates

## Proposal evidence and handoff

Runtime RED/GREEN, contract build/tests, PostgreSQL, browser, UAT, deployment และ runtime/code review สำหรับ follow-ups: **NOT_RUN**. Planned new test filenames ใน cards เป็น artifacts ที่ยังไม่มี ไม่ใช่ executed evidence. ผลเก่าของ partial PR6 ไม่ได้นำมาเป็น PASS ของ proposal

Docs-only checks: ตรวจ local Markdown links/heading fragments, template/frontmatter, proposed path collisions, source-anchor symbols และ whitespace ของสี่ output files; ไม่มี runtime commands หรือ contract generation. ผู้ review ต้องตรวจ final candidate พร้อมผล docs checks ที่ author ส่งมอบ ไม่ถือข้อความนี้เป็น independent verdict

### Host handoff — completed proposal review

Independent specification/security proposal review **PERFORMED / CLEAN (docs-only)** โดย Claude Opus 5.5 / High, session `1330c465-da06-4732-bc31-3bf79609d5ad`, เทียบกับ base `ab47abe0d52ad12d73de7c3d6694ecbf85c149ea`. Host ได้รับผล docs checks **PASS: 93 local links, 17 heading fragments, template/frontmatter และ whitespace**; parent ตรวจครบทั้งสี่ไฟล์และ precommit gate **SATISFIED**. Host แก้เฉพาะ evidence/handoff prose เพื่อแยกผล proposal review ออกจาก runtime/code review ที่ **NOT_RUN**. Verdict ไม่ใช่ policy adoption, implementation acceptance, parent closure หรือ merge authority; choices ทั้งหมดยัง proposed/open ตามตารางด้านบน

Next recommended runtime card หากถูก adopt: **DEL-ACCESS-NAV / High**. DEL-ACCESS ยัง **in_progress**; official register **9/96 completed, 87 remaining**
