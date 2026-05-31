package http

type MemoriesResponse struct {
	Items []DiveMemory `json:"items"`
}

type MemoryResponse struct {
	Memory DiveMemory `json:"memory"`
}

type MemoryTagsResponse struct {
	Items []MemoryTag `json:"items"`
}

type DiveMemory struct {
	ID           string   `json:"id"`
	AuthorUserID string   `json:"authorUserId"`
	DiveSiteID   string   `json:"diveSiteId"`
	Title        string   `json:"title"`
	Body         string   `json:"body,omitempty"`
	MediaIDs     []string `json:"mediaIds"`
	Visibility   string   `json:"visibility"`
	OccurredAt   string   `json:"occurredAt"`
	CreatedAt    string   `json:"createdAt"`
	UpdatedAt    string   `json:"updatedAt"`
}

type UpsertMemoryRequest struct {
	DiveSiteID string   `json:"diveSiteId" validate:"required,uuid"`
	Title      string   `json:"title" validate:"required"`
	Body       string   `json:"body,omitempty"`
	Visibility string   `json:"visibility,omitempty" validate:"omitempty,oneof=public followers tagged private"`
	OccurredAt *string  `json:"occurredAt,omitempty"`
	MediaIDs   []string `json:"mediaIds,omitempty" validate:"omitempty,dive,uuid"`
}

type AddMemoryTagsRequest struct {
	TaggedUserIDs []string `json:"taggedUserIds" validate:"required,dive,uuid"`
}

type UpdateMemoryTagRequest struct {
	Status string `json:"status" validate:"required,oneof=accepted declined hidden"`
}

type MemoryTag struct {
	ID           string `json:"id"`
	MemoryID     string `json:"memoryId"`
	TaggedUserID string `json:"taggedUserId"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}
