-- Correct legacy blocked to contract status review without rewriting applied migrations.

PRAGMA defer_foreign_keys = ON;

CREATE TABLE [tasks_t008_new] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  [project_id] INTEGER NOT NULL,
  [title] TEXT NOT NULL,
  [description] TEXT NOT NULL DEFAULT (''),
  [category] TEXT NOT NULL DEFAULT (''),
  [status] TEXT NOT NULL DEFAULT ('todo'),
  [priority] TEXT NOT NULL DEFAULT ('medium'),
  [assignee_id] INTEGER NULL,
  [creator_id] INTEGER NOT NULL,
  [start_date] TEXT NULL,
  [due_date] TEXT NULL,
  [recurrence] TEXT NOT NULL DEFAULT ('none'),
  [recurrence_anchor_day] INTEGER NULL,
  [predecessor_task_id] INTEGER NULL,
  [successor_task_id] INTEGER NULL,
  [version] INTEGER NOT NULL DEFAULT (1),
  [created_at] TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  [updated_at] TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  [completed_at] TEXT NULL,
  [deleted_at] TEXT NULL,
  [deleted_by] INTEGER NULL,
  CONSTRAINT [ck_tasks_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_tasks_project_id] CHECK ([project_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_tasks_title] CHECK (friday_utf16_units([title]) BETWEEN 1 AND 200),
  CONSTRAINT [ck_tasks_description] CHECK (friday_utf16_units([description]) BETWEEN 0 AND 10000),
  CONSTRAINT [ck_tasks_category] CHECK (friday_utf16_units([category]) BETWEEN 0 AND 80),
  CONSTRAINT [ck_tasks_status] CHECK ([status] IN ('todo', 'doing', 'review', 'done')),
  CONSTRAINT [ck_tasks_priority] CHECK ([priority] IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT [ck_tasks_assignee_id] CHECK ([assignee_id] IS NULL OR ([assignee_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_tasks_creator_id] CHECK ([creator_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_tasks_start_date] CHECK ([start_date] IS NULL OR (friday_valid_date([start_date]) = 1)),
  CONSTRAINT [ck_tasks_due_date] CHECK ([due_date] IS NULL OR (friday_valid_date([due_date]) = 1)),
  CONSTRAINT [ck_tasks_recurrence] CHECK ([recurrence] IN ('none', 'daily', 'weekly', 'monthly')),
  CONSTRAINT [ck_tasks_recurrence_anchor_day] CHECK ([recurrence_anchor_day] IS NULL OR ([recurrence_anchor_day] BETWEEN 1 AND 31)),
  CONSTRAINT [ck_tasks_predecessor_task_id] CHECK ([predecessor_task_id] IS NULL OR ([predecessor_task_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_tasks_successor_task_id] CHECK ([successor_task_id] IS NULL OR ([successor_task_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_tasks_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_tasks_created_at] CHECK (friday_valid_utc([created_at]) = 1),
  CONSTRAINT [ck_tasks_updated_at] CHECK (friday_valid_utc([updated_at]) = 1),
  CONSTRAINT [ck_tasks_completed_at] CHECK ([completed_at] IS NULL OR (friday_valid_utc([completed_at]) = 1)),
  CONSTRAINT [ck_tasks_deleted_at] CHECK ([deleted_at] IS NULL OR (friday_valid_utc([deleted_at]) = 1)),
  CONSTRAINT [ck_tasks_deleted_by] CHECK ([deleted_by] IS NULL OR ([deleted_by] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_tasks_rule1] CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date),
  CONSTRAINT [ck_tasks_rule2] CHECK (recurrence = 'none' OR due_date IS NOT NULL),
  CONSTRAINT [ck_tasks_rule3] CHECK ((recurrence = 'monthly' AND recurrence_anchor_day IS NOT NULL) OR (recurrence <> 'monthly' AND recurrence_anchor_day IS NULL)),
  CONSTRAINT [ck_tasks_rule4] CHECK ((status = 'done' AND completed_at IS NOT NULL) OR (status <> 'done' AND completed_at IS NULL)),
  CONSTRAINT [ck_tasks_rule5] CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)),
  CONSTRAINT [ck_tasks_rule6] CHECK (predecessor_task_id IS NULL OR predecessor_task_id <> id),
  CONSTRAINT [ck_tasks_rule7] CHECK (successor_task_id IS NULL OR successor_task_id <> id),
  CONSTRAINT [uq_tasks_identity_status] UNIQUE ([id], [project_id], [status]),
  CONSTRAINT [fk_tasks_1] FOREIGN KEY ([project_id]) REFERENCES [projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_2] FOREIGN KEY ([assignee_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_3] FOREIGN KEY ([creator_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_4] FOREIGN KEY ([deleted_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_5] FOREIGN KEY ([predecessor_task_id]) REFERENCES [tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_6] FOREIGN KEY ([successor_task_id]) REFERENCES [tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;

INSERT INTO [tasks_t008_new] ([id], [project_id], [title], [description], [category], [status], [priority], [assignee_id], [creator_id], [start_date], [due_date], [recurrence], [recurrence_anchor_day], [predecessor_task_id], [successor_task_id], [version], [created_at], [updated_at], [completed_at], [deleted_at], [deleted_by]) SELECT [id], [project_id], [title], [description], [category], CASE WHEN [status]='blocked' THEN 'review' ELSE [status] END, [priority], [assignee_id], [creator_id], [start_date], [due_date], [recurrence], [recurrence_anchor_day], [predecessor_task_id], [successor_task_id], [version], [created_at], [updated_at], [completed_at], [deleted_at], [deleted_by] FROM [tasks];

CREATE TABLE [board_columns_t008_new] (
  [project_id] INTEGER NOT NULL,
  [status] TEXT NOT NULL,
  [version] INTEGER NOT NULL DEFAULT (1),
  CONSTRAINT [pk_board_columns] PRIMARY KEY ([project_id], [status]),
  CONSTRAINT [ck_board_columns_project_id] CHECK ([project_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_board_columns_status] CHECK ([status] IN ('todo', 'doing', 'review', 'done')),
  CONSTRAINT [ck_board_columns_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [fk_board_columns_1] FOREIGN KEY ([project_id]) REFERENCES [projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;

INSERT INTO [board_columns_t008_new] ([project_id], [status], [version]) SELECT [project_id], CASE WHEN [status]='blocked' THEN 'review' ELSE [status] END, [version] FROM [board_columns];

CREATE TABLE [board_positions_t008_new] (
  [task_id] INTEGER NOT NULL,
  [project_id] INTEGER NOT NULL,
  [status] TEXT NOT NULL,
  [rank] INTEGER NOT NULL,
  CONSTRAINT [pk_board_positions] PRIMARY KEY ([task_id]),
  CONSTRAINT [ck_board_positions_task_id] CHECK ([task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_board_positions_project_id] CHECK ([project_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_board_positions_status] CHECK ([status] IN ('todo', 'doing', 'review', 'done')),
  CONSTRAINT [ck_board_positions_rank] CHECK ([rank] BETWEEN -2147483648 AND 2147483647 AND [rank] <> 0),
  CONSTRAINT [fk_board_positions_1] FOREIGN KEY ([task_id], [project_id], [status]) REFERENCES [tasks] ([id], [project_id], [status]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_board_positions_2] FOREIGN KEY ([project_id], [status]) REFERENCES [board_columns] ([project_id], [status]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;

INSERT INTO [board_positions_t008_new] ([task_id], [project_id], [status], [rank]) SELECT [task_id], [project_id], CASE WHEN [status]='blocked' THEN 'review' ELSE [status] END, [rank] FROM [board_positions];

UPDATE sqlite_sequence SET seq=MAX(seq,COALESCE((SELECT seq FROM sqlite_sequence WHERE name='tasks'),0)) WHERE name='tasks_t008_new';

DROP TABLE [board_positions];

DROP TABLE [board_columns];

DROP TABLE [tasks];

ALTER TABLE [tasks_t008_new] RENAME TO [tasks];

ALTER TABLE [board_columns_t008_new] RENAME TO [board_columns];

ALTER TABLE [board_positions_t008_new] RENAME TO [board_positions];

CREATE UNIQUE INDEX [uq_tasks_predecessor_task_id] ON [tasks] ([predecessor_task_id]) WHERE predecessor_task_id IS NOT NULL;

CREATE UNIQUE INDEX [uq_tasks_successor_task_id] ON [tasks] ([successor_task_id]) WHERE successor_task_id IS NOT NULL;

CREATE INDEX [ix_tasks_project_id_status_deleted_at] ON [tasks] ([project_id], [status], [deleted_at]);

CREATE INDEX [ix_tasks_assignee_id_due_date] ON [tasks] ([assignee_id], [due_date]);

CREATE INDEX [ix_tasks_completed_at] ON [tasks] ([completed_at]);

CREATE INDEX [ix_tasks_deleted_at] ON [tasks] ([deleted_at]);

CREATE UNIQUE INDEX [uq_board_positions_project_id_status_rank] ON [board_positions] ([project_id], [status], [rank]);

-- Rebuilds can leave obsolete deferred counters. Assert every real FK before resetting them.
-- https://www.sqlite.org/pragma.html#pragma_defer_foreign_keys
CREATE TEMP TABLE friday_migration_fk_assert (violations INTEGER NOT NULL CHECK (violations=0));
INSERT INTO friday_migration_fk_assert SELECT COUNT(*) FROM pragma_foreign_key_check;
DROP TABLE friday_migration_fk_assert;
PRAGMA defer_foreign_keys = OFF;
