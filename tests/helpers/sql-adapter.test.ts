import test from 'node:test';
import assert from 'node:assert/strict';
import sql from 'mssql';
import { SqlServerDatabase } from '../../src/repository/sqlserver/database.js';
import { TransactionFailure } from '../../src/domain/failure.js';
import { runTransaction } from '../../src/domain/transaction.js';

for (const scenario of ['business rollback', 'rollback failure', 'commit uncertainty'] as const) {
  test(`SQL adapter synthetic driver lifecycle: ${scenario}`, async (t) => {
    const pool = new sql.ConnectionPool({
      server: 'synthetic.invalid',
      database: 'synthetic_test',
    });
    const failure = Object.assign(new Error('fixture'), { number: 1205 });
    let rollbackCalls = 0;
    let workCalls = 0;
    t.mock.method(sql.Transaction.prototype, 'begin', async function (_isolation: number) {
      assert.equal(_isolation, sql.ISOLATION_LEVEL.SERIALIZABLE);
    });
    t.mock.method(sql.Request.prototype, 'batch', async (text: string) => {
      assert.equal(text, 'SET XACT_ABORT ON; SET LOCK_TIMEOUT 5000;');
    });
    t.mock.method(sql.Transaction.prototype, 'commit', async () => {
      throw failure;
    });
    t.mock.method(sql.Transaction.prototype, 'rollback', async function (this: sql.Transaction) {
      rollbackCalls++;
      if (scenario === 'rollback failure') throw new Error('synthetic disconnect');
      this.emit('rollback', false);
    });
    const database = new SqlServerDatabase(pool);
    const work = async () => {
      workCalls++;
      if (scenario !== 'commit uncertainty') throw failure;
      return 1;
    };
    await assert.rejects(database.transaction(work), (e) => {
      assert(e instanceof TransactionFailure);
      assert.equal(e.outcome, scenario === 'business rollback' ? 'rolled_back' : 'unknown');
      assert.equal(e.cause, failure);
      return true;
    });
    workCalls = 0;
    rollbackCalls = 0;
    await assert.rejects(runTransaction(database, work, { idempotent: true }), {
      status: 503,
      code: 'DATABASE_BUSY',
    });
    assert.equal(workCalls, scenario === 'business rollback' ? 3 : 1);
    assert.equal(rollbackCalls, workCalls);
    await database.close();
  });
}
