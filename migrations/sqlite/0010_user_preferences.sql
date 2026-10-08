-- T-089 NFR-09/UX-03: per-user UI preferences (motion, confetti, column widths, hidden tabs).
CREATE TABLE [user_preferences] (
  [user_id] INTEGER NOT NULL,
  [data] TEXT NOT NULL DEFAULT ('{}'),
  [updated_at] TEXT NOT NULL,
  CONSTRAINT [pk_user_preferences] PRIMARY KEY ([user_id]),
  CONSTRAINT [ck_user_preferences_data] CHECK (length([data]) <= 4000 AND json_valid([data]) = 1 AND json_type([data]) = 'object'),
  CONSTRAINT [ck_user_preferences_updated_at] CHECK (friday_valid_utc([updated_at]) = 1),
  CONSTRAINT [fk_user_preferences_1] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;
