package http

import (
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	mediaservice "fphgo/internal/features/media/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
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

	result, err := h.service.MintURLs(r.Context(), mediaservice.MintURLsInput{Items: items})
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
