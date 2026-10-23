---
id: DEL-EFFORT
title: "Optional effort and explicit weekly availability"
type: feat
priority: P3
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-RISK"]
questions: ["Q-DEL-10"]
allowed_paths:
  - "src/domain/delivery-effort.ts"
  - "src/services/delivery-effort.ts"
  - "src/api/app.ts"
  - "src/api/delivery-effort.ts"
  - "frontend/src/DeliveryEffort.tsx"
  - "frontend/src/delivery-effort-api.ts"
  - "migrations/sqlite/*_delivery_effort.sql"
  - "migrations/postgres/*_delivery_effort.sql"
  - "tests/workspaces/delivery-effort.test.ts"
  - "tests/postgres/delivery-effort.test.ts"
  - "tests/browser/delivery-effort.spec.ts"
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
  - "tests/tasks/delivery-effort.test.ts"
  - "tickets/delivery/DEL-EFFORT.md"
  - "docs/product/evidence/DEL-EFFORT.md"
---

# DEL-EFFORT — Optional effort and explicit weekly availability

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D06; C09; later optional phase

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Owner-adopted units/limits/allocation/read-write privacy before implementation; no time tracking/timers/remaining-effort invention.
- [ ] Unknown separate from zero availability; no 40h default, equal collaborator split or duplicated task estimate.
- [ ] Weekly aggregate explicitly planned after allocation decision; unknown/unallocated/truncated coverage visible; no capacity from task counts.
- [ ] Part-time/leave/multi-project and multi-assignee allocation, Bangkok week boundaries, privacy/revoke/version tests; legacy unchanged.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Cannot infer weekly load from calendar span or employee rank from utilization.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:tasks
npm run test:task-views
npm run test:permissions
node --import tsx --test tests/workspaces/delivery-effort.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-effort.test.ts
npx playwright test tests/browser/delivery-effort.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-10

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
