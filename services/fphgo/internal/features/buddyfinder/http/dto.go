package http

type PreviewResponse struct {
	Area  string          `json:"area"`
	Count int64           `json:"count"`
	Items []PreviewIntent `json:"items"`
}

type SharePreviewResponse struct {
	Intent SharePreviewIntent `json:"intent"`
}

type SharePreviewIntent struct {
	ID            string `json:"id"`
	DiveSiteID    string `json:"diveSiteId,omitempty"`
	DiveSiteName  string `json:"diveSiteName,omitempty"`
	Area          string `json:"area"`
	IntentType    string `json:"intentType"`
	TimeWindow    string `json:"timeWindow"`
	DateStart     string `json:"dateStart,omitempty"`
	DateEnd       string `json:"dateEnd,omitempty"`
	NotePreview   string `json:"notePreview,omitempty"`
	CreatedAt     string `json:"createdAt"`
	EmailVerified bool   `json:"emailVerified"`
	PhoneVerified bool   `json:"phoneVerified"`
	CertLevel     string `json:"certLevel,omitempty"`
	BuddyCount    int64  `json:"buddyCount"`
	ReportCount   int64  `json:"reportCount"`
}

type PreviewIntent struct {
	ID                 string `json:"id"`
	DiveSiteID         string `json:"diveSiteId,omitempty"`
	Area               string `json:"area"`
	IntentType         string `json:"intentType"`
	TimeWindow         string `json:"timeWindow"`
	DateStart          string `json:"dateStart,omitempty"`
	DateEnd            string `json:"dateEnd,omitempty"`
	NotePreview        string `json:"notePreview,omitempty"`
	CreatedAt          string `json:"createdAt"`
	EmailVerified      bool   `json:"emailVerified"`
	PhoneVerified      bool   `json:"phoneVerified"`
	CertLevel          string `json:"certLevel,omitempty"`
	BuddyCount         int64  `json:"buddyCount"`
	ReportCount        int64  `json:"reportCount"`
	MutualBuddiesCount int64  `json:"mutualBuddiesCount"`
}

type ListMemberIntentsResponse struct {
	Items      []MemberIntent `json:"items"`
	NextCursor string         `json:"nextCursor,omitempty"`
}

type MemberIntent struct {
	ID                 string `json:"id"`
	AuthorAppUserID    string `json:"authorAppUserId"`
	DiveSiteID         string `json:"diveSiteId,omitempty"`
	Username           string `json:"username"`
	DisplayName        string `json:"displayName"`
	AvatarURL          string `json:"avatarUrl,omitempty"`
	HomeArea           string `json:"homeArea"`
	Area               string `json:"area"`
	IntentType         string `json:"intentType"`
	TimeWindow         string `json:"timeWindow"`
	DateStart          string `json:"dateStart,omitempty"`
	DateEnd            string `json:"dateEnd,omitempty"`
	Note               string `json:"note,omitempty"`
	CreatedAt          string `json:"createdAt"`
	ExpiresAt          string `json:"expiresAt"`
	EmailVerified      bool   `json:"emailVerified"`
	PhoneVerified      bool   `json:"phoneVerified"`
	CertLevel          string `json:"certLevel,omitempty"`
	BuddyCount         int64  `json:"buddyCount"`
	ReportCount        int64  `json:"reportCount"`
	MutualBuddiesCount int64  `json:"mutualBuddiesCount"`
}

type CreateIntentRequest struct {
	DiveSiteID *string `json:"diveSiteId" validate:"omitempty,uuid"`
	Area       string  `json:"area" validate:"omitempty,min=2,max=120"`
	IntentType string  `json:"intentType" validate:"required,oneof=training fun_dive depth pool line_training"`
	TimeWindow string  `json:"timeWindow" validate:"required,oneof=today weekend specific_date"`
	DateStart  *string `json:"dateStart" validate:"omitempty,datetime=2006-01-02"`
	DateEnd    *string `json:"dateEnd" validate:"omitempty,datetime=2006-01-02"`
	Note       *string `json:"note" validate:"omitempty,max=200"`
}

type IntentResponse struct {
	Intent Intent `json:"intent"`
}

type Intent struct {
	ID         string `json:"id"`
	DiveSiteID string `json:"diveSiteId,omitempty"`
	Area       string `json:"area"`
	IntentType string `json:"intentType"`
	TimeWindow string `json:"timeWindow"`
	DateStart  string `json:"dateStart,omitempty"`
	DateEnd    string `json:"dateEnd,omitempty"`
	Note       string `json:"note,omitempty"`
	CreatedAt  string `json:"createdAt"`
	ExpiresAt  string `json:"expiresAt"`
}

type MessageEntryResponse struct {
	IntentID        string `json:"intentId"`
	RecipientUserID string `json:"recipientUserId"`
	RequiresRequest bool   `json:"requiresRequest"`
}
