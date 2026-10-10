-- Owner request 2026-10-10: project code P+YY+NN (per Bangkok year) and task number TK+YYMM+NNNN (organization-wide per Bangkok month).
ALTER TABLE dbo.[projects] ADD [code] NVARCHAR(16) NULL;
ALTER TABLE dbo.[tasks] ADD [task_no] NVARCHAR(32) NULL;
CREATE TABLE dbo.[number_sequences] (
  [scope] NVARCHAR(64) NOT NULL CONSTRAINT [pk_number_sequences] PRIMARY KEY,
  [last_value] INT NOT NULL CONSTRAINT [ck_number_sequences_last_value] CHECK ([last_value] >= 0)
);
EXEC(N'
WITH x AS (
  SELECT [id], N''P'' + RIGHT(CONVERT(NVARCHAR(4), YEAR(DATEADD(HOUR, 7, [created_at]))), 2)
    + RIGHT(N''0'' + CONVERT(NVARCHAR(10), ROW_NUMBER() OVER (PARTITION BY YEAR(DATEADD(HOUR, 7, [created_at])) ORDER BY [created_at], [id])), 2) AS [new_code]
  FROM dbo.[projects]
)
UPDATE p SET [code] = x.[new_code] FROM dbo.[projects] p JOIN x ON x.[id] = p.[id];
WITH y AS (
  SELECT [id], N''TK'' + CONVERT(NVARCHAR(4), DATEADD(HOUR, 7, [created_at]), 12)
    + RIGHT(N''000'' + CONVERT(NVARCHAR(10), ROW_NUMBER() OVER (PARTITION BY CONVERT(NVARCHAR(4), DATEADD(HOUR, 7, [created_at]), 12) ORDER BY [created_at], [id])), 4) AS [new_no]
  FROM dbo.[tasks]
)
UPDATE t SET [task_no] = y.[new_no] FROM dbo.[tasks] t JOIN y ON y.[id] = t.[id];
INSERT INTO dbo.[number_sequences] ([scope], [last_value])
  SELECT N''project:'' + LEFT([code], 3), COUNT(*) FROM dbo.[projects] GROUP BY LEFT([code], 3);
INSERT INTO dbo.[number_sequences] ([scope], [last_value])
  SELECT N''task:'' + LEFT([task_no], LEN([task_no]) - 4), COUNT(*) FROM dbo.[tasks] GROUP BY LEFT([task_no], LEN([task_no]) - 4);
CREATE UNIQUE INDEX [ux_projects_code] ON dbo.[projects] ([code]) WHERE [code] IS NOT NULL;
CREATE UNIQUE INDEX [ux_tasks_task_no] ON dbo.[tasks] ([task_no]) WHERE [task_no] IS NOT NULL;
');
