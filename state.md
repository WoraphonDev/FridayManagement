# Project State

**อัปเดต:** 2026-11-24 · **Standard:** PROJECT_TEMPLATE 1.0 · **Business baseline:** 1.1

| รายการ | ค่า |
|---|---|
| Task Register | `TeamFlow_Task_v1.0.md` — DONE 9/96 · IN_PROGRESS 84 · IN_REVIEW 1 (T-078) · TODO 2 · remaining 87 |
| Delivery backlog | `tickets/delivery/` — merged: DEL-SPEC, UX1, UX2, UX3, ACCESS (partial, PR6), ACCESS-NAV (PR10), ACCESS-DIRECTORY (PR13) |
| Platform | ADR-0001: PostgreSQL + Linux/Docker production baseline; Windows-native staging source merged, native Windows acceptance NOT_RUN |
| Security | `docs/07-security.md` 1.0 APPROVED; OWASP (T-093) / Pen-Test (T-094) NOT_RUN |
| Open questions | 0 in `Questions.md`; Q-DAF-PARENT-01/02 answered 2026-11-24 (recommended options) |

## Owner decisions — 2026-11-24

- Q-DAF-PARENT-01: accept actor-scoped capability booleans + generic unavailable (no raw hidden team state).
- Q-DAF-PARENT-02: required `can_restore` (Trash row) / `can_unarchive` (Project); missing/null = unknown disabled; coordinated server+client contract release.
- Developer Workspace (BFC study): deferred until F01–F17 delivery features are stable.
- Process: one card = one PR (adoption + implementation together, no docs-only adoption PRs); medium effort by default, high only for security-sensitive cards.

## Next (in order)

1. DEL-ACCESS-PARENT-STATE → close DEL-ACCESS → DEL-VALIDATION
2. Windows Server staging native acceptance (runbook: `docs/operations/Windows_Staging_Runbook.md`)
3. T-091 regression + UAT → T-093 OWASP → T-094 Pen-Test → T-096 real server; then close register tasks with evidence
4. F01–F17 delivery features: DEL-CONTRACT → PROJECT → TASK → BASELINE → LIFECYCLE → HEALTH → MILESTONE → RISK → EFFORT → DEPENDENCY

## Pending owner input

- Draft PR #16 (UI-only delivery field preview + 1200px task drawer, 2026-11-04): ship to UAT before DEL-PROJECT/DEL-TASK API or hold.
- UAT environment details (location/URL) for T-091 UAT evidence.

## Blockers

- Native Windows / real server / UAT evidence must be produced on the real environment.
