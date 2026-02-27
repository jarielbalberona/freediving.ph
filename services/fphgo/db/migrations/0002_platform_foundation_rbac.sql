-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS global_role TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_global_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_global_role_check
      CHECK (global_role IN ('member', 'moderator', 'admin', 'super_admin'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_account_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('active', 'read_only', 'suspended'));
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_memberships (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id),
  CHECK (role IN ('member', 'moderator', 'owner')),
  CHECK (status IN ('active', 'invited', 'blocked'))
);

CREATE TABLE IF NOT EXISTS event_memberships (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'attendee',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id),
  CHECK (role IN ('attendee', 'staff', 'organizer')),
  CHECK (status IN ('active', 'invited', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_users_global_role ON users (global_role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_event_memberships_user ON event_memberships (user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_event_memberships_user;
DROP INDEX IF EXISTS idx_group_memberships_user;
DROP INDEX IF EXISTS idx_users_account_status;
DROP INDEX IF EXISTS idx_users_global_role;

DROP TABLE IF EXISTS event_memberships;
DROP TABLE IF EXISTS group_memberships;
DROP TABLE IF EXISTS user_permission_overrides;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS groups;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_global_role_check;

ALTER TABLE users
  DROP COLUMN IF EXISTS account_status,
  DROP COLUMN IF EXISTS global_role;
-- +goose StatementEnd
