-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS event_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_interests_event_active
  ON event_interests (event_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_interests_user_active
  ON event_interests (user_id)
  WHERE deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_event_interests_user_active;
DROP INDEX IF EXISTS idx_event_interests_event_active;
DROP TABLE IF EXISTS event_interests;
-- +goose StatementEnd
