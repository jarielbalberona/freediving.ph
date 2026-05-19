-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS media_post_saves (
  media_post_id UUID NOT NULL REFERENCES media_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (media_post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_media_post_saves_post
  ON media_post_saves (media_post_id);

CREATE INDEX IF NOT EXISTS idx_media_post_saves_user_created_at
  ON media_post_saves (user_id, created_at DESC, media_post_id DESC);

CREATE TABLE IF NOT EXISTS media_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_post_id UUID NOT NULL REFERENCES media_posts(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_post_comments_post_created_at
  ON media_post_comments (media_post_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_post_comments_author_created_at
  ON media_post_comments (author_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS media_post_comment_likes (
  comment_id UUID NOT NULL REFERENCES media_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_media_post_comment_likes_comment
  ON media_post_comment_likes (comment_id);

CREATE INDEX IF NOT EXISTS idx_media_post_comment_likes_user
  ON media_post_comment_likes (user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_media_post_comment_likes_user;
DROP INDEX IF EXISTS idx_media_post_comment_likes_comment;
DROP TABLE IF EXISTS media_post_comment_likes;
DROP INDEX IF EXISTS idx_media_post_comments_author_created_at;
DROP INDEX IF EXISTS idx_media_post_comments_post_created_at;
DROP TABLE IF EXISTS media_post_comments;
DROP INDEX IF EXISTS idx_media_post_saves_user_created_at;
DROP INDEX IF EXISTS idx_media_post_saves_post;
DROP TABLE IF EXISTS media_post_saves;
-- +goose StatementEnd
