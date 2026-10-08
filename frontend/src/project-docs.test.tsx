import { test, expect } from 'vitest';
import { docSnippets } from './doc-snippets';
import { sanitizeHtml } from '../../src/security/html-sanitizer';
// T-084: every editor tool produces markup the server allowlist keeps (SRS §9.7).
const tags = (html: string) => html.match(/<[^>]+>/g);
const allow = { imageAllowed: (kind: string, id: number) => kind === 'project-file' && id === 3 };
test('T084 checklist/table/image snippets survive the server sanitizer', () => {
  for (const html of [
    docSnippets.checklist,
    docSnippets.table,
    docSnippets.image('/api/project-files/3/download', 'ผัง.png'),
  ])
    expect(tags(sanitizeHtml(html, allow).html)).toEqual(tags(html));
});
test('T084 image file names are escaped into a harmless alt attribute', () => {
  const html = docSnippets.image('/api/project-files/3/download', '"><img src=x onerror=alert(1)>');
  expect(html).not.toContain('"><img');
  const out = sanitizeHtml(html, allow).html;
  // Exactly one element with only src + quoted alt; the payload stays text inside alt.
  expect(out).toMatch(/^<img src="\/api\/project-files\/3\/download" alt="[^"<>]*">$/);
});
