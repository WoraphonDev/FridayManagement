---
id: DEL-UX2
title: "Entity draft protection and persistent mutation errors"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: draft
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-UX1"]
questions: []
allowed_paths:
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/AdminCenter.tsx"
  - "frontend/src/TaskWorkspace.tsx"
  - "frontend/src/shared/confirm.tsx"
  - "frontend/src/shared/confirm-bus.ts"
  - "tests/browser/delivery-drafts.spec.ts"
  - "tickets/delivery/DEL-UX2.md"
  - "docs/product/evidence/DEL-UX2.md"
---

# DEL-UX2 — Entity draft protection and persistent mutation errors

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D10; UX01–04/09; entity/member/permission forms

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Dirty close/Escape/backdrop/route/tab has Stay default and explicit Discard; cancelling picker never discards parent.
- [ ] 409 preserves draft and compares latest; newer latest invalidates review, no blind overwrite.
- [ ] Timeout/lost ack remains unconfirmed; no optimistic success; retry reconciles same intent under locked idempotency policy.
- [ ] Revocation clears private data; offline/maintenance disable writes; persistent actionable error not toast-only; no durable draft/secret cache.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Does not include Doc editor work, split to DEL-UX3.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:frontend
npx playwright test tests/browser/delivery-drafts.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
No new business decision required by this scope; unresolved dependencies still apply.

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
