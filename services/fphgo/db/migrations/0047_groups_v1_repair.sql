-- +goose Up
-- +goose StatementBegin
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS region_code TEXT,
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS city_municipality_code TEXT,
  ADD COLUMN IF NOT EXISTS barangay_code TEXT,
  ADD COLUMN IF NOT EXISTS location_source TEXT NOT NULL DEFAULT 'manual';

UPDATE groups
SET visibility = 'private'
WHERE visibility = 'invite_only'
   OR visibility NOT IN ('public', 'private');

UPDATE groups
SET join_policy = 'invite_only'
WHERE join_policy = 'approval'
   OR join_policy NOT IN ('open', 'invite_only');

ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS groups_visibility_check,
  DROP CONSTRAINT IF EXISTS groups_join_policy_check;

ALTER TABLE groups
  ADD CONSTRAINT groups_visibility_check
    CHECK (visibility IN ('public', 'private')),
  ADD CONSTRAINT groups_join_policy_check
    CHECK (join_policy IN ('open', 'invite_only'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_location_source_check'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_location_source_check
      CHECK (location_source IN ('manual', 'google_places', 'psgc_mapped', 'unmapped'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_region_code_fkey'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_region_code_fkey
      FOREIGN KEY (region_code) REFERENCES psgc_regions(code);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_province_code_fkey'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_province_code_fkey
      FOREIGN KEY (province_code) REFERENCES psgc_provinces(code);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_city_municipality_code_fkey'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_city_municipality_code_fkey
      FOREIGN KEY (city_municipality_code) REFERENCES psgc_cities_municipalities(code);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_barangay_code_fkey'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_barangay_code_fkey
      FOREIGN KEY (barangay_code) REFERENCES psgc_barangays(code);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_groups_location_search
  ON groups (location_source, region_code, province_code, city_municipality_code, barangay_code);

ALTER TABLE group_memberships
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE group_memberships
  DROP CONSTRAINT IF EXISTS group_memberships_status_check;

UPDATE group_memberships
SET status = 'left'
WHERE status = 'blocked'
  AND left_at IS NOT NULL;

UPDATE group_memberships
SET invited_at = COALESCE(invited_at, created_at)
WHERE status = 'invited';

ALTER TABLE group_memberships
  ADD CONSTRAINT group_memberships_status_check
    CHECK (status IN ('active', 'invited', 'left', 'declined', 'blocked'));
-- +goose StatementEnd
