-- +goose Up
-- +goose StatementBegin
ALTER TABLE chika_threads
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

ALTER TABLE chika_comments
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_uuid UUID,
  target_bigint BIGINT,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (target_type IN ('user', 'chika_thread', 'chika_comment')),
  CHECK (
    (target_type IN ('user', 'chika_thread') AND target_uuid IS NOT NULL AND target_bigint IS NULL)
    OR
    (target_type = 'chika_comment' AND target_bigint IS NOT NULL AND target_uuid IS NULL)
  ),
  CHECK (action IN (
    'suspend_user',
    'unsuspend_user',
    'set_user_read_only',
    'clear_user_read_only',
    'hide_chika_thread',
    'unhide_chika_thread',
    'hide_chika_comment',
    'unhide_chika_comment'
  )),
  CHECK (length(trim(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chika_threads_visible_created_at
  ON chika_threads (created_at DESC)
  WHERE deleted_at IS NULL AND hidden_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chika_comments_visible_thread_created_at
  ON chika_comments (thread_id, created_at DESC)
  WHERE deleted_at IS NULL AND hidden_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_actions_actor_created_at
  ON moderation_actions (actor_app_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_uuid_created_at
  ON moderation_actions (target_type, target_uuid, created_at DESC)
  WHERE target_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_bigint_created_at
  ON moderation_actions (target_type, target_bigint, created_at DESC)
  WHERE target_bigint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_created_at
  ON moderation_actions (report_id, created_at DESC)
  WHERE report_id IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_moderation_actions_report_created_at;
DROP INDEX IF EXISTS idx_moderation_actions_target_bigint_created_at;
DROP INDEX IF EXISTS idx_moderation_actions_target_uuid_created_at;
DROP INDEX IF EXISTS idx_moderation_actions_actor_created_at;
DROP INDEX IF EXISTS idx_chika_comments_visible_thread_created_at;
DROP INDEX IF EXISTS idx_chika_threads_visible_created_at;

DROP TABLE IF EXISTS moderation_actions;

ALTER TABLE chika_comments
  DROP COLUMN IF EXISTS hidden_at;

ALTER TABLE chika_threads
  DROP COLUMN IF EXISTS hidden_at;
-- +goose StatementEnd
