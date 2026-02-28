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
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type exploreServiceStub struct {
	listResult       exploreservice.ListSitesResult
	latest           exploreservice.ListLatestUpdatesResult
	detail           exploreservice.SiteDetailResult
	preview          exploreservice.SiteBuddyPreviewResult
	intents          exploreservice.SiteBuddyIntentsResult
	create           explorerepo.SiteUpdate
	createSubmission exploreservice.CreateSiteSubmissionInput
	submission       explorerepo.SiteSubmission
	submissionList   exploreservice.SubmissionListResult
	moderationDetail explorerepo.SiteSubmission
	err              error
}

func (s *exploreServiceStub) ListSites(context.Context, exploreservice.ListSitesInput) (exploreservice.ListSitesResult, error) {
	return s.listResult, s.err
}

func (s *exploreServiceStub) GetSiteBySlug(context.Context, string, string, int32) (exploreservice.SiteDetailResult, error) {
	return s.detail, s.err
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

func TestExplorePublicReadsAndWriteAuthGates(t *testing.T) {
	svc := &exploreServiceStub{
		listResult: exploreservice.ListSitesResult{
			Items: []explorerepo.SiteCard{{
				ID:                 "550e8400-e29b-41d4-a716-446655440101",
				Slug:               "twin-rocks-anilao",
				Name:               "Twin Rocks",
				Area:               "Mabini, Batangas",
				Difficulty:         "easy",
				Hazards:            []string{"boat traffic"},
				VerificationStatus: "verified",
				LastUpdatedAt:      time.Now().UTC(),
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

	getDetail := httptest.NewRequest(http.MethodGet, "/sites/twin-rocks-anilao", nil)
	getDetailRec := httptest.NewRecorder()
	r.ServeHTTP(getDetailRec, getDetail)
	if getDetailRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public detail, got %d", getDetailRec.Code)
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

	intentsReq := httptest.NewRequest(http.MethodGet, "/sites/twin-rocks-anilao/buddy-intents", nil)
	intentsRec := httptest.NewRecorder()
	r.ServeHTTP(intentsRec, intentsReq)
	if intentsRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for signed-out buddy intents, got %d", intentsRec.Code)
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

func float64Ptr(value float64) *float64 { return &value }
