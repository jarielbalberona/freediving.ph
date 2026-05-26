package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

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
	Deduplicated      bool
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

type PushDeliveryTarget struct {
	Notification Notification
	DeviceToken  DevicePushToken
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

type ListInput struct {
	UserID   string
	Limit    int
	Offset   int
	Status   *string
	Type     *string
	Priority *string
}

type SettingsUpdateInput struct {
	EmailEnabled               *bool
	PushEnabled                *bool
	InAppEnabled               *bool
	SystemNotifications        *bool
	MessageNotifications       *bool
	EventNotifications         *bool
	GroupNotifications         *bool
	ServiceNotifications       *bool
	BookingNotifications       *bool
	SessionNotifications       *bool
	ReviewNotifications        *bool
	MentionNotifications       *bool
	LikeNotifications          *bool
	CommentNotifications       *bool
	FriendRequestNotifications *bool
	GroupInviteNotifications   *bool
	EventReminderNotifications *bool
	PaymentNotifications       *bool
	SecurityNotifications      *bool
	NewDiveSitePublished       *bool
	ChikaReplies               *bool
	InstructorApplication      *bool
	InstructorStatus           *bool
	BuddyUpdates               *bool
	ProfileSocialUpdates       *bool
	DiveConditionAlerts        *bool
	DiveConditionSavedSites    *bool
	DiveConditionRegions       *[]string
	DiveConditionNearMe        *bool
	DiveConditionCoarseArea    *string
	DigestFrequency            *string
	QuietHoursStart            *string
	QuietHoursEnd              *string
	Timezone                   *string
}

type RegisterDeviceInput struct {
	UserID        string
	ExpoPushToken string
	Platform      string
	DeviceID      *string
	DeviceName    *string
	AppVersion    *string
}

const (
	OutboxEventNewDiveSitePublished           = "NEW_DIVE_SITE_PUBLISHED"
	OutboxEventDiveSiteSubmittedForReview     = "DIVE_SITE_SUBMITTED_FOR_REVIEW"
	OutboxEventInstructorApplicationSubmitted = "INSTRUCTOR_APPLICATION_SUBMITTED"
	OutboxEventInstructorApplicationApproved  = "INSTRUCTOR_APPLICATION_APPROVED"
	OutboxEventInstructorApplicationRejected  = "INSTRUCTOR_APPLICATION_REJECTED"
	OutboxEventBookingCreated                 = "BOOKING_CREATED"
	OutboxEventBookingApproved                = "BOOKING_APPROVED"
	OutboxEventBookingRejected                = "BOOKING_REJECTED"
	OutboxEventBookingCancelledByStudent      = "BOOKING_CANCELLED_BY_STUDENT"
	OutboxEventBookingCancelledBySchool       = "BOOKING_CANCELLED_BY_SCHOOL"
	OutboxEventBookingRescheduled             = "BOOKING_RESCHEDULED"
	OutboxEventSessionUpdated                 = "SESSION_UPDATED"
	OutboxEventSessionCancelled               = "SESSION_CANCELLED"
)

type NotificationOutbox struct {
	ID             string
	EventType      string
	AggregateType  string
	AggregateID    string
	Payload        map[string]any
	Status         string
	Attempts       int
	NextRetryAt    time.Time
	LastError      *string
	IdempotencyKey string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	ProcessedAt    *time.Time
}

type OutboxEnqueueInput struct {
	EventType      string
	AggregateType  string
	AggregateID    string
	Payload        map[string]any
	IdempotencyKey string
}

type OutboxListInput struct {
	Status *string
	Limit  int
	Offset int
}

type outboxExecutor interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) RegisterDevice(ctx context.Context, input RegisterDeviceInput) (DevicePushToken, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO device_push_tokens (
			user_id,
			expo_push_token,
			platform,
			device_id,
			device_name,
			app_version
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (expo_push_token) DO UPDATE
		SET
			user_id = EXCLUDED.user_id,
			platform = EXCLUDED.platform,
			device_id = EXCLUDED.device_id,
			device_name = EXCLUDED.device_name,
			app_version = EXCLUDED.app_version,
			enabled = TRUE,
			last_seen_at = NOW(),
			updated_at = NOW()
		RETURNING
			id::text,
			user_id::text,
			expo_push_token,
			platform,
			device_id,
			device_name,
			app_version,
			enabled,
			last_seen_at,
			created_at,
			updated_at
	`,
		strings.TrimSpace(input.UserID),
		strings.TrimSpace(input.ExpoPushToken),
		normalizeDevicePlatform(input.Platform),
		trimStringPtr(input.DeviceID),
		trimStringPtr(input.DeviceName),
		trimStringPtr(input.AppVersion),
	)
	return scanDevicePushTokenRow(row)
}

func (r *Repo) DeleteDeviceForUser(ctx context.Context, userID, deviceID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE device_push_tokens
		SET
			enabled = FALSE,
			updated_at = NOW()
		WHERE id = $1::uuid
		  AND user_id = $2::uuid
	`, strings.TrimSpace(deviceID), strings.TrimSpace(userID))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) ListPushDeliveryTargetsForOutbox(ctx context.Context, outboxIdempotencyKey string) ([]PushDeliveryTarget, error) {
	prefix := strings.TrimSpace(outboxIdempotencyKey)
	if prefix == "" {
		return nil, nil
	}
	rows, err := r.pool.Query(ctx, `
		SELECT
			n.id,
			n.user_id::text,
			n.type::text,
			n.category,
			n.title,
			n.message,
			n.status::text,
			n.priority::text,
			n.actor_user_id::text,
			n.related_user_id::text,
			n.related_entity_type,
			n.related_entity_id,
			n.image_url,
			n.action_url,
			n.metadata,
			n.is_email_sent,
			n.is_push_sent,
			n.email_sent_at,
			n.push_sent_at,
			n.read_at,
			n.seen_at,
			n.archived_at,
			n.idempotency_key,
			n.created_at,
			n.updated_at,
			d.id::text,
			d.user_id::text,
			d.expo_push_token,
			d.platform,
			d.device_id,
			d.device_name,
			d.app_version,
			d.enabled,
			d.last_seen_at,
			d.created_at,
			d.updated_at
		FROM notifications n
		JOIN device_push_tokens d ON d.user_id = n.user_id AND d.enabled = TRUE
		LEFT JOIN notification_settings ns ON ns.user_id = n.user_id
		WHERE n.idempotency_key LIKE $1 || ':%'
		  AND n.status <> 'DELETED'
		  AND n.is_push_sent = FALSE
		  AND COALESCE(ns.push_enabled, TRUE) = TRUE
		  AND CASE
			WHEN n.category = 'chika' THEN COALESCE(ns.chika_replies, TRUE)
			WHEN n.category = 'events' THEN COALESCE(ns.event_notifications, TRUE)
			WHEN n.category = 'groups' THEN COALESCE(ns.group_notifications, TRUE)
			WHEN n.category = 'booking' THEN COALESCE(ns.booking_notifications, TRUE)
			WHEN n.category = 'session' THEN COALESCE(ns.session_notifications, TRUE)
			WHEN n.category = 'service' THEN COALESCE(ns.service_notifications, TRUE)
			WHEN n.type::text = 'NEW_DIVE_SITE_PUBLISHED' THEN COALESCE(ns.new_dive_site_published, TRUE)
			WHEN n.type::text LIKE 'INSTRUCTOR_APPLICATION_%' THEN COALESCE(ns.instructor_application_notifications, TRUE)
			ELSE TRUE
		  END
		ORDER BY n.id ASC, d.created_at ASC
	`, prefix)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	targets := make([]PushDeliveryTarget, 0)
	for rows.Next() {
		target, scanErr := scanPushDeliveryTargetRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		targets = append(targets, target)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return targets, nil
}

func (r *Repo) MarkNotificationPushSent(ctx context.Context, notificationID int64) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE notifications
		SET
			is_push_sent = TRUE,
			push_sent_at = COALESCE(push_sent_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
	`, notificationID)
	return err
}

func (r *Repo) DisablePushToken(ctx context.Context, expoPushToken string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE device_push_tokens
		SET enabled = FALSE, updated_at = NOW()
		WHERE expo_push_token = $1
	`, strings.TrimSpace(expoPushToken))
	return err
}

func (r *Repo) EnqueueOutbox(ctx context.Context, input OutboxEnqueueInput) (NotificationOutbox, error) {
	return EnqueueOutboxWithExecutor(ctx, r.pool, input)
}

func EnqueueOutboxWithExecutor(ctx context.Context, exec outboxExecutor, input OutboxEnqueueInput) (NotificationOutbox, error) {
	if strings.TrimSpace(input.EventType) == "" || strings.TrimSpace(input.AggregateType) == "" || strings.TrimSpace(input.AggregateID) == "" || strings.TrimSpace(input.IdempotencyKey) == "" {
		return NotificationOutbox{}, fmt.Errorf("notification outbox event requires event type, aggregate, and idempotency key")
	}
	payload := input.Payload
	if payload == nil {
		payload = map[string]any{}
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return NotificationOutbox{}, fmt.Errorf("marshal notification outbox payload: %w", err)
	}

	row := exec.QueryRow(ctx, `
		INSERT INTO notification_outbox (
			event_type,
			aggregate_type,
			aggregate_id,
			payload,
			idempotency_key
		) VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (idempotency_key) DO UPDATE
		SET updated_at = notification_outbox.updated_at
		RETURNING
			id::text,
			event_type,
			aggregate_type,
			aggregate_id::text,
			payload,
			status,
			attempts,
			next_retry_at,
			last_error,
			idempotency_key,
			created_at,
			updated_at,
			processed_at
	`,
		strings.TrimSpace(input.EventType),
		strings.TrimSpace(input.AggregateType),
		strings.TrimSpace(input.AggregateID),
		payloadJSON,
		strings.TrimSpace(input.IdempotencyKey),
	)
	return scanOutboxRow(row)
}

func (r *Repo) ClaimPendingOutbox(ctx context.Context, now time.Time, limit int) ([]NotificationOutbox, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := r.pool.Query(ctx, `
		WITH due AS (
			SELECT id
			FROM notification_outbox
			WHERE (
				status = 'pending'
				AND next_retry_at <= $1
			) OR (
				status = 'processing'
				AND updated_at <= $1::timestamptz - INTERVAL '15 minutes'
			)
			ORDER BY next_retry_at ASC, created_at ASC
			LIMIT $2
			FOR UPDATE SKIP LOCKED
		)
		UPDATE notification_outbox outbox
		SET
			status = 'processing',
			attempts = attempts + 1,
			last_error = NULL,
			updated_at = NOW()
		FROM due
		WHERE outbox.id = due.id
		RETURNING
			outbox.id::text,
			outbox.event_type,
			outbox.aggregate_type,
			outbox.aggregate_id::text,
			outbox.payload,
			outbox.status,
			outbox.attempts,
			outbox.next_retry_at,
			outbox.last_error,
			outbox.idempotency_key,
			outbox.created_at,
			outbox.updated_at,
			outbox.processed_at
	`, now, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]NotificationOutbox, 0)
	for rows.Next() {
		item, scanErr := scanOutboxRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) ListOutbox(ctx context.Context, input OutboxListInput) ([]NotificationOutbox, error) {
	limit := input.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	offset := input.Offset
	if offset < 0 {
		offset = 0
	}

	status := strings.TrimSpace(valueOrEmpty(input.Status))
	where := "status IN ('failed', 'pending')"
	args := []any{limit, offset}
	if status != "" {
		where = "status = $3"
		args = append(args, status)
	}

	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT
			id::text,
			event_type,
			aggregate_type,
			aggregate_id::text,
			payload,
			status,
			attempts,
			next_retry_at,
			last_error,
			idempotency_key,
			created_at,
			updated_at,
			processed_at
		FROM notification_outbox
		WHERE %s
		ORDER BY created_at DESC, id DESC
		LIMIT $1 OFFSET $2
	`, where), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]NotificationOutbox, 0)
	for rows.Next() {
		item, scanErr := scanOutboxRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return items, nil
}

func (r *Repo) RetryOutbox(ctx context.Context, id string, now time.Time) (NotificationOutbox, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE notification_outbox
		SET
			status = 'pending',
			next_retry_at = $2,
			last_error = NULL,
			updated_at = NOW()
		WHERE id = $1
		  AND (
			status = 'failed'
			OR (
				status = 'processing'
				AND updated_at <= $2::timestamptz - INTERVAL '15 minutes'
			)
		  )
		RETURNING
			id::text,
			event_type,
			aggregate_type,
			aggregate_id::text,
			payload,
			status,
			attempts,
			next_retry_at,
			last_error,
			idempotency_key,
			created_at,
			updated_at,
			processed_at
	`, strings.TrimSpace(id), now)
	return scanOutboxRow(row)
}

func (r *Repo) MarkOutboxProcessed(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE notification_outbox
		SET
			status = 'processed',
			processed_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		  AND status = 'processing'
	`, strings.TrimSpace(id))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) MarkOutboxRetry(ctx context.Context, id string, nextRetryAt time.Time, lastError string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE notification_outbox
		SET
			status = 'pending',
			next_retry_at = $2,
			last_error = $3,
			updated_at = NOW()
		WHERE id = $1
		  AND status = 'processing'
	`, strings.TrimSpace(id), nextRetryAt, truncateError(lastError))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) MarkOutboxFailed(ctx context.Context, id string, lastError string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE notification_outbox
		SET
			status = 'failed',
			last_error = $2,
			updated_at = NOW()
		WHERE id = $1
		  AND status = 'processing'
	`, strings.TrimSpace(id), truncateError(lastError))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) Create(ctx context.Context, input CreateInput) (Notification, error) {
	metadata := input.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return Notification{}, fmt.Errorf("marshal notification metadata: %w", err)
	}

	row := r.pool.QueryRow(ctx, `
			INSERT INTO notifications (
				user_id,
				type,
				category,
				title,
				message,
				priority,
				actor_user_id,
				related_user_id,
				related_entity_type,
				related_entity_id,
				image_url,
				action_url,
				metadata,
				idempotency_key
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
			ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
			DO NOTHING
			RETURNING
				id,
				user_id::text,
				type::text,
				category,
				title,
				message,
				status::text,
				priority::text,
				actor_user_id::text,
				related_user_id::text,
				related_entity_type,
				related_entity_id,
			image_url,
			action_url,
			metadata,
			is_email_sent,
			is_push_sent,
				email_sent_at,
				push_sent_at,
				read_at,
				seen_at,
				archived_at,
				idempotency_key,
				created_at,
				updated_at
		`,
		input.UserID,
		input.Type,
		input.Category,
		input.Title,
		input.Message,
		input.Priority,
		input.ActorUserID,
		input.RelatedUserID,
		input.RelatedEntityType,
		input.RelatedEntityID,
		input.ImageURL,
		input.ActionURL,
		metadataJSON,
		input.IdempotencyKey,
	)
	item, err := scanNotificationRow(row)
	if err != nil {
		if IsNoRows(err) && input.IdempotencyKey != nil && strings.TrimSpace(*input.IdempotencyKey) != "" {
			existing, getErr := r.GetByIdempotencyKey(ctx, input.UserID, strings.TrimSpace(*input.IdempotencyKey))
			if getErr != nil {
				return Notification{}, getErr
			}
			existing.Deduplicated = true
			return existing, nil
		}
		return Notification{}, err
	}
	return item, nil
}

func (r *Repo) GetByIdempotencyKey(ctx context.Context, userID, idempotencyKey string) (Notification, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT
			id,
			user_id::text,
			type::text,
			category,
			title,
			message,
			status::text,
			priority::text,
			actor_user_id::text,
			related_user_id::text,
			related_entity_type,
			related_entity_id,
			image_url,
			action_url,
			metadata,
			is_email_sent,
			is_push_sent,
			email_sent_at,
			push_sent_at,
			read_at,
			seen_at,
			archived_at,
			idempotency_key,
			created_at,
			updated_at
		FROM notifications
		WHERE user_id = $1
		  AND idempotency_key = $2
		  AND status <> 'DELETED'
	`, userID, idempotencyKey)
	return scanNotificationRow(row)
}

func (r *Repo) ListByUser(ctx context.Context, input ListInput) ([]Notification, error) {
	args := []any{input.UserID}
	conditions := []string{"user_id = $1", "status <> 'DELETED'"}
	argPos := 2

	if input.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argPos))
		args = append(args, *input.Status)
		argPos++
	}
	if input.Type != nil {
		conditions = append(conditions, fmt.Sprintf("type = $%d", argPos))
		args = append(args, *input.Type)
		argPos++
	}
	if input.Priority != nil {
		conditions = append(conditions, fmt.Sprintf("priority = $%d", argPos))
		args = append(args, *input.Priority)
		argPos++
	}

	limitPos := argPos
	offsetPos := argPos + 1
	args = append(args, input.Limit, input.Offset)

	query := fmt.Sprintf(`
		SELECT
				id,
				user_id::text,
				type::text,
				category,
				title,
				message,
				status::text,
				priority::text,
				actor_user_id::text,
				related_user_id::text,
			related_entity_type,
			related_entity_id,
			image_url,
			action_url,
			metadata,
			is_email_sent,
			is_push_sent,
				email_sent_at,
				push_sent_at,
				read_at,
				seen_at,
				archived_at,
				idempotency_key,
				created_at,
				updated_at
		FROM notifications
		WHERE %s
		ORDER BY created_at DESC, id DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(conditions, " AND "), limitPos, offsetPos)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Notification, 0)
	for rows.Next() {
		item, scanErr := scanNotificationRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return items, nil
}

func (r *Repo) GetByIDForUser(ctx context.Context, userID string, notificationID int64) (Notification, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT
				id,
				user_id::text,
				type::text,
				category,
				title,
				message,
				status::text,
				priority::text,
				actor_user_id::text,
				related_user_id::text,
			related_entity_type,
			related_entity_id,
			image_url,
			action_url,
			metadata,
			is_email_sent,
			is_push_sent,
				email_sent_at,
				push_sent_at,
				read_at,
				seen_at,
				archived_at,
				idempotency_key,
				created_at,
				updated_at
		FROM notifications
		WHERE id = $1 AND user_id = $2 AND status <> 'DELETED'
	`, notificationID, userID)
	return scanNotificationRow(row)
}

func (r *Repo) MarkReadForUser(ctx context.Context, userID string, notificationID int64) (Notification, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE notifications
		SET
			status = 'READ',
			read_at = COALESCE(read_at, NOW()),
			updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND status <> 'DELETED'
		RETURNING
				id,
				user_id::text,
				type::text,
				category,
				title,
				message,
				status::text,
				priority::text,
				actor_user_id::text,
				related_user_id::text,
			related_entity_type,
			related_entity_id,
			image_url,
			action_url,
			metadata,
			is_email_sent,
			is_push_sent,
				email_sent_at,
				push_sent_at,
				read_at,
				seen_at,
				archived_at,
				idempotency_key,
				created_at,
				updated_at
	`, notificationID, userID)
	return scanNotificationRow(row)
}

func (r *Repo) MarkAllReadForUser(ctx context.Context, userID string) (int64, error) {
	result, err := r.pool.Exec(ctx, `
		UPDATE notifications
		SET
			status = 'READ',
			read_at = COALESCE(read_at, NOW()),
			updated_at = NOW()
		WHERE user_id = $1 AND status = 'UNREAD'
	`, userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func (r *Repo) DeleteForUser(ctx context.Context, userID string, notificationID int64) error {
	row := r.pool.QueryRow(ctx, `
		UPDATE notifications
		SET
			status = 'DELETED',
			updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND status <> 'DELETED'
		RETURNING id
	`, notificationID, userID)

	var id int64
	if err := row.Scan(&id); err != nil {
		return err
	}
	return nil
}

func (r *Repo) CountByStatusForUser(ctx context.Context, userID string, status string) (int64, error) {
	var count int64
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::bigint
		FROM notifications
		WHERE user_id = $1 AND status = $2
	`, userID, status).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *Repo) CountVisibleForUser(ctx context.Context, userID string) (int64, error) {
	var count int64
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::bigint
		FROM notifications
		WHERE user_id = $1 AND status <> 'DELETED'
	`, userID).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *Repo) ListActiveExploreModeratorRecipients(ctx context.Context, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id::text
		FROM users u
		LEFT JOIN notification_settings ns ON ns.user_id = u.id
		WHERE u.account_status = 'active'
		  AND u.global_role IN ('moderator', 'admin', 'super_admin')
		  AND (NULLIF($1, '') IS NULL OR u.id <> $1::uuid)
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.system_notifications, TRUE) = TRUE
		ORDER BY
		  CASE u.global_role
		    WHEN 'super_admin' THEN 0
		    WHEN 'admin' THEN 1
		    ELSE 2
		  END,
		  u.created_at ASC,
		  u.id ASC
	`, strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) ListActiveInstructorReviewerRecipients(ctx context.Context, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id::text
		FROM users u
		LEFT JOIN notification_settings ns ON ns.user_id = u.id
		WHERE u.account_status = 'active'
		  AND u.global_role = 'super_admin'
		  AND (NULLIF($1, '') IS NULL OR u.id <> $1::uuid)
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.instructor_application_notifications, TRUE) = TRUE
		ORDER BY u.created_at ASC, u.id ASC
	`, strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) ListActiveNewDiveSiteRecipients(ctx context.Context, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id::text
		FROM users u
		LEFT JOIN notification_settings ns ON ns.user_id = u.id
		WHERE u.account_status = 'active'
		  AND (NULLIF($1, '') IS NULL OR u.id <> $1::uuid)
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.new_dive_site_published, TRUE) = TRUE
		ORDER BY u.created_at ASC, u.id ASC
	`, strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return ids, nil
}

func (r *Repo) ChikaRepliesEnabled(ctx context.Context, userID string) (bool, error) {
	return r.settingEnabled(ctx, userID, "chika_replies")
}

func (r *Repo) EventNotificationsEnabled(ctx context.Context, userID string) (bool, error) {
	return r.settingEnabled(ctx, userID, "event_notifications")
}

func (r *Repo) GroupInviteNotificationsEnabled(ctx context.Context, userID string) (bool, error) {
	return r.settingEnabled(ctx, userID, "group_invite_notifications")
}

func (r *Repo) InstructorStatusNotificationsEnabled(ctx context.Context, userID string) (bool, error) {
	return r.settingEnabled(ctx, userID, "instructor_status_notifications")
}

func (r *Repo) ListGroupPostRecipients(ctx context.Context, groupID, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT gm.user_id::text
		FROM group_memberships gm
		JOIN users u ON u.id = gm.user_id
		LEFT JOIN notification_settings ns ON ns.user_id = gm.user_id
		WHERE gm.group_id = $1::uuid
		  AND gm.status = 'active'
		  AND (NULLIF($2, '') IS NULL OR gm.user_id <> $2::uuid)
		  AND u.account_status = 'active'
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.group_notifications, TRUE) = TRUE
		ORDER BY gm.joined_at ASC NULLS LAST, gm.created_at ASC, gm.user_id ASC
	`, strings.TrimSpace(groupID), strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) ListGroupEventRecipients(ctx context.Context, groupID, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT gm.user_id::text
		FROM group_memberships gm
		JOIN users u ON u.id = gm.user_id
		LEFT JOIN notification_settings ns ON ns.user_id = gm.user_id
		WHERE gm.group_id = $1::uuid
		  AND gm.status = 'active'
		  AND (NULLIF($2, '') IS NULL OR gm.user_id <> $2::uuid)
		  AND u.account_status = 'active'
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.event_notifications, TRUE) = TRUE
		ORDER BY gm.joined_at ASC NULLS LAST, gm.created_at ASC, gm.user_id ASC
	`, strings.TrimSpace(groupID), strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) ListEventAttendeeRecipients(ctx context.Context, eventID, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT em.user_id::text
		FROM event_memberships em
		JOIN users u ON u.id = em.user_id
		LEFT JOIN notification_settings ns ON ns.user_id = em.user_id
		WHERE em.event_id = $1::uuid
		  AND em.status = 'active'
		  AND (NULLIF($2, '') IS NULL OR em.user_id <> $2::uuid)
		  AND u.account_status = 'active'
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.event_notifications, TRUE) = TRUE
		ORDER BY em.joined_at ASC NULLS LAST, em.user_id ASC
	`, strings.TrimSpace(eventID), strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) ListActiveSchoolBookingManagerRecipients(ctx context.Context, schoolID, sessionID, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		WITH recipients AS (
			SELECT sm.user_id
			FROM school_members sm
			WHERE sm.school_id = $1::uuid
			  AND sm.status = 'active'
			  AND sm.deleted_at IS NULL
			  AND sm.role IN ('owner', 'admin')
			UNION
			SELECT cs.instructor_user_id
			FROM course_sessions cs
			JOIN school_members sm ON sm.school_id = cs.school_id
				AND sm.user_id = cs.instructor_user_id
				AND sm.status = 'active'
				AND sm.deleted_at IS NULL
			WHERE cs.school_id = $1::uuid
			  AND cs.deleted_at IS NULL
			  AND NULLIF($2, '') IS NOT NULL
			  AND cs.id = $2::uuid
			  AND cs.instructor_user_id IS NOT NULL
		)
		SELECT r.user_id::text
		FROM recipients r
		JOIN users u ON u.id = r.user_id
		LEFT JOIN notification_settings ns ON ns.user_id = r.user_id
		WHERE u.account_status = 'active'
		  AND (NULLIF($3, '') IS NULL OR r.user_id <> $3::uuid)
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.booking_notifications, TRUE) = TRUE
		ORDER BY r.user_id ASC
	`, strings.TrimSpace(schoolID), strings.TrimSpace(sessionID), strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) ListActiveBookingStudentRecipients(ctx context.Context, bookingID, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT b.student_user_id::text
		FROM course_booking_requests b
		JOIN users u ON u.id = b.student_user_id
		LEFT JOIN notification_settings ns ON ns.user_id = b.student_user_id
		WHERE b.id = $1::uuid
		  AND b.deleted_at IS NULL
		  AND b.student_user_id IS NOT NULL
		  AND u.account_status = 'active'
		  AND (NULLIF($2, '') IS NULL OR b.student_user_id <> $2::uuid)
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.booking_notifications, TRUE) = TRUE
		ORDER BY b.student_user_id ASC
	`, strings.TrimSpace(bookingID), strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) ListActiveSessionStudentRecipients(ctx context.Context, sessionID, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT b.student_user_id::text AS user_id
		FROM course_booking_requests b
		JOIN users u ON u.id = b.student_user_id
		LEFT JOIN notification_settings ns ON ns.user_id = b.student_user_id
		WHERE b.session_id = $1::uuid
		  AND b.deleted_at IS NULL
		  AND b.student_user_id IS NOT NULL
		  AND b.status NOT IN ('cancelled', 'rejected', 'completed')
		  AND u.account_status = 'active'
		  AND (NULLIF($2, '') IS NULL OR b.student_user_id <> $2::uuid)
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.session_notifications, TRUE) = TRUE
		ORDER BY user_id ASC
	`, strings.TrimSpace(sessionID), strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) ListActiveSessionManagerRecipients(ctx context.Context, schoolID, sessionID, excludeUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		WITH recipients AS (
			SELECT sm.user_id
			FROM school_members sm
			WHERE sm.school_id = $1::uuid
			  AND sm.status = 'active'
			  AND sm.deleted_at IS NULL
			  AND sm.role IN ('owner', 'admin')
			UNION
			SELECT cs.instructor_user_id
			FROM course_sessions cs
			JOIN school_members sm ON sm.school_id = cs.school_id
				AND sm.user_id = cs.instructor_user_id
				AND sm.status = 'active'
				AND sm.deleted_at IS NULL
			WHERE cs.school_id = $1::uuid
			  AND cs.id = $2::uuid
			  AND cs.deleted_at IS NULL
			  AND cs.instructor_user_id IS NOT NULL
		)
		SELECT r.user_id::text
		FROM recipients r
		JOIN users u ON u.id = r.user_id
		LEFT JOIN notification_settings ns ON ns.user_id = r.user_id
		WHERE u.account_status = 'active'
		  AND (NULLIF($3, '') IS NULL OR r.user_id <> $3::uuid)
		  AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
		  AND COALESCE(ns.session_notifications, TRUE) = TRUE
		ORDER BY r.user_id ASC
	`, strings.TrimSpace(schoolID), strings.TrimSpace(sessionID), strings.TrimSpace(excludeUserID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserIDs(rows)
}

func (r *Repo) settingEnabled(ctx context.Context, userID string, column string) (bool, error) {
	switch column {
	case "chika_replies", "event_notifications", "group_invite_notifications", "instructor_status_notifications":
	default:
		return false, fmt.Errorf("unsupported notification setting column %q", column)
	}
	var enabled bool
	err := r.pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT
			u.account_status = 'active'
			AND COALESCE(ns.in_app_enabled, TRUE) = TRUE
			AND COALESCE(ns.%s, TRUE) = TRUE
		FROM users u
		LEFT JOIN notification_settings ns ON ns.user_id = u.id
		WHERE u.id = $1::uuid
	`, column), strings.TrimSpace(userID)).Scan(&enabled)
	return enabled, err
}

func (r *Repo) GetSettingsForUser(ctx context.Context, userID string) (NotificationSettings, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT
			id::text,
			user_id::text,
			email_enabled,
			push_enabled,
			in_app_enabled,
			system_notifications,
			message_notifications,
			event_notifications,
			group_notifications,
			service_notifications,
			booking_notifications,
			session_notifications,
			review_notifications,
			mention_notifications,
			like_notifications,
			comment_notifications,
			friend_request_notifications,
			group_invite_notifications,
				event_reminder_notifications,
				payment_notifications,
				security_notifications,
				new_dive_site_published,
				chika_replies,
				instructor_application_notifications,
				instructor_status_notifications,
				buddy_updates,
				profile_social_updates,
				dive_condition_alerts,
				dive_condition_saved_sites,
				dive_condition_regions,
				dive_condition_near_me,
				dive_condition_coarse_area,
				digest_frequency::text,
			quiet_hours_start,
			quiet_hours_end,
			timezone,
			created_at,
			updated_at
		FROM notification_settings
		WHERE user_id = $1
	`, userID)
	return scanSettingsRow(row)
}

func (r *Repo) CreateDefaultSettingsForUser(ctx context.Context, userID string) (NotificationSettings, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO notification_settings (user_id)
		VALUES ($1)
		ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
		RETURNING
			id::text,
			user_id::text,
			email_enabled,
			push_enabled,
			in_app_enabled,
			system_notifications,
			message_notifications,
			event_notifications,
			group_notifications,
			service_notifications,
			booking_notifications,
			session_notifications,
			review_notifications,
			mention_notifications,
			like_notifications,
			comment_notifications,
			friend_request_notifications,
			group_invite_notifications,
				event_reminder_notifications,
				payment_notifications,
				security_notifications,
				new_dive_site_published,
				chika_replies,
				instructor_application_notifications,
				instructor_status_notifications,
				buddy_updates,
				profile_social_updates,
				dive_condition_alerts,
				dive_condition_saved_sites,
				dive_condition_regions,
				dive_condition_near_me,
				dive_condition_coarse_area,
				digest_frequency::text,
			quiet_hours_start,
			quiet_hours_end,
			timezone,
			created_at,
			updated_at
	`, userID)
	return scanSettingsRow(row)
}

func (r *Repo) UpdateSettingsForUser(ctx context.Context, userID string, input SettingsUpdateInput) (NotificationSettings, error) {
	sets := make([]string, 0)
	args := []any{}
	argPos := 1

	addSet := func(column string, value any) {
		sets = append(sets, fmt.Sprintf("%s = $%d", column, argPos))
		args = append(args, value)
		argPos++
	}

	if input.EmailEnabled != nil {
		addSet("email_enabled", *input.EmailEnabled)
	}
	if input.PushEnabled != nil {
		addSet("push_enabled", *input.PushEnabled)
	}
	if input.InAppEnabled != nil {
		addSet("in_app_enabled", *input.InAppEnabled)
	}
	if input.SystemNotifications != nil {
		addSet("system_notifications", *input.SystemNotifications)
	}
	if input.MessageNotifications != nil {
		addSet("message_notifications", *input.MessageNotifications)
	}
	if input.EventNotifications != nil {
		addSet("event_notifications", *input.EventNotifications)
	}
	if input.GroupNotifications != nil {
		addSet("group_notifications", *input.GroupNotifications)
	}
	if input.ServiceNotifications != nil {
		addSet("service_notifications", *input.ServiceNotifications)
	}
	if input.BookingNotifications != nil {
		addSet("booking_notifications", *input.BookingNotifications)
	}
	if input.SessionNotifications != nil {
		addSet("session_notifications", *input.SessionNotifications)
	}
	if input.ReviewNotifications != nil {
		addSet("review_notifications", *input.ReviewNotifications)
	}
	if input.MentionNotifications != nil {
		addSet("mention_notifications", *input.MentionNotifications)
	}
	if input.LikeNotifications != nil {
		addSet("like_notifications", *input.LikeNotifications)
	}
	if input.CommentNotifications != nil {
		addSet("comment_notifications", *input.CommentNotifications)
	}
	if input.FriendRequestNotifications != nil {
		addSet("friend_request_notifications", *input.FriendRequestNotifications)
	}
	if input.GroupInviteNotifications != nil {
		addSet("group_invite_notifications", *input.GroupInviteNotifications)
	}
	if input.EventReminderNotifications != nil {
		addSet("event_reminder_notifications", *input.EventReminderNotifications)
	}
	if input.PaymentNotifications != nil {
		addSet("payment_notifications", *input.PaymentNotifications)
	}
	if input.SecurityNotifications != nil {
		addSet("security_notifications", *input.SecurityNotifications)
	}
	if input.NewDiveSitePublished != nil {
		addSet("new_dive_site_published", *input.NewDiveSitePublished)
	}
	if input.ChikaReplies != nil {
		addSet("chika_replies", *input.ChikaReplies)
	}
	if input.InstructorApplication != nil {
		addSet("instructor_application_notifications", *input.InstructorApplication)
	}
	if input.InstructorStatus != nil {
		addSet("instructor_status_notifications", *input.InstructorStatus)
	}
	if input.BuddyUpdates != nil {
		addSet("buddy_updates", *input.BuddyUpdates)
	}
	if input.ProfileSocialUpdates != nil {
		addSet("profile_social_updates", *input.ProfileSocialUpdates)
	}
	if input.DiveConditionAlerts != nil {
		addSet("dive_condition_alerts", *input.DiveConditionAlerts)
	}
	if input.DiveConditionSavedSites != nil {
		addSet("dive_condition_saved_sites", *input.DiveConditionSavedSites)
	}
	if input.DiveConditionRegions != nil {
		regionsJSON, err := json.Marshal(cleanStringSlice(*input.DiveConditionRegions))
		if err != nil {
			return NotificationSettings{}, fmt.Errorf("marshal dive condition regions: %w", err)
		}
		addSet("dive_condition_regions", string(regionsJSON))
	}
	if input.DiveConditionNearMe != nil {
		addSet("dive_condition_near_me", *input.DiveConditionNearMe)
	}
	if input.DiveConditionCoarseArea != nil {
		addSet("dive_condition_coarse_area", strings.TrimSpace(*input.DiveConditionCoarseArea))
	}
	if input.DigestFrequency != nil {
		addSet("digest_frequency", *input.DigestFrequency)
	}
	if input.QuietHoursStart != nil {
		addSet("quiet_hours_start", *input.QuietHoursStart)
	}
	if input.QuietHoursEnd != nil {
		addSet("quiet_hours_end", *input.QuietHoursEnd)
	}
	if input.Timezone != nil {
		addSet("timezone", *input.Timezone)
	}

	if len(sets) == 0 {
		return r.GetSettingsForUser(ctx, userID)
	}

	sets = append(sets, "updated_at = NOW()")
	args = append(args, userID)
	wherePos := argPos

	query := fmt.Sprintf(`
		UPDATE notification_settings
		SET %s
		WHERE user_id = $%d
		RETURNING
			id::text,
			user_id::text,
			email_enabled,
			push_enabled,
			in_app_enabled,
			system_notifications,
			message_notifications,
			event_notifications,
			group_notifications,
			service_notifications,
			booking_notifications,
			session_notifications,
			review_notifications,
			mention_notifications,
			like_notifications,
			comment_notifications,
			friend_request_notifications,
			group_invite_notifications,
				event_reminder_notifications,
				payment_notifications,
				security_notifications,
				new_dive_site_published,
				chika_replies,
				instructor_application_notifications,
				instructor_status_notifications,
				buddy_updates,
				profile_social_updates,
				dive_condition_alerts,
				dive_condition_saved_sites,
				dive_condition_regions,
				dive_condition_near_me,
				dive_condition_coarse_area,
				digest_frequency::text,
			quiet_hours_start,
			quiet_hours_end,
			timezone,
			created_at,
			updated_at
	`, strings.Join(sets, ", "), wherePos)

	row := r.pool.QueryRow(ctx, query, args...)
	return scanSettingsRow(row)
}

func IsNoRows(err error) bool {
	return err == pgx.ErrNoRows
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUserIDs(rows pgx.Rows) ([]string, error) {
	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return ids, nil
}

func scanNotificationRow(row rowScanner) (Notification, error) {
	var item Notification
	var metadataRaw []byte
	err := row.Scan(
		&item.ID,
		&item.UserID,
		&item.Type,
		&item.Category,
		&item.Title,
		&item.Message,
		&item.Status,
		&item.Priority,
		&item.ActorUserID,
		&item.RelatedUserID,
		&item.RelatedEntityType,
		&item.RelatedEntityID,
		&item.ImageURL,
		&item.ActionURL,
		&metadataRaw,
		&item.IsEmailSent,
		&item.IsPushSent,
		&item.EmailSentAt,
		&item.PushSentAt,
		&item.ReadAt,
		&item.SeenAt,
		&item.ArchivedAt,
		&item.IdempotencyKey,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return Notification{}, err
	}
	item.Metadata = map[string]any{}
	if len(metadataRaw) > 0 {
		if unmarshalErr := json.Unmarshal(metadataRaw, &item.Metadata); unmarshalErr != nil {
			return Notification{}, fmt.Errorf("unmarshal notification metadata: %w", unmarshalErr)
		}
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	item.EmailSentAt = toUTCPtr(item.EmailSentAt)
	item.PushSentAt = toUTCPtr(item.PushSentAt)
	item.ReadAt = toUTCPtr(item.ReadAt)
	item.SeenAt = toUTCPtr(item.SeenAt)
	item.ArchivedAt = toUTCPtr(item.ArchivedAt)
	return item, nil
}

func scanPushDeliveryTargetRow(row rowScanner) (PushDeliveryTarget, error) {
	var target PushDeliveryTarget
	var metadataRaw []byte
	err := row.Scan(
		&target.Notification.ID,
		&target.Notification.UserID,
		&target.Notification.Type,
		&target.Notification.Category,
		&target.Notification.Title,
		&target.Notification.Message,
		&target.Notification.Status,
		&target.Notification.Priority,
		&target.Notification.ActorUserID,
		&target.Notification.RelatedUserID,
		&target.Notification.RelatedEntityType,
		&target.Notification.RelatedEntityID,
		&target.Notification.ImageURL,
		&target.Notification.ActionURL,
		&metadataRaw,
		&target.Notification.IsEmailSent,
		&target.Notification.IsPushSent,
		&target.Notification.EmailSentAt,
		&target.Notification.PushSentAt,
		&target.Notification.ReadAt,
		&target.Notification.SeenAt,
		&target.Notification.ArchivedAt,
		&target.Notification.IdempotencyKey,
		&target.Notification.CreatedAt,
		&target.Notification.UpdatedAt,
		&target.DeviceToken.ID,
		&target.DeviceToken.UserID,
		&target.DeviceToken.ExpoPushToken,
		&target.DeviceToken.Platform,
		&target.DeviceToken.DeviceID,
		&target.DeviceToken.DeviceName,
		&target.DeviceToken.AppVersion,
		&target.DeviceToken.Enabled,
		&target.DeviceToken.LastSeenAt,
		&target.DeviceToken.CreatedAt,
		&target.DeviceToken.UpdatedAt,
	)
	if err != nil {
		return PushDeliveryTarget{}, err
	}
	target.Notification.Metadata = map[string]any{}
	if len(metadataRaw) > 0 {
		if unmarshalErr := json.Unmarshal(metadataRaw, &target.Notification.Metadata); unmarshalErr != nil {
			return PushDeliveryTarget{}, fmt.Errorf("unmarshal notification metadata: %w", unmarshalErr)
		}
	}
	target.Notification.CreatedAt = target.Notification.CreatedAt.UTC()
	target.Notification.UpdatedAt = target.Notification.UpdatedAt.UTC()
	target.Notification.EmailSentAt = toUTCPtr(target.Notification.EmailSentAt)
	target.Notification.PushSentAt = toUTCPtr(target.Notification.PushSentAt)
	target.Notification.ReadAt = toUTCPtr(target.Notification.ReadAt)
	target.Notification.SeenAt = toUTCPtr(target.Notification.SeenAt)
	target.Notification.ArchivedAt = toUTCPtr(target.Notification.ArchivedAt)
	target.DeviceToken.LastSeenAt = target.DeviceToken.LastSeenAt.UTC()
	target.DeviceToken.CreatedAt = target.DeviceToken.CreatedAt.UTC()
	target.DeviceToken.UpdatedAt = target.DeviceToken.UpdatedAt.UTC()
	return target, nil
}

func scanOutboxRow(row rowScanner) (NotificationOutbox, error) {
	var item NotificationOutbox
	var payloadRaw []byte
	err := row.Scan(
		&item.ID,
		&item.EventType,
		&item.AggregateType,
		&item.AggregateID,
		&payloadRaw,
		&item.Status,
		&item.Attempts,
		&item.NextRetryAt,
		&item.LastError,
		&item.IdempotencyKey,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.ProcessedAt,
	)
	if err != nil {
		return NotificationOutbox{}, err
	}
	item.Payload = map[string]any{}
	if len(payloadRaw) > 0 {
		if unmarshalErr := json.Unmarshal(payloadRaw, &item.Payload); unmarshalErr != nil {
			return NotificationOutbox{}, fmt.Errorf("unmarshal notification outbox payload: %w", unmarshalErr)
		}
	}
	item.NextRetryAt = item.NextRetryAt.UTC()
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	item.ProcessedAt = toUTCPtr(item.ProcessedAt)
	return item, nil
}

func scanDevicePushTokenRow(row rowScanner) (DevicePushToken, error) {
	var item DevicePushToken
	err := row.Scan(
		&item.ID,
		&item.UserID,
		&item.ExpoPushToken,
		&item.Platform,
		&item.DeviceID,
		&item.DeviceName,
		&item.AppVersion,
		&item.Enabled,
		&item.LastSeenAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return DevicePushToken{}, err
	}
	item.LastSeenAt = item.LastSeenAt.UTC()
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return item, nil
}

func scanSettingsRow(row rowScanner) (NotificationSettings, error) {
	var item NotificationSettings
	var regionsRaw []byte
	err := row.Scan(
		&item.ID,
		&item.UserID,
		&item.EmailEnabled,
		&item.PushEnabled,
		&item.InAppEnabled,
		&item.SystemNotifications,
		&item.MessageNotifications,
		&item.EventNotifications,
		&item.GroupNotifications,
		&item.ServiceNotifications,
		&item.BookingNotifications,
		&item.SessionNotifications,
		&item.ReviewNotifications,
		&item.MentionNotifications,
		&item.LikeNotifications,
		&item.CommentNotifications,
		&item.FriendRequestNotifications,
		&item.GroupInviteNotifications,
		&item.EventReminderNotifications,
		&item.PaymentNotifications,
		&item.SecurityNotifications,
		&item.NewDiveSitePublished,
		&item.ChikaReplies,
		&item.InstructorApplication,
		&item.InstructorStatus,
		&item.BuddyUpdates,
		&item.ProfileSocialUpdates,
		&item.DiveConditionAlerts,
		&item.DiveConditionSavedSites,
		&regionsRaw,
		&item.DiveConditionNearMe,
		&item.DiveConditionCoarseArea,
		&item.DigestFrequency,
		&item.QuietHoursStart,
		&item.QuietHoursEnd,
		&item.Timezone,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return NotificationSettings{}, err
	}
	item.DiveConditionRegions = []string{}
	if len(regionsRaw) > 0 {
		if unmarshalErr := json.Unmarshal(regionsRaw, &item.DiveConditionRegions); unmarshalErr != nil {
			return NotificationSettings{}, fmt.Errorf("unmarshal dive condition regions: %w", unmarshalErr)
		}
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return item, nil
}

func truncateError(value string) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= 2000 {
		return trimmed
	}
	return trimmed[:2000]
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func toUTCPtr(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	utc := value.UTC()
	return &utc
}

func normalizeDevicePlatform(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "ios", "android", "web":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "unknown"
	}
}

func trimStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func cleanStringSlice(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if len(trimmed) > 120 {
			trimmed = trimmed[:120]
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
		if len(result) >= 20 {
			break
		}
	}
	return result
}
