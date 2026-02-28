package http

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	buddyfinderrepo "fphgo/internal/features/buddyfinder/repo"
	buddyfinderservice "fphgo/internal/features/buddyfinder/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/pagination"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   buddyFinderService
	validator httpx.Validator
}

type buddyFinderService interface {
	Preview(ctx context.Context, area string) (buddyfinderservice.PreviewResult, error)
	GetSharePreview(ctx context.Context, intentID string) (buddyfinderservice.SharePreviewResult, error)
	ListMemberIntents(ctx context.Context, input buddyfinderservice.ListMemberIntentsInput) (buddyfinderservice.ListMemberIntentsResult, error)
	CreateIntent(ctx context.Context, input buddyfinderservice.CreateIntentInput) (buddyfinderrepo.Intent, error)
	DeleteIntent(ctx context.Context, actorID, intentID string) error
	MessageEntry(ctx context.Context, actorID, intentID string) (buddyfinderservice.MessageEntryResult, error)
}

func New(service buddyFinderService, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) Preview(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.Preview(r.Context(), r.URL.Query().Get("area"))
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	items := make([]PreviewIntent, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, PreviewIntent{
			ID:                 item.ID,
			DiveSiteID:         item.DiveSiteID,
			Area:               item.Area,
			IntentType:         item.IntentType,
			TimeWindow:         item.TimeWindow,
			DateStart:          formatDate(item.DateStart),
			DateEnd:            formatDate(item.DateEnd),
			NotePreview:        redactNote(item.Note),
			CreatedAt:          item.CreatedAt.Format(time.RFC3339),
			EmailVerified:      item.EmailVerified,
			PhoneVerified:      item.PhoneVerified,
			CertLevel:          item.CertLevel,
			BuddyCount:         item.BuddyCount,
			ReportCount:        item.ReportCount,
			MutualBuddiesCount: item.MutualBuddiesCount,
		})
	}
	httpx.JSON(w, http.StatusOK, PreviewResponse{Area: result.Area, Count: result.Count, Items: items})
}

func (h *Handlers) SharePreview(w http.ResponseWriter, r *http.Request) {
	intentID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, err := h.service.GetSharePreview(r.Context(), intentID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, SharePreviewResponse{
		Intent: SharePreviewIntent{
			ID:            result.Intent.ID,
			DiveSiteID:    result.Intent.DiveSiteID,
			DiveSiteName:  result.Intent.DiveSiteName,
			Area:          result.Intent.Area,
			IntentType:    result.Intent.IntentType,
			TimeWindow:    result.Intent.TimeWindow,
			DateStart:     formatDate(result.Intent.DateStart),
			DateEnd:       formatDate(result.Intent.DateEnd),
			NotePreview:   redactNote(result.Intent.Note),
			CreatedAt:     result.Intent.CreatedAt.Format(time.RFC3339),
			EmailVerified: result.Intent.EmailVerified,
			PhoneVerified: result.Intent.PhoneVerified,
			CertLevel:     result.Intent.CertLevel,
			BuddyCount:    result.Intent.BuddyCount,
			ReportCount:   result.Intent.ReportCount,
		},
	})
}

func (h *Handlers) ListIntents(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	limit, parseErr := pagination.ParseLimit(r.URL.Query().Get("limit"), pagination.DefaultLimit, pagination.MaxLimit)
	if parseErr != nil {
		httpx.WriteValidationError(w, issue("limit", "custom", "limit must be a positive integer"))
		return
	}
	result, svcErr := h.service.ListMemberIntents(r.Context(), buddyfinderservice.ListMemberIntentsInput{
		ViewerUserID: actorID,
		Area:         r.URL.Query().Get("area"),
		IntentType:   r.URL.Query().Get("intentType"),
		TimeWindow:   r.URL.Query().Get("timeWindow"),
		Cursor:       r.URL.Query().Get("cursor"),
		Limit:        limit,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	items := make([]MemberIntent, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapMemberIntent(item))
	}
	httpx.JSON(w, http.StatusOK, ListMemberIntentsResponse{Items: items, NextCursor: result.NextCursor})
}

func (h *Handlers) CreateIntent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateIntentRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	dateStart, err := parseDate(req.DateStart)
	if err != nil {
		httpx.WriteValidationError(w, issue("dateStart", "invalid_datetime", "Must be a valid YYYY-MM-DD date"))
		return
	}
	dateEnd, err := parseDate(req.DateEnd)
	if err != nil {
		httpx.WriteValidationError(w, issue("dateEnd", "invalid_datetime", "Must be a valid YYYY-MM-DD date"))
		return
	}
	intent, svcErr := h.service.CreateIntent(r.Context(), buddyfinderservice.CreateIntentInput{
		ActorID:    actorID,
		DiveSiteID: req.DiveSiteID,
		Area:       req.Area,
		IntentType: req.IntentType,
		TimeWindow: req.TimeWindow,
		DateStart:  dateStart,
		DateEnd:    dateEnd,
		Note:       req.Note,
	})
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusCreated, IntentResponse{Intent: Intent{
		ID:         intent.ID,
		DiveSiteID: intent.DiveSiteID,
		Area:       intent.Area,
		IntentType: intent.IntentType,
		TimeWindow: intent.TimeWindow,
		DateStart:  formatDate(intent.DateStart),
		DateEnd:    formatDate(intent.DateEnd),
		Note:       intent.Note,
		CreatedAt:  intent.CreatedAt.Format(time.RFC3339),
		ExpiresAt:  intent.ExpiresAt.Format(time.RFC3339),
	}})
}

func (h *Handlers) DeleteIntent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	intentID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	if err := h.service.DeleteIntent(r.Context(), actorID, intentID); err != nil {
		h.writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) MessageEntry(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	intentID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "id"), "id")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	result, svcErr := h.service.MessageEntry(r.Context(), actorID, intentID)
	if svcErr != nil {
		h.writeError(w, r, svcErr)
		return
	}
	httpx.JSON(w, http.StatusOK, MessageEntryResponse{
		IntentID:        result.IntentID,
		RecipientUserID: result.RecipientUserID,
		RequiresRequest: result.RequiresRequest,
	})
}

func (h *Handlers) writeError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr buddyfinderservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func mapMemberIntent(input buddyfinderrepo.MemberIntent) MemberIntent {
	return MemberIntent{
		ID:                 input.ID,
		AuthorAppUserID:    input.AuthorAppUserID,
		DiveSiteID:         input.DiveSiteID,
		Username:           input.Username,
		DisplayName:        input.DisplayName,
		AvatarURL:          input.AvatarURL,
		HomeArea:           input.HomeArea,
		Area:               input.Area,
		IntentType:         input.IntentType,
		TimeWindow:         input.TimeWindow,
		DateStart:          formatDate(input.DateStart),
		DateEnd:            formatDate(input.DateEnd),
		Note:               input.Note,
		CreatedAt:          input.CreatedAt.Format(time.RFC3339),
		ExpiresAt:          input.ExpiresAt.Format(time.RFC3339),
		EmailVerified:      input.EmailVerified,
		PhoneVerified:      input.PhoneVerified,
		CertLevel:          input.CertLevel,
		BuddyCount:         input.BuddyCount,
		ReportCount:        input.ReportCount,
		MutualBuddiesCount: input.MutualBuddiesCount,
	}
}

func formatDate(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format("2006-01-02")
}

func parseDate(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func redactNote(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	return "Sign in to reveal the full note."
}

func issue(path, code, message string) []validatex.Issue {
	return []validatex.Issue{{
		Path:    []any{path},
		Code:    code,
		Message: message,
	}}
}
