-- T-081 FR-42/FR-42A/BR-21–BR-23: per-user permission checkboxes and project role manager.
ALTER TABLE dbo.[users] ADD [permissions_version] INT NOT NULL CONSTRAINT [df_users_permissions_version] DEFAULT (1)
  CONSTRAINT [ck_users_permissions_version] CHECK ([permissions_version] BETWEEN 1 AND 2147483647);
CREATE TABLE dbo.[user_permissions] (
  [user_id] INT NOT NULL,
  [permission_key] VARCHAR(4) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [granted_by] INT NOT NULL,
  [granted_at] DATETIME2(3) NOT NULL,
  CONSTRAINT [pk_user_permissions] PRIMARY KEY ([user_id], [permission_key]),
  CONSTRAINT [ck_user_permissions_key] CHECK ([permission_key] IN ('P-01','P-02','P-03','P-04','P-05','P-06','P-07','P-08','P-09','P-10')),
  CONSTRAINT [fk_user_permissions_1] FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_user_permissions_2] FOREIGN KEY ([granted_by]) REFERENCES dbo.[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);
ALTER TABLE dbo.[project_members] DROP CONSTRAINT [ck_project_members_access];
ALTER TABLE dbo.[project_members] ALTER COLUMN [access] NVARCHAR(7) COLLATE Latin1_General_100_BIN2 NOT NULL;
ALTER TABLE dbo.[project_members] WITH CHECK ADD CONSTRAINT [ck_project_members_access] CHECK ([access] IN (N'manager', N'editor', N'viewer') AND DATALENGTH([access]) = DATALENGTH(RTRIM([access])));
