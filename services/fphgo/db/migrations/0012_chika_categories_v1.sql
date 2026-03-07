-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS chika_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pseudonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO chika_categories (slug, name, pseudonymous)
VALUES
  ('general', 'General', FALSE),
  ('training', 'Training', FALSE),
  ('confessions', 'Confessions', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  pseudonymous = EXCLUDED.pseudonymous,
  updated_at = NOW();

ALTER TABLE chika_threads
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES chika_categories(id);

UPDATE chika_threads
SET category_id = c.id
FROM chika_categories c
WHERE c.slug = 'general' AND chika_threads.category_id IS NULL;

ALTER TABLE chika_threads
  ALTER COLUMN category_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chika_threads_category_created_at
  ON chika_threads (category_id, created_at DESC)
  WHERE deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_chika_threads_category_created_at;

ALTER TABLE chika_threads
  DROP COLUMN IF EXISTS category_id;

DROP TABLE IF EXISTS chika_categories;
-- +goose StatementEnd
