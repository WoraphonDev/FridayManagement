---
id: DEL-VALIDATION
title: "Thai emoji IME validation parity without limit migration"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: in_progress
proposal: false
effort: Medium
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
  - "frontend/src/text-length.ts"
  - "frontend/src/delivery-validation.test.ts"
  - "tests/browser/delivery-validation.spec.ts"
  - "tests/contracts/delivery-validation.test.mjs"
  - "tickets/delivery/DEL-VALIDATION.md"
  - "docs/product/evidence/DEL-VALIDATION.md"
---

# DEL-VALIDATION — Thai emoji IME validation parity without limit migration

## Context
Adopted 2026-11-24 by owner Zo: one card = one PR, adoption + implementation together; parent DEL-ACCESS closed in the same PR. Declared effort **Medium** (owner: medium default, not security-sensitive); actual runtime model/effort NOT_VERIFIED. Delivery status only; official Task Register unchanged (9/96 completed, 87 remaining). Shared helper `frontend/src/text-length.ts` added to allowed_paths (pre-named by owner).

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D11; existing field snapshot

## Files
`allowed_paths` above is a future PR ceiling, not permission for this docs-only PR. New filenames/globs are proposed; resolve exact migration numbers against target main before coding, never overwrite existing migration. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [x] Resolve listed dependencies/questions and adopt this card before coding (DEL-ACCESS closed).
- [x] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review (commands recorded; commit/review pending).

## Acceptance
- [x] Read actual schema limits/count/trim semantics before UI changes, never widen contract to fit UI.
- [x] At limit / over limit / Thai combining / emoji pairs / IME composition match client+server; helper explains correct count.
- [x] Password scalar-count/no-trim policy stays separate; stored legacy content not truncated or rewritten.
- [x] Field error summary links invalid field and retains draft; date-only/required-stage helpers match authority (existing TaskEditor date/recurrence helpers reviewed, unchanged).

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
See [DEL-VALIDATION evidence](../../docs/product/evidence/DEL-VALIDATION.md). Local SQLite/Chromium gates PASS (counts there); 2 `accounts.spec.ts` failures reproduce on unchanged base `8b55cd9` (pre-existing). Real PostgreSQL / production / UAT **NOT_RUN** (carried by T-091). Independent review pending; not done.

### Host review — 2026-11-24

- Independent review (separate Claude Code session, read-only): APPROVE, 5 MINOR. Host fixed 3:
  - Save is now blocked by raw over-limit values even during IME composition (`rawLengthIssues`); only the display waits.
  - `composing` is cleared on blur.
  - The error summary uses `role=status` / `aria-live=polite` instead of `alert`.
- Follow-ups (not in this PR): add counters/hints to the checklist title/remark inputs; add optional hints for the Users email/tel fields.
- Host verify after fixes: typecheck and lint PASS. test:frontend 116/116, contract 71/71, test-plan 18/18, workspaces 20/20, tasks 33/33, accounts 30/30. Browser: delivery-validation, workspaces, tasks, delivery-drafts, delivery-focus-mobile 51/51.
- `accounts.spec.ts` :83 and :232 fail identically on unmodified origin/main `8b55cd9`. This is pre-existing, not caused by this card, and is tracked separately.
- PG/UAT NOT_RUN (carried by T-091).
