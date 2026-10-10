# ติดตั้ง FridayManagement บน Linux + Docker (PostgreSQL 17)

ตาม [ADR-0001](adr/ADR-0001-postgresql-linux-docker.md) · แทนคู่มือ Windows/SQL Server เดิม · ซ้อมจริงบนเครื่อง dev แล้ว 2026-10-11 (ดูหัวข้อ "ผลซ้อม")

> แอปตั้งใจปฏิเสธ `NODE_ENV=production` จนกว่า release gate (T-091–T-094) ผ่าน ชุดนี้จึงรัน `NODE_ENV=test` หลัง HTTPS จริง สำหรับซ้อม/UAT — อย่าเอา guard ออกเอง

## 1. เตรียมเครื่อง
- Linux x86_64/arm64 ที่มี Docker Engine + Docker Compose v2, DNS ชี้ชื่อโดเมนมาที่เครื่อง
- Firewall เปิดเฉพาะ 443 (และ 80 สำหรับ redirect/ออกใบรับรอง); PostgreSQL และแอปไม่เปิดออกนอก Docker network
- เข้ารหัสดิสก์ที่เก็บ Docker volumes และโฟลเดอร์ backup (เช่น LUKS) ตาม Q-T-092-1

## 2. ตั้งค่า
```bash
git clone <repo> friday && cd friday/deploy
cp .env.example .env && chmod 600 .env
```
แก้ `.env`: `FRIDAY_HOST` (โดเมนจริง), `FRIDAY_TLS` (อีเมลสำหรับ Let's Encrypt), `DB_PASSWORD` (สุ่มยาว ≥32 ตัว เช่น `openssl rand -hex 24`) — ห้าม commit ไฟล์นี้

## 3. Build, migrate, เปิดระบบ
```bash
docker compose build app
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app proxy
docker compose ps
```
ครั้งแรก: ดู setup token แบบส่วนตัวด้วย `docker compose logs app | grep "setup token"` แล้วเปิด `https://<FRIDAY_HOST>` เพื่อสร้าง Admin คนแรก (token ใช้ได้ครั้งเดียว ห้ามเก็บลงหลักฐาน)

## 4. Backup (รายวัน)
```bash
mkdir -p backups && docker compose run --rm --user root --entrypoint sh ops -c "chown node:node /backups && chmod 700 /backups"
docker compose run --rm ops backup /backups/snap-$(date +%Y%m%d%H%M%S) --confirm-local-maintenance
docker compose run --rm ops verify /backups/<snapshot> --confirm-local-maintenance
```
ตั้ง cron ของเครื่อง (เช่น 02:00 ทุกวัน) เรียกคำสั่ง backup; เก็บ 7 daily + 4 weekly และคัดลอก `deploy/backups/` ไปอีก disk/location — snapshot = `database.dump` (pg_dump) + `attachments/` + `manifest.json` (SHA-256)

## 5. Restore (ลงฐานว่างแยกเสมอ ไม่ทับระบบที่ใช้อยู่)
```bash
set -a; . ./.env; set +a
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE DATABASE friday_restore"
docker compose run --rm --user root --entrypoint sh ops -c "install -d -o node -g node -m 700 /backups/restore-data"
docker compose run --rm -e DB_NAME=friday_restore -e DATA_DIR=/backups/restore-data \
  -e FRIDAY_RESTORE_SOURCE=/backups/<snapshot> ops restore-postgres /backups/restore-data --confirm-local-maintenance
```
Restore ตรวจ ledger ของ migration และ checksum ไฟล์แนบ, ล้าง session/idempotency ให้ทุกคน login ใหม่ การสลับไปใช้ฐานที่กู้คืน (เปลี่ยน `DB_NAME`/volume แล้ว `up -d`) เป็นขั้นตอนที่ผู้ดูแลตัดสินใจเอง วัด RPO/RTO จริงทุกครั้งที่ซ้อม

## 6. อัปเกรดเวอร์ชัน
backup ก่อน → `git pull` → `docker compose build app` → `docker compose run --rm migrate` → `docker compose up -d app` → ตรวจ `/health/live` และ login; ถ้าพัง ให้ restore snapshot ก่อนอัปเกรดตามข้อ 5

## ผลซ้อม 2026-10-11 (macOS + colima, ไม่ใช่ server จริง)
| ขั้น | ผล |
|---|---|
| build image / migrate 0000–0015 / up | PASS (db, app healthy) |
| HTTPS ผ่าน Caddy (`tls internal`, port 8443) | PASS — CSP, nosniff, X-Frame-Options, Permissions-Policy, COOP, CORP, HSTS ครบ; HTTP → HTTPS 308 |
| setup → login → ทีม/โปรเจกต์/งานภาษาไทย → แนบไฟล์ → Kanban | PASS |
| backup + verify | PASS (2 ไฟล์: dump + attachment) |
| restore ลงฐานว่าง + เทียบข้อมูล | PASS (users/projects/tasks/attachments/ledger ตรงกัน, sessions = 0, 243 ms) |
| เขียนข้อมูลหลัง backup | PASS (maintenance ปลดแล้ว) |

ยังไม่ได้ทำ: server Linux จริง + โดเมนจริง + Let's Encrypt, reboot/restart policy บนเครื่องจริง, cron backup จริง และ UAT กับผู้ใช้
