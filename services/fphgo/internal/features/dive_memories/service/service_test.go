package service

import (
	"context"
	"testing"
	"time"

	journeyservice "fphgo/internal/features/dive_journey/service"
	memoriesrepo "fphgo/internal/features/dive_memories/repo"
)

const (
	testAuthorID = "81000000-0000-4000-8000-000000000001"
	testViewerID = "81000000-0000-4000-8000-000000000002"
	testSiteID   = "82000000-0000-4000-8000-000000000001"
	testMemoryID = "83000000-0000-4000-8000-000000000001"
)

type repoStub struct {
	owner       memoriesrepo.MemoryOwner
	listInput   memoriesrepo.ListProfileInput
	ownUserID   string
	createInput memoriesrepo.UpsertMemoryInput
	updateInput memoriesrepo.UpsertMemoryInput
	ownedMedia  map[string]struct{}
	memory      memoriesrepo.Memory
	blocked     bool
	tagsInput   memoriesrepo.ListTaggedUserTagsInput
	deleteUser  string
	deleteID    string
	diveMapRows int
	updateErr   error
	deleteErr   error
}

type journeyStub struct {
	upsertInput journeyservice.UpsertGeneratedJourneyEntryInput
	hideInput   journeyservice.HideGeneratedJourneyEntryInput
}

func (j *journeyStub) UpsertGeneratedEntry(_ context.Context, input journeyservice.UpsertGeneratedJourneyEntryInput) (journeyservice.JourneyEntry, error) {
	j.upsertInput = input
	return journeyservice.JourneyEntry{ID: "journey-memory", UserID: input.UserID, Type: input.Type, SourceType: input.SourceType, SourceID: input.SourceID}, nil
}

func (j *journeyStub) HideGeneratedEntry(_ context.Context, input journeyservice.HideGeneratedJourneyEntryInput) error {
	j.hideInput = input
	return nil
}

func (r *repoStub) GetOwnerByUsername(context.Context, string, string) (memoriesrepo.MemoryOwner, error) {
	if r.owner.UserID == "" {
		r.owner.UserID = testAuthorID
	}
	return r.owner, nil
}

func (r *repoStub) ListForProfile(_ context.Context, input memoriesrepo.ListProfileInput) ([]memoriesrepo.Memory, error) {
	r.listInput = input
	return []memoriesrepo.Memory{memoryRow("public")}, nil
}

func (r *repoStub) ListOwn(_ context.Context, authorUserID string, _ int32) ([]memoriesrepo.Memory, error) {
	r.ownUserID = authorUserID
	return []memoriesrepo.Memory{memoryRow("private")}, nil
}

func (r *repoStub) Create(_ context.Context, input memoriesrepo.UpsertMemoryInput) (memoriesrepo.Memory, error) {
	r.createInput = input
	row := memoryRow(input.Visibility)
	row.MediaIDs = append([]string(nil), input.MediaIDs...)
	return row, nil
}

func (r *repoStub) Update(_ context.Context, input memoriesrepo.UpsertMemoryInput) (memoriesrepo.Memory, error) {
	r.updateInput = input
	if r.updateErr != nil {
		return memoriesrepo.Memory{}, r.updateErr
	}
	row := memoryRow(input.Visibility)
	row.ID = input.ID
	row.Title = input.Title
	row.MediaIDs = append([]string(nil), input.MediaIDs...)
	return row, nil
}

func (r *repoStub) SoftDelete(_ context.Context, authorUserID, memoryID string) error {
	r.deleteUser = authorUserID
	r.deleteID = memoryID
	return r.deleteErr
}

func (r *repoStub) ListOwnedActiveMedia(_ context.Context, _ string, mediaIDs []string) (map[string]struct{}, error) {
	if r.ownedMedia != nil {
		return r.ownedMedia, nil
	}
	out := map[string]struct{}{}
	for _, mediaID := range mediaIDs {
		out[mediaID] = struct{}{}
	}
	return out, nil
}

func (r *repoStub) GetByID(_ context.Context, id string) (memoriesrepo.Memory, error) {
	if r.memory.ID != "" {
		return r.memory, nil
	}
	row := memoryRow("tagged")
	row.ID = id
	return row, nil
}

func (r *repoStub) UpsertTag(_ context.Context, memoryID, taggedUserID string) (memoriesrepo.MemoryTag, error) {
	return tagRow(memoryID, taggedUserID, "pending"), nil
}

func (r *repoStub) DeleteTag(context.Context, string, string) error {
	return nil
}

func (r *repoStub) UpdateTagStatus(_ context.Context, memoryID, taggedUserID, status string) (memoriesrepo.MemoryTag, error) {
	return tagRow(memoryID, taggedUserID, status), nil
}

func (r *repoStub) ListTags(context.Context, string) ([]memoriesrepo.MemoryTag, error) {
	return nil, nil
}

func (r *repoStub) ListTagsForTaggedUser(_ context.Context, input memoriesrepo.ListTaggedUserTagsInput) ([]memoriesrepo.MemoryTag, error) {
	r.tagsInput = input
	return []memoriesrepo.MemoryTag{tagRow(testMemoryID, input.TaggedUserID, "pending")}, nil
}

func (r *repoStub) HasBlockBetweenUsers(context.Context, string, string) (bool, error) {
	return r.blocked, nil
}

func TestListProfileMemoriesForwardsVisibilityContext(t *testing.T) {
	repo := &repoStub{owner: memoriesrepo.MemoryOwner{
		UserID:        testAuthorID,
		ViewerFollows: true,
	}}
	service := New(repo)
	_, err := service.ListProfileMemories(context.Background(), ListProfileMemoriesInput{
		Username:     "aiko",
		ViewerUserID: testViewerID,
		Limit:        9,
	})
	if err != nil {
		t.Fatalf("list profile memories: %v", err)
	}
	if repo.listInput.TargetUserID != testAuthorID || repo.listInput.ViewerUserID != testViewerID || !repo.listInput.ViewerFollows || repo.listInput.Limit != 9 {
		t.Fatalf("visibility context not forwarded: %#v", repo.listInput)
	}
}

func TestCreateMemoryRequiresSiteAndDoesNotTouchDiveMap(t *testing.T) {
	repo := &repoStub{}
	service := New(repo).WithNow(func() time.Time {
		return time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)
	})
	if _, err := service.CreateMemory(context.Background(), UpsertMemoryInput{
		ActorID:    testAuthorID,
		Title:      "Missing site",
		Visibility: "public",
	}); err == nil {
		t.Fatalf("expected missing dive site validation")
	}
	created, err := service.CreateMemory(context.Background(), UpsertMemoryInput{
		ActorID:    testAuthorID,
		DiveSiteID: testSiteID,
		Title:      "Memory",
		Body:       "Social context only.",
		Visibility: "followers",
	})
	if err != nil {
		t.Fatalf("create memory: %v", err)
	}
	if created.Visibility != "followers" || repo.createInput.AuthorUserID != testAuthorID || repo.createInput.DiveSiteID != testSiteID {
		t.Fatalf("unexpected create result=%#v input=%#v", created, repo.createInput)
	}
	if len(repo.createInput.MediaIDs) != 0 || repo.diveMapRows != 0 {
		t.Fatalf("phase 3 create must not attach media or mutate Dive Map, input=%#v mapRows=%d", repo.createInput, repo.diveMapRows)
	}
}

func TestMemoryWritesRefreshDisplayOnlyJourneyEntry(t *testing.T) {
	repo := &repoStub{}
	journey := &journeyStub{}
	service := New(repo, WithJourneyWriter(journey))
	created, err := service.CreateMemory(context.Background(), UpsertMemoryInput{
		ActorID:    testAuthorID,
		DiveSiteID: testSiteID,
		Title:      "Journey display",
		Visibility: "tagged",
	})
	if err != nil {
		t.Fatalf("create memory: %v", err)
	}
	if journey.upsertInput.Type != "memory" || journey.upsertInput.SourceType != "memory" || journey.upsertInput.SourceID != created.ID {
		t.Fatalf("expected display-only memory journey upsert, got %#v", journey.upsertInput)
	}
	if journey.upsertInput.Visibility != "private" {
		t.Fatalf("tagged memories should only publish private Journey display rows, got %#v", journey.upsertInput)
	}
	if err := service.DeleteMemory(context.Background(), testAuthorID, testMemoryID); err != nil {
		t.Fatalf("delete memory: %v", err)
	}
	if journey.hideInput.Type != "memory" || journey.hideInput.SourceID != testMemoryID {
		t.Fatalf("expected generated journey row hide, got %#v", journey.hideInput)
	}
}

func TestMemoryMediaMustBeOwnedAndOrderIsPreserved(t *testing.T) {
	firstMediaID := "84000000-0000-4000-8000-000000000001"
	secondMediaID := "84000000-0000-4000-8000-000000000002"
	repo := &repoStub{}
	service := New(repo)
	created, err := service.CreateMemory(context.Background(), UpsertMemoryInput{
		ActorID:    testAuthorID,
		DiveSiteID: testSiteID,
		Title:      "With media",
		Visibility: "private",
		MediaIDs:   []string{firstMediaID, secondMediaID},
	})
	if err != nil {
		t.Fatalf("create with owned media: %v", err)
	}
	if len(repo.createInput.MediaIDs) != 2 || repo.createInput.MediaIDs[0] != firstMediaID || repo.createInput.MediaIDs[1] != secondMediaID {
		t.Fatalf("expected stable media order, got %#v", repo.createInput.MediaIDs)
	}
	if len(created.MediaIDs) != 2 {
		t.Fatalf("expected response to include media ids, got %#v", created.MediaIDs)
	}

	repo = &repoStub{ownedMedia: map[string]struct{}{firstMediaID: {}}}
	service = New(repo)
	if _, err := service.CreateMemory(context.Background(), UpsertMemoryInput{
		ActorID:    testAuthorID,
		DiveSiteID: testSiteID,
		Title:      "Unowned media",
		Visibility: "private",
		MediaIDs:   []string{firstMediaID, secondMediaID},
	}); err == nil {
		t.Fatalf("expected unowned media to be rejected")
	}
}

func TestUpdateAndDeleteAreOwnerScoped(t *testing.T) {
	repo := &repoStub{}
	service := New(repo)
	updated, err := service.UpdateMemory(context.Background(), UpsertMemoryInput{
		ActorID:    testAuthorID,
		MemoryID:   testMemoryID,
		DiveSiteID: testSiteID,
		Title:      "Updated",
		Visibility: "private",
	})
	if err != nil {
		t.Fatalf("update memory: %v", err)
	}
	if updated.ID != testMemoryID || repo.updateInput.AuthorUserID != testAuthorID {
		t.Fatalf("expected owner scoped update, got result=%#v input=%#v", updated, repo.updateInput)
	}
	if err := service.DeleteMemory(context.Background(), testAuthorID, testMemoryID); err != nil {
		t.Fatalf("delete memory: %v", err)
	}
	if repo.deleteUser != testAuthorID || repo.deleteID != testMemoryID {
		t.Fatalf("expected owner scoped delete, got user=%q id=%q", repo.deleteUser, repo.deleteID)
	}
}

func TestRepoNotFoundMapsToServiceNotFound(t *testing.T) {
	repo := &repoStub{updateErr: memoriesrepo.ErrNotFound, deleteErr: memoriesrepo.ErrNotFound}
	service := New(repo)
	if _, err := service.UpdateMemory(context.Background(), UpsertMemoryInput{
		ActorID:    testAuthorID,
		MemoryID:   testMemoryID,
		DiveSiteID: testSiteID,
		Title:      "Updated",
		Visibility: "private",
	}); err == nil {
		t.Fatalf("expected update not-found error")
	}
	if err := service.DeleteMemory(context.Background(), testAuthorID, testMemoryID); err == nil {
		t.Fatalf("expected delete not-found error")
	}
}

func TestAddTagsDefaultsPendingAndRejectsBlockedUsers(t *testing.T) {
	taggedID := "81000000-0000-4000-8000-000000000099"
	repo := &repoStub{}
	service := New(repo)
	tags, err := service.AddTags(context.Background(), AddTagsInput{
		ActorID:       testAuthorID,
		MemoryID:      testMemoryID,
		TaggedUserIDs: []string{taggedID},
	})
	if err != nil {
		t.Fatalf("add tag: %v", err)
	}
	if len(tags) != 1 || tags[0].Status != "pending" || tags[0].TaggedUserID != taggedID {
		t.Fatalf("expected pending tag, got %#v", tags)
	}

	repo = &repoStub{blocked: true}
	service = New(repo)
	if _, err := service.AddTags(context.Background(), AddTagsInput{
		ActorID:       testAuthorID,
		MemoryID:      testMemoryID,
		TaggedUserIDs: []string{taggedID},
	}); err == nil {
		t.Fatalf("expected blocked tag target to be rejected")
	}
}

func TestTaggedUserStatusAndManagementReads(t *testing.T) {
	repo := &repoStub{}
	service := New(repo)
	tag, err := service.UpdateMyTagStatus(context.Background(), UpdateTagInput{
		ActorID:  testViewerID,
		MemoryID: testMemoryID,
		Status:   "accepted",
	})
	if err != nil {
		t.Fatalf("accept tag: %v", err)
	}
	if tag.Status != "accepted" || tag.TaggedUserID != testViewerID {
		t.Fatalf("expected actor-scoped accepted tag, got %#v", tag)
	}
	tags, err := service.ListMyTags(context.Background(), ListMyTagsInput{
		ActorID: testViewerID,
		Status:  "pending",
		Limit:   5,
	})
	if err != nil {
		t.Fatalf("list my tags: %v", err)
	}
	if len(tags) != 1 || repo.tagsInput.TaggedUserID != testViewerID || repo.tagsInput.Status != "pending" {
		t.Fatalf("expected pending management read, tags=%#v input=%#v", tags, repo.tagsInput)
	}

	repo = &repoStub{blocked: true}
	service = New(repo)
	if _, err := service.UpdateMyTagStatus(context.Background(), UpdateTagInput{
		ActorID:  testViewerID,
		MemoryID: testMemoryID,
		Status:   "accepted",
	}); err == nil {
		t.Fatalf("expected blocked tagged user access to be rejected")
	}
}

func memoryRow(visibility string) memoriesrepo.Memory {
	now := time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)
	return memoriesrepo.Memory{
		ID:           testMemoryID,
		AuthorUserID: testAuthorID,
		DiveSiteID:   testSiteID,
		Title:        "Memory",
		Body:         "Social context only.",
		Visibility:   visibility,
		OccurredAt:   now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

func tagRow(memoryID, taggedUserID, status string) memoriesrepo.MemoryTag {
	now := time.Date(2026, 6, 1, 8, 0, 0, 0, time.UTC)
	return memoriesrepo.MemoryTag{
		ID:           "81000000-0000-4000-8000-000000000199",
		MemoryID:     memoryID,
		TaggedUserID: taggedUserID,
		Status:       status,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}
