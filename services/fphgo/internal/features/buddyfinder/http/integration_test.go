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
	buddyfinderservice "fphgo/internal/features/buddyfinder/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type buddyFinderServiceStub struct {
	preview buddyfinderservice.PreviewResult
	share   buddyfinderservice.SharePreviewResult
	list    buddyfinderservice.ListMemberIntentsResult
	intent  buddyfinderrepo.Intent
	entry   buddyfinderservice.MessageEntryResult
	err     error
}

func (s *buddyFinderServiceStub) Preview(context.Context, string, int32) (buddyfinderservice.PreviewResult, error) {
	return s.preview, s.err
}
func (s *buddyFinderServiceStub) GetSharePreview(context.Context, string) (buddyfinderservice.SharePreviewResult, error) {
	return s.share, s.err
}
func (s *buddyFinderServiceStub) ListMemberIntents(context.Context, buddyfinderservice.ListMemberIntentsInput) (buddyfinderservice.ListMemberIntentsResult, error) {
	return s.list, s.err
}
func (s *buddyFinderServiceStub) CreateIntent(context.Context, buddyfinderservice.CreateIntentInput) (buddyfinderrepo.Intent, error) {
	return s.intent, s.err
}
func (s *buddyFinderServiceStub) DeleteIntent(context.Context, string, string) error { return s.err }
func (s *buddyFinderServiceStub) MessageEntry(context.Context, string, string) (buddyfinderservice.MessageEntryResult, error) {
	return s.entry, s.err
}

func TestBuddyFinderPreviewPublicAndMemberRoutesProtected(t *testing.T) {
	svc := &buddyFinderServiceStub{
		preview: buddyfinderservice.PreviewResult{
			Area:  "Moalboal, Cebu",
			Count: 2,
			Items: []buddyfinderrepo.PreviewIntent{{
				ID:            "550e8400-e29b-41d4-a716-446655440001",
				Area:          "Moalboal, Cebu",
				IntentType:    "training",
				TimeWindow:    "today",
				CreatedAt:     time.Now().UTC(),
				EmailVerified: true,
			}},
		},
	}
	router := buildBuddyFinderRouter(t, svc, authz.Identity{})

	previewReq := httptest.NewRequest(http.MethodGet, "/preview?area=Moalboal,%20Cebu", nil)
	previewRec := httptest.NewRecorder()
	router.ServeHTTP(previewRec, previewReq)
	if previewRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public preview, got %d", previewRec.Code)
	}

	svc.share = buddyfinderservice.SharePreviewResult{
		Intent: buddyfinderrepo.SharePreview{
			ID:            "550e8400-e29b-41d4-a716-446655440001",
			DiveSiteName:  "Twin Rocks",
			Area:          "Moalboal, Cebu",
			IntentType:    "training",
			TimeWindow:    "today",
			CreatedAt:     time.Now().UTC(),
			EmailVerified: true,
		},
	}
	shareReq := httptest.NewRequest(http.MethodGet, "/intents/550e8400-e29b-41d4-a716-446655440001/share-preview", nil)
	shareRec := httptest.NewRecorder()
	router.ServeHTTP(shareRec, shareReq)
	if shareRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public share preview, got %d", shareRec.Code)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/intents?area=Moalboal,%20Cebu", nil)
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for signed-out intents list preview, got %d", listRec.Code)
	}
}

func TestBuddyFinderCreateValidationAndRateLimit(t *testing.T) {
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionBuddiesRead:  true,
			authz.PermissionBuddiesWrite: true,
		},
	}

	validationRouter := buildBuddyFinderRouter(t, &buddyFinderServiceStub{}, identity)
	req := httptest.NewRequest(http.MethodPost, "/intents", bytes.NewBufferString(`{"diveSiteId":"not-a-uuid","intentType":"training","timeWindow":"today"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	validationRouter.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid create intent, got %d", rec.Code)
	}

	rateLimitedRouter := buildBuddyFinderRouter(t, &buddyFinderServiceStub{err: apperrors.NewRateLimited("slow down", 3600, 15)}, identity)
	validBody, _ := json.Marshal(CreateIntentRequest{
		Area:       "Moalboal, Cebu",
		IntentType: "training",
		TimeWindow: "today",
	})
	rateReq := httptest.NewRequest(http.MethodPost, "/intents", bytes.NewReader(validBody))
	rateReq.Header.Set("Content-Type", "application/json")
	rateRec := httptest.NewRecorder()
	rateLimitedRouter.ServeHTTP(rateRec, rateReq)
	if rateRec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 for rate-limited create intent, got %d", rateRec.Code)
	}
}

func buildBuddyFinderRouter(t *testing.T, svc *buddyFinderServiceStub, identity authz.Identity) http.Handler {
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
