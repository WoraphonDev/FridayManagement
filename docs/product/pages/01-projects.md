> **Historical proposal snapshot v1.0 — ไม่ใช่กติกาที่อนุมัติทั้งหมด:** source `94282b6` (Windows staging PR #1), ไม่ใช่ main `4a0b76b`. ข้อความเก่าที่ว่า D01–D12 ยังไม่อนุมัติ / acceptor optional / baseline deferred ถูกแทนด้วย [decisions](../delivery-decisions.md) และ [rules](../delivery-rules.md). รายละเอียดอื่นเป็นข้อเสนอเท่านั้น; ไม่มีผลทดสอบ runtime ใหม่. ดู [provenance](../audit/README.md).

# 01 — Projects: จากที่เก็บงานสู่การส่งมอบ

> **อัปเดตการตัดสินใจ:** โซยืนยัน D01–D12 แล้ว ดู [คำตอบที่อนุมัติ](../delivery-decisions.md) ซึ่งมีผลเหนือคำแนะนำหรือข้อความ “ยังไม่อนุมัติ” ที่ขัดกันในร่างนี้ โดยเฉพาะผู้ตรวจรับต้องระบุชื่อจริงก่อนเริ่ม และต้องเก็บแผนตั้งต้นเมื่อยืนยันเริ่ม ข้อเสนอ field/กติกาย่อยนอกคำตอบยังไม่ถือว่าอนุมัติทั้งหมด และยังไม่ได้ implement


สถานะ: **ข้อเสนอออกแบบ ไม่ใช่อนุมัติ implementation**; source baseline `94282b6` อ่านอย่างเดียว ไม่มี browser test ใหม่ ดู [dictionary/UX/decisions](00-data-model-and-coverage.md) สำหรับนิยาม field, สิทธิ์ และสถานะผิดปกติร่วมกัน รหัส field `P.*`/`D.*` อ้างนิยามเดียวข้ามบท ชื่อ surface ตรง inventory; source path ทุกแห่งอ้างจาก repository root

## ทิศทางและลำดับข้อมูล
ผู้รับผิดชอบโครงการต้องตอบได้ว่า “ส่งอะไร ให้ใคร เมื่อไร ใครตาม และอะไรคือยอมรับแล้ว” ระบบปัจจุบันตอบชื่อ/ทีม/งาน/อัตรา Done ได้ แต่ไม่ควรแปลเป็น delivery acceptance. แยก **business lead หนึ่งคน**, access Lead หลายคน, project commitment, task-derived span, lifecycle, health, archived_at เป็นคนละแกน ไม่ย้าย task dates ไม่ grant access ไม่ปิดงานอัตโนมัติ

Create ใช้สอง disclosure ไม่ใช่ wizard ยาว: core ชื่อ + owner team; delivery setup เลือกกรอกทีหลัง. เสนอ Objective/lead/dates/acceptance ให้เป็นสิ่งต้องพร้อมก่อน Active ไม่ใช่เงื่อนไขสร้าง Draft. งาน operations ใช้ review date แทนวันสิ้นสุดเฉพาะเมื่อ owner ตัดสินใจ D01; อย่าใช้ project_type เดา workflow

## P01 — Projects directory
**หลักฐาน** `frontend/src/Workspaces.tsx:285–471`, `:39–79`; `workspace-api.ts:29–45`. **งาน/การตัดสินใจ** PM เลือกโครงการที่ต้องตาม ไม่ใช่จัดอันดับคน

Fields ปัจจุบัน: `P.name/description/owner_team/type/category/archive`, code (ไม่ได้แสดงทุกแห่ง), task counts/Done/overdue และ derived dates/team leads (`P.metrics`). Include archived + pagination pageSize10. Type/category มีใน metadata แต่ไม่ควรกล่าวว่า card แสดงแล้วทั้งหมด. ข้อเสนอ: แถว compact ชื่อ/ทีม/business lead/target/lifecycle/health+เวลาประเมิน/overdue; type/category เป็น secondary/filter เมื่อมีข้อมูลจริง. คำว่า Active ปัจจุบันหมายถึงไม่ archive ไม่ใช่ lifecycle Active

ไม่มี task → “ยังไม่มีงาน” ไม่ใช่ 0% ส่งมอบ. P-07 denied/overview failed ต้องแยกจากศูนย์ ไม่สร้าง metric สมมุติ. เพิ่ม accessible search/team/lead/lifecycle filters หลัง API รองรับ; ค่าเริ่ม exclude archived เท่านั้น. Empty no-project มี Create เฉพาะคนมีสิทธิ์; no-match มี Clear; loading คง layout; failed overview ไม่ทำให้ card หาย. Mobile card แสดง target และสถานะข้อความ ไม่ซ่อนความเสี่ยงเพียงเพราะพื้นที่น้อย. ไม่เพิ่ม budget/client entity ในหน้านี้

## P02 — Project card actions
`Workspaces.tsx:212–255,371–374`. งานคือเปิด Tasks/Edit/Archive/Members โดยไม่เผลอเปิด card. ไม่มี field เพิ่ม; เมนูไม่ใช่แบบฟอร์ม. สิทธิ์ UI ปัจจุบัน manage=admin/owner-team lead (`:82–83`), ไม่ใช่ทุก manager แม้ service มี P-01/P-03. แสดงเหตุผลเมื่อ unavailable; อย่าขยายสิทธิ์เพื่อให้ menu ดูสม่ำเสมอ. Keyboard summary→item, Escape/outside close, คืน focus card title หาก list rerender ทำให้ trigger หาย; mobile touch target ไม่ทับ card click

## P03 — Create project
`Workspaces.tsx:793–847,869–900,983–1055`. Fields จริง: name required max100; detail optional max2000; type dropdown `blank/internal/client/operations/other`, default internal; category `blank/development/general/it/marketing/finance/hr/other`, default development; owner team required create, เฉพาะ team admin/lead ตาม picker. Defaults ไม่ใช่เหตุผลบังคับ classification. API/บริการดู `workspace-api.ts:29–45`, `src/services/workspaces.ts:450–505`

**Proposed** เพิ่ม `D.objective` textarea2000, `D.lead` single eligible member, `D.planned_start/target` nullable date-only; collapsed `D.acceptance`4000, in/out scope4000 ต่อ field, optional intended approver. ทั้งหมด optional Draft; objective+lead+start+target+acceptance required ก่อน Active สำหรับ finite delivery เท่านั้น. ตัวอย่าง objective “เปิดระบบจองให้สาขาทดลองใช้งาน”; acceptance “สาขาทดลองยืนยันจอง/แก้ไข/ยกเลิกได้ ไม่มี critical ค้าง”. Helper dates “ไม่เลื่อนวันของงานให้อัตโนมัติ”; lead “เลือกผู้ตามหลัก ไม่เปลี่ยนสิทธิ์”

Primary “Create draft” เมื่อโมเดล lifecycle อนุมัติแล้วเท่านั้น; ปัจจุบันยัง Save/create เดิม. หลังสำเร็จไป Overview และ setup reminders. Team lookup loading/empty/error แยกกัน ไม่ preselect team ผิด; name whitespace invalid; Thai allowed; ไม่สร้าง uniqueness rule ใหม่. Network unknown ใช้ request ID เดิมและตรวจ latest ก่อนสร้างซ้ำ. รักษา draft; ปิด/เปลี่ยน route ถ้า dirty ให้ discard review (proposal: EntityDialog ยังไม่มี guard แบบ TaskEditor). ปุ่ม Save ป้องกันซ้ำและคืน focus ตาม UX01–09

## P04 — Edit project
`Workspaces.tsx:918–1068` ใช้ `P.*` และ `D.*` ชุดเดียวกับ P03. Owner team read-only `:1057–1061`; ไม่ทำ transfer ownership ใน PR metadata. แสดง source ของ dates ว่า commitment vs derived; ไม่กรอก derived ลง target. เปลี่ยน target หลัง Active เสนอ required change reason max2000 บันทึก before/after/actor/time/version atomic; ไม่ใช่ baseline scheduling. `:940–964` มี reload/review checkbox แล้ว แต่ compare ควรแสดงทุก changed field ไม่ใช่เฉพาะข้อความบางส่วน

ปัจจุบัน UI edit admin/lead; service manageProject P-01 (`src/services/workspaces.ts:519`) อาจรองรับ manager มากกว่า UI. PR parity ต้องพิสูจน์ authorization matrix ไม่แอบ grant. Unknown result disable blind retry; latest revalidation ต้องรักษา draftและแจ้ง revoked/archive readonly. Mobile full-height sheet sticky Save/Cancel ไม่บัง error. ไม่เพิ่ม arbitrary custom fields

## P05 — Archive and unarchive project
`Workspaces.tsx:974–980`, payload `:871–872`. ไม่มี field ใหม่: confirmation ต้องแสดงชื่อ ผล read-only/ซ่อนจาก default list และคำว่า “ไม่ใช่ยืนยันส่งมอบ”. Archive/unarchive คง lifecycle, health, commitments, history; ไม่ Done ทุก task. ไม่บังคับ completion ก่อน archive เพราะเป็นการเปลี่ยน business rule เดิม. Pending ไม่ยอม close/ส่งซ้ำ; stale version reload/reviewใหม่; inaccessible ไม่โชว์ข้อมูลค้าง. ใช้ Cancel เป็น initial focus; หลัง archive กลับ list section ที่ยังมองเห็นได้ ไม่ focus DOM ที่ถูกถอด

## P06 — Project membership management
`Workspaces.tsx:1080–1408`, `workspace-api.ts:73–89`. Fields `M.user/active/job_title/explicit/effective/membership_version`. ผู้มีสิทธิ์อ่านดู context ได้ แต่ mutation ต้อง admin/lead หรือ manager+P-03; archive readonly. แสดง origin effective access (derived ถ้า API ส่ง origin จริง) และ business lead badge (proposed) คนละช่อง. No access-derived business role. Error/revocation clear directory/selection ที่ source `:1166–1176` ต้องรักษา. Empty “ไม่มี explicit member” ไม่ใช่ “ไม่มีใครเข้าถึง”

## P07 — Add or update project member
`Workspaces.tsx:1410–1555`: active-user search max100, paged10, selected user, Role viewer default; admin/lead เลือก viewer/editor/manager, P-03 manager เฉพาะ viewer/editor. Fields ใช้ `M.*`; no added sponsor/contributor strings. Helper อธิบาย grant และ eligibility ก่อน confirm. เลือกคนไม่ submit อัตโนมัติ; stale directory revalidate; no-match ไม่ clear selectionเงียบ; role errors อยู่ข้าง control. Manager appointment ต้องมี P-01–P-07 ตาม server ไม่ tick permission ให้อัตโนมัติ. ถ้าเลือก intended project lead ที่ยังไม่มีสิทธิ์ ให้ explicit membership workflow ต่างหาก

## P08 — Project access change and removal review
`Workspaces.tsx:1567–1603`. ไม่มี input ใหม่; แสดง user, explicit before→after, effective access ที่อาจคงอยู่จาก owner-team lead และคำเตือน **loss of write removes assignments on open tasks, historical done retained; explicit project access survives team removal**. ไม่อ้างว่าคำนวณ affected count แล้วหาก API ไม่มี. แนะนำ preview impact endpoint เป็น proposed read-only scoped query ไม่ใช่ raw directory leak. Concurrent membership_version conflict ยกเลิก intent เก่าแล้ว review ใหม่; ไม่ silently resubmit. ถ้าถอด business lead ให้ flag “lead needs replacement”; อย่า block emergency security revocation (D03)

## P09 — Project workspace header and tabs
`TaskWorkspace.tsx:611–795`; `ProjectTasks.tsx:24–31`. Fields name/description/code/team/access/taskTotal/favorite + tabs Overview/Main table/Kanban/Calendar/Gantt/Members/Workload/Docs/Files. Default source `:157–165`: direct project table; click cardอาจ overview. เสนอ explicit URL tab restore + accessible tab arrows; เขียนเป็น UX improvement ไม่อ้างว่ามีแล้ว. Counts ต้อง scope ชัดและ refresh เมื่อเปลี่ยน view ไม่ใช้ stale table total เป็น whole project หลัง filter

Favorite ไม่เพิ่ม field โครงการ เป็น per-user relationship; readonly viewer star ได้ตาม API policyไม่เปลี่ยน membership. Archive banner และ denied tab อธิบายได้. ไม่ expose tabs เป็น proof ว่ามี permission. Task create/details ทั้งหมดนิยามบท02; ไม่ duplicate project datesลง task editor

## P10 — Project members quick view
`TaskWorkspace.tsx:670–680`. รายชื่อจาก projectMembers, ไม่มี edit; ชื่อคน/avatars และ hint assignmentไม่เปลี่ยน access. ไม่เพิ่ม field; เสนอ link ไป Members access context แต่ไม่เพิ่ม manage controlsให้ viewer. No explicit members copy ต้องไม่แปลว่าทีมไม่มีสมาชิก. Modal focus/close mobile/failed list ตาม UX; ไม่อ้างว่า dialogนี้เป็น membership admin

## P11 — Project Members read-only tab
`TaskWorkspace.tsx:751–779`. user + effective access + explicitต่างจาก effective; ไม่มี manage action จริง. ใช้ `M.*`; proposed แสดง active/job title เมื่อ payloadมี และ link manage เฉพาะ permitted context. No silent promotion เพื่อให้ task assign. Loading list แยก error/empty; current list staleหลัง membership edit ต้อง refresh. Role origin unknownให้ “ไม่ระบุแหล่งสิทธิ์” ไม่เดาว่ามาจาก team

## P12 — Project overview
`ProjectInsights.tsx:239–393,395–473`; `src/services/insights.ts:218–239`. Fieldsจริง: status counts, total/done/overdue, ratio, overdue10, assignee/job-title counts, recent10, due bucketsจาก task totals; card dates fallback start-or-due/due-or-start; leads active owner-team **access leads**, max10. สิ่งนี้ไม่ใช่ named project lead และ datesไม่ใช่ commitment

Layout เสนอ: Outcome/acceptance → lead+commitment → lifecycle/health+last assessed → next milestone/blocker → execution counts. `D.*` ทุกตัว NEW pending decisions; ratio label “งาน Done / งานทั้งหมด” ไม่ “สำเร็จโครงการ”. ไม่มีงานแสดง no denominator; hidden due failuresไม่เติมศูนย์. เสนอ actionable drilldownรักษา project/status/date scope, backรักษาfilter. Permission P-07/authorized server accessคงเดิม; no percent from incomplete list. Capacity/milestone/risk cardsยังไม่แสดงก่อน modelผ่าน

## NEW-SCOPE — Delivery controls (ไม่ใช่ actual surface inventory)
- Lifecycle dialog: Draft→Planning→Active; Active↔On hold; Active/On hold→Completed/Cancelled; Completed→Active reopen with reason (เสนอ). Hold reason+optional review date; cancel reason; completion actual date+acceptance evidence+confirm actor, open-task handling **ไม่ auto-close**. Gate role/approver D02 ต้องตกลงก่อน code
- Health update: Not assessed/On track/At risk/Off track + rationale, next action, reviewed_at/actor; not lifecycleและไม่คำนวณจาก overdueอย่างเดียว; stale7daysเป็น proposed defaultไม่ใช่ข้อเท็จจริง
- Milestones/risk/change/dependencies/capacity รายละเอียดบท03; ไม่รวมใน create-project giant form

## PR และ acceptance
**PR-P1 metadata**: nullable additive fields+contracts+provider migration+Create/Edit/Overview/list; no gates yet. Tests Thai/limits/date-only/start>target/no access grant/legacy null/version conflict/lost request/archived/read-only/360–1440 keyboard focusหลัง save rerender. Existing descriptionsและaccessต้อง unchanged

**PR-P2 lifecycle/acceptance** หลัง D01–D03: authoritative transition ruleเดียว, server revalidate references, reasons+audit atomic; tests zero tasksไม่ auto-complete, open tasks require explicit handling, reopenไม่ล้าง acceptance history, archivedไม่เปลี่ยนlifecycle, lead revokedไม่ขัดsecurity removal

**PR-P3 health/list/drilldown** หลัง dataจริง: unknown vs healthy, stale assessment, filtered count vs overall, denied overviewไม่แสดง0, deep link/back/filter, ไม่ให้ hidden project countรั่ว. No paid service/component requirement
