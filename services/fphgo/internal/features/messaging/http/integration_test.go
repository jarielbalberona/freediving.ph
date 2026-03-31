package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	messagingrepo "fphgo/internal/features/messaging/repo"
	messagingservice "fphgo/internal/features/messaging/service"
	"fphgo/internal/middleware"
	"fphgo/internal/realtime/ws"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

type memoryMessagingRepo struct {
	threads map[string]*messagingrepo.Thread
	members map[string]map[string]messagingrepo.ThreadCategory
	msgs    map[string][]messagingrepo.ThreadMessage
}

func newMemoryMessagingRepo() *memoryMessagingRepo {
	return &memoryMessagingRepo{
		threads: map[string]*messagingrepo.Thread{},
		members: map[string]map[string]messagingrepo.ThreadCategory{},
		msgs:    map[string][]messagingrepo.ThreadMessage{},
	}
}

func (m *memoryMessagingRepo) AreBuddies(_ context.Context, _, _ string) (bool, error) {
	return false, nil
}

func (m *memoryMessagingRepo) UpsertDMConversation(_ context.Context, _, _, _ string) (messagingrepo.Conversation, error) {
	return messagingrepo.Conversation{ID: uuid.NewString(), Status: "pending", UpdatedAt: time.Now().UTC()}, nil
}

func (m *memoryMessagingRepo) InsertMessage(_ context.Context, conversationID, senderID, content string, _ *messagingrepo.MessageMetadata, _ *string) (messagingrepo.Message, error) {
	return messagingrepo.Message{ID: 1, ConversationID: conversationID, SenderID: senderID, Content: content, CreatedAt: time.Now().UTC()}, nil
}

func (m *memoryMessagingRepo) GetConversation(_ context.Context, conversationID string) (messagingrepo.Conversation, error) {
	return messagingrepo.Conversation{ID: conversationID, InitiatorUserID: uuid.NewString(), Status: "active", UpdatedAt: time.Now().UTC()}, nil
}

func (m *memoryMessagingRepo) IsParticipant(_ context.Context, _, _ string) (bool, error) {
	return true, nil
}

func (m *memoryMessagingRepo) GetOtherParticipantID(_ context.Context, _, userID string) (string, error) {
	if userID == "550e8400-e29b-41d4-a716-446655440000" {
		return "550e8400-e29b-41d4-a716-446655440001", nil
	}
	return "550e8400-e29b-41d4-a716-446655440000", nil
}

func (m *memoryMessagingRepo) UpdateConversationStatus(_ context.Context, _, _ string) error {
	return nil
}

func (m *memoryMessagingRepo) ListInboxConversations(_ context.Context, _ messagingrepo.ListInboxInput) ([]messagingrepo.ConversationItem, error) {
	return nil, nil
}

func (m *memoryMessagingRepo) ListConversationMessages(_ context.Context, _ messagingrepo.ListConversationMessagesInput) ([]messagingrepo.Message, error) {
	return nil, nil
}

func (m *memoryMessagingRepo) MarkConversationRead(_ context.Context, _, _ string, _ *int64) error {
	return nil
}

func (m *memoryMessagingRepo) OpenOrCreateDirectThread(_ context.Context, actorID, targetUserID string, targetCategory messagingrepo.ThreadCategory) (messagingrepo.Thread, error) {
	for threadID, threadMembers := range m.members {
		if _, ok := threadMembers[actorID]; ok {
			if _, ok := threadMembers[targetUserID]; ok {
				return *m.threads[threadID], nil
			}
		}
	}

	id := uuid.NewString()
	now := time.Now().UTC()
	m.threads[id] = &messagingrepo.Thread{
		ID:            id,
		Type:          messagingrepo.ThreadKindDirect,
		Category:      messagingrepo.ThreadCategoryPrimary,
		CreatedAt:     now,
		LastMessageAt: now,
	}
	m.members[id] = map[string]messagingrepo.ThreadCategory{
		actorID:      messagingrepo.ThreadCategoryPrimary,
		targetUserID: targetCategory,
	}
	return *m.threads[id], nil
}

func (m *memoryMessagingRepo) AreUsersBuddies(_ context.Context, _, _ string) (bool, error) {
	return true, nil
}

func (m *memoryMessagingRepo) ListThreads(_ context.Context, input messagingrepo.ListThreadsInput) ([]messagingrepo.ThreadSummary, error) {
	items := make([]messagingrepo.ThreadSummary, 0)
	for threadID, thread := range m.threads {
		threadMembers := m.members[threadID]
		category, ok := threadMembers[input.UserID]
		if !ok || category != input.Category {
			continue
		}
		otherID := ""
		for memberID := range threadMembers {
			if memberID != input.UserID {
				otherID = memberID
				break
			}
		}
		var lastMessage *messagingrepo.ThreadMessage
		if len(m.msgs[threadID]) > 0 {
			msg := m.msgs[threadID][len(m.msgs[threadID])-1]
			lastMessage = &msg
		}
		items = append(items, messagingrepo.ThreadSummary{
			ThreadID:      threadID,
			Type:          thread.Type,
			Category:      category,
			Participant:   messagingrepo.ThreadParticipant{UserID: otherID, Username: "member2", DisplayName: "Member Two", AvatarURL: ""},
			LastMessage:   lastMessage,
			LastMessageAt: thread.LastMessageAt,
			UnreadCount:   0,
			HasUnread:     false,
			ActiveRequest: category == messagingrepo.ThreadCategoryRequests,
		})
	}
	return items, nil
}

func (m *memoryMessagingRepo) GetThread(_ context.Context, threadID, userID string) (messagingrepo.Thread, error) {
	thread, ok := m.threads[threadID]
	if !ok {
		return messagingrepo.Thread{}, messagingNoRows{}
	}
	category := m.members[threadID][userID]
	copyThread := *thread
	copyThread.Category = category
	return copyThread, nil
}

func (m *memoryMessagingRepo) ListThreadParticipants(_ context.Context, threadID string) ([]messagingrepo.ThreadParticipant, error) {
	items := make([]messagingrepo.ThreadParticipant, 0)
	for userID := range m.members[threadID] {
		username := "member1"
		displayName := "Member One"
		if userID == "550e8400-e29b-41d4-a716-446655440001" {
			username = "member2"
			displayName = "Member Two"
		}
		items = append(items, messagingrepo.ThreadParticipant{UserID: userID, Username: username, DisplayName: displayName, AvatarURL: ""})
	}
	return items, nil
}

func (m *memoryMessagingRepo) ListThreadMessages(_ context.Context, input messagingrepo.ListThreadMessagesInput) ([]messagingrepo.ThreadMessage, error) {
	msgs := m.msgs[input.ThreadID]
	if len(msgs) == 0 {
		return nil, nil
	}
	return msgs, nil
}

func (m *memoryMessagingRepo) CreateThreadMessage(_ context.Context, threadID, senderID, body string, clientID *string) (messagingrepo.ThreadMessage, error) {
	msg := messagingrepo.ThreadMessage{
		ID:        int64(len(m.msgs[threadID]) + 1),
		ThreadID:  threadID,
		SenderID:  senderID,
		ClientID:  clientID,
		Kind:      messagingrepo.MessageKindText,
		Body:      body,
		CreatedAt: time.Now().UTC(),
	}
	m.msgs[threadID] = append(m.msgs[threadID], msg)
	if thread, ok := m.threads[threadID]; ok {
		thread.LastMessageAt = msg.CreatedAt
	}
	return msg, nil
}

func (m *memoryMessagingRepo) MarkThreadRead(_ context.Context, _, _ string, _ int64) error {
	return nil
}

func (m *memoryMessagingRepo) GetThreadMessage(_ context.Context, threadID string, messageID int64) (messagingrepo.ThreadMessage, error) {
	for _, msg := range m.msgs[threadID] {
		if msg.ID == messageID {
			return msg, nil
		}
	}
	return messagingrepo.ThreadMessage{}, messagingNoRows{}
}

func (m *memoryMessagingRepo) ThreadMemberIDs(_ context.Context, threadID string) ([]string, error) {
	ids := make([]string, 0, len(m.members[threadID]))
	for id := range m.members[threadID] {
		ids = append(ids, id)
	}
	return ids, nil
}

func (m *memoryMessagingRepo) IsThreadMember(_ context.Context, threadID, userID string) (bool, error) {
	threadMembers, ok := m.members[threadID]
	if !ok {
		return false, nil
	}
	_, exists := threadMembers[userID]
	return exists, nil
}

func (m *memoryMessagingRepo) UpdateThreadCategory(_ context.Context, threadID string, category messagingrepo.ThreadCategory) error {
	threadMembers, ok := m.members[threadID]
	if !ok {
		return nil
	}
	for userID := range threadMembers {
		threadMembers[userID] = category
	}
	return nil
}

func (m *memoryMessagingRepo) PromoteThreadRequestToPrimary(_ context.Context, threadID, userID string) error {
	threadMembers, ok := m.members[threadID]
	if !ok {
		return nil
	}
	if _, exists := threadMembers[userID]; exists {
		threadMembers[userID] = messagingrepo.ThreadCategoryPrimary
	}
	return nil
}

func (m *memoryMessagingRepo) ArchiveThreadForUser(_ context.Context, threadID, userID string) error {
	threadMembers, ok := m.members[threadID]
	if !ok {
		return nil
	}
	delete(threadMembers, userID)
	return nil
}

type messagingNoRows struct{}

func (messagingNoRows) Error() string { return "no rows" }

type memoryBlockChecker struct{}

func (memoryBlockChecker) IsBlockedEitherDirection(_ context.Context, _, _ string) (bool, error) {
	return false, nil
}

type testHub struct{}

func (testHub) BroadcastEnvelope(ws.Envelope)                  {}
func (testHub) BroadcastEnvelopeToUsers([]string, ws.Envelope) {}

func TestMessagingThreadOpenSendReadFlow(t *testing.T) {
	repo := newMemoryMessagingRepo()
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{})
	h := New(svc, nil, validatex.New())

	router := buildMessagingRouter(h, "550e8400-e29b-41d4-a716-446655440000", "active")

	createReq := httptest.NewRequest(http.MethodPost, "/threads/direct", strings.NewReader(`{"targetUserId":"550e8400-e29b-41d4-a716-446655440001"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	router.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusOK {
		t.Fatalf("expected 200 open direct thread, got %d body=%s", createRec.Code, createRec.Body.String())
	}

	var detail ThreadDetailResponse
	if err := json.Unmarshal(createRec.Body.Bytes(), &detail); err != nil {
		t.Fatalf("decode direct thread response: %v", err)
	}
	if detail.ID == "" {
		t.Fatal("expected thread id")
	}

	sendReq := httptest.NewRequest(http.MethodPost, "/threads/"+detail.ID+"/messages", strings.NewReader(`{"body":"hello from test","clientId":"cid-1"}`))
	sendReq.Header.Set("Content-Type", "application/json")
	sendRec := httptest.NewRecorder()
	router.ServeHTTP(sendRec, sendReq)
	if sendRec.Code != http.StatusOK {
		t.Fatalf("expected 200 send message, got %d body=%s", sendRec.Code, sendRec.Body.String())
	}

	messagesReq := httptest.NewRequest(http.MethodGet, "/threads/"+detail.ID+"/messages", nil)
	messagesRec := httptest.NewRecorder()
	router.ServeHTTP(messagesRec, messagesReq)
	if messagesRec.Code != http.StatusOK {
		t.Fatalf("expected 200 list messages, got %d body=%s", messagesRec.Code, messagesRec.Body.String())
	}

	var messages ListThreadMessagesResponse
	if err := json.Unmarshal(messagesRec.Body.Bytes(), &messages); err != nil {
		t.Fatalf("decode messages response: %v", err)
	}
	if len(messages.Items) != 1 || messages.Items[0].Body != "hello from test" {
		t.Fatalf("unexpected thread messages payload: %+v", messages.Items)
	}

	readReq := httptest.NewRequest(http.MethodPost, "/threads/"+detail.ID+"/read", strings.NewReader(`{"lastReadMessageId":"1"}`))
	readReq.Header.Set("Content-Type", "application/json")
	readRec := httptest.NewRecorder()
	router.ServeHTTP(readRec, readReq)
	if readRec.Code != http.StatusOK {
		t.Fatalf("expected 200 mark read, got %d body=%s", readRec.Code, readRec.Body.String())
	}
}

func TestMessagingThreadListByCategory(t *testing.T) {
	repo := newMemoryMessagingRepo()
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{})
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, "550e8400-e29b-41d4-a716-446655440000", "active")

	createReq := httptest.NewRequest(http.MethodPost, "/threads/direct", strings.NewReader(`{"targetUserId":"550e8400-e29b-41d4-a716-446655440001"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	router.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", createRec.Code)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/threads?category=primary", nil)
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200 list, got %d body=%s", listRec.Code, listRec.Body.String())
	}

	var list ListThreadsResponse
	if err := json.Unmarshal(listRec.Body.Bytes(), &list); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if len(list.Items) == 0 {
		t.Fatal("expected thread list item")
	}
	if list.Items[0].Category != "primary" {
		t.Fatalf("expected primary category, got %s", list.Items[0].Category)
	}
}

func buildMessagingRouter(h *Handlers, actorID, accountStatus string) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			identity := authz.Identity{
				UserID:        actorID,
				GlobalRole:    "member",
				AccountStatus: accountStatus,
				Permissions: map[authz.Permission]bool{
					authz.PermissionMessagingRead:  true,
					authz.PermissionMessagingWrite: true,
				},
			}
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(h))
	return r
}
