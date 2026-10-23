---
id: DEL-UX1
title: "Post-mutation focus and mobile shell"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: draft
proposal: true
effort: Medium
parent: null
children: []
depends_on: ["DEL-SPEC"]
questions: []
allowed_paths:
  - "frontend/src/shared/components.tsx"
  - "frontend/src/shared/opener.ts"
  - "frontend/src/App.tsx"
  - "frontend/src/page-headers.css"
  - "frontend/src/shared/components.test.tsx"
  - "tests/browser/delivery-focus-mobile.spec.ts"
  - "tickets/delivery/DEL-UX1.md"
  - "docs/product/evidence/DEL-UX1.md"
---

# DEL-UX1 — Post-mutation focus and mobile shell

## Context
One coherent proposed PR. Declared effort **Medium**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D10; UX05/06; P02/P05/P09 and shared dialogs

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] First reproduce save→rerender→close focus failure, not just Cancel; stable opener/fallback after deletion.
- [ ] Escape picker-first, modal focus trap, IME Enter, no polling focus theft.
- [ ] 360/390/768/1440 and zoom200%: Thai headers/long names readable, form no page overflow, table scroll internal.
- [ ] No permission/domain/API changes or extra mutation confirmation.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. New browser spec is planned; reproduce RED before fix.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:frontend
npx playwright test tests/browser/delivery-focus-mobile.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
No new business decision required by this scope; unresolved dependencies still apply.

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
