# Delivery rollout — v1.0

สถานะ: docs-only delivery plan. D01–D12 อนุมัติทิศทางแล้ว แต่ runtime cards ยัง proposed / NOT_RUN และคำถามธุรกิจยัง block ส่วนที่เกี่ยวข้อง ไม่มี code/deploy/merge authority จากเอกสารนี้

## Baseline และ scope gate

เริ่มจาก main `4a0b76b`; audit source `94282b6` ของ Windows staging PR #1 เป็นคนละ baseline ดู [audit](audit/README.md). ไม่มี merge/cherry-pick staging code ใน docs PR นี้. การทำ UX บน main ไม่ต้อง merge PR #1; หากจะทำ Windows staging/pilot ต้องยืนยัน source availability, baseline, approval และ native checks แยกก่อน ไม่เรียก staging ว่า production

[ADR-0001](../adr/ADR-0001-postgresql-linux-docker.md) ยังบังคับ PostgreSQL17/Linux/Docker สำหรับ production. ไม่มีการถอด production guard หรือปิด security/UAT/restore gates ด้วยผล docs/SQLite. AGENTS.md ถูกป้องกันและไม่แก้ ทั้ง version ที่เก่าหรือข้อขัดกันใช้ permitted addendum + [ADR-0002](../adr/ADR-0002-delivery-first-specification.md) โดยไม่ bypass instruction protection

## Proposed PR sequence

ทุกแถวเป็นหนึ่ง coherent PR ไม่ใช่ 122-surface implementation รวมชุดเดียว. Card ที่ blocked ยัง draft เอกสารต่อได้ แต่ไม่เปิดพฤติกรรมที่ขึ้นกับคำตอบจนบันทึก owner decision จริง

| Phase | Card | Scope / gate |
|---|---|---|
| 0 | [DEL-SPEC](../../tickets/delivery/DEL-SPEC.md) | ชุดเอกสารนี้; independent parent review ก่อน commit/push/PR ตาม authority ภายหลัง |
| 1a | [DEL-UX1](../../tickets/delivery/DEL-UX1.md) | Focus หลัง mutation + mobile shell |
| 1b | [DEL-UX2](../../tickets/delivery/DEL-UX2.md) | Entity drafts / persistent errors / lost acknowledgement |
| 1c | [DEL-UX3](../../tickets/delivery/DEL-UX3.md) | Doc title-first / dirty switch / save recovery |
| 1d | [DEL-ACCESS](../../tickets/delivery/DEL-ACCESS.md) | UI ตาม actual service authority ไม่มี grants ใหม่ |
| 1e | [DEL-VALIDATION](../../tickets/delivery/DEL-VALIDATION.md) | Thai/emoji/IME/client-server semantics |
| 2a | [DEL-CONTRACT](../../tickets/delivery/DEL-CONTRACT.md) | Docs-only wire plan และ Q-DEL-01–06; ไม่ regenerate contract ก่อน runtime PR |
| 2b | [DEL-PROJECT](../../tickets/delivery/DEL-PROJECT.md) | Nullable metadata / lead / acceptor / unreviewed; ไม่ activate |
| 2c | [DEL-TASK](../../tickets/delivery/DEL-TASK.md) | Primary owner, legacy advisory, all transition paths |
| 3a | [DEL-BASELINE](../../tickets/delivery/DEL-BASELINE.md) | Snapshot/change primitives + explicit adoption; activation wiring ยังไม่เปิด |
| 3b | [DEL-LIFECYCLE](../../tickets/delivery/DEL-LIFECYCLE.md) | Lifecycle + affirmative named acceptance + ongoing rules |
| 3c | [DEL-HEALTH](../../tickets/delivery/DEL-HEALTH.md) | Manual health และ honest list/overview labels |
| 4 | [DEL-MILESTONE](../../tickets/delivery/DEL-MILESTONE.md) | Checkpoints ก่อน dependencies |
| 5 | [DEL-RISK](../../tickets/delivery/DEL-RISK.md) | Risk/Issue/Blocker register โดยไม่เพิ่ม task status |
| 6 | [DEL-EFFORT](../../tickets/delivery/DEL-EFFORT.md) | Optional estimates/weekly availability หลัง milestone/risk |
| 7 | [DEL-DEPENDENCY](../../tickets/delivery/DEL-DEPENDENCY.md) | Same-project warning-only แยก PR หลัง phase 6; ไม่ใช้ effort เป็น algorithm requirement |

## Pending decision gate

รายละเอียด/default ที่เสนอและเหตุผลอยู่ [rules](delivery-rules.md); ไม่ขออนุมัติ broad D01–D12 ซ้ำ และไม่ถาม routine confirmation ทุกหน้า

| Question | Business effect pending | Blocked card behavior |
|---|---|---|
| Q-DEL-01 | Lead/acceptor eligibility, Viewer acceptor, replace authority | Contract sign-off / project nominate / acceptance |
| Q-DEL-02 | New-task post-revoke readiness, recurrence owner carry-forward | New-task readiness / recurrence changes |
| Q-DEL-03 | Completion with open tasks / exception | Finite completion |
| Q-DEL-04 | Reopen actor/effect, cancelled reopen | Lifecycle reopen |
| Q-DEL-05 | Ongoing review cadence/authority/closure | Ongoing activation/review/completion |
| Q-DEL-06 | Starting-plan payload and legacy adoption states | Baseline/adoption/activation |
| Q-DEL-07 | Health authority / stale interval | Health update/stale assessment |
| Q-DEL-08 | Milestone accept/cancel/reopen authority | Milestone mutation |
| Q-DEL-09 | Register triage / accepted-risk / resolve | Risk domain mutation |
| Q-DEL-10 | Units/allocation/week aggregation/capacity privacy | Effort/capacity forecast and edits |
| Q-DEL-11 | Dependency actor/warning/lag/removal history | Dependency mutation/warnings |

ถ้า owner เลือกต่างจาก conservative proposal ให้แก้ spec version/contract plan และ test expectations ก่อน implementation ไม่แก้ tests ให้ตรง code ที่ทำไปก่อน

## Per-PR execution gates (future work, not executed here)

1. แยก worktree อ่าน target main/task/locked contract อีกครั้ง สำรวจ dirty state; ห้ามแตะงานอื่น Allocate official ID เฉพาะเมื่อ owner adopt backlog ไม่ถือว่าชื่อ DEL-* ปิด parent task เดิม
2. ยืนยัน allowed_paths เป็นเพดาน ไม่ใช่ให้แก้ทุกไฟล์; new filenames ใน card เป็น proposed. เลข migrations ต้องเลือกจาก target ปัจจุบัน ห้าม overwrite เดิม หากต้องเพิ่ม shared fixture/router path นอก card ให้แก้ scope ผ่าน review ก่อน
3. RED test ต้องล้มจาก behavior ที่ต้องแก้จริง → GREEN → refactor. เก็บ expected/actual ไม่ใช้ mock provider แทน integration หรือเปลี่ยน assertion ลดความเข้ม
4. Runtime PR รัน exact targeted commands ของ card และ common gates ด้านล่าง. Contract change ต้อง `npm run build:contract` แล้ว check/test contract; เพิ่ม traceability/test manifest เมื่อ card ถูก adopt ผ่าน dedicated docs/planning scope ไม่แก้ totals โดยเงียบ

```sh
npm run typecheck
npm run lint
npm run build
npm run check:contract
npm run test:contract
npm run check:test-plan
npm run test:test-plan
npm test
```

`npm test` เป็น regression gate สำหรับ shared/domain changes; ถ้าเฉพาะ UI ต้องระบุ suite ที่รันและข้อจำกัดจริง. baseline typecheck failure ต้องแยก pre-existing กับ introduced ไม่อ้าง full green และไม่แก้โค้ดนอก docs scope เพื่อทำรายงานให้สวย

5. ก่อน browser command ใน cards ให้ export `FRIDAY_TEST_PORT` เป็นพอร์ตว่างที่ตรวจแล้ว, `FRIDAY_BROWSER_FIXTURE` เป็น directory ใหม่แบบ disposable ภายนอก checkout และ `TMPDIR` เป็น approved scratch. Build ต้องสำเร็จก่อนเปิด compiled test server; `reuseExistingServer=false` ห้ามหยุด/ยึด server ของคนอื่น. ทดสอบ 360/390/768/1440, zoom200%, keyboard, failed/empty/stale/409/revoke/lost ack ตาม card แล้วรายงาน browser จริง ไม่อ้างจาก source read
6. Domain migrations ต้องทดสอบ fresh + legacy fixtures บน SQLite และ **isolated PostgreSQL17 จริง**. `RUN_POSTGRES_TESTS=1` อย่างเดียวไม่พอ: provider fixture ต้อง DB_PROVIDER=postgres และชื่อ DB suffix `_test`, ใช้ credentials ผ่าน private environment ตาม existing harness ไม่ log/commit. รัน targeted PG command ใน card และ `RUN_POSTGRES_TESTS=1 npm run test:postgres`; ต้องมี executed tests ไม่ใช่ SKIP ทั้งชุด. Backup/restore disposable data และ atomic audit/notification fixtures ต้องพิสูจน์แยก; SQL Server ยังเก็บ reference/compile แต่ไม่ใช้ปิด production acceptance ตาม ADR-0001
7. Independent specification/code/security review; evidence ระบุ commit/build/provider/actual exit/tests executed/skipped. No fabricated PASS, no DONE จากการมี code. Push/PR/readback/merge ทำเฉพาะเมื่อได้ authority ในขั้นนั้น งานปัจจุบันหยุดก่อน commit/push เพื่อ parent review

## Legacy rollout / migration safety

เพิ่ม nullable fields โดยไม่ rewrite content/roles/dates/assignment/history. Deploy migration บน disposable fixtures ก่อน แล้วทดสอบ existing create/edit/archive/use ได้เหมือนเดิม. UI แสดง unreviewed โดยไม่บังคับ Active/Completed ให้ legacy. ผู้มีสิทธิ์ adopt อย่าง explicit หลัง policy resolved; adoption capture timestamp จริงไม่ใช่ historical activation. Unknown load/error ไม่เปลี่ยนเป็น 0/healthy และไม่มี automatic ownership/grants

## Pilot และ release แยกจาก implementation

หลัง delivery core ผ่าน review จึงเตรียม synthetic restricted staging ตาม baseline ที่ได้รับอนุญาต; Windows-native service/DACL/HTTPS/reboot/scheduled backup/upload restore ต้องมีผลจริงเฉพาะ workstream นั้น. หาก PR #1 ยังไม่รวม ไม่มี staging scripts/tests บน main ให้ใช้โดยเดา. Production guard, unresolved dependency advisories, security T-093/T-094, real-server T-096 และ human UAT ไม่ถูกปิดด้วย docs PR นี้

Pilot ภายหลังครอบคลุม lead/member/acceptor/Admin: start → change reason → revoke/replace → review/accept/reopen, finite vs ongoing, legacy adoption และ rollback/recovery. ขยายทีละทีมเมื่อมี explicit release authority เท่านั้น ไม่มี deploy/DNS/server change ในงานนี้

## Status และ evidence

Official Task Register ยัง **DONE 9 / total 96 / remaining 87** (IN_PROGRESS 84, IN_REVIEW 1, TODO 2). Proposed cards 16 รายการยังไม่นับเพิ่ม ไม่มีการแก้ AT/TC execution records. ผล docs checks จริงดู [verification](verification.md); future behavior tests ทั้งหมดยัง NOT_RUN
