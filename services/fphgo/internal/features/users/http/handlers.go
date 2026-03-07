package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/features/users/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type Handlers struct {
	service   *service.Service
	validator httpx.Validator
}

func New(service *service.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) CreateUser(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[CreateUserRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
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

func (h *Handlers) GetUserByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "invalid_username", "username is required", nil))
		return
	}
	user, err := h.service.GetUserByUsername(r.Context(), username)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, UserResponse(user))
}

func (h *Handlers) SaveUser(w http.ResponseWriter, r *http.Request) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil))
		return
	}
	userID := chi.URLParam(r, "id")
	if err := h.service.SaveUser(r.Context(), identity.UserID, userID); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, SaveUserResponse{Saved: true})
}

func (h *Handlers) UnsaveUser(w http.ResponseWriter, r *http.Request) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil))
		return
	}
	userID := chi.URLParam(r, "id")
	if err := h.service.UnsaveUser(r.Context(), identity.UserID, userID); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) GetProfileByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "invalid_username", "username is required", nil))
		return
	}

	user, err := h.service.GetUserByUsername(r.Context(), username)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	visibility := "PUBLIC"
	details := ProfileDetails{
		ID:              user.ID,
		Username:        user.Username,
		Alias:           nil,
		Name:            user.DisplayName,
		Image:           nil,
		Bio:             user.Bio,
		Location:        nil,
		HomeDiveArea:    nil,
		ExperienceLevel: nil,
		Visibility:      visibility,
	}
	payload := ProfileResponse{
		Profile:       details,
		PersonalBests: []interface{}{},
	}
	// Web expects ApiEnvelope<ProfileResponse>: { data: { profile, personalBests } }
	httpx.JSON(w, http.StatusOK, map[string]any{"data": payload})
}
