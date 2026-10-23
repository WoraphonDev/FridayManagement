---
id: DEL-UX3
title: "Title-first Docs and editor recovery"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: draft
proposal: true
effort: High
parent: null
children: []
depends_on: ["DEL-UX2"]
questions: []
allowed_paths:
  - "frontend/src/ProjectDocs.tsx"
  - "frontend/src/docs-editor.ts"
  - "frontend/src/ProjectDocs.test.tsx"
  - "tests/browser/project-docs.spec.ts"
  - "tests/browser/delivery-doc-recovery.spec.ts"
  - "tickets/delivery/DEL-UX3.md"
  - "docs/product/evidence/DEL-UX3.md"
---

# DEL-UX3 — Title-first Docs and editor recovery

## Context
One coherent proposed PR. Declared effort **High**; actual runtime model/effort NOT_VERIFIED. Status is planning only, not official Task Register state. No runtime execution authorized by this card.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D10; Doc fields; collaboration chapter

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [ ] Resolve listed dependencies/questions and adopt this card before coding.
- [ ] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [ ] Create asks title before persistence; blank/cancel creates no Untitled record; existing title limit/sanitizer unchanged.
- [ ] Dirty Doc switch/route/close preserves draft or explicit discard; Save only confirmed after server ack/readback as appropriate.
- [ ] Lost ack avoids duplicate create; 409/denied/maintenance preserve allowed context and persistent recovery; revocation wins privacy.
- [ ] Keyboard/mobile focus/caret recovery and sanitized body regressions covered; no coedit/history restore/formal document approval.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Existing contracts remain unchanged; no server sanitizer weakening.

## Verify
Commands below are exact acceptance targets; new named test files do not exist yet and must be authored in the implementation PR. Results **NOT_RUN**, except DEL-SPEC actual docs checks in verification report.

```sh
npm run test:frontend
npm run test:addendum
npx playwright test tests/browser/project-docs.spec.ts tests/browser/delivery-doc-recovery.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
No new business decision required by this scope; unresolved dependencies still apply.

## Evidence / Review
NOT_RUN for future behavior. No fabricated PASS. Independent specification and code/security review required; do not mark done from document presence.
