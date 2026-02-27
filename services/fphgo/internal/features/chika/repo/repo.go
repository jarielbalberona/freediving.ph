package repo

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type Thread struct {
	ID              string
	Title           string
	Mode            string
	CreatedByUserID string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Post struct {
	ID           int64
	ThreadID     string
	AuthorUserID string
	Pseudonym    string
	Content      string
	CreatedAt    time.Time
}

type Comment struct {
	ID           int64
	ThreadID     string
	AuthorUserID string
	Pseudonym    string
	Content      string
	CreatedAt    time.Time
}

type Reaction struct {
	ThreadID string
	UserID   string
	Type     string
}

type MediaAsset struct {
	ID         string
	EntityType string
	EntityID   string
	StorageKey string
	URL        string
	MimeType   string
	SizeBytes  int64
}

type CreateMediaAssetInput struct {
	OwnerUserID string
	EntityType  string
	EntityID    string
	StorageKey  string
	URL         string
	MimeType    string
	SizeBytes   int64
	Width       *int32
	Height      *int32
}

func New(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (r *Repo) PseudonymEnabled(ctx context.Context, userID string) (bool, error) {
	var enabled bool
	err := r.pool.QueryRow(ctx, `SELECT pseudonymous_enabled FROM profiles WHERE user_id = $1`, userID).Scan(&enabled)
	return enabled, err
}

func (r *Repo) Username(ctx context.Context, userID string) (string, error) {
	var username string
	if err := r.pool.QueryRow(ctx, `SELECT username FROM users WHERE id = $1`, userID).Scan(&username); err != nil {
		return "", fmt.Errorf("username lookup failed: %w", err)
	}
	return username, nil
}

func (r *Repo) CreateThread(ctx context.Context, title, mode, actorID string) (Thread, error) {
	var thread Thread
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_threads (title, mode, created_by_user_id)
		VALUES ($1, $2, $3)
		RETURNING id, title, mode, created_by_user_id, created_at, updated_at
	`, title, mode, actorID).Scan(&thread.ID, &thread.Title, &thread.Mode, &thread.CreatedByUserID, &thread.CreatedAt, &thread.UpdatedAt)
	return thread, err
}

func (r *Repo) GetThread(ctx context.Context, threadID string) (Thread, error) {
	var thread Thread
	err := r.pool.QueryRow(ctx, `
		SELECT id, title, mode, COALESCE(created_by_user_id::text, ''), created_at, updated_at
		FROM chika_threads
		WHERE id = $1 AND deleted_at IS NULL
	`, threadID).Scan(&thread.ID, &thread.Title, &thread.Mode, &thread.CreatedByUserID, &thread.CreatedAt, &thread.UpdatedAt)
	return thread, err
}

func (r *Repo) ListThreads(ctx context.Context, limit, offset int32) ([]Thread, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, title, mode, COALESCE(created_by_user_id::text, ''), created_at, updated_at
		FROM chika_threads
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC, id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Thread, 0)
	for rows.Next() {
		var item Thread
		if err := rows.Scan(&item.ID, &item.Title, &item.Mode, &item.CreatedByUserID, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) UpdateThread(ctx context.Context, threadID, title string) (Thread, error) {
	var thread Thread
	err := r.pool.QueryRow(ctx, `
		UPDATE chika_threads
		SET title = $2, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, title, mode, COALESCE(created_by_user_id::text, ''), created_at, updated_at
	`, threadID, title).Scan(&thread.ID, &thread.Title, &thread.Mode, &thread.CreatedByUserID, &thread.CreatedAt, &thread.UpdatedAt)
	return thread, err
}

func (r *Repo) SoftDeleteThread(ctx context.Context, threadID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE chika_threads
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, threadID)
	return err
}

func (r *Repo) CreatePost(ctx context.Context, threadID, userID, pseudonym, content string) (Post, error) {
	var post Post
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_posts (thread_id, author_user_id, pseudonym, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, thread_id, author_user_id, pseudonym, content, created_at
	`, threadID, userID, pseudonym, content).Scan(
		&post.ID, &post.ThreadID, &post.AuthorUserID, &post.Pseudonym, &post.Content, &post.CreatedAt,
	)
	return post, err
}

func (r *Repo) ListPosts(ctx context.Context, threadID string, limit, offset int32) ([]Post, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, thread_id, author_user_id, pseudonym, content, created_at
		FROM chika_posts
		WHERE thread_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC, id DESC
		LIMIT $2 OFFSET $3
	`, threadID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Post, 0)
	for rows.Next() {
		var item Post
		if err := rows.Scan(&item.ID, &item.ThreadID, &item.AuthorUserID, &item.Pseudonym, &item.Content, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateComment(ctx context.Context, threadID, userID, pseudonym, content string) (Comment, error) {
	var comment Comment
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_comments (thread_id, author_user_id, pseudonym, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, thread_id, author_user_id, pseudonym, content, created_at
	`, threadID, userID, pseudonym, content).Scan(
		&comment.ID, &comment.ThreadID, &comment.AuthorUserID, &comment.Pseudonym, &comment.Content, &comment.CreatedAt,
	)
	return comment, err
}

func (r *Repo) ListComments(ctx context.Context, threadID string, limit, offset int32) ([]Comment, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, thread_id, author_user_id, pseudonym, content, created_at
		FROM chika_comments
		WHERE thread_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC, id DESC
		LIMIT $2 OFFSET $3
	`, threadID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Comment, 0)
	for rows.Next() {
		var item Comment
		if err := rows.Scan(&item.ID, &item.ThreadID, &item.AuthorUserID, &item.Pseudonym, &item.Content, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetComment(ctx context.Context, commentID int64) (Comment, error) {
	var comment Comment
	err := r.pool.QueryRow(ctx, `
		SELECT id, thread_id, author_user_id, pseudonym, content, created_at
		FROM chika_comments
		WHERE id = $1 AND deleted_at IS NULL
	`, commentID).Scan(&comment.ID, &comment.ThreadID, &comment.AuthorUserID, &comment.Pseudonym, &comment.Content, &comment.CreatedAt)
	return comment, err
}

func (r *Repo) UpdateComment(ctx context.Context, commentID int64, content string) (Comment, error) {
	var comment Comment
	err := r.pool.QueryRow(ctx, `
		UPDATE chika_comments
		SET content = $2, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, thread_id, author_user_id, pseudonym, content, created_at
	`, commentID, content).Scan(&comment.ID, &comment.ThreadID, &comment.AuthorUserID, &comment.Pseudonym, &comment.Content, &comment.CreatedAt)
	return comment, err
}

func (r *Repo) SoftDeleteComment(ctx context.Context, commentID int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE chika_comments
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, commentID)
	return err
}

func (r *Repo) SetThreadReaction(ctx context.Context, threadID, userID, reactionType string) (Reaction, error) {
	var reaction Reaction
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_thread_reactions (thread_id, user_id, reaction_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (thread_id, user_id)
		DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = NOW()
		RETURNING thread_id, user_id, reaction_type
	`, threadID, userID, reactionType).Scan(&reaction.ThreadID, &reaction.UserID, &reaction.Type)
	return reaction, err
}

func (r *Repo) RemoveThreadReaction(ctx context.Context, threadID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM chika_thread_reactions
		WHERE thread_id = $1 AND user_id = $2
	`, threadID, userID)
	return err
}

func (r *Repo) CreateMediaAsset(ctx context.Context, input CreateMediaAssetInput) (MediaAsset, error) {
	var asset MediaAsset
	err := r.pool.QueryRow(ctx, `
		INSERT INTO media_assets (
			owner_user_id, entity_type, entity_id, storage_key, url, mime_type, size_bytes, width, height
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, entity_type, entity_id, storage_key, url, mime_type, size_bytes
	`, input.OwnerUserID, input.EntityType, input.EntityID, input.StorageKey, input.URL, input.MimeType, input.SizeBytes, input.Width, input.Height).Scan(
		&asset.ID, &asset.EntityType, &asset.EntityID, &asset.StorageKey, &asset.URL, &asset.MimeType, &asset.SizeBytes,
	)
	return asset, err
}

func (r *Repo) ListMediaByEntity(ctx context.Context, entityType, entityID string) ([]MediaAsset, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, entity_type, entity_id, storage_key, url, mime_type, size_bytes
		FROM media_assets
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY created_at DESC, id DESC
	`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]MediaAsset, 0)
	for rows.Next() {
		var item MediaAsset
		if err := rows.Scan(&item.ID, &item.EntityType, &item.EntityID, &item.StorageKey, &item.URL, &item.MimeType, &item.SizeBytes); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// EntityExists checks that the referenced entity exists and is not soft-deleted.
func (r *Repo) EntityExists(ctx context.Context, entityType, entityID string) (bool, error) {
	switch entityType {
	case "thread":
		var n int
		err := r.pool.QueryRow(ctx, `SELECT 1 FROM chika_threads WHERE id = $1 AND deleted_at IS NULL`, entityID).Scan(&n)
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return err == nil, err
	case "post":
		id, err := strconv.ParseInt(entityID, 10, 64)
		if err != nil {
			return false, nil
		}
		var n int
		err = r.pool.QueryRow(ctx, `SELECT 1 FROM chika_posts WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&n)
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return err == nil, err
	case "comment":
		id, err := strconv.ParseInt(entityID, 10, 64)
		if err != nil {
			return false, nil
		}
		var n int
		err = r.pool.QueryRow(ctx, `SELECT 1 FROM chika_comments WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&n)
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return err == nil, err
	default:
		return false, nil
	}
}

func IsNoRows(err error) bool { return err == pgx.ErrNoRows }
