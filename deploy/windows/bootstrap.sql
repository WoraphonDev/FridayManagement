-- One-time operator action, as postgres, connected to postgres. No embedded passwords.
-- Deliberately fails if names already exist: never repurpose existing roles/databases.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
     OR current_database() <> 'postgres' THEN RAISE EXCEPTION 'PostgreSQL 17 operator bootstrap only'; END IF;
END $$;
CREATE ROLE friday_stage_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE ROLE friday_stage_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE ROLE friday_stage_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE DATABASE friday_staging OWNER friday_stage_owner;
\connect friday_staging
REVOKE ALL ON DATABASE friday_staging FROM PUBLIC;
GRANT CONNECT ON DATABASE friday_staging TO friday_stage_app, friday_stage_backup;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO friday_stage_owner;
-- Run \password separately in an interactive psql session for all three roles.
