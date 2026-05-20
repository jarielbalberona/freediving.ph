-- +goose Up
-- +goose StatementBegin
ALTER TABLE dive_site_edit_proposals
  ADD COLUMN IF NOT EXISTS proposed_area TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS proposed_longitude DOUBLE PRECISION;

UPDATE dive_site_edit_proposals p
SET
  proposed_area = s.area,
  proposed_latitude = s.latitude,
  proposed_longitude = s.longitude
FROM dive_sites s
WHERE p.dive_site_id = s.id
  AND p.proposed_area = '';

ALTER TABLE dive_site_edit_proposals
  ADD CONSTRAINT dive_site_edit_proposals_proposed_latitude_check
    CHECK (proposed_latitude IS NULL OR (proposed_latitude >= -90 AND proposed_latitude <= 90)),
  ADD CONSTRAINT dive_site_edit_proposals_proposed_longitude_check
    CHECK (proposed_longitude IS NULL OR (proposed_longitude >= -180 AND proposed_longitude <= 180));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE dive_site_edit_proposals
  DROP CONSTRAINT IF EXISTS dive_site_edit_proposals_proposed_longitude_check,
  DROP CONSTRAINT IF EXISTS dive_site_edit_proposals_proposed_latitude_check;

ALTER TABLE dive_site_edit_proposals
  DROP COLUMN IF EXISTS proposed_longitude,
  DROP COLUMN IF EXISTS proposed_latitude,
  DROP COLUMN IF EXISTS proposed_area;
-- +goose StatementEnd
