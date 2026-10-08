# Friday Vibe preview

Owner-selected Vibe design review, 7 October2026. Preview only; no production API/data integration.

- Node22.23.3, pinned @vibe/core4.5.34 / React19.3.0 / ReactDOM19.3.0.
- Isolated package/lockfile; root application dependency manifests unchanged.
- Actual Vibe Button, Dropdown, TextField, DatePicker, Avatar, LayerProvider and tokens. Native form/event bridge retains synthetic process logic.
- Table/Kanban/Calendar/Gantt/dialog/checkbox rendering remains custom/native. Production implementation must use the application's React tree directly, not this bridge.
- Date-only values use local year/month/day; Start Plan and End Plan are independent.
- DOM renderers release React roots/portals before subtree replacement. Dialog dropdowns use LayerProvider. Studio role/state controls remain native review controls.

Reproduce from repository root with the existing approved Node22 runtime:

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix design-preview/vibe
node design-preview/vibe/build.mjs
./node_modules/.bin/tsc -p design-preview/vibe/tsconfig.json
node scripts/serve-design-preview.mjs
```

The first command installs the project's existing locked build tools. `build.mjs` uses the root esbuild; preview dependencies are separate. Server binds only127.0.0.1:43191; open http://127.0.0.1:43191/TeamFlow_UI_Vibe_Preview.html. The generated HTML also opens directly with no network/API runtime requests. Reload resets all mock changes. Use the demo button; no real account is needed.

Source: ../../TeamFlow_UI_Redesign_Mockup.html plus adapter.tsx/preview.css and build-time hooks. Output: ../../TeamFlow_UI_Vibe_Preview.html. bundle-report.json contains SHA256 and installed package/license metadata plus bundled module inventory. VIBE-LICENSE.txt preserves core MIT license; bundled JS retains legal comments.

V05 uses English as its base language via english-copy.json (597 static copy entries, longest match first) and minimal.css for compact typography/layout. HTML lang=en and date display en-GB; Bangkok date semantics and runtime Unicode input remain intact. Actual Vibe TextField small size is used. The native source mock remains the Thai source for the build; generated Vibe preview is the current English design. Latest focused evidence: ../../reports/UI-vibe-v05-results.json; V04 evidence is historical and has not been rerun as a full V05 suite.

Verification: reports/UI-vibe-v04-results.json has cumulative focused browser results and limitations. Legacy runner M01–M21 has not run on V04. Formal feature/security/SQL2022/Windows/UAT acceptance remains NOT_RUN.

Dependency audit remains OPEN:53Moderate/6High/0Critical after compatible fixes. All six High packages (braces/fast-glob/globby/micromatch/postcss/stylelint) belong to styling tooling and are absent from esbuild's browser bundle. This does not constitute production security approval. See ../../reports/UI-vibe-dependency-audit-final.json before application integration.

V06 layers colorful.css after minimal.css to restore the earlier palette and restrained motion while retaining compact geometry. Typography uses a consistent system-font stack (Inter when already installed, otherwise Segoe UI/Arial with Thai fallbacks); no font network request. Vibe Avatar initials explicitly use10px text in24px circles. Current evidence: ../../reports/UI-vibe-v06-results.json (10/10 focused cosmetic checks); earlier full suites are historical.


8 October2026: workspace-theme.css is imported by both this adapter and the actual frontend main.tsx. The shared foundation keeps the V06 font stack, compact sizes/leading/weights and mapped live component details consistent. The adapter remains preview-only; actual APIs/state/forms retain real safeguards. Evidence ../../TeamFlow_UI_Workspace_Detail_Report.md.
