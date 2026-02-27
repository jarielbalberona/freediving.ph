package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

func TestMessagingRoutesRequireReadAndWritePermissions(t *testing.T) {
	h := New(nil, nil, validatex.New())

	t.Run("read endpoint requires messaging.read", func(t *testing.T) {
		router := buildMessagingPermissionRouter(authz.Identity{
			UserID:        "550e8400-e29b-41d4-a716-446655440000",
			GlobalRole:    "member",
			AccountStatus: "active",
			Permissions:   map[authz.Permission]bool{},
		}, h)

		req := httptest.NewRequest(http.MethodGet, "/inbox", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for missing messaging.read, got %d", rec.Code)
		}
	})

	t.Run("write endpoint requires messaging.write", func(t *testing.T) {
		router := buildMessagingPermissionRouter(authz.Identity{
			UserID:        "550e8400-e29b-41d4-a716-446655440000",
			GlobalRole:    "member",
			AccountStatus: "active",
			Permissions: map[authz.Permission]bool{
				authz.PermissionMessagingRead: true,
			},
		}, h)

		req := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"550e8400-e29b-41d4-a716-446655440001","content":"hello"}`))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for missing messaging.write, got %d", rec.Code)
		}
	})
}

func buildMessagingPermissionRouter(identity authz.Identity, h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Use(middleware.RequirePermission(authz.PermissionMessagingRead))
	r.Mount("/", Routes(h))
	return r
}
