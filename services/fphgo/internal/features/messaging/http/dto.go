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

type OpenDirectThreadRequest struct {
	TargetUserID string `json:"targetUserId" validate:"required,uuid"`
}

type ThreadMessageItem struct {
	ID           string `json:"id"`
	ThreadID     string `json:"threadId"`
	SenderUserID string `json:"senderUserId"`
	Kind         string `json:"kind"`
	Body         string `json:"body"`
	CreatedAt    string `json:"createdAt"`
	ClientID     string `json:"clientId,omitempty"`
	IsOwn        bool   `json:"isOwn"`
	Status       string `json:"status,omitempty"`
}

type ThreadSummaryItem struct {
	ID            string                  `json:"id"`
	Type          string                  `json:"type"`
	Category      string                  `json:"category"`
	Participant   ConversationParticipant `json:"participant"`
	LastMessage   *ThreadMessageItem      `json:"lastMessage,omitempty"`
	LastMessageAt string                  `json:"lastMessageAt"`
	UnreadCount   int64                   `json:"unreadCount"`
	HasUnread     bool                    `json:"hasUnread"`
	ActiveRequest bool                    `json:"activeRequest"`
}

type ListThreadsResponse struct {
	Items      []ThreadSummaryItem `json:"items"`
	NextCursor string              `json:"nextCursor,omitempty"`
}

type ThreadParticipantItem struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl"`
}

type ThreadDetailResponse struct {
	ID                string                  `json:"id"`
	Type              string                  `json:"type"`
	Category          string                  `json:"category"`
	Participants      []ThreadParticipantItem `json:"participants"`
	CreatedAt         string                  `json:"createdAt"`
	LastReadMessageID string                  `json:"lastReadMessageId,omitempty"`
	CanSend           bool                    `json:"canSend"`
	ActiveRequest     bool                    `json:"activeRequest"`
	CanResolveRequest bool                    `json:"canResolveRequest"`
}

type ListThreadMessagesResponse struct {
	Items      []ThreadMessageItem `json:"items"`
	NextCursor string              `json:"nextCursor,omitempty"`
}

type SendThreadMessageRequest struct {
	Body     string `json:"body" validate:"required,min=1,max=4000"`
	ClientID string `json:"clientId" validate:"omitempty,max=120"`
}

type SendThreadMessageResponse struct {
	Message ThreadMessageItem `json:"message"`
}

type MarkThreadReadRequest struct {
	LastReadMessageID string `json:"lastReadMessageId" validate:"required,numeric"`
}

type MarkThreadReadResponse struct {
	ThreadID string `json:"threadId"`
	Marked   bool   `json:"marked"`
}

type UpdateThreadCategoryRequest struct {
	Category string `json:"category" validate:"required,oneof=primary transactions"`
}

type UpdateThreadCategoryResponse struct {
	ThreadID string `json:"threadId"`
	Category string `json:"category"`
	Updated  bool   `json:"updated"`
}

type ResolveThreadRequestResponse struct {
	ThreadID string `json:"threadId"`
	Action   string `json:"action"`
	Resolved bool   `json:"resolved"`
}
