package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	messagingrepo "fphgo/internal/features/messaging/repo"
	"fphgo/internal/realtime/ws"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/pagination"
	sharedratelimit "fphgo/internal/shared/ratelimit"
)

const (
	statusPending  = "pending"
	statusActive   = "active"
	statusRejected = "rejected"
)

type Service struct {
	repo    messagingRepository
	hub     messageBroadcaster
	block   blockChecker
	limiter rateLimiter
}

type messagingRepository interface {
	AreBuddies(ctx context.Context, a, b string) (bool, error)
	UpsertDMConversation(ctx context.Context, senderID, recipientID, status string) (messagingrepo.Conversation, error)
	InsertMessage(ctx context.Context, conversationID, senderID, content string, idempotencyKey *string) (messagingrepo.Message, error)
	GetConversation(ctx context.Context, conversationID string) (messagingrepo.Conversation, error)
	IsParticipant(ctx context.Context, conversationID, userID string) (bool, error)
	GetOtherParticipantID(ctx context.Context, conversationID, userID string) (string, error)
	UpdateConversationStatus(ctx context.Context, conversationID, status string) error
	ListInboxConversations(ctx context.Context, input messagingrepo.ListInboxInput) ([]messagingrepo.ConversationItem, error)
	ListConversationMessages(ctx context.Context, input messagingrepo.ListConversationMessagesInput) ([]messagingrepo.Message, error)
	MarkConversationRead(ctx context.Context, conversationID, userID string, messageID *int64) error
}

type messageBroadcaster interface {
	BroadcastEnvelope(ws.Envelope)
}

type blockChecker interface {
	IsBlockedEitherDirection(ctx context.Context, a, b string) (bool, error)
}

type rateLimiter interface {
	Allow(ctx context.Context, scope, key string, maxEvents int, window time.Duration) (sharedratelimit.Result, error)
}

type noopLimiter struct{}

func (noopLimiter) Allow(context.Context, string, string, int, time.Duration) (sharedratelimit.Result, error) {
	return sharedratelimit.Result{Allowed: true}, nil
}

type Option func(*Service)

func WithLimiter(limiter rateLimiter) Option {
	return func(s *Service) {
		if limiter != nil {
			s.limiter = limiter
		}
	}
}

type CreateRequestInput struct {
	SenderID       string
	RecipientID    string
	Content        string
	RequestID      string
	IdempotencyKey *string
}

type RequestAction struct {
	RequestID      string
	ConversationID string
	Status         string
}

type ConversationListInput struct {
	UserID string
	Limit  int32
	Cursor string
}

type ConversationListResult struct {
	Items      []messagingrepo.ConversationItem
	NextCursor string
}

type ConversationMessagesInput struct {
	ActorID        string
	ConversationID string
	Limit          int32
	Cursor         string
}

type ConversationMessagesResult struct {
	Items      []messagingrepo.Message
	NextCursor string
}

type SendConversationMessageInput struct {
	ActorID        string
	ConversationID string
	Content        string
	RequestID      string
	IdempotencyKey *string
}

type MarkReadInput struct {
	ActorID        string
	ConversationID string
	MessageID      *int64
	RequestID      string
}

func New(repo messagingRepository, hub messageBroadcaster, blockService blockChecker, opts ...Option) *Service {
	svc := &Service{repo: repo, hub: hub, block: blockService, limiter: noopLimiter{}}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) CreateRequest(ctx context.Context, input CreateRequestInput) (RequestAction, error) {
	if _, err := uuid.Parse(input.SenderID); err != nil {
		return RequestAction{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid sender id", err)
	}
	if _, err := uuid.Parse(input.RecipientID); err != nil {
		return RequestAction{}, apperrors.New(http.StatusBadRequest, "invalid_recipient_id", "invalid recipient id", err)
	}
	if strings.TrimSpace(input.Content) == "" {
		return RequestAction{}, apperrors.New(http.StatusBadRequest, "invalid_content", "content is required", nil)
	}
	if input.SenderID == input.RecipientID {
		return RequestAction{}, apperrors.New(http.StatusBadRequest, "invalid_recipient", "cannot message yourself", nil)
	}
	if err := s.enforceRateLimit(ctx, "messages.send", input.SenderID, 30, time.Minute, "sender message rate exceeded"); err != nil {
		return RequestAction{}, err
	}

	blocked, err := s.isBlockedEither(ctx, input.SenderID, input.RecipientID)
	if err != nil {
		return RequestAction{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", err)
	}
	if blocked {
		return RequestAction{}, apperrors.New(http.StatusForbidden, "blocked", "messaging is blocked between users", nil)
	}

	areBuddies, err := s.repo.AreBuddies(ctx, input.SenderID, input.RecipientID)
	if err != nil {
		return RequestAction{}, apperrors.New(http.StatusInternalServerError, "buddy_check_failed", "failed to validate buddy relationship", err)
	}
	status := statusPending
	if areBuddies {
		status = statusActive
	} else {
		requestPairKey := input.SenderID + ":" + input.RecipientID
		if err := s.enforceRateLimit(ctx, "messages.request_initiation", requestPairKey, 1, 2*time.Minute, "recipient initiation cooldown active"); err != nil {
			return RequestAction{}, err
		}
	}

	conv, err := s.repo.UpsertDMConversation(ctx, input.SenderID, input.RecipientID, status)
	if err != nil {
		return RequestAction{}, apperrors.New(http.StatusInternalServerError, "conversation_upsert_failed", "failed to upsert conversation", err)
	}
	msg, err := s.repo.InsertMessage(ctx, conv.ID, input.SenderID, strings.TrimSpace(input.Content), input.IdempotencyKey)
	if err != nil {
		return RequestAction{}, apperrors.New(http.StatusInternalServerError, "message_insert_failed", "failed to save message", err)
	}

	s.broadcast(input.RequestID, "message.created", map[string]any{
		"conversationId": conv.ID,
		"messageId":      strconv.FormatInt(msg.ID, 10),
		"senderId":       input.SenderID,
		"content":        msg.Content,
		"createdAt":      msg.CreatedAt.Format(time.RFC3339),
		"status":         conv.Status,
	})

	if conv.Status == statusPending {
		s.broadcast(input.RequestID, "request.created", map[string]any{
			"requestId":       conv.ID,
			"conversationId":  conv.ID,
			"initiatorUserId": conv.InitiatorUserID,
			"status":          conv.Status,
		})
	}

	s.broadcast(input.RequestID, "conversation.updated", map[string]any{
		"conversationId": conv.ID,
		"status":         conv.Status,
	})

	return RequestAction{RequestID: conv.ID, ConversationID: conv.ID, Status: conv.Status}, nil
}

func (s *Service) AcceptRequest(ctx context.Context, requestID, actorID, traceID string) (RequestAction, error) {
	return s.transitionRequest(ctx, requestID, actorID, traceID, "request.accepted", statusActive)
}

func (s *Service) DeclineRequest(ctx context.Context, requestID, actorID, traceID string) (RequestAction, error) {
	return s.transitionRequest(ctx, requestID, actorID, traceID, "request.declined", statusRejected)
}

func (s *Service) transitionRequest(ctx context.Context, requestID, actorID, traceID, eventType, nextStatus string) (RequestAction, error) {
	if err := s.enforceRateLimit(ctx, "messages.transition", actorID, 60, time.Minute, "conversation action rate exceeded"); err != nil {
		return RequestAction{}, err
	}

	conv, err := s.repo.GetConversation(ctx, requestID)
	if err != nil {
		if messagingrepo.IsNoRows(err) {
			return RequestAction{}, apperrors.New(http.StatusNotFound, "request_not_found", "message request not found", err)
		}
		return RequestAction{}, apperrors.New(http.StatusInternalServerError, "conversation_fetch_failed", "failed to fetch conversation", err)
	}
	if conv.Status != statusPending {
		return RequestAction{}, apperrors.New(http.StatusConflict, "invalid_state", "request is not pending", nil)
	}

	participant, err := s.repo.IsParticipant(ctx, requestID, actorID)
	if err != nil {
		return RequestAction{}, apperrors.New(http.StatusInternalServerError, "participant_check_failed", "failed to validate conversation participant", err)
	}
	if !participant {
		return RequestAction{}, apperrors.New(http.StatusForbidden, "forbidden", "not a conversation participant", nil)
	}
	if conv.InitiatorUserID == actorID {
		return RequestAction{}, apperrors.New(http.StatusForbidden, "forbidden", "initiator cannot resolve own request", nil)
	}

	if nextStatus == statusActive {
		blocked, checkErr := s.isBlockedEither(ctx, actorID, conv.InitiatorUserID)
		if checkErr != nil {
			return RequestAction{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", checkErr)
		}
		if blocked {
			return RequestAction{}, apperrors.New(http.StatusForbidden, "blocked", "messaging is blocked between users", nil)
		}
	}

	if err := s.repo.UpdateConversationStatus(ctx, requestID, nextStatus); err != nil {
		return RequestAction{}, apperrors.New(http.StatusInternalServerError, "status_update_failed", "failed to update conversation status", err)
	}

	s.broadcast(traceID, eventType, map[string]any{
		"requestId":      requestID,
		"conversationId": requestID,
		"status":         nextStatus,
	})
	s.broadcast(traceID, "conversation.updated", map[string]any{
		"conversationId": requestID,
		"status":         nextStatus,
	})
	return RequestAction{RequestID: requestID, ConversationID: requestID, Status: nextStatus}, nil
}

func (s *Service) Inbox(ctx context.Context, input ConversationListInput) (ConversationListResult, error) {
	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	cursorUpdated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		updated, id, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ConversationListResult{}, apperrors.New(http.StatusBadRequest, "validation_error", "invalid cursor", err)
		}
		cursorUpdated = updated
		cursorID = id
	}

	items, err := s.repo.ListInboxConversations(ctx, messagingrepo.ListInboxInput{
		UserID:        input.UserID,
		CursorUpdated: cursorUpdated,
		CursorID:      cursorID,
		Limit:         input.Limit + 1,
	})
	if err != nil {
		return ConversationListResult{}, apperrors.New(http.StatusInternalServerError, "inbox_failed", "failed to fetch inbox", err)
	}

	nextCursor := ""
	if int32(len(items)) > input.Limit {
		next := items[input.Limit-1]
		nextCursor = pagination.Encode(next.UpdatedAt, next.ConversationID)
		items = items[:input.Limit]
	}
	return ConversationListResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) ConversationMessages(ctx context.Context, input ConversationMessagesInput) (ConversationMessagesResult, error) {
	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	if _, err := uuid.Parse(input.ConversationID); err != nil {
		return ConversationMessagesResult{}, apperrors.New(http.StatusBadRequest, "invalid_conversation_id", "invalid conversation id", err)
	}

	participant, err := s.repo.IsParticipant(ctx, input.ConversationID, input.ActorID)
	if err != nil {
		return ConversationMessagesResult{}, apperrors.New(http.StatusInternalServerError, "participant_check_failed", "failed to validate conversation participant", err)
	}
	if !participant {
		return ConversationMessagesResult{}, apperrors.New(http.StatusForbidden, "forbidden", "not a conversation participant", nil)
	}
	otherUserID, err := s.repo.GetOtherParticipantID(ctx, input.ConversationID, input.ActorID)
	if err != nil {
		return ConversationMessagesResult{}, apperrors.New(http.StatusInternalServerError, "participant_check_failed", "failed to resolve conversation participant", err)
	}
	blocked, err := s.isBlockedEither(ctx, input.ActorID, otherUserID)
	if err != nil {
		return ConversationMessagesResult{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", err)
	}
	if blocked {
		return ConversationMessagesResult{}, apperrors.New(http.StatusForbidden, "blocked", "messaging is blocked between users", nil)
	}

	cursorCreated, cursorMessageID := pagination.DefaultInt64Cursor()
	if strings.TrimSpace(input.Cursor) != "" {
		created, id, err := pagination.DecodeInt64(input.Cursor)
		if err != nil {
			return ConversationMessagesResult{}, apperrors.New(http.StatusBadRequest, "validation_error", "invalid cursor", err)
		}
		cursorCreated = created
		cursorMessageID = id
	}

	items, err := s.repo.ListConversationMessages(ctx, messagingrepo.ListConversationMessagesInput{
		ConversationID:  input.ConversationID,
		UserID:          input.ActorID,
		CursorCreated:   cursorCreated,
		CursorMessageID: cursorMessageID,
		Limit:           input.Limit + 1,
	})
	if err != nil {
		return ConversationMessagesResult{}, apperrors.New(http.StatusInternalServerError, "conversation_fetch_failed", "failed to fetch messages", err)
	}

	nextCursor := ""
	if int32(len(items)) > input.Limit {
		next := items[input.Limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, strconv.FormatInt(next.ID, 10))
		items = items[:input.Limit]
	}
	return ConversationMessagesResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) SendConversationMessage(ctx context.Context, input SendConversationMessageInput) (messagingrepo.Message, error) {
	if strings.TrimSpace(input.Content) == "" {
		return messagingrepo.Message{}, apperrors.New(http.StatusBadRequest, "invalid_content", "content is required", nil)
	}
	if err := s.enforceRateLimit(ctx, "messages.send", input.ActorID, 30, time.Minute, "sender message rate exceeded"); err != nil {
		return messagingrepo.Message{}, err
	}

	conv, err := s.repo.GetConversation(ctx, input.ConversationID)
	if err != nil {
		if messagingrepo.IsNoRows(err) {
			return messagingrepo.Message{}, apperrors.New(http.StatusNotFound, "conversation_not_found", "conversation not found", err)
		}
		return messagingrepo.Message{}, apperrors.New(http.StatusInternalServerError, "conversation_fetch_failed", "failed to fetch conversation", err)
	}
	participant, err := s.repo.IsParticipant(ctx, input.ConversationID, input.ActorID)
	if err != nil {
		return messagingrepo.Message{}, apperrors.New(http.StatusInternalServerError, "participant_check_failed", "failed to validate conversation participant", err)
	}
	if !participant {
		return messagingrepo.Message{}, apperrors.New(http.StatusForbidden, "forbidden", "not a conversation participant", nil)
	}
	otherUserID, err := s.repo.GetOtherParticipantID(ctx, input.ConversationID, input.ActorID)
	if err != nil {
		return messagingrepo.Message{}, apperrors.New(http.StatusInternalServerError, "participant_check_failed", "failed to resolve conversation participant", err)
	}
	blocked, err := s.isBlockedEither(ctx, input.ActorID, otherUserID)
	if err != nil {
		return messagingrepo.Message{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", err)
	}
	if blocked {
		return messagingrepo.Message{}, apperrors.New(http.StatusForbidden, "blocked", "messaging is blocked between users", nil)
	}

	if conv.Status == statusPending && conv.InitiatorUserID != input.ActorID {
		return messagingrepo.Message{}, apperrors.New(http.StatusForbidden, "forbidden", "recipient must accept request before replying", nil)
	}
	if conv.Status == statusRejected {
		return messagingrepo.Message{}, apperrors.New(http.StatusConflict, "invalid_state", "conversation request was declined", nil)
	}

	msg, err := s.repo.InsertMessage(ctx, input.ConversationID, input.ActorID, strings.TrimSpace(input.Content), input.IdempotencyKey)
	if err != nil {
		return messagingrepo.Message{}, apperrors.New(http.StatusInternalServerError, "message_insert_failed", "failed to save message", err)
	}

	s.broadcast(input.RequestID, "message.created", map[string]any{
		"conversationId": input.ConversationID,
		"messageId":      strconv.FormatInt(msg.ID, 10),
		"senderId":       input.ActorID,
		"content":        msg.Content,
		"createdAt":      msg.CreatedAt.Format(time.RFC3339),
		"status":         conv.Status,
	})
	s.broadcast(input.RequestID, "conversation.updated", map[string]any{
		"conversationId": input.ConversationID,
		"status":         conv.Status,
	})
	return msg, nil
}

func (s *Service) MarkRead(ctx context.Context, input MarkReadInput) error {
	participant, err := s.repo.IsParticipant(ctx, input.ConversationID, input.ActorID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "participant_check_failed", "failed to validate conversation participant", err)
	}
	if !participant {
		return apperrors.New(http.StatusForbidden, "forbidden", "not a conversation participant", nil)
	}
	otherUserID, err := s.repo.GetOtherParticipantID(ctx, input.ConversationID, input.ActorID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "participant_check_failed", "failed to resolve conversation participant", err)
	}
	blocked, err := s.isBlockedEither(ctx, input.ActorID, otherUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", err)
	}
	if blocked {
		return apperrors.New(http.StatusForbidden, "blocked", "messaging is blocked between users", nil)
	}
	if err := s.repo.MarkConversationRead(ctx, input.ConversationID, input.ActorID, input.MessageID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "mark_read_failed", "failed to mark conversation as read", err)
	}
	s.broadcast(input.RequestID, "conversation.updated", map[string]any{
		"conversationId": input.ConversationID,
		"status":         "read",
	})
	return nil
}

func (s *Service) enforceRateLimit(ctx context.Context, scope, key string, maxEvents int, window time.Duration, message string) error {
	result, err := s.limiter.Allow(ctx, scope, key, maxEvents, window)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "rate_limit_failed", "failed to enforce rate limit", err)
	}
	if result.Allowed {
		return nil
	}
	retry := int(result.RetryAfter.Seconds())
	if retry < 1 {
		retry = 1
	}
	return apperrors.NewRateLimited(fmt.Sprintf("%s; retry after %ds", message, retry), int(window.Seconds()), retry)
}

func (s *Service) isBlockedEither(ctx context.Context, a, b string) (bool, error) {
	if s.block == nil {
		return false, nil
	}
	return s.block.IsBlockedEitherDirection(ctx, a, b)
}

func (s *Service) broadcast(requestID, eventType string, payload map[string]any) {
	if s.hub == nil {
		return
	}
	s.hub.BroadcastEnvelope(ws.Envelope{
		Version:   1,
		Type:      eventType,
		EventID:   uuid.NewString(),
		RequestID: requestID,
		TS:        time.Now().UTC().Format(time.RFC3339),
		Payload:   payload,
	})
}
