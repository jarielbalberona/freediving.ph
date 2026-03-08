"use client";

import { UsernameLink } from "@/components/common/UsernameLink";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { HomeFeedItem } from "@freediving.ph/types";
import { FeedCardShell } from "@/features/home-feed/components/FeedCardShell";

type CommunityPayload = {
  authorName?: string;
  authorUsername?: string;
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
  return (
    <FeedCardShell item={item} actions={actions}>
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
            />
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        >
          {payload.categoryName || "Chika"}
        </Badge>
      </div>
      <p className="line-clamp-2 text-base font-semibold tracking-tight">
        {payload.title || "Untitled thread"}
      </p>
      <p className="text-xs text-muted-foreground">
        {payload.replyCount ?? 0} replies · {payload.reactionCount ?? 0}{" "}
        reactions
      </p>
    </FeedCardShell>
  );
}
