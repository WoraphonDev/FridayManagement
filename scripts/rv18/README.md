# ชุดรัน RV-18 บน Linux + Docker (สำหรับเจ้าของระบบ)

RV-18 เป็นหลักฐานที่ต้องได้จากเครื่อง Linux จริง เพื่อปิด T-006, T-007, T-019, T-062–T-065 และ T-096 (TC-075/076/077/078/080/081 ตาม ADR-0001) ผลที่ได้จาก Mac หรือจากการซ้อมใช้ปิดเกณฑ์ไม่ได้

> **ต้องแก้ก่อนรันจริง:** ตอนนี้แอปเชื่อมฐานข้อมูลด้วย `POSTGRES_USER` ซึ่งเป็น superuser และเป็นเจ้าของทุกตาราง ถ้ารันตอนนี้ ข้อ `roles` จะ FAIL และ RV-18 จะไม่ผ่าน ต้องแยก role ของ runtime, migration และ backup ใน `deploy/` ก่อน (ดูหัวข้อ "ผลซ้อม" ด้านล่าง)

## สิ่งที่ต้องมี

- เครื่อง Linux ที่ **สะอาด** (ยังไม่เคยรัน stack `friday`) ติดตั้ง Docker Engine และ Docker Compose v2 แล้ว
- DNS ชี้โดเมนมาที่เครื่องนี้ และเปิดพอร์ต 80/443
- `git`, `curl`, `openssl` และ `crontab` (เครื่องไม่ต้องมี Node.js เพราะ harness รันใน container `node:22`)
- checkout commit ที่จะส่งมอบ โดยไม่มีไฟล์แก้ค้าง (`git status` ต้องว่าง)

## ขั้นตอน

1. **ตั้งค่า:** ทำตาม `docs/deploy-linux-docker.md` ข้อ 2 (สร้าง `deploy/.env` และตั้ง `FRIDAY_TLS` เป็นอีเมลจริงสำหรับ Let's Encrypt)

2. **รันชุดอัตโนมัติ** (ใช้เวลาประมาณ 5 นาที) จะ deploy แอป ตรวจสิทธิ์ แล้วรัน TC-075, 076, 077, 078 และตรวจว่าไม่มี recovery route สาธารณะ
   ```bash
   scripts/rv18/run-rv18.sh all
   ```
   ผลจะอยู่ใน `rv18-results/<เวลา>/` โดยมีไฟล์ `summary.tsv` เป็นสรุป

3. **ตั้ง cron สำหรับ backup** ตาม `docs/deploy-linux-docker.md` ข้อ 4 ตัวอย่าง:
   ```
   0 2 * * * cd /path/to/friday/deploy && docker compose run --rm -T ops backup /backups/snap-$(date +\%Y\%m\%d\%H\%M\%S) --confirm-local-maintenance >> /var/log/friday-backup.log 2>&1
   ```

4. **TC-081 กู้ Admin ผ่าน terminal** (ต้องพิมพ์รหัสผ่านเอง ระบบไม่รับรหัสผ่านผ่าน argument):
   ```bash
   cd deploy
   docker compose stop app
   ADMIN_ID=$(docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -Atc "select id from users where username='rv18.admin'")
   docker compose run --rm --entrypoint node ops dist/server/cli/main.js recover-admin \
     --user-id "$ADMIN_ID" --confirm-user rv18.admin --confirm-local-maintenance
   docker compose start app
   ```
   จากนั้นเปิด `https://<โดเมน>` แล้วล็อกอิน `rv18.admin` ด้วยรหัสผ่านใหม่ให้ได้ แล้วรัน:
   ```bash
   scripts/rv18/run-rv18.sh old-session   # session ของ Admin ที่สร้างไว้ก่อนกู้ ต้องถูกปฏิเสธ (401)
   ```

5. **TC-080 reboot เครื่อง** รอให้ cron ทำ backup อย่างน้อย 1 ครั้ง แล้ว `sudo reboot` เมื่อเครื่องกลับมาให้รัน:
   ```bash
   scripts/rv18/run-rv18.sh post-reboot   # ตรวจว่า container เปิดเองหลัง reboot, ข้อมูลยังอยู่, HSTS, ใบรับรองจาก Let's Encrypt, HTTP→HTTPS, cron และ backup อายุไม่เกิน 26 ชม.
   ```

6. **จับเวลากู้คืน (RPO/RTO) จริง:** บันทึกเวลาที่ backup ล่าสุดทำเสร็จ (RPO) และเวลาที่ใช้กู้คืนจนระบบกลับมาใช้งานได้ (RTO) ตามรอบการทำงานจริง เกณฑ์คือ RPO ≤ 24 ชม. และ RTO ≤ 4 ชม. ตัวเลขจากสคริปต์อย่างเดียวใช้ยืนยันเกณฑ์นี้ไม่ได้

7. **ล้างข้อมูลทดสอบ:**
   ```bash
   scripts/rv18/run-rv18.sh cleanup   # ลบฐาน restore, container ทดสอบ และไฟล์ harness-state.json ที่เก็บรหัสผ่านของ fixture
   ```

8. **ส่งผลกลับ:** ส่งโฟลเดอร์ `rv18-results/` ทั้งหมด (หลังทำข้อ 7 แล้ว) พร้อมชื่อผู้ทดสอบและวันที่ เพื่อนำไปบันทึกเป็น execution record และตรวจด้วย `check:test-plan`

## สิ่งที่สคริปต์ตรวจ

| รายการ | วิธีตรวจ |
|---|---|
| roles | role ที่แอปใช้ต้องไม่เป็น superuser, ต้องสร้าง DB/role ไม่ได้, ต้องไม่เป็นเจ้าของตาราง และต้องไม่มีสิทธิ์ CREATE ใน schema |
| app-backup-isolation / app-nonroot / restart-policy | container แอปต้องไม่ mount `/backups`, ต้องรันด้วย uid ที่ไม่ใช่ 0 โดย `/data` และ `/logs` เป็นสิทธิ์ 700 และทุก service ต้องตั้ง `unless-stopped` |
| TC-075 | หลัง restart แอปและทั้ง stack ชื่องานภาษาไทย ความคิดเห็น และไฟล์แนบ (เทียบ sha256) ต้องยังอยู่ครบ, Member ต้องได้ 403 เมื่อพยายามแก้ชื่อองค์กร และ `/health/live` ต้องไม่เผย path |
| TC-076 | backup ระหว่างมีคนเขียนข้อมูลต่อเนื่อง (ยอมรับได้เฉพาะ 503 ช่วง freeze), `verify` ต้องผ่าน, backup ลง tmpfs ขนาด 64 KiB ต้องจบด้วย exit ไม่เป็น 0 และหลังจากนั้นยังต้องเขียนข้อมูลได้ |
| TC-077 | restore ลงฐานแยก แล้วเปิดแอปชุดที่สองบนฐานนั้น ข้อมูลและไฟล์ต้องตรง และ session ที่มีอยู่ก่อน backup ต้องได้ 401 |
| TC-078 | รัน migrate ซ้ำแล้ว ledger ต้องไม่เปลี่ยน, สำเนาที่ไม่ได้แก้ต้อง migrate ผ่าน (ชุดควบคุม), สำเนาที่แก้ checksum ต้องถูกปฏิเสธ และข้อมูลต้องยังอยู่ ส่วน rollback ใช้การ restore snapshot ก่อนอัปเกรด (ตาม TC-077) |
| TC-081 | ไม่มี route กู้รหัสผ่านที่เรียกได้โดยไม่ล็อกอิน (ตรวจอัตโนมัติ) และกู้ Admin ผ่าน TTY แล้ว session เก่าต้องถูกปฏิเสธ (เจ้าของทำเอง) |
| TC-080 | ตรวจหลัง reboot: container เปิดเอง, ข้อมูลยังอยู่, HTTPS/HSTS, ใบรับรองจาก Let's Encrypt, HTTP→HTTPS, มี cron และ backup อายุไม่เกิน 26 ชม. |

หมายเหตุ: เมื่อทำงานล้มเหลว เครื่องมือ ops จะแสดงแค่ข้อความกลาง ๆ (`OPERATIONS_FAILED` หรือ `MIGRATION_FAILED`) โดยตั้งใจ ไม่บอกรายละเอียด สคริปต์จึงใช้ชุดควบคุมช่วยยืนยันว่าความล้มเหลวมาจากสาเหตุที่ทดสอบจริง

## ผลซ้อม 2026-10-18 (macOS + colima, `RV18_REHEARSAL=1`; ไม่นับเป็นหลักฐาน)

commit 1e48785 และสคริปต์ชุดนี้ ซ้อมรอบที่ 3:

- **ผ่าน:** deploy, app-backup-isolation, app-nonroot, restart-policy, seed, TC-075, TC-076 (writer เขียนสำเร็จ 172 ครั้ง ได้ 503 หนึ่งครั้งช่วง freeze), TC-077, TC-078 และ TC-081-probe
- **FAIL ที่ต้องแก้ก่อนรันจริง:** `roles` เพราะแอปใช้ superuser (`t|t|t`) และเป็นเจ้าของทั้ง 36 ตาราง
- **post-reboot (รันโดยไม่ได้ reboot):** autostart, persist, HSTS และ redirect 308 ผ่าน ส่วน cron กับ scheduled-backup FAIL ตามคาด เพราะเครื่องซ้อมไม่ได้ตั้งไว้ และอ่านผู้ออกใบรับรองไม่ได้ เพราะ openssl หาที่อยู่ `*.localhost` ไม่เจอ
- **ยังไม่ได้ซ้อม:** recovery ผ่าน TTY (ซ้อมได้แค่ `--help` ผ่าน service `ops`), reboot จริง และ Let's Encrypt
- **ข้อจำกัดบน macOS:** bind mount ไม่เก็บ owner ที่ snapshot ต้องการ ตอนซ้อมจึงใช้ named volume แทน `./backups` บน Linux ใช้ `./backups` ตามปกติ
