import type { Statement, Value } from '../../domain/database.js';

/**
 * PostgreSQL text is derived from the SQLite dialect of each statement (no `dbo.`, `$name`
 * parameters, LIMIT/RETURNING), which PostgreSQL already understands. Only the differences are
 * rewritten here, so the 300+ application statements keep a single source.
 */
export function toPostgres(statement: Statement): { text: string; values: Value[] } {
  const parameters = statement.parameters ?? {};
  const order: string[] = [];
  let text = statement.sqlite
    // SQLite physical row id → PostgreSQL tuple id (bounded idempotency cleanup only).
    .replace(/\browid\b/g, 'ctid')
    .replace(
      /\bINSERT OR IGNORE INTO\b([\s\S]*)$/i,
      (_, rest: string) => `INSERT INTO${rest} ON CONFLICT DO NOTHING`,
    )
    // `[name]` quoting (only used for identifiers in application SQL) → standard quoting.
    .replace(/\[([A-Za-z_][A-Za-z0-9_]*)\]/g, '"$1"');
  text = text.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, name: string) => {
    if (!(name in parameters)) throw new Error(`POSTGRES_PARAMETER_MISSING:${name}`);
    const value = parameters[name];
    // A null has no type to infer (e.g. `$team IS NULL OR ...`); the literal has the same meaning.
    if (value === null || value === undefined) return 'NULL';
    let index = order.indexOf(name);
    if (index === -1) index = order.push(name) - 1;
    // Explicit casts keep parameters typed in every context; the schema stores text and integers.
    return typeof value === 'number' ? `$${index + 1}::bigint` : `$${index + 1}::text`;
  });
  return { text, values: order.map((name) => parameters[name] ?? null) };
}
