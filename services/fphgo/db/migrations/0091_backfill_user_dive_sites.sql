-- +goose Up
-- +goose StatementBegin
WITH qualifying_posts AS (
  SELECT
    p.author_app_user_id AS user_id,
    p.dive_site_id,
    p.id AS post_id,
    p.created_at
  FROM media_posts p
  JOIN dive_sites ds ON ds.id = p.dive_site_id
  WHERE p.dive_site_id IS NOT NULL
    AND p.deleted_at IS NULL
    AND ds.moderation_state = 'approved'
    AND EXISTS (
      SELECT 1
      FROM media_items mi
      WHERE mi.post_id = p.id
        AND mi.author_app_user_id = p.author_app_user_id
        AND mi.dive_site_id = p.dive_site_id
        AND mi.status = 'active'
        AND mi.processing_status = 'ready'
        AND mi.moderation_status = 'approved'
        AND mi.deleted_at IS NULL
    )
),
summaries AS (
  SELECT
    user_id,
    dive_site_id,
    (ARRAY_AGG(post_id ORDER BY created_at ASC, post_id ASC))[1] AS first_post_id,
    MIN(created_at) AS first_visited_at,
    (ARRAY_AGG(post_id ORDER BY created_at DESC, post_id DESC))[1] AS last_post_id,
    MAX(created_at) AS last_visited_at,
    COUNT(*)::integer AS media_post_count
  FROM qualifying_posts
  GROUP BY user_id, dive_site_id
)
INSERT INTO user_dive_sites (
  user_id,
  dive_site_id,
  first_post_id,
  first_visited_at,
  last_post_id,
  last_visited_at,
  media_post_count,
  visibility,
  created_at,
  updated_at
)
SELECT
  user_id,
  dive_site_id,
  first_post_id,
  first_visited_at,
  last_post_id,
  last_visited_at,
  media_post_count,
  'members',
  NOW(),
  NOW()
FROM summaries
ON CONFLICT (user_id, dive_site_id) DO UPDATE
SET first_post_id = EXCLUDED.first_post_id,
    first_visited_at = EXCLUDED.first_visited_at,
    last_post_id = EXCLUDED.last_post_id,
    last_visited_at = EXCLUDED.last_visited_at,
    media_post_count = EXCLUDED.media_post_count,
    updated_at = NOW();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Data-only backfill. Rows are intentionally left in place on rollback because
-- they are indistinguishable from rows produced by normal media writes.
-- +goose StatementEnd
