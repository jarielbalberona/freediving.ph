-- +goose Up
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS program_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS event_program_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_markdown TEXT,
  program_date DATE,
  start_time TIME,
  end_time TIME,
  timezone TEXT,
  location_label TEXT,
  competition_id UUID REFERENCES event_competitions(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(title)) > 0),
  CHECK (start_time IS NULL OR program_date IS NOT NULL),
  CHECK (end_time IS NULL OR start_time IS NOT NULL),
  CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_event_program_items_event_sort
  ON event_program_items (event_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_program_items_event_time
  ON event_program_items (event_id, program_date, start_time)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_program_items_competition
  ON event_program_items (competition_id)
  WHERE deleted_at IS NULL AND competition_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_event_program_items_competition;
DROP INDEX IF EXISTS idx_event_program_items_event_time;
DROP INDEX IF EXISTS idx_event_program_items_event_sort;

DROP TABLE IF EXISTS event_program_items;

ALTER TABLE events
  DROP COLUMN IF EXISTS program_enabled;
