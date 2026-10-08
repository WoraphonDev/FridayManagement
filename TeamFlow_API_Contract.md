# TeamFlow — API/DTO contract 1.3.0

วันที่: 5 ตุลาคม 2026 · Task: T-003 · Business baseline1.1 + RD-01–RD-08

Machine contract: [contracts/openapi.json](contracts/openapi.json) (OpenAPI3.1.1/JSON Schema2020-12). Authoring source: [scripts/build-contract.mjs](scripts/build-contract.mjs). Contract tests: [tests/contracts/contract.test.mjs](tests/contracts/contract.test.mjs).

เอกสารนี้ล็อกสัญญา frontend/backend สำหรับ Node22 + SQLite local และ SQL2022 ปลายทางร่วมกัน ไม่ใช่ HTTP server, authorization implementation หรือหลักฐานว่า database transactions ผ่าน หากเปลี่ยน field/status/policy ต้องแก้ SRS/contract/tests พร้อมกัน และ regenerate JSON ก่อนปิดงาน

## Addendum API 1.3.0 — T-080–T-082 (8 October 2026)

Machine contract now has 63 routes / 93 schemas (`npm run build:contract`). Additive only; existing wire fields unchanged except new required response fields below.

- `AdminUser` (also `Self.user`, setup reply) adds `job_title_id: Id|null`, `job_title: string(1–50)|null`, `permission_keys: PermissionKey[]` (unique, ≤10) and `permissions_version: Version`. `PatchUser` accepts `job_title_id: Id|null`; only an active title can be newly assigned (422 `fieldErrors.job_title_id`). A title-only change keeps sessions, memberships and permissions (BR-19/BR-21) and writes admin audit `user_job_title_changed`. `GET /api/users` adds `job_title` filter.
- `GET /api/job-titles` (authenticated, `includeInactive=false` default) returns `JobTitle{id,name,color,is_active,sort_order,user_count,version,created_at,updated_at}` ordered by sort_order,id. `POST /api/job-titles` (Admin, Idempotency-Key required) and `PATCH /api/job-titles/{id}` (Admin, `version`) keep names unique case-insensitively (422 `fieldErrors.name`); no delete route — deactivate with `is_active=false` (BR-20). Seed: PM, SM, BA, SA, Dev, Tester.
- `ProjectMember` adds `job_title`; `DirectoryPerson` adds `job_title`; `Report.workload[]` adds `job_title`; CSV adds column `assignee_job_title` after `assignee` (multi-assignee values joined in the same order). `TaskQuery`/`ReportQuery` add `job_title: Id` (matches any current assignee). Titles are never read by authorization.
- Project role `manager`: `ProjectMembership.access`, `ProjectMember.explicit_access/effective_access` and `Project.effective_access` add `manager`. Only Admin/owner Lead appoint or remove a manager; appointing needs ≥1 of P-01–P-07 (422 `fieldErrors.access`). A manager writes like an Editor and additionally only for ticked keys in that project: P-01 PATCH name/description (never `archived`), P-03 add/remove Editor/Viewer, P-04 delete/restore others' tasks and list trash for managed projects, P-06 delete/restore others' attachments. P-08 lets a team member create a project in that team; the creator becomes `manager` when holding a P-01–P-07 key, otherwise `editor`. P-02 keeps the existing Editor group rights; P-05/P-07/P-09/P-10 are stored and listed but have no endpoint yet (T-084/T-088), so they grant nothing today.
- `GET /api/permissions/catalog` (authenticated) lists P-01–P-10 with label/description/scope/preset. `GET /api/users/{id}/permissions` (Admin or self) returns `UserPermissions{user_id,keys,permissions_version,manager_project_ids}`. `PUT /api/users/{id}/permissions` (Admin, never self → 403; body `keys`,`permissions_version`; stale → 409 `currentVersion`). `PUT /api/permissions/matrix` (Admin; `changes[1–100]` of `{user_id,keys,permissions_version}`; duplicate user 422; self 403) is all-or-nothing: every stale user is named in `fieldErrors["changes.<userId>"]` and nothing is written. Each changed user gets audit `user_permissions_changed{added,removed,demoted_project_ids}`; if no P-01–P-07 remains, every `manager` membership of that user becomes `editor` in the same transaction with project version bump and audit `project_membership_changed{reason:"BR-22"}`; view revisions are invalidated. Keys are read fresh on every request.

## Owner-approved password policy 1.2.1 — 8 October 2026

Owner reduced new password minimum to 6 Unicode scalars (maximum128; spaces preserved). Applies to setup, own password change, account creation/reset and local recovery. CurrentPassword remains1–128 for authentication; scrypt, session revocation and rate limits unchanged. Test account credentials remain outside source.

## Owner-approved API 1.2.0 — 7 October 2026

Current machine contract has 56 routes / 81 schemas. Task DTO adds required `assignee_ids: Id[]`, `assignees: Person[]` and nullable `group_id`. Sets are unique (max30), returned in ascending ID order; `assignee_id`/`assignee` remain compatibility aliases for the lowest ID, not a separate primary role. Create/Patch accept `assignee_ids`; legacy scalar writes still work; if both are supplied they must agree. Omitted PATCH preserves assignments; `[]` clears them. Idempotency normalizes set order, preserves explicit alias conflicts, and rechecks current rights before replay. Eligibility for every owner is active + effective project write. Assignment never grants permissions. My work/person filtering matches any owner; workload credits every owner, task totals stay distinct; CSV joins display names; reminders/notifications fan out with per-user dedupe.

Subtask DTO adds required nullable `assignee_id`; Create/Patch may assign independently of Task owners, with the same project eligibility/version/completion guards. Access withdrawal clears unfinished Task/Checklist assignments atomically with parent/child version updates and accurate history. Done retains historical owners; reopen/restore/recurrence recheck current eligibility. Large checklist cleanup is recorded as a serialized aggregate so TaskEvent stays inside the100-change limit without dropping affected items.

`GET /api/projects/{id}/groups` is project-read and returns ordered `ProjectGroup` items. `POST /api/projects/{id}/groups` requires project-write, active project, name1–100UTF16 and optional hex color (default#579bfc); max1000 groups. `PATCH /api/groups/{id}` requires the same rights and expected `version`; it updates name/color with atomic admin audit. Group DTO contains id/project_id/name/color/position/version/created_at. Task group references must belong to the same project; moving group preserves status. These routes use the locked envelope/errors/idempotency conventions. No group deletion, dependency or automatic scheduling endpoint was added. UI uses English base and Start Plan/End Plan aliases without changing date wire fields.

## 1. Request/response และ validation

- Prefix `/api`, same-origin; ทุก route มี owner ใน `x-owner-tasks`; health ใช้ `/health/*` ตาม SRS ไม่ต้องเพิ่ม routes เพื่ออ่าน checklist/สมาชิกทีม
- JSON writes ต้อง `application/json`; request body สูงสุด1MiB; multipart ใช้ upload route เท่านั้น; no-body routes รับไม่มี body จริง ไม่ใช่ `{}` และปฏิเสธ body ที่แอบเพิ่ม
- `additionalProperties:false` ทุก request object; unknown query/body field ถูกปฏิเสธ ไม่ strip เงียบ; JSON number/boolean ต้องชนิดจริง ไม่ coerce; PATCH ต้องมี version + อย่างน้อยหนึ่ง editable field; field ที่ไม่ส่งคงค่าเดิม, `null` ใช้เฉพาะ nullable fields
- title/name/display name/category trim ก่อนตรวจ schema; password/description/comment body ไม่ trim โดยพลการ; title/name/body ที่ต้องมีห้าม whitespace-only; username ไม่ trim และใช้ ASCII pattern ตาม SRS
- Text สำหรับ NVARCHAR: ไม่เกินจำนวน UTF16 code units ตาม column capacity; JSON Schema maxLength ตรวจ Unicode scalars ร่วมกับ mandatory extension `x-utf16MaxLength`; `contracts/validate.mjs` ลงทะเบียน extension แล้ว ตัวอย่าง title200 รับ100emojiได้แต่101emojiไม่ได้; password6–128นับ Unicode scalarsและไม่ trim
- IDs/versions เป็น integer1..2147483647; ไม่ expose SQL rowversion หรือ auth_version; DATE เป็นวันที่จริง `YYYY-MM-DD`, ปี0001–9999; timestamps เป็น UTC `YYYY-MM-DDTHH:mm:ss.sssZ`; ไม่รับ timestamp แทน date-only
- `contracts/validate.mjs` ตรวจ request schema/pure cross-field rules และ decode query แบบไม่แก้ input; ไม่ตรวจ active user/project rights/assignee/current DB versions/checklist/retention/quota; backend ต้องตรวจ authoritative state ภายใน transaction
- Create task default todo/medium/recurrence none, text optionalเป็นempty string, dates/assigneeเป็นnull; default schema เป็น annotation เท่านั้น; backendใช้ defaultsเฉพาะcreate ไม่ทำให้ PATCH overwrite fields ที่ไม่ส่ง
- PATCH task validate final merged state: start≤due และ recurrence≠noneต้องdue; recurrence anchor เป็น server field ตาม RD-06; date arithmetic เกินช่วง0001–9999ตอบ422ไม่ truncate
- Body response objects ไม่คืน password/password_hash/auth_version/token_hash/storage_key/file paths; Personมีเฉพาะid/display_name/active; csrfคืนเฉพาะlogin/me/password self response ไม่คืน raw session tokenในJSON
- ทุก response รวม errors มี `X-Request-Id` UUIDที่serverสร้าง; ไม่ใช้ requestIdจากclientเป็นtrusted value; JSON/item/list errorsและdownload/exportใช้ `Cache-Control:no-store`; accessต้องตรวจใหม่เสมอ
- Cookieชื่อ `friday_session` (Path=/, HttpOnly, SameSite=Strict, production Secure), session token hashในDB; successfullogin/passwordchangeคืน `Self` และ Set-Cookie; logout204clearcookie; requestId/CSRFเป็นคนละค่า

## 2. Pagination/query wire format

- ทุก paginated list ใช้ page=1/pageSize=50 defaults/max100; totalนับหลังscoping; pageเกินสุดคืนitems[]พร้อมtotalจริง; sortใช้ allowlist และID tie-breaker; dueทั้งasc/descให้null last
- ชนิด query integerรับdecimalcanonical ไม่มีsign/leading zero/exponent; booleanรับ `true`/`false` เท่านั้น; nullableassigneeรับliteral `null`; scalarส่งซ้ำถูกปฏิเสธ
- Arraysใช้ repeated keys เช่น `status=todo&status=doing`, `priority=high&priority=urgent`; ไม่ใช้ `status[]` หรือ comma-separated; duplicates/enumผิดถูกปฏิเสธ; ANDข้ามfields/ORภายในarrayตามSRS
- `GET /api/tasks` เพิ่ม `creator=<id>` สำหรับงานที่ฉันสร้าง; MyTasksใช้assignee=currentUser.id; ไม่เปิด accessจากcreator/assignee
- `assignee=null` หมายถึงยังไม่มอบหมาย; `has_due=false` หมายถึงไม่มีวันส่ง; futureใช้due_from=BangkokTomorrow; todayใช้due_from=due_to=BangkokToday; overdueใช้due_to=BangkokYesterdayและnon-done statuses
- date_basis=`created|due|completed`; date_from/date_to inclusiveBangkokdatesแปลงเป็นUTC[start,endExclusive)สำหรับtimestamps; completed basisไม่รวมnon-done; due_from/due_toเป็นdate-only; reversedrange/has_due=falseร่วมdue-rangeตอบ400 INVALID_QUERY
- Calendar monthใช้due_from=firstDay/due_to=lastDay; no-dueรายการแยก request has_due=falseโดยไม่ส่งmonthduefilter; ทุกrequestpagedจนแสดงผลครบ/มีloadmoreชัด
- List defaultcreated_descและall dates; reports/export defaultcreated/currentBangkokmonthเมื่อไม่ส่งdatebasis/range; หากส่งbasisแต่ไม่มีrangeก็ใช้currentmonth; ต้องการall datesส่ง `date_from=0001-01-01&date_to=9999-12-31` และconversionendExclusiveใช้ขอบเขตพิเศษไม่สร้างปี10000
- Reports/exportไม่รับpage/pageSize/sort; ห้ามตัด CSVเหลือหน้าแรก; cap50000ตรวจscopedcountก่อนส่งstreamheaders เกินตอบ422 EXPORT_LIMIT_EXCEEDED
- Comments/eventsใช้page/pageSizeและIDascending; UIเก็บanchorที่เห็นและdedupeidsเมื่อrefresh ไม่ใช้cursorในcontractรุ่นนี้

## 3. Read DTO/lookup ที่ล็อกแล้ว

| Endpoint | สิ่งที่คืน / privacy |
|---|---|
| GET /api/teams | สมาชิกทั่วไป: paginated Teamของตนพร้อมown_role; Admin: AdminTeamพร้อมmembers[{user:Person,team_role,joined_at}]; ไม่มีteam rosterของคนอื่นให้Member/Viewer |
| GET /api/projects/{id}/members | itemsรวม explicit members และ implicit active Admin/ownerLead; effective_access/assignee_eligible; `membership_version` คือproject.versionเดียวกัน ไม่ใช่clockใหม่; inactive explicit memberอ่านเป็นประวัติแต่eligible=false |
| GET /api/tasks/{id} | `{item:TaskDetail}` พร้อมsubtasksทั้งหมดสำหรับchecklist ไม่คืนเพียงcounts; querylistsใช้Taskพร้อมcounts; count/DTOมาจากconsistent read |
| GET /api/directory | Admin/Leadเท่านั้น; activeid/displayname/teamid/nameเพื่อแชร์ ไม่มีusername/privateaccountfields |
| GET /api/projects/{id}/board | total≤500:mode=board/4completecolumns/fullorderedtasks; total>500:mode=list_required/tasks[]/columnscomplete=falseและtask_ids[]; UIใช้pagedlist/statusmenu |
| GET /api/trash | Admin/ownerLeadเท่านั้น; Taskพร้อมrestore_before timestamp; active APIs/subresource/downloadไม่เปิดdeletedtask |
| GET /api/tasks/{id}/attachments | paginatedmetadata; includeDeleted=trueคืนdeletedเฉพาะuploader/Admin/ownerLeadที่ยังมีสิทธิ์คืน; Viewerถูก403เมื่อขอdeleted; can_delete/can_restoreเป็นhintไม่แทนservercheck |

Project membersมองเห็นPerson/effective project rightsที่จำเป็นในโปรเจกต์ที่เข้าถึง ไม่คืนรายชื่อบัญชีอื่นทั้งองค์กร; eligibilityactive+effectivewriteจากปัจจุบัน ไม่พึ่งmembershiprowเพียงอย่างเดียว; recheckเมื่อsave/assign

Project DTO มีowner_team_name; Task DTO มีproject_name/owner_team_id/owner_team_name/assignee(Person|null)เพื่อแสดงรายการและการ์ดโดยไม่ค้นบัญชีทั้งหมด; assignee.idต้องตรงassignee_id; teamfilterของโปรเจกต์ข้ามทีมใช้owner metadataจากaccessibleprojects ไม่เปิดGETteamsทั้งองค์กรให้Member

## 4. Version/concurrency และ mutation results

| Resource/command | Expected version และการเปลี่ยน |
|---|---|
| User PATCH/reset | user.version; resetเพิ่มversion/auth_versionและrevoke แต่ไม่คืนauth_version; createversion1 |
| Organization PATCH | organization.version |
| Team PATCH/member PUT/DELETE | team.version; membership changeเพิ่มparentteam.version; ไม่เพิ่มmembershipclockแยก; requestfieldชื่อversion |
| Project PATCH/member PUT/DELETE | project.version; membership_versionในmembersresponseเป็นaliasของproject.version; changingmembershipเพิ่มproject.version |
| Task PATCH/delete/restore | task.version; realmutationเพิ่มversion/updated_at; stale409; done→done/nofieldchangeเมื่อexpectedversionตรงเป็นno-opไม่เพิ่มtimestamp/audit/recurrence |
| Subtask create | task_versionของparent; createversion1 และparenttask.versionเพิ่ม; parentdoneห้ามเพิ่ม |
| Subtask PATCH/delete | subtask.version + task_version; atomicparentlock; เปลี่ยนจริงเพิ่มsubtask/versionเมื่อยังอยู่และparenttask.version; doneparentห้ามuntick/add; edittitle/deleteที่ไม่ทำcompletioninvariantเสียอนุญาต |
| Board move | task_version/source_column_version/target_column_version; samecolumnต้องversionsเท่ากัน; currenttaskstatusต้องfrom_status; anchorsameproject/targetcolumn/notself |
| Attachment delete/restore | ไม่มีclientversion; serializeparent+attachmentstate/retention/quota ในtransaction; repeateddeleteบนalreadydeletedเป็นno-opไม่resetdeleted_at; repeatedrestoreบนactiveเป็นno-opเมื่อcallerยังมีสิทธิ์; purgeแล้ว404 |
| Notification read/read-all | ไม่มีversion; setread_atเพียงครั้งแรก; read-allใช้snapshotcutoffidตอนเริ่มtransaction ไม่กลืนnotificationใหม่; recipientและcurrentparentaccessตรวจทุกครั้ง |

Task create/status/delete/restore/recurrenceและboardmoveใช้orderingtransactionร่วม; affectedcolumnversionsเพิ่มเมื่อordering/membershipของคอลัมน์เปลี่ยนเท่านั้น; `Self.view_revision` เป็น UUIDต่อผู้ใช้สำหรับrefresh ไม่ใช่globalcounterที่เผยความเคลื่อนไหวของhiddenprojects; เปลี่ยนrevisionเฉพาะผู้มีสิทธิ์เห็นmutationและคนที่เพิ่งถูกถอนสิทธิ์เพื่อclearclientdata รวมcomments/files/subtasks/membership/maintenance เปรียบเทียบGET meแล้วrefetchเฉพาะscopeddata; revisionเปลี่ยนพร้อมbusinesscommitและGETห้ามสร้างrevisionใหม่

`Self.bangkok_today` มาจากserverclock; UIใช้ร่วมกับview_revisionเพื่อrefetchเมื่อข้ามเที่ยงคืนแม้ไม่มีmutation; Task.overdueเป็นserver-derivedbooleanตามBR-09 ไม่ใช้browserclockตัดสินงานเกินกำหนด

TaskMutationResult=`{item:TaskDetail,successor:Task|null,affected_columns:[{status,version}]}` ไม่ต้องคืนทั้งคอลัมน์ซึ่งอาจเกิน500; no-op/field-onlychangesคืนaffected_columns[]ได้; client refetchboardตามversionsเมื่อorderเปลี่ยน BoardMoveResultคืนtask/successor/fullaffectedcolumns; boardmoveเมื่อprojectมี>500 active tasksตอบ422 BOARD_LIMIT_EXCEEDED ใช้PATCHstatusแทน

Versioncheckหลังauth/resourcevisibilityก่อนbusiness validation; staleversionคืน409พร้อมcurrentVersionเฉพาะresourceที่callerยังเข้าถึง; ไม่มีaccessให้404โดยไม่คืนversion; permission denied403; source/targetcolumnconflictcurrentVersionระบุcolumnที่ตรวจตามfrom→toพร้อมfieldErrorsชี้field

## 5. Idempotency และ DELETE body

- RequiredUUIDkey: create team/project/task/subtask/comment/upload, PATCH task, taskrestore, boardmove; manifestระบุ `x-idempotency=required`; PATCHtaskทุกครั้งใช้keyเพื่อครอบคลุมcompletion/reopen แม้updatefieldเดียว
- setupใช้no-usersguardแทนuser-scopedkey; login/passwordchange/createuser/reset-passwordเป็นcredential exceptionsเพื่อไม่persistpassword-derivedrequest hashes/results; unknowncommitให้GETauthoritativestate/ลองloginด้วยรหัสใหม่ในกรณีเหมาะสม ไม่blindretryreset
- MemberPUT/DELETEใช้parentversionแทนkey; attachmentdelete/restoreใช้serializedstate; notificationread/logout/activityเป็นnaturalno-opตามpolicy (repeatedlogoutเมื่อcookieหมดใช้401ได้ไม่ถือเป็นmutationซ้ำ)
- Keyscope=`user_id + UPPER(method) + canonical concrete path + UUID`; ต้องรวมresourceidไม่ใช่route templateเพื่อไม่ชนคนละtask; TTL24hนับจากcommit; expiresexactlyatcutoffถือexpired
- CanonicalJSONhash: recursivelysortobjectkeys; arrayorderคงเดิม; hashnormalizedrequestหลังvalidationก่อนDBwrite; omitted/nullแตกต่างกัน; defaultเติมเฉพาะcreateให้canonicalผลตรงกัน; ไม่hashsecretcommandตามexceptions
- Uploadkeyhashใช้normalizedoriginalname+validatedtype+actualbytes+SHA256ของstream; ไม่เก็บfilebytes; requestใหม่keyเดิมยังต้องchecksize/type/accessและhashก่อนreplay; quotareservationreleaseเมื่อduplicate ไม่เพิ่มstoredbytesซ้ำ
- DBunique/lockclaimและbusinesswrite/resultcommitในtransactionเดียว; simultaneoussamekeybodyคืนผลเดิมหลังclaimจบ หรือ503busyแล้วclientcheckstate/retrykeyเดิม; bodyต่าง409 IDEMPOTENCY_CONFLICT
- Replayต้องตรวจsession/forcedpassword/currentpermission/parentvisibilityก่อนคืนcachedresult; projectarchivedห้ามสร้างใหม่ แต่replayผลเดิมต้องไม่เผยสิ่งที่callerอ่านไม่ได้; resourceถูกdelete/purgeไม่คืนcachedcontentที่normalAPIมองไม่เห็น; lostaccess404, operationdenied403
- Cacheเก็บstatus+businessresponseไม่เก็บSet-Cookie/CSRF/headerrequestId; replayสร้างrequestIdใหม่แต่ไม่ทำmutation/audit/notificationซ้ำ
- DELETE task/team member/project member: `application/json` body`{version}`; DELETE subtask:`{version,task_version}`; DELETE attachment:no body; ห้ามส่งversionผ่านqueryเพื่อหลบbodyvalidation
- networktimeout/unknowncommitตรวจGETauthoritativestateและkeyresultด้วยretryrequestเดิมเมื่อsafe; ห้ามเพิ่มpublicidempotencylookupendpoint

## 6. Error catalog และลำดับตรวจ

Envelopeเดียว:`{error:{code,message,fieldErrors,requestId,currentVersion?}}`; fieldErrorsเป็นmapfield→arrayข้อความ; versionconflictต้องcurrentVersion; messageไทยคงความหมาย ไม่พึ่งคำแปลเพื่อแยกlogic

| HTTP | Codes |
|---|---|
| 400 | INVALID_JSON, INVALID_QUERY, INVALID_PATH |
| 401 | UNAUTHENTICATED, INVALID_CREDENTIALS (genericทุกloginfailure) |
| 403 | FORBIDDEN, INVALID_ORIGIN, INVALID_CSRF, INVALID_SETUP_TOKEN, PASSWORD_CHANGE_REQUIRED |
| 404 | NOT_FOUND (absent/purged/no-project-access/deletednormalresource/missingfile) |
| 409 | VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, SETUP_ALREADY_COMPLETED |
| 413 | PAYLOAD_TOO_LARGE, FILE_TOO_LARGE |
| 415 | UNSUPPORTED_MEDIA_TYPE |
| 422 | VALIDATION_FAILED, SUBTASKS_INCOMPLETE, PARENT_DONE, PROJECT_ARCHIVED, TEAM_ARCHIVED, TEAM_HAS_ACTIVE_PROJECTS, LAST_ACTIVE_ADMIN, ASSIGNEE_INELIGIBLE, RETENTION_EXPIRED, QUOTA_EXCEEDED, INVALID_FILE_TYPE, INVALID_ANCHOR, BOARD_LIMIT_EXCEEDED, EXPORT_LIMIT_EXCEEDED |
| 429 | RATE_LIMITED + Retry-After integerseconds |
| 503 | DATABASE_BUSY, SERVICE_NOT_READY, MAINTENANCE + Retry-After integerseconds |
| 500 | INTERNAL_ERROR (safeข้อความ+requestId; logredacted) |

Ingresscontenttype/size/syntaxก่อน; writesตรวจexactOrigin/CSRF; sessionactive/absoluteidle/authversion/forcedpassword; scopedresourceexistence; operationrights; expectedversion; archived/deletedstate; businessrules; transactioncommit ไม่มีsideeffectsของrejectedrequests Internalerrorsไม่คืนstack/SQL/path/secret Errorsหลังเริ่มdownload/CSVstreamแล้วปิดstream+logrequestId ไม่ส่งJSONปนไฟล์และไม่อ้างdownloadสำเร็จ

ข้อยกเว้นhealthready503คืนHealth `{status:"not_ready"}` อย่างเดียวตามSRSและrestrictedlocation; diagnosticsอยู่ในprivate redacted logs ไม่รวมในpublicbody; successlive200คือstatusok

## 7. Durable state ที่ต้องทำใน T-007/T-008

| State | Fields/invariants ที่ล็อกเพื่อออกแบบ migrations |
|---|---|
| storage_quota singleton | stored_bytes/reserved_bytes≥0; quotaรวมstored+reserved; accountingไม่คืนbytesก่อนลบdiskจริง |
| upload_reservations | randomid/user/task, reserved_bytes, actual_bytes, temp_key, expires_at, phase receiving/validated/finalizing; claimก่อนstream/releasefail; recoveryเก็บreferencedfile |
| file_cleanup_queue | storage_key snapshot/bytes/reason/attempts/next_attempt_at; surviveparent/attachmentmetadata purge; retryแล้วreleasequotaเมื่อdiskconfirmdeleted |
| maintenance singleton | ownerid/state entering/frozen/leaving, lease_expires_at; sharedwritegate/jobs/drain; SQLhostแยกไม่ใช้in-memoryfreezeอย่างเดียว |
| user_view_revisions | user_id PK/revision UUID/updated_at; changesเฉพาะvisiblemutation/accessrevoke/orgname/maintenanceที่ผู้ใช้ต้องเห็น; resourceversionsยังแยกใช้optimisticedit; ไม่เผยhiddenprojectcounts/globalactivitycounter |
| idempotency_keys | canonicalconcreteroute/hash/status/body/expires_at; resultและbusinesscommit atomic; password/uploadbytes excluded |

LocalSQLite/SQL2022แยกphysicalmigrations/adapter แต่ invariants/DTOเหมือนกัน; ตรวจconstraint/lock/timeoutจริงใน T-007/T-008/T-010 ไม่อ้างว่าตารางนี้ผ่านintegrationแล้ว

## 8. Operational contracts ที่ frontend/backend ต้องใช้ตรงกัน

- Intentionalinteractionส่งPOST activityด้วยCSRFและthrottle15s; visiblepollไม่ยืดidle; pollingdefault5sให้เผื่อresponseเพื่อtargetupdate≤10s; hidden/offlineหยุดและfocusonlineGETทันที; measureelapsedจริงในT-075
- Self.maintenance=trueปิดwritesแสดงข้อความไทย; maintenancewrites503; me/activity/password/logoutallowedตามauthgate แต่DBsessionwritesต้องdrain/freezeในsnapshotimplementation; read/writegateรายละเอียดทำในT-061
- Rate-limitpolicy10/username30/IP15minใช้normalizedusername/trustedproxyIP; persistedbucketwindowในDB ไม่resetทั้งหมดเมื่อrestartหรือsuccess; setup/password/resetlimits10/IPหรือuser15minและhashoperationconcurrencycap4; จัดqueueที่boundedและrejectbusy503ก่อนใช้resourcesเกิน; ตรวจจริงT-009/T-014 ไม่ทำpublicrecovery
- SQL runtime accountเฉพาะCRUDที่แอปต้องใช้ไม่มีDDL/BACKUP/RESTORE; migrationและbackup/restoreเป็นdedicatedoperatorcredentialsนอกsource/log; SQLitelocalใช้filepermissionsตามDATA_DIR
- HTTPbrowsercache/proxycache/no-store+logout/expiry/revocationล้างin-memoryuser/task/files/draftsที่ไม่มีสิทธิ์และแจ้งข้ามแท็บ; ไม่เก็บtoken/password/taskdataในlocalStorage; staticSWเท่านั้น; dirtyformคงเมื่อversionเปลี่ยนแต่ไม่คงข้อมูลเมื่อaccessหมด
- Sourcecandidate/SQL2022/Windows/UAT gatesตามRD-08; T-003schemaPASSไม่เปลี่ยนAT/TCเป็นPASS

## 9. วิธีตรวจ contract

Node22; `npm ci --ignore-scripts`, `npm run check:contract`, `npm run test:contract`; dependencyตอนนี้เฉพาะdevvalidatorAjv/ajv-formatsและlockfile ไม่ใช่T-005fullappfoundation RuntimeZodในSRSต้องมีparityกับJSONSchema/extension/businessvalidationนี้เมื่อทำT-009

อ้างอิงมาตรฐาน: [OpenAPI3.1.1](https://spec.openapis.org/oas/v3.1.1.html), [Ajv JSONSchema2020-12](https://ajv.js.org/json-schema.html), [Ajv format validation](https://ajv.js.org/guide/formats.html). เอกสารต้นทางมาตรฐานใช้ประกอบschema/tooling ไม่เปลี่ยนbusinessbaseline

## 10. Route inventory

ตารางถัดไป generate จากmachinecontract; request/response namesอ้างcomponents.schemas; permissions/idempotency/ownersเต็มอยู่ในOpenAPI

| Method / route | Request | Success / DTO | Idempotency | Owner tasks |
|---|---|---|---|---|
| GET /api/meta | — | 200 / Meta | none | T-013, T-068 |
| POST /api/setup | Setup | 201 / inline | setup_guard | T-013, T-068 |
| POST /api/login | Login | 200 / Self | auth_exception | T-014, T-017, T-068 |
| GET /api/me | — | 200 / Self | none | T-014, T-017, T-068 |
| POST /api/session/activity | — | 204 / — | natural_noop | T-014, T-017, T-068 |
| POST /api/logout | — | 204 / — | natural_noop | T-014, T-017, T-068 |
| POST /api/password | PasswordChange | 200 / Self | auth_exception | T-015, T-017, T-068 |
| GET /api/users | — | 200 / AdminUserPage | none | T-016, T-018, T-068 |
| POST /api/users | CreateUser | 201 / inline | credential_exception | T-016, T-018, T-068 |
| PATCH /api/users/{id} | PatchUser | 200 / inline | none | T-016, T-018, T-068 |
| POST /api/users/{id}/reset-password | PasswordReset | 200 / inline | credential_exception | T-015, T-016, T-018, T-068 |
| GET /api/directory | — | 200 / DirectoryPersonPage | none | T-021, T-024, T-069 |
| GET /api/teams | — | 200 / TeamsPage | none | T-020, T-023, T-069 |
| POST /api/teams | CreateTeam | 201 / inline | required | T-020, T-023, T-069 |
| PATCH /api/teams/{id} | PatchTeam | 200 / inline | none | T-020, T-023, T-069 |
| PUT /api/teams/{id}/members/{userId} | TeamMembership | 200 / inline | parent_version | T-020, T-023, T-069 |
| DELETE /api/teams/{id}/members/{userId} | VersionBody | 200 / inline | parent_version | T-020, T-023, T-069 |
| GET /api/projects | — | 200 / ProjectPage | none | T-021, T-024, T-022, T-069 |
| POST /api/projects | CreateProject | 201 / inline | required | T-021, T-024, T-022, T-069 |
| PATCH /api/projects/{id} | PatchProject | 200 / inline | none | T-021, T-024, T-022, T-069 |
| GET /api/projects/{id}/members | — | 200 / ProjectMembers | none | T-021, T-024, T-022, T-069 |
| PUT /api/projects/{id}/members/{userId} | ProjectMembership | 200 / ProjectMembers | parent_version | T-021, T-024, T-022, T-069 |
| DELETE /api/projects/{id}/members/{userId} | VersionBody | 200 / ProjectMembers | parent_version | T-021, T-024, T-022, T-069 |
| GET /api/tasks | — | 200 / TaskPage | none | T-031, T-045, T-046, T-071 |
| POST /api/tasks | CreateTask | 201 / TaskMutationResult | required | T-026, T-027, T-032, T-070 |
| GET /api/tasks/{id} | — | 200 / inline | none | T-026, T-027, T-032, T-070 |
| PATCH /api/tasks/{id} | PatchTask | 200 / TaskMutationResult | required | T-026, T-027, T-032, T-070 |
| DELETE /api/tasks/{id} | VersionBody | 200 / TaskMutationResult | none | T-030, T-033, T-070 |
| GET /api/trash | — | 200 / TrashPage | none | T-030, T-033, T-070 |
| POST /api/tasks/{id}/restore | VersionBody | 200 / TaskMutationResult | required | T-030, T-033, T-070 |
| GET /api/projects/{id}/board | — | 200 / Board | none | T-034, T-036, T-071 |
| POST /api/projects/{id}/board/move | BoardMove | 200 / BoardMoveResult | required | T-035, T-036, T-037, T-038, T-071 |
| POST /api/tasks/{id}/subtasks | CreateSubtask | 201 / inline | required | T-028, T-033, T-070 |
| PATCH /api/subtasks/{id} | PatchSubtask | 200 / inline | none | T-028, T-033, T-070 |
| DELETE /api/subtasks/{id} | DeleteSubtask | 200 / inline | none | T-028, T-033, T-070 |
| GET /api/tasks/{id}/comments | — | 200 / CommentPage | none | T-039, T-044, T-072 |
| POST /api/tasks/{id}/comments | CreateComment | 201 / inline | required | T-039, T-044, T-072 |
| GET /api/tasks/{id}/attachments | — | 200 / AttachmentPage | none | T-043, T-044, T-072 |
| POST /api/tasks/{id}/attachments | Upload | 201 / inline | required | T-041, T-042, T-044, T-072 |
| GET /api/attachments/{id}/download | — | 200 / inline | none | T-043, T-044, T-072 |
| DELETE /api/attachments/{id} | — | 200 / inline | serialized_state | T-043, T-044, T-072 |
| POST /api/attachments/{id}/restore | — | 200 / inline | serialized_state | T-043, T-044, T-072 |
| GET /api/tasks/{id}/events | — | 200 / TaskEventPage | none | T-040, T-044, T-072 |
| GET /api/notifications | — | 200 / NotificationsPage | none | T-050, T-051, T-072 |
| POST /api/notifications/{id}/read | — | 200 / inline | natural_noop | T-050, T-051, T-072 |
| POST /api/notifications/read-all | — | 200 / inline | natural_noop | T-050, T-051, T-072 |
| GET /api/reports/summary | — | 200 / Report | none | T-052, T-054, T-073 |
| GET /api/export/tasks.csv | — | 200 / inline | none | T-053, T-054, T-073 |
| GET /api/organization | — | 200 / inline | none | T-025, T-074 |
| PATCH /api/organization | PatchOrganization | 200 / inline | none | T-025, T-074 |
| GET /health/live | — | 200 / Health | none | T-059, T-074 |
| GET /health/ready | — | 200 / Health | none | T-059, T-074 |
| GET /api/users/{id}/permissions | — | 200 / UserPermissions | none | T-081, T-082 |
| PUT /api/users/{id}/permissions | PutUserPermissions | 200 / UserPermissions | none | T-081, T-082 |
| GET /api/permissions/catalog | — | 200 / PermissionCatalog | none | T-081, T-082 |
| PUT /api/permissions/matrix | PermissionMatrix | 200 / PermissionMatrixResult | none | T-082 |
| GET /api/job-titles | — | 200 / JobTitles | none | T-080, T-082 |
| POST /api/job-titles | CreateJobTitle | 201 / inline | required | T-080, T-082 |
| PATCH /api/job-titles/{id} | PatchJobTitle | 200 / inline | none | T-080, T-082 |

## T-009 runtime integration note - 2026-10-06

Wire contract remains1.0.0 unchanged. The previous tooling-only dependency note is historical: pinned Ajv/ajv-formats now ship as runtime dependencies. Zod public parse boundaries delegate locked shape/Unicode/UTF16 rules to contracts/validate.mjs without coercion/defaulting/stripping. HTTP ingress/output schema checks and session/CSRF/authorization hooks are implemented; default feature routes stay503. Real session/ACL/SQL/HTTPS and transaction-state feature binding remain NOT_RUN. Evidence TeamFlow_T009_Test_Report.md.

## Contract correction 1.0.1 — 2026-10-06 / T-035

BoardMoveResult.affected_columns maxItems เพิ่ม2→3: moving a recurring task doing/review→done changes source,done,and todo for the successor in one transaction. Request/path/permissions/versions unchanged; same-column reorder still one column, ordinary cross-column two. Authoring source regenerated via build:contract; provider/HTTP tests exercise all3 and DTO validation. This fixes response schema to existing completion/recurrence rules; no new scheduling feature.

## T-040–T-044 additive clarification — 2026-10-06

Contract1.1.0 has53 routes/77 schemas. GET /api/audit is Admin-only; AdminAuditPage uses standard ID-ascending pagination50/max100 and redacted_changes serialized JSON. Secret field names are recursively redacted at persistence/read, including legacy rows and before/after secret descriptors; boolean reset markers and installer authority markers remain readable. TaskEvent supports existing task/completed_at/comment_id/before_task_id/predecessor/successor fields; structured values are serialized JSON strings to preserve scalar EventChange values. No mutation endpoint for history. Files use locked existing routes/DTOs: streamed actual fingerprints, private random UUID storage outside static serving, reservation cleanup on replay/error, current finalize/download/lifecycle authorization. Size minimum is1 byte per schema, maximum10MiB; signatures/type validation is not antivirus scanning. Production guard/readiness remain unchanged.
