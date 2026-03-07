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
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description,omitempty"`
	Visibility  string    `json:"visibility"`
	Status      string    `json:"status"`
	JoinPolicy  string    `json:"joinPolicy"`
	Location    string    `json:"location,omitempty"`
	MemberCount int       `json:"memberCount"`
	EventCount  int       `json:"eventCount"`
	PostCount   int       `json:"postCount"`
	CreatedBy   string    `json:"createdBy,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type GroupMemberResponse struct {
	GroupID     string     `json:"groupId"`
	UserID      string     `json:"userId"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	JoinedAt    *time.Time `json:"joinedAt,omitempty"`
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
	Name        string `json:"name" validate:"required,min=3,max=120"`
	Slug        string `json:"slug,omitempty" validate:"omitempty,min=3,max=80"`
	Description string `json:"description,omitempty" validate:"omitempty,max=2000"`
	Visibility  string `json:"visibility,omitempty" validate:"omitempty,oneof=public private invite_only"`
	JoinPolicy  string `json:"joinPolicy,omitempty" validate:"omitempty,oneof=open approval invite_only"`
	Location    string `json:"location,omitempty" validate:"omitempty,max=255"`
}

type UpdateGroupRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=3,max=120"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=2000"`
	Visibility  *string `json:"visibility,omitempty" validate:"omitempty,oneof=public private invite_only"`
	Status      *string `json:"status,omitempty" validate:"omitempty,oneof=active archived deleted"`
	JoinPolicy  *string `json:"joinPolicy,omitempty" validate:"omitempty,oneof=open approval invite_only"`
	Location    *string `json:"location,omitempty" validate:"omitempty,max=255"`
}

type CreateGroupPostRequest struct {
	Title   string `json:"title,omitempty" validate:"omitempty,max=200"`
	Content string `json:"content" validate:"required,min=1,max=10000"`
}

type JoinGroupResponse struct {
	Membership GroupMemberResponse `json:"membership"`
}

type CreateGroupResponse struct {
	Group GroupResponse `json:"group"`
}

type CreateGroupPostResponse struct {
	Post GroupPostResponse `json:"post"`
}
