-- 0002 re-created the status checks without the 0001 trailing-space guard; SQL Server ignores
-- trailing spaces in comparisons, so 'todo ' would pass IN (...). Restore exact-value checks.
ALTER TABLE dbo.[tasks] DROP CONSTRAINT [ck_tasks_status];
ALTER TABLE dbo.[board_columns] DROP CONSTRAINT [ck_board_columns_status];
ALTER TABLE dbo.[board_positions] DROP CONSTRAINT [ck_board_positions_status];
ALTER TABLE dbo.[tasks] WITH CHECK ADD CONSTRAINT [ck_tasks_status] CHECK ([status] IN (N'todo',N'doing',N'review',N'done') AND DATALENGTH([status]) = DATALENGTH(RTRIM([status])));
ALTER TABLE dbo.[board_columns] WITH CHECK ADD CONSTRAINT [ck_board_columns_status] CHECK ([status] IN (N'todo',N'doing',N'review',N'done') AND DATALENGTH([status]) = DATALENGTH(RTRIM([status])));
ALTER TABLE dbo.[board_positions] WITH CHECK ADD CONSTRAINT [ck_board_positions_status] CHECK ([status] IN (N'todo',N'doing',N'review',N'done') AND DATALENGTH([status]) = DATALENGTH(RTRIM([status])));
-- Inside a LIKE set, "._-]" made '_' and '-' rejected; a leading '-' is literal (parity with SQLite GLOB).
ALTER TABLE dbo.[users] DROP CONSTRAINT [ck_users_rule1];
ALTER TABLE dbo.[users] WITH CHECK ADD CONSTRAINT [ck_users_rule1] CHECK (username COLLATE Latin1_General_100_BIN2 NOT LIKE N'%[^-A-Za-z0-9._]%');
