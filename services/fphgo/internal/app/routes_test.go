package app

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"fphgo/internal/config"
	"fphgo/internal/middleware"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestHealthz(t *testing.T) {
	router := NewRouterWithBuildInfo(
		config.Config{CORSOrigins: []string{"*"}},
		&Dependencies{ReadyCheck: func(_ context.Context) error { return nil }},
		testLogger(),
		middleware.Recover(testLogger()),
		BuildInfo{Version: "v1.2.3", Commit: "abc123", BuildTime: "2026-02-27T10:00:00Z"},
	)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var payload map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid JSON payload, got %v", err)
	}
	if payload["version"] != "v1.2.3" {
		t.Fatalf("expected version in healthz payload, got %q", payload["version"])
	}
	if payload["commit"] != "abc123" {
		t.Fatalf("expected commit in healthz payload, got %q", payload["commit"])
	}
}

func TestReadyz(t *testing.T) {
	tests := []struct {
		name       string
		readyCheck func(context.Context) error
		wantStatus int
	}{
		{
			name: "ready",
			readyCheck: func(_ context.Context) error {
				return nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "not ready",
			readyCheck: func(_ context.Context) error {
				return errors.New("db is down")
			},
			wantStatus: http.StatusServiceUnavailable,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			router := NewRouter(
				config.Config{CORSOrigins: []string{"*"}},
				&Dependencies{
					ReadyCheck: func(ctx context.Context) error {
						return tc.readyCheck(ctx)
					},
				},
				testLogger(),
				middleware.Recover(testLogger()),
			)

			req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("expected status %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}
