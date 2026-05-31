-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS user_dive_sites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  first_post_id UUID NOT NULL REFERENCES media_posts(id) ON DELETE RESTRICT,
  first_visited_at TIMESTAMPTZ NOT NULL,
  last_post_id UUID NOT NULL REFERENCES media_posts(id) ON DELETE RESTRICT,
  last_visited_at TIMESTAMPTZ NOT NULL,
  media_post_count INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'members',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, dive_site_id),
  CHECK (media_post_count > 0),
  CHECK (first_visited_at <= last_visited_at),
  CHECK (visibility IN ('public', 'members', 'private'))
);

CREATE INDEX IF NOT EXISTS idx_user_dive_sites_dive_site
  ON user_dive_sites (dive_site_id, visibility, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_dive_sites_user_updated
  ON user_dive_sites (user_id, updated_at DESC, dive_site_id);

CREATE INDEX IF NOT EXISTS idx_user_dive_sites_first_post
  ON user_dive_sites (first_post_id);

CREATE INDEX IF NOT EXISTS idx_user_dive_sites_last_post
  ON user_dive_sites (last_post_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_dive_sites_last_post;
DROP INDEX IF EXISTS idx_user_dive_sites_first_post;
DROP INDEX IF EXISTS idx_user_dive_sites_user_updated;
DROP INDEX IF EXISTS idx_user_dive_sites_dive_site;
DROP TABLE IF EXISTS user_dive_sites;
-- +goose StatementEnd
