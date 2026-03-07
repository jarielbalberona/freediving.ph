package repo_test

import (
	"context"
	"fmt"
	"math"
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

func TestListThreadsExcludesBlockedAuthorsBothDirections(t *testing.T) {
	pool := testPool(t)
	repo := chikarepo.New(pool)
	ctx := context.Background()

	viewerID := uuid.New().String()
	authorBlockedByViewer := uuid.New().String()
	authorWhoBlockedViewer := uuid.New().String()
	visibleAuthor := uuid.New().String()

	for idx, id := range []string{viewerID, authorBlockedByViewer, authorWhoBlockedViewer, visibleAuthor} {
		username := fmt.Sprintf("chika_blocks_%d_%d", idx, time.Now().UnixNano())
		if _, err := pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name)
			VALUES ($1, $2, 'Test')
		`, id, username); err != nil {
			t.Skipf("insert user: %v (ensure migrations applied)", err)
		}
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id)
		VALUES ($1, $2), ($3, $4)
	`, viewerID, authorBlockedByViewer, authorWhoBlockedViewer, viewerID); err != nil {
		t.Skipf("insert user_blocks: %v (ensure migrations applied)", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO chika_threads (title, mode, created_by_user_id)
		VALUES
		  ('blocked by viewer', 'normal', $1),
		  ('blocked viewer', 'normal', $2),
		  ('visible', 'normal', $3)
	`, authorBlockedByViewer, authorWhoBlockedViewer, visibleAuthor); err != nil {
		t.Fatalf("insert threads: %v", err)
	}

	items, err := repo.ListThreads(ctx, viewerID, false, time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC), "ffffffff-ffff-ffff-ffff-ffffffffffff", 20)
	if err != nil {
		t.Fatalf("list threads: %v", err)
	}

	foundVisible := false
	for _, item := range items {
		if item.CreatedByUserID == visibleAuthor {
			foundVisible = true
		}
		if item.CreatedByUserID == authorBlockedByViewer || item.CreatedByUserID == authorWhoBlockedViewer {
			t.Fatalf("expected blocked author thread to be excluded, got %+v", item)
		}
	}
	if !foundVisible {
		t.Fatal("expected visible author thread in list")
	}
}

func TestListCommentsExcludesBlockedAuthorsBothDirections(t *testing.T) {
	pool := testPool(t)
	repo := chikarepo.New(pool)
	ctx := context.Background()

	viewerID := uuid.New().String()
	authorBlockedByViewer := uuid.New().String()
	authorWhoBlockedViewer := uuid.New().String()
	visibleAuthor := uuid.New().String()

	for idx, id := range []string{viewerID, authorBlockedByViewer, authorWhoBlockedViewer, visibleAuthor} {
		username := fmt.Sprintf("chika_comment_blocks_%d_%d", idx, time.Now().UnixNano())
		if _, err := pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name)
			VALUES ($1, $2, 'Test')
		`, id, username); err != nil {
			t.Skipf("insert user: %v (ensure migrations applied)", err)
		}
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id)
		VALUES ($1, $2), ($3, $4)
	`, viewerID, authorBlockedByViewer, authorWhoBlockedViewer, viewerID); err != nil {
		t.Skipf("insert user_blocks: %v (ensure migrations applied)", err)
	}

	var threadID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO chika_threads (title, mode, created_by_user_id)
		VALUES ('thread for comment filtering', 'normal', $1)
		RETURNING id
	`, visibleAuthor).Scan(&threadID); err != nil {
		t.Fatalf("create thread: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO chika_comments (thread_id, author_user_id, pseudonym, content)
		VALUES
		  ($1, $2, 'anon-a', 'blocked by viewer'),
		  ($1, $3, 'anon-b', 'blocked viewer'),
		  ($1, $4, 'anon-c', 'visible')
	`, threadID, authorBlockedByViewer, authorWhoBlockedViewer, visibleAuthor); err != nil {
		t.Fatalf("insert comments: %v", err)
	}

	items, err := repo.ListComments(ctx, threadID, viewerID, false, time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC), math.MaxInt64, 20)
	if err != nil {
		t.Fatalf("list comments: %v", err)
	}

	foundVisible := false
	for _, item := range items {
		if item.AuthorUserID == visibleAuthor {
			foundVisible = true
		}
		if item.AuthorUserID == authorBlockedByViewer || item.AuthorUserID == authorWhoBlockedViewer {
			t.Fatalf("expected blocked author comment to be excluded, got %+v", item)
		}
	}
	if !foundVisible {
		t.Fatal("expected visible author comment in list")
	}
}
