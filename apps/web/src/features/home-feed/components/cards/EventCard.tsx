"use client";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";
import { FeedCardShell } from "@/features/home-feed/components/FeedCardShell";

type EventPayload = {
  title?: string;
  memberCount?: number;
  viewerMember?: boolean;
};

export function EventCard({
  item,
  actions,
}: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as EventPayload;
  return (
    <FeedCardShell item={item} actions={actions}>
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
          Group session
        </Badge>
        <span className="text-sm text-muted-foreground font-medium">
          {payload.memberCount ?? 0} members
        </span>
      </div>
      <p className="line-clamp-2 text-base font-semibold tracking-tight">
        {payload.title || "Untitled event"}
      </p>
      {payload.viewerMember ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          You are attending
        </p>
      ) : null}
    </FeedCardShell>
  );
}
