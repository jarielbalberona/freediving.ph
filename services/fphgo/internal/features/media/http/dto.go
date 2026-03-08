package http

type UploadMediaResponse struct {
	ID          string  `json:"id"`
	ObjectKey   string  `json:"objectKey"`
	MimeType    string  `json:"mimeType"`
	SizeBytes   int64   `json:"sizeBytes"`
	Width       int     `json:"width"`
	Height      int     `json:"height"`
	ContextType string  `json:"contextType"`
	ContextID   *string `json:"contextId,omitempty"`
	State       string  `json:"state"`
}

type UploadMultipleMediaResponse struct {
	Items  []UploadMediaResponse      `json:"items"`
	Errors []UploadMultipleErrorEntry `json:"errors,omitempty"`
}

type UploadMultipleErrorEntry struct {
	Index   int    `json:"index"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ListMediaResponse struct {
	Items      []UploadMediaResponse `json:"items"`
	NextCursor string                `json:"nextCursor,omitempty"`
}

type MintURLsRequest struct {
	Items []MintURLItemRequest `json:"items" validate:"required,min=1,max=100,dive"`
}

type MintURLItemRequest struct {
	MediaID string  `json:"mediaId" validate:"required,uuid"`
	Preset  string  `json:"preset" validate:"required,oneof=thumb card dialog original"`
	Width   *int    `json:"width,omitempty" validate:"omitempty,min=1,max=4096"`
	Format  *string `json:"format,omitempty" validate:"omitempty,oneof=auto webp jpeg png"`
	Quality *int    `json:"quality,omitempty" validate:"omitempty,min=1,max=100"`
}

type MintURLItem struct {
	MediaID   string `json:"mediaId"`
	URL       string `json:"url"`
	ExpiresAt int64  `json:"expiresAt"`
}

type MintURLErrorItem struct {
	MediaID string `json:"mediaId"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type MintURLsResponse struct {
	Items  []MintURLItem      `json:"items"`
	Errors []MintURLErrorItem `json:"errors,omitempty"`
}

type CreateMediaPostRequest struct {
	DiveSiteID        string                       `json:"diveSiteId" validate:"required,uuid"`
	PostCaption       *string                      `json:"postCaption,omitempty" validate:"omitempty,max=1000"`
	ApplyCaptionToAll bool                         `json:"applyCaptionToAll"`
	Source            *string                      `json:"source,omitempty" validate:"omitempty,oneof=create_post profile_upload"`
	Items             []CreateMediaPostItemRequest `json:"items" validate:"required,min=1,max=10,dive"`
}

type CreateMediaPostItemRequest struct {
	MediaObjectID string  `json:"mediaObjectId" validate:"required,uuid"`
	Type          string  `json:"type" validate:"required,oneof=photo video"`
	StorageKey    string  `json:"storageKey" validate:"required,max=500"`
	MimeType      string  `json:"mimeType" validate:"required,max=120"`
	Width         int     `json:"width" validate:"required,min=1,max=20000"`
	Height        int     `json:"height" validate:"required,min=1,max=20000"`
	DurationMs    *int    `json:"durationMs,omitempty" validate:"omitempty,min=0,max=86400000"`
	Caption       *string `json:"caption,omitempty" validate:"omitempty,max=500"`
	DiveSiteID    *string `json:"diveSiteId,omitempty" validate:"omitempty,uuid"`
	SortOrder     int     `json:"sortOrder" validate:"min=0,max=100"`
}

type CreateMediaPostResponse struct {
	Post  MediaPostDTO      `json:"post"`
	Items []ProfileMediaDTO `json:"items"`
}

type MediaPostDTO struct {
	ID              string  `json:"id"`
	AuthorAppUserID string  `json:"authorAppUserId"`
	UploadGroupID   string  `json:"uploadGroupId"`
	DiveSiteID      string  `json:"diveSiteId"`
	PostCaption     *string `json:"postCaption,omitempty"`
	CreatedAt       string  `json:"createdAt"`
	UpdatedAt       string  `json:"updatedAt"`
}

type ProfileMediaListResponse struct {
	Items      []ProfileMediaDTO `json:"items"`
	NextCursor string            `json:"nextCursor,omitempty"`
}

type ProfileMediaDTO struct {
	ID              string              `json:"id"`
	MediaObjectID   string              `json:"mediaObjectId"`
	PostID          string              `json:"postId"`
	UploadGroupID   string              `json:"uploadGroupId"`
	AuthorAppUserID string              `json:"authorAppUserId"`
	Type            string              `json:"type"`
	StorageKey      string              `json:"storageKey"`
	MimeType        string              `json:"mimeType"`
	Width           int                 `json:"width"`
	Height          int                 `json:"height"`
	DurationMs      *int                `json:"durationMs,omitempty"`
	Caption         *string             `json:"caption,omitempty"`
	DiveSite        ProfileMediaSiteDTO `json:"diveSite"`
	SortOrder       int                 `json:"sortOrder"`
	Status          string              `json:"status"`
	CreatedAt       string              `json:"createdAt"`
}

type ProfileMediaSiteDTO struct {
	ID   string `json:"id"`
	Slug string `json:"slug,omitempty"`
	Name string `json:"name"`
	Area string `json:"area"`
}
