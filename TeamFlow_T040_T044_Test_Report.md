# T-040–T-044 — History, streamed files, quota, authorized lifecycle and collaboration panels

วันที่: 6 ตุลาคม 2026 · macOS · Node22.23.3/npm10.9.9 · temporary local SQLite · Chromium

เจ้าของสั่งทำ5งานก่อนทดสอบรวม. Declared effort: T-040–T-043 **High**, T-044 **Medium**; actual model/effort **NOT_VERIFIED**. Local implementation/verification **5/5**, all five remain **IN_PROGRESS** under SRS5.2. Task Register **DONE6/77, IN_PROGRESS38, TODO33, remaining71**.

## ผลรายงาน

- **T-040:** scoped current-access ID-ascending TaskEvent pagination50/max100, actor/time/request_id and readable before/after values. Structured legacy task/checklist changes serialize as JSON strings within scalar EventChange. Admin-only immutable audit read; role/reset/membership/configuration writes keep existing atomic audit persistence. Recursive secret-field redaction at write/read protects nested legacy records and secret before/after descriptors; boolean reset markers and installer authority markers retained. No history edit/delete endpoint. Local fixtures validate current scope, strict DTO, legacy create/comment/update records and redaction; existing account/workspace/CLI suites cover their mutations.
- **T-041:** authenticate/origin/CSRF/current access/key checks before streaming; Busboy accepts one file and no fields, UTF8 filename normalization/200-unit bound, traversal/control handling and random UUID storage outside static serving. Hash actual streamed bytes; bounded signature reads/fatal UTF8 and standard ZIP directory inspection for Office type, without extraction. JPG/JPEG/PNG/WEBP/PDF/TXT/CSV/DOCX/XLSX/PPTX/ZIP covered. Actual1byte/10MiB/max+1 tested, including live HTTP10MiB. Current membership/role, archived project/team and deleted parent rechecked at finalize. Persistent reservation tracks temp/finalizing files before metadata commit; transaction rollback/file-move faults recover without untracked metadata/audit. This is signature/type validation, not antivirus/full document decoding.
- **T-042:** persist reservation before disk writes and grow reserved bytes before each chunk; singleton quota serializes across processes. Real two-process20MiB capacity/15MiB stored/two4MiB uploads yields one accepted attachment,19MiB stored and no residual reservation. Replay/validation/quota/access failures release staging without counting stored bytes twice. Actual SIGKILL during receiving/finalizing plus DB reopen/orphan fixtures preserve committed files and recover abandoned UUIDs. Startup calls recovery under the existing exclusive instance guard. Staging that cannot be cleaned remains persistently tracked until repair/recovery.
- **T-043:** authenticated per-request current project/task/attachment checks; private random-key files never exposed by static route or DTO. Download opens regular file with expected byte length, attachment disposition/UTF8 name/no-store/nosniff/requestId; missing disk gives404 with safe requestId-only logging. After stream headers, errors close/log instead of mixing JSON. Uploader/Admin/owner Lead with current effective write can soft-delete/restore before exact30UTC24h cutoff; repeated delete/active restore are no-ops. Deleted metadata scoped to uploader/managers; Viewer denied. Stored soft-deleted bytes retained. Expired metadata queues disk cleanup before removal; failed unlink retries retain counted bytes, and confirmed deletion/ENOENT releases once. Full scheduler/parent retention/orphan policy integration remains T-060.
- **T-044:** real comments/files/history panels with separate pagination, plaintext rendering, selected-file/comment draft preservation during refresh, unsaved-close protection and private-state clearing on access failure. Upload progress from XHR, acknowledgment pending, cancellation and explicit same-key retry preserve drafts; actual lost-response retry creates one comment/file. Authorized downloads, deletion/restoration confirmation and server permission hints. Thai times/status labels/history; actual390px layout screenshot inspected. Quota error and permission-clear browser cases use controlled response faults; actual quota/current-revocation behavior independently tested over backend/HTTP/processes. Shared automatic refresh remains T-047.

## Contract and documentation

Additive API **1.1.0** adds **GET /api/audit** with Admin-only standard pagination and AdminAuditPage (serialized redacted_changes), and includes existing mutation fields in TaskEvent. **53 routes/77 schemas**. Generator/OpenAPI, SRS1.7, API contract, Task1.27 and test documents1.24 synchronized; Requirements1.6/business baseline unchanged. Existing file routes/DTOs/versions/permission policies retained. Contract61 tests and test-plan17 tests included in full suite. Full TC/AT execution records remain unchanged,0 formal records; checks of the test plan do not establish release acceptance.

## Validation

| Check | Actual result |
| --- | --- |
| Grouped backend/filesystem/HTTP/process checks | **PASS18/18**: provider11 + actual HTTP4 + two-process/SIGKILL3 |
| Fresh source all npm test suites | **PASS382/382**: Node361 + frontend21; prior workspace combined380/380 before final two file cases |
| Chromium regression | **PASS31/31**: new panels3 + existing regression28 |
| Final panels after latest build/history text | **PASS3/3** |
| Typecheck / lint / build | **PASS**,0 lint warnings; fresh build emits >500KB chunk warning, no performance sign-off |
| Contract / test-plan | **PASS**53routes/77schemas; full TC/AT remain NOT_RUN |
| Fresh offline cached install | **PASS** ci/type/build/tests/migrations+repeat no-op/synthetic seed/omit-dev compiled runtime and CLI |
| Runtime readiness | live200, ready503, meta200 setupRequired, me401/generic login401; production guard retained |
| Native SQL Server harness | **141 SKIP / NOT_RUN**, including11 new provider fixtures; no native connection available |
| Windows / full browser-device / physical devices / UAT | **NOT_RUN** |

Partial trace: **FR-05/27/28/29/39, NFR-02/03, TC-051–059/075, AT-05/08/21/22/30**. Local subset evidence does not close full acceptance, SQL2022 or Windows deployment/backup/restore. See `reports/T-040-044-batch-results.json`, `reports/T-044-fresh-checkout.json`, `reports/T044-panels-mobile.png` and synthetic test code. Logs listed in machine report are ignored operational artifacts.

## Repairs and handoff

First checks caught Busboy parts-limit event firing at the boundary, UTF8 filename default charset, oversize async-iterator stream destruction that stalled parsing, nested descriptor redaction, and UI response/header typing. Fixed and reran affected checks. Quota race fixture was upgraded from scaled bytes to actual MiB; initial fixture parameter mismatch repaired before final PASS. Download handles now close on stat/open validation failure; queued cleanup never claims bytes freed on failed unlink. Git ignores attachment/staging directories.

No commit/push/deploy/DNS/server/shared runtime changes. Synthetic DB/files/processes and fresh source copy cleaned by fixtures; no production data or credentials recorded. Next batch: **T-045 Medium, T-046 Calendar/Gantt High, T-047 High, T-048 High, T-049 High**, preserving dependencies and provider separation.
