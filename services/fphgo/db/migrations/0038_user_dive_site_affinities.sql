-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS user_dive_site_affinities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'members',
  contact_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, dive_site_id, relationship),
  CHECK (relationship IN ('local', 'regular', 'instructor', 'operator', 'interested')),
  CHECK (visibility IN ('public', 'members', 'private'))
);

CREATE INDEX IF NOT EXISTS idx_user_dive_site_affinities_site_visible
  ON user_dive_site_affinities (dive_site_id, visibility, relationship, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_dive_site_affinities_user_updated
  ON user_dive_site_affinities (user_id, updated_at DESC, id DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_dive_site_affinities_user_updated;
DROP INDEX IF EXISTS idx_user_dive_site_affinities_site_visible;
DROP TABLE IF EXISTS user_dive_site_affinities;
-- +goose StatementEnd
