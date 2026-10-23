---
id: DEL-VALIDATION
title: "Thai emoji IME validation parity without limit migration"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: draft
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-ACCESS"]
questions: []
allowed_paths:
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/TaskEditor.tsx"
  - "frontend/src/ProjectDocs.tsx"
  - "frontend/src/Users.tsx"
  - "frontend/src/AdminCenter.tsx"
  - "frontend/src/delivery-validation.test.ts"
  - "tests/browser/delivery-validation.spec.ts"
  - "tests/contracts/delivery-validation.test.mjs"
  - "tickets/delivery/DEL-VALIDATION.md"
  - "docs/product/evidence/DEL-VALIDATION.md"
---

# DEL-VALIDATION — Thai emoji IME validation parity without limit migration

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D11; existing field snapshot

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Read actual schema limits/count/trim semantics before UI changes, never widen contract to fit UI.
- [ ] At limit / over limit / Thai combining / emoji pairs / IME composition match client+server; helper explains correct count.
- [ ] Password scalar-count/no-trim policy stays separate; stored legacy content not truncated or rewritten.
- [ ] Field error summary links invalid field and retains draft; date-only/required-stage helpers match authority.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. No source schema/API limit changes in this card.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:frontend
npm run test:contract
npx playwright test tests/browser/delivery-validation.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
No new business decision required by this scope; unresolved dependencies still apply.

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
