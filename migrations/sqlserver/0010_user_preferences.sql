-- T-089 NFR-09/UX-03: per-user UI preferences (motion, confetti, column widths, hidden tabs).
CREATE TABLE dbo.[user_preferences] (
  [user_id] INT NOT NULL CONSTRAINT [fk_user_preferences_1] REFERENCES dbo.[users]([id]),
  [data] NVARCHAR(4000) NOT NULL CONSTRAINT [df_user_preferences_data] DEFAULT (N'{}'),
  [updated_at] DATETIME2(3) NOT NULL,
  CONSTRAINT [pk_user_preferences] PRIMARY KEY ([user_id]),
  CONSTRAINT [ck_user_preferences_data] CHECK (ISJSON([data]) = 1 AND LEFT(LTRIM([data]), 1) = N'{')
);
