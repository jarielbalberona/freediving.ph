-- +goose Up
ALTER TABLE schools ADD COLUMN IF NOT EXISTS base_location_label TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS formatted_address TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS region_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS province_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS province_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS city_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS city_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS barangay_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS barangay_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS location_source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL;

UPDATE schools
SET base_location_label = COALESCE(base_location_label, base_location)
WHERE base_location IS NOT NULL AND base_location_label IS NULL;

CREATE INDEX IF NOT EXISTS idx_schools_location_search
  ON schools (location_source, region_code, province_code, city_code, barangay_code);
CREATE INDEX IF NOT EXISTS idx_schools_dive_site_id ON schools (dive_site_id) WHERE dive_site_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_schools_dive_site_id;
DROP INDEX IF EXISTS idx_schools_location_search;
ALTER TABLE schools DROP COLUMN IF EXISTS dive_site_id;
ALTER TABLE schools DROP COLUMN IF EXISTS location_source;
ALTER TABLE schools DROP COLUMN IF EXISTS barangay_name;
ALTER TABLE schools DROP COLUMN IF EXISTS barangay_code;
ALTER TABLE schools DROP COLUMN IF EXISTS city_name;
ALTER TABLE schools DROP COLUMN IF EXISTS city_code;
ALTER TABLE schools DROP COLUMN IF EXISTS province_name;
ALTER TABLE schools DROP COLUMN IF EXISTS province_code;
ALTER TABLE schools DROP COLUMN IF EXISTS region_name;
ALTER TABLE schools DROP COLUMN IF EXISTS region_code;
ALTER TABLE schools DROP COLUMN IF EXISTS formatted_address;
ALTER TABLE schools DROP COLUMN IF EXISTS base_location_label;
