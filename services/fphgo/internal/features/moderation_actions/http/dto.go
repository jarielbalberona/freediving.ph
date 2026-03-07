package http

type ActionRequest struct {
	Reason   string  `json:"reason" validate:"required,min=1,max=2000"`
	ReportID *string `json:"reportId,omitempty" validate:"omitempty,uuid"`
}

type ModerationAction struct {
	ID          string `json:"id"`
	ActorUserID string `json:"actorUserId"`
	TargetType  string `json:"targetType"`
	TargetID    string `json:"targetId"`
	Action      string `json:"action"`
	Reason      string `json:"reason"`
	ReportID    string `json:"reportId,omitempty"`
	CreatedAt   string `json:"createdAt"`
}

type ActionResponse struct {
	Action ModerationAction `json:"action"`
}
