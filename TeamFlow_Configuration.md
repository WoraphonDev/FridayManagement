# FridayManagement — Configuration/startup contract

วันที่: 6 ตุลาคม 2026 · T-006 · Baseline1.1/RD-01–RD-08 · Node22.23.3

SRS §3.2–3.3 เป็นต้นทาง; `src/config/config.ts` ตรวจรูปแบบและ `src/config/paths.ts` ตรวจ filesystem ก่อน HTTP เริ่มรับคำขอ `.env.example` ไม่ถูกโหลดอัตโนมัติ ENV key ที่ไม่เกี่ยวข้องกับแอปไม่ถูกนำมาใช้ ค่าของ provider ที่ไม่ได้เลือกไม่ถูกนำมาตรวจ/เชื่อมต่อ เช่น DB_* เมื่อเลือก SQLite ไม่มี fallback เงียบ

| Keys | Default / validation |
|---|---|
| NODE_ENV | development; development/test/production เท่านั้น |
| HOST / PORT | 127.0.0.1 / 3000; HOST เป็น IP เท่านั้น, PORT จำนวนเต็ม1–65535 |
| APP_ORIGIN | local default http://127.0.0.1:PORT; production ต้องระบุ HTTPS origin แบบ canonical ไม่มี path/trailing slash/credentials/query/hash; ไม่คำนวณจาก Host/X-Forwarded-Host |
| COOKIE_SECURE | ตาม HTTPS scheme; true/false แบบตรงตัว ต้องตรง APP_ORIGIN; production ต้อง true |
| DATA_DIR / LOG_DIR | บังคับ absolute writable paths นอก source/build/webroot; ไม่ใช้ filesystem root หรือ ancestor ของ source |
| DB_PROVIDER / SQLITE_DB_PATH | ต้องระบุ sqlite หรือ sqlserver; SQLite เฉพาะ development/test; DB absolute อยู่ภายใน DATA_DIR นอก uploads/temp/logs/source |
| DB_SERVER / DB_PORT | SQL IP หรือ DNS host ไม่มี scheme/instance/port; port default1433 ช่วง1–65535 |
| DB_NAME / DB_USER / DB_PASSWORD | SQL ต้องระบุทุกค่า; password ไม่ trim; ไม่ใช้ implicit integrated authentication |
| DB_ENCRYPT / DB_TRUST_SERVER_CERTIFICATE | true / false; production ห้ามลด TLS; development/test ยอมรับการตั้งค่า explicit เท่านั้น |
| DB_POOL_MAX | 10; จำนวนเต็ม1–100; dedicated SQL guard เพิ่มอีก1 connection แยกจาก query pool |
| DB_REQUEST_TIMEOUT_MS / DB_LOCK_TIMEOUT_MS | 15000 / 5000; จำนวนเต็ม1–2147483647; lock < request; transaction ตั้ง SET LOCK_TIMEOUT และ SET XACT_ABORT ON |
| DB_BACKUP_DIR | production SQL บังคับ path absolute ของ SQL host (POSIX/Windows drive/UNC); ไม่สร้างหรือ probe บนเครื่องแอป |
| MAX_FILE_BYTES / TOTAL_UPLOAD_BYTES | 10485760 / 5368709120; maxFile1–10485760, total positive safe integer และ ≥ maxFile |
| SESSION_ABSOLUTE_MIN / SESSION_IDLE_MIN | 720 / 60; ช่วง1–720 / 1–60 และ idle ≤ absolute |
| POLL_SECONDS / REMINDER_SECONDS | 5 / 60; ช่วง1–5 / 1–60; visible refresh รวม network latency ≤10s ยังต้องทดสอบ feature จริง |
| TRASH_RETENTION_DAYS / NOTIFICATION_RETENTION_DAYS | ตรง30 / 90 ตาม approved baseline; ไม่เปิดให้เปลี่ยน cutoff ผ่าน ENV |
| TRUSTED_PROXY | defaultว่าง=ไม่เชื่อ proxy; comma-separated exact IP เท่านั้น ไม่มีซ้ำ/empty/CIDR/wildcard/hostname/hop count |

ค่าจำนวนเต็มใช้เลขฐานสิบ canonical ไม่รับช่องว่าง, blank, leading zero, exponent, fractional, Infinity; booleans ไม่รับ1/0/yes ขอบเขตระยะเวลาที่ลดลงรักษา upper limits ของ baseline; configuration ไม่ใช่หลักฐานว่าฟีเจอร์ session/upload/jobs ทำงานแล้ว

Filesystem ใช้ canonical path รวม symlink/junction/ancestors ก่อนสร้าง directory; dangling symlink, existing DB hardlink, directory แทน DB และ source aliases ถูกปฏิเสธ ใช้ write probe แบบสุ่มและลบหลังตรวจ ไม่สร้าง SQLite DB จาก startup และไม่ตรวจ local existence ของ DB_BACKUP_DIR บน remote SQL host การควบคุม ACL/ผู้ที่เปลี่ยน filesystem พร้อมกันยังต้องพิสูจน์บน Windows ตาม RV-18

## Single instance และ failure behavior

ทุก startup ครอบครอง exclusive TCP guard บน loopback127.0.0.1 พอร์ต40000–59999 ตาม hash canonical DB identity; app port ต่างกันยังเปิด SQLite DB เดียวซ้ำไม่ได้ kernel คืน guard หลัง process ตาย ไม่มี stale PID file และไม่ฆ่า process ที่ครอบครองพอร์ต หาก hash ชนพอร์ตอื่น startup ล้มเหลวแบบ fail closed ไม่เลือกพอร์ตใหม่ ผู้ใช้ต้องตรวจ process/config ของตนเอง

SQL provider เพิ่ม dedicated Tedious session ที่ใช้ bound resource `FridayManagement:application-instance`, `sp_getapplock`, Session/Exclusive และ LockTimeout0; accept result0/1 เท่านั้น จึงกันคนละ host ที่ต่อ database เดียวกัน connection นี้ไม่เข้าสู่ pool/ไม่ reconnect อัตโนมัติ เมื่อ session หายต้องหยุด HTTP และคืน local guard close แบบตั้งใจไม่ถือเป็น failure ตาม [Microsoft sp_getapplock](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql?view=sql-server-ver16) และ [Tedious connection API](https://tediousjs.github.io/tedious/api-connection.html)

Config errors แสดง `CONFIGURATION_INVALID: KEY, KEY`; startup/connect/listen/guard errors เป็นรหัสคงที่ ไม่แสดง values/paths/password/driver error stack หรือ request headers SQL connect fail ไม่เปิด SQLite แทน migration/seed เป็น CLI explicit ไม่เปิด HTTP และไม่รันพร้อม live writes จน maintenance policy ใน tasks ถัดไปครบ

Parser รองรับ production profile เพื่อทดสอบ config แต่ bootstrap ปฏิเสธ production ด้วย FOUNDATION_NOT_PRODUCTION_READY จน schema/auth/business tasks พร้อม; live200/ready503 ของ local shell ไม่ใช่ production sign-off SQL2022 integration, Windows TLS/proxy/ACL/service และ AT-28 ยังคง NOT_RUN ดู [รายงาน T-006](TeamFlow_T006_Test_Report.md)
# Local health and operational logs (T-059)

`/health/live` is public and returns only `status`. `/health/ready` accepts direct loopback requests only, rejects forwarded requests without probing, and returns only `ok`/`not_ready` (503 with Retry-After5). Run readiness from the app host; do not publish this endpoint through the public reverse proxy. Production startup remains blocked by `FOUNDATION_NOT_PRODUCTION_READY`; local readiness is not release acceptance.

Local readiness requires an open database, a successful SELECT1, actual write/sync/remove probes in DATA_DIR/LOG_DIR, completed setup, a healthy log sink and a running process. A probe has a5second HTTP deadline. Missing schema/setup/storage or a closed DB stays not_ready. HTTP responses never expose DB paths/provider/version or diagnostic errors.

`LOG_DIR/application.jsonl` contains allowlisted timestamp/event/requestId/status/code only. Rotation is1MiB with5 older files; files are0600 on POSIX. No URL/query/header/body/password/token/upload bytes or raw error message/stack is logged. Match `requestId` with the response X-Request-Id and Admin-only `/api/audit` `request_id` when the operation produced an audit event. Failed transactions do not fabricate success audit rows. Log-write failures emit only `operational_log_failed` and make readiness fail. Windows ACL/SQL2022/proxy execution remains NOT_RUN.

PWA installation requires HTTPS or localhost. Use the browser install/add-to-home-screen menu when supported; ordinary browser access is always available. Cache Storage contains versioned public build assets and a generic offline page only. API/auth/files and private navigation HTML are network-only; no offline write queue exists. After reconnect, writes remain blocked until authenticated and mounted resource reads complete. Updates wait until all Friday windows close; they never force reload while editing. Physical installation and supported-browser matrix remain separate acceptance evidence.


## Operator backup/retention/restore/upgrade

ดู TeamFlow_Backup_Recovery.md สำหรับคำสั่ง `npm run ops -- ...`, stopped-instance guards, private snapshot manifest และ isolated restore. `FRIDAY_RESTORE_SOURCE`/`FRIDAY_SQL_MOVES_FILE` เป็น operator-only environment values ของ CLI ไม่ใช่ app/API settings. Persistent maintenance owner ไม่ clear ตาม expiry; ต้อง explicit offline recovery. Source SQL tooling ไม่แทนผล native SQL2022/Windows acceptance.


## SQL test readiness — 8 October 2026

Operator-only `RUN_SQLSERVER_TESTS=1` is not an app configuration key. `npm run check:sqlserver` requires test/sqlserver and an isolated ASCII database name ending `_test`, checks actual SQL2022/database identity and fixture permissions by SELECT only. It does not call preparePaths or modify server/schema/data; driver errors are redacted. Focused T-006/T-007 harness runs after preflight and with file concurrency1. See TeamFlow_SQLServer_Foundation_Runbook.md.
