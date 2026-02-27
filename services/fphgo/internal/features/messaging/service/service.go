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

type Service struct {
	repo    messagingRepository
	hub     messageBroadcaster
	block   blockChecker
	limiter rateLimiter
}

type messagingRepository interface {
	AreBuddies(ctx context.Context, a, b string) (bool, error)
	UpsertDMConversation(ctx context.Context, senderID, recipientID, status string) (messagingrepo.Conversation, error)
	InsertMessage(ctx context.Context, conversationID, senderID, content string) (int64, error)
	GetConversation(ctx context.Context, conversationID string) (messagingrepo.Conversation, error)
	IsParticipant(ctx context.Context, conversationID, userID string) (bool, error)
	UpdateConversationStatus(ctx context.Context, conversationID, status string) error
	Inbox(ctx context.Context, input messagingrepo.ListInboxInput) ([]messagingrepo.MessageItem, error)
	Requests(ctx context.Context, userID string) ([]messagingrepo.MessageItem, error)
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

type SendMessageInput struct {
	SenderID    string
	RecipientID string
	Content     string
	RequestID   string
}

type ConversationAction struct {
	ConversationID string
	Status         string
}

type InboxInput struct {
	UserID string
	Limit  int32
	Cursor string
}

type InboxResult struct {
	Items      []messagingrepo.MessageItem
	NextCursor string
}

func New(repo messagingRepository, hub messageBroadcaster, blockService blockChecker, opts ...Option) *Service {
	svc := &Service{
		repo:    repo,
		hub:     hub,
		block:   blockService,
		limiter: noopLimiter{},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) SendMessage(ctx context.Context, input SendMessageInput) (ConversationAction, error) {
	if _, err := uuid.Parse(input.SenderID); err != nil {
		return ConversationAction{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid sender id", err)
	}
	if _, err := uuid.Parse(input.RecipientID); err != nil {
		return ConversationAction{}, apperrors.New(http.StatusBadRequest, "invalid_recipient_id", "invalid recipient id", err)
	}
	if strings.TrimSpace(input.Content) == "" {
		return ConversationAction{}, apperrors.New(http.StatusBadRequest, "invalid_content", "content is required", nil)
	}
	if input.SenderID == input.RecipientID {
		return ConversationAction{}, apperrors.New(http.StatusBadRequest, "invalid_recipient", "cannot message yourself", nil)
	}
	if err := s.enforceRateLimit(ctx, "messages.send", input.SenderID, 30, time.Minute, "sender message rate exceeded"); err != nil {
		return ConversationAction{}, err
	}

	blocked, err := s.isBlockedEither(ctx, input.SenderID, input.RecipientID)
	if err != nil {
		return ConversationAction{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", err)
	}
	if blocked {
		return ConversationAction{}, apperrors.New(http.StatusForbidden, "blocked", "messaging is blocked between users", nil)
	}

	areBuddies, err := s.repo.AreBuddies(ctx, input.SenderID, input.RecipientID)
	if err != nil {
		return ConversationAction{}, apperrors.New(http.StatusInternalServerError, "buddy_check_failed", "failed to validate buddy relationship", err)
	}
	if !areBuddies {
		requestPairKey := input.SenderID + ":" + input.RecipientID
		if err := s.enforceRateLimit(ctx, "messages.request_initiation", requestPairKey, 1, 2*time.Minute, "recipient initiation cooldown active"); err != nil {
			return ConversationAction{}, err
		}
	}

	status := "pending"
	if areBuddies {
		status = "active"
	}

	conv, err := s.repo.UpsertDMConversation(ctx, input.SenderID, input.RecipientID, status)
	if err != nil {
		return ConversationAction{}, apperrors.New(http.StatusInternalServerError, "conversation_upsert_failed", "failed to upsert conversation", err)
	}

	msgID, err := s.repo.InsertMessage(ctx, conv.ID, input.SenderID, strings.TrimSpace(input.Content))
	if err != nil {
		return ConversationAction{}, apperrors.New(http.StatusInternalServerError, "message_insert_failed", "failed to save message", err)
	}

	s.hub.BroadcastEnvelope(ws.Envelope{
		Type:      "message.created",
		RequestID: input.RequestID,
		Payload: map[string]any{
			"conversationId": conv.ID,
			"messageId":      msgID,
			"status":         conv.Status,
		},
	})

	return ConversationAction{ConversationID: conv.ID, Status: conv.Status}, nil
}

func (s *Service) Accept(ctx context.Context, conversationID, actorID string) (ConversationAction, error) {
	return s.transition(ctx, conversationID, actorID, "accepted")
}

func (s *Service) Reject(ctx context.Context, conversationID, actorID string) (ConversationAction, error) {
	return s.transition(ctx, conversationID, actorID, "rejected")
}

func (s *Service) transition(ctx context.Context, conversationID, actorID, action string) (ConversationAction, error) {
	if err := s.enforceRateLimit(ctx, "messages.transition", actorID, 60, time.Minute, "conversation action rate exceeded"); err != nil {
		return ConversationAction{}, err
	}

	conv, err := s.repo.GetConversation(ctx, conversationID)
	if err != nil {
		if messagingrepo.IsNoRows(err) {
			return ConversationAction{}, apperrors.New(http.StatusNotFound, "conversation_not_found", "conversation not found", err)
		}
		return ConversationAction{}, apperrors.New(http.StatusInternalServerError, "conversation_fetch_failed", "failed to fetch conversation", err)
	}
	participant, err := s.repo.IsParticipant(ctx, conversationID, actorID)
	if err != nil {
		return ConversationAction{}, apperrors.New(http.StatusInternalServerError, "participant_check_failed", "failed to validate conversation participant", err)
	}
	if !participant {
		return ConversationAction{}, apperrors.New(http.StatusForbidden, "forbidden", "not a conversation participant", nil)
	}
	if conv.InitiatorUserID == actorID {
		return ConversationAction{}, apperrors.New(http.StatusForbidden, "forbidden", "initiator cannot accept or reject own request", nil)
	}
	if conv.Status != "pending" {
		return ConversationAction{}, apperrors.New(http.StatusConflict, "invalid_state", "conversation is not pending", nil)
	}
	if action == "accepted" {
		blocked, checkErr := s.isBlockedEither(ctx, actorID, conv.InitiatorUserID)
		if checkErr != nil {
			return ConversationAction{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", checkErr)
		}
		if blocked {
			return ConversationAction{}, apperrors.New(http.StatusForbidden, "blocked", "messaging is blocked between users", nil)
		}
	}

	nextStatus := "active"
	if action == "rejected" {
		nextStatus = "rejected"
	}

	if err := s.repo.UpdateConversationStatus(ctx, conversationID, nextStatus); err != nil {
		return ConversationAction{}, apperrors.New(http.StatusInternalServerError, "status_update_failed", "failed to update conversation status", err)
	}

	s.hub.BroadcastEnvelope(ws.Envelope{Type: fmt.Sprintf("conversation.%s", action), Payload: map[string]string{"conversationId": conversationID, "status": nextStatus}})
	return ConversationAction{ConversationID: conversationID, Status: nextStatus}, nil
}

func (s *Service) Inbox(ctx context.Context, input InboxInput) (InboxResult, error) {
	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	cursorCreated, cursorMessageID := pagination.DefaultInt64Cursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, messageID, err := pagination.DecodeInt64(input.Cursor)
		if err != nil {
			return InboxResult{}, apperrors.New(http.StatusBadRequest, "validation_error", "invalid cursor", err)
		}
		cursorCreated = createdAt
		cursorMessageID = messageID
	}

	items, err := s.repo.Inbox(ctx, messagingrepo.ListInboxInput{
		UserID:          input.UserID,
		CursorCreated:   cursorCreated,
		CursorMessageID: cursorMessageID,
		Limit:           input.Limit + 1,
	})
	if err != nil {
		return InboxResult{}, apperrors.New(http.StatusInternalServerError, "inbox_failed", "failed to fetch inbox", err)
	}

	nextCursor := ""
	if int32(len(items)) > input.Limit {
		next := items[input.Limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, strconv.FormatInt(next.MessageID, 10))
		items = items[:input.Limit]
	}

	return InboxResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) Requests(ctx context.Context, userID string) ([]messagingrepo.MessageItem, error) {
	items, err := s.repo.Requests(ctx, userID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "requests_failed", "failed to fetch requests", err)
	}
	return items, nil
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
