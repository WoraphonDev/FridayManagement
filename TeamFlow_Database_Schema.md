# FridayManagement — Physical database schema

วันที่: 6 ตุลาคม 2026 · T-007 High · Baseline1.1 + RD-01–RD-08 · SRS§5/API Contract§7

`0000_foundation.sql` ไม่เปลี่ยน; `0001_business_schema.sql` แยกSQLite/T-SQL มี24business/support tables รวมrate_limit_bucketsจากAPI Contract§8 + schema_migrationsเดิม =25application tables. ไม่สร้างorganization/user/defaultpasswordจากmigration; สร้างเฉพาะstorage_quota(id1,stored0,reserved0) แบบatomic

| กลุ่ม | Tables / ขอบเขต |
|---|---|
| องค์กร/บัญชี | organizations, users, sessions, teams, team_members, projects, project_members |
| งาน/board/history | tasks, subtasks, board_columns, board_positions, comments, attachments, task_events, admin_events |
| แจ้งเตือน/recurrence | notifications, recurrence_events |
| durable coordination | idempotency_keys, user_view_revisions, storage_quota, upload_reservations, file_cleanup_queue, maintenance_state, rate_limit_buckets |
| migration ledger | schema_migrations (id=filename/version, sha256=checksum, applied_at); physicalnamesเดิมคงcompatible ไม่เพิ่มduplicateversion/checksumcolumns |

## Types และ invariant

Public entity IDs/versions/auth_version เป็นpositiveINT≤2147483647; SQL INT IDENTITY(1,1), SQLite INTEGER PRIMARY KEY AUTOINCREMENT เพื่อไม่reuse IDsที่purgeแล้ว ไม่มีreseedcommand. Application versionแยกจากSQLrowversion; mutationincrement/expected-version rulesเป็นงานT-008และfeatures ไม่ใช้triggerincrementอัตโนมัติ

SQL DATEสำหรับdate-only, DATETIME2(3)สำหรับUTCms(defaultSYSUTCDATETIME); SQLite canonicalYYYY-MM-DD/ISO UTCms TEXT พร้อมdeterministic calendarchecks (rejectyear0000/impossibleday/offset/noncanonicaltimestamp). SQL adapterเปิดuseUTCและอ่านDATE→YYYY-MM-DD/DATETIME2→ISO UTCms/BIT→0|1ผ่านportเดียวกัน; DTOแปลงboolโดยfeature. Purecodecchecksไม่แทนactualSQLserializationevidence

SQL Unicodeใช้NVARCHARและDATALENGTH/2เพื่อUTF16codeunitsรวมtrailing spaces; indexedtextเป็นNVARCHAR(n), unindexedtextใช้NVARCHAR(MAX)+CHECKlimitเพื่อไม่silenttruncateoversizedtrailing-spaceinput. SQLitefriday_utf16_unitsนับJavaScriptUTF16เท่ากับlockedDTOextensions (title200รับ100emoji). TEXTfunctionsต้องregisteredผ่านSQLiteadapterเมื่อเปิดDB ไม่ใช้rawSQLiteconnectionที่ไม่มีfunctionsเพื่อwrite/migrate

SQL username/teamnameใช้Latin1_General_100_CI_AS_SC; enum/hash/UUIDและtechnicalkeysใช้Latin1_General_100_BIN2. SQLitegeneratedstoredCIkeyใช้NFC/lowercaseและตัดASCIItrailingspacesเฉพาะcomparisonkey. Localkeyเป็นapproximation ไม่อ้างแทนSQLcollationforallUnicode; realSQLtestsตรวจASCIIcase/É-vs-é/composed-vs-decomposed/Thai/trailingspaces. IndexedSQLtext/nativeenumอาจใช้SQLpadding/conversionsemantics; APIvalidationต้องตรวจUTF16/enumก่อนbindด้วย ห้ามใช้DBcoercionแทนrequestvalidation

UUIDs/storage/temp/request/viewrevision/idempotencykeyเก็บcanonicallowercase36chars; featureต้องnormalizeacceptedUUIDก่อนstore. Hashesเป็นlowercaseSHA256hex64; rawsessiontokenไม่เก็บDB. JSONtextต้องvalidobject/array; task_events.field_changesต้องARRAYตามTaskEventDTO (SQL2022ISJSON(...,ARRAY)). Schemaตรวจcontainer shape; EventChangefield/items≤100/redaction/ไม่มีpassword/uploadbytesเป็นความรับผิดชอบfeature/contract

Taskenums: todo/doing/review/done; low/medium/high/urgent; none/daily/weekly/monthly. start≤due; recurrenceต้องdue; monthlyanchor1–31เฉพาะmonthly; statusdone↔completed_atnonnull; deleted_at/byเป็นคู่; no-selfpredecessor/successor. Optionalpredecessor/successorมีUNIQUEfilteredindexesIS NOT NULL; NULLได้หลายแถว. Notificationtypes/message500และeventactionsตรงOpenAPI; append-onlyHTTP/auditimmutabilityและauthorizationยังต้องทำในfeatures

## References, board และ purge

31FK ทั้งสองproviderใช้NO ACTION ไม่มีcascade/deferredconstraint. RequiredlookupindexesตามSRSครบพร้อมadditionalexpiry/cleanup/purge indexes; SQLenabled/trustedchecks+FKและactualqueryplansยังต้องรันSQL2022

BoardpositionsFK(task_id,project_id,status)อ้างtasksuniqueidentity/statusและFK(project_id,status)อ้างboard_columns จึงไม่ยอมcrossproject/statusdrift. UNIQUE(project_id,status,rank)ตรวจทุกstatement; rank≠0และnegativeallowedสำหรับtemporaryphase. เมื่อต้องเปลี่ยนstatus ให้locktask/columnsตามลำดับแล้วdeleteoldposition→updatetask→insertnewposition→renumberสองระยะ→versions/audit/notificationsในtransactionเดียว. Schematestsพิสูจน์constraints/fixtureorderเท่านั้น; realmove/idempotency/recurrenceAPIยังpendingT-008/T-027/T-035

Purgeต้องลบdependentrowsและnullpredecessor/successorliveFKก่อนลบtasks. recurrence_eventsเก็บsource/generatedpositiveINTsnapshotsแบบunique ไม่มีFK จึงคงtombstone. file_cleanup_queueเก็บUUID/bytes/reason/attempts/next_attempt_at ไม่มีparent/attachmentFKและsurvivespurge; stored_bytesไม่ลดเพราะmetadataถูกลบ. Policy30daycutoff/authorization/retrydiskdeleteทำในowningtasks

## Durable state และ migration policy

- storage_quota id1, stored/reserved≥0และsum≤JSsafeinteger; reservationlock/enforceconfiguredTOTAL_UPLOAD_BYTESเป็นT-042 ไม่ใช่CHECKlimit5GiBคงที่
- upload_reservations persistUUID/user/task/reserved/actual/temp/finalstoragekey/expiry/phase; actual≤reserved≤10MiB; validated/finalizingต้องactual, finalizingต้องstoragekey. FKทำให้purgeต้องdrain/recoverreservationsก่อน; expiryไม่เท่ากับอนุญาตลบreferencedbytesโดยไม่ตรวจstate
- maintenance_stateว่างเมื่อไม่active; rowid1มีownerUUID/stateentering|frozen|leaving/UTClease. Freeze/drain/jobs/sharedwritegateจริงทำT-061; leaseต้องมากกว่าupdated_at
- user_view_revisionsเป็นperuseropaqueUUID; idempotency(user,route,key)unique/hashedrequest/status/JSONbody/expiry; rate_limit_bucketsเก็บkind/hashedbucket/window/attempts ไม่seedcredentialsหรือresetทุกrestart
- migrationrunnerserializabletransaction/SQLiteBEGIN IMMEDIATE; SQLเพิ่มtransaction-ownedexclusiveapplock(nonblocking)เพื่อserializefreshDDL. Versionต้องเริ่ม0000foundationและต่อเนื่องไม่มีnumericprefixซ้ำ; missingalready-appliedsource/checksummismatchfailclosed; scriptsทั้งหมด/ledgeratomicในrunเดียว
- SQL0001อัปเกรดledgerapplied_atเป็นDATETIME2(3); SQLiteเก็บTEXTเดิม. ไม่มีautomaticdowngrade/SQLite→SQLdatatransfer; futurechangesใช้migrationใหม่ ห้ามแก้appliedmigration; productionoperatorsรันmaintenanceก่อนmigrate

## วิธีตรวจและข้อจำกัด

`npm run test:schema` ใช้temporarySQLitefile/close-reopen/actualconstraints + purecodecs. `npm run test:sqlserver` defaultSKIP/NOT_RUN; enableเฉพาะisolatedSQL2022DB_NAME_testด้วยdedicatedoperatorcredentials. Sharedschemaacceptance11casesสร้างrandomizedschemaแยกต่อcaseแล้วcleanupFK/table/schemaในfinally ไม่แตะdbo. ต้องSQLversion16.xจริงและpermissionsCREATESCHEMA/tables/constraints; ไม่มีการสร้างDB/เปลี่ยนserver/DNSจากtests

T-007คงIN_PROGRESS: SQL2022apply/enabledtrustedconstraints/nativecollation/serialization/queryplans/concurrencyยังNOT_RUN. SQLiteevidenceไม่ปิดTC-078/AT-25/28/Windows/UAT. ดู[รายงาน](TeamFlow_T007_Test_Report.md)

Technical references: [Microsoft FK/NO ACTION](https://learn.microsoft.com/en-us/sql/relational-databases/tables/primary-and-foreign-key-constraints?view=sql-server-ver16), [filtered indexes](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-index-transact-sql?view=sql-server-ver16), [DATALENGTH](https://learn.microsoft.com/en-us/sql/t-sql/functions/datalength-transact-sql?view=sql-server-ver16), [collation/Unicode](https://learn.microsoft.com/en-us/sql/relational-databases/collations/collation-and-unicode-support?view=sql-server-ver16), [SQL2022 ISJSON container constraints](https://learn.microsoft.com/en-us/sql/t-sql/functions/isjson-transact-sql?view=sql-server-ver16), [SQLite STRICT](https://www.sqlite.org/stricttables.html), [SQLite FK](https://www.sqlite.org/foreignkeys.html)

## Corrective migration 0002 - 2026-10-06

0000/0001 applied checksums are preserved. 0002_review_status.sql converts legacy blocked to locked review in tasks/board_columns/board_positions. SQLite rebuild preserves dependent rows/indexes/identity high-water; foreign_key_check assertion precedes reset of deferred counters. Populated upgrade/repeat/reopen/rollback verified in TeamFlow_T008_Test_Report.md. SQL recreates affected FK/CHECK WITH CHECK in one transaction; real SQL2022 evidence NOT_RUN.

## Owner-approved Vibe migrations — 7 October 2026

SQLite0003 and SQL Server0003 add `task_assignees(task_id,user_id)` with composite primary key, user index and backfill of non-null legacy `tasks.assignee_id`; add nullable `subtasks.assignee_id`. Service keeps legacy Task scalar synchronized to smallest owner ID, or null when empty. Retention explicitly removes relation rows before tasks; foreign keys use NO ACTION. SQLite relation is STRICT.

SQLite0004 and SQL Server0004 add `project_groups(id,project_id,name,color,position,version,created_at)` and nullable `tasks.group_id` with index. SQLite UTC timestamps remain validated text; SQL Server uses DATETIME2(3) under the existing UTC codec. Name/color/position/version checks match provider contracts. Same-project group references and active effective-write assignee eligibility are enforced by service transaction guards. Separate native SQL migration/integration acceptance remains NOT_RUN; local SQLite evidence cannot close T006/T007. API wire additions are documented in TeamFlow_API_Contract.md1.2.0.

## Migration 0008 — T-088 (8 October 2026)

`organizations.workload_threshold` INTEGER/INT NOT NULL DEFAULT 10, CHECK 1–1000 (SQLite `0008_workload_threshold.sql`, SQL Server `0008_workload_threshold.sql`). FR-50 highlight threshold for open tasks per person per Monday-start Bangkok week; Admin edits it via `PATCH /api/organization`. SQLite fresh migration verified; SQL Server NOT_RUN.

## Migration 0009 — T-090 (8 October 2026)

`user_favorites(user_id, project_id, created_at)` PK(user_id, project_id), FKs to users/projects (NO ACTION), index on project_id. Private per user; read filtered by current access; rows removed by `cleanupFavorites()` inside every access-change transaction. SQLite fresh migration verified; SQL Server NOT_RUN.
