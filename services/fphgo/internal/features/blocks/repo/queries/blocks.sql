-- name: CreateBlock :exec
INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id)
VALUES ($1, $2)
ON CONFLICT (blocker_app_user_id, blocked_app_user_id) DO NOTHING;

-- name: DeleteBlock :exec
DELETE FROM user_blocks
WHERE blocker_app_user_id = $1 AND blocked_app_user_id = $2;

-- name: ListBlocksByBlocker :many
SELECT
  b.blocked_app_user_id,
  b.created_at,
  u.username,
  u.display_name,
  p.avatar_url
FROM user_blocks b
JOIN users u ON u.id = b.blocked_app_user_id
LEFT JOIN profiles p ON p.user_id = u.id
WHERE b.blocker_app_user_id = $1
  AND (b.created_at < $2 OR (b.created_at = $2 AND b.blocked_app_user_id < $3))
ORDER BY b.created_at DESC, b.blocked_app_user_id DESC
LIMIT $4;

-- name: IsBlockedEitherDirection :one
SELECT EXISTS (
  SELECT 1
  FROM user_blocks
  WHERE (blocker_app_user_id = $1 AND blocked_app_user_id = $2)
     OR (blocker_app_user_id = $2 AND blocked_app_user_id = $1)
);

-- name: ListBlockedUserIDs :many
SELECT blocked_app_user_id
FROM user_blocks
WHERE blocker_app_user_id = $1;

-- name: ListUsersWhoBlockedMe :many
SELECT blocker_app_user_id
FROM user_blocks
WHERE blocked_app_user_id = $1;
