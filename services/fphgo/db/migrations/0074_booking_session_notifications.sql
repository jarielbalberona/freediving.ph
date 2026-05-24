-- +goose Up
-- +goose StatementBegin
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BOOKING_CREATED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BOOKING_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BOOKING_REJECTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BOOKING_CANCELLED_BY_STUDENT';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BOOKING_CANCELLED_BY_SCHOOL';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BOOKING_RESCHEDULED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SESSION_UPDATED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SESSION_CANCELLED';

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS session_notifications BOOLEAN NOT NULL DEFAULT TRUE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE notification_settings
  DROP COLUMN IF EXISTS session_notifications;

-- notification_type enum values cannot be removed safely in PostgreSQL.
-- +goose StatementEnd
