import type { Href } from "expo-router";

import type { ActivityFeedItem } from "@freediving.ph/types";

export type HomeActivityCardModel = {
  actorName?: string;
  area?: string;
  body?: string;
  href?: Href;
  id: string;
  occurredAt: string;
  sourceLabel: string;
  thumbnailUrl?: string;
  title: string;
};

const ACTIVITY_LABELS: Record<ActivityFeedItem["type"], string> = {
  buddy_intent_created: "Buddy Finder",
  chika_thread_created: "Chika",
  dive_site_update_added: "Dive report",
  event_published: "Event",
  media_post_created: "Community photo",
};

const safeSegment = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("?") || trimmed.includes("#")) {
    return undefined;
  }
  return trimmed;
};

const segmentFromHref = (href: string | undefined, prefix: string) => {
  if (!href?.startsWith(prefix)) return undefined;
  return safeSegment(href.slice(prefix.length).split(/[?#]/)[0]);
};

const stringMetadata = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
};

const firstThumbnailUrl = (item: ActivityFeedItem) => {
  const first = item.media?.[0];
  return first?.displayUrl || first?.dialogUrl;
};

export const getHomeActivityCardHref = (item: ActivityFeedItem): Href | undefined => {
  if (item.type === "chika_thread_created") {
    const slug = segmentFromHref(item.href, "/chika/");
    return slug ? { pathname: "/(app)/chika/[slug]", params: { slug } } : undefined;
  }

  if (item.type === "event_published") {
    const slug = segmentFromHref(item.href, "/events/");
    return slug ? { pathname: "/(app)/events/[slug]", params: { slug } } : undefined;
  }

  if (item.type === "dive_site_update_added" || item.type === "media_post_created") {
    const slug =
      safeSegment(stringMetadata(item.metadata, "diveSiteSlug")) ??
      segmentFromHref(item.href, "/explore/sites/");
    if (slug) {
      return { pathname: "/(app)/explore/[slug]", params: { slug } };
    }
  }

  const username = item.type === "media_post_created" ? safeSegment(item.actor.username) : undefined;
  return username
    ? { pathname: "/(app)/profile/[username]", params: { username } }
    : undefined;
};

export const toHomeActivityCardModel = (
  item: ActivityFeedItem,
): HomeActivityCardModel => ({
  actorName: item.actor.name,
  area: item.area,
  body: item.body,
  href: getHomeActivityCardHref(item),
  id: item.id,
  occurredAt: item.occurredAt,
  sourceLabel: ACTIVITY_LABELS[item.type] ?? item.sourceModule,
  thumbnailUrl: firstThumbnailUrl(item),
  title: item.title || item.body || "Community update",
});
