// Safari does not focus buttons on mouse click, so document.activeElement is <body> or a
// focusable ancestor when a dialog opens. Remember the control the pointer pressed so focus can return to it on close.
let lastPressed: HTMLElement | null = null;
if (typeof document !== 'undefined')
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      lastPressed =
        target?.closest<HTMLElement>(
          'button, a[href], summary, [role="button"], [tabindex]:not([tabindex="-1"])',
        ) ?? null;
    },
    true,
  );

/** The element focus should return to when an overlay opened now closes. */
export function focusOpener(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  const pressed = lastPressed?.isConnected ? lastPressed : null;
  // Safari focuses the nearest focusable ancestor (or body) instead of the clicked control.
  if (
    pressed &&
    (!active || active === document.body || (active !== pressed && active.contains(pressed)))
  )
    return pressed;
  return active && active !== document.body ? active : null;
}

/** Capture identity, not only a node that a successful mutation may replace. */
export function restoreOpener(): () => void {
  const previous = focusOpener();
  const scope = previous?.closest<HTMLElement>('dialog, [role="region"][aria-label], main');
  const id = previous?.id;
  const label = previous?.getAttribute('aria-label');
  const tag = previous?.tagName;
  return () => {
    const usable = (node: HTMLElement | null | undefined): node is HTMLElement =>
      !!node?.isConnected &&
      node.getClientRects().length > 0 &&
      !node.closest('[inert], [hidden]') &&
      !node.matches(':disabled, [aria-disabled="true"]');
    if (usable(previous)) {
      previous.focus();
      if (document.activeElement === previous) return;
    }
    // Resolve within the original section only; duplicate labels elsewhere are not openers.
    const container = scope?.isConnected ? scope : document.querySelector('main');
    const replacement = Array.from(container?.querySelectorAll<HTMLElement>(tag ?? 'button') ?? [])
      .find((node) => (id ? node.id === id : !!label && node.getAttribute('aria-label') === label) && usable(node));
    if (replacement) {
      replacement.focus();
      if (document.activeElement === replacement) return;
    }
    // Deleted or filtered item: keep the keyboard in its section, never on a detached node/body.
    const heading = Array.from(container?.querySelectorAll<HTMLElement>('h1, h2, h3') ?? [])
      .find(usable) ?? Array.from(document.querySelectorAll<HTMLElement>('main h1, main h2, main h3'))
      .find(usable);
    if (heading) {
      // Keep it programmatically focusable: removing tabindex immediately blurs
      // non-interactive headings in Chromium. -1 adds no extra Tab stop.
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
      heading.focus();
    }
  };
}
