package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/config"
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
		"/v1/auth/session",
		"/v1/messages/inbox",
		"/v1/chika/threads",
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

	t.Run("GET /v1/messages/inbox", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/messages/inbox", nil)
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
			t.Fatal("expected at least one inbox item")
		}
		first, ok := items[0].(map[string]any)
		if !ok {
			t.Fatal("expected inbox item object")
		}
		assertStringField(t, first, "conversationId")
		assertNumberField(t, first, "messageId")
		assertStringField(t, first, "senderId")
		assertStringField(t, first, "content")
		assertStringField(t, first, "status")
		assertStringField(t, first, "createdAt")
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
		assertStringField(t, first, "createdByUserId")
		assertStringField(t, first, "createdAt")
		assertStringField(t, first, "updatedAt")

		pagination, ok := payload["pagination"].(map[string]any)
		if !ok {
			t.Fatal("expected pagination object")
		}
		assertNumberField(t, pagination, "limit")
		assertNumberField(t, pagination, "offset")
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
	messagesRoutes.Get("/inbox", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{"items": []map[string]any{{
			"conversationId": "550e8400-e29b-41d4-a716-446655440001",
			"messageId":      1001,
			"senderId":       "550e8400-e29b-41d4-a716-446655440002",
			"content":        "hello",
			"status":         "active",
			"createdAt":      "2026-02-27T00:00:00Z",
		}}})
	})

	chikaRoutes := chi.NewRouter()
	chikaRoutes.Get("/threads", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"items": []map[string]any{{
				"id":              "550e8400-e29b-41d4-a716-446655440010",
				"title":           "Contract thread",
				"mode":            "normal",
				"createdByUserId": "550e8400-e29b-41d4-a716-446655440011",
				"createdAt":       "2026-02-27T00:00:00Z",
				"updatedAt":       "2026-02-27T00:00:00Z",
			}},
			"pagination": map[string]any{"limit": 20, "offset": 0},
		})
	})
	chikaRoutes.Post("/threads", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"title"},
			Code:    "required",
			Message: "title is required",
		}})
	})

	deps := &Dependencies{
		AuthRoutes:      authRoutes,
		MessagingRoutes: messagesRoutes,
		ChikaRoutes:     chikaRoutes,
		ReadyCheck:      func(_ context.Context) error { return nil },
	}

	cfg := config.Config{CORSOrigins: []string{"*"}}
	return NewRouter(cfg, deps, testLogger(), middleware.Recover(testLogger()), WithAuthMiddleware(contractAuthMiddleware()))
}

func contractAuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("Authorization") != "Bearer contract-ok" {
				next.ServeHTTP(w, r)
				return
			}

			identity := authz.Identity{
				UserID:        "550e8400-e29b-41d4-a716-446655440000",
				ClerkUserID:   "user_contract",
				GlobalRole:    "member",
				AccountStatus: "active",
				Permissions: map[authz.Permission]bool{
					authz.PermissionMessagingRead:  true,
					authz.PermissionMessagingWrite: true,
					authz.PermissionChikaRead:      true,
					authz.PermissionChikaWrite:     true,
				},
			}
			ctx := middleware.WithIdentity(r.Context(), identity)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
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
