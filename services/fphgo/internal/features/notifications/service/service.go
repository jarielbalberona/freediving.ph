package service

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	notificationsrepo "fphgo/internal/features/notifications/repo"
	"fphgo/internal/realtime/ws"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo        repository
	broadcaster targetedBroadcaster
	pushSender  pushSender
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
	RegisterDevice(ctx context.Context, input notificationsrepo.RegisterDeviceInput) (notificationsrepo.DevicePushToken, error)
	DeleteDeviceForUser(ctx context.Context, userID, deviceID string) error
	ListPushDeliveryTargetsForOutbox(ctx context.Context, outboxIdempotencyKey string) ([]notificationsrepo.PushDeliveryTarget, error)
	MarkNotificationPushSent(ctx context.Context, notificationID int64) error
	DisablePushToken(ctx context.Context, expoPushToken string) error
	ListActiveExploreModeratorRecipients(ctx context.Context, excludeUserID string) ([]string, error)
	ListActiveInstructorReviewerRecipients(ctx context.Context, excludeUserID string) ([]string, error)
	ListActiveNewDiveSiteRecipients(ctx context.Context, excludeUserID string) ([]string, error)
	ListActiveSchoolBookingManagerRecipients(ctx context.Context, schoolID, sessionID, excludeUserID string) ([]string, error)
	ListActiveBookingStudentRecipients(ctx context.Context, bookingID, excludeUserID string) ([]string, error)
	ListActiveSessionStudentRecipients(ctx context.Context, sessionID, excludeUserID string) ([]string, error)
	ListActiveSessionManagerRecipients(ctx context.Context, schoolID, sessionID, excludeUserID string) ([]string, error)
	ChikaRepliesEnabled(ctx context.Context, userID string) (bool, error)
	EventNotificationsEnabled(ctx context.Context, userID string) (bool, error)
	GroupInviteNotificationsEnabled(ctx context.Context, userID string) (bool, error)
	InstructorStatusNotificationsEnabled(ctx context.Context, userID string) (bool, error)
	ListGroupPostRecipients(ctx context.Context, groupID, excludeUserID string) ([]string, error)
	ListGroupEventRecipients(ctx context.Context, groupID, excludeUserID string) ([]string, error)
	ListEventAttendeeRecipients(ctx context.Context, eventID, excludeUserID string) ([]string, error)
	ClaimPendingOutbox(ctx context.Context, now time.Time, limit int) ([]notificationsrepo.NotificationOutbox, error)
	ListOutbox(ctx context.Context, input notificationsrepo.OutboxListInput) ([]notificationsrepo.NotificationOutbox, error)
	RetryOutbox(ctx context.Context, id string, now time.Time) (notificationsrepo.NotificationOutbox, error)
	MarkOutboxProcessed(ctx context.Context, id string) error
	MarkOutboxRetry(ctx context.Context, id string, nextRetryAt time.Time, lastError string) error
	MarkOutboxFailed(ctx context.Context, id string, lastError string) error
}

type targetedBroadcaster interface {
	BroadcastEnvelopeToUsers(userIDs []string, env ws.Envelope)
}

type PushMessage struct {
	To    string
	Title string
	Body  string
	Data  map[string]any
}

type PushSendResult struct {
	StaleToken bool
}

type pushSender interface {
	Send(ctx context.Context, message PushMessage) (PushSendResult, error)
}

type Option func(*Service)

func WithBroadcaster(broadcaster targetedBroadcaster) Option {
	return func(s *Service) {
		s.broadcaster = broadcaster
	}
}

func WithPushSender(sender pushSender) Option {
	return func(s *Service) {
		s.pushSender = sender
	}
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type Notification struct {
	ID                int64
	UserID            string
	Type              string
	Category          string
	Title             string
	Message           string
	Status            string
	Priority          string
	ActorUserID       *string
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
	SeenAt            *time.Time
	ArchivedAt        *time.Time
	IdempotencyKey    *string
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
	SessionNotifications       bool
	ReviewNotifications        bool
	MentionNotifications       bool
	LikeNotifications          bool
	CommentNotifications       bool
	FriendRequestNotifications bool
	GroupInviteNotifications   bool
	EventReminderNotifications bool
	PaymentNotifications       bool
	SecurityNotifications      bool
	NewDiveSitePublished       bool
	ChikaReplies               bool
	InstructorApplication      bool
	InstructorStatus           bool
	BuddyUpdates               bool
	ProfileSocialUpdates       bool
	DiveConditionAlerts        bool
	DiveConditionSavedSites    bool
	DiveConditionRegions       []string
	DiveConditionNearMe        bool
	DiveConditionCoarseArea    *string
	DigestFrequency            string
	QuietHoursStart            *string
	QuietHoursEnd              *string
	Timezone                   string
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
}

type DevicePushToken struct {
	ID            string
	UserID        string
	ExpoPushToken string
	Platform      string
	DeviceID      *string
	DeviceName    *string
	AppVersion    *string
	Enabled       bool
	LastSeenAt    time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Stats struct {
	Total    int64
	Unread   int64
	Read     int64
	Archived int64
}

type OutboxProcessResult struct {
	Claimed   int
	Processed int
	Retried   int
	Failed    int
}

type OutboxListInput struct {
	Status *string
	Limit  int
	Offset int
}

type RegisterDeviceInput struct {
	ExpoPushToken string
	Platform      string
	DeviceID      *string
	DeviceName    *string
	AppVersion    *string
}

type OutboxItem struct {
	ID             string
	EventType      string
	AggregateType  string
	AggregateID    string
	Status         string
	Attempts       int
	NextRetryAt    time.Time
	LastError      *string
	IdempotencyKey string
	Summary        map[string]any
	CreatedAt      time.Time
	UpdatedAt      time.Time
	ProcessedAt    *time.Time
}

type CreateInput struct {
	UserID            string
	Type              string
	Category          string
	Title             string
	Message           string
	Priority          string
	ActorUserID       *string
	RelatedUserID     *string
	RelatedEntityType *string
	RelatedEntityID   *string
	ImageURL          *string
	ActionURL         *string
	Metadata          map[string]any
	IdempotencyKey    *string
}

type InternalCreateInput struct {
	RecipientUserIDs  []string
	Type              string
	Category          string
	Title             string
	Message           string
	Priority          string
	ActorUserID       *string
	RelatedEntityType string
	RelatedEntityID   string
	ActionURL         string
	Metadata          map[string]any
	IdempotencyKey    string
}

type DiveSiteApprovedInput struct {
	SiteID          string
	Slug            string
	Name            string
	Area            string
	SubmitterUserID string
	ReviewerUserID  string
}

type DiveSiteRejectedInput struct {
	SiteID          string
	Name            string
	SubmitterUserID string
	ReviewerUserID  string
}

type DiveSiteSubmittedForReviewInput struct {
	SiteID          string
	Name            string
	Area            string
	SubmitterUserID string
}

type InstructorApplicationSubmittedInput struct {
	ProfileID            string
	ApplicantUserID      string
	ApplicantDisplayName string
	Status               string
}

type InstructorApplicationStatusInput struct {
	ProfileID       string
	ApplicantUserID string
	ReviewerUserID  string
	Status          string
}

type BookingNotificationInput struct {
	BookingID       string
	SchoolID        string
	SchoolSlug      string
	CourseID        string
	CourseTitle     string
	SessionID       string
	SessionTitle    string
	StudentUserID   string
	StudentName     string
	ActorUserID     string
	Status          string
	PreviousSession string
}

type SessionNotificationInput struct {
	SessionID        string
	SchoolID         string
	SchoolSlug       string
	CourseID         string
	CourseTitle      string
	Title            string
	ActorUserID      string
	Status           string
	ChangeTypes      []string
	PreviousStatus   string
	PreviousStartsAt string
	PreviousEndsAt   string
}

type ChikaThreadCommentedInput struct {
	ThreadID         string
	ThreadSlug       string
	ThreadTitle      string
	CommentID        int64
	RecipientUserID  string
	ActorDisplayName string
	Pseudonymous     bool
}

type ChikaCommentRepliedInput struct {
	ThreadID         string
	ThreadSlug       string
	ThreadTitle      string
	ParentCommentID  int64
	ReplyCommentID   int64
	RecipientUserID  string
	ActorDisplayName string
	Pseudonymous     bool
}

type GroupPostCreatedInput struct {
	GroupID      string
	GroupSlug    string
	GroupName    string
	PostID       string
	PostTitle    string
	AuthorUserID string
}

type GroupInviteReceivedInput struct {
	GroupID       string
	GroupSlug     string
	GroupName     string
	InviterUserID string
	InvitedUserID string
}

type EventCreatedForGroupInput struct {
	EventID         string
	EventSlug       string
	EventTitle      string
	GroupID         string
	OrganizerUserID string
}

type EventAttendeeJoinedInput struct {
	EventID         string
	EventSlug       string
	EventTitle      string
	OrganizerUserID string
	AttendeeUserID  string
}

type EventUpdatedInput struct {
	EventID     string
	EventSlug   string
	EventTitle  string
	ActorUserID string
	UpdatedAt   time.Time
}

type EventCancelledInput struct {
	EventID     string
	EventSlug   string
	EventTitle  string
	ActorUserID string
	UpdatedAt   time.Time
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
		"NEW_DIVE_SITE_PUBLISHED", "DIVE_SITE_SUBMITTED_FOR_REVIEW",
		"INSTRUCTOR_APPLICATION_SUBMITTED", "INSTRUCTOR_APPLICATION_APPROVED", "INSTRUCTOR_APPLICATION_REJECTED",
		"BOOKING_CREATED", "BOOKING_APPROVED", "BOOKING_REJECTED", "BOOKING_CANCELLED_BY_STUDENT",
		"BOOKING_CANCELLED_BY_SCHOOL", "BOOKING_RESCHEDULED", "SESSION_UPDATED", "SESSION_CANCELLED",
		"CHIKA_THREAD_COMMENTED", "CHIKA_COMMENT_REPLIED",
		"GROUP_INVITE_RECEIVED", "GROUP_POST_CREATED",
		"EVENT_CREATED_FOR_GROUP", "EVENT_ATTENDEE_JOINED", "EVENT_UPDATED", "EVENT_CANCELLED",
	)
	allowedStatus          = toSet("UNREAD", "READ", "ARCHIVED", "DELETED")
	allowedPriority        = toSet("LOW", "NORMAL", "HIGH", "URGENT")
	allowedDigestFrequency = toSet("IMMEDIATE", "DAILY", "WEEKLY", "NEVER")
)

const maxOutboxAttempts = 8

func New(repo repository, opts ...Option) *Service {
	svc := &Service{repo: repo}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
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
		Category:          normalizeCategory(input.Category, input.Type),
		Title:             strings.TrimSpace(input.Title),
		Message:           strings.TrimSpace(input.Message),
		Priority:          normalizePriority(input.Priority),
		ActorUserID:       input.ActorUserID,
		RelatedUserID:     input.RelatedUserID,
		RelatedEntityType: trimPtr(input.RelatedEntityType),
		RelatedEntityID:   trimPtr(input.RelatedEntityID),
		ImageURL:          trimPtr(input.ImageURL),
		ActionURL:         trimPtr(input.ActionURL),
		Metadata:          input.Metadata,
		IdempotencyKey:    trimPtr(input.IdempotencyKey),
	})
	if err != nil {
		return Notification{}, apperrors.New(http.StatusInternalServerError, "notification_create_failed", "failed to create notification", err)
	}
	return mapNotification(created), nil
}

func (s *Service) CreateInternal(ctx context.Context, input InternalCreateInput) ([]Notification, error) {
	issues := validateInternalCreateInput(input)
	if len(issues) > 0 {
		return nil, ValidationFailure{Issues: issues}
	}

	recipients := uniqueUserIDs(input.RecipientUserIDs)
	items := make([]Notification, 0, len(recipients))
	for _, recipientID := range recipients {
		idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
		if idempotencyKey != "" {
			idempotencyKey = idempotencyKey + ":" + recipientID
		}
		created, err := s.repo.Create(ctx, notificationsrepo.CreateInput{
			UserID:            recipientID,
			Type:              strings.TrimSpace(input.Type),
			Category:          normalizeCategory(input.Category, input.Type),
			Title:             strings.TrimSpace(input.Title),
			Message:           strings.TrimSpace(input.Message),
			Priority:          normalizePriority(input.Priority),
			ActorUserID:       input.ActorUserID,
			RelatedEntityType: trimStringPtr(input.RelatedEntityType),
			RelatedEntityID:   trimStringPtr(input.RelatedEntityID),
			ActionURL:         trimStringPtr(input.ActionURL),
			Metadata:          cleanMetadata(input.Metadata),
			IdempotencyKey:    trimStringPtr(idempotencyKey),
		})
		if err != nil {
			return nil, apperrors.New(http.StatusInternalServerError, "notification_create_failed", "failed to create notification", err)
		}
		item := mapNotification(created)
		items = append(items, item)
		if !created.Deduplicated {
			s.emitCreated([]string{recipientID}, item)
		}
	}
	return items, nil
}

func (s *Service) NotifyDiveSiteApproved(ctx context.Context, input DiveSiteApprovedInput) error {
	submitterID := strings.TrimSpace(input.SubmitterUserID)
	reviewerID := strings.TrimSpace(input.ReviewerUserID)
	if submitterID != "" {
		if _, err := uuid.Parse(submitterID); err != nil {
			return apperrors.New(http.StatusInternalServerError, "notification_invalid_recipient", "invalid dive site submitter", err)
		}
		actor := trimStringPtr(reviewerID)
		if _, err := s.CreateInternal(ctx, InternalCreateInput{
			RecipientUserIDs:  []string{submitterID},
			Type:              "SYSTEM",
			Category:          "explore",
			Title:             "Dive site approved",
			Message:           strings.TrimSpace(input.Name) + " is now visible in Explore.",
			Priority:          "NORMAL",
			ActorUserID:       actor,
			RelatedEntityType: "dive_site",
			RelatedEntityID:   input.SiteID,
			ActionURL:         "/explore/sites/" + strings.TrimSpace(input.Slug),
			Metadata: map[string]any{
				"diveSiteId": input.SiteID,
				"slug":       input.Slug,
				"name":       input.Name,
				"area":       input.Area,
			},
			IdempotencyKey: "explore:site:" + input.SiteID + ":approved:submitter",
		}); err != nil {
			return err
		}
	}

	recipients, err := s.repo.ListActiveNewDiveSiteRecipients(ctx, submitterID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve dive site notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "NEW_DIVE_SITE_PUBLISHED",
		Category:          "explore",
		Title:             "New dive site added",
		Message:           strings.TrimSpace(input.Name) + " in " + strings.TrimSpace(input.Area) + " is now on Explore.",
		Priority:          "NORMAL",
		RelatedEntityType: "dive_site",
		RelatedEntityID:   input.SiteID,
		ActionURL:         "/explore/sites/" + strings.TrimSpace(input.Slug),
		Metadata: map[string]any{
			"diveSiteId": input.SiteID,
			"slug":       input.Slug,
			"name":       input.Name,
			"area":       input.Area,
		},
		IdempotencyKey: "explore:site:" + input.SiteID + ":published",
	})
	return err
}

func (s *Service) NotifyDiveSiteRejected(ctx context.Context, input DiveSiteRejectedInput) error {
	submitterID := strings.TrimSpace(input.SubmitterUserID)
	if submitterID == "" {
		return nil
	}
	actor := trimStringPtr(input.ReviewerUserID)
	_, err := s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  []string{submitterID},
		Type:              "SYSTEM",
		Category:          "explore",
		Title:             "Dive site not approved",
		Message:           strings.TrimSpace(input.Name) + " was not approved for Explore.",
		Priority:          "NORMAL",
		ActorUserID:       actor,
		RelatedEntityType: "dive_site",
		RelatedEntityID:   input.SiteID,
		ActionURL:         "/explore/submissions/" + strings.TrimSpace(input.SiteID),
		Metadata: map[string]any{
			"diveSiteId": input.SiteID,
			"name":       input.Name,
		},
		IdempotencyKey: "explore:site:" + input.SiteID + ":rejected:submitter",
	})
	return err
}

func (s *Service) NotifyDiveSiteSubmittedForReview(ctx context.Context, input DiveSiteSubmittedForReviewInput) error {
	recipients, err := s.repo.ListActiveExploreModeratorRecipients(ctx, input.SubmitterUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve dive site moderation notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "DIVE_SITE_SUBMITTED_FOR_REVIEW",
		Category:          "explore",
		Title:             "Dive site needs review",
		Message:           fallbackTitle(input.Name, "A dive site") + " in " + fallbackTitle(input.Area, "an unknown area") + " was submitted for moderation.",
		Priority:          "NORMAL",
		RelatedEntityType: "dive_site",
		RelatedEntityID:   strings.TrimSpace(input.SiteID),
		ActionURL:         "/moderation/explore-sites/" + strings.TrimSpace(input.SiteID),
		Metadata: map[string]any{
			"diveSiteId":      strings.TrimSpace(input.SiteID),
			"name":            strings.TrimSpace(input.Name),
			"area":            strings.TrimSpace(input.Area),
			"submitterUserId": strings.TrimSpace(input.SubmitterUserID),
			"notificationV1":  true,
		},
		IdempotencyKey: "explore:site:" + strings.TrimSpace(input.SiteID) + ":submitted-for-review",
	})
	return err
}

func (s *Service) NotifyInstructorApplicationSubmitted(ctx context.Context, input InstructorApplicationSubmittedInput) error {
	profileID := strings.TrimSpace(input.ProfileID)
	applicantID := strings.TrimSpace(input.ApplicantUserID)
	recipients, err := s.repo.ListActiveInstructorReviewerRecipients(ctx, applicantID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve instructor reviewer notification recipients", err)
	}
	if len(recipients) == 0 {
		slog.Default().Warn("notifications.instructor_application_submitted.no_reviewers",
			slog.String("profile_id", profileID),
			slog.String("applicant_user_id", applicantID),
		)
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "INSTRUCTOR_APPLICATION_SUBMITTED",
		Category:          "instructor",
		Title:             "New instructor application",
		Message:           fallbackTitle(input.ApplicantDisplayName, "An instructor applicant") + " submitted an application for review.",
		Priority:          "HIGH",
		RelatedEntityType: "instructor_application",
		RelatedEntityID:   profileID,
		ActionURL:         "/admin/instructors?status=pending",
		Metadata: map[string]any{
			"profileId":            profileID,
			"applicantUserId":      applicantID,
			"applicantDisplayName": strings.TrimSpace(input.ApplicantDisplayName),
			"status":               defaultString(strings.TrimSpace(input.Status), "pending"),
			"notificationV1":       true,
		},
		IdempotencyKey: "instructors:application:" + profileID + ":submitted",
	})
	return err
}

func (s *Service) NotifyInstructorApplicationApproved(ctx context.Context, input InstructorApplicationStatusInput) error {
	return s.notifyInstructorApplicationStatus(ctx, input, "INSTRUCTOR_APPLICATION_APPROVED", "Instructor application approved", "Your instructor application was approved.", "/instructor/profile", "approved")
}

func (s *Service) NotifyInstructorApplicationRejected(ctx context.Context, input InstructorApplicationStatusInput) error {
	return s.notifyInstructorApplicationStatus(ctx, input, "INSTRUCTOR_APPLICATION_REJECTED", "Instructor application rejected", "Your instructor application was not approved.", "/instructor/apply", "rejected")
}

func (s *Service) notifyInstructorApplicationStatus(ctx context.Context, input InstructorApplicationStatusInput, typ, title, message, actionURL, fallbackStatus string) error {
	applicantID := strings.TrimSpace(input.ApplicantUserID)
	if applicantID == "" {
		return nil
	}
	enabled, err := s.repo.InstructorStatusNotificationsEnabled(ctx, applicantID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_settings_failed", "failed to check instructor notification settings", err)
	}
	if !enabled {
		return nil
	}
	profileID := strings.TrimSpace(input.ProfileID)
	actor := trimStringPtr(input.ReviewerUserID)
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  []string{applicantID},
		Type:              typ,
		Category:          "instructor",
		Title:             title,
		Message:           message,
		Priority:          "HIGH",
		ActorUserID:       actor,
		RelatedEntityType: "instructor_application",
		RelatedEntityID:   profileID,
		ActionURL:         actionURL,
		Metadata: map[string]any{
			"profileId":      profileID,
			"status":         defaultString(strings.TrimSpace(input.Status), fallbackStatus),
			"notificationV1": true,
		},
		IdempotencyKey: "instructors:application:" + profileID + ":" + fallbackStatus,
	})
	return err
}

func (s *Service) NotifyBookingCreated(ctx context.Context, input BookingNotificationInput) error {
	recipients, err := s.repo.ListActiveSchoolBookingManagerRecipients(ctx, input.SchoolID, input.SessionID, input.ActorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve booking manager notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "BOOKING_CREATED",
		Category:          "booking",
		Title:             "New booking request",
		Message:           fallbackTitle(input.StudentName, "A student") + " requested " + fallbackTitle(input.CourseTitle, "a course") + ".",
		Priority:          "HIGH",
		ActorUserID:       trimStringPtr(input.ActorUserID),
		RelatedEntityType: "course_booking",
		RelatedEntityID:   input.BookingID,
		ActionURL:         manageBookingsURL(input.SchoolSlug),
		Metadata:          bookingMetadata(input),
		IdempotencyKey:    "bookings:" + strings.TrimSpace(input.BookingID) + ":created:managers",
	})
	return err
}

func (s *Service) NotifyBookingApproved(ctx context.Context, input BookingNotificationInput) error {
	return s.notifyBookingStudent(ctx, input, "BOOKING_APPROVED", "Booking approved", "Your booking was approved.", "/my/bookings", "approved")
}

func (s *Service) NotifyBookingRejected(ctx context.Context, input BookingNotificationInput) error {
	return s.notifyBookingStudent(ctx, input, "BOOKING_REJECTED", "Booking rejected", "Your booking was not approved.", "/my/bookings", "rejected")
}

func (s *Service) NotifyBookingCancelledByStudent(ctx context.Context, input BookingNotificationInput) error {
	recipients, err := s.repo.ListActiveSchoolBookingManagerRecipients(ctx, input.SchoolID, input.SessionID, input.ActorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve booking manager notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "BOOKING_CANCELLED_BY_STUDENT",
		Category:          "booking",
		Title:             "Booking cancelled",
		Message:           fallbackTitle(input.StudentName, "A student") + " cancelled a booking.",
		Priority:          "HIGH",
		ActorUserID:       trimStringPtr(input.ActorUserID),
		RelatedEntityType: "course_booking",
		RelatedEntityID:   input.BookingID,
		ActionURL:         manageBookingsURL(input.SchoolSlug),
		Metadata:          bookingMetadata(input),
		IdempotencyKey:    "bookings:" + strings.TrimSpace(input.BookingID) + ":cancelled-by-student:managers",
	})
	return err
}

func (s *Service) NotifyBookingCancelledBySchool(ctx context.Context, input BookingNotificationInput) error {
	return s.notifyBookingStudent(ctx, input, "BOOKING_CANCELLED_BY_SCHOOL", "Booking cancelled", "Your booking was cancelled.", "/my/bookings", "cancelled-by-school")
}

func (s *Service) NotifyBookingRescheduled(ctx context.Context, input BookingNotificationInput) error {
	if err := s.notifyBookingStudent(ctx, input, "BOOKING_RESCHEDULED", "Booking rescheduled", "Your booking schedule changed.", "/my/bookings", "rescheduled:student"); err != nil {
		return err
	}
	recipients, err := s.repo.ListActiveSchoolBookingManagerRecipients(ctx, input.SchoolID, input.SessionID, input.ActorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve booking manager notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "BOOKING_RESCHEDULED",
		Category:          "booking",
		Title:             "Booking rescheduled",
		Message:           "A booking schedule changed.",
		Priority:          "HIGH",
		ActorUserID:       trimStringPtr(input.ActorUserID),
		RelatedEntityType: "course_booking",
		RelatedEntityID:   input.BookingID,
		ActionURL:         manageBookingsURL(input.SchoolSlug),
		Metadata:          bookingMetadata(input),
		IdempotencyKey:    "bookings:" + strings.TrimSpace(input.BookingID) + ":rescheduled:managers:" + bookingSessionKey(input),
	})
	return err
}

func (s *Service) notifyBookingStudent(ctx context.Context, input BookingNotificationInput, typ, title, message, actionURL, keySuffix string) error {
	recipients, err := s.repo.ListActiveBookingStudentRecipients(ctx, input.BookingID, input.ActorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve booking student notification recipient", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              typ,
		Category:          "booking",
		Title:             title,
		Message:           message,
		Priority:          "HIGH",
		ActorUserID:       trimStringPtr(input.ActorUserID),
		RelatedEntityType: "course_booking",
		RelatedEntityID:   input.BookingID,
		ActionURL:         actionURL,
		Metadata:          bookingMetadata(input),
		IdempotencyKey:    "bookings:" + strings.TrimSpace(input.BookingID) + ":" + keySuffix,
	})
	return err
}

func (s *Service) NotifySessionUpdated(ctx context.Context, input SessionNotificationInput) error {
	return s.notifySessionOperational(ctx, input, "SESSION_UPDATED", "Session updated", "A booked session was updated.", "updated:"+sessionChangeKey(input))
}

func (s *Service) NotifySessionCancelled(ctx context.Context, input SessionNotificationInput) error {
	return s.notifySessionOperational(ctx, input, "SESSION_CANCELLED", "Session cancelled", "A booked session was cancelled.", "cancelled")
}

func (s *Service) notifySessionOperational(ctx context.Context, input SessionNotificationInput, typ, title, message, keySuffix string) error {
	sessionID := strings.TrimSpace(input.SessionID)
	students, err := s.repo.ListActiveSessionStudentRecipients(ctx, sessionID, input.ActorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve session student notification recipients", err)
	}
	if len(students) > 0 {
		if _, err := s.CreateInternal(ctx, InternalCreateInput{
			RecipientUserIDs:  students,
			Type:              typ,
			Category:          "session",
			Title:             title,
			Message:           message,
			Priority:          "HIGH",
			ActorUserID:       trimStringPtr(input.ActorUserID),
			RelatedEntityType: "course_session",
			RelatedEntityID:   sessionID,
			ActionURL:         "/my/bookings",
			Metadata:          sessionMetadata(input),
			IdempotencyKey:    "sessions:" + sessionID + ":" + keySuffix + ":students",
		}); err != nil {
			return err
		}
	}
	managers, err := s.repo.ListActiveSessionManagerRecipients(ctx, input.SchoolID, sessionID, input.ActorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve session manager notification recipients", err)
	}
	if len(managers) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  managers,
		Type:              typ,
		Category:          "session",
		Title:             title,
		Message:           message,
		Priority:          "HIGH",
		ActorUserID:       trimStringPtr(input.ActorUserID),
		RelatedEntityType: "course_session",
		RelatedEntityID:   sessionID,
		ActionURL:         manageSessionsURL(input.SchoolSlug),
		Metadata:          sessionMetadata(input),
		IdempotencyKey:    "sessions:" + sessionID + ":" + keySuffix + ":managers",
	})
	return err
}

func (s *Service) NotifyChikaThreadCommented(ctx context.Context, input ChikaThreadCommentedInput) error {
	recipientID := strings.TrimSpace(input.RecipientUserID)
	if recipientID == "" {
		return nil
	}
	enabled, err := s.repo.ChikaRepliesEnabled(ctx, recipientID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_settings_failed", "failed to check Chika notification settings", err)
	}
	if !enabled {
		return nil
	}
	commentID := fmt.Sprintf("%d", input.CommentID)
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  []string{recipientID},
		Type:              "CHIKA_THREAD_COMMENTED",
		Category:          "chika",
		Title:             "New Chika comment",
		Message:           safeActorLabel(input.ActorDisplayName) + " commented on your Chika thread.",
		Priority:          "NORMAL",
		RelatedEntityType: "chika_thread",
		RelatedEntityID:   strings.TrimSpace(input.ThreadID),
		ActionURL:         entityActionURL("chika", input.ThreadSlug),
		Metadata: map[string]any{
			"threadId":       strings.TrimSpace(input.ThreadID),
			"threadSlug":     strings.TrimSpace(input.ThreadSlug),
			"commentId":      commentID,
			"threadTitle":    strings.TrimSpace(input.ThreadTitle),
			"actorLabel":     safeActorLabel(input.ActorDisplayName),
			"pseudonymous":   input.Pseudonymous,
			"notificationV1": true,
		},
		IdempotencyKey: "chika:thread:" + strings.TrimSpace(input.ThreadID) + ":comment:" + commentID + ":owner",
	})
	return err
}

func (s *Service) NotifyChikaCommentReplied(ctx context.Context, input ChikaCommentRepliedInput) error {
	recipientID := strings.TrimSpace(input.RecipientUserID)
	if recipientID == "" {
		return nil
	}
	enabled, err := s.repo.ChikaRepliesEnabled(ctx, recipientID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_settings_failed", "failed to check Chika notification settings", err)
	}
	if !enabled {
		return nil
	}
	parentID := fmt.Sprintf("%d", input.ParentCommentID)
	replyID := fmt.Sprintf("%d", input.ReplyCommentID)
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  []string{recipientID},
		Type:              "CHIKA_COMMENT_REPLIED",
		Category:          "chika",
		Title:             "New Chika reply",
		Message:           safeActorLabel(input.ActorDisplayName) + " replied to your Chika comment.",
		Priority:          "NORMAL",
		RelatedEntityType: "chika_thread",
		RelatedEntityID:   strings.TrimSpace(input.ThreadID),
		ActionURL:         entityActionURL("chika", input.ThreadSlug),
		Metadata: map[string]any{
			"threadId":        strings.TrimSpace(input.ThreadID),
			"threadSlug":      strings.TrimSpace(input.ThreadSlug),
			"parentCommentId": parentID,
			"replyCommentId":  replyID,
			"threadTitle":     strings.TrimSpace(input.ThreadTitle),
			"actorLabel":      safeActorLabel(input.ActorDisplayName),
			"pseudonymous":    input.Pseudonymous,
			"notificationV1":  true,
		},
		IdempotencyKey: "chika:comment:" + parentID + ":reply:" + replyID + ":parent",
	})
	return err
}

func (s *Service) NotifyGroupPostCreated(ctx context.Context, input GroupPostCreatedInput) error {
	recipients, err := s.repo.ListGroupPostRecipients(ctx, input.GroupID, input.AuthorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve group post notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "GROUP_POST_CREATED",
		Category:          "groups",
		Title:             "New group post",
		Message:           "New post in " + fallbackTitle(input.GroupName, "your group") + ".",
		Priority:          "NORMAL",
		RelatedEntityType: "group",
		RelatedEntityID:   strings.TrimSpace(input.GroupID),
		ActionURL:         entityActionURL("groups", input.GroupSlug),
		Metadata: map[string]any{
			"groupId":        strings.TrimSpace(input.GroupID),
			"groupSlug":      strings.TrimSpace(input.GroupSlug),
			"groupName":      strings.TrimSpace(input.GroupName),
			"postId":         strings.TrimSpace(input.PostID),
			"postTitle":      strings.TrimSpace(input.PostTitle),
			"notificationV1": true,
		},
		IdempotencyKey: "groups:group:" + strings.TrimSpace(input.GroupID) + ":post:" + strings.TrimSpace(input.PostID) + ":created",
	})
	return err
}

func (s *Service) NotifyGroupInviteReceived(ctx context.Context, input GroupInviteReceivedInput) error {
	invitedID := strings.TrimSpace(input.InvitedUserID)
	if invitedID == "" || invitedID == strings.TrimSpace(input.InviterUserID) {
		return nil
	}
	enabled, err := s.repo.GroupInviteNotificationsEnabled(ctx, invitedID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_settings_failed", "failed to check group invite notification settings", err)
	}
	if !enabled {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  []string{invitedID},
		Type:              "GROUP_INVITE_RECEIVED",
		Category:          "groups",
		Title:             "Group invite",
		Message:           "You were invited to " + fallbackTitle(input.GroupName, "a group") + ".",
		Priority:          "NORMAL",
		RelatedEntityType: "group",
		RelatedEntityID:   strings.TrimSpace(input.GroupID),
		ActionURL:         entityActionURL("groups", input.GroupSlug),
		Metadata: map[string]any{
			"groupId":        strings.TrimSpace(input.GroupID),
			"groupSlug":      strings.TrimSpace(input.GroupSlug),
			"groupName":      strings.TrimSpace(input.GroupName),
			"notificationV1": true,
		},
		IdempotencyKey: "groups:group:" + strings.TrimSpace(input.GroupID) + ":invite:" + invitedID,
	})
	return err
}

func (s *Service) NotifyEventCreatedForGroup(ctx context.Context, input EventCreatedForGroupInput) error {
	recipients, err := s.repo.ListGroupEventRecipients(ctx, input.GroupID, input.OrganizerUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve group event notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "EVENT_CREATED_FOR_GROUP",
		Category:          "events",
		Title:             "New group event",
		Message:           fallbackTitle(input.EventTitle, "A new event") + " was added to your group.",
		Priority:          "NORMAL",
		RelatedEntityType: "event",
		RelatedEntityID:   strings.TrimSpace(input.EventID),
		ActionURL:         entityActionURL("events", input.EventSlug),
		Metadata: map[string]any{
			"eventId":        strings.TrimSpace(input.EventID),
			"eventSlug":      strings.TrimSpace(input.EventSlug),
			"groupId":        strings.TrimSpace(input.GroupID),
			"eventTitle":     strings.TrimSpace(input.EventTitle),
			"notificationV1": true,
		},
		IdempotencyKey: "events:event:" + strings.TrimSpace(input.EventID) + ":created-for-group",
	})
	return err
}

func (s *Service) NotifyEventAttendeeJoined(ctx context.Context, input EventAttendeeJoinedInput) error {
	organizerID := strings.TrimSpace(input.OrganizerUserID)
	attendeeID := strings.TrimSpace(input.AttendeeUserID)
	if organizerID == "" || organizerID == attendeeID {
		return nil
	}
	enabled, err := s.repo.EventNotificationsEnabled(ctx, organizerID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_settings_failed", "failed to check event notification settings", err)
	}
	if !enabled {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  []string{organizerID},
		Type:              "EVENT_ATTENDEE_JOINED",
		Category:          "events",
		Title:             "New event attendee",
		Message:           "Someone joined " + fallbackTitle(input.EventTitle, "your event") + ".",
		Priority:          "NORMAL",
		RelatedEntityType: "event",
		RelatedEntityID:   strings.TrimSpace(input.EventID),
		ActionURL:         entityActionURL("events", input.EventSlug),
		Metadata: map[string]any{
			"eventId":        strings.TrimSpace(input.EventID),
			"eventSlug":      strings.TrimSpace(input.EventSlug),
			"eventTitle":     strings.TrimSpace(input.EventTitle),
			"notificationV1": true,
		},
		IdempotencyKey: "events:event:" + strings.TrimSpace(input.EventID) + ":attendee:" + attendeeID + ":joined",
	})
	return err
}

func (s *Service) NotifyEventUpdated(ctx context.Context, input EventUpdatedInput) error {
	recipients, err := s.repo.ListEventAttendeeRecipients(ctx, input.EventID, input.ActorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve event attendee notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "EVENT_UPDATED",
		Category:          "events",
		Title:             "Event updated",
		Message:           fallbackTitle(input.EventTitle, "An event") + " has updated time or location details.",
		Priority:          "NORMAL",
		RelatedEntityType: "event",
		RelatedEntityID:   strings.TrimSpace(input.EventID),
		ActionURL:         entityActionURL("events", input.EventSlug),
		Metadata: map[string]any{
			"eventId":        strings.TrimSpace(input.EventID),
			"eventSlug":      strings.TrimSpace(input.EventSlug),
			"eventTitle":     strings.TrimSpace(input.EventTitle),
			"notificationV1": true,
		},
		IdempotencyKey: "events:event:" + strings.TrimSpace(input.EventID) + ":updated:" + fmt.Sprintf("%d", input.UpdatedAt.UnixNano()),
	})
	return err
}

func (s *Service) NotifyEventCancelled(ctx context.Context, input EventCancelledInput) error {
	recipients, err := s.repo.ListEventAttendeeRecipients(ctx, input.EventID, input.ActorUserID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_recipients_failed", "failed to resolve event attendee notification recipients", err)
	}
	if len(recipients) == 0 {
		return nil
	}
	_, err = s.CreateInternal(ctx, InternalCreateInput{
		RecipientUserIDs:  recipients,
		Type:              "EVENT_CANCELLED",
		Category:          "events",
		Title:             "Event cancelled",
		Message:           fallbackTitle(input.EventTitle, "An event") + " was cancelled.",
		Priority:          "HIGH",
		RelatedEntityType: "event",
		RelatedEntityID:   strings.TrimSpace(input.EventID),
		ActionURL:         entityActionURL("events", input.EventSlug),
		Metadata: map[string]any{
			"eventId":        strings.TrimSpace(input.EventID),
			"eventSlug":      strings.TrimSpace(input.EventSlug),
			"eventTitle":     strings.TrimSpace(input.EventTitle),
			"notificationV1": true,
		},
		IdempotencyKey: "events:event:" + strings.TrimSpace(input.EventID) + ":cancelled:" + fmt.Sprintf("%d", input.UpdatedAt.UnixNano()),
	})
	return err
}

func (s *Service) ProcessDueOutbox(ctx context.Context, limit int) (OutboxProcessResult, error) {
	now := time.Now().UTC()
	events, err := s.repo.ClaimPendingOutbox(ctx, now, limit)
	if err != nil {
		return OutboxProcessResult{}, apperrors.New(http.StatusInternalServerError, "notification_outbox_claim_failed", "failed to claim notification outbox", err)
	}

	result := OutboxProcessResult{Claimed: len(events)}
	for _, event := range events {
		if err := s.processOutboxEvent(ctx, event); err != nil {
			if handleErr := s.handleOutboxFailure(ctx, now, event, err, &result); handleErr != nil {
				return result, handleErr
			}
			continue
		}
		if err := s.deliverOutboxPush(ctx, event); err != nil {
			if handleErr := s.handleOutboxFailure(ctx, now, event, err, &result); handleErr != nil {
				return result, handleErr
			}
			continue
		}

		if err := s.repo.MarkOutboxProcessed(ctx, event.ID); err != nil {
			return result, apperrors.New(http.StatusInternalServerError, "notification_outbox_mark_processed", "failed to mark notification outbox event processed", err)
		}
		result.Processed++
	}
	return result, nil
}

func (s *Service) handleOutboxFailure(ctx context.Context, now time.Time, event notificationsrepo.NotificationOutbox, err error, result *OutboxProcessResult) error {
	if event.Attempts >= maxOutboxAttempts {
		if markErr := s.repo.MarkOutboxFailed(ctx, event.ID, err.Error()); markErr != nil {
			return apperrors.New(http.StatusInternalServerError, "notification_outbox_mark_failed", "failed to mark notification outbox event failed", markErr)
		}
		result.Failed++
		slog.Default().Error("notification_outbox.event_failed",
			slog.String("event_id", event.ID),
			slog.String("event_type", event.EventType),
			slog.Int("attempts", event.Attempts),
			slog.Any("error", err),
		)
		return nil
	}
	nextRetryAt := now.Add(outboxRetryDelay(event.Attempts))
	if markErr := s.repo.MarkOutboxRetry(ctx, event.ID, nextRetryAt, err.Error()); markErr != nil {
		return apperrors.New(http.StatusInternalServerError, "notification_outbox_mark_retry", "failed to schedule notification outbox retry", markErr)
	}
	result.Retried++
	slog.Default().Warn("notification_outbox.event_retry_scheduled",
		slog.String("event_id", event.ID),
		slog.String("event_type", event.EventType),
		slog.Int("attempts", event.Attempts),
		slog.Time("next_retry_at", nextRetryAt),
		slog.Any("error", err),
	)
	return nil
}

func (s *Service) deliverOutboxPush(ctx context.Context, event notificationsrepo.NotificationOutbox) error {
	if s.pushSender == nil {
		return nil
	}
	targets, err := s.repo.ListPushDeliveryTargetsForOutbox(ctx, event.IdempotencyKey)
	if err != nil {
		return fmt.Errorf("list push delivery targets: %w", err)
	}
	sentNotificationIDs := map[int64]bool{}
	for _, target := range targets {
		result, sendErr := s.pushSender.Send(ctx, pushMessageFromTarget(target))
		if sendErr != nil {
			return fmt.Errorf("send push notification: %w", sendErr)
		}
		if result.StaleToken {
			if disableErr := s.repo.DisablePushToken(ctx, target.DeviceToken.ExpoPushToken); disableErr != nil {
				return fmt.Errorf("disable stale push token: %w", disableErr)
			}
			continue
		}
		sentNotificationIDs[target.Notification.ID] = true
	}
	for notificationID := range sentNotificationIDs {
		if markErr := s.repo.MarkNotificationPushSent(ctx, notificationID); markErr != nil {
			return fmt.Errorf("mark push notification sent: %w", markErr)
		}
	}
	return nil
}

func pushMessageFromTarget(target notificationsrepo.PushDeliveryTarget) PushMessage {
	data := map[string]any{
		"notificationId":    target.Notification.ID,
		"type":              target.Notification.Type,
		"category":          target.Notification.Category,
		"relatedEntityType": target.Notification.RelatedEntityType,
		"relatedEntityId":   target.Notification.RelatedEntityID,
	}
	if target.Notification.ActionURL != nil && strings.TrimSpace(*target.Notification.ActionURL) != "" {
		data["actionUrl"] = strings.TrimSpace(*target.Notification.ActionURL)
	}
	return PushMessage{
		To:    target.DeviceToken.ExpoPushToken,
		Title: target.Notification.Title,
		Body:  target.Notification.Message,
		Data:  data,
	}
}

func (s *Service) ListOutbox(ctx context.Context, input OutboxListInput) ([]OutboxItem, error) {
	issues := validateOutboxListInput(input)
	if len(issues) > 0 {
		return nil, ValidationFailure{Issues: issues}
	}
	items, err := s.repo.ListOutbox(ctx, notificationsrepo.OutboxListInput{
		Status: normalizeOutboxStatusPtr(input.Status),
		Limit:  input.Limit,
		Offset: input.Offset,
	})
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "notification_outbox_list_failed", "failed to list notification outbox rows", err)
	}
	result := make([]OutboxItem, 0, len(items))
	for _, item := range items {
		result = append(result, mapOutboxItem(item))
	}
	return result, nil
}

func (s *Service) RetryOutbox(ctx context.Context, id string) (OutboxItem, error) {
	if _, err := uuid.Parse(strings.TrimSpace(id)); err != nil {
		return OutboxItem{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"id"},
			Code:    "invalid_uuid",
			Message: "outbox id must be a valid UUID",
		}}}
	}
	item, err := s.repo.RetryOutbox(ctx, id, time.Now().UTC())
	if err != nil {
		if notificationsrepo.IsNoRows(err) {
			return OutboxItem{}, apperrors.New(http.StatusConflict, "outbox_not_retryable", "outbox row is not failed or stale processing", err)
		}
		return OutboxItem{}, apperrors.New(http.StatusInternalServerError, "notification_outbox_retry_failed", "failed to schedule notification outbox retry", err)
	}
	return mapOutboxItem(item), nil
}

func (s *Service) RunOutboxProcessor(ctx context.Context, interval time.Duration, limit int) {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	if limit <= 0 {
		limit = 25
	}

	if result, err := s.ProcessDueOutbox(ctx, limit); err != nil {
		slog.Default().Warn("notification_outbox.process_failed", slog.Any("error", err))
	} else if result.Claimed > 0 {
		slog.Default().Info("notification_outbox.processed",
			slog.Int("claimed", result.Claimed),
			slog.Int("processed", result.Processed),
			slog.Int("retried", result.Retried),
			slog.Int("failed", result.Failed),
		)
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			result, err := s.ProcessDueOutbox(ctx, limit)
			if err != nil {
				slog.Default().Warn("notification_outbox.process_failed", slog.Any("error", err))
				continue
			}
			if result.Claimed > 0 {
				slog.Default().Info("notification_outbox.processed",
					slog.Int("claimed", result.Claimed),
					slog.Int("processed", result.Processed),
					slog.Int("retried", result.Retried),
					slog.Int("failed", result.Failed),
				)
			}
		}
	}
}

func (s *Service) processOutboxEvent(ctx context.Context, event notificationsrepo.NotificationOutbox) error {
	switch strings.TrimSpace(event.EventType) {
	case notificationsrepo.OutboxEventBookingCreated:
		input := bookingNotificationInputFromPayload(event.Payload)
		if err := validateBookingOutboxInput(input); err != nil {
			return err
		}
		return s.NotifyBookingCreated(ctx, input)
	case notificationsrepo.OutboxEventBookingApproved:
		input := bookingNotificationInputFromPayload(event.Payload)
		if err := validateBookingOutboxInput(input); err != nil {
			return err
		}
		return s.NotifyBookingApproved(ctx, input)
	case notificationsrepo.OutboxEventBookingRejected:
		input := bookingNotificationInputFromPayload(event.Payload)
		if err := validateBookingOutboxInput(input); err != nil {
			return err
		}
		return s.NotifyBookingRejected(ctx, input)
	case notificationsrepo.OutboxEventBookingCancelledByStudent:
		input := bookingNotificationInputFromPayload(event.Payload)
		if err := validateBookingOutboxInput(input); err != nil {
			return err
		}
		return s.NotifyBookingCancelledByStudent(ctx, input)
	case notificationsrepo.OutboxEventBookingCancelledBySchool:
		input := bookingNotificationInputFromPayload(event.Payload)
		if err := validateBookingOutboxInput(input); err != nil {
			return err
		}
		return s.NotifyBookingCancelledBySchool(ctx, input)
	case notificationsrepo.OutboxEventBookingRescheduled:
		input := bookingNotificationInputFromPayload(event.Payload)
		if err := validateBookingOutboxInput(input); err != nil {
			return err
		}
		return s.NotifyBookingRescheduled(ctx, input)
	case notificationsrepo.OutboxEventSessionUpdated:
		input := sessionNotificationInputFromPayload(event.Payload)
		if strings.TrimSpace(input.SessionID) == "" || strings.TrimSpace(input.SchoolID) == "" {
			return fmt.Errorf("session updated outbox payload is missing required fields")
		}
		return s.NotifySessionUpdated(ctx, input)
	case notificationsrepo.OutboxEventSessionCancelled:
		input := sessionNotificationInputFromPayload(event.Payload)
		if strings.TrimSpace(input.SessionID) == "" || strings.TrimSpace(input.SchoolID) == "" {
			return fmt.Errorf("session cancelled outbox payload is missing required fields")
		}
		return s.NotifySessionCancelled(ctx, input)
	case notificationsrepo.OutboxEventInstructorApplicationSubmitted:
		input := InstructorApplicationSubmittedInput{
			ProfileID:            payloadString(event.Payload, "profileId"),
			ApplicantUserID:      payloadString(event.Payload, "applicantUserId"),
			ApplicantDisplayName: payloadString(event.Payload, "applicantDisplayName"),
			Status:               payloadString(event.Payload, "status"),
		}
		if strings.TrimSpace(input.ProfileID) == "" || strings.TrimSpace(input.ApplicantUserID) == "" {
			return fmt.Errorf("instructor application submitted outbox payload is missing required fields")
		}
		return s.NotifyInstructorApplicationSubmitted(ctx, input)
	case notificationsrepo.OutboxEventInstructorApplicationApproved:
		input := InstructorApplicationStatusInput{
			ProfileID:       payloadString(event.Payload, "profileId"),
			ApplicantUserID: payloadString(event.Payload, "applicantUserId"),
			ReviewerUserID:  payloadString(event.Payload, "reviewerUserId"),
			Status:          payloadString(event.Payload, "status"),
		}
		if strings.TrimSpace(input.ProfileID) == "" || strings.TrimSpace(input.ApplicantUserID) == "" {
			return fmt.Errorf("instructor application approved outbox payload is missing required fields")
		}
		return s.NotifyInstructorApplicationApproved(ctx, input)
	case notificationsrepo.OutboxEventInstructorApplicationRejected:
		input := InstructorApplicationStatusInput{
			ProfileID:       payloadString(event.Payload, "profileId"),
			ApplicantUserID: payloadString(event.Payload, "applicantUserId"),
			ReviewerUserID:  payloadString(event.Payload, "reviewerUserId"),
			Status:          payloadString(event.Payload, "status"),
		}
		if strings.TrimSpace(input.ProfileID) == "" || strings.TrimSpace(input.ApplicantUserID) == "" {
			return fmt.Errorf("instructor application rejected outbox payload is missing required fields")
		}
		return s.NotifyInstructorApplicationRejected(ctx, input)
	case notificationsrepo.OutboxEventDiveSiteSubmittedForReview:
		input := DiveSiteSubmittedForReviewInput{
			SiteID:          payloadString(event.Payload, "siteId"),
			Name:            payloadString(event.Payload, "name"),
			Area:            payloadString(event.Payload, "area"),
			SubmitterUserID: payloadString(event.Payload, "submitterUserId"),
		}
		if strings.TrimSpace(input.SiteID) == "" || strings.TrimSpace(input.Name) == "" {
			return fmt.Errorf("submitted dive site outbox payload is missing required review fields")
		}
		return s.NotifyDiveSiteSubmittedForReview(ctx, input)
	case notificationsrepo.OutboxEventNewDiveSitePublished:
		input := DiveSiteApprovedInput{
			SiteID:          payloadString(event.Payload, "siteId"),
			Slug:            payloadString(event.Payload, "slug"),
			Name:            payloadString(event.Payload, "name"),
			Area:            payloadString(event.Payload, "area"),
			SubmitterUserID: payloadString(event.Payload, "submitterUserId"),
		}
		if strings.TrimSpace(input.SiteID) == "" || strings.TrimSpace(input.Slug) == "" || strings.TrimSpace(input.Name) == "" {
			return fmt.Errorf("published dive site outbox payload is missing required public fields")
		}
		return s.NotifyDiveSiteApproved(ctx, input)
	default:
		return fmt.Errorf("unsupported notification outbox event type %q", event.EventType)
	}
}

func outboxRetryDelay(attempt int) time.Duration {
	switch {
	case attempt <= 1:
		return time.Minute
	case attempt == 2:
		return 5 * time.Minute
	case attempt == 3:
		return 15 * time.Minute
	default:
		return time.Hour
	}
}

func payloadString(payload map[string]any, key string) string {
	if payload == nil {
		return ""
	}
	value, ok := payload[key]
	if !ok {
		return ""
	}
	str, ok := value.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(str)
}

func payloadStringSlice(payload map[string]any, key string) []string {
	if payload == nil {
		return nil
	}
	value, ok := payload[key]
	if !ok {
		return nil
	}
	if typed, ok := value.([]string); ok {
		return typed
	}
	values, ok := value.([]any)
	if !ok {
		return nil
	}
	items := make([]string, 0, len(values))
	for _, item := range values {
		if text, ok := item.(string); ok {
			if trimmed := strings.TrimSpace(text); trimmed != "" {
				items = append(items, trimmed)
			}
		}
	}
	return items
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

func (s *Service) RegisterDevice(ctx context.Context, actorUserID string, input RegisterDeviceInput) (DevicePushToken, error) {
	if err := validateActorID(actorUserID); err != nil {
		return DevicePushToken{}, err
	}
	issues := validateRegisterDeviceInput(input)
	if len(issues) > 0 {
		return DevicePushToken{}, ValidationFailure{Issues: issues}
	}

	item, err := s.repo.RegisterDevice(ctx, notificationsrepo.RegisterDeviceInput{
		UserID:        actorUserID,
		ExpoPushToken: strings.TrimSpace(input.ExpoPushToken),
		Platform:      normalizePlatform(input.Platform),
		DeviceID:      trimPtr(input.DeviceID),
		DeviceName:    trimPtr(input.DeviceName),
		AppVersion:    trimPtr(input.AppVersion),
	})
	if err != nil {
		return DevicePushToken{}, apperrors.New(http.StatusInternalServerError, "push_device_register_failed", "failed to register this device", err)
	}
	return mapDevicePushToken(item), nil
}

func (s *Service) DeleteDevice(ctx context.Context, actorUserID string, deviceID string) error {
	if err := validateActorID(actorUserID); err != nil {
		return err
	}
	if _, err := uuid.Parse(strings.TrimSpace(deviceID)); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"deviceId"},
			Code:    "invalid_uuid",
			Message: "deviceId must be a valid UUID",
		}}}
	}
	if err := s.repo.DeleteDeviceForUser(ctx, actorUserID, deviceID); err != nil {
		if notificationsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "not_found", "push device not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "push_device_delete_failed", "failed to remove this device", err)
	}
	return nil
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
	if input.ActionURL != nil && strings.TrimSpace(*input.ActionURL) != "" && !isSafeAppPath(*input.ActionURL) {
		issues = append(issues, validatex.Issue{
			Path:    []any{"actionUrl"},
			Code:    "invalid_url",
			Message: "action URL must be an app-relative path",
		})
	}

	return issues
}

func validateInternalCreateInput(input InternalCreateInput) []validatex.Issue {
	issues := []validatex.Issue{}
	if len(uniqueUserIDs(input.RecipientUserIDs)) == 0 {
		issues = append(issues, validatex.Issue{Path: []any{"recipientUserIds"}, Code: "required", Message: "at least one recipient is required"})
	}
	for _, id := range input.RecipientUserIDs {
		if _, err := uuid.Parse(strings.TrimSpace(id)); err != nil {
			issues = append(issues, validatex.Issue{Path: []any{"recipientUserIds"}, Code: "invalid_uuid", Message: "recipient must be a valid UUID"})
			break
		}
	}
	typ := strings.TrimSpace(input.Type)
	if _, ok := allowedTypes[typ]; !ok {
		issues = append(issues, validatex.Issue{Path: []any{"type"}, Code: "invalid_enum", Message: "invalid notification type"})
	}
	if strings.TrimSpace(input.Title) == "" {
		issues = append(issues, validatex.Issue{Path: []any{"title"}, Code: "required", Message: "title is required"})
	}
	if strings.TrimSpace(input.Message) == "" {
		issues = append(issues, validatex.Issue{Path: []any{"message"}, Code: "required", Message: "message is required"})
	}
	if input.ActorUserID != nil {
		if _, err := uuid.Parse(strings.TrimSpace(*input.ActorUserID)); err != nil {
			issues = append(issues, validatex.Issue{Path: []any{"actorUserId"}, Code: "invalid_uuid", Message: "actor must be a valid UUID"})
		}
	}
	if strings.TrimSpace(input.RelatedEntityID) != "" {
		if len(strings.TrimSpace(input.RelatedEntityID)) > 120 {
			issues = append(issues, validatex.Issue{Path: []any{"relatedEntityId"}, Code: "too_long", Message: "related entity id is too long"})
		}
	}
	if strings.TrimSpace(input.ActionURL) != "" && !isSafeAppPath(input.ActionURL) {
		issues = append(issues, validatex.Issue{Path: []any{"actionUrl"}, Code: "invalid_url", Message: "action URL must be an app-relative path"})
	}
	return issues
}

func isSafeAppPath(value string) bool {
	trimmed := strings.TrimSpace(value)
	return strings.HasPrefix(trimmed, "/") && !strings.HasPrefix(trimmed, "//")
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

func validateOutboxListInput(input OutboxListInput) []validatex.Issue {
	issues := []validatex.Issue{}
	if input.Limit < 0 || input.Limit > 100 {
		issues = append(issues, validatex.Issue{Path: []any{"limit"}, Code: "custom", Message: "limit must be between 1 and 100"})
	}
	if input.Offset < 0 {
		issues = append(issues, validatex.Issue{Path: []any{"offset"}, Code: "custom", Message: "offset must be 0 or greater"})
	}
	if input.Status != nil {
		status := strings.ToLower(strings.TrimSpace(*input.Status))
		switch status {
		case "pending", "processing", "processed", "failed":
		default:
			issues = append(issues, validatex.Issue{Path: []any{"status"}, Code: "invalid_enum", Message: "invalid outbox status"})
		}
	}
	return issues
}

func normalizeOutboxStatusPtr(value *string) *string {
	if value == nil {
		return nil
	}
	normalized := strings.ToLower(strings.TrimSpace(*value))
	if normalized == "" {
		return nil
	}
	return &normalized
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
	if input.DiveConditionRegions != nil && len(*input.DiveConditionRegions) > 20 {
		issues = append(issues, validatex.Issue{
			Path:    []any{"diveConditionRegions"},
			Code:    "too_many",
			Message: "select up to 20 alert regions",
		})
	}
	if input.DiveConditionCoarseArea != nil && len(strings.TrimSpace(*input.DiveConditionCoarseArea)) > 120 {
		issues = append(issues, validatex.Issue{
			Path:    []any{"diveConditionCoarseArea"},
			Code:    "too_long",
			Message: "area label is too long",
		})
	}
	return issues
}

func validateRegisterDeviceInput(input RegisterDeviceInput) []validatex.Issue {
	issues := []validatex.Issue{}
	token := strings.TrimSpace(input.ExpoPushToken)
	if token == "" {
		issues = append(issues, validatex.Issue{
			Path:    []any{"expoPushToken"},
			Code:    "required",
			Message: "push token is required",
		})
	} else if len(token) > 255 || (!strings.HasPrefix(token, "ExponentPushToken[") && !strings.HasPrefix(token, "ExpoPushToken[")) {
		issues = append(issues, validatex.Issue{
			Path:    []any{"expoPushToken"},
			Code:    "invalid",
			Message: "push token is invalid",
		})
	}
	if _, ok := toSet("ios", "android", "web", "unknown")[normalizePlatform(input.Platform)]; !ok {
		issues = append(issues, validatex.Issue{
			Path:    []any{"platform"},
			Code:    "invalid_enum",
			Message: "platform is invalid",
		})
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

func normalizeCategory(value string, typ string) string {
	trimmed := strings.ToLower(strings.TrimSpace(value))
	if trimmed != "" {
		return trimmed
	}
	switch strings.TrimSpace(typ) {
	case "MESSAGE":
		return "messages"
	case "EVENT", "EVENT_REMINDER", "EVENT_CREATED_FOR_GROUP", "EVENT_ATTENDEE_JOINED", "EVENT_UPDATED", "EVENT_CANCELLED":
		return "events"
	case "GROUP", "GROUP_INVITE", "GROUP_INVITE_RECEIVED", "GROUP_POST_CREATED":
		return "groups"
	case "CHIKA_THREAD_COMMENTED", "CHIKA_COMMENT_REPLIED":
		return "chika"
	case "INSTRUCTOR_APPLICATION_SUBMITTED", "INSTRUCTOR_APPLICATION_APPROVED", "INSTRUCTOR_APPLICATION_REJECTED":
		return "instructor"
	case "BOOKING", "BOOKING_CREATED", "BOOKING_APPROVED", "BOOKING_REJECTED", "BOOKING_CANCELLED_BY_STUDENT", "BOOKING_CANCELLED_BY_SCHOOL", "BOOKING_RESCHEDULED":
		return "booking"
	case "SESSION_UPDATED", "SESSION_CANCELLED":
		return "session"
	case "NEW_DIVE_SITE_PUBLISHED":
		return "explore"
	default:
		return "system"
	}
}

func safeActorLabel(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "Someone"
	}
	return trimmed
}

func fallbackTitle(value string, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func entityActionURL(module string, slug string) string {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return ""
	}
	return "/" + strings.Trim(strings.TrimSpace(module), "/") + "/" + slug
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

func trimStringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func uniqueUserIDs(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func cleanMetadata(input map[string]any) map[string]any {
	if input == nil {
		return map[string]any{}
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		switch typed := value.(type) {
		case string:
			out[key] = strings.TrimSpace(typed)
		case bool, int, int64, float64:
			out[key] = typed
		default:
			out[key] = typed
		}
	}
	return out
}

func (s *Service) emitCreated(userIDs []string, item Notification) {
	if s.broadcaster == nil || len(userIDs) == 0 {
		return
	}
	s.broadcaster.BroadcastEnvelopeToUsers(userIDs, ws.Envelope{
		Version: 1,
		Type:    "notification.created",
		EventID: uuid.NewString(),
		TS:      time.Now().UTC().Format(time.RFC3339),
		Payload: mapNotificationPayload(item),
	})
}

func mapNotificationPayload(item Notification) map[string]any {
	return map[string]any{
		"id":                item.ID,
		"userId":            item.UserID,
		"type":              item.Type,
		"category":          item.Category,
		"title":             item.Title,
		"message":           item.Message,
		"status":            item.Status,
		"priority":          item.Priority,
		"actorUserId":       item.ActorUserID,
		"relatedEntityType": item.RelatedEntityType,
		"relatedEntityId":   item.RelatedEntityID,
		"actionUrl":         item.ActionURL,
		"metadata":          item.Metadata,
		"createdAt":         item.CreatedAt.Format(time.RFC3339),
		"readAt":            timePtrString(item.ReadAt),
		"seenAt":            timePtrString(item.SeenAt),
		"idempotencyKey":    item.IdempotencyKey,
	}
}

func timePtrString(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format(time.RFC3339)
	return &formatted
}

func mapNotification(input notificationsrepo.Notification) Notification {
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
		ImageURL:          input.ImageURL,
		ActionURL:         input.ActionURL,
		Metadata:          input.Metadata,
		IsEmailSent:       input.IsEmailSent,
		IsPushSent:        input.IsPushSent,
		EmailSentAt:       input.EmailSentAt,
		PushSentAt:        input.PushSentAt,
		ReadAt:            input.ReadAt,
		SeenAt:            input.SeenAt,
		ArchivedAt:        input.ArchivedAt,
		IdempotencyKey:    input.IdempotencyKey,
		CreatedAt:         input.CreatedAt,
		UpdatedAt:         input.UpdatedAt,
	}
}

func mapOutboxItem(input notificationsrepo.NotificationOutbox) OutboxItem {
	return OutboxItem{
		ID:             input.ID,
		EventType:      input.EventType,
		AggregateType:  input.AggregateType,
		AggregateID:    input.AggregateID,
		Status:         input.Status,
		Attempts:       input.Attempts,
		NextRetryAt:    input.NextRetryAt,
		LastError:      input.LastError,
		IdempotencyKey: input.IdempotencyKey,
		Summary:        safeOutboxSummary(input.Payload),
		CreatedAt:      input.CreatedAt,
		UpdatedAt:      input.UpdatedAt,
		ProcessedAt:    input.ProcessedAt,
	}
}

func safeOutboxSummary(payload map[string]any) map[string]any {
	if len(payload) == 0 {
		return nil
	}
	summary := map[string]any{}
	for _, key := range []string{"siteId", "slug", "name", "area"} {
		if value, ok := payload[key]; ok {
			summary[key] = value
		}
	}
	if len(summary) == 0 {
		return nil
	}
	return summary
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
		SessionNotifications:       input.SessionNotifications,
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
		InstructorApplication:      input.InstructorApplication,
		InstructorStatus:           input.InstructorStatus,
		BuddyUpdates:               input.BuddyUpdates,
		ProfileSocialUpdates:       input.ProfileSocialUpdates,
		DiveConditionAlerts:        input.DiveConditionAlerts,
		DiveConditionSavedSites:    input.DiveConditionSavedSites,
		DiveConditionRegions:       append([]string{}, input.DiveConditionRegions...),
		DiveConditionNearMe:        input.DiveConditionNearMe,
		DiveConditionCoarseArea:    input.DiveConditionCoarseArea,
		DigestFrequency:            input.DigestFrequency,
		QuietHoursStart:            input.QuietHoursStart,
		QuietHoursEnd:              input.QuietHoursEnd,
		Timezone:                   input.Timezone,
		CreatedAt:                  input.CreatedAt,
		UpdatedAt:                  input.UpdatedAt,
	}
}

func mapDevicePushToken(input notificationsrepo.DevicePushToken) DevicePushToken {
	return DevicePushToken{
		ID:            input.ID,
		UserID:        input.UserID,
		ExpoPushToken: input.ExpoPushToken,
		Platform:      input.Platform,
		DeviceID:      input.DeviceID,
		DeviceName:    input.DeviceName,
		AppVersion:    input.AppVersion,
		Enabled:       input.Enabled,
		LastSeenAt:    input.LastSeenAt,
		CreatedAt:     input.CreatedAt,
		UpdatedAt:     input.UpdatedAt,
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func normalizePlatform(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "ios", "android", "web":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "unknown"
	}
}

func manageBookingsURL(schoolSlug string) string {
	slug := strings.TrimSpace(schoolSlug)
	if slug == "" {
		return "/management/schools"
	}
	return "/management/schools/" + slug + "/bookings"
}

func manageSessionsURL(schoolSlug string) string {
	slug := strings.TrimSpace(schoolSlug)
	if slug == "" {
		return "/management/schools"
	}
	return "/management/schools/" + slug + "/sessions"
}

func bookingMetadata(input BookingNotificationInput) map[string]any {
	return map[string]any{
		"bookingId":         strings.TrimSpace(input.BookingID),
		"schoolId":          strings.TrimSpace(input.SchoolID),
		"schoolSlug":        strings.TrimSpace(input.SchoolSlug),
		"courseId":          strings.TrimSpace(input.CourseID),
		"courseTitle":       strings.TrimSpace(input.CourseTitle),
		"sessionId":         strings.TrimSpace(input.SessionID),
		"sessionTitle":      strings.TrimSpace(input.SessionTitle),
		"studentUserId":     strings.TrimSpace(input.StudentUserID),
		"studentName":       strings.TrimSpace(input.StudentName),
		"status":            strings.TrimSpace(input.Status),
		"previousSessionId": strings.TrimSpace(input.PreviousSession),
		"notificationV1":    true,
	}
}

func sessionMetadata(input SessionNotificationInput) map[string]any {
	return map[string]any{
		"sessionId":        strings.TrimSpace(input.SessionID),
		"schoolId":         strings.TrimSpace(input.SchoolID),
		"schoolSlug":       strings.TrimSpace(input.SchoolSlug),
		"courseId":         strings.TrimSpace(input.CourseID),
		"courseTitle":      strings.TrimSpace(input.CourseTitle),
		"title":            strings.TrimSpace(input.Title),
		"status":           strings.TrimSpace(input.Status),
		"changeTypes":      input.ChangeTypes,
		"previousStatus":   strings.TrimSpace(input.PreviousStatus),
		"previousStartsAt": strings.TrimSpace(input.PreviousStartsAt),
		"previousEndsAt":   strings.TrimSpace(input.PreviousEndsAt),
		"notificationV1":   true,
	}
}

func bookingSessionKey(input BookingNotificationInput) string {
	key := strings.TrimSpace(input.SessionID)
	if key == "" {
		key = "unassigned"
	}
	return key
}

func sessionChangeKey(input SessionNotificationInput) string {
	items := input.ChangeTypes
	if len(items) == 0 {
		items = []string{"changed"}
	}
	return strings.Join(items, "-") + ":" + defaultString(strings.TrimSpace(input.Status), "status")
}

func bookingNotificationInputFromPayload(payload map[string]any) BookingNotificationInput {
	return BookingNotificationInput{
		BookingID:       payloadString(payload, "bookingId"),
		SchoolID:        payloadString(payload, "schoolId"),
		SchoolSlug:      payloadString(payload, "schoolSlug"),
		CourseID:        payloadString(payload, "courseId"),
		CourseTitle:     payloadString(payload, "courseTitle"),
		SessionID:       payloadString(payload, "sessionId"),
		SessionTitle:    payloadString(payload, "sessionTitle"),
		StudentUserID:   payloadString(payload, "studentUserId"),
		StudentName:     payloadString(payload, "studentName"),
		ActorUserID:     payloadString(payload, "actorUserId"),
		Status:          payloadString(payload, "status"),
		PreviousSession: payloadString(payload, "previousSessionId"),
	}
}

func validateBookingOutboxInput(input BookingNotificationInput) error {
	if strings.TrimSpace(input.BookingID) == "" || strings.TrimSpace(input.SchoolID) == "" {
		return fmt.Errorf("booking outbox payload is missing required fields")
	}
	return nil
}

func sessionNotificationInputFromPayload(payload map[string]any) SessionNotificationInput {
	return SessionNotificationInput{
		SessionID:        payloadString(payload, "sessionId"),
		SchoolID:         payloadString(payload, "schoolId"),
		SchoolSlug:       payloadString(payload, "schoolSlug"),
		CourseID:         payloadString(payload, "courseId"),
		CourseTitle:      payloadString(payload, "courseTitle"),
		Title:            payloadString(payload, "title"),
		ActorUserID:      payloadString(payload, "actorUserId"),
		Status:           payloadString(payload, "status"),
		ChangeTypes:      payloadStringSlice(payload, "changeTypes"),
		PreviousStatus:   payloadString(payload, "previousStatus"),
		PreviousStartsAt: payloadString(payload, "previousStartsAt"),
		PreviousEndsAt:   payloadString(payload, "previousEndsAt"),
	}
}

func toSet(values ...string) map[string]struct{} {
	items := make(map[string]struct{}, len(values))
	for _, value := range values {
		items[value] = struct{}{}
	}
	return items
}
