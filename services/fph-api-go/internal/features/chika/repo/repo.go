package repo

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type Post struct {
	ID        int64
	ThreadID  string
	Pseudonym string
	Content   string
}

func New(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (r *Repo) PseudonymEnabled(ctx context.Context, userID string) (bool, error) {
	var enabled bool
	err := r.pool.QueryRow(ctx, `SELECT pseudonymous_enabled FROM profiles WHERE user_id = $1`, userID).Scan(&enabled)
	return enabled, err
}

func (r *Repo) EnsureThread(ctx context.Context, threadID string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO chika_threads (id, title)
		VALUES ($1, '')
		ON CONFLICT (id) DO NOTHING
	`, threadID)
	return err
}

func (r *Repo) CreatePost(ctx context.Context, threadID, userID, pseudonym, content string) (Post, error) {
	var post Post
	err := r.pool.QueryRow(ctx, `
		INSERT INTO chika_posts (thread_id, author_user_id, pseudonym, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, thread_id, pseudonym, content
	`, threadID, userID, pseudonym, content).Scan(&post.ID, &post.ThreadID, &post.Pseudonym, &post.Content)
	if err != nil {
		return Post{}, err
	}
	return post, nil
}

func IsNoRows(err error) bool { return err == pgx.ErrNoRows }

func (r *Repo) Username(ctx context.Context, userID string) (string, error) {
	var username string
	if err := r.pool.QueryRow(ctx, `SELECT username FROM users WHERE id = $1`, userID).Scan(&username); err != nil {
		return "", fmt.Errorf("username lookup failed: %w", err)
	}
	return username, nil
}
