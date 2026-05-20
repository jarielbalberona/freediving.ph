import type { HomeFeedItem } from "@freediving.ph/types";
import type { ChikaThreadView, ThreadReactionType } from "@/features/chika/api/threads";
import { stripMarkdownForPreview } from "@/features/chika/lib/markdown";

export type ChikaPostDisplay = {
  id: string;
  href: string;
  author: {
    displayName: string;
    username?: string;
    avatarUrl?: string | null;
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

const previewText = (...values: Array<string | undefined>) => {
  for (const value of values) {
    const preview = stripMarkdownForPreview(value ?? "");
    if (preview) return preview;
  }
  return undefined;
};

const cleanUsername = (value?: string) => {
  const trimmed = value?.trim().replace(/^@+/, "");
  return trimmed || undefined;
};

const authorDisplayName = ({
  displayName,
  username,
}: {
  displayName?: string;
  username?: string;
}) => displayName?.trim() || cleanUsername(username) || "Community member";

export function chikaPostFromThread(thread: ChikaThreadView): ChikaPostDisplay {
  const username = thread.categoryPseudonymous
    ? undefined
    : cleanUsername(thread.authorUsername);
  const displayName = authorDisplayName({
    displayName: thread.authorDisplayName,
    username,
  });
  return {
    id: thread.id,
    href: `/chika/${thread.id}`,
    author: {
      displayName,
      username,
      avatarUrl: thread.authorAvatarUrl ?? null,
      pseudonymous: thread.categoryPseudonymous,
    },
    createdAt: thread.createdAt,
    postType: "chika",
    badgeLabel: "Chika",
    category: thread.categoryName,
    title: thread.title || "Untitled Chika",
    excerpt: previewText(thread.content),
    voteScore: thread.voteCount,
    viewerVote: thread.userReaction ?? null,
    replyCount: thread.commentCount,
    hidden: thread.isHidden,
  };
}

export function chikaPostFromHomeFeedItem(item: HomeFeedItem): ChikaPostDisplay {
  const payload = item.payload ?? {};
  const authorUsername = cleanUsername(stringValue(payload, "authorUsername"));
  const displayName = authorDisplayName({
    displayName: stringValue(payload, "authorDisplayName") || stringValue(payload, "authorName"),
    username: authorUsername,
  });
  return {
    id: item.entityId,
    href: item.detailHref || `/chika/${item.entityId}`,
    author: {
      displayName,
      username: authorUsername,
      avatarUrl: stringValue(payload, "authorAvatarUrl") ?? null,
      pseudonymous: Boolean(payload.authorPseudonymous),
    },
    createdAt: item.createdAt,
    postType: "chika",
    badgeLabel: item.typeLabel || "Chika",
    category: stringValue(payload, "categoryName"),
    title: stringValue(payload, "title") || "Untitled Chika",
    excerpt: previewText(
      stringValue(payload, "excerpt"),
      stringValue(payload, "body"),
      stringValue(payload, "content"),
      stringValue(payload, "previewContent"),
    ),
    voteScore: numberValue(payload, "reactionCount") ?? 0,
    viewerVote: (stringValue(payload, "viewerVote") as ThreadReactionType) ?? null,
    replyCount: numberValue(payload, "replyCount") ?? 0,
    viewerHasSaved: Boolean(payload.viewerHasSaved),
    viewCount: numberValue(payload, "viewCount"),
  };
}
