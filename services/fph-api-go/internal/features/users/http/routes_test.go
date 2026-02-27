package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProtectedUserRoutesRequireAuth(t *testing.T) {
	router := Routes(&Handlers{})

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
