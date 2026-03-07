-- +goose Up
-- +goose StatementBegin
ALTER TABLE psgc_cities_municipalities
  ALTER COLUMN province_code DROP NOT NULL;

ALTER TABLE psgc_barangays
  ALTER COLUMN province_code DROP NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM psgc_barangays WHERE province_code IS NULL;
DELETE FROM psgc_cities_municipalities WHERE province_code IS NULL;

ALTER TABLE psgc_barangays
  ALTER COLUMN province_code SET NOT NULL;

ALTER TABLE psgc_cities_municipalities
  ALTER COLUMN province_code SET NOT NULL;
-- +goose StatementEnd
