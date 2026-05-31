-- name: GetJourneyEntryByID :one
SELECT
  id,
  user_id,
  type,
  title,
  body,
  dive_site_id,
  source_type,
  source_id,
  cover_media_id,
  visibility,
  state,
  occurred_at,
  hidden_at,
  deleted_at,
  created_at,
  updated_at
FROM journey_entries
WHERE id = $1;

-- name: GetJourneyOwnerByUsername :one
SELECT
  u.id,
  COALESCE(NULLIF(sqlc.arg(viewer_user_id), '')::uuid = u.id, false)::boolean AS viewer_is_self,
  COALESCE((
    SELECT EXISTS (
      SELECT 1
      FROM saved_users su
      WHERE su.viewer_app_user_id = NULLIF(sqlc.arg(viewer_user_id), '')::uuid
        AND su.saved_app_user_id = u.id
    )
  ), false)::boolean AS viewer_follows,
  COALESCE((
    SELECT EXISTS (
      SELECT 1
      FROM user_blocks ub
      WHERE (
          ub.blocker_app_user_id = NULLIF(sqlc.arg(viewer_user_id), '')::uuid
          AND ub.blocked_app_user_id = u.id
        )
        OR (
          ub.blocker_app_user_id = u.id
          AND ub.blocked_app_user_id = NULLIF(sqlc.arg(viewer_user_id), '')::uuid
        )
    )
  ), false)::boolean AS blocked
FROM users u
WHERE lower(u.username) = lower(sqlc.arg(username))
  AND u.account_status = 'active'
LIMIT 1;

-- name: ListJourneyEntriesForProfile :many
SELECT
  id,
  user_id,
  type,
  title,
  body,
  dive_site_id,
  source_type,
  source_id,
  cover_media_id,
  visibility,
  state,
  occurred_at,
  hidden_at,
  deleted_at,
  created_at,
  updated_at
FROM journey_entries
WHERE user_id = sqlc.arg(target_user_id)
  AND state = 'active'
  AND (
    visibility = 'public'
    OR (sqlc.arg(viewer_is_self)::boolean AND visibility = 'private')
    OR ((sqlc.arg(viewer_is_self)::boolean OR sqlc.arg(viewer_follows)::boolean) AND visibility = 'followers')
  )
ORDER BY occurred_at DESC, id DESC
LIMIT sqlc.arg(result_limit);

-- name: CreateManualJourneyEntry :one
INSERT INTO journey_entries (
  user_id,
  type,
  title,
  body,
  dive_site_id,
  visibility,
  occurred_at
)
VALUES (
  $1,
  'custom',
  $2,
  $3,
  $4,
  $5,
  $6
)
RETURNING
  id,
  user_id,
  type,
  title,
  body,
  dive_site_id,
  source_type,
  source_id,
  cover_media_id,
  visibility,
  state,
  occurred_at,
  hidden_at,
  deleted_at,
  created_at,
  updated_at;

-- name: UpsertGeneratedJourneyEntry :one
INSERT INTO journey_entries (
  user_id,
  type,
  title,
  body,
  dive_site_id,
  source_type,
  source_id,
  visibility,
  occurred_at
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9
)
ON CONFLICT (user_id, source_type, source_id, type)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL
DO UPDATE
SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  dive_site_id = EXCLUDED.dive_site_id,
  visibility = EXCLUDED.visibility,
  occurred_at = EXCLUDED.occurred_at,
  state = 'active',
  hidden_at = NULL,
  deleted_at = NULL,
  updated_at = NOW()
RETURNING
  id,
  user_id,
  type,
  title,
  body,
  dive_site_id,
  source_type,
  source_id,
  cover_media_id,
  visibility,
  state,
  occurred_at,
  hidden_at,
  deleted_at,
  created_at,
  updated_at;

-- name: UpdateManualJourneyEntry :one
UPDATE journey_entries
SET
  title = $3,
  body = $4,
  dive_site_id = $5,
  visibility = $6,
  occurred_at = $7,
  updated_at = NOW()
WHERE id = $1
  AND user_id = $2
  AND type = 'custom'
  AND source_type IS NULL
  AND source_id IS NULL
  AND state = 'active'
RETURNING
  id,
  user_id,
  type,
  title,
  body,
  dive_site_id,
  source_type,
  source_id,
  cover_media_id,
  visibility,
  state,
  occurred_at,
  hidden_at,
  deleted_at,
  created_at,
  updated_at;

-- name: SoftDeleteManualJourneyEntry :execrows
UPDATE journey_entries
SET
  state = 'deleted',
  deleted_at = NOW(),
  updated_at = NOW()
WHERE id = $1
  AND user_id = $2
  AND type = 'custom'
  AND source_type IS NULL
  AND source_id IS NULL
  AND state = 'active';

-- name: HideGeneratedJourneyEntry :execrows
UPDATE journey_entries
SET
  state = 'hidden',
  hidden_at = NOW(),
  updated_at = NOW()
WHERE user_id = $1
  AND type = $2
  AND source_type = $3
  AND source_id = $4
  AND source_type IS NOT NULL
  AND source_id IS NOT NULL
  AND state = 'active';
