import type { Transaction } from '../domain/database.js';
import { bangkokToday } from '../domain/dates.js';

/** Atomically takes the next value of a named counter inside the caller's transaction. */
async function next(tx: Transaction, scope: string): Promise<number> {
  const rows = await tx.query<{ last_value: number }>({
    sqlite:
      'INSERT INTO number_sequences(scope,last_value) VALUES($scope,1) ON CONFLICT(scope) DO UPDATE SET last_value=number_sequences.last_value+1 RETURNING last_value',
    sqlserver:
      'MERGE dbo.number_sequences WITH (HOLDLOCK) AS s USING (SELECT @scope AS scope) AS v ON s.scope=v.scope WHEN MATCHED THEN UPDATE SET last_value=s.last_value+1 WHEN NOT MATCHED THEN INSERT(scope,last_value) VALUES(v.scope,1) OUTPUT INSERTED.last_value;',
    parameters: { scope },
  });
  return Number(rows[0]!.last_value);
}

/** Owner 2026-10-10: P + Bangkok YY + 2-digit running number per year, e.g. P2601. */
export async function nextProjectCode(tx: Transaction, nowUtc: string): Promise<string> {
  const prefix = `P${bangkokToday(nowUtc).slice(2, 4)}`;
  return `${prefix}${String(await next(tx, `project:${prefix}`)).padStart(2, '0')}`;
}

/** Owner 2026-10-10: TK + Bangkok YYMM + 4-digit running number per month, organization-wide. */
export async function nextTaskNo(tx: Transaction, nowUtc: string): Promise<string> {
  const prefix = `TK${bangkokToday(nowUtc).replaceAll('-', '').slice(2, 6)}`;
  return `${prefix}${String(await next(tx, `task:${prefix}`)).padStart(4, '0')}`;
}
