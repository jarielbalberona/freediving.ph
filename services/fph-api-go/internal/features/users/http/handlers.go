package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"fph-api-go/internal/features/users/service"
	"fph-api-go/internal/middleware"
	apperrors "fph-api-go/internal/shared/errors"
	"fph-api-go/internal/shared/httpx"
)

type Handlers struct {
	service *service.Service
}

func New(service *service.Service) *Handlers { return &Handlers{service: service} }

func (h *Handlers) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	user, err := h.service.CreateUser(r.Context(), service.CreateUserInput{
		Username:    req.Username,
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, UserResponse(user))
}

func (h *Handlers) GetMe(w http.ResponseWriter, r *http.Request) {
	clerkUserID, ok := middleware.CurrentAuth(r.Context())
	if !ok || clerkUserID == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil))
		return
	}

	user, err := h.service.EnsureLocalUserForClerk(r.Context(), clerkUserID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, UserResponse(user))
}

func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	user, err := h.service.GetUser(r.Context(), id)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, UserResponse(user))
}
