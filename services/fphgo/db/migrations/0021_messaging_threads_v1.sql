-- +goose Up
-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_thread_type') THEN
    CREATE TYPE message_thread_type AS ENUM ('direct');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_inbox_category') THEN
    CREATE TYPE message_inbox_category AS ENUM ('primary', 'general', 'requests');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_kind') THEN
    CREATE TYPE message_kind AS ENUM ('text', 'system');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type message_thread_type NOT NULL DEFAULT 'direct',
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direct_user_low UUID REFERENCES users(id) ON DELETE CASCADE,
  direct_user_high UUID REFERENCES users(id) ON DELETE CASCADE,
  CHECK (
    (type = 'direct' AND direct_user_low IS NOT NULL AND direct_user_high IS NOT NULL AND direct_user_low < direct_user_high)
  )
);

CREATE TABLE IF NOT EXISTS message_thread_members (
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  inbox_category message_inbox_category NOT NULL DEFAULT 'primary',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_message_id BIGINT,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS thread_messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT,
  kind message_kind NOT NULL DEFAULT 'text',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

ALTER TABLE message_thread_members
  ADD CONSTRAINT fk_message_thread_members_last_read_message
  FOREIGN KEY (last_read_message_id)
  REFERENCES thread_messages(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_direct_pair
  ON message_threads (type, direct_user_low, direct_user_high);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at
  ON message_threads (last_message_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_message_thread_members_user_inbox
  ON message_thread_members (user_id, inbox_category, is_archived, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_thread_members_thread_user
  ON message_thread_members (thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created
  ON thread_messages (thread_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_thread_messages_client_id
  ON thread_messages (thread_id, sender_user_id, client_id)
  WHERE client_id IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_thread_messages_client_id;
DROP INDEX IF EXISTS idx_thread_messages_thread_created;
DROP INDEX IF EXISTS idx_message_thread_members_thread_user;
DROP INDEX IF EXISTS idx_message_thread_members_user_inbox;
DROP INDEX IF EXISTS idx_message_threads_last_message_at;
DROP INDEX IF EXISTS idx_message_threads_direct_pair;
ALTER TABLE message_thread_members DROP CONSTRAINT IF EXISTS fk_message_thread_members_last_read_message;
DROP TABLE IF EXISTS thread_messages;
DROP TABLE IF EXISTS message_thread_members;
DROP TABLE IF EXISTS message_threads;
DROP TYPE IF EXISTS message_kind;
DROP TYPE IF EXISTS message_inbox_category;
DROP TYPE IF EXISTS message_thread_type;
-- +goose StatementEnd
