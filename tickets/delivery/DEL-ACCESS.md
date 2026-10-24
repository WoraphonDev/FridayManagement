---
id: DEL-ACCESS
title: "UI and existing server permission parity"
type: fix
priority: P0
relates: { prd_ac: [], fr: [], security: [], permissions: [], api_operations: [], ui_pages: [], db_tables: [] }
owner: "unassigned"
status: in_progress
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
One coherent scoped PR. Declared effort **High**; actual runtime **gpt-6.1-sol / High**, verified in resumed-session turn_context (initial run was NOT_VERIFIED). Zo explicitly adopted this continuation on 2026-10-24 after merged PR5 (DEL-UX3), from base `b0e7c764295d001380afd7857cd16f02fa9bed75`. This delivery status does not change the official Task Register. Sole coding author; host owns dependency installation, browser/final checks, commits/push/PR and independent review.

## References
[Rules](../../docs/product/delivery-rules.md) · [Decisions](../../docs/product/delivery-decisions.md) · [Rollout / common gates](../../docs/product/delivery-rollout.md) · D09; P-01/02/03/04/08 context

## Files
`allowed_paths` above is the owner-authorized implementation ceiling. Server/grants/dependencies/lockfile/AGENTS/old Task Register changes are excluded. Out-of-scope changes need a separate reviewed card.

## Tasks
- [x] Resolve listed dependencies/questions and adopt this card before coding.
- [x] Reproduce local component-render RED, implement scoped GREEN and retain assertions (8/8 targeted tests); browser was executed by host; introduced regressions and resumed verification are recorded in evidence.
- [ ] Record command, commit/build/provider, actual expected/outcome and independent review.

## Acceptance
- [x] Document observed endpoint×role matrix first; catalogue description is not an endpoint capability.
- [ ] UI actions follow actual authority Admin/owner-team Lead/manager with each P-key/editor/viewer/unrelated; own-vs-other and cross-team tested.
- [ ] 403/revocation/version race/archive deny without leaks; no role/P-key auto-grants or security redesign.
- [ ] Do not invent DELETE group from catalogue; no hidden resource count/name leak from unavailable controls.

## Not Do
No AGENTS.md edits, grants/role auto-changes, unrelated cleanup, dependency/lockfile updates, live-data writes, deployment, production-guard removal or closing old tasks. Server policy is read-only reference; policy bugs outside parity scope become separate cards.

## Verify
Commands below are acceptance targets; both named test files are authored. Actual outcomes and exact logs are recorded in [DEL-ACCESS evidence](../../docs/product/evidence/DEL-ACCESS.md), final verification section dated 2026-10-25. Initial author listener EPERM and intermediate browser failures are historical. After same-author denial/race/combobox corrections, explicitly approved host narrow verification passed: typecheck/lint/fresh build and both regression cases exit 0. Final affected gates: permissions **17/17**, authorization **14/14**, parity **8/8**, frontend **53/53**, seven browser suites **72 passed / 1 scope-blocked fixme skipped, 73 total**, all exit 0. Host recomputed the five source/test hashes after review: **SOURCE_MATCH true**. Independent Claude session `56e3d04c-f22c-4c05-8b21-d9d9db53108f`, **claude-opus-5-5 / High**, returned final **CLEAN for the scoped PARTIAL PR** on these hashes. Prior broad/contract/test-plan PASS evidence remains historical for unchanged inputs, not newly rerun. No full-card acceptance is claimed.

```sh
npm run test:permissions
npm run test:authorization
node --import tsx --test tests/permissions/delivery-parity.test.ts
npx playwright test tests/browser/delivery-access-parity.spec.ts
```

Also run common runtime gates from rollout: typecheck/lint/build/contract/test-plan and relevant full regression; build before browser tests using a disposable fixture and free port. Real PostgreSQL results must report nonzero executed tests (SKIP is not PASS). SQLite/browser mocks cannot close PG/production/UAT.

## Questions
No new business decision invented. Actual external scope blockers: plain P-04 managers cannot reach Trash through navigation/App (both outside allowed_paths); P-03 manager directory access is denied by existing service; invisible owner-team archive state is absent from existing DTOs. See evidence for implemented fallback, explicit browser fixme and remaining gates. Full acceptance remains open.

## Evidence / Review
See [DEL-ACCESS evidence](../../docs/product/evidence/DEL-ACCESS.md). Independent Claude specification/code/security review **PERFORMED → CHANGES_REQUIRED → conditional CLEAN → final CLEAN for the scoped PARTIAL PR** after same-author corrections and final host affected PASS. The final read-only reviewer confirmed denial lifecycle, actual DELETE/PATCH404/project200/other-task200 race assertions and unchanged legacy tests; no substantive blocker or weakened assertion was found. Nonblocking generic-notice persistence and Dismiss UX follow-ups are retained in evidence, not silently expanded. F1–F5 archive/privacy/dependency/epoch corrections and conservative baseline archive restrictions remain. Parent rollout gate 7 **SATISFIED**: parent inspected the complete runtime/ticket diff, final independent review result, whitespace check and exact seven-path status, and approved only the scoped PARTIAL commit/push/PR, not full-card DONE. Host preserved generated report PNGs outside checkout and restored only those PNGs; seven-path source scope is clean. Authorized commit/push/partial PR/CI must follow parent review with exact-head readback; **no merge**. Keep **in_progress**, all three scope blockers open; PostgreSQL/production/UAT NOT_RUN; official register **9/96 completed, 87 remaining**.
