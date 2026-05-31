-- name: GetUserDiveSite :one
SELECT
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
FROM user_dive_sites
WHERE user_id = $1
  AND dive_site_id = $2;

-- name: ListUserDiveSites :many
SELECT
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
FROM user_dive_sites
WHERE user_id = $1
ORDER BY updated_at DESC, dive_site_id;

-- name: CountUserDiveSites :one
SELECT COUNT(*)::bigint
FROM user_dive_sites
WHERE user_id = $1;

-- name: UpsertUserDiveSiteFromMediaPosts :exec
WITH qualifying_posts AS (
  SELECT p.id, p.created_at
  FROM media_posts p
  JOIN dive_sites ds ON ds.id = p.dive_site_id
  WHERE p.author_app_user_id = $1
    AND p.dive_site_id = $2
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
summary AS (
  SELECT
    (ARRAY_AGG(id ORDER BY created_at ASC, id ASC))[1] AS first_post_id,
    MIN(created_at) AS first_visited_at,
    (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS last_post_id,
    MAX(created_at) AS last_visited_at,
    COUNT(*)::integer AS media_post_count
  FROM qualifying_posts
  HAVING COUNT(*) > 0
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
  $1,
  $2,
  first_post_id,
  first_visited_at,
  last_post_id,
  last_visited_at,
  media_post_count,
  'members',
  NOW(),
  NOW()
FROM summary
ON CONFLICT (user_id, dive_site_id) DO UPDATE
SET first_post_id = EXCLUDED.first_post_id,
    first_visited_at = EXCLUDED.first_visited_at,
    last_post_id = EXCLUDED.last_post_id,
    last_visited_at = EXCLUDED.last_visited_at,
    media_post_count = EXCLUDED.media_post_count,
    updated_at = NOW();

-- name: DeleteUserDiveSiteWithoutMediaPosts :exec
DELETE FROM user_dive_sites uds
WHERE uds.user_id = $1
  AND uds.dive_site_id = $2
  AND NOT EXISTS (
    SELECT 1
    FROM media_posts p
    JOIN dive_sites ds ON ds.id = p.dive_site_id
    WHERE p.author_app_user_id = uds.user_id
      AND p.dive_site_id = uds.dive_site_id
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
  );
