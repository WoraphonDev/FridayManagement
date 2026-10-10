-- T-090 FR-47: private project favorites; rows are removed when the user loses project access.
CREATE TABLE "user_favorites" (
  "user_id" INTEGER NOT NULL,
  "project_id" INTEGER NOT NULL,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "pk_user_favorites" PRIMARY KEY ("user_id", "project_id"),
  CONSTRAINT "ck_user_favorites_created_at" CHECK (friday_valid_utc("created_at") = 1),
  CONSTRAINT "fk_user_favorites_1" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "fk_user_favorites_2" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX "ix_user_favorites_project" ON "user_favorites" ("project_id");
