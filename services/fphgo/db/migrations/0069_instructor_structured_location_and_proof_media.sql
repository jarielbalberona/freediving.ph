-- +goose Up
-- +goose StatementBegin
ALTER TABLE instructor_profiles
  ADD COLUMN IF NOT EXISTS formatted_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS region_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS region_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS province_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS province_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS barangay_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS barangay_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE instructor_profiles DROP CONSTRAINT IF EXISTS instructor_profiles_location_source_check;
ALTER TABLE instructor_profiles
  ADD CONSTRAINT instructor_profiles_location_source_check
  CHECK (location_source IN ('manual', 'google_places', 'psgc_mapped', 'unmapped'));

ALTER TABLE media_objects DROP CONSTRAINT IF EXISTS media_objects_context_type_check;
ALTER TABLE media_objects
  ADD CONSTRAINT media_objects_context_type_check
  CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'dive_spot_attachment',
    'group_cover',
    'instructor_certification_proof'
  ));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE media_objects DROP CONSTRAINT IF EXISTS media_objects_context_type_check;
ALTER TABLE media_objects
  ADD CONSTRAINT media_objects_context_type_check
  CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'dive_spot_attachment',
    'group_cover'
  ));

ALTER TABLE instructor_profiles
  DROP CONSTRAINT IF EXISTS instructor_profiles_location_source_check,
  DROP COLUMN IF EXISTS location_source,
  DROP COLUMN IF EXISTS barangay_name,
  DROP COLUMN IF EXISTS barangay_code,
  DROP COLUMN IF EXISTS city_name,
  DROP COLUMN IF EXISTS city_code,
  DROP COLUMN IF EXISTS province_name,
  DROP COLUMN IF EXISTS province_code,
  DROP COLUMN IF EXISTS region_name,
  DROP COLUMN IF EXISTS region_code,
  DROP COLUMN IF EXISTS formatted_address;
-- +goose StatementEnd
