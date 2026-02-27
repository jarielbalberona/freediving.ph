package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	messagingrepo "fphgo/internal/features/messaging/repo"
	messagingservice "fphgo/internal/features/messaging/service"
	"fphgo/internal/middleware"
	"fphgo/internal/realtime/ws"
	"fphgo/internal/shared/authz"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

type memoryMessagingRepo struct {
	buddies map[string]bool
	items   []messagingrepo.MessageItem
	others  map[string]string
	edges   map[string]bool
}

func (m *memoryMessagingRepo) AreBuddies(_ context.Context, a, b string) (bool, error) {
	if m.buddies == nil {
		return false, nil
	}
	return m.buddies[pairKey(a, b)], nil
}

func (m *memoryMessagingRepo) UpsertDMConversation(_ context.Context, senderID, _ string, status string) (messagingrepo.Conversation, error) {
	return messagingrepo.Conversation{ID: "550e8400-e29b-41d4-a716-446655440099", InitiatorUserID: senderID, Status: status}, nil
}

func (m *memoryMessagingRepo) InsertMessage(_ context.Context, _, _, _ string) (int64, error) {
	return 1, nil
}

func (m *memoryMessagingRepo) GetConversation(_ context.Context, conversationID string) (messagingrepo.Conversation, error) {
	return messagingrepo.Conversation{ID: conversationID, Status: "pending", InitiatorUserID: "550e8400-e29b-41d4-a716-446655440001"}, nil
}

func (m *memoryMessagingRepo) IsParticipant(_ context.Context, _, _ string) (bool, error) {
	return true, nil
}

func (m *memoryMessagingRepo) UpdateConversationStatus(_ context.Context, _, _ string) error {
	return nil
}

func (m *memoryMessagingRepo) Inbox(_ context.Context, input messagingrepo.ListInboxInput) ([]messagingrepo.MessageItem, error) {
	out := make([]messagingrepo.MessageItem, 0, len(m.items))
	for _, item := range m.items {
		otherID := m.others[item.ConversationID]
		if otherID == "" {
			continue
		}
		if isBlockedWithMap(m.edges, input.UserID, otherID) {
			continue
		}
		if item.CreatedAt.After(input.CursorCreated) || (item.CreatedAt.Equal(input.CursorCreated) && item.MessageID >= input.CursorMessageID) {
			continue
		}
		out = append(out, item)
	}
	if int(input.Limit) < len(out) {
		return out[:input.Limit], nil
	}
	return out, nil
}

func (m *memoryMessagingRepo) Requests(_ context.Context, _ string) ([]messagingrepo.MessageItem, error) {
	return []messagingrepo.MessageItem{}, nil
}

type memoryBlockChecker struct {
	edges map[string]bool
}

func (m memoryBlockChecker) IsBlockedEitherDirection(_ context.Context, a, b string) (bool, error) {
	return isBlockedWithMap(m.edges, a, b), nil
}

type testHub struct{}

func (testHub) BroadcastEnvelope(ws.Envelope) {}

type testLimiter struct {
	denyAfter map[string]int
	counts    map[string]int
}

func (l *testLimiter) Allow(_ context.Context, scope, key string, _ int, _ time.Duration) (sharedratelimit.Result, error) {
	if l.counts == nil {
		l.counts = map[string]int{}
	}
	composite := scope + "|" + key
	l.counts[composite]++
	if limit, ok := l.denyAfter[composite]; ok && l.counts[composite] > limit {
		return sharedratelimit.Result{Allowed: false, RetryAfter: time.Second}, nil
	}
	return sharedratelimit.Result{Allowed: true}, nil
}

func TestMessagingBlockedSendReturnsForbiddenBothDirections(t *testing.T) {
	actorID := "550e8400-e29b-41d4-a716-446655440000"
	otherID := "550e8400-e29b-41d4-a716-446655440001"

	tests := []struct {
		name  string
		edges map[string]bool
	}{
		{
			name: "actor blocks recipient",
			edges: map[string]bool{
				actorID + ":" + otherID: true,
			},
		},
		{
			name: "recipient blocks actor",
			edges: map[string]bool{
				otherID + ":" + actorID: true,
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &memoryMessagingRepo{}
			svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: tc.edges})
			h := New(svc, nil, validatex.New())
			router := buildMessagingRouter(h, actorID)

			req := httptest.NewRequest(http.MethodPost, "/send", strings.NewReader(`{"recipientId":"`+otherID+`","content":"hello"}`))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusForbidden {
				t.Fatalf("expected 403, got %d body=%s", rec.Code, rec.Body.String())
			}
			var payload map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			errObj, _ := payload["error"].(map[string]any)
			if errObj["code"] != "blocked" {
				t.Fatalf("expected blocked code, got %v body=%s", errObj["code"], rec.Body.String())
			}
		})
	}
}

func TestMessagingInboxHidesBlockedRelationships(t *testing.T) {
	actorID := "550e8400-e29b-41d4-a716-446655440000"
	blockedID := "550e8400-e29b-41d4-a716-446655440001"
	visibleID := "550e8400-e29b-41d4-a716-446655440002"

	edges := map[string]bool{
		actorID + ":" + blockedID: true,
	}
	repo := &memoryMessagingRepo{
		edges: edges,
		items: []messagingrepo.MessageItem{
			{ConversationID: "conv-blocked", MessageID: 1, SenderID: blockedID, Content: "blocked", Status: "active", CreatedAt: time.Now().UTC()},
			{ConversationID: "conv-visible", MessageID: 2, SenderID: visibleID, Content: "visible", Status: "active", CreatedAt: time.Now().UTC()},
		},
		others: map[string]string{
			"conv-blocked": blockedID,
			"conv-visible": visibleID,
		},
	}
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{edges: edges})
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, actorID)

	req := httptest.NewRequest(http.MethodGet, "/inbox", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload ListMessagesResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Items) != 1 {
		t.Fatalf("expected 1 visible inbox item, got %d", len(payload.Items))
	}
	if payload.Items[0].ConversationID != "conv-visible" {
		t.Fatalf("expected visible conversation, got %q", payload.Items[0].ConversationID)
	}
}

func TestMessagingSendRateLimited(t *testing.T) {
	actorID := "550e8400-e29b-41d4-a716-446655440000"
	otherID := "550e8400-e29b-41d4-a716-446655440001"

	repo := &memoryMessagingRepo{
		buddies: map[string]bool{
			pairKey(actorID, otherID): true,
		},
	}
	limiter := &testLimiter{
		denyAfter: map[string]int{
			"messages.send|" + actorID: 1,
		},
	}
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{}, messagingservice.WithLimiter(limiter))
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, actorID)

	body := `{"recipientId":"` + otherID + `","content":"hello"}`
	firstReq := httptest.NewRequest(http.MethodPost, "/send", strings.NewReader(body))
	firstReq.Header.Set("Content-Type", "application/json")
	firstRec := httptest.NewRecorder()
	router.ServeHTTP(firstRec, firstReq)
	if firstRec.Code != http.StatusOK {
		t.Fatalf("first send expected 200, got %d body=%s", firstRec.Code, firstRec.Body.String())
	}

	secondReq := httptest.NewRequest(http.MethodPost, "/send", strings.NewReader(body))
	secondReq.Header.Set("Content-Type", "application/json")
	secondRec := httptest.NewRecorder()
	router.ServeHTTP(secondRec, secondReq)
	if secondRec.Code != http.StatusTooManyRequests {
		t.Fatalf("second send expected 429, got %d body=%s", secondRec.Code, secondRec.Body.String())
	}
	retryAfterHeader := secondRec.Header().Get("Retry-After")
	if retryAfterHeader == "" {
		t.Fatal("expected Retry-After header for 429 response")
	}
	var payload map[string]any
	if err := json.Unmarshal(secondRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errObj, _ := payload["error"].(map[string]any)
	if errObj["code"] != "rate_limited" {
		t.Fatalf("expected rate_limited code, got %v", errObj["code"])
	}
	details, _ := errObj["details"].(map[string]any)
	windowSeconds, windowOK := details["window_seconds"].(float64)
	retryAfterSeconds, retryOK := details["retry_after_seconds"].(float64)
	if !windowOK || windowSeconds < 1 {
		t.Fatalf("expected positive details.window_seconds, got %+v", details)
	}
	if !retryOK || retryAfterSeconds < 1 {
		t.Fatalf("expected positive details.retry_after_seconds, got %+v", details)
	}
	if retryAfterHeader != strconv.Itoa(int(retryAfterSeconds)) {
		t.Fatalf("expected Retry-After=%v to match details.retry_after_seconds=%v", retryAfterHeader, retryAfterSeconds)
	}
}

func TestMessagingInboxCursorPaginationStable(t *testing.T) {
	actorID := "550e8400-e29b-41d4-a716-446655440000"
	peerA := "550e8400-e29b-41d4-a716-446655440001"
	peerB := "550e8400-e29b-41d4-a716-446655440002"
	peerC := "550e8400-e29b-41d4-a716-446655440003"
	now := time.Now().UTC()

	repo := &memoryMessagingRepo{
		items: []messagingrepo.MessageItem{
			{ConversationID: "c3", MessageID: 3, SenderID: peerC, Content: "3", Status: "active", CreatedAt: now.Add(-1 * time.Minute)},
			{ConversationID: "c2", MessageID: 2, SenderID: peerB, Content: "2", Status: "active", CreatedAt: now.Add(-2 * time.Minute)},
			{ConversationID: "c1", MessageID: 1, SenderID: peerA, Content: "1", Status: "active", CreatedAt: now.Add(-3 * time.Minute)},
		},
		others: map[string]string{
			"c1": peerA,
			"c2": peerB,
			"c3": peerC,
		},
	}
	svc := messagingservice.New(repo, testHub{}, memoryBlockChecker{})
	h := New(svc, nil, validatex.New())
	router := buildMessagingRouter(h, actorID)

	page1Req := httptest.NewRequest(http.MethodGet, "/inbox?limit=2", nil)
	page1Rec := httptest.NewRecorder()
	router.ServeHTTP(page1Rec, page1Req)
	if page1Rec.Code != http.StatusOK {
		t.Fatalf("page1 expected 200, got %d", page1Rec.Code)
	}
	var page1 ListMessagesResponse
	if err := json.Unmarshal(page1Rec.Body.Bytes(), &page1); err != nil {
		t.Fatalf("decode page1: %v", err)
	}
	if len(page1.Items) != 2 {
		t.Fatalf("expected 2 inbox items on page1, got %d", len(page1.Items))
	}
	if page1.Items[0].MessageID != 3 || page1.Items[1].MessageID != 2 {
		t.Fatalf("expected stable ordering desc by createdAt/messageId, got %+v", page1.Items)
	}
	if page1.NextCursor == "" {
		t.Fatal("expected nextCursor on first page")
	}

	page2Req := httptest.NewRequest(http.MethodGet, "/inbox?limit=2&cursor="+page1.NextCursor, nil)
	page2Rec := httptest.NewRecorder()
	router.ServeHTTP(page2Rec, page2Req)
	if page2Rec.Code != http.StatusOK {
		t.Fatalf("page2 expected 200, got %d", page2Rec.Code)
	}
	var page2 ListMessagesResponse
	if err := json.Unmarshal(page2Rec.Body.Bytes(), &page2); err != nil {
		t.Fatalf("decode page2: %v", err)
	}
	if len(page2.Items) != 1 || page2.Items[0].MessageID != 1 {
		t.Fatalf("expected remaining item on page2, got %+v", page2.Items)
	}
}

func buildMessagingRouter(h *Handlers, actorID string) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), authz.Identity{
				UserID:        actorID,
				GlobalRole:    "member",
				AccountStatus: "active",
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

func pairKey(a, b string) string {
	if a < b {
		return a + ":" + b
	}
	return b + ":" + a
}

func isBlockedWithMap(edges map[string]bool, a, b string) bool {
	if len(edges) == 0 {
		return false
	}
	return edges[a+":"+b] || edges[b+":"+a]
}
