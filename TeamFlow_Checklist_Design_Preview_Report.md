# Checklist design alternatives

Owner requested 3–4 examples after reporting the editing layout as broken. Four interactive mockups show identical synthetic Thai data and Checklist / Assign / Remark fields: Compact table, Stacked list, Item cards and Split editor. This follow-up does not change application source or real data.

Preview source: `/Users/mickitang/.codex/visualizations/2026/10/09/01a12196-8955-7fb3-b2ff-c10e91d06e3f/checklist-designs.html`.

Declared T-033 Medium; actual model/effort NOT_VERIFIED. Partial design trace FR-15, SRS §11, TC-027 / AT-10; mock evidence cannot close these application criteria.

Chromium local mock checks: all four layouts fit at736px and360px with no surface overflow. Final four-variant autosave/cancel/blank-add and actual carousel navigation PASS4/4; zero script errors. Desktop/mobile screenshots visually inspected. Initial sandbox launch was denied by OS permissions; approved isolated retry succeeded. An initial expanded test timed out because carousel switching closed the next draft; corrected navigation exemption passed final4/4. Temporary rendered wrapper and screenshots are in private tmp; no secrets or real user data.

Application integration, native SQL Server, Windows and owner UAT NOT_RUN. Task Register unchanged: DONE7/91, IN_PROGRESS82, IN_REVIEW1, TODO1, remaining84. Next: owner design selection, then T-033 Medium integration; next formal T-091 High.

## Subitem reference follow-up

Owner supplied a subitem grid reference. First alternative now uses Subitem / Owner / Status / Remark, a blue left rail, colored completion cells and + Add subitem inside the table. Status displays the existing boolean as To do/Done; no subitem date, additional workflow or selection feature was added. Other three alternatives are retained.

Focused Chromium mock checks PASS: four columns, add with Owner/Remark, autosave, cancel without overwriting, blank add discarded, status agrees with completion checkbox, desktop736px/mobile360px fit and carousel switching. No script errors. Desktop and mobile screenshots inspected in private tmp; mobile Status label contrast corrected. Application source unchanged; formal acceptance NOT_RUN. Declared T-033 Medium, actual model/effort NOT_VERIFIED; DONE7/91, remaining84; integration T-033 Medium pending design selection.

## Assign popup reference follow-up

Owner supplied a searchable owner-picker reference. Preview now provides an anchored popup with member avatars, search by name/role/team, a current-selection checkmark, Unassigned and a notification cue. It opens on the first table owner initially for comparison, and from each draft Assign control. One synthetic eligible owner may be selected. Email invitation, agents, auto-assignment and mute changes were not included; actual eligibility and persistence remain governed by the existing application contracts when integrated.

Focused Chromium mock checks PASS: role/team search and filtered results, selected owner persistence, no matches, Escape, keyboard search-to-option selection, preserving the row draft while choosing, cancelling that draft, clearing assignment,736px/360px fit; zero script errors. Desktop/mobile screenshots inspected in private tmp. Owner-trigger alignment corrected; popup repositions on resize. Application integration/native SQL2022/Windows/UAT NOT_RUN. T-033 Medium; actual runtime model/effort NOT_VERIFIED. Counts unchanged: DONE7/91, remaining84; next design integration T-033 Medium, next formal T-091 High.
