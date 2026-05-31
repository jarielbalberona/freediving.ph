package service

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	journeyrepo "fphgo/internal/features/dive_journey/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type Repository interface {
	GetOwnerByUsername(ctx context.Context, username, viewerUserID string) (journeyrepo.JourneyOwner, error)
	ListForProfile(ctx context.Context, input journeyrepo.ListProfileInput) ([]journeyrepo.JourneyEntry, error)
	CreateManual(ctx context.Context, input journeyrepo.UpsertManualInput) (journeyrepo.JourneyEntry, error)
	UpsertGenerated(ctx context.Context, input journeyrepo.UpsertGeneratedInput) (journeyrepo.JourneyEntry, error)
	UpdateManual(ctx context.Context, input journeyrepo.UpsertManualInput) (journeyrepo.JourneyEntry, error)
	SoftDeleteManual(ctx context.Context, userID, entryID string) error
	HideGenerated(ctx context.Context, input journeyrepo.UpsertGeneratedInput) error
	ListOwnedActiveMedia(ctx context.Context, userID string, mediaIDs []string) (map[string]struct{}, error)
}

type Service struct {
	repo Repository
	now  func() time.Time
}

func New(repo Repository) *Service {
	return &Service{repo: repo, now: time.Now}
}

func (s *Service) WithNow(now func() time.Time) *Service {
	if now != nil {
		s.now = now
	}
	return s
}

type JourneyEntry struct {
	ID           string
	UserID       string
	Type         string
	Title        string
	Body         string
	DiveSiteID   string
	SourceType   string
	SourceID     string
	CoverMediaID string
	Visibility   string
	State        string
	OccurredAt   time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
	MediaIDs     []string
}

type ListProfileJourneyInput struct {
	Username     string
	ViewerUserID string
	Limit        int32
}

type UpsertManualJourneyEntryInput struct {
	ActorID    string
	EntryID    string
	Title      string
	Body       string
	DiveSiteID string
	Visibility string
	OccurredAt *time.Time
	MediaIDs   []string
}

type UpsertGeneratedJourneyEntryInput struct {
	UserID     string
	Type       string
	Title      string
	Body       string
	DiveSiteID string
	SourceType string
	SourceID   string
	Visibility string
	OccurredAt *time.Time
}

type HideGeneratedJourneyEntryInput struct {
	UserID     string
	Type       string
	SourceType string
	SourceID   string
}

func (s *Service) ListProfileJourney(ctx context.Context, input ListProfileJourneyInput) ([]JourneyEntry, error) {
	limit := input.Limit
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	owner, err := s.repo.GetOwnerByUsername(ctx, strings.TrimSpace(input.Username), strings.TrimSpace(input.ViewerUserID))
	if err != nil {
		if errors.Is(err, journeyrepo.ErrNotFound) {
			return nil, apperrors.New(http.StatusNotFound, "profile_not_found", "profile not found", err)
		}
		return nil, apperrors.New(http.StatusInternalServerError, "journey_owner_failed", "failed to load journey owner", err)
	}
	if owner.Blocked {
		return nil, apperrors.New(http.StatusForbidden, "blocked", "profile is not available", nil)
	}
	rows, err := s.repo.ListForProfile(ctx, journeyrepo.ListProfileInput{
		TargetUserID:  owner.UserID,
		ViewerIsSelf:  owner.ViewerIsSelf,
		ViewerFollows: owner.ViewerFollows,
		Limit:         limit,
	})
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "journey_list_failed", "failed to load journey", err)
	}
	return mapEntries(rows), nil
}

func (s *Service) CreateManualEntry(ctx context.Context, input UpsertManualJourneyEntryInput) (JourneyEntry, error) {
	normalized, err := s.normalizeManualInput(ctx, input, false)
	if err != nil {
		return JourneyEntry{}, err
	}
	row, err := s.repo.CreateManual(ctx, normalized)
	if err != nil {
		return JourneyEntry{}, apperrors.New(http.StatusInternalServerError, "journey_create_failed", "failed to create journey entry", err)
	}
	return mapEntry(row), nil
}

// UpsertGeneratedEntry creates or refreshes a display-only Journey row for an
// authoritative upstream source. Callers must keep source ownership elsewhere.
func (s *Service) UpsertGeneratedEntry(ctx context.Context, input UpsertGeneratedJourneyEntryInput) (JourneyEntry, error) {
	normalized, err := s.normalizeGeneratedInput(input)
	if err != nil {
		return JourneyEntry{}, err
	}
	row, err := s.repo.UpsertGenerated(ctx, normalized)
	if err != nil {
		return JourneyEntry{}, apperrors.New(http.StatusInternalServerError, "journey_generated_upsert_failed", "failed to upsert generated journey entry", err)
	}
	return mapEntry(row), nil
}

func (s *Service) UpdateManualEntry(ctx context.Context, input UpsertManualJourneyEntryInput) (JourneyEntry, error) {
	normalized, err := s.normalizeManualInput(ctx, input, true)
	if err != nil {
		return JourneyEntry{}, err
	}
	row, err := s.repo.UpdateManual(ctx, normalized)
	if err != nil {
		if errors.Is(err, journeyrepo.ErrNotFound) {
			return JourneyEntry{}, apperrors.New(http.StatusNotFound, "journey_entry_not_found", "journey entry not found", err)
		}
		return JourneyEntry{}, apperrors.New(http.StatusInternalServerError, "journey_update_failed", "failed to update journey entry", err)
	}
	return mapEntry(row), nil
}

func (s *Service) DeleteManualEntry(ctx context.Context, actorID, entryID string) error {
	if _, err := uuid.Parse(strings.TrimSpace(actorID)); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(entryID)); err != nil {
		return validationError("entryId", "invalid_uuid", "entryId must be a valid UUID")
	}
	if err := s.repo.SoftDeleteManual(ctx, actorID, entryID); err != nil {
		if errors.Is(err, journeyrepo.ErrNotFound) {
			return apperrors.New(http.StatusNotFound, "journey_entry_not_found", "journey entry not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "journey_delete_failed", "failed to delete journey entry", err)
	}
	return nil
}

func (s *Service) HideGeneratedEntry(ctx context.Context, input HideGeneratedJourneyEntryInput) error {
	normalized, err := s.normalizeGeneratedIdentity(input.UserID, input.Type, input.SourceType, input.SourceID)
	if err != nil {
		return err
	}
	if err := s.repo.HideGenerated(ctx, normalized); err != nil {
		if errors.Is(err, journeyrepo.ErrNotFound) {
			return apperrors.New(http.StatusNotFound, "journey_entry_not_found", "journey entry not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "journey_generated_hide_failed", "failed to hide generated journey entry", err)
	}
	return nil
}

func (s *Service) normalizeManualInput(ctx context.Context, input UpsertManualJourneyEntryInput, requireEntryID bool) (journeyrepo.UpsertManualInput, error) {
	actorID := strings.TrimSpace(input.ActorID)
	if _, err := uuid.Parse(actorID); err != nil {
		return journeyrepo.UpsertManualInput{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	entryID := strings.TrimSpace(input.EntryID)
	if requireEntryID {
		if _, err := uuid.Parse(entryID); err != nil {
			return journeyrepo.UpsertManualInput{}, validationError("entryId", "invalid_uuid", "entryId must be a valid UUID")
		}
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return journeyrepo.UpsertManualInput{}, validationError("title", "required", "title is required")
	}
	if len(title) > 120 {
		return journeyrepo.UpsertManualInput{}, validationError("title", "too_long", "title must be 120 characters or fewer")
	}
	body := strings.TrimSpace(input.Body)
	if len(body) > 2000 {
		return journeyrepo.UpsertManualInput{}, validationError("body", "too_long", "body must be 2000 characters or fewer")
	}
	visibility := strings.TrimSpace(input.Visibility)
	if visibility == "" {
		visibility = "public"
	}
	if visibility != "public" && visibility != "followers" && visibility != "private" {
		return journeyrepo.UpsertManualInput{}, validationError("visibility", "oneof", "visibility must be public, followers, or private")
	}
	mediaIDs, err := normalizeMediaIDs(input.MediaIDs)
	if err != nil {
		return journeyrepo.UpsertManualInput{}, err
	}
	owned, err := s.repo.ListOwnedActiveMedia(ctx, actorID, mediaIDs)
	if err != nil {
		return journeyrepo.UpsertManualInput{}, apperrors.New(http.StatusInternalServerError, "journey_media_check_failed", "failed to verify journey media", err)
	}
	for _, mediaID := range mediaIDs {
		if _, ok := owned[mediaID]; !ok {
			return journeyrepo.UpsertManualInput{}, apperrors.New(http.StatusForbidden, "journey_media_forbidden", "media cannot be attached to this journey entry", nil)
		}
	}
	diveSiteID := strings.TrimSpace(input.DiveSiteID)
	if diveSiteID != "" {
		if _, err := uuid.Parse(diveSiteID); err != nil {
			return journeyrepo.UpsertManualInput{}, validationError("diveSiteId", "invalid_uuid", "diveSiteId must be a valid UUID")
		}
	}
	occurredAt := s.now().UTC()
	if input.OccurredAt != nil {
		occurredAt = input.OccurredAt.UTC()
	}
	return journeyrepo.UpsertManualInput{
		ID:         entryID,
		UserID:     actorID,
		Title:      title,
		Body:       body,
		DiveSiteID: diveSiteID,
		Visibility: visibility,
		OccurredAt: occurredAt,
		MediaIDs:   mediaIDs,
	}, nil
}

func (s *Service) normalizeGeneratedInput(input UpsertGeneratedJourneyEntryInput) (journeyrepo.UpsertGeneratedInput, error) {
	identity, err := s.normalizeGeneratedIdentity(input.UserID, input.Type, input.SourceType, input.SourceID)
	if err != nil {
		return journeyrepo.UpsertGeneratedInput{}, err
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return journeyrepo.UpsertGeneratedInput{}, validationError("title", "required", "title is required")
	}
	if len(title) > 120 {
		return journeyrepo.UpsertGeneratedInput{}, validationError("title", "too_long", "title must be 120 characters or fewer")
	}
	body := strings.TrimSpace(input.Body)
	if len(body) > 2000 {
		return journeyrepo.UpsertGeneratedInput{}, validationError("body", "too_long", "body must be 2000 characters or fewer")
	}
	visibility := strings.TrimSpace(input.Visibility)
	if visibility == "" {
		visibility = "public"
	}
	if visibility != "public" && visibility != "followers" && visibility != "private" {
		return journeyrepo.UpsertGeneratedInput{}, validationError("visibility", "oneof", "visibility must be public, followers, or private")
	}
	diveSiteID := strings.TrimSpace(input.DiveSiteID)
	if diveSiteID != "" {
		if _, err := uuid.Parse(diveSiteID); err != nil {
			return journeyrepo.UpsertGeneratedInput{}, validationError("diveSiteId", "invalid_uuid", "diveSiteId must be a valid UUID")
		}
	}
	occurredAt := s.now().UTC()
	if input.OccurredAt != nil {
		occurredAt = input.OccurredAt.UTC()
	}
	return journeyrepo.UpsertGeneratedInput{
		UserID:     identity.UserID,
		Type:       identity.Type,
		Title:      title,
		Body:       body,
		DiveSiteID: diveSiteID,
		SourceType: identity.SourceType,
		SourceID:   identity.SourceID,
		Visibility: visibility,
		OccurredAt: occurredAt,
	}, nil
}

func (s *Service) normalizeGeneratedIdentity(userIDValue, typeValue, sourceTypeValue, sourceIDValue string) (journeyrepo.UpsertGeneratedInput, error) {
	userID := strings.TrimSpace(userIDValue)
	if _, err := uuid.Parse(userID); err != nil {
		return journeyrepo.UpsertGeneratedInput{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	entryType := strings.TrimSpace(typeValue)
	if !isGeneratedJourneyType(entryType) {
		return journeyrepo.UpsertGeneratedInput{}, validationError("type", "oneof", "type must be memory, map_milestone, badge, event, or media")
	}
	sourceType := strings.TrimSpace(sourceTypeValue)
	if sourceType == "" {
		return journeyrepo.UpsertGeneratedInput{}, validationError("sourceType", "required", "sourceType is required")
	}
	sourceID := strings.TrimSpace(sourceIDValue)
	if sourceID == "" {
		return journeyrepo.UpsertGeneratedInput{}, validationError("sourceId", "required", "sourceId is required")
	}
	return journeyrepo.UpsertGeneratedInput{
		UserID:     userID,
		Type:       entryType,
		SourceType: sourceType,
		SourceID:   sourceID,
	}, nil
}

func isGeneratedJourneyType(value string) bool {
	switch value {
	case "memory", "map_milestone", "badge", "event", "media":
		return true
	default:
		return false
	}
}

func normalizeMediaIDs(values []string) ([]string, error) {
	if len(values) == 0 {
		return nil, nil
	}
	if len(values) > 12 {
		return nil, validationError("mediaIds", "too_many", "mediaIds must contain 12 or fewer items")
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if _, err := uuid.Parse(trimmed); err != nil {
			return nil, validationError("mediaIds", "invalid_uuid", "mediaIds must contain valid UUIDs")
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

func mapEntries(rows []journeyrepo.JourneyEntry) []JourneyEntry {
	out := make([]JourneyEntry, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapEntry(row))
	}
	return out
}

func mapEntry(row journeyrepo.JourneyEntry) JourneyEntry {
	return JourneyEntry{
		ID:           row.ID,
		UserID:       row.UserID,
		Type:         row.Type,
		Title:        row.Title,
		Body:         row.Body,
		DiveSiteID:   row.DiveSiteID,
		SourceType:   row.SourceType,
		SourceID:     row.SourceID,
		CoverMediaID: row.CoverMediaID,
		Visibility:   row.Visibility,
		State:        row.State,
		OccurredAt:   row.OccurredAt,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
		MediaIDs:     append([]string(nil), row.MediaIDs...),
	}
}
