CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  auth_provider TEXT NOT NULL DEFAULT 'local',
  auth_provider_user_id TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
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
  home_area TEXT NOT NULL DEFAULT '',
  interests TEXT[] NOT NULL DEFAULT '{}'::text[],
  cert_level TEXT,
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

CREATE TABLE IF NOT EXISTS buddy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_app_user_id <> target_app_user_id),
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS buddies (
  app_user_id_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_user_id_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_user_id_a, app_user_id_b),
  CHECK (app_user_id_a < app_user_id_b)
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
  metadata JSONB,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_thread_type') THEN
    CREATE TYPE message_thread_type AS ENUM ('direct');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_inbox_category') THEN
    CREATE TYPE message_inbox_category AS ENUM ('primary', 'general', 'requests', 'transactions');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_kind') THEN
    CREATE TYPE message_kind AS ENUM ('text', 'system');
  END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS chika_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pseudonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chika_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'normal',
  category_id UUID NOT NULL REFERENCES chika_categories(id) ON DELETE RESTRICT,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hidden_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CHECK (mode IN ('normal', 'pseudonymous', 'locked_pseudonymous'))
);

CREATE TABLE IF NOT EXISTS chika_thread_aliases (
  thread_id UUID NOT NULL REFERENCES chika_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id),
  UNIQUE (thread_id, pseudonym)
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

CREATE TABLE IF NOT EXISTS chika_comment_reactions (
  comment_id BIGINT NOT NULL REFERENCES chika_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id),
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
  slug TEXT NOT NULL UNIQUE,
  area TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  entry_difficulty TEXT NOT NULL,
  depth_min_m NUMERIC,
  depth_max_m NUMERIC,
  hazards TEXT[],
  best_season TEXT,
  typical_conditions TEXT,
  access TEXT,
  fees TEXT,
  contact_info TEXT,
  verification_status TEXT NOT NULL DEFAULT 'community',
  verified_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  moderation_reason TEXT,
  moderation_state TEXT NOT NULL DEFAULT 'approved',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (entry_difficulty IN ('easy', 'moderate', 'hard')),
  CHECK (verification_status IN ('community', 'instructor', 'moderator', 'verified')),
  CHECK (moderation_state IN ('approved', 'pending', 'hidden'))
);

CREATE TABLE IF NOT EXISTS dive_site_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  author_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  condition_visibility_m NUMERIC,
  condition_current TEXT,
  condition_waves TEXT,
  condition_temp_c NUMERIC,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state TEXT NOT NULL DEFAULT 'active',
  CHECK (condition_current IS NULL OR condition_current IN ('none', 'mild', 'strong')),
  CHECK (condition_waves IS NULL OR condition_waves IN ('calm', 'moderate', 'rough')),
  CHECK (state IN ('active', 'hidden'))
);

CREATE TABLE IF NOT EXISTS dive_site_saves (
  app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_user_id, dive_site_id)
);

CREATE TABLE IF NOT EXISTS saved_users (
  viewer_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  saved_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (viewer_app_user_id, saved_app_user_id),
  CHECK (viewer_app_user_id <> saved_app_user_id)
);

CREATE TABLE IF NOT EXISTS buddy_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  area TEXT NOT NULL,
  intent_type TEXT NOT NULL,
  time_window TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  note TEXT,
  visibility TEXT NOT NULL DEFAULT 'members',
  state TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CHECK (intent_type IN ('training', 'fun_dive', 'depth', 'pool', 'line_training')),
  CHECK (time_window IN ('today', 'weekend', 'specific_date')),
  CHECK (visibility IN ('members')),
  CHECK (state IN ('active', 'hidden', 'expired'))
);

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'active',
  join_policy TEXT NOT NULL DEFAULT 'open',
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  member_count INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (visibility IN ('public', 'private', 'invite_only')),
  CHECK (status IN ('active', 'archived', 'deleted')),
  CHECK (join_policy IN ('open', 'approval', 'invite_only'))
);

CREATE TABLE IF NOT EXISTS psgc_regions (
  code TEXT PRIMARY KEY,
  psgc_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psgc_provinces (
  code TEXT PRIMARY KEY,
  psgc_code TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL REFERENCES psgc_regions(code),
  name TEXT NOT NULL,
  old_name TEXT,
  city_class TEXT,
  source_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psgc_cities_municipalities (
  code TEXT PRIMARY KEY,
  psgc_code TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL REFERENCES psgc_regions(code),
  province_code TEXT,
  name TEXT NOT NULL,
  old_name TEXT,
  source_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psgc_barangays (
  code TEXT PRIMARY KEY,
  psgc_code TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL REFERENCES psgc_regions(code),
  province_code TEXT,
  city_municipality_code TEXT NOT NULL REFERENCES psgc_cities_municipalities(code),
  name TEXT NOT NULL,
  old_name TEXT,
  source_version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psgc_import_history (
  id BIGSERIAL PRIMARY KEY,
  source_version TEXT NOT NULL,
  source_directory TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  regions_count INTEGER NOT NULL DEFAULT 0,
  provinces_count INTEGER NOT NULL DEFAULT 0,
  cities_municipalities_count INTEGER NOT NULL DEFAULT 0,
  barangays_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  location_name TEXT,
  formatted_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  google_place_id TEXT,
  region_code TEXT REFERENCES psgc_regions(code),
  province_code TEXT REFERENCES psgc_provinces(code),
  city_municipality_code TEXT REFERENCES psgc_cities_municipalities(code),
  barangay_code TEXT REFERENCES psgc_barangays(code),
  location_source TEXT NOT NULL DEFAULT 'manual',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public',
  event_type TEXT NOT NULL DEFAULT 'meetup',
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  max_attendees INTEGER,
  current_attendees INTEGER NOT NULL DEFAULT 0,
  organizer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  CHECK (visibility IN ('public', 'group_members', 'invite_only')),
  CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at),
  CHECK (location_source IN ('manual', 'google_places', 'psgc_mapped', 'unmapped'))
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
  CHECK (target_type IN ('user', 'message', 'chika_thread', 'chika_comment', 'dive_site_update')),
  CHECK (
    (target_type IN ('user', 'chika_thread', 'dive_site_update') AND target_uuid IS NOT NULL AND target_bigint IS NULL)
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

CREATE TABLE IF NOT EXISTS media_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  context_id UUID,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'dive_spot_attachment',
    'group_cover'
  )),
  CHECK (state IN ('active', 'hidden', 'deleted'))
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
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id),
  CHECK (role IN ('member', 'moderator', 'owner')),
  CHECK (status IN ('active', 'invited', 'blocked'))
);

CREATE TABLE IF NOT EXISTS group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  like_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(content)) > 0),
  CHECK (status IN ('active', 'hidden', 'deleted'))
);

CREATE TABLE IF NOT EXISTS event_memberships (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'attendee',
  status TEXT NOT NULL DEFAULT 'active',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id),
  CHECK (role IN ('attendee', 'staff', 'organizer')),
  CHECK (status IN ('active', 'invited', 'blocked'))
);

CREATE TABLE IF NOT EXISTS feed_impressions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  feed_item_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  position INTEGER NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (mode IN ('following', 'nearby', 'training', 'spot-reports')),
  CHECK (position >= 0)
);

CREATE TABLE IF NOT EXISTS feed_actions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  feed_item_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (mode IN ('following', 'nearby', 'training', 'spot-reports'))
);

CREATE TABLE IF NOT EXISTS user_feed_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_regions TEXT[] NOT NULL DEFAULT '{}'::text[],
  muted_entity_types TEXT[] NOT NULL DEFAULT '{}'::text[],
  muted_topics TEXT[] NOT NULL DEFAULT '{}'::text[],
  hidden_creators TEXT[] NOT NULL DEFAULT '{}'::text[],
  hidden_spots TEXT[] NOT NULL DEFAULT '{}'::text[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_hidden_feed_items (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'hidden',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages (conversation_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency_key ON messages (conversation_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_direct_pair ON message_threads (type, direct_user_low, direct_user_high);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads (last_message_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_message_thread_members_user_inbox ON message_thread_members (user_id, inbox_category, is_archived, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_thread_members_thread_user ON message_thread_members (thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created ON thread_messages (thread_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_thread_messages_client_id ON thread_messages (thread_id, sender_user_id, client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created ON notifications (user_id, status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created ON notifications (user_id, type, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_priority_created ON notifications (user_id, priority, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_sites_name ON dive_sites (name);
CREATE INDEX IF NOT EXISTS idx_dive_sites_slug ON dive_sites (slug);
CREATE INDEX IF NOT EXISTS idx_dive_sites_area ON dive_sites (area);
CREATE INDEX IF NOT EXISTS idx_dive_sites_verification_status ON dive_sites (verification_status);
CREATE INDEX IF NOT EXISTS idx_dive_sites_updated_id ON dive_sites (last_updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_sites_moderation_created_id ON dive_sites (moderation_state, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_sites_submitter_created_id ON dive_sites (submitted_by_app_user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_site_updates_site_occurred_at ON dive_site_updates (dive_site_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_site_updates_author_created_at ON dive_site_updates (author_app_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buddy_intents_area_created_at ON buddy_intents (area, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_buddy_intents_dive_site_created_at
  ON buddy_intents (dive_site_id, created_at DESC, id DESC)
  WHERE dive_site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buddy_intents_expires_at ON buddy_intents (expires_at);
CREATE INDEX IF NOT EXISTS idx_buddy_intents_author_created_at ON buddy_intents (author_app_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_users_viewer_created_at ON saved_users (viewer_app_user_id, created_at DESC, saved_app_user_id DESC);
CREATE INDEX IF NOT EXISTS idx_saved_users_saved_app_user_id ON saved_users (saved_app_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider_subject ON users (auth_provider, auth_provider_user_id) WHERE auth_provider_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_display_name_search ON users (lower(display_name));
CREATE INDEX IF NOT EXISTS idx_users_username_search ON users (lower(username));
CREATE INDEX IF NOT EXISTS idx_users_global_role ON users (global_role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_app_user_id ON user_blocks (blocker_app_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_app_user_id ON user_blocks (blocked_app_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_created_at ON user_blocks (blocker_app_user_id, created_at DESC, blocked_app_user_id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_slug ON groups (slug);
CREATE INDEX IF NOT EXISTS idx_groups_visibility_status_created ON groups (visibility, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups (created_by);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_group_created ON group_posts (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_author ON group_posts (author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status_starts ON events (status, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_visibility_status_starts ON events (visibility, status, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events (group_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_user_id ON events (organizer_user_id);
CREATE INDEX IF NOT EXISTS idx_events_region_code ON events (region_code);
CREATE INDEX IF NOT EXISTS idx_events_province_code ON events (province_code);
CREATE INDEX IF NOT EXISTS idx_events_city_municipality_code ON events (city_municipality_code);
CREATE INDEX IF NOT EXISTS idx_events_barangay_code ON events (barangay_code);
CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_google_place_id ON events (google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_memberships_user ON event_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_psgc_regions_active_name ON psgc_regions (is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_provinces_region_active_name ON psgc_provinces (region_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_cities_province_active_name ON psgc_cities_municipalities (province_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_cities_region_active_name ON psgc_cities_municipalities (region_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_barangays_city_active_name ON psgc_barangays (city_municipality_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_barangays_province_active_name ON psgc_barangays (province_code, is_active, name);
CREATE INDEX IF NOT EXISTS idx_psgc_import_history_source_version ON psgc_import_history (source_version, imported_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_impressions_dedupe ON feed_impressions (user_id, session_id, feed_item_id, position);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_user_seen_at ON feed_impressions (user_id, seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_entity_seen_at ON feed_impressions (entity_type, entity_id, seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_actions_user_created_at ON feed_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_actions_entity_created_at ON feed_actions (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_actions_action_created_at ON feed_actions (action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_hidden_feed_items_user_created_at ON user_hidden_feed_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_hidden_feed_items_entity ON user_hidden_feed_items (entity_type, entity_id);
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
CREATE INDEX IF NOT EXISTS idx_chika_threads_category_created_at ON chika_threads (category_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_posts_thread_created_at ON chika_posts (thread_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_comments_thread_created_at ON chika_comments (thread_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_comments_visible_thread_created_at ON chika_comments (thread_id, created_at DESC) WHERE deleted_at IS NULL AND hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chika_comment_reactions_comment ON chika_comment_reactions (comment_id);
CREATE INDEX IF NOT EXISTS idx_chika_thread_aliases_user ON chika_thread_aliases (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON media_assets (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_objects_owner_created_at ON media_objects (owner_app_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_objects_context_created_at ON media_objects (context_type, context_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_objects_state ON media_objects (state);
