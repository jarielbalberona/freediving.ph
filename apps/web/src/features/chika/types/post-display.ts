import type { HomeFeedItem } from "@freediving.ph/types";
import type { ChikaThreadView, ThreadReactionType } from "@/features/chika/api/threads";
import { stripMarkdownForPreview } from "@/features/chika/lib/markdown";

export type ChikaPostDisplay = {
  id: string;
  href: string;
  author: {
    displayName: string;
    username?: string;
    avatarUrl?: string;
    pseudonymous?: boolean;
  };
  createdAt: string;
  postType: "chika";
  badgeLabel: string;
  category?: string;
  title: string;
  excerpt?: string;
  voteScore: number;
  viewerVote?: ThreadReactionType | null;
  replyCount: number;
  viewerHasSaved?: boolean;
  viewCount?: number;
  hidden?: boolean;
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

export function chikaPostFromThread(thread: ChikaThreadView): ChikaPostDisplay {
  return {
    id: thread.id,
    href: `/chika/${thread.id}`,
    author: {
      displayName: thread.authorDisplayName || "Community member",
      avatarUrl: thread.authorAvatarUrl,
      pseudonymous: thread.categoryPseudonymous,
    },
    createdAt: thread.createdAt,
    postType: "chika",
    badgeLabel: "Chika",
    category: thread.categoryName,
    title: thread.title || "Untitled Chika",
    excerpt: stripMarkdownForPreview(thread.content || ""),
    voteScore: thread.voteCount,
    viewerVote: thread.userReaction ?? null,
    replyCount: thread.commentCount,
    hidden: thread.isHidden,
  };
}

export function chikaPostFromHomeFeedItem(item: HomeFeedItem): ChikaPostDisplay {
  const payload = item.payload ?? {};
  return {
    id: item.entityId,
    href: item.detailHref || `/chika/${item.entityId}`,
    author: {
      displayName: stringValue(payload, "authorName") || "Community member",
      username: stringValue(payload, "authorUsername"),
      avatarUrl: stringValue(payload, "authorAvatarUrl"),
      pseudonymous: Boolean(payload.authorPseudonymous),
    },
    createdAt: item.createdAt,
    postType: "chika",
    badgeLabel: item.typeLabel || "Chika",
    category: stringValue(payload, "categoryName"),
    title: stringValue(payload, "title") || "Untitled Chika",
    excerpt: stringValue(payload, "excerpt"),
    voteScore: numberValue(payload, "reactionCount") ?? 0,
    viewerVote: (stringValue(payload, "viewerVote") as ThreadReactionType) ?? null,
    replyCount: numberValue(payload, "replyCount") ?? 0,
    viewerHasSaved: Boolean(payload.viewerHasSaved),
    viewCount: numberValue(payload, "viewCount"),
  };
}
