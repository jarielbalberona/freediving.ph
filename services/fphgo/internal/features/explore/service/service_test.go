package service

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	explorerepo "fphgo/internal/features/explore/repo"
	apperrors "fphgo/internal/shared/errors"
)

type repoStub struct {
	listInput    explorerepo.ListSitesInput
	listResult   []explorerepo.SiteCard
	created      explorerepo.CreateSiteSubmissionInput
	createResult explorerepo.SiteSubmission
	createErr    error
	duplicateID  string
	duplicateErr error
}

func (r *repoStub) ListSites(_ context.Context, input explorerepo.ListSitesInput) ([]explorerepo.SiteCard, error) {
	r.listInput = input
	return r.listResult, nil
}

func (r *repoStub) GetSiteBySlug(context.Context, string) (explorerepo.SiteDetail, error) {
	return explorerepo.SiteDetail{}, nil
}

func (r *repoStub) FindApprovedSiteDuplicate(context.Context, string, string) (string, error) {
	return r.duplicateID, r.duplicateErr
}

func (r *repoStub) SlugExists(context.Context, string) (bool, error) { return false, nil }

func (r *repoStub) CreateSiteSubmission(_ context.Context, input explorerepo.CreateSiteSubmissionInput) (explorerepo.SiteSubmission, error) {
	r.created = input
	if r.createErr != nil {
		return explorerepo.SiteSubmission{}, r.createErr
	}
	result := r.createResult
	if result.ID == "" {
		result = explorerepo.SiteSubmission{
			ID:              "550e8400-e29b-41d4-a716-446655440901",
			Name:            input.Name,
			Area:            input.Area,
			Latitude:        input.Latitude,
			Longitude:       input.Longitude,
			Difficulty:      input.Difficulty,
			Hazards:         input.Hazards,
			ModerationState: "pending",
			LastUpdatedAt:   time.Now().UTC(),
			UpdatedAt:       time.Now().UTC(),
			CreatedAt:       time.Now().UTC(),
		}
	}
	return result, nil
}

func (r *repoStub) ListMySiteSubmissions(context.Context, explorerepo.ListSiteSubmissionsInput) ([]explorerepo.SiteSubmission, error) {
	return nil, nil
}

func (r *repoStub) GetMySiteSubmissionByID(context.Context, string, string) (explorerepo.SiteSubmission, error) {
	return explorerepo.SiteSubmission{}, nil
}

func (r *repoStub) ListPendingSites(context.Context, explorerepo.ListPendingSitesInput) ([]explorerepo.SiteSubmission, error) {
	return nil, nil
}

func (r *repoStub) GetSiteByIDForModeration(context.Context, string) (explorerepo.SiteSubmission, error) {
	return explorerepo.SiteSubmission{}, nil
}

func (r *repoStub) ApproveSite(_ context.Context, _ string, _ string, _ string, _ time.Time, _ *string) (explorerepo.SiteSubmission, error) {
	return explorerepo.SiteSubmission{}, nil
}

func (r *repoStub) RejectOrHideSite(_ context.Context, _ string, _ string, _ time.Time, _ *string) (explorerepo.SiteSubmission, error) {
	return explorerepo.SiteSubmission{}, nil
}

func (r *repoStub) ListUpdatesForSite(context.Context, explorerepo.ListUpdatesInput) ([]explorerepo.SiteUpdate, error) {
	return nil, nil
}

func (r *repoStub) ListLatestUpdates(context.Context, string, time.Time, string, int32) ([]explorerepo.LatestUpdate, error) {
	return nil, nil
}

func (r *repoStub) CreateUpdate(context.Context, explorerepo.CreateUpdateInput) (explorerepo.SiteUpdate, error) {
	return explorerepo.SiteUpdate{}, nil
}

func (r *repoStub) GetSiteForWrite(context.Context, string) (explorerepo.SiteSummary, error) {
	return explorerepo.SiteSummary{}, nil
}

func (r *repoStub) SaveSite(context.Context, string, string) error { return nil }

func (r *repoStub) UnsaveSite(context.Context, string, string) error { return nil }

func TestListSitesPassesValidatedBoundsToRepo(t *testing.T) {
	repo := &repoStub{listResult: []explorerepo.SiteCard{{
		ID:            "550e8400-e29b-41d4-a716-446655440101",
		LastUpdatedAt: time.Now().UTC(),
	}}}
	svc := New(repo)

	_, err := svc.ListSites(context.Background(), ListSitesInput{
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		SavedOnly:    true,
		Bounds: &MapBounds{
			North: 14.0,
			South: 13.0,
			East:  121.0,
			West:  120.0,
		},
		Limit: 20,
	})
	if err != nil {
		t.Fatalf("list sites: %v", err)
	}
	if repo.listInput.Bounds == nil {
		t.Fatal("expected bounds to be passed to repo")
	}
	if repo.listInput.Bounds.North != 14.0 || repo.listInput.Bounds.South != 13.0 || repo.listInput.Bounds.East != 121.0 || repo.listInput.Bounds.West != 120.0 {
		t.Fatalf("unexpected repo bounds: %+v", repo.listInput.Bounds)
	}
	if !repo.listInput.SavedOnly {
		t.Fatalf("expected saved-only to be passed to repo, got %+v", repo.listInput)
	}
}

func TestListSitesSavedOnlyRequiresViewer(t *testing.T) {
	svc := New(&repoStub{})

	_, err := svc.ListSites(context.Background(), ListSitesInput{
		SavedOnly: true,
		Limit:     20,
	})
	if err == nil {
		t.Fatal("expected saved-only auth error")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != http.StatusUnauthorized || appErr.Code != "authentication_required" {
		t.Fatalf("unexpected error: %+v", appErr)
	}
}

func TestListSitesSavedOnlyStillPaginates(t *testing.T) {
	updatedAt := time.Now().UTC()
	repo := &repoStub{listResult: []explorerepo.SiteCard{
		{
			ID:            "550e8400-e29b-41d4-a716-446655440101",
			LastUpdatedAt: updatedAt,
			IsSaved:       true,
		},
		{
			ID:            "550e8400-e29b-41d4-a716-446655440102",
			LastUpdatedAt: updatedAt.Add(-time.Minute),
			IsSaved:       true,
		},
	}}
	svc := New(repo)

	result, err := svc.ListSites(context.Background(), ListSitesInput{
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		SavedOnly:    true,
		Limit:        1,
	})
	if err != nil {
		t.Fatalf("list saved-only sites: %v", err)
	}
	if repo.listInput.Limit != 2 {
		t.Fatalf("expected repo limit+1 pagination fetch, got %d", repo.listInput.Limit)
	}
	if len(result.Items) != 1 || result.NextCursor == "" {
		t.Fatalf("expected one item and next cursor, got %+v", result)
	}
}

func TestListSitesRejectsInvalidBounds(t *testing.T) {
	tests := []struct {
		name   string
		bounds MapBounds
		path   string
	}{
		{
			name:   "latitude range",
			bounds: MapBounds{North: 91, South: 13, East: 121, West: 120},
			path:   "north",
		},
		{
			name:   "longitude range",
			bounds: MapBounds{North: 14, South: 13, East: 181, West: 120},
			path:   "east",
		},
		{
			name:   "north before south",
			bounds: MapBounds{North: 13, South: 14, East: 121, West: 120},
			path:   "bounds",
		},
		{
			name:   "antimeridian unsupported",
			bounds: MapBounds{North: 14, South: 13, East: 120, West: 121},
			path:   "bounds",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := New(&repoStub{})
			_, err := svc.ListSites(context.Background(), ListSitesInput{
				Bounds: &tt.bounds,
				Limit:  20,
			})
			if err == nil {
				t.Fatal("expected validation error")
			}
			failure, ok := err.(ValidationFailure)
			if !ok {
				t.Fatalf("expected ValidationFailure, got %T", err)
			}
			if len(failure.Issues) == 0 || failure.Issues[0].Path[0] != tt.path {
				t.Fatalf("expected first issue path %q, got %+v", tt.path, failure.Issues)
			}
		})
	}
}

type geocoderStub struct {
	area     string
	err      error
	called   bool
	lat, lng float64
}

func (g *geocoderStub) ReverseGeocodeArea(_ context.Context, lat, lng float64) (string, error) {
	g.called = true
	g.lat = lat
	g.lng = lng
	if g.err != nil {
		return "", g.err
	}
	return g.area, nil
}

func TestCreateSiteSubmissionRequiresCoordinates(t *testing.T) {
	svc := New(&repoStub{}, WithReverseGeocoder(&geocoderStub{area: "Mabini, Batangas"}))

	_, err := svc.CreateSiteSubmission(context.Background(), CreateSiteSubmissionInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		Name:        "Cathedral",
		Description: "Steep wall with reef fish.",
		Difficulty:  "easy",
	})
	if err == nil {
		t.Fatal("expected validation error")
	}

	failure, ok := err.(ValidationFailure)
	if !ok {
		t.Fatalf("expected ValidationFailure, got %T", err)
	}
	if len(failure.Issues) != 2 {
		t.Fatalf("expected 2 issues, got %+v", failure.Issues)
	}
}

func TestCreateSiteSubmissionRejectsInvalidCoordinateRanges(t *testing.T) {
	lat := 91.0
	lng := 181.0
	svc := New(&repoStub{}, WithReverseGeocoder(&geocoderStub{area: "Mabini, Batangas"}))

	_, err := svc.CreateSiteSubmission(context.Background(), CreateSiteSubmissionInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		Name:        "Cathedral",
		Description: "Steep wall with reef fish.",
		Lat:         &lat,
		Lng:         &lng,
		Difficulty:  "easy",
	})
	if err == nil {
		t.Fatal("expected validation error")
	}

	failure, ok := err.(ValidationFailure)
	if !ok {
		t.Fatalf("expected ValidationFailure, got %T", err)
	}
	if len(failure.Issues) != 2 {
		t.Fatalf("expected 2 issues, got %+v", failure.Issues)
	}
}

func TestCreateSiteSubmissionDerivesAreaBeforePersisting(t *testing.T) {
	lat := 13.7244
	lng := 120.8820
	repo := &repoStub{duplicateErr: pgx.ErrNoRows}
	geocoder := &geocoderStub{area: "Mabini, Batangas"}
	svc := New(repo, WithReverseGeocoder(geocoder))

	_, err := svc.CreateSiteSubmission(context.Background(), CreateSiteSubmissionInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		Name:        "Cathedral",
		Description: "Steep wall with reef fish.",
		Lat:         &lat,
		Lng:         &lng,
		Difficulty:  "easy",
		Hazards:     []string{"surge", "surge"},
	})
	if err != nil {
		t.Fatalf("create submission: %v", err)
	}

	if !geocoder.called {
		t.Fatal("expected reverse geocoder to be called")
	}
	if repo.created.Area != "Mabini, Batangas" {
		t.Fatalf("expected derived area to be persisted, got %q", repo.created.Area)
	}
	if repo.created.Description != "Steep wall with reef fish." {
		t.Fatalf("expected description to be persisted, got %q", repo.created.Description)
	}
	if repo.created.Latitude == nil || repo.created.Longitude == nil {
		t.Fatalf("expected coordinates to be persisted, got %+v", repo.created)
	}
	if len(repo.created.Hazards) != 1 || repo.created.Hazards[0] != "surge" {
		t.Fatalf("expected hazards to be cleaned, got %+v", repo.created.Hazards)
	}
}

func TestCreateSiteSubmissionReturnsLocationValidationErrorWhenGeocodeFails(t *testing.T) {
	lat := 13.7244
	lng := 120.8820
	svc := New(&repoStub{}, WithReverseGeocoder(&geocoderStub{err: errors.New("boom")}))

	_, err := svc.CreateSiteSubmission(context.Background(), CreateSiteSubmissionInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		Name:        "Cathedral",
		Description: "Steep wall with reef fish.",
		Lat:         &lat,
		Lng:         &lng,
		Difficulty:  "easy",
	})
	if err == nil {
		t.Fatal("expected validation error")
	}

	failure, ok := err.(ValidationFailure)
	if !ok {
		t.Fatalf("expected ValidationFailure, got %T", err)
	}
	if len(failure.Issues) != 1 {
		t.Fatalf("expected 1 issue, got %+v", failure.Issues)
	}
	issue := failure.Issues[0]
	if got := issue.Path; len(got) != 1 || got[0] != "location" {
		t.Fatalf("expected location path, got %+v", got)
	}
	if issue.Code != "invalid_location" {
		t.Fatalf("expected invalid_location code, got %q", issue.Code)
	}
	if issue.Message != "Unable to determine area from map pin. Please pick a different spot." {
		t.Fatalf("unexpected message: %q", issue.Message)
	}
}
