-- +goose Up
-- +goose StatementBegin
ALTER TABLE media_posts
  ALTER COLUMN dive_site_id DROP NOT NULL;

ALTER TABLE media_items
  ALTER COLUMN dive_site_id DROP NOT NULL;

ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'r2',
  ADD COLUMN IF NOT EXISTS stream_uid TEXT,
  ADD COLUMN IF NOT EXISTS playback_uid TEXT,
  ADD COLUMN IF NOT EXISTS playback_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS preview_url TEXT,
  ADD COLUMN IF NOT EXISTS aspect_ratio NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS has_audio BOOLEAN,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS upload_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_reason TEXT;

ALTER TABLE media_upload_groups DROP CONSTRAINT IF EXISTS media_upload_groups_source_check;
ALTER TABLE media_upload_groups
  ADD CONSTRAINT media_upload_groups_source_check
  CHECK (source IN ('create_post', 'profile_upload', 'moment_upload'));

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_status_check;
ALTER TABLE media_items
  ADD CONSTRAINT media_items_status_check
  CHECK (status IN ('active', 'hidden', 'deleted'));

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_provider_check;
ALTER TABLE media_items
  ADD CONSTRAINT media_items_provider_check
  CHECK (provider IN ('r2', 'cloudflare_stream'));

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_processing_status_check;
ALTER TABLE media_items
  ADD CONSTRAINT media_items_processing_status_check
  CHECK (processing_status IN (
    'draft',
    'upload_requested',
    'uploading',
    'uploaded',
    'processing',
    'ready',
    'failed',
    'rejected'
  ));

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_moderation_status_check;
ALTER TABLE media_items
  ADD CONSTRAINT media_items_moderation_status_check
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_items_stream_uid
  ON media_items (stream_uid)
  WHERE stream_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_items_moments_ready
  ON media_items (created_at DESC, id DESC)
  WHERE type = 'video'
    AND provider = 'cloudflare_stream'
    AND status = 'active'
    AND processing_status = 'ready'
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_items_moments_processing
  ON media_items (processing_status, upload_expires_at, created_at DESC)
  WHERE type = 'video'
    AND provider = 'cloudflare_stream'
    AND deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_media_items_moments_processing;
DROP INDEX IF EXISTS idx_media_items_moments_ready;
DROP INDEX IF EXISTS idx_media_items_stream_uid;

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_moderation_status_check;
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_processing_status_check;
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_provider_check;
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_status_check;
ALTER TABLE media_items
  ADD CONSTRAINT media_items_status_check
  CHECK (status IN ('active', 'hidden', 'deleted'));

ALTER TABLE media_upload_groups DROP CONSTRAINT IF EXISTS media_upload_groups_source_check;
ALTER TABLE media_upload_groups
  ADD CONSTRAINT media_upload_groups_source_check
  CHECK (source IN ('create_post', 'profile_upload'));

ALTER TABLE media_items
  DROP COLUMN IF EXISTS failed_reason,
  DROP COLUMN IF EXISTS ready_at,
  DROP COLUMN IF EXISTS upload_expires_at,
  DROP COLUMN IF EXISTS moderation_status,
  DROP COLUMN IF EXISTS processing_status,
  DROP COLUMN IF EXISTS has_audio,
  DROP COLUMN IF EXISTS aspect_ratio,
  DROP COLUMN IF EXISTS preview_url,
  DROP COLUMN IF EXISTS thumbnail_url,
  DROP COLUMN IF EXISTS playback_url,
  DROP COLUMN IF EXISTS playback_uid,
  DROP COLUMN IF EXISTS stream_uid,
  DROP COLUMN IF EXISTS provider;

ALTER TABLE media_items
  ALTER COLUMN dive_site_id SET NOT NULL;

ALTER TABLE media_posts
  ALTER COLUMN dive_site_id SET NOT NULL;
-- +goose StatementEnd
