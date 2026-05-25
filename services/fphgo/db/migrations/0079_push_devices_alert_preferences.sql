-- +goose Up
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'unknown',
  device_id TEXT,
  device_name TEXT,
  app_version TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (platform IN ('ios', 'android', 'web', 'unknown'))
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_id
  ON device_push_tokens(user_id)
  WHERE enabled = TRUE;

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS buddy_updates BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS profile_social_updates BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS dive_condition_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dive_condition_saved_sites BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS dive_condition_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dive_condition_near_me BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dive_condition_coarse_area TEXT;

-- +goose Down
ALTER TABLE notification_settings
  DROP COLUMN IF EXISTS dive_condition_coarse_area,
  DROP COLUMN IF EXISTS dive_condition_near_me,
  DROP COLUMN IF EXISTS dive_condition_regions,
  DROP COLUMN IF EXISTS dive_condition_saved_sites,
  DROP COLUMN IF EXISTS dive_condition_alerts,
  DROP COLUMN IF EXISTS profile_social_updates,
  DROP COLUMN IF EXISTS buddy_updates;

DROP INDEX IF EXISTS idx_device_push_tokens_user_id;
DROP TABLE IF EXISTS device_push_tokens;
