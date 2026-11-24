---
id: DEL-ACCESS-PARENT-STATE
title: "Actor-scoped restore and unarchive capability metadata"
type: security
priority: P0
owner: "unassigned"
status: in_progress
proposal: false
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
  - "docs/product/del-access-followups.md"
  - "frontend/src/delivery-access-directory.test.tsx"
  - "frontend/src/delivery-access-nav.test.tsx"
  - "tests/contracts/delivery-directory.test.mjs"
  - "tests/task-views/provider-suite.ts"
  - "docs/product/del-access-followups.md"
---

# DEL-ACCESS-PARENT-STATE — actor-scoped capabilities

## Context

**ADOPTED / in_progress — Zo 2026-11-24.** Declared effort **High**; actual runtime model/effort **NOT_VERIFIED**. Node22; branch `feat/del-access-parent-state`, supplied base `03aeb97`. NAV prerequisite merged per host handoff/current source. One card = one PR: adoption + implementation together. Sole coding author; host owns Git and independent review. No commit/push/PR/merge/deploy by author.

## References

[Proposal / decisions](../../docs/product/del-access-followups.md) · [Parent](DEL-ACCESS.md) · [Blocker evidence](../../docs/product/evidence/DEL-ACCESS.md#scope-limitations-found) · [R09](../../docs/product/delivery-rules.md#10-ux-reliability-และ-validation-r09r11) · [Rollout gates](../../docs/product/delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here) · [locked API](../../TeamFlow_API_Contract.md) · [release variants RV-01/03/04/05/08](../../TeamFlow_Test_Release_Manifest.md). Proposed partial trace: TC-034/035/087/088/089, AT-13/14/32; not full formal acceptance

Source anchors: [workspaces service](../../src/services/workspaces.ts) `projectColumns` L60 / `project` L131 / `projects` L434 / `patchProject` L515; [tasks service](../../src/services/tasks.ts) `dtos` L199 / `list` L936 / `trashMutation` L967; [authorization](../../src/services/authorization.ts) `projectAccess` L128 / `writable` L178 / restore+unarchive checks L382–403; [Trash](../../frontend/src/Trash.tsx) project/team lookup L73–110; [Workspaces](../../frontend/src/Workspaces.tsx) `actionsFor` L320 / `EntityDialog.submit` L1073; [frontend Project](../../frontend/src/workspace-api.ts) L29 and [TrashPage](../../frontend/src/task-api.ts) L89; [generator](../../scripts/build-contract.mjs) `Project` L65 / `TrashPage` L115

## Files

- ref: authorization/retention predicates, [task query scoping](../../src/repository/task-query.ts), [route passthrough](../../src/api/tasks.ts) `get_api_trash` / restore and [workspace handlers](../../src/api/workspaces.ts); no new route or authorization grant. [PG fixture](../../tests/schema/fixtures.ts) / [existing provider suites](../../tests/tasks/provider-suite.ts) เป็น pattern ไม่แก้ shared fixtures
- touch: exact `allowed_paths` เป็น **adopted ceiling**. Suite `delivery-parent-state-suite.ts` และ SQLite/PG wrappers เป็น **planned new tests** ด้วย real provider/HTTP; contract/browser tests เป็น **planned new artifacts**, ไม่ใช่ไฟล์ที่รันแล้ว
- Integration: serialize Project **ทุก path** (`projects` list และ shared `project()` ที่ใช้ create/patch replies) กับ Trash-only list assembly; อย่าเพิ่ม field ให้ shared Task DTO/board/history โดยไม่ตั้งใจ. Frontend strict Project/Trash parsers, Trash row/button/dialog refresh และ Workspaces unarchive row/dialog/latest/retry ต้องตรง wire เดียวกัน. Shared consumers ของ Project รัน regression แม้ไม่ต้องแก้
- ห้ามแตะ: raw team DTO/directory visibility, schema/migrations/DB adapter/grants, Self/nav, AGENTS/config/dependencies/lockfiles, old Task Register/inventory/manifest และ existing DEL-ACCESS evidence. ถ้าต้อง factor shared authorization helper หรือแก้ fixture นอก ceiling ให้ re-scope ผ่าน review ก่อน

## Tasks

- [x] Adopt NAV prerequisite, Q-DAF-PARENT-01/02 และ exact allowed paths (Zo 2026-11-24).
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

**Verification targets; actual partial results below. Work stopped at the out-of-scope fixture blocker.** RED→GREEN จาก approved predicate/privacy rules; new tests ยังไม่มี. Private PG environment ต้อง `NODE_ENV=test`, `DB_PROVIDER=postgres`, DB_NAME suffix `_test`; use real pgFixture + provider-correct HTTP harness, nonzero executed cases และไม่ log credentials

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

- **Q-DAF-PARENT-01 — ANSWERED / ACCEPTED recommended (Zo 2026-11-24):** actor-scoped capability booleans only; false = generic Unavailable; no raw hidden team state or broad GET teams grant.
- **Q-DAF-PARENT-02 — ANSWERED / ACCEPTED recommended (Zo 2026-11-24):** required boolean `can_restore` on Trash rows and `can_unarchive` on every Project serialization path. Missing/null/error = unknown disabled. Coordinated server/client release, API minor **1.17.0**, routes unchanged.

## Evidence / Review

**2026-11-24 browser follow-up (Node 22, temporary SQLite; no commit/push/PR):** fixes — new spec used a non-existent create route (`/api/projects/{id}/tasks` → `POST /api/tasks`), focus-driven shell remount, aborted held-route handling, sidebar read in extra-read check (now matches `includeArchived=true` sweeps only), and offline/maintenance expectations aligned to NAV scope withdrawal (no enabled restore control). Implementation: Workspaces list effect no longer depends on `self` (reconnect `/me` refresh re-ran it → delivery-drafts:784 regression); Trash restore 401/403/404 now clears private state even if a background read bumped the epoch.

| Command | Result |
|---|---|
| `npm run build` + six-spec Playwright command in Verify (`FRIDAY_TEST_PORT=43993`) | PASS 91 / 0 fail |
| `npm run typecheck` / `npm run lint` | PASS / PASS |
| `npm run test:frontend` | PASS 100/100 |
| `npm run test:contract` | PASS 68/68 |
| `node --import tsx --test tests/permissions/delivery-parent-state.test.ts` | PASS 4/4 |

PG NOT_RUN: no local PostgreSQL. `npm test` and independent review NOT_RUN. Earlier host-run checks (check:contract, test:workspaces/tasks/permissions/authorization, parity, test:test-plan) were not re-run after this follow-up.

**Earlier (superseded) record:**

2026-11-24, Node v22.23.3 (`export PATH=/opt/homebrew/opt/node@22/bin:$PATH`), temporary SQLite. **INCOMPLETE / BLOCKED on allowed_paths**; no commit/push/PR. Runtime model/effort NOT_VERIFIED. Independent review NOT_RUN. Logs: `/private/tmp/del-parent-checks/`.

| Exact command | Actual result |
|---|---|
| `node --test tests/contracts/delivery-parent-state.test.mjs` before implementation | RED: 0 pass / 1 fail (API version/capabilities absent) |
| `node --import tsx --test tests/permissions/delivery-parent-state.test.ts` before implementation | 0 pass / 4 fail: 1 behavioral RED (undefined capability); 3 BLOCKED by listener EPERM, not behavioral RED |
| `npm run build:contract` | PASS exit 0; generated API 1.17.0, routes unchanged |
| `node --test tests/contracts/delivery-parent-state.test.mjs` after generation | GREEN: 1 pass / 0 fail / 0 skip |
| `node --import tsx --test --test-name-pattern='retention' tests/permissions/delivery-parent-state.test.ts` | GREEN: 1 pass / 0 fail / 0 skip (retention, stale denial and rollback service case) |
| `npm run typecheck` | FAIL: 2 TS2741 errors; required `can_unarchive` missing from existing Project fixtures in `frontend/src/delivery-access-directory.test.tsx:91` and `frontend/src/delivery-access-nav.test.tsx:113` |
| `npm exec --no -- eslint src/services/workspaces.ts src/services/tasks.ts frontend/src/Workspaces.tsx frontend/src/Trash.tsx frontend/src/workspace-api.ts frontend/src/task-api.ts tests/permissions/delivery-parent-state-suite.ts tests/permissions/delivery-parent-state.test.ts tests/postgres/delivery-parent-state.test.ts tests/browser/delivery-access-parent-state.spec.ts` | FAIL: 1 error / 0 warnings, Workspaces `react-hooks/set-state-in-effect` |

Required fixture updates are outside allowed_paths. Stopped per owner scope rule; neither file was edited and the required Project type was not weakened. Remaining in-scope lint error also needs correction after resumption. All acceptance remains open; authored HTTP/browser/PG cases are not evidence of passing execution.

NOT_RUN after scope stop: `npm run lint`, `npm run build`, `npm run check:contract`, `npm run test:contract`, `npm run test:workspaces`, `npm run test:tasks`, `npm run test:permissions`, `npm run test:authorization`, `node --import tsx --test tests/permissions/delivery-parity.test.ts`, `npm run check:test-plan`, `npm run test:test-plan`, `npm test`, standalone `npx eslint tests/postgres/delivery-parent-state.test.ts`, and the six-spec Playwright command above (build prerequisite not run; local listeners additionally denied EPERM).

Both PG commands above: **PG NOT_RUN (no local PG)**. Read-only probe found no local listener on 127.0.0.1:5432 and no configured `_test` DB name. PG test file authored, not executed; no PG/production/UAT claims.

Official Task Register unchanged: completed **9 / total 96 / remaining 87**. Next: scope resolution for two existing frontend test fixtures, then finish **DEL-ACCESS-PARENT-STATE / High**, full affected verification and host independent review. DEL-ACCESS remains in_progress; no parent closure.

### Host review — 2026-11-24

- Re-scope (host-approved): added followups doc plus 4 existing test files. Changes are fixture `can_unarchive:false`, a type-only `unknown` cast, and a contract version regex. No assertion was weakened. The exact version check moved to `tests/contracts/delivery-parent-state.test.mjs` (1.17.0).
- Host verify after fixes: typecheck, lint, build, check:contract PASS. contract 68/68, workspaces 20/20, tasks 33/33, permissions 49/49, authorization 14/14, delivery-parity 8/8, parent-state provider 4/4, test-plan 18/18, frontend 100/100, windows-staging 9/9. Browser (6 specs) 91/91.
- Independent review (separate Claude Code session, read-only): APPROVE with 4 MINOR findings. Two were addressed here: the re-scope and the version note. Two are follow-ups: (a) a Trash read epoch can hide a non-denial restore result while a background refresh runs; (b) Trash relies on the server recheck, while Workspaces refetches via `latest()`.
- PG two-connection race tests: NOT_RUN (no local PostgreSQL). The card stays `in_progress` until `RUN_POSTGRES_TESTS=1` evidence exists.
