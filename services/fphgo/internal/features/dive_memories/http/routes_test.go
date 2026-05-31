package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	memoriesservice "fphgo/internal/features/dive_memories/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

const (
	httpOwnerID  = "85000000-0000-4000-8000-000000000001"
	httpMemoryID = "86000000-0000-4000-8000-000000000001"
	httpSiteID   = "87000000-0000-4000-8000-000000000001"
	httpMediaID  = "88000000-0000-4000-8000-000000000001"
)

type memoryServiceStub struct {
	listInput    memoriesservice.ListProfileMemoriesInput
	ownActor     string
	createInput  memoriesservice.UpsertMemoryInput
	updateInput  memoriesservice.UpsertMemoryInput
	addTagsInput memoriesservice.AddTagsInput
	updateTag    memoriesservice.UpdateTagInput
	listTags     memoriesservice.ListMyTagsInput
	deleteUser   string
	deleteID     string
	removeUser   string
	removeID     string
	removeTagID  string
}

func (s *memoryServiceStub) ListProfileMemories(_ context.Context, input memoriesservice.ListProfileMemoriesInput) ([]memoriesservice.Memory, error) {
	s.listInput = input
	return []memoriesservice.Memory{memoryServiceRow("public")}, nil
}

func (s *memoryServiceStub) ListOwnMemories(_ context.Context, actorID string, _ int32) ([]memoriesservice.Memory, error) {
	s.ownActor = actorID
	return []memoriesservice.Memory{memoryServiceRow("private")}, nil
}

func (s *memoryServiceStub) CreateMemory(_ context.Context, input memoriesservice.UpsertMemoryInput) (memoriesservice.Memory, error) {
	s.createInput = input
	row := memoryServiceRow(input.Visibility)
	row.MediaIDs = append([]string(nil), input.MediaIDs...)
	return row, nil
}

func (s *memoryServiceStub) UpdateMemory(_ context.Context, input memoriesservice.UpsertMemoryInput) (memoriesservice.Memory, error) {
	s.updateInput = input
	row := memoryServiceRow(input.Visibility)
	row.ID = input.MemoryID
	row.Title = input.Title
	return row, nil
}

func (s *memoryServiceStub) DeleteMemory(_ context.Context, actorID, memoryID string) error {
	s.deleteUser = actorID
	s.deleteID = memoryID
	return nil
}

func (s *memoryServiceStub) AddTags(_ context.Context, input memoriesservice.AddTagsInput) ([]memoriesservice.MemoryTag, error) {
	s.addTagsInput = input
	return []memoriesservice.MemoryTag{memoryTagRow(input.MemoryID, input.TaggedUserIDs[0], "pending")}, nil
}

func (s *memoryServiceStub) RemoveTag(_ context.Context, actorID, memoryID, taggedUserID string) error {
	s.removeUser = actorID
	s.removeID = memoryID
	s.removeTagID = taggedUserID
	return nil
}

func (s *memoryServiceStub) UpdateMyTagStatus(_ context.Context, input memoriesservice.UpdateTagInput) (memoriesservice.MemoryTag, error) {
	s.updateTag = input
	return memoryTagRow(input.MemoryID, input.ActorID, input.Status), nil
}

func (s *memoryServiceStub) ListMyTags(_ context.Context, input memoriesservice.ListMyTagsInput) ([]memoriesservice.MemoryTag, error) {
	s.listTags = input
	return []memoriesservice.MemoryTag{memoryTagRow(httpMemoryID, httpOwnerID, "pending")}, nil
}

func TestPublicProfileMemoryRouteListsVisibleMemories(t *testing.T) {
	stub := &memoryServiceStub{}
	router := PublicRoutes(New(stub, validatex.New()))

	req := httptest.NewRequest(http.MethodGet, "/aiko/dive-memories?limit=7", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if stub.listInput.Username != "aiko" || stub.listInput.Limit != 7 {
		t.Fatalf("expected profile list input, got %#v", stub.listInput)
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	items, ok := payload["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected one memory item, got %#v", payload["items"])
	}
}

func TestMemberMemoryRoutesRequireActorAndUseOwnerScope(t *testing.T) {
	stub := &memoryServiceStub{}
	router := Routes(New(stub, validatex.New()))

	req := httptest.NewRequest(http.MethodPost, "/me/dive-memories", strings.NewReader(`{"diveSiteId":"`+httpSiteID+`","title":"Turtle line","visibility":"public"}`))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthenticated without identity, got %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/me/dive-memories", strings.NewReader(`{"diveSiteId":"`+httpSiteID+`","title":"Turtle line","visibility":"public","mediaIds":["`+httpMediaID+`"]}`))
	req = withProfileWriteIdentity(req)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected create 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if stub.createInput.ActorID != httpOwnerID || stub.createInput.DiveSiteID != httpSiteID {
		t.Fatalf("expected owner-scoped create, got %#v", stub.createInput)
	}
	if len(stub.createInput.MediaIDs) != 1 || stub.createInput.MediaIDs[0] != httpMediaID {
		t.Fatalf("expected media IDs to be forwarded, got %#v", stub.createInput.MediaIDs)
	}

	req = httptest.NewRequest(http.MethodGet, "/me/dive-memories", nil)
	req = withProfileWriteIdentity(req)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected own list 200, got %d", rec.Code)
	}
	if stub.ownActor != httpOwnerID {
		t.Fatalf("expected own list actor %q, got %q", httpOwnerID, stub.ownActor)
	}
}

func TestMemberMemoryUpdateAndDeleteUseActorScope(t *testing.T) {
	stub := &memoryServiceStub{}
	router := Routes(New(stub, validatex.New()))

	req := httptest.NewRequest(http.MethodPatch, "/me/dive-memories/"+httpMemoryID, strings.NewReader(`{"diveSiteId":"`+httpSiteID+`","title":"Updated","visibility":"private"}`))
	req = withProfileWriteIdentity(req)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if stub.updateInput.ActorID != httpOwnerID || stub.updateInput.MemoryID != httpMemoryID {
		t.Fatalf("expected owner-scoped update, got %#v", stub.updateInput)
	}

	req = httptest.NewRequest(http.MethodDelete, "/me/dive-memories/"+httpMemoryID, nil)
	req = withProfileWriteIdentity(req)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected delete 204, got %d", rec.Code)
	}
	if stub.deleteUser != httpOwnerID || stub.deleteID != httpMemoryID {
		t.Fatalf("expected owner-scoped delete, got user=%q id=%q", stub.deleteUser, stub.deleteID)
	}
}

func TestMemoryTagRoutesUseActorScope(t *testing.T) {
	stub := &memoryServiceStub{}
	router := Routes(New(stub, validatex.New()))
	taggedID := "89000000-0000-4000-8000-000000000001"

	req := httptest.NewRequest(http.MethodPost, "/me/dive-memories/"+httpMemoryID+"/tags", strings.NewReader(`{"taggedUserIds":["`+taggedID+`"]}`))
	req = withProfileWriteIdentity(req)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected tag create 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	if stub.addTagsInput.ActorID != httpOwnerID || stub.addTagsInput.MemoryID != httpMemoryID || stub.addTagsInput.TaggedUserIDs[0] != taggedID {
		t.Fatalf("expected owner-scoped tag create, got %#v", stub.addTagsInput)
	}

	req = httptest.NewRequest(http.MethodDelete, "/me/dive-memories/"+httpMemoryID+"/tags/"+taggedID, nil)
	req = withProfileWriteIdentity(req)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected tag delete 204, got %d", rec.Code)
	}
	if stub.removeUser != httpOwnerID || stub.removeID != httpMemoryID || stub.removeTagID != taggedID {
		t.Fatalf("expected owner-scoped tag delete, got user=%q memory=%q tagged=%q", stub.removeUser, stub.removeID, stub.removeTagID)
	}

	req = httptest.NewRequest(http.MethodGet, "/me/dive-memory-tags?status=pending", nil)
	req = withProfileWriteIdentity(req)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected tag list 200, got %d", rec.Code)
	}
	if stub.listTags.ActorID != httpOwnerID || stub.listTags.Status != "pending" {
		t.Fatalf("expected tagged-user management read, got %#v", stub.listTags)
	}

	req = httptest.NewRequest(http.MethodPatch, "/me/dive-memory-tags/"+httpMemoryID, strings.NewReader(`{"status":"accepted"}`))
	req = withProfileWriteIdentity(req)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected tag update 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if stub.updateTag.ActorID != httpOwnerID || stub.updateTag.MemoryID != httpMemoryID || stub.updateTag.Status != "accepted" {
		t.Fatalf("expected tagged-user status update, got %#v", stub.updateTag)
	}
}

func withProfileWriteIdentity(req *http.Request) *http.Request {
	return req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{
		UserID:      httpOwnerID,
		Permissions: map[authz.Permission]bool{authz.PermissionProfilesWrite: true},
	}))
}

func memoryServiceRow(visibility string) memoriesservice.Memory {
	now := time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)
	return memoriesservice.Memory{
		ID:           httpMemoryID,
		AuthorUserID: httpOwnerID,
		DiveSiteID:   httpSiteID,
		Title:        "Memory",
		Body:         "Social context only.",
		Visibility:   visibility,
		OccurredAt:   now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

func memoryTagRow(memoryID, taggedUserID, status string) memoriesservice.MemoryTag {
	now := time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)
	return memoriesservice.MemoryTag{
		ID:           "89000000-0000-4000-8000-000000000099",
		MemoryID:     memoryID,
		TaggedUserID: taggedUserID,
		Status:       status,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}
