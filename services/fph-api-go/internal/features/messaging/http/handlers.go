package http

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	messagingservice "fph-api-go/internal/features/messaging/service"
	usersservice "fph-api-go/internal/features/users/service"
	"fph-api-go/internal/middleware"
	apperrors "fph-api-go/internal/shared/errors"
	"fph-api-go/internal/shared/httpx"
)

type Handlers struct {
	service      *messagingservice.Service
	userResolver *usersservice.Service
}

func New(service *messagingservice.Service, userResolver *usersservice.Service) *Handlers {
	return &Handlers{service: service, userResolver: userResolver}
}

func (h *Handlers) Send(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	var req SendMessageRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	result, err := h.service.SendMessage(r.Context(), messagingservice.SendMessageInput{
		SenderID:    actorID,
		RecipientID: req.RecipientID,
		Content:     req.Content,
		RequestID:   middleware.RequestIDFromContext(r.Context()),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, ConversationActionResponse(result))
}

func (h *Handlers) Accept(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	conversationID := chi.URLParam(r, "conversationId")
	result, err := h.service.Accept(r.Context(), conversationID, actorID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, ConversationActionResponse(result))
}

func (h *Handlers) Reject(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	conversationID := chi.URLParam(r, "conversationId")
	result, err := h.service.Reject(r.Context(), conversationID, actorID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, ConversationActionResponse(result))
}

func (h *Handlers) Inbox(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	items, err := h.service.Inbox(r.Context(), actorID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	response := make([]MessageItem, 0, len(items))
	for _, item := range items {
		response = append(response, MessageItem{
			ConversationID: item.ConversationID,
			MessageID:      item.MessageID,
			SenderID:       item.SenderID,
			Content:        item.Content,
			Status:         item.Status,
			CreatedAt:      item.CreatedAt.Format(time.RFC3339),
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": response})
}

func (h *Handlers) Requests(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	items, err := h.service.Requests(r.Context(), actorID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	response := make([]MessageItem, 0, len(items))
	for _, item := range items {
		response = append(response, MessageItem{
			ConversationID: item.ConversationID,
			MessageID:      item.MessageID,
			SenderID:       item.SenderID,
			Content:        item.Content,
			Status:         item.Status,
			CreatedAt:      item.CreatedAt.Format(time.RFC3339),
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": response})
}

func (h *Handlers) requireLocalActorID(r *http.Request) (string, error) {
	clerkUserID, ok := middleware.CurrentAuth(r.Context())
	if !ok || clerkUserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	user, err := h.userResolver.EnsureLocalUserForClerk(r.Context(), clerkUserID)
	if err != nil {
		return "", err
	}
	return user.ID, nil
}
