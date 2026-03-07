package http

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	moderationservice "fphgo/internal/features/moderation_actions/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   *moderationservice.Service
	validator httpx.Validator
}

func New(service *moderationservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) SuspendUser(w http.ResponseWriter, r *http.Request) {
	h.handleUserAction(w, r, h.service.SuspendUser)
}

func (h *Handlers) UnsuspendUser(w http.ResponseWriter, r *http.Request) {
	h.handleUserAction(w, r, h.service.UnsuspendUser)
}

func (h *Handlers) SetUserReadOnly(w http.ResponseWriter, r *http.Request) {
	h.handleUserAction(w, r, h.service.SetUserReadOnly)
}

func (h *Handlers) ClearUserReadOnly(w http.ResponseWriter, r *http.Request) {
	h.handleUserAction(w, r, h.service.ClearUserReadOnly)
}

func (h *Handlers) HideThread(w http.ResponseWriter, r *http.Request) {
	h.handleThreadAction(w, r, h.service.HideThread)
}

func (h *Handlers) UnhideThread(w http.ResponseWriter, r *http.Request) {
	h.handleThreadAction(w, r, h.service.UnhideThread)
}

func (h *Handlers) HideComment(w http.ResponseWriter, r *http.Request) {
	h.handleCommentAction(w, r, h.service.HideComment)
}

func (h *Handlers) UnhideComment(w http.ResponseWriter, r *http.Request) {
	h.handleCommentAction(w, r, h.service.UnhideComment)
}

func (h *Handlers) handleUserAction(
	w http.ResponseWriter,
	r *http.Request,
	run func(ctx context.Context, appUserID string, input moderationservice.ActionInput) (moderationservice.ModerationAction, error),
) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	appUserID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "appUserId"), "appUserId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[ActionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	result, err := run(r.Context(), appUserID, moderationservice.ActionInput{
		ActorUserID: actorID,
		Reason:      req.Reason,
		ReportID:    req.ReportID,
	})
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, ActionResponse{Action: mapAction(result)})
}

func (h *Handlers) handleThreadAction(
	w http.ResponseWriter,
	r *http.Request,
	run func(ctx context.Context, threadID string, input moderationservice.ActionInput) (moderationservice.ModerationAction, error),
) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	threadID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "threadId"), "threadId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[ActionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	result, err := run(r.Context(), threadID, moderationservice.ActionInput{
		ActorUserID: actorID,
		Reason:      req.Reason,
		ReportID:    req.ReportID,
	})
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, ActionResponse{Action: mapAction(result)})
}

func (h *Handlers) handleCommentAction(
	w http.ResponseWriter,
	r *http.Request,
	run func(ctx context.Context, commentID int64, input moderationservice.ActionInput) (moderationservice.ModerationAction, error),
) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	commentIDRaw := chi.URLParam(r, "commentId")
	commentID, parseErr := strconv.ParseInt(commentIDRaw, 10, 64)
	if parseErr != nil || commentID <= 0 {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"commentId"},
			Code:    "custom",
			Message: "commentId must be a positive integer",
		}})
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[ActionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	result, err := run(r.Context(), commentID, moderationservice.ActionInput{
		ActorUserID: actorID,
		Reason:      req.Reason,
		ReportID:    req.ReportID,
	})
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}

	httpx.JSON(w, http.StatusOK, ActionResponse{Action: mapAction(result)})
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr moderationservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func mapAction(input moderationservice.ModerationAction) ModerationAction {
	return ModerationAction{
		ID:          input.ID,
		ActorUserID: input.ActorUserID,
		TargetType:  input.TargetType,
		TargetID:    input.TargetID,
		Action:      input.Action,
		Reason:      input.Reason,
		ReportID:    input.ReportID,
		CreatedAt:   input.CreatedAt,
	}
}
