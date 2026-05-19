package service

import "time"

type Mode string

const (
	ModeLatest      Mode = "latest"
	ModeNearby      Mode = "nearby"
	ModeChika       Mode = "chika"
	ModeDiveReports Mode = "dive-reports"
	ModeEvents      Mode = "events"
)

type FeedSource string

const (
	FeedSourceHome     FeedSource = "home"
	FeedSourceActivity FeedSource = "activity"
)

type ItemType string

const (
	ItemTypePost         ItemType = "post"
	ItemTypeMediaPost    ItemType = "media_post"
	ItemTypeCommunityHot ItemType = "community_hot_post"
	ItemTypeDiveSpot     ItemType = "dive_spot"
	ItemTypeEvent        ItemType = "event"
	ItemTypeBuddySignal  ItemType = "buddy_signal"
)

type HomeInput struct {
	UserID string
	Mode   Mode
	Cursor string
	Region string
	Limit  int
}

type HomeResult struct {
	Context         ContextBlock
	QuickActions    []QuickAction
	NearbyCondition NearbyCondition
	Items           []FeedItem
	NextCursor      string
}

type ContextBlock struct {
	Greeting    string
	Message     string
	SafetyBadge string
}

type QuickAction struct {
	Type  string
	Label string
}

type NearbyCondition struct {
	Spot       string
	DistanceKm *int32
	Safety     string
	Current    string
	Visibility string
	WaterTemp  string
	Wind       string
	Sunrise    string
}

type FeedItem struct {
	ID                  string         `json:"id"`
	FeedSource          string         `json:"feedSource,omitempty"`
	Type                ItemType       `json:"type"`
	EntityID            string         `json:"entityId"`
	TelemetryEntityType string         `json:"telemetryEntityType,omitempty"`
	TelemetryEntityID   string         `json:"telemetryEntityId,omitempty"`
	Score               float64        `json:"score"`
	Reasons             []string       `json:"reasons"`
	TypeLabel           string         `json:"typeLabel"`
	TypeHint            string         `json:"typeHint"`
	RankLabel           string         `json:"rankLabel"`
	RankHint            string         `json:"rankHint"`
	Tone                string         `json:"tone"`
	DetailHref          string         `json:"detailHref,omitempty"`
	AuthorHref          string         `json:"authorHref,omitempty"`
	CreatedAt           string         `json:"createdAt"`
	Payload             map[string]any `json:"payload"`
}

type rankedItem struct {
	FeedItem
	ActorUserID string
	Area        string
	rawScore    float64
	normScore   float64
}

type TelemetryImpression struct {
	FeedItemID string
	Source     FeedSource
	EntityType string
	EntityID   string
	Mode       Mode
	Position   int
	SeenAt     time.Time
}

type TelemetryAction struct {
	FeedItemID string
	Source     FeedSource
	EntityType string
	EntityID   string
	ActionType string
	Mode       Mode
	Value      map[string]any
	CreatedAt  time.Time
}
