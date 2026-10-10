-- T-081 FR-42/FR-42A/BR-21–BR-23: per-user permission checkboxes and project role manager.
ALTER TABLE "users" ADD COLUMN "permissions_version" INTEGER NOT NULL DEFAULT (1) CHECK ("permissions_version" BETWEEN 1 AND 2147483647);
CREATE TABLE "user_permissions" (
  "user_id" INTEGER NOT NULL,
  "permission_key" TEXT NOT NULL,
  "granted_by" INTEGER NOT NULL,
  "granted_at" TEXT NOT NULL,
  CONSTRAINT "pk_user_permissions" PRIMARY KEY ("user_id", "permission_key"),
  CONSTRAINT "ck_user_permissions_key" CHECK ("permission_key" IN ('P-01','P-02','P-03','P-04','P-05','P-06','P-07','P-08','P-09','P-10')),
  CONSTRAINT "ck_user_permissions_granted_at" CHECK (friday_valid_utc("granted_at") = 1),
  CONSTRAINT "fk_user_permissions_1" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "fk_user_permissions_2" FOREIGN KEY ("granted_by") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
-- Allow the manager project role (SQLite rebuilds the table; PostgreSQL alters the CHECK).
ALTER TABLE "project_members" DROP CONSTRAINT "ck_project_members_access";
ALTER TABLE "project_members" ADD CONSTRAINT "ck_project_members_access" CHECK ("access" IN ('manager', 'editor', 'viewer'));
