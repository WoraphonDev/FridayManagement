---
id: DEL-UX2
title: "Entity draft protection and persistent mutation errors"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "Hermes / parent independent review"
status: in_progress
proposal: false
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
  - "tests/browser/permission-matrix.spec.ts"
  - "tickets/delivery/DEL-UX2.md"
  - "docs/product/evidence/DEL-UX2.md"
---

# DEL-UX2 — Entity draft protection and persistent mutation errors

## Context
One coherent PR, adopted by explicit user-approved “ทำเลย” sequential continuation on isolated branch `fix/del-ux2-draft-protection`, base `68052e2` (DEL-UX1 merged). Declared effort **High**; actual runtime effort NOT_VERIFIED. This is delivery-card state, not official Task Register closure. No commit/push/deploy authority.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D10; UX01–04/09; entity/member/permission forms

## Files
`allowed_paths` above is the adopted implementation ceiling for this isolated worktree. Out-of-scope changes require parent review; notably the legacy permission-matrix test needs a precise acceptance update outside this ceiling. No migration or dependency changes.

## Tasks
- [x] Resolve listed dependencies/questions and adopt this card before coding (explicit user approval; DEL-UX1 merged).
- [x] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions (checkpoint logs in evidence).
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Dirty close/Escape/backdrop/route/tab has Stay default and explicit Discard; cancelling picker never discards parent.
- [ ] 409 preserves draft and compares latest; newer latest invalidates review, no blind overwrite.
- [ ] Timeout/lost ack remains unconfirmed; no optimistic success; retry reconciles same intent under locked idempotency policy.
- [ ] Revocation clears private data; offline/maintenance disable writes; persistent actionable error not toast-only; no durable draft/secret cache.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Does not include Doc editor work, split to DEL-UX3.

## Verify
Commands below are exact acceptance targets; browser file authored and exercised. Actual counts, command exits, remaining regression blocker and baseline Calendar reproduction are recorded in [evidence](../../docs/product/evidence/DEL-UX2.md). Status stays in_progress pending independent review; not all browser tests pass.

```sh
npm run test:frontend
npx playwright test tests/browser/delivery-drafts.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
No new business decision required by this scope; unresolved dependencies still apply.

## Evidence / Review
Execution checkpoints: [DEL-UX2 evidence](../../docs/product/evidence/DEL-UX2.md). Independent specification and code/security review pending; do not mark done from document presence or partial browser results.
