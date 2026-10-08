import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Fixture } from '../schema/fixtures.js';
import { statement as s, insert, seed, time } from '../schema/fixtures.js';
import { migrate } from '../../src/repository/migrate.js';
import {
  lockColumns,
  lockTask,
  bumpTaskVersion,
  renumberColumn,
} from '../../src/repository/board-helpers.js';
import { mutateWithEffects } from '../../src/domain/atomic-effects.js';
import { runTransaction } from '../../src/domain/transaction.js';
export function helperAcceptance(
  provider: string,
  factory: (initial?: boolean) => Promise<Fixture>,
  skip: false | string = false,
) {
  test(
    `${provider}: two-phase rank swap, canonical locks, one column version increment and reopen persistence`,
    { skip },
    async () => {
      const f = await factory();
      try {
        await runTransaction(f.db, async (tx) => {
          const columns = await lockColumns(tx, 1, ['done', 'todo', 'todo', 'review']);
          assert.deepEqual(
            columns.map((c) => c.status),
            ['todo', 'review', 'done'],
          );
          assert.equal(await renumberColumn(tx, columns[0]!, 1, [2, 1]), 2);
          await lockTask(tx, 1, 1, 1);
          assert.equal(await bumpTaskVersion(tx, 1, 1, 1, time), 2);
        });
        const reopened = await f.reopen();
        await reopened.transaction(async (tx) => {
          assert.deepEqual(
            await tx.query(s('SELECT task_id,rank FROM dbo.board_positions ORDER BY rank')),
            [
              { task_id: 2, rank: 1 },
              { task_id: 1, rank: 2 },
            ],
          );
          assert.equal(
            (
              await tx.query(
                s("SELECT version FROM dbo.board_columns WHERE project_id=1 AND status='todo'"),
              )
            )[0]?.version,
            2,
          );
        });
      } finally {
        await f.close();
      }
    },
  );
  test(
    `${provider}: effect failure rolls back ranks, versions and persisted audit/notification together`,
    { skip },
    async () => {
      const f = await factory();
      try {
        await assert.rejects(
          mutateWithEffects(
            f.db,
            async (tx) => {
              const [column] = await lockColumns(tx, 1, ['todo']);
              await renumberColumn(tx, column!, 1, [2, 1]);
              return bumpTaskVersion(tx, 1, 1, 1, time);
            },
            () => [
              insert('task_events', {
                task_id: 1,
                actor_id: 1,
                action: 'updated',
                field_changes: '[]',
                request_id: randomUUID(),
              }),
              insert('notifications', {
                recipient_id: 1,
                task_id: 1,
                dedupe_key: randomUUID(),
                type: 'status',
                message: 'fixture',
              }),
              s('INSERT INTO dbo.missing_helper_fixture(id) VALUES(1)'),
            ],
          ),
          /missing_helper_fixture/,
        );
        await f.db.transaction(async (tx) => {
          assert.deepEqual(
            await tx.query(s('SELECT task_id,rank FROM dbo.board_positions ORDER BY rank')),
            [
              { task_id: 1, rank: 1 },
              { task_id: 2, rank: 2 },
            ],
          );
          assert.equal(
            (await tx.query(s('SELECT version FROM dbo.tasks WHERE id=1')))[0]?.version,
            1,
          );
          assert.equal(
            (
              await tx.query(
                s("SELECT version FROM dbo.board_columns WHERE project_id=1 AND status='todo'"),
              )
            )[0]?.version,
            1,
          );
          assert.equal((await tx.query(s('SELECT id FROM dbo.task_events'))).length, 0);
          assert.equal((await tx.query(s('SELECT id FROM dbo.notifications'))).length, 0);
        });
      } finally {
        await f.close();
      }
    },
  );
  test(
    `${provider}: stale/missing task and stale/incomplete/duplicate column orders cannot leave partial state`,
    { skip },
    async () => {
      const f = await factory();
      try {
        const attempts = await Promise.allSettled(
          [1, 2].map(() =>
            runTransaction(f.db, async (tx) => {
              await lockColumns(tx, 1, ['todo']);
              await lockTask(tx, 1, 1, 1);
              return bumpTaskVersion(tx, 1, 1, 1, time);
            }),
          ),
        );
        assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
        const rejected = attempts.find((a) => a.status === 'rejected');
        assert(rejected?.status === 'rejected');
        assert.equal(rejected.reason.code, 'VERSION_CONFLICT');
        await assert.rejects(
          runTransaction(f.db, (tx) => lockTask(tx, 2, 1, 1)),
          { status: 404 },
        );
        await assert.rejects(
          runTransaction(f.db, (tx) => bumpTaskVersion(tx, 2, 1, 1, time)),
          { status: 404 },
        );
        for (const order of [[1], [1, 1], [1, 3]])
          await assert.rejects(
            runTransaction(f.db, async (tx) => {
              const [c] = await lockColumns(tx, 1, ['todo']);
              await renumberColumn(tx, c!, 1, order);
            }),
            { status: 422 },
          );
        await assert.rejects(
          runTransaction(f.db, async (tx) => {
            const [c] = await lockColumns(tx, 1, ['todo']);
            await renumberColumn(tx, c!, 2, [2, 1]);
          }),
          { status: 409 },
        );
      } finally {
        await f.close();
      }
    },
  );
  test(
    `${provider}: source/target column versions, task status/version, audit and notification commit atomically`,
    { skip },
    async () => {
      const f = await factory();
      try {
        await mutateWithEffects(
          f.db,
          async (tx) => {
            const columns = await lockColumns(tx, 1, ['review', 'todo']);
            await lockTask(tx, 1, 2, 1);
            await tx.execute(s('DELETE FROM dbo.board_positions WHERE task_id=2'));
            await tx.execute(s("UPDATE dbo.tasks SET status='review' WHERE id=2"));
            await bumpTaskVersion(tx, 1, 2, 1, time);
            await tx.execute(
              insert('board_positions', { task_id: 2, project_id: 1, status: 'review', rank: 1 }),
            );
            for (const c of columns)
              await renumberColumn(tx, c, 1, c.status === 'todo' ? [1] : [2]);
            return 2;
          },
          () => [
            insert('task_events', {
              task_id: 2,
              actor_id: 1,
              action: 'status_changed',
              field_changes: '[]',
              request_id: randomUUID(),
            }),
            insert('notifications', {
              recipient_id: 1,
              task_id: 2,
              dedupe_key: randomUUID(),
              type: 'status',
              message: 'fixture',
            }),
          ],
        );
        await f.db.transaction(async (tx) => {
          assert.deepEqual(await tx.query(s('SELECT status,version FROM dbo.tasks WHERE id=2')), [
            { status: 'review', version: 2 },
          ]);
          const columns = await lockColumns(tx, 1, ['todo', 'review']);
          assert(columns.every((c) => c.version === 2));
          assert.equal((await tx.query(s('SELECT id FROM dbo.task_events'))).length, 1);
          assert.equal((await tx.query(s('SELECT id FROM dbo.notifications'))).length, 1);
        });
      } finally {
        await f.close();
      }
    },
  );
  test(
    `${provider}: legacy blocked upgrades to review with children, ledger, identity high-water and repeat/reopen intact`,
    { skip },
    async () => {
      const f = await factory(false);
      const root = mkdtempSync(join(tmpdir(), 'friday-review-upgrade-'));
      const dir = join(root, f.db.provider);
      mkdirSync(dir);
      try {
        for (const name of ['0000_foundation.sql', '0001_business_schema.sql'])
          writeFileSync(join(dir, name), readFileSync(`migrations/${f.db.provider}/${name}`));
        await migrate(f.db, root);
        await f.db.transaction(async (tx) => {
          await seed(tx, 'blocked');
          await tx.execute(s('DELETE FROM dbo.board_positions WHERE task_id=1'));
          await tx.execute(
            s("UPDATE dbo.tasks SET status='blocked',successor_task_id=2 WHERE id=1"),
          );
          await tx.execute(s('UPDATE dbo.tasks SET predecessor_task_id=1 WHERE id=2'));
          await tx.execute(
            insert('board_positions', { task_id: 1, project_id: 1, status: 'blocked', rank: 1 }),
          );
          await tx.execute(insert('comments', { task_id: 1, author_id: 1, body: 'ข้อมูลไทย' }));
          await tx.execute(
            insert('tasks', { project_id: 1, title: 'identity high-water', creator_id: 1 }),
          );
          await tx.execute(s('DELETE FROM dbo.tasks WHERE id=3'));
        });
        const before = await f.db.transaction((tx) =>
          tx.query(s('SELECT id,sha256 FROM dbo.schema_migrations ORDER BY id')),
        );
        const migration = readFileSync(
          `migrations/${f.db.provider}/0002_review_status.sql`,
          'utf8',
        );
        const broken =
          f.db.provider === 'sqlite'
            ? migration.replace(
                'CREATE TEMP TABLE friday_migration_fk_assert',
                'UPDATE comments SET author_id=999; CREATE TEMP TABLE friday_migration_fk_assert',
              )
            : migration + ' INSERT INTO dbo.missing_helper_fixture(id) VALUES(1);';
        writeFileSync(join(dir, '0002_review_status.sql'), broken);
        await assert.rejects(migrate(f.db, root));
        assert.equal(
          (
            await f.db.transaction((tx) => tx.query(s('SELECT status FROM dbo.tasks WHERE id=1')))
          )[0]?.status,
          'blocked',
        );
        writeFileSync(join(dir, '0002_review_status.sql'), migration);
        assert.deepEqual(await migrate(f.db, root), ['0002_review_status.sql']);
        assert.deepEqual(await migrate(f.db, root), []);
        const reopened = await f.reopen();
        await reopened.transaction(async (tx) => {
          assert.deepEqual(
            (await tx.query(s('SELECT id,sha256 FROM dbo.schema_migrations ORDER BY id'))).slice(
              0,
              2,
            ),
            before,
          );
          assert.equal(
            (await tx.query(s('SELECT status FROM dbo.tasks WHERE id=1')))[0]?.status,
            'review',
          );
          assert.equal(
            (await tx.query(s('SELECT status FROM dbo.board_positions WHERE task_id=1')))[0]
              ?.status,
            'review',
          );
          assert.equal(
            (await tx.query(s('SELECT body FROM dbo.comments WHERE task_id=1')))[0]?.body,
            'ข้อมูลไทย',
          );
          if (reopened.provider === 'sqlite')
            assert.deepEqual(await tx.query(s('PRAGMA foreign_key_check')), []);
          await tx.execute(
            insert('tasks', { project_id: 1, title: 'next identity', creator_id: 1 }),
          );
          assert.equal(
            (await tx.query(s("SELECT id FROM dbo.tasks WHERE title='next identity'")))[0]?.id,
            4,
          );
        });
        await assert.rejects(
          reopened.transaction((tx) =>
            tx.execute(s("UPDATE dbo.tasks SET status='blocked' WHERE id=1")),
          ),
        );
      } finally {
        await f.close();
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
}
