package app

import (
	"context"
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
	router := NewRouter(
		config.Config{CORSOrigins: []string{"*"}},
		&Dependencies{ReadyCheck: func(_ context.Context) error { return nil }},
		testLogger(),
		middleware.Recover(testLogger()),
	)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
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
