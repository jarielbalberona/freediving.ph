package http

type CreateBlockRequest struct {
	BlockedUserID string `json:"blockedUserId" validate:"required,uuid"`
}

type BlockedUser struct {
	BlockedUserID string `json:"blockedUserId"`
	Username      string `json:"username"`
	DisplayName   string `json:"displayName"`
	AvatarURL     string `json:"avatarUrl"`
	CreatedAt     string `json:"createdAt"`
}

type ListBlocksResponse struct {
	Items      []BlockedUser `json:"items"`
	NextCursor string        `json:"nextCursor,omitempty"`
}
