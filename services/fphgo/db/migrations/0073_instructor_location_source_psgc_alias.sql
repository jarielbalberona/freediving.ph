-- +goose Up
-- +goose StatementBegin
ALTER TABLE instructor_profiles
  DROP CONSTRAINT IF EXISTS instructor_profiles_location_source_check,
  ADD CONSTRAINT instructor_profiles_location_source_check
    CHECK (location_source IN ('manual', 'google_places', 'psgc', 'psgc_mapped', 'unmapped'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE instructor_profiles SET location_source = 'psgc_mapped' WHERE location_source = 'psgc';

ALTER TABLE instructor_profiles
  DROP CONSTRAINT IF EXISTS instructor_profiles_location_source_check,
  ADD CONSTRAINT instructor_profiles_location_source_check
    CHECK (location_source IN ('manual', 'google_places', 'psgc_mapped', 'unmapped'));
-- +goose StatementEnd
