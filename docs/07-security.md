# TeamFlow — Security Design (Threat Model / Controls / Verification)

**Version:** 1.0 · **วันที่:** 2026-10-10 · **Ticket:** T-092 · **Standard:** PROJECT_TEMPLATE 1.0 หมวด 5.0–5.5
**สถานะ:** APPROVED โดย owner 2026-10-10 (design เท่านั้น); ไม่มีผล scan/pentest ในเอกสารนี้

แหล่งข้อกำหนดหลัก (ห้ามขัดกัน): SRS §4 Permission Model, §6 Auth, §9.5 Attachments, §13 Security/Ops, §18 RD-01–RD-08; API Contract / `contracts/openapi.json`

## 1. ขอบเขตระบบและ Trust boundary

| ID | Boundary | ผ่านอะไร |
|---|---|---|
| TB-1 | Browser ↔ reverse proxy/HTTPS (IIS) | ผู้ใช้ภายในองค์กร ~30 คน; **เปิดจาก internet** (owner 2026-10-10, Q-T-092-1 B); HTTPS บังคับ + HSTS |
| TB-2 | Proxy ↔ Node.js API (loopback) | cookie session, CSRF, Origin |
| TB-3 | API ↔ SQL Server 2022 (local SQLite เฉพาะ dev) | service account, parameterized queries |
| TB-4 | API ↔ upload storage (filesystem) | storage_key แบบสุ่ม, นอก wwwroot |
| TB-5 | ผู้ดูแลเครื่อง ↔ CLI (admin recovery, purge, backup/restore) | สิทธิ์ OS เท่านั้น ไม่มี endpoint |

Assets: บัญชี/รหัสผ่าน hash, session token, ข้อมูลงาน/ความเห็น/ไฟล์ของโปรเจกต์, audit log, backup (.bak+uploads), `.env` secrets
ไม่อยู่ใน scope: email, AI, SSO, public registration, push เมื่อปิดเว็บ

## 2. Threat model (STRIDE)

| ID | ภัย | ตัวอย่าง | Control (อ้างอิง) | Verify |
|---|---|---|---|---|
| TH-01 S | ยึดบัญชีด้วย brute force/credential stuffing | ลองรหัสซ้ำ | rate limit 10/username, 30/IP ต่อ 15 นาที; ข้อความ fail เดียว; scrypt (SRS §6.2) | tests/sessions, tests/accounts; OWASP A07 |
| TH-02 S | ขโมย/ปลอม session | XSS อ่าน cookie, fixation | token ≥256-bit เก็บ hash; HttpOnly/SameSite=Strict/Secure; rotate เมื่อเปลี่ยนรหัส (§6.2) | tests/sessions; A07 |
| TH-03 T | CSRF เปลี่ยนข้อมูล | form ข้ามโดเมน | CSRF token + trusted Origin, ไม่เชื่อ X-Forwarded-Host (§13.1) | tests/api; A01 |
| TH-04 E | IDOR/ข้ามสิทธิ์โปรเจกต์ | เปลี่ยน id ใน URL/API | effective permission ทุก request จาก DB (§4.1–4.2) | tests/permissions, tests/authorization; A01 |
| TH-05 E | ยกระดับเป็น Admin / ลด Admin คนสุดท้าย | role change race | transaction guard last-admin (§6.3) | tests/accounts; A01 |
| TH-06 T | SQL injection | filter/search | parameterized + field allowlist (§13.1) | tests/api + ZAP; A03 |
| TH-07 T | Stored XSS | comment/doc/ชื่องาน | escape text, ไม่มี arbitrary HTML, CSP ไม่มี inline/unsafe-eval (§13.1) | browser tests + ZAP; A03 |
| TH-08 T | อัปโหลดไฟล์อันตราย/path traversal | .html/.svg, `../` | allowlist+magic, storage_key สุ่ม, attachment+nosniff (§9.5) | tests/files; A04/A05 |
| TH-09 D | DoS ด้วย upload/request ใหญ่ | ไฟล์เกิน, quota | 10 MiB/ไฟล์, 5 GiB quota, size/timeout limit (§9.5, §13.1) | tests/files; A04 |
| TH-10 I | ข้อมูลรั่วผ่าน error/log | stack trace, password ใน log | requestId + redaction (§13.1) | tests/operations; A09 |
| TH-11 I | CSV formula injection ใน export | `=HYPERLINK(...)` | `csvCell` prefix `'` ให้ `= + - @ \t \r` (src/services/reports.ts) | tests/notifications 23/23 PASS 2026-10-10 (SQLite); A03 |
| TH-12 I | Backup/secrets รั่ว | .bak, .env ใน ZIP/repo | ZIP ไม่รวม secrets; ACL backup path (§13.4–13.5); Gitleaks | T-093; A02/A05 |
| TH-13 R | ปฏิเสธการกระทำ | แก้/ลบงานแล้วอ้างว่าไม่ได้ทำ | audit atomic ใน transaction เดียว (§13.2) | tests/tasks; A09 |
| TH-14 T | Supply chain | dependency มีช่องโหว่ | pin versions, license inventory, `npm audit`/Trivy | T-093; A06/A08 |
| TH-15 E | Setup token ซ้ำ/แย่ง first-run | race ตอน setup | token console-only, transaction no-users, 409 หลังสำเร็จ (§6.1) | tests/setup; A07 |

## 3. Control applicability (หมวด 5.1–5.5)

| Control | ใช้/N/A | เหตุผล / ผู้ตัดสิน |
|---|---|---|
| MFA | N/A ใน v1 — **risk accepted** | Owner 2026-10-10 (Q-T-092-2 A) ทั้งที่เปิด internet; ชดเชยด้วย rate limit, password policy, session TTL; ทบทวนหลัง pentest |
| SSO | N/A | นอก scope ตาม requirement |
| Self-service password reset / email | N/A | ไม่มี email; Admin reset (D-11) |
| Malware scanning | N/A (ไม่บังคับ) | D-08: allowlist ไม่ใช่ antivirus; scanner เป็น integration แยก |
| External URL fetch (SSRF) | N/A | ไม่มี feature ดึง URL ภายนอก — reviewer: [กรอก] |
| HSTS + TLS | **บังคับ** | เปิด internet (Q-T-092-1 B); TLS 1.2+ ที่ proxy, redirect HTTP→HTTPS |
| Encryption at rest | ใช้ BitLocker | data + backup disk; ยืนยันตอนติดตั้ง Windows |
| Edge protection | ใช้ | firewall เปิดเฉพาะ 443; DB/API ไม่เปิดออก internet; rate limit ระดับ proxy เพิ่มจาก app |

## 4. Verification mapping

ผล OWASP ราย release: `docs/security/OWASP-<release>.md` (T-093) · Pen-Test: `docs/security/PENTEST-<release>.md` (T-094)
ทุกแถว TH ต้องมีผล PASS/FAIL/NOT_RUN จริงก่อน release; เอกสารนี้ไม่ใช่หลักฐานว่าผ่าน
