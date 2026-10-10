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
