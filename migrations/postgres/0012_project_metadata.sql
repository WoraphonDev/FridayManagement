-- Owner request 2026-10-09: Project Type / Project Category dropdowns.
ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'internal'
  CHECK (project_type IN ('', 'internal', 'client', 'operations', 'other'));
ALTER TABLE projects ADD COLUMN project_category TEXT NOT NULL DEFAULT 'development'
  CHECK (project_category IN ('', 'development', 'general', 'it', 'marketing', 'finance', 'hr', 'other'));
