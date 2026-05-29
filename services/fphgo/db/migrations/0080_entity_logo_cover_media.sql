-- +goose Up
-- +goose StatementBegin
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS logo_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL;

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS logo_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE groups
  DROP COLUMN IF EXISTS cover_media_id,
  DROP COLUMN IF EXISTS logo_media_id;

ALTER TABLE events
  DROP COLUMN IF EXISTS cover_media_id,
  DROP COLUMN IF EXISTS logo_media_id;
-- +goose StatementEnd
