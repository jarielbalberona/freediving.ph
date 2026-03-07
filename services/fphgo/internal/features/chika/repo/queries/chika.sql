-- name: PseudonymEnabled :one
SELECT pseudonymous_enabled
FROM profiles
WHERE user_id = $1;

-- name: EnsureThread :exec
INSERT INTO chika_threads (id, title)
VALUES ($1, '')
ON CONFLICT (id) DO NOTHING;

-- name: CreatePost :one
INSERT INTO chika_posts (thread_id, author_user_id, pseudonym, content)
VALUES ($1, $2, $3, $4)
RETURNING id, thread_id, author_user_id, pseudonym, content, created_at;
