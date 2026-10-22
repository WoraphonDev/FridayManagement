-- Operator runs after EVERY migration/restore, against the explicit *_staging DB.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() !~ '^[a-z][a-z0-9_]*_staging$'
     OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
  THEN RAISE EXCEPTION 'Isolated PostgreSQL 17 staging database required'; END IF;
END $$;
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO friday_stage_app, friday_stage_backup', current_database()) \gexec
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO friday_stage_owner;
GRANT USAGE ON SCHEMA public TO friday_stage_app, friday_stage_backup;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM friday_stage_app, friday_stage_backup;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM friday_stage_app, friday_stage_backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO friday_stage_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO friday_stage_app;
REVOKE INSERT, UPDATE, DELETE ON public.schema_migrations FROM friday_stage_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO friday_stage_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO friday_stage_backup;
GRANT INSERT, UPDATE, DELETE ON public.maintenance_state TO friday_stage_backup;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO friday_stage_app, friday_stage_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE friday_stage_owner IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- No broad default DML grants: newly migrated objects stay inaccessible until this file is rerun.
