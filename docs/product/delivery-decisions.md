> Version 1.0 — versioned transcription of actual owner selections D01–D12. Preserved verbatim below; not a new approval of draft details. Specification base `4a0b76b`; design audit baseline `94282b6`. No runtime/deploy/merge authority. [Testable rules / pending details](delivery-rules.md) · [Rollout and tasks](delivery-rollout.md)

# Owner decisions — delivery-first product design

This file records actual owner selections. It supersedes conflicting recommendations in the design drafts, not application behavior. No implementation/deployment authorization is inferred. Remaining IDs are unresolved until explicitly confirmed.

## Confirmed decisions

### D01 — Both finite delivery and ongoing operations
Owner selection: ทั้งแบบมีจุดจบและแบบดูแลต่อเนื่อง — แบบแรกมีวันส่งมอบ แบบหลังมีรอบทบทวน
Rule: explicit delivery mode; finite uses delivery commitment, ongoing uses review cadence/date instead of fabricated final delivery dates. Precise operations closure/review rules remain to specify.

### D02 — Named delivery acceptor
Owner selection: ระบุผู้ตรวจรับหนึ่งคนก่อนเริ่ม — Project lead เป็นได้ ต้องยืนยันพร้อมหลักฐาน; เปลี่ยนผู้ตรวจรับได้โดยผู้มีอำนาจพร้อมประวัติ
Rule: nominate one acceptor before project starts; same person as project lead is allowed. Completion requires affirmative acceptance with evidence. Authorized replacement must be recorded in history. This replaces draft recommendation that intended approver is informational only. Selection does not grant access. Exact eligible roles and replacement authority must be specified during contract design; no administrator acceptance bypass inferred.

### D03 — Security revocation first
Owner selection: ถอนสิทธิ์ทันที เก็บประวัติ และขึ้นสถานะต้องหาผู้รับผิดชอบแทน โดยไม่เลือกคนแทนอัตโนมัติ
Rule: do not block revocation/deactivation on business ownership. Keep historical attribution; mark missing/ineligible current lead/owner for replacement; no auto-selection or permission grant. Missing approver after revocation must similarly require authorized replacement before acceptance.

### D04 — One primary task owner plus collaborators
Owner selection: มีเจ้าของหลักหนึ่งคนและผู้ร่วมทำหลายคน — งานใหม่ต้องเลือกก่อนเริ่ม Doing; งานเก่าขึ้นเตือนให้ทบทวนโดยไม่หยุดงาน
Rule: preserve multiple collaborators, explicit single primary owner required before new tasks enter Doing. Existing tasks get review warnings without retroactive blocking; never derive primary owner from first assignee. Newly created tasks must not evade readiness by jumping directly into later states: exact transition checks must be specified before implementation. No default ownership or silent access grant.

### D05 — Milestones first, warning-only dependencies later
Owner selection: ทำ Milestone ก่อน; Dependency ทำระยะถัดไปแบบเตือนในโปรเจกต์เดียว ไม่เลื่อนวันอัตโนมัติ
Rule: structured delivery checkpoints first; same-project dependency warnings later. No automatic rescheduling or critical-path engine approved. Separate implementation PRs and transition/access rules remain required.

### D06 — Optional estimates and weekly capacity, later phase
Owner selection: มีประมาณ effort และเวลาที่พร้อมทำงานรายสัปดาห์แบบเลือกกรอก ทำหลัง Milestone/ความเสี่ยง; ไม่จับเวลาทำงานจริง
Rule: optional task effort estimates and explicit available weekly capacity after milestone/risk work. Unknown is not zero; do not auto-assume full-time hours, double-count effort across collaborators, or treat task count as capacity. No timers/work logs/time tracking approved. Units/allocation/access details to specify before implementation.

### D07 — Structured Risk/Issue/Blocker register
Owner selection: ทะเบียนร่วมแยกประเภท Risk/Issue/Blocker มีเจ้าของ สิ่งที่จะทำต่อ และวันทบทวน; เชื่อมงานได้โดยไม่เพิ่ม Task status
Rule: shared register with distinct types, owner, next action, review date and task links. Preserve current task status enum. Exact create/triage/accept-risk/resolve authority still needs specification; do not silently grant permissions.

### D08 — Reasoned changes and immutable starting plan
Owner selection: ผู้มีสิทธิ์แก้ได้แต่ต้องระบุเหตุผล เก็บก่อน/หลังและผู้แก้; เก็บแผนตั้งต้นเมื่อยืนยันเริ่ม ไม่เขียนทับ; ยังไม่บังคับอนุมัติหลายขั้น
Rule: authorized post-start commitment/scope changes require reason and atomic old/new/actor/time history. Capture original confirmed plan at activation and never overwrite it. No fabricated legacy baseline or mandatory multi-step approval. This confirms a starting-plan snapshot beyond the earlier draft's deferred baseline recommendation.

### D09 — UI/server permission parity, no automatic grants
Owner selection: ทำ UI ให้ตรงสิทธิ์ server ที่มีจริง พร้อมทดสอบทุกบทบาท โดยไม่เพิ่มสิทธิ์หรือเปลี่ยน role อัตโนมัติ
Rule: audit existing server authority and align UI, with role/access regression tests. Do not implement a full access redesign or assume catalogue descriptions alone prove an endpoint permission.

### D10 — UX reliability first
Owner selection: ทำ UX reliability เป็นงานแรก: ป้องกันร่างหาย คืน focus แจ้ง error ค้างจนแก้ได้ สร้าง Doc ด้วยชื่อ และยืนยันผลบันทึกจาก server
Rule: prioritize unsaved-draft protection, post-mutation focus, actionable persistent errors, title-first Doc creation and authoritative save acknowledgement before large new feature work. No realtime co-editing or formal document approval scope is inferred.

### D11 — Preserve length semantics and align validation
Owner selection: คง limit เดิมก่อน ทำคำแนะนำและ client/server validation ไทย/emoji ให้ตรงกัน ไม่ตัดข้อมูลเก่า; password คงกติกาของมันแยกต่างหาก
Rule: retain current field limits/count semantics and stored content, align UI/helper/server handling and Thai/emoji/IME tests. Password policy remains separate. No mass truncation or silent grapheme-count migration.

### D12 — Legacy projects stay usable, explicitly unreviewed
Owner selection: เก็บข้อมูลและพฤติกรรมเก่า ใช้ต่อได้ พร้อมป้ายยังไม่ทบทวน; ผู้มีสิทธิ์เลือก mode/lifecycle/lead/วันส่งเองภายหลัง ไม่สร้างแผนตั้งต้นย้อนหลังปลอม
Rule: additive nullable migration; retain existing operation/archive/access/data. Mark old project delivery setup unreviewed until an authorized person explicitly classifies it. No forced Planning/Active/Completed, fake original baseline/date/lead or retroactive readiness gate. A later adoption baseline must be clearly timestamped as that adoption, not historical activation.

## Decision status and remaining specification work
All 12 top-level owner decisions D01–D12 above are CONFIRMED. This confirms product-design direction, not that implementation exists, tests passed, every field default was approved, or deployment/production approval was granted.

Before implementing the dependent PR, specify exact actor permissions, transition checks (including direct-to-review/done bypass), ongoing review/closure rules, acceptor replacement/revocation/reopen semantics, snapshot payloads, risk triage states and effort allocation/unit presentation. These are follow-on contract details, not falsely marked as resolved by the broad selections.

## Implementation sequence implied by selections
1. UX reliability, UI/server permission parity, consistent validation.
2. Delivery metadata and explicit project/task ownership plus named acceptor; legacy adoption.
3. Lifecycle, acceptance, health and immutable confirmed starting-plan/change history.
4. Milestones.
5. Structured Risk/Issue/Blocker register and linked follow-up.
6. Optional estimates/weekly capacity and later warning-only same-project dependencies as separate PRs.
No application edits, PR merge or VPS changes were made in this decision session.
