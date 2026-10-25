---
id: DEL-ACCESS-DIRECTORY
title: "Candidate scoped identity discovery and protected P-03 membership mutations"
type: security
priority: P0
owner: "unassigned"
status: draft
proposal: true
effort: High
parent: DEL-ACCESS
children: []
depends_on: []
relates: { prd_ac: ["AT-32", "AT-07"], fr: ["FR-42", "FR-42A"], security: ["BR-16", "BR-21", "BR-22", "BR-23"], permissions: ["P-03"], api_operations: ["GET /api/directory", "GET /api/projects/{id}/members", "PUT /api/projects/{id}/members/{userId}", "DELETE /api/projects/{id}/members/{userId}"], ui_pages: ["/projects"], db_tables: [] }
questions: []
allowed_paths:
  - "TeamFlow_Requirements_v1.0.md"
  - "TeamFlow_SRS_v1.0.md"
  - "TeamFlow_API_Contract.md"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "tests/contracts/delivery-directory.test.mjs"
  - "src/api/workspaces.ts"
  - "src/services/authorization.ts"
  - "src/services/workspaces.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/workspace-api.ts"
  - "frontend/src/delivery-access-directory.test.tsx"
  - "tests/permissions/delivery-directory-suite.ts"
  - "tests/permissions/delivery-directory.test.ts"
  - "tests/postgres/delivery-directory.test.ts"
  - "tests/browser/delivery-access-directory.spec.ts"
  - "tests/browser/delivery-access-parity.spec.ts"
  - "tickets/delivery/DEL-ACCESS-DIRECTORY.md"
---

# DEL-ACCESS-DIRECTORY — formal card adoption CANDIDATE

## Context

**DRAFT / PROPOSAL / NOT ADOPTED**. Zo ตอบ **“อนุมัติแบบจำกัดตามข้อเสนอนี้”**: Q-DAF-DIR-01/02 **ANSWERED / APPROVED สำหรับ recommended business direction** — active actual project manager + P-03 ค้น active cross-team eligible identities เพื่อเพิ่ม Editor/Viewer, เปิดเฉพาะ id/display_name และ eligible-pool total; active Admin/owner-team Lead ใช้ scoped flow ได้. Effective Admin/owner-team Lead/explicit manager protected จาก P-03 edits. ใช้ existing GET /api/directory project-scoped mode + distinct identity-only response; absent project คง legacy policy/wire. ไม่มี global directory grant/endpoint ใหม่

คำอนุมัติให้เตรียม reviewable spec/card proposal **ยังไม่ใช่ technical-spec approval, planning/mapping adoption, formal card adoption, spec merge หรือ runtime authorization**. ไม่มี unresolved business question ที่ต้องคง blocked status เทียม; draft/proposal สะท้อน human proposal gate ที่ยังเหลือ. Exact query/error/version/filter refinement เป็นข้อเสนอใน [planning](../../docs/product/del-access-directory-planning.md#technical-contract-proposal--รอ-human-specification-approval)

Declared **High**; sole standalone Codex `gpt-6.1-sol` / **High**, actual launch model/effort **host-verified ตาม current dispatch**; author ไม่เปลี่ยน settings. Current source HEAD `cf565d177d1539ee88aa61614c13f6e523e1b05a` / origin/main `cf565d1` ตาม host. PR11 proposal **MERGED 2026-10-25T16:54:26Z**, head `6693cc5b57812ce4071b74a47e9b264ef34dab28`, host verified; historical review/evidence ด้านล่างไม่ครอบคลุม reconciliation delta นี้. NAV PR10 merged เป็น baseline context **ไม่ใช่ runtime prerequisite**; partial parent ไม่ใช่ full-parent-DONE gate

**One consolidated recommended approval bundle:** exact technical query/filter/schema/API1.16.0/compatible rollout, minimum PUT+DELETE protected-target guard โดยคง baseline ordinary inactive P-03 DELETE removal, scoped T-078 continuation, T-081 primary/T-091 regression mapping, formal card adoption, future evidence-only adoption3 และ exact combined spec6+runtime12 union18 ใน frontmatter. Human อนุมัติทั้งหมดนี้ใน decision เดียวได้; host จึงบันทึก adoption3 และทำ coherent spec+runtime candidate ภายใน18 paths. ไม่ต้องมี intermediate planning/spec proposal PR เพิ่ม; compatible merge/review/tests ยังคงเป็น execution gates. Business direction approved แล้ว; bundle นี้เป็น technical/adoption/implementation authorization **CANDIDATE เท่านั้น**

## References

[Planning / exact future adoption patch](../../docs/product/del-access-directory-planning.md) · [Decision appendix](../../docs/product/del-access-followups.md#follow-up-decisions) · [Parent](DEL-ACCESS.md) · [Scope limitations](../../docs/product/evidence/DEL-ACCESS.md#scope-limitations-found) · [SRS §4.3–4.4](../../TeamFlow_SRS_v1.0.md) · [locked API](../../TeamFlow_API_Contract.md) · [OpenAPI](../../contracts/openapi.json) · [Task Register](../../TeamFlow_Task_v1.0.md) · [Test Plan](../../TeamFlow_Test_Plan_v1.0.md) · [Test Cases](../../TeamFlow_Test_Cases_v1.0.md) · [rollout gates](../../docs/product/delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here)

Proposed primary **T-081 / High**, affected regression **T-091 / High**, inherited T-082 AT-32 co-owner; no reassignment of current named owners. Partial TC-087/088/089→AT-32; legacy TC-023→AT-06/07 ownership remains. T-078 is **IN_REVIEW**, not DONE; existing scoped planning/contract foundation is evidenced, owner/scoped continuation acknowledgment remains in the same proposed bundle (planning details). Exact mapping/UT asymmetry/RV ownership and dependencies are in planning; no register/source rows/IDs/status/counts changed here

## Files

**Current authorized docs ceiling = 3 paths only:** existing `docs/product/del-access-directory-planning.md`, `docs/product/del-access-followups.md`, this card. Task Register remains untouched, including evidence prose; human adoption patch is proposed in planning for host isolation from the register belonging to other work

Frontmatter `allowed_paths` is **exact proposed combined18 implementation ceiling (spec6+runtime12), not adopted/authorized by this docs3 edit**; explicit numbered union and subset details in [planning integration/ceilings](../../docs/product/del-access-directory-planning.md#integration-ที่ตรวจจริงและ-proposed-exact-ceilings). Future evidence-only adoption3 = `TeamFlow_Task_v1.0.md`, this card, `docs/product/del-access-followups.md`; not an automatic union with implementation18. No register/locked-contract/source writes here

- `src/api/workspaces.ts` `workspaceHandlers.get_api_directory`: exact query-bound branch response validation; PUT/DELETE routes unchanged
- `src/services/authorization.ts` `authorizeOperation`/`knownPermissions`: recognize scoped-or-legacy directory marker, scoped dispatch before legacy any-Lead. `currentActor`/`projectAccess`/`can` reused; `managerMay` mutation behavior unchanged, no target preflight lookup/error reordering
- `src/services/workspaces.ts` `directory`: actor/project/current-key recheck before eligible count/page, identity projection/filter; `projectMember`: preserve `requireVersion` → `targetUser(!remove)` → old/requested explicit-manager403, then proposed effective-target protection before all writes, preserving baseline ordinary inactive DELETE and existing `!old`404 ordering. Local helper/query permitted in this existing file; no separate guard file
- `frontend/src/Workspaces.tsx` `Members/canDirectory/managerP03/memberEpoch/clearPrivate/change`: scoped Editor/Viewer mode, identity labels, effective+explicit protected-row actions/lifecycle; `frontend/src/workspace-api.ts`: new strict candidate parser plus preserved legacy parser
- New `frontend/src/delivery-access-directory.test.tsx`, `tests/permissions/delivery-directory-suite.ts`, SQLite `tests/permissions/delivery-directory.test.ts`, PG `tests/postgres/delivery-directory.test.ts`, browser `tests/browser/delivery-access-directory.spec.ts`: parameterized real HTTP/service query+mutation/protection/error/race/rollback and UI lifecycle. Existing `tests/browser/delivery-access-parity.spec.ts`: update stale P-03 search absence, add protected-row fixtures; retain legacy/revoke/409 assertions
- Spec6: Requirements/SRS scoped exception + protected-target guard/error semantics preserving baseline inactive DELETE, API prose1.16.0, `scripts/build-contract.mjs`, generated `contracts/openapi.json`, new `tests/contracts/delivery-directory.test.mjs`. Route owners/IDs/count89 unchanged; new schemas candidate/page produce expected122 total
- Read-only reuse: `src/api/contract.ts` `queryFor`, `contracts/validate.mjs` `decodeQuery`, middleware/authorization hooks, frontend transport/InitialTeamMembers, shared HTTP/session/SQLite/PG fixtures, provider adapters, access-effects/audit/notification helpers. Test-local factory/transaction wrappers fit new suite, no shared fixture/seam change. Checker still89 routes; no manifest/inventory/config/deps/locks/migrations/protected instruction edits

## Tasks

- [ ] Human reviews/adopts **one combined bundle** above, including scoped T-078 prerequisite acknowledgment (IN_REVIEW retained); approves exact adoption3 evidence patch and implementation18. Host records actual decision/date without source mapping/status/dependency changes
- [ ] Within authorized coherent spec+runtime candidate, align scoped exception/query/identity schemas/error/protected-target guard semantics preserving baseline inactive DELETE and proposed **1.15.0→1.16.0**; host build/check/test:contract. Merge permission metadata only with compatible runtime support; human approval precedes authoring, contract/runtime acceptance still require actual evidence
- [ ] RED→GREEN real scoped HTTP/service/contract/frontend/browser behavior after authorization, without granting team Lead/global directory to managers or weakening legacy deny tests
- [ ] Implement scoped preflight/execute/service read authorization before both total/items; identity-distinct SQL search/filter/count/page; exact branch response validation + strict frontend parser
- [ ] Wire project Editor/Viewer picker, protected existing-row UI guards, abort/generation/actor/project/search/page/mode lifecycle and safe persistent failures; preserve team/create-team/manager appointment/source archive semantics and conservative UI behavior
- [ ] Run real SQLite and PG17 HTTP fixtures, mutation/legacy regressions and browser stale/revoke/409/keyboard/mobile cases; host source freeze, independent review and human gates. Record actual results only

## Acceptance

- [ ] Active actual manager+current P-03 of this project, Admin and owner-team access Lead allowed; manager of another project/global key/Editor/Viewer/title/team_position/unrelated-team Lead do not grant scope. Invalid project never falls back to legacy
- [ ] Exact proposed query: optional scalar project=Id1..2147483647; page default1 / max2147483647, pageSize default50 / max100; canonical decimal only. Unknown and duplicate known scalars (project/q/page/pageSize, even equal), empty/zero/noninteger/out-of-range IDs/pages fail400 INVALID_QUERY. q accepts empty/omitted, max100 scalars AND100 UTF16 units, literal whitespace/escaped wildcard search on display_name only; no username/team search
- [ ] Preserve actual locked precedence: malformed query400 occurs **before session/password**; valid query missing/expired/inactive/revoked session401, forced-password403 PASSWORD_CHANGE_REQUIRED, then invisible/missing project404 and visible insufficient authority403. No names/count/currentVersion in denial. Existing PUT/DELETE checks remain in source order, with additions precisely placed below
- [ ] Proposed response strict `{items:[{id,display_name}],page,pageSize,total}`; only eligible matched identity total before paging, ordered id ASC; out-of-range page empty with same eligible total. No hidden affiliations/team count/job title/contact/account flags. New ProjectMemberCandidate/Page distinct from legacy/Person; union anyOf permits empty page, route and client enforce query-bound exact schema. Legacy omission unchanged; new client→old server400 fails safely with no unscoped retry
- [ ] Candidate pool matches active PUT-eligible Editor/Viewer intent: no effective Admin/owner Lead in scoped picker; P-03 excludes this project's explicit manager. Other-team Lead/other-project manager may qualify; existing Editor/Viewer and active target requiring password change are not automatically excluded. Admin/owner Lead manager appointment/removal authority remains existing explicit flow; no manager grant by discovery
- [ ] P-03 UI and crafted PUT **and DELETE** protect effective Admin/owner-team Lead **and explicit manager**, including redundant Editor/Viewer rows. Service actor+target guard applies only `!rights(access.role).manage`; query target current org_role/owner-team access Lead inside same transaction; effective-target403 inserted **after** existing `requireVersion` → target existence/PUT activity → old/requested-manager403 and before manager-key422/all writes. No target preflight check. No403 `currentVersion`; authorized stale target request409 with current project version remains earlier (HTTP requested manager already denied by actor operation check before version). Full [placement/error table](../../docs/product/del-access-directory-planning.md#protection-reconciliation--minimum-actortarget-mutation-guard-proposal)
- [ ] **Retain existing inactive DELETE / roster Remove:** `targetUser(!remove)` stays unchanged; GET candidates require active target and PUT keeps existing inactive422. DELETE rechecks current target existence/org-role/ownerLead/old explicit-manager, applies protection, then existing `!old`404; ordinary inactive row removal remains allowed for P-03 and privileged actors, ordinary active/inactive absent row remains404. Inactivation (`accounts.ts`479–483) retains `project_members` after session revoke/cleanup; keep ordinary inactive roster Remove usable, without candidate/PUT-active disabling. Intended protected-invariant compatibility: active protected PUT success→403, redundant protected row DELETE success→403, **protected absent-row DELETE404→403**; no role detail/`currentVersion` in new403. No new activity policy/question. Target inactivation race: GET excludes, PUT422, ordinary DELETE may succeed as before (or stale409/fresh review if project changed); protected target403 still applies after existing version/target/manager checks
- [ ] Both-provider actor/target promotion/demotion, P-03 revoke/BR-22 demotion/inactivation/session-revoke and selection→confirm race tests use current execute transaction. Commit-order/source-backed deterministic test-local seam detailed in planning; no PostgreSQL SERIALIZABLE/external-write/two-process SQLite claim. Same-version and stale/refreshed cases required. Snapshot guard/fault rollback, assignment cleanup/version/audit/notification/revision effects with success controls; tests **planned NOT_RUN**
- [ ] Parameterized SQL authorizes before count/page; no multi-team identity duplication/count leaks, browser-only filtering or legacy overfetch. Current provider transaction semantics reused; no new read domain writes/audit/notifications/version. PUT/DELETE remain authoritative for current actor/target/manager/version/atomic effects under proposed additions, discovery response is not a write token
- [ ] Repeated/blank/Thai/emoji query, paging, loading/empty/error/denied/invalid schema/offline/maintenance work. Actor/project/query/page/mode/authority changes invalidate selection/confirmation/counts and old requests; epoch + abort block held replies, including logout/login/reconnect/revoke/demotion. 401/403/404 clear private state;409 requires fresh review, never auto-confirm
- [ ] Scoped project Editor/Viewer labels contain only display name; no fake teams[]/“No team” fallback. Legacy team/create-team and privileged manager-selection flows preserved. Existing archived membership UI remains read-only. Source `admin_or_owner_lead`/`manageProject` membership routes have no archive422 guard; preserve service semantics, do not claim UI read-only proves server denial
- [ ] Nonzero real PG17 HTTP/service cases pass after implementation with exact source/build/provider/exits/executed/skipped; all-skipped is not PASS. GET has no domain writes; rejected mutations retain atomic rollback and successful mutation effects stay unchanged. Targeted success does not close full TC/AT/T-081/T-091/DEL-ACCESS or Linux/Docker/backup-restore/UAT gates

## Not Do

No new endpoint/global directory grant, implicit role/P-key/team grant, new manager appointment grants, successful mutation version/audit/notification semantics change beyond the minimum protected-target deny guard, new DELETE activity gate, hidden affiliation disclosure, parent-state capability, NAV prerequisite or dependency rewiring. No new official IDs/card inventory row/totals. No runtime/generator/test/Git/reviewer execution in this docs-author task. No adoption/ready/PASS/CLEAN inference from business approval or historical reviews

## Verify

**All current author planning checks/generation/runtime tests NOT_RUN; host owns execution.** Planned new test files do not yet exist; this is future work, not missing executed evidence/defect. Host will run planning18/link/inventory/snapshot and build:test-plan byte comparison in an isolated candidate; expected no-op from zero source mapping delta is not a verified result

Future specification commands within combined18 only after bundle authorization: `npm run build:contract`, `npm run check:contract`, `npm run test:contract`, `node --test tests/contracts/delivery-directory.test.mjs`. Expected routes89, schemas122 against1.15.0 baseline; no checker relaxation. Proposed coherent spec/runtime rollout requires explicit approval of exact18-path union (spec6+runtime12), with the single human bundle approval before authoring and compatible machine-contract merge only with marker support. No extra planning/spec proposal PR required; a split merge would require reviewed compatible staging, not assumed here

Future runtime targets (**planned / NOT_RUN**, after combined human bundle/scoped dependency gate):

```sh
node --import tsx --test tests/permissions/delivery-directory.test.ts
npx vitest run --config vitest.config.ts frontend/src/delivery-access-directory.test.tsx frontend/src/api.test.tsx frontend/src/App.test.tsx
npm run test:workspaces
npm run test:permissions
npm run test:authorization
npm run test:frontend
npm run typecheck
npm run lint
npx eslint tests/postgres/delivery-directory.test.ts
npm run build
npm run check:contract
npm run test:contract
npm run check:test-plan
npm run test:test-plan
npm test
NODE_ENV=test DB_PROVIDER=postgres RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-directory.test.ts
NODE_ENV=test DB_PROVIDER=postgres RUN_POSTGRES_TESTS=1 npm run test:postgres
npx playwright test tests/browser/delivery-access-directory.spec.ts tests/browser/delivery-access-parity.spec.ts tests/browser/workspaces.spec.ts tests/browser/organization.spec.ts tests/browser/header-member-followup.spec.ts tests/browser/delivery-drafts.spec.ts tests/browser/delivery-focus-mobile.spec.ts
```

Provider suite must inject real `pgFixture` into `fixture(work,factory)`, issue actual HTTP session/query/auth requests plus service calls, and record PG17 version. Existing fixture guards require RUN_POSTGRES_TESTS=1 / NODE_ENV=test / DB_PROVIDER=postgres / DB_NAME ending `_test`; reuse random isolated schema/migrate/seed/drop-on-close, private connection env from host. Seed inactive/protected/multi-team/cross-team/other-project manager targets; q/paging/privacy/duplicates/error precedence and actor/target role/activity/revoke/confirm both orders via test-local transaction wrapper; failure-at-effects persistence rollback with successful controls. Browser held responses test request lifecycle separately from server commit order; do not claim to retract names read before revoke. Keep secrets outside docs/logs, no real data. Host uses Node22/free port/disposable external browser fixture/approved TMPDIR/build-before-browser; no reuse of running app. Exact protected-target mutation guard/error precedence, baseline inactive DELETE, and source-grounded race/rollback/trace expectations are in planning

## Questions

- **Q-DAF-DIR-01 — ANSWERED / APPROVED business direction:** Zo “อนุมัติแบบจำกัดตามข้อเสนอนี้” approves active actual project manager+P-03 cross-team eligible identity discovery for Editor/Viewer, minimal identity/pool total and P-03 protected targets; no global grant
- **Q-DAF-DIR-02 — ANSWERED / APPROVED recommended route direction:** existing project-scoped GET /api/directory, distinct identity-only response, omitted-project legacy behavior. Exact validation/schema/version/compatibility and minimum protected-target mutation guard remain **technical proposal in the single human approval bundle**, not unknown choices attributed to Zo
- No OPEN DIRECTORY business Q. Planning/formal card adoption and technical/spec/runtime gates remain pending; Q-DAF-PARENT-01/02 remain OPEN in their own card, unaffected

## Evidence / Review

Source inspection + scoped documentation preparation only. Current candidate **NOT independently reviewed**; no author verdict, runtime test PASS, generation byte equality or precommit/merge readiness claim. Historical original appendix/card proposal review CLEAN and parent publication gate at base `ab47abe…` apply only to that historical artifact; [appendix history](../../docs/product/del-access-followups.md#host-handoff--completed-proposal-review) remains provenance, not review of this planning/card candidate. NAV host evidence/PR10 merge is separate

Formal register untouched; proposed adoption patch in planning only. Source mapping delta0, no new ID; expected build:test-plan byte no-op host will verify. DEL-ACCESS **in_progress**, DEL-VALIDATION **dependency blocked**, PARENT questions/dependencies unchanged; official **completed9 / total96 / remaining87** (source rows verified). Next **human combined technical/adoption/implementation bundle review / High**; DIRECTORY implementation **High** after approval and applicable execution gates. Host owns Git/auth/generation/tests/independent review; no commit/push/PR/merge/deploy or agents/reviewers invoked by author

### Subsequent host verification / publication gate

**Historical PR11 only (before this consolidated reconciliation):** Historical host evidence superseded PR11 NOT_RUN / NOT independently reviewed statements **only for the original PR11 docs proposal**; it does not verify the current reconciliation. Host executed `npm run build:test-plan`, `npm run check:test-plan`, `npm run test:test-plan` (18 passed, 0 failed, 0 skipped), and `git diff --check`, all exit0. Manifest generation was byte-identical, SHA-256 `a31c0d0d61c50d1812c26b4efe43f42e5b970d24e4ae043f5ae6065d6ab7b7de`. Host verified 116 local links / 18 heading fragments and 1208 unaffected tracked files; official source totals remain completed9 / total96 / remaining87.

Independent read-only reviewer **Claude `claude-opus-5-5`, requested High**, session `7c3d81c7-b04d-4649-9ec1-f38f6804b267`, returned **CLEAN (docs-only), no blocking findings** on the original three-file patch SHA-256 `dcb798cabb6fba4860499f110954c33d4c08ac6f23dc427b8943d0ddca8007d1` against base `009224d60001267da52a8a6e93eb189619ba1570`. Author: Codex `gpt-6.1-sol`, requested High, session `01a173e0-3638-7d82-9309-0f21b43d8492`. Reviewer did not run tests or independently recompute fingerprints; host verified the original file/patch hashes before appending this evidence-only subsection. This subsection was added after that independent review and is not attributed to the reviewer.

Parent directly inspected the complete original patch and handoff/review evidence and **satisfied the docs-only precommit gate**, authorizing this evidence addition, commit/push and a ready docs-proposal PR. Fetched base remains unchanged. Publication does not adopt the card, register mapping, technical specification or future scopes: `status: draft` / `proposal: true` remain. No runtime, contract, PG/browser, migration, UAT or deployment execution/acceptance is claimed; no merge/deploy is authorized.

**Historical PR11 finding and then-required separate-scope gate (superseded by the combined18 proposal above):** crafted PUT **and DELETE** of a redundant Editor/Viewer row for an implicit Admin/owner Lead may pass existing server guards; DELETE also runs assignment cleanup. Candidate filtering is not proof of mutation denial. Preserve the approved protected-target invariant and reconcile enforcement plus authorize exact separate mutation scope before runtime sign-off; do not reopen the approved business direction or silently widen this proposal's scope.


### Current consolidated reconciliation handoff — 2026-10-26

Supersedes historical PR11 prohibition/separate mutation-scope prerequisite: proposed minimum guard lives in existing `workspaceService.projectMember`; directory dispatch in existing authorization file and parameterized new suite all fit runtime12, so combined spec6+runtime12 remains exact18 above. Approved business protection is unchanged. Minimum protected-target guard compatibility/error precedence need explicit technical approval with the rest of **one** adoption/implementation bundle; no additional business reopening or intermediate planning PR.

Current author only edits3 existing docs; register untouched, mapping delta0, all current checks/generation/runtime/contract/PG/browser/protection/race/rollback tests **NOT_RUN**, no current independent CLEAN or readiness claim. Host owns planning18/no-op manifest/links/snapshots/review/execution. DEL-ACCESS in_progress; DEL-VALIDATION dependency blocked; PARENT questions/deps unchanged. Official **completed9 / total96 / remaining87**. Next **human consolidated bundle review / High**, then authorized implementation **High**.

### Subsequent host evidence — consolidated candidate

The host subsequently verified the consolidated three-doc candidate against base `cf565d177d1539ee88aa61614c13f6e523e1b05a`: `npm run build:test-plan`, `npm run check:test-plan` and `npm run test:test-plan` exited0, with **18 passed / 0 failed / 0 skipped**. Generated manifest bytes stayed identical, SHA-256 `a31c0d0d61c50d1812c26b4efe43f42e5b970d24e4ae043f5ae6065d6ab7b7de`. Final host checks verified **124 local links / 22 heading fragments**, **1208 unaffected tracked files** byte-identical, no untracked files, and `git diff --check` PASS. The reviewer correction changed docs only; generator/test inputs stayed unchanged. Source register remains **completed9 / total96 / remaining87** (84 IN_PROGRESS / 1 IN_REVIEW / 2 TODO); contract remains1.15.0 / 89 routes / 120 schemas. These are planning/documentation checks, not runtime protection evidence.

Independent read-only reviewer **Claude `claude-opus-5-5`, requested High**, session `7b82a67c-a5c9-45ec-b45b-332d080c9084`, initially returned **NOT CLEAN** for the proposed inactive DELETE422 / disabled Remove behavior. Sole author **Codex `gpt-6.1-sol`, requested High**, session `01a173ff-697d-7db1-8d90-a4982fe5c76d`, corrected the proposal to preserve baseline ordinary inactive DELETE and roster Remove. The same reviewer returned final **CLEAN (docs-only proposal), no remaining findings**, for patch SHA-256 `a8dc147d009d5dff1b5e64b683374a05a15c681d305beda5b8301796307067d5`. The apparent command typo was output masking only; host confirmed the actual npm command bytes and preserved them. Reviewer accepted host fingerprints, did not independently recompute hashes or run checks; exact model is host-confirmed, High was requested rather than independently attested by the reviewer.

Parent directly inspected the complete consolidated patch and handoff/review evidence and **satisfied the docs-only precommit gate**, authorizing this subsequent evidence-only subsection, commit/push and a ready docs-proposal PR. The host verified the reviewed patch and all three file fingerprints before this addition. This subsection is subsequent host evidence, not part of the independently reviewed patch. Publication requests **one human approval bundle** for the technical1.16 query/schema and correctly placed PUT/DELETE403 guards (preserving ordinary inactive DELETE and Admin/owner-team Lead authority), scoped T-078 continuation while IN_REVIEW, T-081/T-091 mapping, formal card adoption, adoption3 and coherent implementation18; no extra intermediate planning proposal is required. `status: draft` / `proposal: true` remain; publication itself adopts or implements none of these. No runtime/contract/register edits, runtime/PG/browser tests, merge or deployment are authorized or claimed.
