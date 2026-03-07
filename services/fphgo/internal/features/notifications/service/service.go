package service

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	notificationsrepo "fphgo/internal/features/notifications/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo repository
}

type repository interface {
	Create(ctx context.Context, input notificationsrepo.CreateInput) (notificationsrepo.Notification, error)
	ListByUser(ctx context.Context, input notificationsrepo.ListInput) ([]notificationsrepo.Notification, error)
	GetByIDForUser(ctx context.Context, userID string, notificationID int64) (notificationsrepo.Notification, error)
	MarkReadForUser(ctx context.Context, userID string, notificationID int64) (notificationsrepo.Notification, error)
	MarkAllReadForUser(ctx context.Context, userID string) (int64, error)
	DeleteForUser(ctx context.Context, userID string, notificationID int64) error
	CountByStatusForUser(ctx context.Context, userID string, status string) (int64, error)
	CountVisibleForUser(ctx context.Context, userID string) (int64, error)
	GetSettingsForUser(ctx context.Context, userID string) (notificationsrepo.NotificationSettings, error)
	CreateDefaultSettingsForUser(ctx context.Context, userID string) (notificationsrepo.NotificationSettings, error)
	UpdateSettingsForUser(ctx context.Context, userID string, input notificationsrepo.SettingsUpdateInput) (notificationsrepo.NotificationSettings, error)
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type Notification struct {
	ID                int64
	UserID            string
	Type              string
	Title             string
	Message           string
	Status            string
	Priority          string
	RelatedUserID     *string
	RelatedEntityType *string
	RelatedEntityID   *string
	ImageURL          *string
	ActionURL         *string
	Metadata          map[string]any
	IsEmailSent       bool
	IsPushSent        bool
	EmailSentAt       *time.Time
	PushSentAt        *time.Time
	ReadAt            *time.Time
	ArchivedAt        *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type NotificationSettings struct {
	ID                         string
	UserID                     string
	EmailEnabled               bool
	PushEnabled                bool
	InAppEnabled               bool
	SystemNotifications        bool
	MessageNotifications       bool
	EventNotifications         bool
	GroupNotifications         bool
	ServiceNotifications       bool
	BookingNotifications       bool
	ReviewNotifications        bool
	MentionNotifications       bool
	LikeNotifications          bool
	CommentNotifications       bool
	FriendRequestNotifications bool
	GroupInviteNotifications   bool
	EventReminderNotifications bool
	PaymentNotifications       bool
	SecurityNotifications      bool
	DigestFrequency            string
	QuietHoursStart            *string
	QuietHoursEnd              *string
	Timezone                   string
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
}

type Stats struct {
	Total    int64
	Unread   int64
	Read     int64
	Archived int64
}

type CreateInput struct {
	UserID            string
	Type              string
	Title             string
	Message           string
	Priority          string
	RelatedUserID     *string
	RelatedEntityType *string
	RelatedEntityID   *string
	ImageURL          *string
	ActionURL         *string
	Metadata          map[string]any
}

type ListInput struct {
	Limit    int
	Offset   int
	Status   *string
	Type     *string
	Priority *string
}

type UpdateSettingsInput = notificationsrepo.SettingsUpdateInput

var (
	allowedTypes = toSet(
		"SYSTEM", "MESSAGE", "EVENT", "GROUP", "SERVICE",
		"BOOKING", "REVIEW", "MENTION", "LIKE", "COMMENT",
		"FRIEND_REQUEST", "GROUP_INVITE", "EVENT_REMINDER", "PAYMENT", "SECURITY",
	)
	allowedStatus          = toSet("UNREAD", "READ", "ARCHIVED", "DELETED")
	allowedPriority        = toSet("LOW", "NORMAL", "HIGH", "URGENT")
	allowedDigestFrequency = toSet("IMMEDIATE", "DAILY", "WEEKLY", "NEVER")
)

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, actorUserID string, input CreateInput) (Notification, error) {
	if err := validateActorID(actorUserID); err != nil {
		return Notification{}, err
	}
	issues := validateCreateInput(input)
	if len(issues) > 0 {
		return Notification{}, ValidationFailure{Issues: issues}
	}

	created, err := s.repo.Create(ctx, notificationsrepo.CreateInput{
		UserID:            input.UserID,
		Type:              strings.TrimSpace(input.Type),
		Title:             strings.TrimSpace(input.Title),
		Message:           strings.TrimSpace(input.Message),
		Priority:          normalizePriority(input.Priority),
		RelatedUserID:     input.RelatedUserID,
		RelatedEntityType: trimPtr(input.RelatedEntityType),
		RelatedEntityID:   trimPtr(input.RelatedEntityID),
		ImageURL:          trimPtr(input.ImageURL),
		ActionURL:         trimPtr(input.ActionURL),
		Metadata:          input.Metadata,
	})
	if err != nil {
		return Notification{}, apperrors.New(http.StatusInternalServerError, "notification_create_failed", "failed to create notification", err)
	}
	return mapNotification(created), nil
}

func (s *Service) ListMyNotifications(ctx context.Context, actorUserID string, input ListInput) ([]Notification, error) {
	if err := validateActorID(actorUserID); err != nil {
		return nil, err
	}
	issues := validateListInput(input)
	if len(issues) > 0 {
		return nil, ValidationFailure{Issues: issues}
	}

	items, err := s.repo.ListByUser(ctx, notificationsrepo.ListInput{
		UserID:   actorUserID,
		Limit:    input.Limit,
		Offset:   input.Offset,
		Status:   normalizeEnumPtr(input.Status),
		Type:     normalizeEnumPtr(input.Type),
		Priority: normalizeEnumPtr(input.Priority),
	})
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "notifications_list_failed", "failed to list notifications", err)
	}

	result := make([]Notification, 0, len(items))
	for _, item := range items {
		result = append(result, mapNotification(item))
	}
	return result, nil
}

func (s *Service) GetMyNotification(ctx context.Context, actorUserID string, notificationID int64) (Notification, error) {
	if err := validateActorID(actorUserID); err != nil {
		return Notification{}, err
	}
	item, err := s.repo.GetByIDForUser(ctx, actorUserID, notificationID)
	if err != nil {
		if notificationsrepo.IsNoRows(err) {
			return Notification{}, apperrors.New(http.StatusNotFound, "not_found", "notification not found", err)
		}
		return Notification{}, apperrors.New(http.StatusInternalServerError, "notification_get_failed", "failed to load notification", err)
	}
	return mapNotification(item), nil
}

func (s *Service) MarkAsRead(ctx context.Context, actorUserID string, notificationID int64) (Notification, error) {
	if err := validateActorID(actorUserID); err != nil {
		return Notification{}, err
	}
	item, err := s.repo.MarkReadForUser(ctx, actorUserID, notificationID)
	if err != nil {
		if notificationsrepo.IsNoRows(err) {
			return Notification{}, apperrors.New(http.StatusNotFound, "not_found", "notification not found", err)
		}
		return Notification{}, apperrors.New(http.StatusInternalServerError, "notification_mark_read_failed", "failed to mark notification as read", err)
	}
	return mapNotification(item), nil
}

func (s *Service) MarkAllAsRead(ctx context.Context, actorUserID string) (int64, error) {
	if err := validateActorID(actorUserID); err != nil {
		return 0, err
	}
	count, err := s.repo.MarkAllReadForUser(ctx, actorUserID)
	if err != nil {
		return 0, apperrors.New(http.StatusInternalServerError, "notifications_mark_all_read_failed", "failed to mark notifications as read", err)
	}
	return count, nil
}

func (s *Service) Delete(ctx context.Context, actorUserID string, notificationID int64) error {
	if err := validateActorID(actorUserID); err != nil {
		return err
	}
	if err := s.repo.DeleteForUser(ctx, actorUserID, notificationID); err != nil {
		if notificationsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "not_found", "notification not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "notification_delete_failed", "failed to delete notification", err)
	}
	return nil
}

func (s *Service) GetUnreadCount(ctx context.Context, actorUserID string) (int64, error) {
	if err := validateActorID(actorUserID); err != nil {
		return 0, err
	}
	count, err := s.repo.CountByStatusForUser(ctx, actorUserID, "UNREAD")
	if err != nil {
		return 0, apperrors.New(http.StatusInternalServerError, "notifications_unread_count_failed", "failed to load unread count", err)
	}
	return count, nil
}

func (s *Service) GetStats(ctx context.Context, actorUserID string) (Stats, error) {
	if err := validateActorID(actorUserID); err != nil {
		return Stats{}, err
	}

	total, err := s.repo.CountVisibleForUser(ctx, actorUserID)
	if err != nil {
		return Stats{}, apperrors.New(http.StatusInternalServerError, "notifications_stats_failed", "failed to load notification stats", err)
	}
	unread, err := s.repo.CountByStatusForUser(ctx, actorUserID, "UNREAD")
	if err != nil {
		return Stats{}, apperrors.New(http.StatusInternalServerError, "notifications_stats_failed", "failed to load notification stats", err)
	}
	read, err := s.repo.CountByStatusForUser(ctx, actorUserID, "READ")
	if err != nil {
		return Stats{}, apperrors.New(http.StatusInternalServerError, "notifications_stats_failed", "failed to load notification stats", err)
	}
	archived, err := s.repo.CountByStatusForUser(ctx, actorUserID, "ARCHIVED")
	if err != nil {
		return Stats{}, apperrors.New(http.StatusInternalServerError, "notifications_stats_failed", "failed to load notification stats", err)
	}

	return Stats{
		Total:    total,
		Unread:   unread,
		Read:     read,
		Archived: archived,
	}, nil
}

func (s *Service) GetSettings(ctx context.Context, actorUserID string) (NotificationSettings, error) {
	if err := validateActorID(actorUserID); err != nil {
		return NotificationSettings{}, err
	}
	settings, err := s.repo.GetSettingsForUser(ctx, actorUserID)
	if err != nil {
		if notificationsrepo.IsNoRows(err) {
			created, createErr := s.repo.CreateDefaultSettingsForUser(ctx, actorUserID)
			if createErr != nil {
				return NotificationSettings{}, apperrors.New(http.StatusInternalServerError, "notification_settings_create_failed", "failed to initialize notification settings", createErr)
			}
			return mapSettings(created), nil
		}
		return NotificationSettings{}, apperrors.New(http.StatusInternalServerError, "notification_settings_get_failed", "failed to load notification settings", err)
	}
	return mapSettings(settings), nil
}

func (s *Service) UpdateSettings(ctx context.Context, actorUserID string, input UpdateSettingsInput) (NotificationSettings, error) {
	if err := validateActorID(actorUserID); err != nil {
		return NotificationSettings{}, err
	}
	issues := validateSettingsInput(input)
	if len(issues) > 0 {
		return NotificationSettings{}, ValidationFailure{Issues: issues}
	}

	_, err := s.GetSettings(ctx, actorUserID)
	if err != nil {
		return NotificationSettings{}, err
	}

	updated, err := s.repo.UpdateSettingsForUser(ctx, actorUserID, input)
	if err != nil {
		if notificationsrepo.IsNoRows(err) {
			return NotificationSettings{}, apperrors.New(http.StatusNotFound, "not_found", "notification settings not found", err)
		}
		return NotificationSettings{}, apperrors.New(http.StatusInternalServerError, "notification_settings_update_failed", "failed to update notification settings", err)
	}
	return mapSettings(updated), nil
}

func validateActorID(userID string) error {
	if _, err := uuid.Parse(strings.TrimSpace(userID)); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", err)
	}
	return nil
}

func validateCreateInput(input CreateInput) []validatex.Issue {
	issues := []validatex.Issue{}

	if _, err := uuid.Parse(strings.TrimSpace(input.UserID)); err != nil {
		issues = append(issues, validatex.Issue{
			Path:    []any{"userId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		})
	}

	typ := strings.TrimSpace(input.Type)
	if typ == "" {
		issues = append(issues, validatex.Issue{
			Path:    []any{"type"},
			Code:    "required",
			Message: "type is required",
		})
	} else if _, ok := allowedTypes[typ]; !ok {
		issues = append(issues, validatex.Issue{
			Path:    []any{"type"},
			Code:    "invalid_enum",
			Message: "invalid notification type",
		})
	}

	if strings.TrimSpace(input.Title) == "" {
		issues = append(issues, validatex.Issue{
			Path:    []any{"title"},
			Code:    "required",
			Message: "title is required",
		})
	}
	if strings.TrimSpace(input.Message) == "" {
		issues = append(issues, validatex.Issue{
			Path:    []any{"message"},
			Code:    "required",
			Message: "message is required",
		})
	}

	priority := normalizePriority(input.Priority)
	if _, ok := allowedPriority[priority]; !ok {
		issues = append(issues, validatex.Issue{
			Path:    []any{"priority"},
			Code:    "invalid_enum",
			Message: "invalid notification priority",
		})
	}

	if input.RelatedUserID != nil {
		if _, err := uuid.Parse(strings.TrimSpace(*input.RelatedUserID)); err != nil {
			issues = append(issues, validatex.Issue{
				Path:    []any{"relatedUserId"},
				Code:    "invalid_uuid",
				Message: "Must be a valid UUID",
			})
		}
	}

	return issues
}

func validateListInput(input ListInput) []validatex.Issue {
	issues := []validatex.Issue{}
	if input.Limit < 1 || input.Limit > 100 {
		issues = append(issues, validatex.Issue{
			Path:    []any{"limit"},
			Code:    "custom",
			Message: "limit must be between 1 and 100",
		})
	}
	if input.Offset < 0 {
		issues = append(issues, validatex.Issue{
			Path:    []any{"offset"},
			Code:    "custom",
			Message: "offset must be 0 or greater",
		})
	}
	if input.Status != nil {
		value := strings.TrimSpace(*input.Status)
		if _, ok := allowedStatus[value]; !ok {
			issues = append(issues, validatex.Issue{
				Path:    []any{"status"},
				Code:    "invalid_enum",
				Message: "invalid notification status",
			})
		}
	}
	if input.Type != nil {
		value := strings.TrimSpace(*input.Type)
		if _, ok := allowedTypes[value]; !ok {
			issues = append(issues, validatex.Issue{
				Path:    []any{"type"},
				Code:    "invalid_enum",
				Message: "invalid notification type",
			})
		}
	}
	if input.Priority != nil {
		value := strings.TrimSpace(*input.Priority)
		if _, ok := allowedPriority[value]; !ok {
			issues = append(issues, validatex.Issue{
				Path:    []any{"priority"},
				Code:    "invalid_enum",
				Message: "invalid notification priority",
			})
		}
	}
	return issues
}

func validateSettingsInput(input UpdateSettingsInput) []validatex.Issue {
	issues := []validatex.Issue{}
	if input.DigestFrequency != nil {
		value := strings.TrimSpace(*input.DigestFrequency)
		if _, ok := allowedDigestFrequency[value]; !ok {
			issues = append(issues, validatex.Issue{
				Path:    []any{"digestFrequency"},
				Code:    "invalid_enum",
				Message: "invalid digest frequency",
			})
		}
	}
	return issues
}

func normalizePriority(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "NORMAL"
	}
	return trimmed
}

func normalizeEnumPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	return &trimmed
}

func trimPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func mapNotification(input notificationsrepo.Notification) Notification {
	return Notification{
		ID:                input.ID,
		UserID:            input.UserID,
		Type:              input.Type,
		Title:             input.Title,
		Message:           input.Message,
		Status:            input.Status,
		Priority:          input.Priority,
		RelatedUserID:     input.RelatedUserID,
		RelatedEntityType: input.RelatedEntityType,
		RelatedEntityID:   input.RelatedEntityID,
		ImageURL:          input.ImageURL,
		ActionURL:         input.ActionURL,
		Metadata:          input.Metadata,
		IsEmailSent:       input.IsEmailSent,
		IsPushSent:        input.IsPushSent,
		EmailSentAt:       input.EmailSentAt,
		PushSentAt:        input.PushSentAt,
		ReadAt:            input.ReadAt,
		ArchivedAt:        input.ArchivedAt,
		CreatedAt:         input.CreatedAt,
		UpdatedAt:         input.UpdatedAt,
	}
}

func mapSettings(input notificationsrepo.NotificationSettings) NotificationSettings {
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
		DigestFrequency:            input.DigestFrequency,
		QuietHoursStart:            input.QuietHoursStart,
		QuietHoursEnd:              input.QuietHoursEnd,
		Timezone:                   input.Timezone,
		CreatedAt:                  input.CreatedAt,
		UpdatedAt:                  input.UpdatedAt,
	}
}

func toSet(values ...string) map[string]struct{} {
	items := make(map[string]struct{}, len(values))
	for _, value := range values {
		items[value] = struct{}{}
	}
	return items
}
