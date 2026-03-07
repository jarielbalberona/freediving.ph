package repo_test

import (
	"context"
	"fmt"
	"os"
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	messagingrepo "fphgo/internal/features/messaging/repo"
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

func TestInboxExcludesBlockedRelationships(t *testing.T) {
	pool := testPool(t)
	repo := messagingrepo.New(pool)
	ctx := context.Background()

	viewerID := uuid.NewString()
	blockedID := uuid.NewString()
	visibleID := uuid.NewString()
	for idx, id := range []string{viewerID, blockedID, visibleID} {
		username := fmt.Sprintf("msg_block_%d_%d", idx, time.Now().UnixNano())
		if _, err := pool.Exec(ctx, `INSERT INTO users (id, username, display_name) VALUES ($1, $2, 'Test')`, id, username); err != nil {
			t.Skipf("insert user: %v (ensure migrations applied)", err)
		}
	}

	blockedConversationID := uuid.NewString()
	visibleConversationID := uuid.NewString()
	if err := seedConversationWithMessage(ctx, pool, blockedConversationID, viewerID, blockedID, "blocked message"); err != nil {
		t.Fatalf("seed blocked conversation: %v", err)
	}
	if err := seedConversationWithMessage(ctx, pool, visibleConversationID, viewerID, visibleID, "visible message"); err != nil {
		t.Fatalf("seed visible conversation: %v", err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id) VALUES ($1, $2)`, viewerID, blockedID); err != nil {
		t.Skipf("insert user_blocks: %v (ensure migrations applied)", err)
	}

	items, err := repo.ListInboxConversations(ctx, messagingrepo.ListInboxInput{
		UserID:        viewerID,
		CursorUpdated: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:      "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:         100,
	})
	if err != nil {
		t.Fatalf("inbox: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected at least one visible inbox item")
	}
	for _, item := range items {
		if item.ConversationID == blockedConversationID {
			t.Fatalf("expected blocked conversation to be filtered out: %+v", item)
		}
	}

	seenVisible := slices.ContainsFunc(items, func(item messagingrepo.ConversationItem) bool {
		return item.ConversationID == visibleConversationID
	})
	if !seenVisible {
		t.Fatalf("expected visible conversation %s in inbox", visibleConversationID)
	}
}

func seedConversationWithMessage(ctx context.Context, pool *pgxpool.Pool, conversationID, a, b, content string) error {
	dmPair := sortedPairKey(a, b)
	if _, err := pool.Exec(ctx, `
		INSERT INTO conversations (id, kind, dm_pair_key, initiator_user_id, status)
		VALUES ($1, 'dm', $2, $3, 'active')
	`, conversationID, dmPair, a); err != nil {
		return err
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO conversation_participants (conversation_id, user_id)
		VALUES ($1, $2), ($1, $3)
	`, conversationID, a, b); err != nil {
		return err
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO messages (conversation_id, sender_user_id, content)
		VALUES ($1, $2, $3)
	`, conversationID, b, content); err != nil {
		return err
	}
	return nil
}

func sortedPairKey(a, b string) string {
	if a < b {
		return a + ":" + b
	}
	return b + ":" + a
}
