> **Historical proposal snapshot v1.0 — ไม่ใช่กติกาที่อนุมัติทั้งหมด:** source `94282b6` (Windows staging PR #1), ไม่ใช่ main `4a0b76b`. ข้อความเก่าที่ว่า D01–D12 ยังไม่อนุมัติ / acceptor optional / baseline deferred ถูกแทนด้วย [decisions](../delivery-decisions.md) และ [rules](../delivery-rules.md). รายละเอียดอื่นเป็นข้อเสนอเท่านั้น; ไม่มีผลทดสอบ runtime ใหม่. ดู [provenance](../audit/README.md).

# 04 — Workspace / Teams / Collaboration / Docs / Files

> **อัปเดตการตัดสินใจ:** โซยืนยัน D01–D12 แล้ว ดู [คำตอบที่อนุมัติ](../delivery-decisions.md) ซึ่งมีผลเหนือคำแนะนำหรือข้อความ “ยังไม่อนุมัติ” ที่ขัดกันในร่างนี้ โดยเฉพาะผู้ตรวจรับต้องระบุชื่อจริงก่อนเริ่ม และต้องเก็บแผนตั้งต้นเมื่อยืนยันเริ่ม ข้อเสนอ field/กติกาย่อยนอกคำตอบยังไม่ถือว่าอนุมัติทั้งหมด และยังไม่ได้ implement


สถานะ **proposal + source review เท่านั้น**, HEAD94282b6. [Dictionary + UX01–09](00-data-model-and-coverage.md) เป็นสัญญาร่วม; ทุก surfaceใช้ fieldเดิมตามรหัสในบทนี้พร้อมข้อยกเว้น ไม่เพิ่มinputเพียงเพราะเป็นpopup. เรื่องสิทธิ์ใช้serverauthoritative; ไม่ทำทีมPM/Lead/Devให้กลายเป็นaccessrole. Runtimeevidenceเก่าไม่ใช่การทดสอบใหม่

## W01 — Home summary and next up drilldowns
`MyOverview.tsx:16–222`, `overview-schema.ts`; actual `/api/me/overview`. Fieldsderivedmy-statuscounts/due-overdue/today/week/no-date/done7days/byproject/nextupและselfname. Jobเลือกงานวันนี้. ใช้`H.*`และ`Q.task` links; ไม่เป็นorgdashboardแม้ผู้ใช้admin. Noaddedfield. Proposednearestprojectcommitment/ownblockersเมื่อD.*จริง ไม่สร้างplaceholderhealthสด. Tilelabelและlinkต้องqueryscopeเดียว, completed7daysต่างจากcurrentDonecount. No-dateหมายถึงdueabsenceตามoverviewqueryไม่เหมารวมworkloadnodates. EmptyมีopenMyWork/projectsตามสิทธิ์; errorไม่showzero. Mobiletile2columns/nextuptitlewrap; focusheading+tileaccessiblecount; lateวันBangkokไม่เครื่องclienttimezone. ห้ามนำtaskcountทำpeopleperformance

## W02 — Navigation sidebar mobile drawer and favorites
`App.tsx:551–647,370–385`, `navigation.ts:2–26`, `favorites-api.ts`; `TaskWorkspace.tsx:622–638`. Actual10paths, favoritesfirstและsidebarprojectsfirst100ไม่fullypaginated. Fieldsorganizationname/projectnames/team/per-userfavorite; noaddedbusinessfield. เสนอ“Browse projects”เสมอ+count/moreเมื่อเกิน100 ไม่อ้างsidebarallprojectsครบ. Favoriteไม่grantread; revokedfavoritesต้องล้างหรือgenericunavailableไม่leaknameจากcache. Drawerclose/backdrop+focusreturnToggle navigation; currentpagearia-current; keyboardEscapeและroutechangeclose. UnknownorgnamefallbackWorkspaceไม่เปลี่ยนorganizationrecord. No-workspace-switcherเพราะactualเป็นsingleorganization; multi-tenantselectorเป็นexcludednewscope

## W03 — Account profile menu and sign out
`App.tsx:478–539,215–235`. Readselfdisplayname/username/presentationrole + Profile/Settings/Signout. Noaddedfield; rolelabelleadderivedไม่ได้หมายถึงprojectleadหนึ่งคน. SignoutPOSTserver, pending/offline/writablegate; errorแสดงชัดไม่เคลียร์sessionหลอกsuccess. Proposedarrowmenu/focusrestore/clickoutside/Escapeno-tabtrap; mobileavatarชื่อaccessible. SessionclearBroadcastChannelไม่เก็บperson-specificdraft/favoriteให้บัญชีถัดไป. Noextra“remember me”/accountswitchsilentnewsecurityscope

## W04 — Workspace help dialog
`App.tsx:848–854`. Contentpermissions/retry/referenceID/networkcontact. Noformfieldเพิ่ม; helpไม่เป็นticketingระบบใหม่. เสนอcopydiagnosticreferenceonlynonsecret + glossarytaskspan/target/health/accessโดยlinkเอกสาร; ไม่ให้ส่งtokens/password/attachmentcontents. UnknownerrorมีrequestIDก่อนhelp; keyboardCancel/close, focusHelpหลังปิด; mobilenowidelogs. Offlinehelpควรstaticavailableไม่dependAPI

## W05 — Notification center and mark read
`Notifications.tsx:16–241`, `report-api.ts:7–32`. N.* type/message/task_id/read_at/created_at/unread_count; Unreadonlydefaultfalse, page50, markone/all. OpenTaskEditorผ่านauthorizedGET/projectlookup. Noaddednotificationpreferencesหรือemail/SMSchannels; subscriptionchoicesเป็นnewscopeไม่assume. Jobfollowactionableupdatesไม่formalapproval. Markallreadบอกscopeallserverunreadไม่justvisiblepage; race/newarrivalไม่ลบnotificationใหม่ผิด. Failedmarkretainunreadandpersistenterror; deleted/inaccessibletaskgenericunavailableไม่leaktitle. Staleofflinebadgeและreconnectfresh; mobileitembuttonseparateMarkreadไม่นำtapไปtaskโดยบังเอิญ; focusreturnitemstableID

## W06 — Notify topbar popup
`NotifyPopover.tsx:23–156`. Latest5/unreadcount/timeago/markall/markone/open task/Viewall; reuseN.*ไม่มีfieldใหม่. Sourcecatchloadใช้onFailureแต่ไม่มีlocalerrorstateแยก จึงเสนอerror+RetryแทนLoadingค้าง. LinkOpenต้องGETtaskscopedและreadmarkpolicyconsistentกับcenter ไม่markreadเมื่อเปิดไม่สำเร็จโดยเงียบ. Escape/outsidecloseexisting; initialfocusheaderและreturnNotifyproposed. Mobileanchoredpanelclampviewportไม่เกินscreen; unseennewnotificationsbadgeไม่ทำfocusjump. NoextrafilterในsmallpopupเพราะViewallจัดการแล้ว

## W07 — Unread badge
`NotificationBadge.tsx:7–53`. Derivedunread_countGETpagesize1; noaddedfield. Unknownfailedreadซ่อนbadgesourceไม่ใช่0; proposed“count unavailable”accessiblehint/staleindicatorเพื่อแยกzero. Reducedmotionrespect; animationเฉพาะcountgrowไม่firstload. ไม่อ่านnumberซ้ำทุกrefreshด้วยliveloud; readonlynointeractionfocusunneeded; servercountไม่countlatest5local

## W08 — Teams directory
`Workspaces.tsx:384–447`. FieldsTeamname/description/archived/memberavatars/leads/ownrole, memberdetailsadminonly. Jobหาteamและresponsibility/accesscontextไม่รวมcrossprojecthiddencounts. Noaddedfield. Nonadminไม่มีmemberspayloadต้องlabelAdminonlyไม่0members; currentcardpositionsnotauthority. Createadminonly; includesarchived/paginationtoolbarsharedP01. Mobilecardtitleaccessiblebutton; cardclickไม่stealmenuclick. Emptyteamมีcreateเฉพาะadmin; failedlistdifferentempty; nofileloadingfallbackดูเหมือนข้อมูลหาย

## W09 — Team details information
`Workspaces.tsx:512–714`. Info/Members/Workloadtabs, name/description/archive/summarycount/positions/accessleads; serverdatafromlatestteam. Reuse`M.team`, jobเลือกจัดคนหรือดูload; noaddedbusinessfield. Adminedit/archive; othersreadonly. Proposedteammission/workingagreementoptionalเป็นDocslinkไม่teamformrequiredเพิ่มในphaseแรก. URL`?team=&tab=`actual; arrowHomeEndtabsimplemented. Refreshrevalidateprivileges; showAdminonlynotfakemembers0, includingtabbadgeปัจจุบันใช้members.lengthจึงrecommendแก้unavailablebadge. Mobiletabsไม่cliplabel; readonlyarchivedbannerไม่hidehistory

## W10 — Team Members tab
`Workspaces.tsx:715–728,1242–1408`. Fieldsuseractive/teamposition/teamaccess; detailsadminonlysourceguard. Noaddedfield; displaypositionPM/Lead/Devต่างจากaccessLead/Memberในสองคอลัมน์. Existingeffectiveaccesshistorynotteamrowmustnotmix. Adminonlyemptyhintnonadminไม่เสนอส่งทุกคนเพิ่มข้อมูลเป็นworkaround. Loading/error/noactiveusers/currentinactiveแตกต่าง; servercurrentversion; confirmmutationsW18. Mobilecollapsecardsแต่showbothroles

## W11 — Team Workload tab
`Workspaces.tsx:730–738,553–568`. ReuseR05/R06(W.*) ไม่มีfieldใหม่. AuthorizedAdmin/ownLead/memberP-09; currenttabsdisablewithhint; URLnotgrant. Same6weeks/threshold/partiallimits/uniquevsduplicatedsemanticsบท03. Jobreassigncapacityattentionไม่approvehours. Emptyaccessiblework≠wholeteamidle; focus/tabkeyboardandmobilealternative. Archivedteamreadpolicystaysservercontrolled

## W12 — Create team
`Workspaces.tsx:983–1033,869–900`. Requiredname100, descriptionoptional1000, initialmembersoptional≤100 (`InitialTeamMembers.tsx`); noaddedbusinessfield. Initialteampositionnotaccessrole; helperclear. Createeligibleadminonly, noautomaticprojectcreation. Serveratomicmembers/create+idempotency; duplicateuser/zeroid/failedlookupnotpartialteamassume. DraftnameThai/whitespacevalidations; pendingdisableclose; proposeunsavedguardcurrentlycallerdoesnottrackdirty. Emptydirectoryallowteamwithoutmembers; mobilememberrowsstacked. Notautoassigncreatornewresponsibilitywithoutcontractproof

## W13 — Edit team
`Workspaces.tsx:918–1068`. Reusename/descriptiononly; membersseparateW10; version/archivedderived. Noaddedfield; keepcurrentteamaccessandprojects. Conflictreviewlatestmustshowdifferencebeforeoverwrite; noautosaveonblurteamname. ArchivedUIEditinfoalreadydisabled `:654`; servicepolicyretained. Unsaved/Offline/failedsavepreserved; mobilebuttonsticky; closefocusstableteamheading

## W14 — Archive and unarchive team
`Workspaces.tsx:974–980,703–710`. Noinputเพิ่ม; confirmnameand**archiveonlyifnoactiveprojects**. Notdeleteteam/historyorcancelprojects. Showblockreasonandlinkaccessibleactiveprojectswithoutleakhiddennames/counts. Racecreatedprojectserverreject; latestteamversionrequired. Unarchiveไม่grantnewmembersหรือreactivateusers. Cancelinitialfocus; unknownreadbackbeforeactionretry; mobilesafedangerbuttonnotadjacentmistap

## W15 — Initial team members and position rows
`InitialTeamMembers.tsx:6–107`. user_id+team_positionpm/lead/devdefaultdev; maxmin(100,userslength); uniqueuserscannotdoublepick; pendingdirectorypagedall. Noaddedfield. “Lead”here**position**ไม่team_role=lead; currentadminsetupmustexplicitaccesslater. Noactivepeoplemeansoptionalempty; disabledAddexplainsreason. Removalrowlocalnotservermembershipdelete(noW18confirmationneededbeforeteamexists). KeyboardrowremovefocusnextorAdd; loadingerrorretrypreserveotherrows; mobileuserselectorfullwidth

## W16 — Team member add and edit
`Workspaces.tsx:1281–1293,1410–1565`. Fieldsselectedactiveuser/search100/page10 + positionpm/lead/dev + accessmember/leaddefaultmember; editpreloadsroles. ReuseM.*ไม่duplicatejobtitle. Noaddedfield. Existingmembersretainedwhenadding, choosingexistingdetectsrole; Review&Savestepnotimmediatemutation. Accessleadgrantmustexplicitnotdeducedpositionlead. Currentmemberinactivekeepdisplaybutnewselectionactiveonly. No-matchnotemptyteam; 409refreshthennewreview; dirtycloseguardproposed; mobileformreviewdeltaclear

## W17 — Team member more menu
`Workspaces.tsx:1341–1357`. Removememberactiononly; noaddedfield. Positioneditingseparatebutton; menunotpassword/securityshortcut. Disabledpending/conflict/maintenanceexplain; Escapeoutsidecloseandfocusrow. Proposedsharedmenuclosingselectorincludes`.team-member-menu` (Appoutsidehandlercurrentlylistsotherclasses) ต้องtestnotclaimbrowserbug. Nonadminmustnotreceivehiddencontrolsdata

## W18 — Team member review and removal
`Workspaces.tsx:1567–1603`. Noinputใหม่; name/access/positionold→new, removeconsequenceopenassignmentscleanupandexplicitprojectaccesssurvives. Rolechangecompareต้องไม่ใช้positionแทนaccess. Noimpactcountclaimwithoutendpoint. Sensitiveaccessrevocationไม่blockbybusinessleadrequirement(D03) ให้attentionflagหลังrevoke. Pendingerrorreviewidentitylocked/versioncheck; successreloadselfpermissionsandmemberlist; modalCanceldefaultfocusafterrerenderfallback. Noautomaticdeactivationofaccount

## W19 — Project Docs list read trash
`ProjectDocs.tsx:273–319,122–143`. D.Docsummarytitle/createdupdatedpeople/times/deleted/version/can_edit/delete/restore; Showtrashfalse; listmax1000. Jobหาข้อมูลbrief/decisionไม่ต้องparsecomments. Noaddedfield; optionaldocpurpose/tagdeferจนต้องfilterจริง. SourceNewdocpersistsUntitledทันทีไม่localdraft(`:169–188`) ต้องบอกผลและavoidjunkdocsbyproposedtitle-firstcreation. Listreadfailไม่spinnerforever; loadselecteddocpendingownstate; no-matchvstrash-empty. ViewersreadcurrentHTMLsanitizedserver. Sourceopenanotherdocresetselectedไม่มีdirtyguard; recommendsharedguardbeforeselection/route. Mobilelist→docbackpreserveselection

## W20 — Doc editor and new document
`ProjectDocs.tsx:145–188,321–360,441–452`; `src/services/docs.ts:35–126`. FieldsDoc.title200required/body_html≤1000000UTF16 and sanitizedtext_length≤200000, version; defaultnewUntitleddoc/<p></p>. Noadded“requiredapprover”form; **Docsไม่formalacceptanceworkflow**. Writableprojectnonviewerandcan_edit, editsservercheck; otherdoceditallowswriterpercommentservicebutdeletionown/P-05. ใช้serverflagsไม่jobtitle

ExplicitSave/Cancel, wordcount/remaininglimitsproposed; dirtytrackingmustcomparetitleandHTMLnoteditingbool; routenavigate/selectdoc/imagerefreshmustnotloserange/draft. 409preservebothandexport/copyplaintextsafe—notblindrefreshselected; unknownackreadback; sanitizationchangesแจ้งไม่claimserveracceptedeveryformat. Offlineeditsไม่durable/autosave; noindexedDBsecretcacheเพิ่ม. Mobiletoolbarwrap/editorfont16+keyboardSavevisible; imagealttextproposededitorcontentattributeไม่separateDBfield

## W21 — Doc formatting toolbar and snippets
`ProjectDocs.tsx:68–78,220–224,393–438`; `doc-snippets.ts`. H1/H2/H3/Bold/Italic/bullet/number/code/quote/checklist/table/image/link commands; noaddedrecordfield. `execCommand`deprecatedactual; serverHTMLsanitizerboundarynotclientDOM. Proposedaccessibletoolbararrowkeys/pressedstate/undoredoaseditorbehavior; notnewcollaborativerealtimeengine. Formattingmustnotauto-save; preservecaretwhenpopup; pasteexternalHTMLcleanserverandshowunsupportedwarning. DocchecklistnotTaskchecklistไม่gateDone. Mobileoverflowtoolsaccessiblebuttonnotcutoff; noexternalpaidCDNeditorrequirement

## W22 — Doc link browser prompt
`ProjectDocs.tsx:430–435`. Actual`window.prompt('Link (https:// or mailto:)')`, optionalURL; noDBfieldนอกbody_html. **เสนอreplacewithsmalldialog** URL+optionaldisplaytext/validation+Cancel/Insert, requiredonlyoninsert, defaultblankorselectedlink; permittedhttps/mailtoagainstsanitizer, rejectjavascript/data/credentialURL, noautofetch. เนื่องจากactualnativepromptไม่มีfulla11ycontrol จึงแยกproposednotimplemented. Focusreturnsavedselection; Cancelไม่overwritecontent; mobilekeyboardURLtype. Notmandatorycitationfieldทุกdoc

## W23 — Doc project image insertion picker
`ProjectDocs.tsx:225–260,456–470`. Actualprojectfilesfirst100filteredactiveimageMIME, path/name; existingdownload_pathrestrictsameAPI. Noinputใหม่บังคับ; **propose** search/pagination+alttextoptionalwithpurposehintแทนfilenameassumption. Sourcefirst100อาจหาimageหน้าถัดไปไม่เจอ—sourcecapacitygapnotnewruntimebug. NoeligibleimagesCTAuploadเฉพาะauthorized; loading/errorseparate. RetaininsertAtRangeandinsertหลังmodalcloseเท่านั้นsourceมีdelayไว้; serverrevalidatesameprojectreference/deletion. NoexternalsignedimageURLsilentrewrite; mobilethumbnailwithname/status

## W24 — Doc version history
`ProjectDocs.tsx:31–47,378–388,473–484`. Fieldsversion/title/body_html/edited_by/time; actualUIแสดงhistorysummary ไม่versiondiff/restorebuttonอัตโนมัติ. Noaddedfield. Proposedpreviewread-onlysanitizedversion/diff, restoreseparateversionedaction **newscope** ไม่claimcurrenthistoryrestores. Max1000capsvisiblelimitation. Errorretrydon'tclosecurrentdoc, emptynohistorylabel; viewersrightsserver; mobilehistorylisttimestampswrap; focusHistoryuponclose

## W25 — Doc trash confirmation and restore action
`ProjectDocs.tsx:191–218,361–376`. Deletehasconfirm; restorecurrentlydirectactionไม่modal. Noinputใหม่/noadditionreasonmandatory; name+retention30days+linkreferencesmaybreak. Noautoarchiveprojectorfiles. can_delete/can_restoreserver/ownorP-05/retention/version/archived; serverexpirewins. Unknownreadback; focusnextdoc/listafterdelete, restoreselecteddocstatusread-onlyifarchive. Unsaveddraftmustreviewfirst; proposedguardnotimplementedsource

## W26 — Project Files combined source list and filters
`ProjectFiles.tsx:12–39,62–114,202–350`. F.*aggregateprojectfilesandtaskattachments, q100/typeimage/pdf/document/other/sourceproject/task/both/includeDeletedfalse/page25. Jobfinddeliveryevidencewithoutuploadduplicate; `source:id`compositeidentityสำคัญเพราะIDsคนละtableชนกันได้. Noaddedfileapprovalfield; linkpurposeviaDocoracceptancerefaftermodelจริง. Filterresets page and stableidentity; no-matchClearvsnofilesUploadตามrights; errornotspinnerendless. Metadatauploader/time/size/validatedtype/source/tasktitle/capabilitiesไม่useextensionalone. Mobilenamewrapandsourcevisible; deniedfilegenericunavailableไม่leakprivatefilename

## W27 — Project file upload chooser
`ProjectFiles.tsx:116–136,255–271`. ReuseF.binary1byte–10MiB/typesกับT19; source=projectnotautoattachselectedtask. Noaddedfield; nofolder/tagmandatory. NativefilechooserCancelnoerror/noemptyupload. ExistingfetchuploadnoprogressasrichasTaskCollaboration; proposeconsistentprogress/cancel/unknownintent. Contentvalidationserver/quotaatomic; unsupportedfileinlineactionable. PendingbuttonUploadingnotproofserverpersisted; mobileSafarichooser/unreliablebackgroundneedsreturnrefreshandretainfilenameonlynotsecretblobpersist

## W28 — Project file image PDF preview
`ProjectFiles.tsx:138–158,352–357`. OnlyimagePNG/JPEG/WEBP/PDF previewable; blobURLdownloadscoped. Noaddedfield; notdocumenteditingorviruscleanclaim. Proposedloading/error/downloadfallback/previewunavailable; CSP/sandboxPDFseparateproductionsecurityreview. ClosemustrevokeObjectURL(sourcecleanupverifyimplementationinPR); focusoriginalfileentryafterfilterchangesfallbacklistheading. 360pxPDFnotforceunreadablefixedframe; filename/titleandDownloadalwaysaccessible. Noexternalthirdpartyvieweruploads

## W29 — Project file delete confirmation and restore
`ProjectFiles.tsx:171–199,312–332`. Deleteconfirms, restoredirect; usecompositeidentityandsource-specificAPI. Noinputเพิ่ม; message30dayretention/storageuntilcleanup. serverflagsforown/P-06notallwriters; taskattachmentfromcombinedlistmustsamepolicyasT20. Raceparentdeleted/fileexpired/changedaccesssafeerrorandrefresh; nofileorphanedassertwithoutserverproof. Canceldefault; postremovefocusnextentry; mobileactionseparatePreview/Download/Deletemin44pxrecommended

## Coherent PRs / acceptance
1. **PR-W1 navigation/notificationtruth**: paginatedsidebarorMore, unknownbadges, localpopupRetry, scopedreadmarkanddeep-link, drawer/menua11y. Tests>100projects/revokedfavorite/newnotificationduringmarkall/offline/gettask403/longThainame/keyboard/mobile; noaccesschanges
2. **PR-W2 teamsclarity**: positionsvsaccesscopy, unavailablemembersbadge, memberdiff/confirmation, unsavedEntityDialog, menuclose/focus. TestsinitialLeadpositiondoesnotgrantLeadaccess/explicitprojectaccesssurvivesremoval/lastleadcurrentpolicy/serveractiveprojectarchiveguard/409/version/raceremoval
3. **PR-W3 docreliability**: title-firstcreate, dirtyguard, conflictdiff, boundedimagepickerpagination/linkdialog/caretrestore/sanitizererrors. TestsrawHTMLmaliciousURL/pastedcontent/IME/200000textlimit/1000000bodylimit/permissionloss/historyread-only/nestedpopups360px. Doesnotaddformalapproval/realtimemerge
4. **PR-W4 fileparity**: uploadfeedback/unknownrequesthandling/compositeIDs/previewfallback/capabilityflags. Testextensionmismatch/0byte/10MiBboundary/quota/invalidzip/servercancelrace/30daycutoff/revokedparent/P-06/duplicatedsourceID/mobile; cleanupbytes/productionguardแยกoperationsgate
