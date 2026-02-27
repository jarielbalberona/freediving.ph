package repo_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	chikarepo "fphgo/internal/features/chika/repo"
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN is not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestSetThreadReactionIdempotent(t *testing.T) {
	pool := testPool(t)
	repo := chikarepo.New(pool)
	ctx := context.Background()

	userID := uuid.New().String()
	username := fmt.Sprintf("chika_test_%d", time.Now().UnixNano())
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name)
		VALUES ($1, $2, 'Test')
	`, userID, username); err != nil {
		t.Skipf("insert user: %v (ensure migrations applied)", err)
	}

	var threadID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO chika_threads (title, mode, created_by_user_id)
		VALUES ('test', 'normal', $1)
		RETURNING id
	`, userID).Scan(&threadID); err != nil {
		t.Fatalf("create thread: %v", err)
	}

	r1, err := repo.SetThreadReaction(ctx, threadID, userID, "upvote")
	if err != nil {
		t.Fatalf("first SetThreadReaction: %v", err)
	}

	r2, err := repo.SetThreadReaction(ctx, threadID, userID, "upvote")
	if err != nil {
		t.Fatalf("second SetThreadReaction: %v", err)
	}

	if r1.ThreadID != r2.ThreadID || r1.UserID != r2.UserID || r1.Type != r2.Type {
		t.Errorf("reactions differ: %+v vs %+v", r1, r2)
	}

	// Change type - should upsert
	r3, err := repo.SetThreadReaction(ctx, threadID, userID, "downvote")
	if err != nil {
		t.Fatalf("third SetThreadReaction: %v", err)
	}
	if r3.Type != "downvote" {
		t.Errorf("expected downvote, got %s", r3.Type)
	}

	// Verify single row
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM chika_thread_reactions WHERE thread_id = $1 AND user_id = $2`, threadID, userID).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 reaction row, got %d", count)
	}
}
