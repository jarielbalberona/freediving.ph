package http

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	memoriesservice "fphgo/internal/features/dive_memories/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

type memoriesService interface {
	ListProfileMemories(ctx context.Context, input memoriesservice.ListProfileMemoriesInput) ([]memoriesservice.Memory, error)
	ListOwnMemories(ctx context.Context, actorID string, limit int32) ([]memoriesservice.Memory, error)
	CreateMemory(ctx context.Context, input memoriesservice.UpsertMemoryInput) (memoriesservice.Memory, error)
	UpdateMemory(ctx context.Context, input memoriesservice.UpsertMemoryInput) (memoriesservice.Memory, error)
	DeleteMemory(ctx context.Context, actorID, memoryID string) error
	AddTags(ctx context.Context, input memoriesservice.AddTagsInput) ([]memoriesservice.MemoryTag, error)
	RemoveTag(ctx context.Context, actorID, memoryID, taggedUserID string) error
	UpdateMyTagStatus(ctx context.Context, input memoriesservice.UpdateTagInput) (memoriesservice.MemoryTag, error)
	ListMyTags(ctx context.Context, input memoriesservice.ListMyTagsInput) ([]memoriesservice.MemoryTag, error)
}

type Handlers struct {
	service   memoriesService
	validator httpx.Validator
}

func New(service memoriesService, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) ListProfileMemories(w http.ResponseWriter, r *http.Request) {
	limit, ok := parseLimit(w, r)
	if !ok {
		return
	}
	items, err := h.service.ListProfileMemories(r.Context(), memoriesservice.ListProfileMemoriesInput{
		Username:     chi.URLParam(r, "username"),
		ViewerUserID: actorIDIfPresent(r),
		Limit:        limit,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, MemoriesResponse{Items: memoriesToDTO(items)})
}

func (h *Handlers) ListOwnMemories(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	limit, ok := parseLimit(w, r)
	if !ok {
		return
	}
	items, err := h.service.ListOwnMemories(r.Context(), actor, limit)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, MemoriesResponse{Items: memoriesToDTO(items)})
}

func (h *Handlers) CreateMemory(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, ok := h.decodeUpsert(w, r)
	if !ok {
		return
	}
	memory, err := h.service.CreateMemory(r.Context(), requestToService(actor, "", req))
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, MemoryResponse{Memory: memoryToDTO(memory)})
}

func (h *Handlers) UpdateMemory(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, ok := h.decodeUpsert(w, r)
	if !ok {
		return
	}
	memory, err := h.service.UpdateMemory(r.Context(), requestToService(actor, chi.URLParam(r, "memoryID"), req))
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, MemoryResponse{Memory: memoryToDTO(memory)})
}

func (h *Handlers) DeleteMemory(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	if err := h.service.DeleteMemory(r.Context(), actor, chi.URLParam(r, "memoryID")); err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) AddMemoryTags(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[AddMemoryTagsRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	tags, err := h.service.AddTags(r.Context(), memoriesservice.AddTagsInput{
		ActorID:       actor,
		MemoryID:      chi.URLParam(r, "memoryID"),
		TaggedUserIDs: append([]string(nil), req.TaggedUserIDs...),
	})
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, MemoryTagsResponse{Items: tagsToDTO(tags)})
}

func (h *Handlers) RemoveMemoryTag(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	if err := h.service.RemoveTag(r.Context(), actor, chi.URLParam(r, "memoryID"), chi.URLParam(r, "taggedUserID")); err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListMyTags(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	limit, ok := parseLimit(w, r)
	if !ok {
		return
	}
	tags, err := h.service.ListMyTags(r.Context(), memoriesservice.ListMyTagsInput{
		ActorID: actor,
		Status:  strings.TrimSpace(r.URL.Query().Get("status")),
		Limit:   limit,
	})
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, MemoryTagsResponse{Items: tagsToDTO(tags)})
}

func (h *Handlers) UpdateMyTag(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdateMemoryTagRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	tag, err := h.service.UpdateMyTagStatus(r.Context(), memoriesservice.UpdateTagInput{
		ActorID:  actor,
		MemoryID: chi.URLParam(r, "memoryID"),
		Status:   req.Status,
	})
	if err != nil {
		h.writeServiceError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, MemoryTagsResponse{Items: []MemoryTag{tagToDTO(tag)}})
}

func (h *Handlers) decodeUpsert(w http.ResponseWriter, r *http.Request) (UpsertMemoryRequest, bool) {
	req, issues, ok := httpx.DecodeAndValidate[UpsertMemoryRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return UpsertMemoryRequest{}, false
	}
	return req, true
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr memoriesservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func parseLimit(w http.ResponseWriter, r *http.Request) (int32, bool) {
	limit := int32(20)
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 50 {
			httpx.WriteValidationError(w, []validatex.Issue{{
				Path:    []any{"limit"},
				Code:    "invalid",
				Message: "limit must be between 1 and 50",
			}})
			return 0, false
		}
		limit = int32(parsed)
	}
	return limit, true
}

func requestToService(actorID, memoryID string, req UpsertMemoryRequest) memoriesservice.UpsertMemoryInput {
	var occurredAt *time.Time
	if req.OccurredAt != nil && strings.TrimSpace(*req.OccurredAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*req.OccurredAt))
		if err == nil {
			occurredAt = &parsed
		}
	}
	return memoriesservice.UpsertMemoryInput{
		ActorID:    actorID,
		MemoryID:   memoryID,
		DiveSiteID: strings.TrimSpace(req.DiveSiteID),
		Title:      req.Title,
		Body:       req.Body,
		Visibility: req.Visibility,
		OccurredAt: occurredAt,
		MediaIDs:   append([]string(nil), req.MediaIDs...),
	}
}

func memoriesToDTO(items []memoriesservice.Memory) []DiveMemory {
	out := make([]DiveMemory, 0, len(items))
	for _, item := range items {
		out = append(out, memoryToDTO(item))
	}
	return out
}

func memoryToDTO(item memoriesservice.Memory) DiveMemory {
	return DiveMemory{
		ID:           item.ID,
		AuthorUserID: item.AuthorUserID,
		DiveSiteID:   item.DiveSiteID,
		Title:        item.Title,
		Body:         item.Body,
		MediaIDs:     append([]string(nil), item.MediaIDs...),
		Visibility:   item.Visibility,
		OccurredAt:   formatTime(item.OccurredAt),
		CreatedAt:    formatTime(item.CreatedAt),
		UpdatedAt:    formatTime(item.UpdatedAt),
	}
}

func tagsToDTO(items []memoriesservice.MemoryTag) []MemoryTag {
	out := make([]MemoryTag, 0, len(items))
	for _, item := range items {
		out = append(out, tagToDTO(item))
	}
	return out
}

func tagToDTO(item memoriesservice.MemoryTag) MemoryTag {
	return MemoryTag{
		ID:           item.ID,
		MemoryID:     item.MemoryID,
		TaggedUserID: item.TaggedUserID,
		Status:       item.Status,
		CreatedAt:    formatTime(item.CreatedAt),
		UpdatedAt:    formatTime(item.UpdatedAt),
	}
}

func formatTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func actorIDIfPresent(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok {
		return ""
	}
	return identity.UserID
}
