-- T-080 FR-41/BR-19/BR-20: job titles are display/filter/report labels only, never authorization input.
CREATE TABLE [job_titles] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  [name] TEXT NOT NULL,
  [color] TEXT NOT NULL DEFAULT ('#579bfc'),
  [is_active] INTEGER NOT NULL DEFAULT (1),
  [sort_order] INTEGER NOT NULL DEFAULT (0),
  [version] INTEGER NOT NULL DEFAULT (1),
  [created_at] TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  [updated_at] TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  [name_ci_key] TEXT GENERATED ALWAYS AS (friday_ci_key([name])) STORED NOT NULL,
  CONSTRAINT [ck_job_titles_id] CHECK ([id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_job_titles_name] CHECK (friday_utf16_units(trim([name])) BETWEEN 1 AND 50),
  CONSTRAINT [ck_job_titles_color] CHECK (length([color])=7 AND substr([color],1,1)='#' AND substr([color],2) NOT GLOB '*[^0-9a-fA-F]*'),
  CONSTRAINT [ck_job_titles_is_active] CHECK ([is_active] IN (0,1)),
  CONSTRAINT [ck_job_titles_sort_order] CHECK ([sort_order] BETWEEN 0 AND 10000),
  CONSTRAINT [ck_job_titles_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_job_titles_created_at] CHECK (friday_valid_utc([created_at]) = 1),
  CONSTRAINT [ck_job_titles_updated_at] CHECK (friday_valid_utc([updated_at]) = 1)
) STRICT;
CREATE UNIQUE INDEX [uq_job_titles_name] ON [job_titles] ([name_ci_key]);
INSERT INTO [job_titles]([name],[color],[sort_order]) VALUES
 ('PM','#0073ea',10),('SM','#9d50dd',20),('BA','#00c875',30),('SA','#fdab3d',40),('Dev','#579bfc',50),('Tester','#e2445c',60);
ALTER TABLE [users] ADD COLUMN [job_title_id] INTEGER NULL REFERENCES [job_titles]([id]);
CREATE INDEX [ix_users_job_title_id] ON [users] ([job_title_id]);
