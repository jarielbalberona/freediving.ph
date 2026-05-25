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

type CreateMomentUploadIntentRequest struct {
	Caption     *string `json:"caption,omitempty" validate:"omitempty,max=1000"`
	DiveSiteID  *string `json:"diveSiteId,omitempty" validate:"omitempty,uuid"`
	Filename    *string `json:"filename,omitempty" validate:"omitempty,max=255"`
	ContentType *string `json:"contentType,omitempty" validate:"omitempty,max=120"`
}

type MomentUploadIntentResponse struct {
	PostID             string `json:"postId"`
	MediaItemID        string `json:"mediaItemId"`
	MediaObjectID      string `json:"mediaObjectId"`
	StreamUID          string `json:"streamUid"`
	UploadURL          string `json:"uploadUrl"`
	Status             string `json:"status"`
	UploadExpiresAt    string `json:"uploadExpiresAt"`
	MaxDurationSeconds int    `json:"maxDurationSeconds"`
}

type MomentStatusResponse struct {
	PostID          string             `json:"postId"`
	MediaItemID     string             `json:"mediaItemId"`
	Status          string             `json:"status"`
	Playback        *MomentPlaybackDTO `json:"playback,omitempty"`
	PlaybackURL     string             `json:"playbackUrl,omitempty"`
	ThumbnailURL    string             `json:"thumbnailUrl,omitempty"`
	PreviewURL      string             `json:"previewUrl,omitempty"`
	DurationMs      *int               `json:"durationMs,omitempty"`
	Width           int                `json:"width"`
	Height          int                `json:"height"`
	FailedReason    *string            `json:"failedReason,omitempty"`
	UploadExpiresAt *string            `json:"uploadExpiresAt,omitempty"`
	ReadyAt         *string            `json:"readyAt,omitempty"`
}

type MomentPlaybackDTO struct {
	Provider  string  `json:"provider"`
	IframeURL *string `json:"iframeUrl"`
	HLSURL    *string `json:"hlsUrl"`
	DASHURL   *string `json:"dashUrl,omitempty"`
	PosterURL *string `json:"posterUrl,omitempty"`
}

type MediaPostDTO struct {
	ID              string  `json:"id"`
	AuthorAppUserID string  `json:"authorAppUserId"`
	UploadGroupID   string  `json:"uploadGroupId"`
	DiveSiteID      string  `json:"diveSiteId"`
	PostCaption     *string `json:"postCaption,omitempty"`
	LikeCount       int64   `json:"likeCount"`
	CommentCount    int64   `json:"commentCount"`
	ViewerHasLiked  bool    `json:"viewerHasLiked"`
	ViewerHasSaved  bool    `json:"viewerHasSaved"`
	CreatedAt       string  `json:"createdAt"`
	UpdatedAt       string  `json:"updatedAt"`
}

type LikeStateResponse struct {
	PostID         string `json:"postId"`
	LikeCount      int64  `json:"likeCount"`
	ViewerHasLiked bool   `json:"viewerHasLiked"`
}

type SaveStateResponse struct {
	PostID         string `json:"postId"`
	ViewerHasSaved bool   `json:"viewerHasSaved"`
}

type CommentLikeStateResponse struct {
	CommentID      string `json:"commentId"`
	LikeCount      int64  `json:"likeCount"`
	ViewerHasLiked bool   `json:"viewerHasLiked"`
}

type ProfileMediaListResponse struct {
	Items      []ProfileMediaDTO `json:"items"`
	NextCursor string            `json:"nextCursor,omitempty"`
}

type DiveSpotHighlightListResponse struct {
	Items []DiveSpotHighlightDTO `json:"items"`
}

type DiveSpotHighlightDTO struct {
	DiveSpotID           string `json:"diveSpotId"`
	DiveSpotSlug         string `json:"diveSpotSlug,omitempty"`
	DiveSpotName         string `json:"diveSpotName"`
	DiveSpotArea         string `json:"diveSpotArea,omitempty"`
	CoverMediaObjectID   string `json:"coverMediaObjectId"`
	CoverThumbnailURL    string `json:"coverThumbnailUrl,omitempty"`
	MediaCount           int64  `json:"mediaCount"`
	LatestMediaCreatedAt string `json:"latestMediaCreatedAt"`
}

type ProfileMediaDTO struct {
	ID               string              `json:"id"`
	MediaObjectID    string              `json:"mediaObjectId"`
	PostID           string              `json:"postId"`
	PostCaption      *string             `json:"postCaption,omitempty"`
	UploadGroupID    string              `json:"uploadGroupId"`
	AuthorAppUserID  string              `json:"authorAppUserId"`
	Type             string              `json:"type"`
	StorageKey       string              `json:"storageKey"`
	MimeType         string              `json:"mimeType"`
	Width            int                 `json:"width"`
	Height           int                 `json:"height"`
	DurationMs       *int                `json:"durationMs,omitempty"`
	Caption          *string             `json:"caption,omitempty"`
	DiveSite         ProfileMediaSiteDTO `json:"diveSite"`
	SortOrder        int                 `json:"sortOrder"`
	Status           string              `json:"status"`
	ProcessingStatus string              `json:"processingStatus,omitempty"`
	Playback         *MomentPlaybackDTO  `json:"playback,omitempty"`
	PlaybackURL      *string             `json:"playbackUrl,omitempty"`
	ThumbnailURL     *string             `json:"thumbnailUrl,omitempty"`
	PreviewURL       *string             `json:"previewUrl,omitempty"`
	LikeCount        int64               `json:"likeCount"`
	CommentCount     int64               `json:"commentCount"`
	ViewerHasLiked   bool                `json:"viewerHasLiked"`
	ViewerHasSaved   bool                `json:"viewerHasSaved"`
	CreatedAt        string              `json:"createdAt"`
}

type ProfileMediaSiteDTO struct {
	ID   string `json:"id"`
	Slug string `json:"slug,omitempty"`
	Name string `json:"name"`
	Area string `json:"area"`
}

type MediaPostAuthorDTO struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl,omitempty"`
}

type MediaPostDetailDTO struct {
	Post   MediaPostDTO       `json:"post"`
	Author MediaPostAuthorDTO `json:"author"`
	Items  []ProfileMediaDTO  `json:"items"`
}

type MediaPostDetailResponse struct {
	Post MediaPostDetailDTO `json:"post"`
}

type CreateMediaPostCommentRequest struct {
	Body string `json:"body" validate:"required,min=1,max=4000"`
}

type MediaPostCommentAuthorDTO struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl,omitempty"`
}

type MediaPostCommentDTO struct {
	ID             string                    `json:"id"`
	PostID         string                    `json:"postId"`
	Author         MediaPostCommentAuthorDTO `json:"author"`
	Body           string                    `json:"body"`
	LikeCount      int64                     `json:"likeCount"`
	ViewerHasLiked bool                      `json:"viewerHasLiked"`
	CreatedAt      string                    `json:"createdAt"`
	UpdatedAt      string                    `json:"updatedAt"`
}

type MediaPostCommentListResponse struct {
	Items      []MediaPostCommentDTO `json:"items"`
	NextCursor string                `json:"nextCursor,omitempty"`
}
