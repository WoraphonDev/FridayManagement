-- Preserve all legacy checklist data; new remarks start empty.
ALTER TABLE subtasks ADD COLUMN remark TEXT NOT NULL DEFAULT '' CHECK (friday_utf16_units(remark)<=2000);
