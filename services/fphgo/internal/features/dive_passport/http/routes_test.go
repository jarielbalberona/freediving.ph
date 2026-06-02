package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	passportservice "fphgo/internal/features/dive_passport/service"
	profilesservice "fphgo/internal/features/profiles/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

type serviceStub struct {
	passport       passportservice.Passport
	username       string
	viewerUserID   string
	settingsUserID string
}

func (s *serviceStub) GetProfilePassport(_ context.Context, username, viewerUserID string) (passportservice.Passport, error) {
	s.username = username
	s.viewerUserID = viewerUserID
	if s.passport.Profile.UserID != "" {
		return s.passport, nil
	}
	now := time.Date(2026, 5, 31, 9, 0, 0, 0, time.UTC)
	return passportservice.Passport{
		Profile: profilesservice.ProfileView{
			UserID:      "550e8400-e29b-41d4-a716-446655440300",
			Username:    "aiko",
			DisplayName: "Aiko",
			CreatedAt:   now,
		},
		MapPreview: passportservice.MapPreview{
			State: passportservice.SectionState{Status: "empty", Reason: "no_data"},
		},
		BadgeShowcase: passportservice.BadgeShowcase{
			State: passportservice.SectionState{Status: "empty", Reason: "no_data"},
		},
		JourneyHighlights: passportservice.JourneyHighlights{
			State: passportservice.SectionState{Status: "empty", Reason: "no_data"},
		},
		RecentMedia: passportservice.RecentMedia{
			State: passportservice.SectionState{Status: "empty", Reason: "no_data"},
		},
		Memories: passportservice.MemoryPreview{
			State: passportservice.SectionState{Status: "unavailable", Reason: "source_unavailable"},
		},
		Settings: passportservice.Settings{
			ShowMap:      true,
			ShowBadges:   true,
			ShowJourney:  true,
			ShowMemories: true,
		},
	}, nil
}

func (s *serviceStub) GetSettings(_ context.Context, userID string) (passportservice.Settings, error) {
	s.settingsUserID = userID
	return passportservice.Settings{
		ShowMap:      true,
		ShowBadges:   true,
		ShowJourney:  true,
		ShowMemories: true,
	}, nil
}

func (s *serviceStub) UpdateSettings(_ context.Context, input passportservice.UpdateSettingsInput) (passportservice.Settings, error) {
	return passportservice.Settings{
		ShowMap:          input.ShowMap,
		ShowBadges:       input.ShowBadges,
		ShowJourney:      input.ShowJourney,
		ShowMemories:     input.ShowMemories,
		FeaturedBadgeIDs: append([]string(nil), input.FeaturedBadgeIDs...),
	}, nil
}

func TestPublicPassportRouteReturnsAggregate(t *testing.T) {
	svc := &serviceStub{}
	router := PublicRoutes(New(svc, validatex.New()))

	req := httptest.NewRequest(http.MethodGet, "/aiko/passport", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload ProfilePassportResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Passport.Profile.Username != "aiko" {
		t.Fatalf("expected profile summary, got %#v", payload.Passport.Profile)
	}
	if payload.Passport.Memories.State.Status != "unavailable" {
		t.Fatalf("expected unavailable memories fallback, got %#v", payload.Passport.Memories)
	}
	if svc.username != "aiko" || svc.viewerUserID != "" {
		t.Fatalf("expected anonymous public aggregate read, got username=%q viewer=%q", svc.username, svc.viewerUserID)
	}
}

func TestPublicPassportRoutePassesViewerIdentityWhenPresent(t *testing.T) {
	svc := &serviceStub{}
	router := PublicRoutes(New(svc, validatex.New()))

	req := httptest.NewRequest(http.MethodGet, "/aiko/passport", nil)
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: "550e8400-e29b-41d4-a716-446655440301"}))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if svc.username != "aiko" || svc.viewerUserID != "550e8400-e29b-41d4-a716-446655440301" {
		t.Fatalf("expected viewer identity to reach service, got username=%q viewer=%q", svc.username, svc.viewerUserID)
	}
}

func TestPublicPassportRouteReturnsHiddenSectionsWhenSettingsDisableThem(t *testing.T) {
	now := time.Date(2026, 5, 31, 9, 0, 0, 0, time.UTC)
	svc := &serviceStub{
		passport: passportservice.Passport{
			Profile: profilesservice.ProfileView{
				UserID:      "550e8400-e29b-41d4-a716-446655440300",
				Username:    "aiko",
				DisplayName: "Aiko",
				CreatedAt:   now,
			},
			MapPreview: passportservice.MapPreview{
				State: passportservice.SectionState{Status: "hidden", Reason: "settings_hidden"},
			},
			BadgeShowcase: passportservice.BadgeShowcase{
				State: passportservice.SectionState{Status: "ready"},
				Badges: []profilesservice.UserBadge{{
					ID: "badge-1",
					Template: profilesservice.BadgeTemplate{
						Name:     "Featured Badge",
						Category: "experience",
					},
				}},
			},
			JourneyHighlights: passportservice.JourneyHighlights{
				State: passportservice.SectionState{Status: "hidden", Reason: "settings_hidden"},
			},
			RecentMedia: passportservice.RecentMedia{
				State: passportservice.SectionState{Status: "empty", Reason: "no_data"},
			},
			Memories: passportservice.MemoryPreview{
				State: passportservice.SectionState{Status: "hidden", Reason: "settings_hidden"},
			},
			Settings: passportservice.Settings{
				ShowMap:      false,
				ShowBadges:   true,
				ShowJourney:  false,
				ShowMemories: false,
			},
		},
	}
	router := PublicRoutes(New(svc, validatex.New()))

	req := httptest.NewRequest(http.MethodGet, "/aiko/passport", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload ProfilePassportResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Passport.MapPreview.State.Status != "hidden" || payload.Passport.MapPreview.State.Reason != "settings_hidden" {
		t.Fatalf("expected hidden map preview, got %#v", payload.Passport.MapPreview)
	}
	if payload.Passport.Memories.State.Status != "hidden" || payload.Passport.JourneyHighlights.State.Status != "hidden" {
		t.Fatalf("expected hidden story sections, got memories=%#v journey=%#v", payload.Passport.Memories, payload.Passport.JourneyHighlights)
	}
}

func TestPassportSettingsRoutesAreOwnerScoped(t *testing.T) {
	router := Routes(New(&serviceStub{}, validatex.New()))

	req := httptest.NewRequest(http.MethodGet, "/me/passport/settings", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthenticated settings read to be rejected, got %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPut, "/me/passport/settings", strings.NewReader(`{"showMap":true,"showBadges":false,"showJourney":true,"showMemories":false,"featuredBadgeIds":["550e8400-e29b-41d4-a716-446655440302"]}`))
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: "550e8400-e29b-41d4-a716-446655440300"}))
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected settings update 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload PassportSettingsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode settings response: %v", err)
	}
	if payload.Settings.ShowBadges || payload.Settings.ShowMemories {
		t.Fatalf("expected presentation toggles to update, got %#v", payload.Settings)
	}
	if len(payload.Settings.FeaturedBadgeIDs) != 1 {
		t.Fatalf("expected featured badge reference, got %#v", payload.Settings.FeaturedBadgeIDs)
	}
}
