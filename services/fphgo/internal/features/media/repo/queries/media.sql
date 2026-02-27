-- name: CreateMediaObject :one
INSERT INTO media_objects (
  owner_app_user_id,
  context_type,
  context_id,
  object_key,
  mime_type,
  size_bytes,
  width,
  height,
  state
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at;

-- name: GetMediaObjectByID :one
SELECT id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at
FROM media_objects
WHERE id = $1;

-- name: GetMediaObjectsByIDs :many
SELECT id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at
FROM media_objects
WHERE id = ANY($1::uuid[]);

-- name: ListMediaByOwner :many
SELECT id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at
FROM media_objects m
WHERE m.owner_app_user_id = $1
  AND (m.created_at < $2 OR (m.created_at = $2 AND m.id < $3))
ORDER BY m.created_at DESC, m.id DESC
LIMIT $4;

-- name: ListMediaByContext :many
SELECT id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at
FROM media_objects m
WHERE m.context_type = $1
  AND m.context_id IS NOT DISTINCT FROM $2
  AND (m.created_at < $3 OR (m.created_at = $3 AND m.id < $4))
ORDER BY m.created_at DESC, m.id DESC
LIMIT $5;

-- name: UpdateMediaState :one
UPDATE media_objects
SET state = $2
WHERE id = $1
RETURNING id, owner_app_user_id, context_type, context_id, object_key, mime_type, size_bytes, width, height, state, created_at;
