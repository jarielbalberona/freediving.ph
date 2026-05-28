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

type SocialLinksUpdate struct {
	Website   *string `json:"website"   validate:"omitempty,url,max=255"`
	Instagram *string `json:"instagram" validate:"omitempty,url,max=255"`
	X         *string `json:"x"         validate:"omitempty,url,max=255"`
	Facebook  *string `json:"facebook"  validate:"omitempty,url,max=255"`
	Tiktok    *string `json:"tiktok"    validate:"omitempty,url,max=255"`
	YouTube   *string `json:"youtube"   validate:"omitempty,url,max=255"`
}
