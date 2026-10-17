# Task group-order history defect — 9 October 2026

Declared T-003/T-040 High and T-032/T-044 Medium; actual model/effort NOT_VERIFIED. Node22.23.3, temporary SQLite and Chromium; isolated browser port43239. Partial FR-12/18/29, TC-025/027/035/052, AT-09/14/15/21. No formal acceptance/status closure.

## Cause and correction

Owner screenshot Reference ID a54f4fcd-e810-4528-b102-c7bf52c25135 matches live INTERNAL_ERROR/HTTP500. The banner reproduced by opening Task4 without Save. Group-order mutations already persist group_before_task_id (documented since API1.8), but EventChange and the frontend history parser omitted this field. Response validation therefore rejected old audit rows, and the periodic collaboration read surfaced the error in Details too. Synthetic before-fix history GET reproduces500.

Contract1.10.1 adds the existing audit field, the frontend strict parser accepts it, and Activity displays Before task in group. No route/schema-count increase, migration, audit rewriting, permissions, version, idempotency or mutation behavior change. Unknown fields remain rejected. No changes to Claude board files/test or port43171.

## Executed evidence

- build/typecheck/focused lint PASS. Contract regenerated; check:contract PASS85 routes/115 schemas; test:contract65/65 PASS. Frontend49/49 PASS.
- SQLite provider history1/1 PASS: generate reorder event, read it on paginated history and validate response against locked contract. Shared provider suite supports native SQL when run; native SQL was NOT_RUN here.
- Six existing browser scenarios PASS: fields/checklist/completion gate/monthly recurrence/delete/restore/versions/idempotency, comments/files/history/dirty refresh/permissions and mobile behavior.
- New browser1/1 PASS: reorder before a task and append with null; existing history GET200 with exact anchors; Activity parser and labels; Details Save persists Thai title and increments server version; updated Activity has no error. Before-fix500 recorded. Initial post-fix combined run6PASS/1FAIL and following focused failure were test text-locator mismatches (nested list parent/child matching), corrected without changing production logic. Final new scenario PASS; seven distinct scenarios across runs, not a single7/7 batch.
- Test-plan inventory and17/17 policy PASS (planning only); git diff --check PASS.
- Local5000 loaded fix using the original config and SQLite database; readiness PASS. SHA256 comparison confirms users/teams/team_members/projects/tasks/subtasks/task_events/project_groups/project_members/user_permissions unchanged. No migration. Actual Task4 opened read-only after loading fix: Details/latest review/Activity work, no red banner, version7 and seven events retained. No real Save or data mutations used for validation. Private actual screenshot: /private/tmp/friday-history-live-repair/task4-fixed.png.

Machine evidence: reports/task-history-fix/results.json and logs. Synthetic screenshot: reports/UI-task-history-group-order.png. Real logs/data stay private outside the repo; no database backup, real contacts or secrets added.

Native SQL2022/Windows/owner UAT/full provider acceptance NOT_RUN. Task Register DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84; parent tasks unchanged. Next formal T-091 High.
