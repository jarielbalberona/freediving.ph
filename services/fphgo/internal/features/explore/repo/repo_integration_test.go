package repo_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

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
