-- +goose Up
-- +goose StatementBegin
ALTER TABLE badge_templates
  DROP CONSTRAINT IF EXISTS badge_templates_category_check,
  ADD CONSTRAINT badge_templates_category_check CHECK (category IN ('personal_best', 'certification', 'community_role', 'experience', 'auto_stat'));

UPDATE badge_templates
SET category = 'experience'
WHERE slug IN ('safety-diver', 'competition-athlete', 'instructor', 'coach');

UPDATE badge_templates
SET category = 'community_role'
WHERE slug IN (
  'dive-guide',
  'underwater-photographer',
  'marine-conservation-volunteer',
  'spearfisher',
  'boat-captain',
  'rescue-team-member',
  'underwater-videographer'
);

INSERT INTO badge_templates (slug, name, category, value_type, unit, icon, description, is_system)
VALUES
  ('underwater-videographer', 'Underwater Videographer', 'community_role', 'none', NULL, 'video', NULL, FALSE)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  value_type = EXCLUDED.value_type,
  unit = EXCLUDED.unit,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM badge_templates
WHERE slug = 'underwater-videographer';

UPDATE badge_templates
SET category = 'experience'
WHERE slug IN ('safety-diver', 'competition-athlete', 'instructor', 'coach');

UPDATE badge_templates
SET category = 'community_role'
WHERE slug IN (
  'dive-guide',
  'underwater-photographer',
  'marine-conservation-volunteer',
  'spearfisher',
  'boat-captain',
  'rescue-team-member',
  'underwater-videographer'
);

ALTER TABLE badge_templates
  DROP CONSTRAINT IF EXISTS badge_templates_category_check,
  ADD CONSTRAINT badge_templates_category_check CHECK (category IN ('personal_best', 'certification', 'experience', 'auto_stat'));
-- +goose StatementEnd
