# FridayManagement — Agent Rules

## Scope and source documents
- Internal task-management web app for one organization, multiple teams, approximately 30 users.
- Runtime: Node.js 22; do not change the shared runtime used by other projects.
- SQLite is authorized for temporary local development. Production targets PostgreSQL 17 on Linux + Docker (ADR-0001, owner decision 2026-10-11, reaffirmed 2026-10-17); SQL Server 2022/Windows is retired from acceptance and release scope. No email delivery and no AI features (owner-approved email/password registration with Admin approval is allowed; it sends no email).
- Read the relevant requirements, SRS, Task Register and test documents before a task.
- Business baseline is 1.1 with the owner-approved Node.js 22/temporary SQLite local profile. Task document content is version 1.53; Requirements are content 1.8 and SRS is content 1.10; test documents are content 1.33 (Test Plan 1.34); filenames retain v1.0 for stable references.
- Do not infer task completion from existing code. Check dependencies, implement acceptance criteria, and record evidence.
- Do not deploy or change DNS/server settings. Source delivery is for the owner to deploy.
- Do not commit passwords, tokens, connection secrets, real user data, uploads or database backups.

## Model and effort
- Default: GPT-6.1 Sol, Medium effort, Standard speed.
- Use High for tasks marked High in TeamFlow_Task_v1.0.md. Follow its per-task assignments.
- Markdown cannot change runtime settings. Verify the selected model/effort before starting; do not claim a setting was changed unless it actually was.
- Do not automatically escalate to Max/Ultra or switch models. Report unresolved issues and use Extra High only when justified.
- Small cosmetic changes may use Low/Light; complete the checks required by the parent task.

## Communication and token use
- Answer in concise, clear Thai. Provide detail when the user asks.
- Report important progress or blockers only; do not narrate each command.
- State each task’s declared effort before starting and name the next task’s effort in the handoff; distinguish declared effort from actual runtime settings if unverified.
- Final task report: approximately 3–5 lines covering the result, relevant test results, remaining issues, and next task/effort if applicable; always include completed/total/remaining counts from the Task Register.
- Do not repeat requirements, plans, long code, diffs or logs unless needed or requested.
- Search and read only relevant files/ranges. Reuse verified current information; reread when it changes or is incomplete.
- Limit tool output; keep necessary evidence in the Task Register or test report.
- Do not repeat successful checks without relevant changes, failures or new concerns.
- Concision must not reduce required validation, permission checks, transaction correctness or tests.
- Report PASS/FAIL/BLOCKED/NOT_RUN accurately. Never mark a task DONE from code inspection alone.

## Implementation and handoff
- Follow the stack and contracts in the SRS as amended by docs/adr/ADR-0001-postgresql-linux-docker.md. Keep SQLite local and PostgreSQL adapters/migrations/test evidence separate. Real PostgreSQL integration (tests/postgres, RUN_POSTGRES_TESTS=1) and Linux/Docker pg_dump backup/restore evidence are required for production acceptance; SQLite results cannot close those criteria. SQL Server adapter/migrations/tests stay in the repository for reference only; keep them compiling but do not require or claim SQL Server evidence.
- Preserve the task dependencies, permission boundaries and business rules, including the owner-approved readiness decisions RD-01–RD-08 in SRS section 18.
- API schemas, versions, errors, idempotency and wire format are locked in TeamFlow_API_Contract.md and contracts/openapi.json. Regenerate with build:contract and run check:contract/test:contract when changing them.
- Update Task Register status/evidence for work actually completed.
- Run relevant checks and maintain test-case traceability. T-004 test/release policy is in TeamFlow_Test_Release_Manifest.md and tests/test-manifest.json; check:test-plan/test:test-plan verify the plan only.
- Supply minimal provider-specific transaction fixtures plus atomic audit/notification persistence during foundation before feature sign-off. Partial T-016/T-027 acceptance stays IN_PROGRESS until cleanup/recurrence dependencies are verified; do not wait for T-067 to begin testing.
- Owner approved Gantt and Monday-inspired design on 2026-10-06 for plan/mock first: FR-25/T-046 High/AT-19/TC-049; dependencies and automatic scheduling remain excluded.
- Owner selected Vibe and an English-base compact Minimal preview on 2026-10-07. Preserve Thai/Unicode user data and Asia/Bangkok dates; application integration and specification alignment remain separate from mock evidence.
- Do not add excluded features or mark UAT/Linux server/Docker checks passed without running them.
