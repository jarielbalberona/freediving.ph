-- +goose Up
-- +goose StatementBegin
ALTER TABLE event_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'general';

ALTER TABLE event_posts
  DROP CONSTRAINT IF EXISTS event_posts_post_type_check;
ALTER TABLE event_posts
  ADD CONSTRAINT event_posts_post_type_check
    CHECK (post_type IN ('announcement', 'schedule', 'logistics', 'payment', 'competition', 'results', 'general'));

CREATE TABLE IF NOT EXISTS event_update_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_update_id UUID NOT NULL REFERENCES event_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'fish',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reaction_type = 'fish'),
  UNIQUE (event_update_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_event_update_reactions_update
  ON event_update_reactions (event_update_id);
CREATE INDEX IF NOT EXISTS idx_event_update_reactions_user
  ON event_update_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_event_update_reactions_update_type
  ON event_update_reactions (event_update_id, reaction_type);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_event_update_reactions_update_type;
DROP INDEX IF EXISTS idx_event_update_reactions_user;
DROP INDEX IF EXISTS idx_event_update_reactions_update;
DROP TABLE IF EXISTS event_update_reactions;

ALTER TABLE event_posts
  DROP CONSTRAINT IF EXISTS event_posts_post_type_check;
ALTER TABLE event_posts
  DROP COLUMN IF EXISTS post_type;
-- +goose StatementEnd
