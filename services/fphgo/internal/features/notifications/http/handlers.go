package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	notificationsservice "fphgo/internal/features/notifications/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/mediaurl"
	"fphgo/internal/shared/validatex"
)

const (
	defaultLimit = 20
	maxLimit     = 100
)

type Handlers struct {
	service   *notificationsservice.Service
	validator httpx.Validator
}

func New(service *notificationsservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) ListNotifications(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	input, issues, ok := parseListInput(r)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	items, err := h.service.ListMyNotifications(r.Context(), actorID, input)
	if err != nil {
		h.writeError(w, r, err)
		return
	}

	resp := make([]Notification, 0, len(items))
	for _, item := range items {
		resp = append(resp, mapNotification(item))
	}

	httpx.JSON(w, http.StatusOK, ListNotificationsResponse{
		Items: resp,
		Pagination: NotificationsCursor{
			Limit:  input.Limit,
			Offset: input.Offset,
		},
	})
}

func (h *Handlers) GetNotification(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	notificationID, issues, ok := parseNotificationID(chi.URLParam(r, "notificationId"))
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	item, err := h.service.GetMyNotification(r.Context(), actorID, notificationID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapNotification(item))
}

func (h *Handlers) CreateNotification(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	if identity, ok := middleware.CurrentIdentity(r.Context()); !ok || (identity.GlobalRole != "admin" && identity.GlobalRole != "super_admin") {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusForbidden, "forbidden", "client notification creation is restricted", nil))
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateNotificationRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	item, err := h.service.Create(r.Context(), actorID, notificationsservice.CreateInput{
		UserID:            req.UserID,
		Type:              req.Type,
		Category:          req.Category,
		Title:             req.Title,
		Message:           req.Message,
		Priority:          req.Priority,
		RelatedUserID:     req.RelatedUserID,
		RelatedEntityType: req.RelatedEntityType,
		RelatedEntityID:   req.RelatedEntityID,
		ImageURL:          req.ImageURL,
		ActionURL:         req.ActionURL,
		Metadata:          req.Metadata,
	})
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, mapNotification(item))
}

func (h *Handlers) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	notificationID, issues, ok := parseNotificationID(chi.URLParam(r, "notificationId"))
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	item, err := h.service.MarkAsRead(r.Context(), actorID, notificationID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapNotification(item))
}

func (h *Handlers) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	count, err := h.service.MarkAllAsRead(r.Context(), actorID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, MarkAllReadResponse{Count: count})
}

func (h *Handlers) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	notificationID, issues, ok := parseNotificationID(chi.URLParam(r, "notificationId"))
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	if err := h.service.Delete(r.Context(), actorID, notificationID); err != nil {
		h.writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	count, err := h.service.GetUnreadCount(r.Context(), actorID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, UnreadCountResponse{UnreadCount: count})
}

func (h *Handlers) GetStats(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	stats, err := h.service.GetStats(r.Context(), actorID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, NotificationStatsResponse{
		Total:    stats.Total,
		Unread:   stats.Unread,
		Read:     stats.Read,
		Archived: stats.Archived,
	})
}

func (h *Handlers) GetSettings(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	settings, err := h.service.GetSettings(r.Context(), actorID)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapSettings(settings))
}

func (h *Handlers) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdateNotificationSettingsRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	updated, err := h.service.UpdateSettings(r.Context(), actorID, notificationsservice.UpdateSettingsInput{
		EmailEnabled:               req.EmailEnabled,
		PushEnabled:                req.PushEnabled,
		InAppEnabled:               req.InAppEnabled,
		SystemNotifications:        req.SystemNotifications,
		MessageNotifications:       req.MessageNotifications,
		EventNotifications:         req.EventNotifications,
		GroupNotifications:         req.GroupNotifications,
		ServiceNotifications:       req.ServiceNotifications,
		BookingNotifications:       req.BookingNotifications,
		ReviewNotifications:        req.ReviewNotifications,
		MentionNotifications:       req.MentionNotifications,
		LikeNotifications:          req.LikeNotifications,
		CommentNotifications:       req.CommentNotifications,
		FriendRequestNotifications: req.FriendRequestNotifications,
		GroupInviteNotifications:   req.GroupInviteNotifications,
		EventReminderNotifications: req.EventReminderNotifications,
		PaymentNotifications:       req.PaymentNotifications,
		SecurityNotifications:      req.SecurityNotifications,
		NewDiveSitePublished:       req.NewDiveSitePublished,
		ChikaReplies:               req.ChikaReplies,
		DigestFrequency:            req.DigestFrequency,
		QuietHoursStart:            req.QuietHoursStart,
		QuietHoursEnd:              req.QuietHoursEnd,
		Timezone:                   req.Timezone,
	})
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapSettings(updated))
}

func (h *Handlers) ListOutbox(w http.ResponseWriter, r *http.Request) {
	input, issues, ok := parseOutboxListInput(r)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	items, err := h.service.ListOutbox(r.Context(), input)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	resp := make([]NotificationOutboxItem, 0, len(items))
	for _, item := range items {
		resp = append(resp, mapOutboxItem(item))
	}
	httpx.JSON(w, http.StatusOK, ListNotificationOutboxResponse{
		Items: resp,
		Pagination: NotificationsCursor{
			Limit:  input.Limit,
			Offset: input.Offset,
		},
	})
}

func (h *Handlers) RetryOutbox(w http.ResponseWriter, r *http.Request) {
	id, issues, ok := parseOutboxID(chi.URLParam(r, "outboxId"))
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.RetryOutbox(r.Context(), id)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapOutboxItem(item))
}

func parseNotificationID(raw string) (int64, []validatex.Issue, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0, []validatex.Issue{{
			Path:    []any{"notificationId"},
			Code:    "required",
			Message: "This field is required",
		}}, false
	}
	id, err := strconv.ParseInt(value, 10, 64)
	if err != nil || id <= 0 {
		return 0, []validatex.Issue{{
			Path:    []any{"notificationId"},
			Code:    "custom",
			Message: "notificationId must be a positive integer",
		}}, false
	}
	return id, nil, true
}

func parseOutboxID(raw string) (string, []validatex.Issue, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", []validatex.Issue{{
			Path:    []any{"outboxId"},
			Code:    "required",
			Message: "This field is required",
		}}, false
	}
	return value, nil, true
}

func parseListInput(r *http.Request) (notificationsservice.ListInput, []validatex.Issue, bool) {
	query := r.URL.Query()
	issues := []validatex.Issue{}

	limit := defaultLimit
	if rawLimit := strings.TrimSpace(query.Get("limit")); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed < 1 || parsed > maxLimit {
			issues = append(issues, validatex.Issue{
				Path:    []any{"limit"},
				Code:    "custom",
				Message: "limit must be between 1 and 100",
			})
		} else {
			limit = parsed
		}
	}

	offset := 0
	if rawOffset := strings.TrimSpace(query.Get("offset")); rawOffset != "" {
		parsed, err := strconv.Atoi(rawOffset)
		if err != nil || parsed < 0 {
			issues = append(issues, validatex.Issue{
				Path:    []any{"offset"},
				Code:    "custom",
				Message: "offset must be 0 or greater",
			})
		} else {
			offset = parsed
		}
	}

	var status *string
	if raw := strings.TrimSpace(query.Get("status")); raw != "" {
		status = &raw
	}
	var typ *string
	if raw := strings.TrimSpace(query.Get("type")); raw != "" {
		typ = &raw
	}
	var priority *string
	if raw := strings.TrimSpace(query.Get("priority")); raw != "" {
		priority = &raw
	}

	if len(issues) > 0 {
		return notificationsservice.ListInput{}, issues, false
	}
	return notificationsservice.ListInput{
		Limit:    limit,
		Offset:   offset,
		Status:   status,
		Type:     typ,
		Priority: priority,
	}, nil, true
}

func parseOutboxListInput(r *http.Request) (notificationsservice.OutboxListInput, []validatex.Issue, bool) {
	query := r.URL.Query()
	issues := []validatex.Issue{}

	limit := 50
	if rawLimit := strings.TrimSpace(query.Get("limit")); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed < 1 || parsed > maxLimit {
			issues = append(issues, validatex.Issue{
				Path:    []any{"limit"},
				Code:    "custom",
				Message: "limit must be between 1 and 100",
			})
		} else {
			limit = parsed
		}
	}

	offset := 0
	if rawOffset := strings.TrimSpace(query.Get("offset")); rawOffset != "" {
		parsed, err := strconv.Atoi(rawOffset)
		if err != nil || parsed < 0 {
			issues = append(issues, validatex.Issue{
				Path:    []any{"offset"},
				Code:    "custom",
				Message: "offset must be 0 or greater",
			})
		} else {
			offset = parsed
		}
	}

	var status *string
	if raw := strings.TrimSpace(query.Get("status")); raw != "" {
		status = &raw
	}

	if len(issues) > 0 {
		return notificationsservice.OutboxListInput{}, issues, false
	}
	return notificationsservice.OutboxListInput{
		Status: status,
		Limit:  limit,
		Offset: offset,
	}, nil, true
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func mapNotification(input notificationsservice.Notification) Notification {
	var imageURL *string
	if input.ImageURL != nil {
		value := mediaurl.MaterializeWithDefault(*input.ImageURL)
		imageURL = &value
	}
	return Notification{
		ID:                input.ID,
		UserID:            input.UserID,
		Type:              input.Type,
		Category:          input.Category,
		Title:             input.Title,
		Message:           input.Message,
		Status:            input.Status,
		Priority:          input.Priority,
		ActorUserID:       input.ActorUserID,
		RelatedUserID:     input.RelatedUserID,
		RelatedEntityType: input.RelatedEntityType,
		RelatedEntityID:   input.RelatedEntityID,
		ImageURL:          imageURL,
		ActionURL:         input.ActionURL,
		Metadata:          input.Metadata,
		IsEmailSent:       input.IsEmailSent,
		IsPushSent:        input.IsPushSent,
		EmailSentAt:       formatTimePtr(input.EmailSentAt),
		PushSentAt:        formatTimePtr(input.PushSentAt),
		ReadAt:            formatTimePtr(input.ReadAt),
		SeenAt:            formatTimePtr(input.SeenAt),
		ArchivedAt:        formatTimePtr(input.ArchivedAt),
		IdempotencyKey:    input.IdempotencyKey,
		CreatedAt:         input.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:         input.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func mapOutboxItem(input notificationsservice.OutboxItem) NotificationOutboxItem {
	return NotificationOutboxItem{
		ID:             input.ID,
		EventType:      input.EventType,
		AggregateType:  input.AggregateType,
		AggregateID:    input.AggregateID,
		Status:         input.Status,
		Attempts:       input.Attempts,
		NextRetryAt:    input.NextRetryAt.UTC().Format(time.RFC3339),
		LastError:      input.LastError,
		IdempotencyKey: input.IdempotencyKey,
		Summary:        input.Summary,
		CreatedAt:      input.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:      input.UpdatedAt.UTC().Format(time.RFC3339),
		ProcessedAt:    formatTimePtr(input.ProcessedAt),
	}
}

func mapSettings(input notificationsservice.NotificationSettings) NotificationSettings {
	return NotificationSettings{
		ID:                         input.ID,
		UserID:                     input.UserID,
		EmailEnabled:               input.EmailEnabled,
		PushEnabled:                input.PushEnabled,
		InAppEnabled:               input.InAppEnabled,
		SystemNotifications:        input.SystemNotifications,
		MessageNotifications:       input.MessageNotifications,
		EventNotifications:         input.EventNotifications,
		GroupNotifications:         input.GroupNotifications,
		ServiceNotifications:       input.ServiceNotifications,
		BookingNotifications:       input.BookingNotifications,
		ReviewNotifications:        input.ReviewNotifications,
		MentionNotifications:       input.MentionNotifications,
		LikeNotifications:          input.LikeNotifications,
		CommentNotifications:       input.CommentNotifications,
		FriendRequestNotifications: input.FriendRequestNotifications,
		GroupInviteNotifications:   input.GroupInviteNotifications,
		EventReminderNotifications: input.EventReminderNotifications,
		PaymentNotifications:       input.PaymentNotifications,
		SecurityNotifications:      input.SecurityNotifications,
		NewDiveSitePublished:       input.NewDiveSitePublished,
		ChikaReplies:               input.ChikaReplies,
		DigestFrequency:            input.DigestFrequency,
		QuietHoursStart:            input.QuietHoursStart,
		QuietHoursEnd:              input.QuietHoursEnd,
		Timezone:                   input.Timezone,
		CreatedAt:                  input.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:                  input.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func formatTimePtr(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format(time.RFC3339)
	return &formatted
}

func (h *Handlers) writeError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr notificationsservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}
