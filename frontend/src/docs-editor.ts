/** Keep a live DOM range only in memory. Never cache private document content. */
export function rememberCaret(editor: HTMLElement | null): Range | undefined {
  const selection = window.getSelection();
  return selection?.rangeCount && editor?.contains(selection.anchorNode)
    ? selection.getRangeAt(0).cloneRange()
    : undefined;
}

export function restoreCaret(editor: HTMLElement | null, range?: Range) {
  if (!editor?.isConnected) return;
  editor.focus({ preventScroll: true });
  if (!range || !editor.contains(range.commonAncestorContainer)) return;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export type DocCreateIntent = Readonly<{ key: string; title: string }>;
export function createDocIntent(
  title: string,
  previous?: DocCreateIntent,
): DocCreateIntent | undefined {
  if (previous) return previous;
  return title.trim() ? { key: crypto.randomUUID(), title: title.trim() } : undefined;
}

export function hasDocChanges(
  doc: { title: string; body_html: string },
  title: string,
  html: string,
) {
  return title !== doc.title || html !== doc.body_html;
}

export function clearsPrivateDraft(status: number) {
  return [401, 403, 404].includes(status);
}
