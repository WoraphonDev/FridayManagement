---
id: DEL-UX1
title: "Post-mutation focus and mobile shell"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "user-authorized implementation / parent review"
status: in_progress
proposal: false
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
Adopted for the explicit user instruction “เริ่มทำข้อ1เลยได้ไหม”: mobile shell/header and post-save Task modal focus, including the keyboard/mobile acceptance below. Declared effort **Medium**; actual runtime effort NOT_VERIFIED. DEL-SPEC merged in baseline main `d501922`. This adoption does not allocate an official Task Register ID or change DONE 9 / total 96 / remaining 87. No commit/push/merge/deploy authority.

The mobile CSS origin is `vibe.css`, `login-design.css`, and shared theme rules; those are outside this card. Use narrowly scoped overrides in the already approved `page-headers.css` only, with no changes to those source files. If that cannot satisfy acceptance, request an explicit allowed-path amendment before editing elsewhere.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D10; UX05/06; P02/P05/P09 and shared dialogs

## Files
`allowed_paths` above is the adopted implementation ceiling. Only the shared opener/dialog/form code, scoped header stylesheet, new browser spec, this card and its evidence were changed. Out-of-scope dependency changes need a separate reviewed card.

## Tasks
- [x] Resolve listed dependencies/questions and adopt this card before coding.
- [x] Reproduce applicable failing behavior test (RED), implement scoped GREEN, refactor without weakening assertions.
- [ ] Independent parent review/sign-off pending; actual commands/build/provider/outcomes recorded in [evidence](../../docs/product/evidence/DEL-UX1.md).

## Acceptance
- [x] First reproduce save→rerender→close focus failure, not just Cancel; stable opener/fallback after deletion (Chromium).
- [x] Escape picker-first, modal focus trap, IME Enter, no polling focus theft (Chromium synthetic composition).
- [x] 360/390/768/1440 and CSS zoom200%: Thai headers/long names readable, form no page overflow, table scroll internal. Native browser zoom/device acceptance NOT_RUN.
- [x] No permission/domain/API changes or extra mutation confirmation.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. New browser spec is planned; reproduce RED before fix.

## Verify
Commands below were executed: frontend **50 passed**, targeted Chromium **14/14 passed** twice. Common gates and `npm test` exited 0 (one opt-in Docker/PG test skipped); relevant browser regressions **17 passed / 1 existing Calendar failure**, reproduced on baseline frontend. Exact logs, build identity, RED/GREEN, screenshots and limitations are in [evidence](../../docs/product/evidence/DEL-UX1.md).

```sh
npm run test:frontend
npx playwright test tests/browser/delivery-focus-mobile.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
No new business decision required by this scope; unresolved dependencies still apply.

## Evidence / Review
Local implementation and verification complete; independent specification and code/security review **PENDING parent**. Remains `in_progress`, not DONE. No commit/push/merge/deploy. See [execution evidence](../../docs/product/evidence/DEL-UX1.md).
