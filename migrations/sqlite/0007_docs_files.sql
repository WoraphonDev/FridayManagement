-- T-084 FR-48 project docs, T-085 FR-49 project-level files (shared quota/validation/cleanup).
CREATE TABLE [project_docs] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  [project_id] INTEGER NOT NULL,
  [title] TEXT NOT NULL,
  [body_html] TEXT NOT NULL DEFAULT (''),
  [text_length] INTEGER NOT NULL DEFAULT (0),
  [version] INTEGER NOT NULL DEFAULT (1),
  [created_by] INTEGER NOT NULL,
  [updated_by] INTEGER NOT NULL,
  [created_at] TEXT NOT NULL,
  [updated_at] TEXT NOT NULL,
  [deleted_at] TEXT NULL,
  [deleted_by] INTEGER NULL,
  CONSTRAINT [ck_project_docs_title] CHECK (friday_utf16_units(trim([title])) BETWEEN 1 AND 200),
  CONSTRAINT [ck_project_docs_body] CHECK (length([body_html]) <= 1000000),
  CONSTRAINT [ck_project_docs_text_length] CHECK ([text_length] BETWEEN 0 AND 200000),
  CONSTRAINT [ck_project_docs_version] CHECK ([version] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_project_docs_created_at] CHECK (friday_valid_utc([created_at]) = 1),
  CONSTRAINT [ck_project_docs_updated_at] CHECK (friday_valid_utc([updated_at]) = 1),
  CONSTRAINT [ck_project_docs_deleted_at] CHECK ([deleted_at] IS NULL OR (friday_valid_utc([deleted_at]) = 1)),
  CONSTRAINT [ck_project_docs_deleted_pair] CHECK (([deleted_at] IS NULL) = ([deleted_by] IS NULL)),
  CONSTRAINT [fk_project_docs_1] FOREIGN KEY ([project_id]) REFERENCES [projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_docs_2] FOREIGN KEY ([created_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_docs_3] FOREIGN KEY ([updated_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_docs_4] FOREIGN KEY ([deleted_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
CREATE INDEX [ix_project_docs_project] ON [project_docs] ([project_id], [deleted_at], [id]);
CREATE TABLE [project_doc_versions] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  [doc_id] INTEGER NOT NULL,
  [version] INTEGER NOT NULL,
  [title] TEXT NOT NULL,
  [body_html] TEXT NOT NULL,
  [edited_by] INTEGER NOT NULL,
  [edited_at] TEXT NOT NULL,
  CONSTRAINT [ck_project_doc_versions_edited_at] CHECK (friday_valid_utc([edited_at]) = 1),
  CONSTRAINT [fk_project_doc_versions_1] FOREIGN KEY ([doc_id]) REFERENCES [project_docs] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_doc_versions_2] FOREIGN KEY ([edited_by]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
CREATE UNIQUE INDEX [uq_project_doc_versions] ON [project_doc_versions] ([doc_id], [version]);
CREATE TABLE [project_files] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  [project_id] INTEGER NOT NULL,
  [uploader_id] INTEGER NOT NULL,
  [original_name] TEXT NOT NULL,
  [storage_key] TEXT NOT NULL,
  [bytes] INTEGER NOT NULL,
  [validated_type] TEXT NOT NULL,
  [sha256] TEXT NOT NULL,
  [created_at] TEXT NOT NULL,
  [deleted_at] TEXT NULL,
  CONSTRAINT [ck_project_files_original_name] CHECK (friday_utf16_units([original_name]) BETWEEN 1 AND 200),
  CONSTRAINT [ck_project_files_storage_key] CHECK (friday_valid_uuid([storage_key]) = 1),
  CONSTRAINT [ck_project_files_bytes] CHECK ([bytes] BETWEEN 1 AND 10485760),
  CONSTRAINT [ck_project_files_validated_type] CHECK (friday_utf16_units([validated_type]) BETWEEN 1 AND 100),
  CONSTRAINT [ck_project_files_sha256] CHECK (length([sha256]) = 64 AND [sha256] NOT GLOB '*[^0-9a-f]*'),
  CONSTRAINT [ck_project_files_created_at] CHECK (friday_valid_utc([created_at]) = 1),
  CONSTRAINT [ck_project_files_deleted_at] CHECK ([deleted_at] IS NULL OR (friday_valid_utc([deleted_at]) = 1)),
  CONSTRAINT [fk_project_files_1] FOREIGN KEY ([project_id]) REFERENCES [projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_project_files_2] FOREIGN KEY ([uploader_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
CREATE UNIQUE INDEX [uq_project_files_storage_key] ON [project_files] ([storage_key]);
CREATE INDEX [ix_project_files_project] ON [project_files] ([project_id], [id]);
-- SQLite cannot relax NOT NULL; rebuild reservations so a reservation targets one task or one project.
CREATE TABLE [upload_reservations_t085_new] (
  [id] TEXT NOT NULL,
  [user_id] INTEGER NOT NULL,
  [task_id] INTEGER NULL,
  [project_id] INTEGER NULL,
  [reserved_bytes] INTEGER NOT NULL,
  [actual_bytes] INTEGER NULL,
  [temp_key] TEXT NOT NULL,
  [storage_key] TEXT NULL,
  [created_at] TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  [expires_at] TEXT NOT NULL,
  [phase] TEXT NOT NULL DEFAULT ('receiving'),
  CONSTRAINT [pk_upload_reservations] PRIMARY KEY ([id]),
  CONSTRAINT [ck_upload_reservations_id] CHECK (friday_valid_uuid([id]) = 1),
  CONSTRAINT [ck_upload_reservations_user_id] CHECK ([user_id] BETWEEN 1 AND 2147483647),
  CONSTRAINT [ck_upload_reservations_task_id] CHECK ([task_id] IS NULL OR ([task_id] BETWEEN 1 AND 2147483647)),
  CONSTRAINT [ck_upload_reservations_target] CHECK (([task_id] IS NULL) <> ([project_id] IS NULL)),
  CONSTRAINT [ck_upload_reservations_reserved_bytes] CHECK ([reserved_bytes] BETWEEN 1 AND 10485760),
  CONSTRAINT [ck_upload_reservations_actual_bytes] CHECK ([actual_bytes] IS NULL OR ([actual_bytes] BETWEEN 1 AND 10485760)),
  CONSTRAINT [ck_upload_reservations_temp_key] CHECK (friday_valid_uuid([temp_key]) = 1),
  CONSTRAINT [ck_upload_reservations_storage_key] CHECK ([storage_key] IS NULL OR (friday_valid_uuid([storage_key]) = 1)),
  CONSTRAINT [ck_upload_reservations_created_at] CHECK (friday_valid_utc([created_at]) = 1),
  CONSTRAINT [ck_upload_reservations_expires_at] CHECK (friday_valid_utc([expires_at]) = 1),
  CONSTRAINT [ck_upload_reservations_phase] CHECK ([phase] IN ('receiving', 'validated', 'finalizing')),
  CONSTRAINT [ck_upload_reservations_rule1] CHECK (actual_bytes IS NULL OR actual_bytes <= reserved_bytes),
  CONSTRAINT [ck_upload_reservations_rule2] CHECK (phase = 'receiving' OR actual_bytes IS NOT NULL),
  CONSTRAINT [ck_upload_reservations_rule3] CHECK (phase <> 'finalizing' OR storage_key IS NOT NULL),
  CONSTRAINT [ck_upload_reservations_rule4] CHECK (expires_at > created_at),
  CONSTRAINT [fk_upload_reservations_1] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_upload_reservations_2] FOREIGN KEY ([task_id]) REFERENCES [tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [fk_upload_reservations_3] FOREIGN KEY ([project_id]) REFERENCES [projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
INSERT INTO [upload_reservations_t085_new]([id],[user_id],[task_id],[reserved_bytes],[actual_bytes],[temp_key],[storage_key],[created_at],[expires_at],[phase]) SELECT [id],[user_id],[task_id],[reserved_bytes],[actual_bytes],[temp_key],[storage_key],[created_at],[expires_at],[phase] FROM [upload_reservations];
DROP TABLE [upload_reservations];
ALTER TABLE [upload_reservations_t085_new] RENAME TO [upload_reservations];
CREATE UNIQUE INDEX [uq_upload_reservations_temp_key] ON [upload_reservations] ([temp_key]);
CREATE UNIQUE INDEX [uq_upload_reservations_storage_key] ON [upload_reservations] ([storage_key]) WHERE storage_key IS NOT NULL;
CREATE INDEX [ix_upload_reservations_expires_at_phase] ON [upload_reservations] ([expires_at], [phase]);
CREATE INDEX [ix_upload_reservations_task_id] ON [upload_reservations] ([task_id]);
