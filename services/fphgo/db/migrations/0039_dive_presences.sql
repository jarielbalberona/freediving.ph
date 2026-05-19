-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS dive_presences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  presence_type TEXT NOT NULL,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  visibility TEXT NOT NULL DEFAULT 'members',
  contact_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (presence_type IN ('available', 'planning', 'training', 'fun_dive')),
  CHECK (visibility IN ('public', 'members', 'private')),
  CHECK (status IN ('active', 'cancelled', 'expired')),
  CHECK (start_at IS NULL OR end_at IS NULL OR start_at < end_at)
);

CREATE INDEX IF NOT EXISTS idx_dive_presences_site_active_visible
  ON dive_presences (dive_site_id, visibility, start_at ASC NULLS FIRST, created_at DESC, id DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_dive_presences_user_active
  ON dive_presences (user_id, updated_at DESC, id DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_dive_presences_expiry
  ON dive_presences (end_at)
  WHERE status = 'active' AND end_at IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_dive_presences_expiry;
DROP INDEX IF EXISTS idx_dive_presences_user_active;
DROP INDEX IF EXISTS idx_dive_presences_site_active_visible;
DROP TABLE IF EXISTS dive_presences;
-- +goose StatementEnd
