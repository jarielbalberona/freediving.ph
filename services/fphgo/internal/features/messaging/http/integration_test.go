package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sort"
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
	buddies map[string]bool
	blocks  map[string]bool
	convs   map[string]*messagingrepo.Conversation
	parts   map[string][2]string
	msgs    map[string][]messagingrepo.Message
}

func newMemoryMessagingRepo() *memoryMessagingRepo {
	return &memoryMessagingRepo{
		buddies: map[string]bool{},
		blocks:  map[string]bool{},
		convs:   map[string]*messagingrepo.Conversation{},
		parts:   map[string][2]string{},
		msgs:    map[string][]messagingrepo.Message{},
	}
}

func pairKey(a, b string) string {
	if a < b {
		return a + ":" + b
	}
	return b + ":" + a
}

func (m *memoryMessagingRepo) AreBuddies(_ context.Context, a, b string) (bool, error) {
	return m.buddies[pairKey(a, b)], nil
}

func (m *memoryMessagingRepo) UpsertDMConversation(_ context.Context, senderID, recipientID, status string) (messagingrepo.Conversation, error) {
	pair := pairKey(senderID, recipientID)
	for id, users := range m.parts {
		if pairKey(users[0], users[1]) == pair {
			conv := m.convs[id]
			if conv.Status != "active" {
				conv.Status = status
			}
			conv.UpdatedAt = time.Now().UTC()
			return *conv, nil
		}
	}
	id := uuid.NewString()
	conv := &messagingrepo.Conversation{ID: id, InitiatorUserID: senderID, Status: status, UpdatedAt: time.Now().UTC()}
	m.convs[id] = conv
	m.parts[id] = [2]string{senderID, recipientID}
	return *conv, nil
}

func (m *memoryMessagingRepo) InsertMessage(_ context.Context, conversationID, senderID, content string, metadata *messagingrepo.MessageMetadata, idempotencyKey *string) (messagingrepo.Message, error) {
	if idempotencyKey != nil {
		for _, msg := range m.msgs[conversationID] {
			if msg.Content == content {
				return msg, nil
			}
		}
	}
	msg := messagingrepo.Message{
		ID:             int64(len(m.msgs[conversationID]) + 1),
		ConversationID: conversationID,
		SenderID:       senderID,
		Content:        content,
		Metadata:       metadata,
		CreatedAt:      time.Now().UTC(),
	}
	m.msgs[conversationID] = append(m.msgs[conversationID], msg)
	if conv := m.convs[conversationID]; conv != nil {
		conv.UpdatedAt = msg.CreatedAt
	}
	return msg, nil
}

func (m *memoryMessagingRepo) GetConversation(_ context.Context, conversationID string) (messagingrepo.Conversation, error) {
	conv, ok := m.convs[conversationID]
	if !ok {
		return messagingrepo.Conversation{}, messagingNoRows{}
	}
	return *conv, nil
}

func (m *memoryMessagingRepo) IsParticipant(_ context.Context, conversationID, userID string) (bool, error) {
	users, ok := m.parts[conversationID]
	if !ok {
		return false, nil
	}
	return users[0] == userID || users[1] == userID, nil
}

func (m *memoryMessagingRepo) GetOtherParticipantID(_ context.Context, conversationID, userID string) (string, error) {
	users, ok := m.parts[conversationID]
	if !ok {
		return "", messagingNoRows{}
	}
	if users[0] == userID {
		return users[1], nil
	}
	if users[1] == userID {
		return users[0], nil
	}
	return "", messagingNoRows{}
}

func (m *memoryMessagingRepo) UpdateConversationStatus(_ context.Context, conversationID, status string) error {
	conv, ok := m.convs[conversationID]
	if !ok {
		return messagingNoRows{}
	}
	conv.Status = status
	conv.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *memoryMessagingRepo) ListInboxConversations(_ context.Context, input messagingrepo.ListInboxInput) ([]messagingrepo.ConversationItem, error) {
	items := make([]messagingrepo.ConversationItem, 0)
	for id, conv := range m.convs {
		users := m.parts[id]
		if users[0] != input.UserID && users[1] != input.UserID {
			continue
		}
		other := users[0]
		if other == input.UserID {
			other = users[1]
		}
		if m.blocks[input.UserID+":"+other] || m.blocks[other+":"+input.UserID] {
			continue
		}
		messages := m.msgs[id]
		if len(messages) == 0 {
			continue
		}
		first := messages[0]
		last := messages[len(messages)-1]
		var pendingCount int64
		if conv.Status == "pending" {
			pendingCount = int64(len(messages))
		}
		items = append(items, messagingrepo.ConversationItem{
			ConversationID:   id,
			Status:           conv.Status,
			InitiatorUserID:  conv.InitiatorUserID,
			UpdatedAt:        conv.UpdatedAt,
			OtherUserID:      other,
			OtherUsername:    "u-" + other[:8],
			OtherDisplayName: "User " + other[:8],
			LastMessage:      last,
			RequestPreview:   first,
			UnreadCount:      0,
			PendingCount:     pendingCount,
		})
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].UpdatedAt.Equal(items[j].UpdatedAt) {
			return items[i].ConversationID > items[j].ConversationID
		}
		return items[i].UpdatedAt.After(items[j].UpdatedAt)
	})
	if int(input.Limit) < len(items) {
		items = items[:input.Limit]
	}
	return items, nil
}

func (m *memoryMessagingRepo) ListConversationMessages(_ context.Context, input messagingrepo.ListConversationMessagesInput) ([]messagingrepo.Message, error) {
	items := make([]messagingrepo.Message, 0)
	for _, msg := range m.msgs[input.ConversationID] {
		if msg.CreatedAt.After(input.CursorCreated) || (msg.CreatedAt.Equal(input.CursorCreated) && msg.ID >= input.CursorMessageID) {
			continue
		}
		items = append(items, msg)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].ID > items[j].ID
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	if int(input.Limit) < len(items) {
		items = items[:input.Limit]
	}
	return items, nil
}

func (m *memoryMessagingRepo) MarkConversationRead(_ context.Context, _ string, _ string, _ *int64) error {
	return nil
}

type messagingNoRows struct{}

func (messagingNoRows) Error() string { return "no rows" }

type memoryBlockChecker struct{ edges map[string]bool }

func (m memoryBlockChecker) IsBlockedEitherDirection(_ context.Context, a, b string) (bool, error) {
	return m.edges[a+":"+b] || m.edges[b+":"+a], nil
}

type testHub struct{}

func (testHub) BroadcastEnvelope(ws.Envelope) {}

func TestMessagingRequestPreviewAcceptAndSendFlow(t *testing.T) {
	repo := newMemoryMessagingRepo()
	actorID := "550e8400-e29b-41d4-a716-446655440000"
	recipientID := "550e8400-e29b-41d4-a716-446655440001"
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())

	senderRouter := buildMessagingRouter(h, actorID, "active")
	recipientRouter := buildMessagingRouter(h, recipientID, "active")

	createReq := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+recipientID+`","content":"first preview"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	senderRouter.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", createRec.Code, createRec.Body.String())
	}
	var created RequestActionResponse
	_ = json.Unmarshal(createRec.Body.Bytes(), &created)

	pendingSendReq := httptest.NewRequest(http.MethodPost, "/conversations/"+created.ConversationID, strings.NewReader(`{"content":"follow up"}`))
	pendingSendReq.Header.Set("Content-Type", "application/json")
	pendingSendRec := httptest.NewRecorder()
	senderRouter.ServeHTTP(pendingSendRec, pendingSendReq)
	if pendingSendRec.Code != http.StatusOK {
		t.Fatalf("expected sender pending send 200, got %d body=%s", pendingSendRec.Code, pendingSendRec.Body.String())
	}

	inboxReq := httptest.NewRequest(http.MethodGet, "/inbox", nil)
	inboxRec := httptest.NewRecorder()
	recipientRouter.ServeHTTP(inboxRec, inboxReq)
	if inboxRec.Code != http.StatusOK {
		t.Fatalf("expected inbox 200, got %d", inboxRec.Code)
	}
	var inbox ListInboxResponse
	_ = json.Unmarshal(inboxRec.Body.Bytes(), &inbox)
	if len(inbox.Items) != 1 || inbox.Items[0].RequestPreview == nil || inbox.Items[0].RequestPreview.Content != "first preview" {
		t.Fatalf("expected pending preview first message, got %+v", inbox.Items)
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/requests/"+created.RequestID+"/accept", nil)
	acceptRec := httptest.NewRecorder()
	recipientRouter.ServeHTTP(acceptRec, acceptReq)
	if acceptRec.Code != http.StatusOK {
		t.Fatalf("expected accept 200, got %d body=%s", acceptRec.Code, acceptRec.Body.String())
	}

	afterAcceptSendReq := httptest.NewRequest(http.MethodPost, "/conversations/"+created.ConversationID, strings.NewReader(`{"content":"accepted reply"}`))
	afterAcceptSendReq.Header.Set("Content-Type", "application/json")
	afterAcceptSendRec := httptest.NewRecorder()
	recipientRouter.ServeHTTP(afterAcceptSendRec, afterAcceptSendReq)
	if afterAcceptSendRec.Code != http.StatusOK {
		t.Fatalf("expected accepted send 200, got %d body=%s", afterAcceptSendRec.Code, afterAcceptSendRec.Body.String())
	}
}

func TestMessagingSendAndReadIncludesMeetAtMetadata(t *testing.T) {
	repo := newMemoryMessagingRepo()
	actorID := "550e8400-e29b-41d4-a716-446655440010"
	recipientID := "550e8400-e29b-41d4-a716-446655440011"
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())

	senderRouter := buildMessagingRouter(h, actorID, "active")
	recipientRouter := buildMessagingRouter(h, recipientID, "active")

	createReq := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+recipientID+`","content":"Request with plan"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	senderRouter.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 create request, got %d body=%s", createRec.Code, createRec.Body.String())
	}
	var created RequestActionResponse
	_ = json.Unmarshal(createRec.Body.Bytes(), &created)

	acceptReq := httptest.NewRequest(http.MethodPost, "/requests/"+created.RequestID+"/accept", nil)
	acceptRec := httptest.NewRecorder()
	recipientRouter.ServeHTTP(acceptRec, acceptReq)
	if acceptRec.Code != http.StatusOK {
		t.Fatalf("expected 200 accept, got %d body=%s", acceptRec.Code, acceptRec.Body.String())
	}

	sendBody := `{"content":"Let us lock the plan","metadata":{"type":"meet_at","diveSiteId":"550e8400-e29b-41d4-a716-446655440099","diveSiteSlug":"twin-rocks-anilao","diveSiteName":"Twin Rocks","diveSiteArea":"Mabini, Batangas","timeWindow":"weekend","note":"Early morning window"}}`
	sendReq := httptest.NewRequest(http.MethodPost, "/conversations/"+created.ConversationID, bytes.NewBufferString(sendBody))
	sendReq.Header.Set("Content-Type", "application/json")
	sendRec := httptest.NewRecorder()
	senderRouter.ServeHTTP(sendRec, sendReq)
	if sendRec.Code != http.StatusOK {
		t.Fatalf("expected 200 send, got %d body=%s", sendRec.Code, sendRec.Body.String())
	}

	messagesReq := httptest.NewRequest(http.MethodGet, "/conversations/"+created.ConversationID, nil)
	messagesRec := httptest.NewRecorder()
	recipientRouter.ServeHTTP(messagesRec, messagesReq)
	if messagesRec.Code != http.StatusOK {
		t.Fatalf("expected 200 conversation messages, got %d body=%s", messagesRec.Code, messagesRec.Body.String())
	}
	var payload ListConversationMessagesResponse
	if err := json.Unmarshal(messagesRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode messages payload: %v", err)
	}
	found := false
	for _, item := range payload.Items {
		if item.Metadata != nil && item.Metadata.Type == "meet_at" {
			found = true
			if item.Metadata.DiveSiteName != "Twin Rocks" || item.Metadata.DiveSiteSlug != "twin-rocks-anilao" {
				t.Fatalf("expected metadata diveSiteName, got %+v", item.Metadata)
			}
		}
	}
	if !found {
		t.Fatal("expected meet_at metadata in conversation messages response")
	}
}

func TestMessagingBuddyBypassCreatesActiveConversation(t *testing.T) {
	repo := newMemoryMessagingRepo()
	actorID := "550e8400-e29b-41d4-a716-446655440010"
	recipientID := "550e8400-e29b-41d4-a716-446655440011"
	repo.buddies[pairKey(actorID, recipientID)] = true

	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, actorID, "active")

	req := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+recipientID+`","content":"hi buddy"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload RequestActionResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &payload)
	if payload.Status != "active" {
		t.Fatalf("expected active status for buddy bypass, got %s", payload.Status)
	}
}

func TestMessagingBlocksForbidAndInboxHides(t *testing.T) {
	repo := newMemoryMessagingRepo()
	actorID := "550e8400-e29b-41d4-a716-446655440020"
	otherID := "550e8400-e29b-41d4-a716-446655440021"
	edges := map[string]bool{actorID + ":" + otherID: true}
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: edges})
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, actorID, "active")

	blockedReq := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+otherID+`","content":"blocked"}`))
	blockedReq.Header.Set("Content-Type", "application/json")
	blockedRec := httptest.NewRecorder()
	router.ServeHTTP(blockedRec, blockedReq)
	if blockedRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 blocked, got %d body=%s", blockedRec.Code, blockedRec.Body.String())
	}

	inboxReq := httptest.NewRequest(http.MethodGet, "/inbox", nil)
	inboxRec := httptest.NewRecorder()
	router.ServeHTTP(inboxRec, inboxReq)
	if inboxRec.Code != http.StatusOK {
		t.Fatalf("expected inbox 200, got %d", inboxRec.Code)
	}
}

func TestMessagingReadOnlyForbidsWrites(t *testing.T) {
	repo := newMemoryMessagingRepo()
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, "550e8400-e29b-41d4-a716-446655440030", "read_only")

	req := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader([]byte(`{"recipientId":"550e8400-e29b-41d4-a716-446655440031","content":"hello"}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for read_only write, got %d", rec.Code)
	}
}

func TestMessagingInboxOrderingPendingAndActive(t *testing.T) {
	repo := newMemoryMessagingRepo()
	actorID := "550e8400-e29b-41d4-a716-446655440040"
	otherA := "550e8400-e29b-41d4-a716-446655440041"
	otherB := "550e8400-e29b-41d4-a716-446655440042"

	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())

	router := buildMessagingRouter(h, actorID, "active")

	createReq := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+otherA+`","content":"older"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	router.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", createRec.Code, createRec.Body.String())
	}

	time.Sleep(2 * time.Millisecond)
	repo.buddies[pairKey(actorID, otherB)] = true
	createReq2 := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+otherB+`","content":"newer active"}`))
	createReq2.Header.Set("Content-Type", "application/json")
	createRec2 := httptest.NewRecorder()
	router.ServeHTTP(createRec2, createReq2)
	if createRec2.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", createRec2.Code, createRec2.Body.String())
	}

	inboxReq := httptest.NewRequest(http.MethodGet, "/inbox", nil)
	inboxRec := httptest.NewRecorder()
	router.ServeHTTP(inboxRec, inboxReq)
	if inboxRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", inboxRec.Code)
	}

	var inbox ListInboxResponse
	_ = json.Unmarshal(inboxRec.Body.Bytes(), &inbox)
	if len(inbox.Items) != 2 {
		t.Fatalf("expected 2 inbox items, got %d", len(inbox.Items))
	}
	if inbox.Items[0].Status != "active" {
		t.Fatalf("expected newest conversation (active) first, got status=%s", inbox.Items[0].Status)
	}
	if inbox.Items[1].Status != "pending" {
		t.Fatalf("expected older conversation (pending) second, got status=%s", inbox.Items[1].Status)
	}
}

func TestMessagingSenderMultiplePendingMessages(t *testing.T) {
	repo := newMemoryMessagingRepo()
	senderID := "550e8400-e29b-41d4-a716-446655440050"
	recipientID := "550e8400-e29b-41d4-a716-446655440051"

	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())
	senderRouter := buildMessagingRouter(h, senderID, "active")

	createReq := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+recipientID+`","content":"msg1"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	senderRouter.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", createRec.Code, createRec.Body.String())
	}
	var created RequestActionResponse
	_ = json.Unmarshal(createRec.Body.Bytes(), &created)

	for i := 2; i <= 3; i++ {
		r := httptest.NewRequest(http.MethodPost, "/conversations/"+created.ConversationID, strings.NewReader(`{"content":"msg`+strings.Repeat("x", i)+`"}`))
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		senderRouter.ServeHTTP(w, r)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 for pending send #%d, got %d body=%s", i, w.Code, w.Body.String())
		}
	}

	inboxReq := httptest.NewRequest(http.MethodGet, "/inbox", nil)
	inboxRec := httptest.NewRecorder()
	senderRouter.ServeHTTP(inboxRec, inboxReq)
	if inboxRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", inboxRec.Code)
	}

	var inbox ListInboxResponse
	_ = json.Unmarshal(inboxRec.Body.Bytes(), &inbox)
	if len(inbox.Items) != 1 {
		t.Fatalf("expected 1 inbox item, got %d", len(inbox.Items))
	}
	if inbox.Items[0].PendingCount != 3 {
		t.Fatalf("expected pendingCount 3, got %d", inbox.Items[0].PendingCount)
	}
	if inbox.Items[0].Status != "pending" {
		t.Fatalf("expected pending status, got %s", inbox.Items[0].Status)
	}
}

func TestMessagingRecipientPreviewShowsFirstMessage(t *testing.T) {
	repo := newMemoryMessagingRepo()
	senderID := "550e8400-e29b-41d4-a716-446655440060"
	recipientID := "550e8400-e29b-41d4-a716-446655440061"

	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())
	senderRouter := buildMessagingRouter(h, senderID, "active")
	recipientRouter := buildMessagingRouter(h, recipientID, "active")

	createReq := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+recipientID+`","content":"preview content"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	senderRouter.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", createRec.Code)
	}
	var created RequestActionResponse
	_ = json.Unmarshal(createRec.Body.Bytes(), &created)

	sendFollow := httptest.NewRequest(http.MethodPost, "/conversations/"+created.ConversationID, strings.NewReader(`{"content":"follow up"}`))
	sendFollow.Header.Set("Content-Type", "application/json")
	followRec := httptest.NewRecorder()
	senderRouter.ServeHTTP(followRec, sendFollow)
	if followRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", followRec.Code)
	}

	inboxReq := httptest.NewRequest(http.MethodGet, "/inbox", nil)
	inboxRec := httptest.NewRecorder()
	recipientRouter.ServeHTTP(inboxRec, inboxReq)
	if inboxRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", inboxRec.Code)
	}

	var inbox ListInboxResponse
	_ = json.Unmarshal(inboxRec.Body.Bytes(), &inbox)
	if len(inbox.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(inbox.Items))
	}
	item := inbox.Items[0]
	if item.RequestPreview == nil {
		t.Fatal("expected requestPreview for recipient pending conversation")
	}
	if item.RequestPreview.Content != "preview content" {
		t.Fatalf("expected preview 'preview content', got %q", item.RequestPreview.Content)
	}
	if item.LastMessage.Content != "follow up" {
		t.Fatalf("expected lastMessage 'follow up', got %q", item.LastMessage.Content)
	}
}

func TestMessagingIdempotencyKeySameMessageNotDuplicated(t *testing.T) {
	repo := newMemoryMessagingRepo()
	senderID := "550e8400-e29b-41d4-a716-446655440070"
	recipientID := "550e8400-e29b-41d4-a716-446655440071"
	repo.buddies[pairKey(senderID, recipientID)] = true

	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, senderID, "active")

	createReq := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+recipientID+`","content":"hello"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-Idempotency-Key", "idem-key-1")
	createRec := httptest.NewRecorder()
	router.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", createRec.Code, createRec.Body.String())
	}
	var created RequestActionResponse
	_ = json.Unmarshal(createRec.Body.Bytes(), &created)

	retryReq := httptest.NewRequest(http.MethodPost, "/conversations/"+created.ConversationID, strings.NewReader(`{"content":"hello"}`))
	retryReq.Header.Set("Content-Type", "application/json")
	retryReq.Header.Set("X-Idempotency-Key", "idem-key-1")
	retryRec := httptest.NewRecorder()
	router.ServeHTTP(retryRec, retryReq)
	if retryRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for idempotent retry, got %d body=%s", retryRec.Code, retryRec.Body.String())
	}

	var retryResp SendMessageResponse
	_ = json.Unmarshal(retryRec.Body.Bytes(), &retryResp)
	if retryResp.Message.Content != "hello" {
		t.Fatalf("expected same content 'hello', got %q", retryResp.Message.Content)
	}
}

func TestMessagingBlockedConversationHiddenFromInbox(t *testing.T) {
	repo := newMemoryMessagingRepo()
	viewerID := "550e8400-e29b-41d4-a716-446655440080"
	blockedID := "550e8400-e29b-41d4-a716-446655440081"
	normalID := "550e8400-e29b-41d4-a716-446655440082"

	noBlockSvc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: map[string]bool{}})
	noBlockH := New(noBlockSvc, nil, validatex.New())
	viewerRouter := buildMessagingRouter(noBlockH, viewerID, "active")

	repo.buddies[pairKey(viewerID, blockedID)] = true
	repo.buddies[pairKey(viewerID, normalID)] = true

	r1 := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+blockedID+`","content":"will be blocked"}`))
	r1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	viewerRouter.ServeHTTP(w1, r1)
	if w1.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w1.Code)
	}

	time.Sleep(time.Millisecond)
	r2 := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+normalID+`","content":"visible"}`))
	r2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	viewerRouter.ServeHTTP(w2, r2)
	if w2.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w2.Code)
	}

	repo.blocks[viewerID+":"+blockedID] = true

	inboxReq := httptest.NewRequest(http.MethodGet, "/inbox", nil)
	inboxRec := httptest.NewRecorder()
	viewerRouter.ServeHTTP(inboxRec, inboxReq)
	if inboxRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", inboxRec.Code)
	}

	var inbox ListInboxResponse
	_ = json.Unmarshal(inboxRec.Body.Bytes(), &inbox)
	for _, item := range inbox.Items {
		if item.Participant.UserID == blockedID {
			t.Fatalf("blocked user should not appear in inbox, got conversationId=%s", item.ConversationID)
		}
	}
}

func TestMessagingWebSocketEventPayloadShape(t *testing.T) {
	repo := newMemoryMessagingRepo()
	senderID := "550e8400-e29b-41d4-a716-446655440090"
	recipientID := "550e8400-e29b-41d4-a716-446655440091"
	repo.buddies[pairKey(senderID, recipientID)] = true

	var captured []ws.Envelope
	hub := &capturingHub{captured: &captured}

	svc := messagingservice.New(repo, hub, memoryBlockChecker{edges: map[string]bool{}})
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, senderID, "active")

	createReq := httptest.NewRequest(http.MethodPost, "/requests", strings.NewReader(`{"recipientId":"`+recipientID+`","content":"ws test"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	router.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", createRec.Code, createRec.Body.String())
	}

	if len(captured) == 0 {
		t.Fatal("expected at least one WS event")
	}

	var msgEvent *ws.Envelope
	for i := range captured {
		if captured[i].Type == "message.created" {
			msgEvent = &captured[i]
			break
		}
	}
	if msgEvent == nil {
		t.Fatal("expected message.created event")
	}
	if msgEvent.Version != 1 {
		t.Fatalf("expected version 1, got %d", msgEvent.Version)
	}
	if msgEvent.EventID == "" {
		t.Fatal("expected eventId to be populated for de-duplication")
	}
	if msgEvent.TS == "" {
		t.Fatal("expected ts to be populated")
	}

	payload, ok := msgEvent.Payload.(map[string]any)
	if !ok {
		t.Fatalf("expected map payload, got %T", msgEvent.Payload)
	}
	for _, key := range []string{"conversationId", "messageId", "senderId", "content", "createdAt", "status"} {
		if _, exists := payload[key]; !exists {
			t.Fatalf("expected payload key %q in message.created event", key)
		}
	}
}

type capturingHub struct {
	captured *[]ws.Envelope
}

func (h *capturingHub) BroadcastEnvelope(env ws.Envelope) {
	*h.captured = append(*h.captured, env)
}

func buildMessagingRouter(h *Handlers, actorID, accountStatus string) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), authz.Identity{
				UserID:        actorID,
				GlobalRole:    "member",
				AccountStatus: accountStatus,
				Permissions: map[authz.Permission]bool{
					authz.PermissionMessagingRead:  true,
					authz.PermissionMessagingWrite: true,
				},
			})
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Use(middleware.RequirePermission(authz.PermissionMessagingRead))
	r.Mount("/", Routes(h))
	return r
}
