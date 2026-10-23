---
id: DEL-BASELINE
title: "Immutable starting plan and reasoned change history"
type: feat
priority: P1
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-TASK"]
questions: ["Q-DEL-01", "Q-DEL-06"]
allowed_paths:
  - "src/domain/delivery-baseline.ts"
  - "src/services/delivery-baseline.ts"
  - "src/api/app.ts"
  - "src/api/delivery-baseline.ts"
  - "frontend/src/DeliveryBaseline.tsx"
  - "frontend/src/delivery-baseline-api.ts"
  - "migrations/sqlite/*_delivery_baseline.sql"
  - "migrations/postgres/*_delivery_baseline.sql"
  - "tests/workspaces/delivery-baseline.test.ts"
  - "tests/postgres/delivery-baseline.test.ts"
  - "tests/browser/delivery-baseline.spec.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "docs/product/delivery-contract-plan.md"
  - "src/services/workspaces.ts"
  - "src/api/workspaces.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/ProjectInsights.tsx"
  - "frontend/src/workspace-api.ts"
  - "src/domain/delivery-project.ts"
  - "src/services/delivery-project.ts"
  - "tickets/delivery/DEL-BASELINE.md"
  - "docs/product/evidence/DEL-BASELINE.md"
---

# DEL-BASELINE — Immutable starting plan and reasoned change history

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D08/12; C05

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Implement snapshot/change transaction primitive and explicit legacy adoption command; activation endpoint wiring deferred DEL-LIFECYCLE.
- [ ] Snapshot payload/type/capture server time as adopted contract; never rewrite original on current edit/reopen; adoption labeled not historical.
- [ ] Every adopted post-start commitment/scope/responsibility edit requires reason/typed old-new/actor/time/version atomic; injected audit failure rolls back.
- [ ] Concurrent snapshot once only, lost ack/duplicate key/version conflicts, immutable history and permission-scoped evidence all tested.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. No formal multi-step change-approval workflow; task dates never shifted.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:workspaces
npm run test:idempotency
npm run test:schema
node --import tsx --test tests/workspaces/delivery-baseline.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-baseline.test.ts
npx playwright test tests/browser/delivery-baseline.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-01, Q-DEL-06

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
