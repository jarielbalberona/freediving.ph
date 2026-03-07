-- +goose Up
-- +goose StatementBegin
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS join_policy TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS member_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE groups
SET slug = COALESCE(NULLIF(trim(slug), ''), CONCAT('group-', SUBSTRING(id::text FROM 1 FOR 8)))
WHERE slug IS NULL OR trim(slug) = '';

ALTER TABLE groups
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_visibility_check'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_visibility_check
      CHECK (visibility IN ('public', 'private', 'invite_only'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_status_check'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_status_check
      CHECK (status IN ('active', 'archived', 'deleted'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_join_policy_check'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_join_policy_check
      CHECK (join_policy IN ('open', 'approval', 'invite_only'));
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_slug ON groups (slug);
CREATE INDEX IF NOT EXISTS idx_groups_visibility_status_created ON groups (visibility, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups (created_by);

ALTER TABLE group_memberships
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE group_memberships
SET joined_at = COALESCE(joined_at, created_at)
WHERE status = 'active';

CREATE TABLE IF NOT EXISTS group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  like_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(content)) > 0),
  CHECK (status IN ('active', 'hidden', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_group_posts_group_created ON group_posts (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_author ON group_posts (author_user_id, created_at DESC);

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'meetup',
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS max_attendees INTEGER,
  ADD COLUMN IF NOT EXISTS current_attendees INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organizer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_status_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_status_check
      CHECK (status IN ('draft', 'published', 'cancelled', 'completed'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_visibility_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_visibility_check
      CHECK (visibility IN ('public', 'group_members', 'invite_only'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_difficulty_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_difficulty_check
      CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_time_range_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_time_range_check
      CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_events_status_starts ON events (status, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_visibility_status_starts ON events (visibility, status, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events (group_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_user_id ON events (organizer_user_id);

ALTER TABLE event_memberships
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE event_memberships
SET joined_at = COALESCE(joined_at, created_at)
WHERE status = 'active';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE event_memberships
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS left_at,
  DROP COLUMN IF EXISTS joined_at,
  DROP COLUMN IF EXISTS invited_by;

DROP INDEX IF EXISTS idx_events_organizer_user_id;
DROP INDEX IF EXISTS idx_events_group_id;
DROP INDEX IF EXISTS idx_events_visibility_status_starts;
DROP INDEX IF EXISTS idx_events_status_starts;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_time_range_check,
  DROP CONSTRAINT IF EXISTS events_difficulty_check,
  DROP CONSTRAINT IF EXISTS events_visibility_check,
  DROP CONSTRAINT IF EXISTS events_status_check,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS group_id,
  DROP COLUMN IF EXISTS organizer_user_id,
  DROP COLUMN IF EXISTS current_attendees,
  DROP COLUMN IF EXISTS max_attendees,
  DROP COLUMN IF EXISTS difficulty,
  DROP COLUMN IF EXISTS event_type,
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS ends_at,
  DROP COLUMN IF EXISTS starts_at,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS description;

DROP INDEX IF EXISTS idx_group_posts_author;
DROP INDEX IF EXISTS idx_group_posts_group_created;
DROP TABLE IF EXISTS group_posts;

ALTER TABLE group_memberships
  DROP COLUMN IF EXISTS muted,
  DROP COLUMN IF EXISTS left_at,
  DROP COLUMN IF EXISTS joined_at,
  DROP COLUMN IF EXISTS invited_by;

DROP INDEX IF EXISTS idx_groups_created_by;
DROP INDEX IF EXISTS idx_groups_visibility_status_created;
DROP INDEX IF EXISTS idx_groups_slug;

ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS groups_join_policy_check,
  DROP CONSTRAINT IF EXISTS groups_status_check,
  DROP CONSTRAINT IF EXISTS groups_visibility_check,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS post_count,
  DROP COLUMN IF EXISTS event_count,
  DROP COLUMN IF EXISTS member_count,
  DROP COLUMN IF EXISTS lng,
  DROP COLUMN IF EXISTS lat,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS join_policy,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS slug;
-- +goose StatementEnd
