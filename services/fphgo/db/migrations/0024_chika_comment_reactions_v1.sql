-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS chika_comment_reactions (
  comment_id BIGINT NOT NULL REFERENCES chika_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id),
  CHECK (reaction_type IN ('upvote', 'downvote'))
);

CREATE INDEX IF NOT EXISTS idx_chika_comment_reactions_comment
  ON chika_comment_reactions (comment_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_chika_comment_reactions_comment;
DROP TABLE IF EXISTS chika_comment_reactions;
-- +goose StatementEnd
