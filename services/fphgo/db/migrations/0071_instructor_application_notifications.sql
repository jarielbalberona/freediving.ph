-- +goose Up
-- +goose StatementBegin
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INSTRUCTOR_APPLICATION_SUBMITTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INSTRUCTOR_APPLICATION_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INSTRUCTOR_APPLICATION_REJECTED';

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS instructor_application_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS instructor_status_notifications BOOLEAN NOT NULL DEFAULT TRUE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE notification_settings
  DROP COLUMN IF EXISTS instructor_status_notifications,
  DROP COLUMN IF EXISTS instructor_application_notifications;

-- notification_type enum values cannot be removed safely in PostgreSQL.
-- +goose StatementEnd
