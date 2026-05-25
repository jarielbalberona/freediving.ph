import type { HomeFeedItem, MediaPostDetailResponse } from "@freediving.ph/types";
import { canLinkToProfileUsername, getProfileRoute } from "@/lib/routes";

export type MediaPostDisplayItem = {
  id: string;
  mediaObjectId: string;
  type: "photo" | "video";
  displayUrl?: string;
  dialogUrl?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  width: number;
  height: number;
  caption?: string | null;
  alt: string;
};

export type MediaPostDisplay = {
  id: string;
  href?: string;
  author: {
    displayName: string;
    username?: string;
    avatarUrl?: string | null;
  };
  createdAt?: string;
  postType: "media";
  badgeLabel: string;
  caption: string;
  media: MediaPostDisplayItem[];
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  diveSite?: {
    name?: string;
    area?: string;
    slug?: string;
  };
  itemCount?: number;
};

const stringValue = (value: Record<string, unknown>, key: string) => {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : undefined;
};

const numberValue = (value: Record<string, unknown>, key: string) => {
  const candidate = value[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : undefined;
};

const booleanValue = (value: Record<string, unknown>, key: string) => {
  const candidate = value[key];
  return typeof candidate === "boolean" ? candidate : undefined;
};

export function mediaPostFromHomeFeedItem(item: HomeFeedItem): MediaPostDisplay {
  const payload = item.payload ?? {};
  const caption =
    stringValue(payload, "postCaption") ||
    stringValue(payload, "previewCaption") ||
    "No caption";
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const media = rawItems
    .map((raw, index): MediaPostDisplayItem | null => {
      const photo = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const mediaObjectId = stringValue(photo, "mediaObjectId");
      const width = numberValue(photo, "width");
      const height = numberValue(photo, "height");
      if (!mediaObjectId || !width || !height) return null;
      const displayItem: MediaPostDisplayItem = {
        id: stringValue(photo, "id") || `${item.id}-${index + 1}`,
        mediaObjectId,
        type: stringValue(photo, "type") === "video" ? "video" : "photo",
        width,
        height,
        alt: stringValue(photo, "caption") || caption,
      };
      const displayUrl = stringValue(photo, "displayUrl");
      const dialogUrl = stringValue(photo, "dialogUrl");
      const playbackUrl = stringValue(photo, "playbackUrl");
      const thumbnailUrl = stringValue(photo, "thumbnailUrl");
      const previewUrl = stringValue(photo, "previewUrl");
      const photoCaption = stringValue(photo, "caption");
      if (displayUrl) displayItem.displayUrl = displayUrl;
      if (dialogUrl) displayItem.dialogUrl = dialogUrl;
      if (playbackUrl) displayItem.playbackUrl = playbackUrl;
      if (thumbnailUrl) displayItem.thumbnailUrl = thumbnailUrl;
      if (previewUrl) displayItem.previewUrl = previewUrl;
      if (photoCaption) displayItem.caption = photoCaption;
      return displayItem;
    })
    .filter((photo): photo is MediaPostDisplayItem => Boolean(photo));
  const previewMediaId = stringValue(payload, "previewMediaId");
  const previewWidth = numberValue(payload, "previewWidth");
  const previewHeight = numberValue(payload, "previewHeight");
  const fallbackMedia: MediaPostDisplayItem[] =
    media.length === 0 && previewMediaId && previewWidth && previewHeight
      ? [
          {
            id: `${item.id}-preview`,
            mediaObjectId: previewMediaId,
            type:
              stringValue(payload, "previewType") === "video"
                ? "video"
                : "photo",
            width: previewWidth,
            height: previewHeight,
            alt: caption,
          },
        ]
      : media;
  const fallbackItem = fallbackMedia[0];
  if (fallbackItem && media.length === 0) {
    const previewDisplayUrl = stringValue(payload, "previewDisplayUrl");
    const previewDialogUrl = stringValue(payload, "previewDialogUrl");
    const previewPlaybackUrl = stringValue(payload, "previewPlaybackUrl");
    const previewThumbnailUrl = stringValue(payload, "previewThumbnailUrl");
    if (previewDisplayUrl) fallbackItem.displayUrl = previewDisplayUrl;
    if (previewDialogUrl) fallbackItem.dialogUrl = previewDialogUrl;
    if (previewPlaybackUrl) fallbackItem.playbackUrl = previewPlaybackUrl;
    if (previewThumbnailUrl) fallbackItem.thumbnailUrl = previewThumbnailUrl;
  }
  const authorUsername = stringValue(payload, "authorUsername");
  const href =
    authorUsername && canLinkToProfileUsername(authorUsername)
      ? `${getProfileRoute(authorUsername)}/posts/${encodeURIComponent(item.entityId)}`
      : item.detailHref;

  return {
    id: item.entityId,
    href,
    author: {
      displayName: stringValue(payload, "authorName") || "Diver",
      username: authorUsername,
      avatarUrl: stringValue(payload, "authorAvatarUrl"),
    },
    createdAt: item.createdAt,
    postType: "media",
    badgeLabel: item.typeLabel || "Media post",
    caption,
    media: fallbackMedia,
    likeCount: numberValue(payload, "likeCount") ?? 0,
    commentCount: numberValue(payload, "commentCount") ?? 0,
    viewerHasLiked: booleanValue(payload, "viewerHasLiked") ?? false,
    viewerHasSaved: booleanValue(payload, "viewerHasSaved") ?? false,
    diveSite: {
      name: stringValue(payload, "diveSiteName"),
      slug: stringValue(payload, "diveSiteSlug"),
      area: stringValue(payload, "area"),
    },
    itemCount: numberValue(payload, "itemCount"),
  };
}

export function mediaPostFromDetail(
  response: MediaPostDetailResponse,
  href?: string,
): MediaPostDisplay {
  const detail = response.post;
  const caption = detail.post.postCaption?.trim() || "No caption added.";
  return {
    id: detail.post.id,
    href,
    author: {
      displayName: detail.author.displayName,
      username: detail.author.username,
      avatarUrl: detail.author.avatarUrl,
    },
    createdAt: detail.post.createdAt,
    postType: "media",
    badgeLabel: "Media post",
    caption,
    media: detail.items.map((item) => ({
      id: item.id,
      mediaObjectId: item.mediaObjectId,
      type: item.type === "video" ? "video" : "photo",
      width: item.width,
      height: item.height,
      caption: item.caption,
      playbackUrl: item.playbackUrl ?? undefined,
      thumbnailUrl: item.thumbnailUrl ?? undefined,
      previewUrl: item.previewUrl ?? undefined,
      alt: item.caption?.trim() || caption,
    })),
    likeCount: detail.post.likeCount,
    commentCount: detail.post.commentCount,
    viewerHasLiked: detail.post.viewerHasLiked,
    viewerHasSaved: detail.post.viewerHasSaved,
    diveSite: detail.items[0]?.diveSite,
    itemCount: detail.items.length,
  };
}
