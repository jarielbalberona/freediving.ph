-- name: CreateDiveMemory :one
INSERT INTO dive_memories (
  author_user_id,
  dive_site_id,
  title,
  body,
  visibility,
  occurred_at
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
RETURNING
  id,
  author_user_id,
  dive_site_id,
  title,
  body,
  visibility,
  occurred_at,
  deleted_at,
  created_at,
  updated_at;

-- name: GetDiveMemoryByID :one
SELECT
  id,
  author_user_id,
  dive_site_id,
  title,
  body,
  visibility,
  occurred_at,
  deleted_at,
  created_at,
  updated_at
FROM dive_memories
WHERE id = $1;

-- name: UpdateDiveMemory :one
UPDATE dive_memories
SET
  dive_site_id = $3,
  title = $4,
  body = $5,
  visibility = $6,
  occurred_at = $7,
  updated_at = NOW()
WHERE id = $1
  AND author_user_id = $2
  AND deleted_at IS NULL
RETURNING
  id,
  author_user_id,
  dive_site_id,
  title,
  body,
  visibility,
  occurred_at,
  deleted_at,
  created_at,
  updated_at;

-- name: SoftDeleteDiveMemory :execrows
UPDATE dive_memories
SET
  deleted_at = NOW(),
  updated_at = NOW()
WHERE id = $1
  AND author_user_id = $2
  AND deleted_at IS NULL;

-- name: ListOwnDiveMemories :many
SELECT
  id,
  author_user_id,
  dive_site_id,
  title,
  body,
  visibility,
  occurred_at,
  deleted_at,
  created_at,
  updated_at
FROM dive_memories
WHERE author_user_id = sqlc.arg(author_user_id)
  AND deleted_at IS NULL
ORDER BY occurred_at DESC, id DESC
LIMIT sqlc.arg(result_limit);

-- name: GetMemoryOwnerByUsername :one
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

-- name: ListVisibleDiveMemoriesForProfile :many
SELECT
  dm.id,
  dm.author_user_id,
  dm.dive_site_id,
  dm.title,
  dm.body,
  dm.visibility,
  dm.occurred_at,
  dm.deleted_at,
  dm.created_at,
  dm.updated_at
FROM dive_memories dm
WHERE dm.author_user_id = sqlc.arg(target_user_id)
  AND dm.deleted_at IS NULL
  AND (
    dm.visibility = 'public'
    OR (sqlc.arg(viewer_is_self)::boolean AND dm.visibility IN ('private', 'followers', 'tagged'))
    OR ((sqlc.arg(viewer_is_self)::boolean OR sqlc.arg(viewer_follows)::boolean) AND dm.visibility = 'followers')
    OR (
      dm.visibility = 'tagged'
      AND EXISTS (
        SELECT 1
        FROM dive_memory_tagged_users dmtu
        WHERE dmtu.memory_id = dm.id
          AND dmtu.tagged_user_id = NULLIF(sqlc.arg(viewer_user_id), '')::uuid
          AND dmtu.status = 'accepted'
      )
    )
  )
ORDER BY dm.occurred_at DESC, dm.id DESC
LIMIT sqlc.arg(result_limit);

-- name: ListDiveMemoriesForOwnedMapSite :many
SELECT
  dm.id,
  dm.author_user_id,
  dm.dive_site_id,
  dm.title,
  dm.body,
  dm.visibility,
  dm.occurred_at,
  dm.deleted_at,
  dm.created_at,
  dm.updated_at
FROM dive_memories dm
WHERE dm.author_user_id = sqlc.arg(author_user_id)
  AND dm.dive_site_id = sqlc.arg(dive_site_id)
  AND dm.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM user_dive_sites uds
    WHERE uds.user_id = dm.author_user_id
      AND uds.dive_site_id = dm.dive_site_id
  )
ORDER BY dm.occurred_at DESC, dm.id DESC
LIMIT sqlc.arg(result_limit);

-- name: DeleteDiveMemoryMedia :execrows
DELETE FROM dive_memory_media
WHERE memory_id = $1
  AND EXISTS (
    SELECT 1
    FROM dive_memories dm
    WHERE dm.id = dive_memory_media.memory_id
      AND dm.author_user_id = $2
      AND dm.deleted_at IS NULL
  );

-- name: AddDiveMemoryMedia :one
INSERT INTO dive_memory_media (
  memory_id,
  media_id,
  sort_order
)
VALUES (
  $1,
  $2,
  $3
)
ON CONFLICT (memory_id, media_id) DO UPDATE
SET sort_order = EXCLUDED.sort_order
RETURNING
  id,
  memory_id,
  media_id,
  sort_order,
  created_at;

-- name: ListDiveMemoryMedia :many
SELECT
  id,
  memory_id,
  media_id,
  sort_order,
  created_at
FROM dive_memory_media
WHERE memory_id = $1
ORDER BY sort_order ASC, id ASC;

-- name: UpsertDiveMemoryTag :one
INSERT INTO dive_memory_tagged_users (
  memory_id,
  tagged_user_id,
  status
)
VALUES (
  $1,
  $2,
  'pending'
)
ON CONFLICT (memory_id, tagged_user_id) DO UPDATE
SET
  status = CASE
    WHEN dive_memory_tagged_users.status = 'hidden' THEN dive_memory_tagged_users.status
    ELSE 'pending'
  END,
  updated_at = NOW()
RETURNING
  id,
  memory_id,
  tagged_user_id,
  status,
  created_at,
  updated_at;

-- name: UpdateDiveMemoryTagStatus :one
UPDATE dive_memory_tagged_users
SET
  status = $3,
  updated_at = NOW()
WHERE memory_id = $1
  AND tagged_user_id = $2
RETURNING
  id,
  memory_id,
  tagged_user_id,
  status,
  created_at,
  updated_at;

-- name: ListDiveMemoryTags :many
SELECT
  id,
  memory_id,
  tagged_user_id,
  status,
  created_at,
  updated_at
FROM dive_memory_tagged_users
WHERE memory_id = $1
ORDER BY created_at ASC, id ASC;

-- name: DeleteDiveMemoryTag :execrows
DELETE FROM dive_memory_tagged_users
WHERE memory_id = $1
  AND tagged_user_id = $2;

-- name: HasBlockBetweenUsers :one
SELECT EXISTS (
  SELECT 1
  FROM user_blocks ub
  WHERE (
      ub.blocker_app_user_id = $1
      AND ub.blocked_app_user_id = $2
    )
    OR (
      ub.blocker_app_user_id = $2
      AND ub.blocked_app_user_id = $1
    )
)::boolean;

-- name: ListMemoryTagsForTaggedUser :many
SELECT
  dmtu.id,
  dmtu.memory_id,
  dmtu.tagged_user_id,
  dmtu.status,
  dmtu.created_at,
  dmtu.updated_at
FROM dive_memory_tagged_users dmtu
JOIN dive_memories dm ON dm.id = dmtu.memory_id
WHERE dmtu.tagged_user_id = sqlc.arg(tagged_user_id)
  AND dm.deleted_at IS NULL
  AND (
    sqlc.arg(status_filter) = ''
    OR dmtu.status = sqlc.arg(status_filter)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM user_blocks ub
    WHERE (
        ub.blocker_app_user_id = dmtu.tagged_user_id
        AND ub.blocked_app_user_id = dm.author_user_id
      )
      OR (
        ub.blocker_app_user_id = dm.author_user_id
        AND ub.blocked_app_user_id = dmtu.tagged_user_id
      )
  )
ORDER BY dmtu.created_at DESC, dmtu.id DESC
LIMIT sqlc.arg(result_limit);
