/**
 * FR-48 / SRS §9.7 server-side allowlist sanitizer for project docs.
 * Dependency-free on purpose (NFR-09: no new library without license/audit review).
 * Everything not explicitly allowed is dropped or escaped; output is always re-serialized,
 * never echoed from the input, so the result is well formed and attribute values are quoted.
 */
const allowed = new Set([
  'h1',
  'h2',
  'h3',
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'a',
  'code',
  'pre',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
]);
const aliases: Record<string, string> = { b: 'strong', i: 'em', div: 'p', strike: 's', del: 's' };
const voids = new Set(['br', 'hr', 'img']);
// Raw-text/foreign containers: the tag AND everything inside is discarded.
const dropContent = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'template',
  'noscript',
  'textarea',
  'title',
  'xmp',
  'noembed',
  'noframes',
  'frameset',
  'frame',
  'select',
  'applet',
  'plaintext',
  'head',
  'canvas',
  'audio',
  'video',
  'picture',
  'source',
  'form',
]);
const named: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z]{2,8});?/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      if (!Number.isInteger(n) || n <= 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff))
        return '�';
      return String.fromCodePoint(n);
    }
    return named[code.toLowerCase()] ?? match;
  });
}
const escapeText = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (t: string) => escapeText(t).replace(/"/g, '&quot;');

export interface SanitizeOptions {
  /** Same-project file URL check for <img src>; return true only for files the doc may embed. */
  imageAllowed?: (kind: 'project-file' | 'attachment', id: number) => boolean;
}
export interface Sanitized {
  html: string;
  textLength: number;
  images: { kind: 'project-file' | 'attachment'; id: number }[];
}

function safeHref(value: string): string | null {
  // Browsers ignore ASCII whitespace/control characters inside the scheme; so must we.
  const compact = value.replace(/[\u0000- \u007f-\u009f]/g, '');
  if (!/^(https?:\/\/|mailto:)/i.test(compact)) return null;
  if (value.length > 2000) return null;
  return value.trim();
}
// Sticky patterns avoid re-slicing the input on every tag/attribute (linear time on ~1 MB).
const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9-]{0,62})/y;
const attrPattern = /[\s/]*([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/y;
const imagePattern = /^\/api\/(project-files|attachments)\/([1-9][0-9]{0,9})\/download$/;

export function sanitizeHtml(input: string, options: SanitizeOptions = {}): Sanitized {
  const out: string[] = [];
  const stack: string[] = [];
  const images: Sanitized['images'] = [];
  let textLength = 0;
  let i = 0;
  const text = (raw: string) => {
    if (!raw) return;
    const decoded = decodeEntities(raw);
    textLength += decoded.length;
    out.push(escapeText(decoded));
  };
  const close = (name: string) => {
    const at = stack.lastIndexOf(name);
    if (at < 0) return;
    while (stack.length > at) out.push(`</${stack.pop()}>`);
  };
  while (i < input.length) {
    const lt = input.indexOf('<', i);
    if (lt < 0) {
      text(input.slice(i));
      break;
    }
    text(input.slice(i, lt));
    i = lt;
    if (input.startsWith('<!--', i)) {
      const end = input.indexOf('-->', i + 4);
      i = end < 0 ? input.length : end + 3;
      continue;
    }
    if (input[i + 1] === '!' || input[i + 1] === '?') {
      const end = input.indexOf('>', i);
      i = end < 0 ? input.length : end + 1;
      continue;
    }
    tagPattern.lastIndex = i;
    const tag = tagPattern.exec(input);
    if (!tag) {
      text('<');
      i += 1;
      continue;
    }
    const closing = tag[1] === '/';
    let name = tag[2]!.toLowerCase();
    // Parse attributes up to the real closing '>' while respecting quotes.
    let j = i + tag[0].length;
    const attrs: Record<string, string> = {};
    while (j < input.length && input[j] !== '>') {
      attrPattern.lastIndex = j;
      const m = attrPattern.exec(input);
      if (!m || !m[0]) {
        j++;
        continue;
      }
      if (m[1]) {
        const key = m[1].toLowerCase();
        if (!(key in attrs)) attrs[key] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
      }
      j += m[0].length;
    }
    i = j < input.length ? j + 1 : input.length;
    if (dropContent.has(name)) {
      if (!closing) {
        // Case-insensitive search on the original string; toLowerCase() may change length.
        const closer = new RegExp(`</${name}`, 'gi');
        closer.lastIndex = i;
        const end = closer.exec(input)?.index ?? -1;
        if (end < 0) i = input.length;
        else {
          const gt = input.indexOf('>', end);
          i = gt < 0 ? input.length : gt + 1;
        }
      }
      continue;
    }
    name = aliases[name] ?? name;
    if (!allowed.has(name)) continue;
    if (closing) {
      if (!voids.has(name)) close(name);
      continue;
    }
    let attributes = '';
    if (name === 'a') {
      const href = attrs.href === undefined ? null : safeHref(attrs.href);
      if (href) attributes = ` href="${escapeAttr(href)}" rel="noopener noreferrer nofollow"`;
    } else if (name === 'img') {
      const m = imagePattern.exec((attrs.src ?? '').trim());
      const kind = m?.[1] === 'project-files' ? 'project-file' : 'attachment';
      if (!m || !options.imageAllowed?.(kind, Number(m[2]))) continue;
      images.push({ kind, id: Number(m[2]) });
      attributes = ` src="${escapeAttr(m[0])}" alt="${escapeAttr((attrs.alt ?? '').slice(0, 200))}"`;
    } else if (name === 'ul' && attrs['data-type'] === 'checklist')
      attributes = ' data-type="checklist"';
    else if (
      name === 'li' &&
      (attrs['data-checked'] === 'true' || attrs['data-checked'] === 'false')
    )
      attributes = ` data-checked="${attrs['data-checked']}"`;
    else if (name === 'td' || name === 'th')
      for (const key of ['colspan', 'rowspan']) {
        const n = Number(attrs[key]);
        if (Number.isInteger(n) && n >= 2 && n <= 20) attributes += ` ${key}="${n}"`;
      }
    // Paragraph-like blocks never nest; an open p closes before another block starts.
    if (['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'pre', 'blockquote', 'table', 'hr'].includes(name))
      close('p');
    if (name === 'li') close('li');
    if (name === 'tr') close('tr');
    if (name === 'td' || name === 'th') {
      close('td');
      close('th');
    }
    out.push(`<${name}${attributes}>`);
    if (!voids.has(name)) {
      stack.push(name);
      if (stack.length > 64) throw new Error('DOC_TOO_DEEP');
    }
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  return { html: out.join(''), textLength, images };
}
