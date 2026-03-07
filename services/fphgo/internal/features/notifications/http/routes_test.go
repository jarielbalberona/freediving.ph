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

func TestNotificationRoutesRequireReadAndWritePermissions(t *testing.T) {
	h := New(nil, validatex.New())

	t.Run("read endpoint requires notifications.read", func(t *testing.T) {
		router := buildNotificationPermissionRouter(authz.Identity{
			UserID:        "550e8400-e29b-41d4-a716-446655440000",
			GlobalRole:    "member",
			AccountStatus: "active",
			Permissions:   map[authz.Permission]bool{},
		}, h)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for missing notifications.read, got %d", rec.Code)
		}
	})

	t.Run("write endpoint requires notifications.write", func(t *testing.T) {
		router := buildNotificationPermissionRouter(authz.Identity{
			UserID:        "550e8400-e29b-41d4-a716-446655440000",
			GlobalRole:    "member",
			AccountStatus: "active",
			Permissions: map[authz.Permission]bool{
				authz.PermissionNotificationsRead: true,
			},
		}, h)

		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{
			"userId":"550e8400-e29b-41d4-a716-446655440000",
			"type":"SYSTEM",
			"title":"hello",
			"message":"world"
		}`))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for missing notifications.write, got %d", rec.Code)
		}
	})
}

func buildNotificationPermissionRouter(identity authz.Identity, h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(h))
	return r
}
