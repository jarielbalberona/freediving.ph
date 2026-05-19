"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";
import {
  FeedCardShell,
  FeedItemHeader,
} from "@/features/home-feed/components/FeedCardShell";
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
      <FeedItemHeader
        item={item}
        displayName={payload.authorName || "Community member"}
        username={payload.authorUsername}
        usernameDisabled={payload.authorPseudonymous}
        usernameFallback={payload.authorPseudonymous ? "Pseudonymous" : "Unknown"}
        typeExtras={
          payload.categoryName ? (
            <Badge
              variant="outline"
              className="h-6 border-teal-500/30 bg-teal-500/10 px-2 text-teal-800"
            >
              {payload.categoryName}
            </Badge>
          ) : null
        }
      />
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
