# Delivery specification v1.0

> **Baseline sync update:** PR #1 merged into main at `710655a3f2288da13a00928fb2978cc5638c84cc`; PR #2 has now incorporated that main. References below to missing Windows files / unmerged PR #1 describe the original docs preparation at `4a0b76b`, not current source availability. Source-audit provenance remains `94282b6`; native acceptance remains NOT_RUN. This sync is not a deployment or production approval.


เริ่มจาก [คำอนุมัติจริง D01–D12](delivery-decisions.md) → [กติกาที่ตรวจได้ / proposed defaults / pending questions](delivery-rules.md) → [ลำดับส่งมอบ](delivery-rollout.md) → [scoped task cards](../../tickets/delivery/README.md)

- สถานะ: docs-only สำหรับ review ไม่มี implementation/deploy/merge approval เพิ่ม
- Current spec branch base: main `4a0b76b`; source design audit: Windows staging `94282b6`, PR #1 แยกงาน ดู [audit provenance](audit/README.md)
- [Full page design snapshots](pages/README.md) เป็น historical proposals ไม่ใช่ approved field contract ทั้งหมด; source paths เป็น repository-relative ไม่ต้องมี directory ส่วนตัวเพื่ออ่าน spec
- [ADR-0002](../adr/ADR-0002-delivery-first-specification.md) แก้ข้อขัดกันกับเอกสารเก่าอย่างจำกัด ไม่แก้ protected AGENTS.md และไม่ยกเลิก production guard
- Task Register หลักยังมี 96 งาน DONE 9 / remaining 87; delivery cards เป็น proposed namespace ยังไม่ถูกนับ ไม่ปิด task เก่า
