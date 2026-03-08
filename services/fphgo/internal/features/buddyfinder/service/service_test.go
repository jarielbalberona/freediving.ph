package service

import (
	"context"
	"errors"
	"testing"
	"time"

	buddyfinderrepo "fphgo/internal/features/buddyfinder/repo"
)

type stubRepo struct {
	previewByArea []buddyfinderrepo.PreviewIntent
	previewBySite []buddyfinderrepo.PreviewIntent
	memberByArea  []buddyfinderrepo.MemberIntent
	memberBySite  []buddyfinderrepo.MemberIntent
	ownIntents    []buddyfinderrepo.MemberIntent
	sharePreview  buddyfinderrepo.SharePreview
	created       buddyfinderrepo.CreateIntentInput
	createResult  buddyfinderrepo.Intent
	createErr     error
}

func (s *stubRepo) CountPreviewByArea(context.Context, string) (int64, error) {
	return int64(len(s.previewByArea)), nil
}
func (s *stubRepo) ListPreviewByArea(context.Context, string, int32) ([]buddyfinderrepo.PreviewIntent, error) {
	return s.previewByArea, nil
}
func (s *stubRepo) ListPreviewBySite(context.Context, string, int32) ([]buddyfinderrepo.PreviewIntent, error) {
	return s.previewBySite, nil
}
func (s *stubRepo) ListMemberIntentsByArea(context.Context, buddyfinderrepo.ListMemberIntentsInput) ([]buddyfinderrepo.MemberIntent, error) {
	return s.memberByArea, nil
}
func (s *stubRepo) ListMemberIntentsBySite(context.Context, buddyfinderrepo.ListSiteIntentsInput) ([]buddyfinderrepo.MemberIntent, error) {
	return s.memberBySite, nil
}
func (s *stubRepo) ListOwnIntents(context.Context, string) ([]buddyfinderrepo.MemberIntent, error) {
	return s.ownIntents, nil
}
func (s *stubRepo) GetIntentByID(context.Context, string) (buddyfinderrepo.Intent, error) {
	return buddyfinderrepo.Intent{}, errors.New("not implemented")
}
func (s *stubRepo) GetSharePreviewByID(context.Context, string) (buddyfinderrepo.SharePreview, error) {
	return s.sharePreview, nil
}
func (s *stubRepo) CreateIntent(_ context.Context, input buddyfinderrepo.CreateIntentInput) (buddyfinderrepo.Intent, error) {
	s.created = input
	if s.createErr != nil {
		return buddyfinderrepo.Intent{}, s.createErr
	}
	return s.createResult, nil
}
func (s *stubRepo) DeleteIntentByOwner(context.Context, string, string) (int64, error) { return 0, nil }

type stubSiteLookup struct {
	record SiteRecord
	err    error
}

func (s stubSiteLookup) GetSiteForWrite(context.Context, string) (SiteRecord, error) {
	if s.err != nil {
		return SiteRecord{}, s.err
	}
	return s.record, nil
}

func TestCreateIntentWithDiveSiteDerivesArea(t *testing.T) {
	repo := &stubRepo{
		createResult: buddyfinderrepo.Intent{
			ID:         "550e8400-e29b-41d4-a716-446655440020",
			DiveSiteID: "550e8400-e29b-41d4-a716-446655440010",
			Area:       "Moalboal, Cebu",
		},
	}
	svc := New(
		repo,
		WithSiteLookup(stubSiteLookup{record: SiteRecord{
			ID:              "550e8400-e29b-41d4-a716-446655440010",
			Area:            "Moalboal, Cebu",
			ModerationState: "approved",
		}}),
	)
	siteID := "550e8400-e29b-41d4-a716-446655440010"

	intent, err := svc.CreateIntent(context.Background(), CreateIntentInput{
		ActorID:    "550e8400-e29b-41d4-a716-446655440001",
		DiveSiteID: &siteID,
		IntentType: "training",
		TimeWindow: "today",
	})
	if err != nil {
		t.Fatalf("CreateIntent returned error: %v", err)
	}
	if intent.Area != "Moalboal, Cebu" {
		t.Fatalf("expected derived area, got %q", intent.Area)
	}
	if repo.created.Area != "Moalboal, Cebu" {
		t.Fatalf("expected repo area to be derived, got %q", repo.created.Area)
	}
	if repo.created.DiveSiteID != siteID {
		t.Fatalf("expected repo dive site id %q, got %q", siteID, repo.created.DiveSiteID)
	}
}

func TestListMemberIntentsForSitePrioritizesSiteLinkedBeforeAreaFallback(t *testing.T) {
	now := time.Now().UTC()
	repo := &stubRepo{
		memberBySite: []buddyfinderrepo.MemberIntent{
			{ID: "550e8400-e29b-41d4-a716-446655440101", DiveSiteID: "site-1", DisplayName: "Linked One", CreatedAt: now},
			{ID: "550e8400-e29b-41d4-a716-446655440102", DiveSiteID: "site-1", DisplayName: "Linked Two", CreatedAt: now.Add(-time.Minute)},
		},
		memberByArea: []buddyfinderrepo.MemberIntent{
			{ID: "550e8400-e29b-41d4-a716-446655440201", DisplayName: "Area One", Area: "Moalboal, Cebu", CreatedAt: now.Add(-2 * time.Minute)},
			{ID: "550e8400-e29b-41d4-a716-446655440202", DisplayName: "Area Two", Area: "Moalboal, Cebu", CreatedAt: now.Add(-3 * time.Minute)},
		},
	}
	svc := New(repo)

	result, err := svc.ListMemberIntentsForSite(context.Background(), SiteIntentsInput{
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440001",
		SiteID:       "550e8400-e29b-41d4-a716-446655440010",
		Area:         "Moalboal, Cebu",
		Limit:        4,
	})
	if err != nil {
		t.Fatalf("ListMemberIntentsForSite returned error: %v", err)
	}
	if got := len(result.Items); got != 4 {
		t.Fatalf("expected 4 items, got %d", got)
	}
	if result.Items[0].DisplayName != "Linked One" || result.Items[1].DisplayName != "Linked Two" {
		t.Fatalf("expected site-linked items first, got %#v", result.Items)
	}
	if result.SourceBreakdown.SiteLinkedCount != 2 || result.SourceBreakdown.AreaFallbackCount != 2 {
		t.Fatalf("unexpected breakdown: %+v", result.SourceBreakdown)
	}
}

func TestGetSharePreviewRejectsInvalidIntentID(t *testing.T) {
	svc := New(&stubRepo{})

	_, err := svc.GetSharePreview(context.Background(), "bad-id")
	if err == nil {
		t.Fatal("expected validation error for invalid share preview id")
	}
}
