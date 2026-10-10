import {
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type HTMLAttributes,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useWritable } from './connection';
import type { ApiError } from '../api';
import { focusOpener } from './opener';
import { Button, LayerProvider } from '@vibe/core';
/** AN-08: shimmer skeleton; the text stays for screen readers and reduced motion. */
export function Loading() {
  return (
    <div className="loading-block">
      <p role="status" aria-live="polite">
        Loading…
      </p>
      <div className="skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function ErrorNotice({ error, retry }: { error: ApiError; retry?: () => void }) {
  return (
    <div className="error" role="alert">
      <p>{error.message}</p>
      {error.requestId && <p>Reference ID: {error.requestId}</p>}
      {retry && <button onClick={retry}>Retry</button>}
    </div>
  );
}
export function Toast({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="toast">
      {children}
      <i className="toast-progress" aria-hidden="true" />
    </div>
  );
}
export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-detail` : undefined}
      />
      {(error || hint) && (
        <p id={`${id}-detail`} className={error ? 'field-error' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
export function DataTable({
  caption,
  columns,
  rows,
  className,
  widths,
  onResize,
  rowProps,
}: {
  caption: string;
  columns: string[];
  rows: ReactNode[][];
  className?: string;
  /** Optional per-column pixel widths (FR-52); undefined = automatic. */
  widths?: (number | undefined)[];
  onResize?: (index: number, width: number) => void;
  rowProps?: (index: number) => HTMLAttributes<HTMLTableRowElement>;
}) {
  const resize = (index: number, start: number, from: number) => (event: PointerEvent) =>
    onResize?.(index, Math.max(48, Math.min(800, Math.round(from + event.clientX - start))));
  return (
    <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table className={className}>
        <caption>{caption}</caption>
        {widths && (
          <colgroup>
            {columns.map((c, i) => (
              <col key={c + i} style={widths[i] ? { width: `${widths[i]}px` } : undefined} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c + i} scope="col">
                {c}
                {onResize && c && (
                  <span
                    className="col-resize"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${c} column`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      const th = (
                        e.currentTarget.parentElement as HTMLElement
                      ).getBoundingClientRect().width;
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        onResize(
                          i,
                          Math.max(
                            48,
                            Math.min(800, Math.round(th + (e.key === 'ArrowLeft' ? -16 : 16))),
                          ),
                        );
                      }
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      const th = (
                        e.currentTarget.parentElement as HTMLElement
                      ).getBoundingClientRect().width;
                      const move = resize(i, e.clientX, th);
                      const up = () => {
                        window.removeEventListener('pointermove', move);
                        window.removeEventListener('pointerup', up);
                      };
                      window.addEventListener('pointermove', move);
                      window.addEventListener('pointerup', up);
                    }}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} {...rowProps?.(i)}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p>Nothing here yet</p>}
    </div>
  );
}
export function Dialog({
  className,
  title,
  eyebrow,
  footer,
  children,
  onClose,
}: {
  className?: string;
  title: string;
  eyebrow?: string;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const backdropDown = useRef(false);
  const outside = (event: { target: EventTarget; clientX: number; clientY: number }) => {
    const node = dialog.current;
    if (!node || event.target !== node) return false;
    const r = node.getBoundingClientRect();
    return (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    );
  };
  const id = useId();
  useEffect(() => {
    const previous = focusOpener();
    const node = dialog.current;
    node?.showModal();
    // Prefer a field the content asked to focus (autoFocus); otherwise the close button.
    const wanted = node?.querySelector<HTMLElement>('[data-autofocus]');
    (wanted ?? closeButton.current)?.focus();
    return () => {
      node?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className={className}
      ref={dialog}
      aria-labelledby={id}
      onKeyDown={(event) => {
        if (event.key !== 'Tab' || event.defaultPrevented) return;
        const items = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
          ) ?? [],
        ).filter((item) => item.getClientRects().length > 0);
        if (!items.length) return;
        // Move focus ourselves: Safari's Tab skips buttons and would leave the modal entirely.
        event.preventDefault();
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = event.shiftKey
          ? at <= 0
            ? items.length - 1
            : at - 1
          : at === -1 || at === items.length - 1
            ? 0
            : at + 1;
        items[next]?.focus();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (
          dialog.current?.querySelector(
            '[data-cell-picker][aria-expanded="true"], [role="combobox"][aria-expanded="true"]',
          )
        )
          return;
        onClose();
      }}
      // Clicking the backdrop (press and release outside the panel) closes like Esc; the
      // caller's onClose still guards unsaved drafts.
      onPointerDown={(event) => {
        backdropDown.current = outside(event);
      }}
      onClick={(event) => {
        if (backdropDown.current && outside(event)) onClose();
        backdropDown.current = false;
      }}
    >
      <header className="dialog-head">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2 id={id}>{title}</h2>
        </div>
      </header>
      <LayerProvider layerRef={dialog as { current: HTMLDialogElement }}>
        <div className="dialog-content">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </LayerProvider>
      <button
        className="dialog-close"
        aria-label="Close dialog"
        ref={closeButton}
        autoFocus
        onClick={onClose}
      >
        ×
      </button>
    </dialog>
  );
}

export function Form({
  children,
  onSubmit,
  pending = false,
  blocked = false,
  offline = false,
  submitLabel = 'Save',
  submitAdornment,
  submitDisabled = false,
  formId,
  hideSubmit = false,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending?: boolean;
  blocked?: boolean;
  offline?: boolean;
  submitLabel?: string;
  submitAdornment?: ReactNode;
  submitDisabled?: boolean;
  formId?: string;
  hideSubmit?: boolean;
}) {
  const writable = useWritable();
  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        if (writable && !pending && !blocked && !offline && !submitDisabled) onSubmit(event);
      }}
    >
      <fieldset disabled={!writable || pending || blocked || offline}>
        {children}
        {!hideSubmit && (
          <Button type="submit" size="small" disabled={submitDisabled}>
            {pending ? (
              'Saving…'
            ) : (
              <>
                {submitLabel}
                {submitAdornment}
              </>
            )}
          </Button>
        )}
      </fieldset>
      {offline && <p role="status">Connect to continue. Changes are unavailable offline.</p>}
    </form>
  );
}
