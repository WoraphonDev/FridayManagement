> **Historical proposal snapshot v1.0 — ไม่ใช่กติกาที่อนุมัติทั้งหมด:** source `94282b6` (Windows staging PR #1), ไม่ใช่ main `4a0b76b`. ข้อความเก่าที่ว่า D01–D12 ยังไม่อนุมัติ / acceptor optional / baseline deferred ถูกแทนด้วย [decisions](../delivery-decisions.md) และ [rules](../delivery-rules.md). รายละเอียดอื่นเป็นข้อเสนอเท่านั้น; ไม่มีผลทดสอบ runtime ใหม่. ดู [provenance](../audit/README.md).

# 03 — Planning / Reporting / delivery domains

> **อัปเดตการตัดสินใจ:** โซยืนยัน D01–D12 แล้ว ดู [คำตอบที่อนุมัติ](../delivery-decisions.md) ซึ่งมีผลเหนือคำแนะนำหรือข้อความ “ยังไม่อนุมัติ” ที่ขัดกันในร่างนี้ โดยเฉพาะผู้ตรวจรับต้องระบุชื่อจริงก่อนเริ่ม และต้องเก็บแผนตั้งต้นเมื่อยืนยันเริ่ม ข้อเสนอ field/กติกาย่อยนอกคำตอบยังไม่ถือว่าอนุมัติทั้งหมด และยังไม่ได้ implement


**ข้อเสนอ ไม่ใช่ capabilities ที่อนุมัติแล้ว**. Source HEAD `94282b6`; source evidence ไม่ใช่ browser QA ใหม่. Field dictionary `Q.* R.* W.* D.*` และ UX01–09 ใน [00](00-data-model-and-coverage.md). ทุก existing popupด้านล่างใช้ fieldsเดิม; new-domainformsท้ายบทระบุ NEW ชัด ไม่บวกเข้าactual inventory

## K01 — Kanban board and large-board list fallback
`Kanban.tsx:215–398,543–802`, `task-api.ts:98–121`. Fourfixedstatuses todo/doing/review/done, cardtitle/number/group/checklist/priority/due/assignees และcolumncounts/version. Board≤500; servermode`list_required`เป็นpagedlistไม่ใช่boardที่โหลดครบ. Businessjobจัดflowและmoveงานไม่ใช่approveส่งมอบ. Noaddedfield/ไม่มีcustomcolumnในPRนี้; ไม่ใช้columnแทนmilestoneหรือhealth

Dragoptimisticต้องrollbackและreadlatestเมื่อconflict; filteredorderingdisabled; mouse/touchมีsensorsแต่ต้องใช้cardmenukeyboardmoveเป็นทางเลือก. Loadingยังไม่แสดง0เป็นfinalcount; emptylaneแยกno-matchกับไม่มีงาน; stale/permissionrevokedclearboard. Mobilehorizontalboardต้องมีaccessiblelanejumpหรือlistfallback; cardcheckboxcountไม่เป็นtaskacceptance. การเลื่อนระหว่างstatusต้องผ่านchecklistgate/recurrence/idempotencyเหมือนeditor

## K02 — Board filters
`Kanban.tsx:50–58,556–638`. Fieldsq100, assignee/everyone/unassigned, prioritysingle, category80, duefrom/to, statussingle; defaultsblank. ใช้Q.taskแต่**ต่างจากtable**ที่status/prioritymulti. Noaddedfield; เสนอใช้sharedfiltercontract/clearappliedchipsก่อนsynccrossview ไม่ทำfilterwidening. Filteredvisiblecountกับwholeboardtotalต้องlabelแยก. Invaliddaterangeinlineerror; offlinekeepfilterแต่stale; EscapeคืนfocusFilters; mobilenofocusleak

## K03 — Card manage status and move actions
`Kanban.tsx:159–182,486–525`. ใช้T.status+beforetaskID+source/targetcolumnversions (readonlyconcurrency); ไม่มีfieldเพิ่ม. Cardmenuเปิดtask/status/moveprev-nextตามpropsจริง ไม่สร้างbulkassignที่ไม่มี. Disableddragตอนfilterต้องhintclearfilter; statusยังผ่านรายละเอียดได้. Focusหลังmoveไปcardเดิมในlaneใหม่หากยังvisible ไม่เลื่อนไปdocumentbody; screenreaderannouncelanepersistedหลังack. Donegateerrorลิงก์checklist; reorderไม่changeassignees

## K04 — Filtered reorder and uncertain move review
`Kanban.tsx:401–484,655–696`. Deriveduncertain/retryAllowed/notice; **no businessfieldเพิ่ม**. “Review and retry”ต้องrefreshboardแล้วreviewpositionไม่replayanchorที่หมดอายุ; “Use latest data”discardoptimisticintentแต่ไม่deleteงาน. Stablecommandkeyคงไว้เมื่อตรวจunknownresult;409versionconflictต่างจากnetworkunknown. Pendingdisablemutationและfilterที่ทำให้intentidentityหาย; wrongproject/revokedเลิกแสดงpayload. Initialfocusreviewmessage; mobilesheetreadableไม่nestedtoast

## V01 — Calendar month and mobile agenda
`TaskViews.tsx:80–210`, parent`TaskWorkspace.tsx:439–484,1603–1609`. Fieldsviewmonthnavigation/todayและtaskEnd Plan, status/priority/number; dateonly. **Calendarใช้due_date ไม่projecttarget ไม่eventmeeting ไม่startspan**. Noaddedfield; nativeclickopentaskT05ไม่inlinecreateevents. Source narrow≤600agenda; desktopfirst3perday+moretext. เสนอmorebuttonเปิดdaylistด้วยcountและscope ไม่+Ntextเฉยๆ. Loadingallpagesครบก่อนอ้างเดือนcomplete (`task-list.ts:101–119`); conflictingpaginationแสดงretryไม่partialcomplete. No-dateแยกlist/shortcutไม่ซ่อนงาน; fullmonthemptydifferentfromnofiltermatches. Keyboard/zoom/highcontrastcurrentdayไม่พึ่งcolor

## V02 — Calendar all-range disclosure and paged tasks
`TaskViews.tsx:6–49,212–219`. DerivedinMonthlist, page50; nofieldsเพิ่ม. งานคือหาoverflowdayและตรวจworkmonthทั้งหมด. Label“all tasks in this calendar range”ไม่“allprojecttasks”; orderedbydate/taskidentifier, openingdetailsreturnsdisclosureandpage. เสนอday-specificpopupinsteadofonlyglobaldisclosure; newUXnotexistingmodal. Empty/morethan50/paginationafterfiltermustclamp; mobilenobigtable. No exportbuttonเพิ่มถ้าไม่มีpermission/exportcontract

## V03 — Gantt day week month timeline
`TaskViews.tsx:222–401`. start→due bars, missingstart marker, day/week/month scales14/42/90days, page50. **Currentเป็นdatevisualization ไม่dependencyengine/criticalpath/baseline**. Noaddedfield. Showmissingstart/onlystart/nodatesอย่างexplicitตามderivedbarsemantics; fitopentasksไม่อ้างcompletedทั้งหมด. Allpagesloadingจากparent; partialreadไม่นำไปคาดenddate. BarskeyboardbuttonเปิดT05; proposedaccessibletextlistmobileแทนscaleจนอ่านไม่ได้; overdueข้อความ+pattern. ไม่dragbarเพื่อautoscheduleโดยไม่ได้approveD05

## V04 — Gantt range fit today and undated list
`TaskViews.tsx:268–325,372–399`. Fieldsrangefirst/scale/page UIlocal; Fit open tasks, Today, Prev/Next, undated/tasksoutsidechartdisclosureตามbranch. Noaddedbusinessfield. Fitควรบอก“fitงานopenที่อยู่ในfilter”ไม่projectcommitment; resetpageเมื่อdata/scaleเปลี่ยน. Dateboundaryvalidrange1–9999; nohugehorizontalrangeถ้าข้อมูลผิด. Keepfocus toolbarและannouncewindow; mobileprevnextไม่แตะbarลากโดยไม่ตั้งใจ; failurefitnotmutatedates

## R01 — Reports summary
`Reports.tsx:20–147,281–455`; `report-api.ts:34–66`. Derivedtotal/by_status/overdue/unassigned/done_in_period/completionpercentage/openworkload +metadata date_basis/from/to/timezone/generated_at. Businessjobปรับแผนและfollowup ไม่ประเมินperformanceรายคน. **CompletionrateคือcurrentDone/alltasksในscope ไม่throughput ไม่acceptedvalue**. Multi-assigneecountsอาจซ้ำpersonrows; ไม่sumrowsแล้วอ้างuniquetasks. Noaddedmanualmetricfield; showdenominator/zero“ไม่มีงานในช่วง”ไม่healthy100%. Empty/errorstaleไม่resettozero. เสนอdatafreshness+scopebadgeบนprint/export; viewersrightsserverretain; charttablealternative/highcontrast; mobilenumbersไม่truncate

## R02 — Report filters
`Reports.tsx:150–279`, `report-api.ts:68–95`. Fieldsownerteam/project/assigneeEveryoneหรือnull/jobtitle/datebasisCreated/Due/Completed/from/to. Default **Due + current Bangkok month**; team/project/assignee/titleblank. Needexplain“Allaccessible”ไม่wholeorganizationแม้Adminlabel. Parentteamchangeclearsproject/assigneeตามsource, titlefilterinactiveavailableเพื่อhistory. Noaddedfield; proposedSaveviewlocal/personpreferenceแยกphaseไม่sharegrants. Dateinvalidrangeinline+focusfirstinvalid; changingfiltercancelstaleexport; emptywithclear. Unknownjobtitlehistoricalfallbackไม่dropcountsเงียบ; includejobtitledataไม่อนุมานpermission

## R03 — Report CSV export
`Reports.tsx:103–145`; `src/services/reports.ts:10–30`. ใช้appliedfilterและservermetadataเดิม, blobdownloadพร้อมfilenamebasis/from/to; noaddedfield. Exportต้องreadrights+P-07/P-10scopeตามserverไม่แค่hidebutton. เสนอfirstline/sidecarmetadatagenerated_at/timezone/scoperevisionหรือexplicitcolumnmetadataโดยversionedformat ไม่breakexistingCSVเงียบ. CSVescaping/formulainjectionต้องtest; nosecret/contactexportเพิ่มโดยนัย. Longexportpendingcancel+retry, stalequeryไม่downloadชื่อใหม่กับข้อมูลเก่า; permissionlostabortandrevokeblob. Mobiledownloadinstructionsไม่popupnewtabที่ถูกblock

## R04 — Assignee report drilldown
`Reports.tsx:395–446`. **Actual เป็น static assignee bars ไม่ใช่ link/drilldown** (`:410–437` เป็น li/span/strong ไม่มี onClick/anchor). ชื่อ inventory เดิมเป็น candidate ที่แก้แล้ว: breakdown มีจริง; drilldown เป็น proposed UX เท่านั้น. **เสนอ** scopedlistdrilldownforanypermittedassigneeโดยsameR02filters/datebasis; nofieldเพิ่ม. Totalsmustreconcileparentmetadata; noURLalonegrant. Emptyconcurrentchangeบอก“ข้อมูลเปลี่ยนตั้งแต่รายงาน”; backrestorefilters. หากreportcountincludesaccessibleworkแต่MyWorkบังคับself ต้องใช้readonlyreportsdrilldownendpointไม่แกล้งเปิดMyWorkให้คนอื่น

## R05 — Project workload
`ProjectInsights.tsx:30–228`, `insights-api.ts:8–42`, `src/services/insights.ts:96–160`. Fieldsfrom/6weeksnavigation; derivedrowsuser/jobtitle/counts/overdue/no_date/tasks; thresholdfromorganization. Open tasks overlapMonday-startweeks; taskหนึ่งมีหลายassigneeจะแสดงในแต่ละคนและหลายสัปดาห์. สีoverthresholdเมื่อcount>thresholdไม่≥. **นี่taskcount ไม่capacityhours/availability/utilization**. Noaddedworkloadinputในcurrentview; thresholdแก้A19ไม่แต่ละpopup

Showlimits5000tasks/1000rowtasks/1000rowsและtruncatedจริง; sourceUIข้อความ“first5000”ไม่ครอบทุกtruncationcause เสนอgenericpartialnoticeพร้อมreasonจากAPIรุ่นใหม่. Errorwithstaledataต้องvisiblebannerไม่แสดงตารางสดโดยนัย. No-dateแปลneitherstartnordueไม่sameastasklistnodue. Mobilehorizontalweeklytableมีpersonsticky+listalternative. Permissionsprojectaccessและscopedqueryใช้serverไม่teamleadทุกproject. Heatmapไม่rankคนเก่ง

## R06 — Team workload popup
`Workspaces.tsx:246–253,475–478`. ReuseW.*ของR05 **ไม่มีfieldใหม่**; scope=team,id; Admin/teamLead/member+P-09โดยserverenforceและaccessibleprojectsonly. Popupไม่grantteamleadอ่านhiddenproject. Headerบอกvisible-scope, ไม่อ้างทีมcapacityทั้งหมด. Dialogcloseคืนopener; ถ้าarchive/removalทำopenerหายไปstableteamheading. Loading/denied/emptyแยก; navigatingsixweeksไม่resetteamcontext

## R07 — Workload cell task drilldown
`ProjectInsights.tsx:208–224`, `insights-api.ts:101–113`. Derivedselectedperson/week/overdue/no-date listtasktitle,start,due. Noinputใหม่; ไม่promiseformแก้capacity. Sourcepopupใช้listedtaskdetailsไม่จำเป็นclickopentask; proposeddeep-linkเปิดT05authorizedแล้วกลับcell. Partialrowtasks1000อาจไม่เท่าcountต้องshowtruncated+fullscopedqueryในPRไม่แสดง“all”ผิด. Overduecolumnไม่จำกัดselectedweeksตามservice. Emptyafterrefreshชี้scopechange, keyboardfocusheader/cancel, mobilewrapdatesandnames

## NEW-SCOPE — milestone (D05; ไม่ใช่ group หรือ Gantt marker เดิม)
**Job:** นัดตรวจ deliverableสำคัญ เช่น Pilot sign-off. Proposedrecord `delivery_milestones`: project_id, title(required create,max200), owner_id(optionalDraft, requiredbeforecommitted), target_date(nullableuntilcommitted), acceptance_summary(max4000, requiredbeforeaccepted), status(planned/at_risk/accepted/cancelled), accepted_at/by/evidence_url-or-doc-ref; linked task IDs optional. Defaultsplanned/no dates; helper“การ Done งานที่เชื่อมไม่ยืนยันmilestoneให้อัตโนมัติ”. Duewarningpastallowed; withinprojectcommitmentwarningไม่hardblockเพื่อlegacy. Singleprojectmembershipscope; viewersread; proposedexistingmetadataauthorityadmin/lead/P-01managerwrite **ต้องอนุมัติexplicit** ไม่inheritgroupP-02โดยเดา. StorageNEWwithversion/audit, reportingnextup/late/acceptedmilestonesแยกtaskprogress

Create/editdialog, acceptanceconfirmation, cancelconfirmationเป็นNEWsurfaces; noharddeleteacceptedmilestone; lateeditreasonrequired. Noautotaskdateshift, noaggregateweightedpercentdefault. Conflictkeepdraft+compare; emptyhascreateonlyauthorized; offlinewriteblocked; mobileeditorstacked/confirmationfocusCancel. Testslinkedtaskdoneไม่autoaccept, unauthorizedreference, datechangeaudit, acceptedmilestonehistorysurvivescancel/archive

## NEW-SCOPE — risks / blockers / issues
**Job:** รู้เรื่องที่ต้องแทรกแซง ไม่เติมRedทุกoverdue. Proposed`delivery_items`: type risk(issuepotential)/issue(actual)/blocker(preventswork), title200required, description4000optional, accountable_owner_idrequiredbeforeopentriaged, statusopen/mitigating/resolved/accepted-risk, impactlow/medium/high, likelihoodlow/medium/highเฉพาะrisk, next_action2000requiredtriage, review_dateoptionalrecommended, affectedtask/milestoneIDsscoped, resolution/evidence2000requiredresolve. Defaultsopen/untriaged, nofakeowner/date/score. Nullmeansnotassessed; **ไม่default risklow**. Optionalcreationfieldsprogressivelyfill; blockerต้องมีaffectedworkหรือproject-levelscopeexplicit

RightsNEW: proposeprojectwritercreate, assignedriskowner/projectmanagementeditresolution, metadataauthorityaccept-risk; existingpermissionsunchangeduntilD07decided. Storestructuredrecords+auditnotparsecomments; reportopenblockersage/nextreviewไม่leadscore. Noextra“blocked”taskstatus; relationshipflagkeepsfourstatuses. Dialogadd/edit/resolveareNEW; conflict/version/revoked/hiddentargets; mobilequicknextaction; testsriskvissue/nolikelihoodforactualissue/nohiddenprojectlinks/resolvewithoutnextactionreasonreject. Securityremovalcanleaveunassignedtriagewithoutblockingrevocation

## NEW-SCOPE — change requests / commitment change
**Job:** ตัดสินใจเปลี่ยนscope/date/acceptanceอย่างมีบริบท. Proposed`delivery_changes`: summary200, reason2000, requested_by/time(system), affectedbaselinefield, before/aftertypedvalue, impact_scope/schedule/effort2000eachoptionaluntilreview, decisiondraft/proposed/approved/rejected/withdrawn, decision_owner_id(requiredreview), decision_reason2000(requiredapprove/reject), decided_at/by. Defaultdraft; createonlysummaryrequired; targeteditingactivecreatesreviewevent/requiredreasonแต่ formalapprovalgate **ยังไม่อนุมัติ**. D08เลือกว่าแค่auditหรือfullworkflow; แนะนำaudit-firstเพื่อลดoverhead

NoautomaticapprovalfromtaskDoneorPMjobtitle. Newpermissiondecisionexplicit; no“approve own”ruleเดาจนowneragree. Approvedchangeapplyvalue+audit+versionatomically, nocalendarautoshift. Pending/409retainproposal+diff; duplicateapproveexactonce; permissionlostabort; mobilebeforeafterstack; noattachmentsmandatory. Reportingplanned/currenttargetdriftได้หลังoriginalcommitmentจริง ไม่backfillbaselineจากlegacytaskspan

## NEW-SCOPE — estimates and capacity (D06)
เริ่มsmall: task `estimate_minutes` nullablepositiveinteger≤60000 (proposedlimit; durationไม่storypoints), remaining_minutesoptionalแยกestimateหากทีมต้องforecast; `capacity_minutes` ต่อperson/week, availabilitynote200optional, overridecalendarหากapproved. Defaultunknownไม่0; noautomatic40hหรือassigneeแบ่งเท่ากัน. Requiredไม่create แต่ต้องknownก่อนcapacityforecast; collaboratorsallocationminutesต้องsum≤taskestimateหรือexplicitunallocated, เลือกprimaryowner-onlyก่อนเพื่อลดfakeprecision

No paidtime-tracker; noattendance/salary/productivityscore. CapacityeditorNEW scopedteamadmin/leadตามapprovedpolicy; personselfavailabilityproposalยังไม่grant. Reportestimatedload/capacity/unknowncoverageแยกtaskcounts, no100%utilizationจากงานcount. Offlineblocked/conflictretainweekdraft; mobileweeklycards; testsmulti-assigneenodoublecount/minutesunits/unknownvszero/parttime/timeoff/legacy/secretavailabilityไม่leak. Do notcreateglobalcapacitycompletenessclaimfrom5000taskcap

## NEW-SCOPE — dependencies (D05)
Proposefirst **finish-to-start warning-only** edge predecessor_task_id→successor_task_id withinoneproject, lag_daysinteger0–365optionaldefault0, reason1000optional; no crossprojectinitially. Uniqueedge/no-self/no-cycle; referencesaccessibleandnotdeleted. Selecttaskpickersearchscoped; blockedbadgewhennotDonebutdoesnotpreventstatuswriteunlessownerexplicitlyapprovesgate. Dependency≠recurrencepredecessor; separatetable/entitysemantic. Noauto-reschedule/criticalpath/baselineclaim

NEWadd/removeedgeconfirmation onlywhenexistingcommitteddependencyimpactneedsreview; routineaddnotneedmandatoryreason. Storeedgeversion+audit; stalegraphrefreshandcyclechecktransactionally. UIoffersviewdependenciesnotGanttlinejungleonmobile; empty“No dependencies”not“unblockedconfirmed”. Testsrecurrenceedgenotcounted/twoconcurrentedgescycle/trashedtarget/unauthorizedtargets/changeduewarningwithoutpropagation

## Official research → limited decisions, no tier assumptions
Retrievedevidenceใน `../audit/README.md`:
- [Jira CLI project create](https://developer.atlassian.com/cloud/acli/reference/commands/jira-project-create): name/key/description/lead-email/url flags; **CLI reference ไม่ใช่ screenshot visualcreate**. สนับสนุนแยกlead/contextจากชื่องาน ไม่บังคับcopyJirafields
- [monday project features](https://monday.com/projects/features): Gantt/scope/schedule/milestones/dependencies; dashboards/resources; baseline planned-vs-actual. สนับสนุนแยกconceptไม่แปลว่าFridayมีแล้ว/freeบนtierใด
- [Linear Projects](https://linear.app/docs/projects): requiredprojectname/status, recommendlead; FAQsingleleadเพื่อclearownership; overview/resources/milestones. สนับสนุนshortcreate+laterbriefไม่giantform
- [Linear Milestones](https://linear.app/docs/project-milestones): milestonewithinproject, optionaldate, linkedissues/progress. Fridayเสนอhumanacceptanceแยกratio ไม่copyprogressformulaจากLinear
- AsanaoverviewURLจากpreviousproposalเป็นcontextเท่านั้น: fetchรอบนี้HTTP200แต่bodyเป็นLoading/CSS Error **ไม่นับfreshsupport**; Linear/project-overview404, ClickUpdependencies403ไม่ใช้เป็นฐานclaim. ไม่จำเป็นต้องหาfeatureparityทุกvendor; ไม่แนะนำซื้อบริการ

## Phased PR and acceptance
**PR-R1 semantic honesty**: labeltaskratio/countworkload/taskspan, filtersmetadata, stale/partialmessages, nativecalendaroverflow, CSVscoping. TestsBangkokmonth/weekboundaries/emptydenominator/multiassignee/allpagescountreconciliation/permissionrace/exportformulas/mobile

**PR-R2 drilldown parity**: exactfilters/datebasisinURL/query, reportrowvsMyWorkselfscope, project/workloaddeep-links, stableback/focus. Test403/removedtask/truncatedrows/samecount-samesnapshotหรือvisiblechangedmessage

**PR-D1 milestones**, **PR-D2 risk/blocker**, **PR-D3 changeaudit-first**, **PR-D4 estimates/capacity**, **PR-D5 dependencieswarning-only** เป็นseparatecoherentPRหลังD05–D08; eachincludesmigrationnullable+contract+services+UI+audit+provider+access+browseracceptanceตามแต่ละdomainข้างบน. ไม่รวมcost/budget/CRM/timebilling/externalportal/formalAgilesprint/automationengineในphaseนี้. Productfitทั่วไปดีขึ้นได้โดยไม่แกล้งว่าระบบเป็นJiraAgileครบ
