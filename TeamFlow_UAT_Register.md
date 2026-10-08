# UAT Register — T-076 (Medium)

Baseline 1.1 · 7 ตุลาคม 2026 · **IN_PROGRESS / ยังไม่มี human sign-off**

ใช้ `reports/UAT-signoff-template.json` เป็นทะเบียน AT-01–AT-30 และ UAT-01–UAT-05 ทั้งหมด **NOT_RUN** รายการ case/profile/expected อ้างจาก test manifest ไม่ใช้ผล unit/SQLite subset ลงนามแทนผู้ใช้ ก่อนเริ่มกรอก candidate ZIP SHA256, build, source inventory hash, Windows/SQL2022 patch/spec/browser, ผู้ทดสอบและบทบาท วันที่ และ expected/actual ของแต่ละขั้น

| Journey | ผู้ทดสอบตามแผน | กิจกรรม | ผล |
|---|---|---|---|
| UAT-01 | Owner/Admin/Lead/Member | Setup, รหัสชั่วคราว, ทีม, แชร์โปรเจกต์และขอบเขต | NOT_RUN |
| UAT-02 | Lead/Member | มอบหมาย แจ้งเตือน Kanban Checklist ไฟล์ เสร็จ และรายงาน | NOT_RUN |
| UAT-03 | Lead/Editor/Viewer | ข้ามทีม Editor/Viewer และถอนสิทธิ์ | NOT_RUN |
| UAT-04 | สมาชิกสองคน | แก้ไข/ลากพร้อมกันและแสดง conflict | NOT_RUN |
| UAT-05 | Owner/ผู้ติดตั้ง/Member | Restore ใหม่ สิทธิ์ ไฟล์ checksum และ login ใหม่ | NOT_RUN |

บันทึก defect เป็น Critical/Major/Minor พร้อม reproduction, affected AT/TC, redacted evidence, owner, fix build และ retest หากยังไม่รันให้ NOT_RUN; หากสิ่งแวดล้อมขัดขวางให้ BLOCKED พร้อมเหตุผล; ห้ามแก้เป็น PASS จากการอ่านโค้ด ผล local อยู่ใน test reports แยกจากทะเบียนลงนาม

`tests/execution-records.json` ยังไม่มี formal records/defects จึง **ยังพิสูจน์ไม่ได้ว่าไม่มี Critical/Major ค้าง** ต้องมีหลักฐานครบตาม TeamFlow_Test_Release_Manifest.md ก่อนเพิ่ม records และใช้ check:test-plan ตรวจความครบถ้วนของหลักฐานอีกครั้ง คำสั่งนั้นไม่ได้รันทดสอบแอป

Template generator `node scripts/prepare-uat.mjs` ปฏิเสธเมื่อไฟล์เดิมมีอยู่ เพื่อรักษาข้อมูลที่คนกรอก ส่วน `reports/release-readiness.json` รวม mapping FR40/NFR8/BR18/API53/screens/AT30 เท่านั้น ไม่มีการอ้างว่า mapping คือผลทดสอบ
