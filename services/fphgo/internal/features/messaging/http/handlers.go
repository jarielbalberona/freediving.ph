package http

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	messagingrepo "fphgo/internal/features/messaging/repo"
	messagingservice "fphgo/internal/features/messaging/service"
	usersservice "fphgo/internal/features/users/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/pagination"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service      *messagingservice.Service
	userResolver *usersservice.Service
	validator    httpx.Validator
}

func New(service *messagingservice.Service, userResolver *usersservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, userResolver: userResolver, validator: validator}
}

func (h *Handlers) CreateRequest(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateRequestRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	result, err := h.service.CreateRequest(r.Context(), messagingservice.CreateRequestInput{
		SenderID:       actorID,
		RecipientID:    req.RecipientID,
		Content:        req.Content,
		RequestID:      middleware.RequestIDFromContext(r.Context()),
		IdempotencyKey: idempotencyKeyFromHeader(r),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusCreated, RequestActionResponse(result))
}

func (h *Handlers) AcceptRequest(w http.ResponseWriter, r *http.Request) {
	h.resolveRequest(w, r, true)
}

func (h *Handlers) DeclineRequest(w http.ResponseWriter, r *http.Request) {
	h.resolveRequest(w, r, false)
}

func (h *Handlers) resolveRequest(w http.ResponseWriter, r *http.Request, accept bool) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	requestID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "requestId"), "requestId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	var result messagingservice.RequestAction
	if accept {
		result, err = h.service.AcceptRequest(r.Context(), requestID, actorID, middleware.RequestIDFromContext(r.Context()))
	} else {
		result, err = h.service.DeclineRequest(r.Context(), requestID, actorID, middleware.RequestIDFromContext(r.Context()))
	}
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, RequestActionResponse(result))
}

func (h *Handlers) Inbox(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	limit, parseErr := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if parseErr != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"limit"},
			Code:    "custom",
			Message: "limit must be a positive integer",
		}})
		return
	}

	result, err := h.service.Inbox(r.Context(), messagingservice.ConversationListInput{
		UserID: actorID,
		Limit:  limit,
		Cursor: r.URL.Query().Get("cursor"),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	items := make([]ConversationItem, 0, len(result.Items))
	for _, item := range result.Items {
		mapped := ConversationItem{
			ConversationID:  item.ConversationID,
			Status:          item.Status,
			InitiatorUserID: item.InitiatorUserID,
			UpdatedAt:       item.UpdatedAt.Format(time.RFC3339),
			Participant: ConversationParticipant{
				UserID:      item.OtherUserID,
				Username:    item.OtherUsername,
				DisplayName: item.OtherDisplayName,
				AvatarURL:   item.OtherAvatarURL,
				Trust: TrustCard{
					EmailVerified: item.OtherTrust.EmailVerified,
					PhoneVerified: item.OtherTrust.PhoneVerified,
					CertLevel:     item.OtherTrust.CertLevel,
					BuddyCount:    item.OtherTrust.BuddyCount,
					ReportCount:   item.OtherTrust.ReportCount,
				},
			},
			LastMessage:  mapMessage(item.LastMessage),
			UnreadCount:  item.UnreadCount,
			PendingCount: item.PendingCount,
		}
		if item.Status == "pending" && item.InitiatorUserID != actorID {
			preview := mapMessage(item.RequestPreview)
			mapped.RequestPreview = &preview
		}
		items = append(items, mapped)
	}

	httpx.JSON(w, http.StatusOK, ListInboxResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) ConversationMessages(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	conversationID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "conversationId"), "conversationId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	limit, parseErr := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if parseErr != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"limit"},
			Code:    "custom",
			Message: "limit must be a positive integer",
		}})
		return
	}

	result, err := h.service.ConversationMessages(r.Context(), messagingservice.ConversationMessagesInput{
		ActorID:        actorID,
		ConversationID: conversationID,
		Limit:          limit,
		Cursor:         r.URL.Query().Get("cursor"),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	items := make([]MessageItem, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapMessage(item))
	}
	httpx.JSON(w, http.StatusOK, ListConversationMessagesResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) SendConversationMessage(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	conversationID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "conversationId"), "conversationId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[SendConversationMessageRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	msg, err := h.service.SendConversationMessage(r.Context(), messagingservice.SendConversationMessageInput{
		ActorID:        actorID,
		ConversationID: conversationID,
		Content:        req.Content,
		Metadata:       mapMessageMetadata(req.Metadata),
		RequestID:      middleware.RequestIDFromContext(r.Context()),
		IdempotencyKey: idempotencyKeyFromHeader(r),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, SendMessageResponse{Message: mapMessage(msg)})
}

func (h *Handlers) MarkRead(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[MarkReadRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	var messageID *int64
	if req.MessageID != nil {
		parsed, parseErr := strconv.ParseInt(*req.MessageID, 10, 64)
		if parseErr != nil {
			httpx.WriteValidationError(w, []validatex.Issue{{
				Path:    []any{"messageId"},
				Code:    "custom",
				Message: "messageId must be a numeric string",
			}})
			return
		}
		messageID = &parsed
	}

	if err := h.service.MarkRead(r.Context(), messagingservice.MarkReadInput{
		ActorID:        actorID,
		ConversationID: req.ConversationID,
		MessageID:      messageID,
		RequestID:      middleware.RequestIDFromContext(r.Context()),
	}); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, MarkReadResponse{ConversationID: req.ConversationID, Marked: true})
}

func (h *Handlers) requireLocalActorID(r *http.Request) (string, error) {
	if identity, ok := middleware.CurrentIdentity(r.Context()); ok && identity.UserID != "" {
		return identity.UserID, nil
	}
	clerkUserID, ok := middleware.CurrentAuth(r.Context())
	if !ok || clerkUserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	if h.userResolver == nil {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	user, err := h.userResolver.EnsureLocalUserForClerk(r.Context(), clerkUserID)
	if err != nil {
		return "", err
	}
	return user.ID, nil
}

func mapMessage(input messagingrepo.Message) MessageItem {
	return MessageItem{
		ConversationID: input.ConversationID,
		MessageID:      strconv.FormatInt(input.ID, 10),
		SenderID:       input.SenderID,
		Content:        input.Content,
		Metadata:       mapMessageMetadataOut(input.Metadata),
		CreatedAt:      input.CreatedAt.Format(time.RFC3339),
	}
}

func mapMessageMetadata(input *MessageMetadata) *messagingrepo.MessageMetadata {
	if input == nil {
		return nil
	}
	return &messagingrepo.MessageMetadata{
		Type:         input.Type,
		DiveSiteID:   input.DiveSiteID,
		DiveSiteSlug: input.DiveSiteSlug,
		DiveSiteName: input.DiveSiteName,
		DiveSiteArea: input.DiveSiteArea,
		TimeWindow:   input.TimeWindow,
		DateStart:    input.DateStart,
		DateEnd:      input.DateEnd,
		Note:         input.Note,
	}
}

func mapMessageMetadataOut(input *messagingrepo.MessageMetadata) *MessageMetadata {
	if input == nil {
		return nil
	}
	return &MessageMetadata{
		Type:         input.Type,
		DiveSiteID:   input.DiveSiteID,
		DiveSiteSlug: input.DiveSiteSlug,
		DiveSiteName: input.DiveSiteName,
		DiveSiteArea: input.DiveSiteArea,
		TimeWindow:   input.TimeWindow,
		DateStart:    input.DateStart,
		DateEnd:      input.DateEnd,
		Note:         input.Note,
	}
}

func idempotencyKeyFromHeader(r *http.Request) *string {
	key := strings.TrimSpace(r.Header.Get("X-Idempotency-Key"))
	if key == "" {
		return nil
	}
	return &key
}
