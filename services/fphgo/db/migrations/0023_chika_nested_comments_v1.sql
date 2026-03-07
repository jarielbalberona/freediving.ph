-- +goose Up
-- +goose StatementBegin
ALTER TABLE chika_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id BIGINT REFERENCES chika_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chika_comments_thread_parent_created_at
  ON chika_comments (thread_id, parent_comment_id, created_at DESC)
  WHERE deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_chika_comments_thread_parent_created_at;

ALTER TABLE chika_comments
  DROP COLUMN IF EXISTS parent_comment_id;
-- +goose StatementEnd
