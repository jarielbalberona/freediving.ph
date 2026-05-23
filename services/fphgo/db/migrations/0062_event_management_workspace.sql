-- +goose Up
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_status_check,
  ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'published', 'full', 'cancelled', 'completed', 'archived'));

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS awards_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sponsors_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS interested_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE events
SET payment_enabled = TRUE
WHERE payment_mode <> 'free' OR is_paid = TRUE;

CREATE TABLE IF NOT EXISTS event_join_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, field_key),
  CHECK (field_type IN ('short_text', 'long_text', 'select', 'checkbox', 'phone', 'email')),
  CHECK (length(trim(field_key)) > 0),
  CHECK (length(trim(label)) > 0)
);

ALTER TABLE event_participations
  ADD COLUMN IF NOT EXISTS join_answers_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_event_join_form_fields_event_sort
  ON event_join_form_fields (event_id, enabled, sort_order, created_at);

-- +goose Down
DROP INDEX IF EXISTS idx_event_join_form_fields_event_sort;

ALTER TABLE event_participations
  DROP COLUMN IF EXISTS join_answers_json;

DROP TABLE IF EXISTS event_join_form_fields;

ALTER TABLE events
  DROP COLUMN IF EXISTS interested_enabled,
  DROP COLUMN IF EXISTS sponsors_enabled,
  DROP COLUMN IF EXISTS awards_enabled,
  DROP COLUMN IF EXISTS payment_enabled;

UPDATE events
SET status = 'published'
WHERE status = 'full';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_status_check,
  ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed', 'archived'));
