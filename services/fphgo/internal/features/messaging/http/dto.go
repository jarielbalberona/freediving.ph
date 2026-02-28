package http

type CreateRequestRequest struct {
	RecipientID string `json:"recipientId" validate:"required,uuid"`
	Content     string `json:"content" validate:"required,min=1,max=4000"`
}

type SendConversationMessageRequest struct {
	Content  string           `json:"content" validate:"required,min=1,max=4000"`
	Metadata *MessageMetadata `json:"metadata"`
}

type MarkReadRequest struct {
	ConversationID string  `json:"conversationId" validate:"required,uuid"`
	MessageID      *string `json:"messageId,omitempty" validate:"omitempty,numeric"`
}

type RequestActionResponse struct {
	RequestID      string `json:"requestId"`
	ConversationID string `json:"conversationId"`
	Status         string `json:"status"`
}

type ConversationParticipant struct {
	UserID      string    `json:"userId"`
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl"`
	Trust       TrustCard `json:"trust"`
}

type MessageItem struct {
	ConversationID string           `json:"conversationId"`
	MessageID      string           `json:"messageId"`
	SenderID       string           `json:"senderId"`
	Content        string           `json:"content"`
	Metadata       *MessageMetadata `json:"metadata,omitempty"`
	CreatedAt      string           `json:"createdAt"`
}

type TrustCard struct {
	EmailVerified bool   `json:"emailVerified"`
	PhoneVerified bool   `json:"phoneVerified"`
	CertLevel     string `json:"certLevel,omitempty"`
	BuddyCount    int64  `json:"buddyCount"`
	ReportCount   int64  `json:"reportCount"`
}

type MessageMetadata struct {
	Type         string `json:"type,omitempty" validate:"omitempty,oneof=meet_at"`
	DiveSiteID   string `json:"diveSiteId,omitempty" validate:"omitempty,uuid"`
	DiveSiteSlug string `json:"diveSiteSlug,omitempty" validate:"omitempty,max=200"`
	DiveSiteName string `json:"diveSiteName,omitempty" validate:"omitempty,max=160"`
	DiveSiteArea string `json:"diveSiteArea,omitempty" validate:"omitempty,max=160"`
	TimeWindow   string `json:"timeWindow,omitempty" validate:"omitempty,oneof=today weekend specific_date"`
	DateStart    string `json:"dateStart,omitempty" validate:"omitempty,datetime=2006-01-02"`
	DateEnd      string `json:"dateEnd,omitempty" validate:"omitempty,datetime=2006-01-02"`
	Note         string `json:"note,omitempty" validate:"omitempty,max=200"`
}

type ConversationItem struct {
	ConversationID  string                  `json:"conversationId"`
	Status          string                  `json:"status"`
	InitiatorUserID string                  `json:"initiatorUserId"`
	UpdatedAt       string                  `json:"updatedAt"`
	Participant     ConversationParticipant `json:"participant"`
	LastMessage     MessageItem             `json:"lastMessage"`
	RequestPreview  *MessageItem            `json:"requestPreview,omitempty"`
	UnreadCount     int64                   `json:"unreadCount"`
	PendingCount    int64                   `json:"pendingCount"`
}

type ListInboxResponse struct {
	Items      []ConversationItem `json:"items"`
	NextCursor string             `json:"nextCursor,omitempty"`
}

type ListConversationMessagesResponse struct {
	Items      []MessageItem `json:"items"`
	NextCursor string        `json:"nextCursor,omitempty"`
}

type SendMessageResponse struct {
	Message MessageItem `json:"message"`
}

type MarkReadResponse struct {
	ConversationID string `json:"conversationId"`
	Marked         bool   `json:"marked"`
}
