---
id: DEL-LIFECYCLE
title: "Lifecycle transitions and named acceptance"
type: feat
priority: P1
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-BASELINE"]
questions: ["Q-DEL-01", "Q-DEL-03", "Q-DEL-04", "Q-DEL-05", "Q-DEL-06"]
allowed_paths:
  - "src/domain/delivery-lifecycle.ts"
  - "src/services/delivery-lifecycle.ts"
  - "src/api/app.ts"
  - "src/api/delivery-lifecycle.ts"
  - "frontend/src/DeliveryLifecycle.tsx"
  - "frontend/src/delivery-lifecycle-api.ts"
  - "migrations/sqlite/*_delivery_lifecycle.sql"
  - "migrations/postgres/*_delivery_lifecycle.sql"
  - "tests/workspaces/delivery-lifecycle.test.ts"
  - "tests/postgres/delivery-lifecycle.test.ts"
  - "tests/browser/delivery-lifecycle.spec.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "docs/product/delivery-contract-plan.md"
  - "src/services/workspaces.ts"
  - "src/api/workspaces.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/ProjectInsights.tsx"
  - "frontend/src/workspace-api.ts"
  - "src/domain/delivery-baseline.ts"
  - "src/services/delivery-baseline.ts"
  - "tickets/delivery/DEL-LIFECYCLE.md"
  - "docs/product/evidence/DEL-LIFECYCLE.md"
---

# DEL-LIFECYCLE — Lifecycle transitions and named acceptance

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D01–03/08/12; C04/05

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Server transition matrix adopted before coding; finite readiness and ongoing review/closure distinct; archived separate.
- [ ] Confirm-start snapshot and state change atomic; one named eligible acceptor must affirm with evidence; Admin cannot bypass.
- [ ] Zero tasks/100% Done do not auto-complete; open-task policy, reopen and preserved past acceptance exactly match owner answers.
- [ ] Revocation vs accept/start race, duplicate completion, actual date Bangkok boundary, denied cross-project evidence and ongoing overdue review tested.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Do not enable unresolved transition branch under a guessed default; ongoing closure may remain blocked explicitly.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:workspaces
npm run test:tasks
npm run test:authorization
node --import tsx --test tests/workspaces/delivery-lifecycle.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-lifecycle.test.ts
npx playwright test tests/browser/delivery-lifecycle.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-01, Q-DEL-03, Q-DEL-04, Q-DEL-05, Q-DEL-06

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
