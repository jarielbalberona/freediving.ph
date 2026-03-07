-- +goose Up
-- +goose StatementBegin
ALTER TABLE dive_sites
  ADD COLUMN IF NOT EXISTS submitted_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE dive_sites
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dive_sites_moderation_created_id
  ON dive_sites (moderation_state, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_sites_submitter_created_id
  ON dive_sites (submitted_by_app_user_id, created_at DESC, id DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_dive_sites_submitter_created_id;
DROP INDEX IF EXISTS idx_dive_sites_moderation_created_id;

ALTER TABLE dive_sites
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS moderation_reason,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS reviewed_by_app_user_id,
  DROP COLUMN IF EXISTS submitted_by_app_user_id;
-- +goose StatementEnd
