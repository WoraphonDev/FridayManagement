# ADR-0002 — Delivery-first specification, scoped future backlog

**Version:** 1.0 · **Status:** Approved product direction D01–D12; technical defaults PROPOSED; runtime NOT_IMPLEMENTED

## Context

Requirements/SRS/Monday addendum เดิมไม่มี named business lead/primary task owner, acceptance lifecycle หรือ immutable starting plan และยก dependencies ออกจาก scope. Owner เลือก D01–D12 แล้ว แต่ full page designs ยังมี stale recommendations. การจัดทำ docs/task cards ไม่ใช่การอนุมัติ code/deploy/merge

## Decision and precedence

1. [delivery-decisions](../product/delivery-decisions.md) เป็น transcription ของคำเลือกจริง; [delivery-rules](../product/delivery-rules.md) แยก approved invariants, proposed contracts และ Q-DEL-01–11 ที่ยัง pending
2. ยก exclusion เดิมเรื่อง dependencies **เฉพาะระยะหลังแบบ same-project warning-only** ตาม D05. ไม่ยกเว้น critical path/auto-scheduling, cross-project dependencies, time tracking, custom statuses, AI/email, real-time coediting หรือ full access redesign. D06 อนุญาต optional estimates/weekly availability ไม่ใช่ time tracking
3. Multi-assignees เดิมยังเป็น collaborators; primary owner แยกต่างหาก ไม่มี data loss/grant. Named acceptor บังคับก่อนเริ่ม และ immutable starting plan เมื่อ confirm-start แทน draft ที่บอก optional/deferred. Done% ไม่ใช่ acceptance; archive ยังอิสระ
4. Delivery cards ใช้ proposed namespace `DEL-*` ยังไม่ allocate T-097+ และไม่เปลี่ยน official register totals/status/test manifest. Adoption เข้า register เป็นงานแยกพร้อม mapping/testing และ authority ไม่ปิด parent tasks ย้อนหลัง
5. Current base `4a0b76b` ไม่รวม Windows staging PR #1 (`94282b6`); missing artifacts และ native-staging dependency อยู่ใน [audit](../product/audit/README.md). ไม่แก้ ADR-0001: production PostgreSQL/Linux/Docker; Windows staging ไม่ใช่ production acceptance
6. ไม่แก้ protected AGENTS.md. ตัวเลข version ที่ล้าสมัยใน instruction file ไม่ถูกแก้หรือ bypass; ให้ permitted docs addendum นี้แสดงขอบเขตความต่าง และส่ง instruction-policy conflicts ให้ owner แยกหากเกิดจริง

## Consequences

Contracts/OpenAPI/DB/runtime ไม่เปลี่ยนใน PR นี้. Existing locked contracts และ security/readiness rules ยังใช้จน dedicated implementation PR แก้และทดสอบจริง. Business questions block dependent cards; ไม่ถือว่า broad product approval resolve field defaults ทุกค่า. Human UAT, PostgreSQL/provider evidence, backup/restore, production guard และ owner deployment คงแยกตาม T-093/T-094/T-096 และ ADR-0001

## References

[Rollout](../product/delivery-rollout.md) · [cards](../../tickets/delivery/README.md) · [Requirements](../../TeamFlow_Requirements_v1.0.md) · [SRS](../../TeamFlow_SRS_v1.0.md)
