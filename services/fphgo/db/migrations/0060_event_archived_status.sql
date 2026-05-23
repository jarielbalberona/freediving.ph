-- +goose Up
-- +goose StatementBegin
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_status_check,
  ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed', 'archived'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE events
SET status = 'cancelled'
WHERE status = 'archived';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_status_check,
  ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed'));
-- +goose StatementEnd
