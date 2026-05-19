"use client";

import Link from "next/link";

import { UsernameLink } from "@/components/common/UsernameLink";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { HomeFeedItem } from "@freediving.ph/types";
import { FeedCardShell } from "@/features/home-feed/components/FeedCardShell";
import ThreadActions from "@/features/chika/components/ThreadActions";

type CommunityPayload = {
  authorName?: string;
  authorUsername?: string;
  authorPseudonymous?: boolean;
  title?: string;
  categoryName?: string;
  replyCount?: number;
  reactionCount?: number;
};

export function CommunityHotCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as CommunityPayload;
  const chikaActions = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <ThreadActions
        threadId={item.entityId}
        initialVoteCount={payload.reactionCount ?? 0}
        commentCount={payload.replyCount ?? 0}
      />
      {actions}
    </div>
  );

  return (
    <FeedCardShell item={item} actions={chikaActions}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar displayName={payload.authorName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {payload.authorName || "Community member"}
            </p>
            <UsernameLink
              username={payload.authorUsername}
              className="truncate text-xs text-muted-foreground"
              disabled={payload.authorPseudonymous}
              fallback={payload.authorPseudonymous ? "Pseudonymous" : "Unknown"}
            />
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-teal-500/30 bg-teal-500/10 text-teal-800"
        >
          {payload.categoryName || "Chika"}
        </Badge>
      </div>
      {item.detailHref ? (
        <Link
          href={item.detailHref}
          className="block text-base font-semibold leading-snug tracking-tight text-foreground hover:underline"
        >
          {payload.title || "Untitled Chika"}
        </Link>
      ) : (
        <p className="line-clamp-2 text-base font-semibold tracking-tight">
          {payload.title || "Untitled Chika"}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {payload.replyCount ?? 0} replies · {payload.reactionCount ?? 0} votes
      </p>
    </FeedCardShell>
  );
}
