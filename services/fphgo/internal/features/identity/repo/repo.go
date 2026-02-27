package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type IdentityRecord struct {
	UserID        string
	GlobalRole    string
	AccountStatus string
	OverridesRaw  []byte
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) ClerkUserExists(ctx context.Context, clerkUserID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE auth_provider = 'clerk' AND auth_provider_user_id = $1)
	`, clerkUserID).Scan(&exists)
	return exists, err
}

func (r *Repo) EnsureUserForClerk(ctx context.Context, clerkUserID, username, displayName string) error {
	if strings.TrimSpace(clerkUserID) == "" {
		return fmt.Errorf("clerk user id is required")
	}

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
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
		return fmt.Errorf("upsert clerk user: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO profiles (user_id, bio)
		VALUES ($1, '')
		ON CONFLICT (user_id) DO NOTHING
	`, userID); err != nil {
		return fmt.Errorf("ensure profile: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO user_permission_overrides (user_id, overrides)
		VALUES ($1, '{}'::jsonb)
		ON CONFLICT (user_id) DO NOTHING
	`, userID); err != nil {
		return fmt.Errorf("ensure user overrides: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

func (r *Repo) ResolveIdentityByClerkUserID(ctx context.Context, clerkUserID string) (IdentityRecord, error) {
	var identity IdentityRecord
	if err := r.pool.QueryRow(ctx, `
		SELECT
			u.id,
			u.global_role,
			u.account_status,
			COALESCE(up.overrides, '{}'::jsonb)
		FROM users u
		LEFT JOIN user_permission_overrides up ON up.user_id = u.id
		WHERE u.auth_provider = 'clerk' AND u.auth_provider_user_id = $1
	`, clerkUserID).Scan(&identity.UserID, &identity.GlobalRole, &identity.AccountStatus, &identity.OverridesRaw); err != nil {
		return IdentityRecord{}, err
	}

	return identity, nil
}

func (r *Repo) GroupRole(ctx context.Context, userID, groupID string) (string, error) {
	var role string
	if err := r.pool.QueryRow(ctx, `
		SELECT role
		FROM group_memberships
		WHERE group_id = $1 AND user_id = $2 AND status = 'active'
	`, groupID, userID).Scan(&role); err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return role, nil
}

func (r *Repo) EventRole(ctx context.Context, userID, eventID string) (string, error) {
	var role string
	if err := r.pool.QueryRow(ctx, `
		SELECT role
		FROM event_memberships
		WHERE event_id = $1 AND user_id = $2 AND status = 'active'
	`, eventID, userID).Scan(&role); err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return role, nil
}

func DecodeOverrides(raw []byte) (map[string]bool, error) {
	overrides := map[string]bool{}
	if len(raw) == 0 {
		return overrides, nil
	}
	if err := json.Unmarshal(raw, &overrides); err != nil {
		return nil, err
	}
	return overrides, nil
}
