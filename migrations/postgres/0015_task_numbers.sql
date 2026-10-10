-- Owner request 2026-10-10: project code P+YY+NN (per Bangkok year) and task number TK+YYMM+NNNN (organization-wide per Bangkok month).
ALTER TABLE projects ADD COLUMN code TEXT NULL;
ALTER TABLE tasks ADD COLUMN task_no TEXT NULL;
CREATE TABLE number_sequences (
  scope TEXT NOT NULL PRIMARY KEY,
  last_value BIGINT NOT NULL CONSTRAINT ck_number_sequences_last_value CHECK (last_value >= 0)
);
UPDATE projects p SET code = x.code FROM (
  SELECT id, 'P' || to_char(created_at::timestamptz AT TIME ZONE 'Asia/Bangkok', 'YY')
    || lpad((ROW_NUMBER() OVER (PARTITION BY to_char(created_at::timestamptz AT TIME ZONE 'Asia/Bangkok', 'YY') ORDER BY created_at, id))::text, 2, '0') AS code
  FROM projects
) x WHERE x.id = p.id;
UPDATE tasks t SET task_no = y.task_no FROM (
  SELECT id, 'TK' || to_char(created_at::timestamptz AT TIME ZONE 'Asia/Bangkok', 'YYMM')
    || lpad((ROW_NUMBER() OVER (PARTITION BY to_char(created_at::timestamptz AT TIME ZONE 'Asia/Bangkok', 'YYMM') ORDER BY created_at, id))::text, 4, '0') AS task_no
  FROM tasks
) y WHERE y.id = t.id;
INSERT INTO number_sequences (scope, last_value)
  SELECT 'project:' || left(code, 3), COUNT(*) FROM projects GROUP BY left(code, 3);
INSERT INTO number_sequences (scope, last_value)
  SELECT 'task:' || left(task_no, length(task_no) - 4), COUNT(*) FROM tasks GROUP BY left(task_no, length(task_no) - 4);
CREATE UNIQUE INDEX ux_projects_code ON projects (code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX ux_tasks_task_no ON tasks (task_no) WHERE task_no IS NOT NULL;
