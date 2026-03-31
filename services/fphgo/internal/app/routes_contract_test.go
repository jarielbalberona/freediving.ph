package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/config"
	authhttp "fphgo/internal/features/auth/http"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

func TestV1RoutePrefixIsRequired(t *testing.T) {
	router := buildContractRouter()

	req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
	req.Header.Set("Authorization", "Bearer contract-ok")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 without /v1 prefix, got %d", rec.Code)
	}
}

func TestV1CoreEndpointsRequireAuth(t *testing.T) {
	router := buildContractRouter()

	paths := []string{
		"/v1/me",
		"/v1/auth/session",
		"/v1/messages/threads?category=primary",
		"/v1/me/profile",
		"/v1/users/search?q=test",
		"/v1/blocks",
		"/v1/buddies",
		"/v1/reports",
		"/v1/notifications",
	}

	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401 for %s, got %d", path, rec.Code)
			}

			var payload map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
				t.Fatalf("expected JSON error response for %s: %v", path, err)
			}
			errorMap, ok := payload["error"].(map[string]any)
			if !ok {
				t.Fatalf("expected error object for %s", path)
			}
			if errorMap["code"] != "unauthenticated" {
				t.Fatalf("expected unauthenticated code for %s, got %v", path, errorMap["code"])
			}
		})
	}
}

func TestV1CoreEndpointContracts(t *testing.T) {
	router := buildContractRouter()

	t.Run("GET /v1/chika/threads public", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/chika/threads", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("GET /v1/auth/session", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/auth/session", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}

		assertStringField(t, payload, "userId")
		assertStringField(t, payload, "clerkSubject")
		assertStringField(t, payload, "globalRole")
		assertStringField(t, payload, "accountStatus")
		assertArrayField(t, payload, "permissions")
		scopes, ok := payload["scopes"].(map[string]any)
		if !ok {
			t.Fatal("expected scopes object")
		}
		if _, ok := scopes["group"]; !ok {
			t.Fatal("expected scopes.group")
		}
		if _, ok := scopes["event"]; !ok {
			t.Fatal("expected scopes.event")
		}
	})

	t.Run("GET /v1/me", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		assertStringField(t, payload, "userId")
		assertStringField(t, payload, "clerkSubject")
		assertStringField(t, payload, "globalRole")
		assertStringField(t, payload, "accountStatus")
		assertArrayField(t, payload, "permissions")
		if got := rec.Header().Get("Deprecation"); got != "true" {
			t.Fatalf("expected legacy /v1/me deprecation header, got %q", got)
		}
		if got := rec.Header().Get("Link"); got != `</v1/auth/session>; rel="successor-version"` {
			t.Fatalf("expected canonical session link header, got %q", got)
		}
	})

	t.Run("GET /v1/messages/threads", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/messages/threads?category=primary", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		items, ok := payload["items"].([]any)
		if !ok {
			t.Fatal("expected items array")
		}
		if len(items) == 0 {
			t.Fatal("expected at least one thread")
		}
		first, ok := items[0].(map[string]any)
		if !ok {
			t.Fatal("expected thread summary object")
		}
		assertStringField(t, first, "id")
		assertStringField(t, first, "type")
		assertStringField(t, first, "category")
		assertStringField(t, first, "lastMessageAt")
		if _, ok := first["participant"].(map[string]any); !ok {
			t.Fatal("expected participant object")
		}
		if _, ok := first["lastMessage"].(map[string]any); !ok {
			t.Fatal("expected lastMessage object")
		}
	})

	t.Run("GET /v1/chika/threads", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/chika/threads", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		items, ok := payload["items"].([]any)
		if !ok {
			t.Fatal("expected items array")
		}
		if len(items) == 0 {
			t.Fatal("expected at least one thread")
		}
		first, ok := items[0].(map[string]any)
		if !ok {
			t.Fatal("expected thread object")
		}
		assertStringField(t, first, "id")
		assertStringField(t, first, "title")
		assertStringField(t, first, "mode")
		assertStringField(t, first, "categoryId")
		assertStringField(t, first, "authorDisplayName")
		assertStringField(t, first, "createdAt")
		assertStringField(t, first, "updatedAt")
		assertBoolField(t, first, "isHidden")

		pagination, ok := payload["pagination"].(map[string]any)
		if !ok {
			t.Fatal("expected pagination object")
		}
		assertNumberField(t, pagination, "limit")
		assertNumberField(t, pagination, "offset")
	})

	t.Run("GET /v1/me/profile", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/me/profile", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		profile, ok := payload["profile"].(map[string]any)
		if !ok {
			t.Fatal("expected profile object")
		}
		assertStringField(t, profile, "userId")
		assertStringField(t, profile, "username")
		assertStringField(t, profile, "displayName")
	})

	t.Run("GET /v1/blocks", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/blocks", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		items, ok := payload["items"].([]any)
		if !ok {
			t.Fatal("expected items array")
		}
		if len(items) == 0 {
			t.Fatal("expected at least one block item")
		}
		first, ok := items[0].(map[string]any)
		if !ok {
			t.Fatal("expected block item object")
		}
		assertStringField(t, first, "blockedUserId")
		assertStringField(t, first, "username")
		assertStringField(t, first, "displayName")
		assertStringField(t, first, "createdAt")
	})

	t.Run("GET /v1/buddies", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/buddies", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		if _, ok := payload["items"].([]any); !ok {
			t.Fatal("expected items array")
		}
	})

	t.Run("GET /v1/reports", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/reports", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		items, ok := payload["items"].([]any)
		if !ok {
			t.Fatal("expected items array")
		}
		if len(items) == 0 {
			t.Fatal("expected at least one report item")
		}
		first, ok := items[0].(map[string]any)
		if !ok {
			t.Fatal("expected report item object")
		}
		assertStringField(t, first, "id")
		assertStringField(t, first, "reporterUserId")
		assertStringField(t, first, "targetType")
		assertStringField(t, first, "targetId")
		assertStringField(t, first, "reasonCode")
		assertStringField(t, first, "status")
		assertStringField(t, first, "createdAt")
		assertStringField(t, first, "updatedAt")
	})

	t.Run("GET /v1/notifications", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/notifications", nil)
		req.Header.Set("Authorization", "Bearer contract-ok")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to decode payload: %v", err)
		}
		if _, ok := payload["items"].([]any); !ok {
			t.Fatal("expected items array")
		}
	})
}

func TestValidationErrorContractIncludesIssues(t *testing.T) {
	router := buildContractRouter()

	req := httptest.NewRequest(http.MethodPost, "/v1/chika/threads", nil)
	req.Header.Set("Authorization", "Bearer contract-ok")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}
	errorMap, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatal("expected error object")
	}
	if errorMap["code"] != "validation_error" {
		t.Fatalf("expected validation_error, got %v", errorMap["code"])
	}
	issues, ok := errorMap["issues"].([]any)
	if !ok || len(issues) == 0 {
		t.Fatal("expected non-empty issues")
	}
}

func TestAuthStateGuardsOnProtectedAndWriteRoutes(t *testing.T) {
	router := buildContractRouter()

	t.Run("signed out is 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/reports", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
		assertErrorCode(t, rec.Body.Bytes(), "unauthenticated")
	})

	t.Run("missing permission is 403", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/messages/threads?category=primary", nil)
		req.Header.Set("Authorization", "Bearer contract-no-messaging-read")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}
		assertErrorCode(t, rec.Body.Bytes(), "forbidden")
	})

	t.Run("read_only cannot write", func(t *testing.T) {
		body := strings.NewReader(`{"title":"blocked write","mode":"normal"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/chika/threads", body)
		req.Header.Set("Authorization", "Bearer contract-read-only")
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}
		assertErrorCode(t, rec.Body.Bytes(), "forbidden")
	})

	t.Run("suspended cannot write", func(t *testing.T) {
		body := strings.NewReader(`{"targetUserId":"550e8400-e29b-41d4-a716-446655440003"}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/messages/threads/direct", body)
		req.Header.Set("Authorization", "Bearer contract-suspended")
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}
		assertErrorCode(t, rec.Body.Bytes(), "forbidden")
	})
}

func buildContractRouter() chi.Router {
	authRoutes := chi.NewRouter()
	authRoutes.Get("/session", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"userId":        "550e8400-e29b-41d4-a716-446655440000",
			"clerkSubject":  "user_contract",
			"globalRole":    "member",
			"accountStatus": "active",
			"permissions": []string{
				string(authz.PermissionMessagingRead),
				string(authz.PermissionMessagingWrite),
				string(authz.PermissionChikaRead),
				string(authz.PermissionChikaWrite),
			},
			"scopes": map[string]any{
				"group": nil,
				"event": nil,
			},
		})
	})

	messagesRoutes := chi.NewRouter()
	messagesRoutes.Get("/threads", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{"items": []map[string]any{{
			"id":            "550e8400-e29b-41d4-a716-446655440001",
			"type":          "direct",
			"category":      "primary",
			"lastMessageAt": "2026-02-27T00:00:00Z",
			"participant": map[string]any{
				"id":          "550e8400-e29b-41d4-a716-446655440002",
				"username":    "member2",
				"displayName": "Member Two",
				"avatarUrl":   "",
			},
			"lastMessage": map[string]any{
				"id":           "1001",
				"threadId":     "550e8400-e29b-41d4-a716-446655440001",
				"senderUserId": "550e8400-e29b-41d4-a716-446655440002",
				"kind":         "text",
				"body":         "hello",
				"createdAt":    "2026-02-27T00:00:00Z",
				"isOwn":        false,
			},
		}}})
	})
	messagesRoutes.Post("/threads/direct", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"id":       "550e8400-e29b-41d4-a716-446655440001",
			"type":     "direct",
			"category": "primary",
			"participants": []map[string]any{
				{"id": "550e8400-e29b-41d4-a716-446655440000", "username": "member1", "displayName": "Member One", "avatarUrl": ""},
				{"id": "550e8400-e29b-41d4-a716-446655440002", "username": "member2", "displayName": "Member Two", "avatarUrl": ""},
			},
			"createdAt": "2026-02-27T00:00:00Z",
			"canSend":   true,
		})
	})

	chikaRoutes := chi.NewRouter()
	chikaRoutes.Get("/threads", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"items": []map[string]any{{
				"id":                   "550e8400-e29b-41d4-a716-446655440010",
				"title":                "Contract thread",
				"mode":                 "normal",
				"categoryId":           "550e8400-e29b-41d4-a716-446655440020",
				"categorySlug":         "general",
				"categoryName":         "General",
				"categoryPseudonymous": false,
				"authorDisplayName":    "member1",
				"isHidden":             false,
				"createdAt":            "2026-02-27T00:00:00Z",
				"updatedAt":            "2026-02-27T00:00:00Z",
			}},
			"pagination": map[string]any{"limit": 20, "offset": 0},
		})
	})
	chikaRoutes.Group(func(write chi.Router) {
		write.Use(middleware.RequireMember)
		write.Use(middleware.RequirePermission(authz.PermissionChikaWrite))
		write.Post("/threads", func(w http.ResponseWriter, r *http.Request) {
			httpx.WriteValidationError(w, []validatex.Issue{{
				Path:    []any{"title"},
				Code:    "required",
				Message: "title is required",
			}})
		})
	})

	profilesRoutes := chi.NewRouter()
	profilesRoutes.Get("/me/profile", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"profile": map[string]any{
				"userId":      "550e8400-e29b-41d4-a716-446655440000",
				"username":    "member",
				"displayName": "Member User",
				"bio":         "Bio",
				"avatarUrl":   "",
				"location":    "Metro Manila",
				"socials":     map[string]string{},
			},
		})
	})
	profilesRoutes.Get("/users/search", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"items": []map[string]any{{
				"userId":      "550e8400-e29b-41d4-a716-446655440050",
				"username":    "diver1",
				"displayName": "Diver One",
				"bio":         "",
				"avatarUrl":   "",
				"location":    "Cebu",
				"socials":     map[string]string{},
			}},
		})
	})

	blocksRoutes := chi.NewRouter()
	blocksRoutes.Get("/", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"items": []map[string]any{{
				"blockedUserId": "550e8400-e29b-41d4-a716-446655440051",
				"username":      "blocked1",
				"displayName":   "Blocked User",
				"avatarUrl":     "",
				"createdAt":     "2026-02-27T00:00:00Z",
			}},
		})
	})

	buddiesRoutes := chi.NewRouter()
	buddiesRoutes.Get("/", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"items": []map[string]any{{
				"userId":      "550e8400-e29b-41d4-a716-446655440052",
				"username":    "buddy1",
				"displayName": "Buddy User",
				"avatarUrl":   "",
			}},
		})
	})

	reportsRoutes := chi.NewRouter()
	reportsRoutes.Get("/", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"items": []map[string]any{{
				"id":             "550e8400-e29b-41d4-a716-446655440070",
				"reporterUserId": "550e8400-e29b-41d4-a716-446655440000",
				"targetType":     "user",
				"targetId":       "550e8400-e29b-41d4-a716-446655440051",
				"reasonCode":     "spam",
				"status":         "open",
				"createdAt":      "2026-02-27T00:00:00Z",
				"updatedAt":      "2026-02-27T00:00:00Z",
			}},
		})
	})

	notificationsRoutes := chi.NewRouter()
	notificationsRoutes.Get("/", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"items": []map[string]any{{
				"id":        1,
				"userId":    "550e8400-e29b-41d4-a716-446655440000",
				"type":      "SYSTEM",
				"title":     "Welcome",
				"message":   "Contract notification",
				"status":    "UNREAD",
				"priority":  "NORMAL",
				"createdAt": "2026-02-27T00:00:00Z",
				"updatedAt": "2026-02-27T00:00:00Z",
			}},
			"pagination": map[string]any{"limit": 20, "offset": 0},
		})
	})

	deps := &Dependencies{
		AuthHandler:         authhttp.New(),
		AuthRoutes:          authRoutes,
		MessagingRoutes:     messagesRoutes,
		ChikaRoutes:         chikaRoutes,
		ProfilesRoutes:      profilesRoutes,
		BlocksRoutes:        blocksRoutes,
		BuddiesRoutes:       buddiesRoutes,
		ReportsRoutes:       reportsRoutes,
		NotificationsRoutes: notificationsRoutes,
		ReadyCheck:          func(_ context.Context) error { return nil },
	}

	cfg := config.Config{CORSOrigins: []string{"*"}}
	return NewRouter(cfg, deps, testLogger(), middleware.Recover(testLogger()), WithAuthMiddleware(contractAuthMiddleware()))
}

func contractAuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				next.ServeHTTP(w, r)
				return
			}

			identity, ok := contractIdentity(authHeader)
			if !ok {
				next.ServeHTTP(w, r)
				return
			}

			ctx := middleware.WithIdentity(r.Context(), identity)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func contractIdentity(authHeader string) (authz.Identity, bool) {
	base := authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		ClerkUserID:   "user_contract",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   authz.RolePermissions("moderator"),
	}

	switch authHeader {
	case "Bearer contract-ok":
		return base, true
	case "Bearer contract-no-messaging-read":
		delete(base.Permissions, authz.PermissionMessagingRead)
		return base, true
	case "Bearer contract-read-only":
		base.AccountStatus = "read_only"
		return base, true
	case "Bearer contract-suspended":
		base.AccountStatus = "suspended"
		return base, true
	default:
		return authz.Identity{}, false
	}
}

func assertErrorCode(t *testing.T, body []byte, want string) {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("expected JSON error payload: %v", err)
	}
	errorMap, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatal("expected error object")
	}
	if got := errorMap["code"]; got != want {
		t.Fatalf("expected error code %s, got %v", want, got)
	}
}

func assertStringField(t *testing.T, payload map[string]any, key string) {
	t.Helper()
	value, ok := payload[key].(string)
	if !ok || value == "" {
		t.Fatalf("expected non-empty string field %s", key)
	}
}

func assertArrayField(t *testing.T, payload map[string]any, key string) {
	t.Helper()
	if _, ok := payload[key].([]any); !ok {
		t.Fatalf("expected array field %s", key)
	}
}

func assertNumberField(t *testing.T, payload map[string]any, key string) {
	t.Helper()
	if _, ok := payload[key].(float64); !ok {
		t.Fatalf("expected number field %s", key)
	}
}

func assertBoolField(t *testing.T, payload map[string]any, key string) {
	t.Helper()
	if _, ok := payload[key].(bool); !ok {
		t.Fatalf("expected bool field %s", key)
	}
}
