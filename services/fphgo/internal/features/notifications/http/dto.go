package http

type CreateNotificationRequest struct {
	UserID            string         `json:"userId" validate:"required,uuid"`
	Type              string         `json:"type" validate:"required,oneof=SYSTEM MESSAGE EVENT GROUP SERVICE BOOKING REVIEW MENTION LIKE COMMENT FRIEND_REQUEST GROUP_INVITE EVENT_REMINDER PAYMENT SECURITY"`
	Title             string         `json:"title" validate:"required,max=255"`
	Message           string         `json:"message" validate:"required,max=2000"`
	Priority          string         `json:"priority,omitempty" validate:"omitempty,oneof=LOW NORMAL HIGH URGENT"`
	RelatedUserID     *string        `json:"relatedUserId,omitempty" validate:"omitempty,uuid"`
	RelatedEntityType *string        `json:"relatedEntityType,omitempty" validate:"omitempty,max=100"`
	RelatedEntityID   *string        `json:"relatedEntityId,omitempty" validate:"omitempty,max=100"`
	ImageURL          *string        `json:"imageUrl,omitempty" validate:"omitempty,url"`
	ActionURL         *string        `json:"actionUrl,omitempty" validate:"omitempty,url"`
	Metadata          map[string]any `json:"metadata,omitempty"`
}

type Notification struct {
	ID                int64          `json:"id"`
	UserID            string         `json:"userId"`
	Type              string         `json:"type"`
	Title             string         `json:"title"`
	Message           string         `json:"message"`
	Status            string         `json:"status"`
	Priority          string         `json:"priority"`
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
	ArchivedAt        *string        `json:"archivedAt,omitempty"`
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
	ID                         string  `json:"id"`
	UserID                     string  `json:"userId"`
	EmailEnabled               bool    `json:"emailEnabled"`
	PushEnabled                bool    `json:"pushEnabled"`
	InAppEnabled               bool    `json:"inAppEnabled"`
	SystemNotifications        bool    `json:"systemNotifications"`
	MessageNotifications       bool    `json:"messageNotifications"`
	EventNotifications         bool    `json:"eventNotifications"`
	GroupNotifications         bool    `json:"groupNotifications"`
	ServiceNotifications       bool    `json:"serviceNotifications"`
	BookingNotifications       bool    `json:"bookingNotifications"`
	ReviewNotifications        bool    `json:"reviewNotifications"`
	MentionNotifications       bool    `json:"mentionNotifications"`
	LikeNotifications          bool    `json:"likeNotifications"`
	CommentNotifications       bool    `json:"commentNotifications"`
	FriendRequestNotifications bool    `json:"friendRequestNotifications"`
	GroupInviteNotifications   bool    `json:"groupInviteNotifications"`
	EventReminderNotifications bool    `json:"eventReminderNotifications"`
	PaymentNotifications       bool    `json:"paymentNotifications"`
	SecurityNotifications      bool    `json:"securityNotifications"`
	DigestFrequency            string  `json:"digestFrequency"`
	QuietHoursStart            *string `json:"quietHoursStart,omitempty"`
	QuietHoursEnd              *string `json:"quietHoursEnd,omitempty"`
	Timezone                   string  `json:"timezone"`
	CreatedAt                  string  `json:"createdAt"`
	UpdatedAt                  string  `json:"updatedAt"`
}

type UpdateNotificationSettingsRequest struct {
	EmailEnabled               *bool   `json:"emailEnabled,omitempty"`
	PushEnabled                *bool   `json:"pushEnabled,omitempty"`
	InAppEnabled               *bool   `json:"inAppEnabled,omitempty"`
	SystemNotifications        *bool   `json:"systemNotifications,omitempty"`
	MessageNotifications       *bool   `json:"messageNotifications,omitempty"`
	EventNotifications         *bool   `json:"eventNotifications,omitempty"`
	GroupNotifications         *bool   `json:"groupNotifications,omitempty"`
	ServiceNotifications       *bool   `json:"serviceNotifications,omitempty"`
	BookingNotifications       *bool   `json:"bookingNotifications,omitempty"`
	ReviewNotifications        *bool   `json:"reviewNotifications,omitempty"`
	MentionNotifications       *bool   `json:"mentionNotifications,omitempty"`
	LikeNotifications          *bool   `json:"likeNotifications,omitempty"`
	CommentNotifications       *bool   `json:"commentNotifications,omitempty"`
	FriendRequestNotifications *bool   `json:"friendRequestNotifications,omitempty"`
	GroupInviteNotifications   *bool   `json:"groupInviteNotifications,omitempty"`
	EventReminderNotifications *bool   `json:"eventReminderNotifications,omitempty"`
	PaymentNotifications       *bool   `json:"paymentNotifications,omitempty"`
	SecurityNotifications      *bool   `json:"securityNotifications,omitempty"`
	DigestFrequency            *string `json:"digestFrequency,omitempty" validate:"omitempty,oneof=IMMEDIATE DAILY WEEKLY NEVER"`
	QuietHoursStart            *string `json:"quietHoursStart,omitempty" validate:"omitempty,max=5"`
	QuietHoursEnd              *string `json:"quietHoursEnd,omitempty" validate:"omitempty,max=5"`
	Timezone                   *string `json:"timezone,omitempty" validate:"omitempty,max=50"`
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
