// T-084 FR-48 editor snippets, kept apart from ProjectDocs.tsx so React fast refresh stays clean.
const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** Snippets the server allowlist keeps verbatim (SRS §9.7); the server re-sanitizes anyway. */
export const docSnippets = {
  checklist: '<ul data-type="checklist"><li data-checked="false">To do</li></ul>',
  table:
    '<table><tbody><tr><th>Column 1</th><th>Column 2</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p></p>',
  image: (path: string, name: string) =>
    `<img src="${escapeHtml(path)}" alt="${escapeHtml(name.slice(0, 200))}">`,
};
