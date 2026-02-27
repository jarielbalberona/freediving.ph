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

func TestReportsRoutesRequireAuth(t *testing.T) {
	v := validatex.New()
	router := chi.NewRouter()
	router.Use(middleware.RequireMember)
	router.Mount("/", Routes(New(nil, v)))

	paths := []struct {
		method string
		path   string
		body   string
	}{
		{http.MethodPost, "/", `{"targetType":"user","targetId":"550e8400-e29b-41d4-a716-446655440001","reasonCode":"spam"}`},
		{http.MethodGet, "/", ""},
		{http.MethodGet, "/550e8400-e29b-41d4-a716-446655440001", ""},
		{http.MethodPatch, "/550e8400-e29b-41d4-a716-446655440001/status", `{"status":"reviewing"}`},
	}

	for _, tc := range paths {
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 for %s %s, got %d", tc.method, tc.path, rec.Code)
		}
	}
}

func TestReportsRoutesRequirePermissions(t *testing.T) {
	v := validatex.New()
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   map[authz.Permission]bool{},
	}
	router := buildReportsPermissionRouter(identity, v)

	postReq := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"targetType":"user","targetId":"550e8400-e29b-41d4-a716-446655440001","reasonCode":"spam"}`))
	postReq.Header.Set("Content-Type", "application/json")
	postRec := httptest.NewRecorder()
	router.ServeHTTP(postRec, postReq)
	if postRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for missing reports.write, got %d", postRec.Code)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/", nil)
	getRec := httptest.NewRecorder()
	router.ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for missing reports.read, got %d", getRec.Code)
	}

	patchReq := httptest.NewRequest(http.MethodPatch, "/550e8400-e29b-41d4-a716-446655440001/status", strings.NewReader(`{"status":"reviewing"}`))
	patchReq.Header.Set("Content-Type", "application/json")
	patchRec := httptest.NewRecorder()
	router.ServeHTTP(patchRec, patchReq)
	if patchRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for missing reports.moderate, got %d", patchRec.Code)
	}
}

func TestCreateReportValidation(t *testing.T) {
	v := validatex.New()
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	}
	router := buildReportsPermissionRouter(identity, v)

	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"targetType":"invalid","targetId":"","reasonCode":"nope"}`))
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
}

func buildReportsPermissionRouter(identity authz.Identity, v httpx.Validator) chi.Router {
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
