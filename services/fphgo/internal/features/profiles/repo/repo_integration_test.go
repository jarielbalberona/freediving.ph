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

func TestListProfileDivingByUsernameAppliesVisibilityBlocksAndStatus(t *testing.T) {
	pool := testProfilesPool(t)
	repo := profilesrepo.New(pool)
	ctx := context.Background()
	nonce := time.Now().UnixNano()

	insertUser := func(username, displayName, status string) string {
		t.Helper()
		var id string
		if err := pool.QueryRow(ctx, `
			INSERT INTO users (id, username, display_name, account_status)
			VALUES (gen_random_uuid(), $1, $2, $3)
			RETURNING id
		`, username, displayName, status).Scan(&id); err != nil {
			t.Skipf("insert user: %v", err)
		}
		if _, err := pool.Exec(ctx, `
			INSERT INTO profiles (user_id, home_area, avatar_url)
			VALUES ($1, 'Panglao, Bohol', 'https://example.test/avatar.png')
		`, id); err != nil {
			t.Skipf("insert profile: %v", err)
		}
		return id
	}

	ownerUsername := fmt.Sprintf("profile_diving_owner_%d", nonce)
	ownerID := insertUser(ownerUsername, "Profile Diving Owner", "active")
	memberViewerID := insertUser(fmt.Sprintf("profile_diving_member_%d", nonce), "Member Viewer", "active")
	blockedViewerID := insertUser(fmt.Sprintf("profile_diving_blocked_%d", nonce), "Blocked Viewer", "active")
	inactiveUsername := fmt.Sprintf("profile_diving_inactive_%d", nonce)
	inactiveOwnerID := insertUser(inactiveUsername, "Inactive Owner", "suspended")

	var siteID string
	siteSlug := fmt.Sprintf("profile-diving-site-%d", nonce)
	if err := pool.QueryRow(ctx, `
		INSERT INTO dive_sites (
			name, slug, area, entry_difficulty, verification_status, moderation_state, last_updated_at, updated_at
		)
		VALUES ('Profile Diving Reef', $1, 'Panglao, Bohol', 'easy', 'verified', 'approved', NOW(), NOW())
		RETURNING id
	`, siteSlug).Scan(&siteID); err != nil {
		t.Fatalf("insert site: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id)
		VALUES ($1, $2)
	`, blockedViewerID, ownerID); err != nil {
		t.Skipf("insert user block: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_presences (
			user_id, dive_site_id, presence_type, start_at, end_at, visibility, contact_enabled, note, status
		)
		VALUES
			($1, $2, 'available', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'public', true, 'public active', 'active'),
			($1, $2, 'training', NULL, NULL, 'members', true, 'members flexible', 'active'),
			($1, $2, 'planning', NULL, NULL, 'private', true, 'private flexible', 'active'),
			($1, $2, 'available', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', 'public', true, 'expired', 'active'),
			($1, $2, 'available', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'public', true, 'cancelled', 'cancelled'),
			($3, $2, 'available', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'public', true, 'inactive owner', 'active')
	`, ownerID, siteID, inactiveOwnerID); err != nil {
		t.Fatalf("insert dive presences: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_dive_site_affinities (
			user_id, dive_site_id, relationship, visibility, contact_enabled, note
		)
		VALUES
			($1, $2, 'local', 'public', true, 'public local'),
			($1, $2, 'regular', 'members', true, 'member regular'),
			($1, $2, 'instructor', 'private', true, 'private instructor'),
			($3, $2, 'operator', 'public', true, 'inactive operator')
	`, ownerID, siteID, inactiveOwnerID); err != nil {
		t.Fatalf("insert dive site affinities: %v", err)
	}

	guest, err := repo.ListProfileDivingByUsername(ctx, ownerUsername, "")
	if err != nil {
		t.Fatalf("guest profile diving: %v", err)
	}
	if len(guest.Presences) != 1 || guest.Presences[0].PresenceType != "available" {
		t.Fatalf("expected guest to see only public active presence, got %+v", guest.Presences)
	}
	if guest.Presences[0].DiveSiteSlug != siteSlug || guest.Presences[0].DiveSiteName != "Profile Diving Reef" {
		t.Fatalf("expected dive-site joined presence data, got %+v", guest.Presences[0])
	}
	if len(guest.Affinities) != 1 || guest.Affinities[0].Relationship != "local" {
		t.Fatalf("expected guest to see only public affinity, got %+v", guest.Affinities)
	}
	if guest.Presences[0].Note == "public local" {
		t.Fatalf("affinity leaked into presence list: %+v", guest.Presences)
	}

	member, err := repo.ListProfileDivingByUsername(ctx, ownerUsername, memberViewerID)
	if err != nil {
		t.Fatalf("member profile diving: %v", err)
	}
	memberPresenceTypes := map[string]bool{}
	for _, item := range member.Presences {
		memberPresenceTypes[item.PresenceType] = true
		if item.Note == "expired" || item.Note == "cancelled" {
			t.Fatalf("inactive presence leaked to member: %+v", item)
		}
	}
	if !memberPresenceTypes["available"] || !memberPresenceTypes["training"] || memberPresenceTypes["planning"] {
		t.Fatalf("expected member to see public+members only, got %+v", member.Presences)
	}
	memberRelationships := map[string]bool{}
	for _, item := range member.Affinities {
		memberRelationships[item.Relationship] = true
	}
	if !memberRelationships["local"] || !memberRelationships["regular"] || memberRelationships["instructor"] {
		t.Fatalf("expected member to see public+members affinities only, got %+v", member.Affinities)
	}

	owner, err := repo.ListProfileDivingByUsername(ctx, ownerUsername, ownerID)
	if err != nil {
		t.Fatalf("owner profile diving: %v", err)
	}
	ownerPresenceTypes := map[string]bool{}
	for _, item := range owner.Presences {
		ownerPresenceTypes[item.PresenceType] = true
	}
	if !ownerPresenceTypes["available"] || !ownerPresenceTypes["training"] || !ownerPresenceTypes["planning"] {
		t.Fatalf("expected owner to see private flexible presence too, got %+v", owner.Presences)
	}
	ownerRelationships := map[string]bool{}
	for _, item := range owner.Affinities {
		ownerRelationships[item.Relationship] = true
	}
	if !ownerRelationships["local"] || !ownerRelationships["regular"] || !ownerRelationships["instructor"] {
		t.Fatalf("expected owner to see private affinity too, got %+v", owner.Affinities)
	}

	blocked, err := repo.ListProfileDivingByUsername(ctx, ownerUsername, blockedViewerID)
	if err != nil {
		t.Fatalf("blocked profile diving: %v", err)
	}
	if len(blocked.Presences) != 0 || len(blocked.Affinities) != 0 {
		t.Fatalf("expected blocked viewer to see no diving data, got %+v", blocked)
	}

	inactive, err := repo.ListProfileDivingByUsername(ctx, inactiveUsername, memberViewerID)
	if err != nil {
		t.Fatalf("inactive owner profile diving: %v", err)
	}
	if len(inactive.Presences) != 0 || len(inactive.Affinities) != 0 {
		t.Fatalf("expected inactive profile owner data to be suppressed, got %+v", inactive)
	}
}
