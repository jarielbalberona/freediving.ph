package http

type CreateNotificationRequest struct {
	UserID            string         `json:"userId" validate:"required,uuid"`
	Type              string         `json:"type" validate:"required,oneof=SYSTEM MESSAGE EVENT GROUP SERVICE BOOKING REVIEW MENTION LIKE COMMENT FRIEND_REQUEST GROUP_INVITE EVENT_REMINDER PAYMENT SECURITY NEW_DIVE_SITE_PUBLISHED DIVE_SITE_SUBMITTED_FOR_REVIEW CHIKA_THREAD_COMMENTED CHIKA_COMMENT_REPLIED GROUP_INVITE_RECEIVED GROUP_POST_CREATED EVENT_CREATED_FOR_GROUP EVENT_ATTENDEE_JOINED EVENT_UPDATED EVENT_CANCELLED"`
	Category          string         `json:"category,omitempty" validate:"omitempty,max=80"`
	Title             string         `json:"title" validate:"required,max=255"`
	Message           string         `json:"message" validate:"required,max=2000"`
	Priority          string         `json:"priority,omitempty" validate:"omitempty,oneof=LOW NORMAL HIGH URGENT"`
	RelatedUserID     *string        `json:"relatedUserId,omitempty" validate:"omitempty,uuid"`
	RelatedEntityType *string        `json:"relatedEntityType,omitempty" validate:"omitempty,max=100"`
	RelatedEntityID   *string        `json:"relatedEntityId,omitempty" validate:"omitempty,max=100"`
	ImageURL          *string        `json:"imageUrl,omitempty" validate:"omitempty,url"`
	ActionURL         *string        `json:"actionUrl,omitempty" validate:"omitempty,max=2048"`
	Metadata          map[string]any `json:"metadata,omitempty"`
}

type Notification struct {
	ID                int64          `json:"id"`
	UserID            string         `json:"userId"`
	Type              string         `json:"type"`
	Category          string         `json:"category"`
	Title             string         `json:"title"`
	Message           string         `json:"message"`
	Status            string         `json:"status"`
	Priority          string         `json:"priority"`
	ActorUserID       *string        `json:"actorUserId,omitempty"`
	RelatedUserID     *string        `json:"relatedUserId,omitempty"`
	RelatedEntityType *string        `json:"relatedEntityType,omitempty"`
	RelatedEntityID   *string        `json:"relatedEntityId,omitempty"`
	ImageURL          *string        `json:"imageUrl,omitempty"`
	ActionURL         *string        `json:"actionUrl,omitempty"`
	Metadata          map[string]any `json:"metadata,omitempty"`
	IsEmailSent       bool           `json:"isEmailSent"`
	IsPushSent        bool           `json:"isPushSent"`
	EmailSentAt       *string        `json:"emailSentAt,omitempty"`
	PushSentAt        *string        `json:"pushSentAt,omitempty"`
	ReadAt            *string        `json:"readAt,omitempty"`
	SeenAt            *string        `json:"seenAt,omitempty"`
	ArchivedAt        *string        `json:"archivedAt,omitempty"`
	IdempotencyKey    *string        `json:"idempotencyKey,omitempty"`
	CreatedAt         string         `json:"createdAt"`
	UpdatedAt         string         `json:"updatedAt"`
}

type ListNotificationsResponse struct {
	Items      []Notification      `json:"items"`
	Pagination NotificationsCursor `json:"pagination"`
}

type NotificationsCursor struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

type MarkAllReadResponse struct {
	Count int64 `json:"count"`
}

type NotificationSettings struct {
	ID                         string   `json:"id"`
	UserID                     string   `json:"userId"`
	EmailEnabled               bool     `json:"emailEnabled"`
	PushEnabled                bool     `json:"pushEnabled"`
	InAppEnabled               bool     `json:"inAppEnabled"`
	SystemNotifications        bool     `json:"systemNotifications"`
	MessageNotifications       bool     `json:"messageNotifications"`
	EventNotifications         bool     `json:"eventNotifications"`
	GroupNotifications         bool     `json:"groupNotifications"`
	ServiceNotifications       bool     `json:"serviceNotifications"`
	BookingNotifications       bool     `json:"bookingNotifications"`
	SessionNotifications       bool     `json:"sessionNotifications"`
	ReviewNotifications        bool     `json:"reviewNotifications"`
	MentionNotifications       bool     `json:"mentionNotifications"`
	LikeNotifications          bool     `json:"likeNotifications"`
	CommentNotifications       bool     `json:"commentNotifications"`
	FriendRequestNotifications bool     `json:"friendRequestNotifications"`
	GroupInviteNotifications   bool     `json:"groupInviteNotifications"`
	EventReminderNotifications bool     `json:"eventReminderNotifications"`
	PaymentNotifications       bool     `json:"paymentNotifications"`
	SecurityNotifications      bool     `json:"securityNotifications"`
	NewDiveSitePublished       bool     `json:"newDiveSitePublished"`
	ChikaReplies               bool     `json:"chikaReplies"`
	InstructorApplication      bool     `json:"instructorApplicationNotifications"`
	InstructorStatus           bool     `json:"instructorStatusNotifications"`
	BuddyUpdates               bool     `json:"buddyUpdates"`
	ProfileSocialUpdates       bool     `json:"profileSocialUpdates"`
	DiveConditionAlerts        bool     `json:"diveConditionAlerts"`
	DiveConditionSavedSites    bool     `json:"diveConditionSavedSites"`
	DiveConditionRegions       []string `json:"diveConditionRegions"`
	DiveConditionNearMe        bool     `json:"diveConditionNearMe"`
	DiveConditionCoarseArea    *string  `json:"diveConditionCoarseArea,omitempty"`
	DigestFrequency            string   `json:"digestFrequency"`
	QuietHoursStart            *string  `json:"quietHoursStart,omitempty"`
	QuietHoursEnd              *string  `json:"quietHoursEnd,omitempty"`
	Timezone                   string   `json:"timezone"`
	CreatedAt                  string   `json:"createdAt"`
	UpdatedAt                  string   `json:"updatedAt"`
}

type UpdateNotificationSettingsRequest struct {
	EmailEnabled               *bool     `json:"emailEnabled,omitempty"`
	PushEnabled                *bool     `json:"pushEnabled,omitempty"`
	InAppEnabled               *bool     `json:"inAppEnabled,omitempty"`
	SystemNotifications        *bool     `json:"systemNotifications,omitempty"`
	MessageNotifications       *bool     `json:"messageNotifications,omitempty"`
	EventNotifications         *bool     `json:"eventNotifications,omitempty"`
	GroupNotifications         *bool     `json:"groupNotifications,omitempty"`
	ServiceNotifications       *bool     `json:"serviceNotifications,omitempty"`
	BookingNotifications       *bool     `json:"bookingNotifications,omitempty"`
	SessionNotifications       *bool     `json:"sessionNotifications,omitempty"`
	ReviewNotifications        *bool     `json:"reviewNotifications,omitempty"`
	MentionNotifications       *bool     `json:"mentionNotifications,omitempty"`
	LikeNotifications          *bool     `json:"likeNotifications,omitempty"`
	CommentNotifications       *bool     `json:"commentNotifications,omitempty"`
	FriendRequestNotifications *bool     `json:"friendRequestNotifications,omitempty"`
	GroupInviteNotifications   *bool     `json:"groupInviteNotifications,omitempty"`
	EventReminderNotifications *bool     `json:"eventReminderNotifications,omitempty"`
	PaymentNotifications       *bool     `json:"paymentNotifications,omitempty"`
	SecurityNotifications      *bool     `json:"securityNotifications,omitempty"`
	NewDiveSitePublished       *bool     `json:"newDiveSitePublished,omitempty"`
	ChikaReplies               *bool     `json:"chikaReplies,omitempty"`
	InstructorApplication      *bool     `json:"instructorApplicationNotifications,omitempty"`
	InstructorStatus           *bool     `json:"instructorStatusNotifications,omitempty"`
	BuddyUpdates               *bool     `json:"buddyUpdates,omitempty"`
	ProfileSocialUpdates       *bool     `json:"profileSocialUpdates,omitempty"`
	DiveConditionAlerts        *bool     `json:"diveConditionAlerts,omitempty"`
	DiveConditionSavedSites    *bool     `json:"diveConditionSavedSites,omitempty"`
	DiveConditionRegions       *[]string `json:"diveConditionRegions,omitempty" validate:"omitempty,max=20"`
	DiveConditionNearMe        *bool     `json:"diveConditionNearMe,omitempty"`
	DiveConditionCoarseArea    *string   `json:"diveConditionCoarseArea,omitempty" validate:"omitempty,max=120"`
	DigestFrequency            *string   `json:"digestFrequency,omitempty" validate:"omitempty,oneof=IMMEDIATE DAILY WEEKLY NEVER"`
	QuietHoursStart            *string   `json:"quietHoursStart,omitempty" validate:"omitempty,max=5"`
	QuietHoursEnd              *string   `json:"quietHoursEnd,omitempty" validate:"omitempty,max=5"`
	Timezone                   *string   `json:"timezone,omitempty" validate:"omitempty,max=50"`
}

type RegisterPushDeviceRequest struct {
	ExpoPushToken string  `json:"expoPushToken" validate:"required,max=255"`
	Platform      string  `json:"platform" validate:"required,oneof=ios android web unknown"`
	DeviceID      *string `json:"deviceId,omitempty" validate:"omitempty,max=160"`
	DeviceName    *string `json:"deviceName,omitempty" validate:"omitempty,max=160"`
	AppVersion    *string `json:"appVersion,omitempty" validate:"omitempty,max=80"`
}

type PushDeviceToken struct {
	ID            string  `json:"id"`
	UserID        string  `json:"userId"`
	ExpoPushToken string  `json:"expoPushToken"`
	Platform      string  `json:"platform"`
	DeviceID      *string `json:"deviceId,omitempty"`
	DeviceName    *string `json:"deviceName,omitempty"`
	AppVersion    *string `json:"appVersion,omitempty"`
	Enabled       bool    `json:"enabled"`
	LastSeenAt    string  `json:"lastSeenAt"`
	CreatedAt     string  `json:"createdAt"`
	UpdatedAt     string  `json:"updatedAt"`
}

type NotificationStatsResponse struct {
	Total    int64 `json:"total"`
	Unread   int64 `json:"unread"`
	Read     int64 `json:"read"`
	Archived int64 `json:"archived"`
}

type UnreadCountResponse struct {
	UnreadCount int64 `json:"unreadCount"`
}

type NotificationOutboxItem struct {
	ID             string         `json:"id"`
	EventType      string         `json:"eventType"`
	AggregateType  string         `json:"aggregateType"`
	AggregateID    string         `json:"aggregateId"`
	Status         string         `json:"status"`
	Attempts       int            `json:"attempts"`
	NextRetryAt    string         `json:"nextRetryAt"`
	LastError      *string        `json:"lastError,omitempty"`
	IdempotencyKey string         `json:"idempotencyKey"`
	Summary        map[string]any `json:"summary,omitempty"`
	CreatedAt      string         `json:"createdAt"`
	UpdatedAt      string         `json:"updatedAt"`
	ProcessedAt    *string        `json:"processedAt,omitempty"`
}

type ListNotificationOutboxResponse struct {
	Items      []NotificationOutboxItem `json:"items"`
	Pagination NotificationsCursor      `json:"pagination"`
}
