-- +goose Up
-- +goose StatementBegin
ALTER TABLE event_participations
  ADD COLUMN IF NOT EXISTS qr_token TEXT,
  ADD COLUMN IF NOT EXISTS qr_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qr_revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL;

INSERT INTO event_participations (
  event_id,
  user_id,
  role,
  status,
  approved_at,
  approved_by
)
SELECT
  e.id,
  e.organizer_user_id,
  'organizer',
  'confirmed',
  NOW(),
  e.organizer_user_id
FROM events e
WHERE e.organizer_user_id IS NOT NULL
ON CONFLICT (event_id, user_id)
DO UPDATE SET
  role = 'organizer',
  status = 'confirmed',
  approved_at = COALESCE(event_participations.approved_at, NOW()),
  approved_by = EXCLUDED.approved_by,
  updated_at = NOW();

UPDATE event_participations
SET
  qr_token = replace(replace(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '/', '_'), '+', '-'),
  qr_issued_at = COALESCE(qr_issued_at, created_at, NOW()),
  qr_revoked_at = NULL
WHERE qr_token IS NULL;

INSERT INTO event_participant_payments (
  event_id,
  event_participation_id,
  user_id,
  status
)
SELECT
  ep.event_id,
  ep.id,
  ep.user_id,
  CASE WHEN e.is_paid THEN 'pending_upload' ELSE 'not_required' END
FROM event_participations ep
JOIN events e ON e.id = ep.event_id
WHERE NOT EXISTS (
  SELECT 1
  FROM event_participant_payments pay
  WHERE pay.event_participation_id = ep.id
);

ALTER TABLE event_participations
  ALTER COLUMN qr_token SET NOT NULL,
  ALTER COLUMN qr_token SET DEFAULT replace(replace(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '/', '_'), '+', '-'),
  ALTER COLUMN qr_issued_at SET NOT NULL,
  ALTER COLUMN qr_issued_at SET DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participations_qr_token_unique
  ON event_participations (qr_token);
CREATE INDEX IF NOT EXISTS idx_event_participations_event_qr_token
  ON event_participations (event_id, qr_token)
  WHERE qr_revoked_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_event_participations_event_qr_token;
DROP INDEX IF EXISTS idx_event_participations_qr_token_unique;

ALTER TABLE event_participations
  DROP COLUMN IF EXISTS checked_in_by,
  DROP COLUMN IF EXISTS checked_in_at,
  DROP COLUMN IF EXISTS qr_revoked_at,
  DROP COLUMN IF EXISTS qr_issued_at,
  DROP COLUMN IF EXISTS qr_token;
-- +goose StatementEnd
