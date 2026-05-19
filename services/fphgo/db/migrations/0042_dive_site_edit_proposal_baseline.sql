-- +goose Up
-- +goose StatementBegin
ALTER TABLE dive_site_edit_proposals
  ADD COLUMN IF NOT EXISTS base_site_updated_at TIMESTAMPTZ;

UPDATE dive_site_edit_proposals p
SET base_site_updated_at = s.updated_at
FROM dive_sites s
WHERE p.dive_site_id = s.id
  AND p.base_site_updated_at IS NULL;

ALTER TABLE dive_site_edit_proposals
  ALTER COLUMN base_site_updated_at SET NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE dive_site_edit_proposals
  DROP COLUMN IF EXISTS base_site_updated_at;
-- +goose StatementEnd
