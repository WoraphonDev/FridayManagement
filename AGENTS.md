# FridayManagement — Agent Rules

## Scope and source documents
- Internal task-management web app for one organization, multiple teams, approximately 30 users.
- Windows deployment by the owner; SQL Server 2022. No email and no AI features.
- Read the relevant requirements, SRS, Task Register and test documents before a task.
- Business baseline is 1.1. Task document content is version 1.3; filenames retain v1.0 for stable references.
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
- Final task report: approximately 3–5 lines covering the result, relevant test results, remaining issues, and next task if applicable.
- Do not repeat requirements, plans, long code, diffs or logs unless needed or requested.
- Search and read only relevant files/ranges. Reuse verified current information; reread when it changes or is incomplete.
- Limit tool output; keep necessary evidence in the Task Register or test report.
- Do not repeat successful checks without relevant changes, failures or new concerns.
- Concision must not reduce required validation, permission checks, transaction correctness or tests.
- Report PASS/FAIL/BLOCKED/NOT_RUN accurately. Never mark a task DONE from code inspection alone.

## Implementation and handoff
- Follow the stack and contracts in the SRS, including SQL Server migrations and real SQL Server integration tests.
- Preserve the task dependencies, permission boundaries and business rules.
- Update Task Register status/evidence for work actually completed.
- Run relevant checks and maintain test-case traceability.
- Do not add excluded features or mark UAT/Windows checks passed without running them.
