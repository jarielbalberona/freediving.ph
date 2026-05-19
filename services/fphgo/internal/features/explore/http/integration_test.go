package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	buddyfinderrepo "fphgo/internal/features/buddyfinder/repo"
	explorerepo "fphgo/internal/features/explore/repo"
	exploreservice "fphgo/internal/features/explore/service"
	feedservice "fphgo/internal/features/feed/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type exploreServiceStub struct {
	listInput        exploreservice.ListSitesInput
	listResult       exploreservice.ListSitesResult
	latest           exploreservice.ListLatestUpdatesResult
	detail           exploreservice.SiteDetailResult
	related          exploreservice.SiteRelatedResult
	communityPosts   exploreservice.SiteCommunityPostsResult
	presences        exploreservice.SiteDivePresencesResult
	affinities       exploreservice.SiteDiveAffinitiesResult
	reviews          exploreservice.SiteDiveReviewsResult
	globalInput      exploreservice.GlobalDivePresencesInput
	presenceInput    exploreservice.DivePresenceInput
	affinityInput    exploreservice.DiveSiteAffinityInput
	reviewInput      exploreservice.DiveSiteReviewInput
	preview          exploreservice.SiteBuddyPreviewResult
	intents          exploreservice.SiteBuddyIntentsResult
	create           explorerepo.SiteUpdate
	createSubmission exploreservice.CreateSiteSubmissionInput
	createSiteEdit   exploreservice.CreateSiteEditProposalInput
	submission       explorerepo.SiteSubmission
	submissionList   exploreservice.SubmissionListResult
	moderationDetail explorerepo.SiteSubmission
	siteEdit         explorerepo.SiteEditProposal
	siteEditList     exploreservice.SiteEditProposalListResult
	err              error
}

func (s *exploreServiceStub) ListSites(_ context.Context, input exploreservice.ListSitesInput) (exploreservice.ListSitesResult, error) {
	s.listInput = input
	return s.listResult, s.err
}

func (s *exploreServiceStub) GetSiteBySlug(context.Context, string, string, string, int32) (exploreservice.SiteDetailResult, error) {
	return s.detail, s.err
}

func (s *exploreServiceStub) GetRelatedBySlug(context.Context, string, string) (exploreservice.SiteRelatedResult, error) {
	return s.related, s.err
}

func (s *exploreServiceStub) ListCommunityPostsBySlug(context.Context, string, string, string, int32) (exploreservice.SiteCommunityPostsResult, error) {
	return s.communityPosts, s.err
}

func (s *exploreServiceStub) ListGlobalDivePresences(_ context.Context, input exploreservice.GlobalDivePresencesInput) (exploreservice.GlobalDivePresencesResult, error) {
	s.globalInput = input
	return exploreservice.GlobalDivePresencesResult{Items: s.presences.Items}, s.err
}

func (s *exploreServiceStub) ListMyDivePresences(context.Context, string) (exploreservice.CurrentUserDivePresencesResult, error) {
	return exploreservice.CurrentUserDivePresencesResult{Items: s.presences.Items}, s.err
}

func (s *exploreServiceStub) ListDivePresencesBySlug(context.Context, string, string, int32) (exploreservice.SiteDivePresencesResult, error) {
	return s.presences, s.err
}

func (s *exploreServiceStub) ListMyDiveSiteAffinities(context.Context, string) (exploreservice.CurrentUserDiveAffinitiesResult, error) {
	items := make([]explorerepo.DiveSiteAffinity, 0, len(s.affinities.Items))
	for _, item := range s.affinities.Items {
		items = append(items, item.DiveSiteAffinity)
	}
	return exploreservice.CurrentUserDiveAffinitiesResult{Items: items}, s.err
}

func (s *exploreServiceStub) ListDiveAffinitiesBySlug(context.Context, string, string, int32) (exploreservice.SiteDiveAffinitiesResult, error) {
	return s.affinities, s.err
}

func (s *exploreServiceStub) ListDiveReviewsBySlug(context.Context, string, string, int32) (exploreservice.SiteDiveReviewsResult, error) {
	return s.reviews, s.err
}

func (s *exploreServiceStub) CreateDivePresence(_ context.Context, input exploreservice.DivePresenceInput) (explorerepo.DivePresence, error) {
	s.presenceInput = input
	if s.err != nil {
		return explorerepo.DivePresence{}, s.err
	}
	return explorerepo.DivePresence{ID: "550e8400-e29b-41d4-a716-446655441001", UserID: input.ActorID, DiveSiteID: "550e8400-e29b-41d4-a716-446655440101", PresenceType: input.PresenceType, Visibility: input.Visibility, ContactEnabled: input.ContactEnabled, Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (s *exploreServiceStub) UpdateDivePresence(_ context.Context, input exploreservice.DivePresenceInput) (explorerepo.DivePresence, error) {
	s.presenceInput = input
	if s.err != nil {
		return explorerepo.DivePresence{}, s.err
	}
	return explorerepo.DivePresence{ID: input.PresenceID, UserID: input.ActorID, DiveSiteID: "550e8400-e29b-41d4-a716-446655440101", PresenceType: input.PresenceType, Visibility: input.Visibility, ContactEnabled: input.ContactEnabled, Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (s *exploreServiceStub) CancelDivePresence(context.Context, string, string, string) error {
	return s.err
}

func (s *exploreServiceStub) CreateDiveSiteAffinity(_ context.Context, input exploreservice.DiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error) {
	s.affinityInput = input
	if s.err != nil {
		return explorerepo.DiveSiteAffinity{}, s.err
	}
	return explorerepo.DiveSiteAffinity{ID: "550e8400-e29b-41d4-a716-446655441002", UserID: input.ActorID, DiveSiteID: "550e8400-e29b-41d4-a716-446655440101", Relationship: input.Relationship, Visibility: input.Visibility, ContactEnabled: input.ContactEnabled, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (s *exploreServiceStub) UpdateDiveSiteAffinity(_ context.Context, input exploreservice.DiveSiteAffinityInput) (explorerepo.DiveSiteAffinity, error) {
	s.affinityInput = input
	if s.err != nil {
		return explorerepo.DiveSiteAffinity{}, s.err
	}
	return explorerepo.DiveSiteAffinity{ID: input.AffinityID, UserID: input.ActorID, DiveSiteID: "550e8400-e29b-41d4-a716-446655440101", Relationship: input.Relationship, Visibility: input.Visibility, ContactEnabled: input.ContactEnabled, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (s *exploreServiceStub) DeleteDiveSiteAffinity(context.Context, string, string, string) error {
	return s.err
}

func (s *exploreServiceStub) CreateDiveSiteReview(_ context.Context, input exploreservice.DiveSiteReviewInput) (explorerepo.DiveSiteReview, error) {
	s.reviewInput = input
	if s.err != nil {
		return explorerepo.DiveSiteReview{}, s.err
	}
	return explorerepo.DiveSiteReview{ID: "550e8400-e29b-41d4-a716-446655441003", UserID: input.ActorID, DiveSiteID: "550e8400-e29b-41d4-a716-446655440101", Rating: input.Rating, Comment: stringValue(input.Comment), Visibility: input.Visibility, Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}

func (s *exploreServiceStub) CreateSiteSubmission(_ context.Context, input exploreservice.CreateSiteSubmissionInput) (explorerepo.SiteSubmission, error) {
	s.createSubmission = input
	if s.err != nil {
		return explorerepo.SiteSubmission{}, s.err
	}
	return s.submission, nil
}

func (s *exploreServiceStub) ListMySiteSubmissions(context.Context, exploreservice.SubmissionListInput) (exploreservice.SubmissionListResult, error) {
	return s.submissionList, s.err
}

func (s *exploreServiceStub) GetMySiteSubmissionByID(context.Context, string, string) (explorerepo.SiteSubmission, error) {
	if s.err != nil {
		return explorerepo.SiteSubmission{}, s.err
	}
	return s.submission, nil
}

func (s *exploreServiceStub) ListPendingSites(context.Context, exploreservice.SubmissionListInput) (exploreservice.SubmissionListResult, error) {
	return s.submissionList, s.err
}

func (s *exploreServiceStub) GetSiteByIDForModeration(context.Context, string) (explorerepo.SiteSubmission, error) {
	if s.err != nil {
		return explorerepo.SiteSubmission{}, s.err
	}
	return s.moderationDetail, nil
}

func (s *exploreServiceStub) ApproveSite(context.Context, exploreservice.ModerateSiteInput) (explorerepo.SiteSubmission, error) {
	if s.err != nil {
		return explorerepo.SiteSubmission{}, s.err
	}
	return s.moderationDetail, nil
}

func (s *exploreServiceStub) RejectSite(context.Context, exploreservice.ModerateSiteInput) (explorerepo.SiteSubmission, error) {
	if s.err != nil {
		return explorerepo.SiteSubmission{}, s.err
	}
	return s.moderationDetail, nil
}

func (s *exploreServiceStub) CreateSiteEditProposal(_ context.Context, input exploreservice.CreateSiteEditProposalInput) (exploreservice.CreateSiteEditProposalResult, error) {
	s.createSiteEdit = input
	if s.err != nil {
		return exploreservice.CreateSiteEditProposalResult{}, s.err
	}
	return exploreservice.CreateSiteEditProposalResult{Proposal: s.siteEdit}, nil
}

func (s *exploreServiceStub) ListMySiteEditProposals(context.Context, exploreservice.SubmissionListInput) (exploreservice.SiteEditProposalListResult, error) {
	return s.siteEditList, s.err
}

func (s *exploreServiceStub) GetMySiteEditProposalByID(context.Context, string, string) (explorerepo.SiteEditProposal, error) {
	if s.err != nil {
		return explorerepo.SiteEditProposal{}, s.err
	}
	return s.siteEdit, nil
}

func (s *exploreServiceStub) ListPendingSiteEditProposals(context.Context, exploreservice.SubmissionListInput) (exploreservice.SiteEditProposalListResult, error) {
	return s.siteEditList, s.err
}

func (s *exploreServiceStub) GetSiteEditProposalForModeration(context.Context, string) (explorerepo.SiteEditProposal, error) {
	if s.err != nil {
		return explorerepo.SiteEditProposal{}, s.err
	}
	return s.siteEdit, nil
}

func (s *exploreServiceStub) ApplySiteEditProposal(context.Context, exploreservice.ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error) {
	if s.err != nil {
		return explorerepo.SiteEditProposal{}, s.err
	}
	s.siteEdit.State = "applied"
	return s.siteEdit, nil
}

func (s *exploreServiceStub) RejectSiteEditProposal(context.Context, exploreservice.ModerateSiteEditProposalInput) (explorerepo.SiteEditProposal, error) {
	if s.err != nil {
		return explorerepo.SiteEditProposal{}, s.err
	}
	s.siteEdit.State = "rejected"
	return s.siteEdit, nil
}

func (s *exploreServiceStub) ListLatestUpdates(context.Context, exploreservice.ListLatestUpdatesInput) (exploreservice.ListLatestUpdatesResult, error) {
	return s.latest, s.err
}

func (s *exploreServiceStub) GetBuddyPreviewBySlug(context.Context, string, int32) (exploreservice.SiteBuddyPreviewResult, error) {
	return s.preview, s.err
}

func (s *exploreServiceStub) GetBuddyIntentsBySlug(context.Context, string, string, string, int32) (exploreservice.SiteBuddyIntentsResult, error) {
	return s.intents, s.err
}

func (s *exploreServiceStub) CreateUpdate(context.Context, exploreservice.CreateUpdateInput) (explorerepo.SiteUpdate, error) {
	if s.err != nil {
		return explorerepo.SiteUpdate{}, s.err
	}
	return s.create, nil
}

func (s *exploreServiceStub) SaveSite(context.Context, string, string) error   { return s.err }
func (s *exploreServiceStub) UnsaveSite(context.Context, string, string) error { return s.err }

func (s *exploreServiceStub) LikeDiveSite(context.Context, string, string) (exploreservice.LikeStateResult, error) {
	if s.err != nil {
		return exploreservice.LikeStateResult{}, s.err
	}
	return exploreservice.LikeStateResult{TargetID: "550e8400-e29b-41d4-a716-446655440101", LikeCount: 1, ViewerHasLiked: true}, nil
}

func (s *exploreServiceStub) UnlikeDiveSite(context.Context, string, string) (exploreservice.LikeStateResult, error) {
	if s.err != nil {
		return exploreservice.LikeStateResult{}, s.err
	}
	return exploreservice.LikeStateResult{TargetID: "550e8400-e29b-41d4-a716-446655440101", LikeCount: 0, ViewerHasLiked: false}, nil
}

func TestExplorePublicReadsAndWriteAuthGates(t *testing.T) {
	svc := &exploreServiceStub{
		listResult: exploreservice.ListSitesResult{
			Items: []explorerepo.SiteCard{{
				ID:                   "550e8400-e29b-41d4-a716-446655440101",
				Slug:                 "twin-rocks-anilao",
				Name:                 "Twin Rocks",
				Area:                 "Mabini, Batangas",
				Difficulty:           "easy",
				Hazards:              []string{"boat traffic"},
				VerificationStatus:   "verified",
				LastUpdatedAt:        time.Now().UTC(),
				SiteBuddyIntentCount: 2,
			}},
		},
		latest: exploreservice.ListLatestUpdatesResult{
			Items: []explorerepo.LatestUpdate{{
				ID:                "550e8400-e29b-41d4-a716-446655440401",
				DiveSiteID:        "550e8400-e29b-41d4-a716-446655440101",
				SiteSlug:          "twin-rocks-anilao",
				SiteName:          "Twin Rocks",
				SiteArea:          "Mabini, Batangas",
				AuthorDisplayName: "Member User",
				Note:              "10m vis and easy surface.",
				OccurredAt:        time.Now().UTC(),
				CreatedAt:         time.Now().UTC(),
			}},
		},
		detail: exploreservice.SiteDetailResult{
			Site: explorerepo.SiteDetail{
				ID:                 "550e8400-e29b-41d4-a716-446655440101",
				Slug:               "twin-rocks-anilao",
				Name:               "Twin Rocks",
				Area:               "Mabini, Batangas",
				Difficulty:         "easy",
				Hazards:            []string{"boat traffic"},
				VerificationStatus: "verified",
				LastUpdatedAt:      time.Now().UTC(),
				CreatedAt:          time.Now().UTC(),
			},
			Updates: []explorerepo.SiteUpdate{{
				ID:         "550e8400-e29b-41d4-a716-446655440201",
				DiveSiteID: "550e8400-e29b-41d4-a716-446655440101",
				Note:       "Calm morning window.",
				OccurredAt: time.Now().UTC(),
				CreatedAt:  time.Now().UTC(),
			}},
		},
		related: exploreservice.SiteRelatedResult{
			Counts: exploreservice.SiteRelatedCounts{
				AvailableBuddies: 1,
				LocalRegulars:    1,
				CommunityPosts:   1,
				Reviews:          1,
				AverageRating:    5,
				RecentConditions: 1,
			},
			Previews: exploreservice.SiteRelatedPreviews{
				AvailableBuddies: []explorerepo.VisibleDivePresence{{
					DivePresence: explorerepo.DivePresence{
						ID:             "550e8400-e29b-41d4-a716-446655440301",
						UserID:         "550e8400-e29b-41d4-a716-446655440302",
						DiveSiteID:     "550e8400-e29b-41d4-a716-446655440101",
						PresenceType:   "training",
						Visibility:     "public",
						ContactEnabled: true,
						Note:           "Training this afternoon.",
						Status:         "active",
						CreatedAt:      time.Now().UTC(),
						UpdatedAt:      time.Now().UTC(),
					},
					Username:       "available_diver",
					DisplayName:    "Available Diver",
					ContactAllowed: true,
				}},
				LocalRegulars: []explorerepo.VisibleDiveSiteAffinity{{
					DiveSiteAffinity: explorerepo.DiveSiteAffinity{
						ID:             "550e8400-e29b-41d4-a716-446655440311",
						UserID:         "550e8400-e29b-41d4-a716-446655440312",
						DiveSiteID:     "550e8400-e29b-41d4-a716-446655440101",
						Relationship:   "regular",
						Visibility:     "public",
						ContactEnabled: false,
						Note:           "Weekend regular.",
						CreatedAt:      time.Now().UTC(),
						UpdatedAt:      time.Now().UTC(),
					},
					Username:    "regular_diver",
					DisplayName: "Regular Diver",
				}},
				CommunityPosts: []feedservice.ActivityItem{{
					ID:           "550e8400-e29b-41d4-a716-446655440901",
					Type:         feedservice.ActivityMediaPostCreated,
					SourceModule: feedservice.ActivitySourceMedia,
					SourceType:   "media_post",
					SourceID:     "550e8400-e29b-41d4-a716-446655440902",
					Actor:        feedservice.ActivityActor{Name: "Photo Diver", Username: "photo_diver"},
					Target:       feedservice.ActivityTarget{Type: "media_post", ID: "550e8400-e29b-41d4-a716-446655440902"},
					Visibility:   feedservice.ActivityVisibilityPublic,
					OccurredAt:   time.Now().UTC().Format(time.RFC3339),
					Title:        "Twin Rocks",
					Area:         "Mabini, Batangas",
					DiveSiteID:   "550e8400-e29b-41d4-a716-446655440101",
					Media:        []map[string]any{{"mediaObjectId": "550e8400-e29b-41d4-a716-446655440903", "width": float64(1200), "height": float64(800), "displayUrl": "https://cdn.example/photo.jpg"}},
					Metadata:     map[string]any{"diveSiteSlug": "twin-rocks-anilao", "diveSiteName": "Twin Rocks"},
					Href:         "/explore/sites/twin-rocks-anilao",
				}},
				Reviews: []explorerepo.VisibleDiveSiteReview{{
					DiveSiteReview: explorerepo.DiveSiteReview{
						ID:         "550e8400-e29b-41d4-a716-446655440321",
						UserID:     "550e8400-e29b-41d4-a716-446655440322",
						DiveSiteID: "550e8400-e29b-41d4-a716-446655440101",
						Rating:     5,
						Comment:    "Clear morning and easy entry.",
						Visibility: "public",
						Status:     "active",
						CreatedAt:  time.Now().UTC(),
						UpdatedAt:  time.Now().UTC(),
					},
					Username:    "review_diver",
					DisplayName: "Review Diver",
				}},
			},
		},
		reviews: exploreservice.SiteDiveReviewsResult{
			Items: []explorerepo.VisibleDiveSiteReview{{
				DiveSiteReview: explorerepo.DiveSiteReview{
					ID:         "550e8400-e29b-41d4-a716-446655440321",
					UserID:     "550e8400-e29b-41d4-a716-446655440322",
					DiveSiteID: "550e8400-e29b-41d4-a716-446655440101",
					Rating:     5,
					Comment:    "Clear morning and easy entry.",
					Visibility: "public",
					Status:     "active",
					CreatedAt:  time.Now().UTC(),
					UpdatedAt:  time.Now().UTC(),
				},
				Username:    "review_diver",
				DisplayName: "Review Diver",
			}},
			AverageRating: 5,
			ReviewCount:   1,
		},
		communityPosts: exploreservice.SiteCommunityPostsResult{
			Items: []feedservice.ActivityItem{{
				ID:           "550e8400-e29b-41d4-a716-446655440901",
				Type:         feedservice.ActivityMediaPostCreated,
				SourceModule: feedservice.ActivitySourceMedia,
				SourceType:   "media_post",
				SourceID:     "550e8400-e29b-41d4-a716-446655440902",
				Actor:        feedservice.ActivityActor{Name: "Photo Diver", Username: "photo_diver"},
				Target:       feedservice.ActivityTarget{Type: "media_post", ID: "550e8400-e29b-41d4-a716-446655440902"},
				Visibility:   feedservice.ActivityVisibilityPublic,
				OccurredAt:   time.Now().UTC().Format(time.RFC3339),
				Title:        "Twin Rocks",
				Area:         "Mabini, Batangas",
				DiveSiteID:   "550e8400-e29b-41d4-a716-446655440101",
				Metadata:     map[string]any{"diveSiteSlug": "twin-rocks-anilao", "diveSiteName": "Twin Rocks"},
			}},
		},
		preview: exploreservice.SiteBuddyPreviewResult{
			Items: []buddyfinderrepo.PreviewIntent{{
				ID:            "550e8400-e29b-41d4-a716-446655440301",
				DiveSiteID:    "550e8400-e29b-41d4-a716-446655440101",
				Area:          "Mabini, Batangas",
				IntentType:    "training",
				TimeWindow:    "today",
				Note:          "Full note that should never leak from preview responses.",
				CreatedAt:     time.Now().UTC(),
				EmailVerified: true,
			}},
		},
	}

	r := buildExploreRouter(t, svc, authz.Identity{})

	getList := httptest.NewRequest(http.MethodGet, "/sites", nil)
	getListRec := httptest.NewRecorder()
	r.ServeHTTP(getListRec, getList)
	if getListRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public list, got %d", getListRec.Code)
	}
	var listBody ListSitesResponse
	if err := json.Unmarshal(getListRec.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if listBody.Items[0].BuddySignal == nil {
		t.Fatal("expected aggregate buddy signal on list card")
	}
	if got := listBody.Items[0].BuddySignal.Label; got != "2 buddy plans at this site" {
		t.Fatalf("unexpected buddy signal label: %q", got)
	}
	if bytes.Contains(getListRec.Body.Bytes(), []byte("authorAppUserId")) || bytes.Contains(getListRec.Body.Bytes(), []byte("displayName")) {
		t.Fatalf("list buddy signal leaked private buddy identity fields: %s", getListRec.Body.String())
	}

	getDetail := httptest.NewRequest(http.MethodGet, "/sites/twin-rocks-anilao", nil)
	getDetailRec := httptest.NewRecorder()
	r.ServeHTTP(getDetailRec, getDetail)
	if getDetailRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public detail, got %d", getDetailRec.Code)
	}

	relatedReq := httptest.NewRequest(http.MethodGet, "/sites/twin-rocks-anilao/related", nil)
	relatedRec := httptest.NewRecorder()
	r.ServeHTTP(relatedRec, relatedReq)
	if relatedRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public related, got %d", relatedRec.Code)
	}
	var relatedBody SiteRelatedResponse
	if err := json.Unmarshal(relatedRec.Body.Bytes(), &relatedBody); err != nil {
		t.Fatalf("decode related response: %v", err)
	}
	if relatedBody.Counts.AvailableBuddies != 1 || relatedBody.Counts.LocalRegulars != 1 || relatedBody.Counts.CommunityPosts != 1 || relatedBody.Counts.Reviews != 1 || relatedBody.Counts.AverageRating != 5 || relatedBody.Counts.RecentConditions != 1 {
		t.Fatalf("unexpected related counts: %+v", relatedBody.Counts)
	}
	if got := relatedBody.Previews.AvailableBuddies[0].PresenceType; got != "training" {
		t.Fatalf("expected active dive presence preview, got %q", got)
	}
	if got := relatedBody.Previews.LocalRegulars[0].Relationship; got != "regular" {
		t.Fatalf("expected affinity preview, got %q", got)
	}
	if got := relatedBody.Previews.CommunityPosts[0].Type; got != "media_post_created" {
		t.Fatalf("expected media post activity preview, got %q", got)
	}
	if got := relatedBody.Previews.Reviews[0].Rating; got != 5 {
		t.Fatalf("expected review preview, got %d", got)
	}

	reviewsReq := httptest.NewRequest(http.MethodGet, "/sites/twin-rocks-anilao/reviews", nil)
	reviewsRec := httptest.NewRecorder()
	r.ServeHTTP(reviewsRec, reviewsReq)
	if reviewsRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public reviews, got %d", reviewsRec.Code)
	}
	var reviewsBody DiveSiteReviewListResponse
	if err := json.Unmarshal(reviewsRec.Body.Bytes(), &reviewsBody); err != nil {
		t.Fatalf("decode reviews response: %v", err)
	}
	if reviewsBody.ReviewCount != 1 || reviewsBody.AverageRating != 5 || reviewsBody.Items[0].Comment != "Clear morning and easy entry." {
		t.Fatalf("unexpected reviews body: %+v", reviewsBody)
	}

	communityReq := httptest.NewRequest(http.MethodGet, "/sites/twin-rocks-anilao/community-posts", nil)
	communityRec := httptest.NewRecorder()
	r.ServeHTTP(communityRec, communityReq)
	if communityRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public community posts, got %d", communityRec.Code)
	}
	var communityBody SiteCommunityPostsResponse
	if err := json.Unmarshal(communityRec.Body.Bytes(), &communityBody); err != nil {
		t.Fatalf("decode community response: %v", err)
	}
	if len(communityBody.Items) != 1 || communityBody.Items[0].DiveSiteID != "550e8400-e29b-41d4-a716-446655440101" {
		t.Fatalf("expected site-linked community item, got %+v", communityBody.Items)
	}

	updatesReq := httptest.NewRequest(http.MethodGet, "/updates?area=Mabini,%20Batangas", nil)
	updatesRec := httptest.NewRecorder()
	r.ServeHTTP(updatesRec, updatesReq)
	if updatesRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public latest updates, got %d", updatesRec.Code)
	}

	previewReq := httptest.NewRequest(http.MethodGet, "/sites/twin-rocks-anilao/buddy-preview", nil)
	previewRec := httptest.NewRecorder()
	r.ServeHTTP(previewRec, previewReq)
	if previewRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public buddy preview, got %d", previewRec.Code)
	}
	var previewBody SiteBuddyPreviewResponse
	if err := json.Unmarshal(previewRec.Body.Bytes(), &previewBody); err != nil {
		t.Fatalf("decode preview response: %v", err)
	}
	if got := previewBody.Items[0].NotePreview; got == "Full note that should never leak from preview responses." {
		t.Fatalf("expected preview note redaction, got %q", got)
	}

	saveReq := httptest.NewRequest(http.MethodPost, "/sites/550e8400-e29b-41d4-a716-446655440101/save", nil)
	saveRec := httptest.NewRecorder()
	r.ServeHTTP(saveRec, saveReq)
	if saveRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for signed-out save, got %d", saveRec.Code)
	}

	likeReq := httptest.NewRequest(http.MethodPost, "/sites/550e8400-e29b-41d4-a716-446655440101/likes", nil)
	likeRec := httptest.NewRecorder()
	r.ServeHTTP(likeRec, likeReq)
	if likeRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for signed-out like, got %d", likeRec.Code)
	}

	unlikeReq := httptest.NewRequest(http.MethodDelete, "/sites/550e8400-e29b-41d4-a716-446655440101/likes", nil)
	unlikeRec := httptest.NewRecorder()
	r.ServeHTTP(unlikeRec, unlikeReq)
	if unlikeRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for signed-out unlike, got %d", unlikeRec.Code)
	}

	intentsReq := httptest.NewRequest(http.MethodGet, "/sites/twin-rocks-anilao/buddy-intents", nil)
	intentsRec := httptest.NewRecorder()
	r.ServeHTTP(intentsRec, intentsReq)
	if intentsRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for signed-out buddy intents, got %d", intentsRec.Code)
	}
}

func TestExploreRelatedRoutesReturnNotFoundForInvalidSlug(t *testing.T) {
	r := buildExploreRouter(t, &exploreServiceStub{
		err: apperrors.New(http.StatusNotFound, "not_found", "dive site not found", nil),
	}, authz.Identity{})

	for _, path := range []string{
		"/sites/missing-site/related",
		"/sites/missing-site/community-posts",
	} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)
			if rec.Code != http.StatusNotFound {
				t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestExploreGlobalDivePresencesRouteParsesFiltersAndReturnsSiteData(t *testing.T) {
	startAt := time.Date(2026, 5, 20, 2, 0, 0, 0, time.UTC)
	endAt := startAt.Add(2 * time.Hour)
	svc := &exploreServiceStub{
		presences: exploreservice.SiteDivePresencesResult{
			Items: []explorerepo.VisibleDivePresence{{
				DivePresence: explorerepo.DivePresence{
					ID:             "550e8400-e29b-41d4-a716-446655442001",
					UserID:         "550e8400-e29b-41d4-a716-446655442101",
					DiveSiteID:     "550e8400-e29b-41d4-a716-446655440101",
					PresenceType:   "available",
					StartAt:        &startAt,
					EndAt:          &endAt,
					Visibility:     "public",
					ContactEnabled: true,
					Status:         "active",
					CreatedAt:      time.Now().UTC(),
					UpdatedAt:      time.Now().UTC(),
				},
				Username:       "global_buddy",
				DisplayName:    "Global Buddy",
				DiveSiteSlug:   "napaling-reef",
				DiveSiteName:   "Napaling Reef",
				DiveSiteArea:   "Panglao, Bohol",
				ContactAllowed: true,
			}},
		},
	}
	r := buildExploreRouter(t, svc, authz.Identity{})

	req := httptest.NewRequest(http.MethodGet, "/presences?siteSlug=napaling-reef&province=Bohol&presenceType=available&dateFrom=2026-05-20T00:00:00Z&dateTo=2026-05-21T00:00:00Z&limit=5", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for global presences, got %d: %s", rec.Code, rec.Body.String())
	}
	if svc.globalInput.SiteSlug != "napaling-reef" || svc.globalInput.Area != "Bohol" || svc.globalInput.PresenceType != "available" || svc.globalInput.Limit != 5 {
		t.Fatalf("expected filters to reach service, got %+v", svc.globalInput)
	}
	var body DivePresenceListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Items) != 1 || body.Items[0].DiveSiteSlug != "napaling-reef" || body.Items[0].DisplayName != "Global Buddy" {
		t.Fatalf("expected site-backed global presence, got %+v", body.Items)
	}
}

func TestExploreCurrentUserPresenceAndAffinityRoutesRequireMemberAndReturnItems(t *testing.T) {
	guestRouter := buildExploreRouter(t, &exploreServiceStub{}, authz.Identity{})
	for _, path := range []string{"/me/dive-presences", "/me/dive-site-affinities"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		guestRouter.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 for guest %s, got %d", path, rec.Code)
		}
	}

	svc := &exploreServiceStub{
		presences: exploreservice.SiteDivePresencesResult{
			Items: []explorerepo.VisibleDivePresence{{
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
		},
		affinities: exploreservice.SiteDiveAffinitiesResult{
			Items: []explorerepo.VisibleDiveSiteAffinity{{
				DiveSiteAffinity: explorerepo.DiveSiteAffinity{
					ID:           "550e8400-e29b-41d4-a716-446655442012",
					UserID:       "550e8400-e29b-41d4-a716-446655440000",
					DiveSiteID:   "550e8400-e29b-41d4-a716-446655440101",
					Relationship: "regular",
					Visibility:   "members",
					CreatedAt:    time.Now().UTC(),
					UpdatedAt:    time.Now().UTC(),
					DiveSiteSlug: "apo-island",
					DiveSiteName: "Apo Island",
				},
			}},
		},
	}
	memberRouter := buildExploreRouter(t, svc, authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionExploreSubmit: true,
		},
	})

	presenceReq := httptest.NewRequest(http.MethodGet, "/me/dive-presences", nil)
	presenceRec := httptest.NewRecorder()
	memberRouter.ServeHTTP(presenceRec, presenceReq)
	if presenceRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for current user presences, got %d: %s", presenceRec.Code, presenceRec.Body.String())
	}
	var presenceBody DivePresenceListResponse
	if err := json.Unmarshal(presenceRec.Body.Bytes(), &presenceBody); err != nil {
		t.Fatalf("decode presence response: %v", err)
	}
	if len(presenceBody.Items) != 1 || presenceBody.Items[0].PresenceType != "training" || presenceBody.Items[0].DiveSiteSlug != "apo-island" {
		t.Fatalf("expected current user presence with site data, got %+v", presenceBody.Items)
	}

	affinityReq := httptest.NewRequest(http.MethodGet, "/me/dive-site-affinities", nil)
	affinityRec := httptest.NewRecorder()
	memberRouter.ServeHTTP(affinityRec, affinityReq)
	if affinityRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for current user affinities, got %d: %s", affinityRec.Code, affinityRec.Body.String())
	}
	var affinityBody DiveSiteAffinityListResponse
	if err := json.Unmarshal(affinityRec.Body.Bytes(), &affinityBody); err != nil {
		t.Fatalf("decode affinity response: %v", err)
	}
	if len(affinityBody.Items) != 1 || affinityBody.Items[0].Relationship != "regular" || affinityBody.Items[0].DiveSiteSlug != "apo-island" {
		t.Fatalf("expected current user affinity with site data, got %+v", affinityBody.Items)
	}
}

func TestExploreLikeRoutesRequireAuthAndReadPermission(t *testing.T) {
	siteID := "550e8400-e29b-41d4-a716-446655440101"

	forbiddenRouter := buildExploreRouter(t, &exploreServiceStub{}, authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   map[authz.Permission]bool{},
	})
	forbiddenReq := httptest.NewRequest(http.MethodPost, "/sites/"+siteID+"/likes", nil)
	forbiddenRec := httptest.NewRecorder()
	forbiddenRouter.ServeHTTP(forbiddenRec, forbiddenReq)
	if forbiddenRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 without explore read permission, got %d", forbiddenRec.Code)
	}

	allowedRouter := buildExploreRouter(t, &exploreServiceStub{}, authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionExploreRead: true,
		},
	})
	likeReq := httptest.NewRequest(http.MethodPost, "/sites/"+siteID+"/likes", nil)
	likeRec := httptest.NewRecorder()
	allowedRouter.ServeHTTP(likeRec, likeReq)
	if likeRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for like with explore read permission, got %d: %s", likeRec.Code, likeRec.Body.String())
	}
	var likeBody LikeStateResponse
	if err := json.Unmarshal(likeRec.Body.Bytes(), &likeBody); err != nil {
		t.Fatalf("decode like response: %v", err)
	}
	if likeBody.TargetID != siteID || likeBody.LikeCount != 1 || !likeBody.ViewerHasLiked {
		t.Fatalf("unexpected like response: %+v", likeBody)
	}

	unlikeReq := httptest.NewRequest(http.MethodDelete, "/sites/"+siteID+"/likes", nil)
	unlikeRec := httptest.NewRecorder()
	allowedRouter.ServeHTTP(unlikeRec, unlikeReq)
	if unlikeRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for unlike with explore read permission, got %d: %s", unlikeRec.Code, unlikeRec.Body.String())
	}
	var unlikeBody LikeStateResponse
	if err := json.Unmarshal(unlikeRec.Body.Bytes(), &unlikeBody); err != nil {
		t.Fatalf("decode unlike response: %v", err)
	}
	if unlikeBody.TargetID != siteID || unlikeBody.LikeCount != 0 || unlikeBody.ViewerHasLiked {
		t.Fatalf("unexpected unlike response: %+v", unlikeBody)
	}
}

func TestExploreListSitesParsesBounds(t *testing.T) {
	svc := &exploreServiceStub{}
	r := buildExploreRouter(t, svc, authz.Identity{})

	req := httptest.NewRequest(http.MethodGet, "/sites?north=14&south=13&east=121&west=120&search=anilao&area=Mabini,%20Batangas&difficulty=easy&verifiedOnly=true", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid bounds, got %d: %s", rec.Code, rec.Body.String())
	}

	if svc.listInput.Bounds == nil {
		t.Fatal("expected bounds to be passed to service")
	}
	if svc.listInput.Bounds.North != 14 || svc.listInput.Bounds.South != 13 || svc.listInput.Bounds.East != 121 || svc.listInput.Bounds.West != 120 {
		t.Fatalf("unexpected bounds: %+v", svc.listInput.Bounds)
	}
	if svc.listInput.Search != "anilao" || svc.listInput.Area != "Mabini, Batangas" || svc.listInput.Difficulty != "easy" || !svc.listInput.VerifiedOnly {
		t.Fatalf("expected existing filters to be preserved, got %+v", svc.listInput)
	}
}

func TestExploreListSitesSavedOnlyRequiresAuth(t *testing.T) {
	r := buildExploreRouter(t, &exploreServiceStub{}, authz.Identity{})

	req := httptest.NewRequest(http.MethodGet, "/sites?savedOnly=true", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for signed-out saved-only list, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestExploreListSitesParsesSavedOnlyForSignedInViewer(t *testing.T) {
	svc := &exploreServiceStub{}
	r := buildExploreRouter(t, svc, authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
	})

	req := httptest.NewRequest(http.MethodGet, "/sites?savedOnly=true&search=anilao", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for signed-in saved-only list, got %d: %s", rec.Code, rec.Body.String())
	}
	if !svc.listInput.SavedOnly {
		t.Fatalf("expected savedOnly to be passed to service, got %+v", svc.listInput)
	}
	if svc.listInput.ViewerUserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected viewer user id, got %+v", svc.listInput)
	}
}

func TestExploreListSitesRejectsPartialAndMalformedBounds(t *testing.T) {
	tests := []string{
		"/sites?north=14&south=13&east=121",
		"/sites?north=nope&south=13&east=121&west=120",
		"/sites?savedOnly=maybe",
	}
	for _, path := range tests {
		t.Run(path, func(t *testing.T) {
			r := buildExploreRouter(t, &exploreServiceStub{}, authz.Identity{})
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestExploreCreateUpdateValidationAndRateLimit(t *testing.T) {
	actor := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionExploreSubmit: true,
		},
	}

	validationSvc := &exploreServiceStub{}
	router := buildExploreRouter(t, validationSvc, actor)
	req := httptest.NewRequest(http.MethodPost, "/sites/550e8400-e29b-41d4-a716-446655440101/updates", bytes.NewBufferString(`{"note":"bad"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid create update, got %d", rec.Code)
	}

	rateLimitedSvc := &exploreServiceStub{err: apperrors.NewRateLimited("slow down", 3600, 20)}
	rateLimitedRouter := buildExploreRouter(t, rateLimitedSvc, actor)
	validBody, _ := json.Marshal(CreateUpdateRequest{Note: "Good visibility and calm surface.", ConditionCurrent: stringPtr("mild")})
	rateReq := httptest.NewRequest(http.MethodPost, "/sites/550e8400-e29b-41d4-a716-446655440101/updates", bytes.NewReader(validBody))
	rateReq.Header.Set("Content-Type", "application/json")
	rateRec := httptest.NewRecorder()
	rateLimitedRouter.ServeHTTP(rateRec, rateReq)
	if rateRec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 for rate-limited create update, got %d", rateRec.Code)
	}
	if rateRec.Header().Get("Retry-After") == "" {
		t.Fatal("expected Retry-After header")
	}
}

func TestExploreSubmissionValidationRequiresLatLngAndRange(t *testing.T) {
	actor := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionExploreSubmit: true,
		},
	}

	router := buildExploreRouter(t, &exploreServiceStub{}, actor)

	missingBody, _ := json.Marshal(CreateSiteSubmissionRequest{
		Name:            "Sombrero",
		Description:     "Calm reef shelf with easy shore entry.",
		EntryDifficulty: "easy",
	})
	missingReq := httptest.NewRequest(http.MethodPost, "/sites/submit", bytes.NewReader(missingBody))
	missingReq.Header.Set("Content-Type", "application/json")
	missingRec := httptest.NewRecorder()
	router.ServeHTTP(missingRec, missingReq)
	if missingRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing lat/lng, got %d", missingRec.Code)
	}

	invalidLat := 91.0
	invalidLng := 181.0
	invalidBody, _ := json.Marshal(CreateSiteSubmissionRequest{
		Name:            "Sombrero",
		Description:     "Calm reef shelf with easy shore entry.",
		Lat:             &invalidLat,
		Lng:             &invalidLng,
		EntryDifficulty: "easy",
	})
	invalidReq := httptest.NewRequest(http.MethodPost, "/sites/submit", bytes.NewReader(invalidBody))
	invalidReq.Header.Set("Content-Type", "application/json")
	invalidRec := httptest.NewRecorder()
	router.ServeHTTP(invalidRec, invalidReq)
	if invalidRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid lat/lng range, got %d", invalidRec.Code)
	}
}

func TestExploreSubmissionRoutesRequireAuthAndPermission(t *testing.T) {
	router := buildExploreRouter(t, &exploreServiceStub{}, authz.Identity{})

	submitReq := httptest.NewRequest(http.MethodPost, "/sites/submit", bytes.NewBufferString(`{"name":"Sombrero","lat":13.72,"lng":120.88,"entryDifficulty":"easy"}`))
	submitReq.Header.Set("Content-Type", "application/json")
	submitRec := httptest.NewRecorder()
	router.ServeHTTP(submitRec, submitReq)
	if submitRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for signed-out submission, got %d", submitRec.Code)
	}
}

func TestExploreSubmissionAndModerationRoutes(t *testing.T) {
	submission := explorerepo.SiteSubmission{
		ID:              "550e8400-e29b-41d4-a716-446655440901",
		Slug:            "pending-abc12345",
		Name:            "Sombrero",
		Area:            "Mabini, Batangas",
		Difficulty:      "easy",
		Hazards:         []string{"boat traffic"},
		ModerationState: "pending",
		LastUpdatedAt:   time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
		CreatedAt:       time.Now().UTC(),
	}
	moderated := submission
	moderated.ModerationState = "approved"
	moderated.Slug = "sombrero-mabini-batangas"

	member := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionExploreSubmit: true,
		},
	}
	memberSvc := &exploreServiceStub{
		submission: submission,
		submissionList: exploreservice.SubmissionListResult{
			Items: []explorerepo.SiteSubmission{submission},
		},
	}
	memberRouter := buildExploreRouter(t, memberSvc, member)

	body, _ := json.Marshal(CreateSiteSubmissionRequest{
		Name:            "Sombrero",
		Description:     "Calm reef shelf with easy shore entry.",
		Lat:             float64Ptr(13.72),
		Lng:             float64Ptr(120.88),
		EntryDifficulty: "easy",
	})
	submitReq := httptest.NewRequest(http.MethodPost, "/sites/submit", bytes.NewReader(body))
	submitReq.Header.Set("Content-Type", "application/json")
	submitRec := httptest.NewRecorder()
	memberRouter.ServeHTTP(submitRec, submitReq)
	if submitRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 for member submission, got %d", submitRec.Code)
	}
	if memberSvc.createSubmission.Lat == nil || memberSvc.createSubmission.Lng == nil {
		t.Fatalf("expected handler to pass lat/lng to service, got %+v", memberSvc.createSubmission)
	}

	siteEdit := explorerepo.SiteEditProposal{
		ID:                     "550e8400-e29b-41d4-a716-446655440902",
		DiveSiteID:             "550e8400-e29b-41d4-a716-446655440101",
		SiteSlug:               "sardine-run",
		SiteArea:               "Moalboal, Cebu",
		SubmittedByAppUserID:   member.UserID,
		SubmittedByDisplayName: "Member",
		State:                  "pending",
		Current: explorerepo.SiteEditValues{
			Name:        "Sardine Run",
			Description: "Known sardine site.",
			Difficulty:  "easy",
			Hazards:     []string{"boat traffic"},
		},
		Proposed: explorerepo.SiteEditValues{
			Name:        "Sardine Run",
			Description: "Known sardine bait ball site.",
			Difficulty:  "easy",
			Hazards:     []string{"boat traffic"},
		},
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	memberSvc.siteEdit = siteEdit
	editBody, _ := json.Marshal(CreateSiteEditProposalRequest{
		Name:            "Sardine Run",
		Description:     "Known sardine bait ball site.",
		EntryDifficulty: "easy",
		Hazards:         []string{"boat traffic"},
	})
	editReq := httptest.NewRequest(http.MethodPost, "/sites/sardine-run/edit-proposals", bytes.NewReader(editBody))
	editReq.Header.Set("Content-Type", "application/json")
	editRec := httptest.NewRecorder()
	memberRouter.ServeHTTP(editRec, editReq)
	if editRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 for member site edit proposal, got %d: %s", editRec.Code, editRec.Body.String())
	}
	if memberSvc.createSiteEdit.Slug != "sardine-run" || memberSvc.createSiteEdit.ActorRole != "member" {
		t.Fatalf("expected handler to pass slug and role, got %+v", memberSvc.createSiteEdit)
	}

	failingSvc := &exploreServiceStub{
		err: exploreservice.ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"location"},
			Code:    "invalid_location",
			Message: "Unable to determine area from map pin. Please pick a different spot.",
		}}},
	}
	failingRouter := buildExploreRouter(t, failingSvc, member)
	failingReq := httptest.NewRequest(http.MethodPost, "/sites/submit", bytes.NewReader(body))
	failingReq.Header.Set("Content-Type", "application/json")
	failingRec := httptest.NewRecorder()
	failingRouter.ServeHTTP(failingRec, failingReq)
	if failingRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid geocoded location, got %d", failingRec.Code)
	}

	myListReq := httptest.NewRequest(http.MethodGet, "/sites/submissions", nil)
	myListRec := httptest.NewRecorder()
	memberRouter.ServeHTTP(myListRec, myListReq)
	if myListRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for my submissions, got %d", myListRec.Code)
	}

	moderator := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440010",
		GlobalRole:    "moderator",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionExploreSubmit:   true,
			authz.PermissionExploreModerate: true,
		},
	}
	moderatorSvc := &exploreServiceStub{
		submissionList: exploreservice.SubmissionListResult{
			Items: []explorerepo.SiteSubmission{submission},
		},
		moderationDetail: moderated,
		siteEditList: exploreservice.SiteEditProposalListResult{
			Items: []explorerepo.SiteEditProposal{siteEdit},
		},
		siteEdit: siteEdit,
	}
	moderatorRouter := buildExploreRouter(t, moderatorSvc, moderator)

	pendingReq := httptest.NewRequest(http.MethodGet, "/moderation/sites/pending", nil)
	pendingRec := httptest.NewRecorder()
	moderatorRouter.ServeHTTP(pendingRec, pendingReq)
	if pendingRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for pending moderation list, got %d", pendingRec.Code)
	}

	approveReq := httptest.NewRequest(http.MethodPost, "/moderation/sites/550e8400-e29b-41d4-a716-446655440901/approve", bytes.NewBufferString(`{"reason":"Looks legitimate"}`))
	approveReq.Header.Set("Content-Type", "application/json")
	approveRec := httptest.NewRecorder()
	moderatorRouter.ServeHTTP(approveRec, approveReq)
	if approveRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for approve site, got %d", approveRec.Code)
	}

	editPendingReq := httptest.NewRequest(http.MethodGet, "/moderation/site-edits/pending", nil)
	editPendingRec := httptest.NewRecorder()
	moderatorRouter.ServeHTTP(editPendingRec, editPendingReq)
	if editPendingRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for pending site edits, got %d", editPendingRec.Code)
	}

	applyEditReq := httptest.NewRequest(http.MethodPost, "/moderation/site-edits/550e8400-e29b-41d4-a716-446655440902/approve", bytes.NewBufferString(`{"reason":"Accurate correction"}`))
	applyEditReq.Header.Set("Content-Type", "application/json")
	applyEditRec := httptest.NewRecorder()
	moderatorRouter.ServeHTTP(applyEditRec, applyEditReq)
	if applyEditRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for apply site edit, got %d", applyEditRec.Code)
	}

	forbiddenReq := httptest.NewRequest(http.MethodGet, "/moderation/sites/pending", nil)
	forbiddenRec := httptest.NewRecorder()
	memberRouter.ServeHTTP(forbiddenRec, forbiddenReq)
	if forbiddenRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-moderator pending list, got %d", forbiddenRec.Code)
	}
}

func buildExploreRouter(t *testing.T, svc *exploreServiceStub, identity authz.Identity) http.Handler {
	t.Helper()
	h := New(svc, validatex.New())

	router := chi.NewRouter()
	if identity.UserID != "" {
		router.Use(func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				next.ServeHTTP(w, r.WithContext(middleware.WithIdentity(r.Context(), identity)))
			})
		})
	}
	router.Mount("/", Routes(h))
	return router
}

func stringPtr(value string) *string { return &value }

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func float64Ptr(value float64) *float64 { return &value }
