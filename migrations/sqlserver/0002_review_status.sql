-- Correct legacy blocked to locked API status review; migration runs in one transaction.
ALTER TABLE dbo.[board_positions] DROP CONSTRAINT [fk_board_positions_1];
ALTER TABLE dbo.[board_positions] DROP CONSTRAINT [fk_board_positions_2];
ALTER TABLE dbo.[tasks] DROP CONSTRAINT [ck_tasks_status];
ALTER TABLE dbo.[board_columns] DROP CONSTRAINT [ck_board_columns_status];
ALTER TABLE dbo.[board_positions] DROP CONSTRAINT [ck_board_positions_status];
UPDATE dbo.[tasks] SET [status]='review' WHERE [status]='blocked';
UPDATE dbo.[board_columns] SET [status]='review' WHERE [status]='blocked';
UPDATE dbo.[board_positions] SET [status]='review' WHERE [status]='blocked';
ALTER TABLE dbo.[tasks] WITH CHECK ADD CONSTRAINT [ck_tasks_status] CHECK ([status] IN ('todo','doing','review','done')); 
ALTER TABLE dbo.[board_columns] WITH CHECK ADD CONSTRAINT [ck_board_columns_status] CHECK ([status] IN ('todo','doing','review','done')); 
ALTER TABLE dbo.[board_positions] WITH CHECK ADD CONSTRAINT [ck_board_positions_status] CHECK ([status] IN ('todo','doing','review','done')); 
ALTER TABLE dbo.[board_positions] WITH CHECK ADD CONSTRAINT [fk_board_positions_1] FOREIGN KEY ([task_id],[project_id],[status]) REFERENCES dbo.[tasks] ([id],[project_id],[status]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE dbo.[board_positions] WITH CHECK ADD CONSTRAINT [fk_board_positions_2] FOREIGN KEY ([project_id],[status]) REFERENCES dbo.[board_columns] ([project_id],[status]) ON DELETE NO ACTION ON UPDATE NO ACTION;
