import React, { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button, Dropdown, TextField, DatePicker, Avatar, LayerProvider } from '@vibe/core';
import '@vibe/core/tokens';
import './preview.css';
import './minimal.css';
import './colorful.css';
import './workspace-theme.css';

// Preview-only bridge: the reviewed HTML retains its synthetic process logic.
// Production implementation will render Vibe directly in the application's React tree.
const roots = new Map<HTMLElement, Root>();
declare global {
  interface Window {
    fridayVibeUnmount?: (container: Element | null) => void;
    fridayKanbanBeforeMove?: (id: number | string) => void;
    fridayKanbanAfterMove?: () => void;
  }
}
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const moveAnimations = new Set<Animation>();
let moveSnapshot: { id: string; focused: boolean; positions: Map<string, DOMRect> } | null = null;
const motionEnabled = () => !reducedMotion.matches && !document.body.classList.contains('no-motion');
const cancelMoves = () => {
  for (const animation of moveAnimations) animation.cancel();
  moveAnimations.clear();
};
window.fridayKanbanBeforeMove = (id) => {
  cancelMoves();
  const cards = [...document.querySelectorAll<HTMLElement>('.kanban [data-card]')];
  moveSnapshot = cards.length ? {
    id: String(id),
    focused: document.activeElement?.closest('[data-card]')?.getAttribute('data-card') === String(id),
    positions: new Map(cards.map(card => [card.dataset.card!, card.getBoundingClientRect()])),
  } : null;
};
window.fridayKanbanAfterMove = () => {
  const snapshot = moveSnapshot;
  moveSnapshot = null;
  if (!snapshot) return;
  // Let the Vibe observer finish mounting before measuring the final layout.
  requestAnimationFrame(() => {
    for (const card of document.querySelectorAll<HTMLElement>('.kanban [data-card]')) {
      const before = snapshot.positions.get(card.dataset.card!);
      if (!before) continue;
      const after = card.getBoundingClientRect();
      const x = before.left - after.left, y = before.top - after.top;
      if (motionEnabled() && (Math.abs(x) > 1 || Math.abs(y) > 1)) {
        card.dataset.kanbanMotion = 'moving';
        const animation = card.animate([
          { transform: `translate(${x}px, ${y}px)`, opacity: 0.85 },
          { transform: 'translate(0, 0)', opacity: 1 },
        ], { duration: card.dataset.card === snapshot.id ? 320 : 220, easing: 'cubic-bezier(.22,1,.36,1)' });
        moveAnimations.add(animation);
        const settle = () => {
          card.dataset.kanbanMotion = 'settled';
          moveAnimations.delete(animation);
        };
        animation.finished.then(settle, settle);
      }
      if (snapshot.focused && card.dataset.card === snapshot.id)
        card.querySelector<HTMLElement>('[role="combobox"]')?.focus({ preventScroll: true });
    }
  });
};
reducedMotion.addEventListener('change', () => { if (!motionEnabled()) cancelMoves(); });
document.addEventListener('change', event => {
  if ((event.target as HTMLElement).matches('#motion-toggle,#settings-motion') && !motionEnabled()) cancelMoves();
});
// Legacy preview renderers must release React roots and their portals before
// replacing a subtree. MutationObserver cleanup runs too late for portal nodes.
window.fridayVibeUnmount = (container) => {
  if (!container) return;
  for (const [host, root] of roots) {
    if (container === host || container.contains(host)) {
      root.unmount();
      roots.delete(host);
    }
  }
};
let sequence = 0;
const allowed = (el: Element) => !el.closest('[data-vibe-host],.studio');
function hostFor(source: Element, block = false) {
  const host = document.createElement(block ? 'div' : 'span');
  host.dataset.vibeHost = '';
  host.className = block ? 'vibe-field-host' : 'vibe-button-host';
  source.replaceWith(host);
  const root = createRoot(host);
  roots.set(host, root);
  return { host, root };
}
function labelOf(source: HTMLElement) {
  return (
    source.getAttribute('aria-label') ||
    source.closest('label')?.querySelector('span')?.textContent?.trim() ||
    [...(source.closest('label')?.childNodes || [])]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent)
      .join('')
      .trim() ||
    (source.id && document.querySelector(`label[for="${source.id}"]`)?.textContent?.trim()) ||
    source.getAttribute('placeholder') ||
    source.getAttribute('name') ||
    'Choose an option'
  );
}
function mountButton(source: HTMLButtonElement) {
  const attrs = [...source.attributes].filter((a) => a.name !== 'class' && a.name !== 'style');
  const classes = source.className
    .split(/\s+/)
    .filter((c) => !['button', 'primary', 'outline', 'danger'].includes(c));
  const markup = source.innerHTML,
    style = source.getAttribute('style');
  const focused = source === document.activeElement;
  const { root } = hostFor(source);
  flushSync(() =>
    root.render(
      <Button
        kind={
          source.classList.contains('primary')
            ? 'primary'
            : source.classList.contains('outline')
              ? 'secondary'
              : 'tertiary'
        }
        color={source.classList.contains('danger') ? 'negative' : 'primary'}
        size="small"
        disabled={source.disabled}
        type={source.type}
        blurOnMouseUp={false}
        className={['vibe-button', ...classes].join(' ')}
        ref={(node) => {
          if (!node) return;
          for (const attr of attrs) node.setAttribute(attr.name, attr.value);
          node.disabled = source.disabled;
          if (style) node.setAttribute('style', style);
          if (focused) node.focus();
        }}
      >
        <span className="vibe-button-content" dangerouslySetInnerHTML={{ __html: markup }} />
      </Button>,
    ),
  );
}
function SelectControl({ source }: { source: HTMLSelectElement }) {
  const [value, setValue] = useState(source.value);
  const [values, setValues] = useState([...source.selectedOptions].map(o => o.value));
  const options = [...source.options].map((o) => ({
    value: o.value,
    label: o.textContent || o.value,
    disabled: o.disabled,
  }));
  const id = source.id || source.name || `dropdown-${++sequence}`;
  const container = source.closest<HTMLElement>('dialog,[popover]') || document.body;
  if (source.multiple) return (
    <LayerProvider layerRef={{ current: container }}>
      <Dropdown multi multiline size="small" options={options}
        value={options.filter(o => values.includes(o.value))}
        placeholder="Select people" searchable={false} clearable disabled={source.disabled}
        aria-label={labelOf(source)} inputAriaLabel={labelOf(source)} menuAriaLabel={`Options for ${labelOf(source)}`}
        onChange={selected => {
          const next = selected.map(o => String(o.value));
          setValues(next);
          for (const option of source.options) option.selected = next.includes(option.value);
          source.dispatchEvent(new Event('change', { bubbles: true }));
        }} />
    </LayerProvider>
  );
  return (
    <LayerProvider layerRef={{ current: container }}>
      <Dropdown
        id={`vibe-${id}`}
        options={options}
        value={options.find((o) => o.value === value)}
        searchable={false}
        clearable={false}
        size="small"
        disabled={source.disabled}
        aria-label={labelOf(source)}
        inputAriaLabel={labelOf(source)}
        menuAriaLabel={`Options for ${labelOf(source)}`}
        onChange={(option) => {
          setValue(String(option.value));
          source.value = String(option.value);
          source.dispatchEvent(new Event('change', { bubbles: true }));
        }}
      />
    </LayerProvider>
  );
}
function mountSelect(source: HTMLSelectElement) {
  const focused = source === document.activeElement;
  const { host, root } = hostFor(source, true);
  host.classList.add('vibe-select-host');
  if (source.hasAttribute('data-status-picker')) {
    host.classList.add('status-picker');
    host.dataset.status = source.value;
  }
  source.hidden = true;
  source.style.display = 'none';
  roots.delete(host);
  root.unmount();
  host.append(source);
  const mount = document.createElement('div');
  host.append(mount);
  // Keep the native control as the FormData/event bridge, outside the React root.
  const selectRoot = createRoot(mount);
  roots.set(host, selectRoot);
  flushSync(() => selectRoot.render(<SelectControl source={source} />));
  if (focused) mount.querySelector<HTMLElement>('[role=combobox]')?.focus();
}
function mountText(source: HTMLInputElement) {
  const focused = source === document.activeElement;
  const attrs = [...source.attributes],
    label = labelOf(source);
  const { root } = hostFor(source, true);
  flushSync(() =>
    root.render(
      <TextField
        id={source.id || `vibe-field-${++sequence}`}
        name={source.name || undefined}
        type={source.type as 'text' | 'password' | 'email'}
        value={source.value}
        placeholder={source.placeholder}
        autoComplete={source.autocomplete}
        maxLength={source.maxLength > 0 ? source.maxLength : undefined}
        required={source.required}
        disabled={source.disabled}
        inputAriaLabel={label}
        size="small"
        setRef={(node) => {
          for (const attr of attrs)
            if (!['class', 'style', 'value'].includes(attr.name))
              node.setAttribute(attr.name, attr.value);
          if (focused) node.focus();
        }}
      />,
    ),
  );
}
function CalendarControl({ source }: { source: HTMLInputElement }) {
  const [open, setOpen] = useState(false),
    [value, setValue] = useState(source.value);
  const name = labelOf(source);
  useEffect(() => {
    const update = () => setValue(source.value);
    source.addEventListener('input', update);
    source.addEventListener('change', update);
    return () => {
      source.removeEventListener('input', update);
      source.removeEventListener('change', update);
    };
  }, [source]);
  const pick = (date: Date | undefined) => {
    const next = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : '';
    source.value = next;
    setValue(next);
    setOpen(false);
    source.dispatchEvent(new Event('input', { bubbles: true }));
    source.dispatchEvent(new Event('change', { bubbles: true }));
    source.focus();
  };
  return (
    <>
      <Button
        kind="secondary"
        size="small"
        disabled={source.disabled}
        aria-label={`Choose date ${name}`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
      >
        ▦
      </Button>
      {open && (
        <section
          className="vibe-calendar-panel"
          aria-label={`Calendar ${name}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              source.focus();
            }
          }}
        >
          <DatePicker
            date={value ? new Date(value + 'T12:00:00') : undefined}
            onDateChange={pick}
            dialogContainerSelector={
              source.closest('dialog')?.id ? '#' + source.closest('dialog')?.id : 'body'
            }
            nextButtonAriaLabel="Next month"
            prevButtonAriaLabel="Previous month"
            monthSelectionAriaLabel="Choose month"
            yearSelectionAriaLabel="Choose year"
          />
          <Button kind="tertiary" size="small" onClick={() => pick(undefined)}>
            Clear date
          </Button>
          <Button kind="tertiary" size="small" onClick={() => setOpen(false)}>
            Close calendar
          </Button>
        </section>
      )}
    </>
  );
}
function mountDate(source: HTMLInputElement) {
  source.setAttribute('aria-label', labelOf(source));
  const host = document.createElement('div');
  host.dataset.vibeHost = '';
  host.className = 'vibe-date-host';
  source.replaceWith(host);
  host.append(source);
  const mount = document.createElement('div');
  mount.className = 'vibe-calendar-host';
  host.append(mount);
  const root = createRoot(mount);
  roots.set(host, root);
  flushSync(() => root.render(<CalendarControl source={source} />));
}
function mountAvatar(source: HTMLElement) {
  const text = source.textContent || '',
    label = source.getAttribute('title') || source.getAttribute('aria-label') || text;
  const color = getComputedStyle(source).backgroundColor;
  const { root, host } = hostFor(source);
  host.classList.add('vibe-avatar-host');
  flushSync(() =>
    root.render(
      <Avatar
        type="text"
        text={text}
        aria-label={label}
        customBackgroundColor={color}
        customSize={24}
        textClassName="vibe-avatar-text"
        withoutTooltip
      />,
    ),
  );
}
function enhance() {
  for (const [host, root] of roots)
    if (!host.isConnected) {
      root.unmount();
      roots.delete(host);
    }
  for (const source of document.querySelectorAll<HTMLButtonElement>(
    'button.button,button.icon-button,button.add-row,button.notify-trigger,button.nav-item',
  ))
    if (allowed(source)) mountButton(source);
  for (const source of document.querySelectorAll<HTMLSelectElement>('select'))
    if (allowed(source)) mountSelect(source);
  for (const source of document.querySelectorAll<HTMLInputElement>(
    'input[type=text],input[type=password],input[type=email],input:not([type])',
  ))
    if (allowed(source)) mountText(source);
  for (const source of document.querySelectorAll<HTMLInputElement>('input[type=date]'))
    if (allowed(source)) mountDate(source);
  for (const source of document.querySelectorAll<HTMLElement>('.avatar'))
    if (allowed(source)) mountAvatar(source);
}
let pending = false;
const observer = new MutationObserver((records) => {
  if (pending || !records.some((r) => r.addedNodes.length || r.removedNodes.length)) return;
  pending = true;
  queueMicrotask(() => {
    pending = false;
    enhance();
  });
});
document.addEventListener(
  'keydown',
  (e) => {
    if (
      e.key === 'Escape' &&
      document.querySelector('dialog[open] .vibe-select-host [aria-expanded="true"]')
    )
      e.preventDefault();
  },
  true,
);
enhance();
observer.observe(document.body, { childList: true, subtree: true });
document.documentElement.dataset.uiLibrary = '@vibe/core@4.5.34';
