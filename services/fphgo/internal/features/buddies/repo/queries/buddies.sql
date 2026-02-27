-- name: UserExists :one
SELECT EXISTS (
  SELECT 1 FROM users WHERE id = $1
);

-- name: IsBlockedEitherDirection :one
SELECT EXISTS (
  SELECT 1
  FROM user_blocks
  WHERE (blocker_app_user_id = $1 AND blocked_app_user_id = $2)
     OR (blocker_app_user_id = $2 AND blocked_app_user_id = $1)
);

-- name: AreBuddies :one
SELECT EXISTS (
  SELECT 1
  FROM buddies
WHERE app_user_id_a = LEAST($1, $2)
  AND app_user_id_b = GREATEST($1, $2)
);

-- name: GetPendingRequestBetweenUsers :one
SELECT id, requester_app_user_id, target_app_user_id, status, created_at, updated_at
FROM buddy_requests
WHERE status = 'pending'
  AND (
    (requester_app_user_id = $1 AND target_app_user_id = $2)
    OR
    (requester_app_user_id = $2 AND target_app_user_id = $1)
  )
LIMIT 1;

-- name: CreateBuddyRequest :one
INSERT INTO buddy_requests (
  requester_app_user_id,
  target_app_user_id,
  status
)
VALUES ($1, $2, 'pending')
ON CONFLICT (requester_app_user_id, target_app_user_id)
WHERE status = 'pending'
DO UPDATE SET updated_at = NOW()
RETURNING id, requester_app_user_id, target_app_user_id, status, created_at, updated_at;

-- name: GetBuddyRequestByID :one
SELECT id, requester_app_user_id, target_app_user_id, status, created_at, updated_at
FROM buddy_requests
WHERE id = $1;

-- name: UpdateBuddyRequestStatus :exec
UPDATE buddy_requests
SET status = $2, updated_at = NOW()
WHERE id = $1;

-- name: CreateBuddyPair :exec
INSERT INTO buddies (app_user_id_a, app_user_id_b)
VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid))
ON CONFLICT (app_user_id_a, app_user_id_b) DO NOTHING;

-- name: DeleteBuddyPair :exec
DELETE FROM buddies
WHERE app_user_id_a = LEAST($1::uuid, $2::uuid)
  AND app_user_id_b = GREATEST($1::uuid, $2::uuid);

-- name: ListIncomingBuddyRequests :many
SELECT
  r.id,
  r.requester_app_user_id,
  r.target_app_user_id,
  r.status,
  r.created_at,
  r.updated_at,
  u.username,
  u.display_name,
  p.avatar_url
FROM buddy_requests r
JOIN users u ON u.id = r.requester_app_user_id
LEFT JOIN profiles p ON p.user_id = u.id
WHERE r.target_app_user_id = $1
  AND r.status = 'pending'
  AND u.account_status <> 'suspended'
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_app_user_id = $1 AND ub.blocked_app_user_id = r.requester_app_user_id)
       OR (ub.blocker_app_user_id = r.requester_app_user_id AND ub.blocked_app_user_id = $1)
  )
ORDER BY r.created_at DESC;

-- name: ListOutgoingBuddyRequests :many
SELECT
  r.id,
  r.requester_app_user_id,
  r.target_app_user_id,
  r.status,
  r.created_at,
  r.updated_at,
  u.username,
  u.display_name,
  p.avatar_url
FROM buddy_requests r
JOIN users u ON u.id = r.target_app_user_id
LEFT JOIN profiles p ON p.user_id = u.id
WHERE r.requester_app_user_id = $1
  AND r.status = 'pending'
  AND u.account_status <> 'suspended'
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_app_user_id = $1 AND ub.blocked_app_user_id = r.target_app_user_id)
       OR (ub.blocker_app_user_id = r.target_app_user_id AND ub.blocked_app_user_id = $1)
  )
ORDER BY r.created_at DESC;

-- name: ListBuddies :many
SELECT
  CASE
    WHEN b.app_user_id_a = $1 THEN b.app_user_id_b
    ELSE b.app_user_id_a
  END::uuid AS buddy_user_id,
  b.created_at,
  u.username,
  u.display_name,
  p.avatar_url
FROM buddies b
JOIN users u ON u.id = CASE
  WHEN b.app_user_id_a = $1 THEN b.app_user_id_b
  ELSE b.app_user_id_a
END
LEFT JOIN profiles p ON p.user_id = u.id
WHERE (b.app_user_id_a = $1 OR b.app_user_id_b = $1)
  AND u.account_status <> 'suspended'
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_app_user_id = $1 AND ub.blocked_app_user_id = u.id)
       OR (ub.blocker_app_user_id = u.id AND ub.blocked_app_user_id = $1)
  )
ORDER BY b.created_at DESC;

-- name: BuddyCount :one
SELECT COUNT(*)::int AS buddy_count
FROM buddies b
JOIN users u ON u.id = CASE
  WHEN b.app_user_id_a = @target_user_id THEN b.app_user_id_b
  ELSE b.app_user_id_a
END
WHERE (b.app_user_id_a = @target_user_id OR b.app_user_id_b = @target_user_id)
  AND u.account_status <> 'suspended'
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_app_user_id = @viewer_user_id AND ub.blocked_app_user_id = u.id)
       OR (ub.blocker_app_user_id = u.id AND ub.blocked_app_user_id = @viewer_user_id)
  );

-- name: BuddyPreviewItems :many
SELECT
  CASE
    WHEN b.app_user_id_a = @target_user_id THEN b.app_user_id_b
    ELSE b.app_user_id_a
  END::uuid AS buddy_user_id,
  u.username,
  u.display_name,
  p.avatar_url
FROM buddies b
JOIN users u ON u.id = CASE
  WHEN b.app_user_id_a = @target_user_id THEN b.app_user_id_b
  ELSE b.app_user_id_a
END
LEFT JOIN profiles p ON p.user_id = u.id
WHERE (b.app_user_id_a = @target_user_id OR b.app_user_id_b = @target_user_id)
  AND u.account_status <> 'suspended'
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_app_user_id = @viewer_user_id AND ub.blocked_app_user_id = u.id)
       OR (ub.blocker_app_user_id = u.id AND ub.blocked_app_user_id = @viewer_user_id)
  )
ORDER BY b.created_at DESC
LIMIT @preview_limit;
