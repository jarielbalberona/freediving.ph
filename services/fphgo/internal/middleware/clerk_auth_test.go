package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clerk/clerk-sdk-go/v2"

	"fphgo/internal/config"
	"fphgo/internal/shared/authz"
)

func TestRequireMemberRejectsMissingClaims(t *testing.T) {
	handler := RequireMember(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON error payload, got decode error: %v", err)
	}
	if got := extractErrorCode(t, payload); got != "unauthenticated" {
		t.Fatalf("expected error code unauthenticated, got %s", got)
	}
}

func TestRequireMemberAllowsWhenClaimsPresent(t *testing.T) {
	handler := RequireMember(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx := WithIdentity(req.Context(), authz.Identity{
		UserID:        "0dca86f3-5294-4cb9-af26-2f73591f55f5",
		ClerkUserID:   "user_123",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   authz.RolePermissions("member"),
	})
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rec.Code)
	}
}

func TestRequireMemberRejectsSuspended(t *testing.T) {
	handler := RequireMember(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx := WithIdentity(req.Context(), authz.Identity{
		UserID:        "0dca86f3-5294-4cb9-af26-2f73591f55f5",
		ClerkUserID:   "user_123",
		GlobalRole:    "member",
		AccountStatus: "suspended",
		Permissions:   authz.RolePermissions("member"),
	})
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 for suspended, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON error payload, got decode error: %v", err)
	}
	if got := extractErrorCode(t, payload); got != "forbidden" {
		t.Fatalf("expected error code forbidden, got %s", got)
	}
}

func TestRequireMemberRejectsReadOnlyOnWrite(t *testing.T) {
	handler := RequireMember(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	methods := []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete}
	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/", nil)
			ctx := WithIdentity(req.Context(), authz.Identity{
				UserID:        "0dca86f3-5294-4cb9-af26-2f73591f55f5",
				ClerkUserID:   "user_123",
				GlobalRole:    "member",
				AccountStatus: "read_only",
				Permissions:   authz.RolePermissions("member"),
			})
			req = req.WithContext(ctx)

			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusForbidden {
				t.Fatalf("expected status 403 for read_only %s, got %d", method, rec.Code)
			}
			var payload map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
				t.Fatalf("expected JSON error payload, got decode error: %v", err)
			}
			if got := extractErrorCode(t, payload); got != "forbidden" {
				t.Fatalf("expected error code forbidden, got %s", got)
			}
		})
	}
}

func TestRequireMemberAllowsReadOnlyOnGet(t *testing.T) {
	handler := RequireMember(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx := WithIdentity(req.Context(), authz.Identity{
		UserID:        "0dca86f3-5294-4cb9-af26-2f73591f55f5",
		ClerkUserID:   "user_123",
		GlobalRole:    "member",
		AccountStatus: "read_only",
		Permissions:   authz.RolePermissions("member"),
	})
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204 for read_only GET, got %d", rec.Code)
	}
}

func TestRequirePermissionRejectsWithoutIdentity(t *testing.T) {
	handler := RequirePermission(authz.PermissionUsersRead)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 when no identity, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON error payload, got decode error: %v", err)
	}
	if got := extractErrorCode(t, payload); got != "unauthenticated" {
		t.Fatalf("expected error code unauthenticated, got %s", got)
	}
}

func TestRequirePermissionRejectsWithoutPermission(t *testing.T) {
	handler := RequirePermission(authz.PermissionUsersRead)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx := WithIdentity(req.Context(), authz.Identity{
		UserID:        "0dca86f3-5294-4cb9-af26-2f73591f55f5",
		ClerkUserID:   "user_123",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   authz.RolePermissions("member"),
	})
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON error payload, got decode error: %v", err)
	}
	if got := extractErrorCode(t, payload); got != "forbidden" {
		t.Fatalf("expected error code forbidden, got %s", got)
	}
}

func TestRequirePermissionAllowsWithOverride(t *testing.T) {
	base := authz.RolePermissions("member")
	overrides := map[authz.Permission]bool{authz.PermissionUsersRead: true}
	perms := authz.ApplyOverrides(base, overrides)

	handler := RequirePermission(authz.PermissionUsersRead)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx := WithIdentity(req.Context(), authz.Identity{
		UserID:        "0dca86f3-5294-4cb9-af26-2f73591f55f5",
		ClerkUserID:   "user_123",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   perms,
	})
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204 with override, got %d", rec.Code)
	}
}

func TestRequirePermissionAllowsWithScopedRole(t *testing.T) {
	handler := RequirePermission(authz.PermissionGroupsManage)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx := WithIdentity(req.Context(), authz.Identity{
		UserID:      "0dca86f3-5294-4cb9-af26-2f73591f55f5",
		GlobalRole:  "member",
		Permissions: authz.RolePermissions("member"),
	})
	ctx = WithScope(ctx, authz.Scope{GroupID: "g1", GroupRole: "owner"})
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204 with scoped group owner, got %d", rec.Code)
	}
}

func extractErrorCode(t *testing.T, payload map[string]any) string {
	t.Helper()
	errorValue, ok := payload["error"]
	if !ok {
		t.Fatalf("expected error payload key")
	}
	errorMap, ok := errorValue.(map[string]any)
	if !ok {
		t.Fatalf("expected error payload object")
	}
	code, ok := errorMap["code"].(string)
	if !ok {
		t.Fatalf("expected error code string")
	}
	return code
}

func TestEnforceTokenClaimsRejectsIssuerMismatch(t *testing.T) {
	handler := EnforceTokenClaims(config.Config{
		ClerkJWTIssuer: "https://issuer.example",
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	claims := &clerk.SessionClaims{
		RegisteredClaims: clerk.RegisteredClaims{
			Issuer:  "https://different-issuer.example",
			Subject: "user_123",
		},
	}
	req = req.WithContext(clerk.ContextWithSessionClaims(req.Context(), claims))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON error payload, got decode error: %v", err)
	}
	if got := extractErrorCode(t, payload); got != "unauthenticated" {
		t.Fatalf("expected error code unauthenticated, got %s", got)
	}
}

func TestEnforceTokenClaimsRejectsAudienceMismatch(t *testing.T) {
	handler := EnforceTokenClaims(config.Config{
		ClerkJWTAudience: []string{"https://api.example"},
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	claims := &clerk.SessionClaims{
		RegisteredClaims: clerk.RegisteredClaims{
			Subject:  "user_123",
			Audience: []string{"https://another-api.example"},
		},
	}
	req = req.WithContext(clerk.ContextWithSessionClaims(req.Context(), claims))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected JSON error payload, got decode error: %v", err)
	}
	if got := extractErrorCode(t, payload); got != "unauthenticated" {
		t.Fatalf("expected error code unauthenticated, got %s", got)
	}
}
