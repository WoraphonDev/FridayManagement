---
id: DEL-MILESTONE
title: "Structured delivery checkpoints and views"
type: feat
priority: P2
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-HEALTH"]
questions: ["Q-DEL-08"]
allowed_paths:
  - "src/domain/delivery-milestone.ts"
  - "src/services/delivery-milestone.ts"
  - "src/api/app.ts"
  - "src/api/delivery-milestone.ts"
  - "frontend/src/DeliveryMilestone.tsx"
  - "frontend/src/delivery-milestone-api.ts"
  - "frontend/src/TaskViews.tsx"
  - "frontend/src/TaskWorkspace.tsx"
  - "migrations/sqlite/*_delivery_milestone.sql"
  - "migrations/postgres/*_delivery_milestone.sql"
  - "tests/workspaces/delivery-milestone.test.ts"
  - "tests/postgres/delivery-milestone.test.ts"
  - "tests/browser/delivery-milestone.spec.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "docs/product/delivery-contract-plan.md"
  - "src/services/workspaces.ts"
  - "src/api/workspaces.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/ProjectInsights.tsx"
  - "frontend/src/workspace-api.ts"
  - "tickets/delivery/DEL-MILESTONE.md"
  - "docs/product/evidence/DEL-MILESTONE.md"
---

# DEL-MILESTONE — Structured delivery checkpoints and views

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D05; C07; planning chapter

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Milestone title/owner/date/criteria/status/evidence and scoped task links with adopted actor rules; group never converted.
- [ ] Task Done counts cannot accept milestone; accept/cancel/reopen history and references revalidated.
- [ ] Date edits audited; list/overview/calendar markers and accessible mobile form distinguish checkpoint from task dates.
- [ ] Browser assertions verify task events and milestone markers coexist with distinct accessible names/types; opening a marker selects the correct checkpoint, not a task with a colliding numeric ID. Include an undated checkpoint, a mobile viewport and a read-only viewer; do not redesign calendar navigation or task date arithmetic.
- [ ] Fresh+legacy empty migration, linked trash/revocation, concurrent accept/update, no auto-scheduling tested.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Only checkpoint domain; no risk/capacity/dependency engine.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:workspaces
npm run test:task-views
npm run test:permissions
node --import tsx --test tests/workspaces/delivery-milestone.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-milestone.test.ts
npx playwright test tests/browser/delivery-milestone.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-08

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
