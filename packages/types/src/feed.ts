export type HomeFeedMode = "following" | "nearby" | "training" | "spot-reports";

export type HomeFeedItemType =
  | "post"
  | "media_post"
  | "community_hot_post"
  | "dive_spot"
  | "event"
  | "buddy_signal"
  | "record_highlight";

export type HomeFeedItemTone =
  | "social"
  | "coordination"
  | "conditions"
  | "discovery"
  | "milestone";

export interface HomeFeedContext {
  greeting: string;
  message: string;
  safetyBadge: string;
}

export interface HomeFeedQuickAction {
  type: string;
  label: string;
}

export interface HomeFeedNearbyCondition {
  spot: string;
  distanceKm?: number;
  safety: string;
  current: string;
  visibility: string;
  waterTemp: string;
  wind: string;
  sunrise: string;
}

export interface HomeFeedItemBase {
  id: string;
  type: HomeFeedItemType;
  entityId: string;
  score: number;
  reasons: string[];
  typeLabel: string;
  typeHint: string;
  rankLabel: string;
  rankHint: string;
  tone: HomeFeedItemTone;
  detailHref?: string;
  authorHref?: string;
  createdAt: string;
}

export interface HomeFeedItem extends HomeFeedItemBase {
  payload: Record<string, unknown>;
}

export interface HomeFeedResponse {
  context: HomeFeedContext;
  quickActions: HomeFeedQuickAction[];
  nearbyCondition: HomeFeedNearbyCondition;
  items: HomeFeedItem[];
  nextCursor?: string;
}

export interface FeedImpressionItem {
  feedItemId: string;
  entityType: string;
  entityId: string;
  position: number;
  seenAt?: string;
}

export interface FeedImpressionsRequest {
  sessionId: string;
  mode: HomeFeedMode;
  items: FeedImpressionItem[];
}

export interface FeedActionItem {
  feedItemId?: string;
  entityType: string;
  entityId: string;
  actionType: string;
  valueJson?: Record<string, unknown>;
  createdAt?: string;
}

export interface FeedActionsRequest {
  sessionId: string;
  mode: HomeFeedMode;
  items: FeedActionItem[];
}
