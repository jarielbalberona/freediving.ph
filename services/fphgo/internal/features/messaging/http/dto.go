package http

type CreateRequestRequest struct {
	RecipientID string `json:"recipientId" validate:"required,uuid"`
	Content     string `json:"content" validate:"required,min=1,max=4000"`
}

type SendConversationMessageRequest struct {
	Content string `json:"content" validate:"required,min=1,max=4000"`
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
	UserID      string `json:"userId"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl"`
}

type MessageItem struct {
	ConversationID string `json:"conversationId"`
	MessageID      string `json:"messageId"`
	SenderID       string `json:"senderId"`
	Content        string `json:"content"`
	CreatedAt      string `json:"createdAt"`
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
