-- +goose Up
-- +goose StatementBegin
UPDATE badge_templates
SET category = 'experience'
WHERE slug IN (
  'dive-guide',
  'underwater-photographer',
  'marine-conservation-volunteer',
  'spearfisher',
  'boat-captain',
  'rescue-team-member',
  'underwater-videographer'
);

UPDATE badge_templates
SET category = 'community_role'
WHERE slug IN ('safety-diver', 'competition-athlete', 'instructor', 'coach');

UPDATE badge_templates
SET category = 'auto_stat',
    is_system = TRUE
WHERE slug = 'dive-sites-visited';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
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

UPDATE badge_templates
SET category = 'experience'
WHERE slug IN ('safety-diver', 'competition-athlete', 'instructor', 'coach');
-- +goose StatementEnd
