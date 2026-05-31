package http

type JourneyResponse struct {
	Items []JourneyEntry `json:"items"`
}

type JourneyEntryResponse struct {
	Entry JourneyEntry `json:"entry"`
}

type JourneyEntry struct {
	ID           string   `json:"id"`
	UserID       string   `json:"userId"`
	Type         string   `json:"type"`
	Title        string   `json:"title"`
	Body         string   `json:"body,omitempty"`
	DiveSiteID   string   `json:"diveSiteId,omitempty"`
	SourceType   string   `json:"sourceType,omitempty"`
	SourceID     string   `json:"sourceId,omitempty"`
	CoverMediaID string   `json:"coverMediaId,omitempty"`
	MediaIDs     []string `json:"mediaIds"`
	Visibility   string   `json:"visibility"`
	State        string   `json:"state"`
	OccurredAt   string   `json:"occurredAt"`
	CreatedAt    string   `json:"createdAt"`
	UpdatedAt    string   `json:"updatedAt"`
}

type UpsertManualJourneyEntryRequest struct {
	Title      string   `json:"title" validate:"required"`
	Body       string   `json:"body,omitempty"`
	DiveSiteID *string  `json:"diveSiteId,omitempty" validate:"omitempty,uuid"`
	Visibility string   `json:"visibility,omitempty" validate:"omitempty,oneof=public followers private"`
	OccurredAt *string  `json:"occurredAt,omitempty"`
	MediaIDs   []string `json:"mediaIds,omitempty" validate:"omitempty,dive,uuid"`
}
