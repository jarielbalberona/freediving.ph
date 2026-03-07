package http

type ProfileResponse struct {
	Profile Profile `json:"profile"`
}

type PublicProfileResponse struct {
	Profile PublicProfile `json:"profile"`
}

type PublicProfilePostsResponse struct {
	Items []PublicProfilePost `json:"items"`
}

type ProfileBucketListResponse struct {
	Items []ProfileBucketListItem `json:"items"`
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

type PublicProfile struct {
	UserID      string              `json:"userId"`
	Username    string              `json:"username"`
	DisplayName string              `json:"displayName"`
	Bio         string              `json:"bio"`
	AvatarURL   string              `json:"avatarUrl"`
	Counts      PublicProfileCounts `json:"counts"`
}

type PublicProfileCounts struct {
	Posts     int64 `json:"posts"`
	Followers int64 `json:"followers"`
	Following int64 `json:"following"`
}

type PublicProfilePost struct {
	ID           string `json:"id"`
	SiteID       string `json:"siteId"`
	SiteSlug     string `json:"siteSlug"`
	SiteName     string `json:"siteName"`
	SiteArea     string `json:"siteArea"`
	Caption      string `json:"caption"`
	OccurredAt   string `json:"occurredAt"`
	ThumbURL     string `json:"thumbUrl"`
	MediaType    string `json:"mediaType"`
	LikeCount    int64  `json:"likeCount"`
	CommentCount int64  `json:"commentCount"`
}

type ProfileBucketListItem struct {
	SiteID   string `json:"siteId"`
	SiteSlug string `json:"siteSlug"`
	SiteName string `json:"siteName"`
	SiteArea string `json:"siteArea"`
	PinnedAt string `json:"pinnedAt"`
	HasDived bool   `json:"hasDived"`
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
