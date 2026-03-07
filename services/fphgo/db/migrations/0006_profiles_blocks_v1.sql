-- +goose Up
-- +goose StatementBegin
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS socials JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_app_user_id, blocked_app_user_id),
  CHECK (blocker_app_user_id <> blocked_app_user_id)
);

INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id, created_at)
SELECT blocker_id, blocked_id, created_at
FROM blocks
ON CONFLICT (blocker_app_user_id, blocked_app_user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_app_user_id ON user_blocks (blocker_app_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_app_user_id ON user_blocks (blocked_app_user_id);
CREATE INDEX IF NOT EXISTS idx_users_display_name_search ON users (lower(display_name));
CREATE INDEX IF NOT EXISTS idx_users_username_search ON users (lower(username));
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_created_at ON user_blocks (blocker_app_user_id, created_at DESC, blocked_app_user_id DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_blocks_blocker_created_at;
DROP INDEX IF EXISTS idx_user_blocks_blocked_app_user_id;
DROP INDEX IF EXISTS idx_user_blocks_blocker_app_user_id;
DROP INDEX IF EXISTS idx_users_username_search;
DROP INDEX IF EXISTS idx_users_display_name_search;

DROP TABLE IF EXISTS user_blocks;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS socials,
  DROP COLUMN IF EXISTS location;
-- +goose StatementEnd
