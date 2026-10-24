---
id: DEL-ACCESS-NAV
title: "Proposed scoped Trash navigation for plain P-04 managers"
type: fix
priority: P0
owner: "unassigned"
status: draft
proposal: true
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

# DEL-ACCESS-NAV — proposed first follow-up

## Context

**PROPOSED / ไม่ adopt / runtime NOT_RUN**. Declared **High** เพราะ shell permission parity และ revocation lifecycle; actual author runtime **gpt-6.1-sol / High**, verified by host launch log ตามที่ host ยืนยัน. เสนอเป็น card แรกที่เล็กที่สุดหลัง merged partial PR6, inspected base `ab47abe0d52ad12d73de7c3d6694ecbf85c149ea`. ไม่ depends_on full DEL-ACCESS เพราะเป็นงานปิด blocker ของ parent เอง; base partial implementation เป็น prerequisite. Host owns Git/auth/review; sole Codex CLI author

## References

[Proposal / decisions](../../docs/product/del-access-followups.md#unanswered-follow-up-decisions) · [Parent](DEL-ACCESS.md) · [Blocker evidence](../../docs/product/evidence/DEL-ACCESS.md#scope-limitations-found) · [D09](../../docs/product/delivery-decisions.md#d09--uiserver-permission-parity-no-automatic-grants) / [R09](../../docs/product/delivery-rules.md#10-ux-reliability-และ-validation-r09r11) · [Common gates](../../docs/product/delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here)

Source anchors at base: [navigation.ts](../../frontend/src/navigation.ts) `allowedPages` L14; [App.tsx](../../frontend/src/App.tsx) project read L370, nav L409, direct-route deny L725, Trash L805; [api.ts](../../frontend/src/api.ts) `selfSchema`; [api.test.tsx](../../frontend/src/api.test.tsx) navigation table L96; [browser parity](../../tests/browser/delivery-access-parity.spec.ts) `test.fixme` L158. Server references: [authorization.ts](../../src/services/authorization.ts) Trash branch L291; [tasks.ts](../../src/services/tasks.ts) `list` / `trashMutation`; [task-query.ts](../../src/repository/task-query.ts) scoped trash predicate. Trace: partial TC-034/087/088/089, AT-13/32; no formal case closure

## Files

- ref: Self schema, server services/query above and [shared refresh](../../frontend/src/shared/refresh.ts); read only. Self has global keys and project IDs, no manager roles
- touch: `allowed_paths` เป็น **proposed future implementation ceiling**; current docs-only action สร้าง card/proposal เท่านั้น. `frontend/src/delivery-access-nav.test.tsx` และ `tests/browser/delivery-access-nav.spec.ts` เป็น **planned new tests**, ตรวจ filename อีกครั้งเมื่อ adopt
- Integration: เปลี่ยน `allowedPages` ให้รับ scoped input และ App caller ให้ส่งข้อมูลเดียวกันกับ sidebar/direct-route gate; เพิ่ม tests ของ legacy callers ใน `api.test.tsx`. Existing App foundation test รัน regression ไม่ต้องแก้. Browser parity fixme ให้เปิดใช้ assertion จริงเมื่อแก้ครบ ไม่ลบทิ้งเพื่อให้ green
- ห้ามแตะ: server/Self/contract, existing DEL-ACCESS evidence/card, AGENTS, config/runtime/dependencies/lockfiles, inventory/old Task Register. ถ้าต้องแก้ shared reader นอก ceiling ให้ re-scope ก่อน

## Tasks

- [ ] Owner adopt Q-DAF-NAV-01 และ exact scope; ไม่ถือ proposal เป็น authority เริ่ม runtime
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

**ทุกคำสั่งด้านล่างเป็น planned / NOT_RUN ใน proposal นี้.** ใช้ Node22 เดิม; RED ต้องล้มจาก behavior ข้างต้นก่อน GREEN. New tests ไม่มีอยู่ตอน author proposal

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

**Q-DAF-NAV-01 — OPEN:** แนะนำ frontend scoped project input + safe loading/retry direct route; alternative Self capability ต้อง re-scope server/contract ก่อน. ไม่ใช่ unresolved business grant และไม่รอ DIR/PARENT decisions แต่ต้อง explicit adoption ก่อน coding

## Evidence / Review

Source inspection only; RED/GREEN/browser/contract/PG **NOT_RUN** สำหรับ follow-up. Independent proposal review **PERFORMED / CLEAN (docs-only)** และ parent precommit gate **SATISFIED** ตาม [host handoff](../../docs/product/del-access-followups.md#host-handoff--completed-proposal-review); runtime/code review **NOT_RUN**. Author ไม่ invoke review. เมื่อทำจริงบันทึก build/source hash, provider, expected/actual, exit และ executed/skipped ใน card นี้ โดยไม่เขียนทับ historical DEL-ACCESS evidence. DEL-ACCESS **in_progress**, DEL-VALIDATION dependency **blocked**; register **9/96 completed, 87 remaining**. Next proposed card **DEL-ACCESS-DIRECTORY / High**, policy gate ยัง open
