package http

import "time"

type Pagination struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

type GroupResponse struct {
	ID                       string     `json:"id"`
	Name                     string     `json:"name"`
	Slug                     string     `json:"slug"`
	Bio                      string     `json:"bio,omitempty"`
	Description              string     `json:"description,omitempty"`
	Visibility               string     `json:"visibility"`
	Status                   string     `json:"status"`
	JoinPolicy               string     `json:"joinPolicy"`
	Location                 string     `json:"location,omitempty"`
	LocationName             string     `json:"locationName,omitempty"`
	FormattedAddress         string     `json:"formattedAddress,omitempty"`
	Latitude                 *float64   `json:"latitude,omitempty"`
	Longitude                *float64   `json:"longitude,omitempty"`
	GooglePlaceID            string     `json:"googlePlaceId,omitempty"`
	RegionCode               string     `json:"regionCode,omitempty"`
	ProvinceCode             string     `json:"provinceCode,omitempty"`
	CityCode                 string     `json:"cityCode,omitempty"`
	BarangayCode             string     `json:"barangayCode,omitempty"`
	LocationSource           string     `json:"locationSource,omitempty"`
	MemberCount              int        `json:"memberCount"`
	EventCount               int        `json:"eventCount"`
	PostCount                int        `json:"postCount"`
	CreatedBy                string     `json:"createdBy,omitempty"`
	CreatedAt                time.Time  `json:"createdAt"`
	UpdatedAt                time.Time  `json:"updatedAt"`
	ViewerRole               string     `json:"viewerRole,omitempty"`
	ViewerMembershipStatus   string     `json:"viewerMembershipStatus,omitempty"`
	ViewerMembershipJoinedAt *time.Time `json:"viewerMembershipJoinedAt,omitempty"`
	ViewerInviteCreatedAt    *time.Time `json:"viewerInviteCreatedAt,omitempty"`
}

type GroupMemberResponse struct {
	GroupID     string     `json:"groupId"`
	UserID      string     `json:"userId"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	InvitedBy   string     `json:"invitedBy,omitempty"`
	InvitedAt   *time.Time `json:"invitedAt,omitempty"`
	RespondedAt *time.Time `json:"respondedAt,omitempty"`
	JoinedAt    *time.Time `json:"joinedAt,omitempty"`
	LeftAt      *time.Time `json:"leftAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	Username    string     `json:"username,omitempty"`
	DisplayName string     `json:"displayName,omitempty"`
	AvatarURL   string     `json:"avatarUrl,omitempty"`
}

type GroupPostResponse struct {
	ID              string    `json:"id"`
	GroupID         string    `json:"groupId"`
	AuthorUserID    string    `json:"authorUserId"`
	Title           string    `json:"title,omitempty"`
	Content         string    `json:"content"`
	Status          string    `json:"status"`
	LikeCount       int64     `json:"likeCount"`
	CommentCount    int64     `json:"commentCount"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	AuthorName      string    `json:"authorName,omitempty"`
	AuthorUsername  string    `json:"authorUsername,omitempty"`
	AuthorAvatarURL string    `json:"authorAvatarUrl,omitempty"`
}

type ListGroupsResponse struct {
	Groups     []GroupResponse `json:"groups"`
	Pagination Pagination      `json:"pagination"`
}

type GroupDetailResponse struct {
	Group GroupResponse `json:"group"`
}

type ListGroupMembersResponse struct {
	Members    []GroupMemberResponse `json:"members"`
	Pagination Pagination            `json:"pagination"`
}

type ListGroupPostsResponse struct {
	Posts      []GroupPostResponse `json:"posts"`
	Pagination Pagination          `json:"pagination"`
}

type CreateGroupRequest struct {
	Name             string   `json:"name" validate:"required,min=3,max=120"`
	Slug             string   `json:"slug,omitempty" validate:"omitempty,min=3,max=80"`
	Bio              string   `json:"bio,omitempty" validate:"omitempty,max=280"`
	Description      string   `json:"description,omitempty" validate:"omitempty,max=2000"`
	Visibility       string   `json:"visibility,omitempty" validate:"omitempty,oneof=public private"`
	JoinPolicy       string   `json:"joinPolicy,omitempty" validate:"omitempty,oneof=open invite_only"`
	Location         string   `json:"location,omitempty" validate:"omitempty,max=255"`
	LocationName     string   `json:"locationName,omitempty" validate:"omitempty,max=255"`
	FormattedAddress string   `json:"formattedAddress,omitempty" validate:"omitempty,max=500"`
	Latitude         *float64 `json:"latitude,omitempty"`
	Longitude        *float64 `json:"longitude,omitempty"`
	GooglePlaceID    string   `json:"googlePlaceId,omitempty" validate:"omitempty,max=255"`
	RegionCode       string   `json:"regionCode,omitempty" validate:"omitempty,max=32"`
	ProvinceCode     string   `json:"provinceCode,omitempty" validate:"omitempty,max=32"`
	CityCode         string   `json:"cityCode,omitempty" validate:"omitempty,max=32"`
	BarangayCode     string   `json:"barangayCode,omitempty" validate:"omitempty,max=32"`
	LocationSource   string   `json:"locationSource,omitempty" validate:"omitempty,oneof=manual google_places psgc psgc_mapped unmapped"`
}

type UpdateGroupRequest struct {
	Name             *string  `json:"name,omitempty" validate:"omitempty,min=3,max=120"`
	Bio              *string  `json:"bio,omitempty" validate:"omitempty,max=280"`
	Description      *string  `json:"description,omitempty" validate:"omitempty,max=2000"`
	Visibility       *string  `json:"visibility,omitempty" validate:"omitempty,oneof=public private"`
	Status           *string  `json:"status,omitempty" validate:"omitempty,oneof=active archived deleted"`
	JoinPolicy       *string  `json:"joinPolicy,omitempty" validate:"omitempty,oneof=open invite_only"`
	Location         *string  `json:"location,omitempty" validate:"omitempty,max=255"`
	LocationName     *string  `json:"locationName,omitempty" validate:"omitempty,max=255"`
	FormattedAddress *string  `json:"formattedAddress,omitempty" validate:"omitempty,max=500"`
	Latitude         *float64 `json:"latitude,omitempty"`
	Longitude        *float64 `json:"longitude,omitempty"`
	GooglePlaceID    *string  `json:"googlePlaceId,omitempty" validate:"omitempty,max=255"`
	RegionCode       *string  `json:"regionCode,omitempty" validate:"omitempty,max=32"`
	ProvinceCode     *string  `json:"provinceCode,omitempty" validate:"omitempty,max=32"`
	CityCode         *string  `json:"cityCode,omitempty" validate:"omitempty,max=32"`
	BarangayCode     *string  `json:"barangayCode,omitempty" validate:"omitempty,max=32"`
	LocationSource   *string  `json:"locationSource,omitempty" validate:"omitempty,oneof=manual google_places psgc psgc_mapped unmapped"`
}

type InviteGroupMemberRequest struct {
	UserID string `json:"userId" validate:"required,uuid"`
}

type CreateGroupPostRequest struct {
	Title   string `json:"title,omitempty" validate:"omitempty,max=200"`
	Content string `json:"content" validate:"required,min=1,max=10000"`
}

type JoinGroupResponse struct {
	Membership GroupMemberResponse `json:"membership"`
}

type InviteGroupMemberResponse struct {
	Membership GroupMemberResponse `json:"membership"`
}

type CreateGroupResponse struct {
	Group GroupResponse `json:"group"`
}

type CreateGroupPostResponse struct {
	Post GroupPostResponse `json:"post"`
}
