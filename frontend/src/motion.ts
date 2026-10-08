import { useEffect, useRef, useState } from 'react';
import { currentPreferences } from './preferences';
// T-089 motion system (AN-01–AN-12, NFR-09): transform/opacity only, never blocks actions.
export function motionAllowed() {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.classList.contains('reduce-motion')) return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
let lastConfetti = 0;
const colours = ['#00c875', '#fdab3d', '#579bfc', '#e2445c', '#a25ddc'];
/** AN-04: small, silent, at most once per 2 s; pieces ignore pointer events. */
export function confettiFrom(el: Element | null, now = Date.now()) {
  if (!el || !currentPreferences().confetti || !motionAllowed()) return false;
  if (now - lastConfetti < 2000) return false;
  lastConfetti = now;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 18; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.setAttribute('aria-hidden', 'true');
    piece.style.background = colours[i % colours.length]!;
    piece.style.left = `${r.left + r.width / 2}px`;
    piece.style.top = `${r.top + r.height / 2}px`;
    document.body.append(piece);
    const angle = (Math.PI * 2 * i) / 18,
      distance = 40 + (i % 4) * 14;
    const run = piece.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance + 30}px) rotate(${i * 40}deg)`,
          opacity: 0,
        },
      ],
      { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    run.onfinish = () => piece.remove();
    run.oncancel = () => piece.remove();
  }
  return true;
}
/** Restart a CSS animation class (AN-03 pulse, AN-09 pop) without layout-heavy work. */
export function replay(el: Element | null, className: string) {
  if (!el || !motionAllowed()) return;
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(className);
}
/** AN-10 count-up over 600 ms; shows the final value at once when motion is reduced. */
export function useCountUp(value: number, duration = 600) {
  const [shown, setShown] = useState(() => (motionAllowed() ? 0 : value));
  const frame = useRef(0);
  useEffect(() => {
    if (!motionAllowed()) {
      frame.current = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(frame.current);
    }
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);
  return shown;
}
export function resetConfettiThrottle() {
  lastConfetti = 0;
}
