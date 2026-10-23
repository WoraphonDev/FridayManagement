---
id: DEL-TASK
title: "Primary task owner and new-task readiness across all mutations"
type: feat
priority: P1
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-PROJECT"]
questions: ["Q-DEL-02"]
allowed_paths:
  - "src/domain/delivery-task.ts"
  - "src/services/delivery-task.ts"
  - "src/api/app.ts"
  - "src/api/delivery-task.ts"
  - "frontend/src/DeliveryTask.tsx"
  - "frontend/src/delivery-task-api.ts"
  - "migrations/sqlite/*_delivery_task.sql"
  - "migrations/postgres/*_delivery_task.sql"
  - "tests/workspaces/delivery-task.test.ts"
  - "tests/postgres/delivery-task.test.ts"
  - "tests/browser/delivery-task.spec.ts"
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
  - "tests/tasks/delivery-task.test.ts"
  - "tickets/delivery/DEL-TASK.md"
  - "docs/product/evidence/DEL-TASK.md"
---

# DEL-TASK — Primary task owner and new-task readiness across all mutations

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D03/04/12; C03; Tasks/shared/board

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Explicit single primary owner plus unchanged collaborators; never first-assignee migration; legacy advisory marker persists.
- [ ] New todo→doing/review/done checks identical in PATCH/board/inline/batch and recurrence successor; no direct-later-status bypass.
- [ ] Revocation immediately removes effective access and flags replacement; current assignment/readiness rule matches adopted Q-DEL-02.
- [ ] Existing checklist/recurrence/status enums preserved; concurrent version/owner revoke/idempotency rollback tested on both providers.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. No effort/capacity or project lifecycle in this card.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:tasks
npm run test:boards
npm run test:permissions
node --import tsx --test tests/workspaces/delivery-task.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-task.test.ts
npx playwright test tests/browser/delivery-task.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-02

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
