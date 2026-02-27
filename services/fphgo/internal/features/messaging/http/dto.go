package http

type SendMessageRequest struct {
	RecipientID string `json:"recipientId" validate:"required,uuid"`
	Content     string `json:"content"     validate:"required,min=1,max=4000"`
}

type ConversationActionResponse struct {
	ConversationID string `json:"conversationId"`
	Status         string `json:"status"`
}

type MessageItem struct {
	ConversationID string `json:"conversationId"`
	MessageID      int64  `json:"messageId"`
	SenderID       string `json:"senderId"`
	Content        string `json:"content"`
	Status         string `json:"status"`
	CreatedAt      string `json:"createdAt"`
}
