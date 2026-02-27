-- +goose Up
-- +goose StatementBegin
ALTER TABLE chika_threads
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chika_threads_mode_check'
  ) THEN
    ALTER TABLE chika_threads
      ADD CONSTRAINT chika_threads_mode_check CHECK (mode IN ('normal', 'pseudonymous'));
  END IF;
END$$;

ALTER TABLE chika_posts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS chika_comments (
  id BIGSERIAL PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES chika_threads(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chika_thread_reactions (
  thread_id UUID NOT NULL REFERENCES chika_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id),
  CHECK (reaction_type IN ('upvote', 'downvote'))
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (entity_type IN ('thread', 'post', 'comment'))
);

CREATE INDEX IF NOT EXISTS idx_chika_threads_created_at ON chika_threads (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_posts_thread_created_at ON chika_posts (thread_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_comments_thread_created_at ON chika_comments (thread_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON media_assets (entity_type, entity_id, created_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_media_assets_entity;
DROP INDEX IF EXISTS idx_chika_comments_thread_created_at;
DROP INDEX IF EXISTS idx_chika_posts_thread_created_at;
DROP INDEX IF EXISTS idx_chika_threads_created_at;

DROP TABLE IF EXISTS media_assets;
DROP TABLE IF EXISTS chika_thread_reactions;
DROP TABLE IF EXISTS chika_comments;

ALTER TABLE chika_posts
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE chika_threads DROP CONSTRAINT IF EXISTS chika_threads_mode_check;
ALTER TABLE chika_threads
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS created_by_user_id,
  DROP COLUMN IF EXISTS mode;
-- +goose StatementEnd
