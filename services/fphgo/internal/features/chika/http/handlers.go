package http

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	chikaservice "fphgo/internal/features/chika/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type Handlers struct {
	service   *chikaservice.Service
	validator httpx.Validator
}

func New(service *chikaservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) CreateThread(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[CreateThreadRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	thread, err := h.service.CreateThread(r.Context(), chikaservice.CreateThreadInput{
		ActorID:    actor.ID,
		Title:      req.Title,
		Content:    req.Content,
		CategoryID: req.CategoryID,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, threadResponse(thread, actor.ID, false))
}

func (h *Handlers) ListCategories(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListCategories(r.Context())
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	resp := make([]CategoryResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, CategoryResponse{
			ID:           item.ID,
			Slug:         item.Slug,
			Name:         item.Name,
			Pseudonymous: item.Pseudonymous,
		})
	}
	httpx.JSON(w, http.StatusOK, ListCategoriesResponse{Items: resp})
}

func (h *Handlers) ListThreads(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorOrGuest(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	limit, offset := parsePagination(r, actor.IsGuest)
	result, err := h.service.ListThreads(r.Context(), chikaservice.ListThreadsInput{
		ViewerID:   actor.ID,
		ViewerRole: actor.Role,
		Category:   r.URL.Query().Get("category"),
		Limit:      limit,
		Cursor:     publicCursor(actor.IsGuest, r.URL.Query().Get("cursor")),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	includeRealAuthor := shouldIncludeRealAuthor(r, actor.CanRevealIdentity)
	if includeRealAuthor {
		if err := h.service.RevealIdentityRateLimit(r.Context(), actor.ID); err != nil {
			httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
			return
		}
	}

	resp := make([]ThreadResponse, 0, len(result.Items))
	for _, item := range result.Items {
		resp = append(resp, threadResponse(item, actor.ID, includeRealAuthor))
	}

	nextCursor := result.NextCursor
	if actor.IsGuest {
		nextCursor = ""
	}
	httpx.JSON(w, http.StatusOK, ListThreadsResponse{
		Items: resp,
		Pagination: Pagination{
			Limit:  limit,
			Offset: offset,
		},
		NextCursor: nextCursor,
	})
}

func (h *Handlers) GetThread(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorOrGuest(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")
	thread, err := h.service.GetThreadForViewer(r.Context(), chikaservice.GetThreadInput{
		ViewerID:   actor.ID,
		ThreadID:   threadID,
		ViewerRole: actor.Role,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	includeRealAuthor := shouldIncludeRealAuthor(r, actor.CanRevealIdentity)
	if includeRealAuthor {
		if err := h.service.RevealIdentityRateLimit(r.Context(), actor.ID); err != nil {
			httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
			return
		}
	}

	httpx.JSON(w, http.StatusOK, threadResponse(thread, actor.ID, includeRealAuthor))
}

func (h *Handlers) UpdateThread(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[UpdateThreadRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	threadID := chi.URLParam(r, "threadId")
	thread, err := h.service.UpdateThread(r.Context(), chikaservice.UpdateThreadInput{
		ThreadID:    threadID,
		ActorID:     actor.ID,
		ActorRole:   actor.Role,
		ThreadTitle: req.Title,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, threadResponse(thread, actor.ID, false))
}

func (h *Handlers) DeleteThread(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	threadID := chi.URLParam(r, "threadId")
	if err := h.service.DeleteThread(r.Context(), chikaservice.DeleteThreadInput{
		ThreadID:  threadID,
		ActorID:   actor.ID,
		ActorRole: actor.Role,
	}); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"status": "deleted"})
}

func (h *Handlers) CreatePost(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")

	req, issues, ok := httpx.DecodeAndValidate[CreatePostRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	post, err := h.service.CreatePost(r.Context(), chikaservice.CreatePostInput{
		ThreadID: threadID,
		UserID:   actor.ID,
		Content:  req.Content,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, postResponse(post))
}

func (h *Handlers) ListPosts(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorOrGuest(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")
	limit, offset := parsePagination(r, actor.IsGuest)
	items, err := h.service.ListPosts(r.Context(), chikaservice.ListThreadPostsInput{
		ThreadID:   threadID,
		ViewerID:   actor.ID,
		ViewerRole: actor.Role,
		Limit:      limit,
		Offset:     offset,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	resp := make([]PostResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, postResponse(item))
	}

	httpx.JSON(w, http.StatusOK, ListPostsResponse{
		Items: resp,
		Pagination: Pagination{
			Limit:  limit,
			Offset: offset,
		},
	})
}

func (h *Handlers) CreateComment(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")

	req, issues, ok := httpx.DecodeAndValidate[CreateCommentRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	var parentCommentID *int64
	if raw := strings.TrimSpace(req.ParentCommentID); raw != "" {
		parsed, parseErr := strconv.ParseInt(raw, 10, 64)
		if parseErr != nil || parsed <= 0 {
			httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "invalid_parent_comment_id", "invalid parent comment id", parseErr))
			return
		}
		parentCommentID = &parsed
	}

	comment, err := h.service.CreateComment(r.Context(), chikaservice.CreateCommentInput{
		ThreadID:        threadID,
		UserID:          actor.ID,
		Content:         req.Content,
		ParentCommentID: parentCommentID,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	categoryPseudo := true
	if thread, getErr := h.service.GetThreadForViewer(r.Context(), chikaservice.GetThreadInput{ViewerID: actor.ID, ThreadID: threadID, ViewerRole: actor.Role}); getErr == nil {
		categoryPseudo = thread.Pseudonymous
	}
	httpx.JSON(w, http.StatusCreated, commentResponse(comment, false, categoryPseudo))
}

func (h *Handlers) ListComments(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorOrGuest(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")
	limit, offset := parsePagination(r, actor.IsGuest)
	result, err := h.service.ListComments(r.Context(), chikaservice.ListThreadCommentsInput{
		ThreadID:   threadID,
		ViewerID:   actor.ID,
		ViewerRole: actor.Role,
		Limit:      limit,
		Cursor:     publicCursor(actor.IsGuest, r.URL.Query().Get("cursor")),
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	includeRealAuthor := shouldIncludeRealAuthor(r, actor.CanRevealIdentity)
	if includeRealAuthor {
		if err := h.service.RevealIdentityRateLimit(r.Context(), actor.ID); err != nil {
			httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
			return
		}
	}

	resp := make([]CommentResponse, 0, len(result.Items))
	for _, item := range result.Items {
		resp = append(resp, commentResponse(item, includeRealAuthor, result.CategoryPseudonymous))
	}

	nextCursor := result.NextCursor
	if actor.IsGuest {
		nextCursor = ""
	}
	httpx.JSON(w, http.StatusOK, ListCommentsResponse{
		Items: resp,
		Pagination: Pagination{
			Limit:  limit,
			Offset: offset,
		},
		NextCursor: nextCursor,
	})
}

func (h *Handlers) UpdateComment(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	commentIDRaw := chi.URLParam(r, "commentId")
	commentID, err := strconv.ParseInt(commentIDRaw, 10, 64)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", err))
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[UpdateCommentRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	comment, err := h.service.UpdateComment(r.Context(), chikaservice.UpdateCommentInput{
		CommentID:   commentID,
		ActorID:     actor.ID,
		ActorRole:   actor.Role,
		CommentBody: req.Content,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	categoryPseudo := true
	if thread, getErr := h.service.GetThreadForViewer(r.Context(), chikaservice.GetThreadInput{ViewerID: actor.ID, ThreadID: comment.ThreadID, ViewerRole: actor.Role}); getErr == nil {
		categoryPseudo = thread.Pseudonymous
	}
	httpx.JSON(w, http.StatusOK, commentResponse(comment, false, categoryPseudo))
}

func (h *Handlers) DeleteComment(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	commentIDRaw := chi.URLParam(r, "commentId")
	commentID, err := strconv.ParseInt(commentIDRaw, 10, 64)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", err))
		return
	}

	if err := h.service.DeleteComment(r.Context(), chikaservice.DeleteCommentInput{
		CommentID: commentID,
		ActorID:   actor.ID,
		ActorRole: actor.Role,
	}); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "deleted"})
}

func (h *Handlers) SetThreadReaction(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")

	req, issues, ok := httpx.DecodeAndValidate[SetReactionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	reaction, err := h.service.SetThreadReaction(r.Context(), chikaservice.SetThreadReactionInput{
		ThreadID: threadID,
		UserID:   actor.ID,
		Type:     req.Type,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, ReactionResponse(reaction))
}

func (h *Handlers) RemoveThreadReaction(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")

	if err := h.service.RemoveThreadReaction(r.Context(), chikaservice.RemoveThreadReactionInput{
		ThreadID: threadID,
		UserID:   actor.ID,
	}); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "removed"})
}

func (h *Handlers) SetCommentReaction(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	commentIDRaw := chi.URLParam(r, "commentId")
	commentID, parseErr := strconv.ParseInt(commentIDRaw, 10, 64)
	if parseErr != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", parseErr))
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[SetReactionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	reaction, err := h.service.SetCommentReaction(r.Context(), chikaservice.SetCommentReactionInput{
		CommentID: commentID,
		UserID:    actor.ID,
		Type:      req.Type,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, CommentReactionResponse{
		CommentID: strconv.FormatInt(commentID, 10),
		UserID:    reaction.UserID,
		Type:      reaction.Type,
	})
}

func (h *Handlers) RemoveCommentReaction(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	commentIDRaw := chi.URLParam(r, "commentId")
	commentID, parseErr := strconv.ParseInt(commentIDRaw, 10, 64)
	if parseErr != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "invalid_comment_id", "invalid comment id", parseErr))
		return
	}
	if err := h.service.RemoveCommentReaction(r.Context(), chikaservice.RemoveCommentReactionInput{
		CommentID: commentID,
		UserID:    actor.ID,
	}); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "removed"})
}

func (h *Handlers) CreateMediaAsset(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActor(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[CreateMediaAssetRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	asset, err := h.service.CreateMediaAsset(r.Context(), chikaservice.CreateMediaAssetInput{
		OwnerUserID: actor.ID,
		EntityType:  req.EntityType,
		EntityID:    req.EntityID,
		StorageKey:  req.StorageKey,
		URL:         req.URL,
		MimeType:    req.MimeType,
		SizeBytes:   req.SizeBytes,
		Width:       req.Width,
		Height:      req.Height,
	})
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusCreated, mediaResponse(asset))
}

func (h *Handlers) ListThreadMedia(w http.ResponseWriter, r *http.Request) {
	actor, err := requireActorOrGuest(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	threadID := chi.URLParam(r, "threadId")
	if _, err := h.service.GetThreadForViewer(r.Context(), chikaservice.GetThreadInput{
		ViewerID:   actor.ID,
		ThreadID:   threadID,
		ViewerRole: actor.Role,
	}); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	items, err := h.service.ListMediaByEntity(r.Context(), "thread", threadID)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	resp := make([]MediaAssetResponse, 0, len(items))
	for _, item := range items {
		resp = append(resp, mediaResponse(item))
	}
	httpx.JSON(w, http.StatusOK, ListMediaResponse{Items: resp})
}

type Actor struct {
	ID                string
	Role              string
	CanModerate       bool
	CanRevealIdentity bool
	IsGuest           bool
}

func requireActor(r *http.Request) (Actor, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return Actor{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return Actor{
		ID:                identity.UserID,
		Role:              identity.GlobalRole,
		CanModerate:       identity.Can(authz.PermissionChikaModerate, authz.Scope{}),
		CanRevealIdentity: identity.Can(authz.PermissionChikaReveal, authz.Scope{}),
	}, nil
}

func requireActorOrGuest(r *http.Request) (Actor, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return Actor{
			ID:                "00000000-0000-0000-0000-000000000000",
			Role:              "guest",
			CanModerate:       false,
			CanRevealIdentity: false,
			IsGuest:           true,
		}, nil
	}
	return Actor{
		ID:                identity.UserID,
		Role:              identity.GlobalRole,
		CanModerate:       identity.Can(authz.PermissionChikaModerate, authz.Scope{}),
		CanRevealIdentity: identity.Can(authz.PermissionChikaReveal, authz.Scope{}),
		IsGuest:           false,
	}, nil
}

func parsePagination(r *http.Request, isGuest bool) (int32, int32) {
	limit := int32(20)
	offset := int32(0)

	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 32); err == nil && parsed > 0 && parsed <= 100 {
			limit = int32(parsed)
		}
	}
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 32); err == nil && parsed >= 0 {
			offset = int32(parsed)
		}
	}
	if isGuest {
		if limit > 10 {
			limit = 10
		}
		offset = 0
	}
	return limit, offset
}

func threadResponse(input chikaservice.Thread, viewerID string, includeRealAuthor bool) ThreadResponse {
	hiddenAt := ""
	if input.HiddenAt != nil {
		hiddenAt = input.HiddenAt.UTC().Format(time.RFC3339)
	}
	authorDisplay := input.AuthorUsername
	if authorDisplay == "" {
		authorDisplay = input.CreatedByUserID
	}
	realAuthorID := ""
	if input.Mode == "pseudonymous" || input.Mode == "locked_pseudonymous" {
		if viewerID == input.CreatedByUserID {
			authorDisplay = "You"
		} else {
			authorDisplay = input.AuthorPseudonym
			if strings.TrimSpace(authorDisplay) == "" {
				authorDisplay = "anon-UNKNOWN"
			}
		}
	}
	if includeRealAuthor {
		realAuthorID = input.CreatedByUserID
	}
	return ThreadResponse{
		ID:               input.ID,
		Title:            input.Title,
		Content:          input.Content,
		VoteCount:        input.VoteCount,
		CommentCount:     input.CommentCount,
		UserReaction:     input.ViewerReaction,
		Mode:             input.Mode,
		CategoryID:       input.CategoryID,
		CategorySlug:     input.CategorySlug,
		CategoryName:     input.CategoryName,
		CategoryPseudo:   input.Pseudonymous,
		AuthorDisplay:    authorDisplay,
		RealAuthorUserID: realAuthorID,
		IsHidden:         input.HiddenAt != nil,
		HiddenAt:         hiddenAt,
		CreatedAt:        input.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        input.UpdatedAt.Format(time.RFC3339),
	}
}

func postResponse(input chikaservice.Post) PostResponse {
	return PostResponse{
		ID:        input.ID,
		ThreadID:  input.ThreadID,
		Pseudonym: input.Pseudonym,
		Content:   input.Content,
		CreatedAt: input.CreatedAt.Format(time.RFC3339),
	}
}

func commentResponse(input chikaservice.Comment, includeRealAuthor bool, categoryPseudonymous bool) CommentResponse {
	hiddenAt := ""
	if input.HiddenAt != nil {
		hiddenAt = input.HiddenAt.UTC().Format(time.RFC3339)
	}
	parentCommentID := ""
	if input.ParentID != nil {
		parentCommentID = strconv.FormatInt(*input.ParentID, 10)
	}
	realAuthorID := ""
	if includeRealAuthor {
		realAuthorID = input.AuthorUserID
	}
	authorAvatarURL := ""
	if !categoryPseudonymous && input.AuthorAvatarURL != "" {
		authorAvatarURL = input.AuthorAvatarURL
	}
	return CommentResponse{
		ID:               strconv.FormatInt(input.ID, 10),
		ThreadID:         input.ThreadID,
		ParentCommentID:  parentCommentID,
		VoteCount:        input.VoteCount,
		ReplyCount:       input.ReplyCount,
		UserReaction:     input.ViewerReaction,
		AuthorDisplay:    input.Pseudonym,
		AuthorAvatarURL:  authorAvatarURL,
		RealAuthorUserID: realAuthorID,
		Content:          input.Content,
		IsHidden:         input.HiddenAt != nil,
		HiddenAt:         hiddenAt,
		CreatedAt:        input.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        input.UpdatedAt.Format(time.RFC3339),
	}
}

func mediaResponse(input chikaservice.MediaAsset) MediaAssetResponse {
	return MediaAssetResponse{
		ID:         input.ID,
		EntityType: input.EntityType,
		EntityID:   input.EntityID,
		StorageKey: input.StorageKey,
		URL:        input.URL,
		MimeType:   input.MimeType,
		SizeBytes:  input.SizeBytes,
	}
}

func shouldIncludeRealAuthor(r *http.Request, canRevealIdentity bool) bool {
	if !canRevealIdentity {
		return false
	}
	raw := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("includeRealAuthor")))
	return raw == "1" || raw == "true" || raw == "yes"
}

func publicCursor(isGuest bool, cursor string) string {
	if isGuest {
		return ""
	}
	return cursor
}
