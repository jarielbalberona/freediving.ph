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

func TestGetPublicProfileByUsernameExposesOnlyActiveAccounts(t *testing.T) {
	pool := testProfilesPool(t)
	repo := profilesrepo.New(pool)
	ctx := context.Background()
	nonce := time.Now().UnixNano()

	activeUsername := fmt.Sprintf("public_profile_active_%d", nonce)
	suspendedUsername := fmt.Sprintf("public_profile_suspended_%d", nonce)

	var activeID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO users (id, username, display_name, account_status, email_verified, phone_verified)
		VALUES (gen_random_uuid(), $1, 'Public Profile Active', 'active', true, true)
		RETURNING id
	`, activeUsername).Scan(&activeID); err != nil {
		t.Skipf("insert active user: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO profiles (user_id, bio, avatar_url, location, home_area, socials)
		VALUES ($1, 'Public bio', 'https://example.test/avatar.png', 'Exact Private Barangay, Cebu', 'Cebu', '{"website":"https://example.test"}'::jsonb)
	`, activeID); err != nil {
		t.Skipf("insert active profile: %v", err)
	}

	var suspendedID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO users (id, username, display_name, account_status)
		VALUES (gen_random_uuid(), $1, 'Suspended Profile', 'suspended')
		RETURNING id
	`, suspendedUsername).Scan(&suspendedID); err != nil {
		t.Skipf("insert suspended user: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO profiles (user_id, bio)
		VALUES ($1, 'Suspended bio')
	`, suspendedID); err != nil {
		t.Skipf("insert suspended profile: %v", err)
	}

	profile, err := repo.GetProfileViewByUsername(ctx, activeUsername, "")
	if err != nil {
		t.Fatalf("get active public profile: %v", err)
	}
	if profile.UserID == "" || profile.Username != activeUsername || profile.DisplayName != "Public Profile Active" {
		t.Fatalf("unexpected active public profile: %+v", profile)
	}
	if profile.Bio != "Public bio" || profile.AvatarURL == "" {
		t.Fatalf("expected public bio/avatar, got %+v", profile)
	}

	if _, err := repo.GetProfileViewByUsername(ctx, suspendedUsername, ""); err == nil {
		t.Fatal("expected suspended profile to be unavailable")
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

func TestProfileDiveMapSiteMemoriesAreGatedByUserDiveSites(t *testing.T) {
	pool := testProfilesPool(t)
	repo := profilesrepo.New(pool)
	ctx := context.Background()
	nonce := time.Now().UnixNano()

	ownerID := "91000000-0000-4000-8000-000000000001"
	taggedID := "91000000-0000-4000-8000-000000000002"
	siteID := "92000000-0000-4000-8000-000000000001"
	lockedSiteID := "92000000-0000-4000-8000-000000000002"
	ownerPostID := "93000000-0000-4000-8000-000000000001"
	taggedPostID := "93000000-0000-4000-8000-000000000002"
	ownerMemoryID := "94000000-0000-4000-8000-000000000001"
	taggedMemoryID := "94000000-0000-4000-8000-000000000002"
	pendingMemoryID := "94000000-0000-4000-8000-000000000003"
	lockedMemoryID := "94000000-0000-4000-8000-000000000004"
	memoryMediaObjectID := "96000000-0000-4000-8000-000000000099"
	ownerUsername := fmt.Sprintf("map_memory_owner_%d", nonce)
	taggedUsername := fmt.Sprintf("map_memory_tagged_%d", nonce)
	siteSlug := fmt.Sprintf("map-memory-site-%d", nonce)
	lockedSiteSlug := fmt.Sprintf("map-memory-locked-%d", nonce)

	defer func() {
		_, _ = pool.Exec(ctx, `DELETE FROM users WHERE id IN ($1, $2)`, ownerID, taggedID)
		_, _ = pool.Exec(ctx, `DELETE FROM dive_sites WHERE id IN ($1, $2)`, siteID, lockedSiteID)
	}()

	seedProfileMapUser(t, ctx, pool, ownerID, ownerUsername)
	seedProfileMapUser(t, ctx, pool, taggedID, taggedUsername)
	seedProfileMapSite(t, ctx, pool, siteID, siteSlug)
	seedProfileMapSite(t, ctx, pool, lockedSiteID, lockedSiteSlug)
	seedProfileMapProof(t, ctx, pool, ownerPostID, "95000000-0000-4000-8000-000000000001", "96000000-0000-4000-8000-000000000001", ownerID, siteID)
	seedProfileMapProof(t, ctx, pool, taggedPostID, "95000000-0000-4000-8000-000000000002", "96000000-0000-4000-8000-000000000002", taggedID, siteID)
	insertUserDiveSite(t, ctx, pool, ownerID, siteID, ownerPostID)
	insertUserDiveSite(t, ctx, pool, taggedID, siteID, taggedPostID)
	if _, err := pool.Exec(ctx, `
		INSERT INTO media_objects (id, owner_app_user_id, context_type, object_key, mime_type, size_bytes, width, height, state)
		VALUES ($1, $2, 'profile_feed', $3, 'image/jpeg', 2048, 1080, 1080, 'active')
		ON CONFLICT (id) DO NOTHING
	`, memoryMediaObjectID, ownerID, memoryMediaObjectID+".jpg"); err != nil {
		t.Fatalf("seed memory media object: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_memories (id, author_user_id, dive_site_id, title, body, visibility, occurred_at)
		VALUES
			($1, $5, $6, 'Owner marker memory', '', 'public', NOW()),
			($2, $5, $6, 'Tagged accepted memory', '', 'tagged', NOW()),
			($3, $5, $6, 'Pending hidden memory', '', 'tagged', NOW()),
			($4, $5, $7, 'Locked site memory', '', 'public', NOW())
	`, ownerMemoryID, taggedMemoryID, pendingMemoryID, lockedMemoryID, ownerID, siteID, lockedSiteID); err != nil {
		t.Fatalf("insert dive memories: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_memory_tagged_users (memory_id, tagged_user_id, status)
		VALUES
			($1, $3, 'accepted'),
			($2, $3, 'pending')
	`, taggedMemoryID, pendingMemoryID, taggedID); err != nil {
		t.Fatalf("insert memory tags: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_memory_media (memory_id, media_id, sort_order)
		VALUES ($1, $2, 0)
	`, ownerMemoryID, memoryMediaObjectID); err != nil {
		t.Fatalf("insert memory media: %v", err)
	}

	ownerMap, err := repo.GetProfileDiveMapByUsername(ctx, ownerUsername, ownerID)
	if err != nil {
		t.Fatalf("owner map: %v", err)
	}
	if ownerMap.VisitedSiteCount != 1 || len(ownerMap.Markers) != 1 {
		t.Fatalf("memories must not unlock extra markers, got %+v", ownerMap)
	}
	ownerDetail, err := repo.GetProfileDiveMapSiteByUsername(ctx, ownerUsername, siteID, ownerID)
	if err != nil {
		t.Fatalf("owner marker detail: %v", err)
	}
	if len(ownerDetail.Memories) != 3 {
		t.Fatalf("owner should see own visible/private tag-state memories on owned marker, got %+v", ownerDetail.Memories)
	}

	taggedDetail, err := repo.GetProfileDiveMapSiteByUsername(ctx, taggedUsername, siteID, taggedID)
	if err != nil {
		t.Fatalf("tagged marker detail: %v", err)
	}
	titles := map[string]bool{}
	for _, memory := range taggedDetail.Memories {
		titles[memory.Title] = true
	}
	if !titles["Tagged accepted memory"] || titles["Pending hidden memory"] || titles["Locked site memory"] {
		t.Fatalf("expected only accepted tagged same-site memory on tagged marker, got %+v", taggedDetail.Memories)
	}

	ownerPage, err := repo.GetProfileDiveMemoriesPageByUsername(ctx, ownerUsername, siteSlug, ownerID)
	if err != nil {
		t.Fatalf("owner dive memories page: %v", err)
	}
	if ownerPage.Marker.MediaPostCount != 1 || len(ownerPage.ProofItems) != 1 || len(ownerPage.MemoryItems) != 3 {
		t.Fatalf("expected dedicated page to return unlocked proof and owner memories only, got %+v", ownerPage)
	}
	foundResolvedAttachment := false
	for _, memory := range ownerPage.MemoryItems {
		if memory.Title == "Owner marker memory" && len(memory.Attachments) == 1 {
			foundResolvedAttachment = true
		}
	}
	if !foundResolvedAttachment {
		t.Fatalf("expected resolved memory attachments on page contract, got %+v", ownerPage.MemoryItems)
	}

	taggedViewerPage, err := repo.GetProfileDiveMemoriesPageByUsername(ctx, ownerUsername, siteSlug, taggedID)
	if err != nil {
		t.Fatalf("tagged viewer dive memories page: %v", err)
	}
	taggedViewerTitles := map[string]bool{}
	for _, memory := range taggedViewerPage.MemoryItems {
		taggedViewerTitles[memory.Title] = true
	}
	if !taggedViewerTitles["Owner marker memory"] || !taggedViewerTitles["Tagged accepted memory"] || taggedViewerTitles["Pending hidden memory"] {
		t.Fatalf("expected only public or accepted tagged owner memories for tagged viewer, got %+v", taggedViewerPage.MemoryItems)
	}

	if _, err := repo.GetProfileDiveMemoriesPageByUsername(ctx, ownerUsername, lockedSiteSlug, ownerID); err == nil {
		t.Fatal("expected locked-site memories page to stay unavailable without user_dive_sites unlock")
	}
}

func seedProfileMapUser(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, username string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name, account_status)
		VALUES ($1, $2, $2, 'active')
		ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, account_status = EXCLUDED.account_status
	`, id, username); err != nil {
		t.Fatalf("seed user %s: %v", id, err)
	}
}

func seedProfileMapSite(t *testing.T, ctx context.Context, pool *pgxpool.Pool, id, slug string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_sites (id, name, slug, area, entry_difficulty, moderation_state)
		VALUES ($1, $2, $2, 'Batangas', 'easy', 'approved')
		ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, moderation_state = EXCLUDED.moderation_state
	`, id, slug); err != nil {
		t.Fatalf("seed site %s: %v", id, err)
	}
}

func seedProfileMapProof(t *testing.T, ctx context.Context, pool *pgxpool.Pool, postID, groupID, objectID, userID, siteID string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO media_objects (id, owner_app_user_id, context_type, object_key, mime_type, size_bytes, width, height, state)
		VALUES ($1, $2, 'profile_feed', $3, 'image/jpeg', 1024, 100, 100, 'active')
		ON CONFLICT (id) DO NOTHING
	`, objectID, userID, objectID+".jpg"); err != nil {
		t.Fatalf("seed media object %s: %v", objectID, err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO media_upload_groups (id, author_app_user_id, source, item_count)
		VALUES ($1, $2, 'create_post', 1)
		ON CONFLICT (id) DO NOTHING
	`, groupID, userID); err != nil {
		t.Fatalf("seed upload group %s: %v", groupID, err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO media_posts (id, author_app_user_id, upload_group_id, dive_site_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO NOTHING
	`, postID, userID, groupID, siteID); err != nil {
		t.Fatalf("seed media post %s: %v", postID, err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO media_items (post_id, media_object_id, author_app_user_id, upload_group_id, dive_site_id, type, storage_key, mime_type, width, height, status, processing_status, moderation_status)
		VALUES ($1, $2, $3, $4, $5, 'photo', $6, 'image/jpeg', 100, 100, 'active', 'ready', 'approved')
		ON CONFLICT (media_object_id) DO NOTHING
	`, postID, objectID, userID, groupID, siteID, objectID+".jpg"); err != nil {
		t.Fatalf("seed media item %s: %v", objectID, err)
	}
}

func insertUserDiveSite(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID, siteID, postID string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		INSERT INTO user_dive_sites (
			user_id, dive_site_id, first_post_id, first_visited_at, last_post_id, last_visited_at, media_post_count, visibility
		)
		VALUES ($1, $2, $3, NOW(), $3, NOW(), 1, 'members')
		ON CONFLICT (user_id, dive_site_id) DO UPDATE
		SET first_post_id = EXCLUDED.first_post_id,
		    last_post_id = EXCLUDED.last_post_id,
		    media_post_count = EXCLUDED.media_post_count,
		    updated_at = NOW()
	`, userID, siteID, postID); err != nil {
		t.Fatalf("insert user dive site: %v", err)
	}
}
