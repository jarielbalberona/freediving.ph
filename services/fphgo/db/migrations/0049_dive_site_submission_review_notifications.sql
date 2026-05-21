-- +goose Up
-- +goose NO TRANSACTION
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DIVE_SITE_SUBMITTED_FOR_REVIEW';

-- +goose Down
-- notification_type enum values cannot be removed safely in PostgreSQL.
