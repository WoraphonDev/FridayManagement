-- T-084 FR-48 project docs, T-085 FR-49 project-level files (shared quota/validation/cleanup).
CREATE TABLE dbo.[project_docs] (
  [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [pk_project_docs] PRIMARY KEY,
  [project_id] INT NOT NULL CONSTRAINT [fk_project_docs_1] REFERENCES dbo.[projects]([id]),
  [title] NVARCHAR(200) NOT NULL,
  [body_html] NVARCHAR(MAX) NOT NULL CONSTRAINT [df_project_docs_body] DEFAULT (N''),
  [text_length] INT NOT NULL CONSTRAINT [df_project_docs_text_length] DEFAULT (0),
  [version] INT NOT NULL CONSTRAINT [df_project_docs_version] DEFAULT (1),
  [created_by] INT NOT NULL CONSTRAINT [fk_project_docs_2] REFERENCES dbo.[users]([id]),
  [updated_by] INT NOT NULL CONSTRAINT [fk_project_docs_3] REFERENCES dbo.[users]([id]),
  [created_at] DATETIME2(3) NOT NULL,
  [updated_at] DATETIME2(3) NOT NULL,
  [deleted_at] DATETIME2(3) NULL,
  [deleted_by] INT NULL CONSTRAINT [fk_project_docs_4] REFERENCES dbo.[users]([id]),
  CONSTRAINT [ck_project_docs_title] CHECK (DATALENGTH([title]) BETWEEN 2 AND 400 AND LEN(LTRIM(RTRIM([title]))) > 0),
  CONSTRAINT [ck_project_docs_body] CHECK (LEN([body_html]) <= 1000000),
  CONSTRAINT [ck_project_docs_text_length] CHECK ([text_length] BETWEEN 0 AND 200000),
  CONSTRAINT [ck_project_docs_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_project_docs_deleted_pair] CHECK (([deleted_at] IS NULL AND [deleted_by] IS NULL) OR ([deleted_at] IS NOT NULL AND [deleted_by] IS NOT NULL))
);
CREATE INDEX [ix_project_docs_project] ON dbo.[project_docs] ([project_id], [deleted_at], [id]);
CREATE TABLE dbo.[project_doc_versions] (
  [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [pk_project_doc_versions] PRIMARY KEY,
  [doc_id] INT NOT NULL CONSTRAINT [fk_project_doc_versions_1] REFERENCES dbo.[project_docs]([id]),
  [version] INT NOT NULL,
  [title] NVARCHAR(200) NOT NULL,
  [body_html] NVARCHAR(MAX) NOT NULL,
  [edited_by] INT NOT NULL CONSTRAINT [fk_project_doc_versions_2] REFERENCES dbo.[users]([id]),
  [edited_at] DATETIME2(3) NOT NULL
);
CREATE UNIQUE INDEX [uq_project_doc_versions] ON dbo.[project_doc_versions] ([doc_id], [version]);
CREATE TABLE dbo.[project_files] (
  [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [pk_project_files] PRIMARY KEY,
  [project_id] INT NOT NULL CONSTRAINT [fk_project_files_1] REFERENCES dbo.[projects]([id]),
  [uploader_id] INT NOT NULL CONSTRAINT [fk_project_files_2] REFERENCES dbo.[users]([id]),
  [original_name] NVARCHAR(200) NOT NULL,
  [storage_key] VARCHAR(36) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [bytes] INT NOT NULL,
  [validated_type] NVARCHAR(100) NOT NULL,
  [sha256] VARCHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  [created_at] DATETIME2(3) NOT NULL,
  [deleted_at] DATETIME2(3) NULL,
  CONSTRAINT [ck_project_files_original_name] CHECK (DATALENGTH([original_name]) BETWEEN 2 AND 400),
  CONSTRAINT [ck_project_files_bytes] CHECK ([bytes] BETWEEN 1 AND 10485760),
  CONSTRAINT [ck_project_files_sha256] CHECK (LEN([sha256]) = 64 AND [sha256] NOT LIKE '%[^0-9a-f]%')
);
CREATE UNIQUE INDEX [uq_project_files_storage_key] ON dbo.[project_files] ([storage_key]);
CREATE INDEX [ix_project_files_project] ON dbo.[project_files] ([project_id], [id]);
DROP INDEX [ix_upload_reservations_task_id] ON dbo.[upload_reservations];
ALTER TABLE dbo.[upload_reservations] ALTER COLUMN [task_id] INT NULL;
ALTER TABLE dbo.[upload_reservations] ADD [project_id] INT NULL CONSTRAINT [fk_upload_reservations_3] REFERENCES dbo.[projects]([id]);
-- New column is referenced in a separate batch to avoid same-batch compile-time name resolution.
EXEC(N'CREATE INDEX [ix_upload_reservations_task_id] ON dbo.[upload_reservations] ([task_id]); ALTER TABLE dbo.[upload_reservations] WITH CHECK ADD CONSTRAINT [ck_upload_reservations_target] CHECK (([task_id] IS NULL AND [project_id] IS NOT NULL) OR ([task_id] IS NOT NULL AND [project_id] IS NULL));');
