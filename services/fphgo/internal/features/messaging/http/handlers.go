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
	"fphgo/internal/shared/mediaurl"
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
				AvatarURL:   mediaurl.MaterializeWithDefault(item.OtherAvatarURL),
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
	clerkUserID, ok := middleware.CurrentAuth(r.Context())
	if ok && clerkUserID != "" && h.userResolver != nil {
		user, err := h.userResolver.EnsureLocalUserForClerk(r.Context(), clerkUserID)
		if err != nil {
			return "", err
		}
		return user.ID, nil
	}

	if identity, ok := middleware.CurrentIdentity(r.Context()); ok && identity.UserID != "" {
		return identity.UserID, nil
	}

	return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
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

func (h *Handlers) OpenDirectThread(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[OpenDirectThreadRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.OpenOrCreateDirectThread(r.Context(), messagingservice.OpenDirectThreadInput{
		ActorID:      actorID,
		TargetUserID: req.TargetUserID,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapThreadDetail(result, actorID))
}

func (h *Handlers) ListThreads(w http.ResponseWriter, r *http.Request) {
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

	result, err := h.service.ListThreads(r.Context(), messagingservice.ThreadListInput{
		ActorID:  actorID,
		Category: r.URL.Query().Get("category"),
		Cursor:   r.URL.Query().Get("cursor"),
		Limit:    limit,
		Search:   r.URL.Query().Get("q"),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	items := make([]ThreadSummaryItem, 0, len(result.Items))
	for _, item := range result.Items {
		var lastMessage *ThreadMessageItem
		if item.LastMessage != nil {
			mapped := mapThreadMessage(*item.LastMessage, actorID)
			lastMessage = &mapped
		}
		items = append(items, ThreadSummaryItem{
			ID:       item.ThreadID,
			Type:     string(item.Type),
			Category: string(item.Category),
			Participant: ConversationParticipant{
				UserID:      item.Participant.UserID,
				Username:    item.Participant.Username,
				DisplayName: item.Participant.DisplayName,
				AvatarURL:   mediaurl.MaterializeWithDefault(item.Participant.AvatarURL),
			},
			LastMessage:   lastMessage,
			LastMessageAt: item.LastMessageAt.Format(time.RFC3339),
			UnreadCount:   item.UnreadCount,
			HasUnread:     item.HasUnread,
			ActiveRequest: item.ActiveRequest,
		})
	}
	httpx.JSON(w, http.StatusOK, ListThreadsResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) GetThread(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "threadId"), "threadId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.GetThreadDetail(r.Context(), actorID, threadID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapThreadDetail(result, actorID))
}

func (h *Handlers) AcceptThreadRequest(w http.ResponseWriter, r *http.Request) {
	h.resolveThreadRequest(w, r, true)
}

func (h *Handlers) DeclineThreadRequest(w http.ResponseWriter, r *http.Request) {
	h.resolveThreadRequest(w, r, false)
}

func (h *Handlers) resolveThreadRequest(w http.ResponseWriter, r *http.Request, accept bool) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "threadId"), "threadId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	var result messagingservice.ResolveThreadRequestResult
	if accept {
		result, err = h.service.AcceptThreadRequest(r.Context(), actorID, threadID, middleware.RequestIDFromContext(r.Context()))
	} else {
		result, err = h.service.DeclineThreadRequest(r.Context(), actorID, threadID, middleware.RequestIDFromContext(r.Context()))
	}
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, ResolveThreadRequestResponse(result))
}

func (h *Handlers) ListThreadMessages(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "threadId"), "threadId")
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
	result, err := h.service.ListThreadMessages(r.Context(), messagingservice.ThreadMessagesInput{
		ActorID:  actorID,
		ThreadID: threadID,
		Cursor:   r.URL.Query().Get("cursor"),
		Limit:    limit,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	items := make([]ThreadMessageItem, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapThreadMessage(item, actorID))
	}
	httpx.JSON(w, http.StatusOK, ListThreadMessagesResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) SendThreadMessage(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "threadId"), "threadId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[SendThreadMessageRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	var clientID *string
	if trimmed := strings.TrimSpace(req.ClientID); trimmed != "" {
		clientID = &trimmed
	}
	msg, err := h.service.SendThreadMessage(r.Context(), messagingservice.SendThreadMessageInput{
		ActorID:   actorID,
		ThreadID:  threadID,
		Body:      req.Body,
		ClientID:  clientID,
		RequestID: middleware.RequestIDFromContext(r.Context()),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, SendThreadMessageResponse{Message: mapThreadMessage(msg, actorID)})
}

func (h *Handlers) MarkThreadRead(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "threadId"), "threadId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[MarkThreadReadRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	lastReadID, parseErr := strconv.ParseInt(req.LastReadMessageID, 10, 64)
	if parseErr != nil {
		httpx.WriteValidationError(w, []validatex.Issue{{
			Path:    []any{"lastReadMessageId"},
			Code:    "custom",
			Message: "lastReadMessageId must be numeric",
		}})
		return
	}
	if err := h.service.MarkThreadRead(r.Context(), messagingservice.MarkThreadReadInput{
		ActorID:           actorID,
		ThreadID:          threadID,
		LastReadMessageID: lastReadID,
		RequestID:         middleware.RequestIDFromContext(r.Context()),
	}); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, MarkThreadReadResponse{ThreadID: threadID, Marked: true})
}

func (h *Handlers) UpdateThreadCategory(w http.ResponseWriter, r *http.Request) {
	actorID, err := h.requireLocalActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "threadId"), "threadId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdateThreadCategoryRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	if err := h.service.UpdateThreadCategory(r.Context(), messagingservice.UpdateThreadCategoryInput{
		ActorID:   actorID,
		ThreadID:  threadID,
		Category:  req.Category,
		RequestID: middleware.RequestIDFromContext(r.Context()),
	}); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, UpdateThreadCategoryResponse{ThreadID: threadID, Category: req.Category, Updated: true})
}

func mapThreadDetail(result messagingservice.ThreadDetailResult, actorID string) ThreadDetailResponse {
	participants := make([]ThreadParticipantItem, 0, len(result.Participants))
	for _, participant := range result.Participants {
		participants = append(participants, ThreadParticipantItem{
			ID:          participant.UserID,
			Username:    participant.Username,
			DisplayName: participant.DisplayName,
			AvatarURL:   mediaurl.MaterializeWithDefault(participant.AvatarURL),
		})
	}
	lastReadMessageID := ""
	if result.Thread.LastReadID != nil {
		lastReadMessageID = strconv.FormatInt(*result.Thread.LastReadID, 10)
	}
	return ThreadDetailResponse{
		ID:                result.Thread.ID,
		Type:              string(result.Thread.Type),
		Category:          string(result.Thread.Category),
		Participants:      participants,
		CreatedAt:         result.Thread.CreatedAt.Format(time.RFC3339),
		LastReadMessageID: lastReadMessageID,
		CanSend:           result.CanSend,
		ActiveRequest:     result.ActiveRequest,
		CanResolveRequest: result.CanResolveRequest,
	}
}

func mapThreadMessage(message messagingrepo.ThreadMessage, actorID string) ThreadMessageItem {
	clientID := ""
	if message.ClientID != nil {
		clientID = *message.ClientID
	}
	return ThreadMessageItem{
		ID:           strconv.FormatInt(message.ID, 10),
		ThreadID:     message.ThreadID,
		SenderUserID: message.SenderID,
		Kind:         string(message.Kind),
		Body:         message.Body,
		CreatedAt:    message.CreatedAt.Format(time.RFC3339),
		ClientID:     clientID,
		IsOwn:        message.SenderID == actorID,
		Status:       "sent",
	}
}
