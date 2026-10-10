-- Owner request 2026-10-10: project code P+YY+NN (per Bangkok year) and task number TK+YYMM+NNNN (organization-wide per Bangkok month).
ALTER TABLE [projects] ADD COLUMN [code] TEXT NULL;
ALTER TABLE [tasks] ADD COLUMN [task_no] TEXT NULL;
CREATE TABLE [number_sequences] (
  [scope] TEXT NOT NULL PRIMARY KEY,
  [last_value] INTEGER NOT NULL CONSTRAINT [ck_number_sequences_last_value] CHECK ([last_value] >= 0)
);
UPDATE [projects] SET [code] = (
  SELECT x.[code] FROM (
    SELECT [id], 'P' || substr(strftime('%Y', datetime([created_at], '+7 hours')), 3)
      || printf('%02d', ROW_NUMBER() OVER (PARTITION BY substr(strftime('%Y', datetime([created_at], '+7 hours')), 3) ORDER BY [created_at], [id])) AS [code]
    FROM [projects]
  ) x WHERE x.[id] = [projects].[id]
);
UPDATE [tasks] SET [task_no] = (
  SELECT x.[task_no] FROM (
    SELECT [id], 'TK' || substr(strftime('%Y%m', datetime([created_at], '+7 hours')), 3)
      || printf('%04d', ROW_NUMBER() OVER (PARTITION BY strftime('%Y%m', datetime([created_at], '+7 hours')) ORDER BY [created_at], [id])) AS [task_no]
    FROM [tasks]
  ) x WHERE x.[id] = [tasks].[id]
);
INSERT INTO [number_sequences] ([scope], [last_value])
  SELECT 'project:' || substr([code], 1, 3), COUNT(*) FROM [projects] GROUP BY substr([code], 1, 3);
INSERT INTO [number_sequences] ([scope], [last_value])
  SELECT 'task:' || substr([task_no], 1, length([task_no]) - 4), COUNT(*) FROM [tasks] GROUP BY substr([task_no], 1, length([task_no]) - 4);
CREATE UNIQUE INDEX [ux_projects_code] ON [projects] ([code]) WHERE [code] IS NOT NULL;
CREATE UNIQUE INDEX [ux_tasks_task_no] ON [tasks] ([task_no]) WHERE [task_no] IS NOT NULL;
