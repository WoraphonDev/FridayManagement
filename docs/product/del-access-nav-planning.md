# DEL-ACCESS-NAV — planning proposal

วันที่ 2026-10-25 · **PROPOSED / NOT ADOPTED** · docs-only · declared effort **High** ตาม NAV card และ T-081/T-091; actual runtime model/effort **NOT_VERIFIED**. เอกสารนี้เสนอ mapping และ adoption patch เท่านั้น ไม่ใช่ formal card adoption หรือคำสั่งเริ่ม implementation

## ฐานหลักฐานและสถานะ

- Host ยืนยัน specification **PR7 MERGED 2026-10-24T18:06:01Z**, head `6ddb510`; target `origin/main` และ base ของ branch `docs/del-access-nav-mapping` คือ `cdcbd52949052f596785cf4facafc30130473562` (`cdcbd52`). Host ยืนยัน refs fetch แล้ว, open PRs ว่าง และ worktree clean. Author ใช้ handoff นี้ ไม่ตรวจ remote/Git/auth ซ้ำ และไม่เปลี่ยน protected original checkout
- **Design approved:** Zo adopt Q-DAF-NAV-01 เฉพาะ frontend scoped-input + safe loading/retry. **Spec merge verified:** ตาม host ข้างต้น. ข้อความ PR7 OPEN ใน [NAV card](../../tickets/delivery/DEL-ACCESS-NAV.md) และ [follow-up appendix](del-access-followups.md) เป็น handoff เก่าที่ adoption patch ต้อง reconcile; ไม่ใช่ merge blocker ปัจจุบัน
- **Planning proposal NOT ADOPTED; formal NAV card NOT ADOPTED:** คง `status: draft`, `proposal: true`; implementation ยัง **BLOCKED** จน human adopt planning/mapping และ formal card อย่างชัดเจน. Continuation/planning authorization ไม่ใช่ adoption, DIR/PARENT policy approval หรือ merge authority
- **Runtime RED/GREEN/browser/contract/PostgreSQL/UAT/deploy NOT_RUN** สำหรับ NAV follow-up. ไม่มี independent review หรือ parent/precommit verdict ของ artifact นี้จาก author; historical verdict ของ PR7 ไม่ครอบคลุมข้อเสนอนี้. Host เป็นผู้ verify/review stable artifact และจัด gate ตาม authority เดิม

อ่านเฉพาะส่วนที่เกี่ยวข้องจาก [AGENTS](../../AGENTS.md), [ticket convention](../../tickets/README.md), [delivery adoption convention](../../tickets/delivery/README.md), [rules R09–R11](delivery-rules.md#10-ux-reliability-และ-validation-r09r11), [rollout gates](delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here), NAV card/appendix, [Requirements](../../TeamFlow_Requirements_v1.0.md) FR-17/42/42A และ BR-14/16/21–23, [SRS](../../TeamFlow_SRS_v1.0.md) §4.3–4.4/AT-13/AT-32, [locked API](../../TeamFlow_API_Contract.md) manager/P-04, และแหล่ง test/register ด้านล่าง. Source inspection ไม่ใช่ acceptance evidence

## ขอบเขต NAV ที่นำมา map

ใช้ scoped input ของ `allowedPages(self, scope?)` ทั้ง sidebar และ direct `/trash`. App อ่าน projects แยกจาก sidebar เฉพาะ active, password-cleared P-04 non-Admin/non-Lead ที่ต้องพิสูจน์ manager; ใช้ `GET /api/projects?includeArchived=true&pageSize=100&page=N` จนพบ `effective_access === 'manager'` หรือครบทุกหน้า. ไม่ใช้ `Self.project_ids`, global key, job title หรือ first-page membership แทน role. คง Admin/any existing access Lead fast path และ account/password gates

Snapshot ผูก actor/session/`view_revision`; invalidate/abort และกัน late replies เมื่อ logout/login, password/account state เปลี่ยน, revoke/demote, reconnect หรือ unmount. Pending/error/unknown ไม่เป็น allow; cold route มี loading/retry ที่ไม่เผยชื่อ/จำนวน และไม่สรุป permanent denial ก่อน read ครบ. Archived-only manager ยังเปิด scoped Trash ได้ แต่ server ตรวจ restore/lifecycle/retention ตามเดิม. Include-archived lookup ไม่เปลี่ยน sidebar boards และไม่เพิ่ม grants, Self fields, endpoint, wire หรือ provider behavior

## Reuse official owners — ไม่เพิ่ม ID

แหล่งอ้างอิง: [Task Register](../../TeamFlow_Task_v1.0.md) summary rows, detail T-030/055/057/081/091, FR/BR/AT coverage; [Test Plan](../../TeamFlow_Test_Plan_v1.0.md) UT และ task responsibility; [Test Cases](../../TeamFlow_Test_Cases_v1.0.md) TC bodies/AT coverage; [generated manifest](../../tests/test-manifest.json). ตารางนี้เป็น proposed allocation ของ DEL scope ลงงานเดิม ไม่โอนหรือปิด acceptance ทั้งงาน

| Existing T-ID | บทบาทที่เสนอ / effort เดิม | เหตุผลและขอบเขต |
|---|---|---|
| T-081 | **Primary NAV implementation owner / High** | FR-42/42A, BR-21–23, AT-32; checkbox + scoped manager UI/API parity รวม P-04 อยู่ในเกณฑ์เดิม. ใช้ UT-03/UT-21 ตาม task responsibility เดิม |
| T-091 | **Affected addendum regression owner / High** | AT-32 และ TC-087/088/089 มี owner นี้อยู่แล้ว; ตรวจผล NAV พร้อม affected shell regressions ไม่รอ full T-091 จึงเริ่ม feature tests |
| T-030 / T-070 | Existing Trash behavior / regression, **High / High** | TC-034 → AT-13. ใช้ยืนยัน scoped rows/counts/restore เดิม; ไม่รับ ownership permission card ทั้งก้อนหรือปิด retention/recurrence |
| T-057 / T-047 | Existing reconnect/logout / refresh, **High / High** | UT-18, TC-072/AT-26 และ TC-050/AT-20 ตาม mapping เดิม; เป็น supporting regression ไม่ต้องเพิ่ม T-081 ให้ทุก AT |
| T-055 / T-058 / T-073 | Existing responsive/browser regression, **Medium / Medium / Medium** | TC-073 → AT-18/26; ไม่อ้างผล browser matrix ทั้งชุดจาก targeted NAV |
| T-014 / T-017 / T-068 | Existing identity/session regression, **High / Medium / High** | TC-006/010/011 → AT-02 และ TC-008/009/021 → AT-03 ตาม coverage เดิม; ไม่เปลี่ยน login/password policy |
| T-082 | **Inherited AT-32 co-owner / Medium** | Manifest จับ AT-32 ร่วมกับ T-081/T-091 อยู่แล้ว; NAV ไม่ต้องแก้ Admin-center/bulk/preset UI หรือประกาศ T-082 เป็น implementation owner เพิ่ม |

ไม่พบช่องว่างที่ต้องสร้าง T/TC/AT/UT/RV ใหม่: T-081/AT-32 ครอบคลุม defect ด้าน permission parity; T-030/AT-13 ครอบคลุม Trash; test cases เดิมรับ targeted subscenarios และ regression evidence ได้. T-069 เป็น supporting cross-team/revocation regression (High) แต่ **ไม่ได้เป็น generated owner ของ AT-32**; ไม่เพิ่มเข้า AT-32 เพื่อให้ตารางดูครบ

## Targeted scenarios → existing TC/AT, variants, suites และ future tests

ทุกแถวด้านล่าง **planned / NOT_RUN**. ชื่อ scenario เป็นคำอธิบาย ไม่ใช่ ID ใหม่. “Owners” คือ task ownership ที่มีจริงของ TC/AT; test file ไม่ใช่ formal case และ targeted assertion ไม่ปิด TC/AT ทั้งกรณี

ใช้ชื่อย่อเฉพาะไฟล์ในตาราง: **unit NAV** = `frontend/src/delivery-access-nav.test.tsx` (planned new); **browser NAV** = `tests/browser/delivery-access-nav.spec.ts` (planned new); **browser parity** = `tests/browser/delivery-access-parity.spec.ts` (existing); **API/nav regression** = `frontend/src/api.test.tsx` (existing). ห้ามใช้ planned filename เป็นหลักฐานว่ามี test แล้ว

| Targeted NAV scenario / expected | Existing TC → AT / owners | Existing variant / suite applicability | Proposed future tests |
|---|---|---|---|
| Plain explicit manager + P-04 ไม่มี Lead: menu และ cold `/trash` เปิดได้; empty scoped Trash เป็น empty state | TC-087 → AT-32 / T-081,T-082,T-091; TC-034 → AT-13 / T-002,T-030,T-033,T-060,T-070 | UT-21; T-081 responsibility อ้าง UT-03 ด้วย; TC-034 ไม่มี variant เฉพาะ empty state | unit NAV + browser NAV; เปลี่ยน existing plain-manager `test.fixme` ใน browser parity เป็น executed assertion หลังแก้จริง |
| Manager อยู่หลัง 100 rows หรือมีเฉพาะ archived project: อ่านจนพบ/ครบ; sidebar ไม่เพิ่ม archived boards | TC-087 → AT-32 / T-081,T-082,T-091; TC-034 → AT-13 / owners เดิมข้างต้น | UT-21; RV-01 เป็น archived restore regression ของ T-021/T-030 ไม่ใช่ pagination variant | unit NAV จำลองหลายหน้า/archived-only/อ่านครบไม่พบ; browser NAV ใช้ fixture จริง |
| P-04 Editor/Viewer/unrelated, manager ไม่มี P-04, read-only `project_ids`, title/team_position ไม่ทำให้เข้า Trash | TC-087/089 → AT-32 / T-081,T-082,T-091 | UT-21; TC-089 มี supplemental AT-30 ใน body แต่ generated owners ยังมาจาก AT coverage table | unit NAV + API/nav regression + browser NAV; regression server negatives เดิม |
| Admin/any existing access Lead fast path ไม่รอ lookup; unrelated-team Lead ไม่ได้ rows/counts/restore ของ project เพิ่ม | TC-087 → AT-32 / T-081,T-082,T-091; TC-034 → AT-13 / T-002,T-030,T-033,T-060,T-070 | UT-03/UT-21 ตามความเกี่ยวข้อง; RV-01 สำหรับ archived-parent exception เดิมเท่านั้น | API/nav regression + unit NAV + browser parity; `tests/permissions/delivery-parity.test.ts` |
| Unknown/inactive/expired identity, password gate ทั้ง self/user flag และ omitted scoped input ไม่เปิด privileged nav; public/settings คงเดิม | TC-006/010/011 → AT-02 / T-014,T-017,T-068; TC-008/009/021 → AT-03 / T-014,T-015,T-016,T-017,T-018,T-068; TC-087 → AT-32 / T-081,T-082,T-091 | UT-05 session subset; UT-21 default deny; RV-16 session/cache subset | API/nav regression + unit NAV + browser NAV และ existing shell regression |
| Pending cold route ไม่เผย private content และไม่ deny ถาวรก่อนครบ; failed/empty/denied แยกได้; retry ไม่รั่วชื่อ/จำนวน | TC-072 → AT-26 / T-055,T-056,T-057,T-058,T-073; TC-087 → AT-32 / T-081,T-082,T-091 | UT-18 UI state ถ้าแยก logic, มิฉะนั้น actual E2E; no new variant | unit NAV + browser NAV; `frontend/src/App.test.tsx` regression ไม่ต้องแก้ |
| Logout → different login, reset/password change, expiry, unmount: abort/epoch ป้องกัน old response เติม scope/rows/dialog | TC-006/010/011 → AT-02 / T-014,T-017,T-068; TC-008/009 → AT-03 / T-014,T-015,T-016,T-017,T-018,T-068; TC-071/072 → AT-26 / T-055,T-056,T-057,T-058,T-073 | RV-16; UT-18/UT-05 ตามส่วน; ไม่ต้องแก้ service worker เพื่อปิด race ใน reader | unit NAV held replies + browser NAV account-switch/expiry; existing shell regression |
| P-04 removal/demotion/view_revision/reconnect: stale positive และ old-page replies ใช้ไม่ได้; pending state/retry ถูกต้อง | TC-088 → AT-32 / T-081,T-082,T-091; TC-018 → AT-08 / T-011,T-022,T-024,T-043,T-069; TC-050 → AT-20 / T-032,T-038,T-047,T-071; TC-072 → AT-26 / T-055,T-056,T-057,T-058,T-073 | UT-21/UT-18; RV-08/RV-17 เป็น related existing regression ไม่ได้ผูก AT-32 ใน manifest | unit NAV + browser NAV controlled delayed pages; real API revoke regression เดิม |
| Real API unrelated scope/row/count และ restore หลัง revoke ถูก deny; 401/403/404 ล้าง private state; 409 ไม่ auto-confirm version ใหม่ | TC-034 → AT-13 / T-002,T-030,T-033,T-060,T-070; TC-088 → AT-32 / T-081,T-082,T-091; TC-035 → AT-14 / T-026,T-027,T-032,T-070 | RV-08 regression ที่เกี่ยวข้อง; UT-21; ไม่เปลี่ยน error precedence หรือ mutation policy | browser NAV + browser parity; existing permission/authorization suites; preserve 409 assertion เดิม |
| Archived-only navigation ไม่เปลี่ยน manager active-parent restore rule, Admin/owner Lead exception, cutoff และ assignee cleanup | TC-034 → AT-13 / T-002,T-030,T-033,T-060,T-070 | RV-01/03/05 existing restore boundaries; NAV targeted subset ไม่ใช่ full variant execution | existing browser parity + `tests/permissions/delivery-parity.test.ts`; NAV browser ยืนยัน reachability ไม่สร้าง parent capability |
| Keyboard/focus, 360/390/768/1440 px และ zoom 200%; long Thai/Unicode labels ไม่มี leak/overflow | TC-073 → AT-18 / T-037,T-055,T-058,T-071 และ AT-26 / T-055,T-056,T-057,T-058,T-073 | ไม่มี RV เฉพาะ; actual UI/E2E, UT-18 ไม่แทน accessibility | browser NAV + existing shell/focus-mobile/drafts regression |

Variant ownership ที่ต้องแยกจาก proposed scenario: RV-01 = T-021/T-030 (TC-022/034); RV-03 = T-027/T-030 (TC-028/034); RV-05 = T-030/T-043/T-060 (TC-034/059/079); RV-08 = T-011/T-022/T-043/T-050/T-053 (TC-017/018/063/066); RV-16 = T-014/T-017/T-047/T-056/T-057; RV-17 = T-031/T-047/T-075. RV-16/17 cases/profiles คงตาม [test policy](../../tests/test-policy.mjs) และ manifest. ไม่เพิ่ม T-081 ให้ variants เหล่านี้หรืออ้าง NAV ปิด variant ทั้งชุด

UT asymmetry เดิมต้องคงไว้: task responsibility ของ T-081 มี UT-03/UT-21 แต่ suite row UT-03 มี T-011/021/022/043/050/052/053, ไม่รวม T-081; UT-21 มี T-081/T-082. Generator อ่านสองตารางแยกกัน ไม่ reconcile เป็น symmetric ownership. ข้อเสนอนี้อ้าง UT-03 ผ่าน responsibility เดิม ไม่เสนอแก้ suite ownership โดยไม่จำเป็น

## Exact future adoption patch — ยังไม่ทำในงานนี้

**Smallest proposed write ceiling: 3 existing files เท่านั้น** หลัง human adopt planning อย่างชัดเจนและอนุญาต patch นี้. ไฟล์ข้อเสนอปัจจุบันคงเป็น historical NOT ADOPTED proposal; adoption record ลง card/appendix พร้อมวันที่/decision reference จริง. ไม่เปลี่ยน card เป็น ready ล่วงหน้า

| File / exact location | Proposed change at adoption | สิ่งที่คงเดิม |
|---|---|---|
| `TeamFlow_Task_v1.0.md` — T-081 summary Evidence cell และ detail `### T-081` | Append บันทึกสั้นเหมือนกันทั้งสองจุด: `DEL-ACCESS-NAV mapped as scoped frontend P-04 manager Trash parity follow-up; planning adopted [actual decision/date]; primary T-081, regression T-091; TC-087/088/089→AT-32, supplemental TC-034→AT-13; see docs/product/del-access-nav-planning.md and tickets/delivery/DEL-ACCESS-NAV.md; runtime NOT_RUN; IN_PROGRESS unchanged.` แทน placeholder ด้วยหลักฐาน adoption จริงเท่านั้น | title/owner/effort/dependencies/status/checkmarks/old evidence เดิม; ไม่ rewrite historical SQL evidence |
| Same register — T-091 summary Evidence cell และ detail `### T-091` | Append: `DEL-ACCESS-NAV affected regression mapped under existing AT-32/TC-087/088/089 owners; supporting Trash/session/UX cases remain with existing owners; runtime NOT_RUN; no aggregate acceptance or status change.` พร้อม link ไป planning/card และ actual adoption reference | dependency list, AT-31–40 coverage, provider acceptance และ IN_PROGRESS เดิม; ไม่เพิ่ม checkbox ที่แปลว่า test ผ่าน |
| `tickets/delivery/DEL-ACCESS-NAV.md` — Context/Tasks/Files/Verify/Evidence | แก้ PR7 OPEN/merge-pending references เป็น host-verified MERGED timestamp/head ข้างต้น; mark เฉพาะ spec-merge prerequisite พร้อม provenance. บันทึก T-081 primary/T-091 regression, supporting trace และ planning decision/date/link. เอา planning-blocked wording ออกเฉพาะเมื่อ adoption เกิดจริง; แยก formal card adoption record อย่างชัดเจน. ปรับ `status: ready` / `proposal: false` ได้หลัง human formally adopt card และยืนยัน ceiling เท่านั้น ไม่เป็น doing/DONE จาก planning | ID DEL-ACCESS-NAV, `parent: DEL-ACCESS`, `depends_on: []`, runtime allowed_paths 7 รายการเดิม, High; Questions answered design-only; runtime NOT_RUN. ไม่สร้าง T-ticket ซ้ำ |
| `docs/product/del-access-followups.md` — Status boundary, NAV decision row, gates, next prerequisite | Reconcile stale PR7 OPEN ทุกจุด พร้อม provenance; อ้าง mapping/adoption reference เดียวกับ card, แยก spec complete/planning adopted/formal card adopted ตามเหตุการณ์จริง. บันทึก manifest generation no-op และ totals/status unchanged | DIRECTORY/PARENT questions OPEN/proposed, dependency graph, historical review record, DEL-ACCESS/DEL-VALIDATION boundaries เดิม |

ตารางมี 4 แถวแต่เป็น **3 paths** (register สองส่วนในไฟล์เดียว). นี่เป็น proposed future ceiling ที่ต้องอนุญาตแยก ไม่ใช่การขยาย allowed_paths ของ runtime card ให้แก้ทะเบียนได้ตลอดไป. ไม่ต้องแก้ inventory, tickets/README, test source Markdown, generator/checker/policy, generated JSON หรือ execution records ใน minimal adoption patch นี้. ถ้า target เปลี่ยนจน mapping ไม่พอ ให้หยุด reconcile scope ก่อน ไม่เพิ่ม IDs/counts หรือ widen ceiling เอง

## Generated manifest: mapping มีแล้ว, generation คาดว่า no-op

[Generator](../../scripts/build-test-manifest.mjs) และ [checker](../../scripts/check-test-plan.mjs) เป็น T-004 planning tooling; นโยบายอ้าง [Test/Release Manifest](../../TeamFlow_Test_Release_Manifest.md), policy tests อยู่ [tests/planning/test-plan.test.mjs](../../tests/planning/test-plan.test.mjs). แยกจาก `scripts/build-contract.mjs` / `contracts/test-manifest.json` ซึ่งเป็น contract tooling/evidence ของ T-003 และไม่ต้อง regenerate สำหรับ NAV

| Source / parser behavior | Current mapping และ proposed delta |
|---|---|
| Register summary `rows(taskText,'T-')` | อ่าน ID/title/dependencies/effort; ไม่อ่าน Evidence cell หรือ prose adoption note เข้า output. Minimal register patch ด้านบนจึง **ไม่เปลี่ยน generated task fields** |
| Register `AT-` rows + Test Cases `AT-` table + SRS `AT-` rows | AT tasks มาจาก register; cases มาจาก Test Cases AT table; title/expected/trace มาจาก SRS. AT-32 มี T-081/T-082/T-091 และ TC-087/088/089 แล้ว; AT-13 มี T-002/T-030/T-033/T-060/T-070 และ TC-034/059/079 แล้ว. **No source mapping delta needed** |
| Test Cases index + TC body | Case owners เป็น union ของ tasks จาก AT coverage table ที่มี TC นั้น ไม่ได้ใช้ body Acceptance เพื่อตั้ง owners. เช่น TC-089 body อ้าง AT-30 เพิ่ม แต่ generated owners ยังเป็น T-081/T-082/T-091. ไม่เติม T-069 หรือสมมติทุก supplemental AT เปลี่ยน owners อัตโนมัติ |
| Test Plan task responsibility / `UT-` rows | Task suites และ suite tasks อ่านแยกตามตาราง; existing UT-03/18/21 เพียงพอ. **No source row edit**; ไม่มี mapping ราย test filename และ generator ไม่ scan test files |
| `tests/test-policy.mjs` | ให้ profiles/fixtures/variants/UAT/reviews/sequencing. Existing RV applicability เพียงพอ; **no policy/owner/profile change** |
| Register FR/NFR/BR tables | มี FR-17/42/42A, BR-21–23 owners แล้ว; **no coverage row change**. Detail prose ไม่ใช่ source ของ FR/AT mapping |

ดังนั้น proposed formal source delta คือ **adoption/evidence prose ใน register เท่านั้น**; proposed generated-source/table delta **ศูนย์** และ `tests/test-manifest.json` คาดว่า **byte-for-byte generation no-op**. ยังไม่ได้ execute generator หรือ checker ในงานนี้ จึงไม่อ้าง equality/check PASS จากการอ่าน source

หลัง human authorization สำหรับ adoption ให้รัน `npm run build:test-plan` ใน isolated writable candidate ที่ host อนุญาต (คำสั่งนี้เขียน `tests/test-manifest.json`), ตรวจเทียบก่อน/หลังโดย host และคาดว่าไม่มี diff; ไม่ใช้ protected original checkout. ถ้ามี delta ไม่คาดหมาย อย่านำ JSON เข้า 3-file patch หรือปรับ counts ให้ผ่าน ให้ตรวจ source drift/ขอ scope ใหม่ก่อน. จากนั้น `npm run check:test-plan` และ `npm run test:test-plan` พร้อม exit/actual results. Checker deep-compares generated object กับ source, assert inventories/owners/dependency detail และ DAG; planning tests ใช้ synthetic evidence ไม่บันทึก application PASS. Checks ผ่านหมายถึงแผน consistent เท่านั้น ไม่ adopt card หรือปลด runtime/release gate

Preserved inventories จาก current manifest/checker: **96 T, 23 UT, 99 TC, 40 AT, 20 RV, 5 UAT, 4 release reviews; smoke 30**. ไม่ใช้ historical 77/84/30 inventory ใน prose เก่าของ Test/Release Manifest เป็นยอดปัจจุบัน และไม่แก้เอกสารนั้นใน scope นี้

## Dependency graph และ aggregate boundaries

Delivery graph คงเดิม (ลูกศร = prerequisite → dependent):

```text
DEL-UX3 → DEL-ACCESS [partial in_progress] → DEL-VALIDATION [dependency blocked]
DEL-VALIDATION → DEL-CONTRACT → delivery feature sequence
PR7 MERGED + human planning adoption + formal NAV card adoption → NAV implementation
DEL-ACCESS-NAV → DEL-ACCESS-PARENT-STATE [policy/wire OPEN]
DEL-ACCESS-DIRECTORY [policy/wire OPEN; no NAV dependency]
```

NAV/DIRECTORY `depends_on: []` และ `parent: DEL-ACCESS` คงเดิม; partial DEL-ACCESS implementation เป็น prerequisite ตาม context ไม่ใช่ full-parent-DONE edge ที่ทำให้วงจร. PARENT-STATE `depends_on: [DEL-ACCESS-NAV]`; ไม่เพิ่ม DIRECTORY dependency. Spec merge ผ่านแล้ว แต่ planning/formal adoption ยัง pending

Formal graph ที่เกี่ยวข้องคงเดิม: T-078 → T-081; T-080 + T-081 → T-082; T-079/T-080/T-081/T-082/T-083/T-084/T-085/T-086/T-087/T-088/T-089/T-090 → T-091. Supporting T-030 ยังขึ้นกับ T-026/T-029/T-002; T-057 ขึ้นกับ T-056/T-047/T-055. ไม่ใส่ DEL IDs ลง formal T dependency columns หรือทำ T-081 รอ full T-091. การ reuse ไม่ทำ dependency ทั้งงานสำเร็จ; ต้องตรวจ prerequisites/evidence ของ scoped implementation บน target ก่อนเริ่ม

NAV success ปิดได้เฉพาะ NAV scope หลัง tests/review จริง. DEL-ACCESS ยัง **in_progress** จน NAV + directory discovery + parent-state capability ถูก adopt/implement/validate และ reconcile blockers ทั้งสามผ่าน separate authorized aggregate evidence/status work. DIRECTORY Q-DAF-DIR-01/02 และ PARENT Q-DAF-PARENT-01/02 ยังคง OPEN; ไม่มี policy/wire decision ในเอกสารนี้. DEL-VALIDATION frontmatter ยัง draft แต่ execution ติด dependency DEL-ACCESS; downstream DEL-CONTRACT และ feature chain ยังไม่ปลด. ไม่เปลี่ยน cards เป็น ready จากข้อเสนอนี้

Official statuses คง **DONE 9 / total 96 / remaining 87; IN_PROGRESS 84, IN_REVIEW 1, TODO 2**. T-081/T-091 และ supporting tasks ที่กล่าวถึงไม่ถูกปิดจาก mapping. PostgreSQL acceptance ต้องผล PostgreSQL 17 จริง; SQLite targeted results ปิด TC ที่ requiredProfile `postgres17` ไม่ได้. Linux/Docker/backup-restore/security/UAT/release/owner deploy ยังแยกและไม่ผ่านจาก NAV หรือ docs checks

## Planned validation และ handoff

ก่อน runtime ให้ host reconcile target filenames/ceilings อีกครั้ง. Proposed runtime ceiling คง 7 paths ใน NAV card: `frontend/src/navigation.ts`, `frontend/src/App.tsx`, `frontend/src/api.test.tsx`, `frontend/src/delivery-access-nav.test.tsx`, `tests/browser/delivery-access-parity.spec.ts`, `tests/browser/delivery-access-nav.spec.ts`, `tickets/delivery/DEL-ACCESS-NAV.md`. Existing App/server/shared-reader files อื่นเป็น read-only/regression; ต้อง re-scope ก่อนแก้นอกเพดาน. ห้าม server/Self/contract/grants/provider/dependency/lockfile changes ใน NAV scope

หลัง adoption เท่านั้น ใช้ RED → GREEN ตาม [NAV Verify](../../tickets/delivery/DEL-ACCESS-NAV.md#verify): targeted Vitest (`api.test.tsx`, `App.test.tsx`, new NAV test), existing delivery permission test, permissions/authorization/frontend suites, typecheck/lint/build, contract check/tests และ planning check/tests. Browser target เป็น new NAV + parity + shell/workspaces/task-workspace-permissions/drafts/focus-mobile ตาม card; host จัด Node22, free `FRIDAY_TEST_PORT`, new disposable external `FRIDAY_BROWSER_FIXTURE`, approved `TMPDIR`, build ก่อน browser และไม่ reuse server. ไม่รัน `build:contract` เพราะไม่มี wire change. NAV ไม่เพิ่ม PG suite แต่คง server regression/production PG requirements; scope ที่เปลี่ยนไป server ต้อง re-scope และทดสอบ provider จริง

Author docs checks **PASS**: local links/heading fragments 20 references, existing T/TC/AT/UT/RV identifiers, whitespace/final newline; planned new NAV unit/browser paths ยังไม่มีจริง. เป็น static document checks เท่านั้น ไม่ใช่ generator/checker, independent review หรือ runtime evidence

ผลของงานปัจจุบันจำกัดที่ source inspection และเอกสารหนึ่งไฟล์; generator/planning commands และ runtime checks ด้านบน **NOT_RUN**. ส่ง artifact ให้ host verify/review ก่อน adoption patch; ไม่ claim independent CLEAN, parent gate satisfied, merge readiness หรือ runtime test PASS. ขั้นถัดไป **human planning/formal adoption reconciliation / High**; runtime ถัดไป **DEL-ACCESS-NAV / High** หลัง adoption และ applicable gates ครบเท่านั้น

## HOST publication handoff — subsequent evidence

This section records host evidence obtained after the author handoff above; author statements of NOT_RUN/no independent verdict remain historical, not the current publication gate outcome.

- Reviewed artifact SHA-256: `badb7ed9652d5061789ba9ae8e2766c70b3ee9ae12632d700873930d58945c58` (the original 120-line proposal, before this evidence-only appendix). Independent Claude review, session `7c6c6b89-6a80-4ff0-aa0f-caeccafd805b`: **CLEAN (docs-only), no blocking findings**. The reviewer read sources but did not execute checks. Optional notes identify partial supplemental ownership display for TC-021 (also AT-08) and TC-072 (also AT-20); this proposal does not replace the full existing manifest ownership or adopt any mapping change.
- Host actually executed `npm run check:test-plan`: **PASS**; `npm run test:test-plan`: **18/18 PASS**. These establish planning consistency only, not runtime acceptance. Manifest generation was **NOT_RUN**; generation no-op remains an expectation, not verified byte equality.
- Parent read the full proposal and approved the **parent/precommit publication gate**, including commit, push and PR creation. This appendix adds evidence only; no further independent model run or unchanged planning-suite rerun is claimed.
- Publication host fetched live refs: `origin/main` remains `cdcbd52949052f596785cf4facafc30130473562`; PR7 is **MERGED**, timestamp `2026-10-24T18:06:01Z`, head `6ddb51067ed6d55ba18168fb5585d4e2e9fcf6f2`.
- Publication is limited to this planning document. No adoption patch, Task Register edit, runtime change, DIRECTORY/PARENT decision, merge, deployment or runtime test execution is authorized or performed. T-081 primary / T-091 regression remains proposed reuse, with no new IDs or changed counts; formal register remains **9/96 completed, 87 remaining**.
- Next substantive gate remains explicit **human planning/mapping adoption and formal NAV card adoption**, with separate authorization for the proposed three-existing-path adoption patch. Implementation remains blocked until adoption and applicable scoped execution gates are satisfied. Opening or approving this documentation PR does not itself record those adoption decisions.
