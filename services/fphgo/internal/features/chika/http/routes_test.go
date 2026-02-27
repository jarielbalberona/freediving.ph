package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	chikaservice "fphgo/internal/features/chika/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

func TestChikaWriteEndpointsRequireAuth(t *testing.T) {
	v := validatex.New()
	router := chi.NewRouter()
	router.Use(middleware.RequireMember)
	router.Use(middleware.RequirePermission(authz.PermissionChikaRead))
	router.Mount("/", Routes(New(chikaservice.New(nil, nil), v)))

	tests := []struct {
		name   string
		method string
		path   string
		body   any
	}{
		{"POST threads", http.MethodPost, "/threads", CreateThreadRequest{Title: "t", CategoryID: "550e8400-e29b-41d4-a716-446655440099"}},
		{"POST threads/{id}/posts", http.MethodPost, "/threads/550e8400-e29b-41d4-a716-446655440000/posts", CreatePostRequest{Content: "c"}},
		{"POST threads/{id}/comments", http.MethodPost, "/threads/550e8400-e29b-41d4-a716-446655440000/comments", CreateCommentRequest{Content: "c"}},
		{"POST threads/{id}/reactions", http.MethodPost, "/threads/550e8400-e29b-41d4-a716-446655440000/reactions", SetReactionRequest{Type: "upvote"}},
		{"POST media", http.MethodPost, "/media", CreateMediaAssetRequest{EntityType: "thread", EntityID: "550e8400-e29b-41d4-a716-446655440000", StorageKey: "k", URL: "https://x.com/1", MimeType: "image/png", SizeBytes: 0}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var body []byte
			if tc.body != nil {
				body, _ = json.Marshal(tc.body)
			}
			req := httptest.NewRequest(tc.method, tc.path, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401 without auth, got %d", rec.Code)
			}
		})
	}
}

func TestChikaWriteEndpointsRejectWithoutChikaWrite(t *testing.T) {
	v := validatex.New()
	basePerms := authz.RolePermissions("member")
	overrides := map[authz.Permission]bool{authz.PermissionChikaWrite: false}
	perms := authz.ApplyOverrides(basePerms, overrides)

	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   perms,
	}

	router := buildTestRouter(identity, chikaservice.New(nil, nil), v)
	req := httptest.NewRequest(http.MethodPost, "/threads", bytes.NewReader([]byte(`{"title":"t","categoryId":"550e8400-e29b-41d4-a716-446655440099"}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 without chika.write, got %d", rec.Code)
	}
}

func TestChikaWriteRejectsReadOnly(t *testing.T) {
	v := validatex.New()
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "read_only",
		Permissions:   authz.RolePermissions("member"),
	}

	router := buildTestRouter(identity, chikaservice.New(nil, nil), v)
	req := httptest.NewRequest(http.MethodPost, "/threads", bytes.NewReader([]byte(`{"title":"t","categoryId":"550e8400-e29b-41d4-a716-446655440099"}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for read_only on write, got %d", rec.Code)
	}
}

func TestChikaWriteRejectsSuspended(t *testing.T) {
	v := validatex.New()
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "suspended",
		Permissions:   authz.RolePermissions("member"),
	}

	router := buildTestRouter(identity, chikaservice.New(nil, nil), v)
	req := httptest.NewRequest(http.MethodPost, "/threads", bytes.NewReader([]byte(`{"title":"t","categoryId":"550e8400-e29b-41d4-a716-446655440099"}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for suspended, got %d", rec.Code)
	}
}

func TestChikaCreateThreadValidation_UnknownField(t *testing.T) {
	v := validatex.New()
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   authz.RolePermissions("member"),
	}

	router := buildTestRouter(identity, chikaservice.New(nil, nil), v)
	body := `{"title":"t","categoryId":"550e8400-e29b-41d4-a716-446655440099","bogus":"value"}`
	req := httptest.NewRequest(http.MethodPost, "/threads", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unknown field, got %d", rec.Code)
	}

	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	errObj, ok := resp["error"].(map[string]any)
	if !ok {
		t.Fatal("expected error object in response")
	}
	if errObj["code"] != "validation_error" {
		t.Fatalf("expected code 'validation_error', got %v", errObj["code"])
	}
	issues, ok := errObj["issues"].([]any)
	if !ok || len(issues) == 0 {
		t.Fatal("expected at least one issue")
	}
	firstIssue := issues[0].(map[string]any)
	if firstIssue["code"] != "unrecognized_key" {
		t.Fatalf("expected issue code 'unrecognized_key', got %v", firstIssue["code"])
	}
}

func TestChikaCreateThreadValidation_MissingRequired(t *testing.T) {
	v := validatex.New()
	identity := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   authz.RolePermissions("member"),
	}

	router := buildTestRouter(identity, chikaservice.New(nil, nil), v)
	body := `{"categoryId":"550e8400-e29b-41d4-a716-446655440099"}`
	req := httptest.NewRequest(http.MethodPost, "/threads", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing required, got %d", rec.Code)
	}

	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	errObj := resp["error"].(map[string]any)
	if errObj["code"] != "validation_error" {
		t.Fatalf("expected code 'validation_error', got %v", errObj["code"])
	}
	issues := errObj["issues"].([]any)
	if len(issues) == 0 {
		t.Fatal("expected at least one issue")
	}

	found := false
	for _, raw := range issues {
		issue := raw.(map[string]any)
		if issue["code"] == "required" {
			path := issue["path"].([]any)
			if len(path) == 1 && path[0] == "title" {
				found = true
			}
		}
	}
	if !found {
		t.Fatal("expected a 'required' issue for 'title'")
	}
}

func buildTestRouter(identity authz.Identity, svc *chikaservice.Service, v httpx.Validator) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Use(middleware.RequirePermission(authz.PermissionChikaRead))
	r.Mount("/", Routes(New(svc, v)))
	return r
}
