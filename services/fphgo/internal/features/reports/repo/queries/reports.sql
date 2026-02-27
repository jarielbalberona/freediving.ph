-- name: CreateReport :one
INSERT INTO reports (
  reporter_app_user_id,
  target_type,
  target_id,
  target_app_user_id,
  reason_code,
  details,
  evidence_urls,
  status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
RETURNING id, reporter_app_user_id, target_type, target_id, target_app_user_id, reason_code, details, evidence_urls, status, created_at, updated_at;

-- name: GetReportByID :one
SELECT id, reporter_app_user_id, target_type, target_id, target_app_user_id, reason_code, details, evidence_urls, status, created_at, updated_at
FROM reports
WHERE id = $1;

-- name: ListReportsForModeration :many
SELECT id, reporter_app_user_id, target_type, target_id, target_app_user_id, reason_code, details, evidence_urls, status, created_at, updated_at
FROM reports r
WHERE (sqlc.narg(status_filter)::text IS NULL OR r.status = sqlc.narg(status_filter)::text)
  AND (sqlc.narg(target_type_filter)::text IS NULL OR r.target_type = sqlc.narg(target_type_filter)::text)
  AND (sqlc.narg(reporter_filter)::uuid IS NULL OR r.reporter_app_user_id = sqlc.narg(reporter_filter)::uuid)
  AND (r.created_at < $1 OR (r.created_at = $1 AND r.id < $2))
ORDER BY r.created_at DESC, r.id DESC
LIMIT $3;

-- name: ListReportEventsByReportID :many
SELECT id, report_id, actor_app_user_id, event_type, from_status, to_status, note, created_at
FROM report_events
WHERE report_id = $1
ORDER BY created_at ASC, id ASC;

-- name: AddReportEvent :one
INSERT INTO report_events (report_id, actor_app_user_id, event_type, from_status, to_status, note)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, report_id, actor_app_user_id, event_type, from_status, to_status, note, created_at;

-- name: UpdateReportStatus :one
UPDATE reports
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, reporter_app_user_id, target_type, target_id, target_app_user_id, reason_code, details, evidence_urls, status, created_at, updated_at;

-- name: FindRecentReportByReporterAndTarget :one
SELECT id, created_at
FROM reports
WHERE reporter_app_user_id = $1
  AND target_type = $2
  AND target_id = $3
  AND created_at >= $4
ORDER BY created_at DESC
LIMIT 1;

-- name: CountReportsByReporterSince :one
SELECT COUNT(*)
FROM reports
WHERE reporter_app_user_id = $1
  AND created_at >= $2;

-- name: ResolveUserExists :one
SELECT id
FROM users
WHERE id = $1;

-- name: ResolveMessageAuthor :one
SELECT sender_user_id
FROM messages
WHERE id = $1;

-- name: ResolveChikaThreadAuthor :one
SELECT created_by_user_id
FROM chika_threads
WHERE id = $1 AND deleted_at IS NULL;

-- name: ResolveChikaCommentAuthor :one
SELECT author_user_id
FROM chika_comments
WHERE id = $1 AND deleted_at IS NULL;
