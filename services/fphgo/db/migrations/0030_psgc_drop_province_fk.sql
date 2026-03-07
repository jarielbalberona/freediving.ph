-- +goose Up
-- +goose StatementBegin
ALTER TABLE psgc_cities_municipalities
  DROP CONSTRAINT IF EXISTS psgc_cities_municipalities_province_code_fkey;

ALTER TABLE psgc_barangays
  DROP CONSTRAINT IF EXISTS psgc_barangays_province_code_fkey;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE psgc_cities_municipalities
  ADD CONSTRAINT psgc_cities_municipalities_province_code_fkey
  FOREIGN KEY (province_code) REFERENCES psgc_provinces(code) NOT VALID;

ALTER TABLE psgc_barangays
  ADD CONSTRAINT psgc_barangays_province_code_fkey
  FOREIGN KEY (province_code) REFERENCES psgc_provinces(code) NOT VALID;
-- +goose StatementEnd
