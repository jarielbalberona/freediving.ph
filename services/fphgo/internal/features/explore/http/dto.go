package http

type ListSitesResponse struct {
	Items      []SiteCard `json:"items"`
	NextCursor string     `json:"nextCursor,omitempty"`
}

type SiteCard struct {
	ID                   string   `json:"id"`
	Slug                 string   `json:"slug"`
	Name                 string   `json:"name"`
	Area                 string   `json:"area"`
	Latitude             *float64 `json:"latitude,omitempty"`
	Longitude            *float64 `json:"longitude,omitempty"`
	Difficulty           string   `json:"difficulty"`
	DepthMinM            *float64 `json:"depthMinM,omitempty"`
	DepthMaxM            *float64 `json:"depthMaxM,omitempty"`
	Hazards              []string `json:"hazards"`
	VerificationStatus   string   `json:"verificationStatus"`
	LastUpdatedAt        string   `json:"lastUpdatedAt"`
	RecentUpdateCount    int64    `json:"recentUpdateCount"`
	LastConditionSummary string   `json:"lastConditionSummary,omitempty"`
	IsSaved              bool     `json:"isSaved"`
}

type SiteDetailResponse struct {
	Site              SiteDetail   `json:"site"`
	Updates           []SiteUpdate `json:"updates"`
	NextUpdatesCursor string       `json:"nextUpdatesCursor,omitempty"`
}

type SiteDetail struct {
	ID                    string   `json:"id"`
	Slug                  string   `json:"slug"`
	Name                  string   `json:"name"`
	Area                  string   `json:"area"`
	Latitude              *float64 `json:"latitude,omitempty"`
	Longitude             *float64 `json:"longitude,omitempty"`
	Description           string   `json:"description,omitempty"`
	Difficulty            string   `json:"difficulty"`
	DepthMinM             *float64 `json:"depthMinM,omitempty"`
	DepthMaxM             *float64 `json:"depthMaxM,omitempty"`
	Hazards               []string `json:"hazards"`
	BestSeason            string   `json:"bestSeason,omitempty"`
	TypicalConditions     string   `json:"typicalConditions,omitempty"`
	Access                string   `json:"access,omitempty"`
	Fees                  string   `json:"fees,omitempty"`
	ContactInfo           string   `json:"contactInfo,omitempty"`
	VerificationStatus    string   `json:"verificationStatus"`
	VerifiedByUserID      string   `json:"verifiedByUserId,omitempty"`
	VerifiedByDisplayName string   `json:"verifiedByDisplayName,omitempty"`
	LastUpdatedAt         string   `json:"lastUpdatedAt"`
	CreatedAt             string   `json:"createdAt"`
	ReportCount           int64    `json:"reportCount"`
	LastConditionSummary  string   `json:"lastConditionSummary,omitempty"`
}

type SiteUpdate struct {
	ID                   string    `json:"id"`
	DiveSiteID           string    `json:"diveSiteId"`
	AuthorAppUserID      string    `json:"authorAppUserId"`
	AuthorDisplayName    string    `json:"authorDisplayName"`
	AuthorTrust          TrustCard `json:"authorTrust"`
	Note                 string    `json:"note"`
	ConditionVisibilityM *float64  `json:"conditionVisibilityM,omitempty"`
	ConditionCurrent     string    `json:"conditionCurrent,omitempty"`
	ConditionWaves       string    `json:"conditionWaves,omitempty"`
	ConditionTempC       *float64  `json:"conditionTempC,omitempty"`
	OccurredAt           string    `json:"occurredAt"`
	CreatedAt            string    `json:"createdAt"`
}

type CreateUpdateRequest struct {
	Note                 string   `json:"note" validate:"required,min=8,max=400"`
	ConditionVisibilityM *float64 `json:"conditionVisibilityM" validate:"omitempty,gte=0,lte=100"`
	ConditionCurrent     *string  `json:"conditionCurrent" validate:"omitempty,oneof=none mild strong"`
	ConditionWaves       *string  `json:"conditionWaves" validate:"omitempty,oneof=calm moderate rough"`
	ConditionTempC       *float64 `json:"conditionTempC" validate:"omitempty,gte=0,lte=40"`
	OccurredAt           *string  `json:"occurredAt" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

type SaveSiteResponse struct {
	Saved bool `json:"saved"`
}

type CreateSiteSubmissionRequest struct {
	Name              string   `json:"name" validate:"required,min=3,max=120"`
	Lat               *float64 `json:"lat" validate:"required,gte=-90,lte=90"`
	Lng               *float64 `json:"lng" validate:"required,gte=-180,lte=180"`
	Description       string   `json:"description" validate:"required,min=12,max=2000"`
	EntryDifficulty   string   `json:"entryDifficulty" validate:"required,oneof=easy moderate hard"`
	DepthMinM         *float64 `json:"depthMinM" validate:"omitempty,gte=0,lte=2000"`
	DepthMaxM         *float64 `json:"depthMaxM" validate:"omitempty,gte=0,lte=2000"`
	Hazards           []string `json:"hazards" validate:"omitempty,dive,max=60"`
	BestSeason        *string  `json:"bestSeason" validate:"omitempty,max=160"`
	TypicalConditions *string  `json:"typicalConditions" validate:"omitempty,max=500"`
	Access            *string  `json:"access" validate:"omitempty,max=500"`
	Fees              *string  `json:"fees" validate:"omitempty,max=280"`
}

type ModerateSiteRequest struct {
	Reason *string `json:"reason" validate:"omitempty,max=280"`
}

type SiteSubmissionResponse struct {
	Submission SiteSubmission `json:"submission"`
}

type SiteSubmissionListResponse struct {
	Items      []SiteSubmission `json:"items"`
	NextCursor string           `json:"nextCursor,omitempty"`
}

type SiteSubmission struct {
	ID                     string   `json:"id"`
	Slug                   string   `json:"slug"`
	Name                   string   `json:"name"`
	Area                   string   `json:"area"`
	Latitude               *float64 `json:"latitude,omitempty"`
	Longitude              *float64 `json:"longitude,omitempty"`
	Description            string   `json:"description,omitempty"`
	Difficulty             string   `json:"difficulty"`
	DepthMinM              *float64 `json:"depthMinM,omitempty"`
	DepthMaxM              *float64 `json:"depthMaxM,omitempty"`
	Hazards                []string `json:"hazards"`
	BestSeason             string   `json:"bestSeason,omitempty"`
	TypicalConditions      string   `json:"typicalConditions,omitempty"`
	Access                 string   `json:"access,omitempty"`
	Fees                   string   `json:"fees,omitempty"`
	VerificationStatus     string   `json:"verificationStatus"`
	SubmittedByAppUserID   string   `json:"submittedByAppUserId,omitempty"`
	SubmittedByDisplayName string   `json:"submittedByDisplayName,omitempty"`
	ReviewedByAppUserID    string   `json:"reviewedByAppUserId,omitempty"`
	ReviewedByDisplayName  string   `json:"reviewedByDisplayName,omitempty"`
	ReviewedAt             string   `json:"reviewedAt,omitempty"`
	ModerationReason       string   `json:"moderationReason,omitempty"`
	ModerationState        string   `json:"moderationState"`
	LastUpdatedAt          string   `json:"lastUpdatedAt"`
	UpdatedAt              string   `json:"updatedAt"`
	CreatedAt              string   `json:"createdAt"`
}

type TrustCard struct {
	EmailVerified bool   `json:"emailVerified"`
	PhoneVerified bool   `json:"phoneVerified"`
	CertLevel     string `json:"certLevel,omitempty"`
	BuddyCount    int64  `json:"buddyCount"`
	ReportCount   int64  `json:"reportCount"`
}

type ListLatestUpdatesResponse struct {
	Items      []LatestUpdate `json:"items"`
	NextCursor string         `json:"nextCursor,omitempty"`
}

type LatestUpdate struct {
	ID                   string    `json:"id"`
	DiveSiteID           string    `json:"diveSiteId"`
	SiteSlug             string    `json:"siteSlug"`
	SiteName             string    `json:"siteName"`
	SiteArea             string    `json:"siteArea"`
	AuthorAppUserID      string    `json:"authorAppUserId"`
	AuthorDisplayName    string    `json:"authorDisplayName"`
	AuthorTrust          TrustCard `json:"authorTrust"`
	Note                 string    `json:"note"`
	ConditionVisibilityM *float64  `json:"conditionVisibilityM,omitempty"`
	ConditionCurrent     string    `json:"conditionCurrent,omitempty"`
	ConditionWaves       string    `json:"conditionWaves,omitempty"`
	ConditionTempC       *float64  `json:"conditionTempC,omitempty"`
	OccurredAt           string    `json:"occurredAt"`
	CreatedAt            string    `json:"createdAt"`
}

type SiteBuddySourceBreakdown struct {
	SiteLinkedCount   int `json:"siteLinkedCount"`
	AreaFallbackCount int `json:"areaFallbackCount"`
}

type SiteBuddyPreviewResponse struct {
	Items           []SiteBuddyPreviewIntent `json:"items"`
	SourceBreakdown SiteBuddySourceBreakdown `json:"sourceBreakdown"`
}

type SiteBuddyPreviewIntent struct {
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
	MutualBuddiesCount int64  `json:"mutualBuddiesCount"`
}

type SiteBuddyIntentsResponse struct {
	Items           []SiteBuddyIntent        `json:"items"`
	NextCursor      string                   `json:"nextCursor,omitempty"`
	SourceBreakdown SiteBuddySourceBreakdown `json:"sourceBreakdown"`
}

type SiteBuddyIntent struct {
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
	MutualBuddiesCount int64  `json:"mutualBuddiesCount"`
}
