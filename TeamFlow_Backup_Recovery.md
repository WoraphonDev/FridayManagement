# Backup / restore / upgrade — operator workflow

ขอบเขต: source tooling สำหรับผู้ติดตั้ง; local SQLite เป็น profile ชั่วคราว SQL Server2022/Windows ต้องมีหลักฐานจริงแยกก่อน acceptance. ยังไม่ใช่ production-ready release. ห้ามเก็บ snapshot/.bak/uploads จริงใน repository หรือ ZIP ส่ง source.

## Maintenance และ retention

Runtime gate หยุดรับ API requests ใหม่ระหว่าง freeze (ยกเว้น GET/me, GET/meta, static และ health); รอ handler/uploads/jobs ที่รับแล้วจบ รวม cleanup ใน finally ก่อนตั้ง DB state=frozen. GET อื่นรวม download ที่มี audit ตอบ MAINTENANCE503; ไม่ให้ reads ที่เขียน audit แทรก snapshot. Self.maintenance และข้อความใน UI เดิมแสดงสถานะ. ไม่มี API endpoint ใหม่สำหรับสั่ง freeze.

CLI ใช้สิทธิ์ผู้ติดตั้งจาก private files/DACL และ exclusive local+SQL instance guards ดังนั้นต้องหยุด app ให้ active requests/uploads/jobs จบก่อนรัน backup/upgrade/retention. ไม่ฆ่า process หรือขโมย lock. Retention เริ่มเมื่อ runtime startup และทุก60วินาที ภายใต้ gate เดียวกับ jobs; purge สูงสุด100 tasks/tick ตาม cutoff30×24h, audit/byte queue/link cleanup ใน transaction เดียว คง recurrence tombstones และไม่ reseed IDs. Notification90days, expired sessions/idempotency/rate limits ถูก cleanup; bytes/quota ยัง tracked จน unlink/ENOENT สำเร็จ. CLI `retention run` เรียก service เดียวกัน.

## Commands

รัน `npm run build` ก่อน และโหลด private environment file ด้วย Node22 `--env-file` ตามคู่มือ configuration เดิม. ตัวอย่างคำสั่งต่อไปนี้ไม่มี secrets ใน arguments:

```text
node --env-file=<private-env> dist/server/operations/main.js backup <new-absolute-snapshot-dir> --confirm-local-maintenance
node dist/server/operations/main.js verify <snapshot-dir> --confirm-local-maintenance
node --env-file=<private-env> dist/server/operations/main.js retention run --confirm-local-maintenance
node --env-file=<private-env> dist/server/operations/main.js upgrade <new-preupgrade-snapshot-dir> --confirm-local-maintenance
```

Parent snapshot directory ต้องมีอยู่และ private; ชื่อ destination ต้องใหม่ ไม่ overwrite backup เดิม. สำรองเฉพาะ DB และ attachment bytes ที่ DB อ้างอิง พร้อม manifest format/provider/app version/ordered schema hashes/UTC/file count/SHA256. ไม่รวม .env/logs/temp secrets. SQLite ใช้ Node backup API; SQLใช้ COPY_ONLY/CHECKSUM/STOP_ON_ERROR และ DB_BACKUP_DIR ที่ SQL service และ app มองเห็นได้ทั้งคู่. ถ้า service เขียนไม่ได้หรือ app อ่าน .bak ไม่ได้ คำสั่งต้อง FAIL ไม่ถือว่าสำรองสำเร็จ. SQL .bak ที่ service สร้างคงอยู่ใต้ policy retention ของผู้ติดตั้ง แม้ app snapshot collection ล้มเหลว.

## Isolated restore

ตั้ง `FRIDAY_RESTORE_SOURCE=<verified-snapshot-dir>` ใน private environment. SQLite:

```text
node --env-file=<private-env> dist/server/operations/main.js restore-local <new-isolated-data-dir> --confirm-local-maintenance
```

สร้าง directory ใหม่เท่านั้น; ไม่ overwrite/switch deployment เดิม. ตรวจทุก hash/schema/app compatibility ก่อนสร้าง target, copy files, ตรวจ DB metadata เทียบ manifest, revoke sessions/auth_version และ idempotency records, ล้าง freeze เฉพาะ isolated restored copy. DB อยู่ใน `database.sqlite`. ผู้ติดตั้งตั้ง configuration ใหม่สำหรับ target และตรวจ permissions/login/taskcounts/download/health ก่อนใช้. เวลา restore และ snapshot age ที่คำสั่งรายงานเป็นค่าที่วัดใน run นั้น ไม่ใช่การรับรอง RPO24h/RTO4h ของ deployment.

SQL: ตั้ง DB_PROVIDER=sqlserver, DB_NAME เป็น **ชื่อฐานข้อมูลใหม่ที่ยังไม่มีอยู่** และ DATA_DIR เป็น private empty target directory; LOG_DIR/DB_BACKUP_DIR แยกจาก source. ตั้ง `FRIDAY_SQL_MOVES_FILE` เป็นไฟล์ JSON private ที่ map logical file name ทุกตัวจาก backup ไปยัง absolute SQL-service paths ใหม่ที่ผู้ติดตั้งเลือก. ไม่รองรับ FILESTREAM/unsupported file types อัตโนมัติ.

```text
node --env-file=<private-target-env> dist/server/operations/main.js restore-sql <absolute-DATA_DIR> --confirm-local-maintenance
```

ตรวจ manifest, VERIFYONLY, FILELISTONLY และ MOVE mapping แล้วทำ RESTORE DATABASE จริงโดยไม่มี REPLACE; existing database ถูกปฏิเสธ. Target DB ต้องมี frozen state จาก snapshot; copy/verify uploads และ revoke sessions ก่อนปลด freeze ภายใต้ target instance guard. ถ้าล้มเหลวหลังสร้าง DB จะคง isolated target/freeze ไว้เพื่อ review ไม่ DROP database หรือ overwrite source อัตโนมัติ. ผู้ติดตั้งต้องทดสอบสิทธิ์/download/restart จริงก่อนเปิด target. Native SQL/Windows acceptance ยัง NOT_RUN จนมี run จริง.

## Upgrade / crash / rollback

Upgrade ตรวจ migration ledger เป็น prefix ของ source, checksum ต้องตรงและไม่รับ ledger ใหม่กว่าหรือ source ที่หาย. สร้าง pre-upgrade snapshot ก่อนใช้ transactional migrate; rerun ไม่มี DDL ซ้ำ. ถ้า migrationล้มเหลว exit nonzero, rollback transaction; restore snapshot คู่ DB/files ลง isolated target และเลือก source version ที่ตรงกัน ห้าม downgrade in-place. ถ้า app version ไม่ตรง manifest ให้ใช้ source version เดิมสำหรับ restore แล้ว upgrade ตามลำดับ.

Persistent maintenance ที่เหลือหลัง crash **ไม่ปลดด้วย lease expiry**. Startup แจ้ง MAINTENANCE_RECOVERY_REQUIRED. ผู้ติดตั้งหยุด app, ตรวจ snapshot/partial folderและ owner_id ใน DB แล้วสั่ง explicit recovery:

```text
node --env-file=<private-env> dist/server/operations/main.js clear-maintenance <exact-owner-uuid> --confirm-local-maintenance
```

คำสั่งตรวจ file authority+instance guards และ owner ตรงก่อนลบ state; ไม่รับรองว่า snapshot ครั้งก่อนสำเร็จ. Partial snapshotไม่มี manifest complete ห้ามนำไป restore; ลบเฉพาะ partial artifact ที่ยืนยันว่าเป็นของ run ที่ล้มเหลว. Failure ไม่พิมพ์ raw connection errors/passwords.

## Windows scheduling example (owner installs)

ยังไม่ติดตั้ง scheduled task หรือแก้ server. ผู้ติดตั้งสร้าง PowerShell wrapper ที่หยุด app ด้วย service mechanism ที่ใช้จริง รอ process จบ รัน backup ด้วย environment file private ตรวจ exit code และเริ่ม app อีกครั้งเมื่อไม่มี unresolved maintenance. หาก freeze ownership/guard loss ให้หยุดและตรวจ ห้ามเริ่ม service โดยกลบ failure. กำหนด Task Scheduler daily ตามเวลาองค์กร; เก็บ7 daily+4 weekly และ copy snapshotที่ verifyแล้วไปอีก disk/locationภายใต้ ACLเดิม. ตรวจ task history/failed backup/restore rehearsal และบันทึก RPO/RTO จริง; ไม่ prune artifacts อัตโนมัติจากชื่ออย่างเดียว.

อ้างอิง primary: [Node22 SQLite backup](https://nodejs.org/download/release/v22.23.3/docs/api/sqlite.html), [SQL BACKUP](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver16), [SQL restore to new locations](https://learn.microsoft.com/en-us/sql/relational-databases/databases/copy-databases-with-backup-and-restore?view=sql-server-ver16). เอกสารรองรับวิธีใช้งาน ไม่แทนหลักฐาน native execution.

Source example: `scripts/windows/Backup-Friday.ps1` รับ EnvironmentFile/BackupRoot/ServiceName และ ConfirmStopApplication จากผู้ติดตั้ง รอ service หยุดก่อนสำรอง+verify และเริ่มใหม่เฉพาะเมื่อผ่านทั้งสองคำสั่ง Failure คง service หยุดเพื่อ review. เป็นตัวอย่างให้เจ้าของปรับและทดสอบกับ service ของตน ยังไม่ได้รันบน Windows และไม่ได้สร้าง Task Scheduler/service ใดใน turn นี้.
