---
id: DEL-ACCESS-DIRECTORY
title: "Candidate project-scoped eligible identity discovery for P-03 managers"
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

Declared **High**; user กำหนด sole standalone Codex CLI gpt-6.1-sol / High; actual runtime setting **NOT_VERIFIED by author**, ไม่มีการเปลี่ยน model/effort. Base `009224d60001267da52a8a6e93eb189619ba1570`. Host handoff PR10 NAV runtime **MERGED 2026-10-25T16:19:46Z**, head `4eccbff`, CI SUCCESS; author ไม่ตรวจ remote หรือ claim NAV checks เอง. **NAV ไม่ใช่ runtime prerequisite** ของ directory; Projects เป็น entry pointอยู่แล้ว. Partial parent sourceไม่ใช่ full-parent-DONE gate

## References

[Planning / exact future adoption patch](../../docs/product/del-access-directory-planning.md) · [Decision appendix](../../docs/product/del-access-followups.md#follow-up-decisions) · [Parent](DEL-ACCESS.md) · [Scope limitations](../../docs/product/evidence/DEL-ACCESS.md#scope-limitations-found) · [SRS §4.3–4.4](../../TeamFlow_SRS_v1.0.md) · [locked API](../../TeamFlow_API_Contract.md) · [OpenAPI](../../contracts/openapi.json) · [Task Register](../../TeamFlow_Task_v1.0.md) · [Test Plan](../../TeamFlow_Test_Plan_v1.0.md) · [Test Cases](../../TeamFlow_Test_Cases_v1.0.md) · [rollout gates](../../docs/product/delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here)

Proposed primary **T-081 / High**, affected regression **T-091 / High**, inherited T-082 AT-32 co-owner; no reassignment of current named owners. Partial TC-087/088/089→AT-32; legacy TC-023→AT-06/07 ownership remains. T-078 is **IN_REVIEW**, not DONE; its historical batch evidence does not close formal dependency. Exact mapping/UT asymmetry/RV ownership and dependencies are in planning; no register/source rows/IDs/status/counts changed here

## Files

**Current authorized docs ceiling = 3 paths only:** new `docs/product/del-access-directory-planning.md`, `docs/product/del-access-followups.md`, this card. Task Register remains untouched, including evidence prose; human adoption patch is proposed in planning for host isolation from the register belonging to other work

Frontmatter `allowed_paths` is **proposed future runtime ceiling (12 paths), not adopted or authorized by this edit**. Required six-path future spec ceiling (Requirements/SRS/API prose/generator/OpenAPI/new contract test) and separate three-path future adoption ceiling are enumerated in [planning integration/ceilings](../../docs/product/del-access-directory-planning.md#integration-ที่ตรวจจริงและ-proposed-exact-ceilings); no locked-contract file changed here

- Runtime touch: [route](../../src/api/workspaces.ts) `get_api_directory` already passes `c.query`; add query-bound exact response validation. [Authorization](../../src/services/authorization.ts) `authorizeOperation` recognizes proposed directory-only `project_scoped_candidates_or_legacy_directory` marker and dispatches scoped mode before legacy any-Lead; [service](../../src/services/workspaces.ts) `directory` independently rechecks actor/project/P-03 before count/items. No edits to PUT/DELETE authorization/version/effects
- Runtime touch: [Members](../../frontend/src/Workspaces.tsx) `Members/canDirectory/managerP03/memberEpoch/clearPrivate`, [parsers](../../frontend/src/workspace-api.ts) `directoryPage` plus new strict candidate parser. Existing [browser parity](../../tests/browser/delivery-access-parity.spec.ts) has P-03 search `toHaveCount(0)`; replace that expectation with scoped behavior plus protected-row fixtures, preserve all legacy/manager/409/revocation assertions
- Read-only integration inspected: [query owner](../../src/api/contract.ts) `queryFor`, [decoder](../../contracts/validate.mjs) `decodeQuery`, [middleware](../../src/api/middleware.ts) `process`, [auth hooks](../../src/api/authorization.ts). Generated schema supplies project query; no custom query decoder/pipeline rewrite needed
- Read-only frontend transport [api.ts](../../frontend/src/api.ts) `apiClient.request` already forwards query/AbortSignal/same-origin/no-store with caller parser. [InitialTeamMembers](../../frontend/src/InitialTeamMembers.tsx) and Members team flow remain legacy. Admin/owner Lead manager appointment retains explicit existing privileged flow, never automatic fallback after scoped denial
- Planned new artifacts: frontend directory unit test; provider-parameterized HTTP/service suite + SQLite/PG wrappers; browser directory test. New contract-only test belongs to future spec ceiling. Shared [HTTP fixture factory](../../tests/permissions/http-fixture.ts) and [pgFixture/session fixtures](../../tests/schema/fixtures.ts) reuse without edits; new test-local data/held responses stay in allowed test files
- Ref-only checker `scripts/check-contract.mjs` keeps fixed **89 routes**/inventory/owner assertions. No generated test manifests/inventory/parent card/evidence/config/deps/lock/protected-instruction/migration/provider edits. If files beyond ceilings are needed, reconcile scope before writing

## Tasks

- [ ] Human review/adopt technical proposal, resolve source protection ambiguity, approve planning mapping + formal card + exact future spec/runtime ceilings separately. Reconcile T-078 scoped dependency/evidence without pretending IN_REVIEW is DONE
- [ ] Authorized spec preparation: align Requirements/SRS scoped exception and locked API, proposed **1.15.0→1.16.0**, generator/OpenAPI + new contract test. Human technical-spec approval precedes runtime authoring. Proposed rollout merges machine contract with supported runtime in one coherent candidate after explicit authorization of exact spec6+runtime12 union; do not merge unsupported permission marker separately. Host generation/checks/spec-merge and runtime acceptance are distinct gates
- [ ] RED→GREEN real scoped HTTP/service/contract/frontend/browser behavior after authorization, without granting team Lead/global directory to managers or weakening legacy deny tests
- [ ] Implement scoped preflight/execute/service read authorization before both total/items; identity-distinct SQL search/filter/count/page; exact branch response validation + strict frontend parser
- [ ] Wire project Editor/Viewer picker, protected existing-row UI guards, abort/generation/actor/project/search/page/mode lifecycle and safe persistent failures; preserve team/create-team/manager appointment/archive behavior
- [ ] Run real SQLite and PG17 HTTP fixtures, mutation/legacy regressions and browser stale/revoke/409/keyboard/mobile cases; host source freeze, independent review and human gates. Record actual results only

## Acceptance

- [ ] Active actual manager+current P-03 of this project, Admin and owner-team access Lead allowed; manager of another project/global key/Editor/Viewer/title/team_position/unrelated-team Lead do not grant scope. Invalid project never falls back to legacy
- [ ] Exact proposed query: optional scalar project=Id1..2147483647; page default1 / max2147483647, pageSize default50 / max100; canonical decimal only. Unknown and duplicate known scalars (project/q/page/pageSize, even equal), empty/zero/noninteger/out-of-range IDs/pages fail400 INVALID_QUERY. q accepts empty/omitted, max100 scalars AND100 UTF16 units, literal whitespace/escaped wildcard search on display_name only; no username/team search
- [ ] Preserve actual locked precedence: malformed query400 occurs **before session/password**; valid query missing/expired/inactive/revoked session401, forced-password403 PASSWORD_CHANGE_REQUIRED, then invisible/missing project404 and visible insufficient authority403. No names/count/currentVersion in denial. Existing PUT/DELETE error/version ordering unchanged
- [ ] Proposed response strict `{items:[{id,display_name}],page,pageSize,total}`; only eligible matched identity total before paging, ordered id ASC; out-of-range page empty with same eligible total. No hidden affiliations/team count/job title/contact/account flags. New ProjectMemberCandidate/Page distinct from legacy/Person; union anyOf permits empty page, route and client enforce query-bound exact schema. Legacy omission unchanged; new client→old server400 fails safely with no unscoped retry
- [ ] Candidate pool matches active PUT-eligible Editor/Viewer intent: no effective Admin/owner Lead in scoped picker; P-03 excludes this project's explicit manager. Other-team Lead/other-project manager may qualify; existing Editor/Viewer and active target requiring password change are not automatically excluded. Admin/owner Lead manager appointment/removal authority remains existing explicit flow; no manager grant by discovery
- [ ] P-03 existing-row actions guard effective Admin/owner Lead AND explicit manager. **Known source ambiguity:** existing server prevents old/requested explicit manager edits but may accept redundant Editor/Viewer rows for implicit Admin/Lead without changing their effective authority. Do not claim crafted PUT denial or add mutation guard under this ceiling. Approved protection remains required, not relaxed to UI-only. Human technical review must reconcile enforcement gap/authorize separate exact mutation scope if needed before full invariant/runtime sign-off; business approval is not reopened
- [ ] Parameterized SQL authorizes before count/page; no multi-team identity duplication/count leaks, browser-only filtering or legacy overfetch. Current provider transaction semantics reused; no new read domain writes/audit/notifications/version. PUT remains authoritative for target/activity/manager/version/atomic effects, discovery response is not a write token
- [ ] Repeated/blank/Thai/emoji query, paging, loading/empty/error/denied/invalid schema/offline/maintenance work. Actor/project/query/page/mode/authority changes invalidate selection/confirmation/counts and old requests; epoch + abort block held replies, including logout/login/reconnect/revoke/demotion. 401/403/404 clear private state;409 requires fresh review, never auto-confirm
- [ ] Scoped project Editor/Viewer labels contain only display name; no fake teams[]/“No team” fallback. Legacy team/create-team and privileged manager-selection flows preserved. Existing archived membership UI remains read-only and parent archive restrictions unchanged
- [ ] Nonzero real PG17 HTTP/service cases pass after implementation with exact source/build/provider/exits/executed/skipped; all-skipped is not PASS. GET has no domain writes; rejected mutations retain atomic rollback and successful mutation effects stay unchanged. Targeted success does not close full TC/AT/T-081/T-091/DEL-ACCESS or Linux/Docker/backup-restore/UAT gates

## Not Do

No new endpoint/global directory grant, implicit role/P-key/team grant, manager appointment policy, mutation authorization/version/audit/notification change, hidden affiliation disclosure, parent-state capability, NAV prerequisite or dependency rewiring. No new official IDs/card inventory row/totals. No runtime/generator/test/Git/reviewer execution in this docs-author task. No adoption/ready/PASS/CLEAN inference from business approval or historical reviews

## Verify

**All current author planning checks/generation/runtime tests NOT_RUN; host owns execution.** Planned new test files do not yet exist; this is future work, not missing executed evidence/defect. Host will run planning18/link/inventory/snapshot and build:test-plan byte comparison in an isolated candidate; expected no-op from zero source mapping delta is not a verified result

Future specification commands only after separate authorized scope: `npm run build:contract`, `npm run check:contract`, `npm run test:contract`, `node --test tests/contracts/delivery-directory.test.mjs`. Expected routes89, schemas122 against1.15.0 baseline; no checker relaxation. Proposed coherent spec/runtime rollout requires explicit approval of exact18-path union (spec6+runtime12), with human spec approval before authoring and compatible machine-contract merge only with marker support. Separate spec merge would require a reviewed compatible staging amendment; no unsupported midpoint is assumed

Future runtime targets (**planned / NOT_RUN**, after human/spec/dependency gates):

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

Provider suite must inject real `pgFixture` into `fixture(work,factory)`, issue actual HTTP session/query/auth requests plus service calls, and record PG17 version. Existing fixture guards require RUN_POSTGRES_TESTS=1 / NODE_ENV=test / DB_PROVIDER=postgres / DB_NAME ending `_test`; reuse random isolated schema/migrate/seed/drop-on-close, private connection env from host. Seed inactive/protected/multi-team/cross-team/other-project manager targets; q/paging/privacy/duplicates/error precedence and revoke/confirm both orders. Browser held responses test request lifecycle separately from server commit order; do not claim to retract names read before revoke. Keep secrets outside docs/logs, no real data. Host uses Node22/free port/disposable external browser fixture/approved TMPDIR/build-before-browser; no reuse of running app. Full trace/fixture expectations and mutation-protection scope limitation are in planning

## Questions

- **Q-DAF-DIR-01 — ANSWERED / APPROVED business direction:** Zo “อนุมัติแบบจำกัดตามข้อเสนอนี้” approves active actual project manager+P-03 cross-team eligible identity discovery for Editor/Viewer, minimal identity/pool total and P-03 protected targets; no global grant
- **Q-DAF-DIR-02 — ANSWERED / APPROVED recommended route direction:** existing project-scoped GET /api/directory, distinct identity-only response, omitted-project legacy behavior. Exact validation/schema/version/compatibility and protection reconciliation remain **technical proposal for human spec approval**, not unknown choices attributed to Zo
- No OPEN DIRECTORY business Q. Planning/formal card adoption and technical/spec/runtime gates remain pending; Q-DAF-PARENT-01/02 remain OPEN in their own card, unaffected

## Evidence / Review

Source inspection + scoped documentation preparation only. Current candidate **NOT independently reviewed**; no author verdict, runtime test PASS, generation byte equality or precommit/merge readiness claim. Historical original appendix/card proposal review CLEAN and parent publication gate at base `ab47abe…` apply only to that historical artifact; [appendix history](../../docs/product/del-access-followups.md#host-handoff--completed-proposal-review) remains provenance, not review of this planning/card candidate. NAV host evidence/PR10 merge is separate

Formal register untouched; proposed adoption patch in planning only. Source mapping delta0, no new ID; expected build:test-plan byte no-op host will verify. DEL-ACCESS **in_progress**, DEL-VALIDATION **dependency blocked**, PARENT questions/dependencies unchanged; official **completed9 / total96 / remaining87** (source rows verified). Next **human technical/planning/formal-card review / High**; DIRECTORY runtime **High** only after separate gates. Host owns Git/auth/generation/tests/independent review; no commit/push/PR/merge/deploy or agents/reviewers invoked by author

### Subsequent host verification / publication gate

The author handoff above is historical; this subsequent host evidence supersedes its NOT_RUN / NOT independently reviewed statements **only for this docs proposal**. Host executed `npm run build:test-plan`, `npm run check:test-plan`, `npm run test:test-plan` (18 passed, 0 failed, 0 skipped), and `git diff --check`, all exit0. Manifest generation was byte-identical, SHA-256 `a31c0d0d61c50d1812c26b4efe43f42e5b970d24e4ae043f5ae6065d6ab7b7de`. Host verified 116 local links / 18 heading fragments and 1208 unaffected tracked files; official source totals remain completed9 / total96 / remaining87.

Independent read-only reviewer **Claude `claude-opus-5-5`, requested High**, session `7c3d81c7-b04d-4649-9ec1-f38f6804b267`, returned **CLEAN (docs-only), no blocking findings** on the original three-file patch SHA-256 `dcb798cabb6fba4860499f110954c33d4c08ac6f23dc427b8943d0ddca8007d1` against base `009224d60001267da52a8a6e93eb189619ba1570`. Author: Codex `gpt-6.1-sol`, requested High, session `01a173e0-3638-7d82-9309-0f21b43d8492`. Reviewer did not run tests or independently recompute fingerprints; host verified the original file/patch hashes before appending this evidence-only subsection. This subsection was added after that independent review and is not attributed to the reviewer.

Parent directly inspected the complete original patch and handoff/review evidence and **satisfied the docs-only precommit gate**, authorizing this evidence addition, commit/push and a ready docs-proposal PR. Fetched base remains unchanged. Publication does not adopt the card, register mapping, technical specification or future scopes: `status: draft` / `proposal: true` remain. No runtime, contract, PG/browser, migration, UAT or deployment execution/acceptance is claimed; no merge/deploy is authorized.

**Human technical review remains required:** crafted PUT **and DELETE** of a redundant Editor/Viewer row for an implicit Admin/owner Lead may pass existing server guards; DELETE also runs assignment cleanup. Candidate filtering is not proof of mutation denial. Preserve the approved protected-target invariant and reconcile enforcement plus authorize exact separate mutation scope before runtime sign-off; do not reopen the approved business direction or silently widen this proposal's scope.
