import type { Transaction } from '../domain/database.js';
import { sql } from '../repository/access-scope.js';
import { utcNow } from '../domain/dates.js';
import { ApiFault } from '../api/errors.js';
import { operations, requestBody } from '../api/contract.js';
import { currentActor, type AccessOptions, type SessionProof } from './authorization.js';

export type Preferences = {
  reduce_motion: boolean;
  confetti: boolean;
  column_widths: Record<string, number>;
  hidden_tabs: string[];
};
/** AN-04 confetti is on by default; motion follows prefers-reduced-motion unless reduced here. */
const defaults: Preferences = {
  reduce_motion: false,
  confetti: true,
  column_widths: {},
  hidden_tabs: [],
};
const keys = Object.keys(defaults) as (keyof Preferences)[];

/** T-089 per-user preferences (SRS §9.11): allowlisted keys, merged on PATCH, self only. */
export function preferenceService(options: AccessOptions = {}) {
  const read = async (tx: Transaction, user: number): Promise<Preferences> => {
    const row = (
      await tx.query<{ data: string }>(
        sql('SELECT data FROM dbo.user_preferences WHERE user_id=@user', { user }),
      )
    )[0];
    let stored: Record<string, unknown> = {};
    try {
      stored = row ? (JSON.parse(row.data) as Record<string, unknown>) : {};
    } catch {
      stored = {};
    }
    // Unknown or stale keys are ignored on read so a removed setting never leaks back.
    const result = { ...defaults };
    for (const key of keys) if (key in stored) Object.assign(result, { [key]: stored[key] });
    return result;
  };
  return {
    async get(tx: Transaction, proof: SessionProof) {
      const actor = await currentActor(tx, proof, false, options);
      return { item: await read(tx, actor.id) };
    },
    async patch(tx: Transaction, proof: SessionProof, input: unknown) {
      const actor = await currentActor(tx, proof, false, options);
      const b = requestBody(
        operations.find((o) => o.operation.operationId === 'patch_api_me_preferences')!.operation,
        input,
      ) as Partial<Preferences>;
      const next = { ...(await read(tx, actor.id)), ...b };
      const data = JSON.stringify(next);
      if (data.length > 4000) throw new ApiFault('VALIDATION_FAILED');
      const now = utcNow(options.clock);
      const exists = (
        await tx.query(
          sql('SELECT user_id FROM dbo.user_preferences WHERE user_id=@user', { user: actor.id }),
        )
      ).length;
      await tx.execute(
        sql(
          exists
            ? 'UPDATE dbo.user_preferences SET data=@data,updated_at=@now WHERE user_id=@user'
            : 'INSERT INTO dbo.user_preferences(user_id,data,updated_at) VALUES(@user,@data,@now)',
          { user: actor.id, data, now },
        ),
      );
      return { item: await read(tx, actor.id) };
    },
  };
}
