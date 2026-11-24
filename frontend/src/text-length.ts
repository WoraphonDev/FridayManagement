import { createElement, type ReactElement } from 'react';

// DEL-VALIDATION / D11: the locked contract bounds text by x-utf16MaxLength (equal to
// maxLength), so the binding count is UTF-16 code units. The server trims only
// title/name/display_name/category before validating. Password is a separate scalar policy.
type Options = { trim?: boolean; required?: boolean };

export const textLength = (value: string, { trim = false }: Options = {}) =>
  (trim ? value.trim() : value).length;

export const passwordLength = (value: string) => Array.from(value).length;

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : undefined;
const graphemes = (value: string) =>
  segmenter ? Array.from(segmenter.segment(value), (s) => s.segment) : Array.from(value);

/**
 * Replaces the browser maxLength attribute: limits only newly inserted text, at a
 * grapheme boundary (Thai marks, surrogate pairs and ZWJ emoji are never split).
 * Mid-composition input passes through untouched; legacy over-limit text is never cut.
 * With `trim`, padding the server trims is not counted (same as the server).
 */
export function limitText(
  previous: string,
  next: string,
  max: number,
  composing: boolean,
  { trim = false }: Options = {},
) {
  if (composing || textLength(next, { trim }) <= max || next.length <= previous.length) return next;
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let end = 0;
  while (
    end < previous.length - start &&
    end < next.length - start &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  )
    end++;
  // Keep a code-point boundary at the edges of the inserted range.
  while (start > 0 && /[\uDC00-\uDFFF]/.test(next[start]!)) start--;
  while (end > 0 && /[\uDC00-\uDFFF]/.test(next[next.length - end]!)) end--;
  const head = next.slice(0, start),
    tail = next.slice(next.length - end);
  let budget = max - head.length - tail.length,
    kept = '';
  for (const g of graphemes(next.slice(start, next.length - end))) {
    if (trim ? textLength(head + kept + g + tail, { trim }) > max : g.length > budget) break;
    kept += g;
    budget -= g.length;
  }
  return head + kept + tail;
}

export function lengthHint(value: string, max: number, options: Options = {}) {
  const counted = options.trim ? value.trim() : value;
  const count = counted.length;
  if (count > max) return `${count}/${max} · ${count - max} over the limit`;
  return graphemes(counted).length !== count
    ? `${count}/${max} · Thai vowel/tone marks count separately; emoji count 2 or more`
    : `${count}/${max}`;
}

export function lengthError(label: string, value: string, max: number, options: Options = {}) {
  const count = textLength(value, options);
  if (options.required && !value.trim()) return `${label} is required`;
  if (count > max) return `${label} is ${count}/${max} — remove ${count - max} to save`;
  return undefined;
}

export type FieldIssue = { id: string; message: string };

/** Links each invalid field without touching the draft; focus moves to the field. */
export function FieldErrorSummary({ issues }: { issues: FieldIssue[] }): ReactElement | null {
  if (!issues.length) return null;
  return createElement(
    'div',
    {
      className: 'field-error-summary',
      role: 'status',
      'aria-live': 'polite',
      'aria-label': 'Fix before saving',
    },
    createElement(
      'p',
      null,
      `Fix ${issues.length} field${issues.length > 1 ? 's' : ''} before saving`,
    ),
    createElement(
      'ul',
      null,
      issues.map((issue) =>
        createElement(
          'li',
          { key: issue.id },
          createElement(
            'a',
            {
              href: `#${issue.id}`,
              onClick: (event: { preventDefault(): void }) => {
                event.preventDefault();
                document.getElementById(issue.id)?.focus();
              },
            },
            issue.message,
          ),
        ),
      ),
    ),
  );
}
