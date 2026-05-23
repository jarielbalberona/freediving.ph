-- +goose Up
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'free';

UPDATE events
SET payment_mode = CASE WHEN is_paid THEN 'required' ELSE 'free' END
WHERE payment_mode = 'free';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_payment_mode_check,
  ADD CONSTRAINT events_payment_mode_check
    CHECK (payment_mode IN ('free', 'required', 'optional'));

-- +goose Down
UPDATE events
SET is_paid = payment_mode = 'required';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_payment_mode_check,
  DROP COLUMN IF EXISTS payment_mode;
