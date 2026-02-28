package app

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/config"
	authhttp "fphgo/internal/features/auth/http"
	blockshttp "fphgo/internal/features/blocks/http"
	buddieshttp "fphgo/internal/features/buddies/http"
	chikahttp "fphgo/internal/features/chika/http"
	explorehttp "fphgo/internal/features/explore/http"
	mediahttp "fphgo/internal/features/media/http"
	messaginghttp "fphgo/internal/features/messaging/http"
	moderationhttp "fphgo/internal/features/moderation_actions/http"
	profileshttp "fphgo/internal/features/profiles/http"
	reportshttp "fphgo/internal/features/reports/http"
	usershttp "fphgo/internal/features/users/http"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/validatex"
)

type routeSnapshotEntry struct {
	Method  string `json:"method"`
	Pattern string `json:"pattern"`
}

type routeSnapshot struct {
	Routes []routeSnapshotEntry `json:"routes"`
}

func TestRouteSurfaceSnapshot(t *testing.T) {
	router := buildFullSurfaceRouter()

	entries := collectRoutes(t, router)
	current := routeSnapshot{Routes: entries}
	snapshotPath := filepath.Join("testdata", "route_surface.snapshot.json")

	if os.Getenv("UPDATE_SNAPSHOTS") == "1" {
		if err := os.MkdirAll(filepath.Dir(snapshotPath), 0o755); err != nil {
			t.Fatalf("mkdir testdata: %v", err)
		}
		encoded, err := json.MarshalIndent(current, "", "  ")
		if err != nil {
			t.Fatalf("marshal snapshot: %v", err)
		}
		encoded = append(encoded, '\n')
		if err := os.WriteFile(snapshotPath, encoded, 0o644); err != nil {
			t.Fatalf("write snapshot: %v", err)
		}
		t.Skip("snapshot updated — run tests again without UPDATE_SNAPSHOTS=1")
	}

	raw, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot (run UPDATE_SNAPSHOTS=1 to create): %v", err)
	}
	var expected routeSnapshot
	if err := json.Unmarshal(raw, &expected); err != nil {
		t.Fatalf("decode snapshot: %v", err)
	}

	if len(expected.Routes) != len(current.Routes) {
		t.Fatalf("route count changed: snapshot has %d, current has %d\n"+
			"If this is intentional, run: UPDATE_SNAPSHOTS=1 go test ./internal/app/ -run TestRouteSurfaceSnapshot",
			len(expected.Routes), len(current.Routes))
	}
	for i := range expected.Routes {
		if expected.Routes[i] != current.Routes[i] {
			t.Fatalf("route snapshot mismatch at index %d:\n  expected: %s %s\n  got:      %s %s\n"+
				"If this is intentional, run: UPDATE_SNAPSHOTS=1 go test ./internal/app/ -run TestRouteSurfaceSnapshot",
				i, expected.Routes[i].Method, expected.Routes[i].Pattern,
				current.Routes[i].Method, current.Routes[i].Pattern)
		}
	}
}

func TestRouteSurfaceInvariantsFullSurface(t *testing.T) {
	router := buildFullSurfaceRouter()

	allowNonV1 := map[string]bool{
		"/healthz":             true,
		"/readyz":              true,
		"/profiles/{username}": true,
	}

	seen := map[string]struct{}{}
	if err := chi.Walk(router, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		key := method + " " + route
		if _, exists := seen[key]; exists {
			t.Errorf("duplicate route: %s", key)
		}
		seen[key] = struct{}{}

		if !allowNonV1[route] && !strings.HasPrefix(route, "/v1/") {
			t.Errorf("route missing /v1/ prefix: %s", key)
		}
		return nil
	}); err != nil {
		t.Fatalf("walk routes: %v", err)
	}

	if len(seen) < 30 {
		t.Fatalf("expected at least 30 registered routes (sanity check), got %d", len(seen))
	}
}

func collectRoutes(t *testing.T, router chi.Router) []routeSnapshotEntry {
	t.Helper()
	allowNonV1 := map[string]bool{
		"/healthz":             true,
		"/readyz":              true,
		"/profiles/{username}": true,
	}

	entries := make([]routeSnapshotEntry, 0, 64)
	seen := map[string]struct{}{}

	if err := chi.Walk(router, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		key := method + " " + route
		if _, exists := seen[key]; exists {
			t.Fatalf("duplicate route registered: %s", key)
		}
		seen[key] = struct{}{}
		if !allowNonV1[route] && !strings.HasPrefix(route, "/v1/") {
			t.Fatalf("route must be under /v1 or exempted: %s", key)
		}
		entries = append(entries, routeSnapshotEntry{Method: method, Pattern: route})
		return nil
	}); err != nil {
		t.Fatalf("walk routes: %v", err)
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Pattern == entries[j].Pattern {
			return entries[i].Method < entries[j].Method
		}
		return entries[i].Pattern < entries[j].Pattern
	})
	return entries
}

// buildFullSurfaceRouter constructs a router using real feature Routes()
// functions with nil-service handlers. chi.Walk enumerates all registered
// patterns without invoking handlers, so nil services are safe here.
func buildFullSurfaceRouter() chi.Router {
	deps := &Dependencies{
		AuthHandler:       authhttp.New(),
		UsersHandler:      usershttp.New(nil, nil),
		MessagingHandler:  messaginghttp.New(nil, nil, nil),
		ChikaHandler:      chikahttp.New(nil, nil),
		ExploreHandler:    explorehttp.New(nil, validatex.New()),
		ProfilesHandler:   profileshttp.New(nil, nil),
		BlocksHandler:     blockshttp.New(nil, nil),
		BuddiesHandler:    buddieshttp.New(nil, nil),
		ReportsHandler:    reportshttp.New(nil, nil),
		ModerationHandler: moderationhttp.New(nil, nil),
		MediaHandler:      mediahttp.New(nil, nil),
	}

	cfg := config.Config{CORSOrigins: []string{"*"}}
	return NewRouter(cfg, deps, testLogger(), middleware.Recover(testLogger()), WithAuthMiddleware(noopAuthMiddleware()))
}

func noopAuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return next
	}
}
