package http

type groupScopeResponse struct {
	GroupID string `json:"groupId"`
	Role    string `json:"role"`
}

type eventScopeResponse struct {
	EventID string `json:"eventId"`
	Role    string `json:"role"`
}

type sessionScopesResponse struct {
	Group *groupScopeResponse `json:"group"`
	Event *eventScopeResponse `json:"event"`
}

type sessionResponse struct {
	UserID        string                `json:"userId"`
	ClerkSubject  string                `json:"clerkSubject"`
	GlobalRole    string                `json:"globalRole"`
	AccountStatus string                `json:"accountStatus"`
	Permissions   []string              `json:"permissions"`
	Scopes        sessionScopesResponse `json:"scopes"`
}
