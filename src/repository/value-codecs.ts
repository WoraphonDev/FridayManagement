import type { Row, Value } from '../domain/database.js';

export function validDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validUtcTimestamp(value: unknown): boolean {
  if (
    typeof value !== 'string' ||
    !/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value)
  )
    return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}
export function validUuid(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
  );
}
/** SQLite local CI approximation: ASCII trailing space semantics + NFC/lowercase. SQL collation acceptance is tested separately. */
export function localCaseInsensitiveKey(value: string): string {
  return value.normalize('NFC').toLowerCase().replace(/ +$/, '');
}
/** Driver values cross the provider-independent port as primitives, never Date/boolean objects. */
export function normalizeSqlRow(
  row: Record<string, unknown>,
  dateColumns: ReadonlySet<string>,
): Row {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]): [string, Value] => {
      if (value instanceof Date) {
        const iso = value.toISOString();
        const encoded = dateColumns.has(key) ? iso.slice(0, 10) : iso;
        if (!(dateColumns.has(key) ? validDate(encoded) : validUtcTimestamp(encoded)))
          throw new Error('DATABASE_VALUE_INVALID');
        return [key, encoded];
      }
      if (typeof value === 'boolean') return [key, Number(value)];
      if (
        value === null ||
        typeof value === 'string' ||
        (typeof value === 'number' && Number.isSafeInteger(value))
      )
        return [key, value];
      throw new Error('DATABASE_VALUE_INVALID');
    }),
  );
}
