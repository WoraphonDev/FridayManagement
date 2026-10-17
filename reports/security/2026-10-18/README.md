# Pre-check security scans — 2026-10-18 (commit 1e48785)

Early automated scans to feed T-093. **They do not close T-093**: it depends on T-091, and still needs a ZAP authenticated scan on staging plus A01–A10 evidence with a reviewer. Declared effort High; actual model/effort NOT_VERIFIED (run by Claude Opus 5.5). Host: macOS arm64; scanners run as pinned Docker images with the repository mounted read-only.

| Scan | Result | Compared with previous record (docs/security/OWASP-1.0.md) |
|---|---|---|
| `npm audit --omit=dev` (`npm-audit-prod.json`) | 0 critical · 6 high · 55 moderate | Same 6 high (braces, micromatch, fast-glob, globby, stylelint, postcss, all via `@vibe/core` build/CSS tooling); moderate 56 → 55 |
| Gitleaks v8.21.2, git history, `--redact` (`gitleaks-history.json`) | 174 `generic-api-key` hits | Same 174 as before: SHA-256 file digests in `reports/*.json` and a test-fixture password in `tests/setup/security.test.ts`; no real secret, no new hits |
| Trivy 0.57.1 fs, vuln/misconfig/secret, HIGH+ (`trivy-fs.json`) | 3 HIGH in 2 packages | Unchanged: `braces` 3.0.3 CVE-2026-93687 (no fix), `postcss` 8.4.31 CVE-2026-45623/73646 (fix 8.5.12/8.5.18); no misconfiguration or secret findings (Dockerfile, compose included) |

## Open items for T-093

- The `postcss`/`braces` chain ships as a production dependency through `@vibe/core`. The fix (`@vibe/core@3.88.6`) is a semver-major upgrade and needs owner approval plus a UI regression run. The API server never executes these packages; the exposure is build-time only.
- `npm audit fix` (non-major) would update braces/micromatch/fast-glob/globby/stylelint. Not applied: dependency changes need a separate task and full regression.
- Still required for T-093: ZAP authenticated scan on a Linux/Docker PostgreSQL staging host (per ADR-0001) and the A01–A10 evidence table.
