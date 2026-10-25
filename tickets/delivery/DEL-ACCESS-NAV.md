---
id: DEL-ACCESS-NAV
title: "Proposed scoped Trash navigation for plain P-04 managers"
type: fix
priority: P0
owner: "unassigned"
status: in_progress
proposal: false
effort: High
parent: DEL-ACCESS
children: []
depends_on: []
relates: { prd_ac: ["AT-13", "AT-32"], fr: ["FR-17", "FR-42", "FR-42A"], security: ["BR-16", "BR-21", "BR-22"], permissions: ["P-04"], api_operations: ["GET /api/projects", "GET /api/trash", "POST /api/tasks/{id}/restore"], ui_pages: ["/trash"], db_tables: [] }
questions: ["Q-DAF-NAV-01"]
allowed_paths:
  - "frontend/src/navigation.ts"
  - "frontend/src/App.tsx"
  - "frontend/src/api.test.tsx"
  - "frontend/src/delivery-access-nav.test.tsx"
  - "tests/browser/delivery-access-parity.spec.ts"
  - "tests/browser/delivery-access-nav.spec.ts"
  - "tickets/delivery/DEL-ACCESS-NAV.md"
  - "frontend/src/responsive-fixes.css"
---

# DEL-ACCESS-NAV — formally adopted card

## Context

**Q-DAF-NAV-01 ANSWERED / ADOPTED by Zo; planning/mapping และ formal NAV card ADOPTED 2026-10-25; runtime NOT_RUN**. Zo continuation **“ทำต่อเลย”** และ Host scope summary (not a verbatim user quote): continue approved NAV mapping adoption and implementation to verified deliverable, respecting live spec merge gates; no merge/deploy. รับรอง mapping **T-081 primary / T-091 affected regression** และ exact three-file adoption patch ใน [historical planning proposal](../../docs/product/del-access-nav-planning.md#exact-future-adoption-patch--ยังไม่ทำในงานนี้). Design คง recommended **frontend scoped-input + safe loading/retry เท่านั้น**; DIRECTORY/PARENT ยัง OPEN/proposed

**Spec merge provenance — host verified:** PR7 **MERGED 2026-10-24T18:06:01Z**, head `6ddb51067ed6d55ba18168fb5585d4e2e9fcf6f2`; planning PR8 **MERGED 2026-10-25T04:03:19Z**, head `2005dc3fccf636ceffb72ca8df436312b65ac406`, main `2793b23`. Host ยืนยัน fetch/clean; author ใช้ handoff นี้ ไม่ตรวจ remote ใหม่. Spec merge และ adoption ไม่ใช่ runtime acceptance หรือ merge/deploy authority

Declared **High** ตาม card และ T-081/T-091. Actual runtime ของ original proposal และ prior docs amendment **gpt-6.1-sol / High**, verified by host launch log ตาม historical handoff; actual runtime model/effort ของ adoption patch นี้ **host verified: standalone Codex CLI `gpt-6.1-sol`, reasoning effort `high`, session `01a1713c-e489-7470-94a0-1ee0e48b4b0d`** จาก launch log; author ไม่ได้ตรวจเอง (ผู้ใช้ระบุ standalone Codex gpt-6.1-sol / High). Sole author; host ดูแล tests/generation/review/Git. Original inspected base `ab47abe0d52ad12d73de7c3d6694ecbf85c149ea` และ merged partial PR6 เป็นบริบทเดิม. `parent: DEL-ACCESS`, `depends_on: []` คงเดิม; partial implementation เป็น prerequisite ไม่ใช่ full-parent-DONE edge

**Formal adoption record — 2026-10-25, Zo continuation “ทำต่อเลย”:** adopt planning/mapping และ card เป็น **`status: ready` / `proposal: false`**, ยืนยัน runtime ceiling 7 paths เดิม. [Task Register](../../TeamFlow_Task_v1.0.md) บันทึก T-081 primary / T-091 regression ใน Evidence/detail prose เท่านั้น; ไม่เพิ่ม IDs, dependencies, source mapping rows หรือเปลี่ยน statuses/counts. Trace หลัก TC-087/088/089→AT-32, supplemental Trash TC-034→AT-13; supporting Trash/session/UX และ inherited T-082 ownership คงตาม [planning](../../docs/product/del-access-nav-planning.md#reuse-official-owners--ไม่เพิ่ม-id). Register คง **9/96 completed, 87 remaining**

ขั้นนี้ทำเฉพาะ adoption ใน 3 paths ที่อนุมัติ ไม่เริ่ม runtime. **Manifest generation no-op host VERIFIED** (ดู current host evidence ด้านล่าง; pending wording ใน author handoff ที่เหลือเป็น historical): source mapping delta ศูนย์และคาดว่า byte-for-byte no-op แต่ author ไม่รัน generator/checker/tests และไม่แก้ manifest. Host ต้องรัน generation ใน isolated writable candidate พร้อมเทียบก่อน/หลัง, บันทึก planning checks และตรวจ target dependencies/ceiling กับ applicable review gates ก่อน runtime stage; ไม่ขอ adoption/mapping ซ้ำ. [Planning proposal](../../docs/product/del-access-nav-planning.md) คง historical unchanged; host เพิ่มผล verified แยกภายหลัง

## References

[Follow-up decisions](../../docs/product/del-access-followups.md#follow-up-decisions) · [Parent](DEL-ACCESS.md) · [Blocker evidence](../../docs/product/evidence/DEL-ACCESS.md#scope-limitations-found) · [D09](../../docs/product/delivery-decisions.md#d09--uiserver-permission-parity-no-automatic-grants) / [R09](../../docs/product/delivery-rules.md#10-ux-reliability-และ-validation-r09r11) · [Common gates](../../docs/product/delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here)

Source anchors at base: [navigation.ts](../../frontend/src/navigation.ts) `allowedPages` L14; [App.tsx](../../frontend/src/App.tsx) project read L370, nav L409, direct-route deny L725, Trash L805; [api.ts](../../frontend/src/api.ts) `selfSchema`; [api.test.tsx](../../frontend/src/api.test.tsx) navigation table L96; [browser parity](../../tests/browser/delivery-access-parity.spec.ts) `test.fixme` L158. Server references: [authorization.ts](../../src/services/authorization.ts) Trash branch L291; [tasks.ts](../../src/services/tasks.ts) `list` / `trashMutation`; [task-query.ts](../../src/repository/task-query.ts) scoped trash predicate. Trace: partial TC-034/087/088/089, AT-13/32; no formal case closure

## Files

- ref: Self schema, server services/query above and [shared refresh](../../frontend/src/shared/refresh.ts); read only. Self has global keys and project IDs, no manager roles
- touch: `allowed_paths` เป็น **adopted runtime ceiling 7 paths เดิม** ตาม Zo continuation 2026-10-25; ไม่ขยายให้แก้ register/appendix ใน runtime. Current adoption ceiling แยกเฉพาะ `TeamFlow_Task_v1.0.md`, card นี้ และ `docs/product/del-access-followups.md`; ขั้นนี้ไม่แก้ runtime. `frontend/src/delivery-access-nav.test.tsx` และ `tests/browser/delivery-access-nav.spec.ts` เป็น **planned new tests**, host ตรวจ target filenames/ceiling อีกครั้งก่อน implementation
- Integration: เปลี่ยน `allowedPages` ให้รับ scoped input และ App caller ให้ส่งข้อมูลเดียวกันกับ sidebar/direct-route gate; เพิ่ม tests ของ legacy callers ใน `api.test.tsx`. Existing App foundation test รัน regression ไม่ต้องแก้. Browser parity fixme ให้เปิดใช้ assertion จริงเมื่อแก้ครบ ไม่ลบทิ้งเพื่อให้ green
- ห้ามแตะ: server/Self/contract, existing DEL-ACCESS evidence/card, AGENTS, config/runtime/dependencies/lockfiles, inventory/old Task Register. ถ้าต้องแก้ shared reader นอก ceiling ให้ re-scope ก่อน

## Tasks

- [x] Owner Zo adopt Q-DAF-NAV-01 design decision: frontend scoped-input + safe loading/retry ตาม exact scope เท่านั้น (“เริ่มเลย”); ไม่ใช่ formal card adoption, spec merge, implementation, independent code review หรือ test execution
- [x] Spec-merge prerequisite: host ยืนยัน PR7 MERGED 2026-10-24T18:06:01Z, head `6ddb51067ed6d55ba18168fb5585d4e2e9fcf6f2`; planning PR8 MERGED ตาม provenance ข้างต้น
- [x] Zo continuation 2026-10-25 adopt planning/mapping T-081 primary / T-091 regression และ formal NAV card; register Evidence/detail updated, statuses/counts/dependencies/source mappings unchanged, runtime ceiling 7 paths confirmed
- [x] Host verified manifest generation byte-for-byte no-op, `check:test-plan` PASS and `test:test-plan` PASS 18/18; independent adoption review CLEAN and parent publication gate SATISFIED (see current host evidence). Author did not run these checks.
- [ ] Before runtime: verify adoption PR merged and target dependencies/ceiling plus applicable scoped execution gates.
- [ ] RED: plain manager + P-04 + no Lead ไม่มี link/direct access ทั้งที่ server อนุญาต scoped Trash
- [ ] เพิ่ม App scoped reader สำหรับ actor ที่ต้องพิสูจน์ P-04 manager; อ่าน paginated projects รวม archived จนพบ manager หรือครบ ไม่ใช้ sidebar first page หรือ `Self.project_ids` แทน role
- [ ] เก็บ snapshot ผูก actor/session/view_revision; invalidate/abort บน account/password/reconnect/revocation/unmount และกัน late replies. รักษา sidebar project list เดิม
- [ ] ใช้ scoped input ทั้ง link/direct route; pending/error/denied แยกได้และ retry ได้โดยไม่รั่วชื่อ/จำนวน. คง Admin/Lead fast path และ password/account gates
- [ ] GREEN + affected browser regression; host บันทึก source/build/commands/exits และส่ง independent review/parent gate ตาม authority ภายหลัง

## Acceptance

- [ ] Active plain explicit manager ของอย่างน้อยหนึ่ง readable project + P-04 เข้า Trash จากเมนูและ cold direct `/trash` ได้โดยไม่มี synthetic unrelated-team Lead. Empty scoped trash ยังเปิดเป็น empty state ได้
- [ ] ตรวจ manager อยู่หลังหน้า 100 และ archived-only managed project: แสดง Trash ได้ แต่ restore eligibility คง server lifecycle policy. Include-archived scoped fetch ไม่เพิ่ม archived boards ใน sidebar
- [ ] P-04 บน Editor/Viewer/unrelated account, manager ที่ไม่มี P-04 และ `project_ids` ที่เป็นเพียง read membership ไม่เปิด Trash. Job title/team_position ไม่ใช่ access Lead
- [ ] Admin และ any existing access Lead ยังเข้าหน้าได้ตามเดิม; Trash row/count/restore ถูก server จำกัดตาม owner-team/project เสมอ. Unrelated-team Lead ไม่ได้ข้อมูล project เพิ่ม
- [ ] Unknown/inactive identity, expired session และ password gate ทั้ง top-level/user flag ไม่ผ่าน privileged nav; settings/public behavior เดิมคงอยู่. Optional scoped input ที่ไม่มีข้อมูลไม่เป็น allow
- [ ] Pending cold route ไม่แสดง private content หรือ permanent denial ก่อนผลลัพธ์; failed lookup มี safe retry. Logout→different login, demotion/P-04 removal, view_revision refresh, reconnect และ delayed old-page replies ไม่คง stale positive scope/rows/dialog
- [ ] Real API negatives ยังกัน unrelated rows/counts และ restore หลัง revoke; 401/403/404 ล้าง private state, 409 ไม่ auto-confirm version ใหม่. Keyboard, 360/390/768/1440 และ zoom 200% ผ่าน affected shell scenarios

## Not Do

ไม่ grant P-04/Lead/manager อัตโนมัติ, ไม่เปลี่ยน server policy/wire, ไม่ใช้ role label หรือ global key แทน scoped membership. ไม่ปิด directory/parent-state blocker, ไม่ขยายไป notice/Dismiss cleanup และไม่ปิด parent/DEL-VALIDATION จาก NAV success

## Verify

**ทุกคำสั่งด้านล่างเป็น planned / NOT_RUN สำหรับ NAV follow-up หลัง formal adoption ด้วย; ขั้นนี้ไม่เริ่ม runtime.** Spec merge/planning adoption/formal card adoption บันทึกแล้ว; host verification ของ generation no-op/planning checks และ applicable scoped execution gates ยัง pending ก่อน runtime stage. ใช้ Node22 เดิม; RED ต้องล้มจาก behavior ข้างต้นก่อน GREEN. New tests ไม่มีอยู่ตอน author proposal

```sh
npx vitest run --config vitest.config.ts frontend/src/api.test.tsx frontend/src/App.test.tsx frontend/src/delivery-access-nav.test.tsx
node --import tsx --test tests/permissions/delivery-parity.test.ts
npm run test:permissions
npm run test:authorization
npm run test:frontend
npm run typecheck
npm run lint
npm run build
npm run check:contract
npm run test:contract
npm run check:test-plan
npm run test:test-plan
npx playwright test tests/browser/delivery-access-nav.spec.ts tests/browser/delivery-access-parity.spec.ts tests/browser/shell.spec.ts tests/browser/workspaces.spec.ts tests/browser/task-workspace-permissions.spec.ts tests/browser/delivery-drafts.spec.ts tests/browser/delivery-focus-mobile.spec.ts
```

Host จัด free `FRIDAY_TEST_PORT`, new disposable external `FRIDAY_BROWSER_FIXTURE` และ approved `TMPDIR` ก่อน browser; build ต้องผ่านก่อน ไม่ reuse/ยึด server อื่น. ไม่เรียก build:contract เพราะไม่มี wire change. NAV ไม่มี server/query migration change จึงไม่สร้าง PG suite ใหม่; real PostgreSQL/full regression เพิ่มเมื่อมี server concern หรือ scope เปลี่ยนผ่าน review ไม่อ้างผล SQLite เป็น PG. PG/production/UAT ยังคง NOT_RUN ไม่ใช่ acceptance จาก nav tests

## Questions

**Q-DAF-NAV-01 — ANSWERED / ADOPTED by Zo (design decision only):** “เริ่มเลย” รับรอง recommended frontend scoped project input + safe loading/retry direct route ตาม scope/acceptance ข้างต้นเท่านั้น. Alternative Self capability ไม่ได้เลือกและต้อง re-scope server/contract ก่อน. ไม่เพิ่ม business grant และไม่รอ DIR/PARENT decisions ซึ่งยัง OPEN/proposed; spec merge และ planning/formal card adoption บันทึกครบตาม Context วันที่ 2026-10-25. Runtime ยังไม่เริ่มในขั้นนี้และรอ host verification/applicable execution gates; adoption ไม่ใช่ implementation, independent code review หรือ test execution. Q-ID นี้ไม่ใช่ open question สำหรับ ticket status `blocked`

## Evidence / Review

### Current adoption host evidence — 2026-10-25

Host ran Node `v22.23.3` / npm `10.9.9` in the dedicated candidate after author exit. `npm run build:test-plan` exited 0; `tests/test-manifest.json` SHA-256 before and after was identical: `a31c0d0d61c50d1812c26b4efe43f42e5b970d24e4ae043f5ae6065d6ab7b7de`; `git diff --exit-code -- tests/test-manifest.json` exited 0. Generation is a verified byte-for-byte no-op, not an expected result. `npm run check:test-plan` exited 0 (96 tasks / 23 suites / 99 cases / 40 acceptance / 20 variants); `npm run test:test-plan` exited 0, 18 passed / 0 failed / 0 skipped. `git diff --check` PASS. These supersede generation/planning pending wording in the historical author handoff below; no runtime/PG/UAT/release result is implied. Independent adoption review **CLEAN (docs-only)** by Claude Opus 5.5 / High, session `185876c8-e50a-4fc4-884e-9efec6e40aa1`, reviewed patch SHA-256 `cb4cb47c40ee992e527885d54d2754ce144a329f53671b3bdef3f1c292615aa0`. Parent inspected the three-file diff and Git status; precommit gate **SATISFIED**, publication authorized. Host reconciled evidence/handoff prose only after review; no policy/design change. This supersedes stale pending review/generation wording elsewhere in the historical author handoff. Runtime starts only after this adoption PR is merged and applicable execution gates are checked; no merge/deploy authority.


Source inspection, owner design decision และ adoption record 2026-10-25 เท่านั้น; RED/GREEN/browser/contract/PG/UAT/deploy **NOT_RUN** สำหรับ follow-up. Historical independent proposal review **PERFORMED / CLEAN (docs-only)** และ parent precommit gate **SATISFIED** ตาม [host handoff](../../docs/product/del-access-followups.md#host-handoff--completed-proposal-review) ครอบคลุม original proposal เท่านั้น ไม่ครอบคลุม adoption amendment นี้. **Historical independent Claude prior-amendment review: initial NOT CLEAN — F1 Medium (mandatory T-ID/manifest mapping gate), F2 Low (`blocked` ไม่มี open question) → corrected → final re-review CLEAN (docs-only)**, session `ac71dfe5-47ea-4d3b-83d4-d9b4dfab1632`. ณ historical amendment นั้น mandatory planning gate และ draft/proposal frontmatter ผ่าน re-review; no new blocking findings. Reviewer ใช้ Read เท่านั้น ไม่รัน commands/hash หรือ verify remote. Parent อ่าน delta สองไฟล์แล้วและตรวจ `git diff --check` PASS; precommit gate **SATISFIED** ตาม parent handoff. Host อัปเดตเฉพาะ evidence/handoff prose ไม่เปลี่ยน reviewed design/policy; CLEAN/gate ไม่ใช่ formal card adoption, runtime acceptance หรือ merge authority. Independent runtime/code review **NOT_RUN**; author ไม่ invoke review, commit/push/PR หรือ Git writes. เมื่อทำจริงบันทึก build/source hash, provider, expected/actual, exit และ executed/skipped ใน card นี้ โดยไม่เขียนทับ historical DEL-ACCESS evidence. DEL-ACCESS **in_progress**, DEL-VALIDATION dependency **blocked**; register **9/96 completed, 87 remaining**. Current adoption patch (Zo continuation 2026-10-25) ไม่ได้รับ independent verdict หรือ parent/precommit verdict ใหม่จาก author. Generation no-op และ adoption-candidate planning checks **PENDING host / NOT_RUN by author**; host จะเพิ่ม verified results แยกภายหลัง. Next prerequisite **host generation/planning verification และ applicable review gates / High**; next runtime **DEL-ACCESS-NAV / High** หลัง gates ครบ ใน runtime stage แยกจากงานนี้. Subsequent proposed card **DEL-ACCESS-DIRECTORY / High**, policy gate ยัง OPEN


### Runtime author evidence — 2026-10-25 (current; host acceptance pending)

ส่วนนี้เป็น runtime record ล่าสุด แยกจาก adoption-stage/historical `runtime NOT_RUN` prose ด้านบน. **Status `in_progress`, ไม่ใช่ DONE**; T-081 primary / T-091 affected regression, declared **High**. ผู้ใช้ระบุ standalone sole author **gpt-6.1-sol / High**; author ไม่มี runtime selector/launch-log access จึง **actual setting NOT_VERIFIED by author**, ไม่อ้างว่าเปลี่ยน model/effort. ไม่มี sub-agent/reviewer invocation. PR9 merged `2026-10-25T04:18:38Z` และ freshly fetched base รับรองโดย host handoff; local read-only `git rev-parse HEAD` ยืนยัน `78b01c248896ad7e58736554752f088a23a74d4e`.

Preflight ตามลำดับ: `pwd` ตรง dedicated worktree, `node --version` = `v22.23.3`, `git rev-parse --git-dir --git-common-dir` แสดง worktree metadata และ shared common dir, `git status --short` ว่าง. Nontracked temporary workspace file เขียน/อ่านตรวจ bytes/ลบ **PASS** โดยไม่แตะ protected files. Scoped T-078 dependency ตรวจจาก Register §T-078 และ `docs/reports/TeamFlow_T078_Addendum_Merge_Report.md`: owner approval/spec mapping/check evidence มีอยู่; Register ยัง **IN_REVIEW** และไม่ถูกปิดโดย NAV. ใช้ formal PR9 adoption แทน historical NOT ADOPTED planning prose. DIRECTORY/PARENT ยังคง OPEN/out of scope; official counts **completed 9 / total 96 / remaining 87** ไม่เปลี่ยน.

Implemented เฉพาะ ceiling 7 paths: optional current scoped input ใช้ร่วม sidebar/direct route; independent includeArchived/pageSize100 lookup หยุดเมื่อพบ explicit manager หรือครบทุกหน้า; ไม่ใช้ sidebar first page, project_ids หรือ job title แทน role. Snapshot ผูก actor/session/view_revision พร้อม permissions version/auth epoch/retry generation; AbortController + request generation ปฏิเสธ late success/error และหยุดอ่านหน้าต่อหลัง invalidation. Clear/re-auth, account/password gates, reconnect/focus, revocation/revision และ unmount invalidate scope; remount Trash ตาม authority revision ล้าง rows/count/dialog. Trash 401/403/404 ทำลาย old positive scope แม้ /me ไม่เปลี่ยน; 403/404 ต้อง explicit retry ก่อนสร้าง workspace ใหม่. Admin/access Lead fast paths, active/password/public/settings gates และ active-only sidebar query เดิมคงอยู่. Archived manager reachability ไม่เพิ่ม lifecycle restore authority; ไม่มี server/Self/wire/dependency/config/shared-helper edits.

#### Vertical RED → GREEN (actual Node/Vitest, session transcript retained)

| Slice / exact command | Expected RED / actual exit 1 | GREEN / actual exit 0 |
|---|---|---|
| `npx vitest run --config vitest.config.ts frontend/src/api.test.tsx` | scoped plain P-04 manager Trash false แทน true; 13 passed / 1 failed (14) | 14/14 |
| `npx vitest run --config vitest.config.ts frontend/src/delivery-access-nav.test.tsx` — App reader | scoped calls 0 แทน >0; 0 passed / 1 failed | 1/1 |
| same command — pagination | only page 1 แทน [1,2], exhausted lookup 1 call แทน 2; 1 passed / 2 failed (3) | 3/3 |
| `npx vitest run --config vitest.config.ts frontend/src/api.test.tsx frontend/src/delivery-access-nav.test.tsx` — focus/held page | old signal ไม่ถูก abort; 36 passed / 1 failed (37) | 38/38 with next three-file regression command |
| single NAV command above — server denial | unchanged /me kept positive link after Trash 403/404; 27 passed / 2 failed (29) | 29/29; three-file regression 45/45 |
| same single NAV command — gate/permission snapshot | clearing password gate and changing permissions_version briefly rendered old Trash before effect; 29 passed / 2 failed (31) | three-file regression 47/47 |

Exact three-file regression command: `npx vitest run --config vitest.config.ts frontend/src/api.test.tsx frontend/src/App.test.tsx frontend/src/delivery-access-nav.test.tsx` → **PASS 47/47**, 3 files, exit 0. Existing `App.test.tsx` read only. Behavioral RED above were assertion failures, not missing imports. Intermediate test-harness failures (undefined child recursion / malformed Organization response during reconnect) were corrected as harness issues and are not counted as product RED. One lint run caught synchronous setState in an effect; reset moved to guarded render-time state adjustment before committing a disabled gate, with the first-render regression retained. No lint suppression/config change.

Node-only new NAV tests run App's actual hooks/effects with a local hook driver, real API parser and controlled fetch responses; child elements are inspected without mounting a DOM. They cover pagination/archived/empty/P-04 Editor/Viewer/title/position/no-P04/fast paths, pending/error/retry, old second pages across revision/actor/session/password/inactive/revoke, focus/reconnect, unmount, logout→different login, unchanged-me 403/404 and first-render invalidation. They do not prove browser focus/layout or replace real HTTP/browser checks.

Browser authoring: new `delivery-access-nav.spec.ts` contains **20 planned scenarios**, real fixture/API role boundaries, scoped rows/counts, hidden restore denial, actual revoke/reset/logout, page-two archived manager, pending/retry, held pages across revision/reconnect/revoke/account/reset, real stale restore 409 requiring a new explicit confirmation, 401/403/404 purge with held lists, keyboard and 360/390/768/1440 layouts. CSS zoom 200% is automated; **native browser zoom remains host/manual NOT_RUN**. Existing parity fixme is active with menu/direct/empty/API assertions; synthetic unrelated-team Lead grants removed from plain-manager fixtures. Separate genuine unrelated-team access Lead regression checks its own rows/counts and foreign restore denial. Existing restore-denial race observes the real shared poll because window focus now deliberately revalidates NAV scope. **All browser scenarios NOT_RUN by author**; no browser server launched.

#### Executed checks and limitations

| Exact command | Author result / exit |
|---|---|
| `node --import tsx --test tests/permissions/delivery-parity.test.ts` | PASS 8/8, 0 failed/skipped, isolated SQLite/service tests, exit 0 |
| `npm run test:permissions` | **BLOCKED sandbox**, command exit 1; runner 10 passed / 7 failed / 0 skipped; all 7 failures `listen EPERM: operation not permitted 127.0.0.1` |
| `npm run test:authorization` | **BLOCKED sandbox**, command exit 1; runner 12 passed / 2 failed / 0 skipped; both HTTP failures same listener EPERM |
| `npm run check:contract` | PASS, 89 routes / 120 schemas, exit 0 |
| `npm run test:contract` | PASS 66/66, 0 failed/skipped, exit 0 |
| `npm run check:test-plan` | PASS inventory 96 tasks / 23 suites / 99 cases / 40 acceptance / 20 variants, exit 0; candidate/final/production NOT_RUN |
| `npm run test:test-plan` | PASS 18/18, 0 failed/skipped, exit 0; plan validation only |

Exact blocked operation: HTTP fixtures' `Server.listen` on `127.0.0.1`, Node error **`listen EPERM: operation not permitted 127.0.0.1`**. No retry via wrapper, permission bypass, alternate host/port or escalation; host must rerun the original permission/authorization commands outside this sandbox. These are not claimed as product PASS. Successful SQLite assertions do not close PostgreSQL production acceptance.

Host owns `npm run build`, frozen-source/browser verification using the exact seven-file Playwright command in Verify, fresh external fixture/free ports/approved TMPDIR, all independent reruns, Claude review and parent gate. Those are **PENDING host / NOT_RUN by author**; no invented host PASS/review/build ID. No build:contract/build:test-plan generation because no wire/source-mapping changes. PostgreSQL/Linux/Docker/backup-restore/UAT/release/deploy remain NOT_RUN. No Git write/auth/network/commit/push/PR/merge/deploy and no other worktree changes. No permission or scope expansion requested. Next step **host verification + independent review / High**; source author exits after final evidence/ceiling checks, then resumes only for host-requested fixes. Parent DEL-ACCESS remains in_progress; DEL-VALIDATION and DIRECTORY/PARENT closure are not supplied by NAV.


Final frozen author checks: `npm run test:frontend` **PASS 86/86 (15 files), exit 0**; `npm run lint` **PASS exit 0, 0 errors/warnings**. `npm run typecheck` **PASS exit 0** (server/frontend/tools TypeScript). `git diff --check` **PASS exit 0** and read-only changed/untracked inventory equals **exactly the 7 allowed paths**; `App.test.tsx` and all protected/out-of-scope paths unchanged.

Frozen runtime/source-test fingerprint (excludes this evidence card): **SHA-256 `d1e2e6093aed814ea92dd2fe386e46d9b775234c24c6571b35ba6914ae7c0cd6`**. Algorithm: lexically sort the six source/test allowed paths, append UTF-8 path + NUL + exact file bytes + NUL for each, hash concatenation. No build was produced by author; host records its build/source candidate and independent results after exit. Completed/total/remaining remain **9/96/87**.


### Same-author browser follow-up — 2026-10-25 (current; acceptance still open)

Resumed the same sole-author session on host instruction; declared **High**, unchanged seven-path ceiling. No reviewer/server/browser/Git-auth invocation. Read host `browser.log` at `/Users/mickitang/.hermes/profiles/friday/cache/scratch/del-access-nav-runtime/browser.log`, its four `test-results/.../error-context.md` files, and supplied `review.json`. **Host handoff** reports all 12 nonbrowser card commands PASS on the previous frozen source (targeted 47, frontend 86, permissions 17, authorization 14, plus the other exact card checks). This supersedes the earlier host-pending/author-EPERM boundary for that candidate only; historical author EPERM results remain unchanged. Host exact seven-file Playwright run **exit 1: 91 passed / 4 failed (95 tests)**, plus one auxiliary teardown assertion outside test results: fixture root did not satisfy `dirname(fixture) === tmpdir()` and `/^friday-browser-[A-Za-z0-9]+$/`. Host identifies that auxiliary issue as **HOST ERROR** and owns fixture naming/cleanup; no teardown/config change by author.

Independent review of the previous implementation: **CLEAN IMPLEMENTATION**, reviewer session `f59e8b29-cb61-46e7-84d6-56bae24dc7b3`, read from supplied review.json; reviewer did not execute tests or recompute hashes. Its verdict is conditional on host verification and does not certify the resumed test patch or close browser/native zoom/parent acceptance. No fresh review was invoked.

#### Four browser failures: diagnosis and exact scoped response

1. **Single-page count visibility assertion (old NAV L208): test defect.** `frontend/src/vibe.css` L1472–1476 intentionally hides a three-child pager when both navigation buttons are disabled. Error context shows the actual scoped table and task, while the pager exists but is hidden. Replaced the visible-pager assertion with a visible `Trashed tasks` table, **exactly one tbody row**, and the exact visible scoped task cell. Preserved the real `GET /api/trash` `total === 1`, exact ID set, hidden row/project exclusions, foreign restore 404, and post-revoke 404/403 plus private-state purge. No stylesheet/product change or privacy assertion removal.
2. **Held page after reconnect (old NAV L369): synchronization defect supported by controlled recovery test.** Original test performed offline→online back-to-back, then dispatched a second synthetic online event and treated the first successful `/me` as recovery completion. App still awaits `refreshCurrentReaders()` and retries after 5000ms if `readFailureCount` changes; the host snapshot explicitly shows `Checking for updates before enabling changes` and `Loading…`, not stale privilege. Added a controlled fake-clock test of the existing App path: inject a read failure after the first reconnect `/me` starts, prove pending/no denial/private child through 4999ms, then prove recovery/denial after the 5000ms retry and commit turn; an old successful page cannot grant access. **No production concurrency changes.** Browser now observes committed offline banner/private child absence, registers `/me` response before restoring online, uses the actual online event once, and awaits the recovery status disappearing with a **15000ms timeout covering the existing retry**, then asserts genuine denial and no stale link/workspace after releasing the old response. The default 5s denial assertion alone did not cover the 5s backoff plus resource barrier. Mobile navigation helpers select layout by the toggle's visibility, then await the real Trash link, avoiding lookup timing as a proxy for mobile layout.
3–4. **360/390 CSS zoom 2 overflow: unresolved, rescope required for layout.** Host observed overflows **289px / 259px**, i.e. document width **649px in both cases**. Tests still require no document overflow at both zoom 1 and zoom 2 and all four widths; no skip, tolerance increase, reduced matrix or acceptance reinterpretation. Added actor-specific computed geometry and failure screenshot attachments because the two default error-context snapshots show the Admin fixture Home rather than the actor Trash page. Metrics include viewport/document, topbar children, sidebar, content/Trash/footer, and largest overflowing rectangles without capturing text. Host must use those actor measurements and an equivalent base fixture before attributing a baseline issue.

**Source diagnosis vs confirmed evidence:** the observed overflow is confirmed by the host log; the exact overflowing element is **not yet runtime-confirmed**. The leading source-level cause is the mobile topbar's unwrapped flex row (`vibe.css` L75–84/942–960), non-shrinking/no-wrap brand and Notify (`page-headers.css` L42–47), fixed-size actions (`design-preview/vibe/workspace-theme.css` L217–259), and 40px mobile toggle minimum (`responsive-fixes.css` L112–114). At root CSS zoom 2, 360/390px gives roughly 180/195px layout room while CSS media query breakpoints remain viewport-based. A constant minimum row width fits the equal 649px result; this is an inference, not a measured exact contributor. Sidebar is normally hidden after activating the link; its open state also has fixed width 230px/top46px in vibe.css and must be considered if the shell reflows. The tested Trash is empty, so the 940px table rule is not itself proof of this failure.

Existing generic shell coverage is not equivalent: `shell.spec.ts` tests **360px font-size 200% on unauthenticated login/help**, not root CSS zoom 2 on this shell; `delivery-focus-mobile.spec.ts` tests **1440px root CSS zoom 2**, effectively about 720px layout, not 360/390px root zoom. **Native browser zoom 200% remains NOT_RUN.** No claim that CSS and native zoom are equivalent or that passing the old generic test closes this matrix.

**Layout change stopped at ceiling.** Proposed smallest additional write scope: `frontend/src/responsive-fixes.css` for measured narrow-shell reflow of `.app-layout > .topbar` and, if needed, `.sidebar.menu-open`, preserving the normal 360px controls/keyboard behavior. That file is outside the seven paths, so author has not modified it. Host actor geometry/base comparison must determine the actual selectors before implementation; no need to expand Trash.tsx based on current evidence. No inline/global style injection, hiding controls, overflow clipping or ad hoc App markup workaround to evade the ceiling. Layout/browser acceptance remains **BLOCKED pending evidence + explicit stylesheet rescope**.

#### Resumed author verification / frozen handoff

Host browser failures are the actual behavioral RED for the test corrections; author did not rerun browser/server, so **browser GREEN for this patch is NOT_RUN**. The new controlled unit test first exposed the hook driver's permanently-true writable stub; corrected that stub to model the writable state and advanced the retry's final commit turn. Those intermediate assertion failures were harness corrections, not a claimed new production RED/GREEN implementation. Existing production App/navigation/API and parity implementation are unchanged in this resume.

`npx vitest run --config vitest.config.ts frontend/src/delivery-access-nav.test.tsx` → **PASS 32/32, exit 0**. Exact three-file command `npx vitest run --config vitest.config.ts frontend/src/api.test.tsx frontend/src/App.test.tsx frontend/src/delivery-access-nav.test.tsx` → **PASS 48/48, exit 0**. Full frontend/build/browser reruns remain host-owned for the new frozen patch; old host 86 frontend and 91/95 browser counts are historical, not upgraded by the new test.

Only resumed writes: `frontend/src/delivery-access-nav.test.tsx`, `tests/browser/delivery-access-nav.spec.ts`, this card. Existing host-generated dirty `reports/UI-*.png` files were observed at resume and left untouched; no restore/cleanup outside ceiling. Status remains **in_progress**, not DONE. Official **completed 9 / total 96 / remaining 87**; DIRECTORY/PARENT questions remain OPEN/out of scope. Next **host actor geometry/base verification and stylesheet scope decision / High**, then authorized layout TDD and host reruns; no parent gate or acceptance sign-off claimed.

Current six-source/test fingerprint: **SHA-256 `e60468cfd95bb8dceefd946492dfe2e13bc596ac1fb4cec148faa0ec73400c3d`**, using the same sorted path + NUL + bytes + NUL algorithm, excluding this card. Previous frozen fingerprint and all host historical failures remain above.

Resumed final checks: `npm run typecheck` **PASS exit 0** (server/frontend/tools); `npm run lint` **PASS exit 0**, no errors/warnings. Author freezes the above three-path follow-up and exits for host handling of the unresolved stylesheet scope; no browser recovery/zoom GREEN or new review/parent verdict claimed.

### Owner-approved CSS scope amendment — 2026-10-25 (recorded BEFORE CSS edits)

Zo explicitly answered clarify: **“อนุมัติแก้ CSS และตรวจต่อให้พร้อม PR”**. This supersedes the historical seven-path ceiling ONLY by adding `frontend/src/responsive-fixes.css`: current exact **8-path ceiling** is the `allowed_paths` list above (the original seven plus that stylesheet). Fix only the measured baseline mobile `.topbar-actions` reflow (and tightly related shell positioning if demonstrated necessary); preserve compact Vibe/English-base owner design and every control, keyboard access, original overflow assertions and 360/390/768/1440 CSS/native 200% coverage. No clipping/hidden overflow, synthetic grants, server/Self/contracts/config/lock/protected-file edits or screenshot delivery. Host actor probe confirmed native 200% overflow 144/129 CSSpx at 360/390 with real `Profile of NavActor`; fetched-base shell independently reproduced overflow. Prior exact CSS tests fail 289/259px and remain the RED evidence.

Same standalone Codex author/session `01a1715c-8842-74a0-828e-c83aeff8f426`, `gpt-6.1-sol / High`, resumes only after narrow scope/style review; freeze before host build/browser and independent CSS delta review. CSS approval is NOT command permission: the prior 12:25:30 artifact regenerate/byte-compare terminal invocation remains **PENDING_APPROVAL**, must not be retried through another route. No commit/push/PR until PARENT precommit authorization; no merge/deploy. Counts remain 9/96/87. Host records new actual tests/review separately; no acceptance implied by amendment.


### Approved CSS implementation — same sole author, 2026-10-25 (frozen for host verification)

Owner approval and exact 8-path amendment above were read **before** CSS edits. Read `css-scope-review.json`: narrow scope/style review **APPROVED**, not a code CLEAN verdict. Same author/session, declared/runtime setting **gpt-6.1-sol / High per host/user handoff**; author did not change any runtime setting. Resume writes only `frontend/src/responsive-fixes.css`, `tests/browser/delivery-access-nav.spec.ts` and this evidence card. Production App/navigation/API remain unchanged since the originally reviewed implementation; no server/contracts/config/lock/protected/report/screenshot changes.

**Actual RED reused before the patch:** supplied `actor-native-zoom.json` confirms real **Profile of NavActor** in Trash. Native 200% at physical 360/390 yields `innerWidth` **180/195**, `scrollWidth` **324**, overflow **144/129 CSSpx**; overflowing `.topbar-actions` is **167.2421875px** wide and ends at **324.265625px**. Native 100%, and native 200% at 768/1440, report zero overflow. Supplied fetched-base `baseline-native-zoom.json` reproduces the same 144/129; `baseline-reflow.json` reproduces root CSS zoom 2 document width **649** and overflow **289/259**, with `.topbar-actions` ending at **648.53125px**. These are host execution evidence, not author browser runs. Historical original 91/95 + 4 failures and auxiliary fixture HOST ERROR remain preserved above. Host handoff also confirms the prior row/revoke and reconnect test corrections PASS; no new overall count is inferred.

**Minimal stylesheet change, entirely inside `@media (max-width: 760px)`:**
- `.app-layout > .topbar` wraps between whole controls/groups. `.topbar .topbar-actions` also wraps, with `min-width:0` and `max-width:100%`, since its measured 167.24px intrinsic width exceeds the 156/171px content room at 180/195px viewport. Gaps, wordmark/Notify no-wrap text, action sizes and the existing 40px toggle/24px minimum targets are unchanged. At normal mobile widths the existing compact row still fits; selectors do not apply when the CSS viewport exceeds 760px.
- A wrapped header is taller than the drawer/backdrop's previous fixed `top:46px`. Named CSS anchor `--friday-topbar` ties `.sidebar.menu-open` and `.menu-backdrop` to the actual header bottom; existing 46px is the fallback for engines without CSS anchor positioning. `.sidebar.menu-open` has `max-width:100%` so the old 230px drawer cannot widen an 180/195px layout. **CSS anchor geometry/support across the host browser matrix is an explicit verification point**, including unsupported-engine fallback; no compatibility PASS is claimed. This retains the existing overlay drawer and scroll behavior rather than moving navigation into page flow.
- No hidden/clip overflow, hidden controls, font/control shrinking, global inline styles, App markup workaround, or changes to brand/Notify rules. No Trash content styling changes.

**Test-first boundary:** existing strict 360/390 browser failures (289/259) are the behavioral RED authorized by the user; strengthened existing four-width browser scenarios before editing CSS. Original document-overflow assertions at CSS zoom 1/2 remain exact. Added fully visible/focusable Help/Notify/Profile/toggle checks, opening via keyboard, focus-scrolling to Trash within the drawer, drawer bounds below the live header and within the viewport, no page overflow while open, and keyboard closing. These checks use the original allowed browser test file; no test/config/shared helper expansion. CSS zoom retains viewport media-query behavior while native zoom changes `innerWidth`; host must exercise both independently. Native/CSS **post-patch GREEN NOT_RUN by author**, so this is not closed acceptance.

**Author actual checks:**
- `npx vitest run --config vitest.config.ts frontend/src/api.test.tsx frontend/src/App.test.tsx frontend/src/delivery-access-nav.test.tsx` → **PASS 48/48, 3 files, exit 0**.
- `npm run typecheck` → **PASS exit 0**, server/frontend/tools.
- `npm run lint` → **PASS exit 0**, no errors/warnings.
- `npx prettier --write frontend/src/responsive-fixes.css tests/browser/delivery-access-nav.spec.ts` → exit 0; exact allowed paths only. Final browser assertion-only adjustment additionally checked below.

No author build/server/browser or reviewer invocation. Original artifact regenerate/byte-compare command at 12:25:30 remains **PENDING_APPROVAL**: not executed/retried, and no `review*.diff`/hash artifact regenerated or written through any route. The source fingerprint below is calculated only in memory for this requested handoff, excluding the card; it does not regenerate or compare review artifacts.

Frozen **seven source/test/style** fingerprint: **SHA-256 `152691ecf37df76f8819db985a42212f7554f7c3aa4e89950ef70ddf72d1e84d`**. Same algorithm as above: sort the seven allowed paths excluding this card, concatenate UTF-8 path + NUL + exact bytes + NUL, hash in memory. The additional path versus historical six-file fingerprints is `frontend/src/responsive-fixes.css`.

Host owns build, the exact prior CSS failures then affected 360/390/768/1440 CSS/native keyboard/open-and-closed navigation checks, relevant seven-file regression and fresh independent CSS delta review. Domain gates reuse the unchanged implementation evidence per host instruction. Status **in_progress**, no DONE/ready-for-PR/parent gate claim; official **completed 9 / total 96 / remaining 87**. Next **host build/browser + independent delta review / High**. Author freezes and exits after final local check results; no publication authority.

Final assertion-only checks: `npx tsc -p tsconfig.tools.json` **PASS exit 0**; `npx eslint tests/browser/delivery-access-nav.spec.ts` **PASS exit 0**, no errors/warnings. No source/test/style writes after the fingerprint above; evidence-card append only.

### Current host verification / PARENT handoff — 2026-10-25 (historical pending disposition; superseded below)

After author exit, host verified the exact seven-path source fingerprint **`152691ecf37df76f8819db985a42212f7554f7c3aa4e89950ef70ddf72d1e84d`**, unchanged throughout build and tests (`FROZEN_SOURCE_MATCH true`). CSS-only `git diff -- frontend/src/responsive-fixes.css` SHA-256 **`1d3305da9d6a6b817104e7ee888319e1277a0a615c9ad14fd45cad132aa30634`**. Per-path hashes and actual command/exits are in external scratch `del-access-nav-runtime/css-source-frozen.json` and `css-host-results.json`; this is new CSS candidate evidence, not regeneration/byte comparison of the blocked old review artifacts.

- Host `npm run build` PASS exit 0, then exact original failing cases `npx playwright test tests/browser/delivery-access-nav.spec.ts --grep '(360|390)px plain manager keyboard'` **2/2 PASS**. Original overflow tolerance unchanged; no hidden/clipped overflow.
- Host `npm run test:frontend` **87/87 PASS**, including the added reconnect unit test; `npm run typecheck` and `npm run lint` PASS exit 0. Same source-matched earlier domain results reused: parity 8/8, permissions 17/17, authorization 14/14, contract 66/66, planning 18/18 and checker results; no server/wire/mapping inputs changed, not claimed as rerun.
- Host exact seven-file browser command in Verify **95/95 PASS, exit 0**, 311.58 seconds; disposable fixture naming/TMPDIR correct, no auxiliary teardown failure. Includes all four CSS viewport/zoom and keyboard/open-drawer/control-bounds checks, scoped real API negatives/stale/revoke/409/reconnect and affected regression. See `css-browser-regression.log`; old 91/95 is historical only.
- Actual isolated Chromium native `chrome.tabs.setZoom/getZoom` with real `Profile of NavActor`: **8/8 combinations PASS** (360/390/768/1440 × 100/200%). At 200%, innerWidth = 180/195/384/720; all document overflow **0px**. Keyboard Trash navigation, heading focus, all topbar controls focusable/in-bounds, drawer open/closed bounds and live header alignment passed. Supplemental host read-only probe also asserts main/heading below header at all eight combinations (mainTop equals headerBottom). `css-native-keyboard.json`, `css-native-content.json` and `.mjs` preserve exact measurements/procedure. Initial auxiliary probe erroneously expected route-focus transfer when reactivating the already-current Trash route; fixed probe to navigate from Home before each activation, no source/test assertions weakened. This harness correction is not a product failure. Other browser engines, PostgreSQL/UAT/release remain NOT_RUN; unsupported CSS-anchor-engine fallback remains an explicit low compatibility limitation.
- Independent Claude Opus 5.5 / High, original session `f59e8b29-cb61-46e7-84d6-56bae24dc7b3`, fresh live CSS/test delta review **CLEAN, no blocking findings**, tied to frozen hashes (`css-delta-review-final.json`). Initial bounded attempt hit max_turns and produced no verdict; resumed same review to completed/is_error=false. Low suggestion to assert content below wrapped header is now host-verified without changing source. Low unsupported-engine CSS anchor fallback caveat retained. Review's broad-browser/report conditions subsequently satisfied: 95/95 and `git diff --exit-code -- reports` PASS after restoring only the seven known generated PNG outputs. No screenshot changes delivered.

Original **12:25:30 artifact regenerate/byte-compare invocation remains PENDING_APPROVAL**, exact tool result preserved externally in `pending-approval-original.json` (origin session `20261025_113846_ace283`, tool message 6523). It was not retried or rerouted; scope approval does not authorize that command. Therefore old scoped-artifact equality/disposition is not claimed complete. Current source delta review is CLEAN independently; PARENT must resolve the outstanding command permission and inspect exact candidate before authorizing commit/publish. No commit/push/PR/merge/deploy performed. Card remains **in_progress**; Register programmatically rechecked **96 rows: DONE9, IN_PROGRESS84, IN_REVIEW1, TODO2 → 9/96/87**, unchanged. Next **PARENT precommit/publication gate / High**, not another implementation dispatch.

### PARENT publication gate and superseded-command disposition — 2026-10-25 (current)

**PARENT precommit gate SATISFIED; evidence-only card update, exact-eight-path commit/push and ready PR publication AUTHORIZED.** Parent directly inspected current App/navigation/CSS and API/parity test diffs, exact-eight-path status/diff-check, source-matched host results (all exits 0), browser **95/95**, frontend **87/87**, native **8/8** (overflow 0; main/heading below header; keyboard true), and independent `css-delta-review-final.json` **CLEAN** with all seven current source hashes covered. Same sole implementation author: standalone Codex session `01a1715c-8842-74a0-828e-c83aeff8f426`, `gpt-6.1-sol / High`; independent reviewer: Claude Opus 5.5 / High, session `f59e8b29-cb61-46e7-84d6-56bae24dc7b3`. Reviewer inspected source and host evidence, did not personally execute tests or recompute hashes. Parent approved publication, not merge/deploy or full acceptance.

**Old command disposition: OBSOLETE / ABANDONED / NOT_RUN.** The original pending artifact regenerate/byte-compare invocation (origin tool message 6523, exact record retained in external `pending-approval-original.json`) compares the pre-CSS candidate and is superseded, not approved, not bypassed and not retroactively CLEAN. Do not execute or rewrap it. This disposition does not claim the underlying tool request was cancelled systemwide. Current review explicitly did not rely on that old artifact; parent inspected the actual-source CSS/test delta and latest hash-scoped verdict. No old artifact equality result is needed or claimed for publication.

Finalizer fetched `origin/main`: unchanged at base `78b01c248896ad7e58736554752f088a23a74d4e`, so no new base conflicts or stale-gate source changes. Normal current-source verification confirmed exact seven per-file SHA-256 values in `css-source-frozen.json`, combined fingerprint **`152691ecf37df76f8819db985a42212f7554f7c3aa4e89950ef70ddf72d1e84d`**, exact eight allowed changed paths, `git diff --check` PASS and no report changes. Only this evidence card was edited after source freeze; no implementation edits, broad retests or author redispatch. Publish an attributed independent-review comment against the full published HEAD and verify remote HEAD/files/comment/CI; preserve human merge.

**Limitations retained:** unsupported CSS-anchor browser fallback is a low compatibility caveat; non-Chromium/PG/Linux-Docker backup-restore/UAT/release/deploy NOT_RUN. DIRECTORY/PARENT remain OPEN/out of scope. Card and DEL-ACCESS remain **in_progress**, not full DEL-ACCESS/T-081 DONE; official counts remain **9 completed / 96 total / 87 remaining**. Next **human PR review/merge decision / High**, with CI status reported separately after publication; no automatic merge/deploy.
