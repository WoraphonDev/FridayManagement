// T-087 FR-53 @mention tokens `@[Name](#user-ID)`; the server notifies only users who still
// have project access, so suggestions are a convenience and never grant visibility.
const tokenPattern = /@\[([^\]\n]{1,100})\]\(#user-([1-9][0-9]{0,9})\)/g;
export function mentionToken(name: string, id: number) {
  const safe = name.replace(/[\]\n()[]/g, ' ').trim().slice(0, 100) || `user ${id}`;
  return `@[${safe}](#user-${id})`;
}
export type MentionPart = { text: string } | { mention: { name: string; id: number } };
/** Split a plain-text body into text and mention parts; rendering stays text-only. */
export function splitMentions(body: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of body.matchAll(tokenPattern)) {
    if (m.index! > last) parts.push({ text: body.slice(last, m.index) });
    parts.push({ mention: { name: m[1]!, id: Number(m[2]) } });
    last = m.index! + m[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts;
}
/** The "@query" being typed right before the caret, or null. */
export function mentionQuery(text: string, caret: number) {
  const before = text.slice(0, caret);
  const m = /(^|\s)@([^\s@[\]()]{0,40})$/u.exec(before);
  return m ? { start: caret - m[2]!.length - 1, query: m[2]! } : null;
}
