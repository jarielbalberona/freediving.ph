-- +goose Up
-- +goose StatementBegin
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS description_markdown TEXT,
  ADD COLUMN IF NOT EXISTS dive_site_id UUID REFERENCES dive_sites(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
  ADD COLUMN IF NOT EXISTS meeting_point TEXT,
  ADD COLUMN IF NOT EXISTS beginner_friendly BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_depth_m INTEGER,
  ADD COLUMN IF NOT EXISTS entry_type TEXT,
  ADD COLUMN IF NOT EXISTS equipment_notes TEXT,
  ADD COLUMN IF NOT EXISTS safety_notes TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

UPDATE events
SET short_description = COALESCE(short_description, description)
WHERE short_description IS NULL AND description IS NOT NULL;

UPDATE events
SET description_markdown = COALESCE(description_markdown, description)
WHERE description_markdown IS NULL AND description IS NOT NULL;

UPDATE events
SET capacity = COALESCE(capacity, max_attendees)
WHERE capacity IS NULL AND max_attendees IS NOT NULL;

UPDATE events
SET visibility = 'private'
WHERE visibility IN ('group_members', 'invite_only');

UPDATE events
SET event_type = CASE event_type
  WHEN 'training' THEN 'pool_training'
  WHEN 'meetup' THEN 'fun_dive'
  WHEN 'trip' THEN 'trip_retreat'
  WHEN 'DIVE_SESSION' THEN 'fun_dive'
  WHEN 'TRAINING' THEN 'pool_training'
  WHEN 'COMPETITION' THEN 'competition'
  WHEN 'SOCIAL' THEN 'fun_dive'
  WHEN 'WORKSHOP' THEN 'workshop'
  WHEN 'MEETUP' THEN 'fun_dive'
  WHEN 'TOURNAMENT' THEN 'competition'
  WHEN 'FUNDRAISER' THEN 'cleanup_dive'
  ELSE event_type
END;

UPDATE events
SET event_type = 'fun_dive'
WHERE event_type NOT IN (
  'intro_session',
  'pool_training',
  'line_training',
  'fun_dive',
  'depth_training',
  'certification_course',
  'workshop',
  'competition',
  'cleanup_dive',
  'trip_retreat'
);

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_visibility_check,
  DROP CONSTRAINT IF EXISTS events_event_type_check,
  DROP CONSTRAINT IF EXISTS events_entry_type_check,
  DROP CONSTRAINT IF EXISTS events_capacity_check,
  DROP CONSTRAINT IF EXISTS events_price_check,
  DROP CONSTRAINT IF EXISTS events_max_depth_m_check;

ALTER TABLE events
  ADD CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'private')),
  ADD CONSTRAINT events_event_type_check CHECK (event_type IN (
    'intro_session',
    'pool_training',
    'line_training',
    'fun_dive',
    'depth_training',
    'certification_course',
    'workshop',
    'competition',
    'cleanup_dive',
    'trip_retreat'
  )),
  ADD CONSTRAINT events_entry_type_check CHECK (
    entry_type IS NULL OR entry_type IN ('shore', 'boat', 'pool', 'classroom_online')
  ),
  ADD CONSTRAINT events_capacity_check CHECK (capacity IS NULL OR capacity > 0),
  ADD CONSTRAINT events_price_check CHECK (
    (is_paid = FALSE AND price_amount IS NULL)
    OR (is_paid = TRUE AND price_amount IS NOT NULL AND price_amount >= 0)
  ),
  ADD CONSTRAINT events_max_depth_m_check CHECK (max_depth_m IS NULL OR max_depth_m >= 0);

ALTER TABLE event_memberships
  DROP CONSTRAINT IF EXISTS event_memberships_status_check;

ALTER TABLE event_memberships
  ADD CONSTRAINT event_memberships_status_check CHECK (
    status IN ('active', 'invited', 'left', 'cancelled', 'blocked')
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique
  ON events (slug)
  WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_dive_site_id ON events (dive_site_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_visibility_status_starts_v2 ON events (visibility, status, starts_at DESC);

CREATE TABLE IF NOT EXISTS event_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant',
  status TEXT NOT NULL DEFAULT 'pending_approval',
  participant_note TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE (event_id, user_id),
  CHECK (role IN ('participant', 'staff', 'organizer')),
  CHECK (status IN (
    'pending_approval',
    'confirmed',
    'rejected',
    'cancelled',
    'left',
    'attended',
    'no_show'
  ))
);

CREATE INDEX IF NOT EXISTS idx_event_participations_event_status
  ON event_participations (event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_participations_user
  ON event_participations (user_id, status);

INSERT INTO event_participations (
  event_id,
  user_id,
  role,
  status,
  participant_note,
  created_at,
  updated_at,
  approved_at,
  approved_by
)
SELECT
  em.event_id,
  em.user_id,
  CASE em.role WHEN 'organizer' THEN 'organizer' WHEN 'staff' THEN 'staff' ELSE 'participant' END,
  CASE
    WHEN em.status = 'active' THEN 'confirmed'
    WHEN em.status = 'invited' THEN 'pending_approval'
    WHEN em.status = 'left' THEN 'left'
    WHEN em.status = 'cancelled' THEN 'cancelled'
    ELSE 'rejected'
  END,
  em.notes,
  em.created_at,
  em.updated_at,
  CASE WHEN em.status = 'active' THEN COALESCE(em.joined_at, em.created_at) ELSE NULL END,
  CASE WHEN em.status = 'active' THEN em.invited_by ELSE NULL END
FROM event_memberships em
ON CONFLICT (event_id, user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS event_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT,
  qr_image_url TEXT,
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (type IN ('MANUAL_QR', 'MANUAL_BANK_TRANSFER')),
  CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_event_payment_methods_event
  ON event_payment_methods (event_id, is_active);

CREATE TABLE IF NOT EXISTS event_participant_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_participation_id UUID NOT NULL REFERENCES event_participations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES event_payment_methods(id) ON DELETE SET NULL,
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'PHP',
  proof_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  proof_attachment_url TEXT,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending_upload',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_participation_id),
  CHECK (status IN ('not_required', 'pending_upload', 'submitted', 'verified', 'rejected')),
  CHECK (amount IS NULL OR amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_event_participant_payments_event_status
  ON event_participant_payments (event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_participant_payments_user
  ON event_participant_payments (user_id, status);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_event_participant_payments_user;
DROP INDEX IF EXISTS idx_event_participant_payments_event_status;
DROP TABLE IF EXISTS event_participant_payments;

DROP INDEX IF EXISTS idx_event_payment_methods_event;
DROP TABLE IF EXISTS event_payment_methods;

DROP INDEX IF EXISTS idx_event_participations_user;
DROP INDEX IF EXISTS idx_event_participations_event_status;
DROP TABLE IF EXISTS event_participations;

DROP INDEX IF EXISTS idx_events_visibility_status_starts_v2;
DROP INDEX IF EXISTS idx_events_event_type;
DROP INDEX IF EXISTS idx_events_dive_site_id;
DROP INDEX IF EXISTS idx_events_slug_unique;

ALTER TABLE event_memberships
  DROP CONSTRAINT IF EXISTS event_memberships_status_check;

ALTER TABLE event_memberships
  ADD CONSTRAINT event_memberships_status_check CHECK (status IN ('active', 'invited', 'blocked'));

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_visibility_check,
  DROP CONSTRAINT IF EXISTS events_event_type_check,
  DROP CONSTRAINT IF EXISTS events_entry_type_check,
  DROP CONSTRAINT IF EXISTS events_capacity_check,
  DROP CONSTRAINT IF EXISTS events_price_check,
  DROP CONSTRAINT IF EXISTS events_max_depth_m_check;

UPDATE events
SET visibility = 'public'
WHERE visibility = 'private';

ALTER TABLE events
  ADD CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'group_members', 'invite_only'));

ALTER TABLE events
  DROP COLUMN IF EXISTS cancel_reason,
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS cancellation_policy,
  DROP COLUMN IF EXISTS safety_notes,
  DROP COLUMN IF EXISTS equipment_notes,
  DROP COLUMN IF EXISTS entry_type,
  DROP COLUMN IF EXISTS max_depth_m,
  DROP COLUMN IF EXISTS beginner_friendly,
  DROP COLUMN IF EXISTS meeting_point,
  DROP COLUMN IF EXISTS payment_instructions,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS price_amount,
  DROP COLUMN IF EXISTS is_paid,
  DROP COLUMN IF EXISTS requires_approval,
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS dive_site_id,
  DROP COLUMN IF EXISTS description_markdown,
  DROP COLUMN IF EXISTS short_description,
  DROP COLUMN IF EXISTS slug;
-- +goose StatementEnd
