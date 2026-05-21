-- +goose Up
-- +goose NO TRANSACTION
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NEW_DIVE_SITE_PUBLISHED';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS new_dive_site_published BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_status_category_created
  ON notifications (user_id, status, category, created_at DESC, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_idempotency_key
  ON notifications (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_notifications_user_idempotency_key;
DROP INDEX IF EXISTS idx_notifications_user_status_category_created;

ALTER TABLE notification_settings
  DROP COLUMN IF EXISTS new_dive_site_published;

ALTER TABLE notifications
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS seen_at,
  DROP COLUMN IF EXISTS actor_user_id,
  DROP COLUMN IF EXISTS category;
-- notification_type enum values cannot be removed safely in PostgreSQL.
