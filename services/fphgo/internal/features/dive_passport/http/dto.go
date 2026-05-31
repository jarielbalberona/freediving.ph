package http

type ProfilePassportResponse struct {
	Passport ProfilePassport `json:"passport"`
}

type PassportSettingsResponse struct {
	Settings PassportSettings `json:"settings"`
}

type ProfilePassport struct {
	Profile           PassportProfile           `json:"profile"`
	Stats             PassportStats             `json:"stats"`
	MapPreview        PassportMapPreview        `json:"mapPreview"`
	BadgeShowcase     PassportBadgeShowcase     `json:"badgeShowcase"`
	JourneyHighlights PassportJourneyHighlights `json:"journeyHighlights"`
	RecentMedia       PassportRecentMedia       `json:"recentMedia"`
	Memories          PassportMemoryPreview     `json:"memories"`
	Settings          PassportSettings          `json:"settings"`
}

type PassportSectionState struct {
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}

type PassportProfile struct {
	ID           string                     `json:"id"`
	Username     string                     `json:"username"`
	DisplayName  string                     `json:"displayName,omitempty"`
	Bio          string                     `json:"bio,omitempty"`
	AvatarURL    string                     `json:"avatarUrl,omitempty"`
	LocationText string                     `json:"locationText,omitempty"`
	CreatedAt    string                     `json:"createdAt"`
	Counts       PassportProfileCounts      `json:"counts"`
	Viewer       PassportViewerRelationship `json:"viewerRelationship"`
}

type PassportProfileCounts struct {
	MediaPosts int64 `json:"mediaPosts"`
	Followers  int64 `json:"followers"`
	Following  int64 `json:"following"`
}

type PassportViewerRelationship struct {
	IsSelf           bool `json:"isSelf"`
	IsFollowing      bool `json:"isFollowing"`
	IsBlocked        bool `json:"isBlocked"`
	HasBlockedViewer bool `json:"hasBlockedViewer"`
	CanMessage       bool `json:"canMessage"`
	CanFollow        bool `json:"canFollow"`
	CanEdit          bool `json:"canEdit"`
}

type PassportStats struct {
	VisitedSiteCount  int64 `json:"visitedSiteCount"`
	BadgeCount        int64 `json:"badgeCount"`
	JourneyEntryCount int64 `json:"journeyEntryCount"`
	MediaPostCount    int64 `json:"mediaPostCount"`
	MemoryCount       int64 `json:"memoryCount"`
}

type PassportMapPreview struct {
	State            PassportSectionState `json:"state"`
	VisitedSiteCount int64                `json:"visitedSiteCount"`
	Markers          []PassportMapMarker  `json:"markers"`
}

type PassportMapMarker struct {
	DiveSiteID     string `json:"diveSiteId"`
	DiveSiteSlug   string `json:"diveSiteSlug"`
	DiveSiteName   string `json:"diveSiteName"`
	DiveSiteArea   string `json:"diveSiteArea"`
	FirstVisitedAt string `json:"firstVisitedAt"`
	LastVisitedAt  string `json:"lastVisitedAt"`
	MediaPostCount int32  `json:"mediaPostCount"`
}

type PassportBadgeShowcase struct {
	State     PassportSectionState `json:"state"`
	Badges    []PassportBadge      `json:"badges"`
	AutoStats []PassportBadge      `json:"autoStats"`
}

type PassportBadge struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	Category           string `json:"category"`
	DisplayValue       string `json:"displayValue,omitempty"`
	VerificationStatus string `json:"verificationStatus"`
	IsSystemVerified   bool   `json:"isSystemVerified"`
	Visibility         string `json:"visibility"`
}

type PassportJourneyHighlights struct {
	State   PassportSectionState   `json:"state"`
	Entries []PassportJourneyEntry `json:"entries"`
}

type PassportJourneyEntry struct {
	ID         string `json:"id"`
	Type       string `json:"type"`
	Title      string `json:"title"`
	Body       string `json:"body,omitempty"`
	Visibility string `json:"visibility"`
	OccurredAt string `json:"occurredAt"`
}

type PassportRecentMedia struct {
	State PassportSectionState `json:"state"`
	Items []PassportMediaItem  `json:"items"`
}

type PassportMediaItem struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	Type      string `json:"type"`
	CreatedAt string `json:"createdAt"`
}

type PassportMemoryPreview struct {
	State PassportSectionState `json:"state"`
	Items []PassportMemoryItem `json:"items"`
}

type PassportMemoryItem struct {
	ID           string   `json:"id"`
	AuthorUserID string   `json:"authorUserId"`
	DiveSiteID   string   `json:"diveSiteId"`
	Title        string   `json:"title"`
	Body         string   `json:"body,omitempty"`
	MediaIDs     []string `json:"mediaIds"`
	Visibility   string   `json:"visibility"`
	OccurredAt   string   `json:"occurredAt"`
}

type PassportSettings struct {
	ShowMap          bool     `json:"showMap"`
	ShowBadges       bool     `json:"showBadges"`
	ShowJourney      bool     `json:"showJourney"`
	ShowMemories     bool     `json:"showMemories"`
	FeaturedBadgeIDs []string `json:"featuredBadgeIds"`
	CreatedAt        string   `json:"createdAt,omitempty"`
	UpdatedAt        string   `json:"updatedAt,omitempty"`
}

type UpdatePassportSettingsRequest struct {
	ShowMap          bool     `json:"showMap"`
	ShowBadges       bool     `json:"showBadges"`
	ShowJourney      bool     `json:"showJourney"`
	ShowMemories     bool     `json:"showMemories"`
	FeaturedBadgeIDs []string `json:"featuredBadgeIds,omitempty" validate:"omitempty,dive,uuid"`
}
