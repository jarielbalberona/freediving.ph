package repo_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	buddyfinderrepo "fphgo/internal/features/buddyfinder/repo"
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

func TestListMemberIntentsByAreaExcludesBlockedUsersBothDirections(t *testing.T) {
	pool := testPool(t)
	repo := buddyfinderrepo.New(pool)
	ctx := context.Background()

	viewerID := "40000000-0000-0000-0000-000000000001"
	authorBlockedByViewer := "40000000-0000-0000-0000-000000000002"
	authorWhoBlockedViewer := "40000000-0000-0000-0000-000000000003"
	visibleAuthor := "40000000-0000-0000-0000-000000000004"

	users := []string{viewerID, authorBlockedByViewer, authorWhoBlockedViewer, visibleAuthor}
	for idx, id := range users {
		username := fmt.Sprintf("buddyfinder_%d_%d", idx, time.Now().UnixNano())
		if _, err := pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name)
			VALUES ($1, $2, 'Test User')
			ON CONFLICT (id) DO NOTHING
		`, id, username); err != nil {
			t.Skipf("insert user: %v (ensure migrations applied)", err)
		}
		if _, err := pool.Exec(ctx, `
			INSERT INTO profiles (user_id, home_area)
			VALUES ($1, 'Moalboal, Cebu')
			ON CONFLICT (user_id) DO UPDATE SET home_area = EXCLUDED.home_area
		`, id); err != nil {
			t.Skipf("insert profile: %v (ensure migrations applied)", err)
		}
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id)
		VALUES ($1, $2), ($3, $4)
		ON CONFLICT DO NOTHING
	`, viewerID, authorBlockedByViewer, authorWhoBlockedViewer, viewerID); err != nil {
		t.Skipf("insert user_blocks: %v (ensure migrations applied)", err)
	}

	for _, authorID := range []string{authorBlockedByViewer, authorWhoBlockedViewer, visibleAuthor} {
		if _, err := pool.Exec(ctx, `
			INSERT INTO buddy_intents (
				id, author_app_user_id, area, intent_type, time_window, visibility, state, expires_at
			)
			VALUES (gen_random_uuid(), $1, 'Moalboal, Cebu', 'training', 'today', 'members', 'active', NOW() + INTERVAL '1 day')
		`, authorID); err != nil {
			t.Fatalf("insert intent: %v", err)
		}
	}

	items, err := repo.ListMemberIntentsByArea(ctx, buddyfinderrepo.ListMemberIntentsInput{
		ViewerUserID:    viewerID,
		Area:            "Moalboal, Cebu",
		CursorCreatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           20,
	})
	if err != nil {
		t.Fatalf("list intents: %v", err)
	}

	foundVisible := false
	for _, item := range items {
		if item.AuthorAppUserID == visibleAuthor {
			foundVisible = true
		}
		if item.AuthorAppUserID == authorBlockedByViewer || item.AuthorAppUserID == authorWhoBlockedViewer {
			t.Fatalf("expected blocked author intent to be excluded, got %+v", item)
		}
	}
	if !foundVisible {
		t.Fatal("expected visible intent in list")
	}
}

func TestListPreviewBySiteExcludesExpiredIntents(t *testing.T) {
	pool := testPool(t)
	repo := buddyfinderrepo.New(pool)
	ctx := context.Background()

	authorID := "40000000-0000-0000-0000-000000000010"
	siteID := "10000000-0000-0000-0000-000000000019"
	username := fmt.Sprintf("buddyfinder_site_%d", time.Now().UnixNano())
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name)
		VALUES ($1, $2, 'Site Author')
		ON CONFLICT (id) DO NOTHING
	`, authorID, username); err != nil {
		t.Skipf("insert user: %v (ensure migrations applied)", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO profiles (user_id, home_area)
		VALUES ($1, 'Moalboal, Cebu')
		ON CONFLICT (user_id) DO UPDATE SET home_area = EXCLUDED.home_area
	`, authorID); err != nil {
		t.Skipf("insert profile: %v (ensure migrations applied)", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO buddy_intents (
			id, author_app_user_id, dive_site_id, area, intent_type, time_window, visibility, state, expires_at
		)
		VALUES
			(gen_random_uuid(), $1, $2, 'Moalboal, Cebu', 'training', 'today', 'members', 'active', NOW() + INTERVAL '1 day'),
			(gen_random_uuid(), $1, $2, 'Moalboal, Cebu', 'training', 'today', 'members', 'active', NOW() - INTERVAL '1 hour')
	`, authorID, siteID); err != nil {
		t.Fatalf("insert site intents: %v", err)
	}

	items, err := repo.ListPreviewBySite(ctx, siteID, 10)
	if err != nil {
		t.Fatalf("list preview by site: %v", err)
	}
	for _, item := range items {
		if !item.ExpiresAt.After(time.Now().UTC()) {
			t.Fatalf("expected expired intent to be excluded, got %+v", item)
		}
	}
	if len(items) == 0 {
		t.Fatal("expected at least one active site-linked preview intent")
	}
}
