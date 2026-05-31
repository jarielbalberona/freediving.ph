-- +goose Up
CREATE TABLE IF NOT EXISTS dive_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private',
  occurred_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (visibility IN ('public', 'followers', 'tagged', 'private')),
  CHECK (length(trim(title)) > 0)
);

CREATE TABLE IF NOT EXISTS dive_memory_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES dive_memories(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_objects(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (memory_id, media_id),
  CHECK (sort_order >= 0)
);

CREATE TABLE IF NOT EXISTS dive_memory_tagged_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES dive_memories(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (memory_id, tagged_user_id),
  CHECK (status IN ('pending', 'accepted', 'declined', 'hidden'))
);

CREATE INDEX IF NOT EXISTS idx_dive_memories_author_site_created
  ON dive_memories (author_user_id, dive_site_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dive_memories_site_visibility_created
  ON dive_memories (dive_site_id, visibility, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dive_memories_deleted_at
  ON dive_memories (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dive_memory_media_memory_sort
  ON dive_memory_media (memory_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_dive_memory_media_media_id
  ON dive_memory_media (media_id);

CREATE INDEX IF NOT EXISTS idx_dive_memory_tagged_users_tagged_status
  ON dive_memory_tagged_users (tagged_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dive_memory_tagged_users_memory_status
  ON dive_memory_tagged_users (memory_id, status, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS dive_memory_tagged_users;
DROP TABLE IF EXISTS dive_memory_media;
DROP TABLE IF EXISTS dive_memories;
