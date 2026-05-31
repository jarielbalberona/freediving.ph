-- +goose Up
CREATE TABLE IF NOT EXISTS journey_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  source_type TEXT,
  source_id TEXT,
  cover_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  state TEXT NOT NULL DEFAULT 'active',
  occurred_at TIMESTAMPTZ NOT NULL,
  hidden_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (type IN ('memory', 'map_milestone', 'badge', 'event', 'media', 'custom')),
  CHECK (visibility IN ('public', 'followers', 'private')),
  CHECK (state IN ('active', 'hidden', 'deleted')),
  CHECK (length(trim(title)) > 0),
  CHECK (
    (source_type IS NULL AND source_id IS NULL)
    OR (source_type IS NOT NULL AND source_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS journey_entry_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_entry_id UUID NOT NULL REFERENCES journey_entries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_objects(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (journey_entry_id, media_id),
  CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_entries_generated_source
  ON journey_entries (user_id, source_type, source_id, type)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journey_entries_user_cursor
  ON journey_entries (user_id, occurred_at DESC, id DESC)
  WHERE state = 'active';

CREATE INDEX IF NOT EXISTS idx_journey_entries_public_cursor
  ON journey_entries (user_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_journey_entries_visibility_cursor
  ON journey_entries (user_id, visibility, occurred_at DESC, id DESC)
  WHERE state = 'active';

CREATE INDEX IF NOT EXISTS idx_journey_entries_dive_site
  ON journey_entries (dive_site_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND dive_site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journey_entry_media_entry_sort
  ON journey_entry_media (journey_entry_id, sort_order ASC, id ASC);

-- +goose Down
DROP TABLE IF EXISTS journey_entry_media;
DROP TABLE IF EXISTS journey_entries;
