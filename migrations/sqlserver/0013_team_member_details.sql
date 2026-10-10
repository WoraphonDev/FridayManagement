-- Contact information only; team positions never grant permissions.
ALTER TABLE dbo.users ADD email NVARCHAR(254) NOT NULL CONSTRAINT df_users_email DEFAULT N'';
ALTER TABLE dbo.users ADD telephone NVARCHAR(40) NOT NULL CONSTRAINT df_users_telephone DEFAULT N'';
ALTER TABLE dbo.team_members ADD team_position NVARCHAR(10) NOT NULL CONSTRAINT df_team_members_position DEFAULT N'dev'
  CONSTRAINT ck_team_members_position CHECK (team_position IN (N'pm',N'lead',N'dev'));
UPDATE dbo.team_members SET team_position=N'lead' WHERE team_role=N'lead';
