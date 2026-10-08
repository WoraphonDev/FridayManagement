-- T-090 FR-47: private project favorites; rows are removed when the user loses project access.
CREATE TABLE dbo.[user_favorites] (
  [user_id] INT NOT NULL CONSTRAINT [fk_user_favorites_1] REFERENCES dbo.[users]([id]),
  [project_id] INT NOT NULL CONSTRAINT [fk_user_favorites_2] REFERENCES dbo.[projects]([id]),
  [created_at] DATETIME2(3) NOT NULL,
  CONSTRAINT [pk_user_favorites] PRIMARY KEY ([user_id], [project_id])
);
CREATE INDEX [ix_user_favorites_project] ON dbo.[user_favorites] ([project_id]);
