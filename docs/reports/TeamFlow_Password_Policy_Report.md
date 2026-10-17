# Password policy amendment — 8 October 2026

Owner approved minimum6 Unicode scalars; maximum128 and whitespace preservation unchanged. Setup, own password change, account creation/reset and local recovery share the policy. Login/current-password validation remains1–128. Scrypt costs/random salts, capacity4, rate limits, CSRF, audit and session revocation remain intact. Contract1.2.1:56routes/81schemas; SRS D-11 and UT-04 updated.

Full regression466/466(Node428+frontend38) PASS. Final accounts19/19 and frontend38/38 PASS, including five-scalar rejection, six-scalar acceptance, Unicode boundaries and whitespace preservation. Typecheck/lint/build/contract PASS; existing >500kB bundle warning remains. Raw test evidence: reports/password-policy/. Machine report: reports/password-policy-results.json.

Actual synthetic local Admin account updated through authenticated own-password API, with current password, Origin and CSRF. New login PASS; previous password401 and previous session401. Password omitted from source and reports. Local SQLite results do not close native SQLServer2022/Windows/full browser matrix/UAT acceptance (NOT_RUN).

T-013/T-014/T-015/T-016/T-019 remain IN_PROGRESS. DONE6/77, IN_PROGRESS71, TODO0, remaining71. Declared effort High; actual runtime model/effort NOT_VERIFIED. Next nativeSQL T006/T007 High. No commit/deploy/DNS or shared runtime changes.
