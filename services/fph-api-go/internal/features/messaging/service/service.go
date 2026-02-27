package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	messagingrepo "fph-api-go/internal/features/messaging/repo"
	"fph-api-go/internal/realtime/ws"
	apperrors "fph-api-go/internal/shared/errors"
)

type Service struct {
	repo *messagingrepo.Repo
	hub  *ws.Hub

	mu       sync.Mutex
	cooldown map[string]time.Time
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

func New(repo *messagingrepo.Repo, hub *ws.Hub) *Service {
	return &Service{repo: repo, hub: hub, cooldown: map[string]time.Time{}}
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
	if err := s.enforceCooldown(input.SenderID); err != nil {
		return ConversationAction{}, err
	}

	blocked, err := s.repo.IsBlockedEither(ctx, input.SenderID, input.RecipientID)
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

func (s *Service) Inbox(ctx context.Context, userID string) ([]messagingrepo.MessageItem, error) {
	items, err := s.repo.Inbox(ctx, userID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "inbox_failed", "failed to fetch inbox", err)
	}
	return items, nil
}

func (s *Service) Requests(ctx context.Context, userID string) ([]messagingrepo.MessageItem, error) {
	items, err := s.repo.Requests(ctx, userID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "requests_failed", "failed to fetch requests", err)
	}
	return items, nil
}

func (s *Service) enforceCooldown(senderID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	if until, exists := s.cooldown[senderID]; exists && now.Before(until) {
		return apperrors.New(http.StatusTooManyRequests, "cooldown_active", "sender cooldown active", nil)
	}
	s.cooldown[senderID] = now.Add(250 * time.Millisecond)
	return nil
}
