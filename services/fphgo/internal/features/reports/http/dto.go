package http

type CreateReportRequest struct {
	TargetType   string   `json:"targetType" validate:"required,oneof=user message chika_thread chika_comment dive_site_update"`
	TargetID     string   `json:"targetId" validate:"required"`
	ReasonCode   string   `json:"reasonCode" validate:"required,oneof=spam harassment impersonation unsafe other"`
	Details      string   `json:"details,omitempty" validate:"omitempty,max=2000"`
	EvidenceURLs []string `json:"evidenceUrls,omitempty" validate:"omitempty,dive,url"`
}

type CreateReportResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

type Report struct {
	ID              string   `json:"id"`
	ReporterUserID  string   `json:"reporterUserId"`
	TargetType      string   `json:"targetType"`
	TargetID        string   `json:"targetId"`
	TargetAppUserID string   `json:"targetAppUserId,omitempty"`
	ReasonCode      string   `json:"reasonCode"`
	Details         string   `json:"details,omitempty"`
	EvidenceURLs    []string `json:"evidenceUrls,omitempty"`
	Status          string   `json:"status"`
	CreatedAt       string   `json:"createdAt"`
	UpdatedAt       string   `json:"updatedAt"`
}

type ReportEvent struct {
	ID          string `json:"id"`
	ReportID    string `json:"reportId"`
	ActorUserID string `json:"actorUserId"`
	EventType   string `json:"eventType"`
	FromStatus  string `json:"fromStatus,omitempty"`
	ToStatus    string `json:"toStatus,omitempty"`
	Note        string `json:"note,omitempty"`
	CreatedAt   string `json:"createdAt"`
}

type ListReportsResponse struct {
	Items      []Report `json:"items"`
	NextCursor string   `json:"nextCursor,omitempty"`
}

type ReportDetailResponse struct {
	Report Report        `json:"report"`
	Events []ReportEvent `json:"events"`
}

type UpdateStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=reviewing resolved rejected"`
	Note   string `json:"note,omitempty" validate:"omitempty,max=2000"`
}

type UpdateStatusResponse struct {
	Report      Report       `json:"report"`
	LatestEvent *ReportEvent `json:"latestEvent,omitempty"`
}
