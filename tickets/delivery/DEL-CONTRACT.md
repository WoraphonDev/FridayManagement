---
id: DEL-CONTRACT
title: "Resolve dependent policy and draft delivery wire contracts"
type: docs
priority: P1
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: blocked
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-VALIDATION"]
questions: ["Q-DEL-01", "Q-DEL-02", "Q-DEL-03", "Q-DEL-04", "Q-DEL-05", "Q-DEL-06"]
allowed_paths:
  - "docs/product/delivery-rules.md"
  - "docs/product/delivery-contract-plan.md"
  - "docs/product/delivery-decisions.md"
  - "tickets/delivery/**"
  - "tickets/delivery/DEL-CONTRACT.md"
  - "docs/product/evidence/DEL-CONTRACT.md"
---

# DEL-CONTRACT — Resolve dependent policy and draft delivery wire contracts

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D01–04/08/12; C01–05

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Record exact owner answers only for genuine business effects; retain proposal status until evidence exists.
- [ ] Specify actors/eligibility/replacement/open-task completion/reopen/ongoing closure/adoption and direct review/done/recurrence gates.
- [ ] Draft field/wire names/null/omission/limits/errors/idempotency/version/reference and atomic audit/snapshot payload; do not regenerate locked contract yet.
- [ ] Map changed operations/tests/migration rollout by runtime card; security review approves no bypass/access leak; unresolved slices remain blocked.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Docs-only follow-on. Can draft before answers; cannot declare policy resolved without answers.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run check:contract
npm run check:test-plan
git diff --check
```

## Questions
Q-DEL-01, Q-DEL-02, Q-DEL-03, Q-DEL-04, Q-DEL-05, Q-DEL-06

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
