package http

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	buddiesrepo "fphgo/internal/features/buddies/repo"
	buddiesservice "fphgo/internal/features/buddies/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type Handlers struct {
	service   *buddiesservice.Service
	validator httpx.Validator
}

func New(service *buddiesservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) CreateRequest(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[CreateBuddyRequestRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	request, err := h.service.CreateRequest(r.Context(), actorID, req.TargetUserID)
	if err != nil {
		var validationErr buddiesservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, CreateBuddyRequestResponse{Request: mapRequest(request)})
}

func (h *Handlers) ListIncomingRequests(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	items, err := h.service.ListIncoming(r.Context(), actorID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	resp := make([]IncomingBuddyRequest, 0, len(items))
	for _, item := range items {
		resp = append(resp, IncomingBuddyRequest{
			Request:   mapRequest(item.Request),
			Requester: mapProfile(item.From),
		})
	}
	httpx.JSON(w, http.StatusOK, ListIncomingBuddyRequestsResponse{Items: resp})
}

func (h *Handlers) ListOutgoingRequests(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	items, err := h.service.ListOutgoing(r.Context(), actorID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	resp := make([]OutgoingBuddyRequest, 0, len(items))
	for _, item := range items {
		resp = append(resp, OutgoingBuddyRequest{
			Request: mapRequest(item.Request),
			Target:  mapProfile(item.To),
		})
	}
	httpx.JSON(w, http.StatusOK, ListOutgoingBuddyRequestsResponse{Items: resp})
}

func (h *Handlers) AcceptRequest(w http.ResponseWriter, r *http.Request) {
	h.resolveRequest(w, r, true)
}

func (h *Handlers) DeclineRequest(w http.ResponseWriter, r *http.Request) {
	h.resolveRequest(w, r, false)
}

func (h *Handlers) resolveRequest(w http.ResponseWriter, r *http.Request, accept bool) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	requestID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "requestId"), "requestId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	var request buddiesrepo.BuddyRequest
	if accept {
		request, err = h.service.AcceptRequest(r.Context(), actorID, requestID)
	} else {
		request, err = h.service.DeclineRequest(r.Context(), actorID, requestID)
	}
	if err != nil {
		var validationErr buddiesservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, CreateBuddyRequestResponse{Request: mapRequest(request)})
}

func (h *Handlers) CancelRequest(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	requestID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "requestId"), "requestId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	request, err := h.service.CancelRequest(r.Context(), actorID, requestID)
	if err != nil {
		var validationErr buddiesservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, CreateBuddyRequestResponse{Request: mapRequest(request)})
}

func (h *Handlers) RemoveBuddy(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	buddyUserID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "buddyUserId"), "buddyUserId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	if err := h.service.RemoveBuddy(r.Context(), actorID, buddyUserID); err != nil {
		var validationErr buddiesservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListBuddies(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	items, err := h.service.ListBuddies(r.Context(), actorID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	resp := make([]BuddyProfile, 0, len(items))
	for _, item := range items {
		resp = append(resp, mapProfile(buddiesrepo.BuddyProfile{
			UserID:      item.UserID,
			Username:    item.Username,
			DisplayName: item.DisplayName,
			AvatarURL:   item.AvatarURL,
		}))
	}

	httpx.JSON(w, http.StatusOK, ListBuddiesResponse{Items: resp})
}

func (h *Handlers) BuddyPreview(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	targetUserID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "userId"), "userId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	result, err := h.service.BuddyPreview(r.Context(), actorID, targetUserID)
	if err != nil {
		var validationErr buddiesservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	items := make([]BuddyProfile, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapProfile(buddiesrepo.BuddyProfile{
			UserID:      item.UserID,
			Username:    item.Username,
			DisplayName: item.DisplayName,
			AvatarURL:   item.AvatarURL,
		}))
	}

	httpx.JSON(w, http.StatusOK, BuddyPreviewResponse{Count: result.Count, Items: items})
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func mapRequest(input buddiesrepo.BuddyRequest) BuddyRequest {
	return BuddyRequest{
		ID:              input.ID,
		RequesterUserID: input.RequesterUserID,
		TargetUserID:    input.TargetUserID,
		Status:          input.Status,
		CreatedAt:       input.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       input.UpdatedAt.Format(time.RFC3339),
	}
}

func mapProfile(input buddiesrepo.BuddyProfile) BuddyProfile {
	return BuddyProfile{
		UserID:      input.UserID,
		Username:    input.Username,
		DisplayName: input.DisplayName,
		AvatarURL:   input.AvatarURL,
	}
}
