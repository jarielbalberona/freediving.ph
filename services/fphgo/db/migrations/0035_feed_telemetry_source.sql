-- +goose Up
-- +goose StatementBegin
ALTER TABLE feed_impressions
  ADD COLUMN IF NOT EXISTS feed_source TEXT NOT NULL DEFAULT 'home';

ALTER TABLE feed_actions
  ADD COLUMN IF NOT EXISTS feed_source TEXT NOT NULL DEFAULT 'home';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feed_impressions_feed_source_check'
  ) THEN
    ALTER TABLE feed_impressions
      ADD CONSTRAINT feed_impressions_feed_source_check
      CHECK (feed_source IN ('home', 'activity'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feed_actions_feed_source_check'
  ) THEN
    ALTER TABLE feed_actions
      ADD CONSTRAINT feed_actions_feed_source_check
      CHECK (feed_source IN ('home', 'activity'));
  END IF;
END $$;

DROP INDEX IF EXISTS idx_feed_impressions_dedupe;
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_impressions_dedupe
  ON feed_impressions (user_id, session_id, feed_source, feed_item_id, position);

CREATE INDEX IF NOT EXISTS idx_feed_impressions_source_seen_at
  ON feed_impressions (feed_source, seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_actions_source_created_at
  ON feed_actions (feed_source, created_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_feed_actions_source_created_at;
DROP INDEX IF EXISTS idx_feed_impressions_source_seen_at;

DROP INDEX IF EXISTS idx_feed_impressions_dedupe;
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_impressions_dedupe
  ON feed_impressions (user_id, session_id, feed_item_id, position);

ALTER TABLE feed_actions
  DROP CONSTRAINT IF EXISTS feed_actions_feed_source_check,
  DROP COLUMN IF EXISTS feed_source;

ALTER TABLE feed_impressions
  DROP CONSTRAINT IF EXISTS feed_impressions_feed_source_check,
  DROP COLUMN IF EXISTS feed_source;
-- +goose StatementEnd
