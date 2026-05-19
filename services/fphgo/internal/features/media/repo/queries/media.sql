-- name: CreateMediaObject :one
INSERT INTO media_objects (
  owner_app_user_id,
  context_type,
  context_id,
  object_key,
  mime_type,
  size_bytes,
  width,
  height,
  state
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at;

-- name: GetMediaObjectByID :one
SELECT id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at
FROM media_objects
WHERE id = $1;

-- name: GetMediaObjectsByIDs :many
SELECT id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at
FROM media_objects
WHERE id = ANY($1::uuid[]);

-- name: ListMediaByOwner :many
SELECT id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at
FROM media_objects m
WHERE m.owner_app_user_id = $1
  AND (m.created_at < $2 OR (m.created_at = $2 AND m.id < $3))
ORDER BY m.created_at DESC, m.id DESC
LIMIT $4;

-- name: ListMediaByContext :many
SELECT id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at
FROM media_objects m
WHERE m.context_type = $1
  AND m.context_id IS NOT DISTINCT FROM $2
  AND (m.created_at < $3 OR (m.created_at = $3 AND m.id < $4))
ORDER BY m.created_at DESC, m.id DESC
LIMIT $5;

-- name: UpdateMediaState :one
UPDATE media_objects
SET state = $2
WHERE id = $1
RETURNING id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at;

-- name: CreateMediaUploadGroup :one
INSERT INTO media_upload_groups (
  author_app_user_id,
  source,
  item_count
)
VALUES ($1, $2, $3)
RETURNING id, author_app_user_id, source, item_count, created_at;

-- name: CreateMediaPost :one
INSERT INTO media_posts (
  author_app_user_id,
  upload_group_id,
  dive_site_id,
  post_caption
)
VALUES ($1, $2, $3, $4)
RETURNING id, author_app_user_id, upload_group_id, dive_site_id, post_caption, created_at, updated_at, deleted_at;

-- name: CreateMediaItem :one
INSERT INTO media_items (
  post_id,
  media_object_id,
  author_app_user_id,
  upload_group_id,
  dive_site_id,
  type,
  storage_key,
  mime_type,
  width,
  height,
  duration_ms,
  caption,
  sort_order,
  status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING
  id,
  post_id,
  media_object_id,
  author_app_user_id,
  upload_group_id,
  dive_site_id,
  type,
  storage_key,
  mime_type,
  width,
  height,
  duration_ms,
  caption,
  sort_order,
  status,
  created_at,
  updated_at,
  deleted_at;

-- name: ListProfileMediaByUsername :many
SELECT
  mi.id,
  mi.post_id,
  mp.post_caption,
  mi.media_object_id,
  mi.author_app_user_id,
  mi.upload_group_id,
  mi.dive_site_id,
  mi.type,
  mi.storage_key,
  mi.mime_type,
  mi.width,
  mi.height,
  mi.duration_ms,
  mi.caption,
  mi.sort_order,
  mi.status,
  mi.created_at,
  mi.updated_at,
  mi.deleted_at,
  COALESCE(ds.slug, '') AS dive_site_slug,
  COALESCE(ds.name, '') AS dive_site_name,
  COALESCE(ds.area, '') AS dive_site_area,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  EXISTS (
    SELECT 1
    FROM media_post_likes viewer_like
    WHERE viewer_like.media_post_id = mp.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked
FROM media_items mi
JOIN media_posts mp ON mp.id = mi.post_id
JOIN users u ON u.id = mi.author_app_user_id
LEFT JOIN dive_sites ds
  ON ds.id = mi.dive_site_id
 AND ds.moderation_state = 'approved'
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM media_post_likes mpl
  WHERE mpl.media_post_id = mp.id
) like_counts ON true
WHERE lower(u.username) = lower(sqlc.arg(username))
  AND u.account_status = 'active'
  AND mi.status = 'active'
  AND mi.deleted_at IS NULL
  AND mp.deleted_at IS NULL
  AND (mi.created_at < sqlc.arg(created_at) OR (mi.created_at = sqlc.arg(created_at) AND mi.id < sqlc.arg(id)))
ORDER BY mi.created_at DESC, mi.id DESC
LIMIT sqlc.arg(limit_count);

-- name: GetVisibleMediaPostLikeState :one
SELECT
  mp.id,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  EXISTS (
    SELECT 1
    FROM media_post_likes viewer_like
    WHERE viewer_like.media_post_id = mp.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked
FROM media_posts mp
JOIN users u ON u.id = mp.author_app_user_id
JOIN dive_sites ds ON ds.id = mp.dive_site_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM media_post_likes mpl
  WHERE mpl.media_post_id = mp.id
) like_counts ON true
WHERE mp.id = sqlc.arg(media_post_id)
  AND mp.deleted_at IS NULL
  AND u.account_status = 'active'
  AND ds.moderation_state = 'approved'
  AND EXISTS (
    SELECT 1
    FROM media_items mi
    JOIN media_objects mo ON mo.id = mi.media_object_id
    WHERE mi.post_id = mp.id
      AND mi.status = 'active'
      AND mi.deleted_at IS NULL
      AND mo.state = 'active'
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks b
      WHERE (b.blocker_app_user_id = sqlc.arg(viewer_user_id) AND b.blocked_app_user_id = mp.author_app_user_id)
         OR (b.blocker_app_user_id = mp.author_app_user_id AND b.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  );

-- name: LikeMediaPost :exec
INSERT INTO media_post_likes (media_post_id, user_id)
VALUES ($1, $2)
ON CONFLICT (media_post_id, user_id) DO NOTHING;

-- name: UnlikeMediaPost :exec
DELETE FROM media_post_likes
WHERE media_post_id = $1
  AND user_id = $2;
