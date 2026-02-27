package http

import (
	"net/http"

	exploreservice "fph-api-go/internal/features/explore/service"
	"fph-api-go/internal/middleware"
	"fph-api-go/internal/shared/httpx"
)

type Handlers struct {
	service *exploreservice.Service
}

func New(service *exploreservice.Service) *Handlers { return &Handlers{service: service} }

func (h *Handlers) ListDiveSites(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListDiveSites(r.Context(), r.URL.Query().Get("q"))
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	response := make([]DiveSiteResponse, 0, len(items))
	for _, item := range items {
		response = append(response, DiveSiteResponse{ID: item.ID, Name: item.Name, Location: item.Location})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": response})
}
