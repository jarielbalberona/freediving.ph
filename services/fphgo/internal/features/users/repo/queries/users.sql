-- name: CreateUser :one
INSERT INTO users (id, username, display_name)
VALUES ($1, $2, $3)
RETURNING id, username, display_name, created_at;

-- name: CreateProfile :one
INSERT INTO profiles (user_id, bio)
VALUES ($1, $2)
RETURNING user_id, bio, avatar_url, pseudonymous_enabled, created_at, updated_at;

-- name: GetUserByID :one
SELECT
  u.id,
  u.username,
  u.display_name,
  p.bio,
  p.avatar_url,
  p.pseudonymous_enabled,
  u.created_at
FROM users u
JOIN profiles p ON p.user_id = u.id
WHERE u.id = $1;

-- name: SaveUser :exec
INSERT INTO saved_users (viewer_app_user_id, saved_app_user_id)
VALUES ($1, $2)
ON CONFLICT (viewer_app_user_id, saved_app_user_id) DO NOTHING;

-- name: UnsaveUser :exec
DELETE FROM saved_users
WHERE viewer_app_user_id = $1
  AND saved_app_user_id = $2;
