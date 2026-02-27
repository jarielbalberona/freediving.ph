package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fphgo/internal/shared/validatex"
)

func TestProtectedUserRoutesRequireAuth(t *testing.T) {
	v := validatex.New()
	router := Routes(&Handlers{validator: v})

	tests := []struct {
		name string
		path string
	}{
		{name: "me", path: "/me"},
		{name: "by id", path: "/123"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected status 401, got %d", rec.Code)
			}
		})
	}
}

func TestCreateUser_MissingRequired(t *testing.T) {
	v := validatex.New()
	h := &Handlers{validator: v}
	router := Routes(h)

	body := `{"bio":"hello"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
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
	codes := map[string]bool{}
	for _, raw := range issues {
		issue := raw.(map[string]any)
		path := issue["path"].([]any)
		if len(path) == 1 {
			codes[path[0].(string)] = true
		}
	}
	if !codes["username"] {
		t.Fatal("expected a validation issue for 'username'")
	}
	if !codes["displayName"] {
		t.Fatal("expected a validation issue for 'displayName'")
	}
}

func TestCreateUser_UnknownField(t *testing.T) {
	v := validatex.New()
	h := &Handlers{validator: v}
	router := Routes(h)

	body := `{"username":"jd","displayName":"Jane","extra":true}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
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
	errObj := resp["error"].(map[string]any)
	if errObj["code"] != "validation_error" {
		t.Fatalf("expected code 'validation_error', got %v", errObj["code"])
	}
	issues := errObj["issues"].([]any)
	if len(issues) == 0 {
		t.Fatal("expected at least one issue")
	}
	firstIssue := issues[0].(map[string]any)
	if firstIssue["code"] != "unrecognized_key" {
		t.Fatalf("expected issue code 'unrecognized_key', got %v", firstIssue["code"])
	}
}
