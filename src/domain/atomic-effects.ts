import { runTransaction } from './transaction.js';
import type { Database, Statement, Transaction } from './database.js';

/** Required persistence shares the feature transaction; failures propagate and roll back. */
export async function mutateWithEffects<T>(
  database: Database,
  mutation: (transaction: Transaction) => Promise<T>,
  effects: (result: T) => readonly Statement[],
): Promise<T> {
  return runTransaction(database, async (transaction) => {
    const result = await mutation(transaction);
    for (const statement of effects(result)) await transaction.execute(statement);
    return result;
  });
}
