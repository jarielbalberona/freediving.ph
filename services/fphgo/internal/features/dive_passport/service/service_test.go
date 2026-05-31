package service

import (
	"context"
	"errors"
	"testing"
	"time"

	journeyservice "fphgo/internal/features/dive_journey/service"
	memoriesservice "fphgo/internal/features/dive_memories/service"
	passportrepo "fphgo/internal/features/dive_passport/repo"
	profilesservice "fphgo/internal/features/profiles/service"
)

const (
	userID   = "550e8400-e29b-41d4-a716-446655440300"
	viewerID = "550e8400-e29b-41d4-a716-446655440301"
)

type profileStub struct {
	profile              profilesservice.ProfileView
	mapPreview           profilesservice.ProfileDiveMap
	badges               profilesservice.ProfileBadges
	mapErr               error
	badgeErr             error
	viewUsername         string
	viewViewerUserID     string
	mapUsername          string
	mapViewerUserID      string
	badgeUsername        string
	profileViewCallCount int
	mapCallCount         int
	badgeCallCount       int
}

func (s *profileStub) GetProfileViewByUsername(_ context.Context, username, viewerUserID string) (profilesservice.ProfileView, error) {
	s.viewUsername = username
	s.viewViewerUserID = viewerUserID
	s.profileViewCallCount++
	if s.profile.UserID != "" {
		return s.profile, nil
	}
	return profilesservice.ProfileView{
		UserID:      userID,
		Username:    "aiko",
		DisplayName: "Aiko",
		CreatedAt:   time.Date(2026, 5, 31, 8, 0, 0, 0, time.UTC),
		Counts: profilesservice.ProfileViewCounts{
			MediaPosts: 3,
			Followers:  4,
			Following:  5,
		},
	}, nil
}

func (s *profileStub) GetProfileDiveMapByUsername(_ context.Context, username, viewerUserID string) (profilesservice.ProfileDiveMap, error) {
	s.mapUsername = username
	s.mapViewerUserID = viewerUserID
	s.mapCallCount++
	return s.mapPreview, s.mapErr
}

func (s *profileStub) GetProfileBadgesByUsername(_ context.Context, username string) (profilesservice.ProfileBadges, error) {
	s.badgeUsername = username
	s.badgeCallCount++
	return s.badges, s.badgeErr
}

type journeyStub struct {
	entries []journeyservice.JourneyEntry
	err     error
	input   journeyservice.ListProfileJourneyInput
	calls   int
}

func (s *journeyStub) ListProfileJourney(_ context.Context, input journeyservice.ListProfileJourneyInput) ([]journeyservice.JourneyEntry, error) {
	s.input = input
	s.calls++
	return s.entries, s.err
}

type memoryStub struct {
	items []memoriesservice.Memory
	err   error
	input memoriesservice.ListProfileMemoriesInput
	calls int
}

func (s *memoryStub) ListProfileMemories(_ context.Context, input memoriesservice.ListProfileMemoriesInput) ([]memoriesservice.Memory, error) {
	s.input = input
	s.calls++
	return s.items, s.err
}

type settingsStub struct {
	input passportrepo.UpsertSettingsInput
}

func (s *settingsStub) GetSettings(context.Context, string) (passportrepo.Settings, error) {
	return passportrepo.Settings{
		ShowMap:      false,
		ShowBadges:   true,
		ShowJourney:  true,
		ShowMemories: false,
	}, nil
}

func (s *settingsStub) UpsertSettings(_ context.Context, input passportrepo.UpsertSettingsInput) (passportrepo.Settings, error) {
	s.input = input
	return passportrepo.Settings{
		UserID:           input.UserID,
		ShowMap:          input.ShowMap,
		ShowBadges:       input.ShowBadges,
		ShowJourney:      input.ShowJourney,
		ShowMemories:     input.ShowMemories,
		FeaturedBadgeIDs: append([]string(nil), input.FeaturedBadgeIDs...),
	}, nil
}

func TestProfilePassportComposesReadOnlyVisibleSections(t *testing.T) {
	now := time.Date(2026, 5, 31, 9, 0, 0, 0, time.UTC)
	svc := New(&profileStub{
		mapPreview: profilesservice.ProfileDiveMap{
			VisitedSiteCount: 1,
			Markers: []profilesservice.ProfileDiveMapMarker{{
				DiveSiteID:       "site-1",
				DiveSiteName:     "Dive Site",
				FirstVisitedAt:   now,
				LastVisitedAt:    now,
				MediaPostCount:   2,
				LastProofAddedAt: now,
			}},
		},
		badges: profilesservice.ProfileBadges{
			Badges: []profilesservice.UserBadge{{
				ID:                 "badge-1",
				Template:           profilesservice.BadgeTemplate{Name: "Depth", Category: "personal_best"},
				VerificationStatus: "unverified",
				Visibility:         "public",
			}},
		},
	}, &journeyStub{entries: []journeyservice.JourneyEntry{{
		ID:         "journey-1",
		Type:       "custom",
		Title:      "First story",
		Visibility: "public",
		OccurredAt: now,
	}}}, WithMemoryReader(&memoryStub{items: []memoriesservice.Memory{{
		ID:         "memory-1",
		Title:      "After the dive",
		Visibility: "public",
		OccurredAt: now,
	}}}))

	passport, err := svc.GetProfilePassport(context.Background(), "aiko", viewerID)
	if err != nil {
		t.Fatalf("get passport: %v", err)
	}
	if passport.Stats.VisitedSiteCount != 1 || passport.Stats.BadgeCount != 1 || passport.Stats.JourneyEntryCount != 1 || passport.Stats.MediaPostCount != 3 || passport.Stats.MemoryCount != 1 {
		t.Fatalf("unexpected stats: %#v", passport.Stats)
	}
	if passport.MapPreview.State.Status != "ready" || passport.BadgeShowcase.State.Status != "ready" || passport.JourneyHighlights.State.Status != "ready" {
		t.Fatalf("expected ready child sections, got map=%#v badges=%#v journey=%#v", passport.MapPreview.State, passport.BadgeShowcase.State, passport.JourneyHighlights.State)
	}
	if passport.Memories.State.Status != "ready" || len(passport.Memories.Items) != 1 {
		t.Fatalf("expected memory preview from Dive Memories read model, got %#v", passport.Memories)
	}
}

func TestProfilePassportFallsBackForUnavailableChildren(t *testing.T) {
	svc := New(&profileStub{
		mapErr:   errors.New("map down"),
		badgeErr: errors.New("badges down"),
	}, &journeyStub{err: errors.New("journey down")})

	passport, err := svc.GetProfilePassport(context.Background(), "aiko", "")
	if err != nil {
		t.Fatalf("get passport with child fallbacks: %v", err)
	}
	if passport.MapPreview.State.Status != "unavailable" || passport.BadgeShowcase.State.Status != "unavailable" || passport.JourneyHighlights.State.Status != "unavailable" {
		t.Fatalf("expected unavailable child states, got map=%#v badges=%#v journey=%#v", passport.MapPreview.State, passport.BadgeShowcase.State, passport.JourneyHighlights.State)
	}
	if passport.Stats.VisitedSiteCount != 0 || passport.Stats.BadgeCount != 0 || passport.Stats.JourneyEntryCount != 0 {
		t.Fatalf("fallback stats must stay zero, got %#v", passport.Stats)
	}
}

func TestProfilePassportEmptyNewUserDoesNotInventSourceData(t *testing.T) {
	profiles := &profileStub{
		profile: profilesservice.ProfileView{
			UserID:      userID,
			Username:    "newdiver",
			DisplayName: "New Diver",
			CreatedAt:   time.Date(2026, 5, 31, 10, 0, 0, 0, time.UTC),
		},
	}
	journey := &journeyStub{}
	svc := New(profiles, journey)

	passport, err := svc.GetProfilePassport(context.Background(), "newdiver", viewerID)
	if err != nil {
		t.Fatalf("get new user passport: %v", err)
	}
	if passport.MapPreview.State.Status != "empty" || len(passport.MapPreview.Markers) != 0 || passport.Stats.VisitedSiteCount != 0 {
		t.Fatalf("expected empty map without fake visited sites, got map=%#v stats=%#v", passport.MapPreview, passport.Stats)
	}
	if passport.BadgeShowcase.State.Status != "empty" || len(passport.BadgeShowcase.Badges) != 0 || passport.Stats.BadgeCount != 0 {
		t.Fatalf("expected empty badges without fake achievements, got badges=%#v stats=%#v", passport.BadgeShowcase, passport.Stats)
	}
	if passport.JourneyHighlights.State.Status != "empty" || len(passport.JourneyHighlights.Entries) != 0 || passport.Stats.JourneyEntryCount != 0 {
		t.Fatalf("expected empty journey without fake stories, got journey=%#v stats=%#v", passport.JourneyHighlights, passport.Stats)
	}
	if passport.RecentMedia.State.Status != "empty" || len(passport.RecentMedia.Items) != 0 || passport.Stats.MediaPostCount != 0 {
		t.Fatalf("expected empty media without fake items, got media=%#v stats=%#v", passport.RecentMedia, passport.Stats)
	}
	if passport.Memories.State.Status != "unavailable" || passport.Stats.MemoryCount != 0 {
		t.Fatalf("expected unavailable memories without fake counts, got memories=%#v stats=%#v", passport.Memories, passport.Stats)
	}
}

func TestProfilePassportForwardsViewerIdentityToVisibilityAwareSources(t *testing.T) {
	profiles := &profileStub{}
	journey := &journeyStub{}
	memories := &memoryStub{}
	svc := New(profiles, journey, WithMemoryReader(memories))

	if _, err := svc.GetProfilePassport(context.Background(), "aiko", viewerID); err != nil {
		t.Fatalf("get passport: %v", err)
	}
	if profiles.viewUsername != "aiko" || profiles.viewViewerUserID != viewerID {
		t.Fatalf("profile view must receive viewer identity, got username=%q viewer=%q", profiles.viewUsername, profiles.viewViewerUserID)
	}
	if profiles.mapUsername != "aiko" || profiles.mapViewerUserID != viewerID {
		t.Fatalf("dive map must receive viewer identity, got username=%q viewer=%q", profiles.mapUsername, profiles.mapViewerUserID)
	}
	if journey.input.Username != "aiko" || journey.input.ViewerUserID != viewerID || journey.input.Limit != 5 {
		t.Fatalf("journey must receive visibility input, got %#v", journey.input)
	}
	if memories.input.Username != "aiko" || memories.input.ViewerUserID != viewerID || memories.input.Limit != 5 {
		t.Fatalf("memories must receive visibility input, got %#v", memories.input)
	}
	if profiles.profileViewCallCount != 1 || profiles.mapCallCount != 1 || profiles.badgeCallCount != 1 || journey.calls != 1 || memories.calls != 1 {
		t.Fatalf("expected read-only single source reads, profile=%d map=%d badges=%d journey=%d memories=%d", profiles.profileViewCallCount, profiles.mapCallCount, profiles.badgeCallCount, journey.calls, memories.calls)
	}
}

func TestProfilePassportIntegratesMapBadgesAndJourneyAsReadOnlyChildren(t *testing.T) {
	now := time.Date(2026, 5, 31, 11, 0, 0, 0, time.UTC)
	profiles := &profileStub{
		mapPreview: profilesservice.ProfileDiveMap{
			VisitedSiteCount: 6,
			Markers: []profilesservice.ProfileDiveMapMarker{
				{DiveSiteID: "site-1", DiveSiteName: "Site 1", MediaPostCount: 1, LastProofAddedAt: now},
				{DiveSiteID: "site-2", DiveSiteName: "Site 2", MediaPostCount: 1, LastProofAddedAt: now},
				{DiveSiteID: "site-3", DiveSiteName: "Site 3", MediaPostCount: 1, LastProofAddedAt: now},
				{DiveSiteID: "site-4", DiveSiteName: "Site 4", MediaPostCount: 1, LastProofAddedAt: now},
				{DiveSiteID: "site-5", DiveSiteName: "Site 5", MediaPostCount: 1, LastProofAddedAt: now},
				{DiveSiteID: "site-6", DiveSiteName: "Site 6", MediaPostCount: 1, LastProofAddedAt: now},
			},
		},
		badges: profilesservice.ProfileBadges{
			Badges: []profilesservice.UserBadge{{
				ID:                 "badge-1",
				Template:           profilesservice.BadgeTemplate{Name: "Depth", Category: "personal_best"},
				VerificationStatus: "unverified",
				Visibility:         "public",
			}},
			AutoStats: []profilesservice.UserBadge{{
				ID:                 "auto-stat-1",
				Template:           profilesservice.BadgeTemplate{Name: "Dive Sites Visited", Category: "activity"},
				VerificationStatus: "system",
				Visibility:         "public",
			}},
		},
	}
	journey := &journeyStub{entries: []journeyservice.JourneyEntry{{
		ID:         "journey-1",
		Type:       "site_visit",
		Title:      "Visited Site 1",
		Visibility: "public",
		OccurredAt: now,
	}}}
	svc := New(profiles, journey)

	passport, err := svc.GetProfilePassport(context.Background(), "aiko", viewerID)
	if err != nil {
		t.Fatalf("get passport: %v", err)
	}
	if passport.MapPreview.State.Status != "ready" || passport.MapPreview.VisitedSiteCount != 6 || len(passport.MapPreview.Markers) != 5 {
		t.Fatalf("expected bounded map preview from Dive Map read model, got %#v", passport.MapPreview)
	}
	if passport.BadgeShowcase.State.Status != "ready" || len(passport.BadgeShowcase.Badges) != 1 || len(passport.BadgeShowcase.AutoStats) != 1 {
		t.Fatalf("expected badges and auto stats from Profile Badges read model, got %#v", passport.BadgeShowcase)
	}
	if passport.JourneyHighlights.State.Status != "ready" || len(passport.JourneyHighlights.Entries) != 1 || journey.input.Limit != 5 {
		t.Fatalf("expected bounded Journey highlight read, got journey=%#v input=%#v", passport.JourneyHighlights, journey.input)
	}
	if profiles.mapCallCount != 1 || profiles.badgeCallCount != 1 || journey.calls != 1 {
		t.Fatalf("Passport should read each child once, map=%d badges=%d journey=%d", profiles.mapCallCount, profiles.badgeCallCount, journey.calls)
	}
}

func TestPassportSettingsDoNotHideOrMutateChildSourceData(t *testing.T) {
	profiles := &profileStub{
		mapPreview: profilesservice.ProfileDiveMap{
			VisitedSiteCount: 1,
			Markers: []profilesservice.ProfileDiveMapMarker{{
				DiveSiteID:     "site-1",
				DiveSiteName:   "Dive Site",
				MediaPostCount: 1,
			}},
		},
		badges: profilesservice.ProfileBadges{
			Badges: []profilesservice.UserBadge{{
				ID:                 "badge-1",
				Template:           profilesservice.BadgeTemplate{Name: "Depth", Category: "personal_best"},
				VerificationStatus: "unverified",
				Visibility:         "public",
			}},
		},
	}
	journey := &journeyStub{entries: []journeyservice.JourneyEntry{{
		ID:         "journey-1",
		Type:       "custom",
		Title:      "Surface interval",
		Visibility: "public",
		OccurredAt: time.Date(2026, 5, 31, 9, 30, 0, 0, time.UTC),
	}}}
	svc := New(profiles, journey, WithSettingsRepository(&settingsStub{}))

	passport, err := svc.GetProfilePassport(context.Background(), "aiko", viewerID)
	if err != nil {
		t.Fatalf("get passport: %v", err)
	}
	if passport.Settings.ShowMap || passport.Settings.ShowMemories {
		t.Fatalf("test settings should disable presentation toggles, got %#v", passport.Settings)
	}
	if passport.MapPreview.State.Status != "ready" || passport.Stats.VisitedSiteCount != 1 {
		t.Fatalf("settings must not mutate or erase map source data, got map=%#v stats=%#v", passport.MapPreview, passport.Stats)
	}
	if passport.BadgeShowcase.State.Status != "ready" || passport.Stats.BadgeCount != 1 {
		t.Fatalf("settings must not mutate or erase badge source data, got badges=%#v stats=%#v", passport.BadgeShowcase, passport.Stats)
	}
	if passport.JourneyHighlights.State.Status != "ready" || passport.Stats.JourneyEntryCount != 1 {
		t.Fatalf("settings must not mutate or erase journey source data, got journey=%#v stats=%#v", passport.JourneyHighlights, passport.Stats)
	}
}

func TestPassportSettingsArePresentationOnlyAndOwnerScoped(t *testing.T) {
	settingsRepo := &settingsStub{}
	svc := New(&profileStub{}, &journeyStub{}, WithSettingsRepository(settingsRepo))
	badgeID := "550e8400-e29b-41d4-a716-446655440302"

	settings, err := svc.UpdateSettings(context.Background(), UpdateSettingsInput{
		ActorID:          userID,
		ShowMap:          true,
		ShowBadges:       false,
		ShowJourney:      true,
		ShowMemories:     false,
		FeaturedBadgeIDs: []string{badgeID, badgeID},
	})
	if err != nil {
		t.Fatalf("update settings: %v", err)
	}
	if settingsRepo.input.UserID != userID {
		t.Fatalf("expected owner-scoped settings update, got %q", settingsRepo.input.UserID)
	}
	if settings.ShowBadges || settings.ShowMemories {
		t.Fatalf("expected presentation toggles to persist, got %#v", settings)
	}
	if len(settings.FeaturedBadgeIDs) != 1 || settings.FeaturedBadgeIDs[0] != badgeID {
		t.Fatalf("expected de-duplicated badge references, got %#v", settings.FeaturedBadgeIDs)
	}
}

func TestPassportSettingsRejectInvalidFeaturedBadgeIDs(t *testing.T) {
	svc := New(&profileStub{}, &journeyStub{}, WithSettingsRepository(&settingsStub{}))
	if _, err := svc.UpdateSettings(context.Background(), UpdateSettingsInput{
		ActorID:          userID,
		ShowMap:          true,
		ShowBadges:       true,
		ShowJourney:      true,
		ShowMemories:     true,
		FeaturedBadgeIDs: []string{"not-a-uuid"},
	}); err == nil {
		t.Fatal("expected invalid featured badge id to fail")
	}
}

func TestPassportServiceHasNoSourceMutationDependencies(t *testing.T) {
	svc := New(&profileStub{}, &journeyStub{})
	if _, ok := any(svc.profiles).(interface {
		RecomputeUserDiveSite(context.Context, string, string) error
	}); ok {
		t.Fatal("Passport service must not mutate Dive Map")
	}
	if _, ok := any(svc.journey).(interface {
		UpsertGeneratedEntry(context.Context, journeyservice.UpsertGeneratedJourneyEntryInput) (journeyservice.JourneyEntry, error)
	}); ok {
		t.Fatal("Passport service must not create Journey entries")
	}
	if _, ok := any(svc.profiles).(interface {
		CreateUserBadge(context.Context, profilesservice.UpsertUserBadgeInput) (profilesservice.UserBadge, error)
	}); ok {
		t.Fatal("Passport service must not award or mutate badges")
	}
}
