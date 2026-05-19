-- +goose Up
-- +goose StatementBegin
CREATE INDEX IF NOT EXISTS idx_media_posts_site_cover_candidates
  ON media_posts (dive_site_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_items_site_cover_candidates
  ON media_items (dive_site_id, post_id, sort_order ASC, created_at ASC, id ASC)
  WHERE type = 'photo' AND status = 'active' AND deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_media_items_site_cover_candidates;
DROP INDEX IF EXISTS idx_media_posts_site_cover_candidates;
-- +goose StatementEnd
