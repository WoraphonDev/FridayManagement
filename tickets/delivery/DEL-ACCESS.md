---
id: DEL-ACCESS
title: "UI and existing server permission parity"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: draft
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-UX3"]
questions: []
allowed_paths:
  - "frontend/src/Workspaces.tsx"
  - "frontend/src/AdminCenter.tsx"
  - "frontend/src/Trash.tsx"
  - "tests/browser/delivery-access-parity.spec.ts"
  - "tests/permissions/delivery-parity.test.ts"
  - "tickets/delivery/DEL-ACCESS.md"
  - "docs/product/evidence/DEL-ACCESS.md"
---

# DEL-ACCESS — UI and existing server permission parity

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D09; P-01/02/03/04/08 context

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Document observed endpoint×role matrix first; catalogue description is not an endpoint capability.
- [ ] UI actions follow actual authority Admin/owner-team Lead/manager with each P-key/editor/viewer/unrelated; own-vs-other and cross-team tested.
- [ ] 403/revocation/version race/archive deny without leaks; no role/P-key auto-grants or security redesign.
- [ ] Do not invent DELETE group from catalogue; no hidden resource count/name leak from unavailable controls.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Server policy is read-only reference; policy bugs outside parity scope become separate cards.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:permissions
npm run test:authorization
node --import tsx --test tests/permissions/delivery-parity.test.ts
npx playwright test tests/browser/delivery-access-parity.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
No new business decision required by this scope; unresolved dependencies still apply.

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
