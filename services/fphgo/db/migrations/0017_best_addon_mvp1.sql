-- +goose Up
-- +goose StatementBegin
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE TABLE IF NOT EXISTS saved_users (
  viewer_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  saved_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (viewer_app_user_id, saved_app_user_id),
  CHECK (viewer_app_user_id <> saved_app_user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_users_viewer_created_at ON saved_users (viewer_app_user_id, created_at DESC, saved_app_user_id DESC);
CREATE INDEX IF NOT EXISTS idx_saved_users_saved_app_user_id ON saved_users (saved_app_user_id);

ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_target_type_check,
  DROP CONSTRAINT IF EXISTS reports_check;

ALTER TABLE reports
  ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('user', 'message', 'chika_thread', 'chika_comment', 'dive_site_update'));

ALTER TABLE reports
  ADD CONSTRAINT reports_check
  CHECK (
    (target_type IN ('user', 'chika_thread', 'dive_site_update') AND target_uuid IS NOT NULL AND target_bigint IS NULL)
    OR
    (target_type IN ('message', 'chika_comment') AND target_bigint IS NOT NULL AND target_uuid IS NULL)
  );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_target_type_check,
  DROP CONSTRAINT IF EXISTS reports_check;

ALTER TABLE reports
  ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('user', 'message', 'chika_thread', 'chika_comment'));

ALTER TABLE reports
  ADD CONSTRAINT reports_check
  CHECK (
    (target_type IN ('user', 'chika_thread') AND target_uuid IS NOT NULL AND target_bigint IS NULL)
    OR
    (target_type IN ('message', 'chika_comment') AND target_bigint IS NOT NULL AND target_uuid IS NULL)
  );

DROP INDEX IF EXISTS idx_saved_users_saved_app_user_id;
DROP INDEX IF EXISTS idx_saved_users_viewer_created_at;
DROP TABLE IF EXISTS saved_users;

ALTER TABLE messages
  DROP COLUMN IF EXISTS metadata;
-- +goose StatementEnd
