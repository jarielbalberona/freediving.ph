-- +goose Up
-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'SYSTEM',
      'MESSAGE',
      'EVENT',
      'GROUP',
      'SERVICE',
      'BOOKING',
      'REVIEW',
      'MENTION',
      'LIKE',
      'COMMENT',
      'FRIEND_REQUEST',
      'GROUP_INVITE',
      'EVENT_REMINDER',
      'PAYMENT',
      'SECURITY'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
    CREATE TYPE notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE notification_status AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'DELETED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_digest_frequency') THEN
    CREATE TYPE notification_digest_frequency AS ENUM ('IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'UNREAD',
  priority notification_priority NOT NULL DEFAULT 'NORMAL',
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  image_url TEXT,
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  is_push_sent BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  push_sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  system_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  message_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  event_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  group_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  service_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  booking_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  review_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  mention_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  like_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  comment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  friend_request_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  group_invite_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  event_reminder_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  payment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  security_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  digest_frequency notification_digest_frequency NOT NULL DEFAULT 'IMMEDIATE',
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created
  ON notifications (user_id, status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON notifications (user_id, type, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_priority_created
  ON notifications (user_id, priority, created_at DESC, id DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_notifications_user_priority_created;
DROP INDEX IF EXISTS idx_notifications_user_type_created;
DROP INDEX IF EXISTS idx_notifications_user_status_created;
DROP INDEX IF EXISTS idx_notifications_user_created;

DROP TABLE IF EXISTS notification_settings;
DROP TABLE IF EXISTS notifications;

DROP TYPE IF EXISTS notification_digest_frequency;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS notification_priority;
DROP TYPE IF EXISTS notification_type;
-- +goose StatementEnd
