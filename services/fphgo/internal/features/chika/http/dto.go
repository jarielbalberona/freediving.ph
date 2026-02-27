package http

type Pagination struct {
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
}

type CreateThreadRequest struct {
	Title string `json:"title" validate:"required,min=1,max=200"`
	Mode  string `json:"mode"  validate:"required"`
}

type UpdateThreadRequest struct {
	Title string `json:"title" validate:"required,min=1,max=200"`
}

type CreatePostRequest struct {
	Content string `json:"content" validate:"required,min=1,max=10000"`
}

type CreateCommentRequest struct {
	Content string `json:"content" validate:"required,min=1,max=4000"`
}

type UpdateCommentRequest struct {
	Content string `json:"content" validate:"required,min=1,max=4000"`
}

type SetReactionRequest struct {
	Type string `json:"type" validate:"required"`
}

type CreateMediaAssetRequest struct {
	EntityType string `json:"entityType" validate:"required"`
	EntityID   string `json:"entityId"   validate:"required,uuid"`
	StorageKey string `json:"storageKey" validate:"required"`
	URL        string `json:"url"        validate:"required,url"`
	MimeType   string `json:"mimeType"   validate:"required"`
	SizeBytes  int64  `json:"sizeBytes"  validate:"min=0"`
	Width      *int32 `json:"width,omitempty"`
	Height     *int32 `json:"height,omitempty"`
}

type ThreadResponse struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Mode            string `json:"mode"`
	CreatedByUserID string `json:"createdByUserId"`
	IsHidden        bool   `json:"is_hidden"`
	HiddenAt        string `json:"hidden_at,omitempty"`
	HiddenReason    string `json:"hidden_reason,omitempty"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
}

type PostResponse struct {
	ID        int64  `json:"id"`
	ThreadID  string `json:"threadId"`
	Pseudonym string `json:"pseudonym"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
}

type CommentResponse struct {
	ID           int64  `json:"id"`
	ThreadID     string `json:"threadId"`
	Pseudonym    string `json:"pseudonym"`
	Content      string `json:"content"`
	IsHidden     bool   `json:"is_hidden"`
	HiddenAt     string `json:"hidden_at,omitempty"`
	HiddenReason string `json:"hidden_reason,omitempty"`
	CreatedAt    string `json:"createdAt"`
}

type ReactionResponse struct {
	ThreadID string `json:"threadId"`
	UserID   string `json:"userId"`
	Type     string `json:"type"`
}

type MediaAssetResponse struct {
	ID         string `json:"id"`
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
	StorageKey string `json:"storageKey"`
	URL        string `json:"url"`
	MimeType   string `json:"mimeType"`
	SizeBytes  int64  `json:"sizeBytes"`
}

type ListThreadsResponse struct {
	Items      []ThreadResponse `json:"items"`
	Pagination Pagination       `json:"pagination"`
	NextCursor string           `json:"nextCursor,omitempty"`
}

type ListPostsResponse struct {
	Items      []PostResponse `json:"items"`
	Pagination Pagination     `json:"pagination"`
}

type ListCommentsResponse struct {
	Items      []CommentResponse `json:"items"`
	Pagination Pagination        `json:"pagination"`
	NextCursor string            `json:"nextCursor,omitempty"`
}

type ListMediaResponse struct {
	Items []MediaAssetResponse `json:"items"`
}
