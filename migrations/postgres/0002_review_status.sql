-- Correct legacy blocked to contract status review (same effect as the SQLite rebuild, which only
-- changes the three status CHECK constraints). Composite FKs carry status, so drop and re-add them.
ALTER TABLE "board_positions" DROP CONSTRAINT "fk_board_positions_1";
ALTER TABLE "board_positions" DROP CONSTRAINT "fk_board_positions_2";
ALTER TABLE "tasks" DROP CONSTRAINT "ck_tasks_status";
ALTER TABLE "board_columns" DROP CONSTRAINT "ck_board_columns_status";
ALTER TABLE "board_positions" DROP CONSTRAINT "ck_board_positions_status";
UPDATE "tasks" SET "status"='review' WHERE "status"='blocked';
UPDATE "board_columns" SET "status"='review' WHERE "status"='blocked';
UPDATE "board_positions" SET "status"='review' WHERE "status"='blocked';
ALTER TABLE "tasks" ADD CONSTRAINT "ck_tasks_status" CHECK ("status" IN ('todo', 'doing', 'review', 'done'));
ALTER TABLE "board_columns" ADD CONSTRAINT "ck_board_columns_status" CHECK ("status" IN ('todo', 'doing', 'review', 'done'));
ALTER TABLE "board_positions" ADD CONSTRAINT "ck_board_positions_status" CHECK ("status" IN ('todo', 'doing', 'review', 'done'));
ALTER TABLE "board_positions" ADD CONSTRAINT "fk_board_positions_1" FOREIGN KEY ("task_id", "project_id", "status") REFERENCES "tasks" ("id", "project_id", "status") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "board_positions" ADD CONSTRAINT "fk_board_positions_2" FOREIGN KEY ("project_id", "status") REFERENCES "board_columns" ("project_id", "status") ON DELETE NO ACTION ON UPDATE NO ACTION;
