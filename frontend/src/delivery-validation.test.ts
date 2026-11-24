import { describe, expect, test } from 'vitest';
import { newPassword } from './auth-policy';
import { lengthError, lengthHint, limitText, passwordLength, textLength } from './text-length';
// Server authority: the real request boundary (trim of title/name/display_name/category,
// then the locked JSON Schema with x-utf16MaxLength). Client parity is asserted against it.
import { operations, requestBody } from '../../src/api/contract';

const thai = 'ที่'; // base + vowel + tone mark: 1 grapheme, 3 UTF-16 units
const emoji = '😀'; // surrogate pair: 2 units
const family = '👨‍👩‍👧'; // ZWJ sequence: 8 units
const op = (method: string, path: string) =>
  operations.find((o) => o.method === method && o.path === path)!.operation;
const server = (method: string, path: string, body: Record<string, unknown>) => {
  try {
    requestBody(op(method, path), body);
    return true;
  } catch {
    return false;
  }
};
const fill = (unit: string, units: number) =>
  unit.repeat(Math.floor(units / unit.length)) + 'x'.repeat(units % unit.length);

describe('DEL-VALIDATION client/server count parity', () => {
  const fields = [
    {
      label: 'Task title',
      max: 200,
      trim: true,
      required: true,
      ok: (v: string) => server('POST', '/api/tasks', { project_id: 1, title: v }),
    },
    {
      label: 'Details',
      max: 10000,
      trim: false,
      required: false,
      ok: (v: string) =>
        server('POST', '/api/tasks', { project_id: 1, title: 't', description: v }),
    },
    {
      label: 'Category',
      max: 80,
      trim: true,
      required: false,
      ok: (v: string) => server('POST', '/api/tasks', { project_id: 1, title: 't', category: v }),
    },
    {
      label: 'Project Name',
      max: 100,
      trim: true,
      required: true,
      ok: (v: string) => server('POST', '/api/projects', { owner_team_id: 1, name: v }),
    },
    {
      label: 'Team Description',
      max: 1000,
      trim: false,
      required: false,
      ok: (v: string) => server('POST', '/api/teams', { name: 'n', description: v }),
    },
    {
      label: 'Doc title',
      max: 200,
      trim: true,
      required: true,
      ok: (v: string) => server('POST', '/api/projects/{id}/docs', { title: v, body_html: '' }),
    },
    {
      label: 'Title name',
      max: 50,
      trim: true,
      required: true,
      ok: (v: string) => server('POST', '/api/job-titles', { name: v }),
    },
    {
      label: 'Member Name',
      max: 100,
      trim: true,
      required: true,
      ok: (v: string) => server('PATCH', '/api/users/{id}', { display_name: v, version: 1 }),
    },
  ];
  for (const f of fields)
    test(`${f.label} at/over limit with Thai marks, emoji and ZWJ matches server`, () => {
      const cases = [
        fill('a', f.max),
        fill('a', f.max + 1),
        fill(thai, f.max),
        fill(thai, f.max) + 'ก',
        fill(emoji, f.max),
        fill(emoji, f.max - 1) + emoji, // max+1 units: emoji is not one unit
        fill(family, f.max),
        fill(family, f.max + 1),
        `  ${fill(thai, f.max)}  `, // padding only matters where the server trims
        '   ',
      ];
      for (const value of cases) {
        expect(
          lengthError(f.label, value, f.max, { trim: f.trim, required: f.required }) === undefined,
        ).toBe(f.ok(value));
      }
    });
  test('counting is UTF-16 code units, not graphemes or scalars', () => {
    expect(textLength(thai)).toBe(3);
    expect(textLength(emoji)).toBe(2);
    expect(textLength(family)).toBe(8);
    expect(textLength('  ก  ', { trim: true })).toBe(1);
    expect(textLength('  ก  ')).toBe(5);
  });
  test('helper text shows the server count and explains non-obvious counting', () => {
    expect(lengthHint('abc', 200)).toBe('3/200');
    expect(lengthHint(`${thai}${emoji}`, 200)).toBe(
      '5/200 · Thai vowel/tone marks count separately; emoji count 2 or more',
    );
    expect(lengthHint(`  ${'a'.repeat(201)}  `, 200, { trim: true })).toBe(
      '201/200 · 1 over the limit',
    );
    expect(lengthError('Task title', 'a'.repeat(201), 200)).toBe(
      'Task title is 201/200 — remove 1 to save',
    );
    expect(lengthError('Task title', '  ', 200, { trim: true, required: true })).toBe(
      'Task title is required',
    );
  });
});

describe('DEL-VALIDATION input limiting', () => {
  test('ASCII paste over the limit keeps exactly the allowed prefix', () => {
    expect(limitText('', 'x'.repeat(201), 200, false)).toBe('x'.repeat(200));
    expect(limitText('a'.repeat(199), 'a'.repeat(200), 200, false)).toBe('a'.repeat(200));
  });
  test('never splits Thai combining clusters, surrogate pairs or ZWJ emoji', () => {
    const base = 'a'.repeat(198);
    expect(limitText(base, base + thai, 200, false)).toBe(base);
    expect(limitText(base + 'a', base + 'a' + emoji, 200, false)).toBe(base + 'a');
    expect(limitText(base, base + emoji + emoji, 200, false)).toBe(base + emoji);
    expect(limitText('a'.repeat(190), 'a'.repeat(190) + family + family, 200, false)).toBe(
      'a'.repeat(190) + family,
    );
    expect(limitText('ab', `a${thai}${thai}b`, 6, false)).toBe(`a${thai}b`);
  });
  test('trimmed fields allow padding the server trims, but never more counted text', () => {
    const at = 'a'.repeat(100);
    expect(limitText('', `  ${at}  `, 100, false, { trim: true })).toBe(`  ${at}  `);
    expect(limitText('', `  ${at}b  `, 100, false, { trim: true })).toBe(`  ${at}`);
    expect(limitText(at, `  ${at}`, 100, false, { trim: true })).toBe(`  ${at}`);
    expect(limitText(at, `${at}x`, 100, false, { trim: true })).toBe(at);
    expect(limitText('', `  ${at}  `, 100, false)).toBe(`  ${'a'.repeat(98)}`);
  });
  test('IME composition is never limited or blocked mid-composition', () => {
    const composing = 'a'.repeat(199) + 'にほんご';
    expect(limitText('a'.repeat(199), composing, 200, true)).toBe(composing);
  });
  test('legacy over-limit content is never truncated; only growth is blocked', () => {
    const legacy = 'ก'.repeat(250);
    expect(limitText(legacy, legacy.slice(1), 200, false)).toBe(legacy.slice(1));
    expect(limitText(legacy, legacy.slice(0, 10) + 'x' + legacy.slice(11), 200, false)).toBe(
      legacy.slice(0, 10) + 'x' + legacy.slice(11),
    );
    expect(limitText(legacy, legacy + 'x', 200, false)).toBe(legacy);
    expect(lengthError('Task title', legacy, 200)).toBe(
      'Task title is 250/200 — remove 50 to save',
    );
  });
});

describe('DEL-VALIDATION password policy stays separate', () => {
  test('password counts Unicode scalars without trim', () => {
    const max = '😀'.repeat(128);
    expect(passwordLength(max)).toBe(128);
    expect(textLength(max)).toBe(256);
    expect(newPassword.safeParse(max).success).toBe(true);
    expect(newPassword.safeParse(max + 'a').success).toBe(false);
    expect(newPassword.safeParse('  abcd').success).toBe(true);
    expect(newPassword.parse('  abcd  ')).toBe('  abcd  ');
    expect(passwordLength(thai)).toBe(3);
  });
});
