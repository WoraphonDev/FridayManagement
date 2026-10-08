-- T-007: business schema; run once via checksum-verified migration runner.

-- Never edit an applied migration. All references use NO ACTION; purge is explicit.

SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;

SET ANSI_WARNINGS ON; SET CONCAT_NULL_YIELDS_NULL ON; SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;

ALTER TABLE dbo.schema_migrations ALTER COLUMN applied_at DATETIME2(3) NOT NULL;

CREATE TABLE dbo.[organizations] (
  [id] INT NOT NULL,
  [name] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [timezone] NVARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N'Asia/Bangkok'),
  [version] INT NOT NULL DEFAULT (1),
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [updated_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_organizations] PRIMARY KEY ([id]),
  CONSTRAINT [ck_organizations_id] CHECK ([id] = 1),
  CONSTRAINT [ck_organizations_name] CHECK (DATALENGTH([name]) BETWEEN 2 AND 200),
  CONSTRAINT [ck_organizations_timezone] CHECK ([timezone] IN (N'Asia/Bangkok') AND DATALENGTH([timezone]) = DATALENGTH(RTRIM([timezone]))),
  CONSTRAINT [ck_organizations_version] CHECK ([version] BETWEEN 1 AND 2147483647)
);

CREATE TABLE dbo.[users] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [username] NVARCHAR(60) COLLATE Latin1_General_100_CI_AS_SC NOT NULL,
  [display_name] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [password_hash] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [org_role] NVARCHAR(6) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N'member'),
  [active] BIT NOT NULL DEFAULT (1),
  [must_change_password] BIT NOT NULL DEFAULT (1),
  [auth_version] INT NOT NULL DEFAULT (1),
  [version] INT NOT NULL DEFAULT (1),
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [updated_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_users] PRIMARY KEY ([id]),
  CONSTRAINT [ck_users_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_users_username] CHECK (DATALENGTH([username]) BETWEEN 2 AND 120),
  CONSTRAINT [ck_users_display_name] CHECK (DATALENGTH([display_name]) BETWEEN 2 AND 200),
  CONSTRAINT [ck_users_password_hash] CHECK (DATALENGTH([password_hash]) BETWEEN 2 AND 2048),
  CONSTRAINT [ck_users_org_role] CHECK ([org_role] IN (N'admin', N'member') AND DATALENGTH([org_role]) = DATALENGTH(RTRIM([org_role]))),
  CONSTRAINT [ck_users_active] CHECK ([active] IN (0,1)),
  CONSTRAINT [ck_users_must_change_password] CHECK ([must_change_password] IN (0,1)),
  CONSTRAINT [ck_users_auth_version] CHECK ([auth_version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_users_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_users_rule1] CHECK (username COLLATE Latin1_General_100_BIN2 NOT LIKE N'%[^A-Za-z0-9._-]%')
);

CREATE UNIQUE INDEX [uq_users_username] ON dbo.[users] ([username]);

CREATE INDEX [ix_users_active_org_role] ON dbo.[users] ([active], [org_role]);

CREATE TABLE dbo.[sessions] (
  [token_hash] NVARCHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [user_id] INT NOT NULL,
  [csrf_token] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [auth_version] INT NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [last_seen_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [absolute_expires_at] DATETIME2(3) NOT NULL,
  CONSTRAINT [pk_sessions] PRIMARY KEY ([token_hash]),
  CONSTRAINT [ck_sessions_token_hash] CHECK (DATALENGTH([token_hash]) = 128 AND [token_hash] NOT LIKE N'%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_sessions_user_id] CHECK ([user_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_sessions_csrf_token] CHECK (DATALENGTH([csrf_token]) BETWEEN 2 AND 256),
  CONSTRAINT [ck_sessions_auth_version] CHECK ([auth_version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_sessions_rule1] CHECK (last_seen_at >= created_at AND absolute_expires_at > created_at AND last_seen_at < absolute_expires_at),
  CONSTRAINT [fk_sessions_1] FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_sessions_user_id] ON dbo.[sessions] ([user_id]);

CREATE INDEX [ix_sessions_absolute_expires_at] ON dbo.[sessions] ([absolute_expires_at]);

CREATE INDEX [ix_sessions_last_seen_at] ON dbo.[sessions] ([last_seen_at]);

CREATE TABLE dbo.[teams] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(100) COLLATE Latin1_General_100_CI_AS_SC NOT NULL,
  [description] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N''),
  [archived_at] DATETIME2(3) NULL,
  [version] INT NOT NULL DEFAULT (1),
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [updated_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_teams] PRIMARY KEY ([id]),
  CONSTRAINT [ck_teams_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_teams_name] CHECK (DATALENGTH([name]) BETWEEN 2 AND 200),
  CONSTRAINT [ck_teams_description] CHECK (DATALENGTH([description]) BETWEEN 0 AND 2000),
  CONSTRAINT [ck_teams_version] CHECK ([version] BETWEEN 1 AND 2147483647)
);

CREATE UNIQUE INDEX [uq_teams_name] ON dbo.[teams] ([name]);

CREATE TABLE dbo.[team_members] (
  [team_id] INT NOT NULL,
  [user_id] INT NOT NULL,
  [team_role] NVARCHAR(6) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N'member'),
  [joined_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_team_members] PRIMARY KEY ([team_id], [user_id]),
  CONSTRAINT [ck_team_members_team_id] CHECK ([team_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_team_members_user_id] CHECK ([user_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_team_members_team_role] CHECK ([team_role] IN (N'lead', N'member') AND DATALENGTH([team_role]) = DATALENGTH(RTRIM([team_role]))),
  CONSTRAINT [fk_team_members_1] FOREIGN KEY ([team_id]) REFERENCES dbo.[teams] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_team_members_2] FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_team_members_user_id] ON dbo.[team_members] ([user_id]);

CREATE TABLE dbo.[projects] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [owner_team_id] INT NOT NULL,
  [name] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [description] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N''),
  [archived_at] DATETIME2(3) NULL,
  [version] INT NOT NULL DEFAULT (1),
  [created_by] INT NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [updated_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_projects] PRIMARY KEY ([id]),
  CONSTRAINT [ck_projects_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_projects_owner_team_id] CHECK ([owner_team_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_projects_name] CHECK (DATALENGTH([name]) BETWEEN 2 AND 200),
  CONSTRAINT [ck_projects_description] CHECK (DATALENGTH([description]) BETWEEN 0 AND 4000),
  CONSTRAINT [ck_projects_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_projects_created_by] CHECK ([created_by] BETWEEN 1 AND 2147483647),
  CONSTRAINT [fk_projects_1] FOREIGN KEY ([owner_team_id]) REFERENCES dbo.[teams] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_projects_2] FOREIGN KEY ([created_by]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_projects_owner_team_id_archived_at] ON dbo.[projects] ([owner_team_id], [archived_at]);

CREATE TABLE dbo.[project_members] (
  [project_id] INT NOT NULL,
  [user_id] INT NOT NULL,
  [access] NVARCHAR(6) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [added_by] INT NOT NULL,
  [added_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_project_members] PRIMARY KEY ([project_id], [user_id]),
  CONSTRAINT [ck_project_members_project_id] CHECK ([project_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_project_members_user_id] CHECK ([user_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_project_members_access] CHECK ([access] IN (N'editor', N'viewer') AND DATALENGTH([access]) = DATALENGTH(RTRIM([access]))),
  CONSTRAINT [ck_project_members_added_by] CHECK ([added_by] BETWEEN 1 AND 2147483647),
  CONSTRAINT [fk_project_members_1] FOREIGN KEY ([project_id]) REFERENCES dbo.[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_members_2] FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_members_3] FOREIGN KEY ([added_by]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_project_members_user_id] ON dbo.[project_members] ([user_id]);

CREATE TABLE dbo.[tasks] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [project_id] INT NOT NULL,
  [title] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [description] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N''),
  [category] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N''),
  [status] NVARCHAR(7) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N'todo'),
  [priority] NVARCHAR(6) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N'medium'),
  [assignee_id] INT NULL,
  [creator_id] INT NOT NULL,
  [start_date] DATE NULL,
  [due_date] DATE NULL,
  [recurrence] NVARCHAR(7) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N'none'),
  [recurrence_anchor_day] INT NULL,
  [predecessor_task_id] INT NULL,
  [successor_task_id] INT NULL,
  [version] INT NOT NULL DEFAULT (1),
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [updated_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [completed_at] DATETIME2(3) NULL,
  [deleted_at] DATETIME2(3) NULL,
  [deleted_by] INT NULL,
  CONSTRAINT [pk_tasks] PRIMARY KEY ([id]),
  CONSTRAINT [ck_tasks_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_tasks_project_id] CHECK ([project_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_tasks_title] CHECK (DATALENGTH([title]) BETWEEN 2 AND 400),
  CONSTRAINT [ck_tasks_description] CHECK (DATALENGTH([description]) BETWEEN 0 AND 20000),
  CONSTRAINT [ck_tasks_category] CHECK (DATALENGTH([category]) BETWEEN 0 AND 160),
  CONSTRAINT [ck_tasks_status] CHECK ([status] IN (N'todo', N'doing', N'blocked', N'done') AND DATALENGTH([status]) = DATALENGTH(RTRIM([status]))),
  CONSTRAINT [ck_tasks_priority] CHECK ([priority] IN (N'low', N'medium', N'high', N'urgent') AND DATALENGTH([priority]) = DATALENGTH(RTRIM([priority]))),
  CONSTRAINT [ck_tasks_assignee_id] CHECK ([assignee_id] IS NULL OR ([assignee_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_tasks_creator_id] CHECK ([creator_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_tasks_recurrence] CHECK ([recurrence] IN (N'none', N'daily', N'weekly', N'monthly') AND DATALENGTH([recurrence]) = DATALENGTH(RTRIM([recurrence]))),
  CONSTRAINT [ck_tasks_recurrence_anchor_day] CHECK ([recurrence_anchor_day] IS NULL OR ([recurrence_anchor_day] BETWEEN 1 AND 31)),
  CONSTRAINT [ck_tasks_predecessor_task_id] CHECK ([predecessor_task_id] IS NULL OR ([predecessor_task_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_tasks_successor_task_id] CHECK ([successor_task_id] IS NULL OR ([successor_task_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_tasks_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_tasks_deleted_by] CHECK ([deleted_by] IS NULL OR ([deleted_by] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_tasks_rule1] CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date),
  CONSTRAINT [ck_tasks_rule2] CHECK (recurrence = 'none' OR due_date IS NOT NULL),
  CONSTRAINT [ck_tasks_rule3] CHECK ((recurrence = 'monthly' AND recurrence_anchor_day IS NOT NULL) OR (recurrence <> 'monthly' AND recurrence_anchor_day IS NULL)),
  CONSTRAINT [ck_tasks_rule4] CHECK ((status = 'done' AND completed_at IS NOT NULL) OR (status <> 'done' AND completed_at IS NULL)),
  CONSTRAINT [ck_tasks_rule5] CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)),
  CONSTRAINT [ck_tasks_rule6] CHECK (predecessor_task_id IS NULL OR predecessor_task_id <> id),
  CONSTRAINT [ck_tasks_rule7] CHECK (successor_task_id IS NULL OR successor_task_id <> id),
  CONSTRAINT [uq_tasks_identity_status] UNIQUE ([id], [project_id], [status]),
  CONSTRAINT [fk_tasks_1] FOREIGN KEY ([project_id]) REFERENCES dbo.[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_2] FOREIGN KEY ([assignee_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_3] FOREIGN KEY ([creator_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_4] FOREIGN KEY ([deleted_by]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_5] FOREIGN KEY ([predecessor_task_id]) REFERENCES dbo.[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_tasks_6] FOREIGN KEY ([successor_task_id]) REFERENCES dbo.[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX [uq_tasks_predecessor_task_id] ON dbo.[tasks] ([predecessor_task_id]) WHERE predecessor_task_id IS NOT NULL;

CREATE UNIQUE INDEX [uq_tasks_successor_task_id] ON dbo.[tasks] ([successor_task_id]) WHERE successor_task_id IS NOT NULL;

CREATE INDEX [ix_tasks_project_id_status_deleted_at] ON dbo.[tasks] ([project_id], [status], [deleted_at]);

CREATE INDEX [ix_tasks_assignee_id_due_date] ON dbo.[tasks] ([assignee_id], [due_date]);

CREATE INDEX [ix_tasks_completed_at] ON dbo.[tasks] ([completed_at]);

CREATE INDEX [ix_tasks_deleted_at] ON dbo.[tasks] ([deleted_at]);

CREATE TABLE dbo.[subtasks] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [task_id] INT NOT NULL,
  [title] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [done] BIT NOT NULL DEFAULT (0),
  [version] INT NOT NULL DEFAULT (1),
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_subtasks] PRIMARY KEY ([id]),
  CONSTRAINT [ck_subtasks_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_subtasks_task_id] CHECK ([task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_subtasks_title] CHECK (DATALENGTH([title]) BETWEEN 2 AND 400),
  CONSTRAINT [ck_subtasks_done] CHECK ([done] IN (0,1)),
  CONSTRAINT [ck_subtasks_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [fk_subtasks_1] FOREIGN KEY ([task_id]) REFERENCES dbo.[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_subtasks_task_id_id] ON dbo.[subtasks] ([task_id], [id]);

CREATE TABLE dbo.[board_columns] (
  [project_id] INT NOT NULL,
  [status] NVARCHAR(7) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [version] INT NOT NULL DEFAULT (1),
  CONSTRAINT [pk_board_columns] PRIMARY KEY ([project_id], [status]),
  CONSTRAINT [ck_board_columns_project_id] CHECK ([project_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_board_columns_status] CHECK ([status] IN (N'todo', N'doing', N'blocked', N'done') AND DATALENGTH([status]) = DATALENGTH(RTRIM([status]))),
  CONSTRAINT [ck_board_columns_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [fk_board_columns_1] FOREIGN KEY ([project_id]) REFERENCES dbo.[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE dbo.[board_positions] (
  [task_id] INT NOT NULL,
  [project_id] INT NOT NULL,
  [status] NVARCHAR(7) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [rank] INT NOT NULL,
  CONSTRAINT [pk_board_positions] PRIMARY KEY ([task_id]),
  CONSTRAINT [ck_board_positions_task_id] CHECK ([task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_board_positions_project_id] CHECK ([project_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_board_positions_status] CHECK ([status] IN (N'todo', N'doing', N'blocked', N'done') AND DATALENGTH([status]) = DATALENGTH(RTRIM([status]))),
  CONSTRAINT [ck_board_positions_rank] CHECK ([rank] BETWEEN -2147483648 AND 2147483647 AND [rank] <> 0),
  CONSTRAINT [fk_board_positions_1] FOREIGN KEY ([task_id], [project_id], [status]) REFERENCES dbo.[tasks] ([id], [project_id], [status]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_board_positions_2] FOREIGN KEY ([project_id], [status]) REFERENCES dbo.[board_columns] ([project_id], [status]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX [uq_board_positions_project_id_status_rank] ON dbo.[board_positions] ([project_id], [status], [rank]);

CREATE TABLE dbo.[comments] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [task_id] INT NOT NULL,
  [author_id] INT NOT NULL,
  [body] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_comments] PRIMARY KEY ([id]),
  CONSTRAINT [ck_comments_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_comments_task_id] CHECK ([task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_comments_author_id] CHECK ([author_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_comments_body] CHECK (DATALENGTH([body]) BETWEEN 2 AND 10000),
  CONSTRAINT [fk_comments_1] FOREIGN KEY ([task_id]) REFERENCES dbo.[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_comments_2] FOREIGN KEY ([author_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_comments_task_id_id] ON dbo.[comments] ([task_id], [id]);

CREATE TABLE dbo.[attachments] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [task_id] INT NOT NULL,
  [uploader_id] INT NOT NULL,
  [original_name] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [storage_key] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [bytes] BIGINT NOT NULL,
  [validated_type] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [sha256] NVARCHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [deleted_at] DATETIME2(3) NULL,
  CONSTRAINT [pk_attachments] PRIMARY KEY ([id]),
  CONSTRAINT [ck_attachments_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_attachments_task_id] CHECK ([task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_attachments_uploader_id] CHECK ([uploader_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_attachments_original_name] CHECK (DATALENGTH([original_name]) BETWEEN 2 AND 400),
  CONSTRAINT [ck_attachments_storage_key] CHECK (DATALENGTH([storage_key]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[storage_key]) IS NOT NULL AND [storage_key] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[storage_key]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_attachments_bytes] CHECK ([bytes] BETWEEN 1 AND 10485760),
  CONSTRAINT [ck_attachments_validated_type] CHECK (DATALENGTH([validated_type]) BETWEEN 2 AND 200),
  CONSTRAINT [ck_attachments_sha256] CHECK (DATALENGTH([sha256]) = 128 AND [sha256] NOT LIKE N'%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [fk_attachments_1] FOREIGN KEY ([task_id]) REFERENCES dbo.[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_attachments_2] FOREIGN KEY ([uploader_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX [uq_attachments_storage_key] ON dbo.[attachments] ([storage_key]);

CREATE INDEX [ix_attachments_task_id_id] ON dbo.[attachments] ([task_id], [id]);

CREATE INDEX [ix_attachments_deleted_at] ON dbo.[attachments] ([deleted_at]);

CREATE TABLE dbo.[task_events] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [task_id] INT NOT NULL,
  [actor_id] INT NULL,
  [action] NVARCHAR(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [field_changes] NVARCHAR(MAX) NOT NULL,
  [request_id] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_task_events] PRIMARY KEY ([id]),
  CONSTRAINT [ck_task_events_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_task_events_task_id] CHECK ([task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_task_events_actor_id] CHECK ([actor_id] IS NULL OR ([actor_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_task_events_action] CHECK ([action] IN (N'created', N'updated', N'assigned', N'status_changed', N'reopened', N'deleted', N'restored', N'subtask_changed', N'comment_added', N'attachment_changed', N'reordered', N'recurrence_generated', N'access_cleanup') AND DATALENGTH([action]) = DATALENGTH(RTRIM([action]))),
  CONSTRAINT [ck_task_events_field_changes] CHECK (ISJSON([field_changes],ARRAY) = 1),
  CONSTRAINT [ck_task_events_request_id] CHECK (DATALENGTH([request_id]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[request_id]) IS NOT NULL AND [request_id] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[request_id]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [fk_task_events_1] FOREIGN KEY ([task_id]) REFERENCES dbo.[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_task_events_2] FOREIGN KEY ([actor_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_task_events_task_id_id] ON dbo.[task_events] ([task_id], [id]);

CREATE TABLE dbo.[admin_events] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [actor_id] INT NOT NULL,
  [action] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [resource_type] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [resource_id] INT NULL,
  [redacted_changes] NVARCHAR(MAX) NOT NULL,
  [request_id] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_admin_events] PRIMARY KEY ([id]),
  CONSTRAINT [ck_admin_events_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_admin_events_actor_id] CHECK ([actor_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_admin_events_action] CHECK (DATALENGTH([action]) BETWEEN 2 AND 200),
  CONSTRAINT [ck_admin_events_resource_type] CHECK (DATALENGTH([resource_type]) BETWEEN 2 AND 200),
  CONSTRAINT [ck_admin_events_resource_id] CHECK ([resource_id] IS NULL OR ([resource_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_admin_events_redacted_changes] CHECK (ISJSON([redacted_changes]) = 1),
  CONSTRAINT [ck_admin_events_request_id] CHECK (DATALENGTH([request_id]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[request_id]) IS NOT NULL AND [request_id] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[request_id]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [fk_admin_events_1] FOREIGN KEY ([actor_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_admin_events_created_at_id] ON dbo.[admin_events] ([created_at], [id]);

CREATE TABLE dbo.[notifications] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [recipient_id] INT NOT NULL,
  [task_id] INT NOT NULL,
  [type] NVARCHAR(14) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [message] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [dedupe_key] NVARCHAR(300) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [read_at] DATETIME2(3) NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_notifications] PRIMARY KEY ([id]),
  CONSTRAINT [ck_notifications_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_notifications_recipient_id] CHECK ([recipient_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_notifications_task_id] CHECK ([task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_notifications_type] CHECK ([type] IN (N'assignment', N'comment', N'status', N'access_cleanup', N'due_tomorrow', N'due_today', N'overdue') AND DATALENGTH([type]) = DATALENGTH(RTRIM([type]))),
  CONSTRAINT [ck_notifications_message] CHECK (DATALENGTH([message]) BETWEEN 2 AND 1000),
  CONSTRAINT [ck_notifications_dedupe_key] CHECK (DATALENGTH([dedupe_key]) BETWEEN 2 AND 600),
  CONSTRAINT [fk_notifications_1] FOREIGN KEY ([recipient_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_notifications_2] FOREIGN KEY ([task_id]) REFERENCES dbo.[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX [uq_notifications_dedupe_key] ON dbo.[notifications] ([dedupe_key]);

CREATE INDEX [ix_notifications_recipient_id_read_at] ON dbo.[notifications] ([recipient_id], [read_at]);

CREATE INDEX [ix_notifications_created_at] ON dbo.[notifications] ([created_at]);

CREATE INDEX [ix_notifications_task_id] ON dbo.[notifications] ([task_id]);

CREATE TABLE dbo.[recurrence_events] (
  [source_task_id] INT NOT NULL,
  [generated_task_id] INT NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_recurrence_events] PRIMARY KEY ([source_task_id]),
  CONSTRAINT [ck_recurrence_events_source_task_id] CHECK ([source_task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_recurrence_events_generated_task_id] CHECK ([generated_task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_recurrence_events_rule1] CHECK (source_task_id <> generated_task_id)
);

CREATE UNIQUE INDEX [uq_recurrence_events_generated_task_id] ON dbo.[recurrence_events] ([generated_task_id]);

CREATE TABLE dbo.[idempotency_keys] (
  [user_id] INT NOT NULL,
  [route] NVARCHAR(256) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [key] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [request_hash] NVARCHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [response_status] INT NOT NULL,
  [response_body] NVARCHAR(MAX) NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [expires_at] DATETIME2(3) NOT NULL,
  CONSTRAINT [pk_idempotency_keys] PRIMARY KEY ([user_id], [route], [key]),
  CONSTRAINT [ck_idempotency_keys_user_id] CHECK ([user_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_idempotency_keys_route] CHECK (DATALENGTH([route]) BETWEEN 2 AND 512),
  CONSTRAINT [ck_idempotency_keys_key] CHECK (DATALENGTH([key]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[key]) IS NOT NULL AND [key] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[key]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_idempotency_keys_request_hash] CHECK (DATALENGTH([request_hash]) = 128 AND [request_hash] NOT LIKE N'%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_idempotency_keys_response_status] CHECK ([response_status] BETWEEN 100 AND 599),
  CONSTRAINT [ck_idempotency_keys_response_body] CHECK (ISJSON([response_body]) = 1),
  CONSTRAINT [ck_idempotency_keys_rule1] CHECK (expires_at > created_at),
  CONSTRAINT [fk_idempotency_keys_1] FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [ix_idempotency_keys_expires_at] ON dbo.[idempotency_keys] ([expires_at]);

CREATE TABLE dbo.[user_view_revisions] (
  [user_id] INT NOT NULL,
  [revision] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [updated_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_user_view_revisions] PRIMARY KEY ([user_id]),
  CONSTRAINT [ck_user_view_revisions_user_id] CHECK ([user_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_user_view_revisions_revision] CHECK (DATALENGTH([revision]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[revision]) IS NOT NULL AND [revision] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[revision]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [fk_user_view_revisions_1] FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE dbo.[storage_quota] (
  [id] INT NOT NULL,
  [stored_bytes] BIGINT NOT NULL DEFAULT (0),
  [reserved_bytes] BIGINT NOT NULL DEFAULT (0),
  CONSTRAINT [pk_storage_quota] PRIMARY KEY ([id]),
  CONSTRAINT [ck_storage_quota_id] CHECK ([id] = 1),
  CONSTRAINT [ck_storage_quota_stored_bytes] CHECK ([stored_bytes] BETWEEN 0 AND 9007199254740991),
  CONSTRAINT [ck_storage_quota_reserved_bytes] CHECK ([reserved_bytes] BETWEEN 0 AND 9007199254740991),
  CONSTRAINT [ck_storage_quota_rule1] CHECK (stored_bytes <= 9007199254740991 - reserved_bytes)
);

CREATE TABLE dbo.[upload_reservations] (
  [id] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [user_id] INT NOT NULL,
  [task_id] INT NOT NULL,
  [reserved_bytes] BIGINT NOT NULL,
  [actual_bytes] BIGINT NULL,
  [temp_key] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [storage_key] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [expires_at] DATETIME2(3) NOT NULL,
  [phase] NVARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL DEFAULT (N'receiving'),
  CONSTRAINT [pk_upload_reservations] PRIMARY KEY ([id]),
  CONSTRAINT [ck_upload_reservations_id] CHECK (DATALENGTH([id]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[id]) IS NOT NULL AND [id] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[id]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_upload_reservations_user_id] CHECK ([user_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_upload_reservations_task_id] CHECK ([task_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_upload_reservations_reserved_bytes] CHECK ([reserved_bytes] BETWEEN 1 AND 10485760),
  CONSTRAINT [ck_upload_reservations_actual_bytes] CHECK ([actual_bytes] IS NULL OR ([actual_bytes] BETWEEN 1 AND 10485760)),
  CONSTRAINT [ck_upload_reservations_temp_key] CHECK (DATALENGTH([temp_key]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[temp_key]) IS NOT NULL AND [temp_key] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[temp_key]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_upload_reservations_storage_key] CHECK ([storage_key] IS NULL OR (DATALENGTH([storage_key]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[storage_key]) IS NOT NULL AND [storage_key] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[storage_key]))) COLLATE Latin1_General_100_BIN2)),
  CONSTRAINT [ck_upload_reservations_phase] CHECK ([phase] IN (N'receiving', N'validated', N'finalizing') AND DATALENGTH([phase]) = DATALENGTH(RTRIM([phase]))),
  CONSTRAINT [ck_upload_reservations_rule1] CHECK (actual_bytes IS NULL OR actual_bytes <= reserved_bytes),
  CONSTRAINT [ck_upload_reservations_rule2] CHECK (phase = 'receiving' OR actual_bytes IS NOT NULL),
  CONSTRAINT [ck_upload_reservations_rule3] CHECK (phase <> 'finalizing' OR storage_key IS NOT NULL),
  CONSTRAINT [ck_upload_reservations_rule4] CHECK (expires_at > created_at),
  CONSTRAINT [fk_upload_reservations_1] FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_upload_reservations_2] FOREIGN KEY ([task_id]) REFERENCES dbo.[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX [uq_upload_reservations_temp_key] ON dbo.[upload_reservations] ([temp_key]);

CREATE UNIQUE INDEX [uq_upload_reservations_storage_key] ON dbo.[upload_reservations] ([storage_key]) WHERE storage_key IS NOT NULL;

CREATE INDEX [ix_upload_reservations_expires_at_phase] ON dbo.[upload_reservations] ([expires_at], [phase]);

CREATE INDEX [ix_upload_reservations_task_id] ON dbo.[upload_reservations] ([task_id]);

CREATE TABLE dbo.[file_cleanup_queue] (
  [storage_key] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [bytes] BIGINT NOT NULL,
  [reason] NVARCHAR(MAX) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [attempts] INT NOT NULL DEFAULT (0),
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [next_attempt_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_file_cleanup_queue] PRIMARY KEY ([storage_key]),
  CONSTRAINT [ck_file_cleanup_queue_storage_key] CHECK (DATALENGTH([storage_key]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[storage_key]) IS NOT NULL AND [storage_key] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[storage_key]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_file_cleanup_queue_bytes] CHECK ([bytes] BETWEEN 1 AND 10485760),
  CONSTRAINT [ck_file_cleanup_queue_reason] CHECK (DATALENGTH([reason]) BETWEEN 2 AND 200),
  CONSTRAINT [ck_file_cleanup_queue_attempts] CHECK ([attempts] BETWEEN 0 AND 2147483647)
);

CREATE INDEX [ix_file_cleanup_queue_next_attempt_at] ON dbo.[file_cleanup_queue] ([next_attempt_at]);

CREATE TABLE dbo.[maintenance_state] (
  [id] INT NOT NULL,
  [owner_id] NVARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [state] NVARCHAR(8) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [lease_expires_at] DATETIME2(3) NOT NULL,
  [created_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  [updated_at] DATETIME2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_maintenance_state] PRIMARY KEY ([id]),
  CONSTRAINT [ck_maintenance_state_id] CHECK ([id] = 1),
  CONSTRAINT [ck_maintenance_state_owner_id] CHECK (DATALENGTH([owner_id]) = 72 AND TRY_CONVERT(UNIQUEIDENTIFIER,[owner_id]) IS NOT NULL AND [owner_id] = LOWER(CONVERT(NVARCHAR(36),TRY_CONVERT(UNIQUEIDENTIFIER,[owner_id]))) COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_maintenance_state_state] CHECK ([state] IN (N'entering', N'frozen', N'leaving') AND DATALENGTH([state]) = DATALENGTH(RTRIM([state]))),
  CONSTRAINT [ck_maintenance_state_rule1] CHECK (lease_expires_at > updated_at)
);

CREATE TABLE dbo.[rate_limit_buckets] (
  [kind] NVARCHAR(30) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [bucket_hash] NVARCHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [window_started_at] DATETIME2(3) NOT NULL,
  [window_expires_at] DATETIME2(3) NOT NULL,
  [attempts] INT NOT NULL DEFAULT (0),
  CONSTRAINT [pk_rate_limit_buckets] PRIMARY KEY ([kind], [bucket_hash], [window_started_at]),
  CONSTRAINT [ck_rate_limit_buckets_kind] CHECK (DATALENGTH([kind]) BETWEEN 2 AND 60),
  CONSTRAINT [ck_rate_limit_buckets_bucket_hash] CHECK (DATALENGTH([bucket_hash]) = 128 AND [bucket_hash] NOT LIKE N'%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_rate_limit_buckets_attempts] CHECK ([attempts] BETWEEN 0 AND 2147483647),
  CONSTRAINT [ck_rate_limit_buckets_rule1] CHECK (window_expires_at > window_started_at)
);

CREATE INDEX [ix_rate_limit_buckets_window_expires_at] ON dbo.[rate_limit_buckets] ([window_expires_at]);

INSERT INTO dbo.storage_quota (id,stored_bytes,reserved_bytes) VALUES (1,0,0);
