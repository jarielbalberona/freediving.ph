-- +goose Up
-- +goose StatementBegin
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_location_source_check,
  ADD CONSTRAINT events_location_source_check
    CHECK (location_source IN ('manual', 'google_places', 'psgc', 'psgc_mapped', 'unmapped'));

ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS groups_location_source_check,
  ADD CONSTRAINT groups_location_source_check
    CHECK (location_source IN ('manual', 'google_places', 'psgc', 'psgc_mapped', 'unmapped'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE events SET location_source = 'psgc_mapped' WHERE location_source = 'psgc';
UPDATE groups SET location_source = 'psgc_mapped' WHERE location_source = 'psgc';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_location_source_check,
  ADD CONSTRAINT events_location_source_check
    CHECK (location_source IN ('manual', 'google_places', 'psgc_mapped', 'unmapped'));

ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS groups_location_source_check,
  ADD CONSTRAINT groups_location_source_check
    CHECK (location_source IN ('manual', 'google_places', 'psgc_mapped', 'unmapped'));
-- +goose StatementEnd
