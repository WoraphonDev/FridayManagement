---
id: T-092
title: "Security Design + Threat model ที่ review แล้ว"
type: security
priority: P1
owner: "ยังไม่มอบหมาย"
status: draft
parent: null
children: []
depends_on: []
relates: { prd_ac: [], fr: [FR-01, FR-02, FR-03, FR-04, FR-05], security: [NFR-02], permissions: ["SRS §4.2"], api_operations: [], ui_pages: [], db_tables: [] }
questions: [Q-T-092-1, Q-T-092-2]
---

## Context
Template หมวด 5.0 บังคับ threat model + control design + verification mapping; repo ยังไม่มี (ตรวจ 2026-10-10)

## References
SRS §4, §6, §9.5, §13; `docs/07-security.md`

## Files
- touch: `docs/07-security.md`
- ห้ามแตะ: source code, contracts (เปลี่ยน control → ticket แยก)

## Tasks
- [x] ร่าง trust boundary, STRIDE TH-01–TH-15, applicability, verification mapping
- [x] ปิด Q-T-092-1/2 แล้วปรับ applicability (internet + MFA risk accepted)
- [ ] ตรวจทุก TH ว่าอ้าง SRS/test ที่มีอยู่จริง
- [ ] Owner/reviewer review และบันทึกผู้อนุมัติ

## Acceptance
ทุก TH มี control + วิธีตรวจ; ทุก N/A มีเหตุผลและผู้ตัดสิน; ไม่ขัด SRS

## Not Do
ไม่เพิ่ม feature (MFA/SSO/email) เอง; ไม่เปลี่ยน requirement

## Verify
Review เอกสาร; cross-check references กับ SRS และโฟลเดอร์ `tests/`

## Questions
Q-T-092-1, Q-T-092-2 — ANSWERED 2026-10-10

## Evidence / Review
2026-10-10 draft 0.1 สร้างแล้ว — ยังไม่ review
