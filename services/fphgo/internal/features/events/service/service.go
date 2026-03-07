package service

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	eventsrepo "fphgo/internal/features/events/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo repository
}

type repository interface {
	ListEvents(ctx context.Context, input eventsrepo.ListEventsInput) ([]eventsrepo.Event, int, error)
	GetEventByID(ctx context.Context, eventID, viewerUserID string) (eventsrepo.Event, error)
	CreateEvent(ctx context.Context, input eventsrepo.CreateEventInput) (eventsrepo.Event, error)
	AddOrganizerMembership(ctx context.Context, eventID, userID string) error
	UpdateEvent(ctx context.Context, input eventsrepo.UpdateEventInput) (eventsrepo.Event, error)
	GetGroupRole(ctx context.Context, groupID, userID string) (string, error)
	UpsertAttendee(ctx context.Context, eventID, userID, role, status, notes string) (eventsrepo.EventAttendee, error)
	LeaveEvent(ctx context.Context, eventID, userID string) error
	GetAttendee(ctx context.Context, eventID, userID string) (eventsrepo.EventAttendee, error)
	ListAttendees(ctx context.Context, eventID string, page, limit int) ([]eventsrepo.EventAttendee, int, error)
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListEvents(ctx context.Context, viewerUserID, search, status, groupID string, page, limit int) ([]eventsrepo.Event, int, error) {
	if strings.TrimSpace(groupID) != "" {
		if _, err := uuid.Parse(strings.TrimSpace(groupID)); err != nil {
			return nil, 0, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"groupId"},
				Code:    "invalid_uuid",
				Message: "Must be a valid UUID",
			}}}
		}
	}
	return s.repo.ListEvents(ctx, eventsrepo.ListEventsInput{
		ViewerUserID: strings.TrimSpace(viewerUserID),
		Search:       strings.TrimSpace(search),
		Status:       normalizeEventStatus(status),
		GroupID:      strings.TrimSpace(groupID),
		Page:         normalizePage(page),
		Limit:        normalizeLimit(limit),
	})
}

func (s *Service) GetEvent(ctx context.Context, eventID, viewerUserID string) (eventsrepo.Event, error) {
	if _, err := uuid.Parse(eventID); err != nil {
		return eventsrepo.Event{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"eventId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	event, err := s.repo.GetEventByID(ctx, eventID, strings.TrimSpace(viewerUserID))
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	if event.Visibility == "public" {
		return event, nil
	}
	viewerUserID = strings.TrimSpace(viewerUserID)
	if viewerUserID == "" {
		return eventsrepo.Event{}, apperrors.New(http.StatusForbidden, "forbidden", "event is not public", nil)
	}
	if event.ViewerJoined {
		return event, nil
	}
	if strings.TrimSpace(event.GroupID) != "" {
		role, roleErr := s.repo.GetGroupRole(ctx, event.GroupID, viewerUserID)
		if roleErr == nil && role != "" {
			return event, nil
		}
	}
	return eventsrepo.Event{}, apperrors.New(http.StatusForbidden, "forbidden", "event is not public", nil)
}

func (s *Service) CreateEvent(ctx context.Context, actorID string, input eventsrepo.CreateEventInput) (eventsrepo.Event, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return eventsrepo.Event{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"title"},
			Code:    "required",
			Message: "This field is required",
		}}}
	}
	if input.StartsAt != nil && input.EndsAt != nil && input.EndsAt.Before(*input.StartsAt) {
		return eventsrepo.Event{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"endsAt"},
			Code:    "invalid_range",
			Message: "end time must be after start time",
		}}}
	}
	if input.GroupID != nil && strings.TrimSpace(*input.GroupID) != "" {
		groupID := strings.TrimSpace(*input.GroupID)
		if _, err := uuid.Parse(groupID); err != nil {
			return eventsrepo.Event{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"groupId"},
				Code:    "invalid_uuid",
				Message: "Must be a valid UUID",
			}}}
		}
		role, err := s.repo.GetGroupRole(ctx, groupID, actorID)
		if err != nil {
			return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "group_role_failed", "failed to validate group role", err)
		}
		if role != "owner" && role != "moderator" {
			return eventsrepo.Event{}, apperrors.New(http.StatusForbidden, "forbidden", "only owner or moderator can create group events", nil)
		}
	}
	status := normalizeCreateStatus(input.Status)
	visibility := normalizeVisibility(input.Visibility)
	eventType := normalizeEventType(input.EventType)
	difficulty := normalizeDifficulty(input.Difficulty)

	created, err := s.repo.CreateEvent(ctx, eventsrepo.CreateEventInput{
		Title:            title,
		Description:      strings.TrimSpace(input.Description),
		Location:         strings.TrimSpace(input.Location),
		LocationName:     strings.TrimSpace(input.LocationName),
		FormattedAddress: strings.TrimSpace(input.FormattedAddress),
		Latitude:         input.Latitude,
		Longitude:        input.Longitude,
		GooglePlaceID:    strings.TrimSpace(input.GooglePlaceID),
		RegionCode:       strings.TrimSpace(input.RegionCode),
		ProvinceCode:     strings.TrimSpace(input.ProvinceCode),
		CityCode:         strings.TrimSpace(input.CityCode),
		BarangayCode:     strings.TrimSpace(input.BarangayCode),
		LocationSource:   normalizeLocationSource(input.LocationSource),
		StartsAt:         input.StartsAt,
		EndsAt:           input.EndsAt,
		Status:           status,
		Visibility:       visibility,
		EventType:        eventType,
		Difficulty:       difficulty,
		MaxAttendees:     input.MaxAttendees,
		OrganizerUserID:  actorID,
		GroupID:          input.GroupID,
	})
	if err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_create_failed", "failed to create event", err)
	}
	if err := s.repo.AddOrganizerMembership(ctx, created.ID, actorID); err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_membership_create_failed", "failed to create organizer membership", err)
	}
	return s.repo.GetEventByID(ctx, created.ID, actorID)
}

func (s *Service) UpdateEvent(ctx context.Context, eventID string, input eventsrepo.UpdateEventInput) (eventsrepo.Event, error) {
	if _, err := uuid.Parse(eventID); err != nil {
		return eventsrepo.Event{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"eventId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if input.Status != nil {
		value := normalizeEventStatus(*input.Status)
		input.Status = &value
	}
	if input.Visibility != nil {
		value := normalizeVisibility(*input.Visibility)
		input.Visibility = &value
	}
	if input.Difficulty != nil {
		value := normalizeDifficulty(*input.Difficulty)
		input.Difficulty = &value
	}
	if input.EventType != nil {
		value := normalizeEventType(*input.EventType)
		input.EventType = &value
	}
	if input.LocationSource != nil {
		value := normalizeLocationSource(*input.LocationSource)
		input.LocationSource = &value
	}
	input.EventID = eventID
	updated, err := s.repo.UpdateEvent(ctx, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_update_failed", "failed to update event", err)
	}
	return updated, nil
}

func (s *Service) JoinEvent(ctx context.Context, eventID, actorID, notes string) (eventsrepo.EventAttendee, error) {
	if _, err := uuid.Parse(eventID); err != nil {
		return eventsrepo.EventAttendee{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"eventId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return eventsrepo.EventAttendee{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	event, err := s.repo.GetEventByID(ctx, eventID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventAttendee{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.EventAttendee{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	if event.Status != "published" {
		return eventsrepo.EventAttendee{}, apperrors.New(http.StatusConflict, "event_not_joinable", "event is not joinable", nil)
	}
	if event.Visibility != "public" {
		allowed := event.ViewerJoined
		if !allowed && strings.TrimSpace(event.GroupID) != "" {
			role, roleErr := s.repo.GetGroupRole(ctx, event.GroupID, actorID)
			if roleErr != nil {
				return eventsrepo.EventAttendee{}, apperrors.New(http.StatusInternalServerError, "group_role_failed", "failed to validate group role", roleErr)
			}
			allowed = role != ""
		}
		if !allowed {
			return eventsrepo.EventAttendee{}, apperrors.New(http.StatusForbidden, "forbidden", "event is not public", nil)
		}
	}
	attendee, err := s.repo.UpsertAttendee(ctx, eventID, actorID, "attendee", "active", strings.TrimSpace(notes))
	if err != nil {
		return eventsrepo.EventAttendee{}, apperrors.New(http.StatusInternalServerError, "event_join_failed", "failed to join event", err)
	}
	return attendee, nil
}

func (s *Service) LeaveEvent(ctx context.Context, eventID, actorID string) error {
	if _, err := uuid.Parse(eventID); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"eventId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	membership, err := s.repo.GetAttendee(ctx, eventID, actorID)
	if err != nil || membership.Status != "active" {
		return apperrors.New(http.StatusNotFound, "attendee_not_found", "event attendee not found", nil)
	}
	if membership.Role == "organizer" {
		return apperrors.New(http.StatusConflict, "organizer_leave_blocked", "event organizer cannot leave directly", nil)
	}
	if err := s.repo.LeaveEvent(ctx, eventID, actorID); err != nil {
		if eventsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "attendee_not_found", "event attendee not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "event_leave_failed", "failed to leave event", err)
	}
	return nil
}

func normalizeLocationSource(raw string) string {
	value := strings.TrimSpace(strings.ToLower(raw))
	switch value {
	case "", "manual":
		return "manual"
	case "google_places":
		return "google_places"
	case "psgc_mapped":
		return "psgc_mapped"
	case "unmapped":
		return "unmapped"
	default:
		return "manual"
	}
}

func (s *Service) ListAttendees(ctx context.Context, eventID, viewerUserID string, page, limit int) ([]eventsrepo.EventAttendee, int, error) {
	event, err := s.GetEvent(ctx, eventID, viewerUserID)
	if err != nil {
		return nil, 0, err
	}
	if event.Visibility != "public" && strings.TrimSpace(viewerUserID) == "" {
		return nil, 0, apperrors.New(http.StatusForbidden, "forbidden", "event is not public", nil)
	}
	items, total, err := s.repo.ListAttendees(ctx, eventID, normalizePage(page), normalizeLimit(limit))
	if err != nil {
		return nil, 0, apperrors.New(http.StatusInternalServerError, "event_attendees_list_failed", "failed to list event attendees", err)
	}
	return items, total, nil
}

func normalizePage(value int) int {
	if value < 1 {
		return 1
	}
	return value
}

func normalizeLimit(value int) int {
	if value < 1 {
		return 20
	}
	if value > 100 {
		return 100
	}
	return value
}

func normalizeEventStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "draft":
		return "draft"
	case "cancelled":
		return "cancelled"
	case "completed":
		return "completed"
	case "published":
		return "published"
	default:
		return ""
	}
}

func normalizeCreateStatus(value string) string {
	normalized := normalizeEventStatus(value)
	if normalized == "" {
		return "draft"
	}
	return normalized
}

func normalizeVisibility(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "group_members", "group-members":
		return "group_members"
	case "invite_only", "invite-only":
		return "invite_only"
	default:
		return "public"
	}
}

func normalizeDifficulty(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "intermediate":
		return "intermediate"
	case "advanced":
		return "advanced"
	case "expert":
		return "expert"
	default:
		return "beginner"
	}
}

func normalizeEventType(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return "meetup"
	}
	if len(normalized) > 32 {
		return normalized[:32]
	}
	return normalized
}
