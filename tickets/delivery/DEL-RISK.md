---
id: DEL-RISK
title: "Shared Risk Issue Blocker register"
type: feat
priority: P2
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-MILESTONE"]
questions: ["Q-DEL-09"]
allowed_paths:
  - "src/domain/delivery-risk.ts"
  - "src/services/delivery-risk.ts"
  - "src/api/app.ts"
  - "src/api/delivery-risk.ts"
  - "frontend/src/DeliveryRisk.tsx"
  - "frontend/src/delivery-risk-api.ts"
  - "migrations/sqlite/*_delivery_risk.sql"
  - "migrations/postgres/*_delivery_risk.sql"
  - "tests/workspaces/delivery-risk.test.ts"
  - "tests/postgres/delivery-risk.test.ts"
  - "tests/browser/delivery-risk.spec.ts"
  - "scripts/build-contract.mjs"
  - "contracts/openapi.json"
  - "TeamFlow_API_Contract.md"
  - "docs/product/delivery-contract-plan.md"
  - "src/services/workspaces.ts"
  - "src/api/workspaces.ts"
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/ProjectInsights.tsx"
  - "frontend/src/workspace-api.ts"
  - "tickets/delivery/DEL-RISK.md"
  - "docs/product/evidence/DEL-RISK.md"
---

# DEL-RISK — Shared Risk Issue Blocker register

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D07; C08; planning chapter

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Distinct types; owner/next action/review date with adopted triage/resolve/accept-risk matrix; null impact not low by default.
- [ ] Risk potential vs actual issue/blocker; accepted-risk only risk; resolution evidence/history retained; no extra task status.
- [ ] Same-project task/milestone links, explicit project-level affected scope, no hidden resource leak; security revoke never blocked.
- [ ] Concurrent triage/resolve, history rollback, legacy empty records, pagination/mobile keyboard and unauthorized reads tested.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. No automatic comment parsing, formal change approval or workflow customization.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:workspaces
npm run test:permissions
node --import tsx --test tests/workspaces/delivery-risk.test.ts
RUN_POSTGRES_TESTS=1 node --import tsx --test --test-concurrency=1 tests/postgres/delivery-risk.test.ts
npx playwright test tests/browser/delivery-risk.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
Q-DEL-09

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
