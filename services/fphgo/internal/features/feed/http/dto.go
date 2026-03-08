package http

type HomeResponse struct {
	Context         HomeContext         `json:"context"`
	QuickActions    []HomeQuickAction   `json:"quickActions"`
	NearbyCondition HomeNearbyCondition `json:"nearbyCondition"`
	Items           []HomeFeedItem      `json:"items"`
	NextCursor      string              `json:"nextCursor,omitempty"`
}

type HomeContext struct {
	Greeting    string `json:"greeting"`
	Message     string `json:"message"`
	SafetyBadge string `json:"safetyBadge"`
}

type HomeQuickAction struct {
	Type  string `json:"type"`
	Label string `json:"label"`
}

type HomeNearbyCondition struct {
	Spot       string `json:"spot"`
	DistanceKm *int32 `json:"distanceKm,omitempty"`
	Safety     string `json:"safety"`
	Current    string `json:"current"`
	Visibility string `json:"visibility"`
	WaterTemp  string `json:"waterTemp"`
	Wind       string `json:"wind"`
	Sunrise    string `json:"sunrise"`
}

type HomeFeedItem struct {
	ID         string         `json:"id"`
	Type       string         `json:"type"`
	EntityID   string         `json:"entityId"`
	Score      float64        `json:"score"`
	Reasons    []string       `json:"reasons"`
	TypeLabel  string         `json:"typeLabel"`
	TypeHint   string         `json:"typeHint"`
	RankLabel  string         `json:"rankLabel"`
	RankHint   string         `json:"rankHint"`
	Tone       string         `json:"tone"`
	DetailHref string         `json:"detailHref,omitempty"`
	AuthorHref string         `json:"authorHref,omitempty"`
	CreatedAt  string         `json:"createdAt"`
	Payload    map[string]any `json:"payload"`
}

type LogImpressionsRequest struct {
	SessionID string                  `json:"sessionId" validate:"required,max=100"`
	Mode      string                  `json:"mode" validate:"omitempty,oneof=following nearby training spot-reports"`
	Items     []LogImpressionItemBody `json:"items" validate:"required,min=1,max=100,dive"`
}

type LogImpressionItemBody struct {
	FeedItemID string `json:"feedItemId" validate:"required,max=120"`
	EntityType string `json:"entityType" validate:"required,max=60"`
	EntityID   string `json:"entityId" validate:"required,max=120"`
	Position   int    `json:"position" validate:"gte=0,lte=10000"`
	SeenAt     string `json:"seenAt" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

type LogActionsRequest struct {
	SessionID string              `json:"sessionId" validate:"required,max=100"`
	Mode      string              `json:"mode" validate:"omitempty,oneof=following nearby training spot-reports"`
	Items     []LogActionItemBody `json:"items" validate:"required,min=1,max=100,dive"`
}

type LogActionItemBody struct {
	FeedItemID string         `json:"feedItemId" validate:"omitempty,max=120"`
	EntityType string         `json:"entityType" validate:"required,max=60"`
	EntityID   string         `json:"entityId" validate:"required,max=120"`
	ActionType string         `json:"actionType" validate:"required,max=60"`
	Value      map[string]any `json:"valueJson"`
	CreatedAt  string         `json:"createdAt" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}
