CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  auth_provider TEXT NOT NULL DEFAULT 'local',
  auth_provider_user_id TEXT,
  global_role TEXT NOT NULL DEFAULT 'member',
  account_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (global_role IN ('member', 'moderator', 'admin', 'super_admin')),
  CHECK (account_status IN ('active', 'read_only', 'suspended'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  socials JSONB NOT NULL DEFAULT '{}'::jsonb,
  pseudonymous_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buddy_relationships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, buddy_id),
  CHECK (user_id <> buddy_id),
  CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_app_user_id, blocked_app_user_id),
  CHECK (blocker_app_user_id <> blocked_app_user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'dm',
  dm_pair_key TEXT NOT NULL UNIQUE,
  initiator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kind IN ('dm')),
  CHECK (status IN ('pending', 'active', 'rejected'))
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chika_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'normal',
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hidden_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CHECK (mode IN ('normal', 'pseudonymous'))
);

CREATE TABLE IF NOT EXISTS chika_posts (
  id BIGSERIAL PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES chika_threads(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chika_comments (
  id BIGSERIAL PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES chika_threads(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hidden_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chika_thread_reactions (
  thread_id UUID NOT NULL REFERENCES chika_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id),
  CHECK (reaction_type IN ('upvote', 'downvote'))
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (entity_type IN ('thread', 'post', 'comment'))
);

CREATE TABLE IF NOT EXISTS dive_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  moderation_state TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (moderation_state IN ('approved', 'pending', 'hidden'))
);

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

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_uuid UUID,
  target_bigint BIGINT,
  target_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  details TEXT,
  evidence_urls JSONB,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (target_type IN ('user', 'message', 'chika_thread', 'chika_comment')),
  CHECK (
    (target_type IN ('user', 'chika_thread') AND target_uuid IS NOT NULL AND target_bigint IS NULL)
    OR
    (target_type IN ('message', 'chika_comment') AND target_bigint IS NOT NULL AND target_uuid IS NULL)
  ),
  CHECK (reason_code IN ('spam', 'harassment', 'impersonation', 'unsafe', 'other')),
  CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS report_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  actor_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (event_type IN ('created', 'status_changed', 'note_added'))
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_uuid UUID,
  target_bigint BIGINT,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (target_type IN ('user', 'chika_thread', 'chika_comment')),
  CHECK (
    (target_type IN ('user', 'chika_thread') AND target_uuid IS NOT NULL AND target_bigint IS NULL)
    OR
    (target_type = 'chika_comment' AND target_bigint IS NOT NULL AND target_uuid IS NULL)
  ),
  CHECK (action IN (
    'suspend_user',
    'unsuspend_user',
    'set_user_read_only',
    'clear_user_read_only',
    'hide_chika_thread',
    'unhide_chika_thread',
    'hide_chika_comment',
    'unhide_chika_comment'
  )),
  CHECK (length(trim(reason)) > 0)
);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_seconds INTEGER NOT NULL,
  CHECK (window_seconds > 0)
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

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations (status);
CREATE INDEX IF NOT EXISTS idx_dive_sites_name ON dive_sites (name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider_subject ON users (auth_provider, auth_provider_user_id) WHERE auth_provider_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_display_name_search ON users (lower(display_name));
CREATE INDEX IF NOT EXISTS idx_users_username_search ON users (lower(username));
CREATE INDEX IF NOT EXISTS idx_users_global_role ON users (global_role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_app_user_id ON user_blocks (blocker_app_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_app_user_id ON user_blocks (blocked_app_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_created_at ON user_blocks (blocker_app_user_id, created_at DESC, blocked_app_user_id DESC);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_event_memberships_user ON event_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status_created_at ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_app_user ON reports (reporter_app_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_target_uuid_lookup ON reports (target_type, target_uuid) WHERE target_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_target_bigint_lookup ON reports (target_type, target_bigint) WHERE target_bigint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_report_events_report_id ON report_events (report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_events_actor_app_user ON report_events (actor_app_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_actor_created_at ON moderation_actions (actor_app_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_uuid_created_at ON moderation_actions (target_type, target_uuid, created_at DESC) WHERE target_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_bigint_created_at ON moderation_actions (target_type, target_bigint, created_at DESC) WHERE target_bigint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_created_at ON moderation_actions (report_id, created_at DESC) WHERE report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_scope_key_created_at ON rate_limit_events (scope, key_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_created_at ON rate_limit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chika_threads_created_at ON chika_threads (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_threads_visible_created_at ON chika_threads (created_at DESC) WHERE deleted_at IS NULL AND hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_posts_thread_created_at ON chika_posts (thread_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_comments_thread_created_at ON chika_comments (thread_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_comments_visible_thread_created_at ON chika_comments (thread_id, created_at DESC) WHERE deleted_at IS NULL AND hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON media_assets (entity_type, entity_id, created_at DESC);
