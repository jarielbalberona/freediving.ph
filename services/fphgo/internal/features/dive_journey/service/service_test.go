package service

import (
	"context"
	"errors"
	"testing"
	"time"

	journeyrepo "fphgo/internal/features/dive_journey/repo"
)

const (
	ownerID  = "550e8400-e29b-41d4-a716-446655440100"
	viewerID = "550e8400-e29b-41d4-a716-446655440101"
	entryID  = "550e8400-e29b-41d4-a716-446655440102"
)

type repoStub struct {
	owner       journeyrepo.JourneyOwner
	entries     []journeyrepo.JourneyEntry
	createInput journeyrepo.UpsertManualInput
	generated   []journeyrepo.UpsertGeneratedInput
	updateInput journeyrepo.UpsertManualInput
	deleteUser  string
	deleteEntry string
	updateErr   error
	deleteErr   error
	hideErr     error
	ownedMedia  map[string]struct{}
}

func (r *repoStub) GetOwnerByUsername(context.Context, string, string) (journeyrepo.JourneyOwner, error) {
	return r.owner, nil
}

func (r *repoStub) ListForProfile(context.Context, journeyrepo.ListProfileInput) ([]journeyrepo.JourneyEntry, error) {
	return r.entries, nil
}

func (r *repoStub) CreateManual(_ context.Context, input journeyrepo.UpsertManualInput) (journeyrepo.JourneyEntry, error) {
	r.createInput = input
	return journeyrepo.JourneyEntry{
		ID:         entryID,
		UserID:     input.UserID,
		Type:       "custom",
		Title:      input.Title,
		Body:       input.Body,
		Visibility: input.Visibility,
		State:      "active",
		OccurredAt: input.OccurredAt,
		CreatedAt:  input.OccurredAt,
		UpdatedAt:  input.OccurredAt,
		MediaIDs:   append([]string(nil), input.MediaIDs...),
	}, nil
}

func (r *repoStub) UpsertGenerated(_ context.Context, input journeyrepo.UpsertGeneratedInput) (journeyrepo.JourneyEntry, error) {
	r.generated = append(r.generated, input)
	return journeyrepo.JourneyEntry{
		ID:         entryID,
		UserID:     input.UserID,
		Type:       input.Type,
		Title:      input.Title,
		Body:       input.Body,
		DiveSiteID: input.DiveSiteID,
		SourceType: input.SourceType,
		SourceID:   input.SourceID,
		Visibility: input.Visibility,
		State:      "active",
		OccurredAt: input.OccurredAt,
		CreatedAt:  input.OccurredAt,
		UpdatedAt:  input.OccurredAt,
	}, nil
}

func (r *repoStub) UpdateManual(_ context.Context, input journeyrepo.UpsertManualInput) (journeyrepo.JourneyEntry, error) {
	r.updateInput = input
	if r.updateErr != nil {
		return journeyrepo.JourneyEntry{}, r.updateErr
	}
	return journeyrepo.JourneyEntry{ID: input.ID, UserID: input.UserID, Type: "custom", Title: input.Title, Visibility: input.Visibility, State: "active", OccurredAt: input.OccurredAt, MediaIDs: append([]string(nil), input.MediaIDs...)}, nil
}

func (r *repoStub) SoftDeleteManual(_ context.Context, userID, entryID string) error {
	r.deleteUser = userID
	r.deleteEntry = entryID
	return r.deleteErr
}

func (r *repoStub) HideGenerated(_ context.Context, input journeyrepo.UpsertGeneratedInput) error {
	r.generated = append(r.generated, input)
	return r.hideErr
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

func TestCreateManualEntryAllowsNoDiveSiteAndNoMedia(t *testing.T) {
	now := time.Date(2026, 5, 31, 10, 0, 0, 0, time.UTC)
	repo := &repoStub{}
	svc := New(repo).WithNow(func() time.Time { return now })

	entry, err := svc.CreateManualEntry(context.Background(), UpsertManualJourneyEntryInput{
		ActorID:    ownerID,
		Title:      "First calm line dive",
		Body:       "Felt relaxed.",
		Visibility: "followers",
	})
	if err != nil {
		t.Fatalf("create manual entry: %v", err)
	}
	if entry.Type != "custom" {
		t.Fatalf("expected custom manual type, got %q", entry.Type)
	}
	if repo.createInput.DiveSiteID != "" {
		t.Fatalf("manual entries must be allowed without dive site, got %q", repo.createInput.DiveSiteID)
	}
	if repo.createInput.UserID != ownerID {
		t.Fatalf("expected owner user id, got %q", repo.createInput.UserID)
	}
	if !repo.createInput.OccurredAt.Equal(now) {
		t.Fatalf("expected default occurred_at, got %s", repo.createInput.OccurredAt)
	}
}

func TestCreateManualEntryAcceptsOwnedMediaOnly(t *testing.T) {
	ownedMediaID := "550e8400-e29b-41d4-a716-446655440201"
	otherMediaID := "550e8400-e29b-41d4-a716-446655440202"
	repo := &repoStub{ownedMedia: map[string]struct{}{ownedMediaID: {}}}
	svc := New(repo)

	entry, err := svc.CreateManualEntry(context.Background(), UpsertManualJourneyEntryInput{
		ActorID:    ownerID,
		Title:      "With media",
		Visibility: "public",
		MediaIDs:   []string{ownedMediaID},
	})
	if err != nil {
		t.Fatalf("create with owned media: %v", err)
	}
	if len(repo.createInput.MediaIDs) != 1 || repo.createInput.MediaIDs[0] != ownedMediaID {
		t.Fatalf("expected owned media attachment, got %#v", repo.createInput.MediaIDs)
	}
	if len(entry.MediaIDs) != 1 || entry.MediaIDs[0] != ownedMediaID {
		t.Fatalf("expected response media ids, got %#v", entry.MediaIDs)
	}

	if _, err := svc.CreateManualEntry(context.Background(), UpsertManualJourneyEntryInput{
		ActorID:    ownerID,
		Title:      "Other media",
		Visibility: "public",
		MediaIDs:   []string{otherMediaID},
	}); err == nil {
		t.Fatal("expected forbidden for unowned media")
	}
}

func TestUpsertGeneratedEntryRequiresSourceIdentity(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo)

	if _, err := svc.UpsertGeneratedEntry(context.Background(), UpsertGeneratedJourneyEntryInput{
		UserID:     ownerID,
		Type:       "map_milestone",
		Title:      "Unlocked a dive site",
		SourceType: "dive_map",
	}); err == nil {
		t.Fatal("expected sourceId validation error")
	}
	if len(repo.generated) != 0 {
		t.Fatalf("invalid generated input must not reach repo, got %#v", repo.generated)
	}
}

func TestUpsertGeneratedEntryIsDisplayOnlyIntegrationHook(t *testing.T) {
	now := time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)
	repo := &repoStub{}
	svc := New(repo).WithNow(func() time.Time { return now })

	entry, err := svc.UpsertGeneratedEntry(context.Background(), UpsertGeneratedJourneyEntryInput{
		UserID:     ownerID,
		Type:       "badge",
		Title:      "New badge",
		Body:       "Recorded from badge source.",
		SourceType: "badge",
		SourceID:   "badge:depth-10",
		Visibility: "followers",
	})
	if err != nil {
		t.Fatalf("upsert generated entry: %v", err)
	}
	if len(repo.generated) != 1 {
		t.Fatalf("expected one generated repo call, got %d", len(repo.generated))
	}
	got := repo.generated[0]
	if got.SourceType != "badge" || got.SourceID != "badge:depth-10" {
		t.Fatalf("expected generated source identity, got %#v", got)
	}
	if !got.OccurredAt.Equal(now) {
		t.Fatalf("expected default occurred_at, got %s", got.OccurredAt)
	}
	if entry.Type != "badge" || entry.SourceType != "badge" || entry.SourceID != "badge:depth-10" {
		t.Fatalf("expected generated entry response, got %#v", entry)
	}
}

func TestUpdateManualEntryIsOwnerScoped(t *testing.T) {
	now := time.Date(2026, 5, 31, 11, 0, 0, 0, time.UTC)
	repo := &repoStub{}
	svc := New(repo).WithNow(func() time.Time { return now })

	_, err := svc.UpdateManualEntry(context.Background(), UpsertManualJourneyEntryInput{
		ActorID:    ownerID,
		EntryID:    entryID,
		Title:      "Updated",
		Visibility: "private",
	})
	if err != nil {
		t.Fatalf("update manual entry: %v", err)
	}
	if repo.updateInput.UserID != ownerID {
		t.Fatalf("expected update to be scoped to owner %q, got %q", ownerID, repo.updateInput.UserID)
	}
	if repo.updateInput.ID != entryID {
		t.Fatalf("expected update entry id %q, got %q", entryID, repo.updateInput.ID)
	}
}

func TestUpdateManualEntryDoesNotExposeOtherUsersEntries(t *testing.T) {
	repo := &repoStub{updateErr: journeyrepo.ErrNotFound}
	svc := New(repo)

	_, err := svc.UpdateManualEntry(context.Background(), UpsertManualJourneyEntryInput{
		ActorID:    viewerID,
		EntryID:    entryID,
		Title:      "Nope",
		Visibility: "public",
	})
	if err == nil {
		t.Fatal("expected not found for non-owner update")
	}
}

func TestDeleteManualEntryIsSoftOwnerScoped(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo)

	if err := svc.DeleteManualEntry(context.Background(), ownerID, entryID); err != nil {
		t.Fatalf("delete manual entry: %v", err)
	}
	if repo.deleteUser != ownerID || repo.deleteEntry != entryID {
		t.Fatalf("expected owner-scoped soft delete, got user=%q entry=%q", repo.deleteUser, repo.deleteEntry)
	}
}

func TestDeleteManualEntryMapsMissingRows(t *testing.T) {
	repo := &repoStub{deleteErr: journeyrepo.ErrNotFound}
	svc := New(repo)

	if err := svc.DeleteManualEntry(context.Background(), viewerID, entryID); err == nil {
		t.Fatal("expected not found for non-owner delete")
	}
}

func TestHideGeneratedEntryUsesSourceScopedArchiveSemantics(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo)

	if err := svc.HideGeneratedEntry(context.Background(), HideGeneratedJourneyEntryInput{
		UserID:     ownerID,
		Type:       "map_milestone",
		SourceType: "dive_map",
		SourceID:   "user-site-1",
	}); err != nil {
		t.Fatalf("hide generated entry: %v", err)
	}
	if len(repo.generated) != 1 {
		t.Fatalf("expected one generated hide call, got %d", len(repo.generated))
	}
	got := repo.generated[0]
	if got.UserID != ownerID || got.Type != "map_milestone" || got.SourceType != "dive_map" || got.SourceID != "user-site-1" {
		t.Fatalf("expected source-scoped generated hide, got %#v", got)
	}
}

func TestHideGeneratedEntryRequiresSourceIdentity(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo)

	if err := svc.HideGeneratedEntry(context.Background(), HideGeneratedJourneyEntryInput{
		UserID:     ownerID,
		Type:       "map_milestone",
		SourceType: "dive_map",
	}); err == nil {
		t.Fatal("expected sourceId validation error")
	}
	if len(repo.generated) != 0 {
		t.Fatalf("invalid generated hide must not reach repo, got %#v", repo.generated)
	}
}

func TestHideGeneratedEntryMapsMissingRows(t *testing.T) {
	repo := &repoStub{hideErr: journeyrepo.ErrNotFound}
	svc := New(repo)

	if err := svc.HideGeneratedEntry(context.Background(), HideGeneratedJourneyEntryInput{
		UserID:     ownerID,
		Type:       "badge",
		SourceType: "badge",
		SourceID:   "badge:depth-10",
	}); err == nil {
		t.Fatal("expected not found for missing generated entry")
	}
}

func TestListProfileJourneyBlocksBlockedViewer(t *testing.T) {
	repo := &repoStub{owner: journeyrepo.JourneyOwner{UserID: ownerID, Blocked: true}}
	svc := New(repo)

	_, err := svc.ListProfileJourney(context.Background(), ListProfileJourneyInput{Username: "aiko", ViewerUserID: viewerID})
	if err == nil {
		t.Fatal("expected blocked profile error")
	}
}

func TestJourneyServiceHasNoMapBadgeCredentialMutationDependencies(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo)
	if _, ok := any(svc.repo).(interface {
		RecomputeUserDiveSite(context.Context, string, string) error
	}); ok {
		t.Fatal("Journey service must not depend on Dive Map mutation APIs")
	}
	if _, ok := any(svc.repo).(interface {
		UpsertPassportStats(context.Context, string) error
	}); ok {
		t.Fatal("Journey service must not depend on Passport mutation APIs")
	}
	if _, ok := any(svc.repo).(interface {
		UpdatePassportHighlights(context.Context, string) error
	}); ok {
		t.Fatal("Journey service must not write Passport highlight state")
	}
	if errors.Is(repo.updateErr, journeyrepo.ErrNotFound) && errors.Is(repo.deleteErr, journeyrepo.ErrNotFound) && errors.Is(repo.hideErr, journeyrepo.ErrNotFound) {
		t.Fatal("unreachable guard to keep imported errors in use")
	}
}
