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

type repoStub struct {
	buddies bool
	conv    messagingrepo.Conversation
	otherID string
}

func (s *repoStub) AreBuddies(_ context.Context, _, _ string) (bool, error) { return s.buddies, nil }
func (s *repoStub) UpsertDMConversation(_ context.Context, senderID, _ string, status string) (messagingrepo.Conversation, error) {
	if s.conv.ID == "" {
		s.conv = messagingrepo.Conversation{ID: "conv-1", InitiatorUserID: senderID, Status: status, UpdatedAt: time.Now().UTC()}
	}
	if s.conv.Status != "active" {
		s.conv.Status = status
	}
	return s.conv, nil
}
func (s *repoStub) InsertMessage(_ context.Context, conversationID, senderID, content string, metadata *messagingrepo.MessageMetadata, _ *string) (messagingrepo.Message, error) {
	return messagingrepo.Message{ID: 1, ConversationID: conversationID, SenderID: senderID, Content: content, Metadata: metadata, CreatedAt: time.Now().UTC()}, nil
}
func (s *repoStub) GetConversation(_ context.Context, _ string) (messagingrepo.Conversation, error) {
	if s.conv.ID == "" {
		return messagingrepo.Conversation{}, errors.New("missing")
	}
	return s.conv, nil
}
func (s *repoStub) IsParticipant(_ context.Context, _, _ string) (bool, error) { return true, nil }
func (s *repoStub) GetOtherParticipantID(_ context.Context, _, _ string) (string, error) {
	if s.otherID == "" {
		return "550e8400-e29b-41d4-a716-446655440009", nil
	}
	return s.otherID, nil
}
func (s *repoStub) UpdateConversationStatus(_ context.Context, _ string, status string) error {
	s.conv.Status = status
	return nil
}
func (s *repoStub) ListInboxConversations(_ context.Context, _ messagingrepo.ListInboxInput) ([]messagingrepo.ConversationItem, error) {
	return []messagingrepo.ConversationItem{}, nil
}
func (s *repoStub) ListConversationMessages(_ context.Context, _ messagingrepo.ListConversationMessagesInput) ([]messagingrepo.Message, error) {
	return []messagingrepo.Message{}, nil
}
func (s *repoStub) MarkConversationRead(_ context.Context, _, _ string, _ *int64) error { return nil }

type hubStub struct{}

func (hubStub) BroadcastEnvelope(_ ws.Envelope) {}

type blockCheckerStub struct {
	blocked bool
	err     error
}

func (b blockCheckerStub) IsBlockedEitherDirection(context.Context, string, string) (bool, error) {
	return b.blocked, b.err
}

func TestCreateRequestBlockedReturnsForbidden(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo, hubStub{}, blockCheckerStub{blocked: true})

	_, err := svc.CreateRequest(context.Background(), CreateRequestInput{
		SenderID:    "550e8400-e29b-41d4-a716-446655440000",
		RecipientID: "550e8400-e29b-41d4-a716-446655440001",
		Content:     "hello",
	})
	if err == nil {
		t.Fatal("expected blocked error")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok || appErr.Status != http.StatusForbidden || appErr.Code != "blocked" {
		t.Fatalf("expected blocked 403, got %#v", err)
	}
}

func TestAcceptRequestBlockedReturnsForbidden(t *testing.T) {
	repo := &repoStub{conv: messagingrepo.Conversation{ID: "550e8400-e29b-41d4-a716-446655440055", InitiatorUserID: "550e8400-e29b-41d4-a716-446655440001", Status: "pending"}}
	svc := New(repo, hubStub{}, blockCheckerStub{blocked: true})

	_, err := svc.AcceptRequest(context.Background(), repo.conv.ID, "550e8400-e29b-41d4-a716-446655440000", "")
	if err == nil {
		t.Fatal("expected blocked error")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok || appErr.Status != http.StatusForbidden || appErr.Code != "blocked" {
		t.Fatalf("expected blocked 403, got %#v", err)
	}
}

func TestPendingConversationRecipientCannotSendBeforeAccept(t *testing.T) {
	repo := &repoStub{conv: messagingrepo.Conversation{ID: "conv-1", InitiatorUserID: "550e8400-e29b-41d4-a716-446655440001", Status: "pending"}}
	svc := New(repo, hubStub{}, blockCheckerStub{})

	_, err := svc.SendConversationMessage(context.Background(), SendConversationMessageInput{
		ActorID:        "550e8400-e29b-41d4-a716-446655440000",
		ConversationID: "conv-1",
		Content:        "reply",
	})
	if err == nil {
		t.Fatal("expected forbidden error")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok || appErr.Status != http.StatusForbidden {
		t.Fatalf("expected forbidden error, got %#v", err)
	}
}

func TestSendConversationMessageRejectsInvalidMetadata(t *testing.T) {
	repo := &repoStub{conv: messagingrepo.Conversation{ID: "conv-1", InitiatorUserID: "550e8400-e29b-41d4-a716-446655440001", Status: "active"}}
	svc := New(repo, hubStub{}, blockCheckerStub{})

	_, err := svc.SendConversationMessage(context.Background(), SendConversationMessageInput{
		ActorID:        "550e8400-e29b-41d4-a716-446655440001",
		ConversationID: "conv-1",
		Content:        "let's go",
		Metadata: &messagingrepo.MessageMetadata{
			Type: "meet_at",
		},
	})
	if err == nil {
		t.Fatal("expected metadata validation error")
	}
}

func TestGetThreadDetailRequestDisablesComposer(t *testing.T) {
	repo := newThreadRepoStub(messagingrepo.ThreadCategoryRequests)
	svc := New(repo, hubStub{}, blockCheckerStub{})

	result, err := svc.GetThreadDetail(context.Background(), repo.actorID, repo.thread.ID)
	if err != nil {
		t.Fatalf("expected thread detail, got error: %v", err)
	}
	if result.CanSend {
		t.Fatal("expected request thread to disable sending until accepted")
	}
	if !result.ActiveRequest || !result.CanResolveRequest {
		t.Fatal("expected request thread to be actionable for the recipient")
	}
}

func TestDeclineThreadRequestArchivesRecipientMembership(t *testing.T) {
	repo := newThreadRepoStub(messagingrepo.ThreadCategoryRequests)
	svc := New(repo, hubStub{}, blockCheckerStub{})

	result, err := svc.DeclineThreadRequest(context.Background(), repo.actorID, repo.thread.ID, "")
	if err != nil {
		t.Fatalf("expected decline to succeed, got error: %v", err)
	}
	if !result.Resolved || result.Action != "declined" {
		t.Fatalf("unexpected decline result: %#v", result)
	}
	if !repo.archived {
		t.Fatal("expected recipient membership to be archived")
	}
}

func TestAcceptThreadRequestPromotesRecipientToPrimary(t *testing.T) {
	repo := newThreadRepoStub(messagingrepo.ThreadCategoryRequests)
	svc := New(repo, hubStub{}, blockCheckerStub{})

	result, err := svc.AcceptThreadRequest(context.Background(), repo.actorID, repo.thread.ID, "")
	if err != nil {
		t.Fatalf("expected accept to succeed, got error: %v", err)
	}
	if !result.Resolved || result.Action != "accepted" {
		t.Fatalf("unexpected accept result: %#v", result)
	}
	if repo.thread.Category != messagingrepo.ThreadCategoryPrimary {
		t.Fatalf("expected recipient thread category to be primary, got %s", repo.thread.Category)
	}
}

type threadRepoStub struct {
	repoStub
	thread   messagingrepo.Thread
	actorID  string
	archived bool
}

func newThreadRepoStub(category messagingrepo.ThreadCategory) *threadRepoStub {
	now := time.Now().UTC()
	return &threadRepoStub{
		thread: messagingrepo.Thread{
			ID:            "550e8400-e29b-41d4-a716-446655440099",
			Type:          messagingrepo.ThreadKindDirect,
			Category:      category,
			CreatedAt:     now,
			LastMessageAt: now,
		},
		actorID: "550e8400-e29b-41d4-a716-446655440000",
	}
}

func (s *threadRepoStub) OpenOrCreateDirectThread(context.Context, string, string, messagingrepo.ThreadCategory) (messagingrepo.Thread, error) {
	return s.thread, nil
}
func (s *threadRepoStub) AreUsersBuddies(context.Context, string, string) (bool, error) {
	return false, nil
}
func (s *threadRepoStub) ListThreads(context.Context, messagingrepo.ListThreadsInput) ([]messagingrepo.ThreadSummary, error) {
	return nil, nil
}
func (s *threadRepoStub) GetThread(_ context.Context, threadID, userID string) (messagingrepo.Thread, error) {
	if threadID != s.thread.ID || userID != s.actorID {
		return messagingrepo.Thread{}, errors.New("missing")
	}
	return s.thread, nil
}
func (s *threadRepoStub) ListThreadParticipants(context.Context, string) ([]messagingrepo.ThreadParticipant, error) {
	return []messagingrepo.ThreadParticipant{{UserID: s.actorID}, {UserID: "550e8400-e29b-41d4-a716-446655440001"}}, nil
}
func (s *threadRepoStub) ListThreadMessages(context.Context, messagingrepo.ListThreadMessagesInput) ([]messagingrepo.ThreadMessage, error) {
	return nil, nil
}
func (s *threadRepoStub) CreateThreadMessage(context.Context, string, string, string, *string) (messagingrepo.ThreadMessage, error) {
	return messagingrepo.ThreadMessage{}, nil
}
func (s *threadRepoStub) MarkThreadRead(context.Context, string, string, int64) error { return nil }
func (s *threadRepoStub) GetThreadMessage(context.Context, string, int64) (messagingrepo.ThreadMessage, error) {
	return messagingrepo.ThreadMessage{}, nil
}
func (s *threadRepoStub) ThreadMemberIDs(context.Context, string) ([]string, error) {
	return []string{s.actorID, "550e8400-e29b-41d4-a716-446655440001"}, nil
}
func (s *threadRepoStub) IsThreadMember(_ context.Context, threadID, userID string) (bool, error) {
	return threadID == s.thread.ID && userID == s.actorID, nil
}
func (s *threadRepoStub) UpdateThreadCategory(_ context.Context, threadID string, category messagingrepo.ThreadCategory) error {
	if threadID != s.thread.ID {
		return errors.New("missing")
	}
	s.thread.Category = category
	return nil
}
func (s *threadRepoStub) PromoteThreadRequestToPrimary(_ context.Context, threadID, userID string) error {
	if threadID != s.thread.ID || userID != s.actorID {
		return errors.New("missing")
	}
	s.thread.Category = messagingrepo.ThreadCategoryPrimary
	return nil
}
func (s *threadRepoStub) ArchiveThreadForUser(_ context.Context, threadID, userID string) error {
	if threadID != s.thread.ID || userID != s.actorID {
		return errors.New("missing")
	}
	s.archived = true
	return nil
}
