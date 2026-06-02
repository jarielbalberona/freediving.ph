package http

type ProfileResponse struct {
	Profile Profile `json:"profile"`
}

type ProfileBucketListResponse struct {
	Items []ProfileBucketListItem `json:"items"`
}

type ProfileDivingResponse struct {
	Presences  []ProfileDivePresence     `json:"presences"`
	Affinities []ProfileDiveSiteAffinity `json:"affinities"`
}

type ProfileDiveMapResponse struct {
	VisitedSiteCount int64                  `json:"visitedSiteCount"`
	Markers          []ProfileDiveMapMarker `json:"markers"`
}

type ProfileDiveMapSiteResponse struct {
	Marker   ProfileDiveMapMarker       `json:"marker"`
	Media    []ProfileDiveMapProofMedia `json:"media"`
	Memories []ProfileDiveMapMemory     `json:"memories"`
}

type ProfileDiveMemoriesPageResponse struct {
	Profile     DiveMemoriesPageProfile      `json:"profile"`
	Site        DiveMemoriesPageSite         `json:"site"`
	Entry       DiveMemoriesPageEntry        `json:"entry"`
	ProofItems  []DiveMemoriesPageProofItem  `json:"proofItems"`
	MemoryItems []DiveMemoriesPageMemoryItem `json:"memoryItems"`
	Limits      DiveMemoriesPageLimits       `json:"limits"`
}

type ProfileBadgesResponse struct {
	Templates         []BadgeTemplate        `json:"templates,omitempty"`
	Badges            []UserBadge            `json:"badges"`
	AutoStats         []UserBadge            `json:"autoStats"`
	CategorySummaries []BadgeCategorySummary `json:"categorySummaries"`
}

type UserBadgeResponse struct {
	Badge UserBadge `json:"badge"`
}

type SearchUsersResponse struct {
	Items []Profile `json:"items"`
}

type SavedHubResponse struct {
	Sites []SavedSite `json:"sites"`
	Users []SavedUser `json:"users"`
}

type Profile struct {
	UserID        string            `json:"userId"`
	Username      string            `json:"username"`
	DisplayName   string            `json:"displayName"`
	EmailVerified bool              `json:"emailVerified"`
	PhoneVerified bool              `json:"phoneVerified"`
	BuddyCount    int64             `json:"buddyCount"`
	ReportCount   int64             `json:"reportCount"`
	Bio           string            `json:"bio"`
	AvatarURL     string            `json:"avatarUrl"`
	Location      string            `json:"location"`
	HomeArea      string            `json:"homeArea"`
	Interests     []string          `json:"interests"`
	CertLevel     string            `json:"certLevel"`
	Socials       map[string]string `json:"socials"`
}

type ProfileViewResponse struct {
	Profile ProfileView `json:"profile"`
}

type ProfileView struct {
	ID                 string                    `json:"id"`
	Username           string                    `json:"username"`
	DisplayName        string                    `json:"displayName,omitempty"`
	Bio                string                    `json:"bio,omitempty"`
	AvatarURL          string                    `json:"avatarUrl,omitempty"`
	LocationText       string                    `json:"locationText,omitempty"`
	CreatedAt          string                    `json:"createdAt"`
	Counts             ProfileViewCounts         `json:"counts"`
	ViewerRelationship ProfileViewerRelationship `json:"viewerRelationship"`
}

type ProfileViewCounts struct {
	MediaPosts int64 `json:"mediaPosts"`
	Followers  int64 `json:"followers"`
	Following  int64 `json:"following"`
}

type ProfileViewerRelationship struct {
	IsSelf           bool `json:"isSelf"`
	IsFollowing      bool `json:"isFollowing"`
	IsBlocked        bool `json:"isBlocked"`
	HasBlockedViewer bool `json:"hasBlockedViewer"`
	CanMessage       bool `json:"canMessage"`
	CanFollow        bool `json:"canFollow"`
	CanEdit          bool `json:"canEdit"`
}

type ProfileBucketListItem struct {
	SiteID   string `json:"siteId"`
	SiteSlug string `json:"siteSlug"`
	SiteName string `json:"siteName"`
	SiteArea string `json:"siteArea"`
	PinnedAt string `json:"pinnedAt"`
	HasDived bool   `json:"hasDived"`
}

type ProfileDivePresence struct {
	ID               string `json:"id"`
	DiveSiteID       string `json:"diveSiteId"`
	DiveSiteSlug     string `json:"diveSiteSlug"`
	DiveSiteName     string `json:"diveSiteName"`
	DiveSiteArea     string `json:"diveSiteArea,omitempty"`
	PresenceType     string `json:"presenceType"`
	StartAt          string `json:"startAt,omitempty"`
	EndAt            string `json:"endAt,omitempty"`
	Visibility       string `json:"visibility"`
	ContactEnabled   bool   `json:"contactEnabled"`
	ViewerCanContact bool   `json:"viewerCanContact"`
	Note             string `json:"note,omitempty"`
	CreatedAt        string `json:"createdAt"`
}

type ProfileDiveSiteAffinity struct {
	ID               string `json:"id"`
	DiveSiteID       string `json:"diveSiteId"`
	DiveSiteSlug     string `json:"diveSiteSlug"`
	DiveSiteName     string `json:"diveSiteName"`
	DiveSiteArea     string `json:"diveSiteArea,omitempty"`
	Relationship     string `json:"relationship"`
	Visibility       string `json:"visibility"`
	ContactEnabled   bool   `json:"contactEnabled"`
	ViewerCanContact bool   `json:"viewerCanContact"`
	Note             string `json:"note,omitempty"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

type ProfileDiveMapMarker struct {
	DiveSiteID       string   `json:"diveSiteId"`
	DiveSiteSlug     string   `json:"diveSiteSlug"`
	DiveSiteName     string   `json:"diveSiteName"`
	DiveSiteArea     string   `json:"diveSiteArea"`
	Latitude         *float64 `json:"latitude,omitempty"`
	Longitude        *float64 `json:"longitude,omitempty"`
	FirstPostID      string   `json:"firstPostId"`
	FirstVisitedAt   string   `json:"firstVisitedAt"`
	LastPostID       string   `json:"lastPostId"`
	LastVisitedAt    string   `json:"lastVisitedAt"`
	MediaPostCount   int32    `json:"mediaPostCount"`
	Visibility       string   `json:"visibility"`
	UnlockedAt       string   `json:"unlockedAt"`
	LastProofAddedAt string   `json:"lastProofAddedAt"`
}

type ProfileDiveMapProofMedia struct {
	PostID        string `json:"postId"`
	MediaItemID   string `json:"mediaItemId"`
	MediaObjectID string `json:"mediaObjectId"`
	Type          string `json:"type"`
	URL           string `json:"url"`
	MimeType      string `json:"mimeType"`
	Width         int32  `json:"width"`
	Height        int32  `json:"height"`
	Caption       string `json:"caption,omitempty"`
	CreatedAt     string `json:"createdAt"`
}

type ProfileDiveMapMemory struct {
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

type DiveMemoriesPageProfile struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	DisplayName   string `json:"displayName,omitempty"`
	AvatarURL     string `json:"avatarUrl,omitempty"`
	ViewerIsOwner bool   `json:"viewerIsOwner"`
}

type DiveMemoriesPageSite struct {
	DiveSiteID string   `json:"diveSiteId"`
	Slug       string   `json:"slug"`
	Name       string   `json:"name"`
	Area       string   `json:"area"`
	Latitude   *float64 `json:"latitude,omitempty"`
	Longitude  *float64 `json:"longitude,omitempty"`
}

type DiveMemoriesPageEntry struct {
	FirstProofAt            string `json:"firstProofAt"`
	LastProofAt             string `json:"lastProofAt"`
	LastUpdatedAt           string `json:"lastUpdatedAt"`
	ProofCount              int32  `json:"proofCount"`
	MemoryCount             int32  `json:"memoryCount"`
	MediaCount              int32  `json:"mediaCount"`
	TextCount               int32  `json:"textCount"`
	ViewerCanCreateMemory   bool   `json:"viewerCanCreateMemory"`
	ViewerCanManageMemories bool   `json:"viewerCanManageMemories"`
}

type DiveMemoriesPageMediaAsset struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	MimeType string `json:"mimeType"`
	Width    int32  `json:"width"`
	Height   int32  `json:"height"`
	Type     string `json:"type"`
}

type DiveMemoriesPageProofItem struct {
	ID            string                     `json:"id"`
	Kind          string                     `json:"kind"`
	PostID        string                     `json:"postId"`
	MediaItemID   string                     `json:"mediaItemId"`
	MediaObjectID string                     `json:"mediaObjectId"`
	Media         DiveMemoriesPageMediaAsset `json:"media"`
	Caption       string                     `json:"caption,omitempty"`
	CreatedAt     string                     `json:"createdAt"`
	ProofLabel    string                     `json:"proofLabel"`
}

type DiveMemoriesPageMemoryAttachment struct {
	ID            string                     `json:"id"`
	MediaObjectID string                     `json:"mediaObjectId"`
	Media         DiveMemoriesPageMediaAsset `json:"media"`
	CreatedAt     string                     `json:"createdAt"`
}

type DiveMemoriesPageMemoryAuthor struct {
	UserID      string `json:"userId"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName,omitempty"`
	AvatarURL   string `json:"avatarUrl,omitempty"`
}

type DiveMemoriesPageMemoryItem struct {
	ID              string                             `json:"id"`
	Kind            string                             `json:"kind"`
	Author          DiveMemoriesPageMemoryAuthor       `json:"author"`
	Title           string                             `json:"title"`
	Body            string                             `json:"body,omitempty"`
	Visibility      string                             `json:"visibility"`
	OccurredAt      string                             `json:"occurredAt"`
	CreatedAt       string                             `json:"createdAt"`
	UpdatedAt       string                             `json:"updatedAt"`
	Attachments     []DiveMemoriesPageMemoryAttachment `json:"attachments"`
	ViewerCanEdit   bool                               `json:"viewerCanEdit"`
	ViewerCanDelete bool                               `json:"viewerCanDelete"`
}

type DiveMemoriesPageLimits struct {
	ProofItems  int32 `json:"proofItems"`
	MemoryItems int32 `json:"memoryItems"`
}

type BadgeTemplate struct {
	ID            string         `json:"id"`
	Slug          string         `json:"slug"`
	Name          string         `json:"name"`
	Category      string         `json:"category"`
	ValueType     string         `json:"valueType"`
	Unit          string         `json:"unit,omitempty"`
	Icon          string         `json:"icon,omitempty"`
	BadgeImageURL string         `json:"badgeImageUrl,omitempty"`
	Description   string         `json:"description,omitempty"`
	IsSystem      bool           `json:"isSystem"`
	DisplayOrder  int32          `json:"displayOrder"`
	Rarity        string         `json:"rarity"`
	IsPublic      bool           `json:"isPublic"`
	IsRepeatable  bool           `json:"isRepeatable"`
	SourceModule  string         `json:"sourceModule"`
	MetadataJSON  map[string]any `json:"metadataJson,omitempty"`
}

type BadgeCategorySummary struct {
	Category     string `json:"category"`
	Label        string `json:"label"`
	IdentityName string `json:"identityName"`
	ImageURL     string `json:"imageUrl"`
	Count        int64  `json:"count"`
}

type UserBadge struct {
	ID                  string         `json:"id"`
	Template            BadgeTemplate  `json:"template"`
	TemplateSlug        string         `json:"templateSlug"`
	Name                string         `json:"name"`
	Category            string         `json:"category"`
	ValueType           string         `json:"valueType"`
	ValueText           string         `json:"valueText,omitempty"`
	ValueNumber         *float64       `json:"valueNumber,omitempty"`
	ValueMinutes        *int32         `json:"valueMinutes,omitempty"`
	ValueSeconds        *int32         `json:"valueSeconds,omitempty"`
	DisplayValue        string         `json:"displayValue,omitempty"`
	FormattedValue      string         `json:"formattedValue,omitempty"`
	Unit                string         `json:"unit,omitempty"`
	Icon                string         `json:"icon,omitempty"`
	Description         string         `json:"description,omitempty"`
	ReferenceLabel      string         `json:"referenceLabel,omitempty"`
	ReferenceValue      string         `json:"referenceValue,omitempty"`
	ProofMediaID        string         `json:"proofMediaId,omitempty"`
	ProofMediaObjectKey string         `json:"proofMediaObjectKey,omitempty"`
	VerificationStatus  string         `json:"verificationStatus"`
	VerifiedAt          string         `json:"verifiedAt,omitempty"`
	VerifiedBy          string         `json:"verifiedBy,omitempty"`
	IsSystemVerified    bool           `json:"isSystemVerified,omitempty"`
	SourceType          string         `json:"sourceType"`
	SourceID            string         `json:"sourceId,omitempty"`
	EarnedDate          string         `json:"earnedDate,omitempty"`
	Visibility          string         `json:"visibility"`
	DisplayOrder        int32          `json:"displayOrder"`
	Rarity              string         `json:"rarity"`
	SourceModule        string         `json:"sourceModule"`
	IsAutoStat          bool           `json:"isAutoStat"`
	MetadataJSON        map[string]any `json:"metadataJson,omitempty"`
	CreatedAt           string         `json:"createdAt,omitempty"`
	UpdatedAt           string         `json:"updatedAt,omitempty"`
}

type SavedSite struct {
	ID                   string `json:"id"`
	Slug                 string `json:"slug"`
	Name                 string `json:"name"`
	Area                 string `json:"area"`
	Difficulty           string `json:"difficulty"`
	LastUpdatedAt        string `json:"lastUpdatedAt"`
	LastConditionSummary string `json:"lastConditionSummary,omitempty"`
	SavedAt              string `json:"savedAt"`
}

type SavedUser struct {
	UserID        string `json:"userId"`
	Username      string `json:"username"`
	DisplayName   string `json:"displayName"`
	EmailVerified bool   `json:"emailVerified"`
	PhoneVerified bool   `json:"phoneVerified"`
	AvatarURL     string `json:"avatarUrl,omitempty"`
	HomeArea      string `json:"homeArea,omitempty"`
	CertLevel     string `json:"certLevel,omitempty"`
	BuddyCount    int64  `json:"buddyCount"`
	ReportCount   int64  `json:"reportCount"`
	SavedAt       string `json:"savedAt"`
}

type UpdateMyProfileRequest struct {
	DisplayName *string            `json:"displayName" validate:"omitempty,min=1,max=80"`
	Bio         *string            `json:"bio"         validate:"omitempty,max=500"`
	AvatarURL   *string            `json:"avatarUrl"   validate:"omitempty,max=500"`
	Location    *string            `json:"location"    validate:"omitempty,max=120"`
	HomeArea    *string            `json:"homeArea"    validate:"omitempty,min=2,max=120"`
	Interests   *[]string          `json:"interests"   validate:"omitempty,max=8,dive,max=40"`
	CertLevel   *string            `json:"certLevel"   validate:"omitempty,max=80"`
	Socials     *SocialLinksUpdate `json:"socials"`
}

type UpsertUserBadgeRequest struct {
	BadgeTemplateID string         `json:"badgeTemplateId" validate:"required,uuid"`
	ValueText       *string        `json:"valueText,omitempty" validate:"omitempty,max=160"`
	ValueNumber     *float64       `json:"valueNumber,omitempty" validate:"omitempty,min=0"`
	ValueMinutes    *int32         `json:"valueMinutes,omitempty" validate:"omitempty,min=0,max=999"`
	ValueSeconds    *int32         `json:"valueSeconds,omitempty" validate:"omitempty,min=0,max=59"`
	ReferenceLabel  *string        `json:"referenceLabel,omitempty" validate:"omitempty,max=80"`
	ReferenceValue  *string        `json:"referenceValue,omitempty" validate:"omitempty,max=160"`
	ProofMediaID    *string        `json:"proofMediaId,omitempty" validate:"omitempty,uuid"`
	EarnedDate      *string        `json:"earnedDate,omitempty" validate:"omitempty,datetime=2006-01-02"`
	Visibility      *string        `json:"visibility,omitempty" validate:"omitempty,oneof=public private"`
	DisplayOrder    *int32         `json:"displayOrder,omitempty" validate:"omitempty,min=0,max=100000"`
	MetadataJSON    map[string]any `json:"metadataJson,omitempty"`
}

type SocialLinksUpdate struct {
	Website   *string `json:"website"   validate:"omitempty,url,max=255"`
	Instagram *string `json:"instagram" validate:"omitempty,url,max=255"`
	X         *string `json:"x"         validate:"omitempty,url,max=255"`
	Facebook  *string `json:"facebook"  validate:"omitempty,url,max=255"`
	Tiktok    *string `json:"tiktok"    validate:"omitempty,url,max=255"`
	YouTube   *string `json:"youtube"   validate:"omitempty,url,max=255"`
}
