package http

import (
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	mediaservice "fphgo/internal/features/media/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/mediaurl"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   *mediaservice.Service
	validator httpx.Validator
}

func New(service *mediaservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) Upload(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "validation_error", "invalid multipart payload", err))
		return
	}

	contextType := strings.TrimSpace(r.FormValue("contextType"))
	var contextID *string
	if raw := strings.TrimSpace(r.FormValue("contextId")); raw != "" {
		contextID = &raw
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		httpx.WriteValidationError(w, []validatex.Issue{
			{Path: []any{"file"}, Code: "required", Message: "file is required"},
		})
		return
	}
	defer file.Close()

	tmp, err := os.CreateTemp("", "media-upload-*")
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusInternalServerError, "media_tempfile_failed", "failed to process upload", err))
		return
	}
	tmpPath := tmp.Name()
	defer func() {
		tmp.Close()
		_ = os.Remove(tmpPath)
	}()

	sizeBytes, err := io.Copy(tmp, file)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "media_read_failed", "failed to read upload", err))
		return
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusInternalServerError, "media_read_failed", "failed to process upload", err))
		return
	}

	result, err := h.service.Upload(r.Context(), mediaservice.UploadInput{
		OwnerUserID: actorID,
		ContextType: contextType,
		ContextID:   contextID,
		Filename:    header.Filename,
		File:        tmp,
		SizeBytes:   sizeBytes,
	})
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, UploadMediaResponse{
		ID:          result.ID,
		ObjectKey:   result.ObjectKey,
		MimeType:    result.MimeType,
		SizeBytes:   result.SizeBytes,
		Width:       result.Width,
		Height:      result.Height,
		ContextType: result.ContextType,
		ContextID:   result.ContextID,
		State:       result.State,
	})
}

func (h *Handlers) UploadMultiple(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	if err := r.ParseMultipartForm(128 << 20); err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusBadRequest, "validation_error", "invalid multipart payload", err))
		return
	}

	contextType := strings.TrimSpace(r.FormValue("contextType"))
	var contextID *string
	if raw := strings.TrimSpace(r.FormValue("contextId")); raw != "" {
		contextID = &raw
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		httpx.WriteValidationError(w, []validatex.Issue{{Path: []any{"files"}, Code: "required", Message: "files is required"}})
		return
	}
	if len(files) > 20 {
		httpx.WriteValidationError(w, []validatex.Issue{{Path: []any{"files"}, Code: "too_big", Message: "files must be 20 or fewer"}})
		return
	}

	result := UploadMultipleMediaResponse{
		Items:  make([]UploadMediaResponse, 0, len(files)),
		Errors: make([]UploadMultipleErrorEntry, 0),
	}

	for idx, fileHeader := range files {
		file, openErr := fileHeader.Open()
		if openErr != nil {
			result.Errors = append(result.Errors, UploadMultipleErrorEntry{Index: idx, Code: "file_open_failed", Message: "failed to read file"})
			continue
		}

		tmp, tmpErr := os.CreateTemp("", "media-upload-*")
		if tmpErr != nil {
			file.Close()
			result.Errors = append(result.Errors, UploadMultipleErrorEntry{Index: idx, Code: "tempfile_failed", Message: "failed to process upload"})
			continue
		}
		tmpPath := tmp.Name()

		sizeBytes, copyErr := io.Copy(tmp, file)
		_ = file.Close()
		if copyErr != nil {
			_ = tmp.Close()
			_ = os.Remove(tmpPath)
			result.Errors = append(result.Errors, UploadMultipleErrorEntry{Index: idx, Code: "file_read_failed", Message: "failed to read upload"})
			continue
		}

		if _, seekErr := tmp.Seek(0, io.SeekStart); seekErr != nil {
			_ = tmp.Close()
			_ = os.Remove(tmpPath)
			result.Errors = append(result.Errors, UploadMultipleErrorEntry{Index: idx, Code: "file_read_failed", Message: "failed to process upload"})
			continue
		}

		uploadResult, uploadErr := h.service.Upload(r.Context(), mediaservice.UploadInput{
			OwnerUserID: actorID,
			ContextType: contextType,
			ContextID:   contextID,
			Filename:    fileHeader.Filename,
			File:        tmp,
			SizeBytes:   sizeBytes,
		})

		_ = tmp.Close()
		_ = os.Remove(tmpPath)

		if uploadErr != nil {
			var validationErr mediaservice.ValidationFailure
			if errors.As(uploadErr, &validationErr) {
				message := "validation failed"
				if len(validationErr.Issues) > 0 {
					message = validationErr.Issues[0].Message
				}
				result.Errors = append(result.Errors, UploadMultipleErrorEntry{Index: idx, Code: "validation_error", Message: message})
				continue
			}
			var appErr *apperrors.AppError
			if errors.As(uploadErr, &appErr) {
				result.Errors = append(result.Errors, UploadMultipleErrorEntry{Index: idx, Code: appErr.Code, Message: appErr.Message})
				continue
			}
			result.Errors = append(result.Errors, UploadMultipleErrorEntry{Index: idx, Code: "upload_failed", Message: "failed to upload file"})
			continue
		}

		result.Items = append(result.Items, UploadMediaResponse{
			ID:          uploadResult.ID,
			ObjectKey:   uploadResult.ObjectKey,
			MimeType:    uploadResult.MimeType,
			SizeBytes:   uploadResult.SizeBytes,
			Width:       uploadResult.Width,
			Height:      uploadResult.Height,
			ContextType: uploadResult.ContextType,
			ContextID:   uploadResult.ContextID,
			State:       uploadResult.State,
		})
	}

	httpx.JSON(w, http.StatusOK, result)
}

func (h *Handlers) MintURLs(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[MintURLsRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	items := make([]mediaservice.MintURLItemInput, 0, len(req.Items))
	for _, item := range req.Items {
		items = append(items, mediaservice.MintURLItemInput{
			MediaID: item.MediaID,
			Preset:  item.Preset,
			Width:   item.Width,
			Format:  item.Format,
			Quality: item.Quality,
		})
	}

	result, err := h.service.MintURLs(r.Context(), mediaservice.MintURLsInput{
		ViewerUserID: actorID,
		Items:        items,
	})
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	responseItems := make([]MintURLItem, 0, len(result.Items))
	for _, item := range result.Items {
		responseItems = append(responseItems, MintURLItem{
			MediaID:   item.MediaID,
			URL:       item.URL,
			ExpiresAt: item.ExpiresAt,
		})
	}

	errorsOut := make([]MintURLErrorItem, 0, len(result.Errors))
	for _, item := range result.Errors {
		errorsOut = append(errorsOut, MintURLErrorItem{
			MediaID: item.MediaID,
			Code:    item.Code,
			Message: item.Message,
		})
	}

	httpx.JSON(w, http.StatusOK, MintURLsResponse{
		Items:  responseItems,
		Errors: errorsOut,
	})
}

func (h *Handlers) CreatePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[CreateMediaPostRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	items := make([]mediaservice.CreateMediaPostItemInput, 0, len(req.Items))
	for _, item := range req.Items {
		items = append(items, mediaservice.CreateMediaPostItemInput{
			MediaObjectID: item.MediaObjectID,
			Type:          item.Type,
			StorageKey:    item.StorageKey,
			MimeType:      item.MimeType,
			Width:         item.Width,
			Height:        item.Height,
			DurationMs:    item.DurationMs,
			Caption:       item.Caption,
			DiveSiteID:    item.DiveSiteID,
			SortOrder:     item.SortOrder,
		})
	}

	source := ""
	if req.Source != nil {
		source = strings.TrimSpace(*req.Source)
	}
	result, err := h.service.CreateMediaPost(r.Context(), mediaservice.CreateMediaPostInput{
		ActorID:           actorID,
		DiveSiteID:        req.DiveSiteID,
		PostCaption:       req.PostCaption,
		ApplyCaptionToAll: req.ApplyCaptionToAll,
		Source:            source,
		Items:             items,
	})
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, CreateMediaPostResponse{
		Post: MediaPostDTO{
			ID:              result.Post.ID,
			AuthorAppUserID: result.Post.AuthorAppUserID,
			UploadGroupID:   result.Post.UploadGroupID,
			DiveSiteID:      result.Post.DiveSiteID,
			PostCaption:     result.Post.PostCaption,
			LikeCount:       result.Post.LikeCount,
			CommentCount:    result.Post.CommentCount,
			ViewerHasLiked:  result.Post.ViewerHasLiked,
			ViewerHasSaved:  result.Post.ViewerHasSaved,
			CreatedAt:       result.Post.CreatedAt.Format(time.RFC3339),
			UpdatedAt:       result.Post.UpdatedAt.Format(time.RFC3339),
		},
		Items: mapProfileMediaDTOs(result.Items),
	})
}

func (h *Handlers) ListProfileMedia(w http.ResponseWriter, r *http.Request) {
	limit := int32(24)
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, parseErr := strconv.ParseInt(raw, 10, 32)
		if parseErr != nil || parsed <= 0 {
			httpx.WriteValidationError(w, []validatex.Issue{{Path: []any{"limit"}, Code: "custom", Message: "limit must be a positive integer"}})
			return
		}
		limit = int32(parsed)
	}

	result, err := h.service.ListProfileMedia(r.Context(), mediaservice.ListProfileMediaInput{
		Username:     chi.URLParam(r, "username"),
		ViewerUserID: actorIDIfPresent(r),
		Cursor:       strings.TrimSpace(r.URL.Query().Get("cursor")),
		Limit:        limit,
	})
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusOK, ProfileMediaListResponse{
		Items:      mapProfileMediaDTOs(result.Items),
		NextCursor: result.NextCursor,
	})
}

func (h *Handlers) LikePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.LikeMediaPost(r.Context(), actorID, postID)
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, LikeStateResponse{
		PostID:         result.PostID,
		LikeCount:      result.LikeCount,
		ViewerHasLiked: result.ViewerHasLiked,
	})
}

func (h *Handlers) UnlikePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.UnlikeMediaPost(r.Context(), actorID, postID)
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, LikeStateResponse{
		PostID:         result.PostID,
		LikeCount:      result.LikeCount,
		ViewerHasLiked: result.ViewerHasLiked,
	})
}

func (h *Handlers) SavePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.SaveMediaPost(r.Context(), actorID, postID)
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, SaveStateResponse{
		PostID:         result.PostID,
		ViewerHasSaved: result.ViewerHasSaved,
	})
}

func (h *Handlers) UnsavePost(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.UnsaveMediaPost(r.Context(), actorID, postID)
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, SaveStateResponse{
		PostID:         result.PostID,
		ViewerHasSaved: result.ViewerHasSaved,
	})
}

func (h *Handlers) GetPost(w http.ResponseWriter, r *http.Request) {
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.GetMediaPostDetail(r.Context(), postID, actorIDIfPresent(r))
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, MediaPostDetailResponse{
		Post: mapMediaPostDetailDTO(result),
	})
}

func (h *Handlers) ListPostComments(w http.ResponseWriter, r *http.Request) {
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	limit := int32(20)
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, parseErr := strconv.ParseInt(raw, 10, 32)
		if parseErr != nil || parsed <= 0 {
			httpx.WriteValidationError(w, []validatex.Issue{{Path: []any{"limit"}, Code: "custom", Message: "limit must be a positive integer"}})
			return
		}
		limit = int32(parsed)
	}
	result, err := h.service.ListMediaPostComments(r.Context(), mediaservice.ListMediaPostCommentsInput{
		PostID:       postID,
		ViewerUserID: actorIDIfPresent(r),
		Cursor:       strings.TrimSpace(r.URL.Query().Get("cursor")),
		Limit:        limit,
	})
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, MediaPostCommentListResponse{
		Items:      mapMediaPostCommentDTOs(result.Items),
		NextCursor: result.NextCursor,
	})
}

func (h *Handlers) CreatePostComment(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateMediaPostCommentRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.CreateMediaPostComment(r.Context(), mediaservice.CreateMediaPostCommentInput{
		PostID:  postID,
		ActorID: actorID,
		Body:    req.Body,
	})
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusCreated, mapMediaPostCommentDTO(result))
}

func (h *Handlers) DeletePostComment(w http.ResponseWriter, r *http.Request) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil))
		return
	}
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	commentID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "commentId"), "commentId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	if err := h.service.DeleteMediaPostComment(r.Context(), mediaservice.DeleteMediaPostCommentInput{
		PostID:    postID,
		CommentID: commentID,
		ActorID:   identity.UserID,
		ActorRole: identity.GlobalRole,
	}); err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) LikePostComment(w http.ResponseWriter, r *http.Request) {
	h.setPostCommentLike(w, r, true)
}

func (h *Handlers) UnlikePostComment(w http.ResponseWriter, r *http.Request) {
	h.setPostCommentLike(w, r, false)
}

func (h *Handlers) setPostCommentLike(w http.ResponseWriter, r *http.Request, liked bool) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	postID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "postId"), "postId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	commentID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "commentId"), "commentId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	var result mediaservice.CommentLikeStateResult
	if liked {
		result, err = h.service.LikeMediaPostComment(r.Context(), actorID, postID, commentID)
	} else {
		result, err = h.service.UnlikeMediaPostComment(r.Context(), actorID, postID, commentID)
	}
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	httpx.JSON(w, http.StatusOK, CommentLikeStateResponse{
		CommentID:      result.CommentID,
		LikeCount:      result.LikeCount,
		ViewerHasLiked: result.ViewerHasLiked,
	})
}

func (h *Handlers) ListMine(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	limit := int32(20)
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, parseErr := strconv.ParseInt(raw, 10, 32)
		if parseErr != nil || parsed <= 0 {
			httpx.WriteValidationError(w, []validatex.Issue{{Path: []any{"limit"}, Code: "custom", Message: "limit must be a positive integer"}})
			return
		}
		limit = int32(parsed)
	}

	cursor := strings.TrimSpace(r.URL.Query().Get("cursor"))
	var contextType *string
	if raw := strings.TrimSpace(r.URL.Query().Get("contextType")); raw != "" {
		contextType = &raw
	}
	var contextID *string
	if raw := strings.TrimSpace(r.URL.Query().Get("contextId")); raw != "" {
		contextID = &raw
	}

	result, err := h.service.ListMedia(r.Context(), mediaservice.ListMediaInput{
		OwnerUserID: actorID,
		ContextType: contextType,
		ContextID:   contextID,
		Limit:       limit,
		Cursor:      cursor,
	})
	if err != nil {
		var validationErr mediaservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	items := make([]UploadMediaResponse, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, UploadMediaResponse{
			ID:          item.ID,
			ObjectKey:   item.ObjectKey,
			MimeType:    item.MimeType,
			SizeBytes:   item.SizeBytes,
			Width:       item.Width,
			Height:      item.Height,
			ContextType: item.ContextType,
			ContextID:   item.ContextID,
			State:       item.State,
		})
	}

	httpx.JSON(w, http.StatusOK, ListMediaResponse{
		Items:      items,
		NextCursor: result.NextCursor,
	})
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

func mapProfileMediaDTOs(items []mediaservice.ProfileMediaItemResult) []ProfileMediaDTO {
	result := make([]ProfileMediaDTO, 0, len(items))
	for _, item := range items {
		result = append(result, ProfileMediaDTO{
			ID:              item.ID,
			MediaObjectID:   item.MediaObjectID,
			PostID:          item.PostID,
			PostCaption:     item.PostCaption,
			UploadGroupID:   item.UploadGroupID,
			AuthorAppUserID: item.AuthorAppUserID,
			Type:            item.Type,
			StorageKey:      item.StorageKey,
			MimeType:        item.MimeType,
			Width:           item.Width,
			Height:          item.Height,
			DurationMs:      item.DurationMs,
			Caption:         item.Caption,
			DiveSite: ProfileMediaSiteDTO{
				ID:   item.DiveSiteID,
				Slug: item.DiveSiteSlug,
				Name: item.DiveSiteName,
				Area: item.DiveSiteArea,
			},
			SortOrder:      item.SortOrder,
			Status:         item.Status,
			LikeCount:      item.LikeCount,
			CommentCount:   item.CommentCount,
			ViewerHasLiked: item.ViewerHasLiked,
			ViewerHasSaved: item.ViewerHasSaved,
			CreatedAt:      item.CreatedAt.Format(time.RFC3339),
		})
	}
	return result
}

func mapMediaPostDetailDTO(result mediaservice.MediaPostDetailResult) MediaPostDetailDTO {
	return MediaPostDetailDTO{
		Post: MediaPostDTO{
			ID:              result.Post.ID,
			AuthorAppUserID: result.Post.AuthorAppUserID,
			UploadGroupID:   result.Post.UploadGroupID,
			DiveSiteID:      result.Post.DiveSiteID,
			PostCaption:     result.Post.PostCaption,
			LikeCount:       result.Post.LikeCount,
			CommentCount:    result.Post.CommentCount,
			ViewerHasLiked:  result.Post.ViewerHasLiked,
			ViewerHasSaved:  result.Post.ViewerHasSaved,
			CreatedAt:       result.Post.CreatedAt.Format(time.RFC3339),
			UpdatedAt:       result.Post.UpdatedAt.Format(time.RFC3339),
		},
		Author: MediaPostAuthorDTO{
			ID:          result.Author.ID,
			Username:    result.Author.Username,
			DisplayName: result.Author.DisplayName,
			AvatarURL:   mediaurl.MaterializeWithDefault(result.Author.AvatarURL),
		},
		Items: mapProfileMediaDTOs(result.Items),
	}
}

func mapMediaPostCommentDTOs(items []mediaservice.MediaPostCommentResult) []MediaPostCommentDTO {
	result := make([]MediaPostCommentDTO, 0, len(items))
	for _, item := range items {
		result = append(result, mapMediaPostCommentDTO(item))
	}
	return result
}

func mapMediaPostCommentDTO(item mediaservice.MediaPostCommentResult) MediaPostCommentDTO {
	return MediaPostCommentDTO{
		ID:     item.ID,
		PostID: item.PostID,
		Author: MediaPostCommentAuthorDTO{
			ID:          item.Author.ID,
			Username:    item.Author.Username,
			DisplayName: item.Author.DisplayName,
			AvatarURL:   mediaurl.MaterializeWithDefault(item.Author.AvatarURL),
		},
		Body:           item.Body,
		LikeCount:      item.LikeCount,
		ViewerHasLiked: item.ViewerHasLiked,
		CreatedAt:      item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      item.UpdatedAt.Format(time.RFC3339),
	}
}
