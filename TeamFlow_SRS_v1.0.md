# TeamFlow — Software Requirements Specification (SRS)

**เวอร์ชัน:** 1.1 · **วันที่:** 5 ตุลาคม 2026  
**สถานะ:** Baseline ยืนยันแล้วสำหรับพัฒนา; ยังไม่ทดสอบ  
**Requirements ต้นทาง:** `TeamFlow_Requirements_v1.0.md`  
**ขอบเขต:** องค์กรเดียว หลายทีม ประมาณ 30 บัญชี ไม่มีอีเมล ไม่มี AI เจ้าของระบบ deploy เอง


## บันทึกการยืนยัน — Baseline 1.1

เจ้าของระบบยืนยันในบทสนทนานี้: “ผม ok ตามที่เสนอ และ sql server 2022” กติกา D-01–D-11 และคำตอบ R-01–R-04 ที่เสนอถือเป็น baseline แล้ว; ฐานข้อมูลใช้ **Microsoft SQL Server 2022** แทนข้อเสนอเดิม

- R-01: ผู้ใช้กดเสร็จเองหลัง Checklist ครบ ไม่ auto-done
- R-02: Archive ระดับโปรเจกต์; งานใช้ soft delete/restore 30 วัน ไม่มี task archive แยก
- R-03: ไฟล์แนบที่ลบเก็บในถังขยะ 30 วัน ยังนับ quota จน purge; uploader/owner Lead/Admin คืนไฟล์ได้ในช่วงนี้หากยังมี write access และโปรเจกต์ active
- R-04: คง recurrence tombstone หลัง purge เพื่อกันสร้างรอบซ้ำ; technical design ใช้ source/generated ID snapshots ที่ไม่ผูก FK ถึง task ที่อาจถูกลบ
- Stack: React + TypeScript + Vite, Node.js 24 LTS + Express 5 + `mssql`/Tedious, SQL Server 2022; เครื่องมือหน้าจอ/ตรวจข้อมูล/ทดสอบตาม SRS §3.4
- Edition ของ SQL Server, patch/runtime/package versions และสิทธิ์ติดตั้งยังต้องตรวจตอนติดตั้ง ไม่มีข้อสรุปว่าเป็น Express/Developer หรือพร้อม production แล้ว

การยืนยันนี้เป็น baseline สำหรับพัฒนา ไม่ใช่ผลว่าพัฒนาหรือทดสอบแล้ว งาน coding/test ยัง TODO/NOT_RUN ยกเว้น T-001/T-002 ซึ่งปิดได้ด้วยการยืนยันและแก้เอกสารนี้ **ชื่อไฟล์คงเดิมเพื่อรักษา references; ให้ดู version 1.1 ในส่วนหัวเป็นรุ่นเนื้อหาปัจจุบัน**


## 1. แนวทางอ่านเอกสาร

คำว่า **ต้อง** เป็นข้อกำหนดของ Baseline 1.1 ที่เจ้าของระบบยืนยันแล้ว FR/NFR/BR อ้างถึงเอกสาร Requirements; SP เป็นข้อกำหนดการทำงาน; AT เป็น acceptance test; D เป็นค่าเริ่มต้นที่เสนอ

SRS นี้กำหนดพฤติกรรมของแอปที่เราจะสร้าง ไม่รับรองฟีเจอร์ของ MobMai รายละเอียดไม่ได้อ้างอิงจากการเดาพฤติกรรมภายในของ MobMai

## 2. ค่าเริ่มต้นที่ยืนยันและการตัดสินใจ

| ID | ค่าเริ่มต้นที่ใช้พัฒนา | เหตุผล/ผลกระทบ |
|---|---|---|
| D-01 | ชื่อทำงาน TeamFlow, ภาษาไทย, timezone Asia/Bangkok | เปลี่ยนชื่อองค์กรในระบบได้; timestamp เก็บ UTC |
| D-02 | Admin/Lead/Member และ project Editor/Viewer | สมาชิกเห็นเฉพาะโปรเจกต์ที่เพิ่มให้; Lead ดูแลของทีมตน |
| D-03 | โปรเจกต์เจ้าของหนึ่งทีม แชร์ให้ผู้ใช้จากทีมอื่นได้ | การแชร์ไม่เปิดทั้งทีมโดยอัตโนมัติ |
| D-04 | Editor แก้ไข/ย้ายงานใดก็ได้ในโปรเจกต์ | เก็บ audit; ลบงานได้เฉพาะผู้สร้าง/ผู้ดูแล |
| D-05 | ผู้รับหนึ่งคนหรือไม่มอบหมาย | ผู้ร่วมงานอื่นเข้าผ่าน project membership |
| D-06 | สถานะ todo/doing/review/done; priority low/medium/high/urgent | ไม่มี custom columns หรือ approval workflow ใน v1 |
| D-07 | Checklist ต้องครบก่อน done; งานซ้ำสร้างรอบถัดไปเมื่อ done | ป้องกันปิดงานค้าง/สร้างรายการล่วงหน้าซ้ำ |
| D-08 | ไฟล์สูงสุด 10 MiB ต่อไฟล์, พื้นที่รวม 5 GiB | ค่า config; allowlist ตาม §9.5; ไม่บังคับใช้ antivirus SaaS |
| D-09 | soft delete 30 วัน; audit/comment เก็บจน purge parent | งาน archived ไม่อยู่ในรายงานงาน active |
| D-10 | แจ้งเตือนเก็บ 90 วัน; update UI ด้วย polling ≤10 วินาทีเมื่อเปิดหน้า | ไม่มีอีเมล/Push เมื่อปิดเว็บ; reminder ตรวจทุก 60 วินาที |
| D-11 | session absolute 12 ชั่วโมง, idle 60 นาที; รหัส 12–128 ตัวอักษร | ไม่ใช้ public registration; reset โดย Admin |
| D-12 | React/TypeScript/Vite + Node.js 24 LTS/Express 5 + SQL Server 2022 ผ่าน mssql/Tedious | ใช้ฐานข้อมูลที่องค์กรมี; Edition/connection/service permissions ตรวจตอนติดตั้ง |

D-12 ใช้ฐานข้อมูล SQL Server 2022 ตามคำยืนยันของเจ้าของระบบ; กำหนด stack สำหรับพัฒนาตาม §3.4 และล็อก patch/dependency versions ใน T-003/T-005 ก่อนใช้จริง ไม่ใช้ driver SQLite และไม่สมมติ Edition ของ SQL Server

อ้างอิงทางเทคนิค: [node-mssql](https://github.com/tediousjs/node-mssql), [SQL Server BACKUP](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver16), [SET XACT_ABORT](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-xact-abort-transact-sql?view=sql-server-ver16), [Filtered indexes](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-filtered-indexes?view=sql-server-ver16)

## 3. Architecture และขอบเขตระบบ

### 3.1 องค์ประกอบ

| องค์ประกอบ | หน้าที่ |
|---|---|
| Browser UI | Login, งานของฉัน, Kanban, รายการ, ปฏิทิน, รายงาน, ทีมและ Admin |
| Application API | Authentication, authorization, validation, transaction และ export |
| SQL Server repository | mssql/Tedious connection pool; parameterized T-SQL, FK/constraints/indexes; transaction; versioned migration |
| File storage | เก็บไฟล์ด้วยชื่อสุ่มนอก webroot; ดาวน์โหลดผ่าน API ที่ตรวจสิทธิ์ |
| In-process scheduler | Reminder, retention และ session cleanup; ไม่สร้าง recurring tasks ตาม timer |
| Deployment configuration | origin, cookie policy, data path, port, quota และ log path |
| Backup/restore scripts | หยุด writes สำรอง DB/files คู่กัน ตรวจ manifest และ restore ทดสอบ |

### 3.2 ข้อจำกัดการติดตั้งที่ตั้งใจ

- v1 รัน application instance เดียวเพื่อควบคุม scheduler/maintenance; เชื่อม SQL Server 2022 ผ่าน connection pool; การใช้ SQL Server ไม่ได้เพิ่ม multi-instance scope อัตโนมัติ
- SQL Server จัดการ database storage เอง; uploads/temp/logs อยู่บน local disk ของ app นอก source/build/webroot; SQL Server อาจเป็น host แยกได้ตามการตั้งค่าผู้ติดตั้ง
- app bind loopback เมื่ออยู่หลัง reverse proxy; HTTPS จบที่ IIS/proxy หรือแอปตาม configuration
- ไม่ใช้ Control Panel เป็น runtime โดยอัตโนมัติ ต้องมีวิธีรัน Node process และเริ่มอัตโนมัติหลัง reboot
- ไม่พึ่ง connector, ChatGPT account, cloud storage, SMTP, AI API หรือ CDN font เพื่อใช้งานฟังก์ชันหลัก
- ไม่ต้องใช้ Docker; Windows installation scripts และ service configuration อยู่ใน deliverables

### 3.3 Configuration contract

`APP_ORIGIN` ต้องเป็น origin จริงหนึ่งค่า เช่น `https://tasks.example.com`; ไม่รับ wildcard เมื่อใช้งานจริง

| Key | Default/ข้อกำหนด |
|---|---|
| HOST / PORT | 127.0.0.1 / 3000; เปลี่ยนได้ |
| APP_ORIGIN | ต้องระบุใน production; ใช้ตรวจ Origin/CSRF |
| COOKIE_SECURE | true ใน production HTTPS; startup ปฏิเสธค่าที่ขัดกัน |
| DATA_DIR / LOG_DIR | สำหรับ uploads/temp/logs; absolute path; app service account อ่าน/เขียนได้ ไม่ใช่ตำแหน่งไฟล์ DB |
| DB_SERVER / DB_PORT / DB_NAME | SQL Server host; port ที่ตั้งจริง (ค่าแนะนำ 1433 ไม่เดาว่าเปิดอยู่); database แยก TeamFlow |
| DB_USER / DB_PASSWORD | SQL Authentication แบบ dedicated least-privilege login; secret นอก source/log; integrated auth เป็นทางเลือกติดตั้งที่ต้องตรวจ driver แยก |
| DB_ENCRYPT / DB_TRUST_SERVER_CERTIFICATE | true / false เมื่อใช้จริง; certificate ของ SQL Server ต้องเชื่อถือได้; local test ข้อยกเว้นลง config แยก |
| DB_POOL_MAX / DB_REQUEST_TIMEOUT_MS / DB_LOCK_TIMEOUT_MS | 10 / 15000 / 5000; ค่าปรับได้และทดสอบตาม load |
| DB_BACKUP_DIR | ตำแหน่ง .bak ที่ SQL Server service account เขียนได้; host/path ต้องตรง SQL host; แยกจาก uploads/manifest destination |
| MAX_FILE_BYTES | 10,485,760 |
| TOTAL_UPLOAD_BYTES | 5,368,709,120 |
| SESSION_ABSOLUTE_MIN / SESSION_IDLE_MIN | 720 / 60 |
| POLL_SECONDS / REMINDER_SECONDS | 10 / 60 |
| TRASH_RETENTION_DAYS / NOTIFICATION_RETENTION_DAYS | 30 / 90 |
| TRUSTED_PROXY | explicit IP allowlist ถ้าจำเป็น; ไม่เชื่อ X-Forwarded-* จากทุกแหล่ง |

### 3.4 Stack ที่ใช้เป็นฐานพัฒนา

| ส่วน | Technology |
|---|---|
| Frontend | React + TypeScript + Vite; React Router; CSS/CSS Variables; Fetch API |
| Kanban | dnd-kit พร้อม keyboard/touch alternative |
| Backend | Node.js 24 LTS + Express 5 + TypeScript |
| Validation / upload | Zod; Busboy + Node Streams |
| Database | SQL Server 2022; mssql/Tedious; T-SQL migrations ไม่มี SQLite/ORM บังคับ |
| Password / session | Node Crypto asynchronous scrypt; cookie session ที่เก็บ hash ใน SQL Server |
| Date / polling / jobs | Intl/UTC/Bangkok date helpers; polling ≤10s; in-process jobs ทุก60s |
| Unit / integration / UI tests | node:test/node:assert; Vitest สำหรับ frontend logic; Playwright สำหรับ browser/API |
| PWA | Web Manifest + Service Worker cache เฉพาะ static |
| Windows | IIS/proxy ตามสิทธิ์ที่มี; WinSW; Task Scheduler; env config; JSON logs |
| Source tools | npm/lockfile; tsc; ESLint/Prettier; Git |

Pin versions/license inventory ใน code manifest; ข้อกำหนด runtime/HTTPS/service/Edition ต้องตรวจติดตั้งจริง ไม่มีบริการ SMTP/AI/SaaS บังคับ

## 4. Permission Model

### 4.1 การคำนวณ effective permission

ตรวจตามลำดับ: active user → session valid → บัญชีไม่ติด must_change_password สำหรับ operation ทั่วไป → resource ไม่ถูก purge → ขอบเขตองค์กร → effective permission → archived/deleted state → business validation

1. Admin: ดูแลทุกทีมและทุกโปรเจกต์
2. Lead: ดูแลโปรเจกต์ที่ `owner_team_id` อยู่ในทีมที่ตนเป็น Lead
3. คนอื่น: ใช้ `project_members` ของโปรเจกต์นั้น; Editor เขียนได้ Viewer อ่านได้
4. สมาชิกทีมอย่างเดียว **ไม่** เพิ่ม project permission
5. การเป็น assignee/creator/comment author อย่างเดียว **ไม่** ให้สิทธิ์หาก project access ถูกถอน

### 4.2 Permission matrix

| Operation | Admin | Lead ทีมเจ้าของ | Editor | Viewer | ไม่มี project access |
|---|---|---|---|---|---|
| สร้าง/ปิดบัญชี แต่งตั้ง Lead | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| เพิ่ม/ถอนสมาชิกทีม | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| สร้างโปรเจกต์ | ได้ | ในทีมตน | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| แก้/เก็บ/เปิดคืนโปรเจกต์ | ได้ | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| เพิ่ม/เปลี่ยน/ถอน project member | ได้ | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| อ่านงาน/ประวัติ/ความคิดเห็น/ไฟล์ | ได้ | ได้ | ได้ | ได้ | ไม่ได้ |
| สร้าง/แก้/มอบหมาย/ลากงาน | ได้ | ได้ | ได้ | ไม่ได้ | ไม่ได้ |
| เพิ่ม/ติ๊ก/แก้/ลบงานย่อย | ได้ | ได้ | ได้ | ไม่ได้ | ไม่ได้ |
| แสดงความคิดเห็น/อัปโหลด | ได้ | ได้ | ได้ | ไม่ได้ | ไม่ได้ |
| ลบไฟล์แนบ | ได้ | ได้ | เฉพาะที่อัปโหลดเอง | ไม่ได้ | ไม่ได้ |
| Soft delete งาน | ได้ | ได้ | เฉพาะงานที่สร้างเอง | ไม่ได้ | ไม่ได้ |
| คืนงานจากถังขยะ | ได้ | ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| รายงาน/CSV | ทั้งองค์กร | โปรเจกต์ทีมตน + ที่ได้รับเพิ่ม | เฉพาะโปรเจกต์ที่เข้าถึง | เฉพาะโปรเจกต์ที่เข้าถึง | ไม่ได้ |
| กู้คืน backup / purge ถาวร | ผู้ดูแลการติดตั้งเท่านั้น | ไม่ได้ | ไม่ได้ | ไม่ได้ | ไม่ได้ |

โปรเจกต์ archived ให้ทุกบทบาทอ่านตามสิทธิ์ได้ แต่ห้าม write งาน/comments/files/subtasks/recurrence ยกเว้น Admin/Lead unarchive หรือ soft delete ผ่าน endpoint เฉพาะตามกติกา; งาน deleted อ่านได้เฉพาะ Admin/Lead ผ่าน trash ไม่ปรากฏใน endpoint งานปกติ

### 4.3 ความเป็นส่วนตัวของ directory

Lead ดูรายชื่อผู้ใช้ active และชื่อทีมเพื่อเลือกเพิ่ม project member ได้ แต่ไม่เห็นงานหรือข้อมูลบัญชีส่วนตัวของทีมอื่น Member/Viewer เห็นชื่อผู้ร่วมโปรเจกต์ที่ตนเข้าถึง ไม่เห็นบัญชีทั้งหมดขององค์กร Username/active/role จัดการผ่าน Admin API เท่านั้น

## 5. Data Dictionary

IDs ใช้ positive integer ภายใน API; ไม่ถือว่า ID ที่เดาไม่ได้แทน authorization. Text ใช้ Unicode. Timestamp ใช้ ISO 8601 UTC; date-only ใช้ YYYY-MM-DD. FK ไม่ลบ user ที่มีประวัติ ให้ deactivate แทน

| Entity | Fields สำคัญ / constraints |
|---|---|
| organizations | id=1, name ≤100, timezone='Asia/Bangkok', version int≥1, created_at, updated_at |
| users | id PK, username UNIQUE case-insensitive ≤60 pattern `[A-Za-z0-9._-]+`, display_name ≤100, password_hash, org_role admin/member, active bool, must_change_password bool, auth_version, version int≥1, created_at, updated_at |
| sessions | token_hash PK, user_id FK, csrf_token, auth_version, created_at, last_seen_at, absolute_expires_at; raw session token ไม่เก็บใน DB |
| teams | id PK, name UNIQUE case-insensitive ≤100, description ≤1000, archived_at nullable, version |
| team_members | team_id + user_id composite PK, team_role lead/member, joined_at |
| projects | id PK, owner_team_id FK, name ≤100, description ≤2000, archived_at nullable, version, created_by, created_at, updated_at |
| project_members | project_id + user_id composite PK, access editor/viewer, added_by, added_at; user ไม่จำเป็นอยู่ทีมเจ้าของ |
| tasks | id PK, project_id FK, title ≤200, description ≤10000, category ≤80, status enum, priority enum, assignee_id nullable FK, creator_id FK, start_date nullable, due_date nullable, recurrence none/daily/weekly/monthly, recurrence_anchor_day nullable, predecessor_task_id nullable FK (unique filtered index), successor_task_id nullable FK, version int≥1, created_at, updated_at, completed_at nullable, deleted_at/by nullable |
| subtasks | id PK, task_id FK, title ≤200, done bool, version, created_at; ไม่มี assignee หรือวันส่งแยกใน v1 |
| board_columns | project_id + status composite PK, version int≥1; ใช้ concurrency ของการเรียงทั้งคอลัมน์ |
| board_positions | task_id UNIQUE FK, project_id, status, rank int; UNIQUE(project_id,status,rank) ทุก statement; ใช้ temporary unique ranks ใน transaction; สอดคล้อง tasks.status |
| comments | id PK, task_id FK, author_id FK, body ≤5000, created_at; append-only ใน UI |
| attachments | id PK, task_id FK, uploader_id FK, original_name ≤200, storage_key UNIQUE random UUID, bytes≥1, validated_type, sha256, created_at, deleted_at nullable |
| task_events | id PK, task_id FK, actor_id nullable, action, field_changes JSON, request_id, created_at; append-only |
| admin_events | id PK, actor_id, action, resource_type/id, redacted_changes, request_id, created_at |
| notifications | id PK, recipient_id FK, task_id FK, type, message, dedupe_key UNIQUE, read_at nullable, created_at; read access ตรวจตาม parent เสมอ |
| recurrence_events | source_task_id INT UNIQUE NOT NULL snapshot (ไม่มี FK), generated_task_id INT NOT NULL snapshot (unique index ไม่มี FK), created_at; คง tombstone หลัง task purge; IDs ไม่ reuse/reseed ใน production |
| idempotency_keys | user_id + route + key composite UNIQUE, request_hash, response_status/body, expires_at; ไม่เก็บ upload bytes หรือ password |
| schema_migrations | version UNIQUE, checksum, applied_at |

Index ขั้นต่ำ: team_members(user_id), project_members(user_id), tasks(project_id,status,deleted_at), tasks(assignee_id,due_date), tasks(completed_at), comments(task_id,id), task_events(task_id,id), notifications(recipient_id,read_at), sessions(expires), board_positions(project_id,status,rank). ตรวจ query plan และ pagination จากงานจริง

### 5.1 SQL Server 2022 Physical Mapping / Concurrency

- IDs ใช้ INT IDENTITY(1,1); BIT สำหรับ boolean; DATE สำหรับ date-only; DATETIME2(3) UTC สำหรับ timestamps (default SYSUTCDATETIME()); NVARCHAR สำหรับภาษาไทย; BIGINT สำหรับ byte counts; application version ใช้ INT ไม่สับสนกับ SQL rowversion
- JSON field_changes/redacted_changes/response body ใช้ NVARCHAR(MAX) + ISJSON validation เมื่อไม่ NULL; ไม่มี native JSON column dependency
- username/team name uniqueness ใช้ collation case-insensitive ที่กำหนดและทดสอบภาษาไทย/Unicode; text length validator ให้นิยามตรง DB storage และ boundary tests
- optional UNIQUE เช่น predecessor_task_id/generated reference ใช้ unique filtered index `WHERE ... IS NOT NULL`; อย่าใช้ UNIQUE nullable แบบไม่กรองแล้วจำกัดให้มี NULL เพียงรายการเดียว
- Foreign keys ที่มีหลายเส้นทางใช้ NO ACTION และ purge แบบ explicit ใน transaction; ไม่ใช้ cascade ทุกตารางจนเกิด multiple-cascade-path errors
- ทุก mutation ที่ต้อง atomic ใช้ SET XACT_ABORT ON + explicit transaction ผ่าน mssql connection เดียว; rollback เมื่อ error; SQL แทรกค่าด้วย typed parameters ไม่ต่อ string จากผู้ใช้
- Optimistic version: UPDATE ... WHERE id=@id AND version=@expected; ถ้า affected rows=0 ให้ตรวจ access/exists แล้วตอบ 409 หรือ 404; ไม่ increment ก่อน server commit
- Board move lock board_columns/task ที่เกี่ยวข้องด้วย UPDLOCK/HOLDLOCK และ lock columns ตามลำดับคงที่; เปลี่ยน rank สองระยะ (temporary negative rank ที่ไม่ซ้ำ แล้ว final positive1..N) ใน transaction เพื่อไม่ชน UNIQUE ระหว่าง statements เพราะ SQL Server ไม่มี deferred unique validation หลัง commit
- Recurrence source completion + unique tombstone + successor + board/audit/notifications ใช้ transaction เดียว; source-task lock/UNIQUE guards ป้องกัน concurrent duplicate
- Quota reservations/idempotency/setup/last-active-Admin ใช้ DB locks/unique constraints ไม่ใช่ in-memory locks อย่างเดียว
- Lock timeout/deadlock ต้อง rollback ก่อน retry; deadlock1205 retry whole transaction แบบจำกัดเฉพาะคำสั่ง idempotent (สูงสุด2 ครั้ง); timeout ที่ไม่ทราบ commitresult ห้าม blind retry ให้ตรวจ authoritative state/key result ก่อน; หมด retry ตอบ503/Retry-After
- จำกัด query pagination ด้วย ORDER BY + OFFSET/FETCH; ทุก sort column ใช้ allowlist; index/query-plan/load tests ใช้ SQL Server จริง ไม่ใช้ in-memory SQLite แทน integration

## 6. Authentication / Accounts — SP-01

**เกี่ยวข้อง:** FR-01–05, NFR-02, BR-01–02

### 6.1 First-run

- ถ้าไม่มี user ให้ server สร้าง setup token อย่างน้อย 256-bit และแสดงเฉพาะ console; token เปลี่ยนเมื่อ restart
- `/api/meta` เปิดเผยเฉพาะ `setupRequired` และ app version ไม่แสดง token หรือ DB path
- `/api/setup` รับ token, username, display_name, password, organization_name; ใช้ transaction + เงื่อนไข no users เพื่อป้องกัน setup พร้อมกัน
- หลังสร้าง Admin สำเร็จ setup token ใช้อีกไม่ได้; endpoint ตอบ 409 แม้ token เดิมถูกต้อง
- ไม่มี default admin/password ที่ commit ใน source หรือ sample config

### 6.2 Login/session

- Username case-insensitive; password ไม่ trim; ตรวจความยาวก่อนทำ password hash
- ใช้ asynchronous scrypt พร้อม random salt อย่างน้อย 128-bit และ constant-time comparison; ค่าเริ่มต้น N=32768, r=8, p=1, key length=64 bytes, maxmem อย่างน้อย 64 MiB; เก็บ algorithm/cost/salt/hash เพื่อรองรับการปรับรุ่น; ห้าม plaintext/reversible encryption
- Login fail ทุกสาเหตุใช้ข้อความเดียว; rate limit ค่าเริ่มต้น 10 attempts ต่อ username และ 30 attempts ต่อ IP ใน 15 นาที; success ไม่ปลดข้อจำกัด IP ทั้งหมด
- random session token อย่างน้อย 256-bit; cookie HttpOnly, SameSite=Strict, Secure เมื่อ production HTTPS, Path=/; DB เก็บ hash
- session absolute 12 ชั่วโมง/idle 60 นาที; GET notification polling ไม่ต่อ idle age; intentional user interaction ส่ง activity ผ่าน endpoint ที่มี CSRF
- reset, deactivate, role change และ forced logout revoke session ของผู้ใช้เป้าหมาย; permissions ตรวจ DB ปัจจุบันทุก request
- account ที่ must_change_password ใช้ได้เฉพาะ me/password/logout/activity; operation อื่นตอบ 403 `PASSWORD_CHANGE_REQUIRED`
- logout revoke DB session และ clear cookie; password change revoke session อื่นและ rotate session/CSRF ของผู้ใช้ปัจจุบัน

### 6.3 Admin account actions

- Admin สร้างบัญชีพร้อมรหัสชั่วคราวที่ตนกรอก; ตั้ง must_change_password=true
- Admin reset password ต้องยืนยันรหัสผ่าน Admin ปัจจุบัน; ไม่คืนค่า password ใน API/log
- ผู้ใช้ inactive ยังอ้างอิงในประวัติได้; login ไม่ได้และไม่อยู่ assignee picker
- ห้าม demote/deactivate Admin active คนสุดท้ายด้วย transaction; ห้ามลบ user hard delete ผ่าน UI
- ผู้ดูแล server กู้ Admin ได้ด้วย CLI ที่รันบนเครื่องและมี audit; ไม่เปิด unauthenticated recovery endpoint

## 7. Teams / Projects — SP-02

**เกี่ยวข้อง:** FR-06–11, BR-03–05, BR-14–16

- team membership เพิ่ม/ถอน/เปลี่ยน Lead โดย Admin เท่านั้น
- archive team ได้เมื่อไม่มีโปรเจกต์ active; ไม่เปลี่ยน project status แบบเงียบ; สมาชิกอยู่ในประวัติได้
- team archived สร้างโปรเจกต์ใหม่ไม่ได้; โปรเจกต์ archived ยังอ่านได้ผ่าน archived list
- สร้างโปรเจกต์ต้อง owner team active; creator Admin/Lead ทีมเจ้าของ; project name ซ้ำข้ามทีมได้
- project membership เพิ่มได้จาก active users ทั้งองค์กร; role editor/viewer; Admin/Lead ไม่จำเป็นมี row membership เพื่อเข้าถึงของทีมตน
- ต้องไม่แก้ owner team ของโปรเจกต์ใน v1; ถ้าต้องย้ายทีมให้เป็น change request เพราะกระทบ access
- ถอนสิทธิ์/ลด Editor เป็น Viewer: ถ้าผู้ใช้ไม่มี effective write access แล้ว ให้ unassign **งานที่ยังไม่ done** ในโปรเจกต์ พร้อม audit และแจ้ง Admin/Lead ทีมเจ้าของ; งาน done คง assignee เป็นประวัติ
- ถอน team membership: คง explicit project membership ที่มีอยู่; ถ้าเสีย Lead แต่มี project Editor ยังคง access; ถ้าไม่มี effective access ให้ cleanup งานค้างตามกติกาด้านบน
- deactivate user: revoke sessions และ unassign งานไม่ done ทั้งหมดใน transaction; คงงาน done/ผู้สร้าง/comments/audit
- เมื่อ access ถูกถอน API ใหม่ต้องถูกปฏิเสธทันที; browser อัปเดตในรอบ polling ถัดไป; file download ที่กำลัง stream แล้วอาจจบได้ แต่ request ใหม่ต้องปฏิเสธ

## 8. Task Lifecycle — SP-03

**เกี่ยวข้อง:** FR-12–20, BR-06–12, BR-17

### 8.1 ฟอร์มและ validation

| Field | Required | Validation |
|---|---|---|
| project_id | ใช่ | Active project, effective write access; แก้ข้ามโปรเจกต์ไม่ได้ |
| title | ใช่ | trim แล้ว 1–200 ตัวอักษร |
| description | ไม่ | plain text 0–10,000; ไม่รัน HTML/Markdown script |
| category | ไม่ | trim 0–80; free text ใน v1 |
| assignee_id | ไม่ | active และ effective write access; null หมายถึงไม่มอบหมาย |
| priority | ใช่ | low/medium/high/urgent; default medium |
| status | ใช่ | สร้างใหม่ todo; เปลี่ยนตาม transition rules |
| start_date/due_date | ไม่ | วันที่จริง YYYY-MM-DD; start≤due ถ้ามีสองค่า |
| recurrence | ใช่ | none/daily/weekly/monthly; ต้องมี due_date เมื่อไม่ใช่ none |
| version | ตอนแก้ไข | ต้องตรง version ปัจจุบัน; ไม่ตรงตอบ 409 |

API ปฏิเสธ unknown fields ที่อาจถูกใช้เปลี่ยน creator/project/version โดยพลการ หรือใช้ explicit allowlist เท่านั้น

### 8.2 State transitions

ทุกสถานะย้ายไปทุกสถานะอื่นได้โดย Editor/Lead/Admin ในโปรเจกต์ active; review เป็นสถานะติดตาม ไม่ใช่การอนุมัติ. เปลี่ยนไป done ตรวจ subtasks ทั้งหมด done ก่อน; ไม่ผ่านตอบ 422 `SUBTASKS_INCOMPLETE` โดยไม่เปลี่ยนข้อมูล

- todo/doing/review → done: ตั้ง completed_at=now, audit, notifications, recurrence generation ใน transaction เดียว
- done → todo/doing/review: completed_at=null และเก็บ reopen event; งานที่สร้างจาก recurrence ไว้แล้วไม่ถูกลบ
- done → done: no-op ไม่เปลี่ยน completed_at ไม่สร้าง recurrence; ถ้า request key เดิมให้คืนผลเดิม
- งานหลัก done ห้ามเพิ่มหรือ untick subtask จน reopen; ไม่กำหนด checklist completion ให้เปลี่ยนสถานะหลักเอง
- งาน deleted ไม่รับแก้ไข/ความคิดเห็น/files; การ restore คืนสถานะเดิมแต่ version เพิ่ม

### 8.3 Recurring tasks

1. ใช้ due_date รอบเดิมเป็นฐาน daily +1 วัน weekly +7 วัน monthly เดือนถัดไป
2. Monthly เก็บ recurrence_anchor_day ของ series: วันที่ 31 → ก.พ.วันสุดท้าย → มี.ค.31; ไม่เลื่อนไปเป็น 28 ถาวร
3. start_date หากมีให้รักษาระยะห่างวันจาก due_date; ถ้าไม่มีคง null
4. Copy title, description, category, priority, assignee ที่ยัง eligible, checklist titles, recurrence และ anchor; ไม่ copy comments/files/audit/completion
5. งานรอบใหม่ status=todo, version=1; เก็บ predecessor/successor และ recurrence_events source UNIQUE
6. ผู้รับหมดสิทธิ์ให้ null; ถ้าโปรเจกต์ archived ไม่ให้ปิดงาน/สร้างรอบใหม่
7. reopening + recompleting source ไม่สร้างเพิ่ม; repeat no longer desired ให้ตั้ง recurrence=none ก่อน done; เปลี่ยน source หลังมี successor ไม่แก้ successor โดยอัตโนมัติ
8. งาน overdue หลายรอบสร้างเพียงรอบถัดไปหนึ่งงาน ไม่ catch-up สร้างทุกวันย้อนหลัง; งานใหม่อาจยัง overdue ตาม due_date ที่ได้
9. ถ้า transaction ล้มเหลว ห้าม source เปลี่ยน done โดยยังไม่มี successor; retry source ได้โดยไม่ซ้ำ

### 8.4 Trash/retention

- soft delete ตั้ง deleted_at/deleted_by, ถอนจาก board position และเก็บ audit; ไม่ปรากฏงาน active/CSV/calendar/reminder
- คืนภายใน 30 วันโดย Admin/Lead; คืนเข้าท้ายคอลัมน์เดิม; ถ้าโปรเจกต์ archived คืนแบบ read-only
- admin CLI purge งานที่ครบ 30 วัน รวม comments/subtasks/attachments bytes/notifications/event ตาม parent; บันทึก admin_events ก่อน purge
- ถ้ามี recurrence live links ให้ตั้ง predecessor/successor FK เป็น NULL ก่อน purge parent; recurrence_events เก็บ source/generated integer ID snapshots ไม่มี FK คงอยู่จน policy maintenance เปลี่ยนอย่างมี version ห้ามลบ tombstone เพื่อเลี่ยง constraint; source IDs ไม่ reuse
- cleanup files ไม่สำเร็จให้คิว retry และ log; ไม่ถือว่าข้อมูลถูกลบครบก่อน cleanup สำเร็จ

## 9. Collaboration / Views — SP-04

**เกี่ยวข้อง:** FR-21–31, FR-35–36

### 9.1 Kanban

- 4 คอลัมน์: รอทำ (todo), กำลังทำ (doing), รอตรวจ (review), เสร็จแล้ว (done)
- เปิดได้ต่อโปรเจกต์หนึ่งโปรเจกต์; All projects ใช้รายการ/รายงาน ไม่สร้างลำดับข้ามโปรเจกต์
- การ์ดแสดง title, ID, assignee หรือ “ยังไม่มอบหมาย”, priority label, due date, overdue label, checklist count
- ลากข้ามคอลัมน์แก้ status+position; ลากในคอลัมน์แก้ position; ดูหน้าจอใหม่แล้วลำดับเดิม
- ถ้ามี text search หรือ filter assignee/priority/category/date/status ให้ปิดการลากและปุ่ม reorder เพราะรายการไม่ครบ; ใช้ task detail เปลี่ยน status ได้
- ตัวกรองถูกล้างก่อนเปิด reorder; UI แจ้งเหตุผล ไม่ย้ายงานที่ถูกซ่อนแบบไม่มีเจตนา
- keyboard/touch มีปุ่มเลือกสถานะและเลื่อนก่อน/หลังหนึ่งตำแหน่งที่ใช้ API transaction เดียวกับลาก
- touch drag มี handle/long-press และไม่แย่งการเลื่อนหน้า; ต้องทดสอบจริงบน touch device/emulation
- client แสดง pending; success commit; network/permission/validation fail คืนตำแหน่งก่อนลากแล้วแสดง error; conflict โหลด column ล่าสุด
- ไม่เปลี่ยน UI เป็น saved จน server ยืนยัน; ถ้า timeout ไม่รู้ผล GET authoritative state ก่อน retry

#### Ordering/concurrency contract

`POST /api/projects/{id}/board/move` รับ task_id, task_version, from_status, to_status, source_column_version, target_column_version, before_task_id หรือ null และ Idempotency-Key

Server ใน transaction: ตรวจสิทธิ์/project/status/task version/column versions/anchor validity → ลบจาก source list → แทรกก่อน anchor ใน target หรือ append → renumber rank 1..N ของคอลัมน์ที่กระทบ → update task status/version และ completed_at/recurrence → increment column versions → audit/notifications → commit

source=target ใช้ column version เดียว; anchor ต้องเป็น task ใน target/project เดียวกันและไม่ใช่ task ตัวเอง; stale version ตอบ 409 ไม่มี partial update. Response คืน task และ ordering/versions ของ affected columns

การเปลี่ยน status จากฟอร์มรายละเอียดใช้ task version เป็นเงื่อนไขหลัก และ append เข้าท้ายคอลัมน์ปลายทางตามลำดับล่าสุดใน transaction; ต้องเพิ่ม column versions เพื่อให้คำสั่งลากที่ค้างอยู่เกิด conflict แทนทับลำดับใหม่ การสร้าง/ลบ/restore งานเพิ่ม version ของคอลัมน์ที่ได้รับผลเช่นเดียวกัน

### 9.2 รายการ/งานของฉัน/ค้นหา

- รายการคอลัมน์หลัก: งาน, โปรเจกต์, ผู้รับ, สถานะ, ความสำคัญ, วันส่ง
- งานของฉันคือ current assignee_id=user.id ไม่รวมงานของคนอื่นที่ผู้ใช้สร้าง เว้นเลือก view “งานที่ฉันสร้าง”
- วันนี้ due_date=today และ status!=done; overdue ตาม BR-09; no due แยกกลุ่ม; future แยก “ถัดไป”
- search title/description/category case-insensitive; query≤100; filter รวมแบบ AND; multiple statuses/priorities รวมแบบ OR ภายใน field
- due_from/to inclusive; ไม่มีวันส่งไม่ผ่าน due filter; sort due null last แล้ว ID เป็น tie-breaker
- paginated API default 50 max 100; Kanban โหลดคอลัมน์แบบ pagination แล้ว disable reorder จนโหลดครบ หรือใช้ move anchor ที่อ้าง authoritative list; v1 ใช้ server ordered list และโหลดครบเฉพาะเมื่อ ≤500 งาน/โปรเจกต์ สำหรับเกินนั้นใช้ paginated list และ menu change-status

### 9.3 Calendar

- month grid ตามวันส่ง date-only; เลือก month/project/team/assignee/status ตามสิทธิ์
- งานไม่มีวันส่งอยู่รายการแยก ไม่สร้างวันที่สมมติ; งานหลายวันยังวางเป็น due-date item ไม่แสดง duration bar
- คลิกงานเปิด detail; วันที่วันนี้เน้นโดยไม่ใช้สีอย่างเดียว; ไม่ลากใน calendar v1

### 9.4 Comments/activity

- comment append-only 1–5000 plain-text; Idempotency-Key กันการกดซ้ำ; ไม่รองรับ mention/แชตแยก
- events มี actor/time และ before/after ของ fields ที่เปลี่ยน; status event ใช้ชื่ออ่านได้ใน UI
- password/token/setup secret ไม่เข้าสู่ task_events/admin_events; audit admin actions เก็บเฉพาะว่ามี reset ไม่เก็บค่า
- pagination comments/activity 50 max100; UI แสดงข้อมูลหลัง refresh แต่ไม่ลบร่าง comment ที่กำลังพิมพ์

### 9.5 Attachments

- allowlist เริ่มต้น: jpg/jpeg/png/webp/pdf/txt/csv/docx/xlsx/pptx/zip; ไม่อนุญาต html/svg/js/exe/bat/cmd/ps1
- 1–10 MiB ต่อไฟล์; quota 5 GiB รวม stored bytes ที่ยังไม่ purge; concurrency ตรวจ quota และ reserved bytes ก่อนรับไฟล์; release reservation เมื่อ fail
- รับ multipart form file เดียวต่อ request; stream สู่ temp file; ไม่ buffer ทั้งไฟล์ในหน่วยความจำ
- normalize filename, strip path/control characters, ชื่อแสดง≤200; storage_key random ไม่ใช้ user filename เป็น path
- validate extension + expected magic/type สำหรับ image/PDF/ZIP-based Office; TXT/CSV จำกัด valid UTF-8; ZIP/Office ไม่แตกไฟล์บน server
- allowlist ไม่ใช่ antivirus; ชุดนี้ไม่อ้างว่าสแกน malware แล้ว หากองค์กรต้องการ scanner เพิ่ม ให้เป็น integration แยกที่ไม่บังคับเสียค่า SaaS
- ดาวน์โหลด Content-Disposition attachment, nosniff, ไม่ inline executable content; ตรวจ access ทุก request
- DB insert และ file move ต้องมี recovery log/cleanup สำหรับ partial failure; orphan temp cleanup หลัง restart
- uploader หรือ Admin/owner Lead soft delete ไฟล์ได้; ตั้ง deleted_at; ไฟล์หายจาก active list/download endpoint ทันที แต่ bytes ยังอยู่30 วันและนับ quota จน purge; parent task ที่ deleted คงไฟล์จน parentpurge
- uploader/Admin/owner Lead คืนไฟล์ที่ลบได้ผ่านรายการถังขยะไฟล์ของ task ภายใน30 วัน เมื่อมี effective write access และ project/taskactive; Viewer ไม่มีสิทธิ์คืน; restore ล้าง deleted_at ไม่เปลี่ยน bytes/hash
- เมื่อ attachment ครบ30 วันให้ cleanupbytes/metadata ตาม job; filesystemfail เก็บ cleanupqueue และ retry ไม่นับว่าพื้นที่คืนจน bytes ลบจริง; no public static URL

### 9.6 Notifications/update/PWA

- เกิดเมื่อมอบหมายให้คนอื่น, comment ใหม่สำหรับ creator/assignee, status change สำหรับ creator/assignee; ไม่แจ้งผู้กระทำเอง
- assignment เปลี่ยนแจ้งผู้รับใหม่; unassign จากถอนสิทธิ์แจ้ง Admin/Lead เจ้าของ ไม่ส่งงานให้คนที่หมดสิทธิ์
- due reminder: วันก่อนส่ง/วันส่ง/เกินกำหนด; scheduler ทุก60 วินาที; dedupe `(task,recipient,type,Bangkok date)` ป้องกันซ้ำวันเดียว
- ไม่สร้าง reminder สำหรับ done/deleted/archived/unassigned/inactive/no-access
- unread badge/read one/read all; read-all เฉพาะของตน; retention 90 วัน; page size50
- polling ทุก≤10 วินาทีเฉพาะ visible online tab; ทำ request ทันทีเมื่อ focus; ไม่สัญญา realtime push หรือแจ้งเมื่อปิดเว็บ
- poll แสดง badge ว่ามีข้อมูลเปลี่ยน ถ้า modal/form dirty ไม่แทนค่าร่าง; task save ใช้ version detect conflict
- PWA manifest/icon/service worker cache **static assets เท่านั้น**; ไม่ cache API/login/user/task/file responses; offline แสดง “ต้องเชื่อมต่อเพื่อใช้งาน”; ไม่มี offline write queue

## 10. Reports / Export — SP-05

**เกี่ยวข้อง:** FR-32–34, BR-09, BR-16–17

| Metric | นิยาม |
|---|---|
| Total active tasks | จำนวนงาน not deleted ในโปรเจกต์ not archived ตาม filter/access |
| By status | จำนวนจาก current status; total ต้องเท่ากับผลรวม 4 สถานะ |
| Overdue | due_date < Bangkok today และ status!=done |
| Unassigned | assignee_id=null และ status!=done |
| Done in period | current status=done และ completed_at อยู่ในช่วง local dates ที่แปลงเป็น UTC `[start,endExclusive)` |
| Completion percentage | current done / total active filtered tasks ×100; total=0 แสดง 0% พร้อม “ไม่มีงาน” |
| Workload by assignee | current non-done counts; assignee inactive/history แสดงแยก; unassigned มีแถวเอง |

- Team filter ใช้ owner_team_id ไม่ใช้ทีมของ assignee; cross-team project จัดอยู่ทีมเจ้าของ; person filter ใช้ assignee_id
- เลือก date basis: created date, due date, completed date; UI/report/export metadata แสดงฐานที่เลือก; default created date ช่วงเดือนปัจจุบัน; completed date filter ไม่รวม non-done
- รายงานไม่คำนวณเวลาใช้ทำงาน ผลผลิต หรือประสิทธิภาพเชิงคุณภาพจากจำนวนงานโดยอ้างว่าเป็นข้อเท็จจริง
- CSV ใช้ filter/access เดียวกับ report/list, รวม ID/title/project/owner team/status/priority/assignee/start/due/category/created/completed; ไม่ export comments/file bytes/password
- UTF-8 BOM, RFC4180 escaping; ป้องกัน cell ขึ้นต้น whitespace+`= + - @` หรือ tab/CR โดย prefix apostrophe; test ด้วย Excel text behavior
- ไม่ใช้ pagination limit ของ UI ตัด CSV; stream export; cap 50,000 แถวและแจ้งชัดเมื่อเกิน ห้ามตัดเงียบ

## 11. Screen Inventory — SP-06

| Screen | Controls / states |
|---|---|
| Setup | setup token, ชื่อองค์กร, Admin username/name/password; validation, configured/invalid token |
| Login | username/password, show password, error/rate limited/session expired |
| Forced password change | รหัสชั่วคราว + รหัสใหม่; บล็อกหน้าอื่นจนผ่าน |
| My tasks | วันนี้/เกินกำหนด/ถัดไป/ไม่มีวันส่ง, filters, empty/loading/error |
| Project board | project selector, 4 columns, cards, drag handle, create task, filter/reorder-disabled |
| Task detail | fields, checklist, comments, files, history; dirty/save/pending/conflict/archived/view-only |
| Task list | filters/search/sort/pagination, accessible change status |
| Calendar | month navigation, date cells, due tasks, no-due list |
| Reports | scope/date basis/date range, metrics/grouped table, CSV |
| Notifications | unread/count/read-one/read-all; removed-access item hidden |
| Teams | team membership, lead assignment, archive team; controls ตามสิทธิ์ |
| Projects | create/edit/archive/unarchive, Editor/Viewer membership รวมข้ามทีม |
| Admin users | create/edit/deactivate/reactivate/reset; last-admin guard |
| Trash | Admin/Lead restore; deletion date/retention; no permanent-delete UI |
| Profile/settings | change password; Admin organization name; ไม่มี SMTP/AI config |

ทุกหน้า: มี loading, empty, offline/error, unauthorized/session expired; destructive action มี confirmation ระบุ resource; errors ไม่ใช้เพียง toast ที่หายก่อนอ่าน; modal focus trap/Escape/return focus; ปุ่มมี label ไม่ใช้ icon เพียงอย่างเดียว

## 12. API Contract — SP-07

### 12.1 Common rules

- Same-origin HTTPS JSON API prefix `/api`; UTF-8; request JSON max1MiB ไม่รวม attachment upload
- `Content-Type: application/json` สำหรับ JSON writes; reject mismatched type; upload multipart
- auth ด้วย cookie; protected writes ต้อง `X-CSRF-Token` + exact trusted Origin; setup/login ต้อง Origin ถูกต้อง; ไม่เปิด permissive CORS
- writes ที่สร้าง record/ย้ายบอร์ดใช้ `Idempotency-Key` UUID; TTL24h; key เดิม body ต่างตอบ409; key/body เดิมคืนผลเดิม
- PATCH resource ใช้ version; version ไม่ตรงตอบ409 พร้อม currentVersion ไม่คืนข้อมูลถ้าเสียสิทธิ์แล้ว
- HTTP 400 syntax, 401 unauthenticated, 403 operation denied, 404 resource absent/no project access, 409 conflict, 413 oversize, 422 business validation, 429 rate limited, 503 DB lock timeout/deadlock retries exhausted/service not ready
- Error format: `{ "error": { "code": "VERSION_CONFLICT", "message": "ข้อมูลถูกแก้ไขแล้ว", "fieldErrors": {}, "requestId": "..." } }`
- List response: `{ "items": [], "page": 1, "pageSize": 50, "total": 0 }`; cursor อาจใช้แทนสำหรับ activity แต่ต้องระบุ implementation ก่อนเริ่ม frontend
- GET ห้าม mutate business state; reminder/cleanup เป็น scheduler ไม่ทำใน state read

### 12.2 Endpoints

| Method / Route | Payload/filter | Permission / response |
|---|---|---|
| GET /api/meta | — | Public: setupRequired/version |
| POST /api/setup | token, organization_name, username, display_name, password | เฉพาะ initial setup; 201 |
| POST /api/login | username,password | Public+origin+rate limit; user/csrf + cookie |
| GET /api/me | — | Auth: user/effective summary/csrf/must_change_password |
| POST /api/session/activity | — | Auth+CSRF; update intentional activity |
| POST /api/logout | — | Auth+CSRF; 204 |
| POST /api/password | current_password,new_password | Own; rotate/revoke sessions |
| GET /api/users | page,q,active | Admin directory |
| POST /api/users | username,display_name,temp_password,org_role | Admin; 201 |
| PATCH /api/users/{id} | display_name,active,org_role,version | Admin; last-admin guard |
| POST /api/users/{id}/reset-password | admin_password,temp_password | Admin; must change+revoke |
| GET /api/directory | q,page | Admin/Lead only active display names+team names |
| GET /api/teams | includeArchived | Visible own teams; Admin all |
| POST /api/teams | name,description | Admin; 201 |
| PATCH /api/teams/{id} | name,description,archived,version | Admin |
| PUT /api/teams/{id}/members/{userId} | team_role | Admin |
| DELETE /api/teams/{id}/members/{userId} | — | Admin; access cleanup |
| GET /api/projects | team,includeArchived,page | Access-filtered |
| POST /api/projects | owner_team_id,name,description | Admin/Lead |
| PATCH /api/projects/{id} | name,description,archived,version | Admin/owner Lead |
| GET /api/projects/{id}/members | — | Project read; scoped member names |
| PUT /api/projects/{id}/members/{userId} | access editor/viewer | Admin/owner Lead |
| DELETE /api/projects/{id}/members/{userId} | — | Admin/owner Lead; access cleanup |
| GET /api/tasks | q,team,project,assignee,status[],priority[],category,due_from,to,date_basis,date_from,to,sort,page,pageSize | Project-access filtered |
| POST /api/tasks | §8.1 fields except version/status | Project write+idempotency;201 |
| GET /api/tasks/{id} | — | Project read; task/subtask counts |
| PATCH /api/tasks/{id} | allowed fields+version | Write; completion/recurrence transaction |
| DELETE /api/tasks/{id} | version | Creator or Admin/Lead; soft delete |
| GET /api/trash | project,page | Admin/Lead scopes only |
| POST /api/tasks/{id}/restore | version | Admin/Lead; within retention |
| GET /api/projects/{id}/board | — | Ordered columns + versions |
| POST /api/projects/{id}/board/move | §9.1 contract | Write+idempotency; atomic move |
| POST /api/tasks/{id}/subtasks | title | Write; reject if parent done |
| PATCH /api/subtasks/{id} | title/done,version | Write; parent status guard |
| DELETE /api/subtasks/{id} | version | Write; parent guard |
| GET /api/tasks/{id}/comments | page | Read; scoped |
| POST /api/tasks/{id}/comments | body | Write+idempotency;201 |
| GET /api/tasks/{id}/attachments | includeDeleted=true เฉพาะ writer; defaultfalse | Read active metadata; deleted listing เฉพาะ uploader/Admin/Lead ที่ยังมีสิทธิ์คืน |
| POST /api/tasks/{id}/attachments | multipart file | Write+quota/type checks;201 |
| GET /api/attachments/{id}/download | — | Parent project read, force attachment |
| DELETE /api/attachments/{id} | — | Uploader or Admin/Lead; soft delete30 วัน |
| POST /api/attachments/{id}/restore | — | Uploader/Admin/ownerLead ที่มี write และ task/projectactive;คืนภายใน30 วัน |
| GET /api/tasks/{id}/events | page | Read; scoped |
| GET /api/notifications | unread,page | Own+current project access |
| POST /api/notifications/{id}/read | — | Own |
| POST /api/notifications/read-all | — | Own |
| GET /api/reports/summary | task filters+date basis | Read scoped aggregates |
| GET /api/export/tasks.csv | same filters | Read scoped streaming CSV |
| GET /api/organization | — | Auth: name/timezone |
| PATCH /api/organization | name,version | Admin |
| GET /health/live | — | Public: status only |
| GET /health/ready | — | Proxy/local restriction; DB/storage readiness only |

### 12.3 Example create task

```json
{
  "project_id": 12,
  "title": "เตรียมรายงานประจำสัปดาห์",
  "description": "รวบรวมงานของโปรเจกต์และตรวจยอด",
  "category": "รายงาน",
  "priority": "high",
  "assignee_id": 7,
  "start_date": "2026-10-05",
  "due_date": "2026-10-09",
  "recurrence": "weekly"
}
```

Response `201`: `{ "item": { "id": 101, "version": 1, "status": "todo", "...": "fields ตาม task DTO" } }`; DTO ไม่คืน password, token, storage path หรือ internal permissions ของโปรเจกต์อื่น

### 12.4 Example board move

```json
{
  "task_id": 101,
  "task_version": 3,
  "from_status": "todo",
  "to_status": "doing",
  "source_column_version": 5,
  "target_column_version": 8,
  "before_task_id": 203
}
```

ถ้า before_task_id=null ให้ append; หาก column เปลี่ยนไปแล้วตอบ409 และไม่มี partial move; PUT/PATCH ทั่วไปที่เปลี่ยน status ต้องใช้ ordering transaction เดียวกันเพื่อไม่ทำ tasks.status กับ board_positions ขัดกัน

## 13. Security / Operational Specifications — SP-08

**เกี่ยวข้อง:** NFR-01–08, FR-37–40

### 13.1 Security

- ทุก query parameterized; explicit request field allowlist; escape display text; CSP ไม่อนุญาต inline script/unsafe-eval; ไม่มี arbitrary HTML
- headers: nosniff, frame-ancestors none, referrer-policy same-origin; HTTPS production ใช้ HSTS เมื่อ proxy/domain พร้อม
- cookie settings และ trusted Origin ต้องสอดคล้องกัน; ห้ามใช้ Host/X-Forwarded-Host ที่ไม่ตรวจสอบสร้าง trusted origin
- Path traversal/download IDOR tests ครอบคลุม attachments; secret/file paths ไม่อยู่ response
- limit request/upload size, rate limits และ timeouts; log error ใช้ requestId และ redaction; login/password/upload content ไม่บันทึก
- runtime/library pin versions และส่ง license inventory; patch process มี backup/migration/rollback
- Service account สิทธิ์เท่าที่จำเป็น; source อ่านได้ data เขียนได้; data ไม่อยู่ wwwroot

### 13.2 Reliability/concurrency

- Tasks + board + recurrence + audit + notifications ใน transaction เดียว; columns/version ต้องตรง
- SQL Server lock timeout5000ms/request timeout15000ms; deadlock/lock retry ตาม§5.1; เมื่อไม่สำเร็จตอบ503/Retry-After หลัง rollback ไม่มี partial commit
- scheduler instance เดียว; dedupe DB constraints กัน reminder ซ้ำเมื่อ restart
- jobs ทำ catch-up reminder ปัจจุบันเมื่อ startup; ไม่สร้าง reminder ทุกวันที่ server ปิดย้อนหลัง
- ทุก upload/backup temporary file มี lifecycle cleanup; startup recovery ไม่ลบไฟล์ referenced

### 13.3 Performance acceptance

- dataset: 30 users, 6 teams, 20 projects, 10,000 tasks, 20,000 comments, sample attachments ไม่เกิน quota
- workload: 15 active sessions mixed role; 10 minutes หลัง warmup; read/write70/30; exclude actual file-transfer duration
- เป้าหมาย read p95≤2s write p95≤3s, error rate<1% excluding deliberate validation/conflict; polling updates≤10s เมื่อ online/visible
- เริ่มประเมินบนเครื่องอย่างน้อย2 logical CPU,4GB RAM,SSD; สเปกนี้เป็นเครื่องทดสอบเสนอ ไม่ใช่หลักฐานว่าสเปก Server จริงเพียงพอ
- แยก test cold startup, pagination, CSV และ board reorder concurrency; บันทึก OS/runtime/spec/version และผลจริง ไม่รับรองก่อนทดสอบ

### 13.4 Backup/restore

1. Maintenance mode หยุดรับ writes และหยุด scheduler; รอ active requests/uploads จบ
2. ใช้ SQL Server `BACKUP DATABASE ... WITH COPY_ONLY, CHECKSUM` เป็น .bak และ copy uploads ภายใต้ app write freeze; SQL service account ต้องเขียน backup path ได้ (อาจคนละ host กับ app); รวบรวม .bak+uploads+manifest SHA-256 เป็น snapshot คู่กัน
3. บันทึก schema/app version, timestamp, file count/checksum; ไม่รวม plaintext .env/password/secrets ใน deliverable
4. เปิด writes เมื่อ snapshot เสร็จ; ถ้า fail ต้อง exit nonzero และไม่เขียนว่า backup สำเร็จ
5. สำรองรายวันผ่าน Windows Task Scheduler; retention7daily+4weekly เป็นค่าแนะนำ; เก็บอย่างน้อยอีก disk/location ที่องค์กรจัดให้
6. Restore ขณะ application หยุด: ตรวจ manifest hashes; `RESTORE VERIFYONLY WITH CHECKSUM` เป็นการตรวจประกอบ ไม่แทน actual restore; ใช้ RESTORE DATABASE ลง database ทดสอบ/เป้าหมายที่ผู้ติดตั้งระบุอย่างชัดเจน (ห้าม overwriteDB อื่นโดย default), restore uploads คู่กัน, migrate เมื่อรองรับ, revoke sessions ทั้งหมด, ทดสอบ permissions/download ก่อนเปิด
7. เป้าหมาย RPO24h/RTO4h ต้องวัดจริง; การมี script อย่างเดียวไม่ถือผ่าน AT-25

### 13.5 Packaging/deployment

- ZIP source ไม่มี node_modules, live DB/uploads, .env, sessions, logs, test credentials
- รวม README ไทย, env.example, runtime version, package/lockfile ถ้ามี, migrations, Windows start/service/backup scripts, tests, license inventory
- Local quick start ต้องตั้ง Admin ด้วย one-time setup; sample data ใช้คำสั่งแยกและห้ามรัน production อัตโนมัติ
- Windows คู่มือมี runtime install, service account, data ACL, IIS/proxy, HTTPS, origin/cookie, restart/start-on-boot, logs, backup, upgrade/rollback
- ผู้ใช้นำ deploy เอง; ไม่สั่งเผยแพร่เว็บไซต์หรือปรับ DNS/Server จริงในขั้นเอกสาร

## 14. Acceptance Tests / UAT

เตรียม fixture: Admin A; Lead L1 ทีม1/L2 ทีม2; Member M1 ทีม1/M2 ทีม2; Viewer V; โปรเจกต์ P1 ทีม1/P2 ทีม2/Pshared ทีม1 ที่ M2 เป็น Editor; Pprivate ที่สมาชิกทีม1 ไม่ได้รับ membership

| ID | ขั้นตอน/กรณี | Expected result | Trace |
|---|---|---|---|
| AT-01 | เปิดระบบใหม่/setup token ผิด/ถูก/ใช้ซ้ำ | ผิด403;ถูก201;ใช้ซ้ำ409;ไม่มี default account | FR-01 |
| AT-02 | Login ผิด, rate limit, logout, cookie reuse | ข้อความกลาง;429 ตาม limit;logout แล้ว401 | FR-02,NFR-02 |
| AT-03 | Admin สร้าง/reset user แล้วเรียก task API ก่อนเปลี่ยนรหัส | บังคับเปลี่ยน;เปลี่ยนแล้วใช้ได้;session เก่าถูก revoke | FR-03–04 |
| AT-04 | demote/deactivate Admin คนสุดท้ายรวม concurrent requests | อย่างน้อยหนึ่ง active Admin;transaction ไม่เปิดช่องว่าง | FR-03,BR-02 |
| AT-05 | M1 ดู Pprivate/P2 ผ่าน ID,search,report,CSV,fileURL | ไม่เห็นรายการ;resource404;ไม่มีข้อมูลรั่ว | FR-05,FR-10 |
| AT-06 | เพิ่ม M1 หลายทีม/Lead เฉพาะทีม1 | สิทธิ์แต่ละทีมไม่ยกระดับข้ามทีม | FR-06–08 |
| AT-07 | L1 เพิ่ม M2 ใน Pshared เป็น Editor และ V เป็น Viewer | M2 เขียนได้เฉพาะ Pshared;V อ่านได้แต่ write403 | FR-09–10 |
| AT-08 | ถอน M2 จาก Pshared ขณะเปิด detail และมีงานค้าง | request ใหม่404;UI ถัดไปปิด access;งานค้าง unassign;notifications ไม่รั่ว | FR-11 |
| AT-09 | สร้างงานข้อมูลผิด/ไม่มีผู้รับ/ผู้รับ Viewer/วันเริ่มเกินวันส่ง | validate field ชัด;ไม่มีผู้รับได้;Viewer/วันผิด422 | FR-12–14 |
| AT-10 | งาน checklist ไม่ครบ→done;ติ๊กครบ→done;untick ตอน done | ครั้งแรก422 ไม่มี partial;ครบสำเร็จ;untick ถูกบล็อกจน reopen | FR-15 |
| AT-11 | งานซ้ำ daily/weekly/monthly,Jan31→Feb→Mar | +1/+7;monthly กลับ Mar31 ตาม anchor;ไม่ copyfiles/comments | FR-16 |
| AT-12 | done งานซ้ำพร้อมกัน/retry/reopen แล้ว done ใหม่ | successor เพียงหนึ่ง;ไม่มี duplicate หรือ half transaction | FR-16,FR-18 |
| AT-13 | delete/restore/retentionpurge และ parentfiles | activehidden;คืนลำดับท้าย;purge ลบ bytes+DB สัมพันธ์ | FR-17 |
| AT-14 | สองคนแก้ task version เดียวกัน | คนหนึ่งสำเร็จ อีกคน409 ไม่ทับเงียบ | FR-18 |
| AT-15 | My tasks วันนี้/overdue/null และ Bangkok ใกล้เที่ยงคืน | วันไม่เลื่อนจาก UTC;วันนี้ไม่ overdue;null อยู่กลุ่มตน | FR-19–20 |
| AT-16 | ลากข้ามคอลัมน์/จัดลำดับ/refresh | status+rank บันทึกและคงหลัง reload;versions เพิ่ม | FR-21–22 |
| AT-17 | boardmove ขณะ offline/403/409 และ samecolumnconcurrent | rollbackUI;โหลดล่าสุด;DB ไม่ partial;ไม่มี rank ซ้ำ | FR-18,FR-21–22 |
| AT-18 | filteredboard drag + keyboard/touchalternative | filter ปิด reorder;menu/keyboard ใช้ได้;touchscroll ไม่เสีย | FR-23,NFR-05 |
| AT-19 | tasklist/calendar มีวันส่ง/ไม่มีวันส่ง/filter หลายตัว | รายการกับปฏิทินสอดคล้อง;ไม่มีวันไม่กลายเป็นวันนี้ | FR-24–25 |
| AT-20 | คนอื่นแก้งานขณะ user มี dirtyform | เห็น update≤10s;ร่างไม่หาย;saveconflict ชัด | FR-26 |
| AT-21 | commentHTML/script/กดซ้ำ/ลองแก้ audit | rendertext;key ซ้ำไม่เพิ่ม;แก้ audit ไม่ได้ | FR-27,FR-29 |
| AT-22 | upload10MiB/เกิน/extension ปลอม/pathtraversal/quota race | valid ได้;เกิน413;invalid422;quota ไม่เกิน;ไม่หนี data directory | FR-28,NFR-02 |
| AT-23 | notificationassignment/comment/status/remindertwice/readone/all | recipient ถูก;ไม่แจ้ง self;dedupe;read เฉพาะตน;ไม่ใช้อีเมล | FR-30–31 |
| AT-24 | reportdatebasis/reopen/CSV ไทยและ formula | metric ตามนิยาม;reopen ไม่ done;filtermatch;CSV ไม่รัน formula | FR-32–34 |
| AT-25 | backup ระหว่างมีงาน/restore เครื่องทดสอบ/restart | snapshotDB/files ตรง;checksums ผ่าน;sessionsrevoke;ข้อมูลอยู่หลัง restart | FR-38,NFR-03–04 |
| AT-26 | เปิด PWAoffline/logout แล้วเปิด cache | static shell ได้;ไม่เห็น task/API/filecache;บอกต้อง online | FR-35–36 |
| AT-27 | performancefixture/loadtest ตาม§13.3 | ผล p95/error/update ผ่านหรือระบุสิ่งที่ไม่ผ่านพร้อมสเปกจริง | NFR-01 |
| AT-28 | freshWindowsinstall จาก ZIP/env/one-timesetup | run ได้ตามคู่มือ;ไม่มี secret;service/HTTPS ตามสิทธิ์ที่มี | FR-37,FR-39–40 |
| AT-29 | archivedproject ลองแก้ task/comment/upload/recur | อ่านได้;writes ถูกปฏิเสธ;unarchive คืนใช้งาน | FR-09,BR-14 |
| AT-30 | CSRF/noOrigin/spoofproxy/XSS/SQLi/fileIDOR | requests ไม่ปลอดภัยถูกบล็อก;ไม่มี secret/ข้ามสิทธิ์ | FR-05,NFR-02 |

Unit/integration tests เน้นธุรกรรมและสิทธิ์; UI/UAT เน้น interaction/touch/accessibility; tests ที่ยืนยันได้ใน local ไม่ถือว่าผ่าน Windows จริงจนรันทดสอบบน Windows

นอกเหนือจาก AT-01–30 ให้มี checklist การทดสอบ browser รุ่นเป้าหมาย, session idle/absolute expiry, role revocation, startup recovery ของไฟล์ค้าง และ migration จาก schema ก่อนหน้า บันทึกผลเป็น evidence ของ NFR ที่เกี่ยวข้อง

## 15. Requirements Traceability

| Requirements | Specification | Acceptance |
|---|---|---|
| FR-01–04 | SP-01 §6 | AT-01–04 |
| FR-05 | §4,SP-07,SP-08 | AT-05,AT-08,AT-30 |
| FR-06–11 | SP-02 §7 | AT-06–08,AT-29 |
| FR-12–18 | SP-03 §8 | AT-09–14 |
| FR-19–20 | SP-04 §9.2 | AT-15 |
| FR-21–23 | SP-04 §9.1 | AT-16–18 |
| FR-24–26 | SP-04 §9.2–9.3,§9.6 | AT-19–20 |
| FR-27–29 | SP-04 §9.4–9.5 | AT-21–22 |
| FR-30–31 | SP-04 §9.6 | AT-23 |
| FR-32–34 | SP-05 §10 | AT-24 |
| FR-35–36 | SP-06,§9.6 | AT-18,AT-26 |
| FR-37–40 | SP-08 §13 | AT-25,AT-28 |
| NFR-01 | §13.3 | AT-27 |
| NFR-02 | §6,§9.5,§12,§13.1 | AT-02,AT-05,AT-22,AT-30 |
| NFR-03 | §8,§9.1,§13.2 | AT-12,AT-14,AT-17,AT-25 |
| NFR-04 | §13.4 | AT-25 |
| NFR-05–06 | §9.1,§11 | AT-18,AT-26,AT-28 |
| NFR-07–08 | §3,§13.5 | AT-25,AT-28 + license/config review |

## 16. Definition of Ready / Done

**Ready สำหรับเริ่มพัฒนา:** Baseline 1.1 และ R-01–R-04 ยืนยันแล้ว; ใช้ stack §3.4/SQL Server 2022; T-003/T-005 ต้องล็อก DTO/package versions/migrations/test setup ให้ครบ; Edition/credentials/service permissions ตรวจก่อน deploy ไม่ขวาง coding ที่ทดสอบกับ SQL Server2022local ได้

**Done สำหรับส่งโค้ด:** FR ใน approvedscope ทำงานจริง; AT ด้านสิทธิ์/ธุรกรรม/backup ที่เป็น critical ผ่าน; มี freshinstall และ migrationtest; UI หลักผ่าน UAT; ไม่มีข้อมูลจริง/secrets ใน ZIP; README/license/config ครบ; รายงาน Windows/performance ที่ยังไม่ทดสอบระบุชัด ไม่เรียก production-ready หากยังไม่ผ่าน deployment/UAT จริง

## 17. Change Log

| Version | วันที่ | รายละเอียด |
|---|---|---|
| 1.0 | 2026-10-05 | ร่าง SRS แรก; permission matrix, data model, API, Kanban concurrency, recurrence, retention และ30 acceptance scenarios |
| 1.1 | 2026-10-05 | เจ้าของระบบยืนยันกติกา; R-01–R-04 resolved; SQL Server2022/mssql; filetrash/restore30วัน; coding/testsยังไม่ผ่าน |
