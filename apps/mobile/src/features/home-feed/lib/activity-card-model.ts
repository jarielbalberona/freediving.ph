import type { Href } from "expo-router";

import type { ActivityFeedItem, ChikaReactionType } from "@freediving.ph/types";

export type HomeActivityCardType =
  | "buddy_signal"
  | "chika"
  | "dive_report"
  | "event"
  | "media_post"
  | "unknown";

export type HomeActivityCardModel = {
  actorAvatarUrl?: string;
  actorName?: string;
  actorUsername?: string;
  area?: string;
  body?: string;
  cardType: HomeActivityCardType;
  chika?: {
    replyCount: number;
    threadId: string;
    userReaction?: ChikaReactionType;
    voteCount: number;
  };
  diveSiteName?: string;
  eventMemberCount?: number;
  href?: Href;
  id: string;
  intentType?: string;
  media?: {
    commentCount: number;
    dialogUrl?: string;
    height?: number;
    itemCount: number;
    items: HomeActivityMediaItem[];
    likeCount: number;
    mediaObjectId?: string;
    postId: string;
    previewUrl?: string;
    viewerHasLiked: boolean;
    width?: number;
  };
  occurredAt: string;
  sourceLabel: string;
  tags: string[];
  title: string;
};

export type HomeActivityMediaItem = {
  dialogUrl?: string;
  displayUrl?: string;
  height?: number;
  id: string;
  mediaObjectId?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  width?: number;
};

const ACTIVITY_LABELS: Record<ActivityFeedItem["type"], string> = {
  buddy_intent_created: "Buddy request",
  chika_thread_created: "Chika",
  dive_site_update_added: "Dive report",
  event_published: "Event",
  media_post_created: "Media post",
};

const safeSegment = (value: string | undefined) => {
  const trimmed = value?.trim().replace(/^@+/, "");
  if (
    !trimmed ||
    trimmed.includes("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#")
  ) {
    return undefined;
  }
  return trimmed;
};

const segmentFromHref = (href: string | undefined, prefix: string) => {
  if (!href?.startsWith(prefix)) return undefined;
  return safeSegment(href.slice(prefix.length).split(/[?#]/)[0]);
};

const nativeDetailHref = (basePath: string, segment: string) =>
  `${basePath}/${encodeURIComponent(segment)}`;

const stringValue = (
  source: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = source?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
};

const numberValue = (
  source: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = source?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const booleanValue = (
  source: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = source?.[key];
  return typeof value === "boolean" ? value : undefined;
};

const reactionValue = (
  source: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = stringValue(source, key);
  return value === "upvote" || value === "downvote" ? value : undefined;
};

const mediaItemPreview = (
  media: NonNullable<ActivityFeedItem["media"]>[number],
  index: number,
): HomeActivityMediaItem => ({
  dialogUrl: safeRemoteImageUrl(
    media.dialogUrl || media.displayUrl || media.previewUrl || media.thumbnailUrl,
  ),
  displayUrl: safeRemoteImageUrl(media.displayUrl),
  height: typeof media.height === "number" ? media.height : undefined,
  id: media.id || media.mediaObjectId || `media-${index + 1}`,
  mediaObjectId: media.mediaObjectId,
  previewUrl: safeRemoteImageUrl(
    media.previewUrl || media.displayUrl || media.thumbnailUrl || media.dialogUrl,
  ),
  thumbnailUrl: safeRemoteImageUrl(media.thumbnailUrl),
  width: typeof media.width === "number" ? media.width : undefined,
});

const mediaPreviews = (item: ActivityFeedItem) =>
  (item.media ?? []).map((media, index) => mediaItemPreview(media, index));

const firstMediaPreview = (items: HomeActivityMediaItem[]) => {
  const first = items[0];
  if (!first) return undefined;
  return {
    dialogUrl: first.dialogUrl,
    height: first.height,
    mediaObjectId: first.mediaObjectId,
    previewUrl: first.previewUrl,
    width: first.width,
  };
};

const safeRemoteImageUrl = (value: string | undefined) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? value
      : undefined;
  } catch {
    return undefined;
  }
};

const withTags = (...values: Array<string | number | undefined>) =>
  values
    .map((value) => (typeof value === "number" ? String(value) : value?.trim()))
    .filter((value): value is string => Boolean(value));

export const getHomeActivityCardHref = (
  item: ActivityFeedItem,
): Href | undefined => {
  if (item.type === "chika_thread_created") {
    const slug = segmentFromHref(item.href, "/chika/");
    return slug
      ? { pathname: "/(app)/(tabs)/chika/[slug]", params: { slug } }
      : undefined;
  }

  if (item.type === "event_published") {
    const slug = segmentFromHref(item.href, "/events/");
    return slug
      ? { pathname: "/(app)/(tabs)/(home)/events/[slug]", params: { slug } }
      : undefined;
  }

  if (item.type === "media_post_created") {
    const postId = safeSegment(item.sourceId);
    return postId
      ? (nativeDetailHref("/(app)/(tabs)/(home)/media", postId) as Href)
      : undefined;
  }

  if (item.type === "dive_site_update_added") {
    const slug =
      safeSegment(stringValue(item.metadata, "diveSiteSlug")) ??
      segmentFromHref(item.href, "/explore/sites/");
    if (slug) {
      return {
        pathname: "/(app)/(tabs)/(home)/explore/[slug]",
        params: { slug },
      };
    }
  }

  if (item.type === "buddy_intent_created") {
    const username = safeSegment(item.actor.username);
    return username
      ? {
          pathname: "/(app)/(tabs)/(home)/profile/[username]",
          params: { username },
        }
      : { pathname: "/(app)/(tabs)/(home)/buddies" };
  }

  return undefined;
};

export const getHomeActivityCardType = (
  item: ActivityFeedItem,
): HomeActivityCardType => {
  switch (item.type) {
    case "buddy_intent_created":
      return "buddy_signal";
    case "chika_thread_created":
      return "chika";
    case "dive_site_update_added":
      return "dive_report";
    case "event_published":
      return "event";
    case "media_post_created":
      return "media_post";
    default:
      return "unknown";
  }
};

export const toHomeActivityCardModel = (
  item: ActivityFeedItem,
): HomeActivityCardModel => {
  const cardType = getHomeActivityCardType(item);
  const diveSiteName =
    stringValue(item.metadata, "diveSiteName") ??
    (cardType === "dive_report" ? item.title : undefined);
  const sourceLabel =
    cardType === "media_post"
      ? ""
      : ACTIVITY_LABELS[item.type] ?? item.sourceModule.trim() ?? "Activity";
  const mediaLikeCount =
    numberValue(item.stats, "likeCount") ??
    numberValue(item.metadata, "likeCount") ??
    0;
  const mediaCommentCount =
    numberValue(item.stats, "commentCount") ??
    numberValue(item.metadata, "commentCount") ??
    0;
  const chikaVoteCount =
    numberValue(item.stats, "voteCount") ??
    numberValue(item.stats, "reactionCount") ??
    numberValue(item.stats, "reactions") ??
    0;
  const chikaReplyCount =
    numberValue(item.stats, "replyCount") ??
    numberValue(item.stats, "replies") ??
    0;
  const mediaItems = mediaPreviews(item);
  const mediaPreview = firstMediaPreview(mediaItems);

  return {
    actorAvatarUrl: safeRemoteImageUrl(item.actor.avatarUrl),
    actorName: item.actor.name,
    actorUsername: safeSegment(item.actor.username),
    area: item.area,
    body: item.body,
    cardType,
    chika:
      cardType === "chika"
        ? {
            replyCount: chikaReplyCount,
            threadId: item.sourceId,
            userReaction:
              reactionValue(item.stats, "userReaction") ??
              reactionValue(item.stats, "viewerReaction") ??
              reactionValue(item.metadata, "userReaction") ??
              reactionValue(item.metadata, "viewerReaction"),
            voteCount: chikaVoteCount,
          }
        : undefined,
    diveSiteName,
    eventMemberCount: numberValue(item.stats, "memberCount"),
    href: getHomeActivityCardHref(item),
    id: item.id,
    intentType:
      cardType === "buddy_signal"
        ? stringValue(item.metadata, "intentType") ?? item.title
        : undefined,
    media:
      cardType === "media_post"
        ? {
            commentCount: mediaCommentCount,
            dialogUrl: mediaPreview?.dialogUrl,
            height: mediaPreview?.height,
            itemCount: item.media?.length ?? 0,
            items: mediaItems,
            likeCount: mediaLikeCount,
            mediaObjectId: mediaPreview?.mediaObjectId,
            postId: item.sourceId,
            previewUrl: mediaPreview?.previewUrl,
            viewerHasLiked:
              booleanValue(item.stats, "viewerHasLiked") ??
              booleanValue(item.metadata, "viewerHasLiked") ??
              false,
            width: mediaPreview?.width,
          }
        : undefined,
    occurredAt: item.occurredAt,
    sourceLabel,
    tags:
      cardType === "chika"
        ? withTags(
            stringValue(item.metadata, "categoryName"),
            `${chikaReplyCount} replies`,
          )
        : cardType === "media_post"
          ? withTags(diveSiteName, item.area, `${mediaLikeCount} likes`)
          : cardType === "event"
            ? withTags(`${numberValue(item.stats, "memberCount") ?? 0} members`)
            : cardType === "buddy_signal"
              ? withTags(item.area, stringValue(item.metadata, "timeWindow"))
              : withTags(diveSiteName, item.area),
    title:
      item.title || item.body || "Community update",
  };
};
