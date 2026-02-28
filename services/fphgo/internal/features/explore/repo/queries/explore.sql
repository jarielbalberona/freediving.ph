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
)
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
  COALESCE(rc.recent_update_count, 0)::bigint AS recent_update_count,
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
  ) AS is_saved
FROM dive_sites s
LEFT JOIN latest_update lu ON lu.dive_site_id = s.id
LEFT JOIN recent_update_counts rc ON rc.dive_site_id = s.id
WHERE s.moderation_state = 'approved'
  AND (sqlc.arg(area_filter)::text = '' OR s.area = sqlc.arg(area_filter))
  AND (sqlc.arg(difficulty_filter)::text = '' OR s.entry_difficulty = sqlc.arg(difficulty_filter))
  AND (NOT sqlc.arg(verified_only)::bool OR s.verification_status IN ('verified', 'instructor', 'moderator'))
  AND (
    sqlc.arg(search_text)::text = ''
    OR s.name ILIKE '%' || sqlc.arg(search_text) || '%'
    OR s.area ILIKE '%' || sqlc.arg(search_text) || '%'
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
  ) AS last_condition_summary
FROM dive_sites s
LEFT JOIN users v ON v.id = s.verified_by_app_user_id
LEFT JOIN recent_update_counts rc ON rc.dive_site_id = s.id
LEFT JOIN latest_update lu ON lu.dive_site_id = s.id
WHERE s.slug = sqlc.arg(slug)
  AND s.moderation_state = 'approved';

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
