-- name: GetProfileByUserID :one
SELECT
  u.id AS user_id,
  u.username,
  u.display_name,
  p.bio,
  p.avatar_url,
  p.location,
  p.socials,
  p.updated_at
FROM users u
JOIN profiles p ON p.user_id = u.id
WHERE u.id = $1;

-- name: UpdateDisplayName :exec
UPDATE users
SET display_name = $2
WHERE id = $1;

-- name: UpsertMyProfile :one
INSERT INTO profiles (user_id, bio, avatar_url, location, socials, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW())
ON CONFLICT (user_id) DO UPDATE
SET
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  location = EXCLUDED.location,
  socials = EXCLUDED.socials,
  updated_at = NOW()
RETURNING
  user_id,
  bio,
  avatar_url,
  location,
  socials,
  updated_at;

-- name: SearchUsers :many
SELECT
  u.id AS user_id,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  COALESCE(p.location, '') AS location
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
