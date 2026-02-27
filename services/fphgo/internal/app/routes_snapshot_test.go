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
)

type routeSnapshotEntry struct {
	Method  string `json:"method"`
	Pattern string `json:"pattern"`
}

type routeSnapshot struct {
	Routes []routeSnapshotEntry `json:"routes"`
}

func TestRouteSurfaceSnapshot(t *testing.T) {
	t.Helper()
	router := buildContractRouter()

	entries := make([]routeSnapshotEntry, 0, 32)
	seen := map[string]struct{}{}
	allowNonV1 := map[string]bool{
		"/healthz": true,
		"/readyz":  true,
	}

	if err := chi.Walk(router, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		key := method + " " + route
		if _, exists := seen[key]; exists {
			t.Fatalf("duplicate route registered: %s", key)
		}
		seen[key] = struct{}{}
		if !allowNonV1[route] && route != "/profiles/{username}" && !strings.HasPrefix(route, "/v1/") {
			t.Fatalf("route must be under /v1: %s", key)
		}
		entries = append(entries, routeSnapshotEntry{
			Method:  method,
			Pattern: route,
		})
		return nil
	}); err != nil {
		t.Fatalf("walk routes: %v", err)
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Method == entries[j].Method {
			return entries[i].Pattern < entries[j].Pattern
		}
		return entries[i].Method < entries[j].Method
	})

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
		t.Skip("snapshot updated")
	}

	raw, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot: %v", err)
	}
	var expected routeSnapshot
	if err := json.Unmarshal(raw, &expected); err != nil {
		t.Fatalf("decode snapshot: %v", err)
	}

	if len(expected.Routes) != len(current.Routes) {
		t.Fatalf("route snapshot mismatch: expected %d routes, got %d", len(expected.Routes), len(current.Routes))
	}
	for i := range expected.Routes {
		if expected.Routes[i] != current.Routes[i] {
			t.Fatalf("route snapshot mismatch at index %d: expected %+v, got %+v", i, expected.Routes[i], current.Routes[i])
		}
	}
}
