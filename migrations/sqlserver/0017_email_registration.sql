CREATE TABLE dbo.registrations (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES dbo.users(id),
  email NVARCHAR(254) COLLATE Latin1_General_100_BIN2 NOT NULL UNIQUE,
  status NVARCHAR(20) NOT NULL DEFAULT N'pending' CHECK (status IN (N'pending',N'approved',N'rejected')),
  version INT NOT NULL DEFAULT 1 CHECK (version>=1),
  reviewed_by INT REFERENCES dbo.users(id),
  created_at DATETIME2(3) NOT NULL,
  reviewed_at DATETIME2(3),
  CHECK (LEN(email) BETWEEN 3 AND 254 AND email=LOWER(LTRIM(RTRIM(email)))),
  CHECK ((status=N'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
         (status<>N'pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX ix_registrations_status_id ON dbo.registrations(status,id);
