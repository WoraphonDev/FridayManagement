---
id: DEL-HEALTH
title: "Manual delivery health and scoped summary semantics"
type: feat
priority: P1
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-LIFECYCLE"]
questions: ["Q-DEL-07"]
allowed_paths:
  - "src/domain/delivery-health.ts"
  - "src/services/delivery-health.ts"
  - "src/api/app.ts"
  - "src/api/delivery-health.ts"
  - "frontend/src/DeliveryHealth.tsx"
  - "frontend/src/delivery-health-api.ts"
  - "migrations/sqlite/*_delivery_health.sql"
  - "migrations/postgres/*_delivery_health.sql"
  - "tests/workspaces/delivery-health.test.ts"
  - "tests/postgres/delivery-health.test.ts"
  - "tests/browser/delivery-health.spec.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "docs/product/delivery-contract-plan.md"
  - "src/services/workspaces.ts"
  - "src/api/workspaces.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/ProjectInsights.tsx"
  - "frontend/src/workspace-api.ts"
  - "src/services/insights.ts"
  - "frontend/src/insights-api.ts"
  - "tickets/delivery/DEL-HEALTH.md"
  - "docs/product/evidence/DEL-HEALTH.md"
---

# DEL-HEALTH — Manual delivery health and scoped summary semantics

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D01/08; C06; P01/P12

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Not assessed default; explicit assessment+rationale+next action+actor/time by adopted authority; no Done%-derived health.
- [ ] Stale interval as adopted decision, unknown/error not green or zero; history/version conflicts and unauthorized updates tested.
- [ ] List/overview separate business lead from access leads, commitment from task span and lifecycle from archive.
- [ ] No drilldown/CSV/report redesign or performance ranking; hidden/failed overview does not leak project metadata.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Health is manual product follow-on proposal; no approved stale7-days assumption.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:workspaces
npm run test:permissions
npm run test:frontend
node --import tsx --test tests/workspaces/delivery-health.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-health.test.ts
npx playwright test tests/browser/delivery-health.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-07

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
