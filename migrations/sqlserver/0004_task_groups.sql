CREATE TABLE dbo.project_groups (
 id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_project_groups PRIMARY KEY,
 project_id INT NOT NULL CONSTRAINT FK_project_groups_project REFERENCES dbo.projects(id),
 name NVARCHAR(100) NOT NULL,
 color VARCHAR(7) NOT NULL CONSTRAINT DF_project_groups_color DEFAULT '#579bfc',
 position INT NOT NULL,
 version INT NOT NULL CONSTRAINT DF_project_groups_version DEFAULT 1,
 created_at DATETIME2(3) NOT NULL,
 CONSTRAINT CK_project_groups_name CHECK(DATALENGTH(name) BETWEEN 2 AND 200 AND LEN(LTRIM(RTRIM(name))) > 0),
 CONSTRAINT CK_project_groups_color CHECK(LEN(color)=7 AND LEFT(color,1)='#' AND SUBSTRING(color,2,6) NOT LIKE '%[^0-9a-fA-F]%' COLLATE Latin1_General_100_BIN2),
 CONSTRAINT CK_project_groups_position CHECK(position>=0),
 CONSTRAINT CK_project_groups_version CHECK(version>=1)
);
CREATE INDEX ix_project_groups_project ON dbo.project_groups(project_id,position,id);
ALTER TABLE dbo.tasks ADD group_id INT NULL CONSTRAINT FK_tasks_group REFERENCES dbo.project_groups(id);
CREATE INDEX ix_tasks_group ON dbo.tasks(group_id);
