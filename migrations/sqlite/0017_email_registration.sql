-- Email login is immutable and separate from the editable contact email.
CREATE TABLE registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  email TEXT NOT NULL UNIQUE CHECK (length(email) BETWEEN 3 AND 254 AND email=lower(trim(email))),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 2147483647),
  reviewed_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL CHECK (friday_valid_utc(created_at)=1),
  reviewed_at TEXT CHECK (reviewed_at IS NULL OR friday_valid_utc(reviewed_at)=1),
  CHECK ((status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
         (status!='pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
) STRICT;
CREATE INDEX ix_registrations_status_id ON registrations(status,id);
