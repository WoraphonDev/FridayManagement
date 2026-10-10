-- PostgreSQL foundation (owner decision 2026-10-11): ledger + value checks equal to the SQLite
-- provider's registered functions (src/repository/value-codecs.ts). Timestamps stay ISO-8601 text.
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
CREATE OR REPLACE FUNCTION friday_now() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;
-- JavaScript string length: code points beyond the BMP count twice (UTF-16 surrogate pairs).
CREATE OR REPLACE FUNCTION friday_utf16_units(v text) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT char_length(v) + char_length(regexp_replace(v, '[^\U00010000-\U0010FFFF]', '', 'g'))
$$;
CREATE OR REPLACE FUNCTION friday_valid_date(v text) RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF v IS NULL OR v !~ '^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RETURN 0; END IF;
  RETURN CASE WHEN to_char(v::date, 'YYYY-MM-DD') = v THEN 1 ELSE 0 END;
EXCEPTION WHEN others THEN RETURN 0;
END $$;
CREATE OR REPLACE FUNCTION friday_valid_utc(v text) RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF v IS NULL OR v !~ '^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' THEN RETURN 0; END IF;
  RETURN CASE WHEN to_char(v::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') = v THEN 1 ELSE 0 END;
EXCEPTION WHEN others THEN RETURN 0;
END $$;
CREATE OR REPLACE FUNCTION friday_valid_uuid(v text) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN v ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END
$$;
-- Same key as localCaseInsensitiveKey(): NFC, Unicode lowercase (ICU), trailing spaces removed.
CREATE OR REPLACE FUNCTION friday_ci_key(v text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(normalize(v, NFC) COLLATE "und-x-icu"), ' +$', '')
$$;
-- SQLite JSON1 equivalents used by CHECK constraints (never raise inside a constraint).
CREATE OR REPLACE FUNCTION json_valid(v text) RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  PERFORM v::jsonb;
  RETURN CASE WHEN v IS NULL THEN 0 ELSE 1 END;
EXCEPTION WHEN others THEN RETURN 0;
END $$;
CREATE OR REPLACE FUNCTION json_type(v text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN jsonb_typeof(v::jsonb);
EXCEPTION WHEN others THEN RETURN NULL;
END $$;
