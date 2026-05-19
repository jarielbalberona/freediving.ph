package service

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	explorerepo "fphgo/internal/features/explore/repo"
	feedservice "fphgo/internal/features/feed/service"
	apperrors "fphgo/internal/shared/errors"
)

type repoStub struct {
	listInput     explorerepo.ListSitesInput
	listResult    []explorerepo.SiteCard
	created       explorerepo.CreateSiteSubmissionInput
	createResult  explorerepo.SiteSubmission
	createErr     error
	editCreated   explorerepo.CreateSiteEditProposalInput
	editProposal  explorerepo.SiteEditProposal
	duplicateID   string
	duplicateErr  error
	likeState     explorerepo.LikeState
	likedSiteID   string
	unlikedSiteID string
	likeUserID    string
	siteDetail    explorerepo.SiteDetail
	presences     []explorerepo.VisibleDivePresence
	myPresences   []explorerepo.VisibleDivePresence
	globalInput   explorerepo.GlobalDivePresenceInput
	affinities    []explorerepo.VisibleDiveSiteAffinity
	myAffinities  []explorerepo.DiveSiteAffinity
	reviews       []explorerepo.VisibleDiveSiteReview
}

func (r *repoStub) ListSites(_ context.Context, input explorerepo.ListSitesInput) ([]explorerepo.SiteCard, error) {
	r.listInput = input
	return r.listResult, nil
}

func (r *repoStub) GetSiteBySlug(context.Context, string, string) (explorerepo.SiteDetail, error) {
	return r.siteDetail, nil
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

func (r *repoStub) CreateSiteEditProposal(_ context.Context, input explorerepo.CreateSiteEditProposalInput) (explorerepo.SiteEditProposal, error) {
	r.editCreated = input
	result := r.editProposal
	if result.ID == "" {
		result = explorerepo.SiteEditProposal{
			ID:                     "550e8400-e29b-41d4-a716-446655440902",
			DiveSiteID:             input.DiveSiteID,
			SiteSlug:               r.siteDetail.Slug,
			SiteArea:               r.siteDetail.Area,
			SubmittedByAppUserID:   input.SubmittedByAppUserID,
			SubmittedByDisplayName: "Member",
			State:                  "pending",
			Current: explorerepo.SiteEditValues{
				Name:        r.siteDetail.Name,
				Description: r.siteDetail.Description,
				Difficulty:  r.siteDetail.Difficulty,
				DepthMinM:   r.siteDetail.DepthMinM,
				DepthMaxM:   r.siteDetail.DepthMaxM,
				Hazards:     r.siteDetail.Hazards,
			},
			Proposed:  input.Proposed,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
	}
	return result, nil
}

func (r *repoStub) ListMySiteEditProposals(context.Context, explorerepo.ListSiteEditProposalsInput) ([]explorerepo.SiteEditProposal, error) {
	return nil, nil
}

func (r *repoStub) GetMySiteEditProposalByID(context.Context, string, string) (explorerepo.SiteEditProposal, error) {
	return r.editProposal, nil
}

func (r *repoStub) ListPendingSiteEditProposals(context.Context, explorerepo.ListPendingSiteEditProposalsInput) ([]explorerepo.SiteEditProposal, error) {
	return nil, nil
}

func (r *repoStub) GetSiteEditProposalForModeration(context.Context, string) (explorerepo.SiteEditProposal, error) {
	return r.editProposal, nil
}

func (r *repoStub) ApplySiteEditProposal(_ context.Context, _ string, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteEditProposal, error) {
	result := r.editProposal
	if result.ID == "" {
		result.ID = "550e8400-e29b-41d4-a716-446655440902"
	}
	result.State = "applied"
	result.ReviewedByAppUserID = reviewedByAppUserID
	result.ReviewedAt = &reviewedAt
	result.ModerationReason = stringOrEmpty(moderationReason)
	return result, nil
}

func (r *repoStub) RejectSiteEditProposal(_ context.Context, _ string, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (explorerepo.SiteEditProposal, error) {
	result := r.editProposal
	result.State = "rejected"
	result.ReviewedByAppUserID = reviewedByAppUserID
	result.ReviewedAt = &reviewedAt
	result.ModerationReason = stringOrEmpty(moderationReason)
	return result, nil
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

func (r *repoStub) GetVisibleDiveSiteLikeState(_ context.Context, siteID, _ string) (explorerepo.LikeState, error) {
	if r.likeState.TargetID == "" {
		return explorerepo.LikeState{TargetID: siteID}, nil
	}
	return r.likeState, nil
}

func (r *repoStub) LikeDiveSite(_ context.Context, siteID, userID string) error {
	r.likedSiteID = siteID
	r.likeUserID = userID
	r.likeState = explorerepo.LikeState{TargetID: siteID, LikeCount: 1, ViewerHasLiked: true}
	return nil
}

func (r *repoStub) UnlikeDiveSite(_ context.Context, siteID, userID string) error {
	r.unlikedSiteID = siteID
	r.likeUserID = userID
	r.likeState = explorerepo.LikeState{TargetID: siteID, LikeCount: 0, ViewerHasLiked: false}
	return nil
}

func (r *repoStub) CreateDivePresence(_ context.Context, input explorerepo.CreateDivePresenceInput) (explorerepo.DivePresence, error) {
	return explorerepo.DivePresence{ID: "550e8400-e29b-41d4-a716-446655441001", UserID: input.UserID, DiveSiteID: input.DiveSiteID, PresenceType: input.PresenceType, Visibility: input.Visibility, ContactEnabled: input.ContactEnabled, Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (r *repoStub) UpdateDivePresenceByOwner(_ context.Context, presenceID string, input explorerepo.CreateDivePresenceInput) (explorerepo.DivePresence, error) {
	return explorerepo.DivePresence{ID: presenceID, UserID: input.UserID, DiveSiteID: input.DiveSiteID, PresenceType: input.PresenceType, Visibility: input.Visibility, ContactEnabled: input.ContactEnabled, Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (r *repoStub) CancelDivePresenceByOwner(context.Context, string, string, string) (int64, error) {
	return 1, nil
}

func (r *repoStub) ExpirePastDivePresences(context.Context) error { return nil }

func (r *repoStub) CountActiveDivePresencesByUser(context.Context, string) (int64, error) {
	return 0, nil
}

func (r *repoStub) ListCurrentUserDivePresences(_ context.Context, userID string) ([]explorerepo.VisibleDivePresence, error) {
	r.likeUserID = userID
	return r.myPresences, nil
}

func (r *repoStub) ListVisibleDivePresencesGlobal(_ context.Context, input explorerepo.GlobalDivePresenceInput) ([]explorerepo.VisibleDivePresence, error) {
	r.globalInput = input
	return r.presences, nil
}

func (r *repoStub) ListVisibleDivePresencesBySite(context.Context, string, string, int32) ([]explorerepo.VisibleDivePresence, error) {
	return r.presences, nil
}

func (r *repoStub) CountVisibleDivePresencesBySite(context.Context, string, string) (int64, error) {
	return int64(len(r.presences)), nil
}

func (r *repoStub) UpsertDiveSiteAffinity(_ context.Context, input explorerepo.UpsertDiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error) {
	return explorerepo.DiveSiteAffinity{ID: "550e8400-e29b-41d4-a716-446655441002", UserID: input.UserID, DiveSiteID: input.DiveSiteID, Relationship: input.Relationship, Visibility: input.Visibility, ContactEnabled: input.ContactEnabled, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (r *repoStub) UpdateDiveSiteAffinityByOwner(_ context.Context, affinityID string, input explorerepo.UpsertDiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error) {
	return explorerepo.DiveSiteAffinity{ID: affinityID, UserID: input.UserID, DiveSiteID: input.DiveSiteID, Relationship: input.Relationship, Visibility: input.Visibility, ContactEnabled: input.ContactEnabled, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (r *repoStub) DeleteDiveSiteAffinityByOwner(context.Context, string, string, string) (int64, error) {
	return 1, nil
}

func (r *repoStub) ListCurrentUserDiveSiteAffinities(_ context.Context, userID string) ([]explorerepo.DiveSiteAffinity, error) {
	r.likeUserID = userID
	return r.myAffinities, nil
}

func (r *repoStub) ListVisibleDiveSiteAffinitiesBySite(context.Context, string, string, int32) ([]explorerepo.VisibleDiveSiteAffinity, error) {
	return r.affinities, nil
}

func (r *repoStub) CountVisibleDiveSiteAffinitiesBySite(context.Context, string, string) (int64, error) {
	return int64(len(r.affinities)), nil
}

func (r *repoStub) UpsertDiveSiteReview(_ context.Context, input explorerepo.UpsertDiveSiteReviewInput) (explorerepo.DiveSiteReview, error) {
	return explorerepo.DiveSiteReview{ID: "550e8400-e29b-41d4-a716-446655441003", UserID: input.UserID, DiveSiteID: input.DiveSiteID, Rating: input.Rating, Comment: stringOrEmpty(input.Comment), Visibility: input.Visibility, Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (r *repoStub) ListVisibleDiveSiteReviewsBySite(context.Context, string, string, int32) ([]explorerepo.VisibleDiveSiteReview, error) {
	return r.reviews, nil
}

func (r *repoStub) CountVisibleDiveSiteReviewsBySite(context.Context, string, string) (int64, error) {
	return int64(len(r.reviews)), nil
}

func (r *repoStub) GetVisibleDiveSiteReviewSummaryBySite(context.Context, string, string) (explorerepo.DiveSiteReviewSummary, error) {
	if len(r.reviews) == 0 {
		return explorerepo.DiveSiteReviewSummary{}, nil
	}
	var total int32
	for _, item := range r.reviews {
		total += item.Rating
	}
	return explorerepo.DiveSiteReviewSummary{AverageRating: float64(total) / float64(len(r.reviews)), ReviewCount: int64(len(r.reviews))}, nil
}

func stringOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

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

func TestGetRelatedBySlugSeparatesPresenceAndAffinity(t *testing.T) {
	repo := &repoStub{
		siteDetail: explorerepo.SiteDetail{
			ID:                 "550e8400-e29b-41d4-a716-446655440101",
			Slug:               "napaling-reef",
			Name:               "Napaling Reef",
			Area:               "Panglao, Bohol",
			Difficulty:         "easy",
			VerificationStatus: "verified",
			LastUpdatedAt:      time.Now().UTC(),
			CreatedAt:          time.Now().UTC(),
		},
		presences: []explorerepo.VisibleDivePresence{{
			DivePresence: explorerepo.DivePresence{
				ID:             "550e8400-e29b-41d4-a716-446655441001",
				UserID:         "550e8400-e29b-41d4-a716-446655441101",
				DiveSiteID:     "550e8400-e29b-41d4-a716-446655440101",
				PresenceType:   "available",
				Visibility:     "members",
				ContactEnabled: true,
				Status:         "active",
				CreatedAt:      time.Now().UTC(),
				UpdatedAt:      time.Now().UTC(),
			},
		}},
		affinities: []explorerepo.VisibleDiveSiteAffinity{{
			DiveSiteAffinity: explorerepo.DiveSiteAffinity{
				ID:           "550e8400-e29b-41d4-a716-446655441002",
				UserID:       "550e8400-e29b-41d4-a716-446655441102",
				DiveSiteID:   "550e8400-e29b-41d4-a716-446655440101",
				Relationship: "regular",
				Visibility:   "members",
				CreatedAt:    time.Now().UTC(),
				UpdatedAt:    time.Now().UTC(),
			},
		}},
		reviews: []explorerepo.VisibleDiveSiteReview{{
			DiveSiteReview: explorerepo.DiveSiteReview{
				ID:         "550e8400-e29b-41d4-a716-446655441003",
				UserID:     "550e8400-e29b-41d4-a716-446655441103",
				DiveSiteID: "550e8400-e29b-41d4-a716-446655440101",
				Rating:     5,
				Visibility: "members",
				Status:     "active",
				CreatedAt:  time.Now().UTC(),
				UpdatedAt:  time.Now().UTC(),
			},
		}},
	}
	svc := New(repo)

	result, err := svc.GetRelatedBySlug(context.Background(), "550e8400-e29b-41d4-a716-446655440000", "napaling-reef")
	if err != nil {
		t.Fatalf("related: %v", err)
	}
	if result.Counts.AvailableBuddies != 1 || result.Counts.LocalRegulars != 1 || result.Counts.Reviews != 1 {
		t.Fatalf("unexpected counts: %+v", result.Counts)
	}
	if len(result.Previews.AvailableBuddies) != 1 || result.Previews.AvailableBuddies[0].PresenceType != "available" {
		t.Fatalf("expected presence-backed available buddy, got %+v", result.Previews.AvailableBuddies)
	}
	if len(result.Previews.LocalRegulars) != 1 || result.Previews.LocalRegulars[0].Relationship != "regular" {
		t.Fatalf("expected affinity-backed local regular, got %+v", result.Previews.LocalRegulars)
	}
	if len(result.Previews.Reviews) != 1 || result.Previews.Reviews[0].Rating != 5 || result.Counts.AverageRating != 5 {
		t.Fatalf("expected dive site review preview, got counts=%+v reviews=%+v", result.Counts, result.Previews.Reviews)
	}
}

func TestListGlobalDivePresencesReturnsSiteBackedActivePresence(t *testing.T) {
	startAt := time.Now().UTC().Add(2 * time.Hour)
	endAt := startAt.Add(3 * time.Hour)
	repo := &repoStub{
		presences: []explorerepo.VisibleDivePresence{{
			DivePresence: explorerepo.DivePresence{
				ID:             "550e8400-e29b-41d4-a716-446655442001",
				UserID:         "550e8400-e29b-41d4-a716-446655442101",
				DiveSiteID:     "550e8400-e29b-41d4-a716-446655440101",
				PresenceType:   "available",
				StartAt:        &startAt,
				EndAt:          &endAt,
				Visibility:     "members",
				ContactEnabled: true,
				Status:         "active",
				CreatedAt:      time.Now().UTC(),
				UpdatedAt:      time.Now().UTC(),
			},
			Username:       "napaling_buddy",
			DisplayName:    "Napaling Buddy",
			DiveSiteSlug:   "napaling-reef",
			DiveSiteName:   "Napaling Reef",
			DiveSiteArea:   "Panglao, Bohol",
			ContactAllowed: true,
		}},
	}
	svc := New(repo)

	result, err := svc.ListGlobalDivePresences(context.Background(), GlobalDivePresencesInput{
		ViewerID:     "550e8400-e29b-41d4-a716-446655440000",
		SiteSlug:     "napaling-reef",
		Area:         "Bohol",
		PresenceType: "available",
		DateFrom:     startAt.Add(-time.Hour),
		DateTo:       endAt.Add(time.Hour),
		Limit:        1,
	})
	if err != nil {
		t.Fatalf("list global dive presences: %v", err)
	}
	if repo.globalInput.SiteSlug != "napaling-reef" || repo.globalInput.Area != "Bohol" || repo.globalInput.PresenceType != "available" {
		t.Fatalf("expected filters to reach repo, got %+v", repo.globalInput)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected one global presence, got %+v", result.Items)
	}
	item := result.Items[0]
	if item.DiveSiteSlug != "napaling-reef" || item.DiveSiteName != "Napaling Reef" || item.DisplayName != "Napaling Buddy" {
		t.Fatalf("expected presence with dive site and user display data, got %+v", item)
	}
}

func TestListGlobalDivePresencesRejectsUnknownPresenceType(t *testing.T) {
	svc := New(&repoStub{})

	_, err := svc.ListGlobalDivePresences(context.Background(), GlobalDivePresencesInput{
		PresenceType: "buddy_intent",
	})
	if err == nil {
		t.Fatal("expected invalid presence type error")
	}
}

func TestCurrentUserDivePresenceAndAffinityManagementLists(t *testing.T) {
	repo := &repoStub{
		myPresences: []explorerepo.VisibleDivePresence{{
			DivePresence: explorerepo.DivePresence{
				ID:           "550e8400-e29b-41d4-a716-446655442011",
				UserID:       "550e8400-e29b-41d4-a716-446655440000",
				DiveSiteID:   "550e8400-e29b-41d4-a716-446655440101",
				PresenceType: "training",
				Visibility:   "private",
				Status:       "active",
				CreatedAt:    time.Now().UTC(),
				UpdatedAt:    time.Now().UTC(),
			},
			DiveSiteSlug: "apo-island",
			DiveSiteName: "Apo Island",
		}},
		myAffinities: []explorerepo.DiveSiteAffinity{{
			ID:           "550e8400-e29b-41d4-a716-446655442012",
			UserID:       "550e8400-e29b-41d4-a716-446655440000",
			DiveSiteID:   "550e8400-e29b-41d4-a716-446655440101",
			Relationship: "regular",
			Visibility:   "members",
			CreatedAt:    time.Now().UTC(),
			UpdatedAt:    time.Now().UTC(),
			DiveSiteSlug: "apo-island",
			DiveSiteName: "Apo Island",
		}},
	}
	svc := New(repo)

	presences, err := svc.ListMyDivePresences(context.Background(), "550e8400-e29b-41d4-a716-446655440000")
	if err != nil {
		t.Fatalf("list my dive presences: %v", err)
	}
	if len(presences.Items) != 1 || presences.Items[0].PresenceType != "training" || presences.Items[0].DiveSiteSlug != "apo-island" {
		t.Fatalf("expected current user presence with site data, got %+v", presences.Items)
	}

	affinities, err := svc.ListMyDiveSiteAffinities(context.Background(), "550e8400-e29b-41d4-a716-446655440000")
	if err != nil {
		t.Fatalf("list my dive site affinities: %v", err)
	}
	if len(affinities.Items) != 1 || affinities.Items[0].Relationship != "regular" || affinities.Items[0].DiveSiteSlug != "apo-island" {
		t.Fatalf("expected current user affinity with site data, got %+v", affinities.Items)
	}
}

func TestLikeDiveSiteRequiresActor(t *testing.T) {
	svc := New(&repoStub{})

	_, err := svc.LikeDiveSite(context.Background(), "", "550e8400-e29b-41d4-a716-446655440101")
	if err == nil {
		t.Fatal("expected auth error")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized, got %+v", appErr)
	}
}

func TestLikeDiveSiteUpdatesState(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo)

	result, err := svc.LikeDiveSite(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"550e8400-e29b-41d4-a716-446655440101",
	)
	if err != nil {
		t.Fatalf("like dive site: %v", err)
	}
	if repo.likedSiteID != "550e8400-e29b-41d4-a716-446655440101" || repo.likeUserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected repo like call, got site=%q user=%q", repo.likedSiteID, repo.likeUserID)
	}
	if result.TargetID != "550e8400-e29b-41d4-a716-446655440101" || result.LikeCount != 1 || !result.ViewerHasLiked {
		t.Fatalf("unexpected like result: %+v", result)
	}
}

func TestUnlikeDiveSiteUpdatesState(t *testing.T) {
	repo := &repoStub{likeState: explorerepo.LikeState{
		TargetID:       "550e8400-e29b-41d4-a716-446655440101",
		LikeCount:      1,
		ViewerHasLiked: true,
	}}
	svc := New(repo)

	result, err := svc.UnlikeDiveSite(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"550e8400-e29b-41d4-a716-446655440101",
	)
	if err != nil {
		t.Fatalf("unlike dive site: %v", err)
	}
	if repo.unlikedSiteID != "550e8400-e29b-41d4-a716-446655440101" || repo.likeUserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected repo unlike call, got site=%q user=%q", repo.unlikedSiteID, repo.likeUserID)
	}
	if result.TargetID != "550e8400-e29b-41d4-a716-446655440101" || result.LikeCount != 0 || result.ViewerHasLiked {
		t.Fatalf("unexpected unlike result: %+v", result)
	}
}

type activityFeedStub struct {
	inputs []feedservice.ActivityInput
	result feedservice.ActivityResult
	count  int64
}

func (f *activityFeedStub) Activity(_ context.Context, input feedservice.ActivityInput) (feedservice.ActivityResult, error) {
	f.inputs = append(f.inputs, input)
	return f.result, nil
}

func (f *activityFeedStub) CountActivity(_ context.Context, input feedservice.ActivityInput) (int64, error) {
	f.inputs = append(f.inputs, input)
	return f.count, nil
}

func TestListCommunityPostsBySlugUsesExplicitDiveSiteAndMediaType(t *testing.T) {
	siteID := "550e8400-e29b-41d4-a716-446655440101"
	feed := &activityFeedStub{result: feedservice.ActivityResult{
		Items: []feedservice.ActivityItem{{
			ID:         "activity-1",
			Type:       feedservice.ActivityMediaPostCreated,
			DiveSiteID: siteID,
		}},
		NextCursor: "next-page",
	}}
	svc := New(&repoStub{siteDetail: explorerepo.SiteDetail{
		ID:   siteID,
		Slug: "napaling-reef-panglao",
		Name: "Napaling Reef",
		Area: "Panglao, Bohol",
	}}, WithActivityFeed(feed))

	result, err := svc.ListCommunityPostsBySlug(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"napaling-reef-panglao",
		"cursor-1",
		6,
	)
	if err != nil {
		t.Fatalf("list community posts: %v", err)
	}
	if len(result.Items) != 1 || result.NextCursor != "next-page" {
		t.Fatalf("unexpected community result: %+v", result)
	}
	if len(feed.inputs) != 1 {
		t.Fatalf("expected one activity call, got %d", len(feed.inputs))
	}
	input := feed.inputs[0]
	if input.DiveSiteID != siteID {
		t.Fatalf("expected exact dive site id filter, got %+v", input)
	}
	if input.Region != "" || input.Mode != feedservice.ModeLatest {
		t.Fatalf("expected no free-text region matching and latest mode, got %+v", input)
	}
	if input.Cursor != "cursor-1" || input.Limit != 6 {
		t.Fatalf("expected cursor pagination, got %+v", input)
	}
	if len(input.Types) != 1 || input.Types[0] != feedservice.ActivityMediaPostCreated {
		t.Fatalf("expected media-post-only filter, got %+v", input.Types)
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

func TestCreateSiteEditProposalStoresPendingProposalForMember(t *testing.T) {
	minDepth := 3.0
	maxDepth := 18.0
	repo := &repoStub{siteDetail: explorerepo.SiteDetail{
		ID:          "550e8400-e29b-41d4-a716-446655440101",
		Slug:        "sardine-run",
		Name:        "Sardine Run",
		Area:        "Moalboal, Cebu",
		Description: "Known sardine bait ball site.",
		Difficulty:  "easy",
		DepthMinM:   &minDepth,
		DepthMaxM:   &maxDepth,
		Hazards:     []string{"boat traffic"},
	}}
	svc := New(repo)

	result, err := svc.CreateSiteEditProposal(context.Background(), CreateSiteEditProposalInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		ActorRole:   "member",
		Slug:        "sardine-run",
		Name:        "Sardine Run",
		Description: "Known sardine bait ball site with shore entry.",
		Difficulty:  "easy",
		DepthMinM:   &minDepth,
		DepthMaxM:   &maxDepth,
		Hazards:     []string{"boat traffic", "boat traffic"},
	})
	if err != nil {
		t.Fatalf("create site edit proposal: %v", err)
	}
	if result.AppliedImmediately {
		t.Fatal("member edit should not apply immediately")
	}
	if result.Proposal.State != "pending" {
		t.Fatalf("expected pending proposal, got %q", result.Proposal.State)
	}
	if repo.editCreated.DiveSiteID != repo.siteDetail.ID {
		t.Fatalf("expected edit proposal to target approved site, got %+v", repo.editCreated)
	}
	if repo.editCreated.Proposed.Description != "Known sardine bait ball site with shore entry." {
		t.Fatalf("expected proposed description to be stored, got %+v", repo.editCreated.Proposed)
	}
	if len(repo.editCreated.Proposed.Hazards) != 1 || repo.editCreated.Proposed.Hazards[0] != "boat traffic" {
		t.Fatalf("expected hazards to be cleaned, got %+v", repo.editCreated.Proposed.Hazards)
	}
}

func TestCreateSiteEditProposalAppliesImmediatelyForSuperAdmin(t *testing.T) {
	repo := &repoStub{siteDetail: explorerepo.SiteDetail{
		ID:          "550e8400-e29b-41d4-a716-446655440101",
		Slug:        "sardine-run",
		Name:        "Sardine Run",
		Area:        "Moalboal, Cebu",
		Description: "Known sardine bait ball site.",
		Difficulty:  "easy",
	}}
	svc := New(repo)

	result, err := svc.CreateSiteEditProposal(context.Background(), CreateSiteEditProposalInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		ActorRole:   "super_admin",
		Slug:        "sardine-run",
		Name:        "Sardine Run Updated",
		Description: "Known sardine bait ball site.",
		Difficulty:  "easy",
	})
	if err != nil {
		t.Fatalf("create super admin site edit: %v", err)
	}
	if !result.AppliedImmediately {
		t.Fatal("super admin edit should apply immediately")
	}
	if result.Proposal.State != "applied" {
		t.Fatalf("expected applied proposal, got %q", result.Proposal.State)
	}
	if result.Proposal.ReviewedByAppUserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected super admin as reviewer, got %+v", result.Proposal)
	}
	if repo.editCreated.Proposed.Name != "Sardine Run Updated" {
		t.Fatalf("expected proposal to be recorded before apply, got %+v", repo.editCreated.Proposed)
	}
}
