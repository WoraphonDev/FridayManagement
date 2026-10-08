import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { assignmentPreview } from './assignment-preview.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const output = await build({
  absWorkingDir: here,
  entryPoints: ['adapter.tsx'],
  bundle: true,
  write: false,
  outdir: 'bundle',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof',
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl', '.ttf': 'dataurl' },
  metafile: true,
});
const js = output.outputFiles.find((f) => f.path.endsWith('.js')).text;
const css = output.outputFiles.find((f) => f.path.endsWith('.css'))?.text || '';
let html = readFileSync(resolve(repo, 'TeamFlow_UI_Redesign_Mockup.html'), 'utf8');
html = html
  .replace('DESIGN PREVIEW · 03', 'DESIGN PREVIEW · 06 · VIBE')
  .replace('Friday · UI redesign studio', 'Friday · Vibe UI preview');
// English is the owner-selected base language for this design preview.
// Translate static copy at build time; user-entered Unicode text stays intact.
const englishCopy = JSON.parse(readFileSync(resolve(here, 'english-copy.json'), 'utf8'));
html = html
  .replace('<html lang="th">', '<html lang="en">')
  .replaceAll("'th-TH'", "'en-GB'")
  .replace("medium: 'ปกติ'", "medium: 'Medium'");
for (const [original, translated] of Object.entries(englishCopy).sort(
  (a, b) => b[0].length - a[0].length,
)) {
  html = html.replaceAll(original, translated);
}
html = html.replaceAll('Group by: Group', 'Groups').replaceAll('Group by: Status', 'Status');
html = html.replaceAll(
  '<div class="row between" style="margin-top:12px"><span class="hint">${personName(t.assignee)}</span>${avatar(t.assignee)}</div>',
  '<div class="row card-assignee" style="margin-top:12px">${avatar(t.assignee)}<span class="hint">${personName(t.assignee)}</span></div>',
);
html = assignmentPreview(html);
// Animate successful Kanban moves only, after existing permissions/checklist guards.
const statusStart = html.indexOf('function changeStatus(id, newStatus)');
const statusEnd = html.indexOf('function smallDialog', statusStart);
if (statusStart < 0 || statusEnd < 0) throw new Error('Kanban move hook target missing');
const statusBody = html.slice(statusStart, statusEnd)
  .replace('t.status = newStatus;', 'window.fridayKanbanBeforeMove?.(id);\n          t.status = newStatus;')
  .replace('render();', 'render();\n          window.fridayKanbanAfterMove?.();');
html = html.slice(0, statusStart) + statusBody + html.slice(statusEnd);
html = html.replace(
  "button.parentElement.querySelector('input')",
  "button.closest('.password-wrap').querySelector('input')",
);
// Keep the reviewed native mock intact; add lifecycle handoffs only to Vibe's
// generated preview. Each legacy subtree replacement releases React portals.
html = html.replace(
  /^(\s*)(\$\('#(?:toast|notify-panel \.notify-list|auth-root|app-root|view-body|task-dialog)'\)|d)\.innerHTML\s*=/gm,
  '$1window.fridayVibeUnmount?.($2);\n$1$2.innerHTML =',
);
html = html.replaceAll(
  'button.textContent =',
  "(button.querySelector('.vibe-button-content') || button).textContent =",
);
html = html
  .replace('</head>', `<style data-vibe-bundle>${css}</style></head>`)
  .replace(
    '</body>',
    `<script data-vibe-bundle>${js.replaceAll('</script', '<\\/script')}</script></body>`,
  );
writeFileSync(resolve(repo, 'TeamFlow_UI_Vibe_Preview.html'), html);
const lock = JSON.parse(readFileSync(resolve(here, 'package-lock.json'), 'utf8'));
const packages = Object.entries(lock.packages)
  .filter(([p]) => p)
  .map(([path, p]) => ({
    name: path.split('node_modules/').at(-1),
    version: p.version,
    license:
      p.license ||
      JSON.parse(readFileSync(resolve(here, path, 'package.json'), 'utf8'))
        .licenses?.map((x) => x.type)
        .join(' OR ') ||
      'REVIEW_REQUIRED',
  }));
const shipped = Object.keys(output.metafile.inputs).filter((p) => p.includes('node_modules/'));
writeFileSync(
  resolve(here, 'bundle-report.json'),
  JSON.stringify(
    {
      library: '@vibe/core',
      version: '4.5.34',
      react: '19.3.0',
      node: process.version,
      htmlSHA256: createHash('sha256').update(html).digest('hex'),
      htmlBytes: Buffer.byteLength(html),
      externalRuntimeRequests: 0,
      packages,
      bundledModules: shipped,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    result: 'BUILT',
    library: '@vibe/core@4.5.34',
    htmlBytes: Buffer.byteLength(html),
    jsBytes: Buffer.byteLength(js),
    cssBytes: Buffer.byteLength(css),
  }),
);
