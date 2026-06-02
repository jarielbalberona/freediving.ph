package http

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	journeyservice "fphgo/internal/features/dive_journey/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

type journeyService interface {
	ListProfileJourney(ctx context.Context, input journeyservice.ListProfileJourneyInput) ([]journeyservice.JourneyEntry, error)
	CreateManualEntry(ctx context.Context, input journeyservice.UpsertManualJourneyEntryInput) (journeyservice.JourneyEntry, error)
	UpdateManualEntry(ctx context.Context, input journeyservice.UpsertManualJourneyEntryInput) (journeyservice.JourneyEntry, error)
	DeleteManualEntry(ctx context.Context, actorID, entryID string) error
}

type Handlers struct {
	service   journeyService
	validator httpx.Validator
}

func New(service journeyService, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) ListProfileJourney(w http.ResponseWriter, r *http.Request) {
	limit := int32(20)
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 50 {
			httpx.WriteValidationError(w, []validatex.Issue{{
				Path:    []any{"limit"},
				Code:    "invalid",
				Message: "limit must be between 1 and 50",
			}})
			return
		}
		limit = int32(parsed)
	}
	items, err := h.service.ListProfileJourney(r.Context(), journeyservice.ListProfileJourneyInput{
		Username:     chi.URLParam(r, "username"),
		ViewerUserID: actorIDIfPresent(r),
		Limit:        limit,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, JourneyResponse{Items: entriesToDTO(items)})
}

func (h *Handlers) CreateManualEntry(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, ok := h.decodeUpsert(w, r)
	if !ok {
		return
	}
	entry, err := h.service.CreateManualEntry(r.Context(), requestToService(actor, "", req))
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, JourneyEntryResponse{Entry: entryToDTO(entry)})
}

func (h *Handlers) UpdateManualEntry(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, ok := h.decodeUpsert(w, r)
	if !ok {
		return
	}
	entry, err := h.service.UpdateManualEntry(r.Context(), requestToService(actor, chi.URLParam(r, "entryID"), req))
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, JourneyEntryResponse{Entry: entryToDTO(entry)})
}

func (h *Handlers) DeleteManualEntry(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	if err := h.service.DeleteManualEntry(r.Context(), actor, chi.URLParam(r, "entryID")); err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) decodeUpsert(w http.ResponseWriter, r *http.Request) (UpsertManualJourneyEntryRequest, bool) {
	req, issues, ok := httpx.DecodeAndValidate[UpsertManualJourneyEntryRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return UpsertManualJourneyEntryRequest{}, false
	}
	return req, true
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr journeyservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func requestToService(actorID, entryID string, req UpsertManualJourneyEntryRequest) journeyservice.UpsertManualJourneyEntryInput {
	var occurredAt *time.Time
	if req.OccurredAt != nil && strings.TrimSpace(*req.OccurredAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*req.OccurredAt))
		if err == nil {
			occurredAt = &parsed
		}
	}
	diveSiteID := ""
	if req.DiveSiteID != nil {
		diveSiteID = strings.TrimSpace(*req.DiveSiteID)
	}
	return journeyservice.UpsertManualJourneyEntryInput{
		ActorID:    actorID,
		EntryID:    entryID,
		Title:      req.Title,
		Body:       req.Body,
		DiveSiteID: diveSiteID,
		Visibility: req.Visibility,
		OccurredAt: occurredAt,
		MediaIDs:   append([]string(nil), req.MediaIDs...),
	}
}

func entriesToDTO(items []journeyservice.JourneyEntry) []JourneyEntry {
	out := make([]JourneyEntry, 0, len(items))
	for _, item := range items {
		out = append(out, entryToDTO(item))
	}
	return out
}

func entryToDTO(item journeyservice.JourneyEntry) JourneyEntry {
	return JourneyEntry{
		ID:              item.ID,
		UserID:          item.UserID,
		Type:            item.Type,
		Title:           item.Title,
		Body:            item.Body,
		DiveSiteID:      item.DiveSiteID,
		SourceType:      item.SourceType,
		SourceID:        item.SourceID,
		CoverMediaID:    item.CoverMediaID,
		MediaIDs:        append([]string(nil), item.MediaIDs...),
		Visibility:      item.Visibility,
		VisibilityLabel: item.VisibilityLabel,
		State:           item.State,
		OccurredAt:      formatTime(item.OccurredAt),
		CreatedAt:       formatTime(item.CreatedAt),
		UpdatedAt:       formatTime(item.UpdatedAt),
	}
}

func formatTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func actorIDIfPresent(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok {
		return ""
	}
	return identity.UserID
}
