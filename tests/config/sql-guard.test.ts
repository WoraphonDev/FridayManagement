import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { Request, ConnectionConfiguration } from 'tedious';
import { acquireSqlInstance, type GuardConnection } from '../../src/config/sql-instance.js';
import { parseConfiguration } from '../../src/config/config.js';

const config = parseConfiguration({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlserver',
  DATA_DIR: '/private/tmp/friday-sqlguard-data',
  LOG_DIR: '/private/tmp/friday-sqlguard-logs',
  DB_SERVER: 'db.test',
  DB_NAME: 'fixture_test',
  DB_USER: 'fixture',
  DB_PASSWORD: 'synthetic-secret',
}).database;
assert(config.provider === 'sqlserver');
class FakeConnection extends EventEmitter implements GuardConnection {
  closed = false;
  closedCount = 0;
  request: Request | undefined;
  constructor(
    private readonly result: unknown = 0,
    private readonly failure:
      'connect' | 'request' | 'end' | 'after-result' | undefined = undefined,
  ) {
    super();
  }
  connect(callback: (error?: Error) => void) {
    callback(this.failure === 'connect' ? new Error('synthetic-secret') : undefined);
  }
  execSql(request: Request) {
    this.request = request;
    if (this.failure === 'end') {
      this.closed = true;
      this.emit('end');
      return;
    }
    request.emit('row', [{ metadata: { colName: 'lock_result' }, value: this.result }]);
    request.callback(this.failure === 'request' ? new Error('synthetic-secret') : null, 1, []);
    if (this.failure === 'after-result') this.emit('error', new Error('synthetic-secret'));
  }
  close() {
    this.closed = true;
    this.closedCount++;
    this.emit('end');
  }
}
test('Dedicated SQL guard uses bound Session/Exclusive lock and closes once without reconnect', async () => {
  const connection = new FakeConnection();
  let options: ConnectionConfiguration | undefined,
    lost = 0;
  const close = await acquireSqlInstance(
    config,
    () => lost++,
    (value) => {
      options = value;
      return connection;
    },
  );
  assert(options);
  assert.equal(options.options?.database, 'fixture_test');
  assert.equal(options.options?.encrypt, true);
  assert.equal(options.options?.trustServerCertificate, false);
  const requestText = connection.request?.sqlTextOrProcedure;
  assert(requestText);
  assert(requestText.includes("@LockOwner='Session'"));
  assert(requestText.includes("@LockMode='Exclusive'"));
  assert(requestText.includes('@LockTimeout=0'));
  assert(!requestText.includes('synthetic-secret'));
  await close();
  await close();
  assert.equal(connection.closedCount, 1);
  assert.equal(lost, 0);
});
test('Guard acquisition rejects negative result and sanitizes connection/request failure', async () => {
  for (const connection of [
    new FakeConnection(-1),
    new FakeConnection(0, 'connect'),
    new FakeConnection(0, 'request'),
    new FakeConnection(0, 'after-result'),
  ]) {
    await assert.rejects(
      acquireSqlInstance(
        config,
        () => undefined,
        () => connection,
      ),
      (error) => error instanceof Error && error.message === 'SQL_INSTANCE_GUARD_UNAVAILABLE',
    );
    assert.equal(connection.closed, true);
  }
});
test('Error/end during acquisition rejects immediately even without a request callback', async () => {
  const connection = new FakeConnection(0, 'end');
  await assert.rejects(
    acquireSqlInstance(
      config,
      () => undefined,
      () => connection,
    ),
    /SQL_INSTANCE_GUARD_UNAVAILABLE/,
  );
});
test('Held session loss notifies shutdown once; intentional close does not trigger failure', async () => {
  const connection = new FakeConnection();
  let lost = 0;
  const close = await acquireSqlInstance(
    config,
    () => lost++,
    () => connection,
  );
  connection.emit('error', new Error('synthetic-secret'));
  connection.emit('end');
  assert.equal(lost, 1);
  await close();
  assert.equal(lost, 1);
});
