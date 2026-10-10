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
