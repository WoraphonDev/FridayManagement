import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { UiIcon } from './UiIcon';

export function CellPopover({
  label,
  disabled,
  value,
  children,
  className = '',
  multiple = false,
}: {
  label: string;
  disabled?: boolean;
  value: ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
  multiple?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => {
    document.getElementById(id)?.hidePopover();
    setOpen(false);
    document.getElementById(`${id}-trigger`)?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    const p = panel.current,
      t = trigger.current;
    if (!p || !t || !open) return;
    p.showPopover();
    const position = () => {
      const a = t.getBoundingClientRect();
      p.style.maxHeight = `${Math.max(120, window.innerHeight - 24)}px`;
      const b = p.getBoundingClientRect();
      p.style.left = `${Math.max(12, Math.min(a.left, window.innerWidth - b.width - 12))}px`;
      const below = a.bottom + 6;
      p.style.top = `${Math.max(12, Math.min(below + b.height <= window.innerHeight - 12 ? below : a.top - b.height - 6, window.innerHeight - b.height - 12))}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(p);
    p.querySelector<HTMLElement>(
      'input, [role="option"][aria-selected="true"], [role="option"]',
    )?.focus({ preventScroll: true });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      if (p.matches(':popover-open')) p.hidePopover();
    };
  }, [open]);
  useLayoutEffect(() => {
    if (disabled && panel.current?.matches(':popover-open')) panel.current.hidePopover();
  }, [disabled, open]);
  return (
    <div className={`cell-picker ${className}`}>
      <button
        type="button"
        id={`${id}-trigger`}
        ref={trigger}
        className="cell-picker-trigger"
        data-cell-picker
        role={multiple ? undefined : 'combobox'}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {value}
      </button>
      <div
        id={id}
        ref={panel}
        popover="auto"
        className="cell-popover"
        onToggle={(e) => setOpen(e.newState === 'open')}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            close();
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const options = [
              ...(panel.current?.querySelectorAll<HTMLButtonElement>(
                '[role="option"]:not([disabled])',
              ) ?? []),
            ];
            const index = options.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              options[(index + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length];
            if (next) {
              e.preventDefault();
              next.focus();
            }
          }
        }}
      >
        {open && (
          <>
            <header className="cell-popover-header">
              <span>{label}</span>
              <button type="button" aria-label={`Close ${label} picker`} onClick={close}>
                <UiIcon name="close" />
              </button>
            </header>
            {children(close)}
          </>
        )}
      </div>
    </div>
  );
}
