# Feed Contracts And Ranking

## 1) API Contract

### `GET /v1/feed/home`

Query parameters:
- `mode=following|nearby|training|spot-reports`
- `cursor=<opaque>`
- `region=<optional>`

Response:
```json
{
  "context": {
    "greeting": "Good afternoon, diver",
    "message": "Conditions look stable near your saved spots.",
    "safetyBadge": "Dive with a buddy"
  },
  "quickActions": [
    { "type": "log_dive", "label": "Log dive" },
    { "type": "find_buddy", "label": "Find buddy" },
    { "type": "explore_spots", "label": "Explore spots" },
    { "type": "create_session", "label": "Create session" }
  ],
  "nearbyCondition": {
    "spot": "Apo Island",
    "distanceKm": 18,
    "safety": "Stable",
    "current": "Light",
    "visibility": "12m",
    "waterTemp": "28°C",
    "wind": "Low",
    "sunrise": "6:01 AM"
  },
  "items": [],
  "nextCursor": "opaque_cursor"
}
```

### Telemetry endpoints
- `POST /v1/feed/impressions`
- `POST /v1/feed/actions`

Use batched payloads where possible.

## 2) Mixed Item Contract

Use discriminated union with a common envelope.

```ts
type FeedItemType =
  | "post"
  | "community_hot_post"
  | "dive_spot"
  | "event"
  | "buddy_signal"
  | "record_highlight";

type FeedItemBase = {
  id: string;
  type: FeedItemType;
  entityId: string;
  score: number;
  reasons: string[];
  createdAt: string;
};
```

Each `type` must have a dedicated payload shape.

## 3) Ownership Boundary

Backend owns:
- candidate generation
- scoring
- normalization
- merge/re-rank
- cursor creation

Frontend owns:
- rendering
- user interactions
- optimistic UI where safe
- telemetry emission

## 4) Ranking Model (v1)

### Per-type scoring inputs
- Post: follow affinity, creator affinity, local relevance, freshness, quality engagement, fatigue penalty.
- Community hot post: reply velocity, topic/group affinity, local relevance, moderation quality.
- Dive spot: geo relevance, saved/viewed affinity, recent activity, trust/completeness.
- Event: geo relevance, time proximity, type affinity, organizer trust, network interest.
- Buddy signal: overlap in area, shared graph/groups, recency, skill overlap, trust.
- Record highlight: followed diver relevance, region relevance, freshness, significance.

### Merge/re-rank pipeline
1. Pull top candidates per type.
2. Normalize scores within type.
3. Apply mode multipliers.
4. Merge using soft composition targets.
5. Enforce hard diversity/safety rules.

Suggested soft targets:
- 50% posts
- 15% community
- 15% dive spots
- 10% events
- 5% buddy signals
- 5% record highlights

Hard rules:
- max local window duplicates by creator
- no duplicate entities
- avoid repetitive adjacent type runs unless mode requires it
- enforce moderation/block/hide suppression

## 5) Mode Semantics

- `following`: network-heavy social utility.
- `nearby`: geo utility first.
- `training`: technique, instruction, progress.
- `spot-reports`: conditions and spot-linked utility.

## 6) Telemetry Taxonomy

Impression fields (minimum):
- `user_id`, `feed_item_id`, `entity_type`, `entity_id`
- `mode`, `position`, `session_id`, `seen_at`

Action fields (minimum):
- `user_id`, `session_id`, `entity_type`, `entity_id`
- `action_type`, `value_json`, `created_at`

Action examples:
- `open_post`
- `like_post`
- `save_spot`
- `open_event`
- `hide_item`
- `not_interested`
- `message_buddy`
- `join_thread`

## 7) Minimal Schema Additions

- `feed_impressions`
- `feed_actions`
- `user_hidden_feed_items` (recommended)
- `user_feed_preferences` (optional early)

Do not build a giant denormalized `feed_items` table in v1.

## 8) Observability Requirements

Track:
- response latency and error rate
- candidate counts per entity type
- composition share by entity type and mode
- duplicate/repetition rate
- CTR/open/save/hide by entity type
- suppression counts (block/hide/moderation)
- cold-start fallback frequency
