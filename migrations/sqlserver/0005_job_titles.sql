-- T-080 FR-41/BR-19/BR-20: job titles are display/filter/report labels only, never authorization input.
CREATE TABLE dbo.[job_titles] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(50) COLLATE Latin1_General_100_CI_AS_SC NOT NULL,
  [color] VARCHAR(7) NOT NULL CONSTRAINT [df_job_titles_color] DEFAULT ('#579bfc'),
  [is_active] BIT NOT NULL CONSTRAINT [df_job_titles_is_active] DEFAULT (1),
  [sort_order] INT NOT NULL CONSTRAINT [df_job_titles_sort_order] DEFAULT (0),
  [version] INT NOT NULL CONSTRAINT [df_job_titles_version] DEFAULT (1),
  [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_job_titles_created_at] DEFAULT (SYSUTCDATETIME()),
  [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_job_titles_updated_at] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [pk_job_titles] PRIMARY KEY ([id]),
  CONSTRAINT [ck_job_titles_name] CHECK (DATALENGTH([name]) BETWEEN 2 AND 100 AND LEN(LTRIM(RTRIM([name]))) > 0),
  CONSTRAINT [ck_job_titles_color] CHECK (LEN([color])=7 AND LEFT([color],1)='#' AND SUBSTRING([color],2,6) NOT LIKE '%[^0-9a-fA-F]%' COLLATE Latin1_General_100_BIN2),
  CONSTRAINT [ck_job_titles_sort_order] CHECK ([sort_order] BETWEEN 0 AND 10000),
  CONSTRAINT [ck_job_titles_version] CHECK ([version] BETWEEN 1 AND 2147483647)
);
CREATE UNIQUE INDEX [uq_job_titles_name] ON dbo.[job_titles] ([name]);
INSERT INTO dbo.[job_titles]([name],[color],[sort_order]) VALUES
 (N'PM','#0073ea',10),(N'SM','#9d50dd',20),(N'BA','#00c875',30),(N'SA','#fdab3d',40),(N'Dev','#579bfc',50),(N'Tester','#e2445c',60);
ALTER TABLE dbo.[users] ADD [job_title_id] INT NULL CONSTRAINT [fk_users_job_title] REFERENCES dbo.[job_titles]([id]);
-- New column is referenced in a separate batch to avoid same-batch compile-time name resolution.
EXEC(N'CREATE INDEX [ix_users_job_title_id] ON dbo.[users] ([job_title_id]);');
