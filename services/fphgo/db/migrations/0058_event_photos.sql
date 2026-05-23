-- +goose Up
-- +goose StatementBegin
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

ALTER TABLE event_competitions
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

ALTER TABLE event_prizes
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE event_prizes
  DROP COLUMN IF EXISTS photo_url;

ALTER TABLE event_competitions
  DROP COLUMN IF EXISTS cover_photo_url;

ALTER TABLE events
  DROP COLUMN IF EXISTS cover_photo_url;
-- +goose StatementEnd
