-- name: ListPreviewByArea :many
SELECT
  bi.id,
  bi.author_app_user_id,
  bi.dive_site_id,
  p.home_area,
  bi.area,
  bi.intent_type,
  bi.time_window,
  bi.date_start,
  bi.date_end,
  bi.note,
  bi.created_at,
  bi.expires_at,
  u.email_verified,
  u.phone_verified,
  p.cert_level,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM (
      SELECT app_user_id_a AS app_user_id FROM buddies
      UNION ALL
      SELECT app_user_id_b AS app_user_id FROM buddies
    ) pairs
    WHERE pairs.app_user_id = bi.author_app_user_id
  ), 0)::bigint AS buddy_count,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM reports r
    WHERE r.target_app_user_id = bi.author_app_user_id
  ), 0)::bigint AS report_count,
  0::bigint AS mutual_buddies_count
FROM buddy_intents bi
JOIN users u ON u.id = bi.author_app_user_id
JOIN profiles p ON p.user_id = bi.author_app_user_id
WHERE bi.state = 'active'
  AND bi.visibility = 'members'
  AND bi.expires_at > NOW()
  AND u.account_status = 'active'
  AND (sqlc.arg(area_filter)::text = '' OR bi.area = sqlc.arg(area_filter))
ORDER BY bi.created_at DESC, bi.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: ListPreviewBySite :many
SELECT
  bi.id,
  bi.author_app_user_id,
  bi.dive_site_id,
  p.home_area,
  bi.area,
  bi.intent_type,
  bi.time_window,
  bi.date_start,
  bi.date_end,
  bi.note,
  bi.created_at,
  bi.expires_at,
  u.email_verified,
  u.phone_verified,
  p.cert_level,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM (
      SELECT app_user_id_a AS app_user_id FROM buddies
      UNION ALL
      SELECT app_user_id_b AS app_user_id FROM buddies
    ) pairs
    WHERE pairs.app_user_id = bi.author_app_user_id
  ), 0)::bigint AS buddy_count,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM reports r
    WHERE r.target_app_user_id = bi.author_app_user_id
  ), 0)::bigint AS report_count,
  0::bigint AS mutual_buddies_count
FROM buddy_intents bi
JOIN users u ON u.id = bi.author_app_user_id
JOIN profiles p ON p.user_id = bi.author_app_user_id
WHERE bi.state = 'active'
  AND bi.visibility = 'members'
  AND bi.expires_at > NOW()
  AND u.account_status = 'active'
  AND bi.dive_site_id = sqlc.arg(dive_site_id)
ORDER BY bi.created_at DESC, bi.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: ListMemberIntentsByArea :many
SELECT
  bi.id,
  bi.author_app_user_id,
  bi.dive_site_id,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  p.home_area,
  bi.area,
  bi.intent_type,
  bi.time_window,
  bi.date_start,
  bi.date_end,
  bi.note,
  bi.created_at,
  bi.expires_at,
  u.email_verified,
  u.phone_verified,
  p.cert_level,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM (
      SELECT app_user_id_a AS app_user_id FROM buddies
      UNION ALL
      SELECT app_user_id_b AS app_user_id FROM buddies
    ) pairs
    WHERE pairs.app_user_id = bi.author_app_user_id
  ), 0)::bigint AS buddy_count,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM reports r
    WHERE r.target_app_user_id = bi.author_app_user_id
  ), 0)::bigint AS report_count,
  0::bigint AS mutual_buddies_count
FROM buddy_intents bi
JOIN users u ON u.id = bi.author_app_user_id
JOIN profiles p ON p.user_id = bi.author_app_user_id
WHERE bi.state = 'active'
  AND bi.visibility = 'members'
  AND bi.expires_at > NOW()
  AND u.account_status = 'active'
  AND bi.author_app_user_id <> sqlc.arg(viewer_user_id)
  AND (sqlc.arg(area_filter)::text = '' OR bi.area = sqlc.arg(area_filter))
  AND (sqlc.arg(intent_type_filter)::text = '' OR bi.intent_type = sqlc.arg(intent_type_filter))
  AND (sqlc.arg(time_window_filter)::text = '' OR bi.time_window = sqlc.arg(time_window_filter))
  AND NOT EXISTS (
    SELECT 1
    FROM user_blocks ub
    WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = bi.author_app_user_id)
       OR (ub.blocker_app_user_id = bi.author_app_user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
  )
  AND (bi.created_at < sqlc.arg(cursor_created_at) OR (bi.created_at = sqlc.arg(cursor_created_at) AND bi.id < sqlc.arg(cursor_id)))
ORDER BY bi.created_at DESC, bi.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: ListMemberIntentsBySite :many
SELECT
  bi.id,
  bi.author_app_user_id,
  bi.dive_site_id,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  p.home_area,
  bi.area,
  bi.intent_type,
  bi.time_window,
  bi.date_start,
  bi.date_end,
  bi.note,
  bi.created_at,
  bi.expires_at,
  u.email_verified,
  u.phone_verified,
  p.cert_level,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM (
      SELECT app_user_id_a AS app_user_id FROM buddies
      UNION ALL
      SELECT app_user_id_b AS app_user_id FROM buddies
    ) pairs
    WHERE pairs.app_user_id = bi.author_app_user_id
  ), 0)::bigint AS buddy_count,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM reports r
    WHERE r.target_app_user_id = bi.author_app_user_id
  ), 0)::bigint AS report_count,
  0::bigint AS mutual_buddies_count
FROM buddy_intents bi
JOIN users u ON u.id = bi.author_app_user_id
JOIN profiles p ON p.user_id = bi.author_app_user_id
WHERE bi.state = 'active'
  AND bi.visibility = 'members'
  AND bi.expires_at > NOW()
  AND u.account_status = 'active'
  AND bi.author_app_user_id <> sqlc.arg(viewer_user_id)
  AND bi.dive_site_id = sqlc.arg(dive_site_id)
  AND NOT EXISTS (
    SELECT 1
    FROM user_blocks ub
    WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = bi.author_app_user_id)
       OR (ub.blocker_app_user_id = bi.author_app_user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
  )
  AND (bi.created_at < sqlc.arg(cursor_created_at) OR (bi.created_at = sqlc.arg(cursor_created_at) AND bi.id < sqlc.arg(cursor_id)))
ORDER BY bi.created_at DESC, bi.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: GetIntentByID :one
SELECT
  bi.id,
  bi.author_app_user_id,
  bi.dive_site_id,
  bi.area,
  bi.intent_type,
  bi.time_window,
  bi.date_start,
  bi.date_end,
  bi.note,
  bi.visibility,
  bi.state,
  bi.created_at,
  bi.expires_at
FROM buddy_intents bi
WHERE bi.id = sqlc.arg(intent_id);

-- name: GetSharePreviewByID :one
SELECT
  bi.id,
  bi.author_app_user_id,
  bi.dive_site_id,
  COALESCE(ds.name, '') AS dive_site_name,
  bi.area,
  bi.intent_type,
  bi.time_window,
  bi.date_start,
  bi.date_end,
  bi.note,
  bi.created_at,
  bi.expires_at,
  u.email_verified,
  u.phone_verified,
  p.cert_level,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM (
      SELECT app_user_id_a AS app_user_id FROM buddies
      UNION ALL
      SELECT app_user_id_b AS app_user_id FROM buddies
    ) pairs
    WHERE pairs.app_user_id = bi.author_app_user_id
  ), 0)::bigint AS buddy_count,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM reports r
    WHERE r.target_app_user_id = bi.author_app_user_id
  ), 0)::bigint AS report_count
FROM buddy_intents bi
JOIN users u ON u.id = bi.author_app_user_id
JOIN profiles p ON p.user_id = bi.author_app_user_id
LEFT JOIN dive_sites ds ON ds.id = bi.dive_site_id
WHERE bi.id = sqlc.arg(intent_id)
  AND bi.state = 'active'
  AND bi.visibility = 'members'
  AND bi.expires_at > NOW()
  AND u.account_status = 'active';

-- name: CreateIntent :one
INSERT INTO buddy_intents (
  author_app_user_id,
  dive_site_id,
  area,
  intent_type,
  time_window,
  date_start,
  date_end,
  note,
  expires_at
)
VALUES (
  sqlc.arg(author_app_user_id),
  sqlc.narg(dive_site_id),
  sqlc.arg(area),
  sqlc.arg(intent_type),
  sqlc.arg(time_window),
  sqlc.narg(date_start),
  sqlc.narg(date_end),
  sqlc.narg(note),
  sqlc.arg(expires_at)
)
RETURNING *;

-- name: DeleteIntentByOwner :execrows
DELETE FROM buddy_intents
WHERE id = sqlc.arg(intent_id)
  AND author_app_user_id = sqlc.arg(author_app_user_id);

-- name: CountPreviewByArea :one
SELECT COUNT(*)::bigint
FROM buddy_intents bi
WHERE bi.state = 'active'
  AND bi.visibility = 'members'
  AND bi.expires_at > NOW()
  AND (sqlc.arg(area_filter)::text = '' OR bi.area = sqlc.arg(area_filter));
