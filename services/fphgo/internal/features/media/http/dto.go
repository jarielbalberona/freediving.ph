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
