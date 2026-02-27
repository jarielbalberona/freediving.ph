package service

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	messagingrepo "fphgo/internal/features/messaging/repo"
	"fphgo/internal/realtime/ws"
	apperrors "fphgo/internal/shared/errors"
)

type messagingRepoStub struct {
	buddies      bool
	inboxItems   []messagingrepo.MessageItem
	requestItems []messagingrepo.MessageItem
	conversation messagingrepo.Conversation
	participant  bool
}

func (s *messagingRepoStub) AreBuddies(_ context.Context, _, _ string) (bool, error) {
	return s.buddies, nil
}
func (s *messagingRepoStub) UpsertDMConversation(_ context.Context, senderID, _ string, status string) (messagingrepo.Conversation, error) {
	return messagingrepo.Conversation{ID: "conv-1", InitiatorUserID: senderID, Status: status}, nil
}
func (s *messagingRepoStub) InsertMessage(_ context.Context, _, _, _ string) (int64, error) {
	return 1, nil
}
func (s *messagingRepoStub) GetConversation(_ context.Context, _ string) (messagingrepo.Conversation, error) {
	if s.conversation.ID == "" {
		return messagingrepo.Conversation{}, errors.New("not implemented")
	}
	return s.conversation, nil
}
func (s *messagingRepoStub) IsParticipant(_ context.Context, _, _ string) (bool, error) {
	return s.participant, nil
}
func (s *messagingRepoStub) UpdateConversationStatus(_ context.Context, _, _ string) error {
	return nil
}
func (s *messagingRepoStub) Inbox(_ context.Context, _ messagingrepo.ListInboxInput) ([]messagingrepo.MessageItem, error) {
	return s.inboxItems, nil
}
func (s *messagingRepoStub) Requests(_ context.Context, _ string) ([]messagingrepo.MessageItem, error) {
	return s.requestItems, nil
}

type hubStub struct{}

func (hubStub) BroadcastEnvelope(_ ws.Envelope) {}

type blockCheckerStub struct {
	blocked bool
	err     error
}

func (b blockCheckerStub) IsBlockedEitherDirection(context.Context, string, string) (bool, error) {
	return b.blocked, b.err
}

func TestSendMessageBlockedReturnsForbidden(t *testing.T) {
	repo := &messagingRepoStub{}
	svc := New(repo, hubStub{}, blockCheckerStub{blocked: true})

	_, err := svc.SendMessage(context.Background(), SendMessageInput{
		SenderID:    "550e8400-e29b-41d4-a716-446655440000",
		RecipientID: "550e8400-e29b-41d4-a716-446655440001",
		Content:     "hello",
	})
	if err == nil {
		t.Fatal("expected blocked error")
	}

	appErr, ok := err.(*apperrors.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", appErr.Status)
	}
	if appErr.Code != "blocked" {
		t.Fatalf("expected blocked code, got %q", appErr.Code)
	}
}

func TestInboxReturnsRepoItems(t *testing.T) {
	now := time.Now().UTC()
	repo := &messagingRepoStub{inboxItems: []messagingrepo.MessageItem{{ConversationID: "c1", MessageID: 1, CreatedAt: now}}}
	svc := New(repo, hubStub{}, blockCheckerStub{})

	result, err := svc.Inbox(context.Background(), InboxInput{
		UserID: "550e8400-e29b-41d4-a716-446655440000",
		Limit:  20,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
}

func TestAcceptBlockedReturnsForbidden(t *testing.T) {
	repo := &messagingRepoStub{
		conversation: messagingrepo.Conversation{
			ID:              "550e8400-e29b-41d4-a716-446655440055",
			InitiatorUserID: "550e8400-e29b-41d4-a716-446655440001",
			Status:          "pending",
		},
		participant: true,
	}
	svc := New(repo, hubStub{}, blockCheckerStub{blocked: true})

	_, err := svc.Accept(context.Background(), "550e8400-e29b-41d4-a716-446655440055", "550e8400-e29b-41d4-a716-446655440000")
	if err == nil {
		t.Fatal("expected blocked error")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", appErr.Status)
	}
	if appErr.Code != "blocked" {
		t.Fatalf("expected blocked code, got %q", appErr.Code)
	}
}
