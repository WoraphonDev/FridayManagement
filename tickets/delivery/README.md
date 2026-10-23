# Proposed delivery task cards v1.0

ใช้ YAML frontmatter และหัวข้อ Context / References / Files / Tasks / Acceptance / Not Do / Verify / Questions / Evidence ตาม `tickets/_TEMPLATE.md` แต่ **DEL-* เป็น proposed namespace เท่านั้น** ยังไม่ใช่ official T-NNN allocation. ไม่จอง T-097+ ไม่ปิด T-001–T-096 และไม่เปลี่ยน manifest/totals จน owner adopt พร้อม mapping อย่างชัดเจน

Official Task Register ยัง DONE 9 / total 96 / remaining 87; IN_PROGRESS 84, IN_REVIEW 1, TODO 2. Proposed backlog 16 cards ไม่บวกเข้า denominator นี้; blocked/draft ใน cards ไม่ใช่ official status. ไม่มี runtime tests PASS จากการมีเอกสาร

[Authoritative decisions](../../docs/product/delivery-decisions.md) · [Rules / questions](../../docs/product/delivery-rules.md) · [Rollout/common verification](../../docs/product/delivery-rollout.md) · [Audit contexts](../../docs/product/audit/README.md)

| Proposed ID | Effort | Planning status | One-PR scope / dependencies |
|---|---|---|---|
| [DEL-SPEC](DEL-SPEC.md) | High | draft | Versioned delivery specification and scoped backlog; depends: none |
| [DEL-UX1](DEL-UX1.md) | Medium | draft | Post-mutation focus and mobile shell; depends: DEL-SPEC |
| [DEL-UX2](DEL-UX2.md) | High | draft | Entity draft protection and persistent mutation errors; depends: DEL-UX1 |
| [DEL-UX3](DEL-UX3.md) | High | draft | Title-first Docs and editor recovery; depends: DEL-UX2 |
| [DEL-ACCESS](DEL-ACCESS.md) | High | draft | UI and existing server permission parity; depends: DEL-UX3 |
| [DEL-VALIDATION](DEL-VALIDATION.md) | High | draft | Thai emoji IME validation parity without limit migration; depends: DEL-ACCESS |
| [DEL-CONTRACT](DEL-CONTRACT.md) | High | blocked | Resolve dependent policy and draft delivery wire contracts; depends: DEL-VALIDATION |
| [DEL-PROJECT](DEL-PROJECT.md) | High | blocked | Nullable project delivery metadata and explicit responsibility; depends: DEL-CONTRACT |
| [DEL-TASK](DEL-TASK.md) | High | blocked | Primary task owner and new-task readiness across all mutations; depends: DEL-PROJECT |
| [DEL-BASELINE](DEL-BASELINE.md) | High | blocked | Immutable starting plan and reasoned change history; depends: DEL-TASK |
| [DEL-LIFECYCLE](DEL-LIFECYCLE.md) | High | blocked | Lifecycle transitions and named acceptance; depends: DEL-BASELINE |
| [DEL-HEALTH](DEL-HEALTH.md) | High | blocked | Manual delivery health and scoped summary semantics; depends: DEL-LIFECYCLE |
| [DEL-MILESTONE](DEL-MILESTONE.md) | High | blocked | Structured delivery checkpoints and views; depends: DEL-HEALTH |
| [DEL-RISK](DEL-RISK.md) | High | blocked | Shared Risk Issue Blocker register; depends: DEL-MILESTONE |
| [DEL-EFFORT](DEL-EFFORT.md) | High | blocked | Optional effort and explicit weekly availability; depends: DEL-RISK |
| [DEL-DEPENDENCY](DEL-DEPENDENCY.md) | High | blocked | Later same-project warning-only dependencies; depends: DEL-RISK, DEL-EFFORT |

## Adoption / collision gate

ก่อนเริ่ม runtime ให้ owner adopt card และ assign official IDs ตาม register ที่ target main ปัจจุบัน พร้อม dependency/FR/AT/TC mapping. ช่อง relates ยังว่างโดยเจตนา ไม่สร้าง FR/TC IDs ปลอมหรือแทน existing test results. ถ้าต้องอัปเดต register/test manifest ให้เพิ่ม allowed_paths ผ่าน scope review ใน adoption PR ไม่ถือว่า broad wildcard ให้แก้ทุก task

Card หนึ่งมี allowed_paths ของ PR นั้นเท่านั้น เป็นเพดานแบบเสนอ ไม่ใช่สิทธิ์ลงมือใน docs-only PR นี้. new schema/migration/test filenames เป็น planned artifacts และ exact commands เป็น acceptance targets ไม่ใช่ผลรันแล้ว. Questions ใช้ Q-DEL-* ที่ rules ระบุ; แก้แต่ประเด็นที่ genuinely pending ไม่ขออนุมัติ D01–D12 ซ้ำ
