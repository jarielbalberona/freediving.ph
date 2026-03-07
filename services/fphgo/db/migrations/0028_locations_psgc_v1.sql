-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS psgc_regions (
  code TEXT PRIMARY KEY,
  psgc_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psgc_provinces (
  code TEXT PRIMARY KEY,
  psgc_code TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL REFERENCES psgc_regions(code),
  name TEXT NOT NULL,
  old_name TEXT,
  city_class TEXT,
  source_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psgc_cities_municipalities (
  code TEXT PRIMARY KEY,
  psgc_code TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL REFERENCES psgc_regions(code),
  province_code TEXT NOT NULL REFERENCES psgc_provinces(code),
  name TEXT NOT NULL,
  old_name TEXT,
  source_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psgc_barangays (
  code TEXT PRIMARY KEY,
  psgc_code TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL REFERENCES psgc_regions(code),
  province_code TEXT NOT NULL REFERENCES psgc_provinces(code),
  city_municipality_code TEXT NOT NULL REFERENCES psgc_cities_municipalities(code),
  name TEXT NOT NULL,
  old_name TEXT,
  source_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psgc_import_history (
  id BIGSERIAL PRIMARY KEY,
  source_version TEXT NOT NULL,
  source_directory TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  regions_count INTEGER NOT NULL DEFAULT 0,
  provinces_count INTEGER NOT NULL DEFAULT 0,
  cities_municipalities_count INTEGER NOT NULL DEFAULT 0,
  barangays_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS region_code TEXT REFERENCES psgc_regions(code),
  ADD COLUMN IF NOT EXISTS province_code TEXT REFERENCES psgc_provinces(code),
  ADD COLUMN IF NOT EXISTS city_municipality_code TEXT REFERENCES psgc_cities_municipalities(code),
  ADD COLUMN IF NOT EXISTS barangay_code TEXT REFERENCES psgc_barangays(code),
  ADD COLUMN IF NOT EXISTS location_source TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_location_source_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_location_source_check
      CHECK (location_source IN ('manual', 'google_places', 'psgc_mapped', 'unmapped'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_psgc_regions_active_name ON psgc_regions (is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_provinces_region_active_name ON psgc_provinces (region_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_cities_province_active_name ON psgc_cities_municipalities (province_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_cities_region_active_name ON psgc_cities_municipalities (region_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_barangays_city_active_name ON psgc_barangays (city_municipality_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_barangays_province_active_name ON psgc_barangays (province_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_import_history_source_version ON psgc_import_history (source_version, imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_region_code ON events (region_code);
CREATE INDEX IF NOT EXISTS idx_events_province_code ON events (province_code);
CREATE INDEX IF NOT EXISTS idx_events_city_municipality_code ON events (city_municipality_code);
CREATE INDEX IF NOT EXISTS idx_events_barangay_code ON events (barangay_code);
CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_google_place_id ON events (google_place_id) WHERE google_place_id IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_events_google_place_id;
DROP INDEX IF EXISTS idx_events_lat_lng;
DROP INDEX IF EXISTS idx_events_barangay_code;
DROP INDEX IF EXISTS idx_events_city_municipality_code;
DROP INDEX IF EXISTS idx_events_province_code;
DROP INDEX IF EXISTS idx_events_region_code;

DROP INDEX IF EXISTS idx_psgc_import_history_source_version;
DROP INDEX IF EXISTS idx_psgc_barangays_province_active_name;
DROP INDEX IF EXISTS idx_psgc_barangays_city_active_name;
DROP INDEX IF EXISTS idx_psgc_cities_region_active_name;
DROP INDEX IF EXISTS idx_psgc_cities_province_active_name;
DROP INDEX IF EXISTS idx_psgc_provinces_region_active_name;
DROP INDEX IF EXISTS idx_psgc_regions_active_name;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_location_source_check,
  DROP COLUMN IF EXISTS location_source,
  DROP COLUMN IF EXISTS barangay_code,
  DROP COLUMN IF EXISTS city_municipality_code,
  DROP COLUMN IF EXISTS province_code,
  DROP COLUMN IF EXISTS region_code,
  DROP COLUMN IF EXISTS google_place_id,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS formatted_address,
  DROP COLUMN IF EXISTS location_name;

DROP TABLE IF EXISTS psgc_import_history;
DROP TABLE IF EXISTS psgc_barangays;
DROP TABLE IF EXISTS psgc_cities_municipalities;
DROP TABLE IF EXISTS psgc_provinces;
DROP TABLE IF EXISTS psgc_regions;
-- +goose StatementEnd
