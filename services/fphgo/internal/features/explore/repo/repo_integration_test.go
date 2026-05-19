package repo_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	explorerepo "fphgo/internal/features/explore/repo"
)

func testExplorePool(t *testing.T) *pgxpool.Pool {
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

func TestListLatestUpdatesExcludesHiddenRows(t *testing.T) {
	pool := testExplorePool(t)
	repo := explorerepo.New(pool)
	ctx := context.Background()

	authorID := "41000000-0000-0000-0000-000000000001"
	siteID := "11000000-0000-0000-0000-000000000001"
	username := fmt.Sprintf("explore_hidden_%d", time.Now().UnixNano())

	if _, err := pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name)
		VALUES ($1, $2, 'Explore Author')
		ON CONFLICT (id) DO NOTHING
	`, authorID, username); err != nil {
		t.Skipf("insert user: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO profiles (user_id, home_area)
		VALUES ($1, 'Dauin, Negros Oriental')
		ON CONFLICT (user_id) DO UPDATE SET home_area = EXCLUDED.home_area
	`, authorID); err != nil {
		t.Skipf("insert profile: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_sites (id, name, slug, area, entry_difficulty, verification_status, moderation_state)
		VALUES ($1, 'Verification Site', $2, 'Dauin, Negros Oriental', 'easy', 'verified', 'approved')
		ON CONFLICT (id) DO NOTHING
	`, siteID, fmt.Sprintf("verification-site-%d", time.Now().UnixNano())); err != nil {
		t.Skipf("insert site: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_site_updates (
			id, dive_site_id, author_app_user_id, note, occurred_at, state
		)
		VALUES
			(gen_random_uuid(), $1, $2, 'Visible conditions update', NOW() - INTERVAL '10 minutes', 'active'),
			(gen_random_uuid(), $1, $2, 'Hidden conditions update', NOW() - INTERVAL '5 minutes', 'hidden')
	`, siteID, authorID); err != nil {
		t.Fatalf("insert updates: %v", err)
	}

	items, err := repo.ListLatestUpdates(
		ctx,
		"Dauin, Negros Oriental",
		time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		"ffffffff-ffff-ffff-ffff-ffffffffffff",
		20,
	)
	if err != nil {
		t.Fatalf("list latest updates: %v", err)
	}
	for _, item := range items {
		if item.Note == "Hidden conditions update" {
			t.Fatalf("expected hidden update to be excluded, got %+v", item)
		}
	}

	siteItems, err := repo.ListUpdatesForSite(ctx, explorerepo.ListUpdatesInput{
		SiteID:           siteID,
		CursorOccurredAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:         "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:            20,
	})
	if err != nil {
		t.Fatalf("list updates for site: %v", err)
	}
	for _, item := range siteItems {
		if item.Note == "Hidden conditions update" {
			t.Fatalf("expected hidden site update to be excluded, got %+v", item)
		}
	}
}

func TestSiteSubmissionWorkflowVisibility(t *testing.T) {
	pool := testExplorePool(t)
	repo := explorerepo.New(pool)
	ctx := context.Background()

	submitterID := "42000000-0000-0000-0000-000000000001"
	reviewerID := "42000000-0000-0000-0000-000000000002"
	submitterUsername := fmt.Sprintf("explore_submitter_%d", time.Now().UnixNano())
	reviewerUsername := fmt.Sprintf("explore_reviewer_%d", time.Now().UnixNano())

	for _, user := range []struct {
		id       string
		username string
		name     string
	}{
		{id: submitterID, username: submitterUsername, name: "Explore Submitter"},
		{id: reviewerID, username: reviewerUsername, name: "Explore Reviewer"},
	} {
		if _, err := pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name)
			VALUES ($1, $2, $3)
			ON CONFLICT (id) DO NOTHING
		`, user.id, user.username, user.name); err != nil {
			t.Skipf("insert user: %v", err)
		}
	}

	submission, err := repo.CreateSiteSubmission(ctx, explorerepo.CreateSiteSubmissionInput{
		Name:                 "Secret Reef",
		Slug:                 fmt.Sprintf("pending-%d", time.Now().UnixNano()),
		Area:                 "Puerto Galera, Mindoro",
		Difficulty:           "moderate",
		Hazards:              []string{"surge"},
		SubmittedByAppUserID: submitterID,
	})
	if err != nil {
		t.Fatalf("create submission: %v", err)
	}
	if got := submission.ModerationState; got != "pending" {
		t.Fatalf("expected pending submission, got %q", got)
	}

	publicItems, err := repo.ListSites(ctx, explorerepo.ListSitesInput{
		CursorUpdatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           100,
	})
	if err != nil {
		t.Fatalf("list public sites: %v", err)
	}
	for _, item := range publicItems {
		if item.ID == submission.ID {
			t.Fatalf("pending submission leaked into public list: %+v", item)
		}
	}

	myItems, err := repo.ListMySiteSubmissions(ctx, explorerepo.ListSiteSubmissionsInput{
		SubmittedByAppUserID: submitterID,
		CursorCreatedAt:      time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:             "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:                20,
	})
	if err != nil {
		t.Fatalf("list my submissions: %v", err)
	}
	foundMine := false
	for _, item := range myItems {
		if item.ID == submission.ID {
			foundMine = true
			break
		}
	}
	if !foundMine {
		t.Fatalf("expected submission in owner list")
	}

	pendingItems, err := repo.ListPendingSites(ctx, explorerepo.ListPendingSitesInput{
		CursorCreatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           20,
	})
	if err != nil {
		t.Fatalf("list pending sites: %v", err)
	}
	foundPending := false
	for _, item := range pendingItems {
		if item.ID == submission.ID {
			foundPending = true
			break
		}
	}
	if !foundPending {
		t.Fatalf("expected submission in pending moderation list")
	}

	approved, err := repo.ApproveSite(ctx, submission.ID, fmt.Sprintf("secret-reef-%d", time.Now().UnixNano()), reviewerID, time.Now().UTC(), nil)
	if err != nil {
		t.Fatalf("approve site: %v", err)
	}
	if got := approved.ModerationState; got != "approved" {
		t.Fatalf("expected approved state, got %q", got)
	}

	publicItems, err = repo.ListSites(ctx, explorerepo.ListSitesInput{
		CursorUpdatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           100,
	})
	if err != nil {
		t.Fatalf("list public sites after approval: %v", err)
	}
	foundPublic := false
	for _, item := range publicItems {
		if item.ID == submission.ID {
			foundPublic = true
			break
		}
	}
	if !foundPublic {
		t.Fatalf("approved submission did not appear in public list")
	}

	rejectedSubmission, err := repo.CreateSiteSubmission(ctx, explorerepo.CreateSiteSubmissionInput{
		Name:                 "Rejected Reef",
		Slug:                 fmt.Sprintf("pending-rejected-%d", time.Now().UnixNano()),
		Area:                 "Moalboal, Cebu",
		Difficulty:           "easy",
		Hazards:              []string{"crowds"},
		SubmittedByAppUserID: submitterID,
	})
	if err != nil {
		t.Fatalf("create rejected submission: %v", err)
	}
	reason := "Insufficient detail"
	rejected, err := repo.RejectOrHideSite(ctx, rejectedSubmission.ID, reviewerID, time.Now().UTC(), &reason)
	if err != nil {
		t.Fatalf("reject site: %v", err)
	}
	if got := rejected.ModerationState; got != "hidden" {
		t.Fatalf("expected hidden state after rejection, got %q", got)
	}

	publicItems, err = repo.ListSites(ctx, explorerepo.ListSitesInput{
		CursorUpdatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           100,
	})
	if err != nil {
		t.Fatalf("list public sites after rejection: %v", err)
	}
	for _, item := range publicItems {
		if item.ID == rejectedSubmission.ID {
			t.Fatalf("rejected submission leaked into public list")
		}
	}

	ownerDetail, err := repo.GetMySiteSubmissionByID(ctx, rejectedSubmission.ID, submitterID)
	if err != nil {
		t.Fatalf("get owner submission detail: %v", err)
	}
	if ownerDetail.ModerationState != "hidden" || ownerDetail.ModerationReason != reason {
		t.Fatalf("expected hidden owner detail with moderation reason, got %+v", ownerDetail)
	}
}

func TestSiteEditProposalWorkflowAppliesOnlyAfterApproval(t *testing.T) {
	pool := testExplorePool(t)
	repo := explorerepo.New(pool)
	ctx := context.Background()

	submitterID := uuid.NewString()
	reviewerID := uuid.NewString()
	siteID := uuid.NewString()
	now := time.Now().UnixNano()

	for _, user := range []struct {
		id       string
		username string
		name     string
	}{
		{id: submitterID, username: fmt.Sprintf("site_edit_submitter_%d", now), name: "Site Edit Submitter"},
		{id: reviewerID, username: fmt.Sprintf("site_edit_reviewer_%d", now), name: "Site Edit Reviewer"},
	} {
		if _, err := pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name)
			VALUES ($1, $2, $3)
		`, user.id, user.username, user.name); err != nil {
			t.Skipf("insert user: %v", err)
		}
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_sites (
			id, name, slug, area, description, entry_difficulty, hazards, verification_status, moderation_state
		)
		VALUES ($1, 'Old Reef', $2, 'Moalboal, Cebu', 'Old description for public site.', 'easy', ARRAY['boat traffic'], 'verified', 'approved')
	`, siteID, fmt.Sprintf("old-reef-%d", now)); err != nil {
		t.Skipf("insert site: %v", err)
	}

	proposal, err := repo.CreateSiteEditProposal(ctx, explorerepo.CreateSiteEditProposalInput{
		DiveSiteID:           siteID,
		SubmittedByAppUserID: submitterID,
		Proposed: explorerepo.SiteEditValues{
			Name:        "Updated Reef",
			Description: "Updated description for public site.",
			Difficulty:  "moderate",
			Hazards:     []string{"current"},
		},
	})
	if err != nil {
		t.Fatalf("create site edit proposal: %v", err)
	}
	if proposal.State != "pending" {
		t.Fatalf("expected pending proposal, got %q", proposal.State)
	}

	detail, err := repo.GetSiteBySlug(ctx, proposal.SiteSlug, "")
	if err != nil {
		t.Fatalf("get site detail before approval: %v", err)
	}
	if detail.Name != "Old Reef" || detail.Difficulty != "easy" {
		t.Fatalf("proposal changed public site before approval: %+v", detail)
	}

	pending, err := repo.ListPendingSiteEditProposals(ctx, explorerepo.ListPendingSiteEditProposalsInput{
		CursorCreatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           20,
	})
	if err != nil {
		t.Fatalf("list pending site edits: %v", err)
	}
	foundPending := false
	for _, item := range pending {
		if item.ID == proposal.ID {
			foundPending = true
			break
		}
	}
	if !foundPending {
		t.Fatal("expected proposal in pending moderation list")
	}

	reason := "Verified correction"
	applied, err := repo.ApplySiteEditProposal(ctx, proposal.ID, reviewerID, time.Now().UTC(), &reason)
	if err != nil {
		t.Fatalf("apply site edit proposal: %v", err)
	}
	if applied.State != "applied" || applied.ReviewedByAppUserID != reviewerID || applied.ModerationReason != reason {
		t.Fatalf("expected applied proposal with reviewer, got %+v", applied)
	}

	detail, err = repo.GetSiteBySlug(ctx, proposal.SiteSlug, "")
	if err != nil {
		t.Fatalf("get site detail after approval: %v", err)
	}
	if detail.Name != "Updated Reef" || detail.Difficulty != "moderate" || len(detail.Hazards) != 1 || detail.Hazards[0] != "current" {
		t.Fatalf("approved edit did not update public site: %+v", detail)
	}
}

func TestListSitesBoundsFiltersApprovedSitesAndPreservesSavedState(t *testing.T) {
	pool := testExplorePool(t)
	repo := explorerepo.New(pool)
	ctx := context.Background()

	viewerID := "43000000-0000-0000-0000-000000000001"
	buddyAuthorID := "43000000-0000-0000-0000-000000000002"
	blockedBuddyAuthorID := "43000000-0000-0000-0000-000000000003"
	nonce := time.Now().UnixNano()
	searchName := fmt.Sprintf("Bounds Reef %d", nonce)
	quietName := fmt.Sprintf("Quiet Reef %d", nonce)

	for _, user := range []struct {
		id       string
		username string
		name     string
	}{
		{id: viewerID, username: fmt.Sprintf("bounds_viewer_%d", nonce), name: "Bounds Viewer"},
		{id: buddyAuthorID, username: fmt.Sprintf("bounds_buddy_%d", nonce), name: "Bounds Buddy"},
		{id: blockedBuddyAuthorID, username: fmt.Sprintf("bounds_blocked_%d", nonce), name: "Blocked Buddy"},
	} {
		if _, err := pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name)
			VALUES ($1, $2, $3)
			ON CONFLICT (id) DO NOTHING
		`, user.id, user.username, user.name); err != nil {
			t.Skipf("insert user: %v", err)
		}
	}

	var insideID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO dive_sites (
			name, slug, area, latitude, longitude, entry_difficulty,
			verification_status, moderation_state, last_updated_at, updated_at
		)
		VALUES ($1, $2, 'Mabini, Batangas', 13.75, 120.90, 'easy', 'verified', 'approved', NOW(), NOW())
		RETURNING id
	`, searchName, fmt.Sprintf("bounds-inside-%d", nonce)).Scan(&insideID); err != nil {
		t.Fatalf("insert inside site: %v", err)
	}

	var outsideID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO dive_sites (
			name, slug, area, latitude, longitude, entry_difficulty,
			verification_status, moderation_state, last_updated_at, updated_at
		)
		VALUES ($1, $2, 'Mabini, Batangas', 16.00, 123.00, 'easy', 'verified', 'approved', NOW(), NOW())
		RETURNING id
	`, searchName+" Outside", fmt.Sprintf("bounds-outside-%d", nonce)).Scan(&outsideID); err != nil {
		t.Fatalf("insert outside site: %v", err)
	}

	var pendingID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO dive_sites (
			name, slug, area, latitude, longitude, entry_difficulty,
			verification_status, moderation_state, last_updated_at, updated_at
		)
		VALUES ($1, $2, 'Mabini, Batangas', 13.76, 120.91, 'easy', 'community', 'pending', NOW(), NOW())
		RETURNING id
	`, searchName+" Pending", fmt.Sprintf("bounds-pending-%d", nonce)).Scan(&pendingID); err != nil {
		t.Fatalf("insert pending site: %v", err)
	}

	var quietID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO dive_sites (
			name, slug, area, latitude, longitude, entry_difficulty,
			verification_status, moderation_state, last_updated_at, updated_at
		)
		VALUES ($1, $2, $3, 10.00, 124.00, 'easy', 'verified', 'approved', NOW(), NOW())
		RETURNING id
	`, quietName, fmt.Sprintf("quiet-reef-%d", nonce), fmt.Sprintf("Quiet Area %d", nonce)).Scan(&quietID); err != nil {
		t.Fatalf("insert quiet site: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_site_saves (app_user_id, dive_site_id)
		VALUES ($1, $2), ($1, $3), ($1, $4)
		ON CONFLICT DO NOTHING
	`, viewerID, insideID, outsideID, pendingID); err != nil {
		t.Fatalf("insert save: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, viewerID, blockedBuddyAuthorID); err != nil {
		t.Skipf("insert user block: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO buddy_intents (
			id, author_app_user_id, dive_site_id, area, intent_type, time_window,
			visibility, state, expires_at
		)
		VALUES
			(gen_random_uuid(), $1, $3, 'Mabini, Batangas', 'training', 'weekend', 'members', 'active', NOW() + INTERVAL '2 days'),
			(gen_random_uuid(), $2, $3, 'Mabini, Batangas', 'training', 'weekend', 'members', 'active', NOW() + INTERVAL '2 days'),
			(gen_random_uuid(), $1, NULL, 'Mabini, Batangas', 'fun_dive', 'weekend', 'members', 'active', NOW() + INTERVAL '2 days'),
			(gen_random_uuid(), $1, $3, 'Mabini, Batangas', 'training', 'weekend', 'members', 'active', NOW() - INTERVAL '1 hour'),
			(gen_random_uuid(), $1, $3, 'Mabini, Batangas', 'training', 'weekend', 'members', 'hidden', NOW() + INTERVAL '2 days'),
			(gen_random_uuid(), $1, $4, 'Mabini, Batangas', 'training', 'weekend', 'members', 'active', NOW() + INTERVAL '2 days')
	`, buddyAuthorID, blockedBuddyAuthorID, insideID, pendingID); err != nil {
		t.Fatalf("insert buddy intents: %v", err)
	}

	quietItems, err := repo.ListSites(ctx, explorerepo.ListSitesInput{
		Search:          quietName,
		CursorUpdatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           20,
	})
	if err != nil {
		t.Fatalf("list quiet site: %v", err)
	}
	foundQuiet := false
	for _, item := range quietItems {
		if item.ID == quietID {
			foundQuiet = true
			if item.SiteBuddyIntentCount != 0 || item.AreaBuddyIntentCount != 0 {
				t.Fatalf("expected no buddy signal for quiet site, got %+v", item)
			}
		}
	}
	if !foundQuiet {
		t.Fatalf("expected quiet site in results, got %+v", quietItems)
	}

	noBoundsItems, err := repo.ListSites(ctx, explorerepo.ListSitesInput{
		ViewerUserID:    viewerID,
		Area:            "Mabini, Batangas",
		Difficulty:      "easy",
		VerifiedOnly:    true,
		Search:          searchName,
		CursorUpdatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           100,
	})
	if err != nil {
		t.Fatalf("list sites without bounds: %v", err)
	}
	foundInsideWithoutBounds := false
	foundOutsideWithoutBounds := false
	for _, item := range noBoundsItems {
		switch item.ID {
		case insideID:
			foundInsideWithoutBounds = true
			if item.SiteBuddyIntentCount != 1 {
				t.Fatalf("expected one unblocked active site buddy intent, got %+v", item)
			}
			if item.AreaBuddyIntentCount != 1 {
				t.Fatalf("expected one area fallback intent, got %+v", item)
			}
		case outsideID:
			foundOutsideWithoutBounds = true
			if item.SiteBuddyIntentCount != 0 || item.AreaBuddyIntentCount == 0 {
				t.Fatalf("expected area buddy fallback on outside site, got %+v", item)
			}
		case pendingID:
			t.Fatalf("pending site leaked without bounds: %+v", item)
		}
	}
	if !foundInsideWithoutBounds || !foundOutsideWithoutBounds {
		t.Fatalf("expected both approved matching sites without bounds, got %+v", noBoundsItems)
	}

	guestItems, err := repo.ListSites(ctx, explorerepo.ListSitesInput{
		Area:            "Mabini, Batangas",
		Difficulty:      "easy",
		VerifiedOnly:    true,
		Search:          searchName,
		CursorUpdatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           100,
	})
	if err != nil {
		t.Fatalf("list guest sites with buddy signal: %v", err)
	}
	for _, item := range guestItems {
		if item.ID == insideID && item.SiteBuddyIntentCount != 2 {
			t.Fatalf("expected guest aggregate to include active site intents without private detail, got %+v", item)
		}
	}

	savedOnlyItems, err := repo.ListSites(ctx, explorerepo.ListSitesInput{
		ViewerUserID:    viewerID,
		SavedOnly:       true,
		Area:            "Mabini, Batangas",
		Difficulty:      "easy",
		VerifiedOnly:    true,
		Search:          searchName,
		CursorUpdatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           100,
	})
	if err != nil {
		t.Fatalf("list saved-only sites: %v", err)
	}
	foundSavedInside := false
	foundSavedOutside := false
	for _, item := range savedOnlyItems {
		if !item.IsSaved {
			t.Fatalf("expected saved state on saved-only item: %+v", item)
		}
		switch item.ID {
		case insideID:
			foundSavedInside = true
		case outsideID:
			foundSavedOutside = true
		case pendingID:
			t.Fatalf("saved pending site leaked into saved-only results: %+v", item)
		}
	}
	if !foundSavedInside || !foundSavedOutside {
		t.Fatalf("expected both approved saved matching sites, got %+v", savedOnlyItems)
	}

	boundedItems, err := repo.ListSites(ctx, explorerepo.ListSitesInput{
		ViewerUserID: viewerID,
		SavedOnly:    true,
		Area:         "Mabini, Batangas",
		Difficulty:   "easy",
		VerifiedOnly: true,
		Search:       searchName,
		Bounds: &explorerepo.MapBounds{
			North: 14,
			South: 13,
			East:  121,
			West:  120,
		},
		CursorUpdatedAt: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		CursorID:        "ffffffff-ffff-ffff-ffff-ffffffffffff",
		Limit:           100,
	})
	if err != nil {
		t.Fatalf("list sites with bounds: %v", err)
	}

	foundInside := false
	for _, item := range boundedItems {
		switch item.ID {
		case insideID:
			foundInside = true
			if !item.IsSaved {
				t.Fatalf("expected saved state on bounded item: %+v", item)
			}
		case outsideID:
			t.Fatalf("outside site leaked into bounded results: %+v", item)
		case pendingID:
			t.Fatalf("pending site leaked into bounded results: %+v", item)
		}
	}
	if !foundInside {
		t.Fatalf("expected inside site in bounded results, got %+v", boundedItems)
	}
}

func TestListVisibleDivePresencesGlobalAppliesVisibilityBlocksAndFilters(t *testing.T) {
	pool := testExplorePool(t)
	repo := explorerepo.New(pool)
	ctx := context.Background()
	nonce := time.Now().UnixNano()

	insertUser := func(username, name, status string) string {
		t.Helper()
		var id string
		if err := pool.QueryRow(ctx, `
			INSERT INTO users (id, username, display_name, account_status)
			VALUES (gen_random_uuid(), $1, $2, $3)
			RETURNING id
		`, username, name, status).Scan(&id); err != nil {
			t.Skipf("insert user: %v", err)
		}
		if _, err := pool.Exec(ctx, `
			INSERT INTO profiles (user_id, avatar_url, home_area)
			VALUES ($1, $2, $3)
		`, id, "https://example.test/avatar.png", "Panglao, Bohol"); err != nil {
			t.Skipf("insert profile: %v", err)
		}
		return id
	}

	viewerID := insertUser(fmt.Sprintf("presence_viewer_%d", nonce), "Presence Viewer", "active")
	publicAuthorID := insertUser(fmt.Sprintf("presence_public_%d", nonce), "Public Buddy", "active")
	memberAuthorID := insertUser(fmt.Sprintf("presence_member_%d", nonce), "Member Buddy", "active")
	privateAuthorID := insertUser(fmt.Sprintf("presence_private_%d", nonce), "Private Buddy", "active")
	blockedAuthorID := insertUser(fmt.Sprintf("presence_blocked_%d", nonce), "Blocked Buddy", "active")
	inactiveAuthorID := insertUser(fmt.Sprintf("presence_inactive_%d", nonce), "Inactive Buddy", "suspended")

	var siteID string
	siteSlug := fmt.Sprintf("global-presence-reef-%d", nonce)
	if err := pool.QueryRow(ctx, `
		INSERT INTO dive_sites (
			name, slug, area, entry_difficulty, verification_status, moderation_state, last_updated_at, updated_at
		)
		VALUES ('Global Presence Reef', $1, 'Panglao, Bohol', 'easy', 'verified', 'approved', NOW(), NOW())
		RETURNING id
	`, siteSlug).Scan(&siteID); err != nil {
		t.Fatalf("insert site: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_blocks (blocker_app_user_id, blocked_app_user_id)
		VALUES ($1, $2)
	`, viewerID, blockedAuthorID); err != nil {
		t.Skipf("insert block: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO dive_presences (
			user_id, dive_site_id, presence_type, start_at, end_at, visibility, contact_enabled, note, status
		)
		VALUES
			($1, $7, 'available', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'public', true, 'public visible', 'active'),
			($2, $7, 'training', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'members', true, 'member visible', 'active'),
			($3, $7, 'planning', NULL, NULL, 'private', true, 'private owner only', 'active'),
			($4, $7, 'available', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'members', true, 'blocked', 'active'),
			($5, $7, 'available', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'public', true, 'inactive', 'active'),
			($1, $7, 'available', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', 'public', true, 'expired', 'active'),
			($1, $7, 'available', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'public', true, 'cancelled', 'cancelled')
	`, publicAuthorID, memberAuthorID, privateAuthorID, blockedAuthorID, inactiveAuthorID, viewerID, siteID); err != nil {
		t.Fatalf("insert presences: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_dive_site_affinities (user_id, dive_site_id, relationship, visibility, contact_enabled, note)
		VALUES ($1, $2, 'regular', 'public', true, 'affinity only')
	`, viewerID, siteID); err != nil {
		t.Fatalf("insert affinity: %v", err)
	}

	guestItems, err := repo.ListVisibleDivePresencesGlobal(ctx, explorerepo.GlobalDivePresenceInput{
		SiteSlug: siteSlug,
		Limit:    20,
	})
	if err != nil {
		t.Fatalf("list guest global presences: %v", err)
	}
	if len(guestItems) != 1 || guestItems[0].UserID != publicAuthorID {
		t.Fatalf("expected guest to see only public active presence, got %+v", guestItems)
	}
	if guestItems[0].DiveSiteSlug != siteSlug || guestItems[0].DiveSiteName != "Global Presence Reef" || guestItems[0].DiveSiteArea != "Panglao, Bohol" {
		t.Fatalf("expected dive site display data, got %+v", guestItems[0])
	}

	memberItems, err := repo.ListVisibleDivePresencesGlobal(ctx, explorerepo.GlobalDivePresenceInput{
		ViewerUserID: viewerID,
		SiteSlug:     siteSlug,
		Limit:        20,
	})
	if err != nil {
		t.Fatalf("list member global presences: %v", err)
	}
	seen := map[string]bool{}
	for _, item := range memberItems {
		seen[item.UserID] = true
		if item.Note == "affinity only" {
			t.Fatalf("affinity leaked into global presences: %+v", item)
		}
	}
	if !seen[publicAuthorID] || !seen[memberAuthorID] {
		t.Fatalf("expected public and member presences, got %+v", memberItems)
	}
	for _, hiddenID := range []string{privateAuthorID, blockedAuthorID, inactiveAuthorID} {
		if seen[hiddenID] {
			t.Fatalf("hidden presence leaked for user %s: %+v", hiddenID, memberItems)
		}
	}

	ownerItems, err := repo.ListVisibleDivePresencesGlobal(ctx, explorerepo.GlobalDivePresenceInput{
		ViewerUserID: privateAuthorID,
		SiteSlug:     siteSlug,
		PresenceType: "planning",
		FlexibleOnly: true,
		Limit:        20,
	})
	if err != nil {
		t.Fatalf("list owner private global presences: %v", err)
	}
	if len(ownerItems) != 1 || ownerItems[0].UserID != privateAuthorID || ownerItems[0].PresenceType != "planning" {
		t.Fatalf("expected owner private flexible planning presence, got %+v", ownerItems)
	}
}
