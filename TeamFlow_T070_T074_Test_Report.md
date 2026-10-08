# T-070–T-074 grouped QA — 2026-10-07

Declared effort T070/T072/T074 High, T071/T073 Medium. Actual model/effort NOT_VERIFIED. Node22.23.3/npm10.9.9/macOS; synthetic isolated SQLite/HTTP/real file bytes. This is local subset evidence; open native provider/browser/Windows/UAT dependencies stay open. No product runtime, frontend, contract or migration changes.

## Added journeys and trace

| Task | New executed local coverage | Partial trace |
|---|---|---|
| T070 | Real task validation/null-assignee/Viewer refusal; incomplete checklist no tombstone; overdue Jan31 monthly→Feb29 leap year→Mar31; same-key concurrent responses identical; done checklist guard/reopen/reclose keeps one successor; actual trash/restore/exact30-day cutoff/purge removes bytes and updates quota/audit | TC025–028/030–032/034/079; AT09–13 |
| T071 |501-task HTTP board returns list_required with no partial columns; all6 pages501 unique IDs/null-date filter; Bangkok midnight exact boundary. New browser journey edits from Kanban, verifies Table/Gantt/Calendar/null dates and actual app restart | TC045/047/049 plus existing UI/board cases; AT15–20 partial |
| T072 | Concurrent same-key comment creates one event, plaintext script content; audit mutation route absent, recipients creator/assignee/no self; read other recipient404; read-all leaves private notification unread;90-day exact/+1ms retention. Actual multipart10MiB accepted/checksum download; +1byte413/empty422/fakePDF422 leave quota/reservations/temp unchanged | TC051/052/054/055/060/062/063; AT21–23 partial |
| T073 | Owner-team/person scope; report121 rows vs parsed CSV121 data rows across streaming chunk; Thai/quote/newline/formula prefix; completed basis includes done then excludes reopened and zero-safe metrics. Existing native PWA cache/logout/offline/update/reconnect UI included in grouped run | TC064–066/071/072; AT24/26 partial |
| T074 | New clean restored app uses a real pre-backup cookie: old cookie401, fresh Member login, private task404/Admin audit403, actual authorized attachment bytes, edit persists across restart, ready/live endpoints | TC075/077 plus existing operations075–079; AT25/28 partial |

New journeys are registered in both SQLite and SQL2022 wrappers; same HTTP helper with current cookies/CSRF/Origin/version/keys and internal clock. Each starts from a fresh schema/DB/files and finally cleans only its fixture. Concurrent same-key HTTP requests above share one provider connection/transaction queue; they do not replace separate-connection races. Existing feature suites include separate-process/fault-injection cases, retained as their own evidence.

## Actual checks

- New regression+snapshot grouped **PASS26/26**, including previous10-role regressions and9 snapshots plus7 new journeys. Initial **25PASS/1FAIL**: test fixture queried nonexistent recurrence_events.id; corrected to source_task_id. Test typecheck initially failed because BlobPart requires ArrayBuffer-backed view; copied to Uint8Array. Reopen expected DTO corrected to successor=null plus preserved successor_task_id. Product behavior/locked contract unchanged. Raw failure/retest logs retained.
- Final typecheck PASS; lint PASS. Runtime/frontend/migrations/OpenAPI hashes match the preceding verified source in125 files; compiled assets from that build reused. Build not rerun because none of its inputs changed.
- SQL wrapper **180SKIP/0executed**, NOT_RUN.
- Grouped `npm test` **PASS456/456**, Node418+frontend38, exit0, final source after fixture corrections. Contract check PASS53routes/77schemas/API1.1.0; contract tests and17 planning-policy tests included in regression. Test-plan inventory/evidence checker PASS with formal records0; candidate/final/production gates NOT_RUN.
- Full browser batch **54PASS/1FAIL of55**. New cross-view case selected an exact title while the Table cell includes task ID. First focused retest reached Calendar and failed for the same ID-prefix mismatch there. Corrected both locations to actual accessible cell/button names with IDs; final focused **PASS1/1** through all4views/edit/restart. Therefore55 distinct local browser cases verified, not one final full55 PASS run. Product logic unchanged; failure logs and both DOM contexts preserved. Google Chrome for Testing153.0.8010.12 via Playwright1.63.0/macOS; screenshots/mobile/tablet/touch are emulation. Screenshot `reports/T070-four-view-restart.png` is Calendar after restart; assertions also verify the no-date row below the scroll fold. Formal full TC/AT/browser matrix/UAT not signed off.

## Limits

Native SQL2022 transaction/fault/backup/RESTORE/roles/service-paths, Windows PowerShell/DACL/SCM/IIS/HTTPS/Task Scheduler/reboot/fresh ZIP, deployment RPO/RTO, current+previous vendor browser matrix/physical touch/OS PWA installation, Excel execution, full required TC/AT/RV and owner UAT remain **NOT_RUN**. File allowlist is not antivirus. CSV parser asserts encoding/escaping/neutralized text; no Excel opened. Restore is a synthetic local rehearsal, not owner deployment or production-ready sign-off. Direct snapshot call is after fixture HTTP server stops; full live-upload/freezerace remains required. Partial tests cannot close all acceptance criteria.

All five IN_PROGRESS; **DONE6/77, IN_PROGRESS68, TODO3, remaining71**. Next T075 **High** (performance30users); T076 Medium/T077 High remain future UAT/source delivery. No commit/push/deploy/DNS/service installation/shared runtime change. Immutable source/evidence hashes recorded in reports/T-070-074-batch-results.json; older artifacts are preserved.
