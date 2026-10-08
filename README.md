# FridayManagement

แอปภายใน React/TypeScript/Vite + Express5/TypeScript บน **Node.js22.23.3 / npm10.9.9** มี source และหลักฐาน local สำหรับ setup/login, ทีม/โปรเจกต์, งาน/Checklist/recurrence, Table/Gantt/Calendar/Kanban, ความคิดเห็น/ไฟล์/แจ้งเตือน, รายงาน/CSV และ backup/restore แล้ว ยังเป็น **candidate / IN_PROGRESS**: SQL Server2022/Windows/full acceptance/human UAT ยัง NOT_RUN และ production startup ยังปิด Fresh database ที่ยังไม่ setup คืน `/health/ready`503; ผล local ไม่ใช่ production sign-off

SQLite เป็น local development ชั่วคราว; Windows ปลายทางยังใช้ SQL Server2022 เจ้าของติดตั้งเอง ไม่มี AI/อีเมล/cloud/CDN จำเป็น และไม่มีการ deploy/DNS/server changes

## เริ่มจาก source ใหม่

เลือก Node22.23.3 เฉพาะโปรเจกต์นี้ตาม `.nvmrc` ไม่เปลี่ยน default runtime ของโปรเจกต์อื่น จากนั้น:

```sh
npm ci --ignore-scripts
export NODE_ENV=development
export DB_PROVIDER=sqlite
export DATA_DIR=/private/tmp/friday-local-data
export LOG_DIR=/private/tmp/friday-local-logs
export SQLITE_DB_PATH=/private/tmp/friday-local-data/friday.sqlite
export PORT=43171
export APP_ORIGIN=http://127.0.0.1:43171
export COOKIE_SECURE=false
npm run typecheck
npm run build
npm run migrate:sqlite
npm start
```

เปิด `http://127.0.0.1:43171` เพื่อสร้าง Admin คนแรกผ่านหน้า setup เลือก PORT ว่างและ APP_ORIGIN ให้ตรงกัน; ไม่หยุดโปรเจกต์อื่นเมื่อพอร์ตชน `Ctrl+C` หยุดแอป รัน `npm run dev` สำหรับหน้าเว็บที่ `http://127.0.0.1:5173` พร้อม API ตาม PORT; สำหรับ dev ผ่าน Vite ให้ตั้ง APP_ORIGIN=http://127.0.0.1:5173

PowerShell ใช้ `$env:NODE_ENV="development"`, `$env:DB_PROVIDER="sqlite"`, `$env:DATA_DIR="C:\FridayLocalData"`, `$env:LOG_DIR="C:\FridayLocalLogs"`, `$env:SQLITE_DB_PATH="C:\FridayLocalData\friday.sqlite"`, `$env:PORT="43171"`, `$env:APP_ORIGIN="http://127.0.0.1:43171"`, `$env:COOKIE_SECURE="false"` แล้วรัน npm ตามเดิม ตัวอย่างนี้ยังไม่ใช่หลักฐานทดสอบ Windows

`.env.example` เป็นรายการอ้างอิง ไม่ถูกโหลดอัตโนมัติ เก็บ config/secret จริงนอก checkout/webroot และส่งเป็น environment ให้ process ทั้ง start/dev/migrate/seed ต้องระบุ DATA_DIR/LOG_DIR/DB_PROVIDER และ SQLITE_DB_PATH สำหรับ local ก่อนเริ่ม ทุก key ตรวจตาม [Configuration contract](TeamFlow_Configuration.md) ค่าไม่ถูกต้องหยุดก่อนเปิด HTTP และแสดงเฉพาะชื่อ key ไม่มีการสร้าง DB/seed/jobs อัตโนมัติจาก start/dev/build; startup ตรวจ ledger/checksum ของ DB ที่มีอยู่ก่อนเปิด HTTP

`NODE_ENV=production` ยังเปิดแอปไม่ได้แม้ configuration ถูกต้อง; `/health/ready` คง503จน business/schema/auth พร้อม T-006 มี guard กันเปิดซ้ำและไม่มี provider fallback; ผล SQL2022 จริงยัง NOT_RUN

## SQLite local migration และข้อมูลตัวอย่าง

กำหนด absolute paths นอก source/build/webroot โดย DB อยู่ภายใน DATA_DIR ตัวอย่างบน macOS/Linux:

```sh
export NODE_ENV=development
export DB_PROVIDER=sqlite
export DATA_DIR=/private/tmp/friday-local-data
export LOG_DIR=/private/tmp/friday-local-logs
export SQLITE_DB_PATH=/private/tmp/friday-local-data/friday.sqlite
npm run migrate:sqlite
npm run sample-data:sqlite -- --confirm-local-fixture
```

PowerShell ใช้ `$env:NODE_ENV="development"`, `$env:DB_PROVIDER="sqlite"`, `$env:DATA_DIR="C:\FridayLocalData"`, `$env:LOG_DIR="C:\FridayLocalLogs"`, `$env:SQLITE_DB_PATH="C:\FridayLocalData\friday.sqlite"` แล้วใช้สองคำสั่ง npm เดิม ไม่มีการติดตั้ง service หรือเปลี่ยนเครื่องโดยอัตโนมัติ

migration มี `0000_foundation.sql` (ledger เดิมไม่แก้ checksum) และ `0001_business_schema.sql` (24 business/support tables รวม rate-limit buckets) ตาม [Database schema](TeamFlow_Database_Schema.md); รันซ้ำไม่เพิ่ม version และ checksum/sourceหาย/versionซ้ำต้องล้มเหลว ไม่มี organization/user/default password จาก migration สร้างเฉพาะ storage_quota counter เริ่มต้น ส่วน sample-data ต้องเรียกเองและสร้างแค่ synthetic `foundation_sample`

SQLite driver ใช้ `node:sqlite` ของ Node22.23.3 ที่ pin ไว้ เป็น experimental API และใช้ synchronous connection เฉพาะ local ชั่วคราว [Node22 documentation](https://nodejs.org/docs/latest-v22.x/api/sqlite.html) ผล local ไม่แทน SQL Server concurrency/backup/Windows acceptance

## SQL Server แยกจาก local

`npm run migrate:sqlserver` ใช้เฉพาะ provider sqlserver และ DB_SERVER/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD จาก environment; ไม่ fallback SQLite ตั้ง encrypted connection และไม่ trust self-signed certificate โดยอัตโนมัติ T-006 ตรวจ config/TLS/timeouts/paths ก่อนเชื่อมต่อ; migration privilege/edition/build/schema ยังต้องตรวจบน SQL2022 จริงใน T-007; T-SQL business schema มีแล้วแต่ยังไม่รันบน SQL2022 จริง

```sh
npm run test:sqlserver
```

ถ้ายังไม่ตั้ง isolated SQL2022 จะ SKIP พร้อม **NOT_RUN** และไม่อ้าง PASS ต้องกำหนด `RUN_SQLSERVER_TESTS=1`, `NODE_ENV=test`, `DB_PROVIDER=sqlserver`, DB_NAME ลงท้าย `_test` พร้อม credentials ของ fixture DB แยก จึงจะสร้าง/ลบเฉพาะ scratch tables แบบสุ่มและรัน commit/rollback จริง ห้ามใช้ production DB SQL2022 harness 18 กรณี (foundation1 + guard1 + schema11 + helpers5) ยัง NOT_RUN; ผล mock lifecycle ไม่แทนการเชื่อมต่อจริง

## ตรวจคุณภาพ

```sh
npm run lint
npm test
npm run test:sqlite
npm run check:contract
npm run check:test-plan
npm run licenses
```

`npm test` รวม config/startup/guard, schema และ foundation (SQLite/HTTP), frontend logic, T-003 contract และ T-004 planning tests; `test:sqlite` รวม foundation HTTP loopbackด้วย แต่ไม่รวม SQL Server `npm run verify:checkout` ตรวจสำเนาsourceใหม่ด้วยoffline npmcacheที่มีแพ็กเกจครบ กำหนด FRIDAY_NPM_CACHE หากแยกcache; ลบสำเนา/fixtureหลังตรวจ `npm run test:ui` ใช้ Playwright Chromium หลัง build ต้องติดตั้ง browser ก่อนด้วย `npx playwright install chromium`; สามารถกำหนด PLAYWRIGHT_BROWSERS_PATH นอกโปรเจกต์เพื่อแยก cache ได้ Browser smoke ใช้พอร์ต43171แยกจากแอปอื่น ปรับได้ด้วย FRIDAY_TEST_PORT และไม่ปิด supported browser matrix หรือ UAT

TypeScript strict/typecheck ครอบคลุม server/frontend/tools/tests; ESLint/Prettier อยู่ใน scripts ไม่มี test credentials/live DB/uploads/logs ใน source

## โครงสร้างและสัญญา

| ตำแหน่ง | หน้าที่ |
|---|---|
| frontend | หน้า React และ browser shell |
| src/api | Express bootstrap, guarded local feature APIs, liveness/readiness |
| src/domain | Provider-independent transaction/effect ports; ไม่มี HTTP/storage dependency |
| src/repository/sqlite, sqlserver | Adapter แยก provider; bound parameters; transaction/effects ร่วมกัน |
| migrations/sqlite, sqlserver | Versioned SQL แยก dialect; ledger เริ่มต้น |
| src/jobs | ขอบเขต jobs; ยังไม่เริ่ม timers |
| scripts | dev/build checks/migrate/explicit fixture/license tooling |
| tests | foundation/provider/browser/contract/planning harness แยกผล |

สัญญา: [API/DTO](TeamFlow_API_Contract.md), [OpenAPI](contracts/openapi.json), [test/release policy](TeamFlow_Test_Release_Manifest.md), [manifest](tests/test-manifest.json), [licenses](dependencies/LICENSES.md)

เมื่อแก้ API authoring source ใช้ `npm run build:contract`; เมื่อแก้ test policy/approved tables ใช้ `npm run build:test-plan` แล้วตรวจชุดที่เกี่ยวข้อง `tests/execution-records.json` ยังไม่มี full TC/AT/RV/UAT/release results; foundation evidence แยกในรายงาน T-005 ไม่ปิด acceptance ที่ยังขาด

T-006/T-007 High IN_PROGRESS pending real SQL2022; T-012 Medium DONE for shell/navigation. T-008 High local helpers IN_PROGRESS under approved SRS5.2; full dependency/sign-off remains pending. Next local T-009 High. SQLite evidence cannot close SQL2022/Windows/UAT.

`npm run test:schema` ใช้ SQLite file จริง พร้อม constraints/migration/reopen/atomic effects และ pure date/row codecs; รวมใน `npm test`. SQL schema harness ใช้ operator test credentials บน DB_NAME ลงท้าย `_test` แต่ละ case สร้าง randomized `friday_t007_*` schema แยกจาก dbo แล้วลบ FK/table/schema ใน finally ต้องมี CREATE SCHEMA/table/constraint permissions; ไม่สร้าง/ลบ database หรือเปลี่ยน server การอัปเกรดจากก่อน T-007 ใช้ ledger/foundation fixture ไม่ใช่การย้ายข้อมูล SQLite ขึ้น SQL Server

Frontend T-012: /api/me ยัง503 จน auth พร้อม; หน้า business เป็น placeholders. API client รักษา caller draft/no auto retry และ offline writes ไม่ส่ง/ไม่ queue. Role fixtures ใช้เฉพาะ tests ไม่ใช่ real ACL proof; ดู TeamFlow_T012_Test_Report.md.

## T-008 local helpers - 2026-10-06

`npm run test:helpers` checks dates/lifecycle/retry/SQL-driver synthetic policy and actual SQLite file fixtures. SQL provider cases use `test:sqlserver`; 18cases currently NOT_RUN. T-008 IN_PROGRESS under SRS5.2 local profile; dependency/sign-off still pending SQL2022. 0002 migration corrects legacy blocked to locked review without editing applied checksums. See TeamFlow_T008_Test_Report.md. Next local task T-009 High; DONE6/77, IN_PROGRESS3, remaining71. This update supersedes the preceding T-012 handoff readiness snapshot.

## T-009 middleware - 2026-10-06

`npm run test:api` checks actual HTTP ingress/errors/headers with synthetic session/permission hooks plus SQLite parameter binding. All50 API routes use locked schemas through the Zod boundary; 2health routes preserve their contract. Ajv/ajv-formats are pinned runtime dependencies; deliver contracts/validate.mjs and contracts/openapi.json alongside built server and run from project root. Do not expose source/contracts as static webroot.

Known valid API requests still return503 until real feature handlers/session/ACL are ready; no local test identity is available in product UI. Upload streaming is deferred to T-041/T-042. Task PATCH merged-state validation belongs inside the feature transaction. See TeamFlow_T009_Test_Report.md; this supersedes prior handoff snapshots. T-009 IN_PROGRESS; DONE6/77, IN_PROGRESS4, remaining71; next local T-010 High. Fresh-copy validation now includes omit-dev install/start for runtime packaging.


## T-013 ตั้งค่าครั้งแรก — 2026-10-06

หลัง `npm run migrate:sqlite` และ `npm start` เมื่อยังไม่มี user แอปแสดง setup token แบบสุ่ม256-bit เฉพาะ console ผู้ติดตั้ง ใช้กรอกหน้าเว็บพร้อมชื่อองค์กร/username/display name และรหัสผ่าน12–128 Unicode scalars (เก็บช่องว่างตามที่กรอก) ไม่มีบัญชีหรือรหัสผ่านเริ่มต้น Token ไม่อยู่ใน `/api/meta`, HTTP reply, DB หรือ application JSON logs และเปลี่ยนทุก restart ก่อน setup สำเร็จ เปิด console ผู้ติดตั้งเพื่ออ่าน token โดยไม่บันทึก/เผยแพร่ console transcript ที่มี token

สำเร็จสร้าง organization/Admin/audit/view revision ใน transaction เดียว พร้อม password hash async scrypt และไม่เข้าสู่ระบบอัตโนมัติ คำขอพร้อมกันสร้าง Admin ได้ชุดเดียว; token ผิด403, สำเร็จ201, ทำซ้ำ409 จำกัดการลอง10ครั้งต่อIP/15นาทีใน DB และ hash พร้อมกัน4งาน (ไม่มีคิวรอ; เต็มคืน503) เมื่อผลไม่แน่นอนหน้าเว็บตรวจ `/api/meta` แล้วให้กรอก credentials ใหม่เฉพาะเมื่อยังต้อง setup โดยไม่ส่ง password ซ้ำอัตโนมัติ

เมื่อไม่มีไฟล์ DB จะเปิดเฉพาะ shell เดิม; ยังไม่มี setup endpoint พร้อมใช้งาน เมื่อมี DB ที่ migration/checksum ไม่ครบจะหยุด startup โดยไม่ apply migration เอง `sample-data:sqlite` สร้างเฉพาะ foundation fixture ไม่มีบัญชีหรือ application tasks; setup จะยังจำเป็นเมื่อ users ว่าง หน้าจอ/login/session จริงต่อใน T-014/T-017; `/health/ready` ยัง503 และ production startup ยังปิด

`npm run test:setup` 17/17 + frontend19/19; combined233/233 + Chromium7/7 PASS รวม setup จริง2กรณีบน SQLite แยก Browser shell อีก4กรณีใช้ synthetic Self SQL46SKIP/NOT_RUN (เพิ่ม setup8), SQL2022/Windows/browser matrix/UAT ยังต้องทดสอบ ดู [รายงาน T-013](TeamFlow_T013_Test_Report.md) และ [fresh source evidence](reports/T-013-fresh-checkout.json) สถานะล่าสุด DONE6/77, IN_PROGRESS7, TODO64, remaining71; ต่อ T-014 High ข้อความนี้แทน handoff snapshot ก่อนหน้า


## T-014 API login/session — 2026-10-06

หลัง setup เรียก POST `/api/login` ด้วย username/password และ exact APP_ORIGIN ได้ Self พร้อม cookie `friday_session` แบบ HttpOnly/SameSite=Strict/Path=/; Secure ตาม config ของ HTTPS และไม่ใช้ Domain Usernameไม่แยกASCIIตัวใหญ่/เล็ก รหัสผ่านไม่ trim; creation12–128 scalars และ CurrentPassword1–128 ตาม locked contract ไม่มี plaintext/raw session token ใน DB/application logs

GET `/api/me` อ่าน Self ปัจจุบันและไม่ต่อ idle; POST `/api/session/activity` ต้อง Origin/CSRF และต่อ idle ก่อนหมดอายุเท่านั้น POST `/api/logout` revoke current session และ clear cookie หลัง transaction commit คำขอหมดอายุ/revoked401 clear cookieด้วย Session absolute12h/idle60m หรือค่าที่สั้นกว่าตาม validated config; login สำเร็จไม่ปลด rate10/username30/IP15min และ restartไม่ล้าง buckets Hash/verifyร่วมกันไม่เกิน4งาน ไม่มีคิวรอ; เต็มคืน503 ไม่มีการ retry credentials อัตโนมัติ

`revokeUserSessions` เป็น primitive สำหรับ transaction ของ role/reset/deactivate/forced logout; actual Admin mutation/password change/unassign ยังทำใน T-015/T-016 การอ่านสิทธิ์ใช้ DB ปัจจุบันทุก request ฟีเจอร์ที่ยังไม่มี handler ยัง503 หน้า login/activity throttle/clear ข้ามแท็บเป็น T-017; อย่าส่ง credentials ลง terminal command/history หรือเก็บ cookie transcript ไว้แชร์

`npm run test:sessions` 19/19 + combined252/252 PASS; SQL56SKIP/NOT_RUN (เพิ่ม session10). [รายงาน T-014](TeamFlow_T014_Test_Report.md) ระบุ browser/fresh evidence และแยก HTTP header policy ออกจาก actualHTTPS/SQL/Windows/matrix/UAT ที่ยังไม่รัน `/health/ready` ยัง503/production startupยังปิด สถานะล่าสุด DONE6/77, IN_PROGRESS8, TODO63, remaining71; ต่อ T-015 High แทน snapshot ก่อนหน้า


## Current local batch T-015–T-018 — 2026-10-06

หลัง setup หน้าเว็บมี login/show-password, forced password change, profile read-only/change-password/logout และ Admin `/users` list/search/page/create/edit/active/reset พร้อม confirmation และ version conflict review ใช้ API จริงและ cookie เท่านั้น ไม่มี default temp password หรือ browser storage สำหรับ credentials/drafts. POST `/api/password` ตรวจ current password ไม่ trim, new12–128 Unicode scalars, rotate session/CSRF และ revoke ทุก session เดิม โดยคง absolute expiry เดิม; Admin reset ต้อง Admin password/version และบังคับ target เปลี่ยนรหัสใหม่.

User changes ตรวจ current Admin/version/last-active-Admin ใน provider transaction; inactive login ไม่ได้. Deactivation unassign ทุก unfinished task รวม archived/deleted โดยคง done/history/creator/comments; Admin demotionคง ownerLead/explicitEditor assignments. task versions/events, active Admin/ownerLead notification excluding actor, scoped revisions และ redacted audit บันทึก atomic. SQLite fixture evidence ยังปิด SQL/T-022/T-027 cleanup+recurrence acceptance ไม่ได้.

`npm run test:accounts` 19 PASS; `npm test` 273 PASS; Chromium14 PASS. [รายงาน batch](TeamFlow_T015_T018_Test_Report.md) แยก native SQL69SKIP/NOT_RUN และ full HTTPS/Windows/UAT/browser/business acceptance ที่ยังไม่รัน. การทดสอบ localhostใช้ข้อมูลสังเคราะห์ชั่วคราว; ห้ามใช้ credentials จริงใน terminal/history. Snapshotเก่าในส่วน T-013/T-014 เป็นประวัติ. ณ batch T-015–T-018: DONE6/77, IN_PROGRESS12, TODO59, remaining71; batch4/4 local implemented/verified. Source ยังอยู่ใน workspace และไม่ได้ commit/push/merge. `/health/ready` ยัง503/productionstartupยังปิด.

## T-019 — CLI กู้ Admin และบังคับ logout

ใช้เฉพาะผู้ดูแลการติดตั้งที่มีสิทธิ์ OS และฐานข้อมูล ต้องหยุด application/service ก่อน; CLI ใช้ local instance guard และ SQL application lock เดียวกับแอป และไม่แย่ง maintenance/backup lease. ไม่มี public recovery route. ทำกับบัญชีเดิมเท่านั้น ไม่สร้าง default Admin ไม่ลบประวัติ และไม่คืน assignment ที่เคยถูก cleanup. ระบบที่ยังไม่ setup ให้ใช้ first-run setup.

1. ใช้ Node.js22.23.3 และ build source ด้วย `npm ci` / `npm run build`. `.env` ไม่โหลดอัตโนมัติ; ระบุ environment ของ instance ให้ชัดเจน. ผู้ติดตั้งหยุด service และเตรียม backup ตามขั้นตอนองค์กรเอง.
2. ยืนยัน ID และ username ที่ตรงกับบัญชีเดิม พร้อม `--confirm-local-maintenance`. CLI ไม่เปลี่ยน service/DNS/OS permissions ให้อัตโนมัติ.
3. macOS/POSIX: DATA_DIR/LOG_DIR และ DB subdirectories ต้อง private0700, SQLite DB/WAL/SHM และ environment file ต้อง private0600 และเป็นของ operator/service owner. ไม่มี symlink/hardlink; parent ต้องไม่ให้ผู้อื่นเปลี่ยน path ยกเว้น root-owned sticky temporary directory. Windows: ใช้ terminal ของ service owner หรือ elevated installer และจำกัด DACL ของ data/logs/config/DB เฉพาะ owner/operator/Administrators/SYSTEM; unknown Allow ACE ถูกปฏิเสธ. ต้องทดสอบ ACL จริงบน Windows.
4. กรอกรหัสใหม่12–128 Unicode scalars สองครั้งผ่าน hidden terminal prompt เท่านั้น เว้นวรรคมีความหมาย. ห้ามส่งรหัสผ่านทาง arguments/environment/pipe/input-file หรือบันทึก transcript. CLI ปฏิเสธ password arguments แต่ shell/npm อาจเก็บคำสั่งก่อนถึง CLI.

```powershell
# Windows: เปลี่ยน path/ID/username ให้ตรง instance ของผู้ติดตั้ง
node --env-file="C:\Friday\private\service.env" dist/server/cli/main.js recover-admin --user-id 1 --confirm-user Admin --confirm-local-maintenance
node --env-file="C:\Friday\private\service.env" dist/server/cli/main.js force-logout --user-id 1 --confirm-user Admin --confirm-local-maintenance
```

ถ้าตั้ง environment ใน shell ไว้แล้ว ใช้ `npm run admin -- recover-admin --user-id 1 --confirm-user Admin --confirm-local-maintenance` หรือ `npm run admin -- force-logout --user-id 1 --confirm-user Admin --confirm-local-maintenance`. ดู syntax ด้วย `npm run admin -- --help`. ไม่มี default temporary password.

Recovery ตั้งบัญชีเดิมเป็น active Admin/must_change_password=true, เพิ่ม user version, hash รหัสใหม่ และ revokeทุกsessionด้วย auth_version. Loginใหม่ต้องเปลี่ยนรหัสก่อนใช้ฟีเจอร์อื่น. Force logout เพิ่ม auth_version/revokeทุกsession โดยไม่เปลี่ยน password/role/active/resource version. ทั้งสองบันทึก audit และ scoped revisions ใน transactionเดียวกัน.

Audit ระบุ `origin=local_cli`, `operator_kind=installation_operator`, `authority=machine_file_permissions`. `actor_id` เป็น FK อ้างอิงบัญชีเป้าหมายตาม schema เดิม พร้อม marker `audit_actor_reference=target_account`; ไม่หมายถึงผู้กระทำที่ login ผ่านเว็บหรือยืนยันด้วยรหัสเดิม. การแสดง audit ใน T-040 ต้องรักษาความแตกต่างนี้.

สำเร็จคืน JSON status/action/user_id/request_id และ exit0 หลัง commit เท่านั้น; error exit1 ไม่เผย secret. หาก DATABASE_BUSY/guardlost/ผลcommitไม่แน่นอน ให้ตรวจ login/account/audit ก่อนรันซ้ำ ไม่มี credential retry อัตโนมัติ. ผู้ติดตั้งเริ่ม service กลับเอง แล้วตรวจ loginใหม่/forced change/oldsession401/audit; restart ไม่คืน sessionเก่า. ห้ามแนบรหัสผ่าน/cookie/hashในหลักฐาน.

`npm run test:admin-cli` ตรวจ provider/real filesystem/child-process/hidden POSIX PTY; Python3 ใช้เฉพาะ fixture ทดสอบ ตัว CLI ที่ build ใช้ Node/runtime dependencies. Native SQL2022/Windows console/DACL/AT-28 ยังต้องทดสอบแยกก่อนปิด acceptance. [รายงาน T-019](TeamFlow_T019_Test_Report.md).

## Local batch T-020–T-024 — 2026-10-06

เพิ่ม teams/projects/directory APIs ตาม contract เดิม และหน้า `/teams` / `/projects` สำหรับ CRUD/archive/membership. Admin จัดทีม/Lead; Admin/owner Lead จัดโปรเจกต์/Editor/Viewer ข้ามทีม; ทีมทั่วไปไม่เห็น private projects. การลด/ถอนสิทธิ์คำนวณ effective write ใน transaction เดียวกับ unassign open tasks/audit/notifications/view revisions; done history และ explicit project membership หลังถอนทีมคงเดิม. Account deactivate/demote ใช้ cleanup เดียวกัน. UI มี search/page ของ directory, confirmation, draft-preserving version-conflict review; ไม่มีการ retry writes อัตโนมัติ. 

`npm run test:workspaces` เพิ่ม provider/HTTP/two-process race cases และรวมใน `npm test`. Local17 + combined305 + Chromium17 + fresh source/omit-dev runtime305 PASS; native SQL89 SKIP, Windows/full browser/UAT/future real task/recurrence/file/notification integration NOT_RUN. T-020–T-024 IN_PROGRESS ตาม full acceptance; TeamFlow_T020_T024_Test_Report.md. DONE6/77, remaining71; next local T-025 Medium. Ready503/production guard ยังคงเดิม. ไม่มีการ deploy หรือเปลี่ยน shared runtime.

## สถานะล่าสุด T-025–T-029 — 2026-10-06

หน้าโปรไฟล์และการตั้งค่าแสดงชื่อองค์กร/Asia-Bangkok; Admin เปลี่ยนชื่อด้วย version, Member อ่านได้อย่างเดียว. เมนูหลังเข้าสู่ระบบแสดงชื่อองค์กร; หน้าสาธารณะไม่คืนชื่อองค์กร. ร่างชื่อคงอยู่เมื่อ409 ต้องตรวจข้อมูลล่าสุดก่อนบันทึกอีกครั้ง.

API งานเปิด local: POST /api/tasks, GET/PATCH /api/tasks/{id}, POST /api/tasks/{id}/subtasks, PATCH/DELETE /api/subtasks/{id}. Task POST/PATCH และ subtask POST ต้องมี Idempotency-Key ตาม contract; DELETE subtask คืน200 {item:Task} พร้อม parent version ใหม่. งานซ้ำสร้างเพียงรอบถัดไปเมื่อปิดงานและ checklist ครบ; monthly รักษา anchor. ใช้ session/CSRF/current permission และ transaction เดิม. หน้าฟอร์ม/detail/checklist/recurrence/trash ยังเป็น T-032/T-033; query/search T-031, restore/delete T-030, board API T-034 ยังไม่เปิดจากงานนี้.

`npm run test:tasks` รวม18 provider fixtures +4 HTTP checks +4 actual SQLite two-process races; native provider แยกใน `test:sqlserver`. ผลทั้งหมดและข้อจำกัดใน [รายงานชุด](TeamFlow_T025_T029_Test_Report.md). Local5/5 verified; Task Register DONE6/77, IN_PROGRESS23, TODO48, remaining71. Next T-030 High. ไม่ถือ SQLite แทน SQL2022 หรือ source build แทน production acceptance. ข้อความนี้แทน readiness snapshots รุ่นก่อนหน้า.

## สถานะล่าสุด T-030–T-034 — 2026-10-06

เพิ่ม actual task create/detail/edit, checklist/recurrence controls, version conflict/draft review, project paginated task list and managed Trash. Backend includes scoped query/search/filter/sort/Bangkok dates, strict30×24-hour restore, atomic board versions and read snapshot500-task guard. `npm run test:task-views` รวมใน `npm test`; local18 + combined349 + Chromium22 PASS. Fresh-copy outcome: TeamFlow_T030_T034_Test_Report.md. Native SQL120SKIP/Windows/full browser-device/UAT NOT_RUN; future Calendar/Gantt/Table/Kanban screens, retention and consumers remain pending. T-030–T-034 IN_PROGRESS; DONE6/77, IN_PROGRESS28, TODO43, remaining71. Next T-035 High. Ready503/production guard unchanged; no deploy/shared runtime changes.

## สถานะล่าสุด T-035–T-039 — 2026-10-06

โปรเจกต์มี Kanban กับรายการ: mouse drag, long-press touch, keyboard/menu status/up/down, server-backed filters และ>500 paginated fallback. ใช้ atomic move ร่วม completion/recurrence/detail ordering; current permissions/versions/anchors, explicit idempotent retry after authoritative GET, rollback/conflict/read-failure recovery. Comments API append-only scoped plaintext/notification/event transaction; panelยัง T-044. Contract1.0.1 ขยาย affected_columns2→3 สำหรับงานซ้ำ; routes52/schemas75 unchanged. `npm run test:boards` รวมใน `npm test`: backend15+combined364+Chromium28 PASS. Fresh-copy364 tests/ci/build/migrate/seed/omit-dev runtime PASS; final affectedKanban6/6 recheck PASS. Report: TeamFlow_T035_T039_Test_Report.md. SQL130SKIP/Windows/full browser-device/physical touch/UAT NOT_RUN; polling/Calendar/Gantt/Table/full designยังงานถัดไป. DONE6/77, IN_PROGRESS33, TODO38, remaining71; next T-040 High. No deploy/shared runtime changes; ready503/production guard unchanged.

## คู่มือและ regression ชุด T-065–T-069

[Windows installation/rehearsal](TeamFlow_Windows_Installation.md), [คู่มือผู้ใช้และ developer](TeamFlow_User_Developer_Guide.md), [isolated regression harness](TeamFlow_Regression_Harness.md), [ผลทดสอบ](TeamFlow_T065_T069_Test_Report.md). New local10/10, grouped449/449 PASS; SQL174SKIP/Windows/HTTPS/UAT/full acceptance NOT_RUN. Production guardยังคงเดิม; scriptsเป็น source สำหรับเจ้าของทดสอบแยก ไม่มีการติดตั้ง service/deploy. DONE6/77, IN_PROGRESS63, TODO8, remaining71; next T070 High.

## Regression/operations QA ชุด T-070–T-074

[รายงานชุด](TeamFlow_T070_T074_Test_Report.md): grouped456/456 PASS;55 UIกรณียืนยันหลังตรวจซ้ำ (รอบรวม54PASS/1FAIL และ final focused1PASS). เพิ่ม HTTP lifecycle/leap monthly/purge bytes/501-task pagination/10MiB multipart/parsed CSV และ actual restored Member/session/download/restart. SQL180SKIP; Windows/HTTPS/RPO-RTO/browser matrix/Excel/full TC-AT/UAT NOT_RUN. DONE6/77, IN_PROGRESS68, TODO3, remaining71; next T075 High. ไม่มีการ deploy หรือเปลี่ยน product runtime/contract/migrations.


## Candidate, performance และ UAT

ดู [Candidate release notes](CANDIDATE_RELEASE_NOTES.md), [UAT register](TeamFlow_UAT_Register.md) และ [ผล T-075–T-077](TeamFlow_T075_T077_Test_Report.md) ก่อนใช้ source ZIP ชุดส่งมอบมี inventory/SHA256 และไม่รวมข้อมูล runtime

`npm run performance -- --confirm-isolated-load full` สร้างฐานข้อมูลชั่วคราวและข้อมูลสังเคราะห์ 30 users/6 teams/20 projects/10,000 tasks/20,000 comments ใช้ 15 sessions warmup30วินาที และโหลด70/30นาน10นาที มี Chromium Viewer ที่มองเห็นจริงหนึ่งตัวอย่าง ใช้เครื่องมือ browser ที่ติดตั้งไว้; ไม่รันโหลดนี้ใน npm test และไม่อ่าน DB/credentials ของระบบจริง `smoke` ใช้ warmup2วินาที/วัด10วินาที ไม่มีผลปิด acceptance

`python3 -m unittest discover -s tests/release -p 'test_*.py'` ตรวจ archive security policy; Python3 เป็นเครื่องมือ QA แยกจาก Node22 runtime ตัว ZIP extraction ต้องตรวจ digest ก่อนเขียนไฟล์ ดูคำสั่ง fresh ZIP ใน release notes; UAT template generator ปฏิเสธการเขียนทับทะเบียนที่มีอยู่


### ตรวจ memory แยก API/harness (T-075 follow-up)

หลัง `npm run build` รัน `npm run performance:memory -- --confirm-isolated-load memory` เพื่อ seed fixture เดิมใน temp directory แต่เปิด compiled API ใน Node child แยกจาก client harness: warmup30s/โหลด5นาที4500requests/พัก30s, sampleทุก30s และ GC เฉพาะ baseline/post-load/idle ไม่มี Chromium ในโหมดนี้ ผลเป็น diagnostic ไม่ปิด10-minute/visible-poll/nativeSQL acceptance `memory-smoke` วัด10s/พัก1sเพื่อเช็คเครื่องมือ ไฟล์รายงานชื่อmemoryแยกจากfull/smokeเดิม

ตัว validator ใช้ cache128รายการและปล่อย transient schema จาก Ajv เพื่อลดการค้างของ compile roots ดู TeamFlow_T075_Memory_Followup_Report.md; JSONSchema/APIwire/business rules เดิม และ production guard ยังคงอยู่


## Native SQL2022 foundation readiness — 8 October 2026

เจ้าของเลือกเตรียมชุดทดสอบก่อน ยังไม่มี SQL test environment. อ่าน [คู่มือ T-006/T-007](TeamFlow_SQLServer_Foundation_Runbook.md) สำหรับ private test env, read-only `check:sqlserver` และ `test:sqlserver:foundation` ที่หยุดเมื่อยังไม่พร้อมและรัน13native casesตามลำดับ. PASS ของ preflight ไม่ใช่ native acceptance. SQL/Windows/UAT NOT_RUN; Task Register DONE6/77, remaining71.
