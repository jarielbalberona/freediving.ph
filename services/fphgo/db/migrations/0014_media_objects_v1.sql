-- +goose Up
-- +goose StatementBegin
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

CREATE INDEX IF NOT EXISTS idx_media_objects_owner_created_at
  ON media_objects (owner_app_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_objects_context_created_at
  ON media_objects (context_type, context_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_objects_state
  ON media_objects (state);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_media_objects_state;
DROP INDEX IF EXISTS idx_media_objects_context_created_at;
DROP INDEX IF EXISTS idx_media_objects_owner_created_at;
DROP TABLE IF EXISTS media_objects;
-- +goose StatementEnd
