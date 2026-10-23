> **Historical proposal snapshot v1.0 — ไม่ใช่กติกาที่อนุมัติทั้งหมด:** source `94282b6` (Windows staging PR #1), ไม่ใช่ main `4a0b76b`. ข้อความเก่าที่ว่า D01–D12 ยังไม่อนุมัติ / acceptor optional / baseline deferred ถูกแทนด้วย [decisions](../delivery-decisions.md) และ [rules](../delivery-rules.md). รายละเอียดอื่นเป็นข้อเสนอเท่านั้น; ไม่มีผลทดสอบ runtime ใหม่. ดู [provenance](../audit/README.md).

# 05 — Admin / Access / Auth / Settings / Trash / PWA

> **อัปเดตการตัดสินใจ:** โซยืนยัน D01–D12 แล้ว ดู [คำตอบที่อนุมัติ](../delivery-decisions.md) ซึ่งมีผลเหนือคำแนะนำหรือข้อความ “ยังไม่อนุมัติ” ที่ขัดกันในร่างนี้ โดยเฉพาะผู้ตรวจรับต้องระบุชื่อจริงก่อนเริ่ม และต้องเก็บแผนตั้งต้นเมื่อยืนยันเริ่ม ข้อเสนอ field/กติกาย่อยนอกคำตอบยังไม่ถือว่าอนุมัติทั้งหมด และยังไม่ได้ implement


**Design source review, ไม่ใช่securitycertification/productionapproval**. HEAD94282b6; ไม่มีbrowserQAใหม่. Fields `A.* M.* U.* O.* N.*` และ sharedUX01–09 อยู่ [00](00-data-model-and-coverage.md). Everypermissionchangeต้องผ่านexistingserverrules; noautomaticgrantfromjobtitle/businesslead/classification. Newdesignไม่แก้passwordpolicyหรือลดguardโดยอ้างUX

## A01 — Admin five-tab container
`AdminCenter.tsx:33–68`; `App.tsx:817–824`. Members/Teams/Job titles/Permissions/Registrations; TeamsreuseW08–18, ไม่สำเนาสิทธิ์. Jobคือจัดidentityและaccessอย่างตรวจสอบได้. Noaddedfield. Adminguardnotonlynavigation; unauthorizedroutegenericdenied. ProposedURLtabrestore/arrowkeys+aria-controls; localtabdefaultMembersจริง. Dirtypermissionmatrixต้องguardtabs/route ไม่lostchangesเมื่อunmount; loadspersectionnotallorgdatatoviewer. Mobilescrollabletabs+stickyheading/rolecontext

## A02 — Organization users directory
`Users.tsx:23–292`. FieldsA.useridentity/contact/orgrole/jobtitle/active/teams; q100, activestatusall/true/false, titlefilterinclinactive, page10. Generatedusername`member.<32hex>`ซ่อนเป็นEmailsign-inไม่ชื่อmemberผิด. ActionsEdit/ActivateDeactivate/Reset; pendingregistrationmustreviewinRegistrationsไม่directactivatebypassreview(sourceunreviewedIDsfetchpending/rejectedfirst100capacitygap). Noaddedfield; proposedfullscopedreviewlookupnottruncatedheuristic. Jobmatchingpersonandaccount. Noresults≠nouser; errorretry; mobileprofilecardswithactiveandrolevisible. ContactPIInotnewreportmetric; noexportallusersbuttonเพิ่ม

## A03 — Add user
`Users.tsx:388–402,418–431,452–462,530–642`. Fieldsusername1–60patternA-Za-z0-9._-, MemberName1–100trim, Emailoptionalvalid≤254, Teloptional≤40pattern, OrgRolememberdefault/admin, optionaloneTeam(addDev), TempPassword6–128Unicodecodepoints. **JobtitleเลือกเฉพาะEdit branch** ไม่ส่งCreateUser; อย่าclaimสร้างพร้อมtitleแล้ว. Allrequiredcreateusername/name/temp; roledefaultmember; teamblankไม่autoassign. Noaddedfield; helpertemporarymustchangefirstsignin. Admincreateonly; adminpasswordconfirmationเฉพาะresetไม่create. Duplicateidentity/contactvalidationinline; stablecreatekey; lostackrefreshdirectorybeforeduplicatecreate; secretclearonclose/completeไม่persistdraft. Proposedunsavedguardnonsecretfieldsonly; mobilepasswordvisibilityaccessibleandautocompletecorrect

## A04 — Edit user
`Users.tsx:433–444,463–472,530–623`. Fieldsdisplayname/email/tel/org_role/job_title_idnullable/version/optionalteamadd; **usernameimmutable**, currentteamsretained; selectingteamaddsDevไม่replaceallteams. Jobtitleinactiveคงexistingได้แต่ห้ามnewassigninactiveตามserver. Noaddedfield; anybusinessaccountableleadbadgeเป็นderivedfutureD.*ไม่elevateuser. Rightsadmin, rejectself-rolechange/lastactiveadminตามauthoritativeservernotUIguess. Permission/rolechangesmayrevokesessions; showconsequencebeforeConfirm. 409loadlatestpreservesdraftcomparewholeformnotblindreset; privacyrevokecloses. Dirtyguardandfocusafterlistreload; mobileteamchipsnotoverflow

## A05 — Activate and deactivate account
`Users.tsx:388–451,474–475`. Payloadactivebool+version; noaddedinput. Confirmidentity/current→newstatus/historicalretention/session&openassignmentimpact. **Registrationapprovalไม่เท่ากับgeneralactivation**; useA13firstwhenpending. Do notrequirebusinessleadreplacementbeforeemergencydisable(D03); markunassignedattentionafter. Lastactiveadmin/selfguardretained, samevalidationserver. Unknownresultlookupbeforetoggleagain; expiredaccessnotretryloop. Cancelinitialfocus; mobileseparateactivate/deactivateexactlabelnotambiguousActivatefilter

## A06 — Reset user password
`Users.tsx:445–450,474–475,627–644`. Requiretemp_password6–128codepoints + **actoradmin_password1–128** anduser.version. Noaddedsecurityquestions/emailrecovery. Explainmustchangeonnextsignin + currentsessionsrevoked(sourcecopy). Showtargetidentityneverprepopulatesecret; autocompletecurrent-passwordvsnew-password; pasteallowed; nosecretinlogs/analytics/localstorage/report/screenshot. Failedreauthclearadminsecretperpolicyandshowgenericerror; rate limitdisplayretry; lostackdon'tresetagainblind. Modalbusyclosepolicy/Cancelfocus; mobilekeyboardnotcoverconfirm. ProductionpolicystrengthreviewseparatefromUXrecommendations

## A07 — Job titles catalog
`AdminCenter.tsx:71–145`, `admin-api.ts:7–21`. Fieldsname/color/active/user_count/sort_order; version/systemtimes. Jobtaxonomyforpeoplepickers/workload/reports **notpermissions**. Noaddedfield. Inactivehistoricaltitlevisibleandnoharddeletebuttonactual. EmptyAddauthorized; failedloadhasRetryproposedratherthanLoadingforever. Sort0..10000notrankperson; colorhaslabelandcontrast. Mobileliststatusvisible; aftereditreturnstabletitleentry

## A08 — Add and edit job title
`AdminCenter.tsx:147–246`. TitleName1–50, colorhexdefault#579bfc, sortint0–10000default0, activeeditcheckboxdefaulttrue; Createpayloadwithoutis_activeifcontractdoesnotallow. Noaddedfield. Nameunique/casepolicyยึดserverไม่inventclientuniqueness; descriptionunuseddefer. NoautotickP-01–P-10forPMtitle. Fielderrorsmapping, conflictlatestreviewproposed, idempotentcreatekeyretained; dirtycloseguardproposed. Inactivatingneverremovesexistingusers'labelsหรือrights; helperexact. Mobilecolorpickerfallbackhextext+label

## A09 — Permission matrix filters and bulk preset
`AdminCenter.tsx:278–584`; `src/services/permissions.ts:12–43`; `admin-api.ts:22–47`. FieldsuserID→setP-01…P-10 +permissions_version, team/jobtitlefilters, selecteduserslocal; catalogscope/description/preset_pm_smderived. Existingpresetcatalogallpresettrue (source) **label“PM/SM”ไม่แปลว่าpermissionautomaticfromtitle**. Jobadminรู้who-can-do-what. Noaddedfield. Ownrowuneditable; bulkonlyexplicitselectednotfilteredallbyaccident; selectedcountscope+reviewdelta. Teamfilterhiddenmembershipadminonly. Max100changescontractดูmatrixpayload; >100userschunkingต้องชัดpartialไม่silenttruncate

Draftreset/cancelneedsconfirmifdirty; noautosavecheckboxgrant. Staleusersidentifiedseparately; serveratomicity/partialsemanticsต้องcontractproofไม่assumeall. Proposedrowstickylabels+compactperuserpermissioneditorfornarrowmobile; colorcheckboxnotonlymeaning. Revokedadminabort/losedraftsecurely; readcatalogerrorretry. PermissionsgrantisnotprojectmembershipandmanagerappointmentneedsprojectkeysperP07

## A10 — Permission changes review
`AdminCenter.tsx:585–624,348–387`. Noinputเพิ่ม; listuserandadded/removedkeys + scope consequences + sessions/reassigncleanupตามservereffects. Reviewcountactualchangesnotselectedcount. Cancelinitialfocusandreturnsamematrixcell; confirmdisabledpending/offline/maintenance. Concurrentpermissions_versionfailswithstalerows; keepotherdraftsbutrequirefreshreviewnotblindapply. No“SelectallPM”shortcutfromjobtitle. Securityauditserveractor/time/requestidnotuserenteredreasonrequiredwithoutapproval; optionalchangereasonnewscopeD08notreusebusinesschangeapproval

## A11 — Permission catalog meanings
`AdminCenter.tsx:572–581`. Readcatalogkey/label/description/scope; nofieldเพิ่ม. ExactP-01metadata/noarchive;P-02groups;P-03editor/viewermembershipnotmanager;P-04others'taskdelete/restore;P-05others'docs;P-06others'files;P-07overview/reports/CSV;P-08createprojectinmemberteam;P-09teamworkload;P-10teamreports. Scopealwayswithactualrole/projectaccess. Expanddisclosurekeyboard; mobilewraplongdescriptions; catalogunavailableไม่แสดงguessedprivileges

## A12 — Registrations review list
`Registrations.tsx:7–137`; `registration-api.ts:2–21`. Fieldsdisplayname/email/statuspending/approved/rejected/version/created/reviewed; statusdefaultpending, Alloption; page20. Jobvalidatebelongsorganization **emailownershipunverified**. Noaddedmandatorydepartment/team/managerfieldsที่publicsignup; identityverificationoutsideapphumanprocess, notclaimSMTPverified. No-matchvsno-pending; failuresretrywithoutclobberfilter; mobilecandidateidentityfullyvisible. Approveallowsigninonlynotteam/projectgrant; rowdecisiononlypending

## A13 — Approve or reject registration
`Registrations.tsx:139–203`. Inputdecisionfromaction+version+idempotencykey; noaddedfield. Showapplicant/emailunverified/alloworremainunablelogin + explicitaccesslater. **Optionalproposedinternaldecisionnote≤2000** onlyifownerauditneed, notrequirePIIreasonorpubliclyexposerejection; deferreddefaultnoaddition. Conflictnewstatusreadbackdon'tapprovealreadyrejectedwithoutfreshpolicy. Unknownsamekey/GETstatus, noapprovedtoastuntilack. Pendingpreventclose, Canceldefaultfocus; mobilefullemailwrap, noauto-teamassignment

## A14 — Settings section navigation
`App.tsx:45–56,741–795,860–890`. Profile/Password/Appearance/Organization; URLsectionretained. Noinputใหม่นอกchildforms; noorgswitch/tenantcreate. Currentprofile readonly; nonadminorgreadonly. ProposedURLbackforwardsectionstateconsistent(currentstateinitializedURLbutchecknavigationupdates). DirtyPasswordsecretsnotsavedwhenchangesection; safeconfirmwithoutsecretpreview. Keyboardnavaria-currentfocusheading; mobilelistdropdownifneededbutnotnewpermissions

## A15 — Profile read-only
`App.tsx:745–770`. Name/username/orgrole/avatarinitials; “Contactadmin”currentnoeditprofile. Noaddededitablepersonalfields; email/telephonealreadyadminmaintained ไม่ยัดทุกข้อมูลลงpublicprofile. Businessjobcheckidentity/accesscontext. Showaccountroleversusteampositionsnotinterchangeable; copyusernamebuttonoptionalpresentationnoDB. Offlinecachedidentitystaletelluser; sessionexpiredmustclear. MobilelongThainamewrap; avatarinitialsnotsolelabel

## A16 — My permissions read-only
`AdminCenter.tsx:627–661`. Jobtitlelabelonly + disabledcatalogcheckboxestickedfromself.permission_keys. Noaddedfield; neitherrequestaccessworkflownorcapabilitytoggles. Proposedplaintextlistwithscopeexplanationsandcontactadminforrequest; effectiveprojectrolecanmakeaccessdifferentfromgloballytickedkeys. Catalogloadingerrorretryproposed; noemptymeansnoneuntilsuccessfulread. Keyboarddisabledcheckboxesneedreadabletextnotfocustrap; mobileverticalcards

## A17 — Password change required and voluntary
`Auth.tsx:138–242`, `auth-policy.ts:2–33`; `App.tsx:709–716,772–779`. FieldsCurrent1–128codepoints/New6–128/Confirmmatches, visibilityboollocal. Requiredforall3submit; confirmnotstored; passwordsnottrimmed. Currentpolicy6minimumเป็นfactnotendorsement. Noaddedpasswordhint/securityquestion; strengthmeteroptionaladvisorydoesnotdivergebackendlimits. Mustchangegateblocksotherpages, voluntaryinsettingssameform. Servernewsession/selfupdateandcross-tabchange handledbyApp; noauto-loginfromfakeack. Invalidconfirmationinline+focus,429retrygenericwrongpassword, offlinenosubmit; clearsecretsafterresult/unmount. Noofflinepasswordqueue. Browserpasswordmanagerautofill/paste/IME/Unicodecodepointtest; do notlogcredential

## A18 — Appearance motion preferences
`MotionSettings.tsx:6–52`, `preferences.ts:6–23,46–55`. Existingreduce_motionfalse/confettitrue, column_widths{}60–800, hidden_tabs[]persistedcontractbut **nohidden-tabsettingsUI actual**. TwocheckboxesonlyReduceanimations/CelebrateDone. Noaddedtheme/languagepicker. Own-userwritesonly; systemprefers-reduced-motionwinswhereimplementedbuttestCSS/jsnotassume. SourceoptimisticpublishbeforeAPIwithnorollbackfailure→proposepersisted/pending/failedindicatorandrevertorRetry. Offlinepreviewifofferedmustsayunsavednotpersisted. Mobilelabeltapcheckbox, noforcedanimations; widthpreferencesnotbusinessdataandnotgranttabs

## A19 — Organization name and workload threshold
`Organization.tsx:9–208`, `organization-api.ts:2–14`. Name1–100required, thresholdint1–1000required(defaultserver10;notutilization%), timezoneAsia/Bangkokreadonly, version. Nonadminreadonly; admineditwithlatestreviewcheckbox/dirtyexternalupdate. Noaddedtimezone/capacitycalendarfield; differentworkloaddomainD06separate. Helperthreshold“open taskcountperweek: highlightonlywhenexceedsN” e.g10notred,11red. Namesrenamedoesnotrenamesingletenant/securityscope. Invalid0/fraction/max1001inline;409retainname+thresholdshowdiff; offlineblocked; mutableformdirtynavigationguardproposed; mobiletwostackedfields

## A20 — Login and password visibility
`Auth.tsx:13–136`, `auth-policy.ts:14–26`. UsernamefieldactuallyacceptsusernameORemail254; password1–128; showpasswordlocalfalse; requiredboth, blankdefaults. **เสนอlabel“Username or email”** notnewfield. LoginratelimitretryAt/Retry-After; invalidcredentialsuniformincludingawaitapprovalnotenumerateemail. NoaddedRememberme/SSO/OTP/sendingemailclaims. Passwordvisibilitybuttonaria-label; autocompleteusername/current-password; pasteallowed. Offlinesigninnotavailable; metasetup/APIoutagevsinvalidcredentialsseparate. Preserveidentifieronfailuresecretsminimal; returnafterloginonlyauthorizedpath; mobileartworkdecorativeavoidcoverform. Noaccountcreationsuccessmeansloggedin

## A21 — Sign-in help
`Auth.tsx:121–127`. Noinputเพิ่ม; contactadminforforgotten/inactiveaccount. NoexistingemailresetlinkorOTP; proposedcopyorganizationnetwork/admincontactonlynonsecretifconfigured. Helpnotaskpassword. Offlinehelpstatic; focusreturnNeedhelp; nativecloseEscapetoplevel, mobilefit. Do notturninto“sendresetemail”withoutSMTP/securitynewscope

## A22 — Public account registration
`Register.tsx:8–18,19–147`. Membername1–100, emailvalid≤254, password6–128codepoints, confirmmatch, noorg/teamselection. Requiredall; noautojobtitle/role. POSTregisteruniformacceptedmessagependingapproval; emailownershipnotverified. Noaddedbusinessfields. Duplicate/retryresponsemustnotenumerateaccount; stableintentkey+retry429countdown; secretneverwriteoutput/evidence. Offlinenosubmit, pendingBackdisabled, successBacktosigninnotautoenterworkspace. Validationfocusfirsterror; unapprovedusercan'tsigninevenknowingpassword. Proposedclear“adminapprovalrequired”beforeformandaftersuccess; nofakeverificationcheckmark

## A23 — First-time administrator setup
`Setup.tsx:5–157`, `setup-policy.ts:2–34`. Setup token32–128trim; Organizationname1–100nonblank; Adminusername1–60pattern; Displayname1–100trim; Password6–128codepoints. Requiredall, emptydefaults; tokenfrominstallerconsole **notbrowser-generatedsecret**. Noaddedconfirmpasswordinitiallyoptionalproposalbutnotrequireapplicationcontractfield; passwordmanagernew-password. Sourceclearstoken/passwordbeforesend; failuresneedreentryexplainednotlostsecretbug. MetaalreadyconfiguredracehandledGET; invalidtoken/429/unavailabledistinctsafeerror. Onlineonly/HTTPSorlocalhostproductionguardseparate. Setupnotnormalcreateworkspace; tokenmustnotappearlogs/screenshots/docs. Mobiletokenpaste, errorfocus; requestidentitysameintentforunknownandconfirmconfiguredmetanotcreate2admins

## A24 — Setup complete or already configured
`App.tsx:677–703`. readonlyresultcreated/existing; Signinbutton; nofieldเพิ่ม/noautosignin/nohiddenadminpassworddisplay. Jobconfirmsetupstateandnextstep. “Alreadyconfigured”doesnotclaimthisactorcreatedadmin; preservegenericnetworkerrorwhenmetacannotconfirm. Focusstatus/Signin, mobileonecolumn; don'tretainsetupsecretsinclienthistory; reloadmetaconsistent

## A25 — Task Trash directory
`Trash.tsx:7–168`, `task-api.ts:89–93`, `src/services/tasks.ts:948–962`. FieldsT.*readonly+serverrestore_before, deleted_at/by/project/status; pagination20, livecountdown. Jobrecoveraccidentaldeletion; onlyscopedadmin/lead/authorizedP-04service; navigationleadrestrictionactualnotassumemanagercanfindpage. **No permanent delete UI** andglobalTrashisTasksnotdocs/files (thoseowntrash). Noaddedfilterfieldsfirstphase; proposedprojectfilteronlyifserverqueryapproved. Expiredcan'trestore; clientclockdisplaynotauthority. Emptyvsdenied/errorseparate; offlineviewstale/noaction; mobiletitles/project/deadlineandRestorevisible

## A26 — Task restore confirmation
`Trash.tsx:170–197,58–86`. Noaddedinput; title/project/originalstatus/cutoff + “returnsendoforiginalstatuscolumn; archivedprojectread-only”; accessiblelinkeddatarevalidate. Restoredoesnotregrantlostassigneesorcreatesuccessoragain; servicepolicytestsneedednotassumeexactrestoredassignees. Serverversion+retentioncurrenttime; expiredwhilemodalopenfriendlyerrorandrefresh. Pendingdisableclose/doublepress; stableintentidentityid:version; focusnexttrashrow/headingafterrestore. Noautomaticunarchiveprojectoractivateaccount

## A27 — PWA install instructions and browser install offer
`Pwa.tsx:9–18,31–75`. NoDBfield; modefloatingbeforelogin/settingssignedin/update-onlyshell. Actualbeforeinstallprompttriggersbrowserprompt, fallbackmanualbrowser/sharemenu, HTTPSorlocalhostavailability. Noinstallpermissiongrant/noofflinewritescapabilityadded. Proposedshowinstalled/dismissed/erroroutcomeaccessible; sourceclearseventregardlesschoice, browserpromptisexternalnativepopupcannotpromisecustomfocusinternals. MobileSafariAddtoHomeScreeninstructionsaccurateconditionalnotfakeInstallbutton. Nopaidinstaller; serviceworker/browsersecurityseparate

## A28 — PWA update-only shell (no update notice)
**แก้candidateinventory:** `Pwa.tsx:19–24,57–75` registersserviceworkeronlysecurecontext/nonDEV; `update-only` rendersasidewithoutinstallpanel. **ไม่มีUpdateavailabletoast/Reloadbuttonในactualcomponent**; comment`:6–7`กล่าวwaitingupdatesapplyafterallwindowsclose. Noinputและไม่มีpopupเพิ่มในการinventory; entryนี้เป็นbehaviorbranch/sharedshellเพื่อไม่ทิ้งgaps. เสนอoptionalupdatenoticeonlyifworkerprotocolsupportedและdirtyguardallformsready, noforcedreload. Offlinecacheไม่เท่ากับofflineediting; productioncache/securitytestseparate, nofreshbrowserclaim

## A29 — Offline reconnect maintenance session gate
`App.tsx:75–123,237–305,666–673`. Stateonline/writable/reconnecting/maintenance/mustchangepassword/broadcastsession. Noaddedbusinessfield. Existingofflinesavingunavailable; reconnectwaitme+refreshreadersbeforeenablewrites; unknownnetworkmustnotqueuehiddenwrites. Proposedpersistentbannerwithlastsuccessfulread/retrystatus+unsavedlocaldraftwarning. Sessionexpiredclearsauthorizedcontentandsecrets;403refreshpermissionsnotfakesuccess. MaintenanceUIseparatefromserverguard; keyboardstatusannouncementnotstealfocusonpoll; mobilebannerdoesnotcoverstickySave. Testtwo-tabslogout/passwordchange/networkflap/failedreader/hiddenwindow/timeoutrace—notexecutedhere

## A30 — Denied route and not-found fallback
`App.tsx:725–726,825–830`, `navigation.ts`. Contentpagefoundbutdeniedvspathunknown; forcedpassword/setup/authpriorguards. Noinputเพิ่ม; NextstepHome/MyWorkifauthorized orcontactadmin. NeverofferGrantaccessbuttonselfservice. Deep-linkproject/taskactualregex`:400–408`redirectsquerybuttaskGETenforces; malformedIDsnot“repair”intovalidtarget. Unknownroutecannotleakprojectexistence. Error/loading/Suspensefallbackseparate; focuspageheadingonroute; mobilelongURLmessagebounded; offlineunknownnotclaimed404fromnetworkfailure

## Admin/auth roadmap and acceptance
**PR-A1 clarity/reliability**: usernameoremaillabel, unknownloadRetry, nonsecretunsavedguards, matrixdiff/stalereview, exactteamadditioncopy, readonlylabels. Testselfeditguard/lastactiveadmin/matrix>100/first100registrationgap/pendingreviewnotactivatebypass/rolesvspositions/keyboardfocusaftermutation; noauthorizationexpansion

**PR-A2 authresilience**: setupduplicate/registrationuniform/loginrate-limit/sessionclear/passwordmanagera11y/secretlifetime. TestsUnicodecodepoints6/128/nottrimsecret/invalidsetup32–128/429RetryAfter/offline/lostack/two-tabs/mustchangepassword/readonlyroutes. Securitypasswordstrength/sessionexpiration/CSP/CSRFstillseparateauthoritativegates; do notweakenforUX

**PR-A3 settings/trash/PWAtruth**: optimisticpreferencefailurehandling, workloadthresholdclarity, partialupdatecommunicationafterapprovedworkerdesign, retentionservercutoff. Tests0/10/11/1000/1001threshold/fraction/clockskew/expiredrestore/archive/readrevoked/typedpreferenceslimits/deniedinstall/unsupportedbrowser/dirtyupdatenoreload

ทุกPRมีcontract/provider/browseracceptanceตามglobalmatrix; รายการtestเป็น**ต้องทำในimplementation ไม่ใช่ผลPASSรอบนี้**. ไม่commit/push/deploy, ไม่VPS/live-data, ไม่externalemailหรือcredentialsผ่านchat
