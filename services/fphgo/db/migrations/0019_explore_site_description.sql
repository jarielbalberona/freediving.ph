-- +goose Up
ALTER TABLE dive_sites
  ADD COLUMN IF NOT EXISTS description TEXT;

-- +goose Down
ALTER TABLE dive_sites
  DROP COLUMN IF EXISTS description;
