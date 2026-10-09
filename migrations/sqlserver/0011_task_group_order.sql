-- Owner request 2026-10-09: drag tasks to reorder within a group (Main table "Board order").
ALTER TABLE dbo.[tasks] ADD [group_rank] INT NULL CONSTRAINT [ck_tasks_group_rank] CHECK ([group_rank] IS NULL OR [group_rank] >= 0);
CREATE INDEX [ix_tasks_group_rank] ON dbo.[tasks] ([project_id], [group_id], [group_rank], [id]);
