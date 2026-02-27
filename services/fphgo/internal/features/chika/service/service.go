package service

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	chikarepo "fphgo/internal/features/chika/repo"
	apperrors "fphgo/internal/shared/errors"
)

type Service struct {
	repo *chikarepo.Repo
}

type Thread = chikarepo.Thread
type Post = chikarepo.Post
type Comment = chikarepo.Comment
type Reaction = chikarepo.Reaction
type MediaAsset = chikarepo.MediaAsset

type CreateThreadInput struct {
	ActorID string
	Title   string
	Mode    string
}

type UpdateThreadInput struct {
	ThreadID    string
	ActorID     string
	ActorRole   string
	ThreadTitle string
}

type DeleteThreadInput struct {
	ThreadID  string
	ActorID   string
	ActorRole string
}

type ListThreadsInput struct {
	Limit  int32
	Offset int32
}

type CreatePostInput struct {
	ThreadID string
	UserID   string
	Content  string
}

type ListThreadPostsInput struct {
	ThreadID string
	Limit    int32
	Offset   int32
}

type CreateCommentInput struct {
	ThreadID string
	UserID   string
	Content  string
}

type ListThreadCommentsInput struct {
	ThreadID string
	Limit    int32
	Offset   int32
}

type UpdateCommentInput struct {
	CommentID   int64
	ActorID     string
	ActorRole   string
	CommentBody string
}

type DeleteCommentInput struct {
	CommentID int64
	ActorID   string
	ActorRole string
}

type SetThreadReactionInput struct {
	ThreadID string
	UserID   string
	Type     string
}

type RemoveThreadReactionInput struct {
	ThreadID string
	UserID   string
}

type CreateMediaAssetInput struct {
	OwnerUserID string
	EntityType  string
	EntityID    string
	StorageKey  string
	URL         string
	MimeType    string
	SizeBytes   int64
	Width       *int32
	Height      *int32
}

func New(repo *chikarepo.Repo) *Service { return &Service{repo: repo} }

func (s *Service) CreateThread(ctx context.Context, input CreateThreadInput) (Thread, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return Thread{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return Thread{}, apperrors.New(http.StatusBadRequest, "invalid_title", "title is required", nil)
	}
	mode := strings.TrimSpace(strings.ToLower(input.Mode))
	if mode == "" {
		mode = "normal"
	}
	if mode != "normal" && mode != "pseudonymous" {
		return Thread{}, apperrors.New(http.StatusBadRequest, "invalid_mode", "mode must be normal or pseudonymous", nil)
	}

	created, err := s.repo.CreateThread(ctx, title, mode, input.ActorID)
	if err != nil {
		return Thread{}, apperrors.New(http.StatusInternalServerError, "thread_create_failed", "failed to create thread", err)
	}
	return created, nil
}

func (s *Service) ListThreads(ctx context.Context, input ListThreadsInput) ([]Thread, error) {
	limit, offset := normalizePagination(input.Limit, input.Offset)
	items, err := s.repo.ListThreads(ctx, limit, offset)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "thread_list_failed", "failed to list threads", err)
	}
	return items, nil
}

func (s *Service) GetThread(ctx context.Context, threadID string) (Thread, error) {
	if _, err := uuid.Parse(threadID); err != nil {
		return Thread{}, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	thread, err := s.repo.GetThread(ctx, threadID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Thread{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return Thread{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	return thread, nil
}

func (s *Service) UpdateThread(ctx context.Context, input UpdateThreadInput) (Thread, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return Thread{}, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return Thread{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	title := strings.TrimSpace(input.ThreadTitle)
	if title == "" {
		return Thread{}, apperrors.New(http.StatusBadRequest, "invalid_title", "title is required", nil)
	}

	thread, err := s.repo.GetThread(ctx, input.ThreadID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Thread{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return Thread{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	if thread.CreatedByUserID != input.ActorID && !isModeratorRole(input.ActorRole) {
		return Thread{}, apperrors.New(http.StatusForbidden, "forbidden", "only owner or moderator can update thread", nil)
	}

	updated, err := s.repo.UpdateThread(ctx, input.ThreadID, title)
	if err != nil {
		return Thread{}, apperrors.New(http.StatusInternalServerError, "thread_update_failed", "failed to update thread", err)
	}
	return updated, nil
}

func (s *Service) DeleteThread(ctx context.Context, input DeleteThreadInput) error {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	thread, err := s.repo.GetThread(ctx, input.ThreadID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	if thread.CreatedByUserID != input.ActorID && !isModeratorRole(input.ActorRole) {
		return apperrors.New(http.StatusForbidden, "forbidden", "only owner or moderator can delete thread", nil)
	}
	if err := s.repo.SoftDeleteThread(ctx, input.ThreadID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "thread_delete_failed", "failed to delete thread", err)
	}
	return nil
}

func (s *Service) CreatePost(ctx context.Context, input CreatePostInput) (Post, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return Post{}, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return Post{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	content := strings.TrimSpace(input.Content)
	if content == "" {
		return Post{}, apperrors.New(http.StatusBadRequest, "invalid_content", "content is required", nil)
	}

	thread, err := s.repo.GetThread(ctx, input.ThreadID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Post{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return Post{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}

	pseudonym, err := s.resolvePseudonym(ctx, input.UserID, thread.Mode, thread.ID)
	if err != nil {
		return Post{}, err
	}

	post, err := s.repo.CreatePost(ctx, input.ThreadID, input.UserID, pseudonym, content)
	if err != nil {
		return Post{}, apperrors.New(http.StatusInternalServerError, "post_create_failed", "failed to create post", err)
	}
	return post, nil
}

func (s *Service) ListPosts(ctx context.Context, input ListThreadPostsInput) ([]Post, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return nil, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := s.repo.GetThread(ctx, input.ThreadID); err != nil {
		if chikarepo.IsNoRows(err) {
			return nil, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return nil, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	limit, offset := normalizePagination(input.Limit, input.Offset)
	items, err := s.repo.ListPosts(ctx, input.ThreadID, limit, offset)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "post_list_failed", "failed to list posts", err)
	}
	return items, nil
}

func (s *Service) CreateComment(ctx context.Context, input CreateCommentInput) (Comment, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return Comment{}, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return Comment{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	content := strings.TrimSpace(input.Content)
	if content == "" {
		return Comment{}, apperrors.New(http.StatusBadRequest, "invalid_content", "content is required", nil)
	}

	thread, err := s.repo.GetThread(ctx, input.ThreadID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Comment{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return Comment{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}

	pseudonym, err := s.resolvePseudonym(ctx, input.UserID, thread.Mode, thread.ID)
	if err != nil {
		return Comment{}, err
	}

	comment, err := s.repo.CreateComment(ctx, input.ThreadID, input.UserID, pseudonym, content)
	if err != nil {
		return Comment{}, apperrors.New(http.StatusInternalServerError, "comment_create_failed", "failed to create comment", err)
	}
	return comment, nil
}

func (s *Service) ListComments(ctx context.Context, input ListThreadCommentsInput) ([]Comment, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return nil, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := s.repo.GetThread(ctx, input.ThreadID); err != nil {
		if chikarepo.IsNoRows(err) {
			return nil, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return nil, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	limit, offset := normalizePagination(input.Limit, input.Offset)
	items, err := s.repo.ListComments(ctx, input.ThreadID, limit, offset)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "comment_list_failed", "failed to list comments", err)
	}
	return items, nil
}

func (s *Service) UpdateComment(ctx context.Context, input UpdateCommentInput) (Comment, error) {
	if input.CommentID <= 0 {
		return Comment{}, apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", nil)
	}
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return Comment{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	content := strings.TrimSpace(input.CommentBody)
	if content == "" {
		return Comment{}, apperrors.New(http.StatusBadRequest, "invalid_content", "content is required", nil)
	}

	comment, err := s.repo.GetComment(ctx, input.CommentID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Comment{}, apperrors.New(http.StatusNotFound, "comment_not_found", "comment not found", err)
		}
		return Comment{}, apperrors.New(http.StatusInternalServerError, "comment_get_failed", "failed to get comment", err)
	}
	if comment.AuthorUserID != input.ActorID && !isModeratorRole(input.ActorRole) {
		return Comment{}, apperrors.New(http.StatusForbidden, "forbidden", "only owner or moderator can update comment", nil)
	}

	updated, err := s.repo.UpdateComment(ctx, input.CommentID, content)
	if err != nil {
		return Comment{}, apperrors.New(http.StatusInternalServerError, "comment_update_failed", "failed to update comment", err)
	}
	return updated, nil
}

func (s *Service) DeleteComment(ctx context.Context, input DeleteCommentInput) error {
	if input.CommentID <= 0 {
		return apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", nil)
	}
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}

	comment, err := s.repo.GetComment(ctx, input.CommentID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "comment_not_found", "comment not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "comment_get_failed", "failed to get comment", err)
	}
	if comment.AuthorUserID != input.ActorID && !isModeratorRole(input.ActorRole) {
		return apperrors.New(http.StatusForbidden, "forbidden", "only owner or moderator can delete comment", nil)
	}
	if err := s.repo.SoftDeleteComment(ctx, input.CommentID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "comment_delete_failed", "failed to delete comment", err)
	}
	return nil
}

func (s *Service) SetThreadReaction(ctx context.Context, input SetThreadReactionInput) (Reaction, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return Reaction{}, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return Reaction{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	if _, err := s.repo.GetThread(ctx, input.ThreadID); err != nil {
		if chikarepo.IsNoRows(err) {
			return Reaction{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	reactionType := strings.TrimSpace(strings.ToLower(input.Type))
	if reactionType != "upvote" && reactionType != "downvote" {
		return Reaction{}, apperrors.New(http.StatusBadRequest, "invalid_reaction", "reaction must be upvote or downvote", nil)
	}
	reaction, err := s.repo.SetThreadReaction(ctx, input.ThreadID, input.UserID, reactionType)
	if err != nil {
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "reaction_set_failed", "failed to set reaction", err)
	}
	return reaction, nil
}

func (s *Service) RemoveThreadReaction(ctx context.Context, input RemoveThreadReactionInput) error {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	if _, err := s.repo.GetThread(ctx, input.ThreadID); err != nil {
		if chikarepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	if err := s.repo.RemoveThreadReaction(ctx, input.ThreadID, input.UserID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "reaction_remove_failed", "failed to remove reaction", err)
	}
	return nil
}

func (s *Service) CreateMediaAsset(ctx context.Context, input CreateMediaAssetInput) (MediaAsset, error) {
	if _, err := uuid.Parse(input.OwnerUserID); err != nil {
		return MediaAsset{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid owner id", err)
	}
	entityType := strings.TrimSpace(strings.ToLower(input.EntityType))
	if entityType != "thread" && entityType != "post" && entityType != "comment" {
		return MediaAsset{}, apperrors.New(http.StatusBadRequest, "invalid_entity_type", "entityType must be thread, post, or comment", nil)
	}
	if strings.TrimSpace(input.EntityID) == "" {
		return MediaAsset{}, apperrors.New(http.StatusBadRequest, "invalid_entity_id", "entityId is required", nil)
	}
	if strings.TrimSpace(input.StorageKey) == "" {
		return MediaAsset{}, apperrors.New(http.StatusBadRequest, "invalid_storage_key", "storageKey is required", nil)
	}
	if strings.TrimSpace(input.URL) == "" {
		return MediaAsset{}, apperrors.New(http.StatusBadRequest, "invalid_url", "url is required", nil)
	}
	if strings.TrimSpace(input.MimeType) == "" {
		return MediaAsset{}, apperrors.New(http.StatusBadRequest, "invalid_mime_type", "mimeType is required", nil)
	}
	if input.SizeBytes < 0 {
		return MediaAsset{}, apperrors.New(http.StatusBadRequest, "invalid_size", "sizeBytes cannot be negative", nil)
	}

	exists, err := s.repo.EntityExists(ctx, entityType, strings.TrimSpace(input.EntityID))
	if err != nil {
		return MediaAsset{}, apperrors.New(http.StatusInternalServerError, "entity_check_failed", "failed to validate entity", err)
	}
	if !exists {
		return MediaAsset{}, apperrors.New(http.StatusNotFound, "entity_not_found", "referenced entity does not exist or is deleted", nil)
	}

	asset, err := s.repo.CreateMediaAsset(ctx, chikarepo.CreateMediaAssetInput{
		OwnerUserID: input.OwnerUserID,
		EntityType:  entityType,
		EntityID:    strings.TrimSpace(input.EntityID),
		StorageKey:  strings.TrimSpace(input.StorageKey),
		URL:         strings.TrimSpace(input.URL),
		MimeType:    strings.TrimSpace(input.MimeType),
		SizeBytes:   input.SizeBytes,
		Width:       input.Width,
		Height:      input.Height,
	})
	if err != nil {
		return MediaAsset{}, apperrors.New(http.StatusInternalServerError, "media_create_failed", "failed to create media metadata", err)
	}
	return asset, nil
}

func (s *Service) ListMediaByEntity(ctx context.Context, entityType, entityID string) ([]MediaAsset, error) {
	entityType = strings.TrimSpace(strings.ToLower(entityType))
	if entityType != "thread" && entityType != "post" && entityType != "comment" {
		return nil, apperrors.New(http.StatusBadRequest, "invalid_entity_type", "entityType must be thread, post, or comment", nil)
	}
	entityID = strings.TrimSpace(entityID)
	if entityID == "" {
		return nil, apperrors.New(http.StatusBadRequest, "invalid_entity_id", "entityId is required", nil)
	}
	items, err := s.repo.ListMediaByEntity(ctx, entityType, entityID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "media_list_failed", "failed to list media metadata", err)
	}
	return items, nil
}

func (s *Service) resolvePseudonym(ctx context.Context, userID, threadMode, threadID string) (string, error) {
	enabled, err := s.repo.PseudonymEnabled(ctx, userID)
	if err != nil {
		return "", apperrors.New(http.StatusInternalServerError, "pseudonym_policy_failed", "failed to resolve pseudonym settings", err)
	}
	if enabled || threadMode == "pseudonymous" {
		return "anon-" + userID[:8] + "-" + threadID[:6], nil
	}
	username, err := s.repo.Username(ctx, userID)
	if err != nil {
		return "", apperrors.New(http.StatusInternalServerError, "username_lookup_failed", "failed to resolve author username", err)
	}
	return username, nil
}

func isModeratorRole(role string) bool {
	return role == "moderator" || role == "admin" || role == "super_admin"
}

func normalizePagination(limit, offset int32) (int32, int32) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}
