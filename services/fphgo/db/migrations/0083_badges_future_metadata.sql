-- +goose Up
-- +goose StatementBegin
ALTER TABLE badge_templates
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_module TEXT NOT NULL DEFAULT 'profile',
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE badge_templates
  DROP CONSTRAINT IF EXISTS badge_templates_rarity_check,
  ADD CONSTRAINT badge_templates_rarity_check CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  DROP CONSTRAINT IF EXISTS badge_templates_source_module_check,
  ADD CONSTRAINT badge_templates_source_module_check CHECK (source_module IN ('profile', 'dive_map', 'courses', 'events', 'schools', 'system', 'admin')),
  DROP CONSTRAINT IF EXISTS badge_templates_metadata_json_check,
  ADD CONSTRAINT badge_templates_metadata_json_check CHECK (jsonb_typeof(metadata_json) = 'object');

UPDATE badge_templates
SET
  description = CASE
    WHEN slug = 'dive-sites-visited' THEN 'Distinct approved dive sites from user_dive_sites. Transitional fallback counts user-owned media posts tagged to dive sites only.'
    ELSE description
  END,
  source_module = CASE WHEN category = 'auto_stat' THEN 'system' ELSE 'profile' END,
  display_order = CASE slug
    WHEN 'pb-static-apnea' THEN 10
    WHEN 'pb-dynamic-no-fins' THEN 20
    WHEN 'pb-dynamic-bi-fins' THEN 30
    WHEN 'pb-dynamic-monofin' THEN 40
    WHEN 'pb-constant-weight' THEN 50
    WHEN 'pb-constant-weight-bi-fins' THEN 60
    WHEN 'pb-constant-weight-no-fins' THEN 70
    WHEN 'pb-free-immersion' THEN 80
    WHEN 'dive-sites-visited' THEN 1000
    ELSE display_order
  END,
  updated_at = NOW();

ALTER TABLE user_badges
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_badges
  DROP CONSTRAINT IF EXISTS user_badges_source_type_check,
  ADD CONSTRAINT user_badges_source_type_check CHECK (source_type IN ('manual', 'profile', 'dive_map', 'course', 'event', 'school', 'system', 'admin')),
  DROP CONSTRAINT IF EXISTS user_badges_visibility_check,
  ADD CONSTRAINT user_badges_visibility_check CHECK (visibility IN ('public', 'private')),
  DROP CONSTRAINT IF EXISTS user_badges_metadata_json_check,
  ADD CONSTRAINT user_badges_metadata_json_check CHECK (jsonb_typeof(metadata_json) = 'object');

UPDATE user_badges
SET earned_at = COALESCE(earned_at, created_at)
WHERE earned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_badges_user_visibility_order
  ON user_badges (user_id, visibility, display_order, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_badges_source
  ON user_badges (source_type, source_id)
  WHERE source_id IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_badges_source;
DROP INDEX IF EXISTS idx_user_badges_user_visibility_order;

ALTER TABLE user_badges
  DROP CONSTRAINT IF EXISTS user_badges_metadata_json_check,
  DROP CONSTRAINT IF EXISTS user_badges_visibility_check,
  DROP CONSTRAINT IF EXISTS user_badges_source_type_check,
  DROP COLUMN IF EXISTS metadata_json,
  DROP COLUMN IF EXISTS display_order,
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS earned_at,
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS source_type;

ALTER TABLE badge_templates
  DROP CONSTRAINT IF EXISTS badge_templates_metadata_json_check,
  DROP CONSTRAINT IF EXISTS badge_templates_source_module_check,
  DROP CONSTRAINT IF EXISTS badge_templates_rarity_check,
  DROP COLUMN IF EXISTS metadata_json,
  DROP COLUMN IF EXISTS source_module,
  DROP COLUMN IF EXISTS is_repeatable,
  DROP COLUMN IF EXISTS is_public,
  DROP COLUMN IF EXISTS rarity,
  DROP COLUMN IF EXISTS display_order;
-- +goose StatementEnd
