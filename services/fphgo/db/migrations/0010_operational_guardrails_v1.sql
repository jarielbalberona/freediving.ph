-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_seconds INTEGER NOT NULL,
  CHECK (window_seconds > 0)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_scope_key_created_at
  ON rate_limit_events (scope, key_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_created_at
  ON rate_limit_events (created_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_rate_limit_events_created_at;
DROP INDEX IF EXISTS idx_rate_limit_events_scope_key_created_at;
DROP TABLE IF EXISTS rate_limit_events;
-- +goose StatementEnd
