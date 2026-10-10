---
id: T-093
title: "OWASP Top 10 A01–A10 verification สำหรับ release 1.0"
type: security
priority: P1
owner: "ยังไม่มอบหมาย"
status: draft
parent: null
children: []
depends_on: [T-092, T-091]
relates: { prd_ac: [], fr: [], security: [NFR-02], permissions: ["SRS §4.2"], api_operations: ["all"], ui_pages: [], db_tables: [] }
questions: [Q-T-093-1]
---

## Context
Template หมวด 5.6 / DoD หมวด 12 บังคับ OWASP ครบทุก release; ยังไม่เคยตรวจ

## References
`docs/07-security.md`, `docs/security/OWASP-1.0.md`, SRS §13.1

## Files
- touch: `docs/security/OWASP-1.0.md`, tests ด้าน security ที่ขาด
- ห้ามแตะ: production / DNS / server จริง

## Tasks
- [ ] รัน `npm audit --omit=dev`, Trivy fs, Gitleaks บน release commit
- [ ] ZAP authenticated scan บน staging Windows + SQL Server 2022
- [ ] รัน CSV formula test บน release build (control มีแล้ว)
- [ ] กรอกหลักฐาน A01–A10, findings → remediation tickets, retest

## Acceptance
A01–A10 มีผล PASS หรือ N/A พร้อม reviewer; ไม่มี finding Critical/High ค้าง

## Not Do
SQLite results ไม่ปิดเกณฑ์ SQL Server; ไม่ mark PASS จาก code inspection อย่างเดียว

## Verify
คำสั่ง scan + report ใน `reports/security/` (ไม่ commit secrets/ข้อมูลจริง)

## Questions
Q-T-093-1 — ANSWERED 2026-10-10

## Evidence / Review
—
