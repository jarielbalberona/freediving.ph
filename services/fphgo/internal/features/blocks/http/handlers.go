package http

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	blocksservice "fphgo/internal/features/blocks/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/pagination"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   *blocksservice.Service
	validator httpx.Validator
}

func New(service *blocksservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) CreateBlock(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[CreateBlockRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	if err := h.service.BlockUser(r.Context(), actorID, req.BlockedUserID); err != nil {
		var validationErr blocksservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (h *Handlers) DeleteBlock(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	blockedID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "blockedUserId"), "blockedUserId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	if err := h.service.UnblockUser(r.Context(), actorID, blockedID); err != nil {
		var validationErr blocksservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListBlocks(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	limit, err := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"limit"},
			Code:    "custom",
			Message: "limit must be a positive integer",
		}})
		return
	}

	result, err := h.service.ListBlocks(r.Context(), actorID, limit, r.URL.Query().Get("cursor"))
	if err != nil {
		var validationErr blocksservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	items := make([]BlockedUser, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, BlockedUser{
			BlockedUserID: item.BlockedUserID,
			Username:      item.Username,
			DisplayName:   item.DisplayName,
			AvatarURL:     item.AvatarURL,
			CreatedAt:     item.CreatedAt,
		})
	}

	httpx.JSON(w, http.StatusOK, ListBlocksResponse{Items: items, NextCursor: result.NextCursor})
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}
