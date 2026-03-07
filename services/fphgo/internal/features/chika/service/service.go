package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base32"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	chikarepo "fphgo/internal/features/chika/repo"
	"fphgo/internal/realtime/ws"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/pagination"
	sharedratelimit "fphgo/internal/shared/ratelimit"
)

type Service struct {
	repo         chikaRepository
	blockService blockChecker
	limiter      rateLimiter
	pseudonymKey string
	rt           realtimeBroadcaster
}

type chikaRepository interface {
	ListCategories(ctx context.Context) ([]chikarepo.Category, error)
	GetCategoryByID(ctx context.Context, categoryID string) (chikarepo.Category, error)
	CreateThread(ctx context.Context, title, mode, categoryID, actorID string) (chikarepo.Thread, error)
	ListThreads(ctx context.Context, viewerID string, includeHidden bool, cursorCreated time.Time, cursorThreadID string, limit int32) ([]chikarepo.Thread, error)
	ListThreadsByCategory(ctx context.Context, viewerID string, includeHidden bool, categorySlug string, cursorCreated time.Time, cursorThreadID string, limit int32) ([]chikarepo.Thread, error)
	GetThread(ctx context.Context, threadID string) (chikarepo.Thread, error)
	GetThreadForViewer(ctx context.Context, threadID, viewerID string) (chikarepo.Thread, error)
	UpdateThread(ctx context.Context, threadID, title string) (chikarepo.Thread, error)
	SoftDeleteThread(ctx context.Context, threadID string) error
	CreatePost(ctx context.Context, threadID, userID, pseudonym, content string) (chikarepo.Post, error)
	ListPosts(ctx context.Context, threadID, viewerID string, limit, offset int32) ([]chikarepo.Post, error)
	CreateComment(ctx context.Context, threadID, userID, pseudonym, content string, parentCommentID *int64) (chikarepo.Comment, error)
	ListComments(ctx context.Context, threadID, viewerID string, includeHidden bool, cursorCreated time.Time, cursorCommentID int64, limit int32) ([]chikarepo.Comment, error)
	GetComment(ctx context.Context, commentID int64) (chikarepo.Comment, error)
	UpdateComment(ctx context.Context, commentID int64, content string) (chikarepo.Comment, error)
	SoftDeleteComment(ctx context.Context, commentID int64) error
	SetThreadReaction(ctx context.Context, threadID, userID, reactionType string) (chikarepo.Reaction, error)
	RemoveThreadReaction(ctx context.Context, threadID, userID string) error
	SetCommentReaction(ctx context.Context, commentID int64, userID, reactionType string) (chikarepo.Reaction, error)
	RemoveCommentReaction(ctx context.Context, commentID int64, userID string) error
	CreateMediaAsset(ctx context.Context, input chikarepo.CreateMediaAssetInput) (chikarepo.MediaAsset, error)
	ListMediaByEntity(ctx context.Context, entityType, entityID string) ([]chikarepo.MediaAsset, error)
	EntityExists(ctx context.Context, entityType, entityID string) (bool, error)
	GetThreadAlias(ctx context.Context, threadID, userID string) (string, error)
	FindHistoricalThreadPseudonym(ctx context.Context, threadID, userID string) (string, error)
	UpsertThreadAlias(ctx context.Context, threadID, userID, pseudonym string) (string, error)
	PseudonymEnabled(ctx context.Context, userID string) (bool, error)
	Username(ctx context.Context, userID string) (string, error)
}

type blockChecker interface {
	IsBlockedEitherDirection(ctx context.Context, a, b string) (bool, error)
}

type rateLimiter interface {
	Allow(ctx context.Context, scope, key string, maxEvents int, window time.Duration) (sharedratelimit.Result, error)
}

type realtimeBroadcaster interface {
	BroadcastEnvelope(ws.Envelope)
}

type noopLimiter struct{}

func (noopLimiter) Allow(context.Context, string, string, int, time.Duration) (sharedratelimit.Result, error) {
	return sharedratelimit.Result{Allowed: true}, nil
}

type Option func(*Service)

func WithLimiter(limiter rateLimiter) Option {
	return func(s *Service) {
		if limiter != nil {
			s.limiter = limiter
		}
	}
}

type Thread = chikarepo.Thread
type Category = chikarepo.Category
type Post = chikarepo.Post
type Comment = chikarepo.Comment
type Reaction = chikarepo.Reaction
type MediaAsset = chikarepo.MediaAsset

type CreateThreadInput struct {
	ActorID    string
	Title      string
	Content    string
	CategoryID string
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
	ViewerID   string
	ViewerRole string
	Category   string
	Limit      int32
	Cursor     string
}

type CreatePostInput struct {
	ThreadID string
	UserID   string
	Content  string
}

type GetThreadInput struct {
	ViewerID   string
	ThreadID   string
	ViewerRole string
}

type ListThreadPostsInput struct {
	ThreadID   string
	ViewerID   string
	ViewerRole string
	Limit      int32
	Offset     int32
}

type CreateCommentInput struct {
	ThreadID        string
	UserID          string
	Content         string
	ParentCommentID *int64
}

type ListThreadCommentsInput struct {
	ThreadID   string
	ViewerID   string
	ViewerRole string
	Limit      int32
	Cursor     string
}

type ListThreadsResult struct {
	Items      []Thread
	NextCursor string
}

type ListCommentsResult struct {
	Items                 []Comment
	NextCursor            string
	CategoryPseudonymous  bool
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

type SetCommentReactionInput struct {
	CommentID int64
	UserID    string
	Type      string
}

type RemoveCommentReactionInput struct {
	CommentID int64
	UserID    string
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

func New(repo chikaRepository, blockService blockChecker, opts ...Option) *Service {
	svc := &Service{
		repo:         repo,
		blockService: blockService,
		limiter:      noopLimiter{},
		pseudonymKey: "dev-chika-pseudonym-key",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func WithPseudonymSecret(secret string) Option {
	return func(s *Service) {
		trimmed := strings.TrimSpace(secret)
		if trimmed != "" {
			s.pseudonymKey = trimmed
		}
	}
}

func WithRealtimeBroadcaster(broadcaster realtimeBroadcaster) Option {
	return func(s *Service) {
		s.rt = broadcaster
	}
}

func (s *Service) CreateThread(ctx context.Context, input CreateThreadInput) (Thread, error) {
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return Thread{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	title := strings.TrimSpace(input.Title)
	content := strings.TrimSpace(input.Content)
	if title == "" {
		return Thread{}, apperrors.New(http.StatusBadRequest, "invalid_title", "title is required", nil)
	}
	if _, err := uuid.Parse(input.CategoryID); err != nil {
		return Thread{}, apperrors.New(http.StatusBadRequest, "invalid_category_id", "invalid category id", err)
	}
	if err := s.enforceRateLimit(ctx, "chika.create_thread", input.ActorID, 5, time.Hour, "thread creation rate exceeded"); err != nil {
		return Thread{}, err
	}
	category, err := s.repo.GetCategoryByID(ctx, input.CategoryID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Thread{}, apperrors.New(http.StatusBadRequest, "invalid_category_id", "invalid category id", err)
		}
		return Thread{}, apperrors.New(http.StatusInternalServerError, "category_lookup_failed", "failed to resolve category", err)
	}
	mode := "normal"
	if category.Pseudonymous {
		mode = "locked_pseudonymous"
	}

	created, err := s.repo.CreateThread(ctx, title, mode, input.CategoryID, input.ActorID)
	if err != nil {
		return Thread{}, apperrors.New(http.StatusInternalServerError, "thread_create_failed", "failed to create thread", err)
	}
	created.Content = content
	if created.Mode == "pseudonymous" || created.Mode == "locked_pseudonymous" {
		if _, err := s.ensureThreadAlias(ctx, created.ID, input.ActorID, true); err != nil {
			_ = s.repo.SoftDeleteThread(ctx, created.ID)
			return Thread{}, err
		}
	}
	if content != "" {
		pseudonym, err := s.resolvePseudonym(ctx, input.ActorID, created.Mode, created.ID)
		if err != nil {
			_ = s.repo.SoftDeleteThread(ctx, created.ID)
			return Thread{}, err
		}
		if _, err := s.repo.CreatePost(ctx, created.ID, input.ActorID, pseudonym, content); err != nil {
			_ = s.repo.SoftDeleteThread(ctx, created.ID)
			return Thread{}, apperrors.New(http.StatusInternalServerError, "thread_content_create_failed", "failed to save thread content", err)
		}
	}
	s.broadcastChikaEvent("chika.thread.created", map[string]any{
		"threadId":     created.ID,
		"authorUserId": input.ActorID,
	})
	return created, nil
}

func (s *Service) ListCategories(ctx context.Context) ([]Category, error) {
	items, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "category_list_failed", "failed to list categories", err)
	}
	return items, nil
}

func (s *Service) ListThreads(ctx context.Context, input ListThreadsInput) (ListThreadsResult, error) {
	if _, err := uuid.Parse(input.ViewerID); err != nil {
		return ListThreadsResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
	}
	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	cursorCreated, cursorThreadID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, threadID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListThreadsResult{}, apperrors.New(http.StatusBadRequest, "validation_error", "invalid cursor", err)
		}
		cursorCreated = createdAt
		cursorThreadID = threadID
	}
	var (
		items []Thread
		err   error
	)
	categorySlug := strings.TrimSpace(strings.ToLower(input.Category))
	if categorySlug != "" {
		items, err = s.repo.ListThreadsByCategory(ctx, input.ViewerID, isModeratorRole(input.ViewerRole), categorySlug, cursorCreated, cursorThreadID, input.Limit+1)
	} else {
		items, err = s.repo.ListThreads(ctx, input.ViewerID, isModeratorRole(input.ViewerRole), cursorCreated, cursorThreadID, input.Limit+1)
	}
	if err != nil {
		return ListThreadsResult{}, apperrors.New(http.StatusInternalServerError, "thread_list_failed", "failed to list threads", err)
	}
	if err := s.hydrateThreadAliases(ctx, items); err != nil {
		return ListThreadsResult{}, err
	}
	nextCursor := ""
	if int32(len(items)) > input.Limit {
		next := items[input.Limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		items = items[:input.Limit]
	}
	return ListThreadsResult{Items: items, NextCursor: nextCursor}, nil
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

func (s *Service) GetThreadForViewer(ctx context.Context, input GetThreadInput) (Thread, error) {
	if _, err := uuid.Parse(input.ViewerID); err != nil {
		return Thread{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
	}
	thread, err := s.repo.GetThreadForViewer(ctx, input.ThreadID, input.ViewerID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Thread{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return Thread{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	if input.ViewerID != thread.CreatedByUserID {
		blocked, checkErr := s.isBlockedEither(ctx, input.ViewerID, thread.CreatedByUserID)
		if checkErr != nil {
			return Thread{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", checkErr)
		}
		if blocked {
			return Thread{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", nil)
		}
	}
	if thread.HiddenAt != nil && !isModeratorRole(input.ViewerRole) {
		return Thread{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", nil)
	}
	if thread.Mode == "pseudonymous" || thread.Mode == "locked_pseudonymous" {
		alias, aliasErr := s.ensureThreadAlias(ctx, thread.ID, thread.CreatedByUserID, false)
		if aliasErr != nil {
			return Thread{}, aliasErr
		}
		thread.AuthorPseudonym = alias
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
	if err := s.enforceRateLimit(ctx, "chika.update_thread", input.ActorID, 30, time.Minute, "thread update rate exceeded"); err != nil {
		return Thread{}, err
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
	if updated.Mode == "pseudonymous" || updated.Mode == "locked_pseudonymous" {
		alias, aliasErr := s.ensureThreadAlias(ctx, updated.ID, updated.CreatedByUserID, false)
		if aliasErr != nil {
			return Thread{}, aliasErr
		}
		updated.AuthorPseudonym = alias
	}
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": updated.ID,
	})
	return updated, nil
}

func (s *Service) DeleteThread(ctx context.Context, input DeleteThreadInput) error {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "chika.delete_thread", input.ActorID, 20, time.Minute, "thread delete rate exceeded"); err != nil {
		return err
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
	s.broadcastChikaEvent("chika.thread.deleted", map[string]any{
		"threadId": input.ThreadID,
	})
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
	if input.UserID != thread.CreatedByUserID {
		blocked, checkErr := s.isBlockedEither(ctx, input.UserID, thread.CreatedByUserID)
		if checkErr != nil {
			return Post{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", checkErr)
		}
		if blocked {
			return Post{}, apperrors.New(http.StatusForbidden, "blocked", "interaction is blocked between users", nil)
		}
	}
	postRateMax := 40
	if thread.Mode == "pseudonymous" || thread.Mode == "locked_pseudonymous" {
		postRateMax = 20
	}
	if err := s.enforceRateLimit(ctx, "chika.create_post", input.UserID, postRateMax, time.Minute, "post creation rate exceeded"); err != nil {
		return Post{}, err
	}

	pseudonym, err := s.resolvePseudonym(ctx, input.UserID, thread.Mode, thread.ID)
	if err != nil {
		return Post{}, err
	}

	post, err := s.repo.CreatePost(ctx, input.ThreadID, input.UserID, pseudonym, content)
	if err != nil {
		return Post{}, apperrors.New(http.StatusInternalServerError, "post_create_failed", "failed to create post", err)
	}
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": input.ThreadID,
	})
	return post, nil
}

func (s *Service) ListPosts(ctx context.Context, input ListThreadPostsInput) ([]Post, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return nil, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.ViewerID); err != nil {
		return nil, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
	}
	if _, err := s.GetThreadForViewer(ctx, GetThreadInput{ViewerID: input.ViewerID, ThreadID: input.ThreadID, ViewerRole: input.ViewerRole}); err != nil {
		return nil, err
	}
	limit, offset := normalizePagination(input.Limit, input.Offset)
	items, err := s.repo.ListPosts(ctx, input.ThreadID, input.ViewerID, limit, offset)
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
	if input.UserID != thread.CreatedByUserID {
		blocked, checkErr := s.isBlockedEither(ctx, input.UserID, thread.CreatedByUserID)
		if checkErr != nil {
			return Comment{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", checkErr)
		}
		if blocked {
			return Comment{}, apperrors.New(http.StatusForbidden, "blocked", "interaction is blocked between users", nil)
		}
	}
	if input.ParentCommentID != nil {
		parent, err := s.repo.GetComment(ctx, *input.ParentCommentID)
		if err != nil {
			if chikarepo.IsNoRows(err) {
				return Comment{}, apperrors.New(http.StatusBadRequest, "invalid_parent_comment_id", "parent comment not found", err)
			}
			return Comment{}, apperrors.New(http.StatusInternalServerError, "parent_comment_get_failed", "failed to get parent comment", err)
		}
		if parent.ThreadID != input.ThreadID {
			return Comment{}, apperrors.New(http.StatusBadRequest, "invalid_parent_comment_id", "parent comment belongs to a different thread", nil)
		}
	}
	commentRateMax := 60
	if thread.Mode == "pseudonymous" || thread.Mode == "locked_pseudonymous" {
		commentRateMax = 30
	}
	if err := s.enforceRateLimit(ctx, "chika.create_comment", input.UserID, commentRateMax, time.Minute, "comment creation rate exceeded"); err != nil {
		return Comment{}, err
	}

	pseudonym, err := s.resolvePseudonym(ctx, input.UserID, thread.Mode, thread.ID)
	if err != nil {
		return Comment{}, err
	}

	comment, err := s.repo.CreateComment(ctx, input.ThreadID, input.UserID, pseudonym, content, input.ParentCommentID)
	if err != nil {
		return Comment{}, apperrors.New(http.StatusInternalServerError, "comment_create_failed", "failed to create comment", err)
	}
	s.broadcastChikaEvent("chika.comment.created", map[string]any{
		"threadId":     comment.ThreadID,
		"commentId":    strconv.FormatInt(comment.ID, 10),
		"authorUserId": comment.AuthorUserID,
	})
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": comment.ThreadID,
	})
	return comment, nil
}

func (s *Service) ListComments(ctx context.Context, input ListThreadCommentsInput) (ListCommentsResult, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return ListCommentsResult{}, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.ViewerID); err != nil {
		return ListCommentsResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
	}
	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	thread, err := s.GetThreadForViewer(ctx, GetThreadInput{ViewerID: input.ViewerID, ThreadID: input.ThreadID, ViewerRole: input.ViewerRole})
	if err != nil {
		return ListCommentsResult{}, err
	}
	cursorCreated, cursorCommentID := pagination.DefaultInt64Cursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, commentID, err := pagination.DecodeInt64(input.Cursor)
		if err != nil {
			return ListCommentsResult{}, apperrors.New(http.StatusBadRequest, "validation_error", "invalid cursor", err)
		}
		cursorCreated = createdAt
		cursorCommentID = commentID
	}
	items, err := s.repo.ListComments(ctx, input.ThreadID, input.ViewerID, isModeratorRole(input.ViewerRole), cursorCreated, cursorCommentID, input.Limit+1)
	if err != nil {
		return ListCommentsResult{}, apperrors.New(http.StatusInternalServerError, "comment_list_failed", "failed to list comments", err)
	}
	nextCursor := ""
	if int32(len(items)) > input.Limit {
		next := items[input.Limit-1]
		nextCursor = pagination.Encode(next.CreatedAt, strconv.FormatInt(next.ID, 10))
		items = items[:input.Limit]
	}
	return ListCommentsResult{Items: items, NextCursor: nextCursor, CategoryPseudonymous: thread.Pseudonymous}, nil
}

func (s *Service) UpdateComment(ctx context.Context, input UpdateCommentInput) (Comment, error) {
	if input.CommentID <= 0 {
		return Comment{}, apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", nil)
	}
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return Comment{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "chika.update_comment", input.ActorID, 40, time.Minute, "comment update rate exceeded"); err != nil {
		return Comment{}, err
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
	s.broadcastChikaEvent("chika.comment.updated", map[string]any{
		"threadId":  updated.ThreadID,
		"commentId": strconv.FormatInt(updated.ID, 10),
	})
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": updated.ThreadID,
	})
	return updated, nil
}

func (s *Service) DeleteComment(ctx context.Context, input DeleteCommentInput) error {
	if input.CommentID <= 0 {
		return apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", nil)
	}
	if _, err := uuid.Parse(input.ActorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.enforceRateLimit(ctx, "chika.delete_comment", input.ActorID, 30, time.Minute, "comment delete rate exceeded"); err != nil {
		return err
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
	s.broadcastChikaEvent("chika.comment.deleted", map[string]any{
		"threadId":  comment.ThreadID,
		"commentId": strconv.FormatInt(comment.ID, 10),
	})
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": comment.ThreadID,
	})
	return nil
}

func (s *Service) SetThreadReaction(ctx context.Context, input SetThreadReactionInput) (Reaction, error) {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return Reaction{}, apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return Reaction{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	thread, err := s.repo.GetThread(ctx, input.ThreadID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Reaction{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	if input.UserID != thread.CreatedByUserID {
		blocked, checkErr := s.isBlockedEither(ctx, input.UserID, thread.CreatedByUserID)
		if checkErr != nil {
			return Reaction{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", checkErr)
		}
		if blocked {
			return Reaction{}, apperrors.New(http.StatusForbidden, "blocked", "interaction is blocked between users", nil)
		}
	}
	reactionRateMax := 120
	if thread.Mode == "pseudonymous" || thread.Mode == "locked_pseudonymous" {
		reactionRateMax = 80
	}
	if err := s.enforceRateLimit(ctx, "chika.set_reaction", input.UserID, reactionRateMax, time.Minute, "reaction rate exceeded"); err != nil {
		return Reaction{}, err
	}
	reactionType := strings.TrimSpace(strings.ToLower(input.Type))
	if reactionType != "upvote" && reactionType != "downvote" {
		return Reaction{}, apperrors.New(http.StatusBadRequest, "invalid_reaction", "reaction must be upvote or downvote", nil)
	}
	reaction, err := s.repo.SetThreadReaction(ctx, input.ThreadID, input.UserID, reactionType)
	if err != nil {
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "reaction_set_failed", "failed to set reaction", err)
	}
	updatedThread, err := s.repo.GetThread(ctx, input.ThreadID)
	if err != nil {
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	s.broadcastChikaEvent("chika.thread.reaction.updated", map[string]any{
		"threadId":    input.ThreadID,
		"voteCount":   updatedThread.VoteCount,
		"actorUserId": input.UserID,
	})
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": input.ThreadID,
	})
	return reaction, nil
}

func (s *Service) RemoveThreadReaction(ctx context.Context, input RemoveThreadReactionInput) error {
	if _, err := uuid.Parse(input.ThreadID); err != nil {
		return apperrors.New(http.StatusBadRequest, "invalid_thread_id", "invalid thread id", err)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	if err := s.enforceRateLimit(ctx, "chika.remove_reaction", input.UserID, 120, time.Minute, "reaction removal rate exceeded"); err != nil {
		return err
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
	updatedThread, err := s.repo.GetThread(ctx, input.ThreadID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	s.broadcastChikaEvent("chika.thread.reaction.updated", map[string]any{
		"threadId":    input.ThreadID,
		"voteCount":   updatedThread.VoteCount,
		"actorUserId": input.UserID,
	})
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": input.ThreadID,
	})
	return nil
}

func (s *Service) SetCommentReaction(ctx context.Context, input SetCommentReactionInput) (Reaction, error) {
	if input.CommentID <= 0 {
		return Reaction{}, apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", nil)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return Reaction{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	comment, err := s.repo.GetComment(ctx, input.CommentID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Reaction{}, apperrors.New(http.StatusNotFound, "comment_not_found", "comment not found", err)
		}
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "comment_get_failed", "failed to get comment", err)
	}
	if input.UserID != comment.AuthorUserID {
		blocked, checkErr := s.isBlockedEither(ctx, input.UserID, comment.AuthorUserID)
		if checkErr != nil {
			return Reaction{}, apperrors.New(http.StatusInternalServerError, "block_check_failed", "failed to validate block state", checkErr)
		}
		if blocked {
			return Reaction{}, apperrors.New(http.StatusForbidden, "blocked", "interaction is blocked between users", nil)
		}
	}
	commentThread, err := s.repo.GetThread(ctx, comment.ThreadID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return Reaction{}, apperrors.New(http.StatusNotFound, "thread_not_found", "thread not found", err)
		}
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "thread_get_failed", "failed to get thread", err)
	}
	reactionRateMax := 150
	if commentThread.Mode == "pseudonymous" || commentThread.Mode == "locked_pseudonymous" {
		reactionRateMax = 100
	}
	if err := s.enforceRateLimit(ctx, "chika.set_comment_reaction", input.UserID, reactionRateMax, time.Minute, "comment reaction rate exceeded"); err != nil {
		return Reaction{}, err
	}
	reactionType := strings.TrimSpace(strings.ToLower(input.Type))
	if reactionType != "upvote" && reactionType != "downvote" {
		return Reaction{}, apperrors.New(http.StatusBadRequest, "invalid_reaction", "reaction must be upvote or downvote", nil)
	}
	reaction, err := s.repo.SetCommentReaction(ctx, input.CommentID, input.UserID, reactionType)
	if err != nil {
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "reaction_set_failed", "failed to set reaction", err)
	}
	updatedComment, err := s.repo.GetComment(ctx, input.CommentID)
	if err != nil {
		return Reaction{}, apperrors.New(http.StatusInternalServerError, "comment_get_failed", "failed to get comment", err)
	}
	s.broadcastChikaEvent("chika.comment.reaction.updated", map[string]any{
		"threadId":    comment.ThreadID,
		"commentId":   strconv.FormatInt(comment.ID, 10),
		"voteCount":   updatedComment.VoteCount,
		"actorUserId": input.UserID,
	})
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": comment.ThreadID,
	})
	return reaction, nil
}

func (s *Service) RemoveCommentReaction(ctx context.Context, input RemoveCommentReactionInput) error {
	if input.CommentID <= 0 {
		return apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", nil)
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid user id", err)
	}
	if err := s.enforceRateLimit(ctx, "chika.remove_comment_reaction", input.UserID, 150, time.Minute, "comment reaction rate exceeded"); err != nil {
		return err
	}
	comment, err := s.repo.GetComment(ctx, input.CommentID)
	if err != nil {
		if chikarepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "comment_not_found", "comment not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "comment_get_failed", "failed to get comment", err)
	}
	if err := s.repo.RemoveCommentReaction(ctx, input.CommentID, input.UserID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "reaction_remove_failed", "failed to remove reaction", err)
	}
	updatedComment, err := s.repo.GetComment(ctx, input.CommentID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "comment_get_failed", "failed to get comment", err)
	}
	s.broadcastChikaEvent("chika.comment.reaction.updated", map[string]any{
		"threadId":    comment.ThreadID,
		"commentId":   strconv.FormatInt(comment.ID, 10),
		"voteCount":   updatedComment.VoteCount,
		"actorUserId": input.UserID,
	})
	s.broadcastChikaEvent("chika.thread.updated", map[string]any{
		"threadId": comment.ThreadID,
	})
	return nil
}

func (s *Service) broadcastChikaEvent(eventType string, payload map[string]any) {
	if s.rt == nil {
		return
	}
	s.rt.BroadcastEnvelope(ws.Envelope{
		Version: 1,
		Type:    eventType,
		EventID: uuid.NewString(),
		TS:      time.Now().UTC().Format(time.RFC3339),
		Payload: payload,
	})
}

func (s *Service) CreateMediaAsset(ctx context.Context, input CreateMediaAssetInput) (MediaAsset, error) {
	if _, err := uuid.Parse(input.OwnerUserID); err != nil {
		return MediaAsset{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid owner id", err)
	}
	if err := s.enforceRateLimit(ctx, "chika.create_media", input.OwnerUserID, 30, time.Minute, "media create rate exceeded"); err != nil {
		return MediaAsset{}, err
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
	if threadMode == "pseudonymous" || threadMode == "locked_pseudonymous" {
		return s.ensureThreadAlias(ctx, threadID, userID, true)
	}
	username, err := s.repo.Username(ctx, userID)
	if err != nil {
		return "", apperrors.New(http.StatusInternalServerError, "username_lookup_failed", "failed to resolve author username", err)
	}
	return username, nil
}

func (s *Service) RevealIdentityRateLimit(ctx context.Context, actorID string) error {
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	return s.enforceRateLimit(ctx, "chika.reveal_identity", actorID, 30, time.Minute, "identity reveal rate exceeded")
}

func (s *Service) hydrateThreadAliases(ctx context.Context, items []Thread) error {
	for idx := range items {
		if items[idx].Mode != "pseudonymous" && items[idx].Mode != "locked_pseudonymous" {
			continue
		}
		if strings.TrimSpace(items[idx].AuthorPseudonym) != "" {
			continue
		}
		alias, err := s.ensureThreadAlias(ctx, items[idx].ID, items[idx].CreatedByUserID, false)
		if err != nil {
			return err
		}
		items[idx].AuthorPseudonym = alias
	}
	return nil
}

func (s *Service) ensureThreadAlias(ctx context.Context, threadID, userID string, requirePseudonymousEnabled bool) (string, error) {
	if requirePseudonymousEnabled {
		enabled, err := s.repo.PseudonymEnabled(ctx, userID)
		if err != nil {
			return "", apperrors.New(http.StatusInternalServerError, "pseudonymous_state_failed", "failed to resolve pseudonymous state", err)
		}
		if !enabled {
			return "", apperrors.New(http.StatusForbidden, "pseudonymous_disabled", "your account does not allow pseudonymous posting", nil)
		}
	}
	alias, err := s.repo.GetThreadAlias(ctx, threadID, userID)
	if err == nil && strings.TrimSpace(alias) != "" {
		return alias, nil
	}
	if err != nil && !chikarepo.IsNoRows(err) {
		return "", apperrors.New(http.StatusInternalServerError, "alias_lookup_failed", "failed to resolve thread alias", err)
	}

	candidate, histErr := s.repo.FindHistoricalThreadPseudonym(ctx, threadID, userID)
	if histErr != nil && !chikarepo.IsNoRows(histErr) {
		return "", apperrors.New(http.StatusInternalServerError, "alias_history_lookup_failed", "failed to resolve thread alias history", histErr)
	}
	candidate = strings.TrimSpace(candidate)
	if candidate == "" {
		candidate = s.generateThreadPseudonym(threadID, userID)
	}
	alias, err = s.repo.UpsertThreadAlias(ctx, threadID, userID, candidate)
	if err != nil {
		return "", apperrors.New(http.StatusInternalServerError, "alias_upsert_failed", "failed to persist thread alias", err)
	}
	return alias, nil
}

func (s *Service) generateThreadPseudonym(threadID, userID string) string {
	mac := hmac.New(sha256.New, []byte(s.pseudonymKey))
	_, _ = mac.Write([]byte(threadID))
	_, _ = mac.Write([]byte(":"))
	_, _ = mac.Write([]byte(userID))
	sum := mac.Sum(nil)
	encoded := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(sum)
	return "anon-" + strings.ToUpper(encoded[:8])
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

func (s *Service) isBlockedEither(ctx context.Context, a, b string) (bool, error) {
	if s.blockService == nil {
		return false, nil
	}
	return s.blockService.IsBlockedEitherDirection(ctx, a, b)
}

func (s *Service) enforceRateLimit(ctx context.Context, scope, key string, maxEvents int, window time.Duration, message string) error {
	result, err := s.limiter.Allow(ctx, scope, key, maxEvents, window)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "rate_limit_failed", "failed to enforce rate limit", err)
	}
	if result.Allowed {
		return nil
	}
	retry := int(result.RetryAfter.Seconds())
	if retry < 1 {
		retry = 1
	}
	return apperrors.NewRateLimited(fmt.Sprintf("%s; retry after %ds", message, retry), int(window.Seconds()), retry)
}
