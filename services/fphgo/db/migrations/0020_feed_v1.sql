-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS feed_impressions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  feed_item_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  position INTEGER NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (mode IN ('following', 'nearby', 'training', 'spot-reports')),
  CHECK (position >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_impressions_dedupe
  ON feed_impressions (user_id, session_id, feed_item_id, position);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_user_seen_at
  ON feed_impressions (user_id, seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_entity_seen_at
  ON feed_impressions (entity_type, entity_id, seen_at DESC);

CREATE TABLE IF NOT EXISTS feed_actions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  feed_item_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (mode IN ('following', 'nearby', 'training', 'spot-reports'))
);

CREATE INDEX IF NOT EXISTS idx_feed_actions_user_created_at
  ON feed_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_actions_entity_created_at
  ON feed_actions (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_actions_action_created_at
  ON feed_actions (action_type, created_at DESC);

CREATE TABLE IF NOT EXISTS user_feed_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_regions TEXT[] NOT NULL DEFAULT '{}'::text[],
  muted_entity_types TEXT[] NOT NULL DEFAULT '{}'::text[],
  muted_topics TEXT[] NOT NULL DEFAULT '{}'::text[],
  hidden_creators TEXT[] NOT NULL DEFAULT '{}'::text[],
  hidden_spots TEXT[] NOT NULL DEFAULT '{}'::text[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_hidden_feed_items (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'hidden',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hidden_feed_items_user_created_at
  ON user_hidden_feed_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_hidden_feed_items_entity
  ON user_hidden_feed_items (entity_type, entity_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_hidden_feed_items_entity;
DROP INDEX IF EXISTS idx_user_hidden_feed_items_user_created_at;
DROP TABLE IF EXISTS user_hidden_feed_items;
DROP TABLE IF EXISTS user_feed_preferences;
DROP INDEX IF EXISTS idx_feed_actions_action_created_at;
DROP INDEX IF EXISTS idx_feed_actions_entity_created_at;
DROP INDEX IF EXISTS idx_feed_actions_user_created_at;
DROP TABLE IF EXISTS feed_actions;
DROP INDEX IF EXISTS idx_feed_impressions_entity_seen_at;
DROP INDEX IF EXISTS idx_feed_impressions_user_seen_at;
DROP INDEX IF EXISTS idx_feed_impressions_dedupe;
DROP TABLE IF EXISTS feed_impressions;
-- +goose StatementEnd
