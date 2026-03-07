package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
)

func TestSessionRouteRequiresAuth(t *testing.T) {
	r := chi.NewRouter()
	r.Use(middleware.RequireMember)
	r.Mount("/v1/auth", Routes(New()))

	req := httptest.NewRequest(http.MethodGet, "/v1/auth/session", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON error payload, got decode error: %v", err)
	}
	errorMap := payload["error"].(map[string]any)
	if errorMap["code"] != "unauthenticated" {
		t.Fatalf("expected unauthenticated code, got %v", errorMap["code"])
	}
}

func TestSessionRouteReturnsEffectivePermissions(t *testing.T) {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			identity := authz.Identity{
				UserID:        "user_local_1",
				ClerkUserID:   "user_clerk_1",
				GlobalRole:    "member",
				AccountStatus: "active",
				Permissions: map[authz.Permission]bool{
					authz.PermissionContentRead:  true,
					authz.PermissionContentWrite: false,
					authz.PermissionUsersRead:    true,
				},
			}
			scope := authz.Scope{
				GroupID:   "group_1",
				GroupRole: "owner",
			}
			ctx := middleware.WithIdentity(req.Context(), identity)
			ctx = middleware.WithScope(ctx, scope)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/v1/auth", Routes(New()))

	req := httptest.NewRequest(http.MethodGet, "/v1/auth/session", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON payload, got decode error: %v", err)
	}
	if payload["userId"] != "user_local_1" {
		t.Fatalf("expected userId user_local_1, got %v", payload["userId"])
	}
	if payload["clerkSubject"] != "user_clerk_1" {
		t.Fatalf("expected clerkSubject user_clerk_1, got %v", payload["clerkSubject"])
	}
	permissions := payload["permissions"].([]any)
	if len(permissions) != 2 {
		t.Fatalf("expected 2 allowed permissions, got %d", len(permissions))
	}
	scopes := payload["scopes"].(map[string]any)
	group := scopes["group"].(map[string]any)
	if group["groupId"] != "group_1" || group["role"] != "owner" {
		t.Fatalf("expected group scope group_1/owner, got %v", group)
	}
	if scopes["event"] != nil {
		t.Fatalf("expected null event scope, got %v", scopes["event"])
	}
}
