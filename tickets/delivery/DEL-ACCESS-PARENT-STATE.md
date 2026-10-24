---
id: DEL-ACCESS-PARENT-STATE
title: "Proposed actor-scoped restore and unarchive capability metadata"
type: security
priority: P0
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: DEL-ACCESS
children: []
depends_on: ["DEL-ACCESS-NAV"]
relates: { prd_ac: ["AT-13", "AT-14", "AT-32"], fr: ["FR-09", "FR-17", "FR-42", "FR-42A"], security: ["BR-14", "BR-16", "BR-21", "BR-22"], permissions: ["P-04"], api_operations: ["GET /api/projects", "PATCH /api/projects/{id}", "GET /api/trash", "POST /api/tasks/{id}/restore"], ui_pages: ["/projects", "/trash"], db_tables: [] }
questions: ["Q-DAF-PARENT-01", "Q-DAF-PARENT-02"]
allowed_paths:
  - "src/services/workspaces.ts"
  - "src/services/tasks.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/Trash.tsx"
  - "frontend/src/workspace-api.ts"
  - "frontend/src/task-api.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "tests/permissions/delivery-parent-state-suite.ts"
  - "tests/permissions/delivery-parent-state.test.ts"
  - "tests/postgres/delivery-parent-state.test.ts"
  - "tests/contracts/delivery-parent-state.test.mjs"
  - "tests/browser/delivery-access-parent-state.spec.ts"
  - "tickets/delivery/DEL-ACCESS-PARENT-STATE.md"
---

# DEL-ACCESS-PARENT-STATE — proposed minimal capability follow-up

## Context

**PROPOSED / BLOCKED on disclosure + wire decisions / ไม่ adopt**. Declared **High** เพราะ cross-team privacy, archive exceptions และ races; actual runtime model/effort **NOT_VERIFIED**. Base `ab47abe0d52ad12d73de7c3d6694ecbf85c149ea`. เสนอ dependency NAV เพื่อให้ plain cross-team manager ทดสอบผ่าน shell จริง; ไม่มี dependency ต่อ directory policy และไม่รอ full parent DONE. Host ดูแล Git/auth/review; sole Codex CLI author

## References

[Proposal / decisions](../../docs/product/del-access-followups.md) · [Parent](DEL-ACCESS.md) · [Blocker evidence](../../docs/product/evidence/DEL-ACCESS.md#scope-limitations-found) · [R09](../../docs/product/delivery-rules.md#10-ux-reliability-และ-validation-r09r11) · [Rollout gates](../../docs/product/delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here) · [locked API](../../TeamFlow_API_Contract.md) · [release variants RV-01/03/04/05/08](../../TeamFlow_Test_Release_Manifest.md). Proposed partial trace: TC-034/035/087/088/089, AT-13/14/32; not full formal acceptance

Source anchors: [workspaces service](../../src/services/workspaces.ts) `projectColumns` L60 / `project` L131 / `projects` L434 / `patchProject` L515; [tasks service](../../src/services/tasks.ts) `dtos` L199 / `list` L936 / `trashMutation` L967; [authorization](../../src/services/authorization.ts) `projectAccess` L128 / `writable` L178 / restore+unarchive checks L382–403; [Trash](../../frontend/src/Trash.tsx) project/team lookup L73–110; [Workspaces](../../frontend/src/Workspaces.tsx) `actionsFor` L320 / `EntityDialog.submit` L1073; [frontend Project](../../frontend/src/workspace-api.ts) L29 and [TrashPage](../../frontend/src/task-api.ts) L89; [generator](../../scripts/build-contract.mjs) `Project` L65 / `TrashPage` L115

## Files

- ref: authorization/retention predicates, [task query scoping](../../src/repository/task-query.ts), [route passthrough](../../src/api/tasks.ts) `get_api_trash` / restore and [workspace handlers](../../src/api/workspaces.ts); no new route or authorization grant. [PG fixture](../../tests/schema/fixtures.ts) / [existing provider suites](../../tests/tasks/provider-suite.ts) เป็น pattern ไม่แก้ shared fixtures
- touch: exact `allowed_paths` เป็น **proposed future ceiling**. Suite `delivery-parent-state-suite.ts` และ SQLite/PG wrappers เป็น **planned new tests** ด้วย real provider/HTTP; contract/browser tests เป็น **planned new artifacts**, ไม่ใช่ไฟล์ที่รันแล้ว
- Integration: serialize Project **ทุก path** (`projects` list และ shared `project()` ที่ใช้ create/patch replies) กับ Trash-only list assembly; อย่าเพิ่ม field ให้ shared Task DTO/board/history โดยไม่ตั้งใจ. Frontend strict Project/Trash parsers, Trash row/button/dialog refresh และ Workspaces unarchive row/dialog/latest/retry ต้องตรง wire เดียวกัน. Shared consumers ของ Project รัน regression แม้ไม่ต้องแก้
- ห้ามแตะ: raw team DTO/directory visibility, schema/migrations/DB adapter/grants, Self/nav, AGENTS/config/dependencies/lockfiles, old Task Register/inventory/manifest และ existing DEL-ACCESS evidence. ถ้าต้อง factor shared authorization helper หรือแก้ fixture นอก ceiling ให้ re-scope ผ่าน review ก่อน

## Tasks

- [ ] Adopt NAV prerequisite, Q-DAF-PARENT-01/02 และ exact allowed paths; ไม่สร้าง field/contract version ที่ตกลงเองก่อนตอบ
- [ ] RED: cross-team P-04 manager อ่าน project แต่ GET teams ไม่มี owner team; archived-owner restore ดู enabled จาก missing-team inference. เพิ่ม unarchive capability/deny tests แยกจาก restore exception
- [ ] Serialize actor-scoped capability เท่านั้นหลัง scoped authorization; proposed names `can_restore` (Trash row), `can_unarchive` (Project). Read-only capability ไม่ persist ลง project/task/audit model และไม่ขยาย raw invisible team metadata
- [ ] UI ใช้ current capability แทนการกวาด team metadataเพื่ออนุมาน action; missing/null/error เป็น unknown disabled ตาม proposed default ไม่ positive. คง online/maintenance/retention/version/confirmation gates
- [ ] Refresh on current reads/view_revision/denial; invalidate epochs/abort old responses. Latest metadata ที่เปลี่ยนต้องยกเลิก confirmation เก่า ไม่ silently upgrade version
- [ ] Mutation recheck authority/parent/retention/version ยังเป็น server decision; GREEN contract/provider/browser/races แล้ว host source freeze, independent review, parent gate

## Acceptance

- [ ] Exact field names/requiredness/version/default และ minimal disclosure ได้รับการ adopt; recommendation คือ required booleans ใน new wire, missing/null unsupported เป็น load/unknown disabled ใน UI ไม่ default true. Contract/client compatibility ต้องชัดเจนก่อน merge
- [ ] Capability ส่งเฉพาะ resource ที่ actor อ่านได้; ไม่มี new team archive flag/timestamp/roster/count หรือ hidden-resource reason. False แสดง generic unavailable. Existing readable project owner-team id/name ไม่ถูกใช้เป็นสิทธิ์อ่าน team ใหม่
- [ ] `can_restore` สะท้อน current scoped role + lifecycle/retention: Admin/owner-team access Lead คืน task ใน archived project/team ได้ตามเดิม; P-04 manager คืนได้เฉพาะ active parents และ cutoff ยังไม่หมด. Global P-04/editor/viewer/unrelated ไม่เพิ่มแถวหรือ capability
- [ ] `can_unarchive` สะท้อน Admin/owner-team Lead + archived project + active owner team; manager แม้ P-01/P-04 ไม่ได้ unarchive, Admin ก็ไม่ bypass TEAM_ARCHIVED. ไม่เปลี่ยน archived metadata/member conservative UI ของ PR6
- [ ] Cross-team actor ที่ไม่มี owner team ใน GET teams ยังได้ correct action availability โดยไม่เพิ่ม team access. Test active team, archived team, archived project, both archived และ retention -1ms/exact/+1ms. UI online/maintenance gates ยังแยกจาก snapshot capability
- [ ] Stale true แล้ว archive/revoke/demote/expire/version-change ก่อน confirm: server deny/409 ตาม existing contract; refresh metadata/dialog อย่างปลอดภัย. 401/403/404 ล้าง private rows/counts/dialog/drafts และ late pre-denial responses ไม่เติมกลับ; positive snapshot ไม่รับประกัน mutation success
- [ ] Real PG races ใช้สอง connections/barriers ทั้ง commit orders: archive-vs-restore/unarchive, revoke-vs-restore และ competing versions/retention cutoff. Preserve existing server invariants/errors; ไม่มี automatic retry ที่ bypass fresh confirmation หรือ weaken race assertion
- [ ] Read-only DTO queries ไม่เขียน effects; failed mutations rollback task/project/version/audit/notification ครบ, successful restore/cleanup/audit/notification atomic ตามเดิม. Browser real plain manager/Admin/owner Lead, keyboard, responsive/zoom และ generic denial ไม่มี hidden parent metadata
- [ ] Project create/patch/list replies กับ strict parser ผ่านทุก path; Trash capability ไม่หลุดไป TaskPage/board/history. Existing service/permission/browser regressions คง assertion เดิม

## Not Do

ไม่เพิ่ม `owner_team_archived_at` หรือ broad GET teams grant, ไม่เปลี่ยน archive exceptions/P-keys, ไม่ทำ capability เป็น authorization token, ไม่เปลี่ยน locked error precedence โดยพลการ. ไม่ปิด directory discovery blocker หรือ parent/full task จาก contract presence และไม่รวม unrelated notice/Dismiss cleanup

## Verify

**Planned / NOT_RUN ทุกคำสั่ง.** RED→GREEN จาก approved predicate/privacy rules; new tests ยังไม่มี. Private PG environment ต้อง `NODE_ENV=test`, `DB_PROVIDER=postgres`, DB_NAME suffix `_test`; use real pgFixture + provider-correct HTTP harness, nonzero executed cases และไม่ log credentials

```sh
node --import tsx --test tests/permissions/delivery-parent-state.test.ts
node --test tests/contracts/delivery-parent-state.test.mjs
npm run build:contract
npm run check:contract
npm run test:contract
npm run test:workspaces
npm run test:tasks
npm run test:permissions
npm run test:authorization
node --import tsx --test tests/permissions/delivery-parity.test.ts
npm run typecheck
npm run lint
npx eslint tests/postgres/delivery-parent-state.test.ts
npm run build
npm run check:test-plan
npm run test:test-plan
npm test
NODE_ENV=test DB_PROVIDER=postgres RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-parent-state.test.ts
NODE_ENV=test DB_PROVIDER=postgres RUN_POSTGRES_TESTS=1 npm run test:postgres
npx playwright test tests/browser/delivery-access-parent-state.spec.ts tests/browser/delivery-access-parity.spec.ts tests/browser/workspaces.spec.ts tests/browser/task-workspace-permissions.spec.ts tests/browser/delivery-drafts.spec.ts tests/browser/delivery-focus-mobile.spec.ts
```

Targeted contract test ก่อน generate ใช้เป็น RED; หลัง build:contract ต้องรันเป็น GREEN ผ่าน test:contract ด้วย. ไม่เปลี่ยน route inventory/old register; no migration จึงใช้ existing schema กับ seeded legacy-shaped rows แยกจาก empty fixtures ไม่อ้าง migration upgrade. Host build ก่อน browser, free FRIDAY_TEST_PORT/new disposable external FRIDAY_BROWSER_FIXTURE/approved TMPDIR และไม่ reuse server อื่น. All-skipped PG ไม่ผ่าน. PG tests ไม่ปิด Linux/Docker/backup-restore/UAT/deploy

## Questions

- **Q-DAF-PARENT-01 — OPEN / disclosure gate:** ยอมรับ actor-scoped capabilities และ role/lifecycle predicates ข้างต้นหรือไม่? แนะนำ booleans + generic unavailable; alternative raw hidden team state ไม่แนะนำ. คง fallback mutation errors อย่างเดียวได้แต่ blocker ยังเปิด
- **Q-DAF-PARENT-02 — OPEN / wire gate:** field names/requiredness/missing-null default/version/compatibility เลือกอะไร? `can_restore` / `can_unarchive`, required boolean + unknown disabled เป็น recommendation เท่านั้น ไม่ใช่ adopted schema หรือ Zo approval

## Evidence / Review

Source inspection only; RED/GREEN/contract/PG/browser/UAT/deploy **NOT_RUN**, independent proposal review **PERFORMED / CLEAN (docs-only)** และ parent precommit gate **SATISFIED** ตาม [host handoff](../../docs/product/del-access-followups.md#host-handoff--completed-proposal-review); runtime/code review **NOT_RUN**. Host handles Git/auth/review. Future evidence ใน card นี้ระบุ source/build/provider/commands/exits/executed/skipped ไม่เขียนทับ parent evidence. DEL-ACCESS **in_progress**, DEL-VALIDATION dependency **blocked**; official register **9/96 completed, 87 remaining**. Next **aggregate DEL-ACCESS closure review / High** หลังทั้งสาม adopted scopes และ affected gates ครบเท่านั้น
