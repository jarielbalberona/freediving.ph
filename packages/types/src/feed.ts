export type HomeFeedMode =
  | "latest"
  | "nearby"
  | "chika"
  | "dive-reports"
  | "events";

export type FeedSource = "home" | "activity";

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
  feedSource?: FeedSource;
  type: HomeFeedItemType;
  entityId: string;
  telemetryEntityType?: string;
  telemetryEntityId?: string;
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

export type ActivityFeedFilter =
  | "latest"
  | "nearby"
  | "chika"
  | "dive-reports"
  | "events";

export type ActivityFeedItemType =
  | "chika_thread_created"
  | "dive_site_update_added"
  | "event_published"
  | "buddy_intent_created"
  | "media_post_created";

export type ActivityFeedVisibility =
  | "public"
  | "members"
  | "followers"
  | "group_members"
  | "private";

export interface ActivityFeedActor {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface ActivityFeedTarget {
  type: string;
  id: string;
}

export interface ActivityFeedItem {
  id: string;
  type: ActivityFeedItemType;
  sourceModule: string;
  sourceType: string;
  sourceId: string;
  actor: ActivityFeedActor;
  target: ActivityFeedTarget;
  visibility: ActivityFeedVisibility;
  occurredAt: string;
  title?: string;
  body?: string;
  area?: string;
  diveSiteId?: string;
  groupId?: string;
  eventId?: string;
  media?: Array<Record<string, unknown>>;
  stats?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  href?: string;
}

export interface ActivityFeedResponse {
  items: ActivityFeedItem[];
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
  source?: FeedSource;
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
  source?: FeedSource;
  mode: HomeFeedMode;
  items: FeedActionItem[];
}
