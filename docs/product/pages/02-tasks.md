> **Historical proposal snapshot v1.0 — ไม่ใช่กติกาที่อนุมัติทั้งหมด:** source `94282b6` (Windows staging PR #1), ไม่ใช่ main `4a0b76b`. ข้อความเก่าที่ว่า D01–D12 ยังไม่อนุมัติ / acceptor optional / baseline deferred ถูกแทนด้วย [decisions](../delivery-decisions.md) และ [rules](../delivery-rules.md). รายละเอียดอื่นเป็นข้อเสนอเท่านั้น; ไม่มีผลทดสอบ runtime ใหม่. ดู [provenance](../audit/README.md).

# 02 — Tasks / My Work / shared interactions

> **อัปเดตการตัดสินใจ:** โซยืนยัน D01–D12 แล้ว ดู [คำตอบที่อนุมัติ](../delivery-decisions.md) ซึ่งมีผลเหนือคำแนะนำหรือข้อความ “ยังไม่อนุมัติ” ที่ขัดกันในร่างนี้ โดยเฉพาะผู้ตรวจรับต้องระบุชื่อจริงก่อนเริ่ม และต้องเก็บแผนตั้งต้นเมื่อยืนยันเริ่ม ข้อเสนอ field/กติกาย่อยนอกคำตอบยังไม่ถือว่าอนุมัติทั้งหมด และยังไม่ได้ implement


**Design proposal only; source `94282b6`, ไม่มี runtime test ใหม่.** นิยาม field `T.* C.* F.* M.* U.*` และ UX01–09 อยู่ [00-data-model-and-coverage.md](00-data-model-and-coverage.md). Surface แต่ละรายการใช้ definitionsเหล่านี้รวม required-stage/default/limits/rights/storage ไม่สร้าง fieldคนละความหมายในคนละ view

## หลักการ delivery
Task ต้องตอบ deliverable/owner/next action/date/done evidence. Source รองรับ multi-assignee ไม่ใช่ single owner; **เสนอ** primary accountable task ownerหนึ่งคน optional Draft requiredก่อน Doing โดยยังรักษา assignee_idsเป็น collaborators (D04). ห้าม migrate first assigneeเป็น ownerโดยเดา. Task Doneปัจจุบัน checklist gate ไม่ใช่ delivery accepted; acceptance criteria/task acceptance evidenceเป็น proposed modelแยกจากproject acceptance. Estimates/dependencies/blockerไม่ใช่ capabilitiesปัจจุบัน เพียง recommendationsบท03

## T01 — Project task main table
`TaskWorkspace.tsx:1067–1601`, `task-api.ts:16–56`. คอลัมน์จริง Select/Task+number+category+comment opener/Assignees/Status/Priority/Start Plan/End Plan. Assigneesใน tableเป็น **display ไม่ใช่ inline picker** (`:1387–1391`); เสนอเปิด shared PeoplePickerหลังได้รับอนุมัติ UXไม่ขยายaccess. Business jobคือ scan commitmentsและอัปเดตสถานะเร็ว ไม่แสดงทุก metadataเป็น mandatory column

Groups countsปัจจุบันอาจเฉพาะ page20 ไม่ใช่ทุกงาน; รักษาข้อความ “tasks on this page”. เสนอ total scoped countsจาก serverหากต้องการ. Emptyผลกรองมี clear; permission/archived readonlyเด่น; row save failureต้องไม่ทำให้ rename draftหาย. Sticky title/statusบนdesktop; mobileแสดง card/listและ Edit task ไม่บังคับตาราง7คอลัมน์ให้ย่อจิ๋ว. ไม่เพิ่ม acceptance textareaในทุก row

## T02 — My Work assigned and created
`TaskWorkspace.tsx:719–737,978–1005,1463–1502`; `task-list.ts:20–77`; `task-dates.ts`. View Assigned defaultหรือCreated; due groups overdue/today/future/no-date และ completed filters; Status quick action, details openerร่วม T05. ใช้ `T.* Q.*` ไม่ duplicate tasks/ownership. บอกชัด createdไม่แปลว่าassigned. Read rightsยึด serverแม้ creatorกรองได้; ฝั่ง My Work status UIไม่มี per-row effective accessเท่า project view จึงต้อง handle403อย่างไม่หลอก success

เสนอ next action+blocker badgeเมื่อ modelจริง; ไม่ให้ “urgent”ทุกงานแทนการจัดลำดับ. คืน position/filterหลังปิดeditor. Emptyassignedมี linkโครงการที่เข้าได้ ไม่ grantงาน; no dateเป็น decisionให้จัดscheduleไม่ตี overdue. No added personal deadlineแยกจากEnd Planเพราะสร้างสองtruth

## T03 — Task filters search sorting grouping
`TaskWorkspace.tsx:810–1056`, `task-list.ts:4–77`. Fields `Q.task`: q100; project/teamเฉพาะcross-project; assignee/self/unassigned; category80; due_from/to date; has_due; status/priority multi; my due range; completed_from; sort board/due/created/updated/priority/title; grouping status/groups. Default sort project group_order, otherwise due_asc. Filter stateไม่ใช่business record

เสนอ applied chips+result count+Clear+URL state; no fieldsเพิ่ม. Contradictory datesหรือno-date+has-dateต้องอธิบาย no-match ไม่ silently widen scope (sourceมีempty local). Popupไม่ต้องเพิ่ม approval field; enter Search/clearใช้งานkeyboardได้. Offlineคงfilter/draftแต่บอกresults stale; mobilefull-heightfilter sheet Cancel/Applyหากเปลี่ยนเป็น staged UXต้องไม่混 immediate queryกับapply. Loading debounce300msไม่ล้างcurrentจน flicker; stale responseต้องไม่ทับqueryใหม่

## T04 — Create task details
`TaskEditor.tsx:29–52,337–359,518–524,721–875`. Fieldsจริง `T.title/description/group/assignees/priority/status/category/start/due/recurrence`; titlerequired200; details10000; category80; assignees≤100; prioritymedium; groupinitial/null; datesblank; repeatnone; status todo locked oncreate และcreatepayloadตัดstatusออก. Create onlyprojectwriter/online/writable/notarchived/maintenance. New taskในMy Workไม่มีprojectselectorทั่วไป: sourceNewtaskอยู่projectcontext อย่าอ้างว่ามีcreateข้ามprojectแล้ว

เสนอ keep core title+assignees+dueและprogressive details. Optional acceptance criteria4000, primary owner (D04), estimate (D06)ก่อนDoingเฉพาะทีมเลือกใช้; ไม่ทำทุกfieldrequiredcreate. Helpertitleผลลัพธ์เช่น “สาขาทดลองยืนยันขั้นตอนยกเลิกการจอง”; descriptioncontextไม่ซ้ำacceptance. Validate datesstart≤due, recurringrequiresdue; คงpastdateได้warning. ผู้ไม่มีeligibleassigneeเก็บunassignedได้ไม่grantmember. Idempotentintentเดิมเมื่อpayloadเดิม; unknown resultอย่าresetdraft; aftercreateconfirmationอ่านserverrecordก่อนเชื่อว่าใหม่สำเร็จ. Saveandcloseต้อง focusnewtaskหรือsectionheading

## T05 — Edit and read task details
`TaskEditor.tsx:188–282,329–388,530–709`. ReusefieldsT04; header task_noเดียวกับtable; tab Details/Checklist/Updates/Files/Activity; createยังเปิดchildtabไม่ได้จนpersist. Read-onlyแสดงvalueไม่editable-looking. Fieldscompleted_at/creator/version/generatedlinksเป็นsystemไม่input. Unchangedassignee_idsต้องomitpatchเพื่อรักษาhistoricaldoneassignees (`:348–355`)

เสนอ split persisted vs unsavedstateทุกtab; footerชัดSave detailsไม่ได้postcommentหรือuploadfile. Archive/revocationระหว่างเปิดให้หยุดwriteและล้างข้อมูลที่หมดสิทธิ์; ไม่เก็บdraftลับข้ามaccount. Emptydescriptionไม่ใส่ตัวอย่างเป็นค่าจริง. Mobilemodalเต็มจอstickyactionsไม่ทับnativepicker; tabskeyboard+aria panelสัมพันธ์. ไม่เพิ่มprojecttransferในeditorนี้

## T06 — Task conflict compare review
`TaskEditor.tsx:630–679`. Fieldsbase/latestversion/latesttitle/details/assignee/due + reviewedcheckbox; sourcecompareยังแสดงsingleassignee fallbackบางส่วน. เสนอ field-by-fieldBase/Draft/Latestรวมmultiassignees/dates/recurrence/group; userเลือกkeepdraftเฉพาะฟิลด์แล้วserverversioncheckอีกครั้ง. No added businessfield. No blindlast-write-wins;409ยังรักษาdraft;403ไม่เสนอoverwrite. Unknownmutationต้องเช็กผลก่อนreplayintent. Focusheading/firstconflictingfield, mobilecomparestackedไม่ตารางล้น

## T07 — Replace draft with latest confirmation
`TaskEditor.tsx:664–675`. ไม่เพิ่มfield: ชื่อtask+ผล“ร่างที่ยังไม่saveจะถูกแทนที่”; Cancelinitialfocus. Use latestเป็นdestructiveกับlocaldraftไม่ใช่taskdelete. ReturnกลับDetailsและประกาศlatestversion; backdrop/Escapeเท่ากับCancel. Offlineห้ามอ้างlatestสด; ถ้าserverอ่านไม่ได้ไม่discarddraft

## T08 — Unsaved navigation and close confirmation
`TaskEditor.tsx:153–185,283–291`. SourceมีuseBlocker+beforeunload+closeconfirmรวมtask/checklist/comment/filedirty. ไม่มีfieldใหม่. Guardclose/tabออกrouteเหมือนกัน; Stay/Discard, ห้ามEnterเลือกdiscardโดยอุบัติเหตุ. In-flightsaveไม่ปิด; browserunloadเป็นnativecopyไม่รับประกันcustomtext. Componentchildautosavecompletedไม่ควรยังdirty; selectedfileที่ยังไม่uploadคือunsaved. หลังdiscardคืนfocusopenerที่ยังมีไม่เช่นนั้นstableheading. ไม่autosavepasswordหรือconfidentialdraftลงlocalStorage

## T09 — Checklist tab
`TaskEditor.tsx:881–1181`. Fields `C.title/owner/done/remark`, countdone/total. งานคือแยกขั้นที่ต้องครบก่อนDone, ไม่จำลองchildproject. Sourceblockchildmutationเมื่อparentformdirty, doneparentต้องreopenก่อนadd/uncheck. UXอธิบายเหตุผลblockและshortcutSave details. No additionofchildduedate/estimateก่อนusecaseชัด; checklistbooleanไม่ใช้task4status. Emptyให้Add subitemเมื่อwriterเท่านั้น; mobileชื่อ/สถานะ/ownerเด่นremarkexpandable. Autosavefeedbackต้องrow-specificไม่toast2secอย่างเดียว

## T10 — Checklist add row
`TaskEditor.tsx:1083–1176,432–460`. Title200required, ownerone/null, remark2000optional; newdonefalse. Saveonleavewholerowไม่ใช่เปลี่ยนช่อง; no-nameมีremarkต้องerrorไม่ล้าง. เสนอ explicitSave/Cancelเป็นfallbackkeyboard/touch; clickoutsideระหว่างsaveต้องไม่replaycreateซ้ำ. No addedfield; retainrowonfailure; requestidเดิมสำหรับintentเดิม. Ownerpopupไม่ถือเป็นoutside row; Escapeยกเลิกร่างrowไม่ปิดparentmodal

## T11 — Checklist name and remark inline edit
`TaskEditor.tsx:926–1012,1053–1078,432–487`. ReuseC.*, childversion+task_versionบังคับoptimisticconcurrency. Name/remarkcontrolใช้max200/2000. ไม่เพิ่มstatusreasonทุกcheckbox; ถ้าต้องการacceptanceevidenceเป็นtask-levelproposal. Autosaveต้องบอก“กำลังบันทึก/บันทึกแล้ว/ยังไม่สำเร็จ”ต่อrowและretry; failedblurไม่เสียข้อความ. Pendingป้องกันeditสองrow; latestcompareไม่refreshparentทับdraft; mobileexplicitDonebuttonไม่อาศัยblurเท่านั้น

## T12 — Checklist owner picker
`TaskEditor.tsx:1015–1037,1124–1138` reuseM.eligible + sharedPeoplePicker single; empty=Unassigned; activeprojectwriteeligibleเท่านั้น. ไม่มีfieldเพิ่ม. Singleownerchecklistไม่ใช่primarytaskownerหรือprojectlead. Serverrevalidateสิทธิ์แม้pickerมีคนจากcache; inaccessiblecurrentownerแสดงhistoricalstateไม่autochange. Doneparent/dirtydraftdisabledพร้อมเหตุผล. เลือกแล้วautosaveต้องerrorrollbackไม่แสดงsavedล่วงหน้า

## T13 — Checklist status and checkbox
`TaskEditor.tsx:954–965,1040–1050`; `ChecklistStatusPicker.tsx:24–40`. BooleanTo do/Doneและcheckboxคือvalueเดียวกัน ไม่เพิ่มreviewstatus. Requiredstageเป็นแต่ละitemก่อนtaskDone; noaddedfield. Sourcepending/dirty/doneparentblocks. Failedmutationคงpreviousvalue; keyboardSpaceและpopupArrow/Escapeได้; colorไม่แทนtext. Confettiไม่ควรcelebrateก่อนserversuccess (sourceStatusPickerมีoptimisticanimation จึงเป็นproposalfixไม่claimruntimebugใหม่)

## T14 — Checklist delete confirmation
`TaskEditor.tsx:1217–1234`. Noaddedfield; showitemtitle+ผลต่อparentgate/history, ไม่รับประกันrestoreเพราะsourceUIไม่มีchecklistTrash. Child/taskversionsต้องตรง; focusCancel; faileddeleteให้itemยังอยู่และerror. Doneparentpolicyต้องserverenforceไม่ตีความจากbuttondisabledเพียงอย่างเดียว; ไม่ให้deletionทำtaskDoneอัตโนมัติ

## T15 — Task delete confirmation
`TaskEditor.tsx:1197–1215,495–515`. Noaddedfield. Showtitle/number/project, softtrash30days; deadlineจริงมาจากserverdeleted_atไม่ใช่clientDate.now()+30daysที่previewใช้. ExplainAdmin/LeadหรือauthorizedP-04restoreตามserverและretention; อย่าpromiseeditorทุกคนrestoreได้. Dirtyต้องsave/discardก่อนdelete. Accesscreator-own/managerP-04/adminleadคงเดิม; archiveอาจadminleadpolicyต่างกันต้องtests. Timeoutreadbackก่อนส่งdeleteซ้ำ; focusnextrowonremoval

## T16 — Recurrence control and occurrence links
`TaskEditor.tsx:855–874,1195–1196`; `src/services/tasks.ts:630–705`. Valuesnone/daily/weekly/monthly; due requiredเมื่อrepeat; monthlysameanchorหรือlastdayofshortermonth, changingdueresetsanchor. Nextoccurrencecreatedoncompletionไม่ใช่ตามcronลอยๆ; predecessor/successorเป็นderivedreadonly. ไม่มีtimezone/time-of-dayinputเพิ่มเพราะdate-only. เสนอpreviewnextdateและlinktasknumberของoccurrence; clarifyreopenไม่ควรduplicateจากrecurrence_events. Testmonthend/leapyear/duplicateDone/lostresponse/checklistgate/permissionscleanup; ไม่เพิ่ม“everyN/endaftercount”ในPRนี้

## T17 — Task Updates comments
`TaskCollaboration.tsx:301–318,396–490`; `collaboration-api.ts:17–19`. Bodyrequirednonblank≤5000, mentiontokens; author/timeจากserver, paged10. Sourceเป็นadd/readไม่มีedit/deletecommentUI; อย่าdesignเสมือนมีแล้ว. **No new structured field**: commentsสำหรับdiscussionไม่ใช่formalacceptance/changeregister. เสนอexplicitcommentpurposehintและdraftpreservationonsubmiterror; idempotentbodyintentเดียว. Viewerอ่านได้writerpost; online/maintenance/writablegateตามhost. Empty“เริ่มอัปเดต”เฉพาะwriter; Ctrl/Enterถ้าจะเพิ่มต้องประกาศไม่submitธรรมดาEnter; mobilecomposerkeyboardไม่บังpost

## T18 — Mention suggestions
`TaskCollaboration.tsx:258–298,461–479`; `mentions.ts`. Searchderivedfromcaret/projectmembers; keyboardactiveindexและinsertstoredtoken. Nonewfield/noemailnotificationscopeอนุมาน. Recheckreadeligiblemention; currentlistloadingอย่าแปลว่าไม่มีคน. Displaynameซ้ำต้องแยกidentityด้วยsafecontext; literaltyped@ไม่มีvalidtokenไม่notifyคนผิด. Escapeปิดsuggestionsก่อนmodal; returncaretและไม่doublepost

## T19 — Task attachments tab and upload
`TaskCollaboration.tsx:320–350,492–615`; `collaboration-api.ts:20–33`. FieldsF.binary/name/size/type/uploader/created/deleted/can_delete/can_restore; filterShowdeleted; 1byte–10MiB, onefile; extensionlistJPG/JPEG/PNG/WEBP/PDF/TXT/CSV/DOCX/XLSX/PPTX/ZIP. Noaddedclassificationmandatory. Name/typeที่serverตรวจเป็นsourceoftruth ไม่trustacceptattribute. Progress≤99ก่อนack; canceluploadไม่แปลว่าserverไม่รับ ต้องrefresh; dedupeintent. QUOTA_EXCEEDEDไม่แนะนำdeleteแล้วรับประกันspaceคืนทันทีเพราะdeletedbytesยังcount; restoreexpiredแสดงcutoff. Previewprojectfileอยู่บท04; downloadmustcheckbytesและrevokeObjectURL. Mobilefilenamewrap, progress/cancelvisible

## T20 — Attachment delete and restore confirmation
`TaskCollaboration.tsx:647–672`. Noaddedfield; name+delete/restore+30dayrestoreandstorageconsequence. Servercan_delete/can_restoreไม่deriveแค่writer. AuthorownหรือP-06policy; parentarchive/retentionrevalidate. FocusCancel; unknownrefreshlist; doublerequestไม่createfileซ้ำ. Restoreไม่ทำให้taskDone/assignmentเปลี่ยน. Disabledrestoreอธิบายexpiredไม่hideสาเหตุทั้งหมด

## T21 — Task Activity history
`TaskCollaboration.tsx:27–66,616–644`; `collaboration-api.ts:35–94`. Derivedactor/action/before/after/request_id/time, paged10; norequiredinput/noaddedfield. Displaytask/checkliststructuredJSONเป็นอ่านง่ายและnullSystem; multi-assigneeแสดงnamesถ้าresolvedอย่างauthorized ไม่IDยาวล้วน. ไม่ใช่immutableproductionsecurityauditเพียงเพราะเรียกActivity. Failedhistoryไม่ปิดdetails; empty“ยังไม่มีกิจกรรม”ไม่loadingนิรันดร์; mobilebefore/afterstack; nohistoryedit. Futureacceptance/healthchangesเพิ่มeventsผ่านcontractPRไม่แอบreuseupdatedจนตีความไม่ได้

## T22 — Inline task rename
`TaskWorkspace.tsx:1338–1376`. T.titlerequiredmax200; F2เริ่ม, Entercommit, Escapecancel; rowmenurenameไม่พบในtableactualbranchแม้commentกล่าวถึง. Noaddedfield. เสนอdiscoverableRenamebuttonfor touch. SourcecleartitleEditหลังdispatchก่อนรู้ผล จึงต้องรักษาร่างบนfailureในproposal; nooptimisticsuccess. Conflictshowlatesttitleกับdraft; whitespaceไม่commit; copytasknumberseparatefromtitle

## T23 — Inline status picker
`TaskWorkspace.tsx:1392–1404,1481–1486` → T32; statusesexacttodo/doing/review/done. Noaddedfield. Role/archivedchecksprojectviewชัดกว่าMyWork; servermustenforceเหมือนกัน. DoneincompletechecklistshowactionOpen checklistไม่genericfailure. Reopendoneคงhistoryและoccurrencelinks; pendingdisableซ้ำ; focusstablecellafterrefresh; celebrationหลังackเท่านั้นเป็นrecommendation

## T24 — Inline priority select
`TaskWorkspace.tsx:1405–1426`. T.priorityLow/Medium/High/Urgent, mediumdefaultcreate. Noaddedfield; priorityบอกrelativeimportanceไม่ใช่SLAorhealth. Updateทันทีต้องvisiblepending/rollback; keyboardselectไม่saveeacharrowโดยไม่คาดหมายถ้าเปลี่ยนUXเป็นapplyต้องconsistent. Viewerreadonlytext. ไม่defaulturgentเมื่อoverdue

## T25 — Plan date cell popover
**แก้ชื่อinventoryเพื่อความแม่น:** source `TaskWorkspace.tsx:89–122,1427–1461` เป็น **native date input/showPicker** ไม่ใช้CellPopover. T.start/due nullable; clear=null; serverตรวจpairกับstoredotherdate. Noaddedfield. Errorstart>dueต้องบอกอีกวันที่เทียบและkeepdraft; recurringdueclearถูกreject. Date-onlyBangkokไม่แปลงUTCtimestamp. Mobilenativepickerและtypedfallback, Escapecancelตามbrowserไม่promisecustomfocus. Snapshotก่อนcommit/retryversionปลอดภัย; ไม่ลากdateแล้วshifttasksอื่น

## T26 — Create and edit task group
`TaskWorkspace.tsx:297–378,1547–1583`; `task-api.ts:127–138`. G.name100required,colorhex#RRGGBB(default#579bfc), id/version/positionderived. Noaddedfield. Groupเป็นorganizationไม่milestone/status/lifecycle. SourceUIมีcreate/editไม่มีdeletegroupbutton; OpenAPIมี GET/POST project groups และ PATCH group เท่านั้น แม้ P-02 catalog กล่าว remove จึงบันทึกเป็น catalog/contract discrepancy ไม่อ้างว่ามี delete API แล้ว. ManagerP-02UIparityต้องreview; errorข้างform, dirtycloseguardเสนอเพิ่ม, nameThai/blankvalidation; mobilecolorมีtexthexไม่บังคับcolorvision. Conflictห้ามoverwriteชื่อใหม่โดยเงียบ

## T27 — Task group collapse and drag ordering
`TaskWorkspace.tsx:1155–1245,1279–1319`. group_idและgroup_before_task_id, collapsedlocalUI; boardorderเฉพาะsortgroup_order. Noaddedfield. Dragมีsamegroupappend/crossgroup; เสนอkeyboardMove to group/beforeและtouchmenu ไม่drag-only. Filtered/paginatedlistไม่ควรอ้างglobalneighborครบ; servervalidateanchor/version, failedmoveย้อนและannounce. Collapsingไม่เปลี่ยนstatusหรือcapacity. Mobileไม่ทำhorizontaldragแทนscroll

## T28 — Batch status group and deletion toolbar
`TaskWorkspace.tsx:256–296,1069–1119`. Selectedids+versions≤100, patchstatusหรือgroup, operationdelete; noaddedbusinessfield. แสดง“เลือกNงานในscope/pageใด”; ไม่selecthiddenpagesโดยนัย. เปลี่ยนfilter/pageต้องclearหรือexplicitretainselectionพร้อมsummary. Peritemauthorization/checklistgate/versionรองรับpartialsuccessไม่transactionallทั้งหมด. Applyroutineไม่confirmเพิ่ม; deleteเท่านั้นT29. No silentassign/permissiongrant. Loadingdisabled, mobilebottomactionbarไม่บังtable

## T29 — Batch trash confirmation
`TaskWorkspace.tsx:258–266`. Noaddedfield; showN+retention30days+partialoutcomespossible; Canceldefault. SourcebatchnewUUIDทุกrun (`:277`) ต่างจากreusableintent: เสนอstableintentและcheckresultก่อนretryunknown. ไม่บอกทุกtaskdeletedก่อนreadresult; nofaketotalเมื่อinaccessible. Focusbatchresultsummaryหลังaction

## T30 — Batch partial result review
`TaskWorkspace.tsx:1121–1151`, schema`:47–70`. Derivedresultsupdated/deleted/conflict/forbidden/not_found/invalid+code+currentversion. Noaddedfield. Keepfailedselected(source`:282–285`), successrowsไม่retry. ต่อtaskมีReviewlatest/Opentask, ไม่ใช้toast“สำเร็จ”กลบfailed. Refreshmustnotclearfailureexplanationจนuserack; expiredaccessไม่leakitemdetails. Mobilelistrowsแทนwidegrid; alertfocusnonmodal

## T31 — Shared assignees picker
`shared/PeoplePicker.tsx:6–97`. ReuseM.eligible/T.assignees; searchnameorrole, multipledefaulttrue, singleinchecklist, Unassignedempty; inactivehistoricaldisabled. Noaddedfield. Multi changesเป็นdraftในTaskEditorแต่autosaveในchecklistcaller ต้องhelperตรงcontext. ≤100uniqueIDsserver; notallorgdirectory; noavailablepeopleอธิบายสิทธิ์ไม่promoteuser. KeyboardArrow/Enter/Escape; returnfocustrigger; mobilepopoverpositionไม่overflow; longThai/duplicate namesไม่truncateจนเลือกผิด

## T32 — Shared task status picker
`shared/StatusPicker.tsx:6–58`. Presentationmappingtask-apistatuslabels; noaddedfield. Coreonlyemitsintent, callerownswrite/pending/rollback/version/Donegate. Sourceanimationก่อนserverack (`:20–25`) เป็นsourcebehaviorไม่newbrowserfinding. Recommendmovepositivecelebrationtoack, respectU.reduce_motion/confetti. Screenreaderannouncespersistedstatusไม่แค่chosenoption; escapecloseonesurface

## T33 — Shared checklist boolean picker
`shared/ChecklistStatusPicker.tsx:4–47`. ReuseC.done; noaddedfield/no3rdstate; nochildworkflowenum. ContextmustpassdisabledwhenparentDone/dirty/pending/readonly. Choiceemitsonlydifferentvalue; errorbacktocurrentpersistedchoice. Currentiteminitialfocus, roleoptionselectedtext/marknotcoloronly; pointerandSpaceequivalence

## T34 — Shared cell popup host
`shared/CellPopover.tsx:4–125`. Openlocalstate/trigger/label/multiple; norecordfield. Nativepopoverautoposition/ResizeObserver; arrowsfocusoptions, Escapeclose/focustrigger. Noaddition. Sharedhostไม่validatebusinessrules. ProposeHandleEmptyOptionList/noarrowmodulozero/noactivationonfocus; closeonrevokeddisabledmustsyncopenandaria-expanded. Viewport360keyboardresize/toplayerต้องทดสอบ; focusfallbackเมื่อopenerถูกrerender. T25nativepickerไม่inheritwrongbehavior

## T35 — Shared modal form error loading empty toast table primitives
`shared/components.tsx:17–345`. ExistingLoadingstatus/skeleton, ErrorrequestID/retry, Fieldaria-invalid/description, table/resizer, Dialognativefocusloop/backdrop/LayerProvider, Formwritablefieldset, Toast2seconds/persistent. Noaddedbusinessfield. **UX01–09เป็นnormativeproposal** ไม่อ้างว่าimplementedครบ: dirtyguardsอยู่callerไม่ใช่Dialogautomatic; tablekeybyindexเสี่ยงfocusafterreorder; originalopenernodeอาจdetachedหลังsave. เสนอstableidfocusrecovery/inlinepersistenterrors/slowloadcancel/statusstaleness; resizermin48–800แต่preferencesmin60ต้องnormalizeหนึ่งrule. 360/390/768/1440, zoom200%, IME, touch+keyboardเป็นacceptancematrix

## T36 — Shared confirmation host
`shared/confirm.tsx:5–42`; `confirm-bus.ts`. Fieldsrequesttitle/message/confirmLabel/danger/resolveเป็นruntimeUIไม่DB. Noaddedinput. Cancelautofocus, close=false; noqueueaccidentallyconfirmwrongentity. Pendingdestructiverequestmustfreezeidentityandclearonscopechange; nestedconfirmfocusreturnstable. UsermustseeconsequencesnotgenericAreyousure. Confirmisnotserverauthorizationnorproductionguard

## PR / acceptance
- **PR-T1 reliability + shared primitives**: stablefocusafterlistmutation, date/renameerrorpreservation, persistentrowfeedback, unsavedguardsallforms, optimisticanimationack. Testsallerror/loading/empty/offline/reconnect/403/409/lostackandIME; nativepickerfallback; noaccesspolicychange
- **PR-T2 taskdeliverymetadata** afterD04: acceptance/primaryowneroptionalmigration, Doingreadinesspolicyexplicit, multiassigneeshistorynotlost. Testslegacyarrays/singleassigneefallback/ownerrevoked/noautomaticgrant/Donecriteria/checklistconcurrency; noautoacceptproject
- **PR-T3 batchandordering**: stableidempotentintent/peritemresults/keyboardmove/selectionscope. Testmixedpermission/Doneblocked/staleversion/missinganchor/server500/offlinemidflight/morethanonepage; successcountเท่าจำนวนackจริง
- **PR-T4 collaborationresilience**: scopedmentions/filecancelunknown/quotafeedback/historyformat; testsduplicatecommentintent/invalidmention/contenttypevsname/10MiBboundary/expiredrestore/donehistoricalassignees. ไม่มีpaidserviceและไม่เพิ่มcommentedit/notificationchannelsโดยปริยาย
