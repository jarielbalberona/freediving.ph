-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS media_upload_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  item_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source IN ('create_post', 'profile_upload')),
  CHECK (item_count > 0)
);

CREATE TABLE IF NOT EXISTS media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upload_group_id UUID NOT NULL UNIQUE REFERENCES media_upload_groups(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE RESTRICT,
  post_caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES media_posts(id) ON DELETE CASCADE,
  media_object_id UUID NOT NULL UNIQUE REFERENCES media_objects(id) ON DELETE RESTRICT,
  author_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upload_group_id UUID NOT NULL REFERENCES media_upload_groups(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  duration_ms INTEGER,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (type IN ('photo', 'video')),
  CHECK (width > 0),
  CHECK (height > 0),
  CHECK (duration_ms IS NULL OR duration_ms >= 0),
  CHECK (sort_order >= 0),
  CHECK (status IN ('active', 'hidden', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_media_upload_groups_author_created_at
  ON media_upload_groups (author_app_user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_media_posts_author_created_at
  ON media_posts (author_app_user_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_posts_group
  ON media_posts (upload_group_id);

CREATE INDEX IF NOT EXISTS idx_media_items_author_created_at
  ON media_items (author_app_user_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_items_post_sort
  ON media_items (post_id, sort_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_media_items_group_sort
  ON media_items (upload_group_id, sort_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_media_items_status_created_at
  ON media_items (status, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_media_items_status_created_at;
DROP INDEX IF EXISTS idx_media_items_group_sort;
DROP INDEX IF EXISTS idx_media_items_post_sort;
DROP INDEX IF EXISTS idx_media_items_author_created_at;
DROP INDEX IF EXISTS idx_media_posts_group;
DROP INDEX IF EXISTS idx_media_posts_author_created_at;
DROP INDEX IF EXISTS idx_media_upload_groups_author_created_at;
DROP TABLE IF EXISTS media_items;
DROP TABLE IF EXISTS media_posts;
DROP TABLE IF EXISTS media_upload_groups;
-- +goose StatementEnd
