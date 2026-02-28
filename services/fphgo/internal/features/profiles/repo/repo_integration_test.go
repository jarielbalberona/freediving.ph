package repo_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	profilesrepo "fphgo/internal/features/profiles/repo"
)

func testProfilesPool(t *testing.T) *pgxpool.Pool {
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

func TestListSavedUsersForUserExcludesBlockedUsers(t *testing.T) {
	pool := testProfilesPool(t)
	repo := profilesrepo.New(pool)
	ctx := context.Background()

	viewerID := "42000000-0000-0000-0000-000000000001"
	visibleID := "42000000-0000-0000-0000-000000000002"
	blockedID := "42000000-0000-0000-0000-000000000003"
	for idx, id := range []string{viewerID, visibleID, blockedID} {
		username := fmt.Sprintf("saved_user_%d_%d", idx, time.Now().UnixNano())
		if _, err := pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name)
			VALUES ($1, $2, 'Saved User')
			ON CONFLICT (id) DO NOTHING
		`, id, username); err != nil {
			t.Skipf("insert user: %v", err)
		}
		if _, err := pool.Exec(ctx, `
			INSERT INTO profiles (user_id, home_area)
			VALUES ($1, 'Moalboal, Cebu')
			ON CONFLICT (user_id) DO UPDATE SET home_area = EXCLUDED.home_area
		`, id); err != nil {
			t.Skipf("insert profile: %v", err)
		}
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO saved_users (viewer_app_user_id, saved_app_user_id)
		VALUES ($1, $2), ($1, $3)
		ON CONFLICT DO NOTHING
	`, viewerID, visibleID, blockedID); err != nil {
		t.Fatalf("insert saved users: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, viewerID, blockedID); err != nil {
		t.Fatalf("insert block: %v", err)
	}

	items, err := repo.ListSavedUsersForUser(ctx, viewerID)
	if err != nil {
		t.Fatalf("list saved users: %v", err)
	}
	for _, item := range items {
		if item.UserID == blockedID {
			t.Fatalf("expected blocked saved user to be excluded, got %+v", item)
		}
	}
}

func TestListSavedSitesForUserExcludesHiddenSites(t *testing.T) {
	pool := testProfilesPool(t)
	repo := profilesrepo.New(pool)
	ctx := context.Background()

	viewerID := "42000000-0000-0000-0000-000000000010"
	visibleSiteID := "12000000-0000-0000-0000-000000000001"
	hiddenSiteID := "12000000-0000-0000-0000-000000000002"
	username := fmt.Sprintf("saved_site_viewer_%d", time.Now().UnixNano())
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name)
		VALUES ($1, $2, 'Saved Viewer')
		ON CONFLICT (id) DO NOTHING
	`, viewerID, username); err != nil {
		t.Skipf("insert user: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_sites (id, name, slug, area, entry_difficulty, verification_status, moderation_state)
		VALUES
			($1, 'Visible Saved Site', $3, 'Anilao, Batangas', 'easy', 'verified', 'approved'),
			($2, 'Hidden Saved Site', $4, 'Anilao, Batangas', 'easy', 'community', 'hidden')
		ON CONFLICT (id) DO NOTHING
	`, visibleSiteID, hiddenSiteID, fmt.Sprintf("visible-saved-site-%d", time.Now().UnixNano()), fmt.Sprintf("hidden-saved-site-%d", time.Now().UnixNano())); err != nil {
		t.Skipf("insert sites: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_site_saves (app_user_id, dive_site_id)
		VALUES ($1, $2), ($1, $3)
		ON CONFLICT DO NOTHING
	`, viewerID, visibleSiteID, hiddenSiteID); err != nil {
		t.Fatalf("insert site saves: %v", err)
	}

	items, err := repo.ListSavedSitesForUser(ctx, viewerID)
	if err != nil {
		t.Fatalf("list saved sites: %v", err)
	}
	for _, item := range items {
		if item.ID == hiddenSiteID {
			t.Fatalf("expected hidden saved site to be excluded, got %+v", item)
		}
	}
}
