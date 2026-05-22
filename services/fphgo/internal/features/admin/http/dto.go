package http

type Pagination struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

type ProfileListResponse struct {
	Items      []AdminProfile `json:"items"`
	Pagination Pagination     `json:"pagination"`
}

type DiveSiteListResponse struct {
	Items      []AdminDiveSite `json:"items"`
	Pagination Pagination      `json:"pagination"`
}

type GroupListResponse struct {
	Items      []AdminGroup `json:"items"`
	Pagination Pagination   `json:"pagination"`
}

type GroupResponse struct {
	Group AdminGroup `json:"group"`
}

type UpdateGroupRequest struct {
	Name       *string `json:"name,omitempty" validate:"omitempty,min=3,max=120"`
	Visibility *string `json:"visibility,omitempty" validate:"omitempty,oneof=public private"`
	JoinPolicy *string `json:"joinPolicy,omitempty" validate:"omitempty,oneof=open invite_only"`
}

type AdminProfile struct {
	UserID        string `json:"userId"`
	Username      string `json:"username"`
	DisplayName   string `json:"displayName"`
	GlobalRole    string `json:"globalRole"`
	AccountStatus string `json:"accountStatus"`
	EmailVerified bool   `json:"emailVerified"`
	PhoneVerified bool   `json:"phoneVerified"`
	AvatarURL     string `json:"avatarUrl,omitempty"`
	HomeArea      string `json:"homeArea,omitempty"`
	CertLevel     string `json:"certLevel,omitempty"`
	BuddyCount    int64  `json:"buddyCount"`
	ReportCount   int64  `json:"reportCount"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
}

type AdminDiveSite struct {
	ID                 string `json:"id"`
	Slug               string `json:"slug"`
	Name               string `json:"name"`
	Area               string `json:"area"`
	ModerationState    string `json:"moderationState"`
	VerificationStatus string `json:"verificationStatus"`
	EntryDifficulty    string `json:"entryDifficulty"`
	UpdateCount        int64  `json:"updateCount"`
	LikeCount          int64  `json:"likeCount"`
	CreatedAt          string `json:"createdAt"`
	UpdatedAt          string `json:"updatedAt"`
	LastUpdatedAt      string `json:"lastUpdatedAt"`
}

type AdminGroup struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Visibility  string `json:"visibility"`
	Status      string `json:"status"`
	JoinPolicy  string `json:"joinPolicy"`
	MemberCount int64  `json:"memberCount"`
	EventCount  int64  `json:"eventCount"`
	PostCount   int64  `json:"postCount"`
	CreatedBy   string `json:"createdBy,omitempty"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}
