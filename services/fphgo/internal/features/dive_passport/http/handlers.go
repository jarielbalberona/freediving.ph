package http

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	journeyservice "fphgo/internal/features/dive_journey/service"
	passportservice "fphgo/internal/features/dive_passport/service"
	profilesservice "fphgo/internal/features/profiles/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type passportService interface {
	GetProfilePassport(ctx context.Context, username, viewerUserID string) (passportservice.Passport, error)
	GetSettings(ctx context.Context, userID string) (passportservice.Settings, error)
	UpdateSettings(ctx context.Context, input passportservice.UpdateSettingsInput) (passportservice.Settings, error)
}

type Handlers struct {
	service   passportService
	validator httpx.Validator
}

func New(service passportService, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) GetProfilePassport(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.GetProfilePassport(r.Context(), chi.URLParam(r, "username"), actorIDIfPresent(r))
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, ProfilePassportResponse{Passport: passportToDTO(result)})
}

func (h *Handlers) GetMySettings(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	result, err := h.service.GetSettings(r.Context(), actorID)
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, PassportSettingsResponse{Settings: settingsToDTO(result)})
}

func (h *Handlers) UpdateMySettings(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdatePassportSettingsRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.UpdateSettings(r.Context(), passportservice.UpdateSettingsInput{
		ActorID:          actorID,
		ShowMap:          req.ShowMap,
		ShowBadges:       req.ShowBadges,
		ShowJourney:      req.ShowJourney,
		ShowMemories:     req.ShowMemories,
		FeaturedBadgeIDs: append([]string(nil), req.FeaturedBadgeIDs...),
	})
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, PassportSettingsResponse{Settings: settingsToDTO(result)})
}

func passportToDTO(input passportservice.Passport) ProfilePassport {
	return ProfilePassport{
		Profile:           profileToDTO(input.Profile),
		Stats:             statsToDTO(input.Stats),
		MapPreview:        mapPreviewToDTO(input.MapPreview),
		BadgeShowcase:     badgeShowcaseToDTO(input.BadgeShowcase),
		JourneyHighlights: journeyHighlightsToDTO(input.JourneyHighlights),
		RecentMedia:       recentMediaToDTO(input.RecentMedia),
		Memories:          sectionStateToDTO(input.Memories),
		Settings:          settingsToDTO(input.Settings),
	}
}

func profileToDTO(input profilesservice.ProfileView) PassportProfile {
	return PassportProfile{
		ID:           input.UserID,
		Username:     input.Username,
		DisplayName:  input.DisplayName,
		Bio:          input.Bio,
		AvatarURL:    input.AvatarURL,
		LocationText: input.Location,
		CreatedAt:    formatTime(input.CreatedAt),
		Counts: PassportProfileCounts{
			MediaPosts: input.Counts.MediaPosts,
			Followers:  input.Counts.Followers,
			Following:  input.Counts.Following,
		},
		Viewer: PassportViewerRelationship{
			IsSelf:           input.Viewer.IsSelf,
			IsFollowing:      input.Viewer.IsFollowing,
			IsBlocked:        input.Viewer.IsBlocked,
			HasBlockedViewer: input.Viewer.HasBlockedViewer,
			CanMessage:       input.Viewer.CanMessage,
			CanFollow:        input.Viewer.CanFollow,
			CanEdit:          input.Viewer.CanEdit,
		},
	}
}

func statsToDTO(input passportservice.Stats) PassportStats {
	return PassportStats{
		VisitedSiteCount:  input.VisitedSiteCount,
		BadgeCount:        input.BadgeCount,
		JourneyEntryCount: input.JourneyEntryCount,
		MediaPostCount:    input.MediaPostCount,
		MemoryCount:       input.MemoryCount,
	}
}

func mapPreviewToDTO(input passportservice.MapPreview) PassportMapPreview {
	markers := make([]PassportMapMarker, 0, len(input.Markers))
	for _, marker := range input.Markers {
		markers = append(markers, PassportMapMarker{
			DiveSiteID:     marker.DiveSiteID,
			DiveSiteSlug:   marker.DiveSiteSlug,
			DiveSiteName:   marker.DiveSiteName,
			DiveSiteArea:   marker.DiveSiteArea,
			FirstVisitedAt: formatTime(marker.FirstVisitedAt),
			LastVisitedAt:  formatTime(marker.LastVisitedAt),
			MediaPostCount: marker.MediaPostCount,
		})
	}
	return PassportMapPreview{
		State:            sectionStateToDTO(input.State),
		VisitedSiteCount: input.VisitedSiteCount,
		Markers:          markers,
	}
}

func badgeShowcaseToDTO(input passportservice.BadgeShowcase) PassportBadgeShowcase {
	badges := make([]PassportBadge, 0, len(input.Badges))
	for _, badge := range input.Badges {
		badges = append(badges, badgeToDTO(badge))
	}
	autoStats := make([]PassportBadge, 0, len(input.AutoStats))
	for _, badge := range input.AutoStats {
		autoStats = append(autoStats, badgeToDTO(badge))
	}
	return PassportBadgeShowcase{
		State:     sectionStateToDTO(input.State),
		Badges:    badges,
		AutoStats: autoStats,
	}
}

func badgeToDTO(input profilesservice.UserBadge) PassportBadge {
	return PassportBadge{
		ID:                 input.ID,
		Name:               input.Template.Name,
		Category:           input.Template.Category,
		DisplayValue:       input.DisplayValue,
		VerificationStatus: input.VerificationStatus,
		IsSystemVerified:   input.IsSystemVerified,
		Visibility:         input.Visibility,
	}
}

func journeyHighlightsToDTO(input passportservice.JourneyHighlights) PassportJourneyHighlights {
	entries := make([]PassportJourneyEntry, 0, len(input.Entries))
	for _, entry := range input.Entries {
		entries = append(entries, journeyEntryToDTO(entry))
	}
	return PassportJourneyHighlights{
		State:   sectionStateToDTO(input.State),
		Entries: entries,
	}
}

func journeyEntryToDTO(input journeyservice.JourneyEntry) PassportJourneyEntry {
	return PassportJourneyEntry{
		ID:         input.ID,
		Type:       input.Type,
		Title:      input.Title,
		Body:       input.Body,
		Visibility: input.Visibility,
		OccurredAt: formatTime(input.OccurredAt),
	}
}

func recentMediaToDTO(input passportservice.RecentMedia) PassportRecentMedia {
	items := make([]PassportMediaItem, 0, len(input.Items))
	for _, item := range input.Items {
		items = append(items, PassportMediaItem{
			ID:        item.ID,
			URL:       item.URL,
			Type:      item.Type,
			CreatedAt: formatTime(item.CreatedAt),
		})
	}
	return PassportRecentMedia{State: sectionStateToDTO(input.State), Items: items}
}

func sectionStateToDTO(input passportservice.SectionState) PassportSectionState {
	return PassportSectionState{Status: input.Status, Reason: input.Reason}
}

func settingsToDTO(input passportservice.Settings) PassportSettings {
	return PassportSettings{
		ShowMap:          input.ShowMap,
		ShowBadges:       input.ShowBadges,
		ShowJourney:      input.ShowJourney,
		ShowMemories:     input.ShowMemories,
		FeaturedBadgeIDs: append([]string(nil), input.FeaturedBadgeIDs...),
		CreatedAt:        formatTime(input.CreatedAt),
		UpdatedAt:        formatTime(input.UpdatedAt),
	}
}

func formatTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func actorIDIfPresent(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok {
		return ""
	}
	return identity.UserID
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr passportservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}
