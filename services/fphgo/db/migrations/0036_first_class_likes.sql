-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS media_post_likes (
  media_post_id UUID NOT NULL REFERENCES media_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (media_post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_media_post_likes_post
  ON media_post_likes (media_post_id);

CREATE INDEX IF NOT EXISTS idx_media_post_likes_user
  ON media_post_likes (user_id);

CREATE TABLE IF NOT EXISTS dive_site_likes (
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dive_site_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dive_site_likes_site
  ON dive_site_likes (dive_site_id);

CREATE INDEX IF NOT EXISTS idx_dive_site_likes_user
  ON dive_site_likes (user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_dive_site_likes_user;
DROP INDEX IF EXISTS idx_dive_site_likes_site;
DROP TABLE IF EXISTS dive_site_likes;

DROP INDEX IF EXISTS idx_media_post_likes_user;
DROP INDEX IF EXISTS idx_media_post_likes_post;
DROP TABLE IF EXISTS media_post_likes;
-- +goose StatementEnd
