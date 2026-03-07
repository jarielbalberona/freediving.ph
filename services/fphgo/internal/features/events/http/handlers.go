package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	eventsrepo "fphgo/internal/features/events/repo"
	eventsservice "fphgo/internal/features/events/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/mediaurl"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   *eventsservice.Service
	validator httpx.Validator
}

func New(service *eventsservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) ListEvents(w http.ResponseWriter, r *http.Request) {
	viewerID := optionalActorID(r)
	page := parseIntQuery(r, "page", 1)
	limit := parseIntQuery(r, "limit", 20)
	items, total, err := h.service.ListEvents(
		r.Context(),
		viewerID,
		r.URL.Query().Get("search"),
		r.URL.Query().Get("status"),
		r.URL.Query().Get("groupId"),
		page,
		limit,
	)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]EventResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapEvent(item))
	}
	httpx.JSON(w, http.StatusOK, ListEventsResponse{Events: mapped, Pagination: paginate(page, limit, total)})
}

func (h *Handlers) GetEvent(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "eventId")
	event, err := h.service.GetEvent(r.Context(), eventID, optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, EventDetailResponse{Event: mapEvent(event)})
}

func (h *Handlers) CreateEvent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateEventRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	startsAt, err := parseOptionalRFC3339(req.StartsAt)
	if err != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"startsAt"},
			Code:    "invalid_datetime",
			Message: "Must be a valid RFC3339 datetime",
		}})
		return
	}
	endsAt, err := parseOptionalRFC3339(req.EndsAt)
	if err != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"endsAt"},
			Code:    "invalid_datetime",
			Message: "Must be a valid RFC3339 datetime",
		}})
		return
	}
	var groupID *string
	if strings.TrimSpace(req.GroupID) != "" {
		value := strings.TrimSpace(req.GroupID)
		groupID = &value
	}
	event, err := h.service.CreateEvent(r.Context(), actorID, eventsrepo.CreateEventInput{
		Title:            req.Title,
		Description:      req.Description,
		Location:         req.Location,
		LocationName:     req.LocationName,
		FormattedAddress: req.FormattedAddress,
		Latitude:         req.Latitude,
		Longitude:        req.Longitude,
		GooglePlaceID:    req.GooglePlaceID,
		RegionCode:       req.RegionCode,
		ProvinceCode:     req.ProvinceCode,
		CityCode:         req.CityCode,
		BarangayCode:     req.BarangayCode,
		LocationSource:   req.LocationSource,
		StartsAt:         startsAt,
		EndsAt:           endsAt,
		Status:           req.Status,
		Visibility:       req.Visibility,
		EventType:        req.Type,
		Difficulty:       req.Difficulty,
		MaxAttendees:     req.MaxAttendees,
		OrganizerUserID:  actorID,
		GroupID:          groupID,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, CreateEventResponse{Event: mapEvent(event)})
}

func (h *Handlers) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "eventId")
	req, issues, ok := httpx.DecodeAndValidate[UpdateEventRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	startsAt, err := parseOptionalRFC3339Ptr(req.StartsAt)
	if err != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"startsAt"},
			Code:    "invalid_datetime",
			Message: "Must be a valid RFC3339 datetime",
		}})
		return
	}
	endsAt, err := parseOptionalRFC3339Ptr(req.EndsAt)
	if err != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"endsAt"},
			Code:    "invalid_datetime",
			Message: "Must be a valid RFC3339 datetime",
		}})
		return
	}
	event, err := h.service.UpdateEvent(r.Context(), eventID, eventsrepo.UpdateEventInput{
		Title:            req.Title,
		Description:      req.Description,
		Location:         req.Location,
		LocationName:     req.LocationName,
		FormattedAddress: req.FormattedAddress,
		Latitude:         req.Latitude,
		Longitude:        req.Longitude,
		GooglePlaceID:    req.GooglePlaceID,
		RegionCode:       req.RegionCode,
		ProvinceCode:     req.ProvinceCode,
		CityCode:         req.CityCode,
		BarangayCode:     req.BarangayCode,
		LocationSource:   req.LocationSource,
		StartsAt:         startsAt,
		EndsAt:           endsAt,
		Status:           req.Status,
		Visibility:       req.Visibility,
		EventType:        req.Type,
		Difficulty:       req.Difficulty,
		MaxAttendees:     req.MaxAttendees,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, CreateEventResponse{Event: mapEvent(event)})
}

func (h *Handlers) JoinEvent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	eventID := chi.URLParam(r, "eventId")
	req, issues, ok := httpx.DecodeAndValidate[JoinEventRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	attendee, err := h.service.JoinEvent(r.Context(), eventID, actorID, req.Notes)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, JoinEventResponse{Attendee: mapAttendee(attendee)})
}

func (h *Handlers) LeaveEvent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	eventID := chi.URLParam(r, "eventId")
	if err := h.service.LeaveEvent(r.Context(), eventID, actorID); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListAttendees(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "eventId")
	page := parseIntQuery(r, "page", 1)
	limit := parseIntQuery(r, "limit", 20)
	items, total, err := h.service.ListAttendees(r.Context(), eventID, optionalActorID(r), page, limit)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]EventAttendeeResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapAttendee(item))
	}
	httpx.JSON(w, http.StatusOK, ListEventAttendeesResponse{Attendees: mapped, Pagination: paginate(page, limit, total)})
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func optionalActorID(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok {
		return ""
	}
	return strings.TrimSpace(identity.UserID)
}

func parseIntQuery(r *http.Request, key string, fallback int) int {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

func parseOptionalRFC3339(value string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, err
	}
	utc := parsed.UTC()
	return &utc, nil
}

func parseOptionalRFC3339Ptr(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	return parseOptionalRFC3339(*value)
}

func paginate(page, limit, total int) Pagination {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr eventsservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func mapEvent(item eventsrepo.Event) EventResponse {
	return EventResponse{
		ID:               item.ID,
		Title:            item.Title,
		Description:      item.Description,
		Location:         item.Location,
		LocationName:     item.LocationName,
		FormattedAddress: item.FormattedAddress,
		Latitude:         item.Latitude,
		Longitude:        item.Longitude,
		GooglePlaceID:    item.GooglePlaceID,
		RegionCode:       item.RegionCode,
		ProvinceCode:     item.ProvinceCode,
		CityCode:         item.CityCode,
		BarangayCode:     item.BarangayCode,
		LocationSource:   item.LocationSource,
		StartsAt:         item.StartsAt,
		EndsAt:           item.EndsAt,
		Status:           item.Status,
		Visibility:       item.Visibility,
		Type:             item.EventType,
		Difficulty:       item.Difficulty,
		MaxAttendees:     item.MaxAttendees,
		CurrentAttendees: item.CurrentAttendees,
		OrganizerUserID:  item.OrganizerUserID,
		GroupID:          item.GroupID,
		ViewerJoined:     item.ViewerJoined,
		CreatedAt:        item.CreatedAt,
		UpdatedAt:        item.UpdatedAt,
	}
}

func mapAttendee(item eventsrepo.EventAttendee) EventAttendeeResponse {
	return EventAttendeeResponse{
		EventID:     item.EventID,
		UserID:      item.UserID,
		Role:        item.Role,
		Status:      item.Status,
		JoinedAt:    item.JoinedAt,
		Notes:       item.Notes,
		DisplayName: item.DisplayName,
		Username:    item.Username,
		AvatarURL:   mediaurl.MaterializeWithDefault(item.AvatarURL),
	}
}
