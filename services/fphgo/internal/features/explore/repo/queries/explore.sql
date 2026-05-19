-- name: ListSites :many
WITH latest_update AS (
  SELECT DISTINCT ON (u.dive_site_id)
    u.dive_site_id,
    u.note,
    u.condition_visibility_m,
    u.condition_current,
    u.condition_waves,
    u.occurred_at
  FROM dive_site_updates u
  WHERE u.state = 'active'
  ORDER BY u.dive_site_id, u.occurred_at DESC, u.id DESC
),
recent_update_counts AS (
  SELECT
    dive_site_id,
    COUNT(*)::bigint AS recent_update_count
  FROM dive_site_updates
  WHERE state = 'active'
    AND occurred_at >= NOW() - INTERVAL '7 days'
  GROUP BY dive_site_id
),
active_buddy_intents AS (
  SELECT
    bi.id,
    bi.dive_site_id,
    bi.area
  FROM buddy_intents bi
  JOIN users u ON u.id = bi.author_app_user_id
  LEFT JOIN dive_sites linked_site ON linked_site.id = bi.dive_site_id
  WHERE bi.state = 'active'
    AND bi.visibility = 'members'
    AND bi.expires_at > NOW()
    AND u.account_status = 'active'
    AND (bi.dive_site_id IS NULL OR linked_site.moderation_state = 'approved')
    AND (
      sqlc.arg(viewer_user_id)::uuid IS NULL
      OR (
        bi.author_app_user_id <> sqlc.arg(viewer_user_id)
        AND NOT EXISTS (
          SELECT 1
          FROM user_blocks ub
          WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = bi.author_app_user_id)
             OR (ub.blocker_app_user_id = bi.author_app_user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
        )
      )
    )
),
site_buddy_counts AS (
  SELECT
    dive_site_id,
    COUNT(*)::bigint AS site_buddy_intent_count
  FROM active_buddy_intents
  WHERE dive_site_id IS NOT NULL
  GROUP BY dive_site_id
),
area_buddy_counts AS (
  SELECT
    area,
    COUNT(*)::bigint AS area_buddy_intent_count
  FROM active_buddy_intents
  GROUP BY area
)
SELECT
  s.id,
  s.slug,
  s.name,
  s.area,
  s.latitude,
  s.longitude,
  s.description,
  s.entry_difficulty,
  s.depth_min_m,
  s.depth_max_m,
  s.hazards,
  s.verification_status,
  s.last_updated_at,
  COALESCE(rc.recent_update_count, 0)::bigint AS recent_update_count,
  COALESCE(sbc.site_buddy_intent_count, 0)::bigint AS active_site_buddy_intent_count,
  GREATEST(
    COALESCE(abc.area_buddy_intent_count, 0)::bigint - COALESCE(sbc.site_buddy_intent_count, 0)::bigint,
    0
  )::bigint AS active_area_buddy_intent_count,
  COALESCE(
    NULLIF(lu.note, ''),
    TRIM(BOTH ' ' FROM CONCAT(
      CASE WHEN lu.condition_visibility_m IS NOT NULL THEN 'Vis ' || lu.condition_visibility_m::text || 'm.' ELSE '' END,
      CASE WHEN lu.condition_current IS NOT NULL THEN ' Current ' || lu.condition_current || '.' ELSE '' END,
      CASE WHEN lu.condition_waves IS NOT NULL THEN ' Waves ' || lu.condition_waves || '.' ELSE '' END
    ))
  ) AS last_condition_summary,
  EXISTS (
    SELECT 1
    FROM dive_site_saves ss
    WHERE ss.dive_site_id = s.id
      AND ss.app_user_id = sqlc.arg(viewer_user_id)
  ) AS is_saved,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  EXISTS (
    SELECT 1
    FROM dive_site_likes viewer_like
    WHERE viewer_like.dive_site_id = s.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked
FROM dive_sites s
LEFT JOIN latest_update lu ON lu.dive_site_id = s.id
LEFT JOIN recent_update_counts rc ON rc.dive_site_id = s.id
LEFT JOIN site_buddy_counts sbc ON sbc.dive_site_id = s.id
LEFT JOIN area_buddy_counts abc ON abc.area = s.area
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM dive_site_likes dsl
  WHERE dsl.dive_site_id = s.id
) like_counts ON true
WHERE s.moderation_state = 'approved'
  AND (sqlc.arg(area_filter)::text = '' OR s.area = sqlc.arg(area_filter))
  AND (sqlc.arg(difficulty_filter)::text = '' OR s.entry_difficulty = sqlc.arg(difficulty_filter))
  AND (NOT sqlc.arg(verified_only)::bool OR s.verification_status IN ('verified', 'instructor', 'moderator'))
  AND (
    NOT sqlc.arg(saved_only)::bool
    OR EXISTS (
      SELECT 1
      FROM dive_site_saves saved_filter
      WHERE saved_filter.dive_site_id = s.id
        AND saved_filter.app_user_id = sqlc.arg(viewer_user_id)
    )
  )
  AND (
    sqlc.arg(search_text)::text = ''
    OR s.name ILIKE '%' || sqlc.arg(search_text) || '%'
    OR s.area ILIKE '%' || sqlc.arg(search_text) || '%'
  )
  AND (
    NOT sqlc.arg(has_bounds)::bool
    OR (
      s.latitude IS NOT NULL
      AND s.longitude IS NOT NULL
      AND s.latitude <= sqlc.arg(north)::double precision
      AND s.latitude >= sqlc.arg(south)::double precision
      AND s.longitude <= sqlc.arg(east)::double precision
      AND s.longitude >= sqlc.arg(west)::double precision
    )
  )
  AND (s.last_updated_at < sqlc.arg(cursor_updated_at) OR (s.last_updated_at = sqlc.arg(cursor_updated_at) AND s.id < sqlc.arg(cursor_id)))
ORDER BY s.last_updated_at DESC, s.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: GetSiteBySlug :one
WITH recent_update_counts AS (
  SELECT
    dive_site_id,
    COUNT(*)::bigint AS recent_update_count
  FROM dive_site_updates
  WHERE state = 'active'
  GROUP BY dive_site_id
),
latest_update AS (
  SELECT DISTINCT ON (u.dive_site_id)
    u.dive_site_id,
    u.note,
    u.condition_visibility_m,
    u.condition_current,
    u.condition_waves,
    u.occurred_at
  FROM dive_site_updates u
  WHERE u.state = 'active'
  ORDER BY u.dive_site_id, u.occurred_at DESC, u.id DESC
)
SELECT
  s.id,
  s.slug,
  s.name,
  s.area,
  s.latitude,
  s.longitude,
  s.description,
  s.entry_difficulty,
  s.depth_min_m,
  s.depth_max_m,
  s.hazards,
  s.best_season,
  s.typical_conditions,
  s.access,
  s.fees,
  s.contact_info,
  s.verification_status,
  s.verified_by_app_user_id,
  COALESCE(v.display_name, '') AS verified_by_display_name,
  s.last_updated_at,
  s.created_at,
  COALESCE(rc.recent_update_count, 0)::bigint AS report_count,
  COALESCE(
    NULLIF(lu.note, ''),
    TRIM(BOTH ' ' FROM CONCAT(
      CASE WHEN lu.condition_visibility_m IS NOT NULL THEN 'Vis ' || lu.condition_visibility_m::text || 'm.' ELSE '' END,
      CASE WHEN lu.condition_current IS NOT NULL THEN ' Current ' || lu.condition_current || '.' ELSE '' END,
      CASE WHEN lu.condition_waves IS NOT NULL THEN ' Waves ' || lu.condition_waves || '.' ELSE '' END
    ))
  ) AS last_condition_summary,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  EXISTS (
    SELECT 1
    FROM dive_site_likes viewer_like
    WHERE viewer_like.dive_site_id = s.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked
FROM dive_sites s
LEFT JOIN users v ON v.id = s.verified_by_app_user_id
LEFT JOIN recent_update_counts rc ON rc.dive_site_id = s.id
LEFT JOIN latest_update lu ON lu.dive_site_id = s.id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM dive_site_likes dsl
  WHERE dsl.dive_site_id = s.id
) like_counts ON true
WHERE s.slug = sqlc.arg(slug)
  AND s.moderation_state = 'approved';

-- name: GetVisibleDiveSiteLikeState :one
SELECT
  s.id,
  COALESCE(like_counts.like_count, 0)::bigint AS like_count,
  EXISTS (
    SELECT 1
    FROM dive_site_likes viewer_like
    WHERE viewer_like.dive_site_id = s.id
      AND viewer_like.user_id = sqlc.arg(viewer_user_id)
  ) AS viewer_has_liked
FROM dive_sites s
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS like_count
  FROM dive_site_likes dsl
  WHERE dsl.dive_site_id = s.id
) like_counts ON true
WHERE s.id = sqlc.arg(dive_site_id)
  AND s.moderation_state = 'approved';

-- name: LikeDiveSite :exec
INSERT INTO dive_site_likes (dive_site_id, user_id)
VALUES ($1, $2)
ON CONFLICT (dive_site_id, user_id) DO NOTHING;

-- name: UnlikeDiveSite :exec
DELETE FROM dive_site_likes
WHERE dive_site_id = $1
  AND user_id = $2;

-- name: CreateDivePresence :one
INSERT INTO dive_presences (
  user_id,
  dive_site_id,
  presence_type,
  start_at,
  end_at,
  visibility,
  contact_enabled,
  note
)
VALUES (
  sqlc.arg(user_id),
  sqlc.arg(dive_site_id),
  sqlc.arg(presence_type),
  sqlc.narg(start_at),
  sqlc.narg(end_at),
  sqlc.arg(visibility),
  sqlc.arg(contact_enabled),
  sqlc.narg(note)
)
RETURNING *;

-- name: UpdateDivePresenceByOwner :one
UPDATE dive_presences
SET
  presence_type = sqlc.arg(presence_type),
  start_at = sqlc.narg(start_at),
  end_at = sqlc.narg(end_at),
  visibility = sqlc.arg(visibility),
  contact_enabled = sqlc.arg(contact_enabled),
  note = sqlc.narg(note),
  updated_at = NOW()
WHERE id = sqlc.arg(presence_id)
  AND user_id = sqlc.arg(user_id)
  AND dive_site_id = sqlc.arg(dive_site_id)
RETURNING *;

-- name: CancelDivePresenceByOwner :execrows
UPDATE dive_presences
SET status = 'cancelled', updated_at = NOW()
WHERE id = sqlc.arg(presence_id)
  AND user_id = sqlc.arg(user_id)
  AND dive_site_id = sqlc.arg(dive_site_id)
  AND status <> 'cancelled';

-- name: ExpirePastDivePresences :exec
UPDATE dive_presences
SET status = 'expired', updated_at = NOW()
WHERE status = 'active'
  AND end_at IS NOT NULL
  AND end_at <= NOW();

-- name: CountActiveDivePresencesByUser :one
SELECT COUNT(*)::bigint
FROM dive_presences
WHERE user_id = sqlc.arg(user_id)
  AND status = 'active'
  AND (end_at IS NULL OR end_at > NOW());

-- name: ListCurrentUserDivePresences :many
SELECT
  dp.id,
  dp.user_id,
  dp.dive_site_id,
  dp.presence_type,
  dp.start_at,
  dp.end_at,
  dp.visibility,
  dp.contact_enabled,
  dp.note,
  dp.status,
  dp.created_at,
  dp.updated_at,
  s.slug AS dive_site_slug,
  s.name AS dive_site_name,
  s.area AS dive_site_area
FROM dive_presences dp
JOIN dive_sites s ON s.id = dp.dive_site_id
WHERE dp.user_id = sqlc.arg(user_id)
  AND s.moderation_state = 'approved'
ORDER BY dp.updated_at DESC, dp.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: ListVisibleDivePresencesGlobal :many
SELECT
  dp.id,
  dp.user_id,
  dp.dive_site_id,
  dp.presence_type,
  dp.start_at,
  dp.end_at,
  dp.visibility,
  dp.contact_enabled,
  dp.note,
  dp.status,
  dp.created_at,
  dp.updated_at,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  s.slug AS dive_site_slug,
  s.name AS dive_site_name,
  s.area AS dive_site_area,
  (
    dp.contact_enabled
    AND sqlc.arg(viewer_user_id)::uuid IS NOT NULL
    AND dp.user_id <> sqlc.arg(viewer_user_id)
  )::bool AS contact_allowed
FROM dive_presences dp
JOIN users u ON u.id = dp.user_id
JOIN profiles p ON p.user_id = dp.user_id
JOIN dive_sites s ON s.id = dp.dive_site_id
WHERE dp.status = 'active'
  AND (dp.end_at IS NULL OR dp.end_at > NOW())
  AND u.account_status = 'active'
  AND s.moderation_state = 'approved'
  AND (sqlc.arg(site_slug)::text = '' OR s.slug = sqlc.arg(site_slug))
  AND (sqlc.arg(area_filter)::text = '' OR s.area ILIKE '%' || sqlc.arg(area_filter) || '%')
  AND (sqlc.arg(presence_type_filter)::text = '' OR dp.presence_type = sqlc.arg(presence_type_filter))
  AND (
    NOT sqlc.arg(flexible_only)::bool
    OR (dp.start_at IS NULL AND dp.end_at IS NULL)
  )
  AND (
    (NOT sqlc.arg(has_date_from)::bool AND NOT sqlc.arg(has_date_to)::bool)
    OR (dp.start_at IS NULL AND dp.end_at IS NULL)
    OR (
      (NOT sqlc.arg(has_date_to)::bool OR COALESCE(dp.start_at, dp.end_at, dp.created_at) <= sqlc.arg(date_to))
      AND (NOT sqlc.arg(has_date_from)::bool OR COALESCE(dp.end_at, dp.start_at, dp.created_at) >= sqlc.arg(date_from))
    )
  )
  AND (
    (sqlc.arg(viewer_user_id)::uuid IS NULL AND dp.visibility = 'public')
    OR (
      sqlc.arg(viewer_user_id)::uuid IS NOT NULL
      AND (
        dp.visibility IN ('public', 'members')
        OR (dp.visibility = 'private' AND dp.user_id = sqlc.arg(viewer_user_id))
      )
    )
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR dp.user_id = sqlc.arg(viewer_user_id)
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = dp.user_id)
         OR (ub.blocker_app_user_id = dp.user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  )
ORDER BY COALESCE(dp.start_at, dp.created_at) ASC, dp.created_at DESC, dp.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: ListVisibleDivePresencesBySite :many
SELECT
  dp.id,
  dp.user_id,
  dp.dive_site_id,
  dp.presence_type,
  dp.start_at,
  dp.end_at,
  dp.visibility,
  dp.contact_enabled,
  dp.note,
  dp.status,
  dp.created_at,
  dp.updated_at,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  (
    dp.contact_enabled
    AND sqlc.arg(viewer_user_id)::uuid IS NOT NULL
    AND dp.user_id <> sqlc.arg(viewer_user_id)
  )::bool AS contact_allowed
FROM dive_presences dp
JOIN users u ON u.id = dp.user_id
JOIN profiles p ON p.user_id = dp.user_id
WHERE dp.dive_site_id = sqlc.arg(dive_site_id)
  AND dp.status = 'active'
  AND (dp.end_at IS NULL OR dp.end_at > NOW())
  AND u.account_status = 'active'
  AND (
    (sqlc.arg(viewer_user_id)::uuid IS NULL AND dp.visibility = 'public')
    OR (
      sqlc.arg(viewer_user_id)::uuid IS NOT NULL
      AND (
        dp.visibility IN ('public', 'members')
        OR (dp.visibility = 'private' AND dp.user_id = sqlc.arg(viewer_user_id))
      )
    )
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR dp.user_id = sqlc.arg(viewer_user_id)
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = dp.user_id)
         OR (ub.blocker_app_user_id = dp.user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  )
ORDER BY COALESCE(dp.start_at, dp.created_at) ASC, dp.created_at DESC, dp.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: CountVisibleDivePresencesBySite :one
SELECT COUNT(*)::bigint
FROM dive_presences dp
JOIN users u ON u.id = dp.user_id
WHERE dp.dive_site_id = sqlc.arg(dive_site_id)
  AND dp.status = 'active'
  AND (dp.end_at IS NULL OR dp.end_at > NOW())
  AND u.account_status = 'active'
  AND (
    (sqlc.arg(viewer_user_id)::uuid IS NULL AND dp.visibility = 'public')
    OR (
      sqlc.arg(viewer_user_id)::uuid IS NOT NULL
      AND (
        dp.visibility IN ('public', 'members')
        OR (dp.visibility = 'private' AND dp.user_id = sqlc.arg(viewer_user_id))
      )
    )
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR dp.user_id = sqlc.arg(viewer_user_id)
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = dp.user_id)
         OR (ub.blocker_app_user_id = dp.user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  );

-- name: UpsertDiveSiteAffinity :one
INSERT INTO user_dive_site_affinities (
  user_id,
  dive_site_id,
  relationship,
  visibility,
  contact_enabled,
  note
)
VALUES (
  sqlc.arg(user_id),
  sqlc.arg(dive_site_id),
  sqlc.arg(relationship),
  sqlc.arg(visibility),
  sqlc.arg(contact_enabled),
  sqlc.narg(note)
)
ON CONFLICT (user_id, dive_site_id, relationship) DO UPDATE SET
  visibility = EXCLUDED.visibility,
  contact_enabled = EXCLUDED.contact_enabled,
  note = EXCLUDED.note,
  updated_at = NOW()
RETURNING *;

-- name: UpdateDiveSiteAffinityByOwner :one
UPDATE user_dive_site_affinities
SET
  relationship = sqlc.arg(relationship),
  visibility = sqlc.arg(visibility),
  contact_enabled = sqlc.arg(contact_enabled),
  note = sqlc.narg(note),
  updated_at = NOW()
WHERE id = sqlc.arg(affinity_id)
  AND user_id = sqlc.arg(user_id)
  AND dive_site_id = sqlc.arg(dive_site_id)
RETURNING *;

-- name: DeleteDiveSiteAffinityByOwner :execrows
DELETE FROM user_dive_site_affinities
WHERE id = sqlc.arg(affinity_id)
  AND user_id = sqlc.arg(user_id)
  AND dive_site_id = sqlc.arg(dive_site_id);

-- name: ListCurrentUserDiveSiteAffinities :many
SELECT
  a.id,
  a.user_id,
  a.dive_site_id,
  a.relationship,
  a.visibility,
  a.contact_enabled,
  a.note,
  a.created_at,
  a.updated_at,
  s.slug AS dive_site_slug,
  s.name AS dive_site_name,
  s.area AS dive_site_area
FROM user_dive_site_affinities a
JOIN dive_sites s ON s.id = a.dive_site_id
WHERE a.user_id = sqlc.arg(user_id)
  AND s.moderation_state = 'approved'
ORDER BY a.updated_at DESC, a.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: ListVisibleDiveSiteAffinitiesBySite :many
SELECT
  a.id,
  a.user_id,
  a.dive_site_id,
  a.relationship,
  a.visibility,
  a.contact_enabled,
  a.note,
  a.created_at,
  a.updated_at,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  (
    a.contact_enabled
    AND sqlc.arg(viewer_user_id)::uuid IS NOT NULL
    AND a.user_id <> sqlc.arg(viewer_user_id)
  )::bool AS contact_allowed
FROM user_dive_site_affinities a
JOIN users u ON u.id = a.user_id
JOIN profiles p ON p.user_id = a.user_id
WHERE a.dive_site_id = sqlc.arg(dive_site_id)
  AND u.account_status = 'active'
  AND (
    (sqlc.arg(viewer_user_id)::uuid IS NULL AND a.visibility = 'public')
    OR (
      sqlc.arg(viewer_user_id)::uuid IS NOT NULL
      AND (
        a.visibility IN ('public', 'members')
        OR (a.visibility = 'private' AND a.user_id = sqlc.arg(viewer_user_id))
      )
    )
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR a.user_id = sqlc.arg(viewer_user_id)
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = a.user_id)
         OR (ub.blocker_app_user_id = a.user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  )
ORDER BY a.updated_at DESC, a.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: CountVisibleDiveSiteAffinitiesBySite :one
SELECT COUNT(*)::bigint
FROM user_dive_site_affinities a
JOIN users u ON u.id = a.user_id
WHERE a.dive_site_id = sqlc.arg(dive_site_id)
  AND u.account_status = 'active'
  AND (
    (sqlc.arg(viewer_user_id)::uuid IS NULL AND a.visibility = 'public')
    OR (
      sqlc.arg(viewer_user_id)::uuid IS NOT NULL
      AND (
        a.visibility IN ('public', 'members')
        OR (a.visibility = 'private' AND a.user_id = sqlc.arg(viewer_user_id))
      )
    )
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR a.user_id = sqlc.arg(viewer_user_id)
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = a.user_id)
         OR (ub.blocker_app_user_id = a.user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  );

-- name: UpsertDiveSiteReview :one
INSERT INTO dive_site_reviews (
  dive_site_id,
  user_id,
  rating,
  comment,
  visibility
)
VALUES (
  sqlc.arg(dive_site_id),
  sqlc.arg(user_id),
  sqlc.arg(rating),
  sqlc.narg(comment),
  sqlc.arg(visibility)
)
ON CONFLICT (dive_site_id, user_id) DO UPDATE SET
  rating = EXCLUDED.rating,
  comment = EXCLUDED.comment,
  visibility = EXCLUDED.visibility,
  status = 'active',
  updated_at = NOW()
RETURNING *;

-- name: ListVisibleDiveSiteReviewsBySite :many
SELECT
  r.id,
  r.dive_site_id,
  r.user_id,
  r.rating,
  r.comment,
  r.visibility,
  r.status,
  r.created_at,
  r.updated_at,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url
FROM dive_site_reviews r
JOIN users u ON u.id = r.user_id
JOIN profiles p ON p.user_id = r.user_id
WHERE r.dive_site_id = sqlc.arg(dive_site_id)
  AND r.status = 'active'
  AND u.account_status = 'active'
  AND (
    (sqlc.arg(viewer_user_id)::uuid IS NULL AND r.visibility = 'public')
    OR (
      sqlc.arg(viewer_user_id)::uuid IS NOT NULL
      AND (
        r.visibility IN ('public', 'members')
        OR (r.visibility = 'private' AND r.user_id = sqlc.arg(viewer_user_id))
      )
    )
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR r.user_id = sqlc.arg(viewer_user_id)
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = r.user_id)
         OR (ub.blocker_app_user_id = r.user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  )
ORDER BY r.updated_at DESC, r.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: CountVisibleDiveSiteReviewsBySite :one
SELECT COUNT(*)::bigint
FROM dive_site_reviews r
JOIN users u ON u.id = r.user_id
WHERE r.dive_site_id = sqlc.arg(dive_site_id)
  AND r.status = 'active'
  AND u.account_status = 'active'
  AND (
    (sqlc.arg(viewer_user_id)::uuid IS NULL AND r.visibility = 'public')
    OR (
      sqlc.arg(viewer_user_id)::uuid IS NOT NULL
      AND (
        r.visibility IN ('public', 'members')
        OR (r.visibility = 'private' AND r.user_id = sqlc.arg(viewer_user_id))
      )
    )
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR r.user_id = sqlc.arg(viewer_user_id)
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = r.user_id)
         OR (ub.blocker_app_user_id = r.user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  );

-- name: GetVisibleDiveSiteReviewSummaryBySite :one
SELECT
  COALESCE(AVG(r.rating), 0)::double precision AS average_rating,
  COUNT(*)::bigint AS review_count
FROM dive_site_reviews r
JOIN users u ON u.id = r.user_id
WHERE r.dive_site_id = sqlc.arg(dive_site_id)
  AND r.status = 'active'
  AND u.account_status = 'active'
  AND (
    (sqlc.arg(viewer_user_id)::uuid IS NULL AND r.visibility = 'public')
    OR (
      sqlc.arg(viewer_user_id)::uuid IS NOT NULL
      AND (
        r.visibility IN ('public', 'members')
        OR (r.visibility = 'private' AND r.user_id = sqlc.arg(viewer_user_id))
      )
    )
  )
  AND (
    sqlc.arg(viewer_user_id)::uuid IS NULL
    OR r.user_id = sqlc.arg(viewer_user_id)
    OR NOT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (ub.blocker_app_user_id = sqlc.arg(viewer_user_id) AND ub.blocked_app_user_id = r.user_id)
         OR (ub.blocker_app_user_id = r.user_id AND ub.blocked_app_user_id = sqlc.arg(viewer_user_id))
    )
  );

-- name: ListUpdatesForSite :many
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
  u.id,
  u.dive_site_id,
  u.author_app_user_id,
  COALESCE(author.display_name, '') AS author_display_name,
  author.email_verified,
  author.phone_verified,
  COALESCE(profile.cert_level, '') AS author_cert_level,
  COALESCE(bc.buddy_count, 0)::bigint AS author_buddy_count,
  COALESCE(rc.report_count, 0)::bigint AS author_report_count,
  u.note,
  u.condition_visibility_m,
  u.condition_current,
  u.condition_waves,
  u.condition_temp_c,
  u.occurred_at,
  u.created_at,
  u.state
FROM dive_site_updates u
JOIN users author ON author.id = u.author_app_user_id
LEFT JOIN profiles profile ON profile.user_id = u.author_app_user_id
LEFT JOIN buddy_counts bc ON bc.app_user_id = u.author_app_user_id
LEFT JOIN report_counts rc ON rc.user_id = u.author_app_user_id
WHERE u.dive_site_id = sqlc.arg(dive_site_id)
  AND u.state = 'active'
  AND (u.occurred_at < sqlc.arg(cursor_occurred_at) OR (u.occurred_at = sqlc.arg(cursor_occurred_at) AND u.id < sqlc.arg(cursor_id)))
ORDER BY u.occurred_at DESC, u.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: ListLatestUpdates :many
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
  u.id,
  u.dive_site_id,
  s.slug AS site_slug,
  s.name AS site_name,
  s.area AS site_area,
  u.author_app_user_id,
  COALESCE(author.display_name, '') AS author_display_name,
  author.email_verified,
  author.phone_verified,
  COALESCE(profile.cert_level, '') AS author_cert_level,
  COALESCE(bc.buddy_count, 0)::bigint AS author_buddy_count,
  COALESCE(rc.report_count, 0)::bigint AS author_report_count,
  u.note,
  u.condition_visibility_m,
  u.condition_current,
  u.condition_waves,
  u.condition_temp_c,
  u.occurred_at,
  u.created_at
FROM dive_site_updates u
JOIN dive_sites s ON s.id = u.dive_site_id
JOIN users author ON author.id = u.author_app_user_id
LEFT JOIN profiles profile ON profile.user_id = u.author_app_user_id
LEFT JOIN buddy_counts bc ON bc.app_user_id = u.author_app_user_id
LEFT JOIN report_counts rc ON rc.user_id = u.author_app_user_id
WHERE u.state = 'active'
  AND s.moderation_state = 'approved'
  AND (sqlc.arg(area_filter)::text = '' OR s.area = sqlc.arg(area_filter))
  AND (u.occurred_at < sqlc.arg(cursor_occurred_at) OR (u.occurred_at = sqlc.arg(cursor_occurred_at) AND u.id < sqlc.arg(cursor_id)))
ORDER BY u.occurred_at DESC, u.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: CreateUpdate :one
INSERT INTO dive_site_updates (
  dive_site_id,
  author_app_user_id,
  note,
  condition_visibility_m,
  condition_current,
  condition_waves,
  condition_temp_c,
  occurred_at
)
VALUES (
  sqlc.arg(dive_site_id),
  sqlc.arg(author_app_user_id),
  sqlc.arg(note),
  sqlc.narg(condition_visibility_m),
  sqlc.narg(condition_current),
  sqlc.narg(condition_waves),
  sqlc.narg(condition_temp_c),
  sqlc.arg(occurred_at)
)
RETURNING *;

-- name: TouchSiteLastUpdated :exec
UPDATE dive_sites
SET last_updated_at = GREATEST(last_updated_at, sqlc.arg(last_updated_at))
WHERE id = sqlc.arg(dive_site_id);

-- name: GetSiteForWrite :one
SELECT id, slug, name, area, moderation_state
FROM dive_sites
WHERE id = sqlc.arg(site_id);

-- name: SaveSite :exec
INSERT INTO dive_site_saves (app_user_id, dive_site_id)
VALUES (sqlc.arg(app_user_id), sqlc.arg(dive_site_id))
ON CONFLICT (app_user_id, dive_site_id) DO NOTHING;

-- name: UnsaveSite :exec
DELETE FROM dive_site_saves
WHERE app_user_id = sqlc.arg(app_user_id)
  AND dive_site_id = sqlc.arg(dive_site_id);

-- name: ListSavedSitesForUser :many
SELECT
  s.id,
  s.slug,
  s.name,
  s.area,
  s.latitude,
  s.longitude,
  s.entry_difficulty,
  s.depth_min_m,
  s.depth_max_m,
  s.hazards,
  s.verification_status,
  s.last_updated_at,
  TRUE AS is_saved
FROM dive_site_saves ss
JOIN dive_sites s ON s.id = ss.dive_site_id
WHERE ss.app_user_id = sqlc.arg(app_user_id)
  AND s.moderation_state = 'approved'
ORDER BY ss.created_at DESC, s.id DESC;

-- name: FindApprovedSiteDuplicate :one
SELECT id
FROM dive_sites
WHERE moderation_state = 'approved'
  AND lower(name) = lower(sqlc.arg(name))
  AND lower(area) = lower(sqlc.arg(area))
LIMIT 1;

-- name: SlugExists :one
SELECT EXISTS (
  SELECT 1
  FROM dive_sites
  WHERE slug = sqlc.arg(slug)
);

-- name: CreateSiteSubmission :one
INSERT INTO dive_sites (
  name,
  slug,
  area,
  latitude,
  longitude,
  description,
  entry_difficulty,
  depth_min_m,
  depth_max_m,
  hazards,
  best_season,
  typical_conditions,
  access,
  fees,
  contact_info,
  verification_status,
  submitted_by_app_user_id,
  moderation_state,
  last_updated_at,
  updated_at
)
VALUES (
  sqlc.arg(name),
  sqlc.arg(slug),
  sqlc.arg(area),
  sqlc.narg(latitude),
  sqlc.narg(longitude),
  sqlc.narg(description),
  sqlc.arg(entry_difficulty),
  sqlc.narg(depth_min_m),
  sqlc.narg(depth_max_m),
  sqlc.arg(hazards),
  sqlc.narg(best_season),
  sqlc.narg(typical_conditions),
  sqlc.narg(access),
  sqlc.narg(fees),
  sqlc.narg(contact_info),
  'community',
  sqlc.arg(submitted_by_app_user_id),
  'pending',
  NOW(),
  NOW()
)
RETURNING *;

-- name: ListMySiteSubmissions :many
SELECT
  s.id,
  s.slug,
  s.name,
  s.area,
  s.latitude,
  s.longitude,
  s.description,
  s.entry_difficulty,
  s.depth_min_m,
  s.depth_max_m,
  s.hazards,
  s.best_season,
  s.typical_conditions,
  s.access,
  s.fees,
  s.contact_info,
  s.verification_status,
  s.submitted_by_app_user_id,
  s.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  s.reviewed_at,
  s.moderation_reason,
  s.moderation_state,
  s.last_updated_at,
  s.updated_at,
  s.created_at
FROM dive_sites s
LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by_app_user_id
WHERE s.submitted_by_app_user_id = sqlc.arg(submitted_by_app_user_id)
  AND (s.created_at < sqlc.arg(cursor_created_at) OR (s.created_at = sqlc.arg(cursor_created_at) AND s.id < sqlc.arg(cursor_id)))
ORDER BY s.created_at DESC, s.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: GetMySiteSubmissionByID :one
SELECT
  s.id,
  s.slug,
  s.name,
  s.area,
  s.latitude,
  s.longitude,
  s.description,
  s.entry_difficulty,
  s.depth_min_m,
  s.depth_max_m,
  s.hazards,
  s.best_season,
  s.typical_conditions,
  s.access,
  s.fees,
  s.contact_info,
  s.verification_status,
  s.submitted_by_app_user_id,
  s.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  s.reviewed_at,
  s.moderation_reason,
  s.moderation_state,
  s.last_updated_at,
  s.updated_at,
  s.created_at
FROM dive_sites s
LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by_app_user_id
WHERE s.id = sqlc.arg(id)
  AND s.submitted_by_app_user_id = sqlc.arg(submitted_by_app_user_id);

-- name: ListPendingSites :many
SELECT
  s.id,
  s.slug,
  s.name,
  s.area,
  s.latitude,
  s.longitude,
  s.description,
  s.entry_difficulty,
  s.depth_min_m,
  s.depth_max_m,
  s.hazards,
  s.best_season,
  s.typical_conditions,
  s.access,
  s.fees,
  s.contact_info,
  s.verification_status,
  s.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  s.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  s.reviewed_at,
  s.moderation_reason,
  s.moderation_state,
  s.last_updated_at,
  s.updated_at,
  s.created_at
FROM dive_sites s
LEFT JOIN users submitter ON submitter.id = s.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by_app_user_id
WHERE s.moderation_state = 'pending'
  AND (s.created_at < sqlc.arg(cursor_created_at) OR (s.created_at = sqlc.arg(cursor_created_at) AND s.id < sqlc.arg(cursor_id)))
ORDER BY s.created_at DESC, s.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: GetSiteByIDForModeration :one
SELECT
  s.id,
  s.slug,
  s.name,
  s.area,
  s.latitude,
  s.longitude,
  s.description,
  s.entry_difficulty,
  s.depth_min_m,
  s.depth_max_m,
  s.hazards,
  s.best_season,
  s.typical_conditions,
  s.access,
  s.fees,
  s.contact_info,
  s.verification_status,
  s.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  s.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  s.reviewed_at,
  s.moderation_reason,
  s.moderation_state,
  s.last_updated_at,
  s.updated_at,
  s.created_at
FROM dive_sites s
LEFT JOIN users submitter ON submitter.id = s.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = s.reviewed_by_app_user_id
WHERE s.id = sqlc.arg(id);

-- name: ApproveSite :one
UPDATE dive_sites
SET slug = sqlc.arg(slug),
    moderation_state = 'approved',
    reviewed_by_app_user_id = sqlc.arg(reviewed_by_app_user_id),
    reviewed_at = sqlc.arg(reviewed_at),
    moderation_reason = sqlc.narg(moderation_reason),
    updated_at = NOW(),
    last_updated_at = GREATEST(last_updated_at, NOW())
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: RejectOrHideSite :one
UPDATE dive_sites
SET moderation_state = 'hidden',
    reviewed_by_app_user_id = sqlc.arg(reviewed_by_app_user_id),
    reviewed_at = sqlc.arg(reviewed_at),
    moderation_reason = sqlc.narg(moderation_reason),
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: CreateSiteEditProposal :one
WITH inserted AS (
  INSERT INTO dive_site_edit_proposals (
    dive_site_id,
    submitted_by_app_user_id,
    proposed_name,
    proposed_description,
    proposed_entry_difficulty,
    proposed_depth_min_m,
    proposed_depth_max_m,
    proposed_hazards,
    proposed_best_season,
    proposed_typical_conditions,
    proposed_access,
    proposed_fees
  )
  VALUES (
    sqlc.arg(dive_site_id),
    sqlc.arg(submitted_by_app_user_id),
    sqlc.arg(proposed_name),
    sqlc.arg(proposed_description),
    sqlc.arg(proposed_entry_difficulty),
    sqlc.narg(proposed_depth_min_m),
    sqlc.narg(proposed_depth_max_m),
    sqlc.arg(proposed_hazards),
    sqlc.arg(proposed_best_season),
    sqlc.arg(proposed_typical_conditions),
    sqlc.arg(proposed_access),
    sqlc.arg(proposed_fees)
  )
  RETURNING *
)
SELECT
  p.id,
  p.dive_site_id,
  s.slug AS site_slug,
  s.area AS site_area,
  p.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  p.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  p.reviewed_at,
  p.moderation_reason,
  p.state,
  s.name AS current_name,
  COALESCE(s.description, '') AS current_description,
  s.entry_difficulty AS current_entry_difficulty,
  s.depth_min_m AS current_depth_min_m,
  s.depth_max_m AS current_depth_max_m,
  s.hazards AS current_hazards,
  COALESCE(s.best_season, '') AS current_best_season,
  COALESCE(s.typical_conditions, '') AS current_typical_conditions,
  COALESCE(s.access, '') AS current_access,
  COALESCE(s.fees, '') AS current_fees,
  p.proposed_name,
  p.proposed_description,
  p.proposed_entry_difficulty,
  p.proposed_depth_min_m,
  p.proposed_depth_max_m,
  p.proposed_hazards,
  p.proposed_best_season,
  p.proposed_typical_conditions,
  p.proposed_access,
  p.proposed_fees,
  p.created_at,
  p.updated_at
FROM inserted p
JOIN dive_sites s ON s.id = p.dive_site_id
JOIN users submitter ON submitter.id = p.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_app_user_id;

-- name: ListMySiteEditProposals :many
SELECT
  p.id,
  p.dive_site_id,
  s.slug AS site_slug,
  s.area AS site_area,
  p.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  p.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  p.reviewed_at,
  p.moderation_reason,
  p.state,
  s.name AS current_name,
  COALESCE(s.description, '') AS current_description,
  s.entry_difficulty AS current_entry_difficulty,
  s.depth_min_m AS current_depth_min_m,
  s.depth_max_m AS current_depth_max_m,
  s.hazards AS current_hazards,
  COALESCE(s.best_season, '') AS current_best_season,
  COALESCE(s.typical_conditions, '') AS current_typical_conditions,
  COALESCE(s.access, '') AS current_access,
  COALESCE(s.fees, '') AS current_fees,
  p.proposed_name,
  p.proposed_description,
  p.proposed_entry_difficulty,
  p.proposed_depth_min_m,
  p.proposed_depth_max_m,
  p.proposed_hazards,
  p.proposed_best_season,
  p.proposed_typical_conditions,
  p.proposed_access,
  p.proposed_fees,
  p.created_at,
  p.updated_at
FROM dive_site_edit_proposals p
JOIN dive_sites s ON s.id = p.dive_site_id
JOIN users submitter ON submitter.id = p.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_app_user_id
WHERE p.submitted_by_app_user_id = sqlc.arg(submitted_by_app_user_id)
  AND (p.created_at < sqlc.arg(cursor_created_at) OR (p.created_at = sqlc.arg(cursor_created_at) AND p.id < sqlc.arg(cursor_id)))
ORDER BY p.created_at DESC, p.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: GetMySiteEditProposalByID :one
SELECT
  p.id,
  p.dive_site_id,
  s.slug AS site_slug,
  s.area AS site_area,
  p.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  p.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  p.reviewed_at,
  p.moderation_reason,
  p.state,
  s.name AS current_name,
  COALESCE(s.description, '') AS current_description,
  s.entry_difficulty AS current_entry_difficulty,
  s.depth_min_m AS current_depth_min_m,
  s.depth_max_m AS current_depth_max_m,
  s.hazards AS current_hazards,
  COALESCE(s.best_season, '') AS current_best_season,
  COALESCE(s.typical_conditions, '') AS current_typical_conditions,
  COALESCE(s.access, '') AS current_access,
  COALESCE(s.fees, '') AS current_fees,
  p.proposed_name,
  p.proposed_description,
  p.proposed_entry_difficulty,
  p.proposed_depth_min_m,
  p.proposed_depth_max_m,
  p.proposed_hazards,
  p.proposed_best_season,
  p.proposed_typical_conditions,
  p.proposed_access,
  p.proposed_fees,
  p.created_at,
  p.updated_at
FROM dive_site_edit_proposals p
JOIN dive_sites s ON s.id = p.dive_site_id
JOIN users submitter ON submitter.id = p.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_app_user_id
WHERE p.id = sqlc.arg(id)
  AND p.submitted_by_app_user_id = sqlc.arg(submitted_by_app_user_id);

-- name: ListPendingSiteEditProposals :many
SELECT
  p.id,
  p.dive_site_id,
  s.slug AS site_slug,
  s.area AS site_area,
  p.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  p.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  p.reviewed_at,
  p.moderation_reason,
  p.state,
  s.name AS current_name,
  COALESCE(s.description, '') AS current_description,
  s.entry_difficulty AS current_entry_difficulty,
  s.depth_min_m AS current_depth_min_m,
  s.depth_max_m AS current_depth_max_m,
  s.hazards AS current_hazards,
  COALESCE(s.best_season, '') AS current_best_season,
  COALESCE(s.typical_conditions, '') AS current_typical_conditions,
  COALESCE(s.access, '') AS current_access,
  COALESCE(s.fees, '') AS current_fees,
  p.proposed_name,
  p.proposed_description,
  p.proposed_entry_difficulty,
  p.proposed_depth_min_m,
  p.proposed_depth_max_m,
  p.proposed_hazards,
  p.proposed_best_season,
  p.proposed_typical_conditions,
  p.proposed_access,
  p.proposed_fees,
  p.created_at,
  p.updated_at
FROM dive_site_edit_proposals p
JOIN dive_sites s ON s.id = p.dive_site_id
JOIN users submitter ON submitter.id = p.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_app_user_id
WHERE p.state = 'pending'
  AND s.moderation_state = 'approved'
  AND (p.created_at < sqlc.arg(cursor_created_at) OR (p.created_at = sqlc.arg(cursor_created_at) AND p.id < sqlc.arg(cursor_id)))
ORDER BY p.created_at DESC, p.id DESC
LIMIT sqlc.arg(limit_rows);

-- name: GetSiteEditProposalForModeration :one
SELECT
  p.id,
  p.dive_site_id,
  s.slug AS site_slug,
  s.area AS site_area,
  p.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  p.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  p.reviewed_at,
  p.moderation_reason,
  p.state,
  s.name AS current_name,
  COALESCE(s.description, '') AS current_description,
  s.entry_difficulty AS current_entry_difficulty,
  s.depth_min_m AS current_depth_min_m,
  s.depth_max_m AS current_depth_max_m,
  s.hazards AS current_hazards,
  COALESCE(s.best_season, '') AS current_best_season,
  COALESCE(s.typical_conditions, '') AS current_typical_conditions,
  COALESCE(s.access, '') AS current_access,
  COALESCE(s.fees, '') AS current_fees,
  p.proposed_name,
  p.proposed_description,
  p.proposed_entry_difficulty,
  p.proposed_depth_min_m,
  p.proposed_depth_max_m,
  p.proposed_hazards,
  p.proposed_best_season,
  p.proposed_typical_conditions,
  p.proposed_access,
  p.proposed_fees,
  p.created_at,
  p.updated_at
FROM dive_site_edit_proposals p
JOIN dive_sites s ON s.id = p.dive_site_id
JOIN users submitter ON submitter.id = p.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_app_user_id
WHERE p.id = sqlc.arg(id);

-- name: ApplySiteEditProposal :one
WITH proposal AS (
  UPDATE dive_site_edit_proposals p
  SET state = 'applied',
      reviewed_by_app_user_id = sqlc.arg(reviewed_by_app_user_id),
      reviewed_at = sqlc.arg(reviewed_at),
      moderation_reason = sqlc.narg(moderation_reason),
      updated_at = NOW()
  WHERE p.id = sqlc.arg(id)
    AND p.state = 'pending'
    AND EXISTS (
      SELECT 1
      FROM dive_sites s
      WHERE s.id = p.dive_site_id
        AND s.moderation_state = 'approved'
    )
  RETURNING *
),
updated_site AS (
  UPDATE dive_sites s
  SET name = p.proposed_name,
      description = p.proposed_description,
      entry_difficulty = p.proposed_entry_difficulty,
      depth_min_m = p.proposed_depth_min_m,
      depth_max_m = p.proposed_depth_max_m,
      hazards = p.proposed_hazards,
      best_season = NULLIF(p.proposed_best_season, ''),
      typical_conditions = NULLIF(p.proposed_typical_conditions, ''),
      access = NULLIF(p.proposed_access, ''),
      fees = NULLIF(p.proposed_fees, ''),
      updated_at = NOW(),
      last_updated_at = GREATEST(s.last_updated_at, NOW())
  FROM proposal p
  WHERE s.id = p.dive_site_id
    AND s.moderation_state = 'approved'
  RETURNING s.*
)
SELECT
  p.id,
  p.dive_site_id,
  s.slug AS site_slug,
  s.area AS site_area,
  p.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  p.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  p.reviewed_at,
  p.moderation_reason,
  p.state,
  s.name AS current_name,
  COALESCE(s.description, '') AS current_description,
  s.entry_difficulty AS current_entry_difficulty,
  s.depth_min_m AS current_depth_min_m,
  s.depth_max_m AS current_depth_max_m,
  s.hazards AS current_hazards,
  COALESCE(s.best_season, '') AS current_best_season,
  COALESCE(s.typical_conditions, '') AS current_typical_conditions,
  COALESCE(s.access, '') AS current_access,
  COALESCE(s.fees, '') AS current_fees,
  p.proposed_name,
  p.proposed_description,
  p.proposed_entry_difficulty,
  p.proposed_depth_min_m,
  p.proposed_depth_max_m,
  p.proposed_hazards,
  p.proposed_best_season,
  p.proposed_typical_conditions,
  p.proposed_access,
  p.proposed_fees,
  p.created_at,
  p.updated_at
FROM proposal p
JOIN updated_site s ON s.id = p.dive_site_id
JOIN users submitter ON submitter.id = p.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_app_user_id;

-- name: RejectSiteEditProposal :one
WITH proposal AS (
  UPDATE dive_site_edit_proposals p
  SET state = 'rejected',
      reviewed_by_app_user_id = sqlc.arg(reviewed_by_app_user_id),
      reviewed_at = sqlc.arg(reviewed_at),
      moderation_reason = sqlc.narg(moderation_reason),
      updated_at = NOW()
  WHERE p.id = sqlc.arg(id)
    AND p.state = 'pending'
  RETURNING *
)
SELECT
  p.id,
  p.dive_site_id,
  s.slug AS site_slug,
  s.area AS site_area,
  p.submitted_by_app_user_id,
  COALESCE(submitter.display_name, '') AS submitted_by_display_name,
  p.reviewed_by_app_user_id,
  COALESCE(reviewer.display_name, '') AS reviewed_by_display_name,
  p.reviewed_at,
  p.moderation_reason,
  p.state,
  s.name AS current_name,
  COALESCE(s.description, '') AS current_description,
  s.entry_difficulty AS current_entry_difficulty,
  s.depth_min_m AS current_depth_min_m,
  s.depth_max_m AS current_depth_max_m,
  s.hazards AS current_hazards,
  COALESCE(s.best_season, '') AS current_best_season,
  COALESCE(s.typical_conditions, '') AS current_typical_conditions,
  COALESCE(s.access, '') AS current_access,
  COALESCE(s.fees, '') AS current_fees,
  p.proposed_name,
  p.proposed_description,
  p.proposed_entry_difficulty,
  p.proposed_depth_min_m,
  p.proposed_depth_max_m,
  p.proposed_hazards,
  p.proposed_best_season,
  p.proposed_typical_conditions,
  p.proposed_access,
  p.proposed_fees,
  p.created_at,
  p.updated_at
FROM proposal p
JOIN dive_sites s ON s.id = p.dive_site_id
JOIN users submitter ON submitter.id = p.submitted_by_app_user_id
LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_app_user_id;
