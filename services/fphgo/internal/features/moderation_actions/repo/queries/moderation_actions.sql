-- name: ResolveUserExists :one
SELECT id
FROM users
WHERE id = $1;

-- name: SetUserAccountStatus :execrows
UPDATE users
SET account_status = $2
WHERE id = $1;

-- name: HideChikaThread :execrows
UPDATE chika_threads
SET hidden_at = COALESCE(hidden_at, NOW()), updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: UnhideChikaThread :execrows
UPDATE chika_threads
SET hidden_at = NULL, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: HideChikaComment :execrows
UPDATE chika_comments
SET hidden_at = COALESCE(hidden_at, NOW()), updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: UnhideChikaComment :execrows
UPDATE chika_comments
SET hidden_at = NULL, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: ResolveReportExists :one
SELECT id
FROM reports
WHERE id = $1;

-- name: CreateModerationAction :one
INSERT INTO moderation_actions (
  actor_app_user_id,
  target_type,
  target_uuid,
  target_bigint,
  action,
  reason,
  report_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, actor_app_user_id, target_type, target_uuid, target_bigint, action, reason, report_id, created_at;

-- name: ListModerationActionsByActor :many
SELECT id, actor_app_user_id, target_type, target_uuid, target_bigint, action, reason, report_id, created_at
FROM moderation_actions
WHERE actor_app_user_id = $1
ORDER BY created_at DESC, id DESC;
