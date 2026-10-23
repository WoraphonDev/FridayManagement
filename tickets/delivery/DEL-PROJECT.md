---
id: DEL-PROJECT
title: "Nullable project delivery metadata and explicit responsibility"
type: feat
priority: P1
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-CONTRACT"]
questions: ["Q-DEL-01", "Q-DEL-05", "Q-DEL-06"]
allowed_paths:
  - "src/domain/delivery-project.ts"
  - "src/services/delivery-project.ts"
  - "src/api/app.ts"
  - "src/api/delivery-project.ts"
  - "frontend/src/DeliveryProject.tsx"
  - "frontend/src/delivery-project-api.ts"
  - "migrations/sqlite/*_delivery_project.sql"
  - "migrations/postgres/*_delivery_project.sql"
  - "tests/workspaces/delivery-project.test.ts"
  - "tests/postgres/delivery-project.test.ts"
  - "tests/browser/delivery-project.spec.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "docs/product/delivery-contract-plan.md"
  - "src/services/workspaces.ts"
  - "src/api/workspaces.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/ProjectInsights.tsx"
  - "frontend/src/workspace-api.ts"
  - "tickets/delivery/DEL-PROJECT.md"
  - "docs/product/evidence/DEL-PROJECT.md"
---

# DEL-PROJECT — Nullable project delivery metadata and explicit responsibility

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D01–03/12; C01/02/05; Projects

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Add nullable setup with explicit lead/acceptor/mode/criteria/commitment or review date; keep existing create/use/archive working.
- [ ] No default lead/date/mode from task/team/category; same lead/acceptor allowed but no grants; server rejects ineligible references.
- [ ] Fresh/legacy migrations retain original columns/versions/assignments/access; unreviewed marker until explicit classification.
- [ ] No activation/adoption snapshot or lifecycle gate in this PR; expose setup and needs-replacement only; version/revoke race/audit atomic.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Contract/migration/UI metadata only; adoption activation waits DEL-BASELINE/DEL-LIFECYCLE.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:workspaces
npm run test:schema
node --import tsx --test tests/workspaces/delivery-project.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-project.test.ts
npx playwright test tests/browser/delivery-project.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-01, Q-DEL-05, Q-DEL-06

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
