IF OBJECT_ID(N'dbo.schema_migrations', N'U') IS NULL
  CREATE TABLE dbo.schema_migrations (
    id NVARCHAR(100) NOT NULL PRIMARY KEY,
    sha256 NVARCHAR(64) NOT NULL,
    applied_at NVARCHAR(30) NOT NULL
  );
