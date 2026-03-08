package http

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	feedservice "fphgo/internal/features/feed/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

type service interface {
	Home(ctx context.Context, input feedservice.HomeInput) (feedservice.HomeResult, error)
	RecordImpressions(ctx context.Context, userID, sessionID string, mode feedservice.Mode, rows []feedservice.TelemetryImpression) error
	RecordActions(ctx context.Context, userID, sessionID string, mode feedservice.Mode, rows []feedservice.TelemetryAction) error
}

type Handlers struct {
	service   service
	validator httpx.Validator
}

func New(service service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) Home(w http.ResponseWriter, r *http.Request) {
	identity, _ := middleware.CurrentIdentity(r.Context())
	userID := identity.UserID

	mode := feedservice.ParseMode(r.URL.Query().Get("mode"))
	limit := 20
	if rawLimit := strings.TrimSpace(r.URL.Query().Get("limit")); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil {
			limit = parsed
		}
	}
	result, err := h.service.Home(r.Context(), feedservice.HomeInput{
		UserID: userID,
		Mode:   mode,
		Cursor: r.URL.Query().Get("cursor"),
		Region: r.URL.Query().Get("region"),
		Limit:  limit,
	})
	if err != nil {
		h.writeError(w, r, err)
		return
	}

	items := make([]HomeFeedItem, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, HomeFeedItem{
			ID:         item.ID,
			Type:       string(item.Type),
			EntityID:   item.EntityID,
			Score:      item.Score,
			Reasons:    item.Reasons,
			TypeLabel:  item.TypeLabel,
			TypeHint:   item.TypeHint,
			RankLabel:  item.RankLabel,
			RankHint:   item.RankHint,
			Tone:       item.Tone,
			DetailHref: item.DetailHref,
			AuthorHref: item.AuthorHref,
			CreatedAt:  item.CreatedAt,
			Payload:    item.Payload,
		})
	}
	httpx.JSON(w, http.StatusOK, HomeResponse{
		Context: HomeContext{
			Greeting:    result.Context.Greeting,
			Message:     result.Context.Message,
			SafetyBadge: result.Context.SafetyBadge,
		},
		QuickActions: mapQuickActions(result.QuickActions),
		NearbyCondition: HomeNearbyCondition{
			Spot:       result.NearbyCondition.Spot,
			DistanceKm: result.NearbyCondition.DistanceKm,
			Safety:     result.NearbyCondition.Safety,
			Current:    result.NearbyCondition.Current,
			Visibility: result.NearbyCondition.Visibility,
			WaterTemp:  result.NearbyCondition.WaterTemp,
			Wind:       result.NearbyCondition.Wind,
			Sunrise:    result.NearbyCondition.Sunrise,
		},
		Items:      items,
		NextCursor: result.NextCursor,
	})
}

func (h *Handlers) Impressions(w http.ResponseWriter, r *http.Request) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil))
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[LogImpressionsRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	mode := feedservice.ParseMode(req.Mode)
	rows := make([]feedservice.TelemetryImpression, 0, len(req.Items))
	for idx, item := range req.Items {
		seenAt := time.Now().UTC()
		if strings.TrimSpace(item.SeenAt) != "" {
			parsed, err := time.Parse(time.RFC3339, item.SeenAt)
			if err != nil {
				httpx.WriteValidationError(w, issueAt(idx, "seenAt", "invalid_datetime", "Must be a valid RFC3339 datetime"))
				return
			}
			seenAt = parsed.UTC()
		}
		rows = append(rows, feedservice.TelemetryImpression{
			FeedItemID: item.FeedItemID,
			EntityType: item.EntityType,
			EntityID:   item.EntityID,
			Mode:       mode,
			Position:   item.Position,
			SeenAt:     seenAt,
		})
	}
	if err := h.service.RecordImpressions(r.Context(), identity.UserID, req.SessionID, mode, rows); err != nil {
		h.writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) Actions(w http.ResponseWriter, r *http.Request) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil))
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[LogActionsRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	mode := feedservice.ParseMode(req.Mode)
	rows := make([]feedservice.TelemetryAction, 0, len(req.Items))
	for idx, item := range req.Items {
		createdAt := time.Now().UTC()
		if strings.TrimSpace(item.CreatedAt) != "" {
			parsed, err := time.Parse(time.RFC3339, item.CreatedAt)
			if err != nil {
				httpx.WriteValidationError(w, issueAt(idx, "createdAt", "invalid_datetime", "Must be a valid RFC3339 datetime"))
				return
			}
			createdAt = parsed.UTC()
		}
		rows = append(rows, feedservice.TelemetryAction{
			FeedItemID: item.FeedItemID,
			EntityType: item.EntityType,
			EntityID:   item.EntityID,
			ActionType: item.ActionType,
			Mode:       mode,
			Value:      item.Value,
			CreatedAt:  createdAt,
		})
	}
	if err := h.service.RecordActions(r.Context(), identity.UserID, req.SessionID, mode, rows); err != nil {
		h.writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) writeError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr feedservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func mapQuickActions(items []feedservice.QuickAction) []HomeQuickAction {
	out := make([]HomeQuickAction, 0, len(items))
	for _, item := range items {
		out = append(out, HomeQuickAction{Type: item.Type, Label: item.Label})
	}
	return out
}

func issueAt(index int, field, code, message string) []validatex.Issue {
	return []validatex.Issue{{
		Path:    []any{"items", index, field},
		Code:    code,
		Message: message,
	}}
}
