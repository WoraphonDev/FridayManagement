import test from 'node:test';
import assert from 'node:assert/strict';
import type { Database, Transaction } from '../../src/domain/database.js';
import { TransactionFailure } from '../../src/domain/failure.js';
import { runTransaction } from '../../src/domain/transaction.js';
test('SQLite busy/locked reports retryable service status without repeating a transaction', async () => {
  for (const errcode of [5, 6, 261]) {
    let calls = 0;
    const db: Database = {
      provider: 'sqlite',
      close: async () => {},
      transaction: async () => {
        calls++;
        throw Object.assign(new Error('synthetic busy'), { code: 'ERR_SQLITE_ERROR', errcode });
      },
    };
    await assert.rejects(
      runTransaction(db, async () => {}, { idempotent: true }),
      { status: 503, code: 'DATABASE_BUSY' },
    );
    assert.equal(calls, 1);
  }
});
test('Only confirmed rolled-back SQL deadlocks on idempotent work retry; cap is two retries', async () => {
  let calls = 0;
  const db: Database = {
    provider: 'sqlserver',
    close: async () => {},
    transaction: async () => {
      calls++;
      if (calls < 3) throw new TransactionFailure('rolled_back', { number: 1205 });
      return 7 as never;
    },
  };
  assert.equal(await runTransaction(db, async () => 7, { idempotent: true }), 7);
  assert.equal(calls, 3);
  calls = 0;
  db.transaction = async () => {
    calls++;
    throw new TransactionFailure('rolled_back', { number: 1205 });
  };
  await assert.rejects(
    runTransaction(db, async () => 7, { idempotent: true }),
    { status: 503, code: 'DATABASE_BUSY', retryAfterSeconds: 5 },
  );
  assert.equal(calls, 3);
});
for (const [label, cause, outcome, idempotent] of [
  ['non-idempotent', { number: 1205 }, 'rolled_back', false],
  ['lock timeout', { number: 1222 }, 'rolled_back', true],
  ['request timeout', { code: 'ETIMEOUT' }, 'unknown', true],
  ['unknown commit', { number: 1205 }, 'unknown', true],
] as const)
  test(`${label} is never blindly retried`, async () => {
    let calls = 0;
    const db: Database = {
      provider: 'sqlserver',
      close: async () => {},
      transaction: async () => {
        calls++;
        throw new TransactionFailure(outcome, cause);
      },
    };
    await assert.rejects(
      runTransaction(db, async () => {}, { idempotent }),
      { status: 503, retryAfterSeconds: 5 },
    );
    assert.equal(calls, 1);
  });
test('Business failures preserve their original identity; work runs in adapter transaction', async () => {
  const failure = new Error('business');
  const tx: Transaction = { execute: async () => {}, query: async () => [] };
  const db: Database = {
    provider: 'sqlserver',
    close: async () => {},
    transaction: async (work) => {
      try {
        return await work(tx);
      } catch (e) {
        throw new TransactionFailure('rolled_back', e);
      }
    },
  };
  await assert.rejects(
    runTransaction(db, async (got) => {
      assert.equal(got, tx);
      throw failure;
    }),
    (e) => e === failure,
  );
});
