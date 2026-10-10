-- Contact information only; team positions never grant permissions.
ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT '' CHECK (friday_utf16_units(email) <= 254);
ALTER TABLE users ADD COLUMN telephone TEXT NOT NULL DEFAULT '' CHECK (friday_utf16_units(telephone) <= 40);
ALTER TABLE team_members ADD COLUMN team_position TEXT NOT NULL DEFAULT 'dev' CHECK (team_position IN ('pm','lead','dev'));
UPDATE team_members SET team_position='lead' WHERE team_role='lead';
