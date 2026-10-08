CREATE TABLE dbo.task_assignees (
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  CONSTRAINT pk_task_assignees PRIMARY KEY(task_id,user_id),
  CONSTRAINT fk_task_assignees_task FOREIGN KEY(task_id) REFERENCES dbo.tasks(id),
  CONSTRAINT fk_task_assignees_user FOREIGN KEY(user_id) REFERENCES dbo.users(id)
);
CREATE INDEX ix_task_assignees_user ON dbo.task_assignees(user_id,task_id);
INSERT INTO dbo.task_assignees(task_id,user_id) SELECT id,assignee_id FROM dbo.tasks WHERE assignee_id IS NOT NULL;
ALTER TABLE dbo.subtasks ADD assignee_id INT NULL;
ALTER TABLE dbo.subtasks ADD CONSTRAINT fk_subtasks_assignee FOREIGN KEY(assignee_id) REFERENCES dbo.users(id);
