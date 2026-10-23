# Delivery audit provenance v1.0

> **Baseline sync update:** PR #1 merged into main at `710655a3f2288da13a00928fb2978cc5638c84cc`; PR #2 has now incorporated that main. References below to missing Windows files / unmerged PR #1 describe the original docs preparation at `4a0b76b`, not current source availability. Source-audit provenance remains `94282b6`; native acceptance remains NOT_RUN. This sync is not a deployment or production approval.


## Baselines ต้องไม่สับสน

- Design source audit: `94282b6c998be9b8306ead402b79f29b5ed6e0c7` บน Windows staging PR #1. เป็น source-read design เดิม ไม่ใช่ browser/test execution ของ PR นี้
- Docs implementation base: main `4a0b76bfbc0870be9d19a4fba09d6916eb26ed00`. PR #1 ไม่ถูก merge/cherry-pick ในงานนี้ และไม่มีอำนาจ merge จากการเขียน spec
- [Source comparison](source-comparison.json): source files ที่ inventory อ้าง 32 ไฟล์มีอยู่ใน main และ content ตรง audit baseline ทั้งหมด ตรวจ git objects จริง ไม่ได้อ้างว่า staging artifacts อยู่ใน main
- Source coverage เดิมอธิบายการอ่าน 37 non-test TSX; 32 เป็นเฉพาะ unique files ที่ inventory ชี้ ไม่ใช่การลด total source audit. ไม่รับรองทุก conditional branch จาก regex หรือ runtime rendering

## Missing from main / external dependency

Git diff สอง baselines พบ Windows staging additions ที่ **ไม่อยู่ใน main นี้**: `.github/workflows/windows-staging.yml`, `deploy/windows/` (Caddy/service/task XML, grants/bootstrap SQL และ env example), `scripts/windows/Restore-Friday.ps1`, `scripts/windows/Test-FridayStaging.ps1`, `scripts/windows/preflight.mjs`, `staging-entry.mjs`, `staging-policy.mjs`, `tests/windows-staging/`, `docs/operations/Windows_Staging_Runbook.md` และ `docs/reports/Windows_Staging_Readiness.md`. ชื่อเหล่านี้เป็น missing-source references ไม่ใช่ลิงก์แกล้งว่ามีไฟล์แล้ว. PR #1 ยังมี edits ของ README/task/ADR/package/browser fixtures และ Windows scripts เดิม; ไม่มี edits เหล่านั้นรวมเข้ามาใน docs PR นี้

Windows staging handling เป็น **dependency แยก** เฉพาะเมื่อจะทดสอบ native staging/pilot ต้องยืนยัน baseline และ merge authority รวมถึง source availability ก่อน ไม่มี dependency บังคับ merge PR #1 เพื่ออ่าน spec หรือทำ UX บน main. ADR-0001 ใน main ยังเป็น production authority: PostgreSQL17/Linux/Docker; staging exception บนอีก branch ไม่ใช่ production scope reversal

## Inventory และข้อจำกัด

[Surface inventory](surface-inventory.json) เก็บ 122 unique IDs พร้อม file/line/name/kind/parent/domain/review heading และ evidence boundary:

| Domain | Contexts |
|---|---:|
| Projects | 12 |
| Tasks / shared | 36 |
| Planning/reporting | 15 |
| Workspace/collaboration | 29 |
| Admin/access | 30 |
| Total | 122 |

ทุก review_document เชื่อม [full page artifacts](../pages/README.md) ใน repo. “designed” หมายถึงมี proposal section ไม่ใช่ implementation approval หรือ PASS. A28 เป็น update-only PWA branch ไม่ใช่ update popup; R04 เป็น static bars ไม่ใช่ drilldown; T25 เป็น native date picker. New milestone/risk/capacity/dependency forms ไม่บวกใน existing surface count

ไม่ commit raw external cache, personal paths, credentials, screenshots/live data หรือเก่า ๆ ที่มีสถานะ PASS/BLOCKED ปะปน. ลิงก์ไปหน้านี้แทน raw evidence filenames ใน historical chapters หมายถึง artifact นั้นถูก omit โดยเจตนา ไม่ใช่เก็บ raw file ไว้ที่นี่. Contract snapshot ใน pages เป็น historical text; current locked OpenAPI และ source เป้าหมายต้องอ่านอีกครั้งก่อน coding
