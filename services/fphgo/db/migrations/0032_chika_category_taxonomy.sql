-- +goose Up
-- +goose StatementBegin
INSERT INTO chika_categories (slug, name, pseudonymous)
VALUES
  ('general', 'General', FALSE),
  ('training', 'Training', FALSE),
  ('safety', 'Safety & Risk', FALSE),
  ('gear', 'Gear & Equipment', FALSE),
  ('dive-sites', 'Dive Sites', FALSE),
  ('events', 'Events & Meetups', FALSE),
  ('questions', 'Questions', FALSE),
  ('suggestions-recommendations', 'Suggestions & Recommendations', FALSE),
  ('groups', 'Groups', FALSE),
  ('confessions', 'Community Stories', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  pseudonymous = EXCLUDED.pseudonymous,
  updated_at = NOW();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE chika_categories
SET
  name = 'Confessions',
  pseudonymous = TRUE,
  updated_at = NOW()
WHERE slug = 'confessions';

DELETE FROM chika_categories
WHERE slug IN (
  'safety',
  'gear',
  'dive-sites',
  'events',
  'questions',
  'suggestions-recommendations',
  'groups'
)
AND NOT EXISTS (
  SELECT 1
  FROM chika_threads t
  WHERE t.category_id = chika_categories.id
);
-- +goose StatementEnd
