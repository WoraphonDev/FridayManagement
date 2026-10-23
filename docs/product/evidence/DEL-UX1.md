# DEL-UX1 — implementation evidence

## Identity / scope

- Branch: `fix/del-ux1-focus-mobile`; baseline `d5019229571ee9b9948cebd5e7ce77ed2df83894` plus uncommitted changes. Executed locally 2026-10-24, macOS, Node `v22.23.3`, npm `10.9.9`, Playwright default Chromium, disposable SQLite fixtures. Declared effort **Medium**; actual runtime effort **NOT_VERIFIED**.
- Implementation is ready for independent parent review, **not DONE**, committed, pushed, merged, deployed, or production accepted. Official register unchanged: **DONE 9 / total 96 / remaining 87**.
- Changes: shared dialog captures opener identity and restores the live same-section replacement after a close frame; deleted controls fall back to a visible section heading with `tabindex=-1`. Shared Form suppresses Enter during IME composition. Narrow `page-headers.css` overrides prevent wordmark/Notify wrapping at mobile widths.
- No API/domain/permission/production-guard, dependency/lockfile, protected AGENTS, server/VPS, or Task Register changes. Existing browser regression specs write tracked report PNGs; only those generated changes were restored to baseline after the run.

## RED → GREEN evidence

Local artifact root: `/Users/mickitang/.hermes/profiles/friday/cache/scratch/del-ux1/`. These are local scratch artifacts, not durable release evidence; retain/export them before scratch cleanup if needed. `run.py LABEL COMMAND...` assigns a free `FRIDAY_TEST_PORT`, a fresh external `FRIDAY_BROWSER_FIXTURE`, and approved scratch `TMPDIR`; records command/output and propagates exit status. Build succeeded before browser verification.

| Behavior | Real RED | Final GREEN |
|---|---|---|
| Save → rerender → Close | `red-focus.log`: live task opener inactive; original DOM button detached | `acceptance-verified-final.log`: original confirmed disconnected, version 2 acknowledged, live `Open task #1` focused and persisted title read back |
| Deleted opener | `red-delete.log`: visible project heading inactive | Final log: deletion 404, button absent, heading focused; still focused after the next actual task-list reader render |
| Mobile shell | `red-mobile.log`: 360px brand text at two Y positions `[4,24]`, Notify `[12,29]` | Final log: one line at 360/390/768/1440; document scroll width equals viewport |
| IME Enter | `red-ime.log`: unexpected task PATCH (1 rather than 0) | Final log: no write during composition; explicit Save writes once and reaches version 2 |

The interrupted 13/14 run's last failure was an **invalid refresh trigger**, not a normal polling focus bug: dispatching `online` invokes App's reconnect security gate (`setWritable(false)`), intentionally disables the still-connected title input, and Chromium blurs it. `focus-diagnostic.log` records connected=true, disabled=true, active BODY. No security behavior was changed. The test now waits for the real five-second background task GET; it retains the exact field node and additionally requires zero blur events plus focus after two rendering frames. Assertions were strengthened, not relaxed. Deletion logging was moved after the focused-heading assertion and the next reader render, eliminating the previous misleading pre-animation-frame BODY log.

## Commands / outcomes

All paths below refer to the artifact root above.

| Command | Result / log |
|---|---|
| `npx playwright test tests/browser/delivery-focus-mobile.spec.ts` via harness | **PASS 14/14**, exit 0, `acceptance-corrected.log`; repeated after restoring the final compiled frontend: **PASS 14/14**, exit 0, `acceptance-verified-final.log` (49.4s) |
| `npm run typecheck` | **PASS**, common-gates-complete.log |
| `npm run lint` | **PASS**, same log |
| `npm run build` | **PASS**, same log; final entry `index-Bf2FUz-o.js`, CSS `index-CIqV2dWP.css` |
| `npm run check:contract` / `npm run test:contract` | **PASS**, 66 contract tests, same log |
| `npm run check:test-plan` / `npm run test:test-plan` | **PASS**, 18 planning tests, same log; does not imply release PASS |
| `npm test` | **PASS command**, exit 0, full-regression-complete.log: Node TAP 491 passed / 0 failed / 1 skipped across 492; frontend Vitest 50 passed in 13 files. Skip is the opt-in disposable Docker PostgreSQL bootstrap/restore test, not a PostgreSQL PASS |
| Relevant browser regression: `npx playwright test tests/browser/tasks.spec.ts tests/browser/task-workspace.spec.ts tests/browser/cell-pickers.spec.ts tests/browser/side-panel.spec.ts tests/browser/shell.spec.ts tests/browser/project-docs.spec.ts tests/browser/permission-matrix.spec.ts tests/browser/header-member-followup.spec.ts` | **17 passed / 1 failed**, exit 1, browser-regression.log. Failure is existing T046 Calendar next-month event count at task-workspace.spec.ts:172 (expected 0, received 3), not concealed |
| Same T046 test against freshly built baseline HEAD frontend | **Same failure**, expected 0, received 3 at line 172; baseline-calendar-realpath.log. Baseline frontend built from `git archive HEAD` in scratch, then temporarily substituted only in ignored `dist/frontend` under the real worktree path; final compiled frontend restored in `finally`. No tracked source was reverted. An earlier scratch-path attempt failed before login due to static serving under the hidden scratch path (baseline-calendar.log); not counted as baseline behavior evidence |
| `git diff --check` | **PASS** |

The existing Calendar failure is outside allowed paths (`TaskWorkspace.tsx` / existing browser spec); left unchanged for a separate reviewed follow-up. Full browser suite, PostgreSQL integration, native Windows/Linux/Docker acceptance, physical IME/mobile-device interaction, true browser UI zoom, current/previous browser matrix and human UAT were **NOT_RUN**. The 200% test uses actual Chromium **CSS zoom=2**, explicitly not browser chrome zoom.

## Screenshot inspection

Inspected actual `acceptance-corrected-header-360.png`, `acceptance-corrected-form-360.png`, and `acceptance-corrected-zoom200.png` with image tools. At 360px the menu, brand, help, Notify/count and avatar fit on one row without clipped text; the Thai/long project context wraps, form fields and footer actions fit horizontally. The single-line title input naturally scrolls its long value internally; it is not a multiline title. At CSS 200% the dialog remains horizontally inside the viewport; content extends vertically and is scrollable. The browser geometry assertions also cover 390/720/768/1440 forms and internal table scroll at narrow widths. Final rerun emitted corresponding `acceptance-verified-final-*.png` artifacts.

## Source fingerprints (SHA-256)

```text
3443b99f0927108d39e21f099b2948fe83ba74293cb0103c0d0180e421f86b0d  frontend/src/page-headers.css
f29f0caca92b08bc68883dd35da6b003d3b808442778a7be673117e91e717a5f  frontend/src/shared/components.tsx
4cf57cebe5a9d1a3e88a89da72bfff6336f4c585e5df61550c96e3dc897a633b  frontend/src/shared/opener.ts
4f7830450add4c1f2f3bf07dd1b6d84b69532ba10ddc197d2a3d0e215bdf5b45  tests/browser/delivery-focus-mobile.spec.ts
```

## Review / limitations

Independent specification, code/security review and sign-off: **PENDING parent**. No official task completion or production release inference. Next action is parent review (declared Medium; actual runtime effort unverified), including assessment of the existing Calendar regression follow-up and wider browser support.
