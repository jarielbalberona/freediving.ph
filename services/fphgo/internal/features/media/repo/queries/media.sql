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
  COALESCE(comment_counts.comment_count, 0)::bigint AS comment_count,
  EXISTS (
    SELECT 1
    FROM media_post_likes viewer_like
    WHERE viewer_like.media_post_id = mp.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked,
  EXISTS (
    SELECT 1
    FROM media_post_saves viewer_save
    WHERE viewer_save.media_post_id = mp.id
      AND viewer_save.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_saved
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
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS comment_count
  FROM media_post_comments mpc
  WHERE mpc.media_post_id = mp.id
    AND mpc.deleted_at IS NULL
) comment_counts ON true
WHERE lower(u.username) = lower(sqlc.arg(username))
  AND u.account_status = 'active'
  AND mi.status = 'active'
  AND mi.deleted_at IS NULL
  AND mp.deleted_at IS NULL
  AND (mi.created_at < sqlc.arg(created_at) OR (mi.created_at = sqlc.arg(created_at) AND mi.id < sqlc.arg(id)))
ORDER BY mi.created_at DESC, mi.id DESC
LIMIT sqlc.arg(limit_count);

-- name: GetVisibleMediaPostSocialState :one
SELECT
  mp.id,
  mp.author_app_user_id,
  COALESCE(u.username, '') AS author_username,
  COALESCE(NULLIF(u.display_name, ''), u.username, '') AS author_display_name,
  COALESCE(p.avatar_url, '') AS author_avatar_url,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  COALESCE(comment_counts.comment_count, 0)::bigint AS comment_count,
  EXISTS (
    SELECT 1
    FROM media_post_likes viewer_like
    WHERE viewer_like.media_post_id = mp.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked,
  EXISTS (
    SELECT 1
    FROM media_post_saves viewer_save
    WHERE viewer_save.media_post_id = mp.id
      AND viewer_save.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_saved
FROM media_posts mp
JOIN users u ON u.id = mp.author_app_user_id
LEFT JOIN profiles p ON p.user_id = mp.author_app_user_id
JOIN dive_sites ds ON ds.id = mp.dive_site_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM media_post_likes mpl
  WHERE mpl.media_post_id = mp.id
) like_counts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS comment_count
  FROM media_post_comments mpc
  WHERE mpc.media_post_id = mp.id
    AND mpc.deleted_at IS NULL
) comment_counts ON true
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

-- name: SaveMediaPost :exec
INSERT INTO media_post_saves (media_post_id, user_id)
VALUES ($1, $2)
ON CONFLICT (media_post_id, user_id) DO NOTHING;

-- name: UnsaveMediaPost :exec
DELETE FROM media_post_saves
WHERE media_post_id = $1
  AND user_id = $2;

-- name: GetMediaPostDetail :many
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
  mp.created_at AS post_created_at,
  mp.updated_at AS post_updated_at,
  COALESCE(ds.slug, '') AS dive_site_slug,
  COALESCE(ds.name, '') AS dive_site_name,
  COALESCE(ds.area, '') AS dive_site_area,
  COALESCE(u.username, '') AS author_username,
  COALESCE(NULLIF(u.display_name, ''), u.username, '') AS author_display_name,
  COALESCE(p.avatar_url, '') AS author_avatar_url,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  COALESCE(comment_counts.comment_count, 0)::bigint AS comment_count,
  EXISTS (
    SELECT 1
    FROM media_post_likes viewer_like
    WHERE viewer_like.media_post_id = mp.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked,
  EXISTS (
    SELECT 1
    FROM media_post_saves viewer_save
    WHERE viewer_save.media_post_id = mp.id
      AND viewer_save.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_saved
FROM media_items mi
JOIN media_posts mp ON mp.id = mi.post_id
JOIN users u ON u.id = mp.author_app_user_id
LEFT JOIN profiles p ON p.user_id = mp.author_app_user_id
JOIN dive_sites ds ON ds.id = mi.dive_site_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM media_post_likes mpl
  WHERE mpl.media_post_id = mp.id
) like_counts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS comment_count
  FROM media_post_comments mpc
  WHERE mpc.media_post_id = mp.id
    AND mpc.deleted_at IS NULL
) comment_counts ON true
WHERE mp.id = sqlc.arg(media_post_id)
  AND mp.deleted_at IS NULL
  AND u.account_status = 'active'
  AND ds.moderation_state = 'approved'
  AND mi.status = 'active'
  AND mi.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM media_objects mo
    WHERE mo.id = mi.media_object_id
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
  )
ORDER BY mi.sort_order ASC, mi.created_at ASC, mi.id ASC;

-- name: CreateMediaPostComment :one
INSERT INTO media_post_comments (media_post_id, author_user_id, body)
VALUES ($1, $2, $3)
RETURNING id, media_post_id, author_user_id, body, created_at, updated_at, deleted_at, deleted_by_user_id;

-- name: GetMediaPostComment :one
SELECT
  c.id,
  c.media_post_id,
  c.author_user_id,
  COALESCE(u.username, '') AS author_username,
  COALESCE(NULLIF(u.display_name, ''), u.username, '') AS author_display_name,
  COALESCE(p.avatar_url, '') AS author_avatar_url,
  c.body,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  EXISTS (
    SELECT 1
    FROM media_post_comment_likes viewer_like
    WHERE viewer_like.comment_id = c.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked,
  c.created_at,
  c.updated_at
FROM media_post_comments c
JOIN users u ON u.id = c.author_user_id
LEFT JOIN profiles p ON p.user_id = c.author_user_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM media_post_comment_likes mpcl
  WHERE mpcl.comment_id = c.id
) like_counts ON true
WHERE c.id = sqlc.arg(comment_id)
  AND c.media_post_id = sqlc.arg(media_post_id)
  AND c.deleted_at IS NULL
  AND u.account_status = 'active';

-- name: ListMediaPostComments :many
SELECT
  c.id,
  c.media_post_id,
  c.author_user_id,
  COALESCE(u.username, '') AS author_username,
  COALESCE(NULLIF(u.display_name, ''), u.username, '') AS author_display_name,
  COALESCE(p.avatar_url, '') AS author_avatar_url,
  c.body,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  EXISTS (
    SELECT 1
    FROM media_post_comment_likes viewer_like
    WHERE viewer_like.comment_id = c.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked,
  c.created_at,
  c.updated_at
FROM media_post_comments c
JOIN users u ON u.id = c.author_user_id
LEFT JOIN profiles p ON p.user_id = c.author_user_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM media_post_comment_likes mpcl
  WHERE mpcl.comment_id = c.id
) like_counts ON true
WHERE c.media_post_id = sqlc.arg(media_post_id)
  AND c.deleted_at IS NULL
  AND u.account_status = 'active'
  AND (c.created_at < sqlc.arg(created_at) OR (c.created_at = sqlc.arg(created_at) AND c.id < sqlc.arg(id)))
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks b
      WHERE (b.blocker_app_user_id = sqlc.arg(viewer_user_id) AND b.blocked_app_user_id = c.author_user_id)
         OR (b.blocker_app_user_id = c.author_user_id AND b.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  )
ORDER BY c.created_at DESC, c.id DESC
LIMIT sqlc.arg(limit_count);

-- name: SoftDeleteMediaPostComment :exec
UPDATE media_post_comments
SET deleted_at = NOW(),
    deleted_by_user_id = $3,
    updated_at = NOW()
WHERE id = $1
  AND media_post_id = $2
  AND deleted_at IS NULL;

-- name: LikeMediaPostComment :exec
INSERT INTO media_post_comment_likes (comment_id, user_id)
VALUES ($1, $2)
ON CONFLICT (comment_id, user_id) DO NOTHING;

-- name: UnlikeMediaPostComment :exec
DELETE FROM media_post_comment_likes
WHERE comment_id = $1
  AND user_id = $2;

-- name: GetVisibleMediaPostCommentLikeState :one
SELECT
  c.id,
  c.media_post_id,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  EXISTS (
    SELECT 1
    FROM media_post_comment_likes viewer_like
    WHERE viewer_like.comment_id = c.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked
FROM media_post_comments c
JOIN media_posts mp ON mp.id = c.media_post_id
JOIN users post_author ON post_author.id = mp.author_app_user_id
JOIN users comment_author ON comment_author.id = c.author_user_id
JOIN dive_sites ds ON ds.id = mp.dive_site_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM media_post_comment_likes mpcl
  WHERE mpcl.comment_id = c.id
) like_counts ON true
WHERE c.id = sqlc.arg(comment_id)
  AND c.media_post_id = sqlc.arg(media_post_id)
  AND c.deleted_at IS NULL
  AND mp.deleted_at IS NULL
  AND post_author.account_status = 'active'
  AND comment_author.account_status = 'active'
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
      WHERE (b.blocker_app_user_id = sqlc.arg(viewer_user_id) AND b.blocked_app_user_id IN (mp.author_app_user_id, c.author_user_id))
         OR (b.blocked_app_user_id = sqlc.arg(viewer_user_id) AND b.blocker_app_user_id IN (mp.author_app_user_id, c.author_user_id))
    )
  );
