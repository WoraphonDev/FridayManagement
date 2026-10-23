# Delivery rules — specification v1.0

สถานะ: ข้อกำหนดสำหรับพัฒนาในอนาคต ไม่ใช่ implementation หรือผลทดสอบ เอกสารชุดนี้ตั้งอยู่บน main `4a0b76b`; audit ของหน้าจอใช้ `94282b6` ตาม [provenance](audit/README.md)

## 1. ลำดับอำนาจและคำที่ใช้

- **APPROVED** = เฉพาะคำเลือก D01–D12 ใน [delivery-decisions](delivery-decisions.md) ไม่รวมทุก field ในร่างหน้า
- **PROPOSED** = technical default ที่ระบุด้านล่าง ใช้เป็นฐาน review สัญญา ไม่แอบอ้างว่าเจ้าของอนุมัติ
- **PENDING** = ผลทางธุรกิจยังไม่ได้เลือก งานที่ขึ้นกับข้อนั้นต้อง blocked จนบันทึกคำตอบใน version ถัดไป
- **EXISTING** = source/locked API เดิม; **IMPLEMENTED / PASS** ต้องมีหลักฐานรันจริงแยกจากเอกสารนี้
- รหัส D01–D12 ไม่มีขีดกลาง ไม่ใช่ D-01–D-12 หรือ RD-01–RD-08 ใน SRS เดิม กติกาเดิมยังใช้ ยกเว้นการแก้ขอบเขตที่ระบุชัดใน [ADR-0002](../adr/ADR-0002-delivery-first-specification.md)
- Task Done, project acceptance, lifecycle, health และ archive เป็นคนละแกน ไม่ใช้เปอร์เซ็นต์หรือการ archive แทนการตรวจรับ ไม่มีการเพิ่มสิทธิ์จากตำแหน่งหรือการแต่งตั้งผู้รับผิดชอบ

## 2. กติกาที่ตรวจได้จากคำอนุมัติ

| Rule | Source | เงื่อนไข / expected outcome |
|---|---|---|
| R01 mode | D01 | เลือก finite หรือ ongoing โดยตรง ไม่เดาจาก type/category; finite มี commitment ส่งมอบ ส่วน ongoing มีรอบ/วันทบทวน ไม่สร้างวันส่งสุดท้ายปลอม |
| R02 acceptor | D02 | ก่อนเริ่มต้องระบุผู้ตรวจรับหนึ่งคน เป็น lead คนเดียวกันได้; Completed ต้องเกิดจากการยืนยันของผู้ตรวจรับพร้อมหลักฐาน ไม่ใช่ Admin override หรือ task ratio |
| R03 revocation | D03 | ถอนสิทธิ์/ปิดบัญชีสำเร็จทันทีตาม security policy แม้เป็น lead/owner/acceptor; เก็บ attribution เดิม แสดง needs replacement; ไม่มี auto-replacement หรือ access grant |
| R04 primary owner | D04 | งานใหม่มี primary owner หนึ่งคนก่อน Doing โดยคง collaborators หลายคน; งานเก่าใช้ต่อได้และเตือนให้ทบทวน ไม่เลือก assignee แรกให้เอง |
| R05 milestones first | D05 | milestone เป็น checkpoint แยกจาก group/task; dependencies เป็นระยะหลัง same-project warning เท่านั้น ไม่เลื่อนวันหรือเพิ่ม critical path |
| R06 optional effort | D06 | effort/capacity เป็น optional หลัง milestone และ risk; null = unknown ไม่ใช่ 0; ไม่ตั้ง 40 ชั่วโมง ไม่ซ้ำ effort ตามจำนวน collaborators ไม่มี work log/timer |
| R07 register | D07 | แยก Risk / Issue / Blocker พร้อม owner, next action, review date และลิงก์งาน; Task enum ยังเป็น todo/doing/review/done |
| R08 change history | D08 | แผนเริ่มต้นเมื่อยืนยันเริ่มต้อง immutable; ผู้มีสิทธิ์เปลี่ยน commitment/scope หลังเริ่มต้องมี reason + old/new/actor/time ใน transaction เดียว ไม่บังคับอนุมัติหลายขั้น |
| R09 parity | D09 | UI แสดง action ตาม service ที่มีจริงและทดสอบทุกบทบาท การทำ UI parity ไม่เปลี่ยน server grants หรือ role อัตโนมัติ |
| R10 reliability | D10 | ป้องกันร่างหาย คืน focus หลัง mutation/rerender; error อยู่จนแก้ได้; Doc สร้างด้วยชื่อ; บอกสำเร็จหลัง server acknowledgement ไม่ใช่เมื่อกดปุ่ม |
| R11 validation | D11 | limit/count semantics เดิมตรงกันทั้ง client/server ไทย/emoji/IME; ไม่ตัดข้อมูลเก่า; password ใช้ policy แยก |
| R12 legacy | D12 | migration additive nullable; ข้อมูล/การใช้งาน/archive/access เดิมคงอยู่ แสดง unreviewed จนผู้มีสิทธิ์เลือกเอง ไม่บังคับ lifecycle/date/lead หรือสร้าง baseline ย้อนหลัง |

## 3. Actor eligibility และ authority — PROPOSED C01

Technical default ที่เข้มงวดเพื่อ review ไม่ใช่ approval ของ role matrix ใหม่:

| Action | Proposed authorized actor / eligible reference |
|---|---|
| แก้ delivery setup, nominate/replace lead/acceptor, adopt legacy | ผู้ที่ service ปัจจุบันยอมให้ manage project metadata ใน project นั้น: Admin, owner-team access Lead หรือ project manager ที่มี P-01 ตาม policy จริง; ต้อง recheck ใน transaction |
| Project lead | active user ที่มี effective project write อยู่แล้ว ไม่ใช้ job title หรือ team_position แทนสิทธิ์ |
| Project acceptor | active user ที่มี effective project read อยู่แล้ว รวม Viewer ได้โดยการแต่งตั้งแบบ explicit; acceptance เป็น action ใหม่ที่จำกัดเฉพาะ named acceptor ไม่ใช่สิทธิ์ write ทั่วไป ต้อง review matrix ก่อนเปิด endpoint |
| Task primary owner | active user ที่ผ่าน eligibility สำหรับ assignment เดิมและมี effective project write; ไม่จำเป็นต้องเป็น assignee รายแรก และไม่แก้ collaborators โดยอัตโนมัติ |
| เปลี่ยน task owner | actor ที่ service ปัจจุบันอนุญาตให้แก้ assignment ใน task/project นั้น ไม่ใช่ทุกคนที่เห็น task |
| บันทึก acceptance | actor ต้องเป็น current named acceptor และยังมีสิทธิ์เข้าถึง พร้อม version ล่าสุด; Admin ที่ไม่ใช่ acceptor ไม่มี bypass |
| Health update | current eligible business lead หรือผู้มี manage-metadata authority; มี rationale/next action ไม่ใช่สิทธิ์จัดการ security |

การเปลี่ยน acceptor ต้องระบุเหตุผล เก็บ previous/new/actor/time/version และไม่อนุมัติย้อนหลังแทนคนเก่า ปิดบัญชีหรือถอนสิทธิ์ไม่รอ replacement; acceptance หลัง revocation ต้องถูกปฏิเสธ แม้ client เก็บชื่อเดิมไว้ ประวัติการตรวจรับเก่ายังคงอยู่ ไม่ให้ผู้สูญเสียสิทธิ์เปิด evidence ผ่าน history ได้

**PENDING Q-DEL-01:** owner/security owner รับรอง eligibility และ replacement matrix นี้ โดยเฉพาะ Viewer เป็น acceptor และ authority ของ P-01 manager. DEL-CONTRACT/DEL-PROJECT/DEL-LIFECYCLE ต้องไม่เปิดพฤติกรรมใหม่ก่อนข้อสรุป ไม่ขออนุมัติ D02/D03 ซ้ำ

## 4. Proposed field contract C02

ทั้งหมดเป็นชื่อเชิงตรรกะ ไม่ใช่ schema ที่มีแล้ว; DEL-CONTRACT ต้องจัด wire names/errors/limits/versioning และตรวจ locked contract ก่อน runtime PR. Existing fields ใช้ [field snapshot](pages/source-field-contracts.md) เป็น audit context และ `contracts/openapi.json` ที่ branch เป้าหมายเป็น authority

| Entity / field | Proposed default / validation / readiness |
|---|---|
| project delivery_mode | null ใน legacy; new project ไม่เลือก mode ให้เงียบ ต้อง explicit ก่อนเริ่ม |
| objective | nullable plain text ≤2000 UTF-16 units; nonblank ก่อนเริ่มทั้งสอง mode |
| acceptance_criteria | nullable plain text ≤4000 UTF-16 units; nonblank ก่อนเริ่มทั้งสอง mode |
| in_scope / out_scope | nullable plain text ≤4000 ต่อ field; optional ไม่บังคับ create ยาว |
| lead / acceptor | nullable IDs ก่อนเริ่ม; C01 eligibility; หนึ่งคนต่อหน้าที่; คนเดียวกันได้ |
| planned_start / target_date | nullable valid YYYY-MM-DD; finite ต้องมีทั้งคู่ก่อนเริ่ม และ start ≤ target; past date เตือนได้ ไม่คัด task span ลง project |
| review_date / cadence | ongoing ต้องเลือก next review_date ก่อนเริ่ม; proposed ใช้ explicit next date ในรุ่นแรก ไม่เดาความถี่; เก็บ review history โดยไม่มี auto-review |
| task primary_owner | nullable ID ก่อน Doing; ไม่เปลี่ยน assignee_ids; ไม่มี primary default จาก creator/team lead |
| acceptance evidence | nonblank outcome ≤4000 พร้อม actual delivery date (ไม่อนาคตใน Bangkok) และ optional scoped Doc/file references หรือ safe HTTPS URL; actor/time server-owned |
| reasons / health rationale / next action | nonblank ≤2000; ไม่เก็บ password/token หรือ private URL credentials |

PATCH omission คงค่าเดิม; explicit null ล้าง optional field ได้เมื่อ readiness อนุญาต; trim/nonblank ต้องกำหนดตรงกันใน contract ห้ามเปลี่ยน counting ของข้อมูลเดิม Date-only ใช้ Asia/Bangkok; event timestamps ใช้ server UTC. Viewer อ่านเฉพาะ project scope; reference ต้องตรวจ active/current access ทุกครั้ง ไม่ให้ลิงก์ข้าม project หรือชื่อข้อมูลลับรั่ว

## 5. Task readiness และ legacy — PROPOSED C03

- งานใหม่เริ่ม todo ตาม existing contract; ทุกเส้นทางเข้า doing/review/done ต้องมี primary owner ที่ eligible รวม direct PATCH, board move, inline, batch, recurrence successor และ API ตรง ไม่เพียง guard ที่ UI
- ไม่เพิ่มสถานะ blocked; done ยังต้องผ่าน checklist/recurrence/version/idempotency เดิม
- เสนอให้ทุก non-todo mutation ของงานใหม่ recheck owner eligibility หลัง revoke เพื่อไม่ข้าม readiness; งานเดิมเป็น advisory เท่านั้น การเปลี่ยน metadata ของงานเก่าไม่ทำให้กลายเป็นงานใหม่
- migration ต้องระบุ legacy provenance อย่างคงที่ ไม่ใช้ heuristics จากวัน client และไม่เดา primary owner; successor ที่สร้างหลัง cutover เป็นงานใหม่ ควรเริ่ม todo/owner null หากคนเดิมหมดสิทธิ์ ไม่ auto-grant
- **PENDING Q-DEL-02:** รับรอง post-revocation blocking ของงานใหม่และ recurrence owner carry-forward. ระหว่าง pending ต้องไม่เปลี่ยนการทำงาน legacy หรือสืบทอดคนโดยเดา

## 6. Lifecycle / acceptance / ongoing — PROPOSED C04

Lifecycle labels ที่เสนอ: Draft, Planning, Active, On hold, Completed, Cancelled; legacy = null + unreviewed ไม่ mass-map archived เป็น Completed

| Transition | Proposed guard / effect |
|---|---|
| Draft ↔ Planning | metadata authority + version; ไม่มี snapshot/acceptance |
| Draft/Planning → Active | C01/C02 readiness, explicit confirm-start; snapshot + version + event atomic |
| Active → On hold | metadata authority + reason; review_date แนะนำ; ไม่เปลี่ยน task states/dates |
| On hold → Active | metadata authority + reason + recheck current lead/acceptor; ไม่ overwrite starting plan |
| Active/On hold → Completed (finite) | named acceptor + affirmative evidence + actual date + current references; เสนอ block ถ้ายังมี non-deleted open tasks |
| Active/On hold → Cancelled | metadata authority + reason; ไม่แปลว่า accepted และไม่ปิด task |
| Completed → Active | เสนอ metadata authority + reason + ready lead/acceptor; เก็บ acceptance เดิมเป็น historical และ current acceptance ไม่ใช่ active sign-off; ต้องตรวจรับใหม่เพื่อ complete รอบใหม่ |
| Cancelled → Active | ไม่เปิดในรุ่นแรกจนมีคำตอบธุรกิจ; ห้ามลบ cancellation history |

**PENDING Q-DEL-03:** การ complete ทั้งที่มี open tasks: default เสนอ block (ไม่ auto-close/move/drop task) แต่ธุรกิจอาจต้องการ explicit exception ต้องเลือกก่อนเปิด completion.

**PENDING Q-DEL-04:** ใคร reopen และ acceptance เก่ามีผลอย่างไร รวม cancelled reopen; default ข้างบนไม่ใช่สิ่งที่ owner อนุมัติแล้ว

**PENDING Q-DEL-05:** ongoing review cadence, reviewer, missed review และ closure. เสนอ lead บันทึกผลทบทวน + next review_date > วันที่ทบทวน พร้อม history; overdue review เป็น attention ไม่ auto-complete ไม่สร้าง finite target. ยังไม่เปิด ongoing Completed จนกำหนด closure/acceptance policy. ห้ามใช้ finite rule บังคับ ongoing หรืออนุมานว่า ongoing ห้ามปิดตลอดไป

Archive/unarchive ใช้ authority เดิม แยกจาก lifecycle และไม่เพิ่ม completion prerequisite; archived เป็น read-only ตาม server เดิม ต้อง unarchive ก่อน mutation ใหม่ ไม่มี migration ปิดงานให้เอง

## 7. Starting plan / changes / adoption — PROPOSED C05

- Snapshot หนึ่งต้นฉบับต่อ project เมื่อ confirm-start สำเร็จ: schema_version, project_id, mode, objective, in_scope/out_scope, criteria, lead_id, acceptor_id, planned_start, target_date หรือ review_date/cadence ที่ใช้, server actor/time และ project version
- ยังไม่รวม task list/dates/estimates หรือ milestone graph เป็น baseline scheduling โดยนัย (fields เหล่านี้ยังไม่มีใน phase แรก) ไม่เก็บ secret/user contact ใน snapshot
- Post-start changes ของ mode/objective/in_scope/out_scope/criteria/planned_start/target/review commitment/lead/acceptor ต้อง reason + typed old/new + actor/time/request identity/version ใน transaction เดียวกับ mutation; failure rollback ทั้งคู่ ไม่มี formal approval object/workflow บังคับเพิ่ม
- Snapshot ไม่แก้ตาม current plan หรือ reopen การแก้ health ไม่แก้ commitment และไม่ reset baseline; ห้าม endpoint update/delete snapshot ทั่วไป
- Legacy adoption เป็น explicit action โดย metadata authority: เลือก mode/lifecycle/lead/acceptor/dates จากผู้ใช้ ไม่อนุมานจาก task counts หรือ archive; เสนอ initial adoption ได้ Draft/Planning/Active เท่านั้น ไม่ประกาศ historical Completed
- หาก adopt เป็น Active ให้ snapshot_kind=adoption และ captured_at จริง ไม่แอบใส่วันเริ่มในอดีตเป็นเวลา capture; แสดงว่าไม่มี original activation baseline ส่วนงานเก่ายัง advisory
- **PENDING Q-DEL-06:** รับรอง payload boundary, initial adoption states และการเก็บ current commitment เมื่อ adopt Active. DEL-BASELINE/DEL-PROJECT ต้อง block ส่วน adoption/activation จนตกลง; การเก็บ nullable metadata ไม่ควรต้อง invent historical plan

## 8. Health — PROPOSED C06

Not assessed / On track / At risk / Off track เป็น manual assessment มี rationale, next action, actor, assessed_at; default Not assessed ไม่ใช่ healthy. เสนอ stale หลัง 7 วัน แต่ตัวเลขเป็น proposal ไม่ใช่ owner decision. ไม่ derive จาก Done% หรือ overdue เพียงอย่างเดียว; failure/unknown ไม่แสดง 0 หรือ green. Authority C01; history immutable พร้อม optimistic concurrency. **PENDING Q-DEL-07:** ยืนยัน authority, stale interval และ review expectation ก่อน DEL-HEALTH

## 9. Later domains — approved direction, pending contracts

- **Milestone C07 / D05:** title ≤200, owner, date, criteria ≤4000, status/evidence/actor/time และ optional same-project task links. เสนอ planned/at_risk/accepted/cancelled; management write และ named checkpoint acceptor ยังต้องกำหนด ไม่ใช้ group P-02 หรือ linked Done เป็น authority. **Q-DEL-08 pending:** checkpoint acceptance/triage roles, reopen/cancel และ evidence policy
- **Risk C08 / D07:** shared register type risk/issue/blocker; owner, next action ≤2000, review date, scoped affected references, resolution evidence. เสนอ open/untriaged → mitigating → resolved และ accepted-risk เฉพาะ risk; impact/likelihood null until assessed และ likelihood ไม่ใช้กับ actual issue. ไม่มี task enum ใหม่ ไม่มี auto-import comments. **Q-DEL-09 pending:** writer create/owner edit/metadata manager triage+accept-risk เป็น conservative proposal; owner/security ต้องเลือกก่อน DEL-RISK
- **Effort C09 / D06:** เสนอ integer minutes (estimate positive ≤60000; availability 0..10080 ต่อ Monday-start Bangkok week), null unknown. เสนอ primary-owner-only allocation ในรุ่นแรก; ไม่มี owner/estimate ให้รายงาน unallocated/unknown ไม่หารเท่ากันให้ collaborators. ยังไม่กระจาย estimate ข้ามสัปดาห์ตาม calendar span เพราะไม่ใช่ effort plan. Capacity รายสัปดาห์เป็น explicit availability ไม่ใช่เวลาเข้างาน; denominator ที่ไม่รู้ต้องไม่แสดง utilization%. **Q-DEL-10 pending:** units/limits, self vs team edit/read privacy, cross-project visibility, week allocation วิธีใด และ aggregation coverage; DEL-EFFORT blocked ห้ามคำนวณ forecast ตาม default ที่ยังไม่รับรอง
- **Dependencies C10 / D05:** ระยะหลัง milestone/risk; เสนอ finish-to-start same-project warning-only, unique/no self/no cycle; optional lag 0..365 days ยังเป็น proposal. ไม่ gate task transition ไม่เลื่อนวัน; recurrence edge เป็นคนละ domain. **Q-DEL-11 pending:** actor/access/removal/history และ warning semantics/lag ก่อน DEL-DEPENDENCY

## 10. UX reliability และ validation (R09–R11)

ใช้ [page chapters](pages/README.md) เป็นบริบท ไม่ใช้ทั้ง 122 contexts เป็น implementation PR เดียว

1. Dialog ปิดแล้วคืน stable opener หลัง Save/Delete/rerender; ถ้า element หายใช้ next item/section heading ที่มีจริง ไม่คืน focus ไป detached node. Escape ปิด picker ก่อน parent; Tab trap เฉพาะ modal และ IME composition ไม่ submit
2. Dirty close/Escape/backdrop/route/tab/Doc switch ต้อง Stay เป็น default และ Discard explicit; refresh ไม่เขียนทับ draft. Revocation ล้าง private content แม้เสีย draftได้ ไม่ durable-cache credentials หรือ private drafts เพื่อแก้ปัญหา
3. Error persistent มี field/context, nonsecret request ID, retry ที่ทำได้; แยก failed/stale/unknown/empty/denied. Lost acknowledgement ไม่เท่ากับ failure ที่ retry create ได้ทันที ตรวจ latest และคง request intent ตาม locked contract
4. Doc title-first ไม่ persist Untitled record ก่อนผู้ใช้เลือกชื่อ; Save สำเร็จจาก server ack เท่านั้น; timeout/409/offline/maintenance คง context โดยไม่ประกาศสำเร็จ
5. UI permission matrix เทียบ actual service endpoints สำหรับ Admin, owner-team Lead, manager + P-key, editor, viewer, unrelated/inactive/revoked user; test own vs other delete, cross-team และ archive. ไม่ใช้ catalogue เป็นหลักฐานว่า endpoint มีแล้ว
6. Existing limits ใช้ UTF-16 ตาม contract extensions ส่วน password ใช้ Unicode scalar policy แยก; Thai combining marks/emoji surrogate pairs/boundary/IME ต้องผ่าน client+server โดยไม่ truncate legacy content
7. ทดสอบ 360/390/768/1440 px และ zoom 200%, keyboard, long Thai/name/email; form ไม่ล้นแนวนอน, timeline/table scroll ภายในพร้อม accessible text alternative ไม่เพิ่ม paid dependencies

## 11. Verification contract

แต่ละ [task card](../../tickets/delivery/README.md) ระบุ allowed_paths, dependencies, acceptance และ exact test commands. ชื่อ test ใหม่เป็น planned artifacts ไม่ใช่ไฟล์ที่มีแล้ว ผลทั้งหมดของ runtime cards ยัง NOT_RUN. ต้อง RED → GREEN จริงใน implementation PR, migration fresh/legacy + provider-specific PostgreSQL จริง, version races/idempotency/revocation/atomic audit, UI keyboard/mobile และ independent review ก่อน sign-off. SQLite ไม่แทน PostgreSQL, plan checks ไม่แทน application tests, staging ไม่แทน production/UAT
