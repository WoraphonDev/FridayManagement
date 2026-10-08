# SQL Server 2022 — ชุดทดสอบ T-006/T-007

วันที่ 8 ตุลาคม 2026 · Effort High · สถานะ native SQL: NOT_RUN

เจ้าของเลือกเตรียมชุดทดสอบและคู่มือก่อน เนื่องจากยังไม่มี SQL Server สำหรับทดสอบ ชุดนี้ใช้ Node.js22.23.3 และ dedicated SQL Authentication ตาม SRS การตรวจบน macOS/SQLite ไม่รับรอง SQL Server หรือ Windows

## 1. Environment ที่เจ้าของต้องเตรียม

- SQL Server 2022 จริง (ProductVersion16.x) พร้อมชื่อ Edition/build สำหรับหลักฐาน
- ฐานข้อมูลสำหรับทดสอบแยก ชื่อเช่น `Friday_foundation_test` ใช้ตัวอักษรอังกฤษ ตัวเลข underscore และลงท้าย `_test`
- Dedicated test login มีสิทธิ์เชื่อมต่อ, CREATE TABLE, CREATE SCHEMA และ ALTER บน dbo ในฐานข้อมูลทดสอบเท่านั้น; SHOWPLAN ต้องมีเมื่อจะตรวจ query plans การจัดสิทธิ์เป็นงานของเจ้าของ/DBA ไม่ใช้บัญชีระบบจริง
- TLS certificate ที่ client เชื่อถือได้; ค่าเริ่มต้น DB_ENCRYPT=true และ DB_TRUST_SERVER_CERTIFICATE=false หากองค์กรเลือก certificate override สำหรับ test ให้บันทึกว่าไม่ได้พิสูจน์ production TLS
- DATA_DIR/LOG_DIR เป็น absolute paths แยกจาก source/webroot และแยกจาก review instance; native fixtures ที่เปิด configuration เต็มจะตรวจและสร้าง directory เหล่านี้

ไม่ต้องรัน app, migration CLI หรือ sample-data CLI บนฐานข้อมูลนี้ก่อนทดสอบ Fixtures สร้าง migration ledger/schema/data ของตนเอง ไม่เปิด service หรือปรับ server/DNS

## 2. ตั้งค่าภายในเครื่อง

ใช้ `.env.sqlserver-test` ซึ่งถูก `.gitignore` แล้ว เริ่มจาก `.env.example` และแก้ค่าต่อไปนี้ ผู้ใช้กรอก credentials ในเครื่อง ไม่ส่งผ่านแชตหรือเก็บในรายงาน:

```dotenv
RUN_SQLSERVER_TESTS=1
NODE_ENV=test
DB_PROVIDER=sqlserver
DB_SERVER=sql-test.example.internal
DB_PORT=1433
DB_NAME=Friday_foundation_test
DB_USER=
DB_PASSWORD=
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
```

ค่าตัวอย่าง host ต้องเปลี่ยนเป็น server จริง ตั้ง DATA_DIR/LOG_DIR ในไฟล์เดียวกัน เช่น macOS `/private/tmp/friday-sql-test-data` และ `/private/tmp/friday-sql-test-logs` หรือ Windows `C:\FridaySqlTestData` และ `C:\FridaySqlTestLogs` ใช้ paths ที่เจ้าของยืนยันว่าเป็น test เท่านั้น Node env-file จะให้ environment ที่มีอยู่แล้วมีลำดับเหนือค่าในไฟล์ จึงใช้ terminal สำหรับ test โดยเฉพาะและตรวจว่าไม่มี configuration ของ review/production ค้างอยู่

## 3. ตรวจแบบอ่านอย่างเดียว

จาก root ของ repository หลังติดตั้ง dependencies ตาม README:

```shell
node --env-file=.env.sqlserver-test --run check:sqlserver
```

คำสั่งนี้ไม่สร้าง directory/schema/table และไม่รัน migration ตรวจ opt-in/test/provider/database name ก่อนเชื่อมต่อ แล้ว SELECT ProductVersion/Edition/DB_NAME/permissions เท่านั้น ตรวจชื่อ DB ที่เชื่อมต่อจริงว่าตรงกับ configuration และบังคับ SQL2022

PASS หมายถึงพร้อมสำหรับ focused fixtures เท่านั้น ไม่ใช่ T-006/T-007 ผ่าน ถ้า queryPlanPermission=NOT_READY ต้องจัดสิทธิ์ SHOWPLAN ก่อนเก็บหลักฐาน query plans Native connection error แสดงรหัส `SQL_PREFLIGHT_FAILED` โดยไม่แสดง raw error/server/user/password เมื่อไม่มี config แสดง `ISOLATED_SQL_TEST_REQUIRED` และ exit1

## 4. รัน focused native tests

```shell
node --env-file=.env.sqlserver-test --run test:sqlserver:foundation
```

คำสั่งรัน preflight ก่อนทุกครั้ง ถ้าไม่พร้อมจะหยุดด้วย exit1 ไม่ข้าม tests แล้วรายงาน PASS ชุดที่รันเมื่อพร้อมมี13กรณี:

| กลุ่ม | จำนวน | สิ่งที่ตรวจ |
|---|---:|---|
| T-006 config | 1 | Session applock กัน instance ซ้ำ, release/reacquire, held session loss |
| T-007 schema | 11 | ตาราง/36 FK/constraints enabled+trusted/indexes/types/collation, invalid inputs, durable state, migration repeat/legacy/checksum/rollback, atomic effects |
| Foundation | 1 | state/audit/notification commit และ rollback จริงร่วมกัน |

Schema fixture ใช้ randomized `friday_t007_*` schema; foundation ใช้ randomized scratch tables ใน dbo ภายใน database test และ cleanup ใน finally อย่ารันพร้อมอีก test process ใน DB เดียวกัน ถ้า process ถูก kill หรือ connection หาย ให้ตรวจและลบเฉพาะ fixture ที่ค้างซึ่งระบุได้ว่าเป็นของ run นี้โดย DBA ห้ามลบ dbo objects ทั้งหมด

หลัง focused tests ผ่าน ค่อยพิจารณา `npm run test:sqlserver` สำหรับ feature suites ทั้งระบบภายใต้ test environment เดียวกัน งานนี้ไม่ได้รันหรือรับรอง feature suites ทั้งหมด

## 5. หลักฐานที่ต้องเก็บก่อนรับงาน

เก็บ OS/architecture, Node/npm/driver versions, SQL Edition/ProductVersion, source/build และเวลารันจริง รวม command/exit code/pass/fail/skip พร้อม log ที่ตรวจและลบ credentials/cookie/token แล้ว ผลที่ยังขาดใช้ NOT_RUN และกรณีที่ SKIP ไม่นับ PASS

T-006 ยังต้องพิสูจน์ startup/shutdown ที่ใช้ held SQL session จริงและ full AT-28/Windows/HTTPS ตาม test documents T-007 ยังต้องเก็บ native query plans/concurrency และตรวจ backup/restore/upgrade rollback พร้อม DB/files ตาม TC-078;13 tests ไม่ปิด full TC-078 หรือ backup acceptance

อัปเดต Task Register และ execution evidence ตาม TeamFlow_Test_Release_Manifest.md เฉพาะกรณีที่รันครบจริง รักษา T-006/T-007 IN_PROGRESS จน acceptance ที่ค้างมีหลักฐาน Native SQL2022/Windows/UAT ปัจจุบัน NOT_RUN; completed6/77, remaining71
