---
id: DEL-DEPENDENCY
title: "Later same-project warning-only dependencies"
type: feat
priority: P3
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-RISK", "DEL-EFFORT"]
questions: ["Q-DEL-11"]
allowed_paths:
  - "src/domain/delivery-dependency.ts"
  - "src/services/delivery-dependency.ts"
  - "src/api/app.ts"
  - "src/api/delivery-dependency.ts"
  - "frontend/src/DeliveryDependency.tsx"
  - "frontend/src/delivery-dependency-api.ts"
  - "migrations/sqlite/*_delivery_dependency.sql"
  - "migrations/postgres/*_delivery_dependency.sql"
  - "tests/workspaces/delivery-dependency.test.ts"
  - "tests/postgres/delivery-dependency.test.ts"
  - "tests/browser/delivery-dependency.spec.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "docs/product/delivery-contract-plan.md"
  - "src/services/tasks.ts"
  - "src/services/boards.ts"
  - "src/api/tasks.ts"
  - "frontend/src/TaskEditor.tsx"
  - "frontend/src/TaskWorkspace.tsx"
  - "frontend/src/task-api.ts"
  - "tests/tasks/delivery-dependency.test.ts"
  - "tickets/delivery/DEL-DEPENDENCY.md"
  - "docs/product/evidence/DEL-DEPENDENCY.md"
---

# DEL-DEPENDENCY — Later same-project warning-only dependencies

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D05; C10; later separate PR

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Adopt access/warning/lag/removal rules; same-project accessible existing tasks, unique/no-self/no-cycle checked transactionally.
- [ ] Warnings only: no task transition block, automatic date propagation, cross-project graph or critical path.
- [ ] Recurrence predecessor remains independent; trashed/revoked references handled without leaked names.
- [ ] Concurrent opposite-edge cycle, duplicates, date warning and unchanged dates after dependency edits covered; keyboard/list mobile alternative.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Sequential rollout after risk/optional effort; effort is sequence dependency only, not algorithm requirement.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:tasks
npm run test:boards
npm run test:permissions
node --import tsx --test tests/workspaces/delivery-dependency.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-dependency.test.ts
npx playwright test tests/browser/delivery-dependency.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-11

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
