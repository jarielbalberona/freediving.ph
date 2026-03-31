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
	InsertMessage(ctx context.Context, conversationID, senderID, content string, metadata *messagingrepo.MessageMetadata, idempotencyKey *string) (messagingrepo.Message, error)
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
	Metadata       *messagingrepo.MessageMetadata
	RequestID      string
	IdempotencyKey *string
}

type MarkReadInput struct {
	ActorID        string
	ConversationID string
	MessageID      *int64
	RequestID      string
}

type ThreadListInput struct {
	ActorID  string
	Category string
	Limit    int32
	Cursor   string
	Search   string
}

type ThreadListResult struct {
	Items      []messagingrepo.ThreadSummary
	NextCursor string
}

type ThreadDetailResult struct {
	Thread            messagingrepo.Thread
	Participants      []messagingrepo.ThreadParticipant
	CanSend           bool
	ActiveRequest     bool
	CanResolveRequest bool
}

type ThreadMessagesInput struct {
	ActorID  string
	ThreadID string
	Limit    int32
	Cursor   string
}

type ThreadMessagesResult struct {
	Items      []messagingrepo.ThreadMessage
	NextCursor string
}

type SendThreadMessageInput struct {
	ActorID   string
	ThreadID  string
	Body      string
	ClientID  *string
	RequestID string
}

type OpenDirectThreadInput struct {
	ActorID      string
	TargetUserID string
}

type MarkThreadReadInput struct {
	ActorID           string
	ThreadID          string
	LastReadMessageID int64
	RequestID         string
}

type UpdateThreadCategoryInput struct {
	ActorID   string
	ThreadID  string
	Category  string
	RequestID string
}

type ResolveThreadRequestResult struct {
	ThreadID string
	Action   string
	Resolved bool
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
	msg, err := s.repo.InsertMessage(ctx, conv.ID, input.SenderID, strings.TrimSpace(input.Content), nil, input.IdempotencyKey)
	if err != nil {
		return RequestAction{}, apperrors.New(http.StatusInternalServerError, "message_insert_failed", "failed to save message", err)
	}

	s.broadcast(input.RequestID, "message.created", map[string]any{
		"conversationId": conv.ID,
		"messageId":      strconv.FormatInt(msg.ID, 10),
		"senderId":       input.SenderID,
		"content":        msg.Content,
		"metadata":       msg.Metadata,
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
	if err := validateMessageMetadata(input.Metadata); err != nil {
		return messagingrepo.Message{}, err
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

	msg, err := s.repo.InsertMessage(ctx, input.ConversationID, input.ActorID, strings.TrimSpace(input.Content), input.Metadata, input.IdempotencyKey)
	if err != nil {
		return messagingrepo.Message{}, apperrors.New(http.StatusInternalServerError, "message_insert_failed", "failed to save message", err)
	}

	s.broadcast(input.RequestID, "message.created", map[string]any{
		"conversationId": input.ConversationID,
		"messageId":      strconv.FormatInt(msg.ID, 10),
		"senderId":       input.ActorID,
		"content":        msg.Content,
		"metadata":       msg.Metadata,
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

func validateMessageMetadata(metadata *messagingrepo.MessageMetadata) error {
	if metadata == nil {
		return nil
	}
	if strings.TrimSpace(metadata.Type) != "meet_at" {
		return apperrors.New(http.StatusBadRequest, "invalid_metadata", "unsupported message metadata type", nil)
	}
	if strings.TrimSpace(metadata.DiveSiteID) == "" || strings.TrimSpace(metadata.DiveSiteName) == "" {
		return apperrors.New(http.StatusBadRequest, "invalid_metadata", "meet_at metadata requires dive site id and name", nil)
	}
	switch strings.TrimSpace(metadata.TimeWindow) {
	case "", "today", "weekend", "specific_date":
	default:
		return apperrors.New(http.StatusBadRequest, "invalid_metadata", "invalid meet_at timeWindow", nil)
	}
	if len(strings.TrimSpace(metadata.Note)) > 200 {
		return apperrors.New(http.StatusBadRequest, "invalid_metadata", "meet_at note is too long", nil)
	}
	return nil
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

type threadRepository interface {
	OpenOrCreateDirectThread(ctx context.Context, actorID, targetUserID string, targetCategory messagingrepo.ThreadCategory) (messagingrepo.Thread, error)
	AreUsersBuddies(ctx context.Context, a, b string) (bool, error)
	ListThreads(ctx context.Context, input messagingrepo.ListThreadsInput) ([]messagingrepo.ThreadSummary, error)
	GetThread(ctx context.Context, threadID, userID string) (messagingrepo.Thread, error)
	ListThreadParticipants(ctx context.Context, threadID string) ([]messagingrepo.ThreadParticipant, error)
	ListThreadMessages(ctx context.Context, input messagingrepo.ListThreadMessagesInput) ([]messagingrepo.ThreadMessage, error)
	CreateThreadMessage(ctx context.Context, threadID, senderID, body string, clientID *string) (messagingrepo.ThreadMessage, error)
	MarkThreadRead(ctx context.Context, threadID, userID string, lastReadMessageID int64) error
	GetThreadMessage(ctx context.Context, threadID string, messageID int64) (messagingrepo.ThreadMessage, error)
	ThreadMemberIDs(ctx context.Context, threadID string) ([]string, error)
	IsThreadMember(ctx context.Context, threadID, userID string) (bool, error)
	PromoteThreadRequestToPrimary(ctx context.Context, threadID, userID string) error
	UpdateThreadCategory(ctx context.Context, threadID string, category messagingrepo.ThreadCategory) error
	ArchiveThreadForUser(ctx context.Context, threadID, userID string) error
}

type targetedBroadcaster interface {
	BroadcastEnvelopeToUsers(userIDs []string, env ws.Envelope)
}

type threadRequestPromoter interface {
	PromoteThreadRequestToPrimary(ctx context.Context, threadID, userID string) error
}

func (s *Service) threadRepo() (threadRepository, error) {
	repo, ok := s.repo.(threadRepository)
	if !ok {
		return nil, apperrors.New(http.StatusInternalServerError, "messaging_not_configured", "thread messaging repository is not configured", nil)
	}
	return repo, nil
}

func (s *Service) ListThreads(ctx context.Context, input ThreadListInput) (ThreadListResult, error) {
	repo, err := s.threadRepo()
	if err != nil {
		return ThreadListResult{}, err
	}
	category := messagingrepo.ThreadCategory(strings.ToLower(strings.TrimSpace(input.Category)))
	if category == "" {
		category = messagingrepo.ThreadCategoryPrimary
	}
	switch category {
	case messagingrepo.ThreadCategoryPrimary, messagingrepo.ThreadCategoryTransactions, messagingrepo.ThreadCategoryRequests:
	default:
		if category == messagingrepo.ThreadCategoryGeneral {
			category = messagingrepo.ThreadCategoryTransactions
			break
		}
		return ThreadListResult{}, apperrors.New(http.StatusBadRequest, "validation_error", "invalid category", nil)
	}

	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	cursorTime, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		created, id, decodeErr := pagination.DecodeUUID(input.Cursor)
		if decodeErr != nil {
			return ThreadListResult{}, apperrors.New(http.StatusBadRequest, "validation_error", "invalid cursor", decodeErr)
		}
		cursorTime = created
		cursorID = id
	}

	items, err := repo.ListThreads(ctx, messagingrepo.ListThreadsInput{
		UserID:              input.ActorID,
		Category:            category,
		Search:              strings.TrimSpace(input.Search),
		CursorLastMessageAt: cursorTime,
		CursorThreadID:      cursorID,
		Limit:               input.Limit + 1,
	})
	if err != nil {
		return ThreadListResult{}, apperrors.New(http.StatusInternalServerError, "threads_list_failed", "failed to list threads", err)
	}
	nextCursor := ""
	if int32(len(items)) > input.Limit {
		next := items[input.Limit-1]
		nextCursor = pagination.Encode(next.LastMessageAt, next.ThreadID)
		items = items[:input.Limit]
	}
	return ThreadListResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) UpdateThreadCategory(ctx context.Context, input UpdateThreadCategoryInput) error {
	repo, err := s.threadRepo()
	if err != nil {
		return err
	}
	member, err := repo.IsThreadMember(ctx, input.ThreadID, input.ActorID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "thread_member_check_failed", "failed to validate membership", err)
	}
	if !member {
		return apperrors.New(http.StatusForbidden, "forbidden", "not a thread member", nil)
	}

	category := messagingrepo.ThreadCategory(strings.ToLower(strings.TrimSpace(input.Category)))
	if category == messagingrepo.ThreadCategoryGeneral {
		category = messagingrepo.ThreadCategoryTransactions
	}
	switch category {
	case messagingrepo.ThreadCategoryPrimary, messagingrepo.ThreadCategoryTransactions:
	default:
		return apperrors.New(http.StatusBadRequest, "validation_error", "invalid category", nil)
	}

	if err := repo.UpdateThreadCategory(ctx, input.ThreadID, category); err != nil {
		return apperrors.New(http.StatusInternalServerError, "thread_category_update_failed", "failed to update thread category", err)
	}

	memberIDs, err := repo.ThreadMemberIDs(ctx, input.ThreadID)
	if err == nil {
		s.broadcastThreadEnvelope(memberIDs, input.RequestID, "thread.updated", map[string]any{
			"threadId": input.ThreadID,
		})
	}
	return nil
}

func (s *Service) GetThreadDetail(ctx context.Context, actorID, threadID string) (ThreadDetailResult, error) {
	repo, err := s.threadRepo()
	if err != nil {
		return ThreadDetailResult{}, err
	}
	member, err := repo.IsThreadMember(ctx, threadID, actorID)
	if err != nil {
		return ThreadDetailResult{}, apperrors.New(http.StatusInternalServerError, "thread_member_check_failed", "failed to validate membership", err)
	}
	if !member {
		return ThreadDetailResult{}, apperrors.New(http.StatusForbidden, "forbidden", "not a thread member", nil)
	}
	thread, err := repo.GetThread(ctx, threadID, actorID)
	if err != nil {
		if messagingrepo.IsNoRows(err) {
			return ThreadDetailResult{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return ThreadDetailResult{}, apperrors.New(http.StatusInternalServerError, "thread_detail_failed", "failed to load thread", err)
	}
	participants, err := repo.ListThreadParticipants(ctx, threadID)
	if err != nil {
		return ThreadDetailResult{}, apperrors.New(http.StatusInternalServerError, "thread_detail_failed", "failed to load participants", err)
	}
	return ThreadDetailResult{
		Thread:            thread,
		Participants:      participants,
		CanSend:           thread.Category != messagingrepo.ThreadCategoryRequests,
		ActiveRequest:     thread.Category == messagingrepo.ThreadCategoryRequests,
		CanResolveRequest: thread.Category == messagingrepo.ThreadCategoryRequests,
	}, nil
}

func (s *Service) AcceptThreadRequest(ctx context.Context, actorID, threadID, requestID string) (ResolveThreadRequestResult, error) {
	repo, err := s.threadRepo()
	if err != nil {
		return ResolveThreadRequestResult{}, err
	}
	member, err := repo.IsThreadMember(ctx, threadID, actorID)
	if err != nil {
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusInternalServerError, "thread_member_check_failed", "failed to validate membership", err)
	}
	if !member {
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusForbidden, "forbidden", "not a thread member", nil)
	}
	thread, err := repo.GetThread(ctx, threadID, actorID)
	if err != nil {
		if messagingrepo.IsNoRows(err) {
			return ResolveThreadRequestResult{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusInternalServerError, "thread_detail_failed", "failed to load thread", err)
	}
	if thread.Category != messagingrepo.ThreadCategoryRequests {
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusConflict, "invalid_state", "thread request is not pending", nil)
	}
	if err := repo.PromoteThreadRequestToPrimary(ctx, threadID, actorID); err != nil {
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusInternalServerError, "thread_category_update_failed", "failed to accept thread request", err)
	}
	if memberIDs, memberErr := repo.ThreadMemberIDs(ctx, threadID); memberErr == nil {
		s.broadcastThreadEnvelope(memberIDs, requestID, "thread.updated", map[string]any{"threadId": threadID})
	}
	return ResolveThreadRequestResult{ThreadID: threadID, Action: "accepted", Resolved: true}, nil
}

func (s *Service) DeclineThreadRequest(ctx context.Context, actorID, threadID, requestID string) (ResolveThreadRequestResult, error) {
	repo, err := s.threadRepo()
	if err != nil {
		return ResolveThreadRequestResult{}, err
	}
	member, err := repo.IsThreadMember(ctx, threadID, actorID)
	if err != nil {
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusInternalServerError, "thread_member_check_failed", "failed to validate membership", err)
	}
	if !member {
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusForbidden, "forbidden", "not a thread member", nil)
	}
	thread, err := repo.GetThread(ctx, threadID, actorID)
	if err != nil {
		if messagingrepo.IsNoRows(err) {
			return ResolveThreadRequestResult{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusInternalServerError, "thread_detail_failed", "failed to load thread", err)
	}
	if thread.Category != messagingrepo.ThreadCategoryRequests {
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusConflict, "invalid_state", "thread request is not pending", nil)
	}
	if err := repo.ArchiveThreadForUser(ctx, threadID, actorID); err != nil {
		return ResolveThreadRequestResult{}, apperrors.New(http.StatusInternalServerError, "thread_request_decline_failed", "failed to decline thread request", err)
	}
	if memberIDs, memberErr := repo.ThreadMemberIDs(ctx, threadID); memberErr == nil {
		s.broadcastThreadEnvelope(memberIDs, requestID, "thread.updated", map[string]any{"threadId": threadID})
	}
	return ResolveThreadRequestResult{ThreadID: threadID, Action: "declined", Resolved: true}, nil
}

func (s *Service) ListThreadMessages(ctx context.Context, input ThreadMessagesInput) (ThreadMessagesResult, error) {
	repo, err := s.threadRepo()
	if err != nil {
		return ThreadMessagesResult{}, err
	}
	member, err := repo.IsThreadMember(ctx, input.ThreadID, input.ActorID)
	if err != nil {
		return ThreadMessagesResult{}, apperrors.New(http.StatusInternalServerError, "thread_member_check_failed", "failed to validate membership", err)
	}
	if !member {
		return ThreadMessagesResult{}, apperrors.New(http.StatusForbidden, "forbidden", "not a thread member", nil)
	}

	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	cursorCreated, cursorID := pagination.DefaultInt64Cursor()
	if strings.TrimSpace(input.Cursor) != "" {
		created, id, decodeErr := pagination.DecodeInt64(input.Cursor)
		if decodeErr != nil {
			return ThreadMessagesResult{}, apperrors.New(http.StatusBadRequest, "validation_error", "invalid cursor", decodeErr)
		}
		cursorCreated = created
		cursorID = id
	}
	items, err := repo.ListThreadMessages(ctx, messagingrepo.ListThreadMessagesInput{
		ThreadID:        input.ThreadID,
		CursorCreatedAt: cursorCreated,
		CursorMessageID: cursorID,
		Limit:           input.Limit + 1,
	})
	if err != nil {
		return ThreadMessagesResult{}, apperrors.New(http.StatusInternalServerError, "thread_messages_failed", "failed to list messages", err)
	}
	nextCursor := ""
	if int32(len(items)) > input.Limit {
		next := items[input.Limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, strconv.FormatInt(next.ID, 10))
		items = items[:input.Limit]
	}
	for left, right := 0, len(items)-1; left < right; left, right = left+1, right-1 {
		items[left], items[right] = items[right], items[left]
	}
	return ThreadMessagesResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) OpenOrCreateDirectThread(ctx context.Context, input OpenDirectThreadInput) (ThreadDetailResult, error) {
	repo, err := s.threadRepo()
	if err != nil {
		return ThreadDetailResult{}, err
	}
	if input.ActorID == input.TargetUserID {
		return ThreadDetailResult{}, apperrors.New(http.StatusBadRequest, "invalid_target", "cannot create direct thread with self", nil)
	}
	if _, parseErr := uuid.Parse(input.TargetUserID); parseErr != nil {
		return ThreadDetailResult{}, apperrors.New(http.StatusBadRequest, "invalid_target", "invalid target user id", parseErr)
	}
	if err := s.enforceRateLimit(ctx, "messages.threads.direct", input.ActorID, 120, time.Minute, "direct thread rate exceeded"); err != nil {
		return ThreadDetailResult{}, err
	}

	targetCategory := messagingrepo.ThreadCategoryRequests
	buddies, err := repo.AreUsersBuddies(ctx, input.ActorID, input.TargetUserID)
	if err != nil {
		// Policy probe should not take down thread creation.
		// If this check fails, default to requests inbox (safer than primary).
		buddies = false
	}
	if buddies {
		targetCategory = messagingrepo.ThreadCategoryPrimary
	}

	thread, err := repo.OpenOrCreateDirectThread(ctx, input.ActorID, input.TargetUserID, targetCategory)
	if err != nil {
		return ThreadDetailResult{}, apperrors.New(http.StatusInternalServerError, "thread_open_failed", "failed to open direct thread", err)
	}
	participants, err := repo.ListThreadParticipants(ctx, thread.ID)
	if err != nil {
		return ThreadDetailResult{}, apperrors.New(http.StatusInternalServerError, "thread_open_failed", "failed to load participants", err)
	}
	return ThreadDetailResult{Thread: thread, Participants: participants, CanSend: true}, nil
}

func (s *Service) SendThreadMessage(ctx context.Context, input SendThreadMessageInput) (messagingrepo.ThreadMessage, error) {
	repo, err := s.threadRepo()
	if err != nil {
		return messagingrepo.ThreadMessage{}, err
	}
	body := strings.TrimSpace(input.Body)
	if body == "" {
		return messagingrepo.ThreadMessage{}, apperrors.New(http.StatusBadRequest, "invalid_body", "message body is required", nil)
	}
	if err := s.enforceRateLimit(ctx, "messages.thread.send", input.ActorID, 60, time.Minute, "sender message rate exceeded"); err != nil {
		return messagingrepo.ThreadMessage{}, err
	}
	member, err := repo.IsThreadMember(ctx, input.ThreadID, input.ActorID)
	if err != nil {
		return messagingrepo.ThreadMessage{}, apperrors.New(http.StatusInternalServerError, "thread_member_check_failed", "failed to validate membership", err)
	}
	if !member {
		return messagingrepo.ThreadMessage{}, apperrors.New(http.StatusForbidden, "forbidden", "not a thread member", nil)
	}
	if promoter, ok := repo.(threadRequestPromoter); ok {
		if err := promoter.PromoteThreadRequestToPrimary(ctx, input.ThreadID, input.ActorID); err != nil {
			return messagingrepo.ThreadMessage{}, apperrors.New(http.StatusInternalServerError, "thread_category_update_failed", "failed to update thread category", err)
		}
	}
	msg, err := repo.CreateThreadMessage(ctx, input.ThreadID, input.ActorID, body, input.ClientID)
	if err != nil {
		return messagingrepo.ThreadMessage{}, apperrors.New(http.StatusInternalServerError, "thread_message_create_failed", "failed to create message", err)
	}
	memberIDs, err := repo.ThreadMemberIDs(ctx, input.ThreadID)
	if err == nil {
		s.broadcastThreadEnvelope(memberIDs, input.RequestID, "message.created", map[string]any{
			"threadId":     msg.ThreadID,
			"id":           strconv.FormatInt(msg.ID, 10),
			"senderUserId": msg.SenderID,
			"kind":         msg.Kind,
			"body":         msg.Body,
			"createdAt":    msg.CreatedAt.Format(time.RFC3339),
			"clientId":     msg.ClientID,
		})
		s.broadcastThreadEnvelope(memberIDs, input.RequestID, "thread.updated", map[string]any{
			"threadId": msg.ThreadID,
		})
	}
	return msg, nil
}

func (s *Service) MarkThreadRead(ctx context.Context, input MarkThreadReadInput) error {
	repo, err := s.threadRepo()
	if err != nil {
		return err
	}
	member, err := repo.IsThreadMember(ctx, input.ThreadID, input.ActorID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "thread_member_check_failed", "failed to validate membership", err)
	}
	if !member {
		return apperrors.New(http.StatusForbidden, "forbidden", "not a thread member", nil)
	}
	message, err := repo.GetThreadMessage(ctx, input.ThreadID, input.LastReadMessageID)
	if err != nil {
		if messagingrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "message_not_found", "message not found in thread", err)
		}
		return apperrors.New(http.StatusInternalServerError, "thread_read_failed", "failed to resolve last read message", err)
	}
	if err := repo.MarkThreadRead(ctx, input.ThreadID, input.ActorID, message.ID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "thread_read_failed", "failed to mark thread read", err)
	}
	memberIDs, err := repo.ThreadMemberIDs(ctx, input.ThreadID)
	if err == nil {
		s.broadcastThreadEnvelope(memberIDs, input.RequestID, "thread.read", map[string]any{
			"threadId":          input.ThreadID,
			"readerUserId":      input.ActorID,
			"lastReadMessageId": strconv.FormatInt(message.ID, 10),
		})
		s.broadcastThreadEnvelope(memberIDs, input.RequestID, "thread.updated", map[string]any{
			"threadId": input.ThreadID,
		})
	}
	return nil
}

func (s *Service) broadcastThreadEnvelope(userIDs []string, requestID, eventType string, payload map[string]any) {
	if s.hub == nil {
		return
	}
	targeted, ok := s.hub.(targetedBroadcaster)
	if !ok {
		s.broadcast(requestID, eventType, payload)
		return
	}
	targeted.BroadcastEnvelopeToUsers(userIDs, ws.Envelope{
		Version:   1,
		Type:      eventType,
		EventID:   uuid.NewString(),
		RequestID: requestID,
		TS:        time.Now().UTC().Format(time.RFC3339),
		Payload:   payload,
	})
}
