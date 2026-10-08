# T-003 — API contract test report

วันที่: 5 ตุลาคม 2026 (Asia/Bangkok) · Owner: Codex · Result: **PASS / T-003 DONE**

## สิ่งที่เสร็จ

ล็อกสัญญา API52routes พร้อม75schemas ใน contracts/openapi.json และ TeamFlow_API_Contract.md: request/response DTO, strictunknownfields, pagination/query encoding, dates/Unicode limits, error/requestId/statuses, resource/parent/column versions, idempotency exceptions/replay/DELETE payloads และlookup DTOที่หน้าจอเดิมต้องใช้

SRSปรับpayload/filter/responseรายละเอียดให้ตรงสัญญา; routeจำนวนเดิมไม่เพิ่มscope; SQLitelocal/SQL2022ใช้สัญญาเดียวกันและแยกintegration evidence

## ผลตรวจที่รันจริง

| Check | Result | Evidence |
|---|---|---|
| Dependency install จาก lockfile | PASS | npm ci --ignore-scripts --offline --no-audit --no-fund; ใช้cacheจากinstallationรอบนี้ |
| Route/owner/schema check | PASS | npm run check:contract: 52methods/pathsตรงSRSและTask; ownerมีจริง; all75schemas/request/query/path/header/responsecompile strict; generatedsourceตรงJSON |
| Contract/unit tests | PASS | Node test runner:61tests/61pass/0fail/0skip/0cancel/0todo; tests/contracts/contract.test.mjs |
| Dependency audit | PASS | npmตรวจหลังpinAjv8.20.0/ajv-formats3.0.1:0reportedvulnerabilities ณเวลาตรวจ; ไม่ใช่การรับรองว่าไม่มีช่องโหว่อื่น |
| Whitespace/diff check | PASS | git diff --check |

Environment: macOS/Darwin, Node22.23.3, npm10.9.9; test validator Ajv8.20.0/ajv-formats3.0.1; exact dependencies/integrityอยู่package-lock.jsonและcontracts/LICENSES.md

Model/effort/speedที่Taskกำหนด: GPT-6.1 Sol/High/Standard; **ค่าที่เลือกจริง NOT_VERIFIED** เพราะเครื่องมือที่มีไม่แสดงselected settings ไม่มีการเปลี่ยนruntime settingsหรืออ้างว่าMarkdownเปลี่ยนค่าแล้ว

## สิ่งที่ tests พิสูจน์

- SRS request exampleตรวจผ่าน; schema rejectunknown/protectedfields, wrongtypes, whitespace-onlytitles, UTF16overflow, invaliddates/leapday/yearzero, enums และpaginationbounds
- PATCHตรวจmergedcurrentstateและversion; DELETEJSONversionชัด; memberwritesใช้parentversions; checklistwritesมีparent/subtaskversions; boardmoveกันselfanchorและsamecolumnversionไม่ตรง
- Querydecoderrejectrepeatedscalars/ambiguousarrays/invalidboolean/prototype-propertynames; CSV/reportไม่รับpaginationจนทำให้exportตัดเงียบ
- Response DTOsมีscopeddisplayfields/nestedsubtasksและrejectnestedprivateaccountfields; versionerrorต้องcurrentVersion/requestId; publicmetaไม่เพิ่มorg/privatepaths
- requiredkeyheaders/CSRF/Origin/no-store/204no-body declarationsครบตามmanifest; schemaสำหรับboardfallbackไม่แสร้งว่ามีcompleteordering

Trace: FR-05/18/40; SRS§5/12/18; UT-01เฉพาะT-003; relatedTC-025/035/044/048/068/069และAT-09/14/17/30ตามcontracts/test-manifest.json **ยังไม่ถือว่าTC/ATทั้งกรณีผ่าน**

## สิ่งที่ยังไม่ได้รัน

HTTP server/middleware/cookies/auth/permissions/scoping, SQLite/SQL2022transactions/locks/idempotencyreplaystorage, upload/quota/crashrecovery, Windows/.bak/restore/performance/UAT — **NOT_RUN**; contract testsไม่แทนtestsเหล่านี้ ไม่มีrealusers/secrets/database/uploadsในartifacts

T-004ยังต้องสร้างfulltest/release manifestและgate evidence; T-005ยังต้องสร้างfullappfoundation/pinappdependencies; T-007/T-008/T-010ต้องimplementและพิสูจน์persistentstate/transactionsตามcontract

Machine evidence: [reports/T-003-contract-results.json](reports/T-003-contract-results.json). ไม่มีcommit/deployในงานนี้; existingdocumentchangesก่อนเริ่มT-003ยังคงอยู่
