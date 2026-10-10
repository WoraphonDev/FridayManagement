# TeamFlow — OWASP Top 10 (2021) Checklist — Release 1.0 candidate

**Ticket:** T-093 · **Build/commit:** [กรอกเมื่อรัน] · **ผู้ตรวจ:** [กรอก] · **สถานะรวม:** NOT_RUN

ผลทุกข้อเริ่มเป็น NOT_RUN; เปลี่ยนเฉพาะเมื่อมีหลักฐานจริงบน build ที่จะส่งมอบ (SQLite ไม่ปิดเกณฑ์ SQL Server)

| ID | หมวด | Threat (07-security) | วิธีตรวจ | หลักฐาน | ผล |
|---|---|---|---|---|---|
| A01 | Broken Access Control | TH-03, TH-04, TH-05 | permission matrix tests ทุก role × operation, IDOR บน task/file/report, CSRF negative | | NOT_RUN |
| A02 | Cryptographic Failures | TH-02, TH-12 | ตรวจ scrypt params, cookie flags บน HTTPS, TLS ของ proxy, backup ACL | | NOT_RUN |
| A03 | Injection | TH-06, TH-07, TH-11 | ZAP active scan, payload SQLi/XSS ใน field ข้อความ, CSV formula (unit test มีแล้ว — ต้องรันบน release build) | | NOT_RUN |
| A04 | Insecure Design | TH-08, TH-09 | review business rules (last admin, archived write, quota race) | | NOT_RUN |
| A05 | Security Misconfiguration | TH-08, TH-12 | headers (CSP, nosniff, frame-ancestors), ไม่มี debug/stack trace, IIS config | | NOT_RUN |
| A06 | Vulnerable Components | TH-14 | `npm audit --omit=dev`, Trivy fs | | NOT_RUN |
| A07 | Identification & Auth Failures | TH-01, TH-02, TH-15 | rate limit, session idle/absolute, must_change_password, setup token | | NOT_RUN |
| A08 | Software & Data Integrity | TH-14 | lockfile integrity, migration checksum, release ZIP ไม่มี secrets | | NOT_RUN |
| A09 | Logging & Monitoring Failures | TH-10, TH-13 | audit atomic, redaction, requestId | | NOT_RUN |
| A10 | SSRF | — | ยืนยันว่าไม่มี server-side URL fetch (N/A ต้องมี reviewer) | | NOT_RUN |

Findings: ลงในตารางด้านล่างพร้อม severity / owner / remediation ticket / retest

| Finding | Severity | OWASP | รายละเอียด | Ticket | Retest |
|---|---|---|---|---|---|

## Pre-scan 2026-10-10 (ล่วงหน้า — ไม่ปิด T-093 เพราะ T-091 ยังไม่ปิด; build = working tree ยังไม่ commit)

| ตรวจ | ผล | หมายเหตุ |
|---|---|---|
| `npm audit --omit=dev` | 0 critical · 6 high · 56 moderate | high ทั้งหมดอยู่ในสาย build/CSS tooling (braces, micromatch, fast-glob, globby, stylelint, postcss ผ่าน `@vibe/core`); moderate รวม `mssql`/`tedious` ผ่าน `sprintf-js` — "fix" ที่ npm เสนอเป็นการ downgrade major ใช้ไม่ได้; ต้องประเมิน reachability ใน T-093 ไม่ upgrade เองนอก T-003/T-005 |
| Security headers (local build) | PASS | CSP ไม่มี inline/unsafe-eval, nosniff, X-Frame-Options DENY + frame-ancestors none, Referrer-Policy same-origin, Cache-Control no-store; ไม่มี X-Powered-By. HSTS ต้องตั้งที่ proxy (internet exposure) |
| Origin/CSRF ที่ `/api/login` | PASS | cross-origin และไม่มี Origin → 403 INVALID_ORIGIN |
| Error disclosure | PASS | 400/401/404 คืน code + ข้อความกลาง + requestId; ไม่มี stack/path; path traversal `/api/../../etc/passwd` → 404 |
| Login failure message | PASS | INVALID_CREDENTIALS ข้อความเดียว |
| Gitleaks v8.21.2 (git history + src/frontend/tests/scripts/migrations/docs/contracts) | PASS (no real secret) | 174 history hits = SHA-256 file digests ใน reports/*.json + fixture password ที่ตั้งใจใน tests/setup/security.test.ts — false positive ทั้งหมด; `reports/security/gitleaks-history.json` |
| Trivy 0.57.1 fs (vuln/misconfig/secret, HIGH+) | 2 packages HIGH | `braces` 3.0.3 (CVE-2026-93687, no fix), `postcss` 8.4.31 (CVE-2026-45623/73646, fix 8.5.18) — build tooling; ไม่มี misconfig/secret; `reports/security/trivy-fs.json` |
| ZAP 2.15.0 baseline (local test build, fresh SQLite) | 0 FAIL · 62 PASS · 5 WARN | WARN: Permissions-Policy ไม่ได้ตั้ง (F-01), suspicious comments ใน bundle, non-storable content (ตั้งใจ no-store), modern web app, ZAP out of date; `reports/security/zap-baseline.*` |
| ZAP API active scan (OpenAPI, unauth) | 0 FAIL · 112 PASS | ครั้งแรก server ยังไม่ migrate (503 ทั้งหมด) → รันใหม่หลัง migrate |
| ZAP API active scan (OpenAPI, Admin session + CSRF + Origin) | 0 FAIL · 111 PASS · 3 WARN | ~30k requests, **ไม่มี 5xx**; session ถูก revoke ระหว่าง scan (logout/password routes) → authenticated coverage จำกัด (2xx 31 ครั้ง); WARN Spectre site isolation (COOP/COEP) (F-02); `reports/security/zap-api-summary.json` (raw HTML/JSON ~35MB ไม่เก็บใน repo) |

### Findings (pre-scan)
| ID | Severity | OWASP | รายละเอียด | ข้อเสนอ |
|---|---|---|---|---|
| F-01 | Low | A05 | ไม่มี `Permissions-Policy` header | **FIXED 2026-10-10** `src/api/app.ts` + test `tests/api/http.test.ts` (15/15) + SRS §13.1; Chromium 88/88 PASS — retest ZAP ใน T-093 |
| F-02 | Low | A05 | ไม่มี COOP/CORP (Spectre isolation) | **FIXED 2026-10-10** COOP/CORP same-origin (COEP ไม่เพิ่ม: อาจบล็อก blob/PWA) — retest ใน T-093 |
| F-03 | Low (re-rated) | A06 | postcss/braces HIGH ใน dependency tree | **ASSESSED 2026-10-10 → Low, not reachable**: path `@vibe/core@4.5.34 → @vibe/style@4.1.0 → postcss@8.4.31 / stylelint@14.16.1 → micromatch → braces@3.0.3`; ไม่มี import ใน src/frontend และ `dist/` ไม่มีโค้ดของแพ็กเกจเหล่านี้ (มีแค่ CSS comment) → ไม่ถูกเรียกตอน runtime; ติดตามอัปเกรดเมื่อ @vibe ออกรุ่นใหม่ผ่าน T-003/T-005 (ไม่ override เอง) |
| F-04 | Info | — | ZAP authenticated coverage จำกัดเพราะ session ถูก revoke | T-094: exclude logout/password/session routes และใช้ role accounts ครบ |
