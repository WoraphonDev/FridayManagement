-- T-081 FR-42/FR-42A/BR-21–BR-23: per-user permission checkboxes and project role manager.
ALTER TABLE [users] ADD COLUMN [permissions_version] INTEGER NOT NULL DEFAULT (1) CHECK ([permissions_version] BETWEEN 1 AND 2147483647);
CREATE TABLE [user_permissions] (
  [user_id] INTEGER NOT NULL,
  [permission_key] TEXT NOT NULL,
  [granted_by] INTEGER NOT NULL,
  [granted_at] TEXT NOT NULL,
  CONSTRAINT [pk_user_permissions] PRIMARY KEY ([user_id], [permission_key]),
  CONSTRAINT [ck_user_permissions_key] CHECK ([permission_key] IN ('P-01','P-02','P-03','P-04','P-05','P-06','P-07','P-08','P-09','P-10')),
  CONSTRAINT [ck_user_permissions_granted_at] CHECK (friday_valid_utc([granted_at]) = 1),
  CONSTRAINT [fk_user_permissions_1] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_user_permissions_2] FOREIGN KEY ([granted_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
-- SQLite cannot alter a CHECK constraint; rebuild project_members with manager allowed.
CREATE TABLE [project_members_t081_new] (
  [project_id] INTEGER NOT NULL,
  [user_id] INTEGER NOT NULL,
  [access] TEXT NOT NULL,
  [added_by] INTEGER NOT NULL,
  [added_at] TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT [pk_project_members] PRIMARY KEY ([project_id], [user_id]),
  CONSTRAINT [ck_project_members_project_id] CHECK ([project_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_project_members_user_id] CHECK ([user_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_project_members_access] CHECK ([access] IN ('manager', 'editor', 'viewer')),
  CONSTRAINT [ck_project_members_added_by] CHECK ([added_by] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_project_members_added_at] CHECK (friday_valid_utc([added_at]) = 1),
  CONSTRAINT [fk_project_members_1] FOREIGN KEY ([project_id]) REFERENCES [projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_members_2] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_members_3] FOREIGN KEY ([added_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
INSERT INTO [project_members_t081_new]([project_id],[user_id],[access],[added_by],[added_at])
  SELECT [project_id],[user_id],[access],[added_by],[added_at] FROM [project_members];
DROP TABLE [project_members];
ALTER TABLE [project_members_t081_new] RENAME TO [project_members];
CREATE INDEX [ix_project_members_user_id] ON [project_members] ([user_id]);
