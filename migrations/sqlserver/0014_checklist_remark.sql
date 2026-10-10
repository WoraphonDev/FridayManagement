-- Preserve all legacy checklist data; new remarks start empty.
ALTER TABLE dbo.subtasks ADD remark NVARCHAR(2000) NOT NULL CONSTRAINT df_subtasks_remark DEFAULT N'';
