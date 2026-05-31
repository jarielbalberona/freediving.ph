-- +goose Up
CREATE TABLE IF NOT EXISTS passport_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  show_map BOOLEAN NOT NULL DEFAULT TRUE,
  show_badges BOOLEAN NOT NULL DEFAULT TRUE,
  show_journey BOOLEAN NOT NULL DEFAULT TRUE,
  show_memories BOOLEAN NOT NULL DEFAULT TRUE,
  featured_badge_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS passport_settings;
