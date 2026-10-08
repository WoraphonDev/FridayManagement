CREATE TABLE task_assignees (
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY(task_id,user_id)
) STRICT;
CREATE INDEX ix_task_assignees_user ON task_assignees(user_id,task_id);
INSERT INTO task_assignees(task_id,user_id) SELECT id,assignee_id FROM tasks WHERE assignee_id IS NOT NULL;
ALTER TABLE subtasks ADD COLUMN assignee_id INTEGER NULL REFERENCES users(id);
