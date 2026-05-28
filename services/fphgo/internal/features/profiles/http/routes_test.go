package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	profilesservice "fphgo/internal/features/profiles/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

type publicProfileViewerService struct {
	*stubProfilesService
	getProfileViewByUsernameFn func(context.Context, string, string) (profilesservice.ProfileView, error)
}

func (s *publicProfileViewerService) GetProfileViewByUsername(ctx context.Context, username, viewerID string) (profilesservice.ProfileView, error) {
	if s.getProfileViewByUsernameFn != nil {
		return s.getProfileViewByUsernameFn(ctx, username, viewerID)
	}
	return s.stubProfilesService.GetProfileViewByUsername(ctx, username, viewerID)
}

func TestProfilesRoutesRequireAuth(t *testing.T) {
	v := validatex.New()
	router := chi.NewRouter()
	router.Use(middleware.RequireMember)
	router.Mount("/", Routes(New(nil, v)))

	paths := []string{
		"/me/profile",
		"/me/saved",
	}
	for _, path := range paths {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 for %s, got %d", path, rec.Code)
		}
	}
}

func TestPublicProfileRouteIsGuestReadable(t *testing.T) {
	v := validatex.New()
	service := &publicProfileViewerService{
		stubProfilesService: &stubProfilesService{},
	}
	router := chi.NewRouter()
	router.Mount("/", PublicRoutes(New(service, v)))

	req := httptest.NewRequest(http.MethodGet, "/member", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for guest public profile read, got %d: %s", rec.Code, rec.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}
	profile, ok := payload["profile"].(map[string]any)
	if !ok {
		t.Fatalf("expected profile object, got %v", payload)
	}
	if profile["username"] != "member" {
		t.Fatalf("expected username member, got %v", profile["username"])
	}
	if _, ok := profile["emailVerified"]; ok {
		t.Fatal("public profile leaked emailVerified")
	}
	if _, ok := profile["phoneVerified"]; ok {
		t.Fatal("public profile leaked phoneVerified")
	}
	if _, ok := profile["location"]; ok {
		t.Fatal("public profile leaked location")
	}
	if _, ok := profile["socials"]; ok {
		t.Fatal("public profile leaked socials")
	}
	if viewerRelationship, ok := profile["viewerRelationship"].(map[string]any); ok {
		if viewerRelationship["isSelf"] != false {
			t.Fatalf("expected guest viewer isSelf=false, got %v", viewerRelationship["isSelf"])
		}
		if viewerRelationship["isFollowing"] != false {
			t.Fatalf("expected guest viewer isFollowing=false, got %v", viewerRelationship["isFollowing"])
		}
		if viewerRelationship["isBlocked"] != false {
			t.Fatalf("expected guest viewer isBlocked=false, got %v", viewerRelationship["isBlocked"])
		}
		if viewerRelationship["hasBlockedViewer"] != false {
			t.Fatalf("expected guest viewer hasBlockedViewer=false, got %v", viewerRelationship["hasBlockedViewer"])
		}
		if viewerRelationship["canMessage"] != false {
			t.Fatalf("expected guest viewer canMessage=false, got %v", viewerRelationship["canMessage"])
		}
		if viewerRelationship["canFollow"] != false {
			t.Fatalf("expected guest viewer canFollow=false, got %v", viewerRelationship["canFollow"])
		}
		if viewerRelationship["canEdit"] != false {
			t.Fatalf("expected guest viewer canEdit=false, got %v", viewerRelationship["canEdit"])
		}
	} else {
		t.Fatalf("missing viewerRelationship in guest public profile response: %v", profile)
	}
}

func TestPublicProfileRouteViewerFlagsForSelfAndOther(t *testing.T) {
	v := validatex.New()
	selfID := "550e8400-e29b-41d4-a716-446655440000"
	otherID := "550e8400-e29b-41d4-a716-446655440111"

	makeRequest := func(viewerID string) *httptest.ResponseRecorder {
		service := &publicProfileViewerService{
			stubProfilesService: &stubProfilesService{},
			getProfileViewByUsernameFn: func(_ context.Context, username, _ string) (profilesservice.ProfileView, error) {
				viewer := profilesservice.ProfileViewerRelationship{}
				if viewerID == selfID {
					viewer = profilesservice.ProfileViewerRelationship{
						IsSelf:           true,
						CanMessage:       false,
						CanFollow:        false,
						CanEdit:          true,
						IsFollowing:      false,
						IsBlocked:        false,
						HasBlockedViewer: false,
					}
				} else if viewerID != "" && viewerID != selfID {
					viewer = profilesservice.ProfileViewerRelationship{
						IsSelf:           false,
						CanMessage:       true,
						CanFollow:        true,
						CanEdit:          false,
						IsFollowing:      true,
						IsBlocked:        false,
						HasBlockedViewer: false,
					}
				}
				return profilesservice.ProfileView{
					UserID:      "550e8400-e29b-41d4-a716-446655440011",
					Username:    username,
					DisplayName: "Member User",
					Bio:         "Bio",
					AvatarURL:   "https://example.com/avatar.jpg",
					CreatedAt:   time.Now().UTC(),
					Counts: profilesservice.ProfileViewCounts{
						MediaPosts: 2,
						Followers:  3,
						Following:  4,
					},
					Viewer: viewer,
				}, nil
			},
		}

		router := chi.NewRouter()
		if viewerID != "" {
			router.Use(func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
					ctx := middleware.WithIdentity(req.Context(), authz.Identity{UserID: viewerID})
					next.ServeHTTP(w, req.WithContext(ctx))
				})
			})
		}
		router.Mount("/", PublicRoutes(New(service, v)))
		req := httptest.NewRequest(http.MethodGet, "/member", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	assertViewerRelationship := func(t *testing.T, rec *httptest.ResponseRecorder, expected map[string]any) {
		t.Helper()
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
		}
		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		profile, ok := payload["profile"].(map[string]any)
		if !ok {
			t.Fatalf("expected profile object, got %v", payload)
		}
		viewerRelationship, ok := profile["viewerRelationship"].(map[string]any)
		if !ok {
			t.Fatalf("missing viewerRelationship in profile response: %v", payload)
		}
		for key, expectedValue := range expected {
			if viewerRelationship[key] != expectedValue {
				t.Fatalf("expected viewerRelationship[%s]=%v, got %v", key, expectedValue, viewerRelationship[key])
			}
		}
	}

	assertViewerRelationship(
		t,
		makeRequest(selfID),
		map[string]any{
			"isSelf":      true,
			"canEdit":     true,
			"canMessage":  false,
			"canFollow":   false,
			"isFollowing": false,
		},
	)
	assertViewerRelationship(
		t,
		makeRequest(otherID),
		map[string]any{
			"isSelf":      false,
			"canEdit":     false,
			"canMessage":  true,
			"canFollow":   true,
			"isFollowing": true,
		},
	)
}

func TestPublicProfileRouteReturns404ForMissingUsername(t *testing.T) {
	v := validatex.New()
	service := &publicProfileViewerService{
		stubProfilesService: &stubProfilesService{},
		getProfileViewByUsernameFn: func(_ context.Context, username, _ string) (profilesservice.ProfileView, error) {
			if username == "member" {
				return profilesservice.ProfileView{
					UserID:      "550e8400-e29b-41d4-a716-446655440011",
					Username:    username,
					DisplayName: "Member User",
					Bio:         "Bio",
					AvatarURL:   "https://example.com/avatar.jpg",
					CreatedAt:   time.Now().UTC(),
				}, nil
			}
			return profilesservice.ProfileView{}, errors.New(http.StatusNotFound, "profile_not_found", "profile not found", nil)
		},
	}
	router := chi.NewRouter()
	router.Mount("/", PublicRoutes(New(service, v)))

	req := httptest.NewRequest(http.MethodGet, "/not-found", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for missing profile, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestProfilesRoutesRequirePermissions(t *testing.T) {
	v := validatex.New()
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   map[authz.Permission]bool{},
	}

	router := buildTestRouter(identity, v)

	readReq := httptest.NewRequest(http.MethodGet, "/me/profile", nil)
	readRec := httptest.NewRecorder()
	router.ServeHTTP(readRec, readReq)
	if readRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for missing profiles.read, got %d", readRec.Code)
	}

	writeReq := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"displayName":"New"}`))
	writeReq.Header.Set("Content-Type", "application/json")
	writeRec := httptest.NewRecorder()
	router.ServeHTTP(writeRec, writeReq)
	if writeRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for missing profiles.write, got %d", writeRec.Code)
	}
}

func TestPatchProfileValidation(t *testing.T) {
	v := validatex.New()
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionProfilesRead:  true,
			authz.PermissionProfilesWrite: true,
		},
	}

	router := buildTestRouter(identity, v)
	req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"avatarUrl":"`+strings.Repeat("a", 501)+`"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 validation error, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}
	errorObj, ok := payload["error"].(map[string]any)
	if !ok || errorObj["code"] != "validation_error" {
		t.Fatalf("expected validation_error payload, got %v", payload)
	}
	if issues, ok := errorObj["issues"].([]any); !ok || len(issues) == 0 {
		t.Fatalf("expected validation issues, got %v", errorObj["issues"])
	}
}

func buildTestRouter(identity authz.Identity, v httpx.Validator) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(New(nil, v)))
	return r
}
