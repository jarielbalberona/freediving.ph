package service

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	journeyservice "fphgo/internal/features/dive_journey/service"
	passportrepo "fphgo/internal/features/dive_passport/repo"
	profilesservice "fphgo/internal/features/profiles/service"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type ProfileReader interface {
	GetProfileViewByUsername(ctx context.Context, username, viewerUserID string) (profilesservice.ProfileView, error)
	GetProfileDiveMapByUsername(ctx context.Context, username, viewerUserID string) (profilesservice.ProfileDiveMap, error)
	GetProfileBadgesByUsername(ctx context.Context, username string) (profilesservice.ProfileBadges, error)
}

type JourneyReader interface {
	ListProfileJourney(ctx context.Context, input journeyservice.ListProfileJourneyInput) ([]journeyservice.JourneyEntry, error)
}

type SettingsRepository interface {
	GetSettings(ctx context.Context, userID string) (passportrepo.Settings, error)
	UpsertSettings(ctx context.Context, input passportrepo.UpsertSettingsInput) (passportrepo.Settings, error)
}

type Option func(*Service)

type Service struct {
	profiles ProfileReader
	journey  JourneyReader
	settings SettingsRepository
}

func New(profiles ProfileReader, journey JourneyReader, opts ...Option) *Service {
	s := &Service{profiles: profiles, journey: journey}
	for _, opt := range opts {
		if opt != nil {
			opt(s)
		}
	}
	return s
}

func WithSettingsRepository(repo SettingsRepository) Option {
	return func(s *Service) {
		s.settings = repo
	}
}

type SectionState struct {
	Status string
	Reason string
}

type Passport struct {
	Profile           profilesservice.ProfileView
	Stats             Stats
	MapPreview        MapPreview
	BadgeShowcase     BadgeShowcase
	JourneyHighlights JourneyHighlights
	RecentMedia       RecentMedia
	Memories          SectionState
	Settings          Settings
}

type Stats struct {
	VisitedSiteCount  int64
	BadgeCount        int64
	JourneyEntryCount int64
	MediaPostCount    int64
	MemoryCount       int64
}

type MapPreview struct {
	State            SectionState
	VisitedSiteCount int64
	Markers          []profilesservice.ProfileDiveMapMarker
}

type BadgeShowcase struct {
	State     SectionState
	Badges    []profilesservice.UserBadge
	AutoStats []profilesservice.UserBadge
}

type JourneyHighlights struct {
	State   SectionState
	Entries []journeyservice.JourneyEntry
}

type RecentMedia struct {
	State SectionState
	Items []MediaItem
}

type MediaItem struct {
	ID        string
	URL       string
	Type      string
	CreatedAt time.Time
}

type Settings struct {
	ShowMap          bool
	ShowBadges       bool
	ShowJourney      bool
	ShowMemories     bool
	FeaturedBadgeIDs []string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type UpdateSettingsInput struct {
	ActorID          string
	ShowMap          bool
	ShowBadges       bool
	ShowJourney      bool
	ShowMemories     bool
	FeaturedBadgeIDs []string
}

func (s *Service) GetProfilePassport(ctx context.Context, username, viewerUserID string) (Passport, error) {
	profile, err := s.profiles.GetProfileViewByUsername(ctx, username, viewerUserID)
	if err != nil {
		return Passport{}, err
	}
	settings, err := s.GetSettings(ctx, profile.UserID)
	if err != nil {
		return Passport{}, err
	}
	passport := Passport{
		Profile: profile,
		Stats: Stats{
			MediaPostCount: profile.Counts.MediaPosts,
		},
		RecentMedia: RecentMedia{State: SectionState{Status: "empty", Reason: "no_data"}},
		Memories:    SectionState{Status: "unavailable", Reason: "source_unavailable"},
		Settings:    settings,
	}

	passport.MapPreview = s.mapPreview(ctx, username, viewerUserID)
	passport.Stats.VisitedSiteCount = passport.MapPreview.VisitedSiteCount

	passport.BadgeShowcase = s.badgeShowcase(ctx, username)
	passport.Stats.BadgeCount = int64(len(passport.BadgeShowcase.Badges))

	passport.JourneyHighlights = s.journeyHighlights(ctx, username, viewerUserID)
	passport.Stats.JourneyEntryCount = int64(len(passport.JourneyHighlights.Entries))

	return passport, nil
}

func (s *Service) GetSettings(ctx context.Context, userID string) (Settings, error) {
	userID = strings.TrimSpace(userID)
	if _, err := uuid.Parse(userID); err != nil {
		return Settings{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	if s.settings == nil {
		return defaultSettings(), nil
	}
	row, err := s.settings.GetSettings(ctx, userID)
	if err != nil {
		if errors.Is(err, passportrepo.ErrNotFound) {
			return defaultSettings(), nil
		}
		return Settings{}, apperrors.New(http.StatusInternalServerError, "passport_settings_failed", "failed to load passport settings", err)
	}
	return settingsFromRepo(row), nil
}

func (s *Service) UpdateSettings(ctx context.Context, input UpdateSettingsInput) (Settings, error) {
	actorID := strings.TrimSpace(input.ActorID)
	if _, err := uuid.Parse(actorID); err != nil {
		return Settings{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if s.settings == nil {
		return Settings{}, apperrors.New(http.StatusInternalServerError, "passport_settings_unavailable", "passport settings are unavailable", nil)
	}
	featured, err := normalizeFeaturedBadgeIDs(input.FeaturedBadgeIDs)
	if err != nil {
		return Settings{}, err
	}
	row, err := s.settings.UpsertSettings(ctx, passportrepo.UpsertSettingsInput{
		UserID:           actorID,
		ShowMap:          input.ShowMap,
		ShowBadges:       input.ShowBadges,
		ShowJourney:      input.ShowJourney,
		ShowMemories:     input.ShowMemories,
		FeaturedBadgeIDs: featured,
	})
	if err != nil {
		return Settings{}, apperrors.New(http.StatusInternalServerError, "passport_settings_update_failed", "failed to update passport settings", err)
	}
	return settingsFromRepo(row), nil
}

func defaultSettings() Settings {
	return Settings{
		ShowMap:      true,
		ShowBadges:   true,
		ShowJourney:  true,
		ShowMemories: true,
	}
}

func settingsFromRepo(row passportrepo.Settings) Settings {
	return Settings{
		ShowMap:          row.ShowMap,
		ShowBadges:       row.ShowBadges,
		ShowJourney:      row.ShowJourney,
		ShowMemories:     row.ShowMemories,
		FeaturedBadgeIDs: append([]string(nil), row.FeaturedBadgeIDs...),
		CreatedAt:        row.CreatedAt,
		UpdatedAt:        row.UpdatedAt,
	}
}

func normalizeFeaturedBadgeIDs(values []string) ([]string, error) {
	if len(values) > 12 {
		return nil, validationError("featuredBadgeIds", "too_many", "featuredBadgeIds must contain 12 or fewer items")
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, err := uuid.Parse(trimmed); err != nil {
			return nil, validationError("featuredBadgeIds", "invalid_uuid", "featuredBadgeIds must contain valid UUIDs")
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out, nil
}

func validationError(field, code, message string) error {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    code,
		Message: message,
	}}}
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (v ValidationFailure) Error() string { return "validation failed" }

func (s *Service) mapPreview(ctx context.Context, username, viewerUserID string) MapPreview {
	if s.profiles == nil {
		return MapPreview{State: SectionState{Status: "unavailable", Reason: "source_unavailable"}}
	}
	result, err := s.profiles.GetProfileDiveMapByUsername(ctx, username, viewerUserID)
	if err != nil {
		return MapPreview{State: SectionState{Status: "unavailable", Reason: "source_unavailable"}}
	}
	state := readyOrEmpty(len(result.Markers))
	markers := result.Markers
	if len(markers) > 5 {
		markers = markers[:5]
	}
	return MapPreview{
		State:            state,
		VisitedSiteCount: result.VisitedSiteCount,
		Markers:          append([]profilesservice.ProfileDiveMapMarker(nil), markers...),
	}
}

func (s *Service) badgeShowcase(ctx context.Context, username string) BadgeShowcase {
	if s.profiles == nil {
		return BadgeShowcase{State: SectionState{Status: "unavailable", Reason: "source_unavailable"}}
	}
	result, err := s.profiles.GetProfileBadgesByUsername(ctx, username)
	if err != nil {
		return BadgeShowcase{State: SectionState{Status: "unavailable", Reason: "source_unavailable"}}
	}
	state := readyOrEmpty(len(result.Badges) + len(result.AutoStats))
	return BadgeShowcase{
		State:     state,
		Badges:    append([]profilesservice.UserBadge(nil), result.Badges...),
		AutoStats: append([]profilesservice.UserBadge(nil), result.AutoStats...),
	}
}

func (s *Service) journeyHighlights(ctx context.Context, username, viewerUserID string) JourneyHighlights {
	if s.journey == nil {
		return JourneyHighlights{State: SectionState{Status: "unavailable", Reason: "source_unavailable"}}
	}
	result, err := s.journey.ListProfileJourney(ctx, journeyservice.ListProfileJourneyInput{
		Username:     username,
		ViewerUserID: viewerUserID,
		Limit:        5,
	})
	if err != nil {
		return JourneyHighlights{State: SectionState{Status: "unavailable", Reason: "source_unavailable"}}
	}
	return JourneyHighlights{
		State:   readyOrEmpty(len(result)),
		Entries: append([]journeyservice.JourneyEntry(nil), result...),
	}
}

func readyOrEmpty(count int) SectionState {
	if count == 0 {
		return SectionState{Status: "empty", Reason: "no_data"}
	}
	return SectionState{Status: "ready"}
}
