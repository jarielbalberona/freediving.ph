package http

import (
	"context"
	nethttp "net/http"
	"net/http/httptest"
	"testing"

	feedservice "fphgo/internal/features/feed/service"
)

type stubFeedService struct{}

func (stubFeedService) Home(context.Context, feedservice.HomeInput) (feedservice.HomeResult, error) {
	return feedservice.HomeResult{}, nil
}

func (stubFeedService) Activity(context.Context, feedservice.ActivityInput) (feedservice.ActivityResult, error) {
	return feedservice.ActivityResult{}, nil
}

func (stubFeedService) RecordImpressions(context.Context, string, string, feedservice.Mode, []feedservice.TelemetryImpression) error {
	return nil
}

func (stubFeedService) RecordActions(context.Context, string, string, feedservice.Mode, []feedservice.TelemetryAction) error {
	return nil
}

func TestFeedGetEndpointsSetNoStore(t *testing.T) {
	router := Routes(New(stubFeedService{}, nil))

	for _, path := range []string{"/home", "/activity"} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(nethttp.MethodGet, path, nil)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != nethttp.StatusOK {
				t.Fatalf("expected status 200, got %d", rec.Code)
			}
			if got := rec.Header().Get("Cache-Control"); got != "no-store" {
				t.Fatalf("expected Cache-Control no-store, got %q", got)
			}
		})
	}
}
