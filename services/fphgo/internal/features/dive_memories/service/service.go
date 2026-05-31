package service

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	journeyservice "fphgo/internal/features/dive_journey/service"
	memoriesrepo "fphgo/internal/features/dive_memories/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type Repository interface {
	GetOwnerByUsername(ctx context.Context, username, viewerUserID string) (memoriesrepo.MemoryOwner, error)
	ListForProfile(ctx context.Context, input memoriesrepo.ListProfileInput) ([]memoriesrepo.Memory, error)
	ListOwn(ctx context.Context, authorUserID string, limit int32) ([]memoriesrepo.Memory, error)
	Create(ctx context.Context, input memoriesrepo.UpsertMemoryInput) (memoriesrepo.Memory, error)
	Update(ctx context.Context, input memoriesrepo.UpsertMemoryInput) (memoriesrepo.Memory, error)
	SoftDelete(ctx context.Context, authorUserID, memoryID string) error
	ListOwnedActiveMedia(ctx context.Context, userID string, mediaIDs []string) (map[string]struct{}, error)
	GetByID(ctx context.Context, id string) (memoriesrepo.Memory, error)
	UpsertTag(ctx context.Context, memoryID, taggedUserID string) (memoriesrepo.MemoryTag, error)
	DeleteTag(ctx context.Context, memoryID, taggedUserID string) error
	UpdateTagStatus(ctx context.Context, memoryID, taggedUserID, status string) (memoriesrepo.MemoryTag, error)
	ListTags(ctx context.Context, memoryID string) ([]memoriesrepo.MemoryTag, error)
	ListTagsForTaggedUser(ctx context.Context, input memoriesrepo.ListTaggedUserTagsInput) ([]memoriesrepo.MemoryTag, error)
	HasBlockBetweenUsers(ctx context.Context, firstUserID, secondUserID string) (bool, error)
}

type Service struct {
	repo    Repository
	journey JourneyWriter
	now     func() time.Time
}

type Option func(*Service)

type JourneyWriter interface {
	UpsertGeneratedEntry(ctx context.Context, input journeyservice.UpsertGeneratedJourneyEntryInput) (journeyservice.JourneyEntry, error)
	HideGeneratedEntry(ctx context.Context, input journeyservice.HideGeneratedJourneyEntryInput) error
}

func WithJourneyWriter(journey JourneyWriter) Option {
	return func(s *Service) {
		s.journey = journey
	}
}

func New(repo Repository, opts ...Option) *Service {
	s := &Service{repo: repo, now: time.Now}
	for _, opt := range opts {
		if opt != nil {
			opt(s)
		}
	}
	return s
}

func (s *Service) WithNow(now func() time.Time) *Service {
	if now != nil {
		s.now = now
	}
	return s
}

type Memory struct {
	ID           string
	AuthorUserID string
	DiveSiteID   string
	Title        string
	Body         string
	Visibility   string
	OccurredAt   time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
	MediaIDs     []string
}

type MemoryTag struct {
	ID           string
	MemoryID     string
	TaggedUserID string
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ListProfileMemoriesInput struct {
	Username     string
	ViewerUserID string
	Limit        int32
}

type UpsertMemoryInput struct {
	ActorID    string
	MemoryID   string
	DiveSiteID string
	Title      string
	Body       string
	Visibility string
	OccurredAt *time.Time
	MediaIDs   []string
}

type AddTagsInput struct {
	ActorID       string
	MemoryID      string
	TaggedUserIDs []string
}

type UpdateTagInput struct {
	ActorID  string
	MemoryID string
	Status   string
}

type ListMyTagsInput struct {
	ActorID string
	Status  string
	Limit   int32
}

func (s *Service) ListProfileMemories(ctx context.Context, input ListProfileMemoriesInput) ([]Memory, error) {
	limit := normalizeLimit(input.Limit)
	owner, err := s.repo.GetOwnerByUsername(ctx, strings.TrimSpace(input.Username), strings.TrimSpace(input.ViewerUserID))
	if err != nil {
		if errors.Is(err, memoriesrepo.ErrNotFound) {
			return nil, apperrors.New(http.StatusNotFound, "profile_not_found", "profile not found", err)
		}
		return nil, apperrors.New(http.StatusInternalServerError, "memory_owner_failed", "failed to load memory owner", err)
	}
	if owner.Blocked {
		return nil, apperrors.New(http.StatusForbidden, "blocked", "profile is not available", nil)
	}
	rows, err := s.repo.ListForProfile(ctx, memoriesrepo.ListProfileInput{
		TargetUserID:  owner.UserID,
		ViewerUserID:  strings.TrimSpace(input.ViewerUserID),
		ViewerIsSelf:  owner.ViewerIsSelf,
		ViewerFollows: owner.ViewerFollows,
		Limit:         limit,
	})
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "memory_list_failed", "failed to load dive memories", err)
	}
	return mapMemories(rows), nil
}

func (s *Service) ListOwnMemories(ctx context.Context, actorID string, limit int32) ([]Memory, error) {
	if _, err := uuid.Parse(strings.TrimSpace(actorID)); err != nil {
		return nil, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	rows, err := s.repo.ListOwn(ctx, strings.TrimSpace(actorID), normalizeLimit(limit))
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "memory_list_own_failed", "failed to load your dive memories", err)
	}
	return mapMemories(rows), nil
}

func (s *Service) CreateMemory(ctx context.Context, input UpsertMemoryInput) (Memory, error) {
	normalized, err := s.normalizeInput(ctx, input, false)
	if err != nil {
		return Memory{}, err
	}
	row, err := s.repo.Create(ctx, normalized)
	if err != nil {
		return Memory{}, apperrors.New(http.StatusInternalServerError, "memory_create_failed", "failed to create dive memory", err)
	}
	s.upsertJourneyDisplay(ctx, row)
	return mapMemory(row), nil
}

func (s *Service) UpdateMemory(ctx context.Context, input UpsertMemoryInput) (Memory, error) {
	normalized, err := s.normalizeInput(ctx, input, true)
	if err != nil {
		return Memory{}, err
	}
	row, err := s.repo.Update(ctx, normalized)
	if err != nil {
		if errors.Is(err, memoriesrepo.ErrNotFound) {
			return Memory{}, apperrors.New(http.StatusNotFound, "memory_not_found", "dive memory not found", err)
		}
		return Memory{}, apperrors.New(http.StatusInternalServerError, "memory_update_failed", "failed to update dive memory", err)
	}
	s.upsertJourneyDisplay(ctx, row)
	return mapMemory(row), nil
}

func (s *Service) DeleteMemory(ctx context.Context, actorID, memoryID string) error {
	if _, err := uuid.Parse(strings.TrimSpace(actorID)); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(memoryID)); err != nil {
		return validationError("memoryId", "invalid_uuid", "memoryId must be a valid UUID")
	}
	if err := s.repo.SoftDelete(ctx, strings.TrimSpace(actorID), strings.TrimSpace(memoryID)); err != nil {
		if errors.Is(err, memoriesrepo.ErrNotFound) {
			return apperrors.New(http.StatusNotFound, "memory_not_found", "dive memory not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "memory_delete_failed", "failed to delete dive memory", err)
	}
	s.hideJourneyDisplay(ctx, strings.TrimSpace(actorID), strings.TrimSpace(memoryID))
	return nil
}

func (s *Service) upsertJourneyDisplay(ctx context.Context, memory memoriesrepo.Memory) {
	if s.journey == nil {
		return
	}
	occurredAt := memory.OccurredAt
	_, _ = s.journey.UpsertGeneratedEntry(ctx, journeyservice.UpsertGeneratedJourneyEntryInput{
		UserID:     memory.AuthorUserID,
		Type:       "memory",
		Title:      memory.Title,
		Body:       memory.Body,
		DiveSiteID: memory.DiveSiteID,
		SourceType: "memory",
		SourceID:   memory.ID,
		Visibility: journeyVisibilityForMemory(memory.Visibility),
		OccurredAt: &occurredAt,
	})
}

func journeyVisibilityForMemory(visibility string) string {
	switch visibility {
	case "public", "followers":
		return visibility
	default:
		return "private"
	}
}

func (s *Service) hideJourneyDisplay(ctx context.Context, userID, memoryID string) {
	if s.journey == nil {
		return
	}
	_ = s.journey.HideGeneratedEntry(ctx, journeyservice.HideGeneratedJourneyEntryInput{
		UserID:     userID,
		Type:       "memory",
		SourceType: "memory",
		SourceID:   memoryID,
	})
}

func (s *Service) AddTags(ctx context.Context, input AddTagsInput) ([]MemoryTag, error) {
	actorID, memoryID, err := s.validateOwnerMemory(ctx, input.ActorID, input.MemoryID)
	if err != nil {
		return nil, err
	}
	taggedUserIDs, err := normalizeUserIDs(input.TaggedUserIDs)
	if err != nil {
		return nil, err
	}
	out := make([]MemoryTag, 0, len(taggedUserIDs))
	for _, taggedUserID := range taggedUserIDs {
		blocked, err := s.repo.HasBlockBetweenUsers(ctx, actorID, taggedUserID)
		if err != nil {
			return nil, apperrors.New(http.StatusInternalServerError, "memory_tag_block_check_failed", "failed to verify tag block policy", err)
		}
		if blocked {
			return nil, apperrors.New(http.StatusForbidden, "memory_tag_blocked", "blocked users cannot be tagged", nil)
		}
		tag, err := s.repo.UpsertTag(ctx, memoryID, taggedUserID)
		if err != nil {
			return nil, apperrors.New(http.StatusInternalServerError, "memory_tag_create_failed", "failed to create memory tag", err)
		}
		out = append(out, mapTag(tag))
	}
	return out, nil
}

func (s *Service) RemoveTag(ctx context.Context, actorID, memoryID, taggedUserID string) error {
	_, memoryID, err := s.validateOwnerMemory(ctx, actorID, memoryID)
	if err != nil {
		return err
	}
	if _, err := uuid.Parse(strings.TrimSpace(taggedUserID)); err != nil {
		return validationError("taggedUserId", "invalid_uuid", "taggedUserId must be a valid UUID")
	}
	if err := s.repo.DeleteTag(ctx, memoryID, strings.TrimSpace(taggedUserID)); err != nil {
		if errors.Is(err, memoriesrepo.ErrNotFound) {
			return apperrors.New(http.StatusNotFound, "memory_tag_not_found", "memory tag not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "memory_tag_delete_failed", "failed to delete memory tag", err)
	}
	return nil
}

func (s *Service) UpdateMyTagStatus(ctx context.Context, input UpdateTagInput) (MemoryTag, error) {
	actorID := strings.TrimSpace(input.ActorID)
	if _, err := uuid.Parse(actorID); err != nil {
		return MemoryTag{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	memoryID := strings.TrimSpace(input.MemoryID)
	if _, err := uuid.Parse(memoryID); err != nil {
		return MemoryTag{}, validationError("memoryId", "invalid_uuid", "memoryId must be a valid UUID")
	}
	status := strings.TrimSpace(input.Status)
	if status != "accepted" && status != "declined" && status != "hidden" {
		return MemoryTag{}, validationError("status", "oneof", "status must be accepted, declined, or hidden")
	}
	memory, err := s.repo.GetByID(ctx, memoryID)
	if err != nil {
		if errors.Is(err, memoriesrepo.ErrNotFound) {
			return MemoryTag{}, apperrors.New(http.StatusNotFound, "memory_not_found", "dive memory not found", err)
		}
		return MemoryTag{}, apperrors.New(http.StatusInternalServerError, "memory_load_failed", "failed to load dive memory", err)
	}
	blocked, err := s.repo.HasBlockBetweenUsers(ctx, memory.AuthorUserID, actorID)
	if err != nil {
		return MemoryTag{}, apperrors.New(http.StatusInternalServerError, "memory_tag_block_check_failed", "failed to verify tag block policy", err)
	}
	if blocked {
		return MemoryTag{}, apperrors.New(http.StatusForbidden, "memory_tag_blocked", "blocked users cannot access memory tags", nil)
	}
	tag, err := s.repo.UpdateTagStatus(ctx, memoryID, actorID, status)
	if err != nil {
		if errors.Is(err, memoriesrepo.ErrNotFound) {
			return MemoryTag{}, apperrors.New(http.StatusNotFound, "memory_tag_not_found", "memory tag not found", err)
		}
		return MemoryTag{}, apperrors.New(http.StatusInternalServerError, "memory_tag_update_failed", "failed to update memory tag", err)
	}
	return mapTag(tag), nil
}

func (s *Service) ListMyTags(ctx context.Context, input ListMyTagsInput) ([]MemoryTag, error) {
	actorID := strings.TrimSpace(input.ActorID)
	if _, err := uuid.Parse(actorID); err != nil {
		return nil, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	status := strings.TrimSpace(input.Status)
	if status != "" && status != "pending" && status != "accepted" && status != "declined" && status != "hidden" {
		return nil, validationError("status", "oneof", "status must be pending, accepted, declined, or hidden")
	}
	rows, err := s.repo.ListTagsForTaggedUser(ctx, memoriesrepo.ListTaggedUserTagsInput{
		TaggedUserID: actorID,
		Status:       status,
		Limit:        normalizeLimit(input.Limit),
	})
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "memory_tag_list_failed", "failed to load memory tags", err)
	}
	return mapTags(rows), nil
}

func (s *Service) validateOwnerMemory(ctx context.Context, actorIDValue, memoryIDValue string) (string, string, error) {
	actorID := strings.TrimSpace(actorIDValue)
	if _, err := uuid.Parse(actorID); err != nil {
		return "", "", apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	memoryID := strings.TrimSpace(memoryIDValue)
	if _, err := uuid.Parse(memoryID); err != nil {
		return "", "", validationError("memoryId", "invalid_uuid", "memoryId must be a valid UUID")
	}
	memory, err := s.repo.GetByID(ctx, memoryID)
	if err != nil {
		if errors.Is(err, memoriesrepo.ErrNotFound) {
			return "", "", apperrors.New(http.StatusNotFound, "memory_not_found", "dive memory not found", err)
		}
		return "", "", apperrors.New(http.StatusInternalServerError, "memory_load_failed", "failed to load dive memory", err)
	}
	if memory.DeletedAt != nil || memory.AuthorUserID != actorID {
		return "", "", apperrors.New(http.StatusNotFound, "memory_not_found", "dive memory not found", nil)
	}
	return actorID, memoryID, nil
}

func (s *Service) normalizeInput(ctx context.Context, input UpsertMemoryInput, requireMemoryID bool) (memoriesrepo.UpsertMemoryInput, error) {
	actorID := strings.TrimSpace(input.ActorID)
	if _, err := uuid.Parse(actorID); err != nil {
		return memoriesrepo.UpsertMemoryInput{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	memoryID := strings.TrimSpace(input.MemoryID)
	if requireMemoryID {
		if _, err := uuid.Parse(memoryID); err != nil {
			return memoriesrepo.UpsertMemoryInput{}, validationError("memoryId", "invalid_uuid", "memoryId must be a valid UUID")
		}
	}
	diveSiteID := strings.TrimSpace(input.DiveSiteID)
	if diveSiteID == "" {
		return memoriesrepo.UpsertMemoryInput{}, validationError("diveSiteId", "required", "diveSiteId is required")
	}
	if _, err := uuid.Parse(diveSiteID); err != nil {
		return memoriesrepo.UpsertMemoryInput{}, validationError("diveSiteId", "invalid_uuid", "diveSiteId must be a valid UUID")
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return memoriesrepo.UpsertMemoryInput{}, validationError("title", "required", "title is required")
	}
	if len(title) > 120 {
		return memoriesrepo.UpsertMemoryInput{}, validationError("title", "too_long", "title must be 120 characters or fewer")
	}
	body := strings.TrimSpace(input.Body)
	if len(body) > 2000 {
		return memoriesrepo.UpsertMemoryInput{}, validationError("body", "too_long", "body must be 2000 characters or fewer")
	}
	visibility := strings.TrimSpace(input.Visibility)
	if visibility == "" {
		visibility = "private"
	}
	if !validVisibility(visibility) {
		return memoriesrepo.UpsertMemoryInput{}, validationError("visibility", "oneof", "visibility must be public, followers, tagged, or private")
	}
	mediaIDs, err := normalizeMediaIDs(input.MediaIDs)
	if err != nil {
		return memoriesrepo.UpsertMemoryInput{}, err
	}
	owned, err := s.repo.ListOwnedActiveMedia(ctx, actorID, mediaIDs)
	if err != nil {
		return memoriesrepo.UpsertMemoryInput{}, apperrors.New(http.StatusInternalServerError, "memory_media_check_failed", "failed to verify memory media", err)
	}
	for _, mediaID := range mediaIDs {
		if _, ok := owned[mediaID]; !ok {
			return memoriesrepo.UpsertMemoryInput{}, apperrors.New(http.StatusForbidden, "memory_media_forbidden", "media cannot be attached to this dive memory", nil)
		}
	}
	occurredAt := s.now().UTC()
	if input.OccurredAt != nil {
		occurredAt = input.OccurredAt.UTC()
	}
	return memoriesrepo.UpsertMemoryInput{
		ID:           memoryID,
		AuthorUserID: actorID,
		DiveSiteID:   diveSiteID,
		Title:        title,
		Body:         body,
		Visibility:   visibility,
		OccurredAt:   occurredAt,
		MediaIDs:     mediaIDs,
	}, nil
}

func normalizeLimit(value int32) int32 {
	if value <= 0 || value > 50 {
		return 20
	}
	return value
}

func validVisibility(value string) bool {
	switch value {
	case "public", "followers", "tagged", "private":
		return true
	default:
		return false
	}
}

func normalizeMediaIDs(values []string) ([]string, error) {
	if len(values) == 0 {
		return nil, nil
	}
	if len(values) > 12 {
		return nil, validationError("mediaIds", "too_many", "mediaIds must contain 12 or fewer items")
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if _, err := uuid.Parse(trimmed); err != nil {
			return nil, validationError("mediaIds", "invalid_uuid", "mediaIds must contain valid UUIDs")
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out, nil
}

func normalizeUserIDs(values []string) ([]string, error) {
	if len(values) == 0 {
		return nil, validationError("taggedUserIds", "required", "taggedUserIds is required")
	}
	if len(values) > 20 {
		return nil, validationError("taggedUserIds", "too_many", "taggedUserIds must contain 20 or fewer users")
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if _, err := uuid.Parse(trimmed); err != nil {
			return nil, validationError("taggedUserIds", "invalid_uuid", "taggedUserIds must contain valid UUIDs")
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out, nil
}

func validationError(field, code, message string) error {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    code,
		Message: message,
	}}}
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (v ValidationFailure) Error() string { return "validation failed" }

func mapMemories(rows []memoriesrepo.Memory) []Memory {
	out := make([]Memory, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapMemory(row))
	}
	return out
}

func mapMemory(row memoriesrepo.Memory) Memory {
	return Memory{
		ID:           row.ID,
		AuthorUserID: row.AuthorUserID,
		DiveSiteID:   row.DiveSiteID,
		Title:        row.Title,
		Body:         row.Body,
		Visibility:   row.Visibility,
		OccurredAt:   row.OccurredAt,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
		MediaIDs:     append([]string(nil), row.MediaIDs...),
	}
}

func mapTags(rows []memoriesrepo.MemoryTag) []MemoryTag {
	out := make([]MemoryTag, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapTag(row))
	}
	return out
}

func mapTag(row memoriesrepo.MemoryTag) MemoryTag {
	return MemoryTag{
		ID:           row.ID,
		MemoryID:     row.MemoryID,
		TaggedUserID: row.TaggedUserID,
		Status:       row.Status,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
	}
}
