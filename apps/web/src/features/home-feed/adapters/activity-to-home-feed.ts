import {
  canLinkToProfileUsername,
  getProfileRoute,
} from "@/lib/routes";
import type {
  ActivityFeedItem,
  HomeFeedItem,
  HomeFeedItemTone,
  HomeFeedItemType,
} from "@freediving.ph/types";

const stringValue = (
  value: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const candidate = value?.[key];
  return typeof candidate === "string" && candidate.trim() !== ""
    ? candidate
    : undefined;
};

const numberValue = (
  value: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const candidate = value?.[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : undefined;
};

const booleanValue = (
  value: Record<string, unknown> | undefined,
  key: string,
): boolean | undefined => {
  const candidate = value?.[key];
  return typeof candidate === "boolean" ? candidate : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;

const mediaStringValue = (value: unknown, key: string): string | undefined =>
  stringValue(asRecord(value), key);

const mediaNumberValue = (value: unknown, key: string): number | undefined =>
  numberValue(asRecord(value), key);

const actorPayload = (item: ActivityFeedItem) => ({
  authorName: item.actor.name,
  authorUsername: item.actor.username,
  authorAvatarUrl: item.actor.avatarUrl,
  authorPseudonymous: item.actor.id.trim() === "",
});

const authorHref = (item: ActivityFeedItem) =>
  canLinkToProfileUsername(item.actor.username)
    ? getProfileRoute(item.actor.username)
    : undefined;

const baseItem = (
  item: ActivityFeedItem,
  input: {
    type: HomeFeedItemType;
    entityId: string;
    typeLabel: string;
    typeHint: string;
    tone: HomeFeedItemTone;
    detailHref?: string;
    payload: Record<string, unknown>;
  },
): HomeFeedItem => ({
  id: item.id,
  feedSource: "activity",
  type: input.type,
  entityId: input.entityId,
  telemetryEntityType: "activity_item",
  telemetryEntityId: item.id,
  score: 0,
  reasons: ["activity_items"],
  typeLabel: input.typeLabel,
  typeHint: input.typeHint,
  rankLabel: "Activity",
  rankHint: "",
  tone: input.tone,
  detailHref: input.detailHref,
  authorHref: authorHref(item),
  createdAt: item.occurredAt,
  payload: input.payload,
});

const mapChikaThread = (item: ActivityFeedItem): HomeFeedItem =>
  baseItem(item, {
    type: "community_hot_post",
    entityId: item.target.id || item.sourceId,
    typeLabel: "Chika",
    typeHint: "Chika",
    tone: "social",
    detailHref: item.href,
    payload: {
      ...actorPayload(item),
      title: item.title,
      categoryName: stringValue(item.metadata, "categoryName"),
      replyCount:
        numberValue(item.stats, "replies") ??
        numberValue(item.stats, "replyCount"),
      reactionCount:
        numberValue(item.stats, "reactions") ??
        numberValue(item.stats, "reactionCount"),
    },
  });

const mapDiveSiteUpdate = (item: ActivityFeedItem): HomeFeedItem =>
  baseItem(item, {
    type: "post",
    entityId: item.sourceId,
    typeLabel: "Dive report",
    typeHint: "Site update",
    tone: "conditions",
    detailHref: item.href,
    payload: {
      ...actorPayload(item),
      diveSiteSlug: stringValue(item.metadata, "diveSiteSlug"),
      diveSiteName: stringValue(item.metadata, "diveSiteName") ?? item.title,
      area: item.area,
      note: item.body,
      current: stringValue(item.metadata, "conditionCurrent"),
      waves: stringValue(item.metadata, "conditionWaves"),
    },
  });

const mapEvent = (item: ActivityFeedItem): HomeFeedItem =>
  baseItem(item, {
    type: "event",
    entityId: item.eventId || item.target.id || item.sourceId,
    typeLabel: "Event",
    typeHint: "Published event",
    tone: "coordination",
    detailHref: item.href,
    payload: {
      title: item.title,
      memberCount: numberValue(item.stats, "memberCount"),
    },
  });

const mapBuddyIntent = (item: ActivityFeedItem): HomeFeedItem =>
  baseItem(item, {
    type: "buddy_signal",
    entityId: item.sourceId,
    typeLabel: "Buddy request",
    typeHint: "Buddy finder",
    tone: "coordination",
    detailHref: item.href,
    payload: {
      ...actorPayload(item),
      area: item.area,
      intentType: item.title,
      timeWindow: stringValue(item.metadata, "timeWindow"),
      note: item.body,
      diveSiteName: stringValue(item.metadata, "diveSiteName"),
      diveSiteId: item.diveSiteId,
    },
  });

const mapMediaPost = (item: ActivityFeedItem): HomeFeedItem => {
  const firstMedia = item.media?.[0];
  const previewMediaId = mediaStringValue(firstMedia, "mediaObjectId");
  const previewDisplayUrl = mediaStringValue(firstMedia, "displayUrl");
  const previewDialogUrl = mediaStringValue(firstMedia, "dialogUrl");
  const previewWidth = mediaNumberValue(firstMedia, "width");
  const previewHeight = mediaNumberValue(firstMedia, "height");

  if (!previewMediaId || !previewWidth || !previewHeight) {
    return baseItem(item, {
      type: "post",
      entityId: item.sourceId,
      typeLabel: "Media post",
      typeHint: "Media post",
      tone: "social",
      detailHref: item.href,
      payload: {
        ...actorPayload(item),
        diveSiteName: stringValue(item.metadata, "diveSiteName") ?? item.title,
        diveSiteSlug: stringValue(item.metadata, "diveSiteSlug"),
        area: item.area,
        note: item.body,
        mediaUnavailableReason:
          stringValue(item.metadata, "mediaUnavailableReason") ??
          "media_not_displayable",
      },
    });
  }

  return baseItem(item, {
    type: "media_post",
    entityId: item.sourceId,
    typeLabel: "Media post",
    typeHint: "Media post",
    tone: "social",
    detailHref: item.href,
    payload: {
      ...actorPayload(item),
      diveSiteName: stringValue(item.metadata, "diveSiteName") ?? item.title,
      diveSiteSlug: stringValue(item.metadata, "diveSiteSlug"),
      area: item.area,
      postCaption: item.body,
      previewCaption: item.body,
      previewMediaId,
      previewDisplayUrl,
      previewDialogUrl,
      previewWidth,
      previewHeight,
      likeCount:
        numberValue(item.stats, "likeCount") ??
        numberValue(item.metadata, "likeCount") ??
        0,
      viewerHasLiked:
        booleanValue(item.stats, "viewerHasLiked") ??
        booleanValue(item.metadata, "viewerHasLiked") ??
        false,
      commentCount:
        numberValue(item.stats, "commentCount") ??
        numberValue(item.metadata, "commentCount") ??
        0,
      viewerHasSaved:
        booleanValue(item.stats, "viewerHasSaved") ??
        booleanValue(item.metadata, "viewerHasSaved") ??
        false,
      itemCount: item.media?.length ?? 0,
      items:
        item.media
          ?.map((media, index) => {
            const mediaObjectId = mediaStringValue(media, "mediaObjectId");
            const width = mediaNumberValue(media, "width");
            const height = mediaNumberValue(media, "height");
            if (!mediaObjectId || !width || !height) return null;
            return {
              id: mediaStringValue(media, "id") ?? `${item.id}-${index + 1}`,
              mediaObjectId,
              displayUrl: mediaStringValue(media, "displayUrl"),
              dialogUrl: mediaStringValue(media, "dialogUrl"),
              width,
              height,
              caption: mediaStringValue(media, "caption"),
              sortOrder: index,
            };
          })
          .filter((media): media is NonNullable<typeof media> =>
            Boolean(media),
          ) ?? [],
    },
  });
};

export const activityToHomeFeedItem = (
  item: ActivityFeedItem,
): HomeFeedItem | null => {
  switch (item.type) {
    case "chika_thread_created":
      return mapChikaThread(item);
    case "dive_site_update_added":
      return mapDiveSiteUpdate(item);
    case "event_published":
      return mapEvent(item);
    case "buddy_intent_created":
      return mapBuddyIntent(item);
    case "media_post_created":
      return mapMediaPost(item);
    default:
      if (process.env.NODE_ENV === "development") {
        console.warn("Unsupported activity feed item type", item.type);
      }
      return null;
  }
};

export const activityToHomeFeedItems = (
  items: ActivityFeedItem[],
): HomeFeedItem[] =>
  items
    .map((item) => activityToHomeFeedItem(item))
    .filter((item): item is HomeFeedItem => Boolean(item));
