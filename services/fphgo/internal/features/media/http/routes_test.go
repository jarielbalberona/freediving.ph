package http

import (
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

func TestMediaRoutesRequireAuth(t *testing.T) {
	router := chi.NewRouter()
	router.Use(middleware.RequireMember)
	router.Mount("/", Routes(New(nil, validatex.New())))

	req := httptest.NewRequest(http.MethodPost, "/upload-multiple", strings.NewReader(""))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=abc")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestMediaRoutesRequirePermission(t *testing.T) {
	router := permissionRouter(authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   map[authz.Permission]bool{},
	})

	req := httptest.NewRequest(http.MethodPost, "/upload-multiple", strings.NewReader(""))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=abc")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestUploadMultipleValidationRequiresFiles(t *testing.T) {
	router := permissionRouter(authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionMediaWrite: true,
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/upload-multiple", strings.NewReader(""))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=abc")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func permissionRouter(identity authz.Identity) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(New(nil, validatex.New())))
	return r
}

var _ httpx.Validator = validatex.New()
