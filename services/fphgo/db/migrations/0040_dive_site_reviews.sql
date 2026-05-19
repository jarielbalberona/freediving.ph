-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS dive_site_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  visibility TEXT NOT NULL DEFAULT 'members',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dive_site_id, user_id),
  CHECK (rating BETWEEN 1 AND 5),
  CHECK (visibility IN ('public', 'members', 'private')),
  CHECK (status IN ('active', 'hidden', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_dive_site_reviews_site_visible
  ON dive_site_reviews (dive_site_id, visibility, updated_at DESC, id DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_dive_site_reviews_user_updated
  ON dive_site_reviews (user_id, updated_at DESC, id DESC)
  WHERE status = 'active';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_dive_site_reviews_user_updated;
DROP INDEX IF EXISTS idx_dive_site_reviews_site_visible;
DROP TABLE IF EXISTS dive_site_reviews;
-- +goose StatementEnd
