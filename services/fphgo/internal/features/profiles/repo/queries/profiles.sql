-- name: GetProfileByUserID :one
WITH buddy_counts AS (
  SELECT app_user_id, COUNT(*)::bigint AS buddy_count
  FROM (
    SELECT app_user_id_a AS app_user_id FROM buddies
    UNION ALL
    SELECT app_user_id_b AS app_user_id FROM buddies
  ) pairs
  GROUP BY app_user_id
),
report_counts AS (
  SELECT target_app_user_id AS user_id, COUNT(*)::bigint AS report_count
  FROM reports
  WHERE target_app_user_id IS NOT NULL
  GROUP BY target_app_user_id
)
SELECT
  u.id AS user_id,
  u.username,
  u.display_name,
  u.email_verified,
  u.phone_verified,
  COALESCE(bc.buddy_count, 0)::bigint AS buddy_count,
  COALESCE(rc.report_count, 0)::bigint AS report_count,
  p.bio,
  p.avatar_url,
  p.location,
  p.home_area,
  p.interests,
  p.cert_level,
  p.socials,
  p.updated_at
FROM users u
JOIN profiles p ON p.user_id = u.id
LEFT JOIN buddy_counts bc ON bc.app_user_id = u.id
LEFT JOIN report_counts rc ON rc.user_id = u.id
WHERE u.id = $1;

-- name: UpdateDisplayName :exec
UPDATE users
SET display_name = $2
WHERE id = $1;

-- name: UpsertMyProfile :one
INSERT INTO profiles (user_id, bio, avatar_url, location, home_area, interests, cert_level, socials, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
ON CONFLICT (user_id) DO UPDATE
SET
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  location = EXCLUDED.location,
  home_area = EXCLUDED.home_area,
  interests = EXCLUDED.interests,
  cert_level = EXCLUDED.cert_level,
  socials = EXCLUDED.socials,
  updated_at = NOW()
RETURNING
  user_id,
  bio,
  avatar_url,
  location,
  home_area,
  interests,
  cert_level,
  socials,
  updated_at;

-- name: SearchUsers :many
SELECT
  u.id AS user_id,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  COALESCE(p.home_area, p.location, '') AS location
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.id <> $1
  AND u.account_status = 'active'
  AND (
    lower(u.username) LIKE lower(sqlc.arg(q)) || '%'
    OR lower(u.display_name) LIKE '%' || lower(sqlc.arg(q)) || '%'
  )
ORDER BY
  CASE WHEN lower(u.username) LIKE lower(sqlc.arg(q)) || '%' THEN 0 ELSE 1 END,
  lower(u.display_name),
  lower(u.username)
LIMIT sqlc.arg(limit_rows);

-- name: ListSavedSitesForUser :many
SELECT
  s.id,
  s.slug,
  s.name,
  s.area,
  s.entry_difficulty,
  s.last_updated_at,
  COALESCE((
    SELECT
      COALESCE(
        NULLIF(u.note, ''),
        TRIM(BOTH ' ' FROM CONCAT(
          CASE WHEN u.condition_visibility_m IS NOT NULL THEN 'Vis ' || u.condition_visibility_m::text || 'm.' ELSE '' END,
          CASE WHEN u.condition_current IS NOT NULL THEN ' Current ' || u.condition_current || '.' ELSE '' END,
          CASE WHEN u.condition_waves IS NOT NULL THEN ' Waves ' || u.condition_waves || '.' ELSE '' END
        ))
      )
    FROM dive_site_updates u
    WHERE u.dive_site_id = s.id
      AND u.state = 'active'
    ORDER BY u.occurred_at DESC, u.id DESC
    LIMIT 1
  ), '') AS last_condition_summary,
  ss.created_at AS saved_at
FROM dive_site_saves ss
JOIN dive_sites s ON s.id = ss.dive_site_id
WHERE ss.app_user_id = sqlc.arg(app_user_id)
  AND s.moderation_state = 'approved'
ORDER BY ss.created_at DESC, s.id DESC;

-- name: ListSavedUsersForUser :many
WITH buddy_counts AS (
  SELECT app_user_id, COUNT(*)::bigint AS buddy_count
  FROM (
    SELECT app_user_id_a AS app_user_id FROM buddies
    UNION ALL
    SELECT app_user_id_b AS app_user_id FROM buddies
  ) pairs
  GROUP BY app_user_id
),
report_counts AS (
  SELECT target_app_user_id AS user_id, COUNT(*)::bigint AS report_count
  FROM reports
  WHERE target_app_user_id IS NOT NULL
  GROUP BY target_app_user_id
)
SELECT
  u.id AS user_id,
  u.username,
  u.display_name,
  u.email_verified,
  u.phone_verified,
  COALESCE(p.avatar_url, '') AS avatar_url,
  COALESCE(p.home_area, p.location, '') AS home_area,
  COALESCE(p.cert_level, '') AS cert_level,
  COALESCE(bc.buddy_count, 0)::bigint AS buddy_count,
  COALESCE(rc.report_count, 0)::bigint AS report_count,
  su.created_at AS saved_at
FROM saved_users su
JOIN users u ON u.id = su.saved_app_user_id
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN buddy_counts bc ON bc.app_user_id = u.id
LEFT JOIN report_counts rc ON rc.user_id = u.id
WHERE su.viewer_app_user_id = sqlc.arg(viewer_app_user_id)
  AND u.account_status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM user_blocks b
    WHERE (b.blocker_app_user_id = sqlc.arg(viewer_app_user_id) AND b.blocked_app_user_id = u.id)
       OR (b.blocker_app_user_id = u.id AND b.blocked_app_user_id = sqlc.arg(viewer_app_user_id))
  )
ORDER BY su.created_at DESC, u.id DESC;
