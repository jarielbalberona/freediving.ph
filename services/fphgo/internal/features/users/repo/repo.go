package repo

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID          string
	Username    string
	DisplayName string
	Bio         string
}

type Repo struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (r *Repo) CreateUserWithProfile(ctx context.Context, username, displayName, bio string) (User, error) {
	id := uuid.NewString()
	var result User

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return User{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		INSERT INTO users (id, username, display_name)
		VALUES ($1, $2, $3)
	`, id, username, displayName); err != nil {
		return User{}, fmt.Errorf("insert user: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO profiles (user_id, bio)
		VALUES ($1, $2)
	`, id, bio); err != nil {
		return User{}, fmt.Errorf("insert profile: %w", err)
	}

	row := tx.QueryRow(ctx, `
		SELECT u.id, u.username, u.display_name, p.bio
		FROM users u
		JOIN profiles p ON p.user_id = u.id
		WHERE u.id = $1
	`, id)
	if err := row.Scan(&result.ID, &result.Username, &result.DisplayName, &result.Bio); err != nil {
		return User{}, fmt.Errorf("select created user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, fmt.Errorf("commit tx: %w", err)
	}

	return result, nil
}

func (r *Repo) GetUserByID(ctx context.Context, userID string) (User, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return User{}, fmt.Errorf("invalid user id: %w", err)
	}

	row := r.pool.QueryRow(ctx, `
		SELECT u.id, u.username, u.display_name, p.bio
		FROM users u
		JOIN profiles p ON p.user_id = u.id
		WHERE u.id = $1
	`, userID)

	var result User
	if err := row.Scan(&result.ID, &result.Username, &result.DisplayName, &result.Bio); err != nil {
		return User{}, err
	}
	return result, nil
}

func (r *Repo) GetUserByUsername(ctx context.Context, username string) (User, error) {
	if strings.TrimSpace(username) == "" {
		return User{}, pgx.ErrNoRows
	}

	row := r.pool.QueryRow(ctx, `
		SELECT u.id, u.username, u.display_name, p.bio
		FROM users u
		JOIN profiles p ON p.user_id = u.id
		WHERE u.username = $1
	`, strings.TrimSpace(username))

	var result User
	if err := row.Scan(&result.ID, &result.Username, &result.DisplayName, &result.Bio); err != nil {
		return User{}, err
	}
	return result, nil
}

func (r *Repo) EnsureLocalUserForClerk(ctx context.Context, clerkUserID, username, displayName string) (User, error) {
	if strings.TrimSpace(clerkUserID) == "" {
		return User{}, fmt.Errorf("clerk user id is required")
	}

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return User{}, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var userID string
	row := tx.QueryRow(ctx, `
		INSERT INTO users (id, username, display_name, auth_provider, auth_provider_user_id)
		VALUES (gen_random_uuid(), $1, $2, 'clerk', $3)
		ON CONFLICT (auth_provider, auth_provider_user_id)
		DO UPDATE SET auth_provider_user_id = EXCLUDED.auth_provider_user_id
		RETURNING id
	`, username, displayName, clerkUserID)
	if err := row.Scan(&userID); err != nil {
		return User{}, fmt.Errorf("upsert clerk user: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO profiles (user_id, bio)
		VALUES ($1, '')
		ON CONFLICT (user_id) DO NOTHING
	`, userID); err != nil {
		return User{}, fmt.Errorf("ensure profile: %w", err)
	}

	row = tx.QueryRow(ctx, `
		SELECT u.id, u.username, u.display_name, p.bio
		FROM users u
		JOIN profiles p ON p.user_id = u.id
		WHERE u.id = $1
	`, userID)
	var result User
	if err := row.Scan(&result.ID, &result.Username, &result.DisplayName, &result.Bio); err != nil {
		return User{}, fmt.Errorf("load clerk user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, fmt.Errorf("commit tx: %w", err)
	}
	return result, nil
}
