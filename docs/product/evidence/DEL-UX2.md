# DEL-UX2 execution evidence

Status: adopted / in_progress by explicit user “ทำเลย” sequential continuation. Declared High; runtime effort NOT_VERIFIED. Base `68052e201430c6c1656f6239abda217cf828fe74`; isolated worktree `FridayManagement-del-ux2`. No commit/push/deploy. Official Task Register unchanged.

## Checkpoint 1–2

Synthetic `projectFixture`; SQLite local application, Chromium, Node 22.23.3/npm 10.9.9. No real credentials/data. Dependencies installed with `npm ci --ignore-scripts --no-audit --no-fund` (exit 0; no dependency/lock changes).

Scratch logs: `/Users/mickitang/.hermes/profiles/friday/cache/scratch/del-ux2/`.

- Baseline `npm run build`: exit 0 (`build-base.log`).
- RED entity: `FRIDAY_TEST_PORT=43281 TMPDIR=…/del-ux2 npx playwright test tests/browser/delivery-drafts.spec.ts --reporter=line`: exit 1, 1 failed; missing Stay confirmation after dirty Escape (`red-entity.log`).
- GREEN entity: build exit 0, same test exit 0, 1 passed (`green-entity.log`).
- RED group: same browser command with `-g 'group dirty'`: exit 1, 1 failed; missing dirty-close confirmation (`red-group.log`).
- GREEN group: build exit 0, focused file exit 0, 2 passed (`green-group.log`).

## Checkpoint 3–11

Each slice ran `npm run build` (exit 0), then `FRIDAY_TEST_PORT=43281 TMPDIR=…/del-ux2 npx playwright test tests/browser/delivery-drafts.spec.ts -g '<filter>' --reporter=line` (RED exit 1, GREEN exit 0). Logs preserve the full commands/outcomes:

| Slice / filter | RED | GREEN | Behavior |
|---|---|---|---|
| permission draft | 1 failed | 3 passed (whole file) | local tab Stay/Discard |
| group lost | 1 failed | 1 passed | server commits, response dropped; identical key/body replay, one stored group; error survives poll |
| entity 409 | 1 failed | 1 passed | draft retained; compare latest; another version invalidates review without overwrite |
| membership 409 | 1 failed | 1 passed | intended person/role survive conflict, explicit latest review |
| membership dirty | 1 failed | 1 passed | dirty close Stay; denied mutation clears person/draft; request ID remains |
| permission conflict | 1 failed | 1 passed | reload preserves proposed keys, compares latest, newer version invalidates review |
| entity create lost | 1 failed | 1 passed | freeze unknown create; identical key/body replay; exactly one project |
| permission lost | 1 failed | 1 passed | unknown not success; reconcile non-keyed versioned PUT by read, no second write; denied read purges private matrix |
| group conflict | 1 failed | 1 passed | group name/color compare; newer version invalidates review |

A first permission-selector probe timed out due to wrong accessible name; corrected against source, then genuine missing-confirmation RED was rerun before implementation. This setup error is not counted as behavior RED.

## Checkpoint 12–19 / final verification

Further genuine RED exit 1 → minimal GREEN exit 0 (one focused case each unless noted):

- `red-jobtitle.log` → `green-jobtitle.log`: job-title dirty dismissal and create lost-ack identical replay.
- `red-member-ack.log` → `green-member-ack-b.log`: member transient read failure must retain draft; read reconciliation distinguishes lost ack from success. Initial GREEN attempt (`green-member-ack.log`) failed because recovery disappeared during automatic refresh; recovery remains persistently available after correction.
- `red-title-conflict.log` → `green-title-conflict.log`: job-title latest comparison and newer-version invalidation.
- `red-denied.log` → `green-denied.log`: denied entity/group mutation clears private draft, exposes denial rather than keeping editable private fields.
- `red-review-before-read.log` → final focused GREEN: unknown matrix cannot approve stale cached permissions before a fresh read.
- `red-edit-group-ack.log` → `green-edit-group-ack.log`: reviewed group edit replay must retain original key/body/version after commit + dropped ack; skip only new preflight on exact locked replay.
- `red-nested-team.log` → `green-nested-team.log`: review Cancel returns intact team-member editor; error/reload stays inside top modal. First locator probe corrected to real accessible position name before genuine RED.
- `red-member-newer.log` → `green-member-newer.log`: background membership version change invalidates existing approval. A fixture attempt to appoint manager without required P-keys correctly received 422; changed fixture to authorized removal, without changing grants/policy, then genuine checked-review RED reproduced.

All targeted invocations use the prefix below, changing only `-g` filters shown in the checkpoint rows:

```sh
FRIDAY_TEST_PORT=43281 TMPDIR=/Users/mickitang/.hermes/profiles/friday/cache/scratch/del-ux2 npx playwright test tests/browser/delivery-drafts.spec.ts --reporter=line
```

Harness creates disposable synthetic app/database fixtures under approved scratch; no real credentials/data. Base comparison explicitly verified port 43281 free before binding. Browser snapshots are not production/UAT evidence.

| Final gate | Actual result / log |
|---|---|
| `npm run build` | PASS exit 0, `build-verified.log` |
| `npm run typecheck` | PASS exit 0, `typecheck-verified.log` |
| `npm run lint` | PASS exit 0, `lint-verified.log` |
| `npm run check:contract` | PASS exit 0, `check-contract.log` |
| `npm run test:contract` | PASS exit 0, 66 passed / 0 failed / 0 skipped, `test-contract.log` |
| `npm run check:test-plan` | PASS exit 0, `check-plan.log` |
| `npm run test:test-plan` | PASS exit 0, 18 passed / 0 failed / 0 skipped, `test-plan.log` |
| `npm test` | PASS exit 0; Node TAP 492 tests / 491 passed / 1 skipped, plus Vitest 50 passed (13 files); combined 542 tests / 541 passed / 0 failed / 1 skipped. `npm-test-verified.log`. Skip is opt-in isolated PG17 Docker bootstrap/backup/restore: NOT_RUN, not PASS. |
| `npm run test:frontend` (standalone and actual npm-test subcommand) | PASS exit 0, 50 tests / 13 files, `frontend-verified.log` |
| focused card browser command above | PASS exit 0, **21 passed / 0 failed**, `focused-verified.log` |
| screenshot-only follow-up `-g 'entity backdrop'` with `DEL_UX2_EVIDENCE=…/del-ux2` | PASS exit 0, **4 passed**, `photos-verified.log`; screenshot test now waits for dialog entry animation. No production source changes after final gates. |
| relevant browser regression below | FAIL exit 1, **32 passed / 2 failed**, `browser-regression-verified.log` (same failures on earlier regression run) |
| `git diff --check` | PASS exit 0; restored only 27 own generated UI report PNGs, initially clean checkout. |

Exact relevant browser regression:

```sh
FRIDAY_TEST_PORT=43281 TMPDIR=/Users/mickitang/.hermes/profiles/friday/cache/scratch/del-ux2 npx playwright test tests/browser/delivery-focus-mobile.spec.ts tests/browser/workspaces.spec.ts tests/browser/permission-matrix.spec.ts tests/browser/task-workspace.spec.ts tests/browser/task-workspace-permissions.spec.ts tests/browser/task-history-group-order.spec.ts tests/browser/cell-pickers.spec.ts tests/browser/management-visual.spec.ts tests/browser/teams-visual.spec.ts --reporter=line
```

### Explicit regression disposition / scope blocker

1. **Introduced acceptance mismatch, parent scope decision required:** `tests/browser/permission-matrix.spec.ts:158` expects Reload matrix to replace pending user keys with latest P-10 (discard draft). DEL-UX2 requires keeping the proposed draft while comparing latest. New focused test verifies both preserved P-01 and latest P-10 comparison; no merging of grants, automatic overwrite or permission change. Old assertion remains unmodified because its file is outside allowed paths. Parent can authorize a narrowly scoped acceptance-test update; this is **not full browser green**.
2. **Pre-existing Calendar:** `tests/browser/task-workspace.spec.ts:172` Next month expected 0 / received 3. Reproduced on exact base `68052e2`, not fixed outside scope. `baseline-regression.log`: 1 passed (old permission test), 1 failed (Calendar), exit 1.

Baseline procedure: `python /Users/mickitang/.hermes/profiles/friday/cache/scratch/del-ux2/baseline_probe.py` archived base into scratch, built it (exit 0), temporarily served its compiled frontend from this non-hidden checkout with disposable application fixtures, ran the two original tests via `--grep 'T046 actual|T082 vertical'`, then restored final frontend in `finally`. Compiled frontend tree SHA-256 before/after restore matched `f11f7a91c8a8ff141c18da695a2512716b021bc67f0edbbfb4b7c73ba966d60d` (before subsequent scoped source rebuilds).

### Photos inspected

Actual synthetic screenshots in scratch: `draft-360.png`, `draft-390.png`, `draft-768.png`, `draft-1440.png` and `discard-360.png`, `discard-390.png`, `discard-768.png`, `discard-1440.png`. Visually inspected draft390/1440 and settled confirmation390/1440: Thai draft visible, Stay and explicit red Discard readable, parent retained underneath, no panel clipping/overflow. Focus is asserted by browser, not inferred from a screenshot. First confirmation captures showed only backdrop during entry animation; recaptured after animation completed and re-inspected.

## Parent correction checkpoint — supersedes earlier handoff blockers

- Narrow scope amendment added `tests/browser/permission-matrix.spec.ts` to the card. Updated legacy Reload assertions now prove P-08/P-09 draft remains separate from latest P-10, Save stays disabled pending review, and direct server read remains P-10. This is not permission union or a weakened assertion.
- Independent review found a P1 denial-read cleanup gap: group conflict → Load latest 403/404 could retain private draft. Added two regression cases; RED occurred before production fix. Latest-read denial now clears group dialog/name/color/editing/latest/intent and cached group/member data immediately.
- A 403 also triggers parent security refresh that removes the project workspace. Workspaces now retains only the non-private denial message/request ID in a persistent dismissible notice; it does not retain draft or object names.
- Parent rebuilt and reran `npm run typecheck`, `npm run lint`: PASS. `delivery-drafts.spec.ts` (23) plus legacy `permission-matrix.spec.ts` (1): **24/24 PASS** on final corrected source. The earlier 21-test/32+2 regression results above are historical checkpoints, not final all-browser results. Calendar baseline failure remains disclosed; the full regression set has not been rerun after these narrow corrections.
- Independent narrow re-review APPROVE: prior P1 resolved, no remaining blocker. Parent final targeted run **24/24 PASS**, typecheck/lint/build PASS; full `npm test` results above precede the narrow parent correction. Source is ready for PR review, not merged or deployed. Allowed changed paths now 9; generated permission report images restored only because they were clean before the parent test.

### Handoff

Implementation stays **in_progress / independent review pending**, not DONE. Repo diff restricted to the 8 allowed paths actually used; no Docs editor/UX3, dependency/lock, domain/API, permission policy, AGENTS, production guard, server/VPS, commit/push/merge changes. Full unselected browser suite, Firefox/WebKit, real PostgreSQL/Linux/Docker, production and human UAT **NOT_RUN**. Official Task Register untouched (recorded baseline DONE 9 / total 96 / remaining 87); delivery-card results do not close official tasks. Parent must review security/code and resolve the precise legacy-test scope blocker before sign-off.
