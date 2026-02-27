package http

type CreateBuddyRequestRequest struct {
	TargetUserID string `json:"targetUserId" validate:"required,uuid"`
}

type BuddyRequest struct {
	ID              string `json:"id"`
	RequesterUserID string `json:"requesterUserId"`
	TargetUserID    string `json:"targetUserId"`
	Status          string `json:"status"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
}

type BuddyProfile struct {
	UserID      string `json:"userId"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl"`
}

type CreateBuddyRequestResponse struct {
	Request BuddyRequest `json:"request"`
}

type IncomingBuddyRequest struct {
	Request   BuddyRequest `json:"request"`
	Requester BuddyProfile `json:"requester"`
}

type OutgoingBuddyRequest struct {
	Request BuddyRequest `json:"request"`
	Target  BuddyProfile `json:"target"`
}

type ListIncomingBuddyRequestsResponse struct {
	Items []IncomingBuddyRequest `json:"items"`
}

type ListOutgoingBuddyRequestsResponse struct {
	Items []OutgoingBuddyRequest `json:"items"`
}

type ListBuddiesResponse struct {
	Items []BuddyProfile `json:"items"`
}

type BuddyPreviewResponse struct {
	Count int            `json:"count"`
	Items []BuddyProfile `json:"items"`
}
