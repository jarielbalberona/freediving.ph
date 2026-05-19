package http

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	homeservice "fphgo/internal/features/home/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

type service interface {
	NearbyConditions(ctx context.Context, input homeservice.NearbyConditionsInput) (homeservice.NearbyConditionsResult, error)
}

type Handlers struct {
	service service
}

func New(service service) *Handlers {
	return &Handlers{service: service}
}

func (h *Handlers) NearbyConditions(w http.ResponseWriter, r *http.Request) {
	input, err := parseNearbyConditionsQuery(r)
	if err != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"query"},
			Code:    "custom",
			Message: err.Error(),
		}})
		return
	}

	result, svcErr := h.service.NearbyConditions(r.Context(), input)
	if svcErr != nil {
		writeError(w, r, svcErr)
		return
	}

	httpx.JSON(w, http.StatusOK, NearbyConditionsResponse{
		LocationLabel: result.LocationLabel,
		Source:        string(result.Source),
		UpdatedAt:     result.UpdatedAt,
		Cards: NearbyConditionCards{
			Current:    mapCard(result.Cards.Current),
			Visibility: mapCard(result.Cards.Visibility),
			Temp:       mapCard(result.Cards.Temp),
			Wind:       mapCard(result.Cards.Wind),
			Sunrise:    mapCard(result.Cards.Sunrise),
		},
	})
}

func parseNearbyConditionsQuery(r *http.Request) (homeservice.NearbyConditionsInput, error) {
	rawLat := strings.TrimSpace(r.URL.Query().Get("lat"))
	rawLng := strings.TrimSpace(r.URL.Query().Get("lng"))
	if rawLat == "" || rawLng == "" {
		return homeservice.NearbyConditionsInput{}, nil
	}

	lat, err := strconv.ParseFloat(rawLat, 64)
	if err != nil {
		return homeservice.NearbyConditionsInput{}, errors.New("lat must be a number")
	}
	lng, err := strconv.ParseFloat(rawLng, 64)
	if err != nil {
		return homeservice.NearbyConditionsInput{}, errors.New("lng must be a number")
	}
	if lat < -90 || lat > 90 {
		return homeservice.NearbyConditionsInput{}, errors.New("lat must be between -90 and 90")
	}
	if lng < -180 || lng > 180 {
		return homeservice.NearbyConditionsInput{}, errors.New("lng must be between -180 and 180")
	}
	return homeservice.NearbyConditionsInput{Lat: &lat, Lng: &lng}, nil
}

func mapCard(card homeservice.NearbyConditionCard) NearbyConditionCard {
	return NearbyConditionCard{
		Label:      card.Label,
		Value:      card.Value,
		Confidence: string(card.Confidence),
	}
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), appErr)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusInternalServerError, "internal_error", "internal server error", err))
}
