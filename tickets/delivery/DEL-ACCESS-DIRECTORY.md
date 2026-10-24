---
id: DEL-ACCESS-DIRECTORY
title: "Proposed project-scoped eligible candidate discovery for P-03 managers"
type: security
priority: P0
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: DEL-ACCESS
children: []
depends_on: []
relates: { prd_ac: ["AT-32"], fr: ["FR-42", "FR-42A"], security: ["BR-16", "BR-21", "BR-22", "BR-23"], permissions: ["P-03"], api_operations: ["GET /api/directory", "GET /api/projects/{id}/members", "PUT /api/projects/{id}/members/{userId}", "DELETE /api/projects/{id}/members/{userId}"], ui_pages: ["/projects"], db_tables: [] }
questions: ["Q-DAF-DIR-01", "Q-DAF-DIR-02"]
allowed_paths:
  - "src/services/authorization.ts"
  - "src/services/workspaces.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/workspace-api.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "tests/permissions/delivery-directory-suite.ts"
  - "tests/permissions/delivery-directory.test.ts"
  - "tests/postgres/delivery-directory.test.ts"
  - "tests/contracts/delivery-directory.test.mjs"
  - "tests/browser/delivery-access-directory.spec.ts"
  - "tickets/delivery/DEL-ACCESS-DIRECTORY.md"
---

# DEL-ACCESS-DIRECTORY — proposed policy-gated follow-up

## Context

**PROPOSED / BLOCKED on business/security decisions / ไม่ adopt**. Declared **High**; actual runtime model/effort **NOT_VERIFIED**. Base `ab47abe0d52ad12d73de7c3d6694ecbf85c149ea`. P-03 member mutation มีอยู่แล้ว แต่การค้นพบคนใหม่ข้ามทีมเป็น authority เพิ่มจาก SRS §4.3 จึงไม่อ้าง D09/Zo อนุมัติ policy นี้. NAV ไม่ใช่ runtime prerequisite: เปิด member picker ผ่าน Projects ได้; partial PR6 เป็น source prerequisite ไม่ใช่ full parent DONE

## References

[Proposal / alternatives / decisions](../../docs/product/del-access-followups.md) · [Parent](DEL-ACCESS.md) · [Scope limitations](../../docs/product/evidence/DEL-ACCESS.md#scope-limitations-found) · [R09](../../docs/product/delivery-rules.md#10-ux-reliability-และ-validation-r09r11) · [Rollout gates](../../docs/product/delivery-rollout.md#per-pr-execution-gates-future-work-not-executed-here) · [SRS §4.3–4.4](../../TeamFlow_SRS_v1.0.md) · [locked API](../../TeamFlow_API_Contract.md). Proposed partial trace: TC-087/088/089, AT-32; no execution/adoption record changed

Source: [route](../../src/api/workspaces.ts) `get_api_directory` L15–18; [authorization](../../src/services/authorization.ts) `authorizeOperation` L291; [workspace service](../../src/services/workspaces.ts) `directory` L627 / `projectMember` L555; [Members UI](../../frontend/src/Workspaces.tsx) `canDirectory` L1431 / request L1502; [schemas](../../frontend/src/workspace-api.ts) `directoryPage`; [generator](../../scripts/build-contract.mjs) `DirectoryPerson` / directory operation L256; [contract checker](../../scripts/check-contract.mjs) route-owner inventory + fixed 89 routes

## Files

- ref: route handler ส่ง `c.query` อยู่แล้ว, [runtime contract loader](../../src/api/contract.ts), [validator](../../contracts/validate.mjs), [session/provider fixtures](../../tests/schema/fixtures.ts), [HTTP fixture factory parameter](../../tests/permissions/http-fixture.ts), [workspace provider suite](../../tests/workspaces/provider-suite.ts); ไม่จำเป็นต้องเปลี่ยน router/contract loader/shared fixtures ใน recommended mode
- touch: exact `allowed_paths` เป็น **proposed future ceiling** เท่านั้น. `delivery-directory-suite.ts` เป็น **planned new provider-parameterized real service/HTTP suite**; `.test.ts` ใน permissions/PG เป็น **planned new wrappers**, contract/browser filenames เป็น **planned new tests**. ทบทวนชื่อเมื่อ adopt
- Integration: route query schema → authorization branch → service scoped candidate query/count → distinct frontend parser → Members picker. Regenerate OpenAPI จาก generator และ version API prose; existing route/owner count คงเดิม. Legacy directory parser/response/permissions คงเดิมเมื่อไม่มี project
- ห้ามแตะ: SRS/old Task Register/16-card inventory/test manifest/DEL-ACCESS evidence, AGENTS, config/runtime/dependencies/lockfiles, DB migrations/roles/grants. ถ้า adoption ต้อง align broader spec/traceability ให้ dedicated reviewed planning scope ก่อน ไม่ยืม ceiling นี้

## Tasks

- [ ] Owner + security ตอบ Q-DAF-DIR-01/02, บันทึก approved discovery pool/disclosure/error policy และ adopt exact paths ก่อน implementation
- [ ] RED แยกสองหลักฐาน: current plain P-03 manager request ถูก deny และ scoped response/negative privacy expectations ที่ยังไม่มี; ห้ามแก้ RED โดย grant Lead
- [ ] เพิ่ม **proposed** `GET /api/directory?project=<id>&q=...&page=...&pageSize=...` บน route เดิม. Optional positive project ID; query absent คง legacy policy. Scoped response ใหม่ identity-only page แยก schema/parse ไม่ reuse legacy teams[] payload
- [ ] Authorization + service recheck current actor/project role/P-03 ก่อน query/count ทั้งคู่; อ่าน current keys ทุก request ไม่ cache grant ข้าม request. SQL parameterized search/pagination; ไม่มี fallback unscoped เมื่อ project invalid/denied
- [ ] Wire Members project candidate search ให้ใช้ scoped mode; team/legacy directory flows เดิมคงเดิม. Response/selection เก่าต้องถูกล้างเมื่อ query/project/authority เปลี่ยน พร้อม epoch/abort guards และ persistent safe failure
- [ ] PUT/DELETE เดิมยัง authoritative: target eligibility/version/manager appointment constraints และ atomic audit/cleanup ไม่เปลี่ยน. GREEN ทั้ง HTTP/SQLite/PG/browser/contract แล้ว host independent review และ parent gate

## Acceptance

- [ ] Policy ที่เลือกบันทึกชัดเจนก่อนเขียน tests ตาม policy; recommended pool คือ active eligible organization identities สำหรับ Editor/Viewer, ไม่ให้ P-03 แก้ effective Admin/owner-team Lead/explicit manager. Discovery ข้ามทีมต้อง explicit approval ไม่ซ่อนเป็น implementation default
- [ ] Scoped mode อนุญาต active Admin/owner-team Lead และ actual project manager + P-03 เท่านั้น; manager ของ project อื่น, Editor/Viewer แม้มี P-03, unrelated/inactive/revoked/password-gated actor ไม่ได้ candidate items/total. ใช้ NOT_FOUND สำหรับ project ที่มองไม่เห็นและ FORBIDDEN สำหรับ visible-but-not-authorized ตาม policy ที่ adopt
- [ ] `project` ไม่ระบุคง Admin/any access Lead directory เดิม; manager P-03 ไม่ได้ broad directory grant. Duplicate/zero/noninteger/unknown query และ project สลับข้าม scope ถูก validate/deny ไม่ fallback. Current parent archive UI restriction ของ PR6 ไม่ถูกเปลี่ยนโดย discovery card
- [ ] Scoped response `{items:[{id,display_name}],page,pageSize,total}` เป็นข้อเสนอ; ส่งเฉพาะ approved eligible pool และ total ของ pool นั้น. ไม่มี hidden team ID/name/roster/count, contact/account/role fields หรือ inactive names. UI ไม่แสดง hidden affiliations ด้วย fallback legacy schema
- [ ] Add Editor/Viewer จาก search สำเร็จเฉพาะ explicit confirmation; ไม่ auto-add role/P-key/manager. Race target inactive/manager promotion, actor P-03 revoked/demoted, membership version stale ต้องถูก server deny/409 ไม่ overwrite; selection ไม่ใช่ authorization token
- [ ] Search paging/repeated/blank Thai/emoji query, empty/failure/denied/409/offline/maintenance, keyboard/mobile/zoom ทำงาน; held old-project/old-query/old-permission responses ไม่เติม candidate หรือ draft กลับ. Denial ล้าง candidate names/counts/selection ตาม scope
- [ ] Real PG17 fixtures execute nonzero HTTP/service cases. Read-only discovery ไม่เขียน membership/audit/notification; failed mutation ไม่เหลือ partial version/cleanup/audit/notification และ successful mutation เก็บ atomic effects เดิม. ทดสอบ revoke-vs-confirm ทั้งลำดับและ privacy ของ response

## Not Do

ไม่ให้ global directory แก่ P-03, ไม่ grant team Lead/membership/P-key, ไม่เปิด username/email/hidden team data, ไม่เพิ่ม endpoint ใหม่หรือเปลี่ยน 89-route check ใน recommended scope. Alternative endpoint ใหม่ต้อง re-scope planning ก่อน ไม่แก้ old register เพื่อให้ checker ผ่าน. ไม่เพิ่ม candidate cache ข้าม session และไม่รวม parent-state policy

## Verify

**Planned / NOT_RUN ทุกคำสั่ง.** RED→GREEN หลัง policy ถูก adopt เท่านั้น. Provider suite ต้องใช้ real `pgFixture`/session + HTTP authorization บน PG จริง ไม่ mock provider. Host จัด private connection environment; `NODE_ENV=test`, `DB_PROVIDER=postgres`, DB_NAME suffix `_test`, credentials ไม่ลง docs/log. New wrappers ต้อง skip ชัดเมื่อไม่ opt in; all-skipped ไม่ใช่ PASS

```sh
node --import tsx --test tests/permissions/delivery-directory.test.ts
node --test tests/contracts/delivery-directory.test.mjs
npm run build:contract
npm run check:contract
npm run test:contract
npm run test:workspaces
npm run test:permissions
npm run test:authorization
npm run typecheck
npm run lint
npx eslint tests/postgres/delivery-directory.test.ts
npm run build
npm run check:test-plan
npm run test:test-plan
npm test
NODE_ENV=test DB_PROVIDER=postgres RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-directory.test.ts
NODE_ENV=test DB_PROVIDER=postgres RUN_POSTGRES_TESTS=1 npm run test:postgres
npx playwright test tests/browser/delivery-access-directory.spec.ts tests/browser/delivery-access-parity.spec.ts tests/browser/workspaces.spec.ts tests/browser/organization.spec.ts tests/browser/header-member-followup.spec.ts tests/browser/delivery-drafts.spec.ts tests/browser/delivery-focus-mobile.spec.ts
```

Contract test ก่อน build ใช้เป็น RED สำหรับ approved query/schema; หลัง generate ต้องรัน targeted test และ test:contract เป็น GREEN. Route inventory/owner mapping เดิมต้องผ่านจริง ไม่ลด check. Host ใช้ Node22 และ free port/new disposable external browser fixture/approved TMPDIR ตาม rollout; build ก่อน browser. ไม่ migration จึงไม่มี fresh/legacy schema upgrade ใน card นี้ แต่ต้องทดสอบ existing rows กับ empty/seeded candidate fixtures แยก SQLite/PG. PG read tests ไม่ปิด Linux/Docker/backup-restore/UAT/deploy

## Questions

- **Q-DAF-DIR-01 — OPEN / business-security blocker:** ยอมให้ manager+P-03 ค้นชื่อ active accounts ข้ามทีมใน pool ใด และ protected targets/total แบบใด? แนะนำ minimal identity-only eligible organization pool; alternative คง already-readable members + Admin/Lead เพิ่มคนใหม่ แต่ blocker จะยังไม่ปิด
- **Q-DAF-DIR-02 — OPEN / contract gate:** เลือก scoped mode บน route เดิม พร้อม distinct schema และ errors หรือ endpoint ใหม่? แนะนำ scoped mode เพื่อไม่แตะ locked route inventory/old register. Exact query/response/version ต้อง adopt ก่อน generate

## Evidence / Review

Source inspection only. RED/GREEN/contract/PG/browser **NOT_RUN**; independent specification/security proposal review **PERFORMED / CLEAN (docs-only)** และ parent precommit gate **SATISFIED** ตาม [host handoff](../../docs/product/del-access-followups.md#host-handoff--completed-proposal-review); runtime/code review **NOT_RUN**. Host handles execution evidence, Git/auth/review; author ไม่ invoke review. Future results ต้องระบุ source/build/provider/exits/executed/skipped ใน card นี้. DEL-ACCESS **in_progress**, DEL-VALIDATION dependency **blocked**; official register **9/96 completed, 87 remaining**. Next proposed **DEL-ACCESS-PARENT-STATE / High**, decision gate แยกกัน
