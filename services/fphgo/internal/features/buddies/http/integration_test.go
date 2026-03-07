package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	buddiesrepo "fphgo/internal/features/buddies/repo"
	buddiesservice "fphgo/internal/features/buddies/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

type memoryBuddiesRepo struct {
	users     map[string]bool
	requests  map[string]buddiesrepo.BuddyRequest
	buddies   map[string]buddiesrepo.Buddy
	blocked   map[string]bool
	suspended map[string]bool
}

func newMemoryBuddiesRepo() *memoryBuddiesRepo {
	return &memoryBuddiesRepo{
		users:     map[string]bool{},
		requests:  map[string]buddiesrepo.BuddyRequest{},
		buddies:   map[string]buddiesrepo.Buddy{},
		blocked:   map[string]bool{},
		suspended: map[string]bool{},
	}
}

func (m *memoryBuddiesRepo) UserExists(_ context.Context, userID string) (bool, error) {
	return m.users[userID], nil
}

func (m *memoryBuddiesRepo) IsBlockedEitherDirection(_ context.Context, a, b string) (bool, error) {
	_, ok := m.blocked[pairKey(a, b)]
	if ok {
		return true, nil
	}
	_, ok = m.blocked[pairKey(b, a)]
	return ok, nil
}

func (m *memoryBuddiesRepo) AreBuddies(_ context.Context, a, b string) (bool, error) {
	_, ok := m.buddies[pairKey(a, b)]
	return ok, nil
}

func (m *memoryBuddiesRepo) GetPendingRequestBetweenUsers(_ context.Context, a, b string) (buddiesrepo.BuddyRequest, error) {
	for _, item := range m.requests {
		if item.Status != "pending" {
			continue
		}
		if (item.RequesterUserID == a && item.TargetUserID == b) || (item.RequesterUserID == b && item.TargetUserID == a) {
			return item, nil
		}
	}
	return buddiesrepo.BuddyRequest{}, errNoRows
}

func (m *memoryBuddiesRepo) CreateBuddyRequest(_ context.Context, requesterUserID, targetUserID string) (buddiesrepo.BuddyRequest, error) {
	for _, item := range m.requests {
		if item.Status == "pending" && item.RequesterUserID == requesterUserID && item.TargetUserID == targetUserID {
			item.UpdatedAt = time.Now().UTC()
			m.requests[item.ID] = item
			return item, nil
		}
	}
	item := buddiesrepo.BuddyRequest{
		ID:              uuid.NewString(),
		RequesterUserID: requesterUserID,
		TargetUserID:    targetUserID,
		Status:          "pending",
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}
	m.requests[item.ID] = item
	return item, nil
}

func (m *memoryBuddiesRepo) GetBuddyRequestByID(_ context.Context, requestID string) (buddiesrepo.BuddyRequest, error) {
	item, ok := m.requests[requestID]
	if !ok {
		return buddiesrepo.BuddyRequest{}, errNoRows
	}
	return item, nil
}

func (m *memoryBuddiesRepo) UpdateBuddyRequestStatus(_ context.Context, requestID, status string) error {
	item, ok := m.requests[requestID]
	if !ok {
		return errNoRows
	}
	item.Status = status
	item.UpdatedAt = time.Now().UTC()
	m.requests[requestID] = item
	return nil
}

func (m *memoryBuddiesRepo) CreateBuddyPair(_ context.Context, a, b string) error {
	m.buddies[pairKey(a, b)] = buddiesrepo.Buddy{UserID: b}
	return nil
}

func (m *memoryBuddiesRepo) AcceptBuddyRequest(_ context.Context, requestID, requesterID, targetUserID string) error {
	m.buddies[pairKey(requesterID, targetUserID)] = buddiesrepo.Buddy{}
	item, ok := m.requests[requestID]
	if !ok {
		return errNoRows
	}
	item.Status = "accepted"
	item.UpdatedAt = time.Now().UTC()
	m.requests[requestID] = item
	return nil
}

func (m *memoryBuddiesRepo) DeleteBuddyPair(_ context.Context, a, b string) error {
	delete(m.buddies, pairKey(a, b))
	return nil
}

func (m *memoryBuddiesRepo) ListIncomingBuddyRequests(_ context.Context, actorUserID string) ([]buddiesrepo.IncomingRequest, error) {
	items := make([]buddiesrepo.IncomingRequest, 0)
	for _, item := range m.requests {
		if item.Status != "pending" || item.TargetUserID != actorUserID {
			continue
		}
		if m.suspended[item.RequesterUserID] {
			continue
		}
		_, blockedAB := m.blocked[pairKey(actorUserID, item.RequesterUserID)]
		_, blockedBA := m.blocked[pairKey(item.RequesterUserID, actorUserID)]
		if blockedAB || blockedBA {
			continue
		}
		items = append(items, buddiesrepo.IncomingRequest{
			Request: item,
			From: buddiesrepo.BuddyProfile{
				UserID:      item.RequesterUserID,
				Username:    "user-" + item.RequesterUserID[:8],
				DisplayName: "User " + item.RequesterUserID[:8],
			},
		})
	}
	return items, nil
}

func (m *memoryBuddiesRepo) ListOutgoingBuddyRequests(_ context.Context, actorUserID string) ([]buddiesrepo.OutgoingRequest, error) {
	items := make([]buddiesrepo.OutgoingRequest, 0)
	for _, item := range m.requests {
		if item.Status != "pending" || item.RequesterUserID != actorUserID {
			continue
		}
		if m.suspended[item.TargetUserID] {
			continue
		}
		_, blockedAB := m.blocked[pairKey(actorUserID, item.TargetUserID)]
		_, blockedBA := m.blocked[pairKey(item.TargetUserID, actorUserID)]
		if blockedAB || blockedBA {
			continue
		}
		items = append(items, buddiesrepo.OutgoingRequest{
			Request: item,
			To: buddiesrepo.BuddyProfile{
				UserID:      item.TargetUserID,
				Username:    "user-" + item.TargetUserID[:8],
				DisplayName: "User " + item.TargetUserID[:8],
			},
		})
	}
	return items, nil
}

func (m *memoryBuddiesRepo) ListBuddies(_ context.Context, actorUserID string) ([]buddiesrepo.Buddy, error) {
	items := make([]buddiesrepo.Buddy, 0)
	for key := range m.buddies {
		a, b := splitPair(key)
		var buddyID string
		if a == actorUserID {
			buddyID = b
		} else if b == actorUserID {
			buddyID = a
		} else {
			continue
		}
		if m.suspended[buddyID] {
			continue
		}
		_, blockedAB := m.blocked[pairKey(actorUserID, buddyID)]
		_, blockedBA := m.blocked[pairKey(buddyID, actorUserID)]
		if blockedAB || blockedBA {
			continue
		}
		items = append(items, buddiesrepo.Buddy{UserID: buddyID, Username: "user-" + buddyID[:8], DisplayName: "User " + buddyID[:8]})
	}
	return items, nil
}

func (m *memoryBuddiesRepo) BuddyPreview(_ context.Context, targetUserID, viewerUserID string, limit int) (buddiesrepo.BuddyPreviewResult, error) {
	allBuddies := make([]buddiesrepo.BuddyProfile, 0)
	for key := range m.buddies {
		a, b := splitPair(key)
		var buddyID string
		if a == targetUserID {
			buddyID = b
		} else if b == targetUserID {
			buddyID = a
		} else {
			continue
		}
		if m.suspended[buddyID] {
			continue
		}
		_, blockedAB := m.blocked[pairKey(viewerUserID, buddyID)]
		_, blockedBA := m.blocked[pairKey(buddyID, viewerUserID)]
		if blockedAB || blockedBA {
			continue
		}
		allBuddies = append(allBuddies, buddiesrepo.BuddyProfile{
			UserID: buddyID, Username: "user-" + buddyID[:8], DisplayName: "User " + buddyID[:8],
		})
	}
	count := len(allBuddies)
	if limit < count {
		allBuddies = allBuddies[:limit]
	}
	return buddiesrepo.BuddyPreviewResult{Count: count, Items: allBuddies}, nil
}

var errNoRows = pgx.ErrNoRows

func pairKey(a, b string) string {
	if a < b {
		return a + ":" + b
	}
	return b + ":" + a
}

func splitPair(key string) (string, string) {
	for i := 0; i < len(key); i++ {
		if key[i] == ':' {
			return key[:i], key[i+1:]
		}
	}
	return "", ""
}

func TestBuddiesAuthAndPermission(t *testing.T) {
	repo := newMemoryBuddiesRepo()
	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())

	unauth := chi.NewRouter()
	unauth.Use(middleware.RequireMember)
	unauth.Mount("/", Routes(h))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	unauth.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}

	readOnlyPerms := buildBuddiesRouter(h, authz.Identity{
		UserID:        uuid.NewString(),
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionBuddiesWrite: true,
		},
	})
	readReq := httptest.NewRequest(http.MethodGet, "/", nil)
	readRec := httptest.NewRecorder()
	readOnlyPerms.ServeHTTP(readRec, readReq)
	if readRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for missing buddies.read, got %d", readRec.Code)
	}

	writeOnlyPerms := buildBuddiesRouter(h, authz.Identity{
		UserID:        uuid.NewString(),
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionBuddiesRead: true,
		},
	})
	body := []byte(`{"targetUserId":"` + uuid.NewString() + `"}`)
	writeReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(body))
	writeReq.Header.Set("Content-Type", "application/json")
	writeRec := httptest.NewRecorder()
	writeOnlyPerms.ServeHTTP(writeRec, writeReq)
	if writeRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for missing buddies.write, got %d", writeRec.Code)
	}
}

func TestBuddiesWriteBlockedByAccountState(t *testing.T) {
	targetID := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[targetID] = true
	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())

	requestBody := []byte(`{"targetUserId":"` + targetID + `"}`)

	readOnlyRouter := buildBuddiesRouter(h, authz.Identity{
		UserID:        uuid.NewString(),
		GlobalRole:    "member",
		AccountStatus: "read_only",
		Permissions: map[authz.Permission]bool{
			authz.PermissionBuddiesRead:  true,
			authz.PermissionBuddiesWrite: true,
		},
	})
	readOnlyReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(requestBody))
	readOnlyReq.Header.Set("Content-Type", "application/json")
	readOnlyRec := httptest.NewRecorder()
	readOnlyRouter.ServeHTTP(readOnlyRec, readOnlyReq)
	if readOnlyRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for read_only write, got %d body=%s", readOnlyRec.Code, readOnlyRec.Body.String())
	}

	suspendedRouter := buildBuddiesRouter(h, authz.Identity{
		UserID:        uuid.NewString(),
		GlobalRole:    "member",
		AccountStatus: "suspended",
		Permissions: map[authz.Permission]bool{
			authz.PermissionBuddiesRead:  true,
			authz.PermissionBuddiesWrite: true,
		},
	})
	suspendedReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(requestBody))
	suspendedReq.Header.Set("Content-Type", "application/json")
	suspendedRec := httptest.NewRecorder()
	suspendedRouter.ServeHTTP(suspendedRec, suspendedReq)
	if suspendedRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for suspended write, got %d body=%s", suspendedRec.Code, suspendedRec.Body.String())
	}
}

func TestBuddiesBlockedWriteEnforcement(t *testing.T) {
	actorID := uuid.NewString()
	targetID := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[actorID] = true
	repo.users[targetID] = true
	repo.blocked[pairKey(actorID, targetID)] = true

	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())
	router := buildBuddiesRouter(h, allowAllBuddyPerms(actorID))

	body := []byte(`{"targetUserId":"` + targetID + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for blocked create, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestBuddiesLifecycleAndStateTransitions(t *testing.T) {
	requesterID := uuid.NewString()
	targetID := uuid.NewString()
	thirdID := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[requesterID] = true
	repo.users[targetID] = true
	repo.users[thirdID] = true

	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())
	requesterRouter := buildBuddiesRouter(h, allowAllBuddyPerms(requesterID))
	targetRouter := buildBuddiesRouter(h, allowAllBuddyPerms(targetID))
	thirdRouter := buildBuddiesRouter(h, allowAllBuddyPerms(thirdID))

	createBody := []byte(`{"targetUserId":"` + targetID + `"}`)
	createReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(createBody))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	requesterRouter.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 create, got %d body=%s", createRec.Code, createRec.Body.String())
	}

	var createPayload CreateBuddyRequestResponse
	if err := json.Unmarshal(createRec.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}
	requestID := createPayload.Request.ID

	outgoingReq := httptest.NewRequest(http.MethodGet, "/requests/outgoing", nil)
	outgoingRec := httptest.NewRecorder()
	requesterRouter.ServeHTTP(outgoingRec, outgoingReq)
	if outgoingRec.Code != http.StatusOK {
		t.Fatalf("expected 200 outgoing list, got %d", outgoingRec.Code)
	}

	incomingReq := httptest.NewRequest(http.MethodGet, "/requests/incoming", nil)
	incomingRec := httptest.NewRecorder()
	targetRouter.ServeHTTP(incomingRec, incomingReq)
	if incomingRec.Code != http.StatusOK {
		t.Fatalf("expected 200 incoming list, got %d", incomingRec.Code)
	}

	repo.blocked[pairKey(requesterID, targetID)] = true
	blockedAcceptReq := httptest.NewRequest(http.MethodPost, "/requests/"+requestID+"/accept", nil)
	blockedAcceptRec := httptest.NewRecorder()
	targetRouter.ServeHTTP(blockedAcceptRec, blockedAcceptReq)
	if blockedAcceptRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 blocked accept, got %d", blockedAcceptRec.Code)
	}
	delete(repo.blocked, pairKey(requesterID, targetID))

	acceptReq := httptest.NewRequest(http.MethodPost, "/requests/"+requestID+"/accept", nil)
	acceptRec := httptest.NewRecorder()
	targetRouter.ServeHTTP(acceptRec, acceptReq)
	if acceptRec.Code != http.StatusOK {
		t.Fatalf("expected 200 accept, got %d body=%s", acceptRec.Code, acceptRec.Body.String())
	}

	listBuddiesReq := httptest.NewRequest(http.MethodGet, "/", nil)
	listBuddiesRec := httptest.NewRecorder()
	requesterRouter.ServeHTTP(listBuddiesRec, listBuddiesReq)
	if listBuddiesRec.Code != http.StatusOK {
		t.Fatalf("expected 200 buddies list, got %d", listBuddiesRec.Code)
	}
	var buddies ListBuddiesResponse
	if err := json.Unmarshal(listBuddiesRec.Body.Bytes(), &buddies); err != nil {
		t.Fatalf("decode buddies list: %v", err)
	}
	if len(buddies.Items) != 1 || buddies.Items[0].UserID != targetID {
		t.Fatalf("expected target in buddy list, got %+v", buddies.Items)
	}

	removeReq := httptest.NewRequest(http.MethodDelete, "/"+targetID, nil)
	removeRec := httptest.NewRecorder()
	requesterRouter.ServeHTTP(removeRec, removeReq)
	if removeRec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 remove buddy, got %d", removeRec.Code)
	}

	finalListReq := httptest.NewRequest(http.MethodGet, "/", nil)
	finalListRec := httptest.NewRecorder()
	requesterRouter.ServeHTTP(finalListRec, finalListReq)
	if finalListRec.Code != http.StatusOK {
		t.Fatalf("expected 200 final list, got %d", finalListRec.Code)
	}
	if err := json.Unmarshal(finalListRec.Body.Bytes(), &buddies); err != nil {
		t.Fatalf("decode final buddies list: %v", err)
	}
	if len(buddies.Items) != 0 {
		t.Fatalf("expected 0 buddies after remove, got %+v", buddies.Items)
	}

	declineBody := []byte(`{"targetUserId":"` + thirdID + `"}`)
	createDeclineReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(declineBody))
	createDeclineReq.Header.Set("Content-Type", "application/json")
	createDeclineRec := httptest.NewRecorder()
	targetRouter.ServeHTTP(createDeclineRec, createDeclineReq)
	if createDeclineRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 create for decline flow, got %d body=%s", createDeclineRec.Code, createDeclineRec.Body.String())
	}

	var declineCreatePayload CreateBuddyRequestResponse
	if err := json.Unmarshal(createDeclineRec.Body.Bytes(), &declineCreatePayload); err != nil {
		t.Fatalf("decode decline create: %v", err)
	}

	declineReq := httptest.NewRequest(http.MethodPost, "/requests/"+declineCreatePayload.Request.ID+"/decline", nil)
	declineRec := httptest.NewRecorder()
	thirdRouter.ServeHTTP(declineRec, declineReq)
	if declineRec.Code != http.StatusOK {
		t.Fatalf("expected 200 decline, got %d body=%s", declineRec.Code, declineRec.Body.String())
	}
	var declinePayload CreateBuddyRequestResponse
	if err := json.Unmarshal(declineRec.Body.Bytes(), &declinePayload); err != nil {
		t.Fatalf("decode decline payload: %v", err)
	}
	if declinePayload.Request.Status != "declined" {
		t.Fatalf("expected declined status, got %s", declinePayload.Request.Status)
	}
}

func TestBuddiesReverseRequestConvergence(t *testing.T) {
	userA := uuid.NewString()
	userB := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[userA] = true
	repo.users[userB] = true

	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())
	routerA := buildBuddiesRouter(h, allowAllBuddyPerms(userA))
	routerB := buildBuddiesRouter(h, allowAllBuddyPerms(userB))

	bodyA := []byte(`{"targetUserId":"` + userB + `"}`)
	createReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(bodyA))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	routerA.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("A->B request expected 201, got %d body=%s", createRec.Code, createRec.Body.String())
	}

	bodyB := []byte(`{"targetUserId":"` + userA + `"}`)
	reverseReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(bodyB))
	reverseReq.Header.Set("Content-Type", "application/json")
	reverseRec := httptest.NewRecorder()
	routerB.ServeHTTP(reverseRec, reverseReq)
	if reverseRec.Code != http.StatusCreated {
		t.Fatalf("B->A reverse expected auto-accept (201), got %d body=%s", reverseRec.Code, reverseRec.Body.String())
	}

	var payload CreateBuddyRequestResponse
	if err := json.Unmarshal(reverseRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode reverse payload: %v", err)
	}
	if payload.Request.Status != "accepted" {
		t.Fatalf("expected accepted status after convergence, got %s", payload.Request.Status)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/", nil)
	listRec := httptest.NewRecorder()
	routerA.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200 buddy list, got %d", listRec.Code)
	}
	var buddies ListBuddiesResponse
	if err := json.Unmarshal(listRec.Body.Bytes(), &buddies); err != nil {
		t.Fatalf("decode buddies: %v", err)
	}
	if len(buddies.Items) != 1 || buddies.Items[0].UserID != userB {
		t.Fatalf("expected B in buddy list after convergence, got %+v", buddies.Items)
	}
}

func TestBuddiesCancelOutgoingRequest(t *testing.T) {
	requesterID := uuid.NewString()
	targetID := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[requesterID] = true
	repo.users[targetID] = true

	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())
	requesterRouter := buildBuddiesRouter(h, allowAllBuddyPerms(requesterID))
	targetRouter := buildBuddiesRouter(h, allowAllBuddyPerms(targetID))

	createBody := []byte(`{"targetUserId":"` + targetID + `"}`)
	createReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(createBody))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	requesterRouter.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 create, got %d body=%s", createRec.Code, createRec.Body.String())
	}

	var createPayload CreateBuddyRequestResponse
	if err := json.Unmarshal(createRec.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode create: %v", err)
	}
	requestID := createPayload.Request.ID

	targetCancelReq := httptest.NewRequest(http.MethodDelete, "/requests/"+requestID, nil)
	targetCancelRec := httptest.NewRecorder()
	targetRouter.ServeHTTP(targetCancelRec, targetCancelReq)
	if targetCancelRec.Code != http.StatusForbidden {
		t.Fatalf("target cancel expected 403, got %d body=%s", targetCancelRec.Code, targetCancelRec.Body.String())
	}

	cancelReq := httptest.NewRequest(http.MethodDelete, "/requests/"+requestID, nil)
	cancelRec := httptest.NewRecorder()
	requesterRouter.ServeHTTP(cancelRec, cancelReq)
	if cancelRec.Code != http.StatusOK {
		t.Fatalf("expected 200 cancel, got %d body=%s", cancelRec.Code, cancelRec.Body.String())
	}
	var cancelPayload CreateBuddyRequestResponse
	if err := json.Unmarshal(cancelRec.Body.Bytes(), &cancelPayload); err != nil {
		t.Fatalf("decode cancel: %v", err)
	}
	if cancelPayload.Request.Status != "cancelled" {
		t.Fatalf("expected cancelled status, got %s", cancelPayload.Request.Status)
	}

	outgoingReq := httptest.NewRequest(http.MethodGet, "/requests/outgoing", nil)
	outgoingRec := httptest.NewRecorder()
	requesterRouter.ServeHTTP(outgoingRec, outgoingReq)
	var outgoing ListOutgoingBuddyRequestsResponse
	if err := json.Unmarshal(outgoingRec.Body.Bytes(), &outgoing); err != nil {
		t.Fatalf("decode outgoing: %v", err)
	}
	if len(outgoing.Items) != 0 {
		t.Fatalf("expected 0 pending outgoing after cancel, got %d", len(outgoing.Items))
	}
}

func TestBuddiesBlockedUsersExcludedFromListAndCount(t *testing.T) {
	actorID := uuid.NewString()
	buddyA := uuid.NewString()
	buddyB := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[actorID] = true
	repo.users[buddyA] = true
	repo.users[buddyB] = true
	repo.buddies[pairKey(actorID, buddyA)] = buddiesrepo.Buddy{UserID: buddyA}
	repo.buddies[pairKey(actorID, buddyB)] = buddiesrepo.Buddy{UserID: buddyB}

	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())
	router := buildBuddiesRouter(h, allowAllBuddyPerms(actorID))

	listReq := httptest.NewRequest(http.MethodGet, "/", nil)
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	var buddies ListBuddiesResponse
	if err := json.Unmarshal(listRec.Body.Bytes(), &buddies); err != nil {
		t.Fatalf("decode buddies: %v", err)
	}
	if len(buddies.Items) != 2 {
		t.Fatalf("expected 2 buddies before block, got %d", len(buddies.Items))
	}

	repo.blocked[pairKey(actorID, buddyA)] = true

	listReq2 := httptest.NewRequest(http.MethodGet, "/", nil)
	listRec2 := httptest.NewRecorder()
	router.ServeHTTP(listRec2, listReq2)
	var buddies2 ListBuddiesResponse
	if err := json.Unmarshal(listRec2.Body.Bytes(), &buddies2); err != nil {
		t.Fatalf("decode buddies after block: %v", err)
	}
	if len(buddies2.Items) != 1 {
		t.Fatalf("expected 1 buddy after blocking A, got %d", len(buddies2.Items))
	}
	if buddies2.Items[0].UserID != buddyB {
		t.Fatalf("expected buddyB in list, got %s", buddies2.Items[0].UserID)
	}
}

func TestBuddiesSuspendedUsersExcludedFromList(t *testing.T) {
	actorID := uuid.NewString()
	buddyA := uuid.NewString()
	buddyB := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[actorID] = true
	repo.users[buddyA] = true
	repo.users[buddyB] = true
	repo.buddies[pairKey(actorID, buddyA)] = buddiesrepo.Buddy{UserID: buddyA}
	repo.buddies[pairKey(actorID, buddyB)] = buddiesrepo.Buddy{UserID: buddyB}

	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())
	router := buildBuddiesRouter(h, allowAllBuddyPerms(actorID))

	repo.suspended[buddyA] = true

	listReq := httptest.NewRequest(http.MethodGet, "/", nil)
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	var buddies ListBuddiesResponse
	if err := json.Unmarshal(listRec.Body.Bytes(), &buddies); err != nil {
		t.Fatalf("decode buddies: %v", err)
	}
	if len(buddies.Items) != 1 {
		t.Fatalf("expected 1 buddy after suspend, got %d", len(buddies.Items))
	}
	if buddies.Items[0].UserID != buddyB {
		t.Fatalf("expected buddyB in list, got %s", buddies.Items[0].UserID)
	}
}

func TestBuddyPreviewEndpoint(t *testing.T) {
	viewerID := uuid.NewString()
	targetID := uuid.NewString()
	buddyA := uuid.NewString()
	buddyB := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[viewerID] = true
	repo.users[targetID] = true
	repo.users[buddyA] = true
	repo.users[buddyB] = true
	repo.buddies[pairKey(targetID, buddyA)] = buddiesrepo.Buddy{UserID: buddyA}
	repo.buddies[pairKey(targetID, buddyB)] = buddiesrepo.Buddy{UserID: buddyB}

	svc := buddiesservice.New(repo)
	h := New(svc, validatex.New())
	router := buildBuddiesRouter(h, allowAllBuddyPerms(viewerID))

	previewReq := httptest.NewRequest(http.MethodGet, "/preview/"+targetID, nil)
	previewRec := httptest.NewRecorder()
	router.ServeHTTP(previewRec, previewReq)
	if previewRec.Code != http.StatusOK {
		t.Fatalf("expected 200 preview, got %d body=%s", previewRec.Code, previewRec.Body.String())
	}

	var preview BuddyPreviewResponse
	if err := json.Unmarshal(previewRec.Body.Bytes(), &preview); err != nil {
		t.Fatalf("decode preview: %v", err)
	}
	if preview.Count != 2 {
		t.Fatalf("expected count=2, got %d", preview.Count)
	}
	if len(preview.Items) != 2 {
		t.Fatalf("expected 2 preview items, got %d", len(preview.Items))
	}

	repo.blocked[pairKey(viewerID, buddyA)] = true
	previewReq2 := httptest.NewRequest(http.MethodGet, "/preview/"+targetID, nil)
	previewRec2 := httptest.NewRecorder()
	router.ServeHTTP(previewRec2, previewReq2)
	var preview2 BuddyPreviewResponse
	if err := json.Unmarshal(previewRec2.Body.Bytes(), &preview2); err != nil {
		t.Fatalf("decode preview after block: %v", err)
	}
	if preview2.Count != 1 {
		t.Fatalf("expected count=1 after viewer blocks buddyA, got %d", preview2.Count)
	}
}

func buildBuddiesRouter(h *Handlers, identity authz.Identity) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(h))
	return r
}

func allowAllBuddyPerms(userID string) authz.Identity {
	return authz.Identity{
		UserID:        userID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionBuddiesRead:  true,
			authz.PermissionBuddiesWrite: true,
		},
	}
}

type denyAfterLimiter struct {
	limit int
	count int
}

func (l *denyAfterLimiter) Allow(context.Context, string, string, int, time.Duration) (sharedratelimit.Result, error) {
	l.count++
	if l.count > l.limit {
		return sharedratelimit.Result{Allowed: false, RetryAfter: time.Second}, nil
	}
	return sharedratelimit.Result{Allowed: true}, nil
}

func TestBuddiesCreateRequestRateLimitedContract(t *testing.T) {
	actorID := uuid.NewString()
	targetID := uuid.NewString()
	target2ID := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[actorID] = true
	repo.users[targetID] = true
	repo.users[target2ID] = true

	limiter := &denyAfterLimiter{limit: 1}
	svc := buddiesservice.New(repo, buddiesservice.WithLimiter(limiter))
	h := New(svc, validatex.New())
	router := buildBuddiesRouter(h, allowAllBuddyPerms(actorID))

	body := []byte(`{"targetUserId":"` + targetID + `"}`)
	firstReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(body))
	firstReq.Header.Set("Content-Type", "application/json")
	firstRec := httptest.NewRecorder()
	router.ServeHTTP(firstRec, firstReq)
	if firstRec.Code != http.StatusCreated {
		t.Fatalf("first create expected 201, got %d body=%s", firstRec.Code, firstRec.Body.String())
	}

	body2 := []byte(`{"targetUserId":"` + target2ID + `"}`)
	secondReq := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(body2))
	secondReq.Header.Set("Content-Type", "application/json")
	secondRec := httptest.NewRecorder()
	router.ServeHTTP(secondRec, secondReq)
	if secondRec.Code != http.StatusTooManyRequests {
		t.Fatalf("second create expected 429, got %d body=%s", secondRec.Code, secondRec.Body.String())
	}
	if secondRec.Header().Get("Retry-After") == "" {
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
}

func TestBuddiesRemoveBuddyRateLimitedContract(t *testing.T) {
	actorID := uuid.NewString()
	targetID := uuid.NewString()
	target2ID := uuid.NewString()
	repo := newMemoryBuddiesRepo()
	repo.users[actorID] = true
	repo.users[targetID] = true
	repo.users[target2ID] = true
	repo.buddies[pairKey(actorID, targetID)] = buddiesrepo.Buddy{UserID: targetID}
	repo.buddies[pairKey(actorID, target2ID)] = buddiesrepo.Buddy{UserID: target2ID}

	limiter := &denyAfterLimiter{limit: 1}
	svc := buddiesservice.New(repo, buddiesservice.WithLimiter(limiter))
	h := New(svc, validatex.New())
	router := buildBuddiesRouter(h, allowAllBuddyPerms(actorID))

	firstReq := httptest.NewRequest(http.MethodDelete, "/"+targetID, nil)
	firstRec := httptest.NewRecorder()
	router.ServeHTTP(firstRec, firstReq)
	if firstRec.Code != http.StatusNoContent {
		t.Fatalf("first remove expected 204, got %d body=%s", firstRec.Code, firstRec.Body.String())
	}

	secondReq := httptest.NewRequest(http.MethodDelete, "/"+target2ID, nil)
	secondRec := httptest.NewRecorder()
	router.ServeHTTP(secondRec, secondReq)
	if secondRec.Code != http.StatusTooManyRequests {
		t.Fatalf("second remove expected 429, got %d body=%s", secondRec.Code, secondRec.Body.String())
	}
	if secondRec.Header().Get("Retry-After") == "" {
		t.Fatal("expected Retry-After header for 429 response")
	}
}
