-- Owner request 2026-10-09: Project Type / Project Category dropdowns.
ALTER TABLE dbo.projects ADD project_type NVARCHAR(20) NOT NULL
  CONSTRAINT df_projects_type DEFAULT N'internal'
  CONSTRAINT ck_projects_type CHECK (project_type IN (N'', N'internal', N'client', N'operations', N'other'));
ALTER TABLE dbo.projects ADD project_category NVARCHAR(20) NOT NULL
  CONSTRAINT df_projects_category DEFAULT N'development'
  CONSTRAINT ck_projects_category CHECK (project_category IN (N'', N'development', N'general', N'it', N'marketing', N'finance', N'hr', N'other'));
