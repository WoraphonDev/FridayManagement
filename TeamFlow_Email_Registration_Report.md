# Email registration and Admin approval — 12 October 2026

Owner requested email signup and selected email/password with Admin approval. Declared T-014/T-016 High, T-017/T-018 Medium; actual model/effort NOT_VERIFIED. Implements the authorized change to BR-01 without email delivery. Partial FR-02/03/05, BR-01/02/05, TC-004/005/007/012/014 and AT-02/03/04; formal acceptance/UAT remains open.

Create an account is available on Sign in. Applicants submit name, email, password and confirmation; pending accounts are inactive Member with no permissions, teams, projects or sessions. Admin → Registrations provides pending/approved/rejected/all filters, pagination, refresh, confirmation and cancellation. Approval activates sign-in; rejection preserves inactivity. Members/Teams continue to control resource access separately. Email ownership is not verified; Admin confirms organizational membership. Existing contact emails are not automatically converted or merged.

Normalized registration email is unique and immutable, independent of editable contact email. Approved applicants use email/password in the existing Username field; legacy accounts keep username/password. New and duplicate submissions return the same202 message, never replace passwords and do not reopen rejected requests. Rejected applicants contact Admin. Pending/rejected users cannot bypass review through account PATCH activation, promotion or team assignment. Existing active-user guards protect pickers and resource assignments.

API1.13.0:89routes/120schemas. Added POST /api/register, GET /api/registrations and POST /api/registrations/{id}/approve|reject. Same-origin ingress, current Admin/CSRF, current registration version and required review Idempotency-Key are checked server-side. Public signup is10attempts/15minutes/IP before hashing, follows the credential-route idempotency exception, and issues no cookie/token. Password policy/hash/session behavior stays with the existing implementation. Setup must be complete; maintenance rejects writes. Account/request/view revision/redacted audit writes commit together. Approval uses existing bounded account/auth version and session revocation helpers. Independent provider-specific0017 migrations preserve legacy rows.

| Check | Result | Evidence |
|---|---|---|
| Full npm regression | PASS527/527: Node478 + frontend49, including contract66 and test-plan17 subsets | reports/email-registration/regression-final.log |
| Final registration/provider+HTTP+populated migration checks after bounded-version refinement | PASS10/10: SQLite7 + HTTP2 + upgrade1 | reports/email-registration/focused-final.log |
| PostgreSQL17 native registration | PASS7 distinct cases across core5, contact1 and final5 affected cases | reports/email-registration/postgres-core.log; postgres-contact.log; postgres-final.log |
| SQL Server2022 native registration | PASS7 distinct cases across core5, contact1 and final5 affected cases | reports/email-registration/sqlserver-core.log; sqlserver-contact.log; sqlserver-final.log |
| Chromium signup/accounts/sessions | PASS9 distinct cases across initial7/9 and corrected2/2; final signup flow1/1 after version refinement | reports/email-registration/browser-final.log; browser-correction.log; browser-last.log |
| Typecheck/build/full ESLint | PASS; lint0errors/0warnings | reports/email-registration/typecheck.log; build.log; lint.log |
| Contract generation/check and contract tests | PASS89routes/120schemas;66tests in full regression | reports/email-registration/contract.log; regression-final.log |
| Test-plan checks | PASS; validates plan only, no application sign-off | reports/email-registration/plan.log |
| Desktop/360px visual inspection | PASS; tabs do not split labels, internal table scrolling, signup and review controls fit | reports/email-registration/signup-mobile.png; admin-desktop.png; admin-mobile.png |
| Windows native, full browser/device matrix, human UAT, live migration/deployment | NOT_RUN | Source delivery only |

Full527 regression preceded the final bounded-version helper refinement. Relevant final10 checks, native affected cases, build/typecheck/lint and the final browser flow verify that refinement; full527 was not repeated without another concern. Native fixtures use isolated schemas/databases; the final PostgreSQL and SQL Server containers use generated fixture-only credentials and are removed afterward. No real user accounts/contact information are in the evidence.

Raw failures are preserved separately: initial duplicate0016 migration number corrected to0017; SQLite count query passed unused pagination parameters, corrected to status-only; the stale-version test originally matched only ApiFault while the shared lifecycle helper returns OperationError, corrected assertion; the maintenance fixture was updated to current columns before execution; foundation's expected migration ledger gained0017. Browser failures used stale Settings/Sign out selectors; tests now use the existing Profile menu. Initial HTTP sandbox bind was blocked; authorized localhost retry passed. Full-regression first run stopped at the expected-ledger mismatch; the corrected run passed. Whole ESLint initially found synchronous setState in the new effect; removed and guarded aborted responses.

Automatic approval rejected reading credentials from the existing PostgreSQL container and a later SQL Server run. Safer tests used fresh temporary containers with generated credentials; both passed. The initial SQL core fixture had been approved, used a separate temporary database and removed it afterward. No credential values are recorded in tools' outputs, source or report evidence.

No commit/push, live-data mutation, local service restart, deployment, DNS/server configuration or shared runtime change. Existing user CSS/Task Register edits and split deliverables were preserved. Before starting this source version, the owner must apply provider-specific0017 through the normal stopped-instance migration process. Registration email changes and rejected-request reopening are not provided by this scope.

Task Register: DONE9/96, remaining87 (IN_PROGRESS84, IN_REVIEW1, TODO2), unchanged. Next formal release/UAT follow-up T-091 High; deployment rehearsal T-096 High remains separate and owner-operated.
