package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

func TestProfilesRoutesRequireAuth(t *testing.T) {
	v := validatex.New()
	router := chi.NewRouter()
	router.Use(middleware.RequireMember)
	router.Mount("/", Routes(New(nil, v)))

	paths := []string{
		"/me/profile",
		"/profiles/550e8400-e29b-41d4-a716-446655440000",
		"/profiles/by-username/member",
		"/profiles/by-username/member/posts",
		"/profiles/by-username/member/bucketlist",
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
	router := chi.NewRouter()
	router.Mount("/", PublicRoutes(New(&stubProfilesService{}, v)))

	req := httptest.NewRequest(http.MethodGet, "/public/member", nil)
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
