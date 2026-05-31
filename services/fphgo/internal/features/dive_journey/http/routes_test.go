package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	journeyservice "fphgo/internal/features/dive_journey/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

const (
	ownerID = "550e8400-e29b-41d4-a716-446655440100"
	entryID = "550e8400-e29b-41d4-a716-446655440102"
)

type serviceStub struct {
	createInput journeyservice.UpsertManualJourneyEntryInput
	updateInput journeyservice.UpsertManualJourneyEntryInput
	deleteUser  string
	deleteEntry string
}

func (s *serviceStub) ListProfileJourney(context.Context, journeyservice.ListProfileJourneyInput) ([]journeyservice.JourneyEntry, error) {
	now := time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)
	return []journeyservice.JourneyEntry{{
		ID:         entryID,
		UserID:     ownerID,
		Type:       "custom",
		Title:      "Line training",
		Visibility: "public",
		State:      "active",
		OccurredAt: now,
		CreatedAt:  now,
		UpdatedAt:  now,
	}}, nil
}

func (s *serviceStub) CreateManualEntry(_ context.Context, input journeyservice.UpsertManualJourneyEntryInput) (journeyservice.JourneyEntry, error) {
	s.createInput = input
	now := time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)
	return journeyservice.JourneyEntry{ID: entryID, UserID: input.ActorID, Type: "custom", Title: input.Title, Visibility: "public", State: "active", OccurredAt: now, CreatedAt: now, UpdatedAt: now}, nil
}

func (s *serviceStub) UpdateManualEntry(_ context.Context, input journeyservice.UpsertManualJourneyEntryInput) (journeyservice.JourneyEntry, error) {
	s.updateInput = input
	now := time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)
	return journeyservice.JourneyEntry{ID: input.EntryID, UserID: input.ActorID, Type: "custom", Title: input.Title, Visibility: "private", State: "active", OccurredAt: now, CreatedAt: now, UpdatedAt: now}, nil
}

func (s *serviceStub) DeleteManualEntry(_ context.Context, actorID, entryID string) error {
	s.deleteUser = actorID
	s.deleteEntry = entryID
	return nil
}

func TestPublicProfileJourneyRouteListsEntries(t *testing.T) {
	router := PublicRoutes(New(&serviceStub{}, validatex.New()))

	req := httptest.NewRequest(http.MethodGet, "/aiko/journey", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	items, ok := payload["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected one journey item, got %#v", payload["items"])
	}
}

func TestManualEntryRoutesRequireActorAndAllowNoDiveSite(t *testing.T) {
	stub := &serviceStub{}
	router := Routes(New(stub, validatex.New()))

	req := httptest.NewRequest(http.MethodPost, "/me/journey", strings.NewReader(`{"title":"First turtle","body":"Quiet morning"}`))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthenticated without identity, got %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/me/journey", strings.NewReader(`{"title":"First turtle","body":"Quiet morning"}`))
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: ownerID, Permissions: map[authz.Permission]bool{authz.PermissionProfilesWrite: true}}))
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected created, got %d body=%s", rec.Code, rec.Body.String())
	}
	if stub.createInput.DiveSiteID != "" {
		t.Fatalf("expected no dive site to be accepted, got %q", stub.createInput.DiveSiteID)
	}
}

func TestManualEntryUpdateAndDeleteUseActorScope(t *testing.T) {
	stub := &serviceStub{}
	router := Routes(New(stub, validatex.New()))

	req := httptest.NewRequest(http.MethodPatch, "/me/journey/"+entryID, strings.NewReader(`{"title":"Updated","visibility":"private"}`))
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: ownerID, Permissions: map[authz.Permission]bool{authz.PermissionProfilesWrite: true}}))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d", rec.Code)
	}
	if stub.updateInput.ActorID != ownerID || stub.updateInput.EntryID != entryID {
		t.Fatalf("expected owner scoped update, got actor=%q entry=%q", stub.updateInput.ActorID, stub.updateInput.EntryID)
	}

	req = httptest.NewRequest(http.MethodDelete, "/me/journey/"+entryID, nil)
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: ownerID, Permissions: map[authz.Permission]bool{authz.PermissionProfilesWrite: true}}))
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected delete 204, got %d", rec.Code)
	}
	if stub.deleteUser != ownerID || stub.deleteEntry != entryID {
		t.Fatalf("expected owner scoped delete, got actor=%q entry=%q", stub.deleteUser, stub.deleteEntry)
	}
}
