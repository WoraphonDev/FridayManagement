---
id: DEL-ACCESS-NAV
title: "Proposed scoped Trash navigation for plain P-04 managers"
type: fix
priority: P0
owner: "unassigned"
status: ready
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
