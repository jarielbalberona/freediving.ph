-- +goose Up
-- +goose StatementBegin
UPDATE events
SET timezone = 'Asia/Manila'
WHERE timezone IS NULL OR btrim(timezone) = '' OR timezone <> 'Asia/Manila';

UPDATE events
SET currency = 'PHP'
WHERE currency IS NULL OR btrim(currency) = '' OR upper(currency) <> 'PHP';

UPDATE event_program_items
SET timezone = 'Asia/Manila'
WHERE timezone IS NULL OR btrim(timezone) = '' OR timezone <> 'Asia/Manila';

ALTER TABLE event_program_items
  ALTER COLUMN timezone SET DEFAULT 'Asia/Manila';

UPDATE event_prizes
SET currency = 'PHP'
WHERE currency IS NULL OR btrim(currency) = '' OR upper(currency) <> 'PHP';

UPDATE event_participant_payments
SET currency = 'PHP'
WHERE currency IS NULL OR btrim(currency) = '' OR upper(currency) <> 'PHP';

UPDATE courses
SET currency = 'PHP'
WHERE currency IS NULL OR btrim(currency) = '' OR upper(currency) <> 'PHP';

UPDATE course_sessions
SET timezone = 'Asia/Manila'
WHERE timezone IS NULL OR btrim(timezone) = '' OR timezone <> 'Asia/Manila';

UPDATE course_booking_payments
SET currency = 'PHP'
WHERE currency IS NULL OR btrim(currency) = '' OR upper(currency) <> 'PHP';

UPDATE notification_settings
SET timezone = 'Asia/Manila'
WHERE timezone IS NULL OR btrim(timezone) = '' OR timezone <> 'Asia/Manila';

ALTER TABLE notification_settings
  ALTER COLUMN timezone SET DEFAULT 'Asia/Manila';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE notification_settings
  ALTER COLUMN timezone SET DEFAULT 'UTC';

ALTER TABLE event_program_items
  ALTER COLUMN timezone DROP DEFAULT;
-- +goose StatementEnd
