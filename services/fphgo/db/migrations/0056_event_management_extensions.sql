-- +goose Up
-- +goose StatementBegin
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS posts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS post_create_policy TEXT NOT NULL DEFAULT 'organizers_only';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_post_create_policy_check;

ALTER TABLE events
  ADD CONSTRAINT events_post_create_policy_check CHECK (
    post_create_policy IN ('organizers_only', 'participants')
  );

CREATE TABLE IF NOT EXISTS event_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description_markdown TEXT,
  rules_markdown TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_event_competitions_event_sort
  ON event_competitions (event_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS event_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT,
  description TEXT,
  logo_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  website_url TEXT,
  social_url TEXT,
  contact_name TEXT,
  contact_email TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(name)) > 0),
  CHECK (tier IS NULL OR tier IN (
    'presenting',
    'major',
    'minor',
    'partner',
    'community',
    'media',
    'other'
  ))
);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event_sort
  ON event_sponsors (event_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS event_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES event_competitions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description_markdown TEXT,
  placement TEXT NOT NULL DEFAULT 'custom',
  placement_label TEXT,
  prize_type TEXT,
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'PHP',
  sponsor_id UUID REFERENCES event_sponsors(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(title)) > 0),
  CHECK (placement IN (
    'winner',
    'champion',
    'first_place',
    'second_place',
    'third_place',
    'special_award',
    'sponsor_award',
    'custom'
  )),
  CHECK (prize_type IS NULL OR prize_type IN (
    'cash',
    'item',
    'certificate',
    'sponsor_gift',
    'other'
  )),
  CHECK (amount IS NULL OR amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_event_prizes_event_sort
  ON event_prizes (event_id, sort_order)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_prizes_competition
  ON event_prizes (competition_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS event_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  body_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  parent_post_id UUID REFERENCES event_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(body_markdown)) > 0),
  CHECK (status IN ('published', 'hidden', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_event_posts_event_created
  ON event_posts (event_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_posts_event_pinned_created
  ON event_posts (event_id, is_pinned DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_participations_event_role_status
  ON event_participations (event_id, role, status);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_event_participations_event_role_status;
DROP INDEX IF EXISTS idx_event_posts_event_pinned_created;
DROP INDEX IF EXISTS idx_event_posts_event_created;
DROP TABLE IF EXISTS event_posts;

DROP INDEX IF EXISTS idx_event_prizes_competition;
DROP INDEX IF EXISTS idx_event_prizes_event_sort;
DROP TABLE IF EXISTS event_prizes;

DROP INDEX IF EXISTS idx_event_sponsors_event_sort;
DROP TABLE IF EXISTS event_sponsors;

DROP INDEX IF EXISTS idx_event_competitions_event_sort;
DROP TABLE IF EXISTS event_competitions;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_post_create_policy_check,
  DROP COLUMN IF EXISTS post_create_policy,
  DROP COLUMN IF EXISTS posts_enabled;
-- +goose StatementEnd
