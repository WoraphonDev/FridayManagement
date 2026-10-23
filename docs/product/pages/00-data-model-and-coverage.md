> **Historical proposal snapshot v1.0 — ไม่ใช่กติกาที่อนุมัติทั้งหมด:** source `94282b6` (Windows staging PR #1), ไม่ใช่ main `4a0b76b`. ข้อความเก่าที่ว่า D01–D12 ยังไม่อนุมัติ / acceptor optional / baseline deferred ถูกแทนด้วย [decisions](../delivery-decisions.md) และ [rules](../delivery-rules.md). รายละเอียดอื่นเป็นข้อเสนอเท่านั้น; ไม่มีผลทดสอบ runtime ใหม่. ดู [provenance](../audit/README.md).

# 00 — Data dictionary / decisions / coverage / delivery roadmap

> **อัปเดตการตัดสินใจ:** โซยืนยัน D01–D12 แล้ว ดู [คำตอบที่อนุมัติ](../delivery-decisions.md) ซึ่งมีผลเหนือคำแนะนำหรือข้อความ “ยังไม่อนุมัติ” ที่ขัดกันในร่างนี้ โดยเฉพาะผู้ตรวจรับต้องระบุชื่อจริงก่อนเริ่ม และต้องเก็บแผนตั้งต้นเมื่อยืนยันเริ่ม ข้อเสนอ field/กติกาย่อยนอกคำตอบยังไม่ถือว่าอนุมัติทั้งหมด และยังไม่ได้ implement


## สถานะและขอบเขตหลักฐาน
ชุดนี้เป็น **full-system source-grounded design proposal** ไม่ใช่การอนุมัติเพิ่มscope ไม่ใช่implementation ไม่ใช่ผลruntimePASS. อ่านrepo `Windows staging audit baseline 94282b6` ที่ HEAD `94282b6`; documentsเขียนเฉพาะdirectoryภายนอก `FridayManagement-product-design`. ไม่มีapplicationcodechange/commit/push/deploy/VPS/live-data. ไม่spawnagents

SourceinventoryมาจากApp/navigation/37non-testTSXภายใต้frontend/srcรวมshared และTSschemas/services/OpenAPIที่เกี่ยวข้อง; `../audit/README.md` เดิมเป็นcandidateเท่านั้น ไม่ใช่authoritative. `../audit/README.md` บันทึกfiles/linecounts/hash, sourcecontractledgerเสริมdefinition. Chapter01proposalเดิมในrepoเป็นunapprovedcontext ไม่ใช่ข้อผูกพันใหม่

**หลักฐานสองแกน:** (1) actualsourcefields/branches มีfile:line (2) normativeUXและnewdomainrecommendationsเป็นproposed. รอบนี้ไม่ได้เปิดapp/ถ่ายscreenshot/browserconsole/network/รันtestหรือmigration. PreviousQAในscratchมีหลายgenerationรวมreportที่BLOCKEDและreportภายหลัง; ไม่รวบPASSจากไฟล์เก่า ไม่กล่าวว่าภาพถูกตรวจใหม่. Designacceptancetestsข้างล่างเป็นfuturecriteriaไม่testresults

### อ่านตามลำดับ
1. [01 Projects](01-projects.md): projectdirectory/create/edit/archive/access/overview
2. [02 Tasks](02-tasks.md): main table/MyWork/details/checklist/comments/files/activity/sharedpopups
3. [03 Planning/reporting](03-planning-reporting.md): Kanban/Calendar/Gantt/Reports/workload + NEWdomains
4. [04 Collaboration](04-workspace-collaboration.md): Home/navigation/notifications/Teams/Docs/Files
5. [05 Admin/access](05-admin-access.md): Users/titles/permissions/registration/auth/setup/settings/Trash/PWA

## วิธีใช้ dictionary
- **E existing**: พบUI/contract/sourceจริง; **R derived**: query/systemgenerated ไม่ใช่input; **P proposed**: newmodel/behaviorยังไม่approved; **O optional**: stageoptionalไม่ใช่“ไม่มีประโยชน์”; **X excluded/deferred**: ไม่ใส่โดยไม่มีscopeapproval
- `required create` หมายถึงก่อนpersistrecordแรก; `required Active/Doing/accept` เป็นข้อเสนอเท่านั้น; legacyไม่invalidย้อนหลังเพราะmigration
- Sharedtableแต่ละrowระบุpurpose/control/options/example/helper/stage/default/limits/rights/storage/report. Surfaceในchapterอ้างfieldfamilyนี้และระบุUXexceptions; ไม่duplicatevalidationคนละชุด
- Defaultsที่ไม่มีsourceชัดใช้“ไม่กำหนด/ว่าง/null” ไม่เดาค่าวัน/คน. Limitทั่วไปstringในOpenAPIมี`x-utf16MaxLength`; passwordpolicyนับUnicodecodepoints. อย่าแปลงทุกlimitเป็นgraphemecountโดยเงียบ; acceptanceต้องทดสอบThai/emoji/IMEและข้อความhelperตรงserver

## Access/source/storage ownership — ใช้กับทุก field
| Family | ผู้รับผิดชอบข้อมูล/สิทธิ์อ่าน-แก้ | Source/storageจริงและreportuse |
|---|---|---|
| P project | admin/owner-teamlead; UIeditปัจจุบันสองกลุ่มนี้; serviceP-01managerบางmetadata; viewerreadตามprojectscope | `workspace-api.ts:29–45`; `Workspaces.tsx:869–900`; `src/services/workspaces.ts:476–535` → projects; ownerimmutable. List/headers/reportgrouping |
| T task | projectwriterอ่าน/แก้ตามserver, viewerread; deleteowncreatorหรือP-04/adminleadตามpolicy ไม่allwriters | `task-api.ts:16–56`; `TaskEditor.tsx:268–282`; `src/services/tasks.ts:556,630–705` → tasks/task_assignees/board_positions/recurrence_events/task_events. Views/reports/overdue |
| C checklist | projectwriter; parentDone/dirty/versiongates; noindependentaccess | `task-api.ts:58–71`; `tasks.ts:1420–1494` → subtasks/task_events. Checklistgate/countsnotcapacity |
| M membership/team | teamdetailadminonly; projectmemberreadscoped; admin/lead+P-03managereditor/viewerchangesonly | `workspace-api.ts:6–28,73–89`; `workspaces.ts:308,386–409,597–609` → teams/team_members/project_members/projects.version. Eligibility/accessnotbusinessaccountability |
| F attachments/projectfiles | scopedread; writeupload; delete/restoreownorP-06 andservercapabilityflags/retention | `collaboration-api.ts:20–33`; `ProjectFiles.tsx:12–39`; `files.ts:188–236,535–562` → attachments/project_files/storage_quota/reservations/cleanup. Evidence/Docrefs, notacceptanceautomatically |
| Doc | scopedread; writeredit; ownorP-05delete/restore; serverflags | `ProjectDocs.tsx:12–47`; `docs.ts:55–126,187–237` → project_docs andversionrecords; brief/history/searchcontextnotformalapprovals |
| A users/titles/permissions | adminwrite/scopedread, selfprofilelimitedreadonly; publicsignupminimalidentityinput | `api.ts:20–69`; `Users.tsx:418–475`; `admin-api.ts:7–47`; servicesaccounts/job-titles/permissions/registrations → users/job_titles/user_permissions/registrations/admin_events. Reportsusejobtitlelabelnotpermission |
| O organization | authenticatedreadonly; adminpatch | `organization-api.ts:2–14`; `Organization.tsx:86–128`; `organization.ts:55–64` → organizations. Name/thresholdonlynotcapacitycalendar |
| U preferences/favorites | own-userread/write; serverprojectscope | `preferences.ts:6–23,46–55`; servicespreferences.ts:65–66/favorites.ts:76 → user_preferences JSON/user_favorites. Presentationonlynobusinessmetrics |
| Q/R/W/H/N queries/outputs | serveraccessscopedreadonlyexceptnotificationreadmutation | task-list/report-api/insights-api/overview-schema; reports/insights/notification-center services. FilterslocalURLquery; metricsderivednotuserentered; notificationread_atpersisted |

อ่าน `frontend/src/` prefixสำหรับTS/TSXชื่อย่อในtables; `src/services/` สำหรับservice. DBnamesเป็นlogicalstorageไม่แปลว่าผู้ใช้เลือกSQLite/Postgres/SQLServerจากUI. Providercompatibilityต้องทดสอบแยก ไม่รับรองจากเอกสาร

## Existing project field dictionary
| ID / status | Purpose / control + example/helper | Required stage / default / validation | Read/edit / source / downstream |
|---|---|---|---|
| P.name E | ชื่อdeliverable; text “Pilot booking” | create/edit nonblank trim≤100; defaultempty; nouniquenessinvented | P rights; Workspaces:983–990/workspace-api:34; projects.name; list/search/header |
| P.description E/O | context/background; textarea “ทดลองสองสาขา”; ไม่ใช่acceptance | optional≤2000, defaultempty | P rights; Workspaces:1022–1029; projects.description; overview/card |
| P.owner_team E | accountableaccessboundary; singleeligibleteampicker | requiredcreate, defaultblank; activeeligibleadmin/leadpicker; immutableedit | Workspaces:1039–1061,836; projects.owner_team_id; access/reportownerteam |
| P.type E/O | classification dropdown, e.g internal | blank/internal/client/operations/other; createUIinternal; allowblank | Workspaces:809–814,993–1001; domain/project-metadata.ts:1–12; projects.project_type; filtersfuture—notpermissions |
| P.category E/O | classification e.g development | blank/development/general/it/marketing/finance/hr/other; UIdevelopment | Workspaces:1003–1019; projects.project_category; grouping—notworkflow |
| P.archive E | reversiblevisibility/read-only; confirmnottextfield | archivedbooleanintent+version; timestampserver/null | Workspaces:871–872,974–980; projects.archived_at; listexclusion—notCompleted |
| P.system R | id/code/creator/timestamps/version/effective_access | systemreadonly; codesnullable≤16; IDs1..2147483647; versionpositive | workspace-api:31–44; projects/accessquery; links/audit. Do notaskusertotypecode |
| P.metrics R | taskcounts/statusratio/date-span/teamaccessleads | noinput/defaultunknownbeforefetch; zeroonlyconfirmedempty | Workspaces:39–79; insights-api:44–95; insights.ts:218–239; noDBcommitmentstored; reportexecutiononly |

## Existing task/checklist fields
| ID / status | Purpose/control/options/example/helper | Required/default/validation | Read/edit/source/storage/report |
|---|---|---|---|
| T.project E | parentprojectcontextreadonlyonedit | requiredcreateproject_id; noprojecttransferUI | TaskEditor:357–359; tasks.project_id; scoping |
| T.title E | actionableoutcome;text “Confirm cancellation flow” | requirednonblanktrim≤200; emptycreate | TaskEditor:721–729; tasks.title; allviews/search |
| T.description E/O | context/details; textarea | ≤10000; empty; noHTMLrichtextcontract | TaskEditor:730–739; tasks.description; details/search |
| T.category E/O | lightweighttag; existingprojectcategoriesselect ornewtext | ≤80trim; empty; suggestionsonlyfirst100taskssource | TaskEditor:87–104,798–840; tasks.category; filter/CSV; notissuetype |
| T.group E/O | organization; singleprojectgrouporTasks(ungrouped) | nullorinitialgroup; currentprojectreferenceonly | TaskEditor:740–756; tasks.group_id; grouping/order—notmilestone |
| T.assignees E/O | collaborators; multipersonpicker e.g Nida+Som | ≤100uniqueeligibleIDs; emptycreate; noauto-grant | TaskEditor:757–774; task-api:29–38; task_assignees +legacyassignee_id; workloadduplicationexplicit |
| T.status E | progress; picker Not started/Working on it/In review/Done | enumtodo/doing/review/done; createtodolocked; Doneallchecklistcomplete; reopenallowedpolicy | TaskEditor:789–797; tasks.ts:505–550; tasks.status/completed_at; ratiosnotacceptance |
| T.priority E | relativeimportance; Low/Medium/High/Urgent | enumlow/medium/high/urgent; mediumdefault | TaskEditor:775–788; tasks.priority; filtering/order; notSLA |
| T.start E/O | scheduledstart; date-onlycontrol | null; validYYYY-MM-DD, start≤duewhenboth; pastallowed | TaskEditor:842–847; tasks.start_date; Gantt/workload; noteffort |
| T.due E/O | End Plan/deadline; date-only | nullnormally; requiredrecurrence≠none; validdate, paircheck | TaskEditor:848–854; tasks.due_date; calendar/overdue/CSV; notprojecttarget |
| T.recurrence E/O | repeateddelivery; none/daily/weekly/monthlyselect | none; requiresdue; monthlyanchorresetwhenchangingdue | TaskEditor:855–874; tasks.recurrence +recurrence_events; successoronDoneonly |
| T.system R | task_no/id/creator/version/times/completed/deleted/anchor/predecessor/successor/subtaskcounts/overdue | readonlyserver; task_no nullable≤32; timestampUTC; datecomparisonBangkok | task-api:39–55; tasks/task_events; links/history/retention. RecurrenceedgeNOTdependency |
| G.name E | humanworkgroup; text “Pilot” | requiredtrim≤100; blankdefault | TaskWorkspace:1547–1583; task-api:127–138; project_groups.name; presentation |
| G.color E/O | groupvisualaid; colorpicker+proposedhextext | #RRGGBB; #579bfcdefault | TaskWorkspace:297–301; tasks.ts:1193–1242; project_groups.color; notstatus |
| G.system R | position/version/id | readonly; positioninteger≥0 | task-api:127–138; project_groups; ordering. Current contract `/api/projects/{id}/groups` GET/POST และ `/api/groups/{id}` PATCH เท่านั้น; ไม่พบ DELETE operation. Catalog P-02 กล่าว remove แต่ห้ามตีความว่า delete-group capability implemented |
| C.title E | checkliststep; rowtext “Review cancellation” | requiredtrim≤200 | TaskEditor:1100–1107,969–975; subtasks.title; Donegate |
| C.owner E/O | stepresponsibility; singleeligibleperson | nullcreate; ≤1; parentprojecteligible | TaskEditor:1015–1037; subtasks.assignee_id; nottasklead |
| C.done E | binarycompletion; checkbox/To do-Donepicker | falsecreate; doneparentreopenbeforeadd/uncheck | TaskEditor:954–965,1040–1050; subtasks.done; parentgate/counts |
| C.remark E/O | stepevidence/context; textarea “Checked by branch” | ≤2000; empty | TaskEditor:1053–1078,1148–1157; subtasks.remark; checklistdetail/historynotformalprojectacceptance |
| C.versions R | childversion+task_versionoptimisticguard | requiredmutationserverread; notuserinput | TaskEditor:443–459; subtasks/taskversions; concurrencyaudit |

## Shared collaboration/content fields
| ID / status | Purpose/control/options/example/helper | Required/default/validation | Rights/source/storage/downstream |
|---|---|---|---|
| Comment.body E | discussionplaintextarea “@Nida ตรวจแล้ว” | requirednonblank≤5000; empty; mentiontokenvalidation | TaskCollaboration:301–318,429–489; collaboration-api:17–19; comments.body; inwebnotificationnotemail |
| Comment.mention E/O | scopedpeopleautocompleteatcaret | optional; tokenidentitynotdisplaynamematchalone | TaskCollaboration:258–298,461–479; mentions.ts; encodedbody/refnotification; noaccessgrant |
| Comment.system R | author/id/time | readonlyserver | collaboration-api:17–19; comments; history; noedit/deleteUIpresent |
| F.binary E | deliverableevidence; onefilechooser | 1byte..10485760bytes(10MiB); extensionsjpg/jpeg/png/webp/pdf/txt/csv/docx/xlsx/pptx/zip; filename≤200; contentschecked | TaskCollaboration:566–580; ProjectFiles:259–271; files.ts/file-validation.ts; binary+metadata; noexternalpaidstorage |
| F.metadata R | name/bytes/validated_type/sha256/uploader/time/source/tasktitle | serverread; digest64lowerhex; composite(source,id) | collaboration-api:20–33; ProjectFiles:12–39; attachments/project_files; Docrefs/download/forensicsnotviruscleanclaim |
| F.lifecycle R/E-action | deleted_at/can_delete/can_restore; delete/restoreaction | serverretention30days; deletedbytesstillcountuntilcleanup | files.ts:188–236; permissionsown/P-06; quota/storage/reportdon'tmanuallyeditcapability |
| Doc.title E | documentlabel;text “Pilot brief” | requiredtrim≤200; sourcecreateUntitleddoc | ProjectDocs:15,169–188,321–328; project_docs; resources |
| Doc.body E/O | richcontenteditable; headings/list/code/quote/table/checklist/image/link | HTML≤1000000UTF16, sanitizedtext≤200000; default<p></p>; serverallowlist | ProjectDocs:22–28,393–452; docs.ts:107–126; project_docs/versionrecords; briefnotformalacceptance |
| Doc.link E/O | existingnativepromptURL; proposedURLdialog | optionalinsert,https/mailtosupportedbycopy; sanitizerfinalauthority; nojavascript/data | ProjectDocs:430–435; storedinHTMLnotnewfield; resources |
| Doc.image E/O | pickexistingactiveprojectimage | first100currently; sameprojectAPIpath; alttextproposedoptional | ProjectDocs:48–65,225–260,456–470; HTMLrefexistingF; imagepickerdoesnotuploadorgwidefiles |
| Doc.system R | authors/times/deleted/version/text_length/can_*; historyversions/title/editor/time | readonly; list/history≤1000; nohistoryrestoreUI | ProjectDocs:12–47,473–484; docs.ts:84–104; versionprovenance |
| Activity R | taskaction/fieldbeforeafter/actor/time/requestID | readonlynoinput; page10; Systemactornullallowed | TaskCollaboration:27–66,616–644; collaboration-api:35–94; task_events—notsecuritycertification |

## Identity/team/admin/settings field dictionary
| ID / status | Purpose/control/options/example/helper | Required/default/validation | Source/rights/storage/report |
|---|---|---|---|
| M.team.name E | teamidentity;text “Delivery team” | requiredtrim≤100; empty | Workspaces:983–990; teams; Adminedit; headers/accesscontext |
| M.team.description E/O | teamcontext;textarea | ≤1000; empty | Workspaces:1022–1029; teams.description; teaminfo |
| M.user E | selectedactiveuser/directorysearch | requiredmembershipadd, q≤100/page10; initialteam≤100unique | Workspaces:1434–1507; InitialTeamMembers:6–107; team_members/project_members; assignmenteligibility |
| M.position E | businessposition;PM/Lead/Devselect | pm/lead/dev; devdefault; notpermission | Workspaces:1517–1525; workspace-api:19–20; team_members.team_position; teamresponsibility |
| M.team_access E | authority;Member/Leadselect | member/lead; memberdefault; Adminonly | Workspaces:1527–1543; team_members.team_role; accesssummary |
| M.project_access E | explicitprojectrole;Viewer/Editor/Manager | viewerdefault; P-03managercannotappointmanager; managerneeds≥1P-01..07 | Workspaces:1534–1539,1121–1128; project_members.access; effectiveaccessderived |
| M.effective R | actualaccess/active/jobtitle/membership_version | readonlyquery; noimplicitroleupgrades | workspace-api:73–89; effectiveRole/domainpermissions.ts:18–35; UXexplainexplicitvsinherited |
| A.username E | loginidentifier;text “nida.dev” | create1–60patternA-Za-z0-9._-; immutableedit; emailregistrationgeneratedIDdistinct | Users:530–539/auth-policy:14–18; users.username; profile/accessnotmetric |
| A.name E | displayidentity;text “นิด้า” | create/edit1–100trimnonblank | Users:540–545; api:30; users.display_name; comments/pickers/reports |
| A.email E/O | contact/admin; registrationloginemail | adminoptionalblankorvalidemail≤254; publicsignuprequired; **notverifiedownership** | Users:546–554/Register:112–120; users/registrations; signinnotemailchannel |
| A.telephone E/O | contact; telinput “+66 2...” | ≤40; regex0-9+().space#/-; blankdefault | Users:555–562,418–444; users.telephone; PIIadmincontextnotworkloadreport |
| A.org_role E | securityrole;Member/Adminselect | memberdefaultcreate; serverlastactiveadmin/selfguard | Users:563–568; users.org_role; accessnotjobtitle |
| A.team_add E/O | addoneexistingteamasDev | blankNo team/Keep currentteams; doesnotreplacecurrentmemberships | Users:583–595; team_members; noimplicitLeadaccess |
| A.job_title E/O | peoplelabelsingleselect | editonlynullable; activechoices+currentinactive | Users:598–620; users.job_title_id/job_titles; workload/reportgroupingnotpermission |
| A.active E-action | activate/deactivateconfirmation | bool+version; existingaccountvalue; registrationreviewseparate | Users:451,475; users.active/sessions/accesscleanup; historicalnamesretained |
| A.temp_password E-secret | credentialnew-passwordinput | requiredcreate/reset6–128codepoints; noautovalue | Users:627–636; auth-policy:8–13; hashonlysecurity/passwords; neverreports/logs |
| A.admin_password E-secret | reauthenticateactorforreset | requiredreset1–128codepoints; blank/no persistence | Users:638–644; passwordhashchecknotplaintextstorage; noreport |
| A.title.name E | cataloglabel “Project Manager” | required1–50; blankdefault | AdminCenter:214–220; job_titles.name; pickers/reports |
| A.title.color E | labelaid;color | hex#RRGGBB/default#579bfc | AdminCenter:221–227; job_titles.color; noaccessmeaning |
| A.title.order E | displayorder;number | int0..10000/default0 | AdminCenter:228–236; job_titles.sort_order; orderingonly |
| A.title.active E | availablenewassignment;checkboxedit | defaulttrue; inactiveexistinglabelsretained | AdminCenter:238–240; job_titles.is_active; historicreportdisplay |
| A.permissions E | explicitsetP-01..10; perpersoncheckbox/matrixpreset | noneautomatic; versionrequired; max10unique; selfrowblocked; reviewdeltas | AdminCenter:278–624; admin-api:22–47; user_permissions; permissionsarenotprojectmembership |
| A.registration R/action | statuspending/approved/rejected +reviewdecision | listdefaultpending; approve/rejectversion+key; noautoteam | Registrations:18–30,139–203; registrations/users; accountactivationaudit |
| Auth.identifier E | usernameORemail;text | required; usernamepatternorvalidemail≤254; blank | Auth:84–93/auth-policy:24–26; sessions/accountlookup; notstoredinlogsascredential |
| Auth.current E-secret | currentpassword | required1–128codepoints; no trim | Auth:211–218; requestonlypasswordcheck; noUIstorage |
| Auth.new E-secret | newpassword | required6–128codepoints | Auth:219–227; hashserver; noreport |
| Auth.confirm E-local | preventtypo | requiredmatchesnew; notDBfield/notpasswordAPIpayloadextra | Auth:228–234/auth-policy:27–33; transientonly |
| Setup.token E-secret | bootstrapauthorization | required32–128trimfrominstaller; clearedbeforesend | Setup:88–98/setup-policy:4–8; installer/setupserver; noreport/log |
| Setup.organization E | initialorgname | requirednonblank≤100 | Setup:99–108; organizations; header |
| Setup.username/name/password E | initialadminidentity | username1–60pattern/name1–100trim/password6–128codepoints | Setup:109–140/setup-policy:14–29; users/hash; noautosecondadmin |
| O.name E | organizationlabel | requiredtrim≤100; loadedcurrentdefault | Organization:179–188; organizations; navigationonly |
| O.threshold E | task-countalertperweek;number | int1..1000/serverdefault10; overmeans>not≥ | Organization:189–201; organizations.workload_threshold; workloadnotutilization |
| O.timezone R | datecalendarsemantics | literalAsia/Bangkokreadonly | organization-api:8; noTimezonepickerapproved |
| U.reduce_motion E | checkboxReduceanimations | falsepersisteddefault; honorssystemwhereimplemented | MotionSettings:29–39; user_preferences; presentationonly |
| U.confetti E | checkboxCelebrateDone | truepersisteddefault; reducedmotionoverridesactualeffect | MotionSettings:40–49; user_preferences; noachievementmetric |
| U.column_widths E | drag/keyresize | saved60..800; default{}; sourceDataTableresizermin48diffmustnormalize | TaskWorkspace:198–218/sharedcomponents:114–168; user_preferences; noprojectwidechange |
| U.hidden_tabs E-contract/X-UI | arraykanban/calendar/gantt/docs/files/workload/overview | default[], max7; **noactualsettingsUI** | preferences:11–22; presentationnotgrant; deferredcontrol |
| U.favorite E | peruserstarproject | boolrelationship, noautomaticstar | TaskWorkspace:622–638; user_favorites; navigationonly |
| U.visibility/local R/UI | showpassword/openmenu/collapse/range/page/selection/dirty/review/pending | defaultfromcaller; neverbusinesspersistunlessUcontractexplicit | sourcechapteranchors; noDBrecord/noreport; notsecurityauthority |

## Queries / derived outputs — all views share definitions
| Family | Existing controls/derivedvalues and defaults | Validation/reportuse/authority |
|---|---|---|
| Q.task | q100/team/project/assignee/null/category80/duefrom-to/has_due/statusmulti/prioritymulti/sort/duegroup/completed_from; projectgroup_orderelse due_asc | `task-list.ts:4–77`; scopedserverquery; impossibleintersectionemptyneverbroaden; requirednone; localUI/URLnotrecord; nosecretquery |
| Q.board | q/assignee/prioritysingle/category/duefrom-to/statussingle; allblank | `Kanban.tsx:50–58,556–638`; filteredreorderdisabled; notsamefilterUXasQ.taskuntilsharedPR |
| Q.files/docs | Filesq100/typeimage/pdf/document/other/sourceproject/task/both/IncludeDeletedfalse/page25; DocsShowtrashfalse | `ProjectFiles:62–114,202–252`; ProjectDocs:95–106,273–305; noopentrashgrantfromfilter |
| Q.admin | Usersq100/activeall/titleblank/page10; registrationstatuspending/page20; matrixteam/titleblank/selectedempty | `Users:36–48`, `Registrations:18–30`, `AdminCenter:278–292`; readrightsnotUIfiltersecurity |
| R.filters | team/project/assignee/null/jobtitle/date_basiscreated/due/completed/from/to; defaultdue/currentBangkokmonth | `report-api:68–95`; nofieldrequiredquery, invalidrangeexplain; preserveexactfiltersonexport/drilldownproposal |
| R.metrics | metadata/bangkoktimezone/generated_at,total/by_status/overdue/unassigned/done_in_period/completion_percentage/workload | `report-api:34–66`; derivednotmanuallystored; completioncurrentDone/totalnotdelivery; zeroemptyratioexplained |
| W.weekly | scopeproject/team/fromweeks6; threshold/user/jobtitle/counts/overdue/no_date/taskrefs/truncated | `insights-api:8–42,98–113`; overlapMondayweek; no_date=neitherstartnordue; duplicatesacrossassignees/weeks; capped5000tasksand1000rowtasks; nohoursclaim |
| H.overview | selfscopestatus/due/Done7days/byproject/nextup | `MyOverview:62–222`, overview-schema; task-derivedreadonly; noorgperformancerank |
| N.notification | typeassignment/comment/status/access_cleanup/due_tomorrow/due_today/overdue; message≤500; read_at/created_at/task_id/unread_count; onlyunreadfalse; centerpage50/popover5 | `report-api:7–32`; currentaccesschecked; markreadisusermutation; noexternalemail/push; timestampreadonlynotinput |
| Q.batch | operationpatch/delete; selected{id,version}1..100; patchstatus/group; schemaalsoassignee_idsbutUItoolbaronlystatus/group | `TaskWorkspace:47–70,256–296,1069–1151`; partialoutcomesperitem; successesnotretry; nopermanentdelete; typedquerynotfreeJSONeditor |
| Q.dateviews | calendarselectedmonth/defaulttodaymonth, Ganttscale/fromfit/page50, calendarlistpage50 | `TaskViews:6–49,80–401`; alllistpagesbeforecompleteness; date-onlynotprojectcommitment; noextraDBfield |
| Q.history/trash | comments/files/eventspage10, serverrestore_before/deleted_at; taskTrashpage20 | `TaskCollaboration:136–153`, Trash:21–28; servertimeauthority; globalTrashnotfiles/docs; noinputreasonadded |

## Proposed delivery fields — not in current schema
ทุกNEWfieldด้านล่างต้องnullableadditivemigration/contracts/serveraudit/accessrules/versionedmutation/reportdefinitionก่อนUI; storageชื่อต่อไปนี้เป็น**proposedlogicaltables**ไม่ใช่พบแล้ว. Exampleมีไว้helperไม่defaultdata

| ID | Purpose/control/example/helper | Stage/default/validation | Ownership/storage/reportuse |
|---|---|---|---|
| D.objective P | textarea “สาขาทดลองใช้ระบบจองได้” | optionalDraft, requiredActivefinite; max2000; null | proposedsamemetadataauthorityP01; projectsnewcolumn; brief/readiness |
| D.lead P | singleeligibleactiveprojectwriter; “ผู้ตามหลัก ไม่ให้สิทธิ์เพิ่ม” | optionalDraft/requiredActive; null; revalidateeligibility; noauto-firstteamlead | projects.accountable_lead_id; businessaccountability; lostaccessattentionnotblocksecurity |
| D.planned_start P | date-onlyprojectplan | optionalDraft/requiredActivefinite; null; validdate≤target | projectsnewdate; comparecommitmentvstaskspan—notautomaticcopy |
| D.target P | date-onlydeliverycommitment | optionalDraft/requiredActivefinite; null; pastwarning; activechangereason2000 | projectsnewdate+changeevents; portfolio/drift; nottaskdue |
| D.acceptance P | textareaobservablecriteria “สาขายืนยันจอง/แก้ไข/ยกเลิกได้” | optionalDraft/requiredActive; max4000; null; notjust100%Done | projectsnewtext; deliveryreadiness/closure |
| D.in_scope/out_scope P/O | separatetextareas “ทดลองสองสาขา / ไม่รวมชำระเงิน” | optionalallcreation; max4000each/null | projectbriefnewcolumns; changereviewcontext; notmandatorysmallproject |
| D.approver P/O | intendedacceptoroneexistingactiveprojectmember | optional/null; norealapprovalworkflowimplied | projectsref; responsibilityonly; D02decidesclosureauthority |
| D.lifecycle P | Draft/Planning/Active/On hold/Completed/Cancelled | newDraft; legacynot-reviewedmarker, **nomassmappingapproved**; transitionserverrule; reasonhold/cancel/reopen≤2000 | projectlifecycle+events; portfolio/acceptance; archiveindependent |
| D.health P | Not assessed/On track/At risk/Off trackselect+rationale2000/next_action2000/actor/time | defaultNotassessed; reasonrequiredassessment; stalesevendaysproposed; neverderivefromDone | healthhistory; managementattentionnotsecuritygrade |
| D.actual_delivery/evidence P | date + acceptedoutcome4000 + scopedDoc/file/URLreference | requiredCompleteproposal; futuredateinvalidunlessbusinesspolicyexplicit; acceptanceactorserver; open-taskhandlingrequired | acceptanceevents; accepteddeliverynotcurrentDone; URLsafevalidated |
| D.review_date P | nextreviewforoperations/hold | optionalDraft, ActiveoperationsrequirementD01pending; nullvaliddate | projectsnewreviewdate; recurringattentionnotfakeenddate |
| D.task_acceptance P/O | taskcriteria4000 +optionalcompletionevidenceref | optionalcreate; beforeDoneonlyifteamapprovedpolicy; null | tasksnewmetadata/event; checkliststillseparategate |
| D.task_primary_owner P | singleeligiblepersonwhilekeepingassignee_ids | optionalcreate/proposedDoingrequired; nulllegacy; nofirstarrayguess | tasksnewref; accountability; noautomaticgrant/removecollaborators |
| D.milestone P | title200/owner/target/criteria4000/status/acceptedactor-time-evidence; linkedtaskIDs | titlecreate; commitmentneedsowner/date; acceptneedscriteria/evidence; defaultsplanned/null | NEWdelivery_milestones; projectmanagementauthorityproposed; nextcheckpoint/late/acceptednotgroup |
| D.risk_issue_blocker P | type/title200/description4000/owner/status/impact/likelihoodriskonly/nextaction2000/reviewdate/affectedrefs/resolution2000 | title/typecreate; triagerequireowner/action; noimplicitlowrisk; resolveevidence; open/untriaged | NEWdelivery_items; D07authoritypending; aging/blockersnotstatusenumchange |
| D.change P | summary200/reason2000/typedbeforeafter/impacttexts2000/decision-owner/status/reason/actor-time | draftdefault; reviewneedsdecider; decisionreasonrequired; applyatomicversion | NEWdelivery_changes; D08audit-firstrecommendation; scope/targetdriftnotbaselinebackfill |
| D.estimate P/O | taskestimate_minutes integer; e.g240, “ประมาณการ effort ไม่ช่วงปฏิทิน” | nullunknown; positive≤60000proposed; nonrequiredcreate; nozerosubstituteforunknown | tasknewcolumn; capacityloadnotelapsedtime; nopaidtime-tracker |
| D.capacity P/O | personweekcapacity_minutes +availabilitynote200 | nullunknown; proposedinteger0..10080minutes/week (physicalceiling ไม่ใช่แนะนำเวลางาน); no40hautomatic; parttime/leaveexplicit | NEWcapacity_weeks; D06teamauthoritypending; utilizationonlyknownminuteswithcoveragecaveat |
| D.delivery_mode P | single-select finite/ongoing เพื่อเลือก readiness rule ไม่ใช้ categoryเดา | proposed newcreate finite; legacy null/unreviewed; requiredก่อนActive; ongoingต้องreviewdateแทนfakeend | projectsnewenum; metadataauthorityตามD01; finitecommitmentreportแยกongoingreview |
| D.link_dialog P/O | optionaldisplaytext≤200, URL≤2000; defaultselectedtextorblank | URLrequiredonlyInsert, https/mailto safeallowlist, cancelไม่มีmutation | HTMLcontentonly, writerDocrights; noexternalfetch; link/resources |
| D.image_alt P/O | imagealttext≤500; helperอธิบายภาพแทนfilename | optionalinsert; decorativeimageemptyaltได้โดยexplicitchoice | sanitizedHTMLattribute; Docwriter; accessibilitynotreportmetric |
| D.remaining_estimate X | ไม่เพิ่มremaining_minutesในinitialestimatePR | deferreduntilD06confirmsneed/updatecadence; nofakecomputedremaining | notexistingfield; notcountedimplemented; avoiddoubleefforttruth |
| D.dependency P | predecessor/successor sameproject+lag_days0..365/reason1000optional | no-self/no-cycle/unique; lag0; warning-onlyinitial; norecurrenceedgeconfusion | NEWtask_dependencies; writepolicyexplicit; blockattentionnotauto-reschedule/criticalpath |

### Excluded/deferred X — ไม่มีsilent scope reversal
Requirements `TeamFlow_Requirements_v1.0.md:174–181` จงใจยกdependencies/time-tracking/customworkflow/customfields/multiorg/externalchannels/SSO/native/offlineediting/real-timecoedit/automation/criticalpath/autoschedulingออก. Sourceมีregistrationaddendumimplementationแล้วแม้baselineบอกselfsignupnotincluded; ถือcurrentcode/contractเป็นexistingและบันทึกhistoricalsemantics ไม่ลบfeatureตามbaselineเก่า. NewD.dependencyต้อง**scope-changeapproval**แม้designอธิบายละเอียด. Budget/cost/CRM/externalcustomerportal/sprints/epics/storypoints/velocity/WIP/paidintegrationsไม่addโดยนัย

## Decision register — recommendationไม่เท่ากับapproval
| ID | ต้องตัดสินใจ / recommended default | Decision owner / legacy-migration consequence |
|---|---|---|
| D01 | finitevsongoingoperations: explicitdelivery_modefinite/ongoingproposed ไม่เดาจากtype/category; finiteActiveusesstart/target, ongoingusesreviewdate | productowner+deliverylead; legacyunreviewed/null untilreview; nofakecommitments |
| D02 | whocanacceptdelivery: initialexistingprojectmanagementauthorityrecordsconfirmation; optionalintendedapproverinformational; nomultistepworkflow | productowner+securityowner; chooseauthoritybeforeCompleteenabled; existing100%Done≠accepted |
| D03 | leadrevocation: securitywins; allowremove/deactivateimmediatelythenflagneedsreplacement; do notblockrevocation | securityowner+deliverylead; historicalactorrefsretain, currentleadnullable; auditchange |
| D04 | multiassigneesremaincollaborators; addprimaryownerexplicitlynotarrayfirst; Doingreadinessadvisoryfirstbeforehardgate | teamleads+productowner; nolegacyassignmentloss; completedhistorypreserved |
| D05 | milestonesandwarning-onlysameprojectdependenciesseparateapproval; noauto-datepropagation/criticalpath | productowner; nullable/emptyrelationships; currentgroups/datebarsunchanged |
| D06 | estimateunitminutes; capacityoptionalunknown; primaryownerallocationfirst; notimeclock/performance | deliverylead+teamleads; nullnot0; noautomatic40h; nohistoricalutilizationfabrication |
| D07 | risk/blockerstructuredrecords; projectwriterspropose, ownertriages, managementaccepts-risk | product+securityownersmustapproveexactaccessmatrix; noP-XXgrantassumption; nolegacycommentparsing |
| D08 | audit-firsttarget/scopechangereason; formalchangeapprovaldeferredunlessownerneedsit | productowner+deliverylead; baselinecreatedonlywhenexplicitlycommitted, neverfromtaskspan |
| D09 | UI/APIparity: P-08projectcreate/P-01edit/P-02groups/P-03membership/P-04TrashaccessmaydifferUI; auditmatrixthenexposeexistingrights, nochangegrant | securityowner; testsbeforeUIexposure; noautotickPMpreset/newpermissions |
| D10 | title-firstDoccreate/dirtyguards/accessiblemodalfocus/optimisticackfeedbackrecommended | UXowner+maintainer; noDocapproval/realtimeeditornewscope; nosecretlocalcache |
| D11 | stringsThai/emoji: reflectUTF16limitsvsUnicodepasswordcount; don'tbreakstoreddatawhileimprovinghelpertext | maintainer; migrationsnontruncating; testsboundary/IMEserverconsistent |
| D12 | lifecyclelegacy: newDraft; legacyPlanningorothermappingnotapproved; recommendunreviewedmarkeruntilmanualclassification | productowner; batchmigrationmustneverdeclareexistingdeliveryaccepted/cancelled; archivepreserved |

ยังไม่มีownerdecisionใดถูกแทนด้วย“approved”ในรายงานนี้. สามารถทำUXreliabilityPRได้โดยไม่รอทุกNEWdomain แต่policy/contractchangesต้องresolveก่อนimplementation ไม่ต้องขอroutineapprovalทุกหน้าในงานdesignนี้

## UX01–09 — normative behavior for every surface
**UX01 Read/loading/error/empty:** stablelayout+skeletonaccessiblepolite; longreadshowretry/cancelifmeaningful. Emptydistinguishno-record/no-match/no-permission/loading/error/stale. Neverrenderfailedmetricas0/healthy. Errorinlinepersistent+requestID(nonsecret)+retry; toast2secnotsoleerror. NoAPIreadnecessaryforstatichelp/menucontent; thenloading/empty=notapplicableexplicitly

**UX02 Write/unknown:** disableduplicatepending, keeprecordidentity/projectscope. Successonlyfromauthoritativeserverack/readback, notclick/animation. Lostack→unconfirmed, retainstableidempotencyintentforidenticalpayload; checklatestbeforeduplicatecreate/delete/recurrence. Cancelnetworknotproofservercancelled. Readbackcannotseeobjectafterrevoked=unavailablenot“savedandverified”

**UX03 Offline/reconnect/maintenance:** noofflinequeue/offlineeditapproval. Showlastread/stalebanner, retainonlycurrentauthorizedin-memorydraftwhenpossible; reconnectreauth+refreshcurrentpermissions/readersbeforeenablewrite. Maintenancepersistsserverblock, notUIonly. Staticmenushelpstillusable; destructiveconfirmbuttondisabledwithreason. Serviceworkerstaticcacheไม่proofprivateworkavailableoffline

**UX04 Conflict/unsaved:** versioneverymutation;409showBase/Draft/Latestfielddiff, preserveuserinput, reloadnotblindoverwrite; re-reviewiflatestchangesagain. Close/Escape/backdrop/route/tab/differentDocallhonordirty; Staydefault/Discardexplicit. Menu/pickerlocalchoicecancelไม่discardparent. Rawpasswords/setupsecretsneverdurable. Concurrentrevocationclearsprivatecontentevenifdraftlost; explainpolicy

**UX05 Focus/keyboard:** semanticdialog/listbox/menu/tab/label/aria-describedby; initialfocusfirstintendedfieldorCancel, Tabtrappedonlymodal; Escapepickerfirstthenparent; closingreturnstableopenerID, fallbacknextitem/sectionheadingafterrerender/deletion. CurrentDialogstoresnodecanbedetached—acceptancetestmustcoversuccessmutationnotjustCancel. InlineeditEntercommit/Escapecancel/IMEcompositiondoesnotsubmit. Focusnotmovedbypolling/toast

**UX06 Mobile/responsive:** exercise360/390/768/1440andzoom200%; fullheightformdialogstickyactionssafe-area; nativekeyboard/datepickerfallback; controlsrecommended44pxtarget; nohorizontaloverflowforforms, allowedtable/timelinewithaccessibletextalternative/stickycontext. LongThai/names/emailwrap; filtersassheetproposedonlyifApplysemanticsconsistent; nodrag-onlyactions

**UX07 Permission/privacy:** clientcontrolsnotauthority; revalidateeveryread/mutation/directory/referenceafterrolechange; noautograntsfromassignment/jobtitle/businesslead/type/category. Ownvsothersdelete/servercan_*; explicitvseffectiveclear. Nohiddenprojectnames/counts/files/erroridentifiersleak. Securityrevocationnotblockedbybusinessreadiness. Keepauditserveractor/request/time; nosecretfieldinreport/log/screenshot

**UX08 Validation/content:** requiredstagevisible; labelsnotplaceholder-only, helperpurpose/example/notfakevalue; defaultonlyknown. Nullunknown≠0/notassessed≠healthy/notstarted≠archived. Date-onlyvalidrealcalendar/start≤due/commitmentseparate/Bangkoksemantics; stableIDsneverrepairmalformedtokens. Serverlimitsauthoritative, fieldsummarylinksfirstinvalid; optionalfieldnotmysteriouslyrequired

**UX09 Recovery/confirmation:** routineSave/status/checkboxnoextraAreyousure; confirmdestructive/security/unsavedintentwithidentity+consequence. Cancelinitialfocus. Noaddedfieldforconfirmationunlessgenuinenewbusinessrecordrequiresreason. Partialbatchresultsperitemandcountsacknowledgedonly; errorretainsfaileditemsandnextstep. Refreshretrydoesnotgrantpermission; expiredretentionnotundoablepromise

## Source coverage reconciliation / known gaps
`../audit/surface-inventory.json` เป็นflatarrayมีid/file/line/name/kind/parent/domain/status/document/heading/evidence/notes. Unit=page/tab/dialog/form/menu/control/sharedbehavior ไม่ใช่uniqueURLหรือmodalcount; create/editอาจfile:lineเดียวแต่businessintentต่าง. A28จงใจเป็นPWAupdate-onlybranch **ไม่มีupdatepopup**. R04เป็นstaticassigneebreakdown **drilldownproposed**. T25เป็นnativedatepicker **ไม่sharedCellPopover**. Compositionalmain/Brand/UiIcon/Count/ProjectTasksอยู่manifestไม่fabricatepages

`../audit/README.md` เป็นexplicitmappedsourcecandidateledgerสำหรับDialog/summary/prompt/confirm/tablist/customdialog และfilecoverage; regexไม่ได้พิสูจน์ทุกbooleanconditionalsemanticsหรือruntimeCSS/nativepopup. Fieldpickers/inlineforms/controlsเพิ่มจากmanualsourcechaptersไม่ใช้regexเป็นauthoritativeinventory. Knownactual-UIgaps: tasktableassigneesreadonly; reportbarsnodrilldown; DocsHistorysummaryonlynotrestore; Docimagesfirst100; categorysuggestionsfirst100; sidebarprojectsfirst100; registrationreviewheuristicfirst100perstatus; Preferenceshidden_tabscontractnoUI; P-08/P-01/P-02/P-03/P-04UI/APIparity; noadminauditdashboarddespiteAPI. ไม่บวกช่องว่างเหล่านี้เป็นimplementednewpage

Coveragevalidationอ่านinventorybackfromdisk, dedupeID, verifyทุกfile:lineexists/everyheadingunique+substantivebody, eachcandidateassignedmappedreview, filecount37; totals/chaptersในREADMEและ../audit/README.mdมาจากcode. อัตราcoverageเชิงUXไม่ได้คิดเปอร์เซ็นต์; “mapped/designed”ไม่ได้แปลว่าtested/approved/productionready. หากพบsourcebranchใหม่ให้addentryและdesignก่อนmarkdesigned ไม่ใช้ใกล้lineที่สุดเป็นหลักฐานเอง

## Prioritized coherent roadmap — no implementation yet
| Priority / PR | Scope dependency / acceptance before merge |
|---|---|
| P0 UX foundations (T1/W1/A1) | focusaftermutation/dirtyguard/errorsunknownvszero/readonlyscope/CSVsemantics; noaccesschange. Realbrowserdesktop/mobile+keyboard/networkfailure+409+revocation+sameintent tests |
| P1 deliverymetadata (P1/T2) | resolveD01–04/D12; additivecontracts+migrations+services+UI+audit. Legacyroundtripunmodifieddates/roles/assignments, nullreadinessnotforcedActive, noautogrants |
| P1 lifecycle/health (P2/P3) | explicittransitions/acceptanceauthority/reasons/healthhistory; Done≠Complete/archive, openworkhandling, staleassessment, timezone/providerconcurrency |
| P1 docs/files consistency (W3/W4) | dirtyDocswitchguard/caretrestore/linkvalidation/imagepagination/uploadunknown/quota/compositeIDs; sanitizerandpermissiontests; noformalsign-off/coedit |
| P2 reporting/query parity (R1/R2/T3) | exactqueryscope/countdenominator/partiallimits/filterchips/nativepicker/batchperitemresults/keyboardordering; CSVUTF8BOM/formulas/50000limit/providerreadsnapshot |
| P2 milestones (D1) | approvedD05schema/UI/acceptance/nextcheckpoint; linkedDonecannotautoaccept; noexistinggroupmigration |
| P2 risk/blocker/change (D2/D3) | approvedD07/08authority; structuredtriage/nextaction/changeaudit; securityrevocationwins; noapprovalworkflowsecretlyadded |
| P3 estimates/capacity (D4) | approvedD06units/unknown/allocation; multiassigneenodouble-effort/parttime/leave/PII; noautomatic40horperformancescore |
| P3 warningdependencies (D5) | explicitscopechangefororiginallyexcludedfeature; sameprojectcyclecheck/warning-only/notauto-schedule; recurrenceindependent |
| Separate security/release gate | `src/api/start.ts:30–31` stillthrowsFOUNDATION_NOT_PRODUCTION_READYinproduction. Do notremoveguardfromUXPR. Threatmodel/auth/CSRF/session/CSP/privatecache/providerbackup-restore/ops/UATrequiredseparately; noneexecutedhere |

### Common test matrix for every PR above
Source/contractlint/typecheck/build/frontendunit+serverintegration/provider(SQLite/PostgreSQL/SQLServerasconfigured)runseparatelyandreportactualoutcomes; native/browserQAwithsyntheticisolatedfixturesoutsidecheckoutonlyifauthorized. Fresh&legacydata/Unicodeboundary/no-members/no-tasks/largepagination/readonlyarchived/deactivateduser/permissionrevokemidflight/versionrace/repeatedclick/lostack/offlineflap/maintenance/clockskew/30daycutoff/360pxkeyboardfocus. CountsreconcileinvariantuniqueIDsnotmentallysummed. TestplansherecannotbecomePASSuntilrealexecution

## ข้อสรุปเชิงผลิตภัณฑ์
ระบบมีฐานworkcoordinationจริงกว้าง: หลายproject/team, multiassignees, fixedflow, checklist/recurrence, multipleviews, content/files/notifications, basicreports. สำหรับgeneralinternaldeliveryเสนอเติมoutcome/one-accountability/commitment/acceptanceและreliableUXก่อนใหญ่ขึ้น. สำหรับfullAgilesoftwaredeliveryยังไม่เทียบJiraเรื่องsprint/epic/estimation/velocity/workflow; ไม่ต้องซื้อหรือcloneทั้งsuiteเพื่อแก้ปัญหาทีมเล็ก. Designพร้อมใช้แยกPRหลังbusinessdecisions; **applicationยังไม่ได้รับรองreadyหรือถูกแก้ไข**
